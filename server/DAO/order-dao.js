'use strict';

const db = require('../db');

//--------------------------------------------------------------------------
// Create a new order
exports.createOrder = (orderData) => {
  const { user_id, dish_id, size, ingredients, total_price, used_2fa } = orderData;
    
  return new Promise((resolve, reject) => {
    // Begin transaction
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      try {
        // Insert main order record
        const orderQuery = `
          INSERT INTO Orders (user_id, status, used_2fa, created_at)
          VALUES (?, 'confirmed', ?, datetime('now'))
        `;
        
        db.run(orderQuery, [user_id, used_2fa], function(err) {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }
          
          const orderId = this.lastID;
          
          // Insert order item
          const orderItemQuery = `
            INSERT INTO OrderItems (order_id, dish_id, size)
            VALUES (?, ?, ?)
          `;
          
          db.run(orderItemQuery, [orderId, dish_id, size], function(err) {
            if (err) {
              db.run('ROLLBACK');
              return reject(err);
            }
            
            const orderItemId = this.lastID;
            
            // Insert order ingredients
            if (ingredients.length > 0) {
              const ingredientQuery = `
                INSERT INTO OrderIngredients (order_item_id, ingredient_id)
                VALUES (?, ?)
              `;
              
              let ingredientCount = 0;
              ingredients.forEach(ingredientId => {
                db.run(ingredientQuery, [orderItemId, ingredientId], (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    return reject(err);
                  }
                  ingredientCount++;
                  if (ingredientCount === ingredients.length) {
                    // Update ingredient availability
                    updateIngredientAvailability(ingredients, () => {
                      db.run('COMMIT');
                      resolve({ 
                        id: orderId, 
                        user_id, 
                        dish_id, 
                        size,
                        total_price, 
                        status: 'confirmed',
                        used_2fa: used_2fa ? true : false,
                        created_at: new Date().toISOString()
                      });
                    });
                  }
                });
              });
            } else {
              db.run('COMMIT');
              resolve({ 
                id: orderId, 
                user_id, 
                dish_id, 
                size,
                total_price, 
                status: 'confirmed',
                used_2fa: used_2fa ? true : false,
                created_at: new Date().toISOString()
              });
            }
          });
        });
      } catch (error) {
        db.run('ROLLBACK');
        reject(error);
      }
    });
  });
  
  function updateIngredientAvailability(ingredientIds, callback) {
    let updatedCount = 0;
    ingredientIds.forEach(ingredientId => {
      db.run(`
        UPDATE Ingredients 
        SET available_portions = available_portions - 1 
        WHERE id = ? AND available_portions IS NOT NULL AND available_portions > 0
      `, [ingredientId], () => {
        updatedCount++;
        if (updatedCount === ingredientIds.length) {
          callback();
        }
      });
    });
    if (ingredientIds.length === 0) {
      callback();
    }
  }
};

//--------------------------------------------------------------------------
// Get orders for a user
exports.getOrdersByUserId = (userId) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        o.id,
        o.status,
        o.used_2fa,
        o.created_at,
        oi.dish_id,
        oi.size,
        d.name as dish_name
      FROM Orders o
      JOIN OrderItems oi ON o.id = oi.order_id
      JOIN Dishes d ON oi.dish_id = d.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `;
    
    db.all(sql, [userId], async (err, orders) => {
      if (err) {
        reject(err);
      } else {
        try {
          // Get order ingredients for each order
          const ordersWithItems = await Promise.all(orders.map(async (order) => {
            const ingredients = await this.getOrderIngredients(order.id);
            return {
              ...order,
              used_2fa: order.used_2fa === 1,
              ingredients: ingredients.map(ing => ing.ingredient_name)
            };
          }));
          resolve(ordersWithItems);
        } catch (error) {
          reject(error);
        }
      }
    });
  });
};

//--------------------------------------------------------------------------
// Get order ingredients for an order
exports.getOrderIngredients = (orderId) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        i.id as ingredient_id,
        i.name as ingredient_name
      FROM OrderItems oi
      JOIN OrderIngredients oig ON oi.id = oig.order_item_id
      JOIN Ingredients i ON oig.ingredient_id = i.id
      WHERE oi.order_id = ?
    `;
    
    db.all(sql, [orderId], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

//--------------------------------------------------------------------------
// Cancel an order
exports.cancelOrder = (orderId, userId, isTotp = false) => {
  return new Promise((resolve, reject) => {
    // First check if the order exists and belongs to the user
    const checkQuery = `
      SELECT o.*, o.status AS order_status, o.used_2fa
      FROM Orders o
      WHERE o.id = ? AND o.user_id = ?
    `;

    db.get(checkQuery, [orderId, userId], (err, order) => {
      if (err) {
        return reject(err);
      }

      if (!order) {
        return reject(new Error('Order not found or does not belong to user'));
      }

      // Check if order is in a cancellable state
      if (order.order_status !== 'confirmed') {
        return reject(new Error('Cannot cancel order in its current state'));
      }

      // If order was placed with 2FA, require 2FA to cancel
      if (order.used_2fa === 1 && !isTotp) {
        return reject(new Error('2FA authentication required to cancel this order'));
      }

      // Begin transaction for cancellation
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        try {
          // Get ingredients to restore availability
          db.all(`
            SELECT oig.ingredient_id, COUNT(*) as quantity
            FROM OrderItems oi
            JOIN OrderIngredients oig ON oi.id = oig.order_item_id
            WHERE oi.order_id = ?
            GROUP BY oig.ingredient_id
          `, [orderId], (err, ingredientCounts) => {
            if (err) {
              db.run('ROLLBACK');
              return reject(err);
            }

            // Update order status to cancelled
            db.run(`
              UPDATE Orders
              SET status = 'cancelled'
              WHERE id = ?
            `, [orderId], (err) => {
              if (err) {
                db.run('ROLLBACK');
                return reject(err);
              }

              // Return ingredients to inventory
              if (ingredientCounts && ingredientCounts.length > 0) {
                let updatedCount = 0;
                ingredientCounts.forEach(item => {
                  db.run(`
                    UPDATE Ingredients
                    SET available_portions = available_portions + ?
                    WHERE id = ? AND available_portions IS NOT NULL
                  `, [item.quantity, item.ingredient_id], () => {
                    updatedCount++;
                    if (updatedCount === ingredientCounts.length) {
                      db.run('COMMIT');
                      resolve(true);
                    }
                  });
                });
              } else {
                db.run('COMMIT');
                resolve(true);
              }
            });
          });
        } catch (error) {
          db.run('ROLLBACK');
          reject(error);
        }
      });
    });
  });
};