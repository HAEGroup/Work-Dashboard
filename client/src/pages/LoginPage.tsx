import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, Info } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import api from '../services/api';

type View = 'login' | 'register' | 'forgot';

export default function LoginPage() {
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [smtpMissing, setSmtpMissing] = useState(false);
  const { login, register } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (view === 'register') {
        await register({ email, password, firstName, lastName });
        navigate('/');
      } else {
        await login(email, password);
        navigate('/');
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'An error occurred';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSmtpMissing(false);
    setLoading(true);

    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      if (data.message === 'smtpNotConfigured') {
        setSmtpMissing(true);
      } else {
        setForgotSent(true);
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'An error occurred';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function switchView(next: View) {
    setView(next);
    setError('');
    setForgotSent(false);
    setSmtpMissing(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary-600">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Work Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {view === 'register' ? 'Create your account' : view === 'forgot' ? 'Reset your password' : 'Sign in to your account'}
          </p>
        </div>

        <div className="card">
          <div className="card-body">
            {/* ====== FORGOT PASSWORD VIEW ====== */}
            {view === 'forgot' ? (
              forgotSent ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-green-50 dark:bg-green-900/30 p-4 text-sm text-green-700 dark:text-green-300">
                    <p className="font-medium">Check your email</p>
                    <p className="mt-1">If an account exists with <span className="font-medium">{email}</span>, we've sent a password reset link. Check your inbox and spam folder.</p>
                  </div>
                  <button
                    onClick={() => switchView('login')}
                    className="btn-secondary w-full"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {error && (
                    <div className="rounded-lg bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-300">{error}</div>
                  )}

                  {smtpMissing && (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-900/30 p-4 text-sm text-amber-700 dark:text-amber-300">
                      <p className="font-medium">Email not configured</p>
                      <p className="mt-1">Password reset emails are not set up yet. Please contact your administrator to reset your password, or sign in with the default account:</p>
                      <p className="mt-2 font-mono text-xs bg-amber-100 dark:bg-amber-900/50 rounded p-2">
                        Email: admin@example.com<br />
                        Password: admin123
                      </p>
                    </div>
                  )}

                  {!smtpMissing && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Enter your email address and we'll send you a link to reset your password.
                    </p>
                  )}

                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      className="input"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoFocus
                    />
                  </div>

                  {!smtpMissing && (
                    <button type="submit" className="btn-primary w-full" disabled={loading}>
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => switchView('login')}
                    className="btn-ghost w-full"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Sign In
                  </button>
                </form>
              )
            ) : (
              /* ====== LOGIN / REGISTER VIEW ====== */
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-300">
                    {error}
                    {error === 'Authentication required' && (
                      <p className="mt-2 text-xs">Only admins can create new accounts. Sign in with an admin account first, or use the default credentials if this is a fresh install.</p>
                    )}
                  </div>
                )}

                {view === 'register' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">First Name</label>
                      <input
                        type="text"
                        className="input"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Last Name</label>
                      <input
                        type="text"
                        className="input"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="label">Password</label>
                  <input
                    type="password"
                    className="input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={view === 'register' ? 'Min 8 characters' : ''}
                    required
                    minLength={view === 'register' ? 8 : undefined}
                  />
                </div>

                {view === 'login' && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => switchView('forgot')}
                      className="text-sm font-medium text-primary-600 hover:text-primary-700"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Please wait...' : (view === 'register' ? 'Create Account' : 'Sign In')}
                </button>
              </form>
            )}
          </div>
        </div>

        {view !== 'forgot' && (
          <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            {view === 'register' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => switchView(view === 'register' ? 'login' : 'register')}
              className="font-medium text-primary-600 hover:text-primary-700"
            >
              {view === 'register' ? 'Sign in' : 'Create one'}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
