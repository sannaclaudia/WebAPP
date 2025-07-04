import { Navbar, Nav, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function NavigationBar({ user, onLogout, onSessionUpgrade }) {

  return (
    <>
      <Navbar expand="lg" className="shadow-lg border-0 mb-4" style={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '15px' }}>
        <div className="container-fluid">
          <Navbar.Brand as={Link} to="/" className="fw-bold fs-3" style={{ color: '#1e40af' }}>
            <i className="bi bi-shop me-2"></i>
            Restaurant
          </Navbar.Brand>
          
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto align-items-center">
              <Nav.Link as={Link} to="/" className="fw-semibold me-3">
                <i className="bi bi-house me-1"></i>
                Home
              </Nav.Link>
              
              {user ? (
                <>
                  <Nav.Link as={Link} to="/order" className="fw-semibold me-3">
                    <i className="bi bi-cart-plus me-1"></i>
                    Create Order
                  </Nav.Link>
                  <Nav.Link as={Link} to="/history" className="fw-semibold me-3">
                    <i className="bi bi-clock-history me-1"></i>
                    Order History
                  </Nav.Link>
                  <div className="me-3 text-muted">
                    Welcome, <strong>{user.username}</strong>
                    {user.isTotp && (
                      <i className="bi bi-shield-check text-success ms-1" title="2FA Authenticated"></i>
                    )}
                    {user.isSkippedTotp && (
                      <i className="bi bi-exclamation-triangle text-warning ms-1" title="2FA Skipped - Limited Access"></i>
                    )}
                  </div>
                  
                  {user.isSkippedTotp && (
                    <Button 
                      variant="outline-warning" 
                      onClick={onSessionUpgrade}
                      size="sm"
                      className="me-2"
                      style={{ borderRadius: '20px' }}
                    >
                      <i className="bi bi-shield-check me-1"></i>
                      Upgrade to Full Access
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline-danger" 
                    onClick={onLogout}
                    size="sm"
                    style={{ borderRadius: '20px' }}
                  >
                    <i className="bi bi-box-arrow-right me-1"></i>
                    Logout
                  </Button>
                </>
              ) : (
                <Button 
                  as={Link} 
                  to="/login" 
                  variant="primary"
                  style={{ borderRadius: '20px' }}
                >
                  <i className="bi bi-box-arrow-in-right me-1"></i>
                  Login
                </Button>
              )}
            </Nav>
          </Navbar.Collapse>
        </div>
      </Navbar>
    </>
  );
}

export default NavigationBar;
