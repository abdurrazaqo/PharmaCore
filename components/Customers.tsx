
import React, { useState, useEffect } from 'react';
import AddCustomerModal from './AddCustomerModal';
import EditCustomerModal from './EditCustomerModal';
import CustomerHistoryModal from './CustomerHistoryModal';
import { getCustomers, addCustomer, updateCustomer, deleteCustomer } from '../services/database';
import { useToast } from './ToastContainer';

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
      showToast('Failed to load patients from database. Please check your connection.', 'error');
      setCustomers([]);
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

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-in slide-in-from-right-4 duration-500">
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
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500 text-sm">
                    No patients found
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-3 py-2 text-xs font-mono text-slate-400">{customer.id}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="hidden lg:flex size-8 rounded-full bg-primary/10 text-primary items-center justify-center text-[10px] font-bold shrink-0">
                        {customer.initials}
                      </div>
                      <div className="flex flex-col leading-tight">
                        {customer.name.split(' ').map((part, i) => (
                          <span key={i} className="text-xs font-semibold dark:text-white">{part}</span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">{customer.phone}</td>
                  <td className="px-2 py-2 text-center hidden lg:table-cell">
                    <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">{customer.visits}</span>
                  </td>
                  <td className="px-2 py-2 hidden lg:table-cell">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                      customer.insurance === 'Uninsured' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {customer.insurance}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <span className={`text-xs font-bold ${customer.balance > 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                      ₦{customer.balance.toFixed(2)}
                    </span>
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
    </div>
  );
};

export default Customers;
