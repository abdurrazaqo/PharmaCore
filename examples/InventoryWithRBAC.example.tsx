/**
 * EXAMPLE: How to add RBAC to the Inventory component
 * 
 * This shows how to:
 * 1. Use PermissionGate to hide/show UI elements
 * 2. Add audit logging to actions
 * 3. Check permissions before operations
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions, Permission } from '../hooks/usePermissions';
import { auditLog, AuditAction } from '../services/auditLog';
import PermissionGate from '../components/PermissionGate';

const InventoryWithRBAC: React.FC = () => {
  const { profile } = useAuth();
  const { hasPermission } = usePermissions();
  const [products, setProducts] = useState([]);

  // Example: Add product with permission check and audit log
  const handleAddProduct = async (product: any) => {
    // Check permission before proceeding
    if (!hasPermission(Permission.CREATE_PRODUCTS)) {
      alert('You do not have permission to create products');
      return;
    }

    try {
      // Create product in database
      const newProduct = await createProduct(product);
      setProducts([...products, newProduct]);

      // Log the action
      await auditLog.log({
        tenantId: profile!.tenant_id,
        action: AuditAction.PRODUCT_CREATED,
        resourceType: 'product',
        resourceId: newProduct.id,
        newValues: newProduct,
        metadata: {
          source: 'inventory_page',
        },
      });

      alert('Product created successfully');
    } catch (error) {
      console.error('Failed to create product:', error);
      alert('Failed to create product');
    }
  };

  // Example: Edit product with audit log
  const handleEditProduct = async (productId: string, updates: any) => {
    if (!hasPermission(Permission.EDIT_PRODUCTS)) {
      alert('You do not have permission to edit products');
      return;
    }

    try {
      const oldProduct = products.find(p => p.id === productId);
      const updatedProduct = await updateProduct(productId, updates);

      setProducts(products.map(p => 
        p.id === productId ? updatedProduct : p
      ));

      // Log with old and new values
      await auditLog.log({
        tenantId: profile!.tenant_id,
        action: AuditAction.PRODUCT_UPDATED,
        resourceType: 'product',
        resourceId: productId,
        oldValues: oldProduct,
        newValues: updatedProduct,
      });

      alert('Product updated successfully');
    } catch (error) {
      console.error('Failed to update product:', error);
      alert('Failed to update product');
    }
  };

  // Example: Delete product with audit log
  const handleDeleteProduct = async (productId: string) => {
    if (!hasPermission(Permission.DELETE_PRODUCTS)) {
      alert('You do not have permission to delete products');
      return;
    }

    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const product = products.find(p => p.id === productId);
      await deleteProduct(productId);

      setProducts(products.filter(p => p.id !== productId));

      // Log deletion
      await auditLog.log({
        tenantId: profile!.tenant_id,
        action: AuditAction.PRODUCT_DELETED,
        resourceType: 'product',
        resourceId: productId,
        oldValues: product,
      });

      alert('Product deleted successfully');
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Failed to delete product');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventory</h1>
        
        {/* Only show Add Product button if user has permission */}
        <PermissionGate permission={Permission.CREATE_PRODUCTS}>
          <button
            onClick={() => handleAddProduct({ name: 'New Product' })}
            className="bg-primary text-white px-4 py-2 rounded-lg"
          >
            Add Product
          </button>
        </PermissionGate>
      </div>

      <div className="grid gap-4">
        {products.map(product => (
          <div key={product.id} className="border p-4 rounded-lg">
            <h3 className="font-bold">{product.name}</h3>
            <p className="text-sm text-slate-600">{product.description}</p>
            
            <div className="flex gap-2 mt-4">
              {/* Show edit button only if user has permission */}
              <PermissionGate permission={Permission.EDIT_PRODUCTS}>
                <button
                  onClick={() => handleEditProduct(product.id, { name: 'Updated' })}
                  className="text-blue-600 hover:underline"
                >
                  Edit
                </button>
              </PermissionGate>

              {/* Show delete button only if user has permission */}
              <PermissionGate permission={Permission.DELETE_PRODUCTS}>
                <button
                  onClick={() => handleDeleteProduct(product.id)}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
              </PermissionGate>

              {/* Show stock adjustment only if user has permission */}
              <PermissionGate permission={Permission.ADJUST_STOCK}>
                <button
                  onClick={() => handleStockAdjustment(product.id)}
                  className="text-green-600 hover:underline"
                >
                  Adjust Stock
                </button>
              </PermissionGate>
            </div>
          </div>
        ))}
      </div>

      {/* Show audit log viewer only to admins */}
      <PermissionGate 
        permissions={[Permission.VIEW_REPORTS]}
        fallback={<p className="text-sm text-slate-500 mt-8">Audit logs are only visible to administrators</p>}
      >
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
          {/* Audit log viewer component would go here */}
        </div>
      </PermissionGate>
    </div>
  );
};

// Mock functions (replace with actual API calls)
const createProduct = async (product: any) => ({ ...product, id: Date.now().toString() });
const updateProduct = async (id: string, updates: any) => ({ id, ...updates });
const deleteProduct = async (id: string) => {};
const handleStockAdjustment = async (id: string) => {};

export default InventoryWithRBAC;
