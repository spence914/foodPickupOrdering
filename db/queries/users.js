const db = require('../connection');

const getUsers = () => {
  return db.query('SELECT * FROM users;')
    .then(data => {
      return data.rows;
    });
};

// getAllFoodItems function
const getAllFoodItems = () => {
  const queryString = `
  SELECT id, name, description, (price/100) as price
  FROM food_items;
  `;

  return db.query(queryString)
    .then((data) => {
      return data.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

// getOrders function => grab all order historical order listing for given userID, order by most recent
const getOrders = (orderID) => {
  const queryString = `
  SELECT food_items.name, CAST((food_items.price / 100) as numeric(10,2)) as price, thumbnail_photo_url, description, order_contents.quantity, order_contents.id as order_contentsId, orders.placed_at
  FROM food_items
  JOIN order_contents on (food_items.id = order_contents.food_item_id)
  JOIN orders on (order_contents.order_id = orders.id)
  WHERE orders.id = $1;
  `;

  return db.query(queryString, [orderID])
    .then((data) => {
      return data.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

// calculate subtotal for current order
const getSubtotal = (orderID) => {
  const queryString = `
    SELECT SUM(price * order_contents.quantity)/100 AS subtotal
    FROM food_items
    JOIN order_contents on (food_items.id = order_contents.food_item_id)
    JOIN orders on (order_contents.order_id = orders.id)
    WHERE orders.id = $1
    GROUP BY orders.id, price, order_contents.quantity;
  `;

  return db.query(queryString, [orderID])
    .then((data) => {
      return data.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

// delete the whole current cart order
const cancelCartOrder = (orderID) => {
  const queryString = `
    DELETE FROM orders
    WHERE id = $1
    RETURNING *;
  `;

  return db.query(queryString, [orderID])
    .then((data) => {
      return data.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

// This is for spencer's ORDER HISTORY, get /orders/:userID
const getOrderHistory = (userID) => {
  const queryString = `
  SELECT id, created_at, status FROM orders WHERE user_id = $1;
  `;

  return db.query(queryString, [userID])
    .then((data) => {
      return data.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

// Submit order, add value to column place_at
const submitOrder = (orderID) => {
  const queryString = `
    UPDATE orders
    SET placed_at = CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
    WHERE id = $1
    RETURNING *;
  `;

  return db.query(queryString, [orderID])
    .then((data) => {
      return data.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};

// delete order_contents that consist of food_items.name = ?
const removeFoodItem = (foodItemName, orderID) => {
  const queryString = `
    DELETE FROM order_contents
    USING food_items, orders
    WHERE (order_contents.food_item_id = food_items.id)
    AND (order_contents.order_id = orders.id)
    AND food_items.name = $1
    AND orders.id = $2
    RETURNING *;
  `;

  return db.query(queryString, [foodItemName, orderID])
    .then((data) => {
      return data.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};

// Function that update the quantity of a order_contents
const updateQuantity = (newQuantity, orderContentId) => {
  const queryString = `
  UPDATE order_contents
  SET quantity = $1
  WHERE id = $2
  RETURNING *;
  `;

  return db.query(queryString, [newQuantity, orderContentId])
    .then((data) => {
      return data.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });

};

module.exports = {
  getUsers,
  getAllFoodItems,
  getOrders,
  cancelCartOrder,
  getOrderHistory,
  submitOrder,
  removeFoodItem,
  updateQuantity,
  getSubtotal
};
