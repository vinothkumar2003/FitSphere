
import React, { useState } from 'react';
import { useAuth } from '../../utils/AuthProvider';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import PageTitle from '../../components/PageTitle';

const LoginPage = ({ title = 'Login' }) => {
  const containerRef = React.useRef(null);
  const [active, setActive] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupData, setSignupData] = useState({ username: '', name: '', email: '', password: '', gender: '' });
  const [loginError, setLoginError] = useState('');
  const [signupError, setSignupError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const namePattern = /^[A-Za-z ]+$/;
  const usernamePattern = /^[A-Za-z]+$/;
  const gmailPattern = /^[A-Za-z0-9._%+-]+@gmail\.com$/i;

  const handleRegisterClick = () => setActive(true);
  const handleLoginClick = () => setActive(false);

  // Handle login API
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    try {
      const res = await api.post('/api/auth/login', { email: loginEmail, password: loginPassword });
      const data = res.data;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      login(data.user);
      var role = data.user.role;
      navigate(`/${role.toLowerCase()}`);
    } catch (err) {
      // Log full error for debugging
      console.error('Login error:', err);
      setLoginError(
        err.response?.data?.message || err.message || 'Login failed. Please try again.'
      );
    }
    setLoading(false);
  };

  // Handle signup API
  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupError('');

    const trimmedUsername = signupData.username.trim();
    const trimmedName = signupData.name.trim();
    const trimmedEmail = signupData.email.trim();

    if (!trimmedUsername || !usernamePattern.test(trimmedUsername)) {
      setSignupError('Username must contain letters only.');
      return;
    }

    if (!trimmedName || !namePattern.test(trimmedName)) {
      setSignupError('Name must contain text only.');
      return;
    }

    if (!gmailPattern.test(trimmedEmail)) {
      setSignupError('Email must be a valid @gmail.com address.');
      return;
    }

    if (!signupData.gender) {
      setSignupError('Please select a gender.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/auth/signup', {
        username: trimmedUsername,
        fullName: trimmedName,
        email: trimmedEmail,
        password: signupData.password,
        role: 'CLIENT',
        phone: '',
        address: '',
        aadharNumber: '',
        panNumber: '',
        gender: signupData.gender
      });
      const data = res.data;
      const activationToken = data.activationToken || data.jwtToken || data.token || '';

      localStorage.setItem('pendingOtpEmail', trimmedEmail);

      if (activationToken) {
        localStorage.setItem('activationToken', activationToken);
      }

      navigate('/otpverify', {
        replace: true,
        state: {
          email: trimmedEmail,
          jwtToken: activationToken,
        },
      });
    } catch (err) {
      // Log full error for debugging
      console.error('Signup error:', err);
      setSignupError(
        err.response?.data?.message || err.message || 'Signup failed. Please try again.'
      );
    }
    setLoading(false);
  };

  const handleSignupInput = (e) => {
    setSignupError('');
    setSignupData({ ...signupData, [e.target.name]: e.target.value });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(to right, #e2e2e2, #c9d6ff)' }}>
      <PageTitle title={title} />
      {/* FontAwesome CDN for icons */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" />
      <div
        className={`container${active ? ' active' : ''}`}
        ref={containerRef}
        style={{ background: '#fff', borderRadius: 30, boxShadow: '0 5px 15px rgba(0,0,0,0.35)', position: 'relative', overflow: 'hidden', width: 768, maxWidth: '100%', minHeight: 480 }}
      >
        {/* Sign Up Form */}
        <div className="form-container sign-up">
          <form onSubmit={handleSignup}>
            <h1 style={{color: '#111'}}>Create Account</h1>
            <span>or use your email for registration</span>
            <input type="text" name="username" placeholder="Username" value={signupData.username} onChange={handleSignupInput} pattern="[A-Za-z]+" title="Username must contain letters only" required />
            <input type="text" name="name" placeholder="Name" value={signupData.name} onChange={handleSignupInput} pattern="[A-Za-z ]+" title="Name must contain letters and spaces only" required />
            <input type="email" name="email" placeholder="Email" value={signupData.email} onChange={handleSignupInput} pattern="[A-Za-z0-9._%+-]+@gmail\.com" title="Please enter a valid @gmail.com email address" required />
            <input type="password" name="password" placeholder="Password" value={signupData.password} onChange={handleSignupInput} required />
            <div className="gender-group">
              <span className="gender-label">Gender:</span>
              <label className="gender-radio">
                <input type="radio" name="gender" value="male" checked={signupData.gender === 'male'} onChange={handleSignupInput} /> Male
              </label>
              <label className="gender-radio">
                <input type="radio" name="gender" value="female" checked={signupData.gender === 'female'} onChange={handleSignupInput} /> Female
              </label>
            </div>
            {signupError && <div style={{ color: 'red', fontSize: 13 }}>{signupError}</div>}
            <button type="submit" disabled={loading}>{loading ? 'Signing Up...' : 'Sign Up'}</button>
            <a
              href="#"
              className="switch-link"
              onClick={e => {e.preventDefault(); handleLoginClick();}}
            >
              Switch to Sign In
            </a>
          </form>
        </div>
        {/* Sign In Form */}
        <div className="form-container sign-in">
          <form onSubmit={handleLogin}>
            <h1 style={{color: '#111'}}>Sign In</h1>
            <span>or use your email password</span>
            <input type="email" placeholder="Email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
            <a href="#">→ Forget Your Password? ←</a>
            {loginError && <div style={{ color: 'red', fontSize: 13 }}>{loginError}</div>}
            <button type="submit" disabled={loading}>{loading ? 'Signing In...' : 'Sign In'}</button>
            <a
              href="#"
              className="switch-link"
              onClick={e => {e.preventDefault(); handleRegisterClick();}}
            >
              Switch to Sign Up
            </a>
          </form>
        </div>
        {/* Toggle Container */}
        <div className="toggle-container">
          <div className="toggle">
            <div className="toggle-panel toggle-left">
              <h1>Welcome Back!</h1>
              <p>Enter your personal details to use all of site features</p>
              <button className="hidden" id="login" type="button" onClick={handleLoginClick}>Sign In</button>
            </div>
            <div className="toggle-panel toggle-right">
              <h1>Hello, Friend!</h1>
              <p>Register with your personal details to use all of site features</p>
              <button className="hidden" id="register" type="button" onClick={handleRegisterClick}>Sign Up</button>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .gender-group {
          display: flex;
          align-items: center;
          gap: 18px;
          margin: 8px 0 0 0;
          width: 100%;
        }
        .gender-label {
          font-size: 13px;
          margin-right: 8px;
          color: #333;
          min-width: 55px;
        }
        .gender-radio {
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-right: 10px;
        }
        .gender-radio input[type="radio"] {
          accent-color: #512da8;
          margin-right: 4px;
        }
        .switch-link {
          margin-top: 10px;
          color: #512da8;
          font-weight: 600;
          text-align: center;
          display: none;
        }
        @media (max-width: 600px) {
          .switch-link {
            display: block;
            font-size: 16px;
            margin-bottom: 10px;
          }
        }
                @media (max-width: 900px) {
                  .container {
                    width: 95vw !important;
                    min-width: unset;
                    border-radius: 16px;
                  }
                }
                @media (max-width: 600px) {
                  .container {
                    width: 100vw !important;
                    min-width: unset;
                    min-height: 100vh !important;
                    border-radius: 0;
                    box-shadow: none;
                  }
                  .form-container,
                  .sign-in,
                  .sign-up {
                    width: 100% !important;
                    left: 0 !important;
                    padding: 0 10px;
                  }
                  .toggle-container {
                    display: none !important;
                  }
                  .container form {
                    padding: 0 10px;
                  }
                }
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap');
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Montserrat', sans-serif;
        }
        .container {
          transition: box-shadow 0.3s;
        }
        .container p {
          font-size: 14px;
          line-height: 20px;
          letter-spacing: 0.3px;
          margin: 20px 0;
        }
        .container span {
          font-size: 12px;
        }
        .container a {
          color: #333;
          font-size: 13px;
          text-decoration: none;
          margin: 15px 0 10px;
        }
        .container button {
          background-color: #512da8;
          color: #fff;
          font-size: 12px;
          padding: 10px 45px;
          border: 1px solid transparent;
          border-radius: 8px;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-top: 10px;
          cursor: pointer;
        }
        .container button.hidden {
          background-color: transparent;
          border-color: #fff;
        }
        .container form {
          background-color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 0 40px;
          height: 100%;
        }
        .container input {
          background-color: #eee;
          border: none;
          margin: 8px 0;
          padding: 10px 15px;
          font-size: 13px;
          border-radius: 8px;
          width: 100%;
          outline: none;
        }
        .form-container {
          position: absolute;
          top: 0;
          height: 100%;
          transition: all 0.6s ease-in-out;
        }
        .sign-in {
          left: 0;
          width: 50%;
          z-index: 2;
        }
        .container.active .sign-in {
          transform: translateX(100%);
        }
        .sign-up {
          left: 0;
          width: 50%;
          opacity: 0;
          z-index: 1;
          transition: all 0.5s;
        }
        .container.active .sign-up {
          transform: translateX(100%);
          opacity: 1;
          z-index: 5;
          animation: move 0.6s;
        }
        @keyframes move {
          0%, 49.99% {
            opacity: 0;
            z-index: 1;
          }
          50%, 100% {
            opacity: 1;
            z-index: 5;
          }
        }
        .social-icons {
          margin: 20px 0;
        }
        .social-icons a {
          border: 1px solid #ccc;
          border-radius: 20%;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          margin: 0 3px;
          width: 40px;
          height: 40px;
          transition: all 0.5s;
        }
        .social-icons a:hover {
          scale: 1.3;
          border: 1px solid #000;
        }
        .toggle-container {
          position: absolute;
          top: 0;
          left: 50%;
          width: 50%;
          height: 100%;
          overflow: hidden;
          transition: all 0.6s ease-in-out;
          border-radius: 150px 0 0 100px;
          z-index: 1000;
        }
        .container.active .toggle-container {
          transform: translateX(-100%);
          border-radius: 0 150px 100px 0;
        }
        .toggle {
          background: linear-gradient(to right, #5c6bc0, #512da8);
          color: #fff;
          position: relative;
          left: -100%;
          height: 100%;
          width: 200%;
          transform: translateX(0);
          transition: all 0.6s ease-in-out;
        }
        .container.active .toggle {
          transform: translateX(50%);
        }
        .toggle-panel {
          position: absolute;
          width: 50%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 0 30px;
          text-align: center;
          top: 0;
          transform: translateX(0);
          transition: all 0.6s ease-in-out;
        }
        .toggle-left {
          transform: translateX(-200%);
        }
        .container.active .toggle-left {
          transform: translateX(0);
        }
        .toggle-right {
          right: 0;
          transform: translateX(0);
        }
        .container.active .toggle-right {
          transform: translateX(200%);
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
