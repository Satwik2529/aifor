import React, { useState, useEffect } from 'react';
import { Plus, Filter, Download, Edit, Trash2, X, DollarSign } from 'lucide-react';
import { expensesAPI } from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import html2pdf from 'html2pdf.js';
import { useTranslation } from 'react-i18next';

/**
 * Expenses Page Component
 * Content-only component for expense management - no layout concerns
 * Renders inside DashboardLayout via React Router Outlet
 */

const Expenses = () => {
    const { t } = useTranslation();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [monthlyExpenses, setMonthlyExpenses] = useState(0);
    const [itemsToShow, setItemsToShow] = useState(15); // Show 15 items initially
    const [formData, setFormData] = useState({
        amount: '',
        description: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        is_sales_expense: false
    });

    useEffect(() => {
        fetchExpenses();
    }, []);

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const response = await expensesAPI.getExpenses({ limit: 1000 }); // Request up to 1000 items
            if (response.success) {
                setExpenses(response.data);
                calculateMonthlyExpenses(response.data);
            }
        } catch (error) {
            console.error('Error fetching expenses:', error);
            toast.error('Failed to fetch expenses');
        } finally {
            setLoading(false);
        }
    };

    const calculateMonthlyExpenses = (expensesData) => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const monthTotal = expensesData.reduce((sum, expense) => {
            const expenseDate = new Date(expense.createdAt);
            if (expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear) {
                return sum + expense.amount;
            }
            return sum;
        }, 0);
        
        setMonthlyExpenses(monthTotal);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingExpense) {
                await expensesAPI.updateExpense(editingExpense._id, formData);
                toast.success(t('expenses.toast.updated'), {
                    position: 'top-right',
                    duration: 3000,
                });
            } else {
                await expensesAPI.createExpense(formData);
                toast.success(t('expenses.toast.created'), {
                    position: 'top-right',
                    duration: 3000,
                });
            }
            setShowModal(false);
            setEditingExpense(null);
            setFormData({
                amount: '',
                description: '',
                category: '',
                date: new Date().toISOString().split('T')[0],
                is_sales_expense: false
            });
            fetchExpenses();
        } catch (error) {
            console.error('Error saving expense:', error);
            toast.error(t('expenses.toast.error'), {
                position: 'top-right',
                duration: 4000,
            });
        }
    };

    // Delete expense
    const handleDelete = async (id) => {
        if (window.confirm(t('expenses.deleteExpense'))) {
            try {
                await expensesAPI.deleteExpense(id);
                toast.success(t('expenses.toast.deleted'), {
                    position: 'top-right',
                    duration: 3000,
                });
                fetchExpenses();
            } catch (error) {
                console.error('Error deleting expense:', error);
                toast.error(t('expenses.toast.error'), {
                    position: 'top-right',
                    duration: 4000,
                });
            }
        }
    };

    // Filter expenses by category
    const getFilteredExpenses = () => {
        if (categoryFilter === 'All') return expenses;
        return expenses.filter(expense => expense.category === categoryFilter);
    };

    const filteredExpenses = getFilteredExpenses();

    // Export to PDF
    const exportExpensesToPDF = () => {
        const element = document.createElement('div');
        element.style.padding = '20px';
        element.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="margin: 0; color: #4F46E5;">Expense Report</h1>
                <p style="margin: 5px 0; color: #666;">Generated on ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div style="margin-bottom: 20px; padding: 15px; background: #F3F4F6; border-radius: 8px;">
                <h3 style="margin: 0 0 10px 0;">Summary</h3>
                <p style="margin: 5px 0;"><strong>Total Expenses:</strong> ₹${expenses.reduce((sum, expense) => sum + expense.amount, 0).toLocaleString()}</p>
                <p style="margin: 5px 0;"><strong>This Month:</strong> ₹${monthlyExpenses.toLocaleString()}</p>
                <p style="margin: 5px 0;"><strong>Total Entries:</strong> ${expenses.length}</p>
                <p style="margin: 5px 0;"><strong>Filter Applied:</strong> ${categoryFilter !== 'All' ? categoryFilter : 'None'}</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background-color: #4F46E5; color: white;">
                        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Date</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Description</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Category</th>
                        <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredExpenses.map((expense, index) => `
                        <tr style="background-color: ${index % 2 === 0 ? '#F9FAFB' : 'white'};">
                            <td style="padding: 10px; border: 1px solid #ddd;">${new Date(expense.createdAt).toLocaleDateString()}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${expense.description}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${expense.category}</td>
                            <td style="padding: 10px; text-align: right; border: 1px solid #ddd; font-weight: bold;">₹${expense.amount.toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr style="background-color: #EEF2FF; font-weight: bold;">
                        <td colspan="3" style="padding: 12px; text-align: right; border: 1px solid #ddd;">Total:</td>
                        <td style="padding: 12px; text-align: right; border: 1px solid #ddd; color: #4F46E5;">
                            ₹${filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0).toLocaleString()}
                        </td>
                    </tr>
                </tfoot>
            </table>
        `;

        const opt = {
            margin: 10,
            filename: `expenses-report-${new Date().toISOString().split('T')[0]}.pdf`,
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

    const categories = [
        'Rent', 'Utilities', 'Supplies', 'Marketing', 'Transportation',
        'Equipment', 'Maintenance', 'Insurance', 'Professional Services', 'Other'
    ];

    return (
        <div className="space-y-6">
            <Toaster />
            
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('expenses.title')}</h1>
                    <p className="text-gray-600 dark:text-gray-400">{t('expenses.subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    {t('expenses.addExpense')}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('expenses.totalExpenses')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                ₹{expenses.reduce((sum, expense) => sum + expense.amount, 0)}
                            </p>
                        </div>
                        <div className="p-2 bg-red-100 rounded-lg">
                            <DollarSign className="h-6 w-6 text-red-600" />
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('expenses.thisMonth')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{monthlyExpenses.toLocaleString()}</p>
                        </div>
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <DollarSign className="h-6 w-6 text-orange-600" />
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('expenses.totalEntries')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{expenses.length}</p>
                        </div>
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <DollarSign className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('expenses.avgExpense')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                ₹{expenses.length > 0 ? Math.round(expenses.reduce((sum, expense) => sum + expense.amount, 0) / expenses.length) : 0}
                            </p>
                        </div>
                        <div className="p-2 bg-green-100 rounded-lg">
                            <DollarSign className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Expenses Table */}
            <div className="card">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('expenses.recentExpenses')}</h2>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setShowFilterModal(true)}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <Filter className="h-4 w-4" />
                            Filter
                            {categoryFilter !== 'All' && (
                                <span className="ml-1 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-800 rounded-full">
                                    Active
                                </span>
                            )}
                        </button>
                        <button 
                            onClick={exportExpensesToPDF}
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
                        <p className="mt-2 text-gray-600 dark:text-gray-400">Loading expenses...</p>
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500">No expenses recorded yet</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="btn-primary mt-4"
                        >
                            Add First Expense
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredExpenses.slice(0, itemsToShow).map((expense) => (
                                    <tr key={expense._id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(expense.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {expense.description}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {expense.is_sales_expense ? (
                                                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full flex items-center gap-1 w-fit">
                                                    🎯 Sales
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full flex items-center gap-1 w-fit">
                                                    🏢 Operating
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            ₹{expense.amount}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingExpense(expense);
                                                        setFormData({
                                                            amount: expense.amount,
                                                            description: expense.description,
                                                            category: expense.category,
                                                            date: new Date(expense.createdAt).toISOString().split('T')[0],
                                                            is_sales_expense: expense.is_sales_expense || false
                                                        });
                                                        setShowModal(true);
                                                    }}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                    title="Edit Expense"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(expense._id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Delete Expense"
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
                    {filteredExpenses.length > itemsToShow && (
                        <div className="mt-4 text-center">
                            <button
                                onClick={() => setItemsToShow(prev => prev + 15)}
                                className="btn-secondary inline-flex items-center gap-2"
                            >
                                <DollarSign className="h-4 w-4" />
                                Load More ({filteredExpenses.length - itemsToShow} remaining)
                            </button>
                        </div>
                    )}
                    
                    {/* Show All Button (if more than 30 items) */}
                    {filteredExpenses.length > 30 && itemsToShow < filteredExpenses.length && (
                        <div className="mt-2 text-center">
                            <button
                                onClick={() => setItemsToShow(filteredExpenses.length)}
                                className="text-sm text-indigo-600 hover:text-indigo-800"
                            >
                                Show All {filteredExpenses.length} Items
                            </button>
                        </div>
                    )}
                </>
            )}
            </div>

            {/* Expense Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900">
                                    {editingExpense ? 'Edit Expense' : 'Add Expense'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingExpense(null);
                                        setFormData({
                                            amount: '',
                                            description: '',
                                            category: '',
                                            date: new Date().toISOString().split('T')[0],
                                            is_sales_expense: false
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
                                        <label className="block text-sm font-medium text-gray-700">Amount</label>
                                        <input
                                            type="number"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                            className="input-field"
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Date</label>
                                        <input
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="input-field"
                                            required
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
                                        placeholder="Describe the expense..."
                                        required
                                    />
                                </div>

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

                                {/* Sales Expense Checkbox - Enhanced */}
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-start">
                                        <div className="flex items-center h-5 mt-1">
                                            <input
                                                id="is_sales_expense"
                                                type="checkbox"
                                                checked={formData.is_sales_expense}
                                                onChange={(e) => setFormData({ ...formData, is_sales_expense: e.target.checked })}
                                                className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                            />
                                        </div>
                                        <div className="ml-3">
                                            <label htmlFor="is_sales_expense" className="text-sm font-semibold text-gray-900 cursor-pointer">
                                                🎯 Mark as Sales-Related Expense
                                            </label>
                                            <p className="text-xs text-gray-600 mt-1">
                                                <strong>Check this for:</strong> Marketing, Advertising, Commissions, Shipping, Promotional costs
                                            </p>
                                            <p className="text-xs text-gray-600 mt-1">
                                                <strong>Leave unchecked for:</strong> Rent, Utilities, Salaries, Insurance, Maintenance
                                            </p>
                                            <p className="text-xs text-blue-700 font-medium mt-2">
                                                This helps calculate accurate profit margins in Analytics
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowModal(false);
                                            setEditingExpense(null);
                                        }}
                                        className="btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        {editingExpense ? 'Update Expense' : 'Add Expense'}
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
                                <h3 className="text-lg font-medium text-gray-900">Filter Expenses</h3>
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
                                        Category
                                    </label>
                                    <select
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    >
                                        <option value="All">All Categories</option>
                                        {categories.map((category) => (
                                            <option key={category} value={category}>
                                                {category}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-600">
                                        <span className="font-medium">Results:</span> {filteredExpenses.length} expenses
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => {
                                            setCategoryFilter('All');
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

export default Expenses;
