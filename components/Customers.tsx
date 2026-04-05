
import React, { useState, useEffect } from 'react';
import AddCustomerModal from './AddCustomerModal';
import EditCustomerModal from './EditCustomerModal';
import CustomerHistoryModal from './CustomerHistoryModal';
import PatientBalanceModal from './PatientBalanceModal';
import { getCustomers, addCustomer, updateCustomer, deleteCustomer } from '../services/database';
import { supabase } from '../services/supabaseClient';
import { useToast } from './ToastContainer';
import { useAuth, Permission } from '../contexts/AuthContext';
import { useTenantGuard } from '../hooks/useTenantGuard';
import ReadOnlyBadge from './ReadOnlyBadge';

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [balanceModalTab, setBalanceModalTab] = useState<'update' | 'history'>('update');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [referenceBalances, setReferenceBalances] = useState<Record<string, number>>({});
  const { showToast } = useToast();
  const { profile, hasPermission } = useAuth();
  const tenantGuard = useTenantGuard();

  const itemsPerPage = 15;

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (paginatedCustomers.length > 0) {
      loadReferenceBalances();
    }
  }, [currentPage, filteredCustomers]);

  const loadReferenceBalances = async () => {
    try {
      const ids = paginatedCustomers.map(c => c.id);
      if (ids.length === 0) return;

      const { data, error } = await supabase!
        .from('balance_history')
        .select('customer_id, new_balance, change_type')
        .in('customer_id', ids)
        .in('change_type', ['add', 'set'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Extract the LATEST add/set for each customer
      const lastAdds: Record<string, number> = {};
      data?.forEach(record => {
        if (!lastAdds[record.customer_id]) {
          lastAdds[record.customer_id] = record.new_balance;
        }
      });

      setReferenceBalances(prev => ({ ...prev, ...lastAdds }));
    } catch (error) {
      console.error('Error loading reference balances:', error);
    }
  };

  const getBalanceColor = (customer: any) => {
    if (customer.balance === 0) return 'text-slate-900 dark:text-white';
    
    const reference = referenceBalances[customer.id];
    // If no record found, we assume the current balance is the reference (Green)
    if (reference === undefined || reference === 0) return 'text-emerald-500';

    const threshold = reference * 0.3;
    return customer.balance < threshold ? 'text-rose-500 font-black' : 'text-emerald-500';
  };

  useEffect(() => {
    // Filter customers based on search term
    if (searchTerm.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
    // Reset to page 1 when search changes
    setCurrentPage(1);
  }, [searchTerm, customers]);

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    if (!profile?.tenant?.id) return;
    try {
      setLoading(true);
      const data = await getCustomers(profile.tenant.id);
      setCustomers(data);
      setFilteredCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
      showToast('Failed to load patients from database. Please check your connection.', 'error');
      setCustomers([]);
      setFilteredCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (newCustomer: any) => {
    if (!hasPermission(Permission.CUSTOMER_ADD) || tenantGuard.isReadOnly) {
      showToast('You do not have permission to add patients.', 'error');
      return;
    }
    try {
      const added = await addCustomer(newCustomer, profile!.tenant!.id);
      setCustomers([...customers, added]);
      showToast('Patient added successfully!', 'success');
    } catch (error) {
      console.error('Error adding customer:', error);
      showToast('Failed to add patient. Please try again.', 'error');
    }
  };

  const handleUpdateCustomer = async (id: string, updates: any) => {
    if (!hasPermission(Permission.CUSTOMER_EDIT) || tenantGuard.isReadOnly) {
      showToast('You do not have permission to edit patients.', 'error');
      return;
    }
    try {
      const updated = await updateCustomer(id, updates, profile!.tenant!.id);
      setCustomers(customers.map(c => c.id === id ? updated : c));
      showToast('Patient updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating customer:', error);
      showToast('Failed to update patient. Please try again.', 'error');
    }
  };

  const handleViewHistory = (customer: any) => {
    setSelectedCustomer(customer);
    setIsHistoryModalOpen(true);
  };

  const handleEditCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setIsEditModalOpen(true);
  };

  const handleDeleteCustomer = async (customer: any) => {
    if (!hasPermission(Permission.CUSTOMER_DELETE) || tenantGuard.isReadOnly) {
      showToast('You do not have permission to delete patients.', 'error');
      return;
    }
    if (!confirm(`Are you sure you want to delete ${customer.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteCustomer(customer.id, profile!.tenant!.id);
      setCustomers(customers.filter(c => c.id !== customer.id));
      showToast('Patient deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting customer:', error);
      showToast('Failed to delete patient. Please try again.', 'error');
    }
  };

  const handleUpdateBalance = (customer: any) => {
    if (!hasPermission(Permission.CUSTOMER_EDIT) || tenantGuard.isReadOnly) {
      showToast('Account in read-only mode or missing permissions.', 'error');
      return;
    }
    setSelectedCustomer(customer);
    setBalanceModalTab('update');
    setIsBalanceModalOpen(true);
  };

  const handleBalanceUpdate = async (id: string, newBalance: number, action: string, amount: number, reason: string) => {
    try {
      const customer = customers.find(c => c.id === id);
      if (!customer) return;

      const previousBalance = customer.balance;
      const changeAmount = newBalance - previousBalance;

      // Update customer balance
      const updated = await updateCustomer(id, { balance: newBalance }, profile!.tenant!.id);
      setCustomers(customers.map(c => c.id === id ? updated : c));

      // Record balance change in history
      await supabase!
        .from('balance_history')
        .insert([{
          customer_id: id,
          previous_balance: previousBalance,
          new_balance: newBalance,
          change_amount: changeAmount,
          change_type: action,
          reason: reason,
          created_by: profile?.display_name || 'Staff'
        }]);

      if (action === 'add' || action === 'set') {
        setReferenceBalances(prev => ({ ...prev, [id]: newBalance }));
      }

      showToast('Balance updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating balance:', error);
      showToast('Failed to update balance. Please try again.', 'error');
    }
  };

  const handleViewBalanceHistory = (customer: any) => {
    setSelectedCustomer(customer);
    setBalanceModalTab('history');
    setIsBalanceModalOpen(true);
  };

  return (
    <div className="p-4 max-w-[1400px] mx-auto space-y-4 animate-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold dark:text-white">Patient Directory</h2>
            <p className="text-sm text-slate-500">Manage prescription history and customer profiles</p>
          </div>
          {tenantGuard.isReadOnly && <ReadOnlyBadge />}
        </div>
        {hasPermission(Permission.CUSTOMER_ADD) && !tenantGuard.isReadOnly && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined">person_add</span>
            Add New Patient
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
          <span className="material-symbols-outlined">search</span>
        </span>
        <input 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-12 pr-4 py-3 text-sm bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-400 shadow-sm" 
          placeholder="Search by name, phone, or ID..." 
          type="text"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <th className="px-3 py-2">Patient Name</th>
                <th className="px-3 py-2 hidden md:table-cell">Contact</th>
                <th className="px-2 py-2 text-center hidden lg:table-cell">Visits</th>
                <th className="px-2 py-2 hidden lg:table-cell">Insurance</th>
                <th className="px-2 py-2">Balance</th>
                <th className="px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500 text-sm">
                    Loading patients...
                  </td>
                </tr>
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500 text-sm">
                    {searchTerm ? 'No patients found matching your search' : 'No patients found'}
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="hidden sm:flex size-8 rounded-full bg-primary/10 text-primary items-center justify-center text-[10px] font-bold shrink-0">
                        {customer.initials}
                      </div>
                      <div className="flex flex-col leading-tight">
                        <span className="text-xs font-semibold dark:text-white">{customer.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono sm:hidden">{customer.id.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hidden md:table-cell">{customer.phone}</td>
                  <td className="px-2 py-2 text-center hidden lg:table-cell">
                    <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">{customer.visits}</span>
                  </td>
                  <td className="px-2 py-2 hidden lg:table-cell">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                      customer.insurance === 'Uninsured' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {customer.insurance}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => handleUpdateBalance(customer)}
                      className={`text-xs font-bold hover:underline transition-colors ${getBalanceColor(customer)}`}
                    >
                      ₦{customer.balance.toFixed(2)}
                    </button>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <div className="relative group/menu inline-block">
                      <button className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-400 hover:text-primary shadow-sm hover:shadow-md">
                        <span className="material-symbols-outlined text-xl">more_vert</span>
                      </button>
                      <div className="absolute right-0 top-full pt-1 invisible group-hover/menu:visible opacity-0 group-hover/menu:opacity-100 transition-all z-[30]">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-1.5 w-48 overflow-hidden">
                          <button 
                            onClick={() => handleUpdateBalance(customer)}
                            className="w-full text-left px-4 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-3 transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg opacity-80">account_balance_wallet</span> Update Balance
                          </button>
                          <button 
                            onClick={() => handleViewHistory(customer)}
                            className="w-full text-left px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg opacity-60">history</span> Patient History
                          </button>
                          {hasPermission(Permission.CUSTOMER_EDIT) && !tenantGuard.isReadOnly && (
                            <button 
                              onClick={() => handleEditCustomer(customer)}
                              className="w-full text-left px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg opacity-60">edit</span> Edit Patient
                            </button>
                          )}
                          {hasPermission(Permission.CUSTOMER_DELETE) && !tenantGuard.isReadOnly && (
                            <button 
                              onClick={() => handleDeleteCustomer(customer)}
                              className="w-full text-left px-4 py-2 text-sm font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-3 transition-colors border-t border-slate-50 dark:border-slate-700 mt-1"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span> Delete Patient
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredCustomers.length)} of {filteredCustomers.length}
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded border border-slate-200 dark:border-slate-800 text-slate-400 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-2 py-1 rounded text-xs font-medium min-w-[28px] ${
                      currentPage === pageNum 
                        ? 'bg-primary text-white' 
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded border border-slate-200 dark:border-slate-800 text-slate-400 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <AddCustomerModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddCustomer}
      />

      <EditCustomerModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={handleUpdateCustomer}
        customer={selectedCustomer}
      />

      <CustomerHistoryModal 
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        customerName={selectedCustomer?.name || ''}
      />

      <PatientBalanceModal 
        isOpen={isBalanceModalOpen}
        onClose={() => setIsBalanceModalOpen(false)}
        customer={selectedCustomer}
        onUpdateBalance={handleBalanceUpdate}
        initialTab={balanceModalTab}
      />
    </div>
  );
};

export default Customers;
