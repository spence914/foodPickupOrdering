const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { Template } = require('ejs');
const userQueries = require('../db/queries/users');

router.get('/', (req, res) => {
  //  If a current order exists select it, if not create a new order
  const userID = req.cookies.user_id || 1; // set default value to 1 incase no cookie exists

  userQueries.queryCurrentOrder(userID)
    .then((data) => {
      if (!data[0]) {
        //  No current order exists
        return userQueries.createNewOrderQuery(userID);
      }
      //  Current order exists
      return data;
    })
    .then((data) => {
      const orderID = data[0].id;

      userQueries.queryAllFoodItems()
        .then((foodItems) => {
          res.render('index', { foodItems: foodItems.rows, orderID });
        });
    });
});

module.exports = router;
