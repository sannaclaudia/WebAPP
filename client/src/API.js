import dayjs from 'dayjs';

const SERVER_URL = 'http://localhost:3001/api/';


/**
 * Utility function for parsing the HTTP response.
 */
function getJson(httpResponsePromise) {
  return new Promise((resolve, reject) => {
    httpResponsePromise
      .then((response) => {
        if (response.ok) {
          if (response.status === 204) {
            resolve({});
          } else {
            response.json()
              .then(json => resolve(json))
              .catch(err => reject({ error: "Cannot parse server response" }))
          }
        } else {
          response.json()
            .then(obj => reject(obj))
            .catch(err => reject({ error: "Cannot parse server response" }))
        }
      })
      .catch(err => reject({ error: "Cannot communicate" }))
  });
}

//############################################################################
// RESTAURANT APIs
//############################################################################

// Get all available dishes
const getDishes = async () => {
  return getJson(
    fetch(SERVER_URL + 'dishes', { credentials: 'include' })
  );
};

//----------------------------------------------------------------------------
// Get all ingredients with constraints
const getIngredients = async () => {
  return getJson(
    fetch(SERVER_URL + 'ingredients', { credentials: 'include' })
  );
};

//----------------------------------------------------------------------------
// Get pricing and size constraints
const getPricing = async () => {
  return getJson(
    fetch(SERVER_URL + 'pricing', { credentials: 'include' })
  );
};

//----------------------------------------------------------------------------
// Validate order configuration
const validateOrder = async (orderData) => {
  return getJson(
    fetch(SERVER_URL + 'validate-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(orderData)
    })
  );
};

//----------------------------------------------------------------------------
// Submit order
const submitOrder = async (orderData) => {
  try {
    const response = await fetch(SERVER_URL + 'orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(orderData)
    });
    
    if (!response.ok) {
      // Try to get error details from response
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      // Format error message
      const errorMessage = errorData.error || errorData.message || 'Unknown server error';
      throw new Error(errorMessage);
    }
    
    if (response.status === 204) {
      return {};
    }
    
    return await response.json();
  } catch (err) {
    console.error('Error in submitOrder:', err);
    throw err;
  }
};

//----------------------------------------------------------------------------
// Get user's orders
const getOrders = async () => {
  const response = await fetch(SERVER_URL + 'orders', {
    credentials: 'include'
  });
  
  if (response.ok) {
    return await response.json();
  } else {
    const errDetail = await response.json();
    throw errDetail;
  }
};

//----------------------------------------------------------------------------
// Get order history
const getOrderHistory = async () => {
  const response = await fetch(SERVER_URL + 'orders/history', {
    credentials: 'include',
  });
  const orders = await response.json();
  if (response.ok) {
    return orders;
  } else {
    throw new Error(orders.error || 'Failed to fetch order history');
  }
};

//----------------------------------------------------------------------------
// Cancel order
const cancelOrder = async (orderId) => {
  const response = await fetch(SERVER_URL + `orders/${orderId}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  
  if (response.ok) {
    return await response.json();
  } else {
    const errDetail = await response.json();
    throw errDetail;
  }
};

//############################################################################
// AUTHENTICATION
//############################################################################

// Log in a user with credentials
const logIn = async (credentials) => {
  return getJson(
    fetch(SERVER_URL + 'sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(credentials)
    })
  );
};

//----------------------------------------------------------------------------
// Verify a TOTP code for 2FA
const logInTotp = async (code) => {
  return getJson(
    fetch(SERVER_URL + 'login-totp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code })
    })
  );
};

//----------------------------------------------------------------------------
// Log out the current user
const logOut = async () => {
  return getJson(
    fetch(SERVER_URL + 'sessions/current', {
      method: 'DELETE',
      credentials: 'include'
    })
  );
};

//----------------------------------------------------------------------------
// Fetch information about the currently logged-in user
const getUserInfo = async () => {
  return getJson(
    fetch(SERVER_URL + 'sessions/current', {
      credentials: 'include'
    })
  );
};

//----------------------------------------------------------------------------
// Skip TOTP verification (user can log in but won't be able to cancel orders)
const skipTotp = async () => {
  return getJson(
    fetch(SERVER_URL + 'skip-totp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    })
  );
};

//----------------------------------------------------------------------------
// Export all API functions
const API = {
  getDishes,
  getIngredients,
  getPricing,
  validateOrder,
  submitOrder,
  getOrders,
  getOrderHistory,
  cancelOrder,
  logIn,
  logInTotp,
  skipTotp,
  logOut,
  getUserInfo,
};

export default API;