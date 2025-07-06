import { useState, useEffect } from 'react';
import { Row, Col, Button, Alert} from 'react-bootstrap';
import { Link, Outlet, useLocation, useOutletContext } from 'react-router-dom';
import API from '../API';

import NavigationBar from './NavigationBar';
import LoginForm from './LoginForm';
import OrderConfigurator from './OrderConfigurator';
import OrderHistory from './OrderHistory';
import MenuBrowser from './MenuBrowser';

//------------------------------------------------------------------------
// --- Not Found Layout ---
function NotFoundLayout() {
  return (
    <Row className="justify-content-center mt-5">
      <Col className="text-center">
        <div className="card shadow-lg border-0" style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)', borderRadius: '15px' }}>
          <div className="card-body p-5">
            <h2 className="text-white mb-4 fw-bold">404 - Page Not Found</h2>
            <p className="lead text-white mb-4">
              Sorry, the page you are looking for doesn't exist or has been moved.
            </p>
            <div className="d-flex gap-3 justify-content-center flex-wrap">
              <Link to="/">
                <Button 
                  size="lg" 
                  style={{ 
                    borderRadius: '25px',
                    backgroundColor: '#ffffff',
                    color: '#7f1d1d',
                    border: 'none'
                  }}
                >
                  <i className="bi bi-house-fill me-2"></i>
                  Go to Restaurant
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Col>
    </Row>
  );
}


//------------------------------------------------------------------------
// --- Login Layout ---
function LoginLayout({ onLogin, totpRequired, onTotp, onSkipTotp, isUpgradeMode, onCancelUpgrade }) {
  return (
    <Row className="justify-content-center">
      <Col xs={12} sm={10} md={8} lg={6} xl={5}>
        <div className="card shadow-lg border-0" style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)', borderRadius: '15px' }}>
          <div className="card-body">
            <LoginForm 
              onLogin={onLogin} 
              totpRequired={totpRequired} 
              onTotp={onTotp} 
              onSkipTotp={onSkipTotp} 
              isUpgradeMode={isUpgradeMode}
              onCancelUpgrade={onCancelUpgrade}
            />
          </div>
        </div>
      </Col>
    </Row>
  );
}

//------------------------------------------------------------------------
// --- Restaurant Layout ---
function RestaurantLayout({ user, message, messageType = 'danger', onLogout, showMessage, onSessionUpgrade }) {

  // ###########################################################################
  // STATE MANAGEMENT
  // ###########################################################################

  const location = useLocation();

  //----------------------------------------------------------------------------
  return (
    <div className="p-2 p-md-3">
      <Row>
        <Col>
          <NavigationBar user={user} onLogout={onLogout} onSessionUpgrade={onSessionUpgrade} />
        </Col>
      </Row>

      <Row>
        <Col>
          {message && (
            <Alert className="my-3 border-0 shadow-sm" variant={messageType} onClose={() => {}} dismissible style={{ borderRadius: '10px' }}>
              <i className={`bi ${messageType === 'success' ? 'bi-check-circle-fill' : messageType === 'warning' ? 'bi-exclamation-triangle-fill' : 'bi-exclamation-triangle-fill'} me-2`}></i>
              {message}
            </Alert>
          )}
        </Col>
      </Row>

      <Row className="g-3 g-md-4">
        <Col>
          <Outlet context={{ 
            user,
            showMessage
          }} />
          {location.pathname === "/" && (
            <WelcomeLayout user={user} />
          )}
        </Col>
      </Row>
    </div>
  );
}

//------------------------------------------------------------------------
// --- Welcome Layout ---
function WelcomeLayout({ user }) {
  const [dishes, setDishes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pricing state - will be loaded from server
  const [pricing, setPricing] = useState({
    prices: {
      'Small': 5,
      'Medium': 7,
      'Large': 9
    },
    maxIngredients: {
      'Small': 3,
      'Medium': 5,
      'Large': 7
    }
  });

  useEffect(() => {
    const loadMenuData = async () => {
      try {
        const [dishesData, ingredientsData, pricingData] = await Promise.all([
          API.getDishes(),
          API.getIngredients(),
          API.getPricing()
        ]);
        
        setDishes(dishesData);
        setIngredients(ingredientsData);
        setPricing(pricingData);
      } catch (err) {
        console.error('Error loading menu data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMenuData();
  }, []);

  return (
    <div className="py-3 py-md-5">
      {user ? (
        /* Logged in user layout */
        <div className="text-center">
          <div className="mb-4">
            <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                 style={{ width: '80px', height: '80px', background: 'linear-gradient(45deg, #7f1d1d, #dc2626)' }}>
              <i className="bi bi-shop text-white" style={{ fontSize: '2.5rem' }}></i>
            </div>
            <h1 className="fw-bold mb-3 fs-2 fs-md-1" style={{ color: '#7f1d1d' }}>
              Welcome to Our Restaurant
            </h1>
          </div>
          <div className="card shadow-lg border-0 mx-auto" style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)', borderRadius: '20px', maxWidth: '800px' }}>
            <div className="card-body p-3 p-md-5">
              <p className="lead text-white mb-4 fs-5 fs-md-5">
                Hello <strong>{user.username}</strong>! Ready to create your perfect meal?
              </p>
              <div className="d-flex gap-2 gap-md-3 justify-content-center flex-column flex-sm-row">
                <Link
                  to={{
                    pathname: "/order"
                  }}
                  className="btn btn-lg" 
                  style={{ 
                    borderRadius: '25px',
                    backgroundColor: '#ffffff',
                    color: '#7f1d1d',
                    border: 'none'
                  }}
                ><i className="bi bi-cart-plus me-2"></i>
                  Create New Order 
                </Link>
                <Link
                  to={{
                    pathname: "/history"
                  }}
                  className="btn btn-lg" 
                  style={{ 
                    borderRadius: '25px',
                    backgroundColor: '#ffffff',
                    color: '#7f1d1d',
                    border: 'none'
                  }}
                > <i className="bi bi-clock-history me-2"></i>
                  View Order History
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Not logged in layout - ingredients on left, welcome + login on right */
        <Row className="g-3 g-md-4">
          {/* LEFT SIDE: Ingredients List */}
          <Col xs={12} lg={5}>
            <div className="card shadow-lg border-0" style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)', borderRadius: '15px' }}>
              <div className="card-body p-0">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <MenuBrowser 
                    dishes={dishes}
                    ingredients={ingredients}
                    pricing={pricing}
                  />
                )}
              </div>
            </div>
          </Col>

          {/* RIGHT SIDE: Welcome + Login */}
          <Col xs={12} lg={7}>
            <div className="card shadow-lg border-0" style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)', borderRadius: '15px' }}>
              <div className="card-body p-3 p-md-4 text-center">
                <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                     style={{ width: '60px', height: '60px', background: 'linear-gradient(45deg, #7f1d1d, #dc2626)' }}>
                  <i className="bi bi-shop text-white" style={{ fontSize: '1.8rem' }}></i>
                </div>
                <h2 className="fw-bold mb-3 fs-3" style={{ color: '#ffffff' }}>
                  Welcome to Our Restaurant
                </h2>
    
                <div className="d-grid mb-4">
                  <Link
                    to="/login"
                    className="btn btn-lg" 
                    style={{ 
                      borderRadius: '25px',
                      backgroundColor: '#ffffff',
                      color: '#7f1d1d',
                      border: 'none'
                    }}
                  >
                    <i className="bi bi-box-arrow-in-right me-2"></i>
                    Sign In to Order
                  </Link>
                </div>
                <div className="pt-3 border-top">
                  <p className="small text-white mb-0">
                    <i className="bi bi-info-circle me-1"></i>
                    Sign in to create custom orders and track your order history
                  </p>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      )}
    </div>
  );
}





//------------------------------------------------------------------------
// --- Order Configurator Layout ---
function OrderConfiguratorLayout() {
  const { user, showMessage } = useOutletContext();
  
  const [dishes, setDishes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Order state
  const [selectedDish, setSelectedDish] = useState(null);
  const [selectedSize, setSelectedSize] = useState('Medium');
  const [selectedIngredients, setSelectedIngredients] = useState([]);

  // Pricing state - will be loaded from server
  const [pricing, setPricing] = useState({
    prices: {
      'Small': 5,
      'Medium': 7,
      'Large': 9
    },
    maxIngredients: {
      'Small': 3,
      'Medium': 5,
      'Large': 7
    }
  });

  // Helper function to parse server error messages and identify unavailable ingredients
  const parseUnavailableIngredients = (errorMessage, availableIngredients) => {
    const unavailableIngredients = [];
    
    // Check if it's an array of errors (from validation)
    if (Array.isArray(errorMessage)) {
      errorMessage.forEach(error => {
        const match = error.match(/Not enough (.+?) available/i);
        if (match) {
          const ingredientName = match[1].toLowerCase();
          const ingredient = availableIngredients.find(ing => 
            ing.name.toLowerCase() === ingredientName
          );
          if (ingredient && !unavailableIngredients.some(ui => ui.id === ingredient.id)) {
            unavailableIngredients.push(ingredient);
          }
        }
      });
    } else if (typeof errorMessage === 'string') {
      // Handle single error message or string with multiple errors
      // Split by common separators (comma, semicolon, newline)
      const errors = errorMessage.split(/[,;\n]/).map(e => e.trim());
      errors.forEach(error => {
        const match = error.match(/Not enough (.+?) available/i);
        if (match) {
          const ingredientName = match[1].toLowerCase();
          const ingredient = availableIngredients.find(ing => 
            ing.name.toLowerCase() === ingredientName
          );
          if (ingredient && !unavailableIngredients.some(ui => ui.id === ingredient.id)) {
            unavailableIngredients.push(ingredient);
          }
        }
      });
      
      // Also check for the entire string as a single error message
      if (errors.length === 1) {
        const match = errorMessage.match(/Not enough (.+?) available/i);
        if (match) {
          const ingredientName = match[1].toLowerCase();
          const ingredient = availableIngredients.find(ing => 
            ing.name.toLowerCase() === ingredientName
          );
          if (ingredient && !unavailableIngredients.some(ui => ui.id === ingredient.id)) {
            unavailableIngredients.push(ingredient);
          }
        }
      }
    }
    
    return unavailableIngredients;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch dishes, ingredients, and pricing
        const [dishesData, ingredientsData, pricingData] = await Promise.all([
          API.getDishes(),
          API.getIngredients(),
          API.getPricing()
        ]);
        
        setDishes(dishesData);
        setIngredients(ingredientsData);
        setPricing(pricingData);
        
        // Set default dish
        if (dishesData.length > 0) {
          setSelectedDish(dishesData[0]);
        }
      } catch (err) {
        showMessage('Error loading menu data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [showMessage]);

  const handleSubmitOrder = async () => {
    if (!selectedDish) {
      showMessage('Please select a dish', 'warning');
      return;
    }

    // Calculate total price using the server pricing
    let totalPrice = pricing.prices[selectedSize] || 7;
    
    selectedIngredients.forEach(ingId => {
      const ingredient = ingredients.find(ing => ing.id === ingId);
      if (ingredient && ingredient.price) {
        totalPrice += ingredient.price;
      }
    });

    const orderData = {
      dish_id: selectedDish.id,
      size: selectedSize,
      ingredients: selectedIngredients,
      total_price: totalPrice,
    };

    try {
      const result = await API.submitOrder(orderData);
      
      showMessage('Order placed successfully!', 'success');
      
      // Refresh ingredient data to get updated availability
      try {
        const updatedIngredients = await API.getIngredients();
        setIngredients(updatedIngredients);
      } catch (refreshErr) {
        console.warn('Could not refresh ingredient data:', refreshErr);
      }
      
      // Reset form after successful order
      setSelectedIngredients([]);
      if (dishes.length > 0) {
        setSelectedDish(dishes[0]);
      }
      setSelectedSize('Medium');
      
    } catch (err) {
      console.error('Error submitting order:', err);
      
      // Extract the actual error message, which might be nested
      let errorMessage = err.message || 'Unable to place order. Please try again.';
      
      // If the error contains an 'error' field (from server response), use that
      if (err.error) {
        errorMessage = err.error;
      }
      
      // Parse server error to identify unavailable ingredients
      const unavailableIngredients = parseUnavailableIngredients(errorMessage, ingredients);
      
      if (unavailableIngredients.length > 0) {
        // Remove unavailable ingredients from selection
        setSelectedIngredients(prev => {
          const updatedIngredients = prev.filter(ingId => 
            !unavailableIngredients.some(unavail => unavail.id === ingId)
          );
          return updatedIngredients;
        });
        
        const ingredientNames = unavailableIngredients.map(ing => ing.name).join(', ');
        showMessage(
          `Some ingredients are no longer available and have been removed: ${ingredientNames}. Please review your order.`, 
          'warning'
        );
      } else {
        showMessage(errorMessage, 'danger');
      }
      
      // Refresh ingredient data even on error to get current availability
      try {
        const updatedIngredients = await API.getIngredients();
        setIngredients(updatedIngredients);
      } catch (refreshErr) {
        console.warn('Could not refresh ingredient data:', refreshErr);
      }
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 text-muted">Loading menu...</p>
      </div>
    );
  }

  return (
    <Row className="g-3 g-md-4">
      {/* LEFT SIDE: Entire ingredient list */}
      <Col xs={12} xl={5}>
        <div className="card shadow-lg border-0" style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)', borderRadius: '15px' }}>
          <div className="card-body p-0">
            <MenuBrowser
              dishes={dishes}
              ingredients={ingredients}
              pricing={pricing}
            />
          </div>
        </div>
      </Col>
      
      {/* RIGHT SIDE: Current configuration */}
      <Col xs={12} xl={7}>
        <div className="card shadow-lg border-0" style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)', borderRadius: '15px' }}>
          <div className="card-body p-3 p-md-4">
            <OrderConfigurator
              user={user}
              dishes={dishes}
              ingredients={ingredients}
              pricing={pricing}
              selectedDish={selectedDish}
              setSelectedDish={setSelectedDish}
              selectedSize={selectedSize}
              setSelectedSize={setSelectedSize}
              selectedIngredients={selectedIngredients}
              setSelectedIngredients={setSelectedIngredients}
              onSubmitOrder={handleSubmitOrder}
              showMessage={showMessage}
            />
          </div>
        </div>
      </Col>
    </Row>
  );
}




//------------------------------------------------------------------------
// --- Order History Layout ---
function OrderHistoryLayout() {
  const { user, showMessage } = useOutletContext();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const ordersData = await API.getOrderHistory();
        setOrders(ordersData);
      } catch (err) {
        showMessage('Error loading orders: ' + (err.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [user, showMessage]);

  const handleCancelOrder = async (orderId) => {
    try {
      await API.cancelOrder(orderId);
      showMessage('Order cancelled successfully', 'success');
      
      // Reload orders to reflect cancellation
      const updatedOrders = await API.getOrderHistory();
      setOrders(updatedOrders);
    } catch (err) {
      const errorMessage = err.message || err.error || 'Unable to cancel order';
      showMessage('Error cancelling order: ' + errorMessage);
    }
  };

  return (
    <Row className="justify-content-center">
      <Col xs={12} lg={10}>
        <div className="card shadow-lg border-0" style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)', borderRadius: '15px' }}>
          <div className="card-body p-4">
            <OrderHistory
              orders={orders}
              user={user}
              loading={loading}
              onCancelOrder={handleCancelOrder}
              showMessage={showMessage}
            />
          </div>
        </div>
      </Col>
    </Row>
  );
}

//-----------------------------------------------------------------------------
export { NotFoundLayout, LoginLayout, RestaurantLayout, OrderConfiguratorLayout, OrderHistoryLayout };
export default RestaurantLayout;