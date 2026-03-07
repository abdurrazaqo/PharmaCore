import React, { useState, useEffect } from 'react';
import { useAuth, Permission } from '../contexts/AuthContext';
import { UserRole, UserProfile } from '../types';
import { supabase } from '../services/supabaseClient';

const UserManagement: React.FC = () => {
  const { hasPermission, profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  useEffect(() => {
    if (hasPermission(Permission.USERS_VIEW)) {
      loadUsers();
    }
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Load users based on role
      let query = supabase!.from('users').select('*');
      
      // Tenant admins can only see users in their tenant
      if (profile?.role === UserRole.TENANT_ADMIN) {
        query = query.eq('tenant_id', profile.tenant_id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!hasPermission(Permission.USERS_DELETE)) {
      alert('You do not have permission to delete users.');
      return;
    }

    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase!
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.filter(u => u.id !== userId));
      alert('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600">
              <span className="material-symbols-outlined">admin_panel_settings</span>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Admins</p>
          <h3 className="text-2xl font-bold mt-1">
            {users.filter(u => u.role === UserRole.TENANT_ADMIN || u.role === UserRole.SUPERADMIN).length}
          </h3>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600">
              <span className="material-symbols-outlined">badge</span>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Staff</p>
          <h3 className="text-2xl font-bold mt-1">
            {users.filter(u => u.role === UserRole.STAFF).length}
          </h3>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">User ID</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Role</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tenant ID</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Branch ID</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {user.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleBadgeColor(user.role)}`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {user.tenant_id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {user.branch_id ? `${user.branch_id.substring(0, 8)}...` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {hasPermission(Permission.USERS_EDIT) && (
                          <button
                            className="p-1 text-slate-400 hover:text-primary transition-colors"
                            title="Edit User"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                        )}
                        {hasPermission(Permission.USERS_DELETE) && user.id !== profile?.id && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Delete User"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
    </div>
  );
};

export default UserManagement;
