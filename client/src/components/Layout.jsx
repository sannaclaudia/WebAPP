import { useState, useEffect } from 'react';
import { Row, Col, Button, Alert} from 'react-bootstrap';
import { Link, Outlet, useLocation } from 'react-router-dom';
import API from '../API';

import NavigationBar from './NavigationBar';
import LoginForm from './LoginForm';
import OrderConfiguratorLayout from './OrderConfiguratorLayout';
import OrderHistoryLayout from './OrderHistoryLayout';
import MenuBrowser from './MenuBrowser';

//------------------------------------------------------------------------
// --- Not Found Layout ---
function NotFoundLayout() {
  return (
    <Row className="justify-content-center mt-5">
      <Col className="text-center">
        <div className="card shadow-lg border-0" style={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '15px' }}>
          <div className="card-body p-5">
            <h2 className="text-danger mb-4 fw-bold">404 - Page Not Found</h2>
            <p className="lead text-muted mb-4">
              Sorry, the page you are looking for doesn't exist or has been moved.
            </p>
            <div className="d-flex gap-3 justify-content-center flex-wrap">
              <Link to="/">
                <Button 
                  variant="primary" 
                  size="lg" 
                  style={{ borderRadius: '25px' }}
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
      <Col>
        <div className="card shadow-lg border-0" style={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '15px' }}>
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
    <div className="text-center py-3 py-md-5">
      <div className="card shadow-lg border-0 mx-auto" style={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '20px', maxWidth: '1200px' }}>
        <div className="card-body p-3 p-md-5">
          <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3 mb-md-4" 
               style={{ width: '80px', height: '80px', background: 'linear-gradient(45deg, #1e40af, #3b82f6)' }}>
            <i className="bi bi-shop text-white" style={{ fontSize: '2.5rem' }}></i>
          </div>
          
          <h1 className="fw-bold mb-3 fs-2 fs-md-1" style={{ color: '#1e40af' }}>
            Welcome to Our Restaurant
          </h1>
          
          {user ? (
            <div>
              <p className="lead text-muted mb-4 fs-6 fs-md-5">
                Hello <strong>{user.username}</strong>! Ready to create your perfect meal?
              </p>
              <div className="d-flex gap-2 gap-md-3 justify-content-center flex-column flex-sm-row">
                <Link
                  to={{
                    pathname: "/order"
                  }}
                  className="btn btn-outline-primary btn-lg" style={{ borderRadius: '25px' }}
                ><i className="bi bi-cart-plus me-2"></i>
                  Create New Order 
                </Link>
                <Link
                  to={{
                    pathname: "/history"
                  }}
                  className="btn btn-outline-primary btn-lg" style={{ borderRadius: '25px' }}
                > <i className="bi bi-clock-history me-2"></i>
                  View Order History
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <p className="lead text-muted mb-4 fs-6 fs-md-5">
                Customize your perfect dish with our fresh ingredients and enjoy fast delivery!
              </p>
              <div className="mb-4">
                <a href="/login" className="btn btn-primary btn-lg" style={{ borderRadius: '25px' }}>
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Sign In to Order
                </a>
              </div>
              <div className="mt-4 mt-md-5">
                <h3 className="mb-3 mb-md-4 fs-4 fs-md-3" style={{ color: '#1e40af' }}>Browse Our Menu</h3>
                {loading ? (
                  <div className="text-center py-3">
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
          )}
        </div>
      </div>
    </div>
  );
}

//-----------------------------------------------------------------------------
export { NotFoundLayout, LoginLayout, RestaurantLayout, OrderConfiguratorLayout, OrderHistoryLayout };
export default RestaurantLayout;