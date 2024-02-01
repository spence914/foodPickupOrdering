const db = require('../connection');

const getUsers = () => {
  return db.query('SELECT * FROM users;')
    .then(data => {
      return data.rows;
    });
};

// getOrders function => grab all order historical order listing for given userID, order by most recent
const getOrders = (orderId) => {

  const queryString = `
  SELECT name, price, thumbnail_photo_url, description, order_contents.quantity
  FROM food_items
  JOIN order_contents on (food_items.id = order_contents.food_item_id)
  JOIN orders on (order_contents.order_id = orders.id)
  WHERE orders.id = $1;
  `;

  return db.query(queryString, [orderId])
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

module.exports = {
  getUsers,
  getOrders,
  getOrderHistory
};
