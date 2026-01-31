import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, Edit, Trash2, Package, AlertTriangle, X } from 'lucide-react';
import { inventoryAPI } from '../services/api';
import html2pdf from 'html2pdf.js';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const Inventory = () => {
    const { t } = useTranslation();
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [filters, setFilters] = useState({
        category: 'All',
        status: 'All'
    });
    const [formData, setFormData] = useState({
        item_name: '',
        stock_qty: 0,
        price_per_unit: 0,
        description: '',
        category: 'Other',
        min_stock_level: 5
    });

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const response = await inventoryAPI.getInventory();
            if (response.success) {
                setInventory(response.data);
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await inventoryAPI.updateInventoryItem(editingItem._id, formData);
                toast.success(t('inventory.toast.updated'), {
                    position: 'top-right',
                    duration: 3000,
                });
            } else {
                await inventoryAPI.createInventoryItem(formData);
                toast.success(t('inventory.toast.created'), {
                    position: 'top-right',
                    duration: 3000,
                });
            }
            setShowModal(false);
            setEditingItem(null);
            setFormData({
                item_name: '',
                stock_qty: 0,
                price_per_unit: 0,
                description: '',
                category: 'Other',
                min_stock_level: 5
            });
            fetchInventory();
        } catch (error) {
            console.error('Error saving inventory item:', error);
            toast.error(t('inventory.toast.error'), {
                position: 'top-right',
                duration: 4000,
            });
        }
    };

    // Delete inventory item
    const handleDelete = async (id) => {
        if (window.confirm(t('inventory.deleteItem'))) {
            try {
                await inventoryAPI.deleteInventoryItem(id);
                toast.success(t('inventory.toast.deleted'), {
                    position: 'top-right',
                    duration: 3000,
                });
                fetchInventory();
            } catch (error) {
                console.error('Error deleting item:', error);
                toast.error(t('inventory.toast.error'), {
                    position: 'top-right',
                    duration: 4000,
                });
            }
        }
    };

    const categories = [
        'Electronics', 'Clothing', 'Food & Beverages', 'Books', 'Home & Garden',
        'Sports', 'Beauty & Health', 'Automotive', 'Office Supplies', 'Other'
    ];

    // Filter inventory based on selected filters
    const getFilteredInventory = () => {
        return inventory.filter(item => {
            // Category filter
            if (filters.category !== 'All' && item.category !== filters.category) {
                return false;
            }

            // Status filter
            if (filters.status !== 'All') {
                if (filters.status === 'In Stock' && item.stock_qty <= 0) return false;
                if (filters.status === 'Low Stock' && (item.stock_qty > (item.min_stock_level || 5) || item.stock_qty <= 0)) return false;
                if (filters.status === 'Out of Stock' && item.stock_qty > 0) return false;
            }

            return true;
        });
    };

    const filteredInventory = getFilteredInventory();
    const lowStockItems = inventory.filter(item => item.stock_qty <= (item.min_stock_level || 5));

    // Apply filters
    const applyFilters = () => {
        setShowFilterModal(false);
    };

    // Clear filters
    const clearFilters = () => {
        setFilters({
            category: 'All',
            status: 'All'
        });
        setShowFilterModal(false);
    };

    // Export to PDF
    const exportToPDF = () => {
        const element = document.createElement('div');
        element.style.padding = '20px';
        element.style.fontFamily = 'Arial, sans-serif';
        
        const now = new Date().toLocaleDateString();
        const totalValue = filteredInventory.reduce((sum, item) => sum + (item.stock_qty * item.price_per_unit), 0);
        
        element.innerHTML = `
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #4F46E5; margin-bottom: 10px;">Inventory Report</h1>
                <p style="color: #666;">Generated on: ${now}</p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px; background: #F3F4F6;"><strong>Total Items:</strong></td>
                        <td style="padding: 10px;">${filteredInventory.length}</td>
                        <td style="padding: 10px; background: #F3F4F6;"><strong>Low Stock Items:</strong></td>
                        <td style="padding: 10px;">${lowStockItems.length}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; background: #F3F4F6;"><strong>Total Inventory Value:</strong></td>
                        <td style="padding: 10px;">₹${totalValue.toLocaleString()}</td>
                        <td style="padding: 10px; background: #F3F4F6;"><strong>Active Filters:</strong></td>
                        <td style="padding: 10px;">${filters.category !== 'All' ? filters.category : 'None'} ${filters.status !== 'All' ? '/ ' + filters.status : ''}</td>
                    </tr>
                </table>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background: #4F46E5; color: white;">
                        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Item Name</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Category</th>
                        <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Stock Qty</th>
                        <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Price/Unit</th>
                        <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Total Value</th>
                        <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredInventory.map((item, index) => `
                        <tr style="background: ${index % 2 === 0 ? '#F9FAFB' : 'white'};">
                            <td style="padding: 10px; border: 1px solid #ddd;">${item.item_name}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${item.category || 'Other'}</td>
                            <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${item.stock_qty}</td>
                            <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">₹${item.price_per_unit.toLocaleString()}</td>
                            <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">₹${(item.stock_qty * item.price_per_unit).toLocaleString()}</td>
                            <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">
                                <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; 
                                    ${item.stock_qty <= 0 ? 'background: #FEE2E2; color: #991B1B;' : 
                                      item.stock_qty <= (item.min_stock_level || 5) ? 'background: #FEF3C7; color: #92400E;' : 
                                      'background: #D1FAE5; color: #065F46;'}">
                                    ${item.stock_qty <= 0 ? 'Out of Stock' : item.stock_qty <= (item.min_stock_level || 5) ? 'Low Stock' : 'In Stock'}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #E5E7EB; text-align: center; color: #666;">
                <p>This report was auto-generated by Biznova Inventory Management System</p>
            </div>
        `;

        const opt = {
            margin: 10,
            filename: `inventory-report-${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        html2pdf().set(opt).from(element).save();
    };

    return (
        <div className="space-y-6">
            <Toaster />
            
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('inventory.title')}</h1>
                    <p className="text-gray-600 dark:text-gray-400">{t('inventory.subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    {t('inventory.addItem')}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('inventory.totalItems')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{inventory.length}</p>
                        </div>
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Package className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('inventory.totalValue')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                ₹{inventory.reduce((sum, item) => sum + (item.stock_qty * item.price_per_unit), 0)}
                            </p>
                        </div>
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Package className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('inventory.lowStockItems')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{lowStockItems.length}</p>
                        </div>
                        <div className="p-2 bg-red-100 rounded-lg">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('inventory.categoriesLabel')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {new Set(inventory.map(item => item.category)).size}
                            </p>
                        </div>
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Package className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Low Stock Alert */}
            {lowStockItems.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                        <div>
                            <h3 className="text-sm font-medium text-red-800">{t('inventory.lowStockAlert')}</h3>
                            <p className="text-sm text-red-700">
                                {t('inventory.lowStockMessage', { count: lowStockItems.length })}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Inventory Table */}
            <div className="card">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">{t('inventory.inventoryItems')}</h2>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setShowFilterModal(true)}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <Filter className="h-4 w-4" />
                            {t('common.filter')}
                            {(filters.category !== 'All' || filters.status !== 'All') && (
                                <span className="ml-1 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-800 rounded-full">
                                    {t('common.active')}
                                </span>
                            )}
                        </button>
                        <button 
                            onClick={exportToPDF}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <Download className="h-4 w-4" />
                            {t('common.export')}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600">{t('common.loading')}</p>
                    </div>
                ) : inventory.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500">{t('inventory.noItems')}</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="btn-primary mt-4"
                        >
                            {t('inventory.addFirstItem')}
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('inventory.table.itemName')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('inventory.table.category')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('inventory.table.stockQty')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('inventory.table.price')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('inventory.table.totalValue')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('inventory.table.status')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredInventory.map((item) => (
                                    <tr key={item._id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {item.item_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {item.stock_qty}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ₹{item.price_per_unit}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            ₹{item.stock_qty * item.price_per_unit}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {item.stock_qty <= item.min_stock_level ? (
                                                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                                                    {t('inventory.table.lowStock')}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                                    {t('inventory.table.inStock')}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingItem(item);
                                                        setFormData({
                                                            item_name: item.item_name,
                                                            stock_qty: item.stock_qty,
                                                            price_per_unit: item.price_per_unit,
                                                            description: item.description || '',
                                                            category: item.category || '',
                                                            min_stock_level: item.min_stock_level || 0
                                                        });
                                                        setShowModal(true);
                                                    }}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                    title={t('inventory.editItem')}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(item._id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title={t('common.delete')}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Inventory Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900">
                                    {editingItem ? 'Edit Item' : 'Add Item'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingItem(null);
                                        setFormData({
                                            item_name: '',
                                            stock_qty: 0,
                                            price_per_unit: 0,
                                            description: '',
                                            category: '',
                                            min_stock_level: 0
                                        });
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Item Name</label>
                                    <input
                                        type="text"
                                        value={formData.item_name}
                                        onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                                        className="input-field"
                                        placeholder="Enter item name"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Category</label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="input-field"
                                            required
                                        >
                                            <option value="">Select category</option>
                                            {categories.map(category => (
                                                <option key={category} value={category}>{category}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Stock Quantity</label>
                                        <input
                                            type="number"
                                            value={formData.stock_qty}
                                            onChange={(e) => setFormData({ ...formData, stock_qty: parseInt(e.target.value) || 0 })}
                                            className="input-field"
                                            min="0"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Price per Unit</label>
                                        <input
                                            type="number"
                                            value={formData.price_per_unit}
                                            onChange={(e) => setFormData({ ...formData, price_per_unit: parseFloat(e.target.value) || 0 })}
                                            className="input-field"
                                            min="0"
                                            step="0.01"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Min Stock Level</label>
                                        <input
                                            type="number"
                                            value={formData.min_stock_level}
                                            onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) || 0 })}
                                            className="input-field"
                                            min="0"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="input-field"
                                        rows="3"
                                        placeholder="Item description (optional)"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowModal(false);
                                            setEditingItem(null);
                                        }}
                                        className="btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        {editingItem ? 'Update Item' : 'Add Item'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Modal */}
            {showFilterModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900">Filter Inventory</h3>
                                <button
                                    onClick={() => setShowFilterModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Category Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Category
                                    </label>
                                    <select
                                        value={filters.category}
                                        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    >
                                        <option value="All">All Categories</option>
                                        {categories.map((cat) => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Status Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Stock Status
                                    </label>
                                    <select
                                        value={filters.status}
                                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    >
                                        <option value="All">All Status</option>
                                        <option value="In Stock">In Stock</option>
                                        <option value="Low Stock">Low Stock (≤5)</option>
                                        <option value="Out of Stock">Out of Stock</option>
                                    </select>
                                </div>

                                {/* Filter Summary */}
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-600">
                                        <span className="font-medium">Results:</span> {filteredInventory.length} items
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                        className="flex-1 btn-secondary"
                                    >
                                        Clear Filters
                                    </button>
                                    <button
                                        type="button"
                                        onClick={applyFilters}
                                        className="flex-1 btn-primary"
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
