import { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';

function LoginForm({ onLogin, totpRequired, onTotp, onSkipTotp }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        setErrorMessage('Invalid TOTP code. Please try again.');
      } else {
        setErrorMessage('Invalid username or password. Please check your credentials and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

   const handleUsernameChange = (e) => {
    setUsername(e.target.value);
    if (errorMessage) setErrorMessage('');
  };

  //-----------------------------------------------------------------------------
  // Handle password change
  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (errorMessage) setErrorMessage('');
  };

  // Handle TOTP code change
  const handleTotpChange = (e) => {
    setTotpCode(e.target.value);
    if (errorMessage) setErrorMessage('');
  };
  
  return (
    <div className="p-4">
      <div className="text-center mb-4">
        <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
             style={{ width: '80px', height: '80px', background: 'linear-gradient(45deg, #1e40af, #3b82f6)' }}>
          <i className="bi bi-person-fill text-white" style={{ fontSize: '2.5rem' }}></i>
        </div>
        <h3 className="fw-bold" style={{ color: '#1e40af' }}>
          {totpRequired ? 'Two-Factor Authentication' : 'Welcome Back!'}
        </h3>
        <p className="text-muted">
          {totpRequired ? 'Please enter your TOTP code' : 'Sign in to your account'}
        </p>
      </div>

      {error && (
        <Alert variant="danger" className="border-0 shadow-sm" style={{ borderRadius: '10px' }}>
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </Alert>
      )}

      {!totpRequired ? (
        <Form onSubmit={handleLogin}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Username</Form.Label>
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
            <Form.Label className="fw-semibold">Password</Form.Label>
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
              background: 'linear-gradient(90deg, #1e40af 0%, #3b82f6 100%)',
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
            <Form.Label className="fw-semibold">TOTP Code</Form.Label>
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
            <Form.Text className="text-muted">
              Enter the 6-digit code from your authenticator app
            </Form.Text>
          </Form.Group>

          <div className="d-grid gap-2">
            <Button 
              type="submit" 
              className="fw-bold border-0 shadow-sm"
              style={{ 
                borderRadius: '25px',
                background: 'linear-gradient(90deg, #1e40af 0%, #3b82f6 100%)',
                padding: '12px'
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Verifying...
                </>
              ) : (
                <>
                  <i className="bi bi-shield-check me-2"></i>
                  Verify Code
                </>
              )}
            </Button>

            <Button 
              variant="outline-secondary" 
              onClick={onSkipTotp}
              className="fw-semibold"
              style={{ borderRadius: '25px', padding: '12px' }}
              disabled={loading}
            >
              <i className="bi bi-skip-forward me-2"></i>
              Skip 2FA (Limited Access)
            </Button>
          </div>
        </Form>
      )}
    </div>
  );
}

export default LoginForm;
