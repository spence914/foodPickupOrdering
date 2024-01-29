-- Drop and recreate order_contents table:

DROP TABLE IF EXISTS order_contents CASCADE;
CREATE TABLE order_contents (
  id SERIAL PRIMARY KEY NOT NULL,
  order_id INT REFERENCES orders(id) ON DELETE CASCADE,
  food_item_id INT REFERENCES food_items(id) ON DELETE CASCADE,
  quantity INT
);
