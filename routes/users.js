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
  //  If a current order exists select it, if not create a new order
  const queryCurrentOrder = `
  SELECT * FROM orders
  WHERE user_id = $1 AND created_at IS NOT NULL AND placed_at IS NULL
  `;

  const queryCreateNewOrder = `
  INSERT INTO orders (user_id) VALUES ($1)
  `;

  const queryFoodItems = `
  SELECT id, name, description, (price/100) as price, thumbnail_photo_url FROM food_items;
  `;

  const userID = req.cookies.user_id;

  db.query(queryCurrentOrder, [userID])
    .then((data) => {
      if (!data.rows[0]) {
        //  no current order exists
        console.log("Creating new order");
        return db.query(queryCreateNewOrder, [userID])
          .then(() => db.query(queryCurrentOrder, [userID])); // refetch new order
      }
      //  current order exists
      return data;
    })
    .then((data) => {
      const orderID = data.rows[0].id;
      
      db.query(queryFoodItems)
        .then((foodItems) => {
          console.log("foodItems", foodItems);
          res.render('index', {foodItems: foodItems.rows, orderID})
        });
    });
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
      console.log(ordersWithItems);
      let orderID;

      for (const order of ordersWithItems) {
        if (order.status === 'In Progress') {
          orderID = order.id;
        }
      }
      res.render('orders', { orders: ordersWithItems, orderID });
    });

});

// VIEW CART
router.get('/cart/:orderID', (req, res) => {
  // const user = req.cookies.user_id;
  console.log(req.params);
  const orderID = req.params.orderID || 1;

  console.log(orderID);
  userQueries.getOrders(orderID)
    .then((data) => {
      const templateVars = { foodItems : data, orderID : orderID };
      console.log('fooditems', templateVars.foodItems);
      res.render('cart', templateVars);
    });
});

// DELETE ORDER
router.post('/users/cancelOrder/:orderID', (req, res) => {
  const orderID = req.params.orderID;
  userQueries.cancelCartOrder(orderID)
    .then((data) => {
      console.log('successfully deleted order', data);
      res.redirect(`/cart/${orderID}`);
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

// ADD ITEM TO CART
router.post('/order/:orderID', (req, res) => {

  const foodItemID = req.body.foodItemID;
  const quantity = req.body.quantity;
  const orderID = req.params.orderID;

  console.log("foodItemID", foodItemID);
  console.log("quantity", quantity);
  console.log("orderID", orderID);

  const queryAddToCart = `
  INSERT INTO order_contents (order_id, food_item_id, quantity) VALUES ($1, $2, $3)
  `;

  db.query(queryAddToCart, [orderID, foodItemID, quantity])
    .then(() => res.redirect('/'));

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
