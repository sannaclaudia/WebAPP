'use strict';

const sqlite = require('sqlite3');
const db = new sqlite.Database('./Database/restaurant.sqlite');

// Create a new order
exports.createOrder = (orderData) => {
  return new Promise((resolve, reject) => {
    const { user_id, dish_id, size, ingredients, total_price, used_2fa } = orderData;
    
    // Insert the main order record
    const currentTimestamp = new Date().toISOString();
    const insertOrderQuery = `
      INSERT INTO Orders (user_id, dish_id, size, total_price, used_2fa, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    db.run(insertOrderQuery, [user_id, dish_id, size, total_price, used_2fa ? 1 : 0, currentTimestamp], function(err) {
      if (err) {
        reject(err);
        return;
      }
      
      const orderId = this.lastID;
      
      // If there are ingredients, insert them into OrderIngredients table and update availability
      if (ingredients && ingredients.length > 0) {
        const insertIngredientQuery = `
          INSERT INTO OrderIngredients (order_item_id, ingredient_id, quantity)
          VALUES (?, ?, ?)
        `;
        
        const updateAvailabilityQuery = `
          UPDATE Ingredients 
          SET available_portions = available_portions - ? 
          WHERE id = ? AND available_portions IS NOT NULL AND available_portions >= ?
        `;
        
        let completed = 0;
        let hasError = false;
        
        // Handle ingredients as objects with {id, quantity} or as simple IDs
        ingredients.forEach(ingredient => {
          const ingredientId = typeof ingredient === 'object' ? ingredient.id : ingredient;
          const quantity = typeof ingredient === 'object' ? ingredient.quantity : 1;
          
          // Insert ingredient into OrderIngredients
          db.run(insertIngredientQuery, [orderId, ingredientId, quantity], (err) => {
            if (err && !hasError) {
              hasError = true;
              reject(err);
              return;
            }
            
            // Update ingredient availability
            db.run(updateAvailabilityQuery, [quantity, ingredientId, quantity], (err) => {
              if (err && !hasError) {
                hasError = true;
                reject(err);
                return;
              }
              
              completed++;
              if (completed === ingredients.length && !hasError) {
                resolve({
                  id: orderId,
                  user_id,
                  dish_id,
                  size,
                  ingredients,
                  total_price,
                  used_2fa,
                  created_at: currentTimestamp
                });
              }
            });
          });
        });
      } else {
        // No ingredients, just return the order
        resolve({
          id: orderId,
          user_id,
          dish_id,
          size,
          ingredients: [],
          total_price,
          used_2fa,
          created_at: currentTimestamp
        });
      }
    });
  });
};

// Get orders for a user
exports.getUserOrders = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        o.*,
        d.name as dish_name
      FROM Orders o
      LEFT JOIN Dishes d ON o.dish_id = d.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `;
    
    db.all(query, [userId], (err, orders) => {
      if (err) {
        reject(err);
        return;
      }
      
      // For each order, get its ingredients
      const promises = orders.map(order => {
        return new Promise((resolve, reject) => {
          const ingredientsQuery = `
            SELECT 
              oi.ingredient_id,
              oi.quantity,
              i.name as ingredient_name,
              i.price
            FROM OrderIngredients oi
            JOIN Ingredients i ON oi.ingredient_id = i.id
            WHERE oi.order_item_id = ?
          `;
          
          db.all(ingredientsQuery, [order.id], (err, orderIngredients) => {
            if (err) {
              reject(err);
              return;
            }
            
            resolve({
              ...order,
              orderIngredients: orderIngredients || []
            });
          });
        });
      });
      
      Promise.all(promises)
        .then(ordersWithIngredients => resolve(ordersWithIngredients))
        .catch(err => reject(err));
    });
  });
};

// Get orders for a user with ingredients
exports.getUserOrdersWithIngredients = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        o.*,
        d.name as dish_name
      FROM Orders o
      LEFT JOIN Dishes d ON o.dish_id = d.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `;
    
    db.all(query, [userId], (err, orders) => {
      if (err) {
        reject(err);
        return;
      }
      
      // For each order, check if it has ingredients in OrderIngredients table
      const promises = orders.map(order => {
        return new Promise((resolve, reject) => {
          const ingredientsQuery = `
            SELECT 
              oi.ingredient_id,
              oi.quantity,
              i.name as ingredient_name,
              i.price
            FROM OrderIngredients oi
            JOIN Ingredients i ON oi.ingredient_id = i.id
            WHERE oi.order_item_id = ?
          `;
          
          db.all(ingredientsQuery, [order.id], (err, orderIngredients) => {
            if (err) {
              reject(err);
              return;
            }
            
            resolve({
              ...order,
              orderIngredients: orderIngredients || []
            });
          });
        });
      });
      
      Promise.all(promises)
        .then(ordersWithIngredients => resolve(ordersWithIngredients))
        .catch(err => reject(err));
    });
  });
};

// Cancel an order and restore ingredient availability
exports.cancelOrder = (orderId, userId) => {
  return new Promise((resolve, reject) => {
    // First get the order ingredients to restore availability
    const getIngredientsQuery = `
      SELECT oi.ingredient_id, oi.quantity
      FROM OrderIngredients oi
      JOIN Orders o ON oi.order_item_id = o.id
      WHERE o.id = ? AND o.user_id = ?
    `;
    
    db.all(getIngredientsQuery, [orderId, userId], (err, ingredients) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Check if order exists and can be cancelled
      const checkOrderQuery = `
        SELECT id FROM Orders 
        WHERE id = ? AND user_id = ?
      `;
      
      db.get(checkOrderQuery, [orderId, userId], (err, order) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!order) {
          reject(new Error('Order not found or cannot be cancelled'));
          return;
        }
        
        // Delete order ingredients first
        const deleteIngredientsQuery = `
          DELETE FROM OrderIngredients 
          WHERE order_item_id = ?
        `;
        
        db.run(deleteIngredientsQuery, [orderId], (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Delete the order
          const deleteOrderQuery = `
            DELETE FROM Orders 
            WHERE id = ? AND user_id = ?
          `;
          
          db.run(deleteOrderQuery, [orderId, userId], function(err) {
            if (err) {
              reject(err);
              return;
            }
            
            // Restore ingredient availability
            if (ingredients.length > 0) {
              let completed = 0;
              let hasError = false;
              
              const restoreAvailabilityQuery = `
                UPDATE Ingredients 
                SET available_portions = available_portions + ? 
                WHERE id = ? AND available_portions IS NOT NULL
              `;
              
              ingredients.forEach(ingredient => {
                db.run(restoreAvailabilityQuery, [ingredient.quantity, ingredient.ingredient_id], (err) => {
                  if (err && !hasError) {
                    hasError = true;
                    reject(err);
                  } else {
                    completed++;
                    if (completed === ingredients.length && !hasError) {
                      resolve({ success: true, message: 'Order cancelled and removed successfully' });
                    }
                  }
                });
              });
            } else {
              resolve({ success: true, message: 'Order cancelled and removed successfully' });
            }
          });
        });
      });
    });
  });
};


