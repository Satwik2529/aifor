import React, { useState } from 'react';
import { Users, MessageSquare } from 'lucide-react';
import Customers from './Customers';
import CustomerRequestsPage from './CustomerRequestsPage';

/**
 * Customers Hub - Combined page for all customer-related features
 * Tabs: Customers List, Customer Requests
 */
const CustomersHub = () => {
    const [activeTab, setActiveTab] = useState('customers');

    const tabs = [
        { id: 'customers', name: 'Customers List', icon: Users, color: 'indigo' },
        { id: 'requests', name: 'Customer Requests', icon: MessageSquare, color: 'orange' }
    ];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    Customers
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Manage your customers and their requests
                </p>
            </div>

            {/* Enhanced Tabs */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg border border-indigo-100 dark:border-gray-700">
                <div className="p-2">
                    <nav className="flex gap-2 overflow-x-auto">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                    flex items-center gap-3 px-6 py-4 rounded-lg text-sm font-semibold transition-all whitespace-nowrap min-w-fit
                    ${isActive
                                            ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-md scale-105 border-2 border-primary-200 dark:border-primary-800'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                                        }
                  `}
                                >
                                    <Icon className={`h-5 w-5 ${isActive ? 'animate-pulse' : ''}`} />
                                    <span>{tab.name}</span>
                                    {isActive && (
                                        <span className="ml-2 px-2 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs rounded-full">
                                            Active
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Tab Content with better spacing */}
                <div className="bg-white dark:bg-gray-900 rounded-b-xl p-3 sm:p-4">
                    {activeTab === 'customers' && <Customers />}
                    {activeTab === 'requests' && <CustomerRequestsPage />}
                </div>
            </div>
        </div>
    );
};

export default CustomersHub;
