-- Drop existing tables (if reinitializing)
DROP TABLE IF EXISTS OrderIngredients;
DROP TABLE IF EXISTS Orders;
DROP TABLE IF EXISTS IngredientIncompatibilities;
DROP TABLE IF EXISTS IngredientRequirements;
DROP TABLE IF EXISTS Ingredients;
DROP TABLE IF EXISTS Dishes;
DROP TABLE IF EXISTS Users;

-- Orders table to store customer orders
CREATE TABLE Orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  dish_id INTEGER NOT NULL,
  size VARCHAR(10) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id),
  FOREIGN KEY (dish_id) REFERENCES Dishes(id)
);

-- OrderIngredients table to store the ingredients for each order
CREATE TABLE OrderIngredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_item_id INTEGER NOT NULL,
  ingredient_id INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  FOREIGN KEY (order_item_id) REFERENCES Orders(id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES Ingredients(id)
);

---------------------------
-- Users Table (with TOTP secret)
---------------------------
CREATE TABLE Users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  totp_secret TEXT NOT NULL
);

---------------------------
-- Base Dishes Table
---------------------------
CREATE TABLE Dishes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

---------------------------
-- Dish Pricing and Size Constraints Table
---------------------------
CREATE TABLE DishPricing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dish_id INTEGER NOT NULL,
  size VARCHAR(10) NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  max_ingredients INTEGER NOT NULL,
  UNIQUE(dish_id, size),
  FOREIGN KEY (dish_id) REFERENCES Dishes(id)
);

---------------------------
-- Ingredients Table
---------------------------
CREATE TABLE Ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  price REAL NOT NULL,
  available_portions INTEGER  -- NULL means unlimited availability
);

---------------------------
-- Ingredient Dependency Rules
---------------------------
CREATE TABLE IngredientRequirements (
  ingredient_id INTEGER NOT NULL,
  required_ingredient_id INTEGER NOT NULL,
  PRIMARY KEY (ingredient_id, required_ingredient_id),
  FOREIGN KEY (ingredient_id) REFERENCES Ingredients(id),
  FOREIGN KEY (required_ingredient_id) REFERENCES Ingredients(id)
);

---------------------------
-- Ingredient Incompatibilities
---------------------------
CREATE TABLE IngredientIncompatibilities (
  ingredient_id INTEGER NOT NULL,
  incompatible_with_id INTEGER NOT NULL,
  PRIMARY KEY (ingredient_id, incompatible_with_id),
  FOREIGN KEY (ingredient_id) REFERENCES Ingredients(id),
  FOREIGN KEY (incompatible_with_id) REFERENCES Ingredients(id)
);


------------------------------------
-- Insert initial data
------------------------------------

-- Insert Base Dishes
INSERT INTO Dishes (name) VALUES 
  ('pizza'),
  ('pasta'),
  ('salad');

-- Insert Dish Pricing and Size Constraints
INSERT INTO DishPricing (dish_id, size, base_price, max_ingredients) VALUES 
  (1, 'Small', 5.00, 3),
  (1, 'Medium', 7.00, 5),
  (1, 'Large', 9.00, 7),
  (2, 'Small', 5.00, 3),
  (2, 'Medium', 7.00, 5),
  (2, 'Large', 9.00, 7),
  (3, 'Small', 5.00, 3),
  (3, 'Medium', 7.00, 5),
  (3, 'Large', 9.00, 7);



-- Insert Ingredients with prices and availability
INSERT INTO Ingredients (name, price, available_portions) VALUES 
  ('mozzarella', 1.00, 3),
  ('tomatoes', 0.50, NULL),
  ('mushrooms', 0.80, 3),
  ('ham', 1.20, 2),
  ('olives', 0.70, NULL),
  ('tuna', 1.50, 2),
  ('eggs', 1.00, NULL),
  ('anchovies', 1.50, 1),
  ('parmesan', 1.20, NULL),
  ('carrots', 0.40, NULL),
  ('potatoes', 0.30, NULL);

-- Insert Ingredient Requirements (dependencies)
-- tomatoes require olives
INSERT INTO IngredientRequirements (ingredient_id, required_ingredient_id)
  SELECT i1.id, i2.id FROM Ingredients i1, Ingredients i2 WHERE i1.name = 'tomatoes' AND i2.name = 'olives';
-- parmesan requires mozzarella
INSERT INTO IngredientRequirements (ingredient_id, required_ingredient_id)
  SELECT i1.id, i2.id FROM Ingredients i1, Ingredients i2 WHERE i1.name = 'parmesan' AND i2.name = 'mozzarella';
-- mozzarella requires tomatoes
INSERT INTO IngredientRequirements (ingredient_id, required_ingredient_id)
  SELECT i1.id, i2.id FROM Ingredients i1, Ingredients i2 WHERE i1.name = 'mozzarella' AND i2.name = 'tomatoes';
-- tuna requires olives
INSERT INTO IngredientRequirements (ingredient_id, required_ingredient_id)
  SELECT i1.id, i2.id FROM Ingredients i1, Ingredients i2 WHERE i1.name = 'tuna' AND i2.name = 'olives';

-- Insert Ingredient Incompatibilities
-- eggs incompatible with mushrooms and tomatoes
INSERT INTO IngredientIncompatibilities (ingredient_id, incompatible_with_id)
  SELECT i1.id, i2.id FROM Ingredients i1, Ingredients i2 WHERE i1.name = 'eggs' AND i2.name = 'mushrooms';
INSERT INTO IngredientIncompatibilities (ingredient_id, incompatible_with_id)
  SELECT i1.id, i2.id FROM Ingredients i1, Ingredients i2 WHERE i1.name = 'eggs' AND i2.name = 'tomatoes';
-- ham incompatible with mushrooms
INSERT INTO IngredientIncompatibilities (ingredient_id, incompatible_with_id)
  SELECT i1.id, i2.id FROM Ingredients i1, Ingredients i2 WHERE i1.name = 'ham' AND i2.name = 'mushrooms';
-- olives incompatible with anchovies
INSERT INTO IngredientIncompatibilities (ingredient_id, incompatible_with_id)
  SELECT i1.id, i2.id FROM Ingredients i1, Ingredients i2 WHERE i1.name = 'olives' AND i2.name = 'anchovies';

-- Insert Users (passwords are all 'pwd' hashed with salt, all with same TOTP secret)
INSERT INTO Users (username, password_hash, salt, totp_secret) VALUES 
  ('alice', '15d3c4fca80fa608dcedeb65ac10eff78d20c88800d016369a3d2963742ea288', '72e4eeb14def3b21', 'LXBSMDTMSP2I5XFXIYRGFVWSFI'),
  ('bob', '15d3c4fca80fa608dcedeb65ac10eff78d20c88800d016369a3d2963742ea288', '72e4eeb14def3b21', 'LXBSMDTMSP2I5XFXIYRGFVWSFI'),
  ('charlie', '15d3c4fca80fa608dcedeb65ac10eff78d20c88800d016369a3d2963742ea288', '72e4eeb14def3b21', 'LXBSMDTMSP2I5XFXIYRGFVWSFI'),
  ('diana', '15d3c4fca80fa608dcedeb65ac10eff78d20c88800d016369a3d2963742ea288', '72e4eeb14def3b21', 'LXBSMDTMSP2I5XFXIYRGFVWSFI');

-- Insert sample orders
-- Alice's orders (user_id = 1)
INSERT INTO Orders (user_id, dish_id, size, total_price, created_at) VALUES 
  (1, 1, 'Small',7.2 , '2024-12-20 10:30:00'),
  (1, 3, 'Small',6.5 , '2024-12-21 14:15:00');

INSERT INTO Orders (user_id, dish_id, size, total_price, created_at) VALUES 
  (1, 2, 'Large',11.2 , '2024-12-20 10:30:00'),
  (1, 3, 'Small',6.6 , '2024-12-21 14:15:00');

-- Bob's order (user_id = 2)
INSERT INTO Orders (user_id, dish_id, size, total_price, created_at) VALUES 
  (2, 2, 'Medium',9.2 , '2024-12-20 10:30:00'),
  (2, 3, 'Small',8.7, '2024-12-21 14:15:00');

INSERT INTO Orders (user_id, dish_id, size, total_price, created_at) VALUES 
  (2, 1, 'Medium',9.2 , '2024-12-20 10:30:00'),
  (2, 3, 'Small',6.9, '2024-12-21 14:15:00');

-- Sample ingredients for orders (adjust availability accordingly)
-- Alice's first order ingredients
INSERT INTO OrderIngredients (order_item_id, ingredient_id) VALUES
  (1, 2), (1, 5), (1, 1), -- pizza: tomatoes, olives, mozzarella
  (2, 2), (2, 5), (2, 10); -- salad: tomatoes, olives, carrots

-- Alice's second order ingredients  
INSERT INTO OrderIngredients (order_item_id, ingredient_id) VALUES
  (3, 2), (3, 5), (3, 1), (3, 9), -- pasta: tomatoes, olives, mozzarella, parmesan
  (4, 2), (4, 5), (4, 6), (4, 1); -- pizza: tomatoes, olives, tuna, mozzarella

-- Bob's first order ingredients
INSERT INTO OrderIngredients (order_item_id, ingredient_id) VALUES
  (5, 2), (5, 5), (5, 1), -- pasta: tomatoes, olives, mozzarella
  (6, 2), (6, 5), (6, 10); -- salad: tomatoes, olives, carrots

-- Bob's second order ingredients
INSERT INTO OrderIngredients (order_item_id, ingredient_id) VALUES
  (7, 2), (7, 5), (7, 1), (7, 9), -- pizza: tomatoes, olives, mozzarella, parmesan
  (8, 2), (8, 5), (8, 10), (8, 11); -- salad: tomatoes, olives, carrots, potatoes

-- Note: The initial availability in the Ingredients table already accounts for these used ingredients
-- to match the requirements in the exam text
-- Ingredients for Order 3, Item 1 (assume pasta: tomatoes, mozzarella, olives)
INSERT INTO OrderIngredients (order_item_id, ingredient_id)
  SELECT oi.id, i.id FROM Orders oi, Ingredients i 
    WHERE oi.id = 3 AND oi.size = 'Small' 
      AND i.name IN ('tomatoes', 'mozzarella', 'olives');
-- Ingredients for Order 3, Item 2 (assume salad: tomatoes, mozzarella)
INSERT INTO OrderIngredients (order_item_id, ingredient_id)
  SELECT oi.id, i.id FROM Orders oi, Ingredients i 
    WHERE oi.id = 3 AND oi.size = 'Small'
      AND i.name IN ('tomatoes', 'mozzarella');

-- Ingredients for Order 4, Item 1 (assume pizza: tomatoes, mozzarella, parmesan)
INSERT INTO OrderIngredients (order_item_id, ingredient_id)
  SELECT oi.id, i.id FROM Orders oi, Ingredients i 
    WHERE oi.id = 4 AND oi.size = 'Medium'
      AND i.name IN ('tomatoes', 'mozzarella', 'parmesan');
      
-- Ingredients for Order 4, Item 2 (assume salad: tomatoes, olives, tuna)
INSERT INTO OrderIngredients (order_item_id, ingredient_id)
  SELECT oi.id, i.id FROM Orders oi, Ingredients i 
    WHERE oi.id = 4 AND oi.size = 'Large'
      AND i.name IN ('tomatoes', 'olives', 'tuna');
