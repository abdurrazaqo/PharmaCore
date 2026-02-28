import React, { useState, useEffect } from 'react';

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
    onAdd({
      ...formData,
      totalUnits: parseInt(formData.totalUnits),
      lastRestockQuantity: parseInt(formData.totalUnits),
      costPrice: parseFloat(formData.costPrice),
      price: parseFloat(formData.price),
      stockLevel: 100,
      expiryMonthsLeft: 'New',
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop'
    });
    onClose();
  };

  return (
    <div className="modal-overlay bg-black/50 flex items-center justify-center p-4">
      <div className="modal-content bg-white dark:bg-surface-dark rounded-2xl max-w-4xl w-full">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-xl font-bold dark:text-white">Add New Medicine</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5">
          {/* Row 1: Medicine Name, Generic Name, Category */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5 dark:text-white">Medicine Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white"
                placeholder="e.g., Amoxicillin 500mg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 dark:text-white">Generic Name</label>
              <input
                type="text"
                required
                value={formData.generic}
                onChange={(e) => setFormData({...formData, generic: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white"
                placeholder="e.g., Amoxicillin Trihydrate"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 dark:text-white">Category</label>
              {showAddCategory ? (
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white"
                    placeholder="New category name"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">check</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {setShowAddCategory(false); setNewCategory('');}}
                    className="px-3 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white"
                  >
                    {categories.map(cat => (
                      <option key={cat}>{cat}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddCategory(true)}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Add new category"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Batch Number, Barcode, Total Units */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5 dark:text-white">Batch Number</label>
              <input
                type="text"
                required
                value={formData.batchNo}
                onChange={(e) => setFormData({...formData, batchNo: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white"
                placeholder=""
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 dark:text-white">Barcode (Optional)</label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white"
                placeholder="Scan or enter"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 dark:text-white">Total Units</label>
              <input
                type="number"
                required
                min="1"
                value={formData.totalUnits}
                onChange={(e) => setFormData({...formData, totalUnits: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white"
                placeholder=""
              />
            </div>
          </div>

          {/* Row 3: Expiry Date, Cost Price, Selling Price with Margin */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 dark:text-white">Expiry Date</label>
              <input
                type="date"
                required
                value={formData.expiryDate}
                onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 dark:text-white">Cost Price (₦)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.costPrice}
                onChange={(e) => setFormData({...formData, costPrice: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white"
                placeholder=""
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 dark:text-white">Selling Price (₦)</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  className="flex-1 min-w-0 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white"
                  placeholder=""
                />
                <div className="flex items-center gap-0.5 px-1 py-1 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shrink-0">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={profitMargin}
                    onChange={(e) => setProfitMargin(Number(e.target.value))}
                    className="w-7 px-0 text-[11px] text-center border-0 bg-transparent focus:ring-0 dark:text-white"
                    title="Profit Margin %"
                  />
                  <span className="text-[10px] text-slate-500">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
            >
              Add Medicine
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductModal;
