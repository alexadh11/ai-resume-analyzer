// auth.tsx
import React, { useState, useEffect } from 'react';
import { useSupabaseStore } from '~/lib/supabase';
import { supabase } from '~/lib/supabase';
import { useLocation, useNavigate } from 'react-router';

export const meta = () => ([
  { title: 'Resumate | Auth' },
  { name: 'description', content: 'Log into your account' },
]);

const Auth = () => {
  const user = useSupabaseStore((state) => state.user);
  const isLoading = useSupabaseStore((state) => state.isLoading);
  const signOut = useSupabaseStore((state) => state.signOut);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const next = searchParams.get('next');
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [buttonState, setButtonState] = useState<'idle' | 'sending' | 'sent' | 'processing' | 'success'>('idle');
  const [logoutState, setLogoutState] = useState<'idle' | 'processing' | 'success'>('idle');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(10);
  const [showCountdown, setShowCountdown] = useState(false);

  useEffect(() => {
    // Redirect if user is already logged in (but allow them to see the page to logout)
    if (user && !location.pathname.includes('/auth')) {
      navigate(next || '/');
    }
  }, [user, next, navigate, location]);

  // Handle magic link callback (when user clicks the link from email)
  useEffect(() => {
    const handleAuthCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');

      if (type === 'magiclink' && accessToken) {
        setButtonState('processing');
        setMessage('');
        setShowCountdown(true);
        setCountdown(10);

        // 10 second countdown
        const countdownInterval = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        // Wait for 10 seconds
        await new Promise(resolve => setTimeout(resolve, 10000));

        setShowCountdown(false);
        setButtonState('success');

        // Wait 2 seconds showing "Logged in successfully"
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Navigate to upload page
        navigate('/upload');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  // Magic link login
  const handleMagicLinkLogin = async () => {
    if (!email.trim()) {
      setMessage('Please enter your email');
      return;
    }

    setButtonState('sending');
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) throw error;

      setButtonState('sent');
      setMessage('Login link sent to email. Please check your inbox.');
    } catch (err: any) {
      console.error('Magic link error:', err);
      setMessage(err.message || 'Failed to send magic link');
      setButtonState('idle');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    setLogoutState('processing');
    setMessage('Logging out of the account');

    try {
      await signOut();

      // Wait 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));

      setLogoutState('success');

      // Reset after a moment
      setTimeout(() => {
        setLogoutState('idle');
        setMessage('');
      }, 1000);
    } catch (err: any) {
      console.error('Logout error:', err);
      setMessage('Failed to log out');
      setLogoutState('idle');
    }
  };

  // Button text logic for login
  const getLoginButtonText = () => {
    switch (buttonState) {
      case 'sending':
        return 'Logging in......';
      case 'sent':
        return 'Logging in......';
      case 'processing':
        return 'Logging in......';
      case 'success':
        return 'Logged in successfully';
      default:
        return 'Log in with link';
    }
  };

  // Button text logic for logout
  const getLogoutButtonText = () => {
    switch (logoutState) {
      case 'processing':
        return 'Logging out....';
      case 'success':
        return 'Logged out successfully';
      default:
        return 'Log out';
    }
  };

  // Button disabled logic
  const isLoginButtonDisabled = buttonState !== 'idle' || !email.trim();
  const isLogoutButtonDisabled = logoutState !== 'idle';

  // Button color logic
  const getLoginButtonClass = () => {
    if (buttonState === 'idle' && email.trim()) {
      return 'auth-button bg-blue-600 hover:bg-blue-700';
    }
    return 'auth-button bg-gray-400 cursor-not-allowed';
  };

  const getLogoutButtonClass = () => {
    if (logoutState === 'idle') {
      return 'auth-button bg-blue-600 hover:bg-blue-700';
    }
    return 'auth-button bg-gray-400 cursor-not-allowed';
  };

  return (
    <main className="bg-[url('/images/bg-auth.svg')] bg-cover min-h-screen flex items-center justify-center">
      <div className="gradient-border shadow-lg">
        <section className="flex flex-col gap-8 bg-white rounded-2xl p-10 min-w-[400px]">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1>Welcome</h1>
            <h2>Log In To Continue Your Job Journey</h2>
          </div>

          <div className="flex flex-col gap-4">
            {user ? (
              <>
                <button
                  className={getLogoutButtonClass()}
                  onClick={handleLogout}
                  disabled={isLogoutButtonDisabled}
                >
                  <p>{getLogoutButtonText()}</p>
                </button>
                {logoutState === 'idle' && (
                  <p className="text-sm text-gray-600 mt-2 text-center">
                    You are logged in. You can now upload your resume.
                  </p>
                )}
              </>
            ) : (
              <>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={buttonState !== 'idle'}
                />
                <button
                  className={getLoginButtonClass()}
                  onClick={handleMagicLinkLogin}
                  disabled={isLoginButtonDisabled}
                >
                  <p>{getLoginButtonText()}</p>
                </button>

                {buttonState === 'sent' && (
                  <p className="text-sm text-green-600 mt-2 text-center">
                    Login link sent to email. Please check your inbox.
                  </p>
                )}

                {showCountdown && (
                  <div className="flex flex-col items-center gap-2 mt-2">
                    <p className="text-sm text-gray-600 text-center">Login in process</p>
                    <img
                      src="https://i.gifer.com/ZKZg.gif"
                      alt="Loading"
                      className="w-8 h-8"
                    />
                    <p className="text-xs text-gray-500">Please wait {countdown} seconds...</p>
                  </div>
                )}
              </>
            )}

            {message && buttonState !== 'sent' && logoutState === 'idle' && (
              <p className="text-sm text-gray-600 mt-2 text-center">{message}</p>
            )}

            {logoutState === 'processing' && (
              <p className="text-sm text-gray-600 mt-2 text-center">
                Logging out of the account
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default Auth;