// -----------------------------------------------------------------------------
// App Component
// -----------------------------------------------------------------------------
// This file defines the main App component, which serves as the root of the
// application. It manages the state of the application, handles authentication,
// and defines routes for navigation.
// -----------------------------------------------------------------------------

import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import API from './API';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

import { RestaurantLayout, LoginLayout, NotFoundLayout, OrderConfiguratorLayout, OrderHistoryLayout } from './components/Layout';
import Container from 'react-bootstrap/Container';

//----------------------------------------------------------------------------
function App() {
  const [user, setUser] = useState(null);
  const [totpRequired, setTotpRequired] = useState(false);
  const [pendingAdminUser, setPendingAdminUser] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('danger');

  const navigate = useNavigate();

  //----------------------------------------------------------------------------
  // Check session on mount
  // This effect runs once when the component mounts to check if the user is logged in
  // this is given by the fact that there is no value inside the dependencies array
  useEffect(() => {
    API.getUserInfo()
      .then(u => setUser(u))
      .catch(() => setUser(null));
  }, []);

  // So if the user can do the TOTP check, then we set the state to require TOTP
  // and store the pending admin user data for later verification.
  async function handleLogin(credentials) {
    try {
      const res = await API.logIn(credentials);
      if (res.canDoTotp) {
        setTotpRequired(true);
        setPendingAdminUser(res);
        setUser(null);
      } else {
        setUser({ ...res, isTotp: false });
        setTotpRequired(false);
        setPendingAdminUser(null);
        navigate('/');
      }
      setMessage('');
    } catch (err) {
      setUser(null);
      setTotpRequired(false);
      setPendingAdminUser(null);
      setMessage('');
      throw new Error(err.error || 'Login failed. Please check your credentials.');
    }
  }

  //-----------------------------------------------------------------------------
  // Handle TOTP verification
  async function handleTotp(code) {
    try {
      await API.logInTotp(code);
      const u = await API.getUserInfo();
      setUser(u);
      setTotpRequired(false);
      setPendingAdminUser(null);
      setMessage('');
      navigate('/');
    } catch (err) {
      throw new Error(err.error || 'Invalid TOTP code. Please try again.');
    }
  }

  //-----------------------------------------------------------------------------
  // Handle skipping TOTP for pending admin user
  async function handleSkipTotp() {
    if (pendingAdminUser) {
      setUser({ 
        ...pendingAdminUser, 
        twofa_enabled: false,
        limited_access: true,
        original_admin: true
      });
      setTotpRequired(false);
      setPendingAdminUser(null);
      setMessage('Logged in with limited access. Complete 2FA to cancel orders.');
      setMessageType('warning');
      setTimeout(() => setMessage(''), 3000);
      navigate('/');
    }
  }

  //-----------------------------------------------------------------------------
  // Handle user logout
  async function handleLogout() {
    await API.logOut();
    setUser(null);
    setTotpRequired(false);
    setPendingAdminUser(null);
    setMessage('');
    navigate('/login');
  }

  //-----------------------------------------------------------------------------
  // Global message handler
  const showMessage = (msg, type = 'danger') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  //############################################################################
  // --- Routing ---
  return (
    <div className="min-vh-100 w-100" style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      margin: 0,
      padding: 0
    }}>
      <Container fluid className="p-0">
        <div className="px-3 py-4" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #1e40af 100%)' }}>
          <Routes>
            <Route path="/login" element={<LoginLayout onLogin={handleLogin} totpRequired={totpRequired} onTotp={handleTotp} onSkipTotp={handleSkipTotp} />} />
            <Route path="/" element={<RestaurantLayout user={user} message={message} messageType={messageType} onLogout={handleLogout} showMessage={showMessage} />} />
            <Route path="/order" element={<RestaurantLayout user={user} message={message} messageType={messageType} onLogout={handleLogout} showMessage={showMessage} />}>
              <Route index element={<OrderConfiguratorLayout user={user} showMessage={showMessage} />} />
            </Route>
            <Route path="/history" element={<RestaurantLayout user={user} message={message} messageType={messageType} onLogout={handleLogout} showMessage={showMessage} />}>
              <Route index element={<OrderHistoryLayout user={user} showMessage={showMessage} />} />
            </Route>
            <Route path="*" element={<NotFoundLayout />} />
          </Routes>
        </div>
      </Container>
    </div>
  );
}

//----------------------------------------------------------------------------
export default App;