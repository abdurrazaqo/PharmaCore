// pages/DemoPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Page } from '../types';
import Logo from '../components/Logo';

const DemoPage: React.FC = () => {
  const { profile, user, logout } = useAuth();
  const navigate = useNavigate();
  const [loadingMsg, setLoadingMsg] = useState('Checking environment...');
  const [error, setError] = useState<string | null>(null);

  const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL || '365demo@365health.online';
  const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || 'DemoPharm2026!';

  useEffect(() => {
    handleDemoFlow();
  }, [profile, user]);

  const handleDemoFlow = async () => {
    try {
      // 1. Check if completely not logged in yet (or context is initializing)
      if (user === null) {
        setLoadingMsg('Initializing demo sandbox...');
        console.log('DEBUG: Attempting login with:', { email: DEMO_EMAIL, pass: DEMO_PASSWORD });
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
        });
        if (signInErr) throw signInErr;
        // Context will automatically update profile and re-trigger effect.
        return;
      }

      // 2. User exists. Are they already the demo user?
      if (profile) {
        if (profile.tenant?.is_demo === true || user.email === DEMO_EMAIL) {
          navigate(`/${Page.DASHBOARD}`);
          return;
        } else {
          // 3. Logged in as real user. Kick them out implicitly.
          setLoadingMsg('Switching sessions securely...');
          await logout();
          // The effect will re-run when user becomes null, falling into branch #1.
        }
      }
    } catch (err: any) {
      console.error('Demo authentication error:', err);
      setError(err?.message || 'Demo environment is temporarily unavailable.');
    }
  };

  if (error) {
    return (
       <div className="min-h-screen bg-[#F0F4F4] flex items-center justify-center p-4">
         <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
           <div className="size-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
             <span className="material-symbols-outlined text-3xl">error</span>
           </div>
           <h2 className="text-2xl font-black text-slate-800 mb-2">{error}</h2>
           <p className="text-slate-500 mb-8">Please try again in a few minutes or contact hello@365health.online.</p>
           <button 
             onClick={() => { setError(null); handleDemoFlow(); }}
             className="w-full bg-[#006C75] text-white font-bold py-4 rounded-xl hover:bg-[#005a62] transition-colors"
           >
             Retry Connection
           </button>
         </div>
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F4F4] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-12 max-w-md w-full shadow-2xl flex flex-col items-center">
         <div className="mb-10 scale-125">
            <Logo size="lg" />
         </div>
         
         <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-6">
            <div className="h-full bg-[#006C75] rounded-full animate-pulse transition-all duration-1000 w-[60%] loading-bar"></div>
         </div>
         <p className="font-bold text-slate-500 animate-pulse">{loadingMsg}</p>

         <style>{`
           .loading-bar {
             animation: fill-bar 3s infinite ease-in-out;
           }
           @keyframes fill-bar {
             0% { width: 0%; transform: translateX(-100%); }
             50% { width: 100%; transform: translateX(0%); }
             100% { width: 100%; transform: translateX(100%); }
           }
         `}</style>
      </div>
    </div>
  );
};

export default DemoPage;
