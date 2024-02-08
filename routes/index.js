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
  RETURNING *;
  `;

  const queryFoodItems = `
  SELECT id, name, description, price, thumbnail_photo_url FROM food_items;
  `;

  const userID = req.cookies.user_id || 1; // set default value to 1 incase no cookie exists

  db.query(queryCurrentOrder, [userID])
    .then((data) => {
      if (!data.rows[0]) {
        //  No current order exists
        return db.query(queryCreateNewOrder, [userID]);
      }
      //  Current order exists
      return data;
    })
    .then((data) => {
      const orderID = data.rows[0].id;

      db.query(queryFoodItems)
        .then((foodItems) => {
          res.render('index', { foodItems: foodItems.rows, orderID });
        });
    });
});

module.exports = router;