'use strict';

const db = require('../db');

//--------------------------------------------------------------------------
// Create a new order
exports.createOrder = (orderData) => {
  const { user_id, dish_id, size, ingredients, total_price, used_2fa } = orderData;
    
    return new Promise((resolve, reject) => {
      // Begin transaction
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        try {
          // Insert main order record
          const orderQuery = `
            INSERT INTO orders (user_id, dish_id, size, total_price, status, used_2fa, created_at)
            VALUES (?, ?, ?, ?, 'confirmed', ?, datetime('now'))
          `;
          
          this.db.run(orderQuery, [user_id, dish_id, size, total_price, used_2fa], function(err) {
            if (err) {
              this.db.run('ROLLBACK');
              return reject(err);
            }
            
            const orderId = this.lastID;
            
            // Insert order ingredients
            if (ingredients.length > 0) {
              const ingredientQuery = `
                INSERT INTO order_ingredients (order_id, ingredient_id)
                VALUES (?, ?)
              `;
              
              ingredients.forEach(ingredientId => {
                this.db.run(ingredientQuery, [orderId, ingredientId]);
              });
            }
            // Update ingredient availability
            ingredients.forEach(ingredientId => {
              this.db.run(`
                UPDATE ingredients 
                SET available_portions = available_portions - 1 
                WHERE id = ? AND available_portions IS NOT NULL AND available_portions > 0
              `, [ingredientId]);
            });
            
            this.db.run('COMMIT');
            
            // Return the created order
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
        } catch (error) {
          this.db.run('ROLLBACK');
          reject(error);
        }
      });
    });
};

//--------------------------------------------------------------------------
// Add order items (ingredients) to an order
exports.addOrderItems = (orderId, ingredientIds) => {
  return new Promise((resolve, reject) => {
    if (ingredientIds.length === 0) {
      resolve();
      return;
    }

    // Count ingredient quantities
    const ingredientCounts = {};
    ingredientIds.forEach(id => {
      ingredientCounts[id] = (ingredientCounts[id] || 0) + 1;
    });

    const sql = `
      INSERT INTO OrderItems (order_id, ingredient_id, quantity, price)
      SELECT ?, ?, ?, price FROM Ingredients WHERE id = ?
    `;

    let completed = 0;
    const total = Object.keys(ingredientCounts).length;
    let hasError = false;

    for (const [ingredientId, quantity] of Object.entries(ingredientCounts)) {
      db.run(sql, [orderId, parseInt(ingredientId), quantity, parseInt(ingredientId)], (err) => {
        if (err && !hasError) {
          hasError = true;
          reject(err);
        } else {
          completed++;
          if (completed === total && !hasError) {
            resolve();
          }
        }
      });
    }
  });
};

//--------------------------------------------------------------------------
// Get orders for a user
exports.getOrdersByUserId = (userId) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        o.id,
        o.dish_id,
        o.size,
        o.total_price,
        o.status,
        o.used_2fa,
        o.created_at,
        d.name as dish_name
      FROM Orders o
      JOIN Dishes d ON o.dish_id = d.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `;
    
    db.all(sql, [userId], async (err, orders) => {
      if (err) {
        reject(err);
      } else {
        try {
          // Get order items for each order
          const ordersWithItems = await Promise.all(orders.map(async (order) => {
            const items = await this.getOrderItems(order.id);
            return {
              ...order,
              used_2fa: order.used_2fa === 1,
              items: [{
                dish_name: order.dish_name,
                size: order.size,
                total_price: order.total_price,
                ingredients: items.map(item => item.ingredient_name)
              }]
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
// Get order items for an order
exports.getOrderItems = (orderId) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        oi.ingredient_id,
        oi.quantity,
        oi.price,
        i.name as ingredient_name
      FROM OrderItems oi
      JOIN Ingredients i ON oi.ingredient_id = i.id
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
      FROM orders o
      WHERE o.id = ? AND o.user_id = ?
    `;

    this.db.get(checkQuery, [orderId, userId], (err, order) => {
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
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');

        try {
          // First get all ingredients associated with this order with counts
          // This query counts occurrences of each ingredient in the order
          this.db.all(`
            SELECT ingredient_id, COUNT(*) as quantity
            FROM order_ingredients
            WHERE order_id = ?
            GROUP BY ingredient_id
          `, [orderId], (err, ingredientCounts) => {
            if (err) {
              this.db.run('ROLLBACK');
              return reject(err);
            }

            // Update order status to cancelled
            this.db.run(`
              UPDATE orders
              SET status = 'cancelled'
              WHERE id = ?
            `, [orderId], (err) => {
              if (err) {
                this.db.run('ROLLBACK');
                return reject(err);
              }

              // Return ingredients to inventory based on their quantities in the order
              if (ingredientCounts && ingredientCounts.length > 0) {
                const updatePromises = ingredientCounts.map(item => {
                  return new Promise((resolveUpdate) => {
                    this.db.run(`
                      UPDATE ingredients
                      SET available_portions = available_portions + ?
                      WHERE id = ? AND available_portions IS NOT NULL
                    `, [item.quantity, item.ingredient_id], () => {
                      resolveUpdate();
                    });
                  });
                });

                // Wait for all ingredient updates to complete
                Promise.all(updatePromises)
                  .then(() => {
                    this.db.run('COMMIT');
                    resolve(true);
                  })
                  .catch(error => {
                    this.db.run('ROLLBACK');
                    reject(error);
                  });
              } else {
                // No ingredients to update
                this.db.run('COMMIT');
                resolve(true);
              }
            });
          });
        } catch (error) {
          this.db.run('ROLLBACK');
          reject(error);
        }
      });
    });
  });
};