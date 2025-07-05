'use strict';

const db = require('../db');

//--------------------------------------------------------------------------
// Get all ingredients with availability
exports.getAllIngredients = () => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM Ingredients ORDER BY name';
    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const ingredients = rows.map(row => ({
          id: row.id,
          name: row.name,
          price: row.price,
          available_portions: row.available_portions
        }));
        resolve(ingredients);
      }
    });
  });
};

//--------------------------------------------------------------------------
// Get ingredient by ID
exports.getIngredientById = (id) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM Ingredients WHERE id = ?';
    db.get(sql, [id], (err, row) => {
      if (err) {
        reject(err);
      } else if (row === undefined) {
        resolve(null);
      } else {
        const ingredient = {
          id: row.id,
          name: row.name,
          price: row.price,
          available_portions: row.available_portions
        };
        resolve(ingredient);
      }
    });
  });
};

//--------------------------------------------------------------------------
// Get ingredient requirements (dependencies)
exports.getIngredientRequirements = () => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT ir.ingredient_id, ir.required_ingredient_id, 
             i1.name as ingredient_name, i2.name as required_ingredient_name
      FROM IngredientRequirements ir
      JOIN Ingredients i1 ON ir.ingredient_id = i1.id
      JOIN Ingredients i2 ON ir.required_ingredient_id = i2.id
    `;
    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

//--------------------------------------------------------------------------
// Get ingredient incompatibilities
exports.getIngredientIncompatibilities = () => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT ii.ingredient_id, ii.incompatible_with_id,
             i1.name as ingredient_name, i2.name as incompatible_ingredient_name
      FROM IngredientIncompatibilities ii
      JOIN Ingredients i1 ON ii.ingredient_id = i1.id
      JOIN Ingredients i2 ON ii.incompatible_with_id = i2.id
    `;
    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

//--------------------------------------------------------------------------
// Update ingredient availability after order placement
exports.updateIngredientAvailability = (ingredientIds) => {
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
      UPDATE Ingredients 
      SET available_portions = available_portions - ?
      WHERE id = ? AND available_portions IS NOT NULL AND available_portions >= ?
    `;

    let completed = 0;
    const total = Object.keys(ingredientCounts).length;
    let hasError = false;

    for (const [ingredientId, quantity] of Object.entries(ingredientCounts)) {
      db.run(sql, [quantity, parseInt(ingredientId), quantity], (err) => {
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
// Get multiple ingredients by IDs with their constraints
exports.getIngredientsByIds = (ingredientIds) => {
  return new Promise((resolve, reject) => {
    if (ingredientIds.length === 0) {
      resolve([]);
      return;
    }
    
    const placeholders = ingredientIds.map(() => '?').join(',');
    const sql = `SELECT * FROM Ingredients WHERE id IN (${placeholders})`;
    
    db.all(sql, ingredientIds, async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      try {
        // For each ingredient, get its incompatibilities and requirements
        const ingredients = [];
        for (let ingredient of rows) {
          // Get incompatibilities
          const incompatibilities = await new Promise((resolve, reject) => {
            const incompatibilityQuery = `
              SELECT i.id, i.name
              FROM IngredientIncompatibilities ii
              JOIN Ingredients i ON ii.incompatible_with_id = i.id
              WHERE ii.ingredient_id = ?
              UNION
              SELECT i.id, i.name
              FROM IngredientIncompatibilities ii
              JOIN Ingredients i ON ii.ingredient_id = i.id
              WHERE ii.incompatible_with_id = ?
            `;
            db.all(incompatibilityQuery, [ingredient.id, ingredient.id], (err, incompatibles) => {
              if (err) reject(err);
              else resolve(incompatibles);
            });
          });
          
          // Get requirements
          const requirements = await new Promise((resolve, reject) => {
            const requirementQuery = `
              SELECT i.id, i.name
              FROM IngredientRequirements ir
              JOIN Ingredients i ON ir.required_ingredient_id = i.id
              WHERE ir.ingredient_id = ?
            `;
            db.all(requirementQuery, [ingredient.id], (err, requirements) => {
              if (err) reject(err);
              else resolve(requirements);
            });
          });
          
          ingredients.push({
            ...ingredient,
            incompatible_with: incompatibilities,
            requires: requirements
          });
        }
        
        resolve(ingredients);
      } catch (error) {
        reject(error);
      }
    });
  });
};

