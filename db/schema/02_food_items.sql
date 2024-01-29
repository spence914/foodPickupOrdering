-- Drop and recreate food_items table:

DROP TABLE IF EXISTS food_items CASCADE;
CREATE TABLE food_items (
  id SERIAL PRIMARY KEY NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price INT,
  thumbnail_photo_url VARCHAR(255)
);
