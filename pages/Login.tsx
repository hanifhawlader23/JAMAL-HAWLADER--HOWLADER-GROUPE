
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loginWithBiometrics } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(username, password);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
  };

  const handleBiometricLogin = async () => {
    setError('');
    const result = await loginWithBiometrics();
    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
  };

  const EyeIcon = ({ closed }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      {closed ? (
        <>
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
        </>
      ) : (
        <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.523l8.367 8.367zm1.414-1.414L6.523 5.11A6 6 0 0114.89 13.477zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
      )}
    </svg>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--page-bg)] p-4">
      <div className="max-w-md w-full bg-[var(--component-bg)] p-8 rounded-2xl shadow-2xl shadow-black/30">
        <h2 className="text-4xl font-bold text-center text-[var(--text-accent)] mb-2 font-stylish tracking-widest">HAWLDER</h2>
        <p className="text-center text-[var(--text-secondary)] mb-8">Welcome! Login to your account</p>
        {error && <p className="bg-red-500/20 text-red-300 p-3 rounded-md mb-4 text-center text-sm">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[var(--text-secondary)] text-sm font-bold mb-2" htmlFor="username">
              Email
            </label>
            <input
              id="username"
              type="email"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="shadow-inner appearance-none border rounded-lg w-full py-3 px-4 leading-tight focus:outline-none focus:ring-2"
              placeholder="name@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-[var(--text-secondary)] text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="shadow-inner appearance-none border rounded-lg w-full py-3 px-4 leading-tight focus:outline-none focus:ring-2"
                placeholder="********"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <EyeIcon closed={showPassword} />
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="w-full btn-3d primary"
          >
            Login
          </button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-[var(--border-color)]"></div>
          <span className="flex-shrink mx-4 text-xs text-[var(--text-secondary)]">OR</span>
          <div className="flex-grow border-t border-[var(--border-color)]"></div>
        </div>

        <button
          onClick={handleBiometricLogin}
          className="w-full btn-3d secondary flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
             <path d="M5.5 13.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zM6 10a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1zM6 13a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1zM10 15a1 1 0 01-1-1h.01a1 1 0 110-2H9a1 1 0 110-2h1.01a1 1 0 110 2H10a1 1 0 01-1 1zM14 10a1 1 0 01-1-1h.01a1 1 0 110-2H13a1 1 0 110-2h1.01a1 1 0 110 2H14a1 1 0 01-1 1z" clipRule="evenodd" />
          </svg>
          Login with Biometrics
        </button>

         <div className="mt-6 text-center text-sm">
            <Link to="/forgot-password" className="font-medium text-[var(--rose-gold-base)] hover:text-[var(--soft-blush)]">
                Forgot Password?
            </Link>
        </div>
        <div className="mt-4 text-center text-sm">
            <p className="text-[var(--text-primary)]">
                Don't have an account?{' '}
                <Link to="/signup" className="font-medium text-[var(--rose-gold-base)] hover:text-[var(--soft-blush)]">
                    Sign Up
                </Link>
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
