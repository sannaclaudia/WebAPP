'use strict';

// This file sets up an Express server with Passport.js for authentication,
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const session = require('express-session');

const passport = require('passport');
const speakeasy = require('speakeasy');
const LocalStrategy = require('passport-local');

// Import the Data Access Objects (DAOs) for the restaurant application
const userDao = require('./DAO/user-dao');
const dishDao = require('./DAO/dish-dao');
const ingredientDao = require('./DAO/ingredient-dao');
const orderDao = require('./DAO/order-dao');
const validationDao = require('./DAO/validation-dao');

const { validationResult, body, param } = require('express-validator');

//----------------------------------------------------------------------------
// Create the Express app and configure middleware
const app = express();
const port = 3001;

//----------------------------------------------------------------------------
// Middleware setup
app.use(morgan('dev'));
app.use(express.json());

// Enable CORS for the frontend communication
const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));

//----------------------------------------------------------------------------
// Session management
app.use(session({
  secret: "restaurant-secret-key",
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.authenticate('session'));

//----------------------------------------------------------------------------
// Initialize Passport.js for authentication
// The local strategy is used for username/password authentication
passport.use(new LocalStrategy(
  function(username, password, done) {
    userDao.getUser(username, password)
      .then(user => {
        if (!user) return done(null, false, { message: 'Incorrect username or password.' });
        return done(null, user);
      })
      .catch(err => done(err));
  }
));

//----------------------------------------------------------------------------
// Serialize and deserialize user instances to support sessions
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  userDao.getUserById(id)
    .then(user => done(null, user))
    .catch(err => done(err, null));
});

//----------------------------------------------------------------------------
// Middleware to check if user is authenticated
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

//----------------------------------------------------------------------------
// Helper to send user info to client
function clientUserInfo(req) {
  const user = req.user;
  return {
    id: user.id,
    username: user.username,
    canDoTotp: true,
    isTotp: req.session.secondFactor === 'totp' || false,
    isSkippedTotp: req.session.secondFactor === 'skipped' || false
  };
}

//#############################################################################
// Authentication APIs

//----------------------------------------------------------------------------
// Login (username/password)
app.post('/api/sessions', [
  body('username').notEmpty().withMessage('Username is required').isLength({ min: 1, max: 255 }).withMessage('Username must be between 1 and 255 characters'),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 1 }).withMessage('Password cannot be empty')
], function(req, res, next) {
  // Check validation result
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  passport.authenticate('local', function(err, user, info) {
    if (err) return next(err);
    if (!user) return res.status(401).json(info);

    req.login(user, function(err) {
      if (err) return next(err);

      // All users now require TOTP
      req.session.secondFactor = 'pending';
      return res.json({
        ...clientUserInfo(req),
        canDoTotp: true,
        isTotp: false
      });
    });
  })(req, res, next);
});

//----------------------------------------------------------------------------
// TOTP verification (2FA) - handles both initial login and session upgrades
app.post('/api/login-totp', [
  body('code').notEmpty().withMessage('TOTP code is required')
    .isLength({ min: 6, max: 6 }).withMessage('TOTP code must be exactly 6 digits')
    .isNumeric().withMessage('TOTP code must contain only numbers')
], isLoggedIn, async function(req, res) {
  // Check validation result
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  try {
    const { code } = req.body;
    
    const secret = await userDao.getTotpSecret(req.user.id);
    if (!secret) {
      return res.status(400).json({ error: 'No TOTP secret found' });
    }

    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: code,
      window: 1
    });

    if (!verified) {
      return res.status(401).json({ error: 'Invalid TOTP code' });
    }

    req.session.secondFactor = 'totp';
    return res.json({ success: true });

  } catch (err) {
    console.error('TOTP verification error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

//----------------------------------------------------------------------------
// Skip TOTP verification (user can log in but won't be able to cancel orders)
app.post('/api/skip-totp', isLoggedIn, async function(req, res) {
  try {
    req.session.secondFactor = 'skipped';
    return res.json({ success: true });
  } catch (err) {
    console.error('Skip TOTP error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

//----------------------------------------------------------------------------
// Get current session info
app.get('/api/sessions/current', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(clientUserInfo(req));
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

//----------------------------------------------------------------------------
// Logout
app.delete('/api/sessions/current', (req, res) => {
  req.logout(() => {
    req.session.destroy(() => res.status(204).end());
  });
});

//#############################################################################
// Restaurant APIs

//----------------------------------------------------------------------------
// Get all dishes (public)
app.get('/api/dishes', async (req, res) => {
  try {
    const dishes = await dishDao.getAllDishes();
    res.json(dishes);
  } catch (err) {
    console.error('Error getting dishes:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

//----------------------------------------------------------------------------
// Get all ingredients with constraints (public)
app.get('/api/ingredients', async (req, res) => {
  try {
    const ingredients = await validationDao.getIngredientsWithConstraints();
    res.json(ingredients);
  } catch (err) {
    console.error('Error getting ingredients:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

//----------------------------------------------------------------------------
// Get dish prices and size constraints (public)
app.get('/api/pricing', async (req, res) => {
  try {
    const { prices, maxIngredients } = await dishDao.getDishPricing();
    res.json({ prices, maxIngredients });
  } catch (err) {
    console.error('Error getting pricing:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

//----------------------------------------------------------------------------
// GET /api/orders - Get user's order history with full details
app.get('/api/orders', isLoggedIn, async (req, res) => {
  try {
    const orders = await orderDao.getUserOrders(req.user.id);
    res.json(orders);
  } catch (error) {
    console.error('Error getting order history:', error);
    res.status(500).json({ error: error.message });
  }
});

//----------------------------------------------------------------------------
// GET /api/orders/history - Alias for order history (for clarity)
app.get('/api/orders/history', isLoggedIn, async (req, res) => {
  try {
    const orders = await orderDao.getUserOrdersWithIngredients(req.user.id);
    res.json(orders);
  } catch (error) {
    console.error('Error getting order history:', error);
    res.status(500).json({ error: error.message });
  }
});

//----------------------------------------------------------------------------
// DELETE /api/orders/:id - Cancel an order (requires 2FA)
app.delete('/api/orders/:id', [
  param('id').isInt({ min: 1 }).withMessage('Order ID must be a positive integer')
], isLoggedIn, async (req, res) => {
  // Check validation result
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  try {
    // Check if user authenticated with 2FA
    if (req.session.secondFactor !== 'totp') {
      return res.status(403).json({ error: 'Order cancellation requires 2FA authentication' });
    }

    const orderId = parseInt(req.params.id);
    await orderDao.cancelOrder(orderId, req.user.id);
    res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: error.message });
  }
});

//----------------------------------------------------------------------------
// POST /api/orders - Submit a new order
app.post('/api/orders', [
  body('dish_id').optional().isInt({ min: 1 }).withMessage('Dish ID must be a positive integer'),
  body('dishId').optional().isInt({ min: 1 }).withMessage('Dish ID must be a positive integer'),
  body('size').notEmpty().withMessage('Size is required')
    .isIn(['Small', 'Medium', 'Large']).withMessage('Size must be Small, Medium, or Large'),
  body('ingredients').optional().isArray().withMessage('Ingredients must be an array'),
  body('ingredients.*').optional().isInt({ min: 1 }).withMessage('Each ingredient ID must be a positive integer'),
  body('ingredientIds').optional().isArray().withMessage('Ingredient IDs must be an array'),
  body('ingredientIds.*').optional().isInt({ min: 1 }).withMessage('Each ingredient ID must be a positive integer')
], isLoggedIn, async (req, res) => {
  // Check validation result
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  try {
    // Support both naming conventions (dish_id and dishId)
    const dish_id = req.body.dish_id || req.body.dishId;
    const size = req.body.size;
    const ingredients = req.body.ingredients || req.body.ingredientIds || [];
    const user_id = req.user.id;
    
    // Validate required fields
    if (!dish_id) {
      return res.status(400).json({ error: 'Dish ID is required' });
    }
    
    if (!size) {
      return res.status(400).json({ error: 'Size is required' });
    }
    
    // Count ingredient quantities
    const ingredientCounts = {};
    ingredients.forEach(id => {
      ingredientCounts[id] = (ingredientCounts[id] || 0) + 1;
    });
    
    // Convert to array of {id, quantity} objects
    const ingredientsWithQuantity = Object.entries(ingredientCounts).map(([id, quantity]) => ({
      id: parseInt(id),
      quantity
    }));
    
    // Direct validation using db object
    const validationResult = await validateOrderDirectly(dish_id, size, ingredients);
    if (!validationResult.valid) {
      return res.status(400).json({ error: validationResult.errors });
    }
    
    // Create the order instance
    const order = await orderDao.createOrder({
      user_id,
      dish_id,
      size,
      ingredients: ingredientsWithQuantity,
      total_price: validationResult.totalPrice
    });
    
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Function to directly validate orders using the db connection
async function validateOrderDirectly(dishId, size, ingredientIds) {
  // Initialize validation result
  const errors = [];
  let totalPrice = 0;
  
  try {
    // Validate dish exists
    const dish = await dishDao.getDishById(dishId);
    if (!dish) {
      errors.push(`Invalid dish ID: ${dishId}`);
    }
    
    // Validate size and get pricing from DishPricing table
    const pricingInfo = await dishDao.getDishPricingInfo(dishId, size);
    if (!pricingInfo) {
      errors.push(`Invalid size: ${size}`);
    } else {
      totalPrice += pricingInfo.base_price;
      
      // Check ingredient limit for selected size
      if (ingredientIds.length > pricingInfo.max_ingredients) {
        errors.push(`Too many ingredients for ${size} size. Maximum allowed: ${pricingInfo.max_ingredients}`);
      }
    }
    
    // Get all ingredients with their availability and constraints
    const ingredients = await ingredientDao.getIngredientsByIds(ingredientIds);
    
    // Check for invalid ingredients
    const availableIngredientIds = ingredients.map(ing => ing.id);
    const invalidIngredientIds = ingredientIds.filter(id => !availableIngredientIds.includes(id));
    if (invalidIngredientIds.length > 0) {
      errors.push(`Invalid ingredient IDs: ${invalidIngredientIds.join(', ')}`);
    }
    
    // Count ingredients and check availability
    const ingredientCounts = {};
    ingredientIds.forEach(id => {
      ingredientCounts[id] = (ingredientCounts[id] || 0) + 1;
    });
    
    // Check availability for each ingredient
    for (const ingredient of ingredients) {
      const requestedQuantity = ingredientCounts[ingredient.id];
      if (ingredient.available_portions !== null && requestedQuantity > ingredient.available_portions) {
        errors.push(`Not enough ${ingredient.name} available (requested: ${requestedQuantity}, available: ${ingredient.available_portions})`);
      }
      
      // Add ingredient price to total
      totalPrice += ingredient.price * requestedQuantity;
    }
    
    // Check requirements and incompatibilities
    const uniqueIngredientIds = Object.keys(ingredientCounts).map(id => parseInt(id));
    
    // Check requirements
    for (const ingredient of ingredients) {
      for (const requirement of ingredient.requires) {
        if (!uniqueIngredientIds.includes(requirement.id)) {
          errors.push(`${ingredient.name} requires ${requirement.name} to be selected`);
        }
      }
    }
    
    // Check incompatibilities
    for (const ingredient of ingredients) {
      for (const incompatible of ingredient.incompatible_with) {
        if (uniqueIngredientIds.includes(incompatible.id)) {
          errors.push(`${ingredient.name} is incompatible with ${incompatible.name}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      totalPrice: Math.round(totalPrice * 100) / 100
    };
    
  } catch (error) {
    console.error('Validation error:', error);
    return {
      valid: false,
      errors: ['Internal validation error'],
      totalPrice: 0
    };
  }
}

//----------------------------------------------------------------------------
// Request logging middleware
app.use((req, res, next) => {
  if (req.path.includes('/api/orders')) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    if (req.method === 'POST') {
      console.log('Request body:', JSON.stringify(req.body, null, 2));
    }
  }
  next();
});

//----------------------------------------------------------------------------
// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

//----------------------------------------------------------------------------
app.listen(port, () => {
  console.log(`Restaurant server listening at http://localhost:${port}`);
});
