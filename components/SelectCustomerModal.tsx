import React, { useState, useEffect } from 'react';
import { getCustomers } from '../services/database';
import { useAuth } from '../contexts/AuthContext';

interface SelectCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (customer: any) => void;
}

const SelectCustomerModal: React.FC<SelectCustomerModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const { profile } = useAuth();

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      setSearchTerm('');
      setShowNewCustomerForm(false);
      setNewCustomerName('');
    }
  }, [isOpen]);

  const loadCustomers = async () => {
    if (!profile?.tenant?.id) return;
    try {
      setLoading(true);
      const data = await getCustomers(profile.tenant.id);
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = (customer: any) => {
    onSelect(customer);
    onClose();
  };

  const handleAddNewCustomer = () => {
    if (newCustomerName.trim()) {
      const initials = newCustomerName.split(' ').map(n => n[0]).join('').toUpperCase();
      onSelect({
        name: newCustomerName.trim(),
        initials,
        phone: 'N/A'
      });
      onClose();
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Limit displayed customers to 10 when no search term
  const displayedCustomers = searchTerm.trim() 
    ? filteredCustomers 
    : filteredCustomers.slice(0, 10);

  const hasMoreCustomers = !searchTerm.trim() && filteredCustomers.length > 10;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay bg-black/50 flex items-center justify-center p-4">
      <div className="modal-content bg-white dark:bg-surface-dark rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-xl font-bold dark:text-white">Select Customer</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white"
            autoFocus
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {showNewCustomerForm ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 dark:text-white">Customer Name</label>
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewCustomerForm(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNewCustomer}
                  disabled={!newCustomerName.trim()}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Customer
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="text-center py-8 text-slate-500">Loading customers...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 mb-4">No customers found</p>
              <button
                onClick={() => setShowNewCustomerForm(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
              >
                Add New Customer
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Walk-in Customer Quick Option */}
              <button
                onClick={() => handleSelectCustomer({ name: 'Walk-in Customer', initials: 'WC', phone: 'N/A' })}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left border-2 border-dashed border-slate-200 dark:border-slate-700"
              >
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 flex items-center justify-center text-sm font-bold shrink-0">
                  WC
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold dark:text-white">Walk-in Customer</p>
                  <p className="text-sm text-slate-500">Quick checkout without customer details</p>
                </div>
                <span className="material-symbols-outlined text-slate-400">chevron_right</span>
              </button>

              {/* Divider */}
              {displayedCustomers.length > 0 && (
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Saved Customers</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                </div>
              )}

              {/* Customer List */}
              {displayedCustomers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                    {customer.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold dark:text-white truncate">{customer.name}</p>
                    <p className="text-sm text-slate-500 truncate">{customer.phone}</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                </button>
              ))}

              {/* Show more hint */}
              {hasMoreCustomers && (
                <div className="text-center py-3">
                  <p className="text-sm text-slate-500">
                    Showing 10 of {filteredCustomers.length} customers
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Use search to find more customers
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!showNewCustomerForm && !loading && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setShowNewCustomerForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <span className="material-symbols-outlined">person_add</span>
              Add New Customer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectCustomerModal;
