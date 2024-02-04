/*
 * All routes for Users are defined here
 * Since this file is loaded in server.js into /users,
 *   these routes are mounted onto /users
 * See: https://expressjs.com/en/guide/using-middleware.html#middleware.router
 */

// TWILIO
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = require('twilio')(accountSid, authToken, {
  lazyLoading: false,
});

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

  const userID = req.cookies.user_id || 1; // set default value to 1 incase no cookie exists

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
          res.render('index', { foodItems: foodItems.rows, orderID })
        });
    });
});

// ORDER HISTORY
router.get('/orders', (req, res) => {
  //const userID = req.cookies.user_id;
  const userID = 1;
  if (userID === 1) {
    res.redirect('/orders/admin');
  } res.redirect('/orders/users');
});

router.get('/orders/users', (req, res) => {
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

// Admin Orders page

router.get('/orders/admin', (req, res) => {

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
    orders.status <> 'completed'
  GROUP BY
    orders.id;`;

  db.query(queryString)
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

router.post('/orders/admin/time', (req, res) => {
  const queryString = `UPDATE orders SET status = 'completed', time_to_complete = $1 WHERE id = $2`;
  const orderID = req.params.orderID || 1;
  const timeToComplete = req.params.timeToComplete;

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
        .then((message) => console.log(message.sid));
      setTimeout(() => {
        client.messages
          .create({
            body: `Your food is ready!`,
            to: userPhone, // Text your number
            from: '+14085604628', // From a valid Twilio number
          });
      }, timeToComplete * 60000);
    });


  res.redirect('/orders');
});


// VIEW CART
router.get('/cart/:orderID', (req, res) => {
  // const user = req.cookies.user_id;
  console.log(req.params);
  const orderID = req.params.orderID || 1;

  userQueries.getOrders(orderID)
    .then((data) => {
      const templateVars = { foodItems: data, orderID: orderID };
      console.log(templateVars.foodItems[0]);
      res.render('cart', templateVars);
    });
});

// DELETE ORDER IN CART
router.post('/cancelOrder/:orderID', (req, res) => {
  const orderID = req.params.orderID;
  userQueries.cancelCartOrder(orderID)
    .then((data) => {
      console.log('successfully deleted order', data);
      res.redirect(`/cart/${orderID}`);
    });
});

// SUBMIT ORDER
router.post('/submitOrder/:orderID', (req, res) => {
  const orderID = req.params.orderID;
  userQueries.submitOrder(orderID)
    .then((data) => {
      //  Leave commented to save $$
      // client.messages
      //   .create({
      //     body: 'Hello from twilio-node',
      //     to: '+16472398492', // Text your number
      //     from: '+14085604628', // From a valid Twilio number
      //   })
      //   .then((message) => console.log(message.sid));
      res.redirect('/orders');
    });
});

router.post('/removeFoodItem/:orderID', (req, res) => {
  // need orderID and the food_items.id
  const orderID = req.params.orderID;
  const foodItemName = req.body.foodItemName;
  userQueries.removeFoodItem(foodItemName, orderID)
    .then((data) => {
      console.log('deleted foodItem from order', data)

      res.redirect(`/cart/${orderID}`);
    });

});

router.post('/updateQuantity/:orderID', (req, res) => {
  const newQuantity = req.body.quantity;
  const orderID = req.params.orderID;
  const orderContentId = req.body.order_contents_id;

  console.log("orderContentID", orderContentId, "newQuan", newQuantity)
  userQueries.updateQuantity(newQuantity, orderContentId)
    .then((data) => {
      console.log(data);
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
