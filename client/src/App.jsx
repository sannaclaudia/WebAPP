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
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('danger');
  const [isUpgradeMode, setIsUpgradeMode] = useState(false);
  const [upgradeReturnPath, setUpgradeReturnPath] = useState('/');

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

  // All users now require TOTP, so we always set totpRequired to true
  async function handleLogin(credentials) {
    try {
      const res = await API.logIn(credentials);
      // Since all users require TOTP now, we always require TOTP verification
      setTotpRequired(true);
      setUser(null);
      setMessage('');
    } catch (err) {
      setUser(null);
      setTotpRequired(false);
      setMessage('');
      throw new Error(err.error || 'Login failed. Please check your credentials.');
    }
  }

  //-----------------------------------------------------------------------------
  // Handle TOTP verification (works for both initial login and session upgrade)
  async function handleTotp(code) {
    try {
      await API.logInTotp(code);
      const u = await API.getUserInfo();
      setUser(u);
      setTotpRequired(false);
      setIsUpgradeMode(false);
      setMessage('');
      
      // Navigate appropriately based on the mode
      if (isUpgradeMode) {
        // Return to the page where the upgrade was initiated
        navigate(upgradeReturnPath);
      } else {
        // Go to home page after initial login
        navigate('/');
      }
    } catch (err) {
      throw new Error(err.error || 'Invalid TOTP code. Please try again.');
    }
  }

  //-----------------------------------------------------------------------------
  // Handle skipping TOTP verification
  async function handleSkipTotp() {
    try {
      await API.skipTotp();
      const u = await API.getUserInfo();
      setUser(u);
      setTotpRequired(false);
      setMessage('');
      navigate('/');
    } catch (err) {
      throw new Error(err.error || 'Unable to skip TOTP verification.');
    }
  }

  //-----------------------------------------------------------------------------
  // Handle user logout
  async function handleLogout() {
    await API.logOut();
    setUser(null);
    setTotpRequired(false);
    setMessage('');
    navigate('/login');
  }

  //-----------------------------------------------------------------------------
  // Handle session upgrade request
  const handleSessionUpgrade = () => {
    // Store current location to return after upgrade
    setUpgradeReturnPath(window.location.pathname);
    setIsUpgradeMode(true);
    setTotpRequired(true);
    navigate('/login');
  };

  //-----------------------------------------------------------------------------
  // Handle canceling session upgrade
  const handleCancelUpgrade = () => {
    setIsUpgradeMode(false);
    setTotpRequired(false);
    navigate(upgradeReturnPath);
  };

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
      background: '#ffffff',
      margin: 0,
      padding: 0
    }}>
      <Container fluid className="p-0">
        <div className="px-3 py-4" style={{ minHeight: '100vh', background: '#ffffff' }}>
          <Routes>
            <Route path="/login" element={<LoginLayout onLogin={handleLogin} totpRequired={totpRequired} onTotp={handleTotp} onSkipTotp={handleSkipTotp} isUpgradeMode={isUpgradeMode} onCancelUpgrade={handleCancelUpgrade} />} />
            <Route path="/" element={<RestaurantLayout user={user} message={message} messageType={messageType} onLogout={handleLogout} showMessage={showMessage} onSessionUpgrade={handleSessionUpgrade} />} />
            <Route path="/order" element={<RestaurantLayout user={user} message={message} messageType={messageType} onLogout={handleLogout} showMessage={showMessage} onSessionUpgrade={handleSessionUpgrade} />}>
              <Route index element={<OrderConfiguratorLayout user={user} showMessage={showMessage} />} />
            </Route>
            <Route path="/history" element={<RestaurantLayout user={user} message={message} messageType={messageType} onLogout={handleLogout} showMessage={showMessage} onSessionUpgrade={handleSessionUpgrade} />}>
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