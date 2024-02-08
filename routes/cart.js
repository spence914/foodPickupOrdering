const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { Template } = require('ejs');
const userQueries = require('../db/queries/users');
const client = require('./twilio-api');

// VIEW CART
router.get('/', (req, res) => {

  const queryCurrentOrder = `
  SELECT * FROM orders
  WHERE user_id = $1 AND created_at IS NOT NULL AND placed_at IS NULL
  `;

  const queryCreateNewOrder = `
  INSERT INTO orders (user_id) VALUES ($1)
  RETURNING *
  `;

  const userID = req.cookies.user_id || 1; // set default value to 1 incase no cookie exists
  // console.log("userID", userID);
  let templateVars = {};

  db.query(queryCurrentOrder, [userID])
    .then((data) => {
      // console.log("first data call", data);
      if (!data.rows[0]) {
        // console.log("no order exists");
        //  no current order exists
        console.log("Creating new order");
        return db.query(queryCreateNewOrder, [userID]);
        // .then(() => db.query(queryCurrentOrder, [userID])); // refetch new order
      }
      //  current order exists
      // console.log("order exists");
      return data;
    })
    .then((data) => {
      // console.log("data.rows[0].id", data.rows[0].id);
      const orderID = data.rows[0].id;
      templateVars.orderID = orderID;
      return userQueries.getOrders(orderID);
    })
    .then((data) => {
      templateVars.foodItems = data;
      return userQueries.getSubtotal(templateVars.orderID);
    })
    .then((data) => {
      // if subtotal is undefined, display $0 subtotal
      if (!data) {
        templateVars.subtotal = 0;
      } else {
        // iterate the array of data
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
      //  Leave commented to save $$
      userQueries.getOwnerPhone()
        .then((phoneNumber) => {
          // client.messages
          //   .create({
          //     body: `Hello, there is a new online order: ${orderID}, please check Food Delivery App for details.`,
          //     to: phoneNumber, // Text your number
          //     from: '+14085604628', // From a valid Twilio number
          //   })
          //   .then((message) => console.log(message.sid))
          //   .catch((err) => console.log(err));
          res.redirect('/orders');
        });
    })
    .catch((err) => {
      res.send(err);
    });
});

router.post('/removeFoodItem/:orderID', (req, res) => {
  // need orderID and the food_items.id
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

router.post('/updateQuantity/:orderID', (req, res) => {
  const newQuantity = req.body.quantity;
  const orderID = req.params.orderID;
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

  // console.log("foodItemID", foodItemID);
  // console.log("quantity", quantity);
  // console.log("orderID", orderID);

  //  Check cart for existing entries of added item
  const searchCart = `
  SELECT * FROM order_contents
  WHERE order_id = $1
  AND food_item_id = $2
  `;

  const queryAddToCart = `
  INSERT INTO order_contents (order_id, food_item_id, quantity) VALUES ($1, $2, $3)
  `;

  const queryUpdateCart = `
  UPDATE order_contents
  SET quantity = quantity + $1
  WHERE order_id = $2
  AND food_item_id = $3
  `;

  db.query(searchCart, [orderID, foodItemID])
    .then((data) => {
      // console.log(data.rows);
      if (data.rows.length === 0) {
        // food item has no listings in current cart
        // needs to be added in
        db.query(queryAddToCart, [orderID, foodItemID, quantity || 1])
          .then(() => res.redirect('/'));
      }
      if (data.rows.length > 0) {
        // food item has a listing
        // update quantity
        db.query(queryUpdateCart, [quantity || 1, orderID, foodItemID])
          .then(() => res.redirect('/'));
      }
    });


});

module.exports = router;