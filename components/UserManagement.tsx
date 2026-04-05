import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth, Permission } from '../contexts/AuthContext';
import { UserRole, UserProfile } from '../types';
import { supabase } from '../services/supabaseClient';
import AlertModal from './AlertModal';

const UserManagement: React.FC = () => {
  const { hasPermission, profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '', type: 'info' as 'success' | 'error' | 'info' | 'warning' });
  const [confirmAction, setConfirmAction] = useState<{ type: 'suspend' | 'delete', userId: string, currentStatus?: boolean } | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    display_name: '',
    role: UserRole.CASHIER,
    is_suspended: false
  });

  const [branches, setBranches] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    password: '',
    display_name: '',
    role: UserRole.CASHIER,
    branch_id: ''
  });

  useEffect(() => {
    if (hasPermission(Permission.USERS_VIEW)) {
      loadUsers();
      loadBranches();
    }
  }, []);

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setAlertConfig({ title, message, type });
    setShowAlertModal(true);
  };

  const loadBranches = async () => {
    try {
      if (!profile?.tenant_id) return;
      const { data, error } = await supabase!.from('branches').select('*').eq('tenant_id', profile.tenant_id);
      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Load users based on role
      let query = supabase!.from('users').select('*');
      
      // Tenant admins can only see users in their tenant
      if (profile?.role === UserRole.TENANT_ADMIN) {
        query = query.eq('tenant_id', profile.tenant_id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      showAlert('Error', 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!hasPermission(Permission.USERS_DELETE)) {
      showAlert('Permission Denied', 'You do not have permission to delete users.', 'error');
      return;
    }

    setConfirmAction({ type: 'delete', userId });
    setShowConfirmModal(true);
  };

  const handleSuspendUser = async (userId: string, currentStatus: boolean) => {
    if (!hasPermission(Permission.USERS_EDIT)) {
      showAlert('Permission Denied', 'You do not have permission to suspend users.', 'error');
      return;
    }

    setConfirmAction({ type: 'suspend', userId, currentStatus });
    setShowConfirmModal(true);
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;

    try {
      if (confirmAction.type === 'delete') {
        const { data, error } = await supabase!.functions.invoke('delete-user', {
          body: { user_id: confirmAction.userId }
        });

        if (error || data?.error) throw error || new Error(data?.error);

        setUsers(users.filter(u => u.id !== confirmAction.userId));
        showAlert('Success', 'User deleted successfully', 'success');
      } else if (confirmAction.type === 'suspend') {
        const { error } = await supabase!
          .from('users')
          .update({ is_suspended: !confirmAction.currentStatus })
          .eq('id', confirmAction.userId);

        if (error) throw error;

        setUsers(users.map(u => 
          u.id === confirmAction.userId ? { ...u, is_suspended: !confirmAction.currentStatus } : u
        ));
        const action = confirmAction.currentStatus ? 'unsuspended' : 'suspended';
        showAlert('Success', `User ${action} successfully`, 'success');
      }
    } catch (error: any) {
      console.error('Error performing action:', error);
      let errorMessage = 'Failed to perform action';
      
      if (error.context) {
         try {
           const body = await error.context.json();
           errorMessage = body.error || body.message || errorMessage;
         } catch (e) {
           errorMessage = error.message || errorMessage;
         }
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      showAlert('Error', errorMessage, 'error');
    } finally {
      setShowConfirmModal(false);
      setConfirmAction(null);
    }
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    
    try {
      setIsSubmitting(true);
      
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session) {
        showAlert('Session Expired', 'Please sign in again to continue.', 'error');
        setIsSubmitting(false);
        return;
      }

      const payload = {
        ...newUserForm,
        tenant_id: profile.tenant_id,
        branch_id: newUserForm.branch_id || (profile.role === UserRole.BRANCH_ADMIN ? profile.branch_id : null)
      };

      const { data, error } = await supabase!.functions.invoke('create-user', {
        body: payload
      });

      if (error || data?.error) throw error || new Error(data?.error);

      showAlert('Success', 'User created successfully', 'success');
      setShowAddUserModal(false);
      setNewUserForm({ email: '', password: '', display_name: '', role: UserRole.CASHIER, branch_id: '' });
      loadUsers(); 
    } catch (error: any) {
      console.error('Error creating user:', error);
      let errorMessage = 'Failed to create user';
      
      if (error.context) {
         try {
           const body = await error.context.json();
           errorMessage = body.error || body.message || errorMessage;
         } catch (e) {
           errorMessage = error.message || errorMessage;
         }
      } else {
        errorMessage = error.message || errorMessage;
      }

      showAlert('Error', errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setEditFormData({
      display_name: user.display_name || '',
      role: user.role,
      is_suspended: user.is_suspended || false
    });
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase!
        .from('users')
        .update({
          display_name: editFormData.display_name,
          role: editFormData.role,
          is_suspended: editFormData.is_suspended
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Update local state
      setUsers(users.map(u => 
        u.id === selectedUser.id 
          ? { ...u, display_name: editFormData.display_name, role: editFormData.role, is_suspended: editFormData.is_suspended }
          : u
      ));

      setShowEditUserModal(false);
      setSelectedUser(null);
      showAlert('Success', 'User updated successfully', 'success');
    } catch (error) {
      console.error('Error updating user:', error);
      showAlert('Error', 'Failed to update user', 'error');
    }
  };



  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPERADMIN:
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case UserRole.TENANT_ADMIN:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case UserRole.BRANCH_ADMIN:
      case UserRole.PHARMACIST:
      case UserRole.PHARMACY_TECHNICIAN:
      case UserRole.CASHIER:
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  if (!hasPermission(Permission.USERS_VIEW)) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <span className="material-symbols-outlined text-red-500 text-4xl mb-2">lock</span>
          <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">Access Denied</h3>
          <p className="text-sm text-red-600 dark:text-red-400">
            You do not have permission to view user management.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 relative min-h-screen">
      <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold dark:text-white">User Management</h2>
          <p className="text-xs lg:text-sm text-slate-500">View users and their permissions</p>
        </div>
        {hasPermission(Permission.USERS_CREATE) && (
          <button
            onClick={() => setShowAddUserModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 w-full sm:w-auto"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            <span className="font-semibold text-sm">Add User</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-surface-dark p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600">
              <span className="material-symbols-outlined">store</span>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Branches</p>
          <h3 className="text-2xl font-bold mt-1">
            {branches.length}
          </h3>
        </div>

        <div className="bg-white dark:bg-surface-dark p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600">
              <span className="material-symbols-outlined">group</span>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Users</p>
          <h3 className="text-2xl font-bold mt-1">{users.length}</h3>
        </div>

        <div className="bg-white dark:bg-surface-dark p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Active Users</p>
          <h3 className="text-2xl font-bold mt-1">
            {users.filter((u: any) => {
              if (!u.last_sign_in_at) return false;
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              return new Date(u.last_sign_in_at) > thirtyDaysAgo;
            }).length || 0}
          </h3>
        </div>

        <div className="bg-white dark:bg-surface-dark p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600">
              <span className="material-symbols-outlined">pie_chart</span>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Users by Role</p>
          <div className="mt-1 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Admin</span>
              <span className="font-bold">{users.filter((u: any) => u.role === UserRole.TENANT_ADMIN || u.role === UserRole.SUPERADMIN).length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Staff</span>
              <span className="font-bold">{users.filter((u: any) => [UserRole.BRANCH_ADMIN, UserRole.PHARMACIST, UserRole.PHARMACY_TECHNICIAN, UserRole.CASHIER].includes(u.role)).length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse min-w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-3 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</th>
                <th className="px-2 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Role</th>
                <th className="px-2 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden sm:table-cell">Status</th>
                <th className="px-2 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden md:table-cell">Last Login</th>
                <th className="px-2 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 lg:px-6 py-8 text-center text-slate-500">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 lg:px-6 py-8 text-center text-slate-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-3 lg:px-6 py-3 lg:py-4">
                      <div className="flex items-center gap-2">
                        <div className="relative shrink-0">
                          <div className="size-7 lg:size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] lg:text-xs font-bold">
                            {(user.display_name || 'U')[0].toUpperCase()}
                          </div>
                          {/* Status dot on mobile */}
                          <div className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white dark:border-surface-dark sm:hidden ${
                            user.is_suspended === true ? 'bg-red-500' : 'bg-green-500'
                          }`} />
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white text-xs lg:text-base break-words max-w-[100px] lg:max-w-none">
                          {user.display_name || 'Unnamed User'}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 lg:px-6 py-3 lg:py-4">
                      <span className={`inline-flex items-center px-1.5 lg:px-2.5 py-0.5 rounded-full text-[9px] lg:text-xs font-medium capitalize whitespace-nowrap ${getRoleBadgeColor(user.role)}`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-2 lg:px-6 py-3 lg:py-4 hidden sm:table-cell">
                      <span className={`inline-flex items-center px-1.5 lg:px-2.5 py-0.5 rounded-full text-[9px] lg:text-xs font-medium whitespace-nowrap ${
                        user.is_suspended === true
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {user.is_suspended === true ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="px-2 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap hidden md:table-cell">
                      {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      }) : 'Never'}
                    </td>
                    <td className="px-2 lg:px-6 py-3 lg:py-4 text-right">
                      <div className="relative group/menu inline-block">
                        <button className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-400 hover:text-primary shadow-sm hover:shadow-md">
                          <span className="material-symbols-outlined text-xl">more_vert</span>
                        </button>
                        <div className="absolute right-0 top-full pt-1 invisible group-hover/menu:visible opacity-0 group-hover/menu:opacity-100 transition-all z-[30]">
                          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-1.5 w-48 overflow-hidden">
                            {hasPermission(Permission.USERS_EDIT) && (
                              <button
                                onClick={() => handleEditUser(user)}
                                className="w-full text-left px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors"
                              >
                                <span className="material-symbols-outlined text-lg opacity-60">edit</span> Edit User
                              </button>
                            )}
                            {hasPermission(Permission.USERS_EDIT) && user.id !== profile?.id && (
                              <button
                                onClick={() => handleSuspendUser(user.id, user.is_suspended === true)}
                                className={`w-full text-left px-4 py-2 text-sm font-semibold flex items-center gap-3 transition-colors ${
                                  user.is_suspended === true
                                    ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' 
                                    : 'text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                                }`}
                              >
                                <span className="material-symbols-outlined text-lg opacity-80">
                                  {user.is_suspended === true ? 'check_circle' : 'block'}
                                </span>
                                {user.is_suspended === true ? 'Unsuspend' : 'Suspend user'}
                              </button>
                            )}
                            {hasPermission(Permission.USERS_DELETE) && user.id !== profile?.id && (
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="w-full text-left px-4 py-2 text-sm font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-3 transition-colors border-t border-slate-50 dark:border-slate-700 mt-1"
                              >
                                <span className="material-symbols-outlined text-lg">delete</span> Delete User
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permission Reference */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mt-8 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-dark flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
            <span className="material-symbols-outlined">shield_person</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            Role Permissions Reference
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200 dark:bg-slate-800">
          
          {/* Tenant Admin */}
          <div className="bg-white dark:bg-surface-dark p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase">
                Tenant Admin
              </span>
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3 text-slate-600 dark:text-slate-400 font-medium">
                <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>
                Full organization access
              </li>
              <li className="flex gap-3 text-slate-600 dark:text-slate-400 font-medium">
                <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>
                Manage all branches & settings
              </li>
              <li className="flex gap-3 text-slate-600 dark:text-slate-400 font-medium">
                <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>
                Add and manage user accounts
              </li>
              <li className="flex gap-3 text-slate-600 dark:text-slate-400 font-medium">
                <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>
                Export advanced financial reports
              </li>
            </ul>
          </div>
          
          {/* Branch Admin */}
          <div className="bg-white dark:bg-surface-dark p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase">
                Branch Admin
              </span>
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3 text-slate-600 dark:text-slate-400 font-medium">
                <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>
                Full access to assigned branch
              </li>
              <li className="flex gap-3 text-slate-600 dark:text-slate-400 font-medium">
                <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>
                Manage branch inventory
              </li>
              <li className="flex gap-3 text-slate-600 dark:text-slate-400 font-medium">
                <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>
                Process refunds & manage staff
              </li>
              <li className="flex gap-3 text-slate-400 dark:text-slate-600">
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-[18px]">cancel</span>
                Cannot cross-view other branches
              </li>
            </ul>
          </div>

          {/* Core Staff */}
          <div className="bg-white dark:bg-surface-dark p-6 md:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase">
                Core Staff
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">(Cashiers, Techs, Pharmacists)</span>
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3 text-slate-600 dark:text-slate-400 font-medium">
                <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>
                Standard POS operations
              </li>
              <li className="flex gap-3 text-slate-600 dark:text-slate-400 font-medium">
                <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>
                View inventory (Pharmacists can add)
              </li>
              <li className="flex gap-3 text-slate-400 dark:text-slate-600">
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-[18px]">cancel</span>
                Cannot delete records
              </li>
              <li className="flex gap-3 text-slate-400 dark:text-slate-600">
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-[18px]">cancel</span>
                Cannot access management panels
              </li>
            </ul>
          </div>
          
        </div>
      </div>

      </div>

      {/* Add User Modal */}
      {showAddUserModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Sticky Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h3 className="text-xl font-bold dark:text-white">Add New User</h3>
              <button 
                onClick={() => setShowAddUserModal(false)} 
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            {/* Scrollable Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                  <input 
                    required 
                    type="email" 
                    value={newUserForm.email} 
                    onChange={e => setNewUserForm({...newUserForm, email: e.target.value})} 
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                    placeholder="user@example.com" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Password</label>
                  <input 
                    required 
                    type="password" 
                    value={newUserForm.password} 
                    onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} 
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                    placeholder="Minimum 6 characters" 
                    minLength={6} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Display Name</label>
                  <input 
                    required 
                    type="text" 
                    value={newUserForm.display_name} 
                    onChange={e => setNewUserForm({...newUserForm, display_name: e.target.value})} 
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                    placeholder="Full Name" 
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">User Role</label>
                    <select 
                      required 
                      value={newUserForm.role} 
                      onChange={e => setNewUserForm({...newUserForm, role: e.target.value as UserRole})} 
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                    >
                      <option value={UserRole.CASHIER}>Cashier</option>
                      <option value={UserRole.PHARMACY_TECHNICIAN}>Pharmacy Technician</option>
                      <option value={UserRole.PHARMACIST}>Pharmacist</option>
                      {profile?.role === UserRole.TENANT_ADMIN && <option value={UserRole.BRANCH_ADMIN}>Branch Admin</option>}
                      {profile?.role === UserRole.TENANT_ADMIN && <option value={UserRole.TENANT_ADMIN}>Tenant Admin</option>}
                    </select>
                  </div>
                  {newUserForm.role !== UserRole.TENANT_ADMIN && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Branch</label>
                      <select 
                        required={newUserForm.role !== UserRole.TENANT_ADMIN && profile?.role === UserRole.TENANT_ADMIN} 
                        value={newUserForm.branch_id} 
                        onChange={e => setNewUserForm({...newUserForm, branch_id: e.target.value})} 
                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                      >
                        <option value="">Select branch</option>
                        {branches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Sticky Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3 shrink-0">
              <button 
                type="button" 
                onClick={() => setShowAddUserModal(false)} 
                className="flex-1 px-4 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                onClick={handleAddUserSubmit}
                disabled={isSubmitting} 
                className="flex-[2] px-4 py-3.5 text-white bg-primary hover:bg-primary/90 font-bold rounded-2xl transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit User Modal */}
      {showEditUserModal && selectedUser && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-bold dark:text-white">Edit User</h3>
              <button
                onClick={() => setShowEditUserModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editFormData.display_name}
                  onChange={(e) => setEditFormData({ ...editFormData, display_name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="Enter display name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Role
                </label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as UserRole })}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                >
                  <option value={UserRole.CASHIER}>Cashier</option>
                  <option value={UserRole.PHARMACY_TECHNICIAN}>Pharmacy Technician</option>
                  <option value={UserRole.PHARMACIST}>Pharmacist</option>
                  <option value={UserRole.BRANCH_ADMIN}>Branch Admin</option>
                  <option value={UserRole.TENANT_ADMIN}>Tenant Admin</option>
                  {profile?.role === UserRole.SUPERADMIN && (
                    <option value={UserRole.SUPERADMIN}>Superadmin</option>
                  )}
                </select>
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                <input
                  type="checkbox"
                  id="is_suspended"
                  checked={editFormData.is_suspended}
                  onChange={(e) => setEditFormData({ ...editFormData, is_suspended: e.target.checked })}
                  className="w-5 h-5 text-primary border-slate-300 rounded-lg focus:ring-primary"
                />
                <label htmlFor="is_suspended" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Suspend this user
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowEditUserModal(false)}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUser}
                className="flex-[2] px-4 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl transition-all shadow-lg shadow-primary/20"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && confirmAction && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl shrink-0 ${
                  confirmAction.type === 'delete' 
                    ? 'bg-rose-100 dark:bg-rose-900/30' 
                    : 'bg-amber-100 dark:bg-amber-900/30'
                }`}>
                  <span className={`material-symbols-outlined text-2xl ${
                    confirmAction.type === 'delete' 
                      ? 'text-rose-600 dark:text-rose-400' 
                      : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {confirmAction.type === 'delete' ? 'delete' : 'block'}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold dark:text-white">
                    {confirmAction.type === 'delete' 
                      ? 'Delete User' 
                      : confirmAction.currentStatus ? 'Unsuspend User' : 'Suspend User'}
                  </h3>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                    {confirmAction.type === 'delete' 
                      ? 'Permanent Action' 
                      : 'Reversible Action'}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {confirmAction.type === 'delete' 
                  ? 'Are you sure you want to delete this user? This will permanently remove their access and all associated data from the platform.' 
                  : confirmAction.currentStatus
                    ? 'Are you sure you want to unsuspend this user? They will immediately regain access to their account and branch data.'
                    : 'Are you sure you want to suspend this user? They will be signed out and unable to log in until an administrator unsuspends them.'}
              </p>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                }}
                className="flex-1 px-4 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmAction}
                className={`flex-[2] px-4 py-3.5 rounded-2xl transition-all text-white font-bold shadow-lg ${
                  confirmAction.type === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : confirmAction.currentStatus
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                }`}
              >
                {confirmAction.type === 'delete' 
                  ? 'Confirm Delete' 
                  : confirmAction.currentStatus ? 'Confirm Unsuspend' : 'Confirm Suspend'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />
    </div>
  );
};

export default UserManagement;
