import React, { useState, useEffect } from 'react';
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
    role: UserRole.STAFF,
    is_suspended: false
  });

  useEffect(() => {
    if (hasPermission(Permission.USERS_VIEW)) {
      loadUsers();
    }
  }, []);

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setAlertConfig({ title, message, type });
    setShowAlertModal(true);
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
        const { error } = await supabase!
          .from('users')
          .delete()
          .eq('id', confirmAction.userId);

        if (error) throw error;

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
    } catch (error) {
      console.error('Error performing action:', error);
      showAlert('Error', 'Failed to perform action', 'error');
    } finally {
      setShowConfirmModal(false);
      setConfirmAction(null);
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
      case UserRole.STAFF:
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
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold dark:text-white">User Management</h2>
          <p className="text-sm text-slate-500">View users and their permissions</p>
        </div>
        {hasPermission(Permission.USERS_CREATE) && (
          <button
            onClick={() => setShowAddUserModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            Add User
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600">
              <span className="material-symbols-outlined">store</span>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Branches</p>
          <h3 className="text-2xl font-bold mt-1">
            {new Set(users.map(u => u.branch_id).filter(Boolean)).size}
          </h3>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600">
              <span className="material-symbols-outlined">group</span>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Users</p>
          <h3 className="text-2xl font-bold mt-1">{users.length}</h3>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
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

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
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
              <span className="font-bold">{users.filter((u: any) => u.role === UserRole.STAFF).length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-3 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</th>
                <th className="px-2 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Role</th>
                <th className="px-2 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-2 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Last Login</th>
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
                        <div className="size-7 lg:size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] lg:text-xs font-bold flex-shrink-0">
                          {(user.display_name || 'U')[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900 dark:text-white text-xs lg:text-base truncate">
                          {user.display_name || 'Unnamed User'}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 lg:px-6 py-3 lg:py-4">
                      <span className={`inline-flex items-center px-1.5 lg:px-2.5 py-0.5 rounded-full text-[9px] lg:text-xs font-medium capitalize whitespace-nowrap ${getRoleBadgeColor(user.role)}`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-2 lg:px-6 py-3 lg:py-4">
                      <span className={`inline-flex items-center px-1.5 lg:px-2.5 py-0.5 rounded-full text-[9px] lg:text-xs font-medium whitespace-nowrap ${
                        user.is_suspended === true
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {user.is_suspended === true ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="px-2 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      }) : 'Never'}
                    </td>
                    <td className="px-2 lg:px-6 py-3 lg:py-4 text-right">
                      <div className="flex justify-end gap-0.5 lg:gap-1">
                        {hasPermission(Permission.USERS_EDIT) && (
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-1 text-slate-400 hover:text-primary transition-colors"
                            title="Edit User"
                          >
                            <span className="material-symbols-outlined text-base lg:text-lg">edit</span>
                          </button>
                        )}
                        {hasPermission(Permission.USERS_EDIT) && user.id !== profile?.id && (
                          <button
                            onClick={() => handleSuspendUser(user.id, user.is_suspended === true)}
                            className={`p-1 transition-colors ${
                              user.is_suspended === true
                                ? 'text-slate-400 hover:text-green-500' 
                                : 'text-slate-400 hover:text-orange-500'
                            }`}
                            title={user.is_suspended === true ? 'Unsuspend User' : 'Suspend User'}
                          >
                            <span className="material-symbols-outlined text-base lg:text-lg">
                              {user.is_suspended === true ? 'check_circle' : 'block'}
                            </span>
                          </button>
                        )}
                        {hasPermission(Permission.USERS_DELETE) && user.id !== profile?.id && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Delete User"
                          >
                            <span className="material-symbols-outlined text-base lg:text-lg">delete</span>
                          </button>
                        )}
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
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined">info</span>
          Role Permissions Reference
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-bold text-purple-700 dark:text-purple-400 mb-2">SUPERADMIN</h4>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400">
              <li>✓ Full system access</li>
              <li>✓ Manage all tenants</li>
              <li>✓ Manage all users</li>
              <li>✓ All permissions</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-blue-700 dark:text-blue-400 mb-2">TENANT_ADMIN</h4>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400">
              <li>✓ Full tenant access</li>
              <li>✓ Manage inventory</li>
              <li>✓ Process refunds</li>
              <li>✓ Manage users</li>
              <li>✓ Export reports</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-green-700 dark:text-green-400 mb-2">STAFF</h4>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400">
              <li>✓ View inventory</li>
              <li>✓ Add products</li>
              <li>✓ Create sales</li>
              <li>✓ View reports</li>
              <li>✗ No delete access</li>
              <li>✗ No user management</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Info Box for User Creation */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined">info</span>
          How to Create New Users
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          To create new users, use the SQL query in the Supabase Dashboard:
        </p>
        <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-decimal list-inside">
          <li>Go to your Supabase Dashboard SQL Editor</li>
          <li>Use the <code className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">create-test-user.sql</code> file as a template</li>
          <li>Modify the email, password, and role as needed</li>
          <li>Run the query to create the user</li>
        </ol>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="modal-overlay bg-black/50 flex items-center justify-center p-4">
          <div className="modal-content bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-bold dark:text-white">Add New User</h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Follow these steps to manually create a new user in Supabase:
              </p>

              {/* Step 1 */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">
                      Create User in Supabase Authentication
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      Go to your Supabase Dashboard → Authentication → Users → Add User
                    </p>
                    <a
                      href="https://supabase.com/dashboard/project/_/auth/users"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">open_in_new</span>
                      Open Supabase Dashboard
                    </a>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">
                      Copy the User ID
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      After creating the user, copy their User ID (UUID) from the Authentication page.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">
                      Link User Profile with SQL
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      Go to SQL Editor and run this query (replace the values):
                    </p>
                    <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                      <pre className="text-xs text-slate-300 font-mono">
{`INSERT INTO public.users (
  id,
  tenant_id,
  branch_id,
  role,
  display_name
) VALUES (
  '<USER_ID_FROM_STEP_2>',
  '${profile?.tenant_id || '<TENANT_ID>'}',
  '<BRANCH_ID_OR_NULL>',
  'staff',  -- or 'tenant_admin'
  'User Display Name'
);`}
                      </pre>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      Note: For tenant_admin role, set branch_id to NULL. For staff, provide a valid branch_id.
                    </p>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">info</span>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    <p className="font-medium text-blue-900 dark:text-blue-300 mb-1">Available Roles:</p>
                    <ul className="space-y-1 ml-4 list-disc">
                      <li><code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">staff</code> - Basic access to POS and inventory</li>
                      <li><code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">tenant_admin</code> - Full access to tenant features</li>
                      <li><code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">superadmin</code> - System-wide access (use with caution)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowAddUserModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && selectedUser && (
        <div className="modal-overlay bg-black/50 flex items-center justify-center p-4">
          <div className="modal-content bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-bold dark:text-white">Edit User</h3>
              <button
                onClick={() => setShowEditUserModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editFormData.display_name}
                  onChange={(e) => setEditFormData({ ...editFormData, display_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter display name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Role
                </label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as UserRole })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value={UserRole.STAFF}>Staff</option>
                  <option value={UserRole.TENANT_ADMIN}>Tenant Admin</option>
                  {profile?.role === UserRole.SUPERADMIN && (
                    <option value={UserRole.SUPERADMIN}>Superadmin</option>
                  )}
                </select>
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <input
                  type="checkbox"
                  id="is_suspended"
                  checked={editFormData.is_suspended}
                  onChange={(e) => setEditFormData({ ...editFormData, is_suspended: e.target.checked })}
                  className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                />
                <label htmlFor="is_suspended" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Suspend this user
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowEditUserModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUser}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && confirmAction && (
        <div className="modal-overlay bg-black/50 flex items-center justify-center p-4">
          <div className="modal-content bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${
                  confirmAction.type === 'delete' 
                    ? 'bg-red-100 dark:bg-red-900/30' 
                    : 'bg-orange-100 dark:bg-orange-900/30'
                }`}>
                  <span className={`material-symbols-outlined text-2xl ${
                    confirmAction.type === 'delete' 
                      ? 'text-red-600 dark:text-red-400' 
                      : 'text-orange-600 dark:text-orange-400'
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
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {confirmAction.type === 'delete' 
                      ? 'This action cannot be undone' 
                      : 'You can reverse this action later'}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <p className="text-slate-600 dark:text-slate-400">
                {confirmAction.type === 'delete' 
                  ? 'Are you sure you want to delete this user? All their data will be permanently removed from the system.' 
                  : confirmAction.currentStatus
                    ? 'Are you sure you want to unsuspend this user? They will regain access to the system.'
                    : 'Are you sure you want to suspend this user? They will not be able to log in until unsuspended.'}
              </p>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmAction}
                className={`px-4 py-2 rounded-lg transition-colors text-white ${
                  confirmAction.type === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : confirmAction.currentStatus
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {confirmAction.type === 'delete' 
                  ? 'Delete User' 
                  : confirmAction.currentStatus ? 'Unsuspend' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
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
