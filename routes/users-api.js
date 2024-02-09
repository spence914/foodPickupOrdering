/*
 * All routes for User Data are defined here
 * Since this file is loaded in server.js into api/users,
 *   these routes are mounted onto /api/users
 * See: https://expressjs.com/en/guide/using-middleware.html#middleware.router
 */

const express = require('express');
const router  = express.Router();
const userQueries = require('../db/queries/users');

router.get('/', (req, res) => {
  userQueries.getUsers()
    .then(users => {
      res.json({ users });
    })
    .catch(err => {
      res
        .status(500)
        .json({ error: err.message });
    });
});

router.post('/updateQuantity/:orderID', (req, res) => {
  const newQuantity = req.body.quantity;
  const orderContentId = req.body.order_contents_id;
  const orderID = req.params.orderID;

  let jsonData = {};

  userQueries.updateQuantity(newQuantity, orderContentId)
    .then(() => {
      userQueries.getSubtotal(orderID)
        .then((data) => {
          // If subtotal is undefined, display $0 subtotal
          if (!data) {
            jsonData.subtotal =  0;
            res.send(jsonData);
          } else {
            // Iterate the array of data
            jsonData.subtotal = data.reduce((prev, curr) => {
              return Number(curr.subtotal) + prev;
            }, 0);
            jsonData.subtotal = jsonData.subtotal.toFixed(2);
            res.send(jsonData);
          }
        })
        .catch((err) => {
          res.send(err);
        });
    });
});

router.post('/removeFoodItem/:orderID', (req, res) => {
  const orderID = req.params.orderID;
  const foodItemName = req.body.foodItemName;
  let jsonData = {};

  userQueries.removeFoodItem(foodItemName, orderID)
    .then(() => {
      userQueries.getSubtotal(orderID)
        .then((data) => {
          // If subtotal is undefined, display $0 subtotal
          if (!data) {
            jsonData.subtotal =  0;
            res.send(jsonData);
          } else {
            // Iterate the array of data
            jsonData.subtotal = data.reduce((prev, curr) => {
              return Number(curr.subtotal) + prev;
            }, 0);
            jsonData.subtotal = jsonData.subtotal.toFixed(2);
            res.send(jsonData);
          }
        })
        .catch((err) => {
          console.log(err.message);
        });
    })
    .catch((err) => {
      console.log(err.message);
    });
});

module.exports = router;
