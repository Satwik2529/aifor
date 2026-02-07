import React, { useState, useRef } from 'react';
import {
    Brain,
    TrendingUp,
    DollarSign,
    Calendar,
    Loader2,
    AlertCircle,
    CheckCircle,
    BarChart3,
    ShoppingCart,
    Sparkles,
    RefreshCw,
    Download
} from 'lucide-react';
import { aiInsightsAPI } from '../services/api';
import ReactMarkdown from 'react-markdown';
import html2pdf from 'html2pdf.js';
import { useTranslation } from 'react-i18next';

const AIInsights = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('demand');
    const [loading, setLoading] = useState({
        demand: false,
        revenue: false,
        expense: false
    });
    const [insights, setInsights] = useState({
        demand: null,
        revenue: null,
        expense: null
    });
    const [error, setError] = useState({
        demand: null,
        revenue: null,
        expense: null
    });
    const [exportingPDF, setExportingPDF] = useState(false);
    
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
                default:
                    throw new Error('Invalid insight type');
            }

            if (response.success) {
                setInsights(prev => ({ ...prev, [type]: response.data }));
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

    const renderInsightContent = (type) => {
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
                            Powered by Google Gemini AI - Biznova
                        </p>
                        <p style={{ fontSize: '12px', color: '#9CA3AF' }}>
                            Generated on: {new Date(insight.metadata?.generatedAt).toLocaleString('en-IN')}
                        </p>
                    </div>
                </div>

                {renderMetadata(insight.metadata)}

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

                    <div className="prose prose-sm max-w-none">
                        <ReactMarkdown
                            components={{
                                h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-3" {...props} />,
                                h2: ({ node, ...props }) => <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-5 mb-2" {...props} />,
                                h3: ({ node, ...props }) => <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-4 mb-2" {...props} />,
                                p: ({ node, ...props }) => <p className="text-gray-700 mb-3 leading-relaxed" {...props} />,
                                ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-2 mb-4" {...props} />,
                                ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-2 mb-4" {...props} />,
                                li: ({ node, ...props }) => <li className="text-gray-700" {...props} />,
                                strong: ({ node, ...props }) => <strong className="font-semibold text-gray-900 dark:text-white" {...props} />,
                                code: ({ node, inline, ...props }) =>
                                    inline ? (
                                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800" {...props} />
                                    ) : (
                                        <code className="block bg-gray-100 p-3 rounded text-sm font-mono text-gray-800 overflow-x-auto" {...props} />
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
