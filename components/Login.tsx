import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import Logo from './Logo';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!supabase) throw new Error('Supabase client not initialized. Check your environment variables.');
      
      // Supabase still expects the credential to be passed as 'email' internally 
      // when using the standard signInWithPassword, but we can treat it as a unique username 
      // by appending a fixed domain if necessary, or depending on how you configure Auth.
      // If you are natively supporting usernames in Supabase config, you might need a custom RPC
      // or to store email = username@yourdomain.com. For this example, we'll append a generic domain
      // so it works cleanly with standard Supabase Auth if users are registered that way.
      // Example: "admin" -> "admin@pharmacore.local"
      
      const formattedEmail = username.includes('@') ? username : `${username}@pharmacore.local`;

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formattedEmail,
        password,
      });

      if (signInError) throw signInError;

      if (data.session) {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center py-6 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Or{' '}
          <a href="mailto:hello@365health.online" className="font-medium text-primary hover:text-primary/80">
            contact support for an account
          </a>
        </p>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-800 py-6 px-4 sm:py-8 sm:px-10 shadow-xl shadow-primary/5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <form className="space-y-4 sm:space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Username
              </label>
              <div className="mt-1 relative">
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none block w-full px-3 py-3 sm:py-3.5 border border-slate-300 dark:border-slate-600 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary text-sm sm:text-base bg-white dark:bg-slate-900 dark:text-white transition-colors pl-10"
                  placeholder="pharmacy_admin"
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  person
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-3 sm:py-3.5 border border-slate-300 dark:border-slate-600 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary text-sm sm:text-base bg-white dark:bg-slate-900 dark:text-white transition-colors pl-10"
                  placeholder="••••••••"
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  lock
                </span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-3 sm:p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-red-500 text-sm sm:text-base">error</span>
                  </div>
                  <div className="ml-2 sm:ml-3">
                    <p className="text-xs sm:text-sm text-red-700 dark:text-red-400">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 sm:py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm sm:text-base font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-sm sm:text-base">refresh</span>
                    Signing in...
                  </div>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
