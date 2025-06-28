'use strict';

const ingredientDao = require('./ingredient-dao');
const dishDao = require('./dish-dao');

//--------------------------------------------------------------------------
// Validate an order configuration
exports.validateOrder = async (dishId, size, ingredientIds) => {
  const errors = [];
  
  try {
    // Check if dish exists
    const dish = await dishDao.getDishById(dishId);
    if (!dish) {
      errors.push('Invalid dish selected');
      return { valid: false, errors };
    }

    // Check if size is valid
    const validSizes = ['Small', 'Medium', 'Large'];
    if (!validSizes.includes(size)) {
      errors.push('Invalid size selected');
      return { valid: false, errors };
    }
    
    // Check maximum ingredients for size
    const maxIngredients = await dishDao.getMaxIngredientsBySize();
    if (ingredientIds.length > maxIngredients[size]) {
      errors.push(`Too many ingredients for ${size} size (max ${maxIngredients[size]})`);
      return { valid: false, errors };
    }
    
    // Count ingredient quantities
    const ingredientCounts = {};
    ingredientIds.forEach(id => {
      ingredientCounts[id] = (ingredientCounts[id] || 0) + 1;
    });
    
    // Check each unique ingredient
    const ingredients = [];
    for (const [id, quantity] of Object.entries(ingredientCounts)) {
      const ingredient = await ingredientDao.getIngredientById(parseInt(id));
      if (!ingredient) {
        errors.push(`Invalid ingredient with ID ${id}`);
      } else {
        // Check availability
        if (ingredient.available_portions !== null && quantity > ingredient.available_portions) {
          errors.push(`Not enough ${ingredient.name} available (requested: ${quantity}, available: ${ingredient.available_portions})`);
        }
        ingredients.push({ ...ingredient, requestedQuantity: quantity });
      }
    }
    
    if (errors.length > 0) {
      return { valid: false, errors };
    }
    
    // Check requirements and incompatibilities for unique ingredients
    const uniqueIngredientIds = Object.keys(ingredientCounts).map(id => parseInt(id));
    const requirementErrors = await checkRequirements(uniqueIngredientIds);
    const incompatibilityErrors = await checkIncompatibilities(uniqueIngredientIds);
    
    errors.push(...requirementErrors, ...incompatibilityErrors);
    
    return {
      valid: errors.length === 0,
      errors
    };
    
  } catch (error) {
    return {
      valid: false,
      errors: ['Validation error: ' + error.message]
    };
  }
};

//--------------------------------------------------------------------------
// Check if all ingredient requirements are satisfied
async function checkRequirements(ingredientIds) {
  const errors = [];
  
  try {
    const requirements = await ingredientDao.getIngredientRequirements();
    
    for (const req of requirements) {
      // If an ingredient is selected, check if its requirements are also selected
      if (ingredientIds.includes(req.ingredient_id)) {
        if (!ingredientIds.includes(req.required_ingredient_id)) {
          errors.push(`${req.ingredient_name} requires ${req.required_ingredient_name}`);
        }
      }
    }
    
    return errors;
  } catch (error) {
    return ['Error checking requirements: ' + error.message];
  }
}

//--------------------------------------------------------------------------
// Check if there are any incompatible ingredients selected
async function checkIncompatibilities(ingredientIds) {
  const errors = [];
  
  try {
    const incompatibilities = await ingredientDao.getIngredientIncompatibilities();
    
    for (const incomp of incompatibilities) {
      // If both incompatible ingredients are selected
      if (ingredientIds.includes(incomp.ingredient_id) && 
          ingredientIds.includes(incomp.incompatible_with_id)) {
        errors.push(`${incomp.ingredient_name} is incompatible with ${incomp.incompatible_ingredient_name}`);
      }
    }
    
    return errors;
  } catch (error) {
    return ['Error checking incompatibilities: ' + error.message];
  }
}

//--------------------------------------------------------------------------
// Calculate order total price
exports.calculateOrderTotal = async (dishId, size, ingredientIds) => {
  try {
    // Get base price for size
    const dishPrices = await dishDao.getDishPrices();
    let total = dishPrices[size] || 0;
    
    // Add ingredient prices
    for (const ingredientId of ingredientIds) {
      const ingredient = await ingredientDao.getIngredientById(ingredientId);
      if (ingredient) {
        total += ingredient.price;
      }
    }
    
    return total;
  } catch (error) {
    throw new Error('Error calculating total: ' + error.message);
  }
};

//--------------------------------------------------------------------------
// Get ingredients with their constraints for display
exports.getIngredientsWithConstraints = async () => {
  try {
    const ingredients = await ingredientDao.getAllIngredients();
    const requirements = await ingredientDao.getIngredientRequirements();
    const incompatibilities = await ingredientDao.getIngredientIncompatibilities();
    
    // Add constraint information to each ingredient
    const ingredientsWithConstraints = ingredients.map(ingredient => ({
      ...ingredient,
      requires: requirements
        .filter(req => req.ingredient_id === ingredient.id)
        .map(req => ({
          id: req.required_ingredient_id,
          name: req.required_ingredient_name
        })),
      incompatible_with: incompatibilities
        .filter(incomp => incomp.ingredient_id === ingredient.id)
        .map(incomp => ({
          id: incomp.incompatible_with_id,
          name: incomp.incompatible_ingredient_name
        }))
        .concat(
          // Add reverse incompatibilities
          incompatibilities
            .filter(incomp => incomp.incompatible_with_id === ingredient.id)
            .map(incomp => ({
              id: incomp.ingredient_id,
              name: incomp.ingredient_name
            }))
        )
    }));
    
    return ingredientsWithConstraints;
  } catch (error) {
    throw new Error('Error getting ingredients with constraints: ' + error.message);
  }
};
