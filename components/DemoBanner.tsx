import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { useToast } from './ToastContainer';

export const DemoBanner: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [isSwitching, setIsSwitching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Fallbacks if mapping fails
  const currentRole = profile?.role || 'tenant_admin';

  const switchRole = async (targetRole: string) => {
    setIsSwitching(true);
    setIsOpen(false);
    try {
      // First, try the Edge Function approach
      const { data, error } = await supabase.functions.invoke('switch-demo-role', {
         body: { role: targetRole }
      });
      
      console.log('Switch role response:', { data, error });
      
      // If Edge Function fails, try direct update (for local development)
      if (error || data?.error) {
        console.warn('Edge Function failed, trying direct update...', error || data?.error);
        
        // Direct update approach (only works if RLS allows it)
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: targetRole })
          .eq('id', profile?.id);
        
        if (updateError) {
          throw new Error(updateError.message || 'Failed to update role');
        }
        
        console.log('Direct role update successful');
      } else if (!data?.success) {
        throw new Error('Role switch failed - no success response');
      }
      
      await refreshProfile();
      showToast(`Switched to ${targetRole.replace('_', ' ')} view.`, 'success');
      
      // Delay slightly for context stabilization then reload
      setTimeout(() => window.location.reload(), 500);
    } catch (err: any) {
      console.error('Switch role catch error:', err);
      const errorMsg = err.message || err.toString() || 'Failed to switch roles';
      showToast(`Role switch failed: ${errorMsg}`, 'error');
      setIsSwitching(false);
    }
  };

  const rolesDict = [
    { id: 'tenant_admin', label: 'Tenant Admin' },
    { id: 'branch_admin', label: 'Branch Admin' },
    { id: 'pharmacist', label: 'Pharmacist' },
    { id: 'cashier', label: 'Cashier' }
  ];

  return (
    <div className="relative w-full bg-[#1a1a2e] text-white px-2 lg:px-4 py-2 border-b-2 border-orange-500 flex flex-col lg:flex-row items-center justify-between gap-2 lg:gap-3 text-sm z-[200]">
      <div className="flex items-center gap-2 lg:gap-3 w-full lg:w-auto overflow-hidden">
        <div className="bg-orange-500/20 border border-orange-500/50 text-orange-400 px-2 lg:px-3 py-1 rounded-full text-[10px] lg:text-xs font-black tracking-widest uppercase flex items-center gap-1 lg:gap-1.5 shrink-0">
          <span className="material-symbols-outlined text-[12px] lg:text-[14px]">science</span>
          DEMO
        </div>
        <p className="font-medium text-slate-300 truncate text-xs lg:text-sm">
          Exploring demo environment
        </p>
      </div>
      
      <div className="flex items-center gap-1.5 lg:gap-3 w-full lg:w-auto shrink-0 justify-end">
        
        {/* Role Switcher */}
        <div className="relative">
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            disabled={isSwitching}
            className="flex items-center gap-1 lg:gap-2 bg-white/10 hover:bg-white/20 px-2 lg:px-4 py-1.5 rounded-lg border border-white/10 font-bold transition-colors disabled:opacity-50 text-[10px] lg:text-sm whitespace-nowrap"
          >
            <span className="hidden sm:inline">{isSwitching ? 'Switching...' : 'Try as Different Role'}</span>
            <span className="sm:hidden">{isSwitching ? 'Switching...' : 'Switch Role'}</span>
            <span className="material-symbols-outlined text-[14px] lg:text-[16px]">{isOpen ? 'expand_less' : 'expand_more'}</span>
          </button>

          {isOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white text-slate-800 rounded-xl shadow-2xl py-2 overflow-hidden border border-slate-200">
              <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-1">
                Currently: {currentRole.replace('_', ' ')}
              </div>
              {rolesDict.map((r) => (
                <button 
                  key={r.id}
                  onClick={() => switchRole(r.id)}
                  disabled={r.id === currentRole}
                  className={`w-full text-left px-4 py-2.5 text-sm font-bold flex justify-between items-center transition-colors ${
                    r.id === currentRole ? 'bg-slate-50 text-slate-400 cursor-default' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="capitalize">{r.label}</span>
                  {r.id === currentRole && <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <a 
          href="https://www.365health.online/products/pharmacore#pricing" 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black px-3 lg:px-5 py-1.5 rounded-lg flex items-center gap-1 lg:gap-2 hover:opacity-90 transition-opacity text-[10px] lg:text-sm whitespace-nowrap"
        >
          <span className="hidden sm:inline">Get Started</span>
          <span className="sm:inline lg:hidden">Start</span>
          <span className="material-symbols-outlined text-[14px] lg:text-[16px]">arrow_forward</span>
        </a>
      </div>
    </div>
  );
};
