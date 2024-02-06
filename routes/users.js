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
  SELECT id, name, description, price, thumbnail_photo_url FROM food_items;
  `;

  const userID = req.cookies.user_id || 1; // set default value to 1 incase no cookie exists

  db.query(queryCurrentOrder, [userID])
    .then((data) => {
      if (!data.rows[0]) {
        //  no current order exists
        // console.log("Creating new order");
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
          // console.log("foodItems", foodItems);
          res.render('index', { foodItems: foodItems.rows, orderID })
        });
    });
});

// ORDER HISTORY
router.get('/orders', (req, res) => {
  const userID = req.cookies.user_id;
  if (userID === '1') {
    res.redirect('/orders/admin');
  } res.redirect('/orders/users');
});

router.get('/orders/users', (req, res) => {
  const userID = req.cookies.user_id;


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
    orders.user_id = $1
  GROUP BY
    orders.id
  ORDER BY orders.created_at DESC;`;

  db.query(queryString, [userID])
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

// Admin Orders page

router.get('/orders/admin', (req, res) => {

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

router.post('/orders/admin/time', (req, res) => {
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
  const orderID = req.params.orderID;
  let templateVars;

  userQueries.getOrders(orderID)
    .then((data) => {
      templateVars = { foodItems : data, orderID : orderID };
      return userQueries.getSubtotal(orderID);
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
      res.redirect(`/cart/${orderID}`);
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
          //   .then((message) => console.log(message.sid));
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
      res.redirect(`/cart/${orderID}`);
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
      res.redirect(`/cart/${orderID}`);
    })
    .catch((err) => {
      res.send(err);
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
      console.log(data.rows);
      if (data.rows.length === 0) {
        // food item has no listings in current cart
        // needs to be added in
        db.query(queryAddToCart, [orderID, foodItemID, quantity])
          .then(() => res.redirect('/'));
      }
      if (data.rows.length > 0) {
        // food item has a listing
        // update quantity
        db.query(queryUpdateCart, [quantity, orderID, foodItemID])
          .then(() => res.redirect('/'));
      }
    });


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
