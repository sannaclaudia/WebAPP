import { Card, Button, Badge, Spinner } from 'react-bootstrap';
import dayjs from 'dayjs';

function OrderHistory({ orders, user, loading, onCancelOrder, showMessage }) {
  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading your orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="card border-0 shadow-lg" style={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '20px' }}>
          <div className="card-body p-5">
            <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-4" 
                 style={{ width: '100px', height: '100px', background: 'linear-gradient(45deg, #1e40af, #3b82f6)' }}>
              <i className="bi bi-cart-x text-white" style={{ fontSize: '3rem' }}></i>
            </div>
            <h3 className="fw-bold mb-3" style={{ color: '#1e40af' }}>No Orders Yet</h3>
            <p className="lead text-muted mb-0">You haven't placed any orders. Start by creating your first order!</p>
          </div>
        </div>
      </div>
    );
  }

  const canCancel = user && user.isTotp;

  return (
    <div>
      <h4 className="fw-bold mb-4" style={{ color: '#1e40af' }}>
        <i className="bi bi-clock-history me-2"></i>
        Your Order History
      </h4>

      {!canCancel && user && (
        <div className="alert alert-info border-0 shadow-sm mb-4" style={{ borderRadius: '15px' }}>
          <i className="bi bi-info-circle-fill me-2"></i>
          To cancel orders, you need to authenticate with 2FA when logging in.
        </div>
      )}

      <div className="row g-3">
        {orders.map(order => (
          <div key={order.id} className="col-12">
            <Card className="border-0 shadow-sm" style={{ borderRadius: '15px' }}>
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h6 className="fw-bold mb-1">
                      Order #{order.id}
                      {order.used_2fa && (
                        <i className="bi bi-shield-check text-success ms-2" title="Placed with 2FA"></i>
                      )}
                    </h6>
                    <div className="small text-muted">
                      {dayjs(order.created_at).format('MMMM D, YYYY [at] h:mm A')}
                    </div>
                  </div>
                  <div className="text-end">
                    <Badge 
                      bg={order.status === 'confirmed' ? 'success' : 'secondary'}
                      className="mb-2"
                    >
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                    <div className="fw-bold text-primary">
                      €{order.total_price.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="mb-3">
                  {order.items.map((item, index) => (
                    <div key={index} className="border rounded p-3 mb-2" style={{ background: '#f8fafc' }}>
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <div className="fw-semibold text-capitalize">
                            {item.dish_name} ({item.size})
                          </div>
                          {item.ingredients.length > 0 && (
                            <div className="small text-muted mt-1">
                              <strong>Ingredients:</strong> {item.ingredients.join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="text-end">
                          <div className="fw-semibold">€{item.total_price.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                {order.status === 'confirmed' && canCancel && (
                  <div className="d-flex justify-content-end">
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to cancel this order?')) {
                          onCancelOrder(order.id);
                        }
                      }}
                      style={{ borderRadius: '20px' }}
                    >
                      <i className="bi bi-x-circle me-1"></i>
                      Cancel Order
                    </Button>
                  </div>
                )}

                {order.status === 'confirmed' && !canCancel && user && (
                  <div className="text-muted small text-end">
                    <i className="bi bi-info-circle me-1"></i>
                    2FA required to cancel orders
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OrderHistory;
