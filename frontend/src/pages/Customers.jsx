import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, Edit, Trash2, Users, Phone, Mail, X } from 'lucide-react';
import { customersAPI } from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import html2pdf from 'html2pdf.js';
import { useTranslation } from 'react-i18next';

const Customers = () => {
    const { t } = useTranslation();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [creditFilter, setCreditFilter] = useState('All');
    const [itemsToShow, setItemsToShow] = useState(15); // Show 15 items initially
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        credit_balance: 0,
        notes: ''
    });

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const response = await customersAPI.getCustomers({ limit: 1000 }); // Request up to 1000 items
            if (response.success) {
                setCustomers(response.data);
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
            toast.error('Failed to fetch customers');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingCustomer) {
                await customersAPI.updateCustomer(editingCustomer._id, formData);
                toast.success(t('customers.toast.updated'), {
                    position: 'top-right',
                    duration: 3000,
                });
            } else {
                await customersAPI.createCustomer(formData);
                toast.success(t('customers.toast.created'), {
                    position: 'top-right',
                    duration: 3000,
                });
            }
            setShowModal(false);
            setEditingCustomer(null);
            setFormData({
                name: '',
                phone: '',
                email: '',
                address: '',
                credit_balance: 0,
                notes: ''
            });
            fetchCustomers();
        } catch (error) {
            console.error('Error saving customer:', error);
            toast.error(t('customers.toast.error'), {
                position: 'top-right',
                duration: 4000,
            });
        }
    };

    // Delete customer
    const handleDelete = async (id) => {
        if (window.confirm(t('customers.deleteCustomer'))) {
            try {
                await customersAPI.deleteCustomer(id);
                toast.success(t('customers.toast.deleted'), {
                    position: 'top-right',
                    duration: 3000,
                });
                fetchCustomers();
            } catch (error) {
                console.error('Error deleting customer:', error);
                toast.error(t('customers.toast.error'), {
                    position: 'top-right',
                    duration: 4000,
                });
            }
        }
    };

    // Filter and search customers
    const getFilteredCustomers = () => {
        let filtered = customers;

        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(customer =>
                customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                customer.phone.includes(searchQuery) ||
                (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        // Apply credit filter
        if (creditFilter !== 'All') {
            if (creditFilter === 'With Credit') {
                filtered = filtered.filter(customer => customer.credit_balance > 0);
            } else if (creditFilter === 'No Credit') {
                filtered = filtered.filter(customer => customer.credit_balance === 0);
            }
        }

        return filtered;
    };

    const filteredCustomers = getFilteredCustomers();

    // Export to PDF
    const exportCustomersToPDF = () => {
        const element = document.createElement('div');
        element.style.padding = '20px';
        element.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="margin: 0; color: #4F46E5;">Customer Directory</h1>
                <p style="margin: 5px 0; color: #666;">Generated on ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div style="margin-bottom: 20px; padding: 15px; background: #F3F4F6; border-radius: 8px;">
                <h3 style="margin: 0 0 10px 0;">Summary</h3>
                <p style="margin: 5px 0;"><strong>Total Customers:</strong> ${customers.length}</p>
                <p style="margin: 5px 0;"><strong>Customers with Credit:</strong> ${customers.filter(c => c.credit_balance > 0).length}</p>
                <p style="margin: 5px 0;"><strong>Total Outstanding Credit:</strong> ₹${customers.reduce((sum, customer) => sum + (customer.credit_balance || 0), 0).toLocaleString()}</p>
                <p style="margin: 5px 0;"><strong>Filter Applied:</strong> ${creditFilter !== 'All' ? creditFilter : 'None'}</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background-color: #4F46E5; color: white;">
                        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Name</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Phone</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Email</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Address</th>
                        <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Credit Balance</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredCustomers.map((customer, index) => `
                        <tr style="background-color: ${index % 2 === 0 ? '#F9FAFB' : 'white'};">
                            <td style="padding: 10px; border: 1px solid #ddd;">${customer.name}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${customer.phone}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${customer.email || 'N/A'}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${customer.address || 'N/A'}</td>
                            <td style="padding: 10px; text-align: right; border: 1px solid #ddd; font-weight: bold; color: ${customer.credit_balance > 0 ? '#DC2626' : '#059669'};">
                                ₹${(customer.credit_balance || 0).toLocaleString()}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr style="background-color: #EEF2FF; font-weight: bold;">
                        <td colspan="4" style="padding: 12px; text-align: right; border: 1px solid #ddd;">Total Outstanding Credit:</td>
                        <td style="padding: 12px; text-align: right; border: 1px solid #ddd; color: #DC2626;">
                            ₹${filteredCustomers.reduce((sum, customer) => sum + (customer.credit_balance || 0), 0).toLocaleString()}
                        </td>
                    </tr>
                </tfoot>
            </table>
        `;

        const opt = {
            margin: 10,
            filename: `customers-directory-${new Date().toISOString().split('T')[0]}.pdf`,
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
            <Toaster 
                position="top-right"
                toastOptions={{
                    duration: 10000,
                }}
            />
            
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('customers.title')}</h1>
                    <p className="text-gray-600 dark:text-gray-400">{t('customers.subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    {t('customers.addCustomer')}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Customers</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{customers.length}</p>
                        </div>
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Customers</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{customers.length}</p>
                        </div>
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Users className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Credit Customers</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {customers.filter(c => c.credit_balance > 0).length}
                            </p>
                        </div>
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <Users className="h-6 w-6 text-yellow-600" />
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Credit</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                ₹{customers.reduce((sum, customer) => sum + (customer.credit_balance || 0), 0)}
                            </p>
                        </div>
                        <div className="p-2 bg-red-100 rounded-lg">
                            <Users className="h-6 w-6 text-red-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="card">
                <div className="flex gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search customers by name, phone, or email..."
                                className="input-field pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowFilterModal(true)}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <Filter className="h-4 w-4" />
                        Filter
                        {creditFilter !== 'All' && (
                            <span className="ml-1 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-800 rounded-full">
                                Active
                            </span>
                        )}
                    </button>
                    <button 
                        onClick={exportCustomersToPDF}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Export PDF
                    </button>
                </div>
            </div>

            {/* Customers Table */}
            <div className="card">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Customer List</h2>
                </div>

                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Loading customers...</p>
                    </div>
                ) : customers.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500">No customers yet</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="btn-primary mt-4"
                        >
                            Add First Customer
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Balance</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredCustomers.slice(0, itemsToShow).map((customer) => (
                                    <tr key={customer._id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                            {customer.name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{customer.name}</div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">{customer.notes || 'No notes'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 dark:text-gray-100">
                                                <div className="flex items-center">
                                                    <Phone className="h-4 w-4 text-gray-400 mr-2" />
                                                    {customer.phone}
                                                </div>
                                                {customer.email && (
                                                    <div className="flex items-center mt-1">
                                                        <Mail className="h-4 w-4 text-gray-400 mr-2" />
                                                        {customer.email}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {customer.address || 'No address'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {customer.credit_balance > 0 ? (
                                                <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                                                    ₹{customer.credit_balance}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                                    No Credit
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingCustomer(customer);
                                                        setFormData({
                                                            name: customer.name,
                                                            phone: customer.phone,
                                                            email: customer.email || '',
                                                            address: customer.address || '',
                                                            credit_balance: customer.credit_balance || 0,
                                                            notes: customer.notes || ''
                                                        });
                                                        setShowModal(true);
                                                    }}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                    title="Edit Customer"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(customer._id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Delete Customer"
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
                    {filteredCustomers.length > itemsToShow && (
                        <div className="mt-4 text-center">
                            <button
                                onClick={() => setItemsToShow(prev => prev + 15)}
                                className="btn-secondary inline-flex items-center gap-2"
                            >
                                <Users className="h-4 w-4" />
                                Load More ({filteredCustomers.length - itemsToShow} remaining)
                            </button>
                        </div>
                    )}
                    
                    {/* Show All Button (if more than 30 items) */}
                    {filteredCustomers.length > 30 && itemsToShow < filteredCustomers.length && (
                        <div className="mt-2 text-center">
                            <button
                                onClick={() => setItemsToShow(filteredCustomers.length)}
                                className="text-sm text-indigo-600 hover:text-indigo-800"
                            >
                                Show All {filteredCustomers.length} Items
                            </button>
                        </div>
                    )}
                    </>
                )}
            </div>

            {/* Customer Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900">
                                    {editingCustomer ? 'Edit Customer' : 'Add Customer'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingCustomer(null);
                                        setFormData({
                                            name: '',
                                            phone: '',
                                            email: '',
                                            address: '',
                                            credit_balance: 0,
                                            notes: ''
                                        });
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="input-field"
                                            placeholder="Customer name"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="input-field"
                                            placeholder="Phone number"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="input-field"
                                        placeholder="Email address (optional)"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Address</label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="input-field"
                                        rows="3"
                                        placeholder="Customer address (optional)"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Credit Balance</label>
                                        <input
                                            type="number"
                                            value={formData.credit_balance}
                                            onChange={(e) => setFormData({ ...formData, credit_balance: parseFloat(e.target.value) || 0 })}
                                            className="input-field"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Notes</label>
                                        <input
                                            type="text"
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            className="input-field"
                                            placeholder="Customer notes (optional)"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowModal(false);
                                            setEditingCustomer(null);
                                        }}
                                        className="btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        {editingCustomer ? 'Update Customer' : 'Add Customer'}
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
                                <h3 className="text-lg font-medium text-gray-900">Filter Customers</h3>
                                <button
                                    onClick={() => setShowFilterModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Credit Balance Status
                                    </label>
                                    <select
                                        value={creditFilter}
                                        onChange={(e) => setCreditFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    >
                                        <option value="All">All Customers</option>
                                        <option value="With Credit">With Credit Balance</option>
                                        <option value="No Credit">No Credit Balance</option>
                                    </select>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-600">
                                        <span className="font-medium">Results:</span> {filteredCustomers.length} customers
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => {
                                            setCreditFilter('All');
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
        </div>
    );
};

export default Customers;
