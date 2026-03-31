import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Product } from '../types';
import BarcodeScanner from './BarcodeScanner';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Product>) => void;
  product: Product | null;
  categories: string[];
  setCategories: (categories: string[]) => void;
  dosageForms: string[];
  setDosageForms: (forms: string[]) => void;
  units: string[];
  setUnits: (units: string[]) => void;
}

const EditProductModal: React.FC<EditProductModalProps> = ({ 
  isOpen, onClose, onUpdate, product,
  categories, setCategories, 
  dosageForms, setDosageForms, 
  units, setUnits 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    brandName: '',
    category: '',
    dosageForm: '',
    strength: '',
    unit: 'Unit',
    batchNo: '',
    barcode: '',
    manufacturingDate: '',
    expiryDate: '',
    totalUnits: '',
    costPrice: '',
    price: '',
  });

  const [profitMargin, setProfitMargin] = useState(30);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [showAddDosageForm, setShowAddDosageForm] = useState(false);
  const [newDosageForm, setNewDosageForm] = useState('');
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnit, setNewUnit] = useState('');
  const [showBarcodeInput, setShowBarcodeInput] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    if (product && isOpen) {
      setFormData({
        name: product.name,
        brandName: product.brandName || '',
        category: product.category,
        dosageForm: product.dosageForm || '',
        strength: product.strength || '',
        unit: product.unit || 'Unit',
        batchNo: product.batchNo,
        barcode: product.barcode || '',
        manufacturingDate: product.manufacturingDate || '',
        expiryDate: product.expiryDate,
        totalUnits: product.totalUnits.toString(),
        costPrice: product.costPrice?.toString() || '',
        price: product.price?.toString() || '',
      });
      setShowBarcodeInput(!!product.barcode);

      // Default margin init
      if (product.costPrice && product.price) {
        const margin = ((product.price - product.costPrice) / product.costPrice) * 100;
        setProfitMargin(margin >= 0 ? Math.round(margin) : 0);
      } else {
        const saved = localStorage.getItem('defaultProfitMargin');
        setProfitMargin(saved ? Number(saved) : 30);
      }
    }
  }, [product, isOpen]);

  // Sync initial state if props change when closed
  useEffect(() => {
    if (!isOpen && categories.length > 0 && formData.category === '') {
      setFormData(prev => ({
        ...prev,
        category: categories[0]
      }));
    }
  }, [categories, isOpen, formData.category]);

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()]);
      setFormData({...formData, category: newCategory.trim()});
      setNewCategory('');
      setShowAddCategory(false);
    }
  };

  const handleAddDosageForm = () => {
    if (newDosageForm.trim() && !dosageForms.includes(newDosageForm.trim())) {
      setDosageForms([...dosageForms, newDosageForm.trim()]);
      setFormData({...formData, dosageForm: newDosageForm.trim()});
      setNewDosageForm('');
      setShowAddDosageForm(false);
    }
  };

  const handleAddUnit = () => {
    if (newUnit.trim() && !units.includes(newUnit.trim())) {
      setUnits([...units, newUnit.trim()]);
      setFormData({...formData, unit: newUnit.trim()});
      setNewUnit('');
      setShowAddUnit(false);
    }
  };

  const handleCostPriceChange = (val: string) => {
    const cost = parseFloat(val);
    setFormData(prev => {
      if (!isNaN(cost) && cost > 0) {
        const sellingPrice = cost * (1 + profitMargin / 100);
        return { ...prev, costPrice: val, price: sellingPrice.toFixed(2) };
      }
      return { ...prev, costPrice: val };
    });
  };

  const handleProfitMarginChange = (val: number) => {
    setProfitMargin(val);
    const cost = parseFloat(formData.costPrice);
    if (!isNaN(cost) && cost > 0) {
      const sellingPrice = cost * (1 + val / 100);
      setFormData(prev => ({ ...prev, price: sellingPrice.toFixed(2) }));
    }
  };

  const handlePriceChange = (val: string) => {
    const priceNum = parseFloat(val);
    const costNum = parseFloat(formData.costPrice);
    setFormData(prev => ({ ...prev, price: val }));
    
    if (!isNaN(costNum) && !isNaN(priceNum) && costNum > 0) {
      const margin = ((priceNum - costNum) / costNum) * 100;
      setProfitMargin(Math.round(margin));
    }
  };

  if (!isOpen || !product) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let updates: Partial<Product> = {
      name: formData.name,
      brandName: formData.brandName || undefined,
      category: formData.category,
      dosageForm: formData.dosageForm || undefined,
      strength: formData.strength || undefined,
      unit: formData.unit || 'Unit',
      batchNo: formData.batchNo,
      manufacturingDate: formData.manufacturingDate || undefined,
      expiryDate: formData.expiryDate,
      costPrice: parseFloat(formData.costPrice),
      price: parseFloat(formData.price)
    };

    if (formData.barcode || product.barcode) {
      updates.barcode = formData.barcode;
    }

    const newUnits = parseInt(formData.totalUnits);
    if (newUnits !== product.totalUnits) {
      updates.totalUnits = newUnits;
      updates.lastRestockQuantity = newUnits;
    }

    onUpdate(product.id, updates);
    onClose();
  };

  const handleBarcodeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsScannerOpen(true);
  };

  const handleBarcodeScan = (barcode: string) => {
    setFormData({...formData, barcode});
    setShowBarcodeInput(true);
  };

  const SectionHeader = ({ icon, title }: { icon: string, title: string }) => (
    <h4 className="text-sm font-bold tracking-wide text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-3 border-b border-slate-200 dark:border-slate-700 pb-1.5">
      <span className="material-symbols-outlined text-primary text-lg">{icon}</span>
      {title}
    </h4>
  );

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-surface-dark rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-inner">
              <span className="material-symbols-outlined text-xl">edit_document</span>
            </div>
            <div>
              <h3 className="text-xl font-bold dark:text-white leading-tight">Edit "{product.name}"</h3>
              <p className="text-xs text-slate-500 font-medium tracking-wide">Update product details or adjust inventory quantities</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        {/* Form Content */}
        <form id="edit-product-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 custom-scrollbar p-4 sm:p-5 bg-slate-50/50 dark:bg-surface-dark">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 align-start">
            
            {/* COLUMN 1 */}
            <div className="space-y-4">
              
              {/* Section 1: Basic Information */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <SectionHeader icon="info" title="Basic Information" />
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Item Name <span className="text-rose-500">*</span></label>
                    <input
                      type="text" required value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-slate-900 dark:text-white transition-all shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Brand Name</label>
                    <input
                      type="text" value={formData.brandName}
                      onChange={(e) => setFormData({...formData, brandName: e.target.value})}
                      className="w-full px-4 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-slate-900 dark:text-white transition-all shadow-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Category <span className="text-rose-500">*</span></label>
                      {showAddCategory ? (
                        <div className="flex gap-1">
                          <input
                            type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                            className="flex-1 w-full px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-900"
                            autoFocus
                          />
                          <button type="button" onClick={handleAddCategory} className="px-3 bg-primary text-white rounded-lg"><span className="material-symbols-outlined text-sm">check</span></button>
                          <button type="button" onClick={() => setShowAddCategory(false)} className="px-3 bg-slate-200 dark:bg-slate-700 rounded-lg"><span className="material-symbols-outlined text-sm">close</span></button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <select required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="flex-1 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-900 dark:text-white">
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <button type="button" onClick={() => setShowAddCategory(true)} className="px-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-primary hover:bg-primary/10 transition-colors"><span className="material-symbols-outlined text-lg">add</span></button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Dosage Form</label>
                      {showAddDosageForm ? (
                        <div className="flex gap-1">
                          <input
                            type="text" value={newDosageForm} onChange={(e) => setNewDosageForm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDosageForm())}
                            className="flex-1 w-full px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-900"
                            autoFocus
                          />
                          <button type="button" onClick={handleAddDosageForm} className="px-3 bg-primary text-white rounded-lg"><span className="material-symbols-outlined text-sm">check</span></button>
                          <button type="button" onClick={() => setShowAddDosageForm(false)} className="px-3 bg-slate-200 dark:bg-slate-700 rounded-lg"><span className="material-symbols-outlined text-sm">close</span></button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <select value={formData.dosageForm} onChange={(e) => setFormData({...formData, dosageForm: e.target.value})} className="flex-1 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-900 dark:text-white">
                            <option value="">(None)</option>
                            {dosageForms.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                          <button type="button" onClick={() => setShowAddDosageForm(true)} className="px-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-primary hover:bg-primary/10 transition-colors"><span className="material-symbols-outlined text-lg">add</span></button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Strength / Concentration</label>
                    <input
                      type="text" value={formData.strength}
                      onChange={(e) => setFormData({...formData, strength: e.target.value})}
                      className="w-full px-4 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-slate-900 dark:text-white transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* COLUMN 2 */}
            <div className="space-y-4">

              {/* Section 2: Inventory Tracking */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <SectionHeader icon="inventory_2" title="Inventory Tracking" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Total Quantity <span className="text-rose-500">*</span></label>
                    <input
                      type="number" required min="1" value={formData.totalUnits}
                      onChange={(e) => setFormData({...formData, totalUnits: e.target.value})}
                      className="w-full px-4 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-slate-900 dark:text-white transition-all font-bold shadow-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Unit of Measure <span className="text-rose-500">*</span></label>
                    {showAddUnit ? (
                      <div className="flex gap-1">
                        <input
                          type="text" value={newUnit} onChange={(e) => setNewUnit(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddUnit())}
                          className="flex-1 w-full px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-900"
                          autoFocus
                        />
                        <button type="button" onClick={handleAddUnit} className="px-3 bg-primary text-white rounded-lg"><span className="material-symbols-outlined text-sm">check</span></button>
                        <button type="button" onClick={() => setShowAddUnit(false)} className="px-3 bg-slate-200 dark:bg-slate-700 rounded-lg"><span className="material-symbols-outlined text-sm">close</span></button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <select required value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})} className="flex-1 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-900 dark:text-white">
                          {units.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <button type="button" onClick={() => setShowAddUnit(true)} className="px-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-primary hover:bg-primary/10 transition-colors"><span className="material-symbols-outlined text-lg">add</span></button>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Batch Number <span className="text-rose-500">*</span></label>
                    <input
                      type="text" required value={formData.batchNo}
                      onChange={(e) => setFormData({...formData, batchNo: e.target.value})}
                      className="w-full px-4 py-1.5 text-sm font-mono border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-slate-900 dark:text-white transition-all shadow-sm uppercase"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Manufacturing Date</label>
                    <input
                      type="date" value={formData.manufacturingDate}
                      onChange={(e) => setFormData({...formData, manufacturingDate: e.target.value})}
                      className="w-full px-4 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-slate-900 dark:text-white transition-all"
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 text-rose-500">Expiry Date <span className="text-rose-500">*</span></label>
                    <input
                      type="date" required value={formData.expiryDate}
                      onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                      className="w-full px-4 py-1.5 text-sm border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-900/10 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-white transition-all shadow-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Barcode</label>
                    {!showBarcodeInput && !formData.barcode ? (
                      <button type="button" onClick={handleBarcodeClick} className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-slate-500 hover:text-primary">
                        <span className="material-symbols-outlined text-xl">barcode_scanner</span>
                        <span className="text-sm font-medium">Scan or Enter Barcode</span>
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text" value={formData.barcode} onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                          className="flex-1 w-full px-4 py-1.5 text-sm font-mono border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-900 dark:text-white shadow-sm"
                          autoFocus
                        />
                        <button type="button" onClick={handleBarcodeClick} className="px-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-primary hover:bg-primary/10 transition-colors shadow-sm"><span className="material-symbols-outlined">barcode_scanner</span></button>
                        <button type="button" onClick={() => {setFormData({...formData, barcode: ''}); setShowBarcodeInput(false);}} className="px-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors shadow-sm"><span className="material-symbols-outlined">delete</span></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: Pricing */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 p-4 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-800/30">
                <h4 className="text-sm font-bold tracking-wide text-emerald-800 dark:text-emerald-400 flex items-center gap-2 mb-3 border-b border-emerald-200/50 dark:border-emerald-800/30 pb-1.5">
                  <span className="material-symbols-outlined text-lg">payments</span>
                  Pricing Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Cost Price <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-slate-400">₦</span>
                      <input
                        type="number" required min="0" step="0.01" value={formData.costPrice}
                        onChange={(e) => handleCostPriceChange(e.target.value)}
                        className="w-full pl-8 pr-4 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:bg-slate-900 dark:text-white transition-all font-bold shadow-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 flex justify-between">
                      <span>Selling Price <span className="text-rose-500">*</span></span>
                      <div className="flex items-center gap-1 group">
                        <span className="text-[10px] text-slate-400 font-normal">Margin:</span>
                        <input
                          type="number" min="0" max="100" step="1" value={profitMargin}
                          onChange={(e) => handleProfitMarginChange(Number(e.target.value))}
                          className="w-8 p-0 text-[10px] text-emerald-600 font-bold bg-transparent border-b border-emerald-200 focus:ring-0 text-center"
                        />
                        <span className="text-[10px] text-slate-400">%</span>
                      </div>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-slate-400">₦</span>
                      <input
                        type="number" required min="0" step="0.01" value={formData.price}
                        onChange={(e) => handlePriceChange(e.target.value)}
                        className="w-full pl-8 pr-4 py-1.5 text-sm border border-emerald-200 dark:border-emerald-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:bg-slate-900 dark:text-white transition-all font-bold text-emerald-700 dark:text-emerald-400 shadow-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
                
                {formData.costPrice && formData.price && (parseFloat(formData.price) > parseFloat(formData.costPrice)) && (
                  <p className="text-xs text-right mt-2 text-emerald-600 dark:text-emerald-400 font-medium">
                    +₦{(parseFloat(formData.price) - parseFloat(formData.costPrice)).toFixed(2)} unit profit
                  </p>
                )}
              </div>

            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-dark flex gap-3 justify-end shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 sticky bottom-0">
          <button
            type="button" onClick={onClose}
            className="px-6 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            type="submit" form="edit-product-form"
            className="px-8 py-1.5 bg-gradient-to-r from-primary to-teal-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-[0.98] flex items-center gap-2 border border-primary/20"
          >
            <span className="material-symbols-outlined text-xl">save</span>
            Update Product
          </button>
        </div>

      </div>

      <BarcodeScanner 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
      />
    </div>,
    document.body
  );
};

export default EditProductModal;
