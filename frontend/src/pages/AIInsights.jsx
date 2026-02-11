import React, { useState, useRef } from 'react';
import {
    Brain,
    TrendingUp,
    DollarSign,
    Calendar,
    Loader2,
    AlertCircle,
    CheckCircle,
    Sparkles,
    RefreshCw,
    Download,
    PartyPopper,
    Clock,
    Package,
    TrendingDown
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { aiInsightsAPI, chatbotAPI } from '../services/api';
import ReactMarkdown from 'react-markdown';
import html2pdf from 'html2pdf.js';
import { useTranslation } from 'react-i18next';

const AIInsights = () => {
    const { t } = useTranslation();

    // Chart colors
    const CHART_COLORS = {
        blue: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff'],
        green: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#ecfdf5'],
        purple: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#f5f3ff'],
        orange: ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7', '#fffbeb'],
        red: ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2', '#fef2f2'],
        pink: ['#ec4899', '#f472b6', '#f9a8d4', '#fbcfe8', '#fce7f3', '#fdf2f8']
    };

    const [activeTab, setActiveTab] = useState('demand');
    const [loading, setLoading] = useState({
        demand: false,
        revenue: false,
        expense: false,
        festival: false
    });
    const [insights, setInsights] = useState({
        demand: null,
        revenue: null,
        expense: null,
        festival: null
    });
    const [error, setError] = useState({
        demand: null,
        revenue: null,
        expense: null,
        festival: null
    });
    const [exportingPDF, setExportingPDF] = useState(false);

    // Load cached insights on mount
    React.useEffect(() => {
        const cachedInsights = localStorage.getItem('retailer_ai_insights');
        const cacheTimestamp = localStorage.getItem('retailer_ai_insights_timestamp');

        if (cachedInsights && cacheTimestamp) {
            try {
                const parsed = JSON.parse(cachedInsights);
                const cacheAge = Date.now() - parseInt(cacheTimestamp);
                // Use cache if less than 1 hour old
                if (cacheAge < 3600000) {
                    setInsights(parsed);
                }
            } catch (e) {
                console.error('Failed to parse cached insights:', e);
            }
        }
    }, []);

    // Chart data state
    const [chartData, setChartData] = useState({
        salesTrend: [],
        topProducts: [],
        revenueTrend: [],
        revenueByCategory: [],
        expenseTrend: [],
        expenseByCategory: []
    });

    // Refs for PDF export
    const demandRef = useRef(null);
    const revenueRef = useRef(null);
    const expenseRef = useRef(null);

    const tabs = [
        {
            id: 'demand',
            name: t('ai.tabs.demand.name'),
            icon: TrendingUp,
            color: 'blue',
            description: t('ai.tabs.demand.description')
        },
        {
            id: 'revenue',
            name: t('ai.tabs.revenue.name'),
            icon: DollarSign,
            color: 'green',
            description: t('ai.tabs.revenue.description')
        },
        {
            id: 'expense',
            name: t('ai.tabs.expense.name'),
            icon: Calendar,
            color: 'purple',
            description: t('ai.tabs.expense.description')
        },
        {
            id: 'festival',
            name: 'Festival Planning',
            icon: PartyPopper,
            color: 'orange',
            description: 'AI-powered festival demand forecasting for better inventory planning'
        }
    ];

    const generateInsight = async (type) => {
        setLoading(prev => ({ ...prev, [type]: true }));
        setError(prev => ({ ...prev, [type]: null }));

        try {
            let response;
            switch (type) {
                case 'demand':
                    response = await aiInsightsAPI.generateDemandForecast({ days: 30 });
                    break;
                case 'revenue':
                    response = await aiInsightsAPI.generateRevenueOptimization();
                    break;
                case 'expense':
                    response = await aiInsightsAPI.generateExpenseForecast();
                    break;
                case 'festival':
                    response = await chatbotAPI.getFestivalForecast();
                    break;
                default:
                    throw new Error('Invalid insight type');
            }

            if (response.success) {
                const newInsights = { ...insights, [type]: response.data || response };
                setInsights(newInsights);

                // Cache the insights
                localStorage.setItem('retailer_ai_insights', JSON.stringify(newInsights));
                localStorage.setItem('retailer_ai_insights_timestamp', Date.now().toString());
            } else {
                throw new Error(response.message || 'Failed to generate insights');
            }
        } catch (err) {
            console.error(`Error generating ${type} insights:`, err);
            setError(prev => ({
                ...prev,
                [type]: err.response?.data?.message || err.message || 'Failed to generate insights. Please try again.'
            }));
        } finally {
            setLoading(prev => ({ ...prev, [type]: false }));
        }
    };

    const exportToPDF = async (type) => {
        setExportingPDF(true);

        try {
            // Get the ref based on type
            let contentRef;
            switch (type) {
                case 'demand':
                    contentRef = demandRef;
                    break;
                case 'revenue':
                    contentRef = revenueRef;
                    break;
                case 'expense':
                    contentRef = expenseRef;
                    break;
                default:
                    throw new Error('Invalid type');
            }

            if (!contentRef.current) {
                throw new Error('Content not available for export');
            }

            // Show PDF header temporarily
            const pdfHeader = contentRef.current.querySelector('.pdf-header');
            if (pdfHeader) {
                pdfHeader.style.display = 'block';
            }

            // Get feature name
            const featureName = tabs.find(t => t.id === type)?.name || 'AI Insights';
            const fileName = `Biznova_${featureName.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.pdf`;

            // PDF options
            const opt = {
                margin: [10, 10, 10, 10],
                filename: fileName,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    letterRendering: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'portrait',
                    compress: true
                },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };

            // Generate PDF
            await html2pdf().set(opt).from(contentRef.current).save();

            // Hide PDF header again
            if (pdfHeader) {
                pdfHeader.style.display = 'none';
            }

        } catch (error) {
            console.error('Error exporting PDF:', error);
            alert('Failed to export PDF. Please try again.');

            // Make sure to hide header on error too
            const contentRef = type === 'demand' ? demandRef : type === 'revenue' ? revenueRef : expenseRef;
            const pdfHeader = contentRef.current?.querySelector('.pdf-header');
            if (pdfHeader) {
                pdfHeader.style.display = 'none';
            }
        } finally {
            setExportingPDF(false);
        }
    };

    // Fetch chart data for visualizations
    const fetchChartData = async () => {
        try {
            // Import api from services
            const { salesAPI, inventoryAPI, expensesAPI } = await import('../services/api');

            // Fetch sales data for demand charts
            const salesResponse = await salesAPI.getSales({ limit: 100 });
            if (salesResponse.success && salesResponse.data) {
                processSalesChartData(salesResponse.data);
            }

            // Fetch expenses data for expense charts
            const expensesResponse = await expensesAPI.getExpenses({ limit: 100 });
            if (expensesResponse.success && expensesResponse.data) {
                processExpenseChartData(expensesResponse.data);
            }
        } catch (error) {
            console.error('Error fetching chart data:', error);
        }
    };

    // Process sales data for charts
    const processSalesChartData = (sales) => {
        // Sales trend - group by date
        const salesByDate = {};
        const productSales = {};
        const categoryRevenue = {};

        sales.forEach(sale => {
            const date = new Date(sale.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
            salesByDate[date] = (salesByDate[date] || 0) + sale.total_amount;

            // Track product sales
            if (sale.items && Array.isArray(sale.items)) {
                sale.items.forEach(item => {
                    productSales[item.item_name] = (productSales[item.item_name] || 0) + item.quantity;

                    // Track category revenue
                    const category = item.category || 'Other';
                    categoryRevenue[category] = (categoryRevenue[category] || 0) + (item.price_per_unit * item.quantity);
                });
            }
        });

        // Convert to chart format
        const salesTrend = Object.entries(salesByDate)
            .slice(-30)
            .map(([date, amount]) => ({ date, revenue: Math.round(amount) }));

        const topProducts = Object.entries(productSales)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, quantity]) => ({ name: name.length > 15 ? name.substring(0, 15) + '...' : name, quantity }));

        const revenueByCategory = Object.entries(categoryRevenue)
            .map(([name, value]) => ({ name, value: Math.round(value) }));

        setChartData(prev => ({
            ...prev,
            salesTrend,
            topProducts,
            revenueTrend: salesTrend,
            revenueByCategory
        }));
    };

    // Process expense data for charts
    const processExpenseChartData = (expenses) => {
        const expensesByDate = {};
        const expensesByCategory = {};

        expenses.forEach(expense => {
            const date = new Date(expense.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
            expensesByDate[date] = (expensesByDate[date] || 0) + expense.amount;

            const category = expense.category || 'Other';
            expensesByCategory[category] = (expensesByCategory[category] || 0) + expense.amount;
        });

        const expenseTrend = Object.entries(expensesByDate)
            .slice(-30)
            .map(([date, amount]) => ({ date, amount: Math.round(amount) }));

        const expenseByCategory = Object.entries(expensesByCategory)
            .map(([name, value]) => ({ name, value: Math.round(value) }));

        setChartData(prev => ({
            ...prev,
            expenseTrend,
            expenseByCategory
        }));
    };

    // Fetch chart data on mount
    React.useEffect(() => {
        fetchChartData();
    }, []);

    const renderMetadata = (metadata) => {
        if (!metadata) return null;

        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {metadata.salesAnalyzed !== undefined && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-xs text-blue-600 font-medium">{t('ai.metadata.salesAnalyzed')}</p>
                        <p className="text-lg font-bold text-blue-900">{metadata.salesAnalyzed}</p>
                    </div>
                )}
                {metadata.inventoryItems !== undefined && (
                    <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-xs text-green-600 font-medium">{t('ai.metadata.inventoryItems')}</p>
                        <p className="text-lg font-bold text-green-900">{metadata.inventoryItems}</p>
                    </div>
                )}
                {metadata.expensesAnalyzed !== undefined && (
                    <div className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-xs text-purple-600 font-medium">{t('ai.metadata.expensesAnalyzed')}</p>
                        <p className="text-lg font-bold text-purple-900">{metadata.expensesAnalyzed}</p>
                    </div>
                )}
                {metadata.periodDays !== undefined && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600 font-medium">{t('ai.metadata.period')}</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{metadata.periodDays} {t('ai.metadata.days')}</p>
                    </div>
                )}
                {metadata.totalRevenue !== undefined && (
                    <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-xs text-green-600 font-medium">{t('ai.metadata.totalRevenue')}</p>
                        <p className="text-lg font-bold text-green-900">₹{metadata.totalRevenue.toLocaleString()}</p>
                    </div>
                )}
                {metadata.avgOrderValue !== undefined && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-xs text-blue-600 font-medium">{t('ai.metadata.avgOrderValue')}</p>
                        <p className="text-lg font-bold text-blue-900">₹{metadata.avgOrderValue.toLocaleString()}</p>
                    </div>
                )}
                {metadata.totalExpenses !== undefined && (
                    <div className="bg-red-50 p-3 rounded-lg">
                        <p className="text-xs text-red-600 font-medium">{t('ai.metadata.totalExpenses')}</p>
                        <p className="text-lg font-bold text-red-900">₹{metadata.totalExpenses.toLocaleString()}</p>
                    </div>
                )}
                {metadata.currentSeason && (
                    <div className="bg-orange-50 p-3 rounded-lg col-span-2">
                        <p className="text-xs text-orange-600 font-medium">{t('ai.metadata.currentSeason')}</p>
                        <p className="text-sm font-bold text-orange-900">{metadata.currentSeason}</p>
                    </div>
                )}
            </div>
        );
    };

    const renderFestivalForecast = () => {
        const festivalData = insights.festival;
        const isLoading = loading.festival;
        const errorMsg = error.festival;

        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-12 w-12 text-orange-600 animate-spin mb-4" />
                    <p className="text-gray-600">Analyzing festival demand...</p>
                    <p className="text-sm text-gray-500 mt-2">Checking upcoming festivals and your inventory</p>
                </div>
            );
        }

        if (errorMsg) {
            return (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <div className="flex items-start">
                        <AlertCircle className="h-6 w-6 text-red-600 mt-0.5 mr-3" />
                        <div>
                            <h3 className="text-red-900 font-semibold mb-2">Error</h3>
                            <p className="text-red-700 text-sm">{errorMsg}</p>
                            <button
                                onClick={() => generateInsight('festival')}
                                className="mt-4 btn-primary"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        if (!festivalData) {
            return (
                <div className="text-center py-20">
                    <PartyPopper className="h-16 w-16 text-orange-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Festival Demand Forecasting
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Get AI-powered recommendations on what to stock for upcoming Indian festivals based on your sales history and inventory.
                    </p>
                    <button
                        onClick={() => generateInsight('festival')}
                        className="btn-primary inline-flex items-center"
                    >
                        <PartyPopper className="h-5 w-5 mr-2" />
                        Generate Festival Forecast
                    </button>
                </div>
            );
        }

        // Parse the festival data from chatbot response
        const forecast = festivalData.tools_used?.includes('getFestivalDemandForecast')
            ? festivalData.results?.getFestivalDemandForecast
            : null;

        if (!forecast || !forecast.has_forecast) {
            return (
                <div className="text-center py-12">
                    <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        No Upcoming Festivals Found
                    </h3>
                    <p className="text-gray-600">
                        Check back later for festival recommendations
                    </p>
                </div>
            );
        }

        const { festival_name, months_away, is_imminent, demand_level, forecast_items, summary } = forecast;

        const getConfidenceBadge = (confidence) => {
            const badges = {
                'High': { bg: 'bg-green-100', text: 'text-green-800', icon: '✅' },
                'Medium': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⚠️' },
                'Low': { bg: 'bg-gray-100', text: 'text-gray-800', icon: 'ℹ️' }
            };
            return badges[confidence] || badges['Low'];
        };

        return (
            <div className="space-y-6">
                {/* Festival Header Card */}
                <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-lg p-6 text-white">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center mb-2">
                                <PartyPopper className="h-8 w-8 mr-3" />
                                <h2 className="text-2xl font-bold">{festival_name}</h2>
                            </div>
                            <div className="flex items-center space-x-4 text-sm">
                                <div className="flex items-center">
                                    <Clock className="h-4 w-4 mr-1" />
                                    <span>{months_away === 0 ? 'This month' : `${months_away} month${months_away > 1 ? 's' : ''} away`}</span>
                                </div>
                                <div className="flex items-center">
                                    <TrendingUp className="h-4 w-4 mr-1" />
                                    <span>{demand_level} Demand</span>
                                </div>
                                {is_imminent && (
                                    <span className="bg-white/20 px-2 py-1 rounded text-xs font-semibold">
                                        🔥 URGENT
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => generateInsight('festival')}
                            className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg flex items-center text-sm"
                        >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-600 font-medium">High Confidence</p>
                                <p className="text-2xl font-bold text-green-900">{summary.high_confidence}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-500" />
                        </div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-yellow-600 font-medium">Medium Confidence</p>
                                <p className="text-2xl font-bold text-yellow-900">{summary.medium_confidence}</p>
                            </div>
                            <AlertCircle className="h-8 w-8 text-yellow-500" />
                        </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Low Confidence</p>
                                <p className="text-2xl font-bold text-gray-900">{summary.low_confidence}</p>
                            </div>
                            <TrendingDown className="h-8 w-8 text-gray-500" />
                        </div>
                    </div>
                </div>

                {/* Recommended Items */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <Package className="h-5 w-5 mr-2 text-orange-600" />
                        Recommended Items to Stock
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {forecast_items.map((item, index) => {
                            const badge = getConfidenceBadge(item.confidence);
                            return (
                                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-3">
                                        <h4 className="font-semibold text-gray-900 flex-1">{item.item_name}</h4>
                                        <span className={`${badge.bg} ${badge.text} px-2 py-1 rounded text-xs font-medium`}>
                                            {badge.icon} {item.confidence}
                                        </span>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Current Stock:</span>
                                            <span className="font-medium text-gray-900">{item.current_stock} units</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Sales Velocity:</span>
                                            <span className="font-medium text-gray-900">{item.recent_sales_velocity} units/day</span>
                                        </div>
                                        <div className="pt-2 border-t border-gray-100">
                                            <p className="text-xs text-gray-600 mb-2">
                                                {item.reasoning}
                                            </p>
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${item.action.includes('Restock')
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                {item.action}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* AI Response */}
                {festivalData.message && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                            <Brain className="h-5 w-5 mr-2" />
                            AI Recommendations
                        </h3>
                        <div className="prose prose-sm max-w-none">
                            <ReactMarkdown
                                components={{
                                    p: ({ node, ...props }) => <p className="text-blue-800 mb-2" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 text-blue-800" {...props} />,
                                    li: ({ node, ...props }) => <li className="text-blue-800" {...props} />,
                                    strong: ({ node, ...props }) => <strong className="font-semibold text-blue-900" {...props} />,
                                }}
                            >
                                {festivalData.message}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderInsightContent = (type) => {
        // Special handling for festival forecast
        if (type === 'festival') {
            return renderFestivalForecast();
        }

        const insight = insights[type];
        const isLoading = loading[type];
        const errorMsg = error[type];

        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-12 w-12 text-primary-600 animate-spin mb-4" />
                    <p className="text-gray-600">{t('ai.analyzing')}</p>
                    <p className="text-sm text-gray-500 mt-2">{t('ai.analyzingTime')}</p>
                </div>
            );
        }

        if (errorMsg) {
            return (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <div className="flex items-start">
                        <AlertCircle className="h-6 w-6 text-red-600 mt-0.5 mr-3" />
                        <div>
                            <h3 className="text-red-900 font-semibold mb-2">{t('ai.error')}</h3>
                            <p className="text-red-700 text-sm">{errorMsg}</p>
                            <button
                                onClick={() => generateInsight(type)}
                                className="mt-4 btn-primary"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                {t('ai.tryAgain')}
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        if (!insight) {
            return (
                <div className="text-center py-20">
                    <Sparkles className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {tabs.find(t => t.id === type)?.name}
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        {tabs.find(t => t.id === type)?.description}
                    </p>
                    <button
                        onClick={() => generateInsight(type)}
                        className="btn-primary inline-flex items-center"
                    >
                        <Brain className="h-5 w-5 mr-2" />
                        {t('ai.generateButton')}
                    </button>
                </div>
            );
        }

        // Get the correct ref
        let contentRef;
        switch (type) {
            case 'demand':
                contentRef = demandRef;
                break;
            case 'revenue':
                contentRef = revenueRef;
                break;
            case 'expense':
                contentRef = expenseRef;
                break;
            default:
                contentRef = demandRef;
        }

        return (
            <div className="space-y-6" ref={contentRef}>
                {/* PDF Header - Hidden on screen, shown in PDF */}
                <div className="pdf-header" style={{ display: 'none' }}>
                    <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #4F46E5', paddingBottom: '15px' }}>
                        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#4F46E5', marginBottom: '5px' }}>
                            {tabs.find(t => t.id === type)?.name}
                        </h1>
                        <p style={{ fontSize: '16px', color: '#6B7280', marginBottom: '5px' }}>
                            Powered by OpenAI - Biznova
                        </p>
                        <p style={{ fontSize: '12px', color: '#9CA3AF' }}>
                            Generated on: {new Date(insight.metadata?.generatedAt).toLocaleString('en-IN')}
                        </p>
                    </div>
                </div>

                {renderMetadata(insight.metadata)}

                {/* Charts Section */}
                {type === 'demand' && chartData.salesTrend.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Sales Trend Chart */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
                                Sales Trend (Last 30 Days)
                            </h4>
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={chartData.salesTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#6b7280" />
                                    <YAxis tick={{ fontSize: 11 }} stroke="#6b7280" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                        formatter={(value) => [`₹${value}`, 'Revenue']}
                                    />
                                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Top Products Chart */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                <Package className="h-4 w-4 mr-2 text-blue-600" />
                                Top 10 Selling Products
                            </h4>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={chartData.topProducts} layout="horizontal">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="#6b7280" />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} stroke="#6b7280" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                        formatter={(value) => [value, 'Quantity']}
                                    />
                                    <Bar dataKey="quantity" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {type === 'revenue' && chartData.revenueTrend.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Revenue Trend Chart */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                                Revenue Trend (Last 60 Days)
                            </h4>
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={chartData.revenueTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#6b7280" />
                                    <YAxis tick={{ fontSize: 11 }} stroke="#6b7280" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                        formatter={(value) => [`₹${value}`, 'Revenue']}
                                    />
                                    <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Revenue by Category Chart */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                                Revenue by Category
                            </h4>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={chartData.revenueByCategory}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {chartData.revenueByCategory.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][index % 6]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => `₹${value}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {type === 'expense' && chartData.expenseTrend.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Expense Trend Chart */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                <TrendingDown className="h-4 w-4 mr-2 text-purple-600" />
                                Expense Trend (Last 90 Days)
                            </h4>
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={chartData.expenseTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#6b7280" />
                                    <YAxis tick={{ fontSize: 11 }} stroke="#6b7280" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                        formatter={(value) => [`₹${value}`, 'Expense']}
                                    />
                                    <Line type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Expense by Category Chart */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-purple-600" />
                                Expense by Category
                            </h4>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={chartData.expenseByCategory}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {chartData.expenseByCategory.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={['#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#3b82f6', '#10b981'][index % 6]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => `₹${value}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                            <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Analysis</h3>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => exportToPDF(type)}
                                disabled={exportingPDF}
                                className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {exportingPDF ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                        Exporting...
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4 mr-1" />
                                        Export PDF
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => generateInsight(type)}
                                className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                            >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Regenerate
                            </button>
                        </div>
                    </div>

                    {/* Extract and display Quick Actions prominently */}
                    {(() => {
                        const quickActionsMatch = insight.analysis.match(/## 🎯 Quick Actions\s*([\s\S]*?)(?=##|$)/);
                        if (quickActionsMatch) {
                            const actionsText = quickActionsMatch[1];
                            const actions = actionsText.split('\n')
                                .filter(line => line.trim().startsWith('-'))
                                .map(line => line.replace(/^-\s*/, '').trim())
                                .slice(0, 3);

                            if (actions.length > 0) {
                                return (
                                    <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-400 dark:border-green-600 rounded-xl p-6 shadow-lg animate-slideInLeft">
                                        <div className="flex items-center mb-4">
                                            <div className="p-2 bg-green-500 rounded-lg mr-3">
                                                <Sparkles className="h-6 w-6 text-white" />
                                            </div>
                                            <h3 className="text-xl font-bold text-green-900 dark:text-green-100">🎯 Quick Actions - Do This Today!</h3>
                                        </div>
                                        <div className="space-y-3">
                                            {actions.map((action, idx) => (
                                                <div key={idx} className="flex items-start bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-green-200 dark:border-green-700">
                                                    <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
                                                        {idx + 1}
                                                    </div>
                                                    <p className="text-gray-900 dark:text-gray-100 font-medium flex-1">{action}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }
                        }
                        return null;
                    })()}

                    <div className="prose prose-sm max-w-none">
                        <ReactMarkdown
                            components={{
                                h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-3" {...props} />,
                                h2: ({ node, children, ...props }) => {
                                    const text = children?.toString() || '';
                                    let colorClass = 'text-gray-900 dark:text-white';
                                    let bgClass = 'bg-gray-100 dark:bg-gray-700/40';

                                    if (text.includes('🎯')) {
                                        colorClass = 'text-green-700 dark:text-green-300';
                                        bgClass = 'bg-green-100 dark:bg-green-900/40';
                                    } else if (text.includes('💰')) {
                                        colorClass = 'text-yellow-700 dark:text-yellow-300';
                                        bgClass = 'bg-yellow-100 dark:bg-yellow-900/40';
                                    } else if (text.includes('💡')) {
                                        colorClass = 'text-purple-700 dark:text-purple-300';
                                        bgClass = 'bg-purple-100 dark:bg-purple-900/40';
                                    } else if (text.includes('📊')) {
                                        colorClass = 'text-indigo-700 dark:text-indigo-300';
                                        bgClass = 'bg-indigo-100 dark:bg-indigo-900/40';
                                    }

                                    return (
                                        <h2 className={`text-xl font-bold ${colorClass} ${bgClass} mt-6 mb-3 p-3 rounded-lg border-l-4 ${text.includes('🎯') ? 'border-green-500' : text.includes('💰') ? 'border-yellow-500' : text.includes('💡') ? 'border-purple-500' : 'border-indigo-500'}`} {...props}>
                                            {children}
                                        </h2>
                                    );
                                },
                                h3: ({ node, ...props }) => <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-4 mb-2" {...props} />,
                                p: ({ node, ...props }) => <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed" {...props} />,
                                ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-2 mb-4" {...props} />,
                                ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-2 mb-4" {...props} />,
                                li: ({ node, children, ...props }) => {
                                    const text = children?.toString() || '';
                                    let className = 'text-gray-700 dark:text-gray-300 pl-2';
                                    let boxClass = '';

                                    if (text.toLowerCase().includes('action') || text.toLowerCase().includes('restock') || text.toLowerCase().includes('order')) {
                                        boxClass = 'bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 pl-3 py-1 my-1 rounded';
                                    } else if (text.toLowerCase().includes('urgent') || text.toLowerCase().includes('critical') || text.toLowerCase().includes('alert')) {
                                        boxClass = 'bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 pl-3 py-1 my-1 rounded';
                                    }

                                    return <li className={`${className} ${boxClass}`} {...props}>{children}</li>;
                                },
                                strong: ({ node, children, ...props }) => {
                                    const text = children?.toString() || '';
                                    let highlightClass = 'font-semibold text-gray-900 dark:text-white';

                                    if (text.match(/₹[\d,]+/)) {
                                        highlightClass = 'font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-1 rounded';
                                    } else if (text.match(/\d+%/)) {
                                        highlightClass = 'font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-1 rounded';
                                    } else if (text.toLowerCase().includes('high') || text.toLowerCase().includes('top')) {
                                        highlightClass = 'font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/40 px-1 rounded';
                                    }

                                    return <strong className={highlightClass} {...props}>{children}</strong>;
                                },
                                code: ({ node, inline, ...props }) =>
                                    inline ? (
                                        <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200" {...props} />
                                    ) : (
                                        <code className="block bg-gray-100 dark:bg-gray-700 p-3 rounded text-sm font-mono text-gray-800 dark:text-gray-200 overflow-x-auto" {...props} />
                                    ),
                            }}
                        >
                            {insight.analysis}
                        </ReactMarkdown>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                            Generated at: {new Date(insight.metadata?.generatedAt).toLocaleString('en-IN')}
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                        <Brain className="h-8 w-8 mr-3 text-primary-600" />
                        {t('ai.title')}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {t('ai.subtitle')}
                    </p>
                </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <div
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`card cursor-pointer transition-all ${activeTab === tab.id
                                ? `ring-2 ring-${tab.color}-500 border-${tab.color}-200 bg-${tab.color}-50`
                                : 'hover:shadow-md'
                                }`}
                        >
                            <div className="flex items-start">
                                <div className={`p-3 bg-${tab.color}-100 rounded-lg`}>
                                    <Icon className={`h-6 w-6 text-${tab.color}-600`} />
                                </div>
                                <div className="ml-4 flex-1">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">{tab.name}</h3>
                                    <p className="text-sm text-gray-600 mt-1">{tab.description}</p>
                                    {insights[tab.id] && (
                                        <div className="mt-2 flex items-center text-xs text-green-600">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            {t('ai.generated')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Main Content Area */}
            <div className="card min-h-[500px]">
                {renderInsightContent(activeTab)}
            </div>
        </div>
    );
};

export default AIInsights;
