import React, { useState, useEffect } from 'react';
import { Product } from '../types';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, product: Partial<Product>) => void;
  product: Product | null;
}

const EditProductModal: React.FC<EditProductModalProps> = ({ isOpen, onClose, onUpdate, product }) => {
  const [formData, setFormData] = useState({
    name: '',
    generic: '',
    category: 'Antibiotics',
    batchNo: '',
    expiryDate: '',
    totalUnits: '',
    price: '',
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        generic: product.generic,
        category: product.category,
        batchNo: product.batchNo,
        expiryDate: product.expiryDate,
        totalUnits: product.totalUnits.toString(),
        price: product.price.toString(),
      });
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTotalUnits = parseInt(formData.totalUnits);
    const updates: Partial<Product> = {
      name: formData.name,
      generic: formData.generic,
      category: formData.category,
      batchNo: formData.batchNo,
      expiryDate: formData.expiryDate,
      totalUnits: newTotalUnits,
      price: parseFloat(formData.price),
      stockLevel: 100,
      expiryMonthsLeft: 'Updated',
    };
    
    // If stock increased, update lastRestockQuantity
    if (product && newTotalUnits > product.totalUnits) {
      updates.lastRestockQuantity = newTotalUnits;
    }
    
    onUpdate(product.id, updates);
    onClose();
  };

  return (
    <div 
      className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center p-4" 
      style={{ 
        zIndex: 99999, 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh'
      }}
    >
      <div className="bg-white dark:bg-surface-dark rounded-2xl max-w-4xl w-full relative" style={{ zIndex: 100000 }}>
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-xl font-bold dark:text-white">Edit Medicine</h3>
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
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white"
              >
                <option>Antibiotics</option>
                <option>Painkillers</option>
                <option>Cardiovascular</option>
                <option>Respiratory</option>
                <option>Diabetes</option>
                <option>Gastrointestinal</option>
                <option>Antihistamine</option>
              </select>
            </div>
          </div>

          {/* Row 2: Batch Number, Expiry Date, Total Units */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5 dark:text-white">Batch Number</label>
              <input
                type="text"
                required
                value={formData.batchNo}
                onChange={(e) => setFormData({...formData, batchNo: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white"
                placeholder="BATCH-2024-XXX"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 dark:text-white">Expiry Date</label>
              <input
                type="text"
                required
                value={formData.expiryDate}
                onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white"
                placeholder="12 Oct 2025"
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
                placeholder="100"
              />
            </div>
          </div>

          {/* Row 3: Price */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 dark:text-white">Selling Price (₦)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white"
                placeholder="1250.00"
              />
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
              Update Medicine
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal;
