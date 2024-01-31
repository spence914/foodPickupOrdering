-- Drop and recreate orders table:

DROP TABLE IF EXISTS orders CASCADE;
CREATE TABLE orders (
  id SERIAL PRIMARY KEY NOT NULL,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT NOW(),
  placed_at DATETIME DEFAULT NULL,
  time_to_complete INT DEFAULT NULL
);
