import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Row, Col } from 'react-bootstrap';
import API from '../API';
import OrderHistory from './OrderHistory';

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
      console.log('Updated orders after cancellation:', updatedOrders); // Debug log
      setOrders(updatedOrders);
    } catch (err) {
      const errorMessage = err.message || err.error || 'Unable to cancel order';
      showMessage('Error cancelling order: ' + errorMessage);
    }
  };

  return (
    <Row className="justify-content-center">
      <Col xs={12} lg={10}>
        <div className="card shadow-lg border-0" style={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '15px' }}>
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

export default OrderHistoryLayout;
