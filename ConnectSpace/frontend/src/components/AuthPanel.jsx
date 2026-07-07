import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../pages/Auth.css';

const NAME_REGEX = /^[a-zA-Z\s]{2,30}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const modeConfig = {
  login: {
    title: 'Sign in to ConnectSpace',
    subtitle: 'Enter your credentials and step into the future workspace.',
    submitLabel: 'Sign In',
    toggleLabel: "Don’t have an account?",
    toggleAction: 'Create account',
  },
  register: {
    title: 'Create your ConnectSpace account',
    subtitle: 'Join the room with video, Forge, Focus Hub and Echo in one place.',
    submitLabel: 'Create Account',
    toggleLabel: 'Already have an account?',
    toggleAction: 'Sign In',
  },
};

export default function AuthPanel({ initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ name: false, email: false, password: false, confirmPassword: false });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const validateName = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Please enter a valid name (letters only)';
    if (!NAME_REGEX.test(trimmed)) return 'Please enter a valid name (letters only)';
    return '';
  };

  const validateEmail = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Please enter a valid email address';
    if (!EMAIL_REGEX.test(trimmed)) return 'Please enter a valid email address';
    return '';
  };

  const validatePassword = (value) => {
    if (!value) return 'Password must meet all requirements';
    if (value.length < 8) return 'Password must meet all requirements';
    if (!/[A-Z]/.test(value)) return 'Password must meet all requirements';
    if (!/[a-z]/.test(value)) return 'Password must meet all requirements';
    if (!/[0-9]/.test(value)) return 'Password must meet all requirements';
    if (!/[!@#$%^&*]/.test(value)) return 'Password must meet all requirements';
    return '';
  };

  const validateConfirmPassword = (value) => {
    if (!value) return '';
    if (value !== password) return 'Passwords do not match';
    return '';
  };

  const nameError = mode === 'register' ? validateName(name) : '';
  const emailError = validateEmail(email);
  const passwordError = mode === 'register' ? validatePassword(password) : password.trim() ? '' : 'Please enter your password';
  const confirmPasswordError = mode === 'register' && confirmPassword.length > 0 ? validateConfirmPassword(confirmPassword) : '';

  const passwordChecks = useMemo(() => [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One special character', met: /[!@#$%^&*]/.test(password) },
  ], [password]);

  const isNameValid = mode === 'register' ? !validateName(name) : true;
  const isEmailValid = !validateEmail(email);
  const isPasswordValid = mode === 'register' ? !validatePassword(password) : password.trim().length > 0;
  const isConfirmValid = mode === 'register' ? confirmPassword.length === 0 || !validateConfirmPassword(confirmPassword) : true;
  const isFormValid = mode === 'register'
    ? isNameValid && isEmailValid && isPasswordValid && isConfirmValid
    : isEmailValid && isPasswordValid;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitAttempted(true);
    setTouched({ name: true, email: true, password: true, confirmPassword: true });

    if (!isFormValid) {
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(name.trim(), email.trim(), password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message || (mode === 'login' ? 'Unable to sign in.' : 'Unable to create account.'));
    } finally {
      setLoading(false);
    }
  }

  function toggleMode() {
    setError('');
    setSubmitAttempted(false);
    setTouched({ name: false, email: false, password: false, confirmPassword: false });
    setMode((current) => (current === 'login' ? 'register' : 'login'));
  }

  const { title, subtitle, submitLabel, toggleLabel, toggleAction } = modeConfig[mode];
  const showNameError = (touched.name || submitAttempted) && mode === 'register' && nameError;
  const showEmailError = (touched.email || submitAttempted) && emailError;
  const showPasswordError = (touched.password || submitAttempted) && passwordError;
  const showConfirmPasswordError = (touched.confirmPassword || submitAttempted) && mode === 'register' && confirmPasswordError;

  return (
    <div className="auth-page">
      <div className="auth-backdrop" />
      <div className="auth-grid-overlay" />
      <div className="auth-card">
        <div className="auth-brand">
          <div className="orbit-logo">
            <span className="orbit-core" />
            <span className="orbit-dot" />
          </div>
          <div>
            <div className="brand-name">ConnectSpace</div>
            <div className="brand-tag">Premium collaboration for modern teams</div>
          </div>
        </div>

        <div className="auth-copy">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="input-group">
              <label className={`input-label ${showNameError ? 'invalid' : name ? 'valid' : ''}`}>
                <span className="input-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5z" />
                    <path d="M4 22c0-4.4 3.6-8 8-8s8 3.6 8 8" />
                  </svg>
                </span>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setTouched((current) => ({ ...current, name: true }))}
                  placeholder="Full name"
                  required={mode === 'register'}
                  autoComplete="name"
                />
              </label>
              {showNameError && <p className="field-error">Please enter a valid name (letters only)</p>}
            </div>
          )}

          <div className="input-group">
            <label className={`input-label ${showEmailError ? 'invalid' : email ? 'valid' : ''}`}>
              <span className="input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16v16H4z" />
                  <path d="M4 8l8 6 8-6" />
                </svg>
              </span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((current) => ({ ...current, email: true }))}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </label>
            {showEmailError && <p className="field-error">Please enter a valid email address</p>}
          </div>

          <div className="input-group">
            <label className={`input-label ${showPasswordError ? 'invalid' : password ? 'valid' : ''}`}>
              <span className="input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
              </span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                placeholder={mode === 'login' ? '••••••••' : 'Create a strong password'}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </label>
            {mode === 'register' && (
              <div className="password-checklist" aria-live="polite">
                {passwordChecks.map((item) => (
                  <div key={item.label} className={`password-check ${item.met ? 'met' : ''}`}>
                    <span className="password-check-icon">{item.met ? '✓' : '✕'}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            )}
            {showPasswordError && <p className="field-error">{mode === 'register' ? 'Password must meet all requirements' : 'Please enter your password'}</p>}
          </div>

          {mode === 'register' && (
            <div className="input-group">
              <label className={`input-label confirm-label ${showConfirmPasswordError ? 'invalid' : confirmPassword && !validateConfirmPassword(confirmPassword) ? 'valid' : ''}`}>
                <span className="input-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setTouched((current) => ({ ...current, confirmPassword: true }))}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                />
                {confirmPassword && !validateConfirmPassword(confirmPassword) && (
                  <span className="confirm-check" aria-hidden="true">✓</span>
                )}
              </label>
              {showConfirmPasswordError && <p className="field-error">Passwords do not match</p>}
            </div>
          )}

          {error && <p className="auth-error-banner">{error}</p>}

          <button className={`auth-submit ${isFormValid ? 'ready' : ''}`} type="submit" disabled={loading || !isFormValid}>
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Processing…' : submitLabel}
          </button>
        </form>

        <div className="auth-footer">
          <span>{toggleLabel}</span>
          <button type="button" className="auth-toggle" onClick={toggleMode}>
            {toggleAction}
          </button>
        </div>
      </div>

      <div className="auth-features">
        <span>Video</span>
        <span>Forge</span>
        <span>Focus Hub</span>
        <span>Whiteboard</span>
        <span>Echo</span>
      </div>
    </div>
  );
}
