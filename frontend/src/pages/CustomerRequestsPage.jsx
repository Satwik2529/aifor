import React from 'react';
import CustomerRequests from '../components/CustomerRequests';

/**
 * Customer Requests Page for Retailers
 * Displays all customer requests sent to the retailer
 */
const CustomerRequestsPage = () => {
  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <CustomerRequests />
    </div>
  );
};

export default CustomerRequestsPage;
