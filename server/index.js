'use strict';
const sqlite = require('sqlite3');

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

const db = new sqlite.Database('./Database/restaurant.sqlite', (err) => {
  if (err) throw err;
});

const { validationResult, body } = require('express-validator');

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
  origin: 'http://127.0.0.1:5173',
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
    twofa_enabled: user.twofa_enabled,
    canDoTotp: user.twofa_enabled,
    isTotp: req.session.secondFactor === 'totp' || false
  };
}

//#############################################################################
// Authentication APIs

//----------------------------------------------------------------------------
// Login (username/password)
app.post('/api/sessions', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) return next(err);
    if (!user) return res.status(401).json(info);

    req.login(user, function(err) {
      if (err) return next(err);

      // If user has 2FA enabled, require TOTP
      if (user.twofa_enabled) {
        req.session.secondFactor = 'pending';
        return res.json({
          ...clientUserInfo(req),
          canDoTotp: true,
          isTotp: false
        });
      } else {
        req.session.secondFactor = 'basic';
        return res.json({
          ...clientUserInfo(req),
          canDoTotp: false,
          isTotp: false
        });
      }
    });
  })(req, res, next);
});

//----------------------------------------------------------------------------
// TOTP verification (2FA)
app.post('/api/login-totp', isLoggedIn, async function(req, res) {
  try {
    const { code } = req.body;
    
    if (!req.user.twofa_enabled) {
      return res.status(400).json({ error: 'TOTP not enabled for this user' });
    }

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
    const prices = await dishDao.getDishPrices();
    const maxIngredients = await dishDao.getMaxIngredientsBySize();
    res.json({ prices, maxIngredients });
  } catch (err) {
    console.error('Error getting pricing:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

//----------------------------------------------------------------------------
// Validate order configuration (authenticated users only)
app.post('/api/validate-order', isLoggedIn, [
  body('dishId').isInt({ min: 1 }).withMessage('Valid dish ID is required'),
  body('size').isIn(['Small', 'Medium', 'Large']).withMessage('Valid size is required'),
  body('ingredientIds').isArray().withMessage('Ingredient IDs must be an array')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array() });
  }

  try {
    const { dishId, size, ingredientIds } = req.body;
    const validation = await validationDao.validateOrder(dishId, size, ingredientIds);
    
    if (validation.valid) {
      const total = await validationDao.calculateOrderTotal(dishId, size, ingredientIds);
      res.json({ valid: true, total });
    } else {
      res.json(validation);
    }
  } catch (err) {
    console.error('Error validating order:', err);
    res.status(500).json({ error: 'Validation error' });
  }
});

//----------------------------------------------------------------------------
// POST /api/orders - Submit a new order
app.post('/api/orders', isLoggedIn, async (req, res) => {
  try {
    // Support both naming conventions (dish_id and dishId)
    const dish_id = req.body.dish_id || req.body.dishId;
    const size = req.body.size;
    const ingredients = req.body.ingredients || req.body.ingredientIds || [];
    const user_id = req.user.id;
    
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
      ingredients,
      total_price: validationResult.totalPrice,
      used_2fa: req.user.isTotp || false
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
  
  // Validate dish exists
  const dishQuery = 'SELECT * FROM Dishes WHERE id = ?';
  const dish = await new Promise((resolve, reject) => {
    db.get(dishQuery, [dishId], (err, row) => {
      if (err) reject(err);
      resolve(row);
    });
  });
  
  if (!dish) {
    errors.push(`Invalid dish ID: ${dishId}`);
  }
  
  // Validate size and get pricing
  // Hardcoded pricing and max ingredient limits since 'pricing' table does not exist
  const prices = {
    Small: 5,
    Medium: 7,
    Large: 9
  };
  const maxIngredientsBySize = {
    Small: 3,
    Medium: 5,
    Large: 7
  };

  if (!prices[size]) {
    errors.push(`Invalid size: ${size}`);
  } else {
    totalPrice += prices[size];
  }

  // Check ingredient limit for selected size
  const maxIngredients = maxIngredientsBySize[size] || 0;
  if (ingredientIds.length > maxIngredients) {
    errors.push(`Too many ingredients for ${size} size. Maximum allowed: ${maxIngredients}`);
  }
  
  // Get all ingredients with their availability
  const ingredientPlaceholders = ingredientIds.map(() => '?').join(',');
  const ingredientsQuery = `SELECT * FROM Ingredients WHERE id IN (${ingredientIds.length ? ingredientPlaceholders : 'NULL'})`;
  
  const ingredients = await new Promise((resolve, reject) => {
    db.all(ingredientsQuery, ingredientIds, async (err, rows) => {
      if (err) reject(err);
      
      // For each ingredient, get its incompatibilities and requirements
      for (let ingredient of rows) {
        // Get incompatibilities
        ingredient.incompatible_with = await new Promise((resolve, reject) => {
          db.all(`
            SELECT i.id, i.name
            FROM IngredientIncompatibilities ii
            JOIN Ingredients i ON ii.incompatible_with_id = i.id
            WHERE ii.ingredient_id = ?
          `, [ingredient.id], (err, incompatibles) => {
            if (err) reject(err);
            resolve(incompatibles);
          });
        });
        
        // Get requirements
        ingredient.requires = await new Promise((resolve, reject) => {
          db.all(`
            SELECT i.id, i.name
            FROM IngredientRequirements ir
            JOIN Ingredients i ON ir.required_ingredient_id = i.id
            WHERE ir.ingredient_id = ?
          `, [ingredient.id], (err, requirements) => {
            if (err) reject(err);
            resolve(requirements);
          });
        });
      }
      
      resolve(rows);
    });
  });
  
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
  
  for (const ingredient of ingredients) {
    const requestedCount = ingredientCounts[ingredient.id] || 0;
    
    // Check if ingredient has limited availability
    if (ingredient.available_portions !== null) {
      if (ingredient.available_portions < requestedCount) {
        errors.push(`Not enough ${ingredient.name} available. Requested: ${requestedCount}, Available: ${ingredient.available_portions}`);
      }
    }
    
    // Add ingredient price to total
    totalPrice += ingredient.price * requestedCount;
  }
  
  // Check ingredient incompatibilities
  for (const ingredient of ingredients) {
    if (ingredient.incompatible_with && ingredient.incompatible_with.length > 0) {
      const incompatibleSelected = ingredient.incompatible_with
        .filter(incomp => ingredientIds.includes(incomp.id));
        
      if (incompatibleSelected.length > 0) {
        errors.push(`${ingredient.name} is incompatible with ${incompatibleSelected.map(i => i.name).join(', ')}`);
      }
    }
  }
  
  // Check ingredient requirements
  for (const ingredient of ingredients) {
    if (ingredient.requires && ingredient.requires.length > 0) {
      const missingRequirements = ingredient.requires
        .filter(req => !ingredientIds.includes(req.id));
        
      if (missingRequirements.length > 0) {
        errors.push(`${ingredient.name} requires ${missingRequirements.map(r => r.name).join(', ')}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    totalPrice
  };
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
