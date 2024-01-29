const db = require('../connection');

const getUsers = () => {
  return db.query('SELECT * FROM users;')
    .then(data => {
      return data.rows;
    });
};

// getOrders function => grab all order historical order listing for given userID, order by most recent

module.exports = { getUsers };
