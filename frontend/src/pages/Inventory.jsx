import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, Edit, Trash2, Package, AlertTriangle, X, Image, FileText } from 'lucide-react';
import { inventoryAPI } from '../services/api';
import html2pdf from 'html2pdf.js';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const Inventory = () => {
    const { t } = useTranslation();
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showImageUploadModal, setShowImageUploadModal] = useState(false);
    const [showBillScanModal, setShowBillScanModal] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [parsedBillItems, setParsedBillItems] = useState(null);
    const [billConfidence, setBillConfidence] = useState(0);
    const [editingItem, setEditingItem] = useState(null);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [itemsToShow, setItemsToShow] = useState(15); // Show 15 items initially
    const [filters, setFilters] = useState({
        category: 'All',
        status: 'All'
    });
    const [formData, setFormData] = useState({
        item_name: '',
        stock_qty: 0,
        cost_price: 0,
        selling_price: 0,
        price_per_unit: 0, // Keep for backward compatibility
        description: '',
        category: 'Other',
        min_stock_level: 5,
        unit: 'piece' // NEW: Default to piece for backward compatibility
    });

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const response = await inventoryAPI.getInventory({ limit: 1000 }); // Request up to 1000 items
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
        
        // Validate stock quantity
        if (formData.stock_qty === '' || formData.stock_qty === null || formData.stock_qty === undefined) {
            toast.error('Please enter a valid stock quantity', {
                position: 'top-right',
                duration: 4000,
            });
            return;
        }
        
        const qty = typeof formData.stock_qty === 'string' ? parseFloat(formData.stock_qty) : formData.stock_qty;
        
        if (isNaN(qty) || qty <= 0) {
            toast.error('Stock quantity must be greater than 0', {
                position: 'top-right',
                duration: 4000,
            });
            return;
        }
        
        // Normalize the data before sending
        const sanitizedData = {
            ...formData,
            stock_qty: Number(qty.toFixed(3)), // Normalize to 3 decimals
            cost_price: Number(parseFloat(formData.cost_price).toFixed(2)),
            selling_price: Number(parseFloat(formData.selling_price).toFixed(2)),
            price_per_unit: Number(parseFloat(formData.selling_price).toFixed(2)) // For backward compatibility
        };
        
        try {
            if (editingItem) {
                await inventoryAPI.updateInventoryItem(editingItem._id, sanitizedData);
                toast.success(t('inventory.toast.updated'), {
                    position: 'top-right',
                    duration: 3000,
                });
            } else {
                await inventoryAPI.createInventoryItem(sanitizedData);
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
                cost_price: 0,
                selling_price: 0,
                price_per_unit: 0,
                description: '',
                category: 'Other',
                min_stock_level: 5,
                unit: 'piece'
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

    // Handle image selection
    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Upload and process image
    const handleImageUpload = async () => {
        if (!selectedImage) {
            toast.error('Please select an image first');
            return;
        }

        try {
            setUploadingImage(true);
            const formData = new FormData();
            formData.append('image', selectedImage);

            const response = await inventoryAPI.uploadInventoryImage(formData);

            if (response.success) {
                toast.success(
                    `Successfully added ${response.data.summary.successful} item(s) from image!`,
                    { duration: 5000 }
                );
                
                // Show details of added items
                if (response.data.items && response.data.items.length > 0) {
                    const itemsList = response.data.items.map(item => 
                        `${item.item_name}: ${item.stock_qty} units @ ₹${item.selling_price}`
                    ).join('\n');
                    console.log('Added items:\n', itemsList);
                }

                // Show errors if any
                if (response.data.errors && response.data.errors.length > 0) {
                    toast.error(
                        `${response.data.errors.length} item(s) failed to process`,
                        { duration: 4000 }
                    );
                }

                // Close modal and refresh
                setShowImageUploadModal(false);
                setSelectedImage(null);
                setImagePreview(null);
                fetchInventory();
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error(error.response?.data?.message || 'Failed to process image');
        } finally {
            setUploadingImage(false);
        }
    };

    // BILL SCANNING - Step 1: Parse bill image
    const handleBillScan = async () => {
        if (!selectedImage) {
            toast.error('Please select a bill image first');
            return;
        }

        try {
            setUploadingImage(true);
            const formData = new FormData();
            formData.append('image', selectedImage);

            const response = await inventoryAPI.parseBillImage(formData);

            if (response.success) {
                // Store parsed items for confirmation
                setParsedBillItems(response.data.items);
                setBillConfidence(response.data.confidence);
                
                toast.success(response.message, { duration: 3000 });
                
                // Show low confidence warning
                if (response.data.needsReview) {
                    toast.warning('Low confidence - Please review items carefully', { duration: 4000 });
                }
            }
        } catch (error) {
            console.error('Error parsing bill:', error);
            toast.error(error.response?.data?.message || 'Failed to parse bill image');
            setShowBillScanModal(false);
            setSelectedImage(null);
            setImagePreview(null);
        } finally {
            setUploadingImage(false);
        }
    };

    // BILL SCANNING - Step 2: Execute confirmed items
    const handleBillConfirm = async () => {
        if (!parsedBillItems || parsedBillItems.length === 0) {
            toast.error('No items to confirm');
            return;
        }

        try {
            setUploadingImage(true);
            const response = await inventoryAPI.executeBillItems(parsedBillItems);

            if (response.success) {
                toast.success(
                    `${response.data.summary.created + response.data.summary.updated} item(s) added to inventory!`,
                    { duration: 5000 }
                );

                // Show details
                if (response.data.created.length > 0) {
                    console.log('Created items:', response.data.created);
                }
                if (response.data.updated.length > 0) {
                    console.log('Updated items:', response.data.updated);
                }

                // Close modal and refresh
                setShowBillScanModal(false);
                setSelectedImage(null);
                setImagePreview(null);
                setParsedBillItems(null);
                setBillConfidence(0);
                fetchInventory();
            }
        } catch (error) {
            console.error('Error executing bill items:', error);
            toast.error(error.response?.data?.message || 'Failed to add items to inventory');
        } finally {
            setUploadingImage(false);
        }
    };

    // Remove item from parsed bill
    const handleRemoveBillItem = (index) => {
        const updatedItems = parsedBillItems.filter((_, i) => i !== index);
        setParsedBillItems(updatedItems);
    };

    // Edit bill item
    const handleEditBillItem = (index, field, value) => {
        const updatedItems = [...parsedBillItems];
        updatedItems[index][field] = value;
        setParsedBillItems(updatedItems);
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
        const totalCostValue = filteredInventory.reduce((sum, item) => sum + (item.stock_qty * (item.cost_price || item.price_per_unit * 0.8)), 0);
        const totalSellingValue = filteredInventory.reduce((sum, item) => sum + (item.stock_qty * (item.selling_price || item.price_per_unit)), 0);
        const totalPotentialProfit = totalSellingValue - totalCostValue;
        
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
                        <td style="padding: 10px; background: #F3F4F6;"><strong>Total Cost Value:</strong></td>
                        <td style="padding: 10px;">₹${totalCostValue.toLocaleString()}</td>
                        <td style="padding: 10px; background: #F3F4F6;"><strong>Total Selling Value:</strong></td>
                        <td style="padding: 10px;">₹${totalSellingValue.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; background: #F3F4F6;"><strong>Potential Profit:</strong></td>
                        <td style="padding: 10px; color: #059669; font-weight: bold;">₹${totalPotentialProfit.toLocaleString()}</td>
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
                        <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Cost Price</th>
                        <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Selling Price</th>
                        <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Profit/Unit</th>
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
                            <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">₹${(item.cost_price || item.price_per_unit * 0.8).toLocaleString()}</td>
                            <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">₹${(item.selling_price || item.price_per_unit).toLocaleString()}</td>
                            <td style="padding: 10px; text-align: right; border: 1px solid #ddd; color: #059669; font-weight: bold;">₹${((item.selling_price || item.price_per_unit) - (item.cost_price || item.price_per_unit * 0.8)).toFixed(2)}</td>
                            <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">₹${(item.stock_qty * (item.selling_price || item.price_per_unit)).toLocaleString()}</td>
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
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowBillScanModal(true)}
                        className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-teal-700 transition-all flex items-center gap-2 shadow-md"
                    >
                        <FileText className="h-4 w-4" />
                        Scan Bill
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        {t('inventory.addItem')}
                    </button>
                </div>
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
                                ₹{inventory.reduce((sum, item) => sum + (item.stock_qty * (item.selling_price || item.price_per_unit)), 0).toLocaleString()}
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
                    <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-red-800 mb-2">{t('inventory.lowStockAlert')}</h3>
                            <div className="space-y-1">
                                {lowStockItems.slice(0, 5).map((item) => (
                                    <div key={item._id} className="flex justify-between text-sm text-red-700">
                                        <span className="font-medium">{item.item_name}</span>
                                        <span className="text-red-600">
                                            {item.stock_qty} {item.unit || 'pieces'} left
                                            {item.stock_qty <= 0 && ' (OUT OF STOCK)'}
                                        </span>
                                    </div>
                                ))}
                                {lowStockItems.length > 5 && (
                                    <p className="text-xs text-red-600 mt-2">
                                        + {lowStockItems.length - 5} more items need restocking
                                    </p>
                                )}
                            </div>
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
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('inventory.table.itemName')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('inventory.table.category')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('inventory.table.stockQty')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Price</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selling Price</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit/Unit</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('inventory.table.totalValue')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('inventory.table.status')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredInventory.slice(0, itemsToShow).map((item) => (
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
                                            {item.stock_qty} {item.unit || 'pieces'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ₹{item.cost_price || (item.price_per_unit * 0.8).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ₹{item.selling_price || item.price_per_unit}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                            ₹{((item.selling_price || item.price_per_unit) - (item.cost_price || item.price_per_unit * 0.8)).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            ₹{(item.stock_qty * (item.selling_price || item.price_per_unit)).toLocaleString()}
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
                                                            cost_price: item.cost_price || item.price_per_unit * 0.8,
                                                            selling_price: item.selling_price || item.price_per_unit,
                                                            price_per_unit: item.price_per_unit,
                                                            description: item.description || '',
                                                            category: item.category || '',
                                                            min_stock_level: item.min_stock_level || 0,
                                                            unit: item.unit || 'piece'
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
                    
                    {/* Load More Button */}
                    {filteredInventory.length > itemsToShow && (
                        <div className="mt-4 text-center">
                            <button
                                onClick={() => setItemsToShow(prev => prev + 15)}
                                className="btn-secondary inline-flex items-center gap-2"
                            >
                                <Package className="h-4 w-4" />
                                Load More ({filteredInventory.length - itemsToShow} remaining)
                            </button>
                        </div>
                    )}
                    
                    {/* Show All Button (if more than 30 items) */}
                    {filteredInventory.length > 30 && itemsToShow < filteredInventory.length && (
                        <div className="mt-2 text-center">
                            <button
                                onClick={() => setItemsToShow(filteredInventory.length)}
                                className="text-sm text-indigo-600 hover:text-indigo-800"
                            >
                                Show All {filteredInventory.length} Items
                            </button>
                        </div>
                    )}
                </>
            )}
            </div>

            {/* Bill Scanner Modal */}
            {showBillScanModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
                    <div className="relative mx-auto p-6 border w-full max-w-4xl shadow-2xl rounded-xl bg-white max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                    <FileText className="h-6 w-6 text-green-600" />
                                    Scan Wholesale Bill
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    Upload bill image → AI extracts items → Review → Confirm to add
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowBillScanModal(false);
                                    setSelectedImage(null);
                                    setImagePreview(null);
                                    setParsedBillItems(null);
                                    setBillConfidence(0);
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {!parsedBillItems ? (
                            /* Step 1: Upload Bill Image */
                            <div className="space-y-6">
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-500 transition-colors">
                                    {imagePreview ? (
                                        <div className="space-y-4">
                                            <img 
                                                src={imagePreview} 
                                                alt="Bill Preview" 
                                                className="max-h-96 mx-auto rounded-lg shadow-md"
                                            />
                                            <button
                                                onClick={() => {
                                                    setSelectedImage(null);
                                                    setImagePreview(null);
                                                }}
                                                className="text-red-600 hover:text-red-700 text-sm font-medium"
                                            >
                                                Remove Image
                                            </button>
                                        </div>
                                    ) : (
                                        <div>
                                            <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                                            <p className="text-gray-600 mb-2">Upload wholesale purchase bill</p>
                                            <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB</p>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageSelect}
                                                className="hidden"
                                                id="bill-upload"
                                            />
                                            <label
                                                htmlFor="bill-upload"
                                                className="mt-4 inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 cursor-pointer transition-colors"
                                            >
                                                Select Bill Image
                                            </label>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <h4 className="font-semibold text-green-900 mb-2">📋 What we extract:</h4>
                                    <ul className="text-sm text-green-800 space-y-1">
                                        <li>• Item names from the bill</li>
                                        <li>• Quantities purchased</li>
                                        <li>• Purchase prices (cost per unit)</li>
                                        <li>• You can review and edit before adding</li>
                                    </ul>
                                </div>

                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => {
                                            setShowBillScanModal(false);
                                            setSelectedImage(null);
                                            setImagePreview(null);
                                        }}
                                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                        disabled={uploadingImage}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleBillScan}
                                        disabled={!selectedImage || uploadingImage}
                                        className="px-6 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                                    >
                                        {uploadingImage ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Scanning...
                                            </>
                                        ) : (
                                            <>
                                                <FileText className="h-4 w-4" />
                                                Scan Bill
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Step 2: Review & Confirm Extracted Items */
                            <div className="space-y-6">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-semibold text-blue-900">✅ Extracted {parsedBillItems.length} item(s) from bill</h4>
                                            <p className="text-sm text-blue-700 mt-1">
                                                Confidence: {(billConfidence * 100).toFixed(0)}% 
                                                {billConfidence < 0.7 && ' - Please review carefully'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Item Name</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Quantity</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Cost Price (CP)</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Selling Price (SP)</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedBillItems.map((item, index) => (
                                                <tr key={index} className="border-t border-gray-200 hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            value={item.item_name}
                                                            onChange={(e) => handleEditBillItem(index, 'item_name', e.target.value)}
                                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                            placeholder="Item name"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => handleEditBillItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                            placeholder="Qty"
                                                            min="1"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center">
                                                            <span className="text-gray-500 mr-1">₹</span>
                                                            <input
                                                                type="number"
                                                                value={item.cost_price}
                                                                onChange={(e) => handleEditBillItem(index, 'cost_price', parseInt(e.target.value) || 0)}
                                                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                                placeholder="Cost"
                                                                min="1"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center">
                                                            <span className="text-gray-500 mr-1">₹</span>
                                                            <input
                                                                type="number"
                                                                value={item.selling_price}
                                                                onChange={(e) => handleEditBillItem(index, 'selling_price', parseInt(e.target.value) || 0)}
                                                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                                placeholder="Selling"
                                                                min="1"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <select
                                                            value={item.category || 'Other'}
                                                            onChange={(e) => handleEditBillItem(index, 'category', e.target.value)}
                                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                        >
                                                            <option value="Food & Beverages">Food & Beverages</option>
                                                            <option value="Electronics">Electronics</option>
                                                            <option value="Clothing">Clothing</option>
                                                            <option value="Books">Books</option>
                                                            <option value="Home & Garden">Home & Garden</option>
                                                            <option value="Sports">Sports</option>
                                                            <option value="Beauty & Health">Beauty & Health</option>
                                                            <option value="Automotive">Automotive</option>
                                                            <option value="Office Supplies">Office Supplies</option>
                                                            <option value="Other">Other</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            onClick={() => handleRemoveBillItem(index)}
                                                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                                                        >
                                                            Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Profit Preview */}
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <h4 className="font-semibold text-green-900 mb-2">💰 Profit Preview:</h4>
                                    <div className="space-y-1 text-sm">
                                        {parsedBillItems.map((item, index) => {
                                            const profit = (item.selling_price || 0) - (item.cost_price || 0);
                                            const margin = item.selling_price > 0 ? ((profit / item.selling_price) * 100).toFixed(1) : 0;
                                            return (
                                                <div key={index} className="flex justify-between text-green-800">
                                                    <span>{item.item_name}</span>
                                                    <span className="font-semibold">
                                                        ₹{profit} profit/unit ({margin}% margin)
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => {
                                            setParsedBillItems(null);
                                            setBillConfidence(0);
                                        }}
                                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                        disabled={uploadingImage}
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleBillConfirm}
                                        disabled={uploadingImage || parsedBillItems.length === 0}
                                        className="px-6 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                                    >
                                        {uploadingImage ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Adding...
                                            </>
                                        ) : (
                                            <>
                                                <Package className="h-4 w-4" />
                                                Confirm & Add to Inventory
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Image Upload Modal */}
            {showImageUploadModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                    <div className="relative mx-auto p-6 border w-11/12 md:w-2/3 lg:w-1/2 shadow-2xl rounded-xl bg-white">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                    <Image className="h-6 w-6 text-purple-600" />
                                    Upload Inventory Image
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    Upload an image with product details (name, quantity, cost price, selling price, category)
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowImageUploadModal(false);
                                    setSelectedImage(null);
                                    setImagePreview(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Image Upload Area */}
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors">
                                {imagePreview ? (
                                    <div className="space-y-4">
                                        <img 
                                            src={imagePreview} 
                                            alt="Preview" 
                                            className="max-h-96 mx-auto rounded-lg shadow-md"
                                        />
                                        <button
                                            onClick={() => {
                                                setSelectedImage(null);
                                                setImagePreview(null);
                                            }}
                                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                                        >
                                            Remove Image
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <Image className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                                        <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
                                        <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB</p>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageSelect}
                                            className="hidden"
                                            id="image-upload"
                                        />
                                        <label
                                            htmlFor="image-upload"
                                            className="mt-4 inline-block bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 cursor-pointer transition-colors"
                                        >
                                            Select Image
                                        </label>
                                    </div>
                                )}
                            </div>

                            {/* Info Box */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-semibold text-blue-900 mb-2">📋 Image Requirements:</h4>
                                <ul className="text-sm text-blue-800 space-y-1">
                                    <li>• Product name clearly visible</li>
                                    <li>• Quantity/Stock information</li>
                                    <li>• Cost Price (CP) - what you paid</li>
                                    <li>• Selling Price (SP) - what customers pay</li>
                                    <li>• Category (optional but helpful)</li>
                                </ul>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => {
                                        setShowImageUploadModal(false);
                                        setSelectedImage(null);
                                        setImagePreview(null);
                                    }}
                                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                    disabled={uploadingImage}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleImageUpload}
                                    disabled={!selectedImage || uploadingImage}
                                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                                >
                                    {uploadingImage ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Image className="h-4 w-4" />
                                            Process Image
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                                            cost_price: 0,
                                            selling_price: 0,
                                            price_per_unit: 0,
                                            description: '',
                                            category: '',
                                            min_stock_level: 0,
                                            unit: 'piece'
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
                                        <label className="block text-sm font-medium text-gray-700">Unit</label>
                                        <select
                                            value={formData.unit}
                                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                            className="input-field"
                                            required
                                        >
                                            <option value="piece">Piece</option>
                                            <option value="kg">Kilogram (kg)</option>
                                            <option value="litre">Litre</option>
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Rice, Dal → kg | Oil, Milk → litre | Eggs → piece
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Stock Quantity</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={formData.stock_qty}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                // Allow empty string during typing, otherwise parse as number
                                                if (value === '') {
                                                    setFormData({ ...formData, stock_qty: '' });
                                                } else {
                                                    const qty = parseFloat(value);
                                                    setFormData({ ...formData, stock_qty: isNaN(qty) ? '' : qty });
                                                }
                                            }}
                                            className="input-field flex-1"
                                            min="0"
                                            step={formData.unit === 'piece' ? '1' : '0.001'}
                                            placeholder={formData.unit === 'piece' ? 'e.g., 10' : 'e.g., 2.5'}
                                            required
                                        />
                                        {formData.unit === 'kg' && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const grams = prompt('Enter grams to convert:');
                                                    if (grams && !isNaN(grams)) {
                                                        setFormData({ ...formData, stock_qty: parseFloat((grams / 1000).toFixed(3)) });
                                                        toast.success(`${grams}g = ${(grams / 1000).toFixed(3)}kg`);
                                                    }
                                                }}
                                                className="px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors whitespace-nowrap"
                                                title="Convert grams to kg"
                                            >
                                                g→kg
                                            </button>
                                        )}
                                        {formData.unit === 'litre' && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const ml = prompt('Enter milliliters to convert:');
                                                    if (ml && !isNaN(ml)) {
                                                        setFormData({ ...formData, stock_qty: parseFloat((ml / 1000).toFixed(3)) });
                                                        toast.success(`${ml}ml = ${(ml / 1000).toFixed(3)}L`);
                                                    }
                                                }}
                                                className="px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors whitespace-nowrap"
                                                title="Convert ml to litres"
                                            >
                                                ml→L
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {formData.unit === 'piece' ? 'Enter whole numbers for pieces' : 'Supports fractional quantities (e.g., 0.5, 2.25)'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Cost Price (₹)</label>
                                        <input
                                            type="number"
                                            value={formData.cost_price}
                                            onChange={(e) => {
                                                const costPrice = parseFloat(e.target.value) || 0;
                                                setFormData({ 
                                                    ...formData, 
                                                    cost_price: costPrice,
                                                    price_per_unit: formData.selling_price // Keep backward compatibility
                                                });
                                            }}
                                            className="input-field"
                                            min="0"
                                            step="0.01"
                                            required
                                            placeholder="Enter cost price"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Selling Price (₹)</label>
                                        <input
                                            type="number"
                                            value={formData.selling_price}
                                            onChange={(e) => {
                                                const sellingPrice = parseFloat(e.target.value) || 0;
                                                setFormData({ 
                                                    ...formData, 
                                                    selling_price: sellingPrice,
                                                    price_per_unit: sellingPrice // Keep backward compatibility
                                                });
                                            }}
                                            className="input-field"
                                            min="0"
                                            step="0.01"
                                            required
                                            placeholder="Enter selling price"
                                        />
                                    </div>
                                </div>

                                {/* Profit Information */}
                                {formData.cost_price > 0 && formData.selling_price > 0 && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="font-medium text-green-700">Profit per Unit:</span>
                                                <span className="ml-2 text-green-600">₹{(formData.selling_price - formData.cost_price).toFixed(2)}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium text-green-700">Profit Margin:</span>
                                                <span className="ml-2 text-green-600">
                                                    {formData.selling_price > 0 ? 
                                                        ((formData.selling_price - formData.cost_price) / formData.selling_price * 100).toFixed(2) : 0}%
                                                </span>
                                            </div>
                                        </div>
                                        {formData.selling_price <= formData.cost_price && (
                                            <div className="mt-2 text-red-600 text-sm">
                                                ⚠️ Warning: Selling price should be higher than cost price to ensure profit!
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
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
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Price per Unit (Legacy)</label>
                                        <input
                                            type="number"
                                            value={formData.price_per_unit}
                                            onChange={(e) => setFormData({ ...formData, price_per_unit: parseFloat(e.target.value) || 0 })}
                                            className="input-field bg-gray-100"
                                            min="0"
                                            step="0.01"
                                            disabled
                                            title="This field is automatically set to selling price for backward compatibility"
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
