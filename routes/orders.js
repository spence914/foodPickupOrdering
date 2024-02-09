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


  userQueries.queryAllOrders(userID)
    .then(orderData => {
      const orders = orderData;
      // Map each order to a promise that fetches its items
      const itemPromises = orders.map(order => {

        let orderID = order.id;
        return userQueries.orderItemContentsQuery(orderID)
          .then(itemData => {
            order.items = itemData; // Assign the fetched items to the order
            return order; // Return the updated order
          });
      });

      // Wait for all item fetches to complete
      return Promise.all(itemPromises);
    })
    .then(ordersWithItems => {
      // after all orders have been populated with items, ready to render
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

  userQueries.getOrdersAdmin()
    .then(orderData => {
      const orders = orderData;
      // Map each order to a promise that fetches its items
      const itemPromises = orders.map(order => {

        let orderID = order.id;
        return userQueries.orderItemContentsQuery(orderID).then(itemData => {
          order.items = itemData; // Assign the fetched items to the order
          return order; // Return the updated order
        });
      });

      return Promise.all(itemPromises);
    })
    .then(ordersWithItems => {
      // after all orders have been populated with items, ready to render
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

  const orderID = req.body.orderID;
  const timeToComplete = req.body.timeToComplete;

  userQueries.updateOrdersQuery(timeToComplete, orderID);


  userQueries.getUserPhone(orderID)
    .then(data => {
      let userPhone = data[0].phone_number;
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
    })
    .then(() => {
      res.redirect('/orders');
    });

});

module.exports = router;
