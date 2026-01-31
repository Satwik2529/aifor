import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API calls
export const authAPI = {
    // Register user
    register: async (userData) => {
        const response = await api.post('/auth/register', userData);
        return response.data;
    },

    // Login user
    login: async (credentials) => {
        const response = await api.post('/auth/login', credentials);
        return response.data;
    },

    // Get user profile
    getProfile: async () => {
        const response = await api.get('/auth/profile');
        return response.data;
    },

    // Update user profile
    updateProfile: async (userData) => {
        const response = await api.put('/auth/profile', userData);
        return response.data;
    },
};

// Sales API calls
export const salesAPI = {
    // Get all sales
    getSales: async () => {
        const response = await api.get('/sales');
        return response.data;
    },

    // Create new sale
    createSale: async (saleData) => {
        const response = await api.post('/sales', saleData);
        return response.data;
    },

    // Get sale by ID
    getSaleById: async (id) => {
        const response = await api.get(`/sales/${id}`);
        return response.data;
    },

    // Update sale
    updateSale: async (id, saleData) => {
        const response = await api.put(`/sales/${id}`, saleData);
        return response.data;
    },

    // Delete sale
    deleteSale: async (id) => {
        const response = await api.delete(`/sales/${id}`);
        return response.data;
    },

    // Get today's sales summary
    getTodaysSales: async () => {
        const response = await api.get('/sales/today/summary');
        return response.data;
    },
};

// Expenses API calls
export const expensesAPI = {
    // Get all expenses
    getExpenses: async () => {
        const response = await api.get('/expenses');
        return response.data;
    },

    // Create new expense
    createExpense: async (expenseData) => {
        const response = await api.post('/expenses', expenseData);
        return response.data;
    },

    // Get expense by ID
    getExpenseById: async (id) => {
        const response = await api.get(`/expenses/${id}`);
        return response.data;
    },

    // Update expense
    updateExpense: async (id, expenseData) => {
        const response = await api.put(`/expenses/${id}`, expenseData);
        return response.data;
    },

    // Delete expense
    deleteExpense: async (id) => {
        const response = await api.delete(`/expenses/${id}`);
        return response.data;
    },
};

// Inventory API calls
export const inventoryAPI = {
    // Get all inventory items
    getInventory: async () => {
        const response = await api.get('/inventory');
        return response.data;
    },

    // Create new inventory item
    createInventoryItem: async (itemData) => {
        const response = await api.post('/inventory', itemData);
        return response.data;
    },

    // Get inventory item by ID
    getInventoryItemById: async (id) => {
        const response = await api.get(`/inventory/${id}`);
        return response.data;
    },

    // Update inventory item
    updateInventoryItem: async (id, itemData) => {
        const response = await api.put(`/inventory/${id}`, itemData);
        return response.data;
    },

    // Delete inventory item
    deleteInventoryItem: async (id) => {
        const response = await api.delete(`/inventory/${id}`);
        return response.data;
    },
};

// Customers API calls
export const customersAPI = {
    // Get all customers
    getCustomers: async () => {
        const response = await api.get('/customers');
        return response.data;
    },

    // Create new customer
    createCustomer: async (customerData) => {
        const response = await api.post('/customers', customerData);
        return response.data;
    },

    // Get customer by ID
    getCustomerById: async (id) => {
        const response = await api.get(`/customers/${id}`);
        return response.data;
    },

    // Update customer
    updateCustomer: async (id, customerData) => {
        const response = await api.put(`/customers/${id}`, customerData);
        return response.data;
    },

    // Delete customer
    deleteCustomer: async (id) => {
        const response = await api.delete(`/customers/${id}`);
        return response.data;
    },
};

// AI API calls
export const aiAPI = {
    // Chat with AI Assistant
    chatWithAI: async (chatData) => {
        const response = await api.post('/ai/chat', chatData);
        return response.data;
    },

    // Get business insights
    getBusinessInsights: async () => {
        const response = await api.get('/ai/insights');
        return response.data;
    },

    // Get daily digest
    getDailyDigest: async () => {
        const response = await api.get('/ai/daily-digest');
        return response.data;
    },

    // Process voice input
    processVoiceInput: async (audioData) => {
        const response = await api.post('/ai/voice-input', audioData);
        return response.data;
    },

    // Generate image
    generateImage: async (imageData) => {
        const response = await api.post('/ai/generate-image', imageData);
        return response.data;
    },
};

// Profit Analytics API calls
export const profitAnalyticsAPI = {
    // Get complete profit analysis
    getProfitAnalysis: async (params = {}) => {
        const response = await api.get('/profit-analytics', { params });
        return response.data;
    },

    // Get sales breakdown with COGS
    getSalesBreakdown: async (params = {}) => {
        const response = await api.get('/profit-analytics/sales-breakdown', { params });
        return response.data;
    },

    // Get expenses breakdown (sales vs operating)
    getExpensesBreakdown: async (params = {}) => {
        const response = await api.get('/profit-analytics/expenses-breakdown', { params });
        return response.data;
    },

    // Get inventory status with remaining value
    getInventoryStatus: async () => {
        const response = await api.get('/profit-analytics/inventory-status');
        return response.data;
    },

    // Get sales vs expenses time series data
    getTimeSeries: async (params = {}) => {
        const response = await api.get('/profit-analytics/time-series', { params });
        return response.data;
    },

    // Get sales by category
    getSalesByCategory: async (params = {}) => {
        const response = await api.get('/profit-analytics/sales-by-category', { params });
        return response.data;
    },

    // Get top selling products
    getTopProducts: async (params = {}) => {
        const response = await api.get('/profit-analytics/top-products', { params });
        return response.data;
    },

    // Get performance insights with month-over-month comparisons
    getPerformanceInsights: async () => {
        const response = await api.get('/profit-analytics/performance-insights');
        return response.data;
    },
};

// AI Insights API calls
export const aiInsightsAPI = {
    // Get all AI insights
    getAllInsights: async (params = {}) => {
        const response = await api.get('/ai-insights', { params });
        return response.data;
    },

    // Generate demand forecast using Gemini AI
    generateDemandForecast: async (params = {}) => {
        const response = await api.get('/ai-insights/generate/demand-forecast', { params });
        return response.data;
    },

    // Generate revenue optimization strategies using Gemini AI
    generateRevenueOptimization: async () => {
        const response = await api.get('/ai-insights/generate/revenue-optimization');
        return response.data;
    },

    // Generate expense forecast using Gemini AI
    generateExpenseForecast: async () => {
        const response = await api.get('/ai-insights/generate/expense-forecast');
        return response.data;
    },

    // Get latest insights
    getLatestInsights: async (limit = 5) => {
        const response = await api.get('/ai-insights/latest', {
            params: { limit }
        });
        return response.data;
    },

    // Get insight by ID
    getInsightById: async (id) => {
        const response = await api.get(`/ai-insights/${id}`);
        return response.data;
    },

    // Create new insight
    createInsight: async (insightData) => {
        const response = await api.post('/ai-insights', insightData);
        return response.data;
    },

    // Update insight
    updateInsight: async (id, insightData) => {
        const response = await api.put(`/ai-insights/${id}`, insightData);
        return response.data;
    },

    // Delete insight
    deleteInsight: async (id) => {
        const response = await api.delete(`/ai-insights/${id}`);
        return response.data;
    },
};

// Chatbot API calls
export const chatbotAPI = {
    // Send message to chatbot
    chat: async (message, language = 'en') => {
        const response = await api.post('/chatbot/chat', { message, language });
        return response.data;
    },

    // Get chatbot status
    getStatus: async () => {
        const response = await api.get('/chatbot/status');
        return response.data;
    },
};

export default api;
