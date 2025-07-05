import { Form, Button, Card, Badge } from 'react-bootstrap';

function OrderConfigurator({ 
  user, dishes, ingredients, pricing, 
  selectedDish, setSelectedDish, 
  selectedSize, setSelectedSize,
  selectedIngredients, setSelectedIngredients,
  onSubmitOrder, showMessage 
}) {

  if (!user) {
    return (
      <div className="text-center py-4">
        <h5 className="text-muted mb-3">Please log in to create orders</h5>
        <p className="small text-muted">You need to be authenticated to configure and place orders.</p>
      </div>
    );
  }

  // Helper function to get ingredient quantity
  const getIngredientQuantity = (ingredientId) => {
    return selectedIngredients.filter(id => id === ingredientId).length;
  };

  // Helper function to get total ingredient count
  const getTotalIngredientCount = () => {
    return selectedIngredients.length;
  };

  const handleIngredientAdd = (ingredientId) => {
    const ingredient = ingredients.find(i => i.id === ingredientId);
    if (!ingredient) return;

    const currentQuantity = getIngredientQuantity(ingredientId);
    const totalCount = getTotalIngredientCount();

    // Check availability
    if (ingredient.available_portions !== null && currentQuantity >= ingredient.available_portions) {
      showMessage(`${ingredient.name} is out of stock or limit reached`, 'warning');
      return;
    }

    // Check size limit
    const maxForSize = pricing.maxIngredients[selectedSize] || 0;
    if (totalCount >= maxForSize) {
      showMessage(`Cannot add more ingredients. ${selectedSize} dishes allow maximum ${maxForSize} ingredients.`, 'warning');
      return;
    }

    // Check incompatibilities (only if not already selected)
    if (currentQuantity === 0) {
      const incompatibleSelected = ingredient.incompatible_with?.filter(incomp => 
        selectedIngredients.includes(incomp.id)
      ) || [];
      
      if (incompatibleSelected.length > 0) {
        showMessage(`${ingredient.name} is incompatible with: ${incompatibleSelected.map(i => i.name).join(', ')}`, 'warning');
        return;
      }
      
      // Check requirements (only if not already selected)
      const missingRequirements = ingredient.requires?.filter(req => 
        !selectedIngredients.includes(req.id)
      ) || [];
      
      if (missingRequirements.length > 0) {
        showMessage(`${ingredient.name} requires: ${missingRequirements.map(r => r.name).join(', ')}`, 'warning');
        return;
      }
    }

    // Add ingredient
    setSelectedIngredients(prev => [...prev, ingredientId]);
  };

  const handleIngredientRemove = (ingredientId) => {
    const ingredient = ingredients.find(i => i.id === ingredientId);
    if (!ingredient) return;

    // Check if this ingredient is required by others
    const dependentIngredients = ingredients.filter(ing => 
      selectedIngredients.includes(ing.id) && 
      ing.requires && ing.requires.some(req => req.id === ingredientId)
    );
    
    if (dependentIngredients.length > 0) {
      showMessage(`Cannot remove ${ingredient.name} - required by: ${dependentIngredients.map(d => d.name).join(', ')}`, 'warning');
      return;
    }
    
    // Remove one instance of the ingredient
    const index = selectedIngredients.indexOf(ingredientId);
    if (index > -1) {
      setSelectedIngredients(prev => {
        const newArray = [...prev];
        newArray.splice(index, 1);
        return newArray;
      });
    }
  };

  const handleSizeChange = (newSize) => {
    const maxForNewSize = pricing.maxIngredients[newSize] || 0;
    
    if (selectedIngredients.length > maxForNewSize) {
      showMessage(`Cannot change to ${newSize} size. Remove ${selectedIngredients.length - maxForNewSize} ingredient(s) first.`, 'warning');
      return;
    }
    
    setSelectedSize(newSize);
  };

  const getIngredientStatus = (ingredient) => {
    const currentQuantity = getIngredientQuantity(ingredient.id);
    const totalCount = getTotalIngredientCount();
    const isOutOfStock = ingredient.available_portions === 0;
    const maxReached = totalCount >= (pricing.maxIngredients[selectedSize] || 0);
    const quantityLimitReached = ingredient.available_portions !== null && currentQuantity >= ingredient.available_portions;
    
    if (isOutOfStock) return { disabled: true, variant: 'secondary', text: 'Out of Stock' };
    if (quantityLimitReached) return { disabled: true, variant: 'secondary', text: 'Max Quantity' };
    if (maxReached && currentQuantity === 0) return { disabled: true, variant: 'secondary', text: 'Limit Reached' };
    if (currentQuantity > 0) return { disabled: false, variant: 'success', text: `Selected (${currentQuantity})` };
    
    // Check incompatibilities (only for new ingredients)
    const hasIncompatible = ingredient.incompatible_with?.some(incomp => 
      selectedIngredients.includes(incomp.id)
    );
    if (hasIncompatible) return { disabled: true, variant: 'warning', text: 'Incompatible' };
    
    // Check requirements (only for new ingredients)
    const hasUnmetRequirements = ingredient.requires?.some(req => 
      !selectedIngredients.includes(req.id)
    );
    if (hasUnmetRequirements) return { disabled: true, variant: 'info', text: 'Missing Requirements' };
    
    return { disabled: false, variant: 'outline-primary', text: 'Available' };
  };

  // Helper function to check if we can add more of a specific ingredient
  const canAddIngredient = (ingredient) => {
    const currentQuantity = getIngredientQuantity(ingredient.id);
    const totalCount = getTotalIngredientCount();
    
    // Check basic availability
    if (ingredient.available_portions === 0) return false;
    
    // Check if we've reached the quantity limit for this ingredient
    if (ingredient.available_portions !== null && currentQuantity >= ingredient.available_portions) return false;
    
    // Check if we've reached the total ingredient limit for the size
    const maxForSize = pricing.maxIngredients[selectedSize] || 0;
    if (totalCount >= maxForSize) return false;
    
    // If ingredient is not currently selected, check compatibility
    if (currentQuantity === 0) {
      // Check incompatibilities
      const hasIncompatible = ingredient.incompatible_with?.some(incomp => 
        selectedIngredients.includes(incomp.id)
      );
      if (hasIncompatible) return false;
      
      // Check requirements
      const hasUnmetRequirements = ingredient.requires?.some(req => 
        !selectedIngredients.includes(req.id)
      );
      if (hasUnmetRequirements) return false;
    }
    
    return true;
  };

  const calculateTotal = () => {
    // Get base price for the size
    const sizeBasePrices = {
      'Small': 5,
      'Medium': 7,
      'Large': 9
    };
    
    // Use the fixed base price for the selected size
    const basePrice = sizeBasePrices[selectedSize] || 7; // Default to medium if size not found
    
    // Add dish base price if applicable
    const dishPrice = selectedDish ? (selectedDish.base_price || 0) : 0;
    
    // Add ingredients total
    const ingredientsTotal = selectedIngredients.reduce((total, id) => {
      const ingredient = ingredients.find(i => i.id === id);
      return total + (ingredient ? ingredient.price : 0);
    }, 0);
    
    return basePrice + dishPrice + ingredientsTotal;
  };

  // Get unique ingredients with quantities for display
  const getSelectedIngredientsWithQuantity = () => {
    const ingredientCounts = {};
    selectedIngredients.forEach(id => {
      ingredientCounts[id] = (ingredientCounts[id] || 0) + 1;
    });
    
    return Object.entries(ingredientCounts).map(([id, quantity]) => {
      const ingredient = ingredients.find(i => i.id === parseInt(id));
      return { ingredient, quantity };
    }).filter(item => item.ingredient);
  };

  return (
    <div>
      {/* Header with total price in top right */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="fw-bold mb-0" style={{ color: '#ffffff' }}>
          <i className="bi bi-gear me-2"></i>
          Configure Your Order
        </h5>
        <div className="text-end">
          <div className="fw-bold" style={{ color: '#ffffff', fontSize: '1.2rem' }}>
            Total: €{calculateTotal().toFixed(2)}
          </div>
        </div>
      </div>

      {/* Dish Selection */}
      <Form.Group className="mb-4">
        <Form.Label className="fw-semibold" style={{ color: '#ffffff' }}>Base Dish</Form.Label>
        <div className="d-flex gap-2">
          {dishes.map(dish => (
            <Button
              key={dish.id}
              onClick={() => setSelectedDish(dish)}
              className="flex-fill text-capitalize"
              style={{ 
                borderRadius: '10px',
                backgroundColor: selectedDish?.id === dish.id ? '#ffffff' : '#7f1d1d',
                color: selectedDish?.id === dish.id ? '#7f1d1d' : '#ffffff',
                border: 'none'
              }}
            >
              {dish.name}
            </Button>
          ))}
        </div>
      </Form.Group>

      {/* Size Selection */}
      <Form.Group className="mb-4">
        <Form.Label className="fw-semibold" style={{ color: '#ffffff' }}>Size</Form.Label>
        <div className="d-flex gap-2">
          {['Small', 'Medium', 'Large'].map(size => {
            const sizeBasePrices = {
              'Small': 5,
              'Medium': 7,
              'Large': 9
            };
            const basePrice = sizeBasePrices[size] || 7;
            
            return (
              <Button
                key={size}
                onClick={() => handleSizeChange(size)}
                className="flex-fill"
                style={{ 
                  borderRadius: '10px',
                  backgroundColor: selectedSize === size ? '#ffffff' : '#7f1d1d',
                  color: selectedSize === size ? '#7f1d1d' : '#ffffff',
                  border: 'none'
                }}
              >
                {size} (€{basePrice})
              </Button>
            );
          })}
        </div>
        <Form.Text style={{ color: '#ffffff' }}>
          {selectedSize} allows up to {pricing.maxIngredients[selectedSize] || 0} ingredients
        </Form.Text>
      </Form.Group>

      {/* Selected Ingredients Summary */}
      {selectedIngredients.length > 0 && (
        <div className="mb-4">
          <h6 className="fw-semibold mb-2">Selected Ingredients ({selectedIngredients.length})</h6>
          <div className="d-flex flex-wrap gap-1">
            {getSelectedIngredientsWithQuantity().map(({ ingredient, quantity }, index) => (
              <Badge 
                key={`selected-${ingredient.id}-${index}`} 
                bg="success" 
                className="d-flex align-items-center"
                style={{ fontSize: '0.8rem' }}
              >
                {ingredient.name} x{quantity} (€{(ingredient.price * quantity).toFixed(2)})
                <i 
                  className="bi bi-dash-lg ms-1" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleIngredientRemove(ingredient.id)}
                  title="Remove one"
                ></i>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Ingredient Selection */}
      <Form.Group className="mb-4">
        <Form.Label className="fw-semibold" style={{ color: '#ffffff' }}>Add Ingredients</Form.Label>
        <div className="row g-2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {ingredients.map(ingredient => {
            const status = getIngredientStatus(ingredient);
            const currentQuantity = getIngredientQuantity(ingredient.id);
            const canAdd = canAddIngredient(ingredient);
            
            return (
              <div key={`ingredient-option-${ingredient.id}`} className="col-12">
                <div className="d-flex gap-2">
                  <Button
                    disabled={status.disabled}
                    onClick={() => handleIngredientAdd(ingredient.id)}
                    className="flex-grow-1 text-start d-flex justify-content-between align-items-center"
                    style={{ 
                      borderRadius: '8px',
                      backgroundColor: status.disabled ? '#f8f9fa' : '#ffffff',
                      color: status.disabled ? '#6c757d' : '#7f1d1d',
                      border: '1px solid #7f1d1d'
                    }}
                  >
                    <div>
                      <div className="fw-semibold text-capitalize">{ingredient.name}</div>
                      <div className="small">€{ingredient.price.toFixed(2)} each</div>
                    </div>
                    <div className="text-end">
                      <div className="small">{status.text}</div>
                      {ingredient.available_portions !== null && (
                        <div className="small">{ingredient.available_portions} available</div>
                      )}
                    </div>
                  </Button>
                  
                  <div className="d-flex gap-1">
                    <Button
                      size="sm"
                      onClick={() => handleIngredientAdd(ingredient.id)}
                      disabled={!canAdd}
                      style={{ 
                        borderRadius: '8px', 
                        minWidth: '40px',
                        backgroundColor: canAdd ? '#ffffff' : '#f8f9fa',
                        color: canAdd ? '#198754' : '#6c757d',
                        border: canAdd ? '1px solid #198754' : '1px solid #dee2e6'
                      }}
                      title={canAdd ? "Add one" : "Cannot add more"}
                    >
                      <i className="bi bi-plus"></i>
                    </Button>
                    
                    {currentQuantity > 0 && (
                      <Button
                        size="sm"
                        onClick={() => handleIngredientRemove(ingredient.id)}
                        style={{ 
                          borderRadius: '8px', 
                          minWidth: '40px',
                          backgroundColor: '#ffffff',
                          color: '#dc3545',
                          border: '1px solid #dc3545'
                        }}
                        title="Remove one"
                      >
                        <i className="bi bi-dash"></i>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Form.Group>

      {/* Order Summary */}
      <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '10px', background: '#f8fafc' }}>
        <Card.Body className="p-3">
          <h6 className="fw-bold mb-2">Order Summary</h6>
          <div className="d-flex justify-content-between mb-1">
            <span>{selectedDish?.name} ({selectedSize})</span>
          </div>
          <div className="d-flex justify-content-between mb-1">
            <span>Base price for {selectedSize}</span>
            <span>€{{'Small': 5, 'Medium': 7, 'Large': 9}[selectedSize].toFixed(2)}</span>
          </div>
          {getSelectedIngredientsWithQuantity().map(({ ingredient, quantity }, index) => (
            <div key={`summary-${ingredient.id}-${index}`} className="d-flex justify-content-between mb-1 small text-muted">
              <span>+ {ingredient.name} x{quantity}</span>
              <span>€{(ingredient.price * quantity).toFixed(2)}</span>
            </div>
          ))}
          <hr className="my-2" />
          <div className="d-flex justify-content-between fw-bold">
            <span>Total</span>
            <span>€{calculateTotal().toFixed(2)}</span>
          </div>
        </Card.Body>
      </Card>

      {/* Submit Button */}
      <Button 
        onClick={() => onSubmitOrder()}
        className="w-100 fw-bold border-0 shadow-sm"
        style={{ 
          borderRadius: '25px',
          backgroundColor: '#ffffff',
          color: '#7f1d1d',
          padding: '12px'
        }}
        disabled={!selectedDish}
      >
        <i className="bi bi-cart-check me-2"></i>
        Place Order
      </Button>
    </div>
  );
}

export default OrderConfigurator;