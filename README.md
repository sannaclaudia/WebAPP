[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/xnU44QZi)
# Exam #1234: "Exam Title"
## Student: s123456 LASTNAME FIRSTNAME 

# Restaurant Order Management System

A web application that allows users to configure personalized food orders from a restaurant menu with ingredient constraints and 2FA authentication.

## Server-side

### HTTP APIs

- **GET /api/dishes** - Get all available base dishes
- **GET /api/ingredients** - Get all ingredients with constraints and availability
- **GET /api/pricing** - Get pricing info and size constraints
- **POST /api/validate-order** - Validate order configuration (auth required)
- **POST /api/orders** - Submit new order (auth required)
- **GET /api/orders** - Get user's order history (auth required)
- **DELETE /api/orders/:id** - Cancel order (auth + 2FA required)
- **POST /api/sessions** - User login
- **POST /api/login-totp** - 2FA verification
- **GET /api/sessions/current** - Get current user info
- **DELETE /api/sessions/current** - Logout

### Database Tables

- **Users** - User accounts (id, username, password_hash, salt, totp_secret, twofa_enabled)
- **Dishes** - Base dishes (id, name) - pizza, pasta, salad
- **Ingredients** - Available ingredients (id, name, price, available_portions)
- **IngredientRequirements** - Ingredient dependencies (ingredient_id, required_ingredient_id)
- **IngredientIncompatibilities** - Ingredient conflicts (ingredient_id, incompatible_with_id)
- **Orders** - Customer orders (id, user_id, status, used_2fa, created_at)
- **OrderItems** - Dishes in orders (id, order_id, dish_id, size)
- **OrderIngredients** - Ingredients per order item (order_item_id, ingredient_id)

## Client-side

### Routes

- **/** - Homepage with welcome and navigation
- **/login** - User authentication with optional 2FA
- **/order** - Order configuration page with ingredients and constraints
- **/history** - User's order history with cancellation (if 2FA)

### React Components

- **App** - Main application with routing and authentication state
- **RestaurantLayout** - Main layout with navigation and messaging
- **LoginForm** - Login form with TOTP support
- **NavigationBar** - Top navigation with user status
- **MenuBrowser** - Ingredient list with constraints (left panel)
- **OrderConfigurator** - Order configuration form (right panel)
- **OrderHistory** - Past orders display with cancellation

## Screenshots

![Order Configuration Page](./screenshot-order-config.png)

## User Accounts

- **alice** / password (2FA enabled)
- **bob** / password (2FA enabled)  
- **charlie** / password (no 2FA)
- **diana** / password (no 2FA)

All users can browse and order. Only 2FA users can cancel orders.

