import { Card, Button, Spinner, Modal } from 'react-bootstrap';
import dayjs from 'dayjs';
import { useState } from 'react';

function OrderHistory({ orders, user, loading, onCancelOrder}) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);

  const handleCancelClick = (orderId) => {
    setOrderToCancel(orderId);
    setShowConfirmModal(true);
  };

  const handleConfirmCancel = () => {
    if (orderToCancel) {
      onCancelOrder(orderToCancel);
      setShowConfirmModal(false);
      setOrderToCancel(null);
    }
  };

  const handleCancelModal = () => {
    setShowConfirmModal(false);
    setOrderToCancel(null);
  };

  // Confirmation Modal Component
  const ConfirmationModal = () => (
    <Modal show={showConfirmModal} onHide={handleCancelModal} centered>
      <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)', border: 'none' }}>
        <Modal.Title className="text-white">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Confirm Cancellation
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <div className="text-center">
          <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
               style={{ width: '60px', height: '60px', background: 'linear-gradient(45deg, #dc3545, #c82333)' }}>
            <i className="bi bi-x-circle text-white" style={{ fontSize: '1.5rem' }}></i>
          </div>
          <p className="mb-2 fs-5">Are you sure you want to cancel this order?</p>
          <p className="text-muted">This action cannot be undone.</p>
        </div>
      </Modal.Body>
      <Modal.Footer className="border-0 justify-content-center">
        <Button 
          variant="secondary" 
          onClick={handleCancelModal}
          style={{ borderRadius: '20px', minWidth: '100px' }}
        >
          Keep Order
        </Button>
        <Button 
          onClick={handleConfirmCancel}
          style={{ 
            borderRadius: '20px', 
            minWidth: '100px',
            backgroundColor: '#dc3545',
            color: '#ffffff',
            border: 'none'
          }}
        >
          <i className="bi bi-x-circle me-1"></i>
          Cancel Order
        </Button>
      </Modal.Footer>
    </Modal>
  );
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
                 style={{ width: '100px', height: '100px', background: 'linear-gradient(45deg, #7f1d1d, #dc2626)' }}>
              <i className="bi bi-cart-x text-white" style={{ fontSize: '3rem' }}></i>
            </div>
            <h3 className="fw-bold mb-3" style={{ color: '#7f1d1d' }}>No Orders Yet</h3>
            <p className="lead text-muted mb-0">You haven't placed any orders. Start by creating your first order!</p>
          </div>
        </div>
      </div>
    );
  }

  const canCancel = user && user.isTotp;

  return (
    <div>
      <ConfirmationModal />
      
      <h4 className="fw-bold mb-4" style={{ color: '#ffffff' }}>
        <i className="bi bi-clock-history me-2"></i>
        Your Order History
      </h4>

      {!canCancel && user && (
        <div className="alert alert-info border-0 shadow-sm mb-4" style={{ borderRadius: '15px' }}>
          <i className="bi bi-info-circle-fill me-2"></i>
          {user.isSkippedTotp ? 
            'You skipped 2FA verification. To cancel orders, please log out and log in again with 2FA.' :
            'To cancel orders, you need to authenticate with 2FA when logging in.'
          }
        </div>
      )}

      <div className="row g-3">
        {orders.map((order, index) => (
          <div key={`order-${order.id}-${index}`} className="col-12">
            <Card className="border-0 shadow-sm" style={{ borderRadius: '15px' }}>
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h6 className="fw-bold mb-1">
                      Order #{order.id}
                    </h6>
                    <div className="small text-muted">
                      {dayjs(order.created_at).format('MMMM D, YYYY [at] h:mm A')}
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="fw-bold text-primary">
                      €{order.total_price.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                <div className="mb-3">
                  <div className="border rounded p-3" style={{ background: '#f8fafc' }}>
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="w-100">
                        <div className="fw-semibold text-capitalize mb-2">
                          {order.dish_name} ({order.size})
                        </div>
                        
                        {/* Display ingredients from OrderIngredients and Ingredients tables */}
                        <div className="small text-muted">
                          <strong>Ingredients:</strong>
                          {order.orderIngredients && order.orderIngredients.length > 0 ? (
                            <div className="mt-2">
                              {order.orderIngredients.map((orderIngredient, index) => (
                                <div key={`${orderIngredient.ingredient_id}-${index}`} className="d-flex justify-content-between align-items-center py-1">
                                  <span>
                                    {orderIngredient.ingredient_name} x{orderIngredient.quantity || 1}
                                  </span>
                                  <span className="text-success fw-semibold">
                                    €{((orderIngredient.price || 0) * (orderIngredient.quantity || 1)).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-1 text-muted fst-italic">
                              No additional ingredients
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {canCancel && (
                  <div className="d-flex justify-content-end">
                    <Button
                      size="sm"
                      onClick={() => handleCancelClick(order.id)}
                      style={{ 
                        borderRadius: '20px',
                        backgroundColor: '#ffffff',
                        color: '#dc3545',
                        border: '1px solid #dc3545'
                      }}
                    >
                      <i className="bi bi-x-circle me-1"></i>
                      Cancel Order
                    </Button>
                  </div>
                )}

                {!canCancel && user && (
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
