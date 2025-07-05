import { Navbar, Nav, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function NavigationBar({ user, onLogout, onSessionUpgrade }) {

  return (
    <>
      <Navbar expand="lg" className="shadow-lg border-0 mb-4" style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)', borderRadius: '15px' }}>
        <div className="container-fluid">
          <Navbar.Brand as={Link} to="/" className="fw-bold fs-3" style={{ color: '#ffffff' }}>
            <i className="bi bi-shop me-2"></i>
            Restaurant
          </Navbar.Brand>
          
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto align-items-center">
              <Nav.Link as={Link} to="/" className="fw-semibold me-3 text-white">
                <i className="bi bi-house me-1"></i>
                Home
              </Nav.Link>
              
              {user ? (
                <>
                  <Nav.Link as={Link} to="/order" className="fw-semibold me-3 text-white">
                    <i className="bi bi-cart-plus me-1"></i>
                    Create Order
                  </Nav.Link>
                  <Nav.Link as={Link} to="/history" className="fw-semibold me-3 text-white">
                    <i className="bi bi-clock-history me-1"></i>
                    Order History
                  </Nav.Link>
                  <div className="me-3 text-white">
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
                    onClick={onLogout}
                    size="sm"
                    style={{ 
                      borderRadius: '20px',
                      backgroundColor: '#ffffff',
                      color: '#dc3545',
                      border: 'none'
                    }}
                  >
                    <i className="bi bi-box-arrow-right me-1"></i>
                    Logout
                  </Button>
                </>
              ) : (
                <Button 
                  as={Link} 
                  to="/login" 
                  style={{ 
                    borderRadius: '20px',
                    backgroundColor: '#ffffff',
                    color: '#7f1d1d',
                    border: 'none'
                  }}
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
