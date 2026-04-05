
import React, { useState, useEffect } from 'react';
import AddProductModal from './AddProductModal';
import EditProductModal from './EditProductModal';
import { getProducts, addProduct, deleteProduct, updateProduct } from '../services/database';
import { Product } from '../types';
import { useToast } from './ToastContainer';
import { useAuth, Permission } from '../contexts/AuthContext';
import { getCategoryColor } from '../utils/categoryColors';
import { useTenantGuard } from '../hooks/useTenantGuard';
import ReadOnlyBadge from './ReadOnlyBadge';
import { supabase } from '../services/supabaseClient';

const Inventory: React.FC = () => {
  const [filter, setFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [products, setProducts] = useState<Product[]>([]);
  const { showToast } = useToast();
  const { hasPermission, profile, isTenantAdmin, isSuperAdmin } = useAuth();
  const tenantGuard = useTenantGuard();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const itemsPerPage = 10;

  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>(profile?.branch?.id);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Lifted Global State for Selectors
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('productCategories');
    return saved ? JSON.parse(saved) : ['Antibiotics', 'Painkillers', 'Cardiovascular', 'Respiratory', 'Diabetes', 'Gastrointestinal', 'Supplements', 'Antidepressants', 'Cosmetic', 'Medical Device'];
  });

  const [dosageForms, setDosageForms] = useState<string[]>(() => {
    const saved = localStorage.getItem('productDosageForms');
    return saved ? JSON.parse(saved) : ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops', 'Ointment', 'Suspension', 'Inhaler', 'Suppository', 'None'];
  });

  const [units, setUnits] = useState<string[]>(() => {
    const saved = localStorage.getItem('productUnits');
    return saved ? JSON.parse(saved) : ['Unit', 'Box', 'Bottle', 'Strip', 'Piece', 'Pack', 'Tube', 'Vial', 'Ampoule'];
  });

  useEffect(() => {
    localStorage.setItem('productCategories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('productDosageForms', JSON.stringify(dosageForms));
  }, [dosageForms]);

  useEffect(() => {
    localStorage.setItem('productUnits', JSON.stringify(units));
  }, [units]);

  useEffect(() => {
    if (profile?.tenant?.id && (isTenantAdmin() || isSuperAdmin())) {
      fetchBranches();
    }
  }, [profile?.tenant?.id]);

  useEffect(() => {
    loadProducts();
  }, [selectedBranchId]);

  const fetchBranches = async () => {
    if (!profile?.tenant?.id) return;
    const { data } = await supabase.from('branches').select('id, name').eq('tenant_id', profile.tenant.id);
    if (data) setBranches(data);
  };

  const loadProducts = async () => {
    if (!profile?.tenant?.id) return;
    try {
      setLoading(true);
      const data = await getProducts(profile.tenant.id, selectedBranchId);
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
      showToast('Failed to load products from database. Please check your connection.', 'error');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (newProduct: any) => {
    if (!hasPermission(Permission.INVENTORY_ADD) || tenantGuard.isReadOnly) {
      showToast('You do not have permission to add products.', 'error');
      return;
    }
    
    try {
      const added = await addProduct(newProduct, profile!.tenant!.id, selectedBranchId);
      setProducts([...products, added]);
      showToast('Medicine added successfully!', 'success');
      setIsAddModalOpen(false); // Close modal after success
    } catch (error) {
      console.error('Error adding product:', error);
      showToast('Failed to add medicine. Please try again.', 'error');
    }
  };

  const requestDeleteProduct = (id: string) => {
    if (!hasPermission(Permission.INVENTORY_DELETE)) {
      showToast('You do not have permission to delete products.', 'error');
      return;
    }
    setProductToDelete(id);
  };

  const executeDeleteProduct = async () => {
    if (!productToDelete || tenantGuard.isReadOnly) return;
    
    setIsDeleting(true);
    try {
      await deleteProduct(productToDelete, profile!.tenant!.id, selectedBranchId);
      setProducts(products.filter(p => p.id !== productToDelete));
      showToast('Medicine deleted successfully!', 'success');
      setProductToDelete(null);
      await loadProducts(); // Reload to ensure sync
    } catch (error: any) {
      console.error('Error deleting product:', error);
      if (error.message?.includes('foreign key') || error.code === '23503') {
        showToast('Cannot delete this medicine because it has been used in sales transactions. You can mark it as out of stock instead.', 'error');
      } else {
        showToast(`Failed to delete medicine: ${error.message || 'Please try again.'}`, 'error');
      }
      setProductToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    if (!hasPermission(Permission.INVENTORY_EDIT)) {
      showToast('You do not have permission to edit products.', 'error');
      return;
    }
    
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
    if (!hasPermission(Permission.INVENTORY_EDIT) || tenantGuard.isReadOnly) {
      showToast('You do not have permission to update products.', 'error');
      return;
    }
    
    try {
      const updated = await updateProduct(id, updates, profile!.tenant!.id, selectedBranchId);
      setProducts(products.map(p => p.id === id ? updated : p));
      showToast('Medicine updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating product:', error);
      showToast('Failed to update medicine. Please try again.', 'error');
    }
  };

  const filteredProducts = products.filter(prod => {
    // Apply category filter
    if (categoryFilter !== 'All' && prod.category !== categoryFilter) {
      return false;
    }
    // Apply status filter
    if (filter === 'Low Stock') {
      // Low stock = 25% or less of last restock quantity remaining
      const percentageRemaining = (prod.totalUnits / prod.lastRestockQuantity) * 100;
      if (percentageRemaining > 25) return false;
    }
    if (filter === 'Out of Stock') {
      if (prod.totalUnits > 0) return false;
    }
    if (filter === 'Near Expiry') {
      // Parse expiry date and check if expiring soon (within 30 days)
      const expiryDate = new Date(prod.expiryDate);
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      // Show items expiring within 30 days (not already expired)
      if (expiryDate > thirtyDaysFromNow || expiryDate < today) return false;
    }
    // Apply search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!prod.name.toLowerCase().includes(search) && 
          !(prod.brandName && prod.brandName.toLowerCase().includes(search)) &&
          !prod.batchNo.toLowerCase().includes(search)) {
        return false;
      }
    }
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name)); // Sort by name

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when filter, category filter, or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, categoryFilter, searchTerm]);

  const handleExportInventory = () => {
    // Check permission
    if (!hasPermission(Permission.INVENTORY_EXPORT)) {
      showToast('You do not have permission to export inventory data.', 'error');
      return;
    }
    
    // Create CSV content
    const headers = ['Medicine Name', 'Brand Name', 'Dosage Form', 'Strength', 'Category', 'Unit', 'Batch No', 'Barcode', 'Mfg Date', 'Expiry Date', 'Total Units', 'Cost Price (₦)', 'Selling Price (₦)', 'Stock Status'];
    
    const rows = filteredProducts.map(prod => {
      const percentageRemaining = (prod.totalUnits / prod.lastRestockQuantity) * 100;
      const stockStatus = percentageRemaining <= 25 ? 'Low Stock' : prod.totalUnits === 0 ? 'Out of Stock' : 'In Stock';
      
      return [
        prod.name,
        prod.brandName || 'N/A',
        prod.dosageForm || 'N/A',
        prod.strength || 'N/A',
        prod.category,
        prod.unit || 'Unit',
        prod.batchNo,
        prod.barcode || 'N/A',
        prod.manufacturingDate || 'N/A',
        prod.expiryDate,
        prod.totalUnits,
        prod.costPrice?.toFixed(2) || '0.00',
        prod.price.toFixed(2),
        stockStatus
      ];
    });

    // Convert to CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PharmaCore-Inventory-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Calculate stats
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.totalUnits), 0);
  const totalItems = products.length;
  const lowStockCount = products.filter(p => {
    const percentageRemaining = (p.totalUnits / p.lastRestockQuantity) * 100;
    return percentageRemaining <= 25;
  }).length;
  const nearExpiryCount = products.filter(p => {
    const expiryDate = new Date(p.expiryDate);
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow && expiryDate >= today;
  }).length;

  return (
    <>
      <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Inventory Value', value: `₦${totalValue.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: 'account_balance_wallet', color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'Total Products', value: totalItems.toString(), icon: 'inventory_2', color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'Low Stock Alerts', value: lowStockCount.toString(), icon: 'warning', color: 'text-amber-600', bg: 'bg-amber-100', action: lowStockCount > 0 ? 'Action Needed' : 'All Good', borderColor: lowStockCount > 0 ? 'border-l-amber-500' : '' },
          { label: 'Near Expiry (< 3 mo)', value: nearExpiryCount.toString(), icon: 'event_busy', color: 'text-rose-600', bg: 'bg-rose-100', borderColor: nearExpiryCount > 0 ? 'border-l-rose-500' : '' },
        ].map((card, idx) => (
          <div key={idx} className={`bg-white dark:bg-surface-dark p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm ${card.borderColor || ''} ${card.borderColor ? 'border-l-4' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${card.bg} dark:bg-opacity-20 ${card.color}`}>
                <span className="material-symbols-outlined">{card.icon}</span>
              </div>
              {(card as any).change && <span className="text-xs font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">{(card as any).change}</span>}
              {(card as any).action && <span className="text-xs font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">{(card as any).action}</span>}
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{card.label}</p>
            <h3 className={`text-lg sm:text-xl lg:text-2xl font-bold mt-1 break-words ${card.color === 'text-rose-600' ? 'text-rose-600' : ''}`}>{card.value}</h3>
          </div>
        ))}
      </div>

      {/* Page Title with Branch Selector & Export */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold dark:text-white">Inventory Management</h2>
          {tenantGuard.isReadOnly && <ReadOnlyBadge />}
        </div>
        
        <div className="flex items-center gap-3">
          {(isTenantAdmin() || isSuperAdmin()) && branches.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-all dark:text-white min-w-[180px] justify-between"
              >
                <span>{selectedBranchId ? branches.find(b => b.id === selectedBranchId)?.name : 'All Branches'}</span>
                <span className="material-symbols-outlined text-[20px] text-slate-400">expand_more</span>
              </button>
              
              {showBranchDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowBranchDropdown(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl shadow-2xl py-2 overflow-hidden border border-slate-200 dark:border-slate-700 z-20">
                    <button
                      onClick={() => { setSelectedBranchId(undefined); setShowBranchDropdown(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-bold flex justify-between items-center transition-colors ${
                        !selectedBranchId ? 'bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>All Branches</span>
                      {!selectedBranchId && <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>}
                    </button>
                    {branches.map((branch) => (
                      <button
                        key={branch.id}
                        onClick={() => { setSelectedBranchId(branch.id); setShowBranchDropdown(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-bold flex justify-between items-center transition-colors ${
                          selectedBranchId === branch.id ? 'bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{branch.name}</span>
                        {selectedBranchId === branch.id && <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          
          {hasPermission(Permission.INVENTORY_EXPORT) && (
            <button 
              onClick={handleExportInventory}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
              title="Export inventory to CSV"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              <span className="hidden lg:inline">Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters & Action Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <input
            type="text"
            placeholder="Search medicines..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary outline-none min-w-[200px]"
          />
          <div className="relative">
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-all dark:text-white min-w-[160px] justify-between"
            >
              <span>{categoryFilter === 'All' ? 'Category: All' : categoryFilter}</span>
              <span className="material-symbols-outlined text-[20px] text-slate-400">expand_more</span>
            </button>
            
            {showCategoryDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowCategoryDropdown(false)} />
                <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl shadow-2xl py-2 overflow-hidden border border-slate-200 dark:border-slate-700 z-20 max-h-80 overflow-y-auto">
                  <button
                    onClick={() => { setCategoryFilter('All'); setShowCategoryDropdown(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-bold flex justify-between items-center transition-colors ${
                      categoryFilter === 'All' ? 'bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>All Categories</span>
                    {categoryFilter === 'All' && <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>}
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => { setCategoryFilter(category); setShowCategoryDropdown(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-bold flex justify-between items-center transition-colors ${
                        categoryFilter === category ? 'bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{category}</span>
                      {categoryFilter === category && <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {['All', 'Low Stock', 'Out of Stock', 'Near Expiry'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  filter === tab ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        {hasPermission(Permission.INVENTORY_ADD) && !tenantGuard.isReadOnly && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="w-full lg:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all lg:shrink-0"
          >
            <span className="material-symbols-outlined">add</span>
            Add New Medicine
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Product Item</th>
                <th className="px-1 md:px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 hidden lg:table-cell">Category</th>
                <th className="px-1 md:px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 text-center">Stock</th>
                <th className="px-1 md:px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 hidden sm:table-cell">Pricing</th>
                <th className="px-1 md:px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 hidden lg:table-cell">Batch & Expiry</th>
                <th className="px-1 md:px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500 text-sm">
                    Loading inventory...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500 text-sm">
                    No products found
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((prod) => (
                <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-2 py-2">
                    <p className="font-bold text-xs leading-tight text-slate-800 dark:text-slate-200">
                      {prod.brandName ? (
                        <>{prod.brandName} {prod.strength ? <span className="opacity-80 font-medium">- {prod.strength}</span> : ''}</>
                      ) : (
                        <>{prod.name} {prod.strength ? <span className="opacity-80 font-medium">- {prod.strength}</span> : ''}</>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-tight flex flex-wrap items-center gap-x-1">
                      <span>{prod.name}</span> 
                      {prod.dosageForm && <span className="text-slate-400 dark:text-slate-500">• {prod.dosageForm}</span>}
                      <span className="sm:hidden font-bold text-emerald-600 dark:text-emerald-400 ml-auto leading-none">
                        ₦{prod.price?.toLocaleString('en-NG', { maximumFractionDigits: 0 }) || '0'}
                      </span>
                    </p>
                  </td>
                  <td className="px-1 md:px-2 py-2 hidden lg:table-cell">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${getCategoryColor(prod.category).bg} ${getCategoryColor(prod.category).text}`}>
                      {prod.category}
                    </span>
                  </td>
                  <td className="px-1 md:px-2 py-2 text-center">
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      <span className={`text-[11px] font-bold whitespace-nowrap ${((prod.totalUnits / prod.lastRestockQuantity) * 100) <= 25 ? 'text-amber-600' : 'text-slate-700 dark:text-slate-300'}`}>
                        {prod.totalUnits} <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 hidden xl:inline">{prod.unit || 'Unit'}</span>
                      </span>
                      <div className="hidden lg:block w-full max-w-[60px] h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-0.5">
                        <div 
                          className={`h-full rounded-full ${((prod.totalUnits / prod.lastRestockQuantity) * 100) <= 25 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${Math.min(100, (prod.totalUnits / prod.lastRestockQuantity) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-1 md:px-2 py-2 hidden sm:table-cell">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      ₦{prod.price?.toLocaleString('en-NG', { maximumFractionDigits: 0 }) || '0'}
                    </span>
                  </td>
                  <td className="px-1 md:px-2 py-2 hidden lg:table-cell">
                    <div className="flex flex-col">
                      <span className={`text-xs font-medium leading-tight ${prod.expiryMonthsLeft === 'EXPIRED' ? 'text-rose-600 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                        {prod.expiryDate && !isNaN(new Date(prod.expiryDate).getTime()) ? new Date(prod.expiryDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : prod.expiryDate}
                        <span className={`ml-1.5 text-[9px] ${prod.expiryMonthsLeft === 'EXPIRED' ? '' : 'text-slate-400 dark:text-slate-500'}`}>({prod.expiryMonthsLeft})</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[120px]" title={prod.batchNo}>Batch: {prod.batchNo}</span>
                    </div>
                  </td>
                  <td className="px-1 md:px-2 py-2 text-right">
                    <div className="relative group/menu inline-block">
                      <button className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-400 hover:text-primary shadow-sm hover:shadow-md">
                        <span className="material-symbols-outlined text-xl">more_vert</span>
                      </button>
                      <div className="absolute right-0 top-full pt-1 invisible group-hover/menu:visible opacity-0 group-hover/menu:opacity-100 transition-all z-[30]">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-1.5 w-48 overflow-hidden">
                          {hasPermission(Permission.INVENTORY_EDIT) && !tenantGuard.isReadOnly ? (
                            <button 
                              onClick={() => handleEditProduct(prod)}
                              className="w-full text-left px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg opacity-60">edit</span> Edit Medicine
                            </button>
                          ) : (
                            <div className="px-4 py-2 text-xs text-slate-400 italic">Read-only access</div>
                          )}
                          {hasPermission(Permission.INVENTORY_DELETE) && !tenantGuard.isReadOnly && (
                            <button 
                              onClick={() => requestDeleteProduct(prod.id)}
                              className="w-full text-left px-4 py-2 text-sm font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-3 transition-colors border-t border-slate-50 dark:border-slate-700 mt-1"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span> Delete Medicine
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
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} items
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded border border-slate-200 dark:border-slate-800 text-slate-400 disabled:opacity-30"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    currentPage === page 
                      ? 'bg-primary text-white' 
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded border border-slate-200 dark:border-slate-800 text-slate-400 disabled:opacity-30"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          )}
        </div>
      </div>
      </div>

      <AddProductModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddProduct}
        categories={categories}
        setCategories={setCategories}
        dosageForms={dosageForms}
        setDosageForms={setDosageForms}
        units={units}
        setUnits={setUnits}
      />

      <EditProductModal 
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedProduct(null);
        }}
        onUpdate={handleUpdateProduct}
        product={selectedProduct}
        categories={categories}
        setCategories={setCategories}
        dosageForms={dosageForms}
        setDosageForms={setDosageForms}
        units={units}
        setUnits={setUnits}
      />

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-4 mx-auto">
                <span className="material-symbols-outlined text-rose-600 text-2xl">delete_forever</span>
              </div>
              <h3 className="text-lg font-bold text-center text-slate-800 dark:text-white mb-2">Delete Medicine?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-6">
                Are you sure you want to delete this medicine? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={executeDeleteProduct}
                  className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Inventory;
