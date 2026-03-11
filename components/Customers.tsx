
import React, { useState, useEffect } from 'react';
import AddCustomerModal from './AddCustomerModal';
import EditCustomerModal from './EditCustomerModal';
import CustomerHistoryModal from './CustomerHistoryModal';
import BalanceHistoryModal from './BalanceHistoryModal';
import { getCustomers, addCustomer, updateCustomer, deleteCustomer } from '../services/database';
import { supabase } from '../services/supabaseClient';
import { useToast } from './ToastContainer';

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isBalanceHistoryModalOpen, setIsBalanceHistoryModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const itemsPerPage = 15;

  useEffect(() => {
    loadCustomers();
  }, []);

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
    try {
      setLoading(true);
      const data = await getCustomers();
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
    try {
      const added = await addCustomer(newCustomer);
      setCustomers([...customers, added]);
      showToast('Patient added successfully!', 'success');
    } catch (error) {
      console.error('Error adding customer:', error);
      showToast('Failed to add patient. Please try again.', 'error');
    }
  };

  const handleUpdateCustomer = async (id: string, updates: any) => {
    try {
      const updated = await updateCustomer(id, updates);
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
    if (!confirm(`Are you sure you want to delete ${customer.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteCustomer(customer.id);
      setCustomers(customers.filter(c => c.id !== customer.id));
      showToast('Patient deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting customer:', error);
      showToast('Failed to delete patient. Please try again.', 'error');
    }
  };

  const handleUpdateBalance = (customer: any) => {
    setSelectedCustomer(customer);
    setIsBalanceModalOpen(true);
  };

  const handleBalanceUpdate = async (id: string, newBalance: number, action: string, amount: number, reason: string) => {
    try {
      const customer = customers.find(c => c.id === id);
      if (!customer) return;

      const previousBalance = customer.balance;
      const changeAmount = newBalance - previousBalance;

      // Update customer balance
      const updated = await updateCustomer(id, { balance: newBalance });
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
          created_by: 'Pharm. Abdurrazaq O.'
        }]);

      showToast('Balance updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating balance:', error);
      showToast('Failed to update balance. Please try again.', 'error');
    }
  };

  const handleViewBalanceHistory = (customer: any) => {
    setSelectedCustomer(customer);
    setIsBalanceHistoryModalOpen(true);
  };

  return (
    <div className="p-4 max-w-[1400px] mx-auto space-y-4 animate-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold dark:text-white">Patient Directory</h2>
          <p className="text-sm text-slate-500">Manage prescription history and customer profiles</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined">person_add</span>
          Add New Patient
        </button>
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
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Patient Name</th>
                <th className="px-3 py-2">Contact</th>
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
                  <td className="px-3 py-2 text-xs font-mono text-slate-400">{customer.id}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="hidden lg:flex size-8 rounded-full bg-primary/10 text-primary items-center justify-center text-[10px] font-bold shrink-0">
                        {customer.initials}
                      </div>
                      <div className="flex flex-col leading-tight">
                        <span className="text-xs font-semibold dark:text-white">{customer.name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">{customer.phone}</td>
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
                      className={`text-xs font-bold hover:underline ${customer.balance > 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}
                    >
                      ₦{customer.balance.toFixed(2)}
                    </button>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={() => handleViewHistory(customer)}
                        className="p-1 text-slate-400 hover:text-primary transition-colors"
                        title="View History"
                      >
                        <span className="material-symbols-outlined text-base">history</span>
                      </button>
                      <button 
                        onClick={() => handleEditCustomer(customer)}
                        className="p-1 text-slate-400 hover:text-primary transition-colors"
                        title="Edit Patient"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDeleteCustomer(customer)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete Patient"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
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

      <BalanceHistoryModal 
        isOpen={isBalanceHistoryModalOpen}
        onClose={() => setIsBalanceHistoryModalOpen(false)}
        customerId={selectedCustomer?.id || ''}
        customerName={selectedCustomer?.name || ''}
      />

      {/* Balance Update Modal */}
      {isBalanceModalOpen && selectedCustomer && (
        <div className="modal-overlay bg-black/50 flex items-center justify-center p-4">
          <div className="modal-content bg-white dark:bg-surface-dark rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold dark:text-white">Update Balance</h3>
              <button
                onClick={() => handleViewBalanceHistory(selectedCustomer)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-sm">history</span>
                View History
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-2">Patient: {selectedCustomer.name}</p>
            <p className="text-sm text-slate-500 mb-4">Current Balance: ₦{selectedCustomer.balance.toFixed(2)}</p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const action = formData.get('action') as string;
              const amount = parseFloat(formData.get('amount') as string);
              const reason = formData.get('reason') as string;
              
              if (isNaN(amount) || amount <= 0) {
                showToast('Please enter a valid amount', 'error');
                return;
              }

              let newBalance = selectedCustomer.balance;
              if (action === 'add') {
                newBalance += amount;
              } else if (action === 'subtract') {
                newBalance = Math.max(0, newBalance - amount);
              } else if (action === 'set') {
                newBalance = amount;
              }

              handleBalanceUpdate(selectedCustomer.id, newBalance, action, amount, reason);
              setIsBalanceModalOpen(false);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 dark:text-white">Action</label>
                  <select name="action" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white">
                    <option value="add">Add to Balance</option>
                    <option value="subtract">Subtract from Balance</option>
                    <option value="set">Set Balance</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 dark:text-white">Amount (₦)</label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    min="0"
                    required
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 dark:text-white">Reason (Optional)</label>
                  <textarea
                    name="reason"
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white resize-none"
                    placeholder="e.g., Payment received, Adjustment, etc."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsBalanceModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Update Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
