import { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

function LoginForm({ onLogin, totpRequired, onTotp, onSkipTotp, isUpgradeMode, onCancelUpgrade }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await onLogin({ username, password });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTotp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (totpRequired) {
        await onTotp(totpCode);
      } else {
        await onLogin({ username, password });
      }
    } catch (error) {
      // Set appropriate error message based on the type of login
      if (totpRequired) {
        setError('Invalid TOTP code. Please try again.');
      } else {
        setError('Invalid username or password. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkipTotp = async () => {
    setLoading(true);
    setError('');
    
    try {
      await onSkipTotp();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
    if (error) setError('');
  };

  //-----------------------------------------------------------------------------
  // Handle password change
  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error) setError('');
  };

  // Handle TOTP code change
  const handleTotpChange = (e) => {
    setTotpCode(e.target.value);
    if (error) setError('');
  };
  
  return (
    <div className="p-4">
      <div className="text-center mb-4">
        <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
             style={{ width: '80px', height: '80px', background: 'linear-gradient(45deg, #7f1d1d, #dc2626)' }}>
          <i className="bi bi-person-fill text-white" style={{ fontSize: '2.5rem' }}></i>
        </div>
        <h3 className="fw-bold" style={{ color: '#ffffff' }}>
          {isUpgradeMode ? 'Upgrade Session' : totpRequired ? 'Two-Factor Authentication' : 'Welcome Back!'}
        </h3>
        <p className="text-white">
          {isUpgradeMode ? 'Enter your TOTP code to upgrade to full access' : totpRequired ? 'Please enter your TOTP code' : 'Sign in to your account'}
        </p>
      </div>

      {error && (
        <Alert variant="danger" className="border-0 shadow-sm" style={{ borderRadius: '10px' }}>
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </Alert>
      )}

      {!totpRequired && !isUpgradeMode ? (
        <Form onSubmit={handleLogin}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold text-white">Username</Form.Label>
            <Form.Control
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="border-0 shadow-sm"
              style={{ borderRadius: '10px', padding: '12px 16px' }}
              placeholder="Enter your username"
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold text-white">Password</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border-0 shadow-sm"
              style={{ borderRadius: '10px', padding: '12px 16px' }}
              placeholder="Enter your password"
            />
          </Form.Group>

          <Button 
            type="submit" 
            className="w-100 fw-bold border-0 shadow-sm"
            style={{ 
              borderRadius: '25px',
              backgroundColor: '#ffffff',
              color: '#7f1d1d',
              border: 'none',
              padding: '12px'
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Signing In...
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right me-2"></i>
                Sign In
              </>
            )}
          </Button>
        </Form>
      ) : (
        <Form onSubmit={handleTotp}>
          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold text-white">TOTP Code</Form.Label>
            <Form.Control
              type="text"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              required
              maxLength={6}
              className="border-0 shadow-sm"
              style={{ borderRadius: '10px', padding: '12px 16px', textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.2rem' }}
              placeholder="000000"
            />
            <Form.Text className="text-white">
              Enter the 6-digit code from your authenticator app
            </Form.Text>
          </Form.Group>

          <div className="d-grid gap-2">
            <Button 
              type="submit" 
              className="fw-bold border-0 shadow-sm"
              style={{ 
                borderRadius: '25px',
                backgroundColor: '#ffffff',
                color: '#7f1d1d',
                border: 'none',
                padding: '12px'
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {isUpgradeMode ? 'Upgrading...' : 'Verifying...'}
                </>
              ) : (
                <>
                  <i className="bi bi-shield-check me-2"></i>
                  {isUpgradeMode ? 'Upgrade Session' : 'Verify Code'}
                </>
              )}
            </Button>
            
            {!isUpgradeMode && (
              <Button 
                variant="outline-secondary"
                onClick={handleSkipTotp}
                className="fw-bold border-0"
                style={{ 
                  borderRadius: '25px',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff'
                }}
                disabled={loading}
              >
                <i className="bi bi-skip-forward me-2"></i>
                Skip 2FA (Limited Access)
              </Button>
            )}
            
            {isUpgradeMode && (
              <Button 
                variant="outline-secondary"
                onClick={onCancelUpgrade || (() => window.history.back())}
                className="fw-bold border-0"
                style={{ 
                  borderRadius: '25px',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff'
                }}
                disabled={loading}
              >
                <i className="bi bi-arrow-left me-2"></i>
                Cancel
              </Button>
            )}
          </div>
        </Form>
      )}
      
      {/* Back to Main Page Button */}
      <div className="text-center mt-4">
        <Button 
          variant="outline-light"
          onClick={() => navigate('/')}
          size="sm"
          className="fw-bold border-0"
          style={{ 
            borderRadius: '20px',
            padding: '8px 16px',
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff'
          }}
          disabled={loading}
        >
          <i className="bi bi-house me-1"></i>
          Back to Main Page
        </Button>
      </div>
    </div>
  );
}

export default LoginForm;
