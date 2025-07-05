import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Row, Col } from 'react-bootstrap';
import API from '../API';
import OrderConfigurator from './OrderConfigurator';
import MenuBrowser from './MenuBrowser';

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
      
      // Simplified error handling
      const errorMessage = err.message || 'Unable to place order. Please try again.';
      showMessage(errorMessage, 'danger');
      
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
      {/* LEFT SIDE: Entire ingredient list (as per professor's requirements) */}
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
      
      {/* RIGHT SIDE: Current configuration (as per professor's requirements) */}
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

export default OrderConfiguratorLayout;
