import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  getProducts, 
  getTransactions, 
  getCustomers, 
  addTransaction, 
  addSalesItems, 
  getNextInvoiceId
} from '../services/database';
import { Product } from '../types';
import PrintReceipt from './PrintReceipt';
import SelectCustomerModal from './SelectCustomerModal';
import { useToast } from './ToastContainer';
import { getCategoryColor } from '../utils/categoryColors';
import BarcodeScanner from './BarcodeScanner';
import { useAuth } from '../contexts/AuthContext';
import { useTenantGuard } from '../hooks/useTenantGuard';
import ReadOnlyBadge from './ReadOnlyBadge';

const POS: React.FC = () => {
  const [cart, setCart] = useState<{ id: string, qty: number }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState({ name: 'Walk-in Customer', initials: 'WC', phone: 'N/A' });
  const [products, setProducts] = useState<Product[]>([]);
  const { profile } = useAuth();
  const tenantGuard = useTenantGuard();
  const [loading, setLoading] = useState(true);
  const [completedTransactionId, setCompletedTransactionId] = useState<string | null>(null);
  const [completedTransactionTotal, setCompletedTransactionTotal] = useState<number>(0);
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Transfer'>('Cash');
  const [discountPercent, setDiscountPercent] = useState(() => {
    const saved = localStorage.getItem('posDiscountPercent');
    const parsed = saved ? Number(saved) : null;
    return (parsed !== null && !isNaN(parsed) && parsed >= 0 && parsed <= 100) ? parsed : 0;
  });
  const [showDiscountEdit, setShowDiscountEdit] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const searchDropdownRef = React.useRef<HTMLDivElement>(null);
  const catalogColumnRef = React.useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const { showToast } = useToast();
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Update dropdown position when search input changes
  useEffect(() => {
    if (showSearchDropdown && searchInputRef.current) {
      const rect = searchInputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [showSearchDropdown]);

  // Save discount to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('posDiscountPercent', discountPercent.toString());
  }, [discountPercent]);

  useEffect(() => {
    loadProducts();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dynamic Viewport Pagination
  useEffect(() => {
    if (!catalogColumnRef.current) return;

    const calculatePagination = () => {
      if (catalogColumnRef.current) {
        // Measure the PARENT column's full available height in pixels
        const columnHeight = catalogColumnRef.current.clientHeight;

        // Subtract the approximate heights of the search bar, margins, card headers, and footers
        // Search (~72), Margins (~24), Heading (~30), Padding (~32)
        // Card Header (~40), Pagination (~52), Misc padding = ~270px
        const staticElementsHeight = 270;
        const availableRowSpace = Math.max(0, columnHeight - staticElementsHeight);

        // Each row is realistically closer to 46px tall
        const calculatedItems = Math.floor(availableRowSpace / 46);

        // Ensure at least 4 items show if heavily compressed
        setItemsPerPage(Math.max(4, calculatedItems));
      }
    };

    // Use ResizeObserver to automatically calculate on window/layout shifts
    const observer = new ResizeObserver(() => calculatePagination());
    observer.observe(catalogColumnRef.current);
    calculatePagination();

    return () => observer.disconnect();
  }, []);

  const loadProducts = async () => {
    if (!profile?.tenant?.id) return;
    try {
      setLoading(true);
      const data = await getProducts(profile.tenant.id, profile.branch?.id);
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
      showToast('Failed to load products from database. Please check your connection.', 'error');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const subtotal = cart.reduce((acc, item) => {
    const prod = products.find(p => p.id === item.id);
    return acc + (prod?.price || 0) * item.qty;
  }, 0);

  const discount = subtotal * (discountPercent / 100);
  const total = subtotal - discount;

  const updateQty = (id: string, delta: number) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    setCart(prev => {
      const existing = prev.find(item => item.id === id);

      if (existing) {
        const newQty = existing.qty + delta;

        // Prevent adding more than available stock
        if (delta > 0 && newQty > product.totalUnits) {
          showToast(`Cannot add more. Only ${product.totalUnits} available in stock.`, 'warning');
          return prev;
        }

        // Update existing item
        return prev.map(item =>
          item.id === id ? { ...item, qty: Math.max(0, newQty) } : item
        ).filter(item => item.qty > 0);
      } else if (delta > 0) {
        // Prevent adding new item if out of stock
        if (product.totalUnits === 0) {
          showToast(`Product is out of stock.`, 'warning');
          return prev;
        }

        // Add new item to cart
        return [...prev, { id, qty: Math.min(delta, product.totalUnits) }];
      }

    });
  };

  const setItemQty = (id: string, newQty: number | string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    setCart(prev => {
      const existing = prev.find(item => item.id === id);
      if (existing) {
        if (newQty === '') {
           // Temporarily allow empty string during typing, will be fixed on blur
           return prev;
        }
        
        let parsedQty = typeof newQty === 'string' ? parseInt(newQty) : newQty;
        if (isNaN(parsedQty) || parsedQty < 1) parsedQty = 1;
        
        if (parsedQty > product.totalUnits) {
          showToast(`Only ${product.totalUnits} available in stock.`, 'warning');
          parsedQty = product.totalUnits;
        }
        return prev.map(item =>
          item.id === id ? { ...item, qty: parsedQty } : item
        );
      }
      return prev;
    });
  };

  const handleCompleteSale = async () => {
    if (tenantGuard.isReadOnly) {
      showToast('Account is in read-only mode. Renew subscription to process sales.', 'error');
      return;
    }
    
    if (cart.length === 0) {
      showToast('Cart is empty! Add items to complete sale.', 'warning');
      return;
    }

    // Validate quantities
    const hasInvalidQty = cart.some(item => item.qty < 1);
    if (hasInvalidQty) {
      showToast('Please enter valid quantities for all items in the cart.', 'error');
      return;
    }

    const now = new Date();
    const dateTime = now.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    try {
      // Get next sequential invoice ID
      const invoiceId = await getNextInvoiceId(profile!.tenant!.id, profile!.branch?.id);

      // Calculate total before clearing cart
      const saleTotal = total;

      // Save transaction to database
      await addTransaction({
        id: invoiceId,
        customer: selectedCustomer.name,
        initials: selectedCustomer.initials,
        dateTime: dateTime,
        amount: saleTotal,
        status: 'Completed' as any,
        paymentMethod: paymentMethod,
        staffName: profile?.display_name || 'Staff'
      } as any, profile!.tenant!.id, profile!.branch?.id);

      // Save sales items
      const salesItems = cart.map(item => {
        const prod = products.find(p => p.id === item.id);
        return {
          productId: item.id,
          quantity: item.qty,
          unitPrice: prod?.price || 0,
          totalPrice: (prod?.price || 0) * item.qty
        };
      });

      await addSalesItems(invoiceId, salesItems, profile!.tenant!.id);

      // Update customer visit count (if not walk-in customer)
      if (selectedCustomer.name !== 'Walk-in Customer') {
        const { supabase } = await import('../services/supabaseClient');
        const { data: customerData, error: fetchError } = await supabase!
          .from('customers')
          .select('visits')
          .eq('name', selectedCustomer.name)
          .single();

        if (!fetchError && customerData) {
          await supabase!
            .from('customers')
            .update({ visits: (customerData.visits || 0) + 1 })
            .eq('name', selectedCustomer.name);
        }
      }

      // Store total for popup before clearing
      const completedTotal = saleTotal;

      // Clear cart and reset customer
      setCart([]);
      setSelectedCustomer({ name: 'Walk-in Customer', initials: 'WC', phone: 'N/A' });
      
      // Reload products so stock level updates immediately
      await loadProducts();

      // Show print prompt with stored total
      setCompletedTransactionId(invoiceId);
      setCompletedTransactionTotal(completedTotal);
      setShowPrintPrompt(true);
    } catch (error) {
      console.error('Error completing sale:', error);
      showToast('Failed to complete sale. Please check your database connection.', 'error');
    }
  };

  const handlePrintReceipt = () => {
    setShowPrintPrompt(false);
    // PrintReceipt modal will show
  };

  const handleSkipPrint = () => {
    setShowPrintPrompt(false);
    setCompletedTransactionId(null);
  };

  const handleRemoveCustomer = () => {
    setSelectedCustomer({ name: 'Walk-in Customer', initials: 'WC', phone: 'N/A' });
  };

  const handleAddCustomer = () => {
    setIsCustomerModalOpen(true);
  };

  const handleSelectCustomer = (customer: any) => {
    setSelectedCustomer(customer);
  };

  const handleBarcodeScan = (barcode: string) => {
    setSearchTerm(barcode);
    setShowSearchDropdown(true);

    // Try to find product by barcode
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      updateQty(product.id, 1);
      showToast(`Added ${product.name} to cart`, 'success');
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.brandName && p.brandName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.barcode && p.barcode.includes(searchTerm))
  ).sort((a, b) => a.name.localeCompare(b.name)); // Sort by name

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="flex h-full overflow-hidden flex-col lg:flex-row animate-in zoom-in-95 duration-300">
      {/* Catalog */}
      <div ref={catalogColumnRef} className="lg:flex-1 shrink-0 flex flex-col min-w-0 bg-slate-50 dark:bg-surface-dark/20 p-4 relative z-30 lg:overflow-y-auto lg:overflow-x-hidden">
        {/* Search Bar - Always visible, with dropdown on mobile */}
        <div className="relative mb-2 lg:mb-4" ref={searchDropdownRef}>
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <span className="material-symbols-outlined">search</span>
          </span>
          <input
            ref={searchInputRef}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSearchDropdown(e.target.value.length > 0);
            }}
            onFocus={() => setShowSearchDropdown(searchTerm.length > 0)}
            className="block w-full pl-12 pr-14 py-4 text-lg bg-white dark:bg-surface-dark border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-primary focus:border-primary transition-all placeholder:text-slate-400 shadow-sm"
            placeholder="Type item name or scan barcode..."
            type="text"
          />
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-primary transition-colors"
              title="Scan barcode with camera"
            >
              <span className="material-symbols-outlined text-3xl">barcode_scanner</span>
            </button>
          </div>

          {/* Mobile Search Results Dropdown - Fixed positioning */}
          {showSearchDropdown && filteredProducts.length > 0 && (
            <div
              className="lg:hidden fixed bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-[50vh] overflow-y-auto z-[9999]"
              style={{
                top: `${dropdownPosition.top + 8}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`
              }}
            >
              {filteredProducts.slice(0, 10).map((prod) => {
                const inCart = cart.find(c => c.id === prod.id);
                const isOutOfStock = prod.totalUnits === 0;
                const percentageRemaining = (prod.totalUnits / prod.lastRestockQuantity) * 100;
                const isLowStock = percentageRemaining <= 25;

                return (
                  <button
                    key={prod.id}
                    onClick={() => {
                      if (!isOutOfStock) {
                        updateQty(prod.id, 1);
                        setShowSearchDropdown(false);
                        setSearchTerm('');
                      }
                    }}
                    disabled={isOutOfStock}
                    className={`w-full p-4 border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left ${inCart ? 'bg-primary/5' : ''
                      } ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-0.5 leading-tight truncate">
                          {prod.brandName ? (
                            <>{prod.brandName} {prod.strength && <span className="opacity-80 font-medium">- {prod.strength}</span>}</>
                          ) : (
                            <>{prod.name} {prod.strength && <span className="opacity-80 font-medium">- {prod.strength}</span>}</>
                          )}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium mb-1.5 truncate">
                          {prod.name} {prod.dosageForm && <span className="text-slate-400 dark:text-slate-500">• {prod.dosageForm}</span>}
                        </p>
                        <div className="flex items-center gap-3">
                          <span className="text-primary font-bold text-base">₦{prod.price.toLocaleString('en-NG', { maximumFractionDigits: 0 })}</span>
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${isOutOfStock
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : isLowStock
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                            {isOutOfStock ? 'Out of Stock' : `${prod.totalUnits} ${prod.unit || 'Unit'}`}
                          </span>
                        </div>
                      </div>
                      {!isOutOfStock && (
                        <div className="flex-shrink-0">
                          {inCart ? (
                            <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg border border-primary">
                              <span className="material-symbols-outlined text-base">check</span>
                              <span className="font-semibold text-sm">{inCart.qty}</span>
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center">
                              <span className="material-symbols-outlined text-xl">add</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
              {filteredProducts.length > 10 && (
                <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
                  Showing 10 of {filteredProducts.length} results
                </div>
              )}
            </div>
          )}

          {showSearchDropdown && searchTerm && filteredProducts.length === 0 && (
            <div
              className="lg:hidden fixed bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-6 text-center z-[9999]"
              style={{
                top: `${dropdownPosition.top + 8}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`
              }}
            >
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">search_off</span>
              <p className="text-sm text-slate-500">No medicines found</p>
              <p className="text-xs text-slate-400 mt-1">Try a different search term</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold flex items-center gap-2 dark:text-white hidden lg:flex">
            <span className="material-symbols-outlined text-primary">inventory_2</span>
            Available Medicines
          </h2>
        </div>

        {/* Products Table - Desktop Only */}
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hidden lg:flex flex-col">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 z-10 shadow-sm">
                <tr>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Product Item</th>
                  <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Category</th>
                  <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Price</th>
                  <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">Stock</th>
                  <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500 text-sm">
                      Loading products...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500 text-sm">
                      No products found
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((prod) => {
                    const inCart = cart.find(c => c.id === prod.id);
                    const percentageRemaining = (prod.totalUnits / prod.lastRestockQuantity) * 100;
                    const isLowStock = percentageRemaining <= 25;
                    const isOutOfStock = prod.totalUnits === 0;

                    return (
                      <tr
                        key={prod.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${inCart ? 'bg-primary/5' : ''}`}
                      >
                        <td className="px-3 py-2">
                          <p className="font-bold text-xs text-slate-800 dark:text-slate-200 leading-tight">
                            {prod.brandName ? (
                              <>{prod.brandName} {prod.strength && <span className="opacity-80 font-medium">- {prod.strength}</span>}</>
                            ) : (
                              <>{prod.name} {prod.strength && <span className="opacity-80 font-medium">- {prod.strength}</span>}</>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-tight">
                            {prod.name} {prod.dosageForm && <span className="text-slate-400 dark:text-slate-500">• {prod.dosageForm}</span>}
                          </p>
                        </td>
                        <td className="px-2 py-2">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${getCategoryColor(prod.category).bg} ${getCategoryColor(prod.category).text}`}>
                            {prod.category}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <span className="text-primary font-bold text-xs">₦{prod.price.toLocaleString('en-NG', { maximumFractionDigits: 0 })}</span>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isOutOfStock
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : isLowStock
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                            {prod.totalUnits}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center">
                          {isOutOfStock ? (
                            <span className="text-[10px] text-slate-400 font-medium">Out of Stock</span>
                          ) : (
                            <button
                              onClick={() => updateQty(prod.id, 1)}
                              className={`px-2 py-1 rounded-md font-medium text-[10px] transition-all inline-flex items-center gap-1 ${inCart
                                  ? 'bg-primary/10 text-primary border border-primary'
                                  : 'bg-primary text-white hover:bg-primary/90'
                                }`}
                            >
                              <span className="material-symbols-outlined text-sm">
                                {inCart ? 'check' : 'add_shopping_cart'}
                              </span>
                              <span>{inCart ? `In Cart (${inCart.qty})` : 'Add'}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded border border-slate-200 dark:border-slate-800 text-slate-400 disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-2 py-1 rounded text-xs font-medium ${currentPage === page
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
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cart Sidebar */}
      <aside className="w-full flex-1 lg:w-[360px] bg-slate-50/50 dark:bg-surface-dark/95 lg:border-l border-t lg:border-t-0 border-slate-200 dark:border-slate-800 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] lg:shadow-2xl relative z-20 flex flex-col h-[calc(100vh-52px)] lg:h-full lg:flex-shrink-0 min-h-0">
        {/* Header / Customer Section */}
        <div className="p-3 bg-white dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 z-10 sticky top-0 shadow-sm">
          <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-teal-500 flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0 ring-1 ring-white dark:ring-slate-800">
                {selectedCustomer.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-white leading-none truncate">{selectedCustomer.name}</p>
                <p className="text-[10px] text-slate-500 font-medium truncate flex items-center gap-0.5 mt-0.5">
                  <span className="material-symbols-outlined text-[10px]">phone</span>
                  {selectedCustomer.phone}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={handleAddCustomer}
                className="p-1.5 text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-all"
                title="Change Customer"
              >
                <span className="material-symbols-outlined text-sm">person_add</span>
              </button>
              {selectedCustomer.name !== 'Walk-in Customer' && (
                <button
                  onClick={handleRemoveCustomer}
                  className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-md transition-all"
                  title="Remove Customer"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-4 min-h-0 custom-scrollbar">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cart Items
              <span className="ml-2 inline-flex items-center justify-center bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-extrabold pb-[1px]">
                {cart.length}
              </span>
            </h3>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1 transition-colors bg-red-50 dark:bg-red-900/10 px-2 py-1 rounded-md"
              >
                <span className="material-symbols-outlined text-[14px]">delete_sweep</span>
                Clear
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 opacity-70 mt-6 lg:mt-10">
              <div className="w-14 h-14 mb-3 rounded-full bg-slate-200/50 dark:bg-slate-800 flex items-center justify-center animate-pulse">
                <span className="material-symbols-outlined text-3xl text-slate-400">shopping_cart</span>
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Your cart is empty</p>
              <p className="text-xs text-slate-500 max-w-[200px] mt-1">Scan a barcode or search for products to add them to your cart.</p>
            </div>
          ) : (
            <div className="space-y-1.5 list-none">
              {cart.map((item) => {
                const prod = products.find(p => p.id === item.id);
                if (!prod) return null;
                const isMaxReached = item.qty >= prod.totalUnits;

                return (
                  <div key={item.id} className="group relative bg-white dark:bg-slate-800 rounded-md p-2 shadow-sm border border-slate-100 dark:border-slate-700/60 hover:border-primary/40 dark:hover:border-primary/40 transition-all hover:shadow-md flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 leading-tight truncate">
                        {prod.brandName ? (
                          <>{prod.brandName} {prod.strength && <span className="font-medium opacity-80">- {prod.strength}</span>}</>
                        ) : (
                          <>{prod.name} {prod.strength && <span className="font-medium opacity-80">- {prod.strength}</span>}</>
                        )}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-[9px] text-slate-500 font-medium truncate shrink">
                          {prod.name} {prod.dosageForm && <span>• {prod.dosageForm}</span>}
                        </p>
                        <span className="shrink-0 text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1 py-0.5 rounded">
                          ₦{prod.price.toLocaleString('en-NG', { maximumFractionDigits: 0 })} / <span className="hidden md:inline">{prod.unit || 'Unit'}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-0.5">
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          className="w-6 h-6 shrink-0 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white hover:shadow-sm rounded transition-all active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[10px] font-bold">remove</span>
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={item.qty}
                          onChange={(e) => {
                            // Only allow numeric input
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            if (val) setItemQty(item.id, val);
                          }}
                          onBlur={() => {
                            if (item.qty < 1) setItemQty(item.id, 1);
                          }}
                          className="w-8 h-6 shrink-0 text-center text-[11px] font-bold text-slate-800 dark:text-white bg-transparent border-none focus:ring-1 focus:ring-primary/50 focus:bg-slate-100 dark:focus:bg-slate-800 rounded p-0 outline-none"
                        />
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          disabled={isMaxReached}
                          className={`w-6 h-6 shrink-0 flex items-center justify-center rounded transition-all active:scale-95 ${isMaxReached
                              ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed bg-slate-100 dark:bg-slate-800'
                              : 'text-primary bg-primary/10 hover:bg-primary hover:text-white'
                            }`}
                          title={isMaxReached ? "Max stock reached" : "Increase quantity"}
                        >
                          <span className="material-symbols-outlined text-[10px] font-bold">add</span>
                        </button>
                      </div>

                      <div className="flex flex-col items-end min-w-[65px]">
                        <p className="font-extrabold text-[12px] text-primary tracking-tight whitespace-nowrap">
                          ₦{(prod.price * item.qty).toLocaleString('en-NG', { maximumFractionDigits: 0 })}
                        </p>
                      </div>

                      <button
                        onClick={() => updateQty(item.id, -item.qty)}
                        className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors opacity-100 md:opacity-0 group-hover:opacity-100 focus:opacity-100 ml-1"
                        title="Remove item"
                      >
                        <span className="material-symbols-outlined justify-center items-center flex text-[13px]">close</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Totals & Payment Checkout Panel */}
        <div className="bg-white dark:bg-slate-800/95 border-t border-slate-200 dark:border-slate-700/80 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] flex-shrink-0 z-10 px-4 py-3 md:px-5 lg:px-5 rounded-t-2xl sm:rounded-none mt-auto">
          {/* Subtotals & Discount */}
          <div className="space-y-1 mb-2">
            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Subtotal</span>
              <span className="text-slate-700 dark:text-slate-300">₦{subtotal.toLocaleString('en-NG', { maximumFractionDigits: 0 })}</span>
            </div>

            <div className="flex justify-between items-center text-xs group">
              <button
                onClick={() => setShowDiscountEdit(true)}
                className="flex items-center gap-1 text-slate-500 font-medium hover:text-primary transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded px-1 -ml-1 whitespace-nowrap"
              >
                Discount
                <span className="material-symbols-outlined text-[11px] opacity-50 group-hover:opacity-100 transition-opacity bg-slate-100 dark:bg-slate-700 p-0.5 rounded-[4px]">edit</span>
              </button>
              {discount > 0 ? (
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  - ₦{discount.toLocaleString('en-NG', { maximumFractionDigits: 0 })} <span className="text-[10px] opacity-75">({discountPercent}%)</span>
                </span>
              ) : (
                <span className="text-slate-400 dark:text-slate-500">₦0</span>
              )}
            </div>
          </div>

          <div className="h-px w-full bg-slate-200 dark:bg-slate-700 my-2"></div>

          {/* Grand Total */}
          <div className="flex justify-between items-end mb-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Total</span>
            <span className="font-black text-xl md:text-2xl text-slate-900 dark:text-white tracking-tight leading-none flex items-baseline">
              <span className="text-[11px] mr-1 text-slate-500 font-bold">₦</span>
              {total.toLocaleString('en-NG', { maximumFractionDigits: 0 })}
            </span>
          </div>

          {/* Payment Methods */}
          <div className="mb-3">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 md:mb-1.5">Payment Method</label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              {[
                { id: 'Cash', icon: 'payments', label: 'Cash' },
                { id: 'Card', icon: 'credit_card', label: 'Card' },
                { id: 'Transfer', icon: 'account_balance', label: 'Transfer' }
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id as any)}
                  className={`relative flex flex-col items-center justify-center py-1.5 md:py-2 rounded-lg text-xs font-bold transition-all duration-200 z-10 ${paymentMethod === method.id
                      ? 'text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                    }`}
                >
                  {paymentMethod === method.id && (
                    <div className="absolute inset-0 bg-primary rounded-lg -z-10 shadow-md shadow-primary/20"></div>
                  )}
                  <span className={`material-symbols-outlined text-base mb-0.5 ${paymentMethod === method.id ? 'opacity-100' : 'opacity-70'}`}>
                    {method.icon}
                  </span>
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          {/* Checkout Action Button */}
          <button
            onClick={handleCompleteSale}
            disabled={cart.length === 0}
            className="w-full relative group overflow-hidden bg-primary text-white py-2.5 md:py-3 rounded-xl text-sm md:text-[15px] font-bold shadow-lg shadow-primary/25 transition-all outline-none focus:ring-4 focus:ring-primary/20 disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 disabled:shadow-none disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] active:shadow-md"
          >
            {/* Glossy overlay effect for premium feel */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-20 group-active:opacity-30 bg-white transition-opacity duration-300 pointer-events-none w-full scale-x-0 group-hover:scale-x-100 origin-left ease-out"></div>

            <div className="relative flex items-center justify-center gap-2 z-10">
              <span className="material-symbols-outlined text-[17px] md:text-lg transition-transform group-hover:scale-110">shopping_bag</span>
              <span>Checkout • ₦{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </button>
        </div>
      </aside>

      {/* Print Prompt Modal */}
      {showPrintPrompt && completedTransactionId && createPortal(
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-dark p-6 rounded-3xl w-full max-w-sm shadow-2xl shadow-primary/10 overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-800 relative">
            <button onClick={handleSkipPrint} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm ring-4 ring-emerald-50 dark:ring-emerald-900/20">
                <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-3xl">check_circle</span>
              </div>
              <h3 className="text-xl font-black tracking-tight mb-2 dark:text-white text-slate-800">Sale Completed!</h3>
              <p className="text-xs text-slate-500 font-medium mb-1">Invoice <span className="text-primary font-bold">{completedTransactionId}</span></p>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl py-2 px-3 mb-5 border border-slate-100 dark:border-slate-700/50 inline-block w-full text-center mt-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-0.5">Total Paid</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">₦{completedTransactionTotal.toLocaleString('en-NG', { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handlePrintReceipt}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-transform active:scale-95 font-bold flex items-center justify-center gap-2 shadow-md shadow-primary/25 text-sm"
                >
                  <span className="material-symbols-outlined font-medium text-lg">print</span>
                  Print
                </button>
                <button
                  onClick={handleSkipPrint}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-bold text-slate-700 dark:text-slate-300 text-sm"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Print Receipt Modal */}
      {completedTransactionId && !showPrintPrompt && (
        <PrintReceipt
          transactionId={completedTransactionId}
          onClose={() => setCompletedTransactionId(null)}
        />
      )}

      {/* Discount Edit Modal */}
      {showDiscountEdit && createPortal(
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-dark p-6 sm:p-8 rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">percent</span>
              </div>
              <h3 className="text-xl font-bold dark:text-white">Edit Discount</h3>
            </div>
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-500 dark:text-slate-400">Discount Percentage (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-full px-5 py-3 text-lg font-bold border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-0 focus:border-primary dark:bg-slate-800 dark:text-white transition-colors"
              />
              <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 rounded-lg p-3 mt-4 text-center">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">Discount Amount</p>
                <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                  - ₦{(subtotal * (discountPercent / 100)).toLocaleString('en-NG', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDiscountEdit(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-bold text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowDiscountEdit(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-primary text-white hover:bg-primary/90 transition-transform active:scale-95 font-bold shadow-lg shadow-primary/25"
              >
                Apply
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Select Customer Modal */}
      <SelectCustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSelect={handleSelectCustomer}
      />

      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
      />
    </div>
  );
};

export default POS;
