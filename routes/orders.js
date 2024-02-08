const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { Template } = require('ejs');
const userQueries = require('../db/queries/users');
const client = require('./twilio-api');

// ORDERS RE-ROUTE
router.get('/', (req, res) => {
  const userID = req.cookies.user_id;
  if (userID === '1') {
    res.redirect('/orders/admin');
    return;
  }
  res.redirect('/orders/users');
});

// USER ORDERS PAGE
router.get('/users', (req, res) => {
  const userID = req.cookies.user_id;

  const queryString = `SELECT
    orders.id,
    orders.created_at,
    orders.status,
    orders.placed_at,
    SUM(order_contents.quantity * food_items.price) AS total_price
  FROM
    orders
  JOIN
    order_contents ON orders.id = order_contents.order_id
  JOIN
    food_items ON food_items.id = order_contents.food_item_id
  WHERE
    orders.user_id = $1
  AND
    orders.placed_at IS NOT NULL
  GROUP BY
    orders.id
  ORDER BY orders.created_at DESC;`;

  db.query(queryString, [userID])
    .then(orderData => {
      // console.log("orderData", orderData);
      const orders = orderData.rows;
      // Map each order to a promise that fetches its items
      const itemPromises = orders.map(order => {
        const itemQuery = `SELECT
          food_items.name,
          order_contents.quantity,
          food_items.price AS price
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
      // console.log(ordersWithItems);
      let orderID;

      for (const order of ordersWithItems) {
        if (order.status === 'In Progress') {
          orderID = order.id;
        }
      }
      res.render('orders', { orders: ordersWithItems, orderID });
    });

});

// ADMIN ORDERS PAGE
router.get('/admin', (req, res) => {

  const queryString = `SELECT
    orders.id,
    orders.created_at,
    orders.status,
    SUM(order_contents.quantity * food_items.price) AS total_price
  FROM
    orders
  JOIN
    order_contents ON orders.id = order_contents.order_id
  JOIN
    food_items ON food_items.id = order_contents.food_item_id
  WHERE
    orders.status <> 'completed'
  GROUP BY
    orders.id
  ORDER BY orders.created_at DESC;`;

  db.query(queryString)
    .then(orderData => {
      const orders = orderData.rows;
      // Map each order to a promise that fetches its items
      const itemPromises = orders.map(order => {
        const itemQuery = `SELECT
          food_items.name,
          order_contents.quantity,
          food_items.price AS price
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

      return Promise.all(itemPromises);
    })
    .then(ordersWithItems => {
      // after all orders have been populated with items, ready to render
      // console.log(ordersWithItems);
      let orderID;

      for (const order of ordersWithItems) {
        if (order.status === 'In Progress') {
          orderID = order.id;
        }
      }
      res.render('admin', { orders: ordersWithItems, orderID });
    });
});

router.post('/admin/time', (req, res) => {
  const queryString = `UPDATE orders SET status = 'completed', time_to_complete = $1 WHERE id = $2`;
  const orderID = req.body.orderID;
  const timeToComplete = req.body.timeToComplete;

  db.query(queryString, [timeToComplete, orderID]);

  const userInfoQuery = `SELECT users.phone_number FROM users JOIN orders ON orders.user_id = users.id WHERE orders.id = $1`;
  db.query(userInfoQuery, [orderID])
    .then(data => {
      let userPhone = data.rows[0].phone_number;
      client.messages
        .create({
          body: `Your food is being prepared and will be ready in ${timeToComplete} minutes`,
          to: userPhone, // Text your number
          from: '+14085604628', // From a valid Twilio number
        })
        .then((message) => console.log(message.sid))
        .catch((err) => console.log(err));
      setTimeout(() => {
        client.messages
          .create({
            body: `Your food is ready!`,
            to: userPhone, // Text your number
            from: '+14085604628', // From a valid Twilio number
          })
          .catch((err) => console.log(err));
      }, timeToComplete * 60000);
    });

  res.redirect('/orders');
});

module.exports = router;