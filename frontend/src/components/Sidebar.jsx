import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Users,
  Brain,
  Truck,
  BarChart3,
  MessageSquare,
  Tag
} from 'lucide-react';

/**
 * Sidebar Component
 * Navigation menu on the left side with indigo color scheme
 */
const Sidebar = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  const menu = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('nav.sales'), href: '/dashboard/sales', icon: ShoppingCart },
    { name: t('nav.expenses'), href: '/dashboard/expenses', icon: Receipt },
    { name: t('nav.inventory'), href: '/dashboard/inventory', icon: Package },
    { name: t('nav.customers'), href: '/dashboard/customers', icon: Users },
    { name: 'Wholesalers', href: '/dashboard/wholesalers', icon: Truck },
    { name: t('nav.aiInsights'), href: '/dashboard/ai', icon: Brain },
    { name: t('nav.analytics'), href: '/dashboard/analytics', icon: BarChart3 },
  ];

  return (
    <div
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
    >
      {/* Sidebar header */}
      <div className="p-5 text-2xl font-bold text-indigo-600 dark:text-indigo-400 border-b border-gray-200 dark:border-gray-800">{t('nav.appName')}</div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {menu.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-colors text-left ${isActive
                  ? 'bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-400'
                  : 'text-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
