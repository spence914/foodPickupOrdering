const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { Template } = require('ejs');
const userQueries = require('../db/queries/users');
const client = require('./twilio-api');

// VIEW CART
router.get('/', (req, res) => {
  let templateVars = {};
  const userID = req.cookies.user_id || 1;

  userQueries.getCart(userID)
    .then((data) => {
      const orderID = data.rows[0].id;
      templateVars.orderID = orderID;
      return userQueries.getOrders(orderID);
    })
    .then((data) => {
      templateVars.foodItems = data;
      return userQueries.getSubtotal(templateVars.orderID);
    })
    .then((data) => {
      // If subtotal is undefined, display $0 subtotal
      if (!data) {
        templateVars.subtotal = 0;
      } else {
        // Iterate the array of data
        templateVars.subtotal = data.reduce((prev, curr) => {
          return Number(curr.subtotal) + prev;
        }, 0);
        templateVars.subtotal = templateVars.subtotal.toFixed(2);
        res.render('cart', templateVars);
      }
    })
    .catch((err) => {
      res.send(err);
    });
});

// DELETE ORDER IN CART
router.post('/cancelOrder/:orderID', (req, res) => {
  const orderID = req.params.orderID;
  userQueries.cancelCartOrder(orderID)
    .then(() => {
      res.redirect(`/`);
    })
    .catch((err) => {
      res.send(err);
    });
});

// SUBMIT ORDER
router.post('/submitOrder/:orderID', (req, res) => {
  const orderID = req.params.orderID;
  userQueries.submitOrder(orderID)
    .then(() => {
      userQueries.getOwnerPhone()
        .then((phoneNumber) => {
          //  Leave commented to save $$
          client.messages
            .create({
              body: `Hello, there is a new online order: ${orderID}, please check Food Delivery App for details.`,
              to: phoneNumber, // Text your number
              from: '+14085604628', // From a valid Twilio number
            })
            .then((message) => {
              console.log(message.sid);
              console.log(message.body);
            })
            .catch((err) => console.log(err));
          res.redirect('/orders');
        });
    })
    .catch((err) => {
      res.send(err);
    });
});

router.post('/removeFoodItem/:orderID', (req, res) => {
  const orderID = req.params.orderID;
  const foodItemName = req.body.foodItemName;
  userQueries.removeFoodItem(foodItemName, orderID)
    .then(() => {
      res.redirect(`/cart`);
    })
    .catch((err) => {
      res.send(err);
    });
});

// ADJUST QUANTITY IN CART
router.post('/updateQuantity/:orderID', (req, res) => {
  const newQuantity = req.body.quantity;
  const orderContentId = req.body.order_contents_id;

  userQueries.updateQuantity(newQuantity, orderContentId)
    .then(() => {
      res.redirect(`/cart`);
    })
    .catch((err) => {
      res.send(err);
    });
});

// ADD ITEM TO CART
router.post('/:orderID', (req, res) => {

  const foodItemID = req.body.foodItemID;
  const quantity = req.body.quantity;
  const orderID = req.params.orderID;



  userQueries.searchCart(orderID, foodItemID)
    .then((data) => {
      if (data.length === 0) {
        // Food item not already in cart
        userQueries.addToCart(orderID, foodItemID, quantity)
          .then(() => res.redirect('/'));
      }
      if (data.length > 0) {
        // Food item already in cart
        userQueries.updateCart(quantity, orderID, foodItemID)
          .then(() => res.redirect('/'));
      }
    });
});

module.exports = router;
