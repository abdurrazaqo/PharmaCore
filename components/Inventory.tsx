
import React, { useState, useEffect } from 'react';
import AddProductModal from './AddProductModal';
import EditProductModal from './EditProductModal';
import { getProducts, addProduct, deleteProduct, updateProduct } from '../services/database';
import { Product } from '../types';
import { useToast } from './ToastContainer';

const Inventory: React.FC = () => {
  const [filter, setFilter] = useState('All');
  const [products, setProducts] = useState<Product[]>([]);
  const { showToast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
      alert('Failed to load products from database. Please check your connection.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (newProduct: any) => {
    try {
      const added = await addProduct(newProduct);
      setProducts([...products, added]);
      alert('Medicine added successfully!');
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add medicine. Please try again.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this medicine? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteProduct(id);
      setProducts(products.filter(p => p.id !== id));
      alert('Medicine deleted successfully!');
      await loadProducts(); // Reload to ensure sync
    } catch (error: any) {
      console.error('Error deleting product:', error);
      if (error.message?.includes('foreign key') || error.code === '23503') {
        alert('Cannot delete this medicine because it has been used in sales transactions. You can mark it as out of stock instead.');
      } else {
        alert(`Failed to delete medicine: ${error.message || 'Please try again.'}`);
      }
    }
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const updated = await updateProduct(id, updates);
      setProducts(products.map(p => p.id === id ? updated : p));
      alert('Medicine updated successfully!');
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update medicine. Please try again.');
    }
  };

  const filteredProducts = products.filter(prod => {
    // Apply filter
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
          !prod.generic.toLowerCase().includes(search) &&
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

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);

  const handleExportInventory = () => {
    // Create CSV content
    const headers = ['Medicine Name', 'Generic Name', 'Category', 'Batch No', 'Barcode', 'Expiry Date', 'Total Units', 'Cost Price (₦)', 'Selling Price (₦)', 'Stock Status'];
    
    const rows = filteredProducts.map(prod => {
      const percentageRemaining = (prod.totalUnits / prod.lastRestockQuantity) * 100;
      const stockStatus = percentageRemaining <= 25 ? 'Low Stock' : prod.totalUnits === 0 ? 'Out of Stock' : 'In Stock';
      
      return [
        prod.name,
        prod.generic,
        prod.category,
        prod.batchNo,
        prod.barcode || 'N/A',
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
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Inventory Value', value: `₦${totalValue.toFixed(2)}`, icon: 'account_balance_wallet', color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'Total Products', value: totalItems.toString(), icon: 'inventory_2', color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'Low Stock Alerts', value: lowStockCount.toString(), icon: 'warning', color: 'text-amber-600', bg: 'bg-amber-100', action: lowStockCount > 0 ? 'Action Needed' : 'All Good', borderColor: lowStockCount > 0 ? 'border-l-amber-500' : '' },
          { label: 'Near Expiry (< 3 mo)', value: nearExpiryCount.toString(), icon: 'event_busy', color: 'text-rose-600', bg: 'bg-rose-100', borderColor: nearExpiryCount > 0 ? 'border-l-rose-500' : '' },
        ].map((card, idx) => (
          <div key={idx} className={`bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm ${card.borderColor || ''} ${card.borderColor ? 'border-l-4' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${card.bg} dark:bg-opacity-20 ${card.color}`}>
                <span className="material-symbols-outlined">{card.icon}</span>
              </div>
              {card.change && <span className="text-xs font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">{card.change}</span>}
              {card.action && <span className="text-xs font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">{card.action}</span>}
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{card.label}</p>
            <h3 className={`text-2xl font-bold mt-1 ${card.color === 'text-rose-600' ? 'text-rose-600' : ''}`}>{card.value}</h3>
          </div>
        ))}
      </div>

      {/* Page Title with Export */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold dark:text-white">Inventory Management</h2>
        <button 
          onClick={handleExportInventory}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
          title="Export inventory to CSV"
        >
          <span className="material-symbols-outlined text-lg">download</span>
          Export CSV
        </button>
      </div>

      {/* Filters & Action Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <input
            type="text"
            placeholder="Search medicines..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary outline-none min-w-[200px]"
          />
          <select className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary outline-none min-w-[160px]">
            <option>Category: All</option>
            <option>Antibiotics</option>
            <option>Painkillers</option>
          </select>
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
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="w-full lg:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all lg:shrink-0"
        >
          <span className="material-symbols-outlined">add</span>
          Add New Medicine
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Medicine</th>
                <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden lg:table-cell">Category</th>
                <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Batch No</th>
                <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Expiry</th>
                <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">Stock</th>
                <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Actions</th>
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
                  <td className="px-3 py-2">
                    <p className="font-semibold text-xs leading-tight">{prod.name}</p>
                    <p className="text-[10px] text-slate-500 italic leading-tight">{prod.generic}</p>
                  </td>
                  <td className="px-2 py-2 hidden lg:table-cell">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 whitespace-nowrap">
                      {prod.category}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-xs font-mono text-slate-600 dark:text-slate-400">{prod.batchNo}</td>
                  <td className="px-2 py-2">
                    <div className="flex flex-col">
                      <span className={`text-xs font-medium leading-tight ${prod.expiryMonthsLeft === 'EXPIRED' ? 'text-rose-600 font-bold' : ''}`}>{prod.expiryDate}</span>
                      <span className={`text-[9px] leading-tight ${prod.expiryMonthsLeft === 'EXPIRED' ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>{prod.expiryMonthsLeft}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="hidden lg:block flex-1 max-w-[80px] h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${((prod.totalUnits / prod.lastRestockQuantity) * 100) <= 25 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${Math.min(100, (prod.totalUnits / prod.lastRestockQuantity) * 100)}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs font-bold whitespace-nowrap ${((prod.totalUnits / prod.lastRestockQuantity) * 100) <= 25 ? 'text-amber-600' : ''}`}>
                        {prod.totalUnits}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={() => handleEditProduct(prod)}
                        className="p-1 text-slate-400 hover:text-primary transition-colors"
                        title="Edit Medicine"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                        title="Delete Medicine"
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

      <AddProductModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddProduct}
      />

      <EditProductModal 
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedProduct(null);
        }}
        onUpdate={handleUpdateProduct}
        product={selectedProduct}
      />
    </div>
  );
};

export default Inventory;
