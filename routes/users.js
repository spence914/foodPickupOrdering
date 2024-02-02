/*
 * All routes for Users are defined here
 * Since this file is loaded in server.js into /users,
 *   these routes are mounted onto /users
 * See: https://expressjs.com/en/guide/using-middleware.html#middleware.router
 */

const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { Template } = require('ejs');
const userQueries = require('../db/queries/users');

router.get('/', (req, res) => {
  const queryString = `
  SELECT id, name, description, (price/100) as price, thumbnail_photo_url FROM food_items;
  `;

  db.query(queryString)
    .then((data) => res.render('index', { foodItems: data.rows }));

});

// ORDER HISTORY
router.get('/orders', (req, res) => {
  const userID = req.cookies.user_id;


  const queryString = `SELECT
    orders.id,
    orders.created_at,
    orders.status,
    SUM(order_contents.quantity * food_items.price)/100 AS total_price
  FROM
    orders
  JOIN
    order_contents ON orders.id = order_contents.order_id
  JOIN
    food_items ON food_items.id = order_contents.food_item_id
  WHERE
    orders.user_id = $1
  GROUP BY
    orders.id;`;

  db.query(queryString, [userID])
    .then(orderData => {
      const orders = orderData.rows;
      // Map each order to a promise that fetches its items
      const itemPromises = orders.map(order => {
        const itemQuery = `SELECT
          food_items.name,
          order_contents.quantity,
          food_items.price/100 AS price
        FROM
          order_contents
        JOIN
          food_items ON food_items.id = order_contents.food_item_id
        WHERE
          order_contents.order_id = $1;`;

        return db.query(itemQuery, [order.id]).then(itemData => {
          order.items = itemData.rows; // Assign the fetched items to the order
          return order; // Return the updated order
        });
      });

      // Wait for all item fetches to complete
      return Promise.all(itemPromises);
    })
    .then(ordersWithItems => {
      // after all orders have been populated with items, ready to render
      res.render('orders', { orders: ordersWithItems });
    });

});

// VIEW CART
router.get('/cart/:orderId', (req, res) => {
  // const user = req.cookies.user_id;
  const orderId = req.params.orderId || 1;
  console.log(orderId);
  userQueries.getOrders(orderId)
    .then((data) => {
      const templateVars = { foodItems : data, orderId : orderId };
      console.log('fooditems', templateVars.foodItems);
      res.render('cart', templateVars);
    });
});

// USER LOGIN
router.get('/login/:id', (req, res) => {
  // using encrypted cookies
  //req.session.user_id = req.params.id;

  // or using plain-text cookies
  res.cookie('user_id', req.params.id);

  // send the user somewhere
  res.redirect('/');
});

router.post('/order/:orderID', (req, res) => {
  // create sql statement to add order to orders table
  // make api request to send notification to restaurant
  res.redirect('orders/:userID');
});

router.post('/orders/:orderID/timeToComplete', (req, res) => {
  // create sql statement for owner to add/update time_to_complete to orders table.
  // send sms to client to notify their order is being prepared
  // start a timer that sends an sms to the client when completed
  res.redirect('orders/:userID');
});

router.post('/test', (req, res) => {
  console.log("req", req.body);
  res.render('index');
});

module.exports = router;
