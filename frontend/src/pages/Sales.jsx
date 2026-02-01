import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, Edit, Trash2, Eye, CheckCircle, AlertCircle, X } from 'lucide-react';
import { salesAPI, inventoryAPI } from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import html2pdf from 'html2pdf.js';
import { useTranslation } from 'react-i18next';

const Sales = () => {
    const { t } = useTranslation();
    const [sales, setSales] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [editingSale, setEditingSale] = useState(null);
    const [viewingSale, setViewingSale] = useState(null);
    const [paymentFilter, setPaymentFilter] = useState('All');
    const [itemsToShow, setItemsToShow] = useState(15); // Show 15 items initially
    const [todaysSales, setTodaysSales] = useState({
        totalRevenue: 0,
        salesCount: 0,
        totalItems: 0
    });
    const [formData, setFormData] = useState({
        items: [{ item_name: '', quantity: 1, price_per_unit: 0 }],
        payment_method: 'Cash',
        customer_phone: '',
        customer_name: ''
    });

    useEffect(() => {
        fetchSales();
        fetchTodaysSales();
        fetchInventory();
    }, []);

    const fetchSales = async () => {
        try {
            setLoading(true);
            const response = await salesAPI.getSales({ limit: 1000 }); // Request up to 1000 items
            if (response.success) {
                setSales(response.data);
            }
        } catch (error) {
            console.error('Error fetching sales:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTodaysSales = async () => {
        try {
            const response = await salesAPI.getTodaysSales();
            if (response.success) {
                setTodaysSales(response.data);
            }
        } catch (error) {
            console.error('Error fetching today\'s sales:', error);
        }
    };

    const fetchInventory = async () => {
        try {
            const response = await inventoryAPI.getInventory({ limit: 1000 }); // Request up to 1000 items
            if (response.success) {
                // Filter only items with stock > 0
                const availableItems = response.data.filter(item => item.stock_qty > 0);
                setInventory(availableItems);
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
            toast.error('Failed to load inventory');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            if (editingSale) {
                await salesAPI.updateSale(editingSale._id, formData);
                toast.success(t('sales.toast.updated'), {
                    duration: 4000,
                    position: 'top-right',
                });
            } else {
                const response = await salesAPI.createSale(formData);
                toast.success(t('sales.toast.created'), {
                    duration: 4000,
                    position: 'top-right',
                    icon: '✅',
                });
            }
            setShowModal(false);
            setEditingSale(null);
            setFormData({
                items: [{ item_name: '', quantity: 1, price_per_unit: 0 }],
                payment_method: 'Cash',
                customer_phone: '',
                customer_name: ''
            });
            fetchSales();
            fetchTodaysSales();
            fetchInventory(); // Refresh inventory after sale
        } catch (error) {
            console.error('Error saving sale:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to create sale';
            toast.error(t('sales.toast.error'), {
                duration: 5000,
                position: 'top-right',
                icon: '❌',
            });
        }
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { item_name: '', quantity: 1, price_per_unit: 0 }]
        });
    };

    const removeItem = (index) => {
        if (formData.items.length > 1) {
            setFormData({
                ...formData,
                items: formData.items.filter((_, i) => i !== index)
            });
        }
    };

    const updateItem = (index, field, value) => {
        const newItems = [...formData.items];
        
        // If item name is changed, auto-fill the price
        if (field === 'item_name') {
            const selectedItem = inventory.find(item => item.item_name === value);
            if (selectedItem) {
                newItems[index].item_name = value;
                newItems[index].price_per_unit = selectedItem.price_per_unit;
                newItems[index].quantity = 1; // Reset quantity to 1
            }
        } else {
            newItems[index][field] = value;
        }
        
        setFormData({ ...formData, items: newItems });
    };

    // Get available quantity for selected item
    const getAvailableQuantity = (itemName) => {
        const item = inventory.find(inv => inv.item_name === itemName);
        return item ? item.stock_qty : 0;
    };

    const calculateTotal = () => {
        return formData.items.reduce((total, item) =>
            total + (item.quantity * item.price_per_unit), 0
        );
    };

    // Filter sales by payment method
    const getFilteredSales = () => {
        if (paymentFilter === 'All') return sales;
        return sales.filter(sale => sale.payment_method === paymentFilter);
    };

    const filteredSales = getFilteredSales();

    // View sale details
    const handleView = (sale) => {
        setViewingSale(sale);
        setShowViewModal(true);
    };

    // Edit sale
    const handleEdit = (sale) => {
        setEditingSale(sale);
        setFormData({
            items: sale.items || [{ item_name: '', quantity: 1, price_per_unit: 0 }],
            payment_method: sale.payment_method || 'Cash',
            customer_phone: sale.customer_phone || '',
            customer_name: sale.customer_name || ''
        });
        setShowModal(true);
    };

    // Delete sale
    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this sale? This action cannot be undone.')) {
            try {
                await salesAPI.deleteSale(id);
                toast.success(t('sales.toast.deleted'), {
                    position: 'top-right',
                    duration: 3000,
                });
                fetchSales();
                fetchTodaysSales();
                fetchInventory();
            } catch (error) {
                console.error('Error deleting sale:', error);
                toast.error(t('sales.toast.error'), {
                    position: 'top-right',
                    duration: 4000,
                });
            }
        }
    };

    // Download Invoice/Bill for Customer
    const downloadInvoice = async (sale) => {
        try {
            toast.loading(t('sales.toast.generatingInvoice'), { id: 'invoice' });

            const invoiceElement = document.createElement('div');
            invoiceElement.style.padding = '40px';
            invoiceElement.style.fontFamily = 'Arial, sans-serif';
            invoiceElement.style.backgroundColor = '#ffffff';

            // Get current user/shop details (you can customize this)
            const shopName = localStorage.getItem('shopName') || 'Biznova';
            const saleDate = new Date(sale.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
            const saleTime = new Date(sale.createdAt).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit'
            });

            invoiceElement.innerHTML = `
                <div style="max-width: 800px; margin: 0 auto;">
                    <!-- Header -->
                    <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #4F46E5; padding-bottom: 20px;">
                        <h1 style="color: #4F46E5; font-size: 36px; margin: 0 0 10px 0;">INVOICE</h1>
                        <p style="color: #666; font-size: 18px; margin: 0;">${shopName}</p>
                    </div>

                    <!-- Invoice Info -->
                    <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
                        <div>
                            <p style="margin: 5px 0; color: #666;">
                                <strong style="color: #111;">Invoice No:</strong> #${sale._id.substring(0, 8).toUpperCase()}
                            </p>
                            <p style="margin: 5px 0; color: #666;">
                                <strong style="color: #111;">Date:</strong> ${saleDate}
                            </p>
                            <p style="margin: 5px 0; color: #666;">
                                <strong style="color: #111;">Time:</strong> ${saleTime}
                            </p>
                        </div>
                        <div style="text-align: right;">
                            ${sale.customer_name ? `
                                <p style="margin: 5px 0; color: #666;">
                                    <strong style="color: #111;">Customer:</strong> ${sale.customer_name}
                                </p>
                            ` : ''}
                            ${sale.customer_phone ? `
                                <p style="margin: 5px 0; color: #666;">
                                    <strong style="color: #111;">Phone:</strong> ${sale.customer_phone}
                                </p>
                            ` : ''}
                            <p style="margin: 5px 0; color: #666;">
                                <strong style="color: #111;">Payment:</strong> ${sale.payment_method}
                            </p>
                        </div>
                    </div>

                    <!-- Items Table -->
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                        <thead>
                            <tr style="background-color: #F3F4F6;">
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #4F46E5;">#</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #4F46E5;">Item</th>
                                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #4F46E5;">Qty</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #4F46E5;">Price</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #4F46E5;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sale.items.map((item, index) => `
                                <tr style="border-bottom: 1px solid #E5E7EB;">
                                    <td style="padding: 12px;">${index + 1}</td>
                                    <td style="padding: 12px;">${item.item_name}</td>
                                    <td style="padding: 12px; text-align: center;">${item.quantity}</td>
                                    <td style="padding: 12px; text-align: right;">₹${item.price_per_unit.toLocaleString()}</td>
                                    <td style="padding: 12px; text-align: right;">₹${(item.quantity * item.price_per_unit).toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <!-- Total -->
                    <div style="text-align: right; margin-bottom: 40px;">
                        <div style="display: inline-block; background-color: #F3F4F6; padding: 20px 30px; border-radius: 8px;">
                            <p style="margin: 0; font-size: 14px; color: #666;">TOTAL AMOUNT</p>
                            <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: bold; color: #4F46E5;">
                                ₹${sale.total_amount.toLocaleString()}
                            </p>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                        <p style="margin: 5px 0; color: #999; font-size: 12px;">Thank you for your business!</p>
                        <p style="margin: 5px 0; color: #999; font-size: 12px;">Generated via Biznova - Business Management System</p>
                    </div>
                </div>
            `;

            const opt = {
                margin: [10, 10, 10, 10],
                filename: `Invoice_${sale._id.substring(0, 8).toUpperCase()}_${saleDate.replace(/\s/g, '_')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff'
                },
                jsPDF: { 
                    unit: 'mm', 
                    format: 'a4', 
                    orientation: 'portrait' 
                }
            };

            await html2pdf().set(opt).from(invoiceElement).save();
            
            toast.success(t('sales.toast.downloaded'), { 
                id: 'invoice',
                duration: 3000 
            });
        } catch (error) {
            console.error('Error generating invoice:', error);
            toast.error(t('sales.toast.error'), { 
                id: 'invoice',
                duration: 3000 
            });
        }
    };

    // Export to PDF
    const exportSalesToPDF = () => {
        const element = document.createElement('div');
        element.style.padding = '20px';
        element.style.fontFamily = 'Arial, sans-serif';
        
        const now = new Date().toLocaleDateString();
        const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
        
        element.innerHTML = `
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #4F46E5; margin-bottom: 10px;">Sales Report</h1>
                <p style="color: #666;">Generated on: ${now}</p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px; background: #F3F4F6;"><strong>Total Sales:</strong></td>
                        <td style="padding: 10px;">${filteredSales.length}</td>
                        <td style="padding: 10px; background: #F3F4F6;"><strong>Total Revenue:</strong></td>
                        <td style="padding: 10px;">₹${totalRevenue.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; background: #F3F4F6;"><strong>Payment Filter:</strong></td>
                        <td colspan="3" style="padding: 10px;">${paymentFilter !== 'All' ? paymentFilter : 'All Payment Methods'}</td>
                    </tr>
                </table>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background: #4F46E5; color: white;">
                        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Date</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Customer</th>
                        <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Items</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Payment</th>
                        <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredSales.map((sale, index) => `
                        <tr style="background: ${index % 2 === 0 ? '#F9FAFB' : 'white'};">
                            <td style="padding: 10px; border: 1px solid #ddd;">${new Date(sale.createdAt).toLocaleDateString()}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${sale.customer_name || 'Walk-in Customer'}</td>
                            <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${sale.items?.length || 0}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${sale.payment_method}</td>
                            <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">₹${(sale.total_amount || 0).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #E5E7EB; text-align: center; color: #666;">
                <p>This report was auto-generated by Biznova Sales Management System</p>
            </div>
        `;

        const opt = {
            margin: 10,
            filename: `sales-report-${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save();
        toast.success('PDF exported successfully!', {
            position: 'top-right',
            duration: 3000,
        });
    };

    return (
        <div className="space-y-6">
            <Toaster />
            
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('sales.title')}</h1>
                    <p className="text-gray-600 dark:text-gray-400">{t('sales.subtitle')}</p>
                </div>
                <button
                    onClick={() => {
                        if (inventory.length === 0) {
                            toast.error(t('sales.toast.noInventory'), {
                                duration: 4000,
                                position: 'top-right',
                            });
                        } else {
                            setShowModal(true);
                        }
                    }}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    {t('sales.newSale')}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('sales.totalSales')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{sales.reduce((sum, sale) => sum + sale.total_amount, 0)}</p>
                        </div>
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Plus className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('sales.todaysSales')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{todaysSales.totalRevenue?.toLocaleString() || 0}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{todaysSales.salesCount || 0} {t('sales.transactions')}</p>
                        </div>
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Plus className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('sales.totalOrders')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{sales.length}</p>
                        </div>
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Plus className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('sales.avgOrderValue')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{sales.length > 0 ? Math.round(sales.reduce((sum, sale) => sum + sale.total_amount, 0) / sales.length) : 0}</p>
                        </div>
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Plus className="h-6 w-6 text-orange-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Sales Table */}
            <div className="card">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('sales.recentSales')}</h2>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setShowFilterModal(true)}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <Filter className="h-4 w-4" />
                            Filter
                            {paymentFilter !== 'All' && (
                                <span className="ml-1 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-800 rounded-full">
                                    Active
                                </span>
                            )}
                        </button>
                        <button 
                            onClick={exportSalesToPDF}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <Download className="h-4 w-4" />
                            Export PDF
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
                    </div>
                ) : sales.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500 dark:text-gray-400">{t('sales.noSales')}</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="btn-primary mt-4"
                        >
                            {t('sales.createFirstSale')}
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                                <thead className="bg-gray-50 dark:bg-gray-900">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Items</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">COGS</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Profit</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-800">
                                    {filteredSales.slice(0, itemsToShow).map((sale) => (
                                    <tr key={sale._id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {new Date(sale.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {sale.customer_name || 'Walk-in Customer'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {sale.items?.length || 0} item(s)
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                            ₹{sale.total_amount?.toLocaleString() || 0}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                                            ₹{sale.total_cogs?.toLocaleString() || 0}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                            ₹{sale.gross_profit?.toLocaleString() || 0}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {sale.payment_method}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleView(sale)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="View Details"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => downloadInvoice(sale)}
                                                    className="text-green-600 hover:text-green-900"
                                                    title="Download Invoice"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(sale)}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                    title="Edit Sale"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(sale._id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Delete Sale"
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
                    {filteredSales.length > itemsToShow && (
                        <div className="mt-4 text-center">
                            <button
                                onClick={() => setItemsToShow(prev => prev + 15)}
                                className="btn-secondary inline-flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Load More ({filteredSales.length - itemsToShow} remaining)
                            </button>
                        </div>
                    )}
                    
                    {/* Show All Button (if more than 30 items) */}
                    {filteredSales.length > 30 && itemsToShow < filteredSales.length && (
                        <div className="mt-2 text-center">
                            <button
                                onClick={() => setItemsToShow(filteredSales.length)}
                                className="text-sm text-indigo-600 hover:text-indigo-800"
                            >
                                Show All {filteredSales.length} Items
                            </button>
                        </div>
                    )}
                </>
            )}
            </div>

            {/* Sale Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-800 w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white dark:bg-black">
                        <div className="mt-3">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                    {editingSale ? 'Edit Sale' : 'New Sale'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingSale(null);
                                        setFormData({
                                            items: [{ item_name: '', quantity: 1, price_per_unit: 0 }],
                                            payment_method: 'Cash',
                                            customer_phone: '',
                                            customer_name: ''
                                        });
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Customer Information */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-white">Customer Name</label>
                                        <input
                                            type="text"
                                            value={formData.customer_name}
                                            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                                            className="input-field"
                                            placeholder="Customer name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-white">Customer Phone</label>
                                        <input
                                            type="tel"
                                            value={formData.customer_phone}
                                            onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                                            className="input-field"
                                            placeholder="Phone number"
                                        />
                                    </div>
                                </div>

                                {/* Items */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-white">Items</label>
                                        <button
                                            type="button"
                                            onClick={addItem}
                                            className="text-sm text-primary-600 hover:text-primary-500"
                                        >
                                            + Add Item
                                        </button>
                                    </div>
                                    {formData.items.map((item, index) => (
                                        <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                                            <div className="col-span-5">
                                                <select
                                                    value={item.item_name}
                                                    onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                                                    className="input-field"
                                                    required
                                                >
                                                    <option value="">Select item...</option>
                                                    {inventory.map((invItem) => (
                                                        <option key={invItem._id} value={invItem.item_name}>
                                                            {invItem.item_name} (Stock: {invItem.stock_qty})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <select
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                                                    className="input-field"
                                                    required
                                                    disabled={!item.item_name}
                                                >
                                                    <option value="">Qty</option>
                                                    {item.item_name && Array.from(
                                                        { length: getAvailableQuantity(item.item_name) }, 
                                                        (_, i) => i + 1
                                                    ).map(qty => (
                                                        <option key={qty} value={qty}>{qty}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-span-3">
                                                <input
                                                    type="number"
                                                    value={item.price_per_unit}
                                                    onChange={(e) => updateItem(index, 'price_per_unit', parseFloat(e.target.value) || 0)}
                                                    className="input-field"
                                                    placeholder="Selling Price"
                                                    min="0"
                                                    step="0.01"
                                                    required
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <span className="text-sm font-medium text-gray-900">
                                                    ₹{(item.quantity * item.price_per_unit).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="col-span-1">
                                                {formData.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Payment Method */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-white">Payment Method</label>
                                    <select
                                        value={formData.payment_method}
                                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                                        className="input-field"
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Credit">Credit</option>
                                    </select>
                                </div>

                                {/* Total */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-medium text-gray-900">Total Amount:</span>
                                        <span className="text-xl font-bold text-gray-900">₹{calculateTotal()}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowModal(false);
                                            setEditingSale(null);
                                        }}
                                        className="btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        {editingSale ? 'Update Sale' : 'Create Sale'}
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
                    <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-800 w-11/12 md:w-96 shadow-lg rounded-md bg-white dark:bg-black">
                        <div className="mt-3">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Filter Sales</h3>
                                <button
                                    onClick={() => setShowFilterModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Payment Method
                                    </label>
                                    <select
                                        value={paymentFilter}
                                        onChange={(e) => setPaymentFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    >
                                        <option value="All">All Payment Methods</option>
                                        <option value="Cash">Cash</option>
                                        <option value="Card">Card</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                    </select>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-600">
                                        <span className="font-medium">Results:</span> {filteredSales.length} sales
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => {
                                            setPaymentFilter('All');
                                            setShowFilterModal(false);
                                        }}
                                        className="flex-1 btn-secondary"
                                    >
                                        Clear Filter
                                    </button>
                                    <button
                                        onClick={() => setShowFilterModal(false)}
                                        className="flex-1 btn-primary"
                                    >
                                        Apply Filter
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Sale Modal */}
            {showViewModal && viewingSale && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-800 w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white dark:bg-black">
                        <div className="mt-3">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Sale Details</h3>
                                <button
                                    onClick={() => {
                                        setShowViewModal(false);
                                        setViewingSale(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Date</label>
                                        <p className="text-base text-gray-900">{new Date(viewingSale.createdAt).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Customer</label>
                                        <p className="text-base text-gray-900">{viewingSale.customer_name || 'Walk-in Customer'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Payment Method</label>
                                        <p className="text-base text-gray-900">{viewingSale.payment_method}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Customer Phone</label>
                                        <p className="text-base text-gray-900">{viewingSale.customer_phone || 'N/A'}</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-600 mb-2 block">Items</label>
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Qty</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Price</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {viewingSale.items?.map((item, index) => (
                                                    <tr key={index}>
                                                        <td className="px-4 py-2 text-sm text-gray-900">{item.item_name}</td>
                                                        <td className="px-4 py-2 text-sm text-center text-gray-900">{item.quantity}</td>
                                                        <td className="px-4 py-2 text-sm text-right text-gray-900">₹{item.price_per_unit?.toLocaleString()}</td>
                                                        <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                                                            ₹{(item.quantity * item.price_per_unit)?.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="border-t pt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-600">Revenue:</span>
                                        <span className="text-base font-semibold text-green-600">₹{viewingSale.total_amount?.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-600">COGS:</span>
                                        <span className="text-base font-semibold text-red-600">₹{viewingSale.total_cogs?.toLocaleString() || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-base font-bold text-gray-900">Gross Profit:</span>
                                        <span className="text-lg font-bold text-blue-600">₹{viewingSale.gross_profit?.toLocaleString() || 0}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setShowViewModal(false);
                                        setViewingSale(null);
                                    }}
                                    className="w-full btn-secondary"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sales;
