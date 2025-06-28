import { Card, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';

function MenuBrowser({ dishes, ingredients, pricing }) {
  const renderIngredientConstraints = (ingredient) => {
    const constraints = [];
    
    if (ingredient.requires && ingredient.requires.length > 0) {
      constraints.push(
        <div key="requires" className="small text-info mb-1">
          <i className="bi bi-arrow-right-circle me-1"></i>
          Requires: {ingredient.requires.map(r => r.name).join(', ')}
        </div>
      );
    }
    
    if (ingredient.incompatible_with && ingredient.incompatible_with.length > 0) {
      constraints.push(
        <div key="incompatible" className="small text-warning mb-1">
          <i className="bi bi-x-circle me-1"></i>
          Incompatible with: {ingredient.incompatible_with.map(i => i.name).join(', ')}
        </div>
      );
    }
    
    return constraints;
  };

  return (
    <div className="p-4">
      <h5 className="fw-bold mb-3" style={{ color: '#1e40af' }}>
        <i className="bi bi-list-ul me-2"></i>
        Menu & Ingredients
      </h5>
      
      {/* Base Dishes */}
      <div className="mb-4">
        <h6 className="fw-semibold mb-3 text-muted">Base Dishes</h6>
        <div className="row g-2">
          {dishes.map(dish => (
            <div key={dish.id} className="col-12 col-sm-6 col-lg-4">
              <Card className="border-0 shadow-sm text-center" style={{ borderRadius: '10px' }}>
                <Card.Body className="p-2">
                  <div className="fw-semibold text-capitalize small">{dish.name}</div>
                  <div className="small text-muted">
                    Base price: €{dish.base_price ? dish.base_price.toFixed(2) : '0.00'}
                  </div>
                </Card.Body>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Sizes (replaces Size Multipliers) */}
      <div className="mb-4">
        <h6 className="fw-semibold mb-3 text-muted">Available Sizes</h6>
        <div className="small text-muted">
          <div><strong>Small:</strong> Max {pricing.maxIngredients?.Small || 3} ingredients</div>
          <div><strong>Medium:</strong> Max {pricing.maxIngredients?.Medium || 5} ingredients</div>
          <div><strong>Large:</strong> Max {pricing.maxIngredients?.Large || 7} ingredients</div>
        </div>
      </div>

      {/* Ingredients */}
      <div>
        <h6 className="fw-semibold mb-3 text-muted">Available Ingredients</h6>
        <div className="row g-2">
          {ingredients.map(ingredient => (
            <div key={ingredient.id} className="col-12">
              <OverlayTrigger
                placement="right"
                overlay={
                  <Tooltip>
                    <div>
                      <div className="fw-bold">{ingredient.name}</div>
                      <div>Price: €{ingredient.price.toFixed(2)}</div>
                      <div>
                        Available: {ingredient.available_portions === null ? 'Unlimited' : ingredient.available_portions}
                      </div>
                      {renderIngredientConstraints(ingredient)}
                    </div>
                  </Tooltip>
                }
              >
                <Card className={`border-0 shadow-sm ${ingredient.available_portions === 0 ? 'opacity-50' : ''}`} 
                      style={{ borderRadius: '8px', cursor: 'pointer' }}>
                  <Card.Body className="p-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-semibold text-capitalize">{ingredient.name}</div>
                        <div className="small text-muted">€{ingredient.price.toFixed(2)}</div>
                      </div>
                      <div className="text-end">
                        {ingredient.available_portions === null ? (
                          <Badge bg="success" className="small">Unlimited</Badge>
                        ) : ingredient.available_portions > 0 ? (
                          <Badge bg="primary" className="small">{ingredient.available_portions} left</Badge>
                        ) : (
                          <Badge bg="danger" className="small">Out of stock</Badge>
                        )}
                        
                        {/* Constraint indicators */}
                        <div className="mt-1">
                          {ingredient.requires && ingredient.requires.length > 0 && (
                            <i className="bi bi-arrow-right-circle text-info me-1" title="Has requirements"></i>
                          )}
                          {ingredient.incompatible_with && ingredient.incompatible_with.length > 0 && (
                            <i className="bi bi-x-circle text-warning" title="Has incompatibilities"></i>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </OverlayTrigger>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MenuBrowser;
