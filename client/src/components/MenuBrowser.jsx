import { Card, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';

function MenuBrowser({ dishes, ingredients, pricing }) {
  const renderIngredientConstraints = (ingredient) => {
    const constraints = [];
    
    if (ingredient.requires && ingredient.requires.length > 0) {
      constraints.push(
        <div key={`requires-${ingredient.id}`} className="small text-info mb-1">
          <i className="bi bi-arrow-right-circle me-1"></i>
          Requires: {ingredient.requires.map(r => r.name).join(', ')}
        </div>
      );
    }
    
    if (ingredient.incompatible_with && ingredient.incompatible_with.length > 0) {
      constraints.push(
        <div key={`incompatible-${ingredient.id}`} className="small text-warning mb-1">
          <i className="bi bi-x-circle me-1"></i>
          Incompatible with: {ingredient.incompatible_with.map(i => i.name).join(', ')}
        </div>
      );
    }
    
    return constraints;
  };

  return (
    <div className="p-4">
      <h5 className="fw-bold mb-3" style={{ color: '#ffffff' }}>
        <i className="bi bi-list-ul me-2"></i>
        Available Ingredients
      </h5>

      {/* Ingredients */}
      <div>
        <div className="row g-2">
          {ingredients.map(ingredient => (
            <div key={ingredient.id} className="col-12">
              <OverlayTrigger
                placement="right"
                overlay={
                  <Tooltip>
                    <div>
                      <div className="fw-bold text-white">{ingredient.name}</div>
                      <div className="text-white">Price: €{ingredient.price.toFixed(2)}</div>
                      <div className="text-white">
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
