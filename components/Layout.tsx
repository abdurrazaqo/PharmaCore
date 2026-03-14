import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth, Permission } from '../contexts/AuthContext';
import { Page } from '../types';
import Logo from './Logo';
import ChangePasswordModal from './ChangePasswordModal';

interface LayoutProps {
  isAiOpen?: boolean;
  onToggleAi?: () => void;
  aiContent?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ isAiOpen, onToggleAi, aiContent }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, profile, hasPermission } = useAuth();
  
  // Debug logging
  useEffect(() => {
    console.log('🎨 Layout - Profile data:', profile);
    console.log('🎨 Layout - Display name:', profile?.display_name);
    console.log('🎨 Layout - Branch:', profile?.branch);
    console.log('🎨 Layout - Tenant:', profile?.tenant);
    console.log('🎨 Layout - Role:', profile?.role);
  }, [profile]);
  
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('theme');
    if (saved) {
      return saved === 'dark';
    }
    // Fall back to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('themeMode') as 'light' | 'dark' | 'system') || 'system';
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const mainContentRef = React.useRef<HTMLDivElement>(null);

  // Extract active page from current URL
  const activePage = location.pathname.split('/')[1] as Page || Page.DASHBOARD;

  // Keyboard arrow navigation for scrolling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle arrow keys on desktop (not mobile)
      if (window.innerWidth < 1024) return;
      
      // Don't interfere if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const scrollAmount = 100; // pixels to scroll
      const mainContent = mainContentRef.current;
      
      if (!mainContent) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        mainContent.scrollBy({ top: scrollAmount, behavior: 'smooth' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        mainContent.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    // Apply theme based on mode
    let shouldBeDark = isDark;
    
    if (themeMode === 'system') {
      shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      shouldBeDark = themeMode === 'dark';
    }
    
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    setIsDark(shouldBeDark);
  }, [themeMode]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if in system mode
      if (themeMode === 'system') {
        setIsDark(e.matches);
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  const cycleTheme = () => {
    const modes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = modes.indexOf(themeMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setThemeMode(nextMode);
    localStorage.setItem('themeMode', nextMode);
  };

  const navItems = [
    { id: Page.DASHBOARD, label: 'Dashboard', icon: 'dashboard', shortLabel: 'Home' },
    { id: Page.POS, label: 'Sales / POS', icon: 'point_of_sale', shortLabel: 'POS' },
    { id: Page.INVENTORY, label: 'Inventory', icon: 'inventory_2', shortLabel: 'Stock' },
    { id: Page.CUSTOMERS, label: 'Patients', icon: 'group', shortLabel: 'Patients' },
    { id: Page.REPORTS, label: 'Reports', icon: 'bar_chart', shortLabel: 'Reports' },
    ...(hasPermission(Permission.USERS_VIEW) ? [
      { id: 'users', label: 'User Management', icon: 'manage_accounts', shortLabel: 'Users' }
    ] : []),
  ];

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Desktop Sidebar - Hidden on Mobile */}
      <aside className="hidden lg:flex w-56 bg-white dark:bg-surface-dark border-r border-slate-200 dark:border-slate-800 flex-col shrink-0">
        <div className="p-5">
          <Logo size="md" />
        </div>

        <nav className="flex-1 px-3 space-y-1.5 mt-2 overflow-y-auto">
          <p className="px-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Main Menu</p>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate('/' + item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all ${
                (activePage === item.id || location.pathname === '/' + item.id)
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 mt-auto border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/30 p-2.5 rounded-lg">
            <div className="size-9 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-xl">account_circle</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold truncate dark:text-white">
                {profile?.display_name || 'User'}
              </p>
              <p className="text-[9px] text-slate-500 truncate capitalize">
                {profile?.role?.replace('_', ' ') || 'Staff'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Mobile Header */}
        <header className="h-14 lg:h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-dark flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            
            {/* Logo - Mobile */}
            <div className="lg:hidden">
              <Logo size="sm" />
            </div>

            {/* Terminal Info - Desktop */}
            <div className="hidden lg:flex items-center gap-3">
              <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined">store</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {profile?.tenant?.name || 'Main Pharmacy'}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  {profile?.branch?.name || 'Terminal #01'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            {/* Theme Toggle */}
            <button 
              onClick={cycleTheme}
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title={themeMode === 'system' ? 'Theme: System' : themeMode === 'dark' ? 'Theme: Dark' : 'Theme: Light'}
            >
              <span className="material-symbols-outlined text-xl lg:text-2xl">
                {themeMode === 'system' ? 'brightness_auto' : themeMode === 'dark' ? 'dark_mode' : 'light_mode'}
              </span>
            </button>
            {onToggleAi && (
              <button 
                onClick={onToggleAi}
                className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative"
                title="AI Assistant"
              >
                <span className="material-symbols-outlined text-xl lg:text-2xl">auto_awesome</span>
                {isAiOpen && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
                )}
              </button>
            )}
            <div className="hidden lg:block h-6 w-px bg-slate-200 dark:bg-slate-800"></div>
            <div className="hidden lg:flex items-center gap-2">
              <a
                href="mailto:hello@365health.online"
                className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Help & Support"
              >
                <span className="material-symbols-outlined text-xl lg:text-2xl">help</span>
              </a>
              <button 
                onClick={() => setIsChangePasswordOpen(true)}
                className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Change Password"
              >
                <span className="material-symbols-outlined text-xl lg:text-2xl">lock_reset</span>
              </button>
              <button 
                onClick={logout}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Sign Out"
              >
                <span className="material-symbols-outlined text-xl lg:text-2xl">logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content - with bottom padding on mobile for bottom nav */}
        <div ref={mainContentRef} className="flex-1 overflow-y-auto overflow-x-hidden pb-16 lg:pb-0">
          <Outlet />
        </div>
      </main>

      {/* Mobile Hamburger Menu */}
      {isMenuOpen && (
        <>
          <div 
            className="menu-overlay lg:hidden bg-black/50 animate-in fade-in duration-200"
            onClick={() => setIsMenuOpen(false)}
          />
          <div 
            className="menu-drawer lg:hidden w-80 max-w-[85vw] bg-white dark:bg-surface-dark animate-in slide-in-from-left duration-300 shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined">store</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {profile?.tenant?.name || 'Main Pharmacy'}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    {profile?.branch?.name || 'Terminal #01'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 pb-24">
              {/* Main Menu Items */}
              <p className="px-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Main Menu</p>
              <div className="space-y-2 mb-4">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigate('/' + item.id);
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      (activePage === item.id || location.pathname === '/' + item.id)
                        ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="material-symbols-outlined">{item.icon}</span>
                    <span className="font-medium text-sm">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Help & Support */}
              <a 
                href="mailto:hello@365health.online"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all mb-6"
              >
                <span className="material-symbols-outlined">help</span>
                <span className="font-medium text-sm">Help & Support</span>
              </a>

              {/* User Profile */}
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl mb-3">
                <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-2xl">account_circle</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-semibold truncate dark:text-white">
                    {profile?.display_name || 'User'}
                  </p>
                  <p className="text-xs text-slate-500 truncate capitalize">
                    {profile?.role?.replace('_', ' ') || 'Staff'}
                  </p>
                </div>
              </div>

              {/* Change Password Button */}
              <button 
                onClick={() => {
                  setIsChangePasswordOpen(true);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-medium mb-3"
              >
                <span className="material-symbols-outlined">lock_reset</span>
                <span>Change Password</span>
              </button>

              {/* Sign Out Button */}
              <button 
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all font-medium"
              >
                <span className="material-symbols-outlined">logout</span>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* AI Assistant - Full Screen on Mobile, Sidebar on Desktop */}
      {isAiOpen && aiContent && (
        <div className="fixed inset-0 lg:top-16 lg:right-0 lg:left-auto lg:w-96 lg:h-[calc(100vh-4rem)] bg-white dark:bg-surface-dark lg:border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 lg:z-40 animate-in slide-in-from-right duration-300">
          {aiContent}
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 w-full bg-white dark:bg-surface-dark border-t border-slate-200 dark:border-slate-800 flex justify-between items-center px-6 py-2 pb-safe z-40 shadow-[0_-5px_15px_-10px_rgba(0,0,0,0.1)]">
        {[
          { id: Page.DASHBOARD, icon: 'dashboard', label: 'Home' },
          { id: Page.POS, icon: 'point_of_sale', label: 'POS' },
          { id: Page.INVENTORY, icon: 'inventory_2', label: 'Stock' },
        ].map((item) => {
          const isActive = activePage === item.id || location.pathname === '/' + item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate('/' + item.id)}
              className={`flex flex-col items-center justify-center gap-1 min-w-[64px] transition-colors p-1 rounded-lg ${
                isActive 
                  ? 'text-primary' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <div className={`flex items-center justify-center w-12 h-8 rounded-full transition-all ${isActive ? 'bg-primary/10' : 'bg-transparent'}`}>
                <span className={`material-symbols-outlined ${isActive ? 'filled font-bold' : ''}`}>
                  {item.icon}
                </span>
              </div>
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;
