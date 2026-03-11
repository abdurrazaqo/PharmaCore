import React, { useState, useEffect } from 'react';
import BarcodeScanner from './BarcodeScanner';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (product: any) => void;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    name: '',
    generic: '',
    category: 'Antibiotics',
    batchNo: '',
    barcode: '',
    expiryDate: '',
    totalUnits: '',
    costPrice: '',
    price: '',
  });
  
  const [profitMargin, setProfitMargin] = useState(() => {
    const saved = localStorage.getItem('defaultProfitMargin');
    return saved ? Number(saved) : 30;
  });

  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('productCategories');
    return saved ? JSON.parse(saved) : ['Antibiotics', 'Painkillers', 'Cardiovascular', 'Respiratory', 'Diabetes', 'Gastrointestinal'];
  });

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [showBarcodeInput, setShowBarcodeInput] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('defaultProfitMargin', profitMargin.toString());
  }, [profitMargin]);

  useEffect(() => {
    localStorage.setItem('productCategories', JSON.stringify(categories));
  }, [categories]);

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      const updatedCategories = [...categories, newCategory.trim()];
      setCategories(updatedCategories);
      setFormData({...formData, category: newCategory.trim()});
      setNewCategory('');
      setShowAddCategory(false);
    }
  };

  useEffect(() => {
    if (formData.costPrice && profitMargin > 0) {
      const cost = parseFloat(formData.costPrice);
      if (!isNaN(cost) && cost > 0) {
        const sellingPrice = cost / (1 - profitMargin / 100);
        setFormData(prev => ({ ...prev, price: sellingPrice.toFixed(2) }));
      }
    }
  }, [formData.costPrice, profitMargin]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const productData: any = {
      name: formData.name,
      generic: formData.generic,
      category: formData.category,
      batchNo: formData.batchNo,
      expiryDate: formData.expiryDate,
      totalUnits: parseInt(formData.totalUnits),
      lastRestockQuantity: parseInt(formData.totalUnits),
      costPrice: parseFloat(formData.costPrice),
      price: parseFloat(formData.price),
      stockLevel: 100,
      expiryMonthsLeft: 'New',
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop'
    };
    
    onAdd(productData);
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

  return (
    <div className="modal-overlay bg-black/50 flex items-center justify-center p-4">
      <div className="modal-content bg-white dark:bg-surface-dark rounded-2xl w-full max-w-3xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <span className="material-symbols-outlined text-primary text-xl">medication</span>
            </div>
            <h3 className="text-lg font-bold dark:text-white">Add New Medicine</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* LEFT COLUMN - Product Information */}
              <div className="space-y-3">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">info</span>
                    Product Information
                  </h4>
                  
                  {/* Medicine Name */}
                  <div>
                    <label className="block text-xs font-semibold mb-1 dark:text-white">Medicine Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-800 dark:text-white"
                      placeholder="e.g., Amoxicillin 500mg"
                    />
                  </div>

                  {/* Generic Name */}
                  <div>
                    <label className="block text-xs font-semibold mb-1 dark:text-white">Generic Name</label>
                    <input
                      type="text"
                      required
                      value={formData.generic}
                      onChange={(e) => setFormData({...formData, generic: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-800 dark:text-white"
                      placeholder="e.g., Amoxicillin Trihydrate"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-semibold mb-1 dark:text-white">Category</label>
                    {showAddCategory ? (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                          className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-800 dark:text-white"
                          placeholder="New category"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleAddCategory}
                          className="px-2.5 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shrink-0"
                        >
                          <span className="material-symbols-outlined text-base">check</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {setShowAddCategory(false); setNewCategory('');}}
                          className="px-2.5 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors shrink-0"
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({...formData, category: e.target.value})}
                          className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-800 dark:text-white"
                        >
                          {categories.map(cat => (
                            <option key={cat}>{cat}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowAddCategory(true)}
                          className="px-2.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
                          title="Add category"
                        >
                          <span className="material-symbols-outlined text-base">add</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Batch Number & Expiry Date */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold mb-1 dark:text-white">Batch No.</label>
                      <input
                        type="text"
                        required
                        value={formData.batchNo}
                        onChange={(e) => setFormData({...formData, batchNo: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-800 dark:text-white"
                        placeholder="B4567"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 dark:text-white">Expiry Date</label>
                      <input
                        type="date"
                        required
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Barcode Scanner */}
                  <div>
                    <label className="block text-xs font-semibold mb-1 dark:text-white flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                      Barcode (Optional)
                    </label>
                    {!showBarcodeInput && !formData.barcode ? (
                      <button
                        type="button"
                        onClick={handleBarcodeClick}
                        className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 group"
                      >
                        <span className="material-symbols-outlined text-2xl text-slate-400 group-hover:text-primary transition-colors">barcode_scanner</span>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors">Scan Barcode</span>
                      </button>
                    ) : (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={formData.barcode}
                          onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                          className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-800 dark:text-white"
                          placeholder="Enter barcode"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleBarcodeClick}
                          className="px-2.5 py-2 text-primary hover:text-primary/80 transition-colors"
                          title="Scan again"
                        >
                          <span className="material-symbols-outlined text-base">barcode_scanner</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {setFormData({...formData, barcode: ''}); setShowBarcodeInput(false);}}
                          className="px-2.5 py-2 text-slate-400 hover:text-red-500 transition-colors"
                          title="Clear"
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN - Inventory & Pricing */}
              <div className="flex flex-col space-y-3">

                {/* Inventory & Pricing Combined */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl flex flex-col flex-1 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">payments</span>
                    Inventory & Pricing
                  </h4>
                  
                  <div>
                    <label className="block text-xs font-semibold mb-1 dark:text-white">Total Units</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.totalUnits}
                      onChange={(e) => setFormData({...formData, totalUnits: e.target.value})}
                      className="w-28 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-800 dark:text-white"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 dark:text-white">Cost Price (₦)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({...formData, costPrice: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-800 dark:text-white"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 dark:text-white">Selling Price (₦)</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                        className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-800 dark:text-white"
                        placeholder="0.00"
                      />
                      <div className="flex items-center gap-0.5 px-2 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shrink-0">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={profitMargin}
                          onChange={(e) => setProfitMargin(Number(e.target.value))}
                          className="w-8 px-0 text-xs text-center border-0 bg-transparent focus:ring-0 dark:text-white"
                          title="Profit Margin %"
                        />
                        <span className="text-[10px] text-slate-500">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Profit Preview */}
                  {formData.costPrice && formData.price && (
                    <div className="bg-primary/10 dark:bg-primary/20 p-2.5 rounded-lg">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400">Profit/unit:</span>
                        <span className="font-bold text-primary">
                          ₦{(parseFloat(formData.price) - parseFloat(formData.costPrice)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Spacer to push buttons down */}
                  <div className="flex-1"></div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors dark:text-white text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 text-sm"
                    >
                      <span className="material-symbols-outlined text-lg">add</span>
                      Add Medicine
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <BarcodeScanner 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
      />
    </div>
  );
};

export default AddProductModal;
