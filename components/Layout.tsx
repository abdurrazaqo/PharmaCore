
import React, { useState, useEffect } from 'react';
import { Page } from '../types';
import Logo from './Logo';

interface LayoutProps {
  children: React.ReactNode;
  activePage: Page;
  onNavigate: (page: Page) => void;
  isAiOpen?: boolean;
  onToggleAi?: () => void;
  aiContent?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate, isAiOpen, onToggleAi, aiContent }) => {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('theme');
    if (saved) {
      return saved === 'dark';
    }
    // Fall back to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // Apply theme and save to localStorage
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a preference
      if (!localStorage.getItem('theme')) {
        setIsDark(e.matches);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const navItems = [
    { id: Page.DASHBOARD, label: 'Dashboard', icon: 'dashboard', shortLabel: 'Home' },
    { id: Page.POS, label: 'Sales / POS', icon: 'point_of_sale', shortLabel: 'POS' },
    { id: Page.INVENTORY, label: 'Inventory', icon: 'inventory_2', shortLabel: 'Stock' },
    { id: Page.CUSTOMERS, label: 'Patients', icon: 'group', shortLabel: 'Patients' },
    { id: Page.REPORTS, label: 'Reports', icon: 'bar_chart', shortLabel: 'Reports' },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Desktop Sidebar - Hidden on Mobile */}
      <aside className="hidden lg:flex w-64 bg-white dark:bg-surface-dark border-r border-slate-200 dark:border-slate-800 flex-col shrink-0">
        <div className="p-6">
          <Logo size="md" />
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          <p className="px-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Main Menu</p>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activePage === item.id 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl">
            <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">account_circle</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate dark:text-white">Pharm. Abdurrazaq O.</p>
              <p className="text-[10px] text-slate-500 truncate">Administrator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Mobile Header */}
        <header className="h-14 lg:h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-dark flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
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
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Main Pharmacy</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Terminal #01</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            {/* Theme Toggle */}
            <button 
              onClick={() => setIsDark(!isDark)}
              className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <div className="relative w-12 h-6 bg-slate-200 dark:bg-slate-700 rounded-full transition-colors">
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white dark:bg-slate-900 rounded-full shadow-md transition-transform duration-300 flex items-center justify-center ${
                  isDark ? 'translate-x-6' : 'translate-x-0'
                }`}>
                  <span className="material-symbols-outlined text-xs text-slate-600 dark:text-yellow-400">
                    {isDark ? 'dark_mode' : 'light_mode'}
                  </span>
                </div>
              </div>
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
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Sign Out"
              >
                <span className="material-symbols-outlined text-xl lg:text-2xl">logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content with bottom padding for mobile nav */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-16 lg:pb-0">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-surface-dark border-t border-slate-200 dark:border-slate-800 z-40 safe-area-bottom">
        <div className="flex items-center justify-around h-16" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] transition-all ${
                activePage === item.id 
                  ? 'text-primary' 
                  : 'text-slate-400 dark:text-slate-500'
              }`}
              style={{ minHeight: '44px' }}
            >
              <span className={`material-symbols-outlined text-2xl ${activePage === item.id ? 'font-bold' : ''}`}>
                {item.icon}
              </span>
              <span className="text-[10px] font-medium leading-none">{item.shortLabel}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile Hamburger Menu */}
      {isMenuOpen && (
        <>
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="lg:hidden fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-surface-dark z-50 animate-in slide-in-from-left duration-300 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="p-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <Logo size="md" />
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* Terminal Info */}
              <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Main Pharmacy</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Terminal #01</p>
              </div>

              {/* Help & Support */}
              <a 
                href="mailto:hello@365health.online"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all mb-4"
              >
                <span className="material-symbols-outlined">help</span>
                <span className="font-medium text-sm">Help & Support</span>
              </a>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              {/* User Profile - Moved here before Sign Out */}
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl">
                <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-2xl">account_circle</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-semibold truncate dark:text-white">Pharm. Abdurrazaq O.</p>
                  <p className="text-xs text-slate-500 truncate">Administrator</p>
                </div>
              </div>

              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all font-medium">
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
    </div>
  );
};

export default Layout;
