
import React, { useState, useEffect } from 'react';
import { getProducts, addTransaction, addSalesItems, getNextInvoiceId } from '../services/database';
import { Product } from '../types';
import PrintReceipt from './PrintReceipt';
import SelectCustomerModal from './SelectCustomerModal';
import { useToast } from './ToastContainer';

const POS: React.FC = () => {
  const [cart, setCart] = useState<{id: string, qty: number}[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState({ name: 'Walk-in Customer', initials: 'WC', phone: 'N/A' });
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedTransactionId, setCompletedTransactionId] = useState<string | null>(null);
  const [completedTransactionTotal, setCompletedTransactionTotal] = useState<number>(0);
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Transfer'>('Cash');
  const [discountPercent, setDiscountPercent] = useState(() => {
    const saved = localStorage.getItem('posDiscountPercent');
    const parsed = saved ? Number(saved) : null;
    return (parsed !== null && !isNaN(parsed) && parsed >= 0 && parsed <= 100) ? parsed : 10;
  });
  const [showDiscountEdit, setShowDiscountEdit] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const searchDropdownRef = React.useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const { showToast } = useToast();
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

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
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
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
    setCart(prev => {
      const existing = prev.find(item => item.id === id);
      
      if (existing) {
        // Update existing item
        return prev.map(item => 
          item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item
        ).filter(item => item.qty > 0);
      } else if (delta > 0) {
        // Add new item to cart
        return [...prev, { id, qty: delta }];
      }
      
      return prev;
    });
  };

  const handleCompleteSale = async () => {
      if (cart.length === 0) {
        showToast('Cart is empty! Add items to complete sale.', 'warning');
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
        const invoiceId = await getNextInvoiceId();
        
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
          paymentMethod: paymentMethod
        });

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
        
        await addSalesItems(invoiceId, salesItems);

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

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.generic.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900/20 p-4 overflow-y-auto overflow-x-hidden">
        {/* Search Bar - Always visible, with dropdown on mobile */}
        <div className="relative mb-2 lg:mb-4 z-30" ref={searchDropdownRef}>
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
            className="block w-full pl-12 pr-14 py-4 text-lg bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-primary focus:border-primary transition-all placeholder:text-slate-400 shadow-sm" 
            placeholder="Scan barcode or type medicine name..." 
            type="text"
          />
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <button 
              onClick={() => searchInputRef.current?.focus()}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-primary transition-colors"
              title="Click to scan barcode"
            >
              <span className="material-symbols-outlined text-3xl">barcode_scanner</span>
            </button>
          </div>

          {/* Mobile Search Results Dropdown */}
          {showSearchDropdown && filteredProducts.length > 0 && (
            <div className="lg:hidden fixed left-4 right-4 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-[60vh] overflow-y-auto z-50">
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
                    className={`w-full p-4 border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left ${
                      inCart ? 'bg-primary/5' : ''
                    } ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm dark:text-white mb-1">{prod.name}</h4>
                        <p className="text-xs text-slate-500 mb-2">{prod.generic}</p>
                        <div className="flex items-center gap-3">
                          <span className="text-primary font-bold text-base">₦{prod.price.toFixed(2)}</span>
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            isOutOfStock 
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                              : isLowStock 
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            {isOutOfStock ? 'Out of Stock' : `${prod.totalUnits} in stock`}
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
            <div className="lg:hidden fixed left-4 right-4 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-6 text-center z-50">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">search_off</span>
              <p className="text-sm text-slate-500">No medicines found</p>
              <p className="text-xs text-slate-400 mt-1">Try a different search term</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold flex items-center gap-2 dark:text-white hidden lg:flex">
            <span className="material-symbols-outlined text-primary">inventory_2</span>
            Available Medicines
          </h2>
        </div>

        {/* Products Table - Desktop Only */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hidden lg:block">
          <div className="overflow-x-auto max-h-[calc(100vh-300px)]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Medicine</th>
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
                          <p className="font-semibold text-xs dark:text-white leading-tight">{prod.name}</p>
                          <p className="text-[10px] text-slate-500 italic leading-tight">{prod.generic}</p>
                        </td>
                        <td className="px-2 py-2">
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 whitespace-nowrap">
                            {prod.category}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <span className="text-primary font-bold text-xs">₦{prod.price.toFixed(2)}</span>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            isOutOfStock 
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
                              className={`px-2 py-1 rounded-md font-medium text-[10px] transition-all inline-flex items-center gap-1 ${
                                inCart 
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
                    className={`px-2 py-1 rounded text-xs font-medium ${
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
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cart Sidebar */}
      <aside className="w-full lg:w-[400px] flex flex-col bg-white dark:bg-surface-dark border-l border-slate-200 dark:border-slate-800 shadow-2xl relative z-10 max-h-screen lg:max-h-none">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest text-xs">Customer Details</h3>
            <button 
              onClick={handleAddCustomer}
              className="text-primary flex items-center gap-1 text-sm font-bold hover:underline"
            >
              <span className="material-symbols-outlined text-sm">person_add</span> New
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">{selectedCustomer.initials}</div>
              <div>
                <p className="text-sm font-bold leading-none">{selectedCustomer.name}</p>
                <p className="text-xs text-slate-500 mt-1">{selectedCustomer.phone}</p>
              </div>
            </div>
            <button 
              onClick={handleRemoveCustomer}
              className="text-slate-400 hover:text-red-500 transition-colors"
            >
              <span className="material-symbols-outlined">cancel</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider px-1">
            <span>Product</span>
            <span>Subtotal</span>
          </div>
          
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300 mb-2">shopping_cart</span>
              <p className="text-sm text-slate-500">Cart is empty</p>
              <p className="text-xs text-slate-400 mt-1">Add items to get started</p>
            </div>
          ) : (
            cart.map((item) => {
            const prod = products.find(p => p.id === item.id);
            if (!prod) return null;
            return (
              <div key={item.id} className="group flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs truncate">{prod.name}</p>
                  <p className="text-[10px] text-slate-500">₦{prod.price.toFixed(2)} × {item.qty}</p>
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-0.5 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700">
                    <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
                      <span className="material-symbols-outlined text-sm">remove</span>
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          setCart(prev => prev.map(cartItem => 
                            cartItem.id === item.id ? { ...cartItem, qty: '' as any } : cartItem
                          ));
                        } else {
                          const newQty = parseInt(value);
                          if (!isNaN(newQty) && newQty > 0) {
                            const prod = products.find(p => p.id === item.id);
                            if (prod && newQty <= prod.totalUnits) {
                              setCart(prev => prev.map(cartItem => 
                                cartItem.id === item.id ? { ...cartItem, qty: newQty } : cartItem
                              ));
                            }
                          }
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '' || parseInt(e.target.value) < 1) {
                          setCart(prev => prev.map(cartItem => 
                            cartItem.id === item.id ? { ...cartItem, qty: 1 } : cartItem
                          ));
                        }
                      }}
                      className="w-12 min-w-[3rem] text-center text-xs font-bold bg-transparent border-none outline-none dark:text-white"
                    />
                    <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 rounded transition-colors">
                      <span className="material-symbols-outlined text-sm">add</span>
                    </button>
                  </div>
                  <p className="font-bold text-xs text-primary w-16 text-right">₦{(prod.price * item.qty).toFixed(2)}</p>
                  <button onClick={() => updateQty(item.id, -item.qty)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </div>
            );
          })
          )}
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 space-y-3 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] flex-shrink-0">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span>
              <span>₦{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <button 
                onClick={() => setShowDiscountEdit(true)}
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                Discount <span className="material-symbols-outlined text-xs">edit</span>
              </button>
              <span className="text-green-600 dark:text-green-400">-₦{discount.toFixed(2)} ({discountPercent}%)</span>
            </div>
            <div className="flex justify-between items-end pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="font-bold text-lg">Total</span>
              <span className="font-extrabold text-3xl text-primary">₦{total.toFixed(2)}</span>
            </div>
          </div>
          
          {/* Payment Method Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentMethod('Cash')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  paymentMethod === 'Cash'
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-primary'
                }`}
              >
                <span className="material-symbols-outlined text-sm block mb-0.5">payments</span>
                Cash
              </button>
              <button
                onClick={() => setPaymentMethod('Card')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  paymentMethod === 'Card'
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-primary'
                }`}
              >
                <span className="material-symbols-outlined text-sm block mb-0.5">credit_card</span>
                Card
              </button>
              <button
                onClick={() => setPaymentMethod('Transfer')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  paymentMethod === 'Transfer'
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-primary'
                }`}
              >
                <span className="material-symbols-outlined text-sm block mb-0.5">swap_horiz</span>
                Transfer
              </button>
            </div>
          </div>
          
          <button 
            onClick={handleCompleteSale}
            disabled={cart.length === 0}
            className="w-full bg-primary hover:bg-primary/90 text-white py-4 lg:py-5 rounded-2xl text-lg lg:text-xl font-bold shadow-xl shadow-primary/20 transition-transform active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">shopping_cart_checkout</span>
            Complete Sale
          </button>
        </div>
      </aside>

      {/* Print Prompt Modal */}
      {showPrintPrompt && completedTransactionId && (
        <div className="modal-overlay bg-black/50 flex items-center justify-center">
          <div className="modal-content bg-white dark:bg-surface-dark p-8 rounded-xl max-w-md mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-4xl">check_circle</span>
              </div>
              <h3 className="text-2xl font-bold mb-2 dark:text-white">Sale Completed!</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-2">Invoice: {completedTransactionId}</p>
              <p className="text-slate-600 dark:text-slate-400 mb-6">Total: ₦{completedTransactionTotal.toFixed(2)}</p>
              <div className="flex gap-3">
                <button
                  onClick={handleSkipPrint}
                  className="flex-1 px-6 py-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
                >
                  Skip
                </button>
                <button
                  onClick={handlePrintReceipt}
                  className="flex-1 px-6 py-3 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">print</span>
                  Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Receipt Modal */}
      {completedTransactionId && !showPrintPrompt && (
        <PrintReceipt
          transactionId={completedTransactionId}
          onClose={() => setCompletedTransactionId(null)}
        />
      )}

      {/* Discount Edit Modal */}
      {showDiscountEdit && (
        <div className="modal-overlay bg-black/50 flex items-center justify-center">
          <div className="modal-content bg-white dark:bg-surface-dark p-6 rounded-xl max-w-sm mx-4 w-full">
            <h3 className="text-lg font-bold mb-4 dark:text-white">Edit Discount</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 dark:text-slate-300">Discount Percentage</label>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white"
              />
              <p className="text-xs text-slate-500 mt-2">
                Discount amount: ₦{(subtotal * (discountPercent / 100)).toFixed(2)}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDiscountEdit(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowDiscountEdit(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-medium"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select Customer Modal */}
      <SelectCustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSelect={handleSelectCustomer}
      />
    </div>
  );
};

export default POS;
