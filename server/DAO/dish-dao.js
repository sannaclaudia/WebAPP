'use strict';

const db = require('../db');

//--------------------------------------------------------------------------
// Get all available base dishes
exports.getAllDishes = () => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM Dishes ORDER BY name';
    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const dishes = rows.map(row => ({
          id: row.id,
          name: row.name
        }));
        resolve(dishes);
      }
    });
  });
};

//--------------------------------------------------------------------------
// Get dish prices by size (fixed pricing)
exports.getDishPrices = () => {
  return new Promise((resolve) => {
    resolve({
      Small: 5,
      Medium: 7,
      Large: 9
    });
  });
};

//--------------------------------------------------------------------------
// Get maximum ingredients allowed by size (fixed constraints)
exports.getMaxIngredientsBySize = () => {
  return new Promise((resolve) => {
    resolve({
      Small: 3,
      Medium: 5,
      Large: 7
    });
  });
};


exports.getDishByName = (name) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM Dishes WHERE name = ?';
    db.get(sql, [name], (err, row) => {
      if (err) {
        reject(err);
      } else if (row === undefined) {
        resolve(null);
      } else {
        const dish = {
          id: row.id,
          name: row.name
        };
        resolve(dish);
      }
    });
  });
};

