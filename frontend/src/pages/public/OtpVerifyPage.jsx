import { useState } from 'react';
import { useAuth } from '../../utils/AuthProvider';
import api from '../../utils/api';
import { useLocation, useNavigate } from 'react-router-dom';
import PageTitle from '../../components/PageTitle';

const OtpVerifyPage = ({ title = 'Otpverify' }) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || localStorage.getItem('pendingOtpEmail') || '';
  const jwtToken = location.state?.jwtToken || localStorage.getItem('activationToken') || '';

  const handleChange = (e) => {
    setOtp(e.target.value);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!email) {
        setError('Signup session expired. Please sign up again.');
        setLoading(false);
        return;
      }

      if (otp.length !== 6) {
        setError('OTP must be 6 digits');
        setLoading(false);
        return;
      }

      // Call backend to verify OTP
      const res = await api.post('/api/auth/verify-otp', {
        email,
        otp,
        jwtToken
      });
      const data = res.data;

      localStorage.removeItem('pendingOtpEmail');
      localStorage.removeItem('activationToken');

      localStorage.setItem('token', data.authToken || data.token);
      localStorage.setItem('user', JSON.stringify({ email: data.email, id: data.userId, username: data.username, role: data.role }));
      login({ email: data.email, id: data.userId, username: data.username, role: data.role });

      const roleRoutes = {
        ADMIN: '/admin',
        TRAINER: '/trainer',
        CLIENT: '/client',
      };

      navigate(roleRoutes[data.role] || '/login', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid OTP. Please try again.');
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (!email) {
      setError('Signup session expired. Please sign up again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/api/auth/resend-otp', { email });
      const data = res.data;
      const nextActivationToken = data.activationToken || data.jwtToken || data.token || '';

      if (nextActivationToken) {
        localStorage.setItem('activationToken', nextActivationToken);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to resend OTP. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(to right, #e2e2e2, #c9d6ff)' }}>
      <PageTitle title={title} />
      <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 5px 15px rgba(0,0,0,0.15)', padding: 32, minWidth: 320, maxWidth: '90vw', textAlign: 'center' }}>
        <h2 style={{ color: '#512da8', marginBottom: 16 }}>Verify OTP</h2>
        <p style={{ fontSize: 14, color: '#333', marginBottom: 24 }}>
          Enter the 6-digit code sent to <b>{email || 'your email'}</b>
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            type="text"
            maxLength={6}
            value={otp}
            onChange={handleChange}
            placeholder="Enter OTP"
            style={{
              padding: '10px 15px',
              fontSize: 16,
              borderRadius: 8,
              border: '1px solid #ccc',
              outline: 'none',
              textAlign: 'center',
              letterSpacing: 6,
            }}
            autoFocus
          />
          {error && <div style={{ color: 'red', fontSize: 13 }}>{error}</div>}
          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: '#512da8',
              color: '#fff',
              fontWeight: 600,
              border: 'none',
              borderRadius: 8,
              padding: '10px 0',
              fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 8,
            }}
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>
        <div style={{ marginTop: 18, fontSize: 13 }}>
          Didn't receive the code?{' '}
          <button
            type="button"
            onClick={handleResend}
            style={{ color: '#512da8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            disabled={loading}
          >
            Resend OTP
          </button>
        </div>
      </div>
    </div>
  );
};

export default OtpVerifyPage;
