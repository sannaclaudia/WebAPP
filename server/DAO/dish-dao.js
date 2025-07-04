'use strict';

const db = require('../db');

/**
 * Get all available dishes
 * @returns {Promise<Array>} Array of dish objects
 */
exports.getAllDishes = () => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM Dishes ORDER BY name';
    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

/**
 * Get a dish by ID
 * @param {number} dishId - The dish ID
 * @returns {Promise<Object>} Dish object
 */
exports.getDishById = (dishId) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM Dishes WHERE id = ?';
    
    db.get(sql, [dishId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

/**
 * Check if a dish exists
 * @param {number} dishId - The dish ID
 * @returns {Promise<boolean>} True if dish exists
 */
exports.dishExists = (dishId) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT COUNT(*) as count FROM Dishes WHERE id = ?';
    
    db.get(sql, [dishId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row.count > 0);
      }
    });
  });
};

/**
 * Get dish base price (deprecated - use getDishPriceBySize instead)
 * @param {number} dishId - The dish ID
 * @returns {Promise<number>} Base price of the dish (Small size)
 */
exports.getDishBasePrice = (dishId) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT base_price FROM DishPricing WHERE dish_id = ? AND size = "Small"';
    
    db.get(sql, [dishId], (err, row) => {
      if (err) {
        reject(err);
      } else if (!row) {
        reject(new Error('Dish not found'));
      } else {
        resolve(row.base_price);
      }
    });
  });
};

/**
 * Get dish prices and max ingredients for all sizes
 * @returns {Promise<Object>} Object with prices and maxIngredients
 */
exports.getDishPricing = () => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT size, base_price, max_ingredients 
      FROM DishPricing 
      WHERE dish_id = 1 
      ORDER BY 
        CASE size 
          WHEN 'Small' THEN 1 
          WHEN 'Medium' THEN 2 
          WHEN 'Large' THEN 3 
        END
    `;
    
    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const prices = {};
        const maxIngredients = {};
        
        rows.forEach(row => {
          prices[row.size] = row.base_price;
          maxIngredients[row.size] = row.max_ingredients;
        });
        
        resolve({ prices, maxIngredients });
      }
    });
  });
};

/**
 * Get base price for a specific dish and size
 * @param {number} dishId - The dish ID
 * @param {string} size - The size (Small, Medium, Large)
 * @returns {Promise<number>} Base price for the dish and size
 */
exports.getDishPriceBySize = (dishId, size) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT base_price FROM DishPricing WHERE dish_id = ? AND size = ?';
    
    db.get(sql, [dishId, size], (err, row) => {
      if (err) {
        reject(err);
      } else if (!row) {
        reject(new Error('Dish pricing not found'));
      } else {
        resolve(row.base_price);
      }
    });
  });
};

/**
 * Get max ingredients for a specific size
 * @param {string} size - The size (Small, Medium, Large)
 * @returns {Promise<number>} Maximum number of ingredients for the size
 */
exports.getMaxIngredientsBySize = (size) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT max_ingredients FROM DishPricing WHERE size = ? LIMIT 1';
    
    db.get(sql, [size], (err, row) => {
      if (err) {
        reject(err);
      } else if (!row) {
        reject(new Error('Size not found'));
      } else {
        resolve(row.max_ingredients);
      }
    });
  });
};

/**
 * Get dish pricing information for a specific dish and size
 * @param {number} dishId - The dish ID
 * @param {string} size - The size (Small, Medium, Large)
 * @returns {Promise<Object>} Object with base_price and max_ingredients
 */
exports.getDishPricingInfo = (dishId, size) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT base_price, max_ingredients FROM DishPricing WHERE dish_id = ? AND size = ?';
    
    db.get(sql, [dishId, size], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

