import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabaseClient';
import Logo from '../Logo';

const SuperadminLayout: React.FC = () => {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    fetchPendingCount();
    // Set up real-time subscription for onboarding requests
    const channel = supabase
      .channel('onboarding-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'onboarding_requests' }, () => {
        fetchPendingCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendingCount = async () => {
    const { count } = await supabase
      .from('onboarding_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    setPendingCount(count || 0);
  };

  const navItems = [
    { label: 'Overview', path: '/superadmin', icon: 'dashboard' },
    { label: 'Pending Approvals', path: '/superadmin/pending', icon: 'pending_actions', badge: pendingCount },
    { label: 'All Pharmacies', path: '/superadmin/pharmacies', icon: 'domain' },
    { label: 'Beta Tenants', path: '/superadmin/beta-tenants', icon: 'stars' },
    { label: 'Access Codes', path: '/superadmin/access-codes', icon: 'confirmation_number' },
    { label: 'Audit Logs', path: '/superadmin/audit-logs', icon: 'history' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#006C75] text-white">
      <div className="p-6">
        <div className="flex flex-col items-center gap-2 group">
          <Logo size="lg" className="brightness-0 invert drop-shadow-2xl transition-transform group-hover:scale-105 duration-500" />
          <div className="text-center mt-2">
            <p className="text-[10px] uppercase tracking-[0.3em] font-black text-teal-200/80 leading-none">Platform Control</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/superadmin'}
            onClick={() => setIsMenuOpen(false)}
            className={({ isActive }) => `
              flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group
              ${isActive ? 'bg-white/20 text-white shadow-lg' : 'text-teal-50 hover:bg-white/10 hover:text-white'}
            `}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl opacity-90">{item.icon}</span>
              <span className="font-semibold text-sm tracking-wide">{item.label}</span>
            </div>
            {item.badge ? (
              <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-lg min-w-[20px] text-center shadow-sm">
                {item.badge}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>

      <div className="p-6">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-teal-100 hover:bg-black/10 hover:border-white/20 hover:text-white transition-all duration-300 shadow-lg group/logout relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-red-500 opacity-0 group-hover/logout:opacity-10 transition-opacity"></div>
          <span className="material-symbols-outlined text-xl transition-transform group-hover/logout:-translate-x-1 group-hover/logout:text-red-300">logout</span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#F0F4F4] font-inter">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col shrink-0 shadow-2xl z-20">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden h-20 bg-[#006C75] text-white flex items-center justify-between px-6 shrink-0 shadow-lg border-b border-white/5 sticky top-0 z-30 backdrop-blur-md bg-[#006C75]/95">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2.5 -ml-2 hover:bg-white/10 rounded-xl transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
          <Logo size="sm" className="brightness-0 invert scale-90" />
          <div className="h-4 w-[1px] bg-white/20 mx-1"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-200">Platform Control</p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shadow-inner">
          <span className="material-symbols-outlined text-base opacity-70">person</span>
        </div>
      </header>

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity lg:hidden"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] z-50 transform transition-transform duration-300 lg:hidden shadow-2xl">
            <SidebarContent />
            <button
              onClick={() => setIsMenuOpen(false)}
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="hidden lg:flex h-20 bg-white border-b border-slate-200 px-8 items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <h2 className="font-bold text-slate-800 text-lg uppercase tracking-widest">
              {navItems.find(item => location.pathname === item.path || (item.path !== '/superadmin' && location.pathname.startsWith(item.path)))?.label || 'Super Admin'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900">{profile?.display_name || 'Administrator'}</p>
              <p className="text-[10px] font-bold text-[#006C75] uppercase tracking-tighter">Authorized Session</p>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center border-2 border-slate-50 overflow-hidden">
              <span className="material-symbols-outlined text-slate-400">person</span>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </section>
      </main>
    </div>
  );
};

export default SuperadminLayout;
