
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './ToastContainer';
import { useTenantGuard } from '../hooks/useTenantGuard';
import ReadOnlyBadge from './ReadOnlyBadge';

const BranchManagement: React.FC = () => {
  const { profile, isTenantAdmin, isSuperAdmin } = useAuth();
  const { showToast } = useToast();
  const tenantGuard = useTenantGuard();
  
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBranchData, setNewBranchData] = useState({ name: '', location: '', phone: '' });
  const [isSaving, setIsSaving] = useState(false);

  const canAddBranch = () => {
    const plan = profile?.tenant?.plan || 'basic';
    if (plan === 'basic') return branches.length < 1;
    if (plan === 'pro') return branches.length < 3;
    return true; // Enterprise/Demo
  };

  useEffect(() => {
    fetchBranches();
  }, [profile?.tenant?.id]);

  const fetchBranches = async () => {
    if (!profile?.tenant?.id) return;
    try {
      setLoading(true);
      if (!supabase) throw new Error('Database not configured');
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('tenant_id', profile.tenant.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setBranches(data || []);
    } catch (error: any) {
      console.error('Error fetching branches:', error);
      showToast('Failed to load branches', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch || tenantGuard.isReadOnly) return;

    try {
      setIsSaving(true);
      if (!supabase) throw new Error('Database not configured');
      const { error } = await supabase
        .from('branches')
        .update({
          name: editingBranch.name,
          location: editingBranch.location,
          phone: editingBranch.phone
        })
        .eq('id', editingBranch.id);

      if (error) throw error;

      showToast('Branch details updated successfully', 'success');
      setEditingBranch(null);
      fetchBranches();
    } catch (error: any) {
      console.error('Error updating branch:', error);
      showToast('Failed to update branch', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Branch Management</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage your pharmacy locations and contact details</p>
        </div>
        <div className="flex items-center gap-3">
          {canAddBranch() ? (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all"
            >
              <span className="material-symbols-outlined">add</span>
              Add New Branch
            </button>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border border-amber-100 dark:border-amber-800">
              <span className="material-symbols-outlined text-base">info</span>
              Branch limit reached for {profile?.tenant?.plan || 'basic'} plan
            </div>
          )}
          {tenantGuard.isReadOnly && <ReadOnlyBadge />}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch, index) => (
            <div 
              key={branch.id} 
              className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-all group"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-primary/10 dark:bg-primary/5 size-12 rounded-xl flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-2xl">storefront</span>
                  </div>
                  {index === 0 && (
                    <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Main Branch
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-bold dark:text-white mb-2">{branch.name}</h3>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <span className="material-symbols-outlined text-lg shrink-0">location_on</span>
                    <span className="leading-tight">{branch.location || 'No location set'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <span className="material-symbols-outlined text-lg shrink-0">call</span>
                    <span>{branch.phone || 'No phone set'}</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button 
                    onClick={() => setEditingBranch({ ...branch })}
                    disabled={tenantGuard.isReadOnly}
                    className="text-primary font-bold text-sm hover:underline flex items-center gap-1 disabled:opacity-50 disabled:no-underline"
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                    Edit Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Branch Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-dark rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                setIsSaving(true);
                if (!supabase) throw new Error('Database not configured');
                const { error } = await supabase
                  .from('branches')
                  .insert([{
                    tenant_id: profile!.tenant!.id,
                    name: newBranchData.name,
                    location: newBranchData.location,
                    phone: newBranchData.phone
                  }]);
                if (error) throw error;
                showToast('Branch added successfully!', 'success');
                setIsAddModalOpen(false);
                setNewBranchData({ name: '', location: '', phone: '' });
                fetchBranches();
              } catch (err: any) {
                showToast(err.message, 'error');
              } finally {
                setIsSaving(false);
              }
            }}>
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center text-slate-900 dark:text-white">
                <h2 className="text-xl font-bold">Add New Branch</h2>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Branch Name</label>
                  <input type="text" required value={newBranchData.name} onChange={e => setNewBranchData({...newBranchData, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-4 py-3 dark:text-white" placeholder="e.g., Eastside Branch" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Location</label>
                  <textarea rows={3} value={newBranchData.location} onChange={e => setNewBranchData({...newBranchData, location: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-4 py-3 dark:text-white resize-none" placeholder="Physical address" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Phone</label>
                  <input type="tel" value={newBranchData.phone} onChange={e => setNewBranchData({...newBranchData, phone: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-4 py-3 dark:text-white" placeholder="Contact number" />
                </div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-b-3xl flex gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-4 py-3 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl">Cancel</button>
                <button type="submit" disabled={isSaving} className="flex-1 bg-primary text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-primary/20">{isSaving ? 'Adding...' : 'Add Branch'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingBranch && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-dark rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <form onSubmit={handleUpdateBranch}>
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center text-slate-900 dark:text-white">
                  <h2 className="text-xl font-bold">Edit Branch</h2>
                  <button type="button" onClick={() => setEditingBranch(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Branch Name</label>
                  <input
                    type="text"
                    required
                    value={editingBranch.name}
                    onChange={(e) => setEditingBranch({...editingBranch, name: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                    placeholder="e.g., Downtown Branch"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Location / Address</label>
                  <textarea
                    rows={3}
                    value={editingBranch.location || ''}
                    onChange={(e) => setEditingBranch({...editingBranch, location: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white resize-none"
                    placeholder="Physical address of the branch"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={editingBranch.phone || ''}
                    onChange={(e) => setEditingBranch({...editingBranch, phone: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                    placeholder="Contact number for this branch"
                  />
                </div>
              </div>
              
              <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-b-3xl flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingBranch(null)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchManagement;
