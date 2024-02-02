/*
 * All routes for Users are defined here
 * Since this file is loaded in server.js into /users,
 *   these routes are mounted onto /users
 * See: https://expressjs.com/en/guide/using-middleware.html#middleware.router
 */

const express = require('express');
const router  = express.Router();
const db = require('../db/connection');
const { Template } = require('ejs');

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
  SELECT id, name, description, (price/100) as price FROM food_items;
  `;

  const userID = 6; // replace hard coded userID

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
        .then((foodItems) => res.render('index', {foodItems: foodItems.rows, orderID}));
    });
});

// ORDER HISTORY
router.get('/orders/:userID', (req, res) => {
  //  Check if the user is logged in
  //  Populate from SQL orders for userID
  res.render('orders');
});

// VIEW CART
router.get('/orders', (req, res) => {
  const orderID = 101;
  
  const queryString = `
  SELECT id, name, description, (price/100) as price FROM food_items;
  `;

  db.query(queryString)
    .then((data) => res.render('cart', {foodItems: data.rows}));
  // Check if the user is logged in
  // Populate currentOrder object from cookie data
  //
  // res.render('cart');
});

// USER LOGIN
router.get('/login/:id', (req, res) => {
  // using encrypted cookies
  req.session.user_id = req.params.id;

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
