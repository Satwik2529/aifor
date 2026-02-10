import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Upload, Camera, Sparkles, ArrowLeft, Edit, Trash2, Save, X, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const WholesalerInventory = () => {
    const navigate = useNavigate();
    const [inventory, setInventory] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addMethod, setAddMethod] = useState('manual'); // 'manual' or 'image'
    const [isLoading, setIsLoading] = useState(false);
    const [aiRecommendations, setAiRecommendations] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [productForm, setProductForm] = useState({
        productName: '', category: '', unit: 'kg', costPrice: '', sellingPrice: '', minOrderQty: '', availableQty: '',
        expiryDate: '', bulkDiscounts: [{ minQty: '', price: '' }]
    });

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            const token = localStorage.getItem('token');
            let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

            const response = await fetch(`${API_BASE_URL}/api/wholesalers/inventory/my?limit=100`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (result.success) {
                setInventory(result.data.inventory);
            }
        } catch (error) {
            toast.error('Failed to load inventory');
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        setIsLoading(true);

        try {
            const token = localStorage.getItem('token');
            let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

            // Convert image to base64
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Image = reader.result;

                const response = await fetch(`${API_BASE_URL}/api/wholesalers/ai-assistant`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl: base64Image })
                });

                const result = await response.json();
                if (result.success) {
                    const aiRec = result.data.aiRecommendations;
                    const prodData = result.data.productData;

                    setAiRecommendations(aiRec);
                    setProductForm({
                        productName: prodData.productName || '',
                        category: prodData.category || '',
                        unit: prodData.unit || 'kg',
                        costPrice: prodData.costPrice || '',
                        sellingPrice: aiRec.recommendedPrice || prodData.estimatedPrice || '',
                        minOrderQty: aiRec.recommendedMinOrder || '',
                        availableQty: prodData.quantity || '',
                        expiryDate: prodData.expiryDate || '',
                        bulkDiscounts: aiRec.bulkDiscountSuggestions?.map(d => ({
                            minQty: d.minQty,
                            price: d.price || (parseFloat(aiRec.recommendedPrice) * (1 - d.discountPercent / 100)).toFixed(2)
                        })) || [{ minQty: '', price: '' }]
                    });
                    toast.success('AI extracted product details!');
                } else {
                    toast.error(result.message || 'Failed to process image');
                }
                setIsLoading(false);
            };
        } catch (error) {
            toast.error('Failed to process image');
            setIsLoading(false);
        }
    };

    const getAIRecommendations = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

            const response = await fetch(`${API_BASE_URL}/api/wholesalers/ai-assistant`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ manualData: productForm })
            });

            const result = await response.json();
            if (result.success) {
                setAiRecommendations(result.data.aiRecommendations);
                toast.success('AI recommendations generated!');
            } else {
                toast.error(result.message);
            }
            setIsLoading(false);
        } catch (error) {
            toast.error('Failed to get AI recommendations');
            setIsLoading(false);
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

            const response = await fetch(`${API_BASE_URL}/api/wholesalers/inventory/add`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productName: productForm.productName,
                    category: productForm.category,
                    unit: productForm.unit,
                    pricePerUnit: parseFloat(productForm.sellingPrice),
                    costPrice: productForm.costPrice ? parseFloat(productForm.costPrice) : undefined,
                    minOrderQty: parseFloat(productForm.minOrderQty),
                    availableQty: parseFloat(productForm.availableQty),
                    expiryDate: productForm.expiryDate || undefined,
                    bulkDiscounts: productForm.bulkDiscounts.filter(d => d.minQty && d.price).map(d => ({
                        minQty: parseFloat(d.minQty), price: parseFloat(d.price)
                    }))
                })
            });

            const result = await response.json();
            if (result.success) {
                toast.success('Product added successfully!');
                setShowAddModal(false);
                setProductForm({ productName: '', category: '', unit: 'kg', costPrice: '', sellingPrice: '', minOrderQty: '', availableQty: '', expiryDate: '', bulkDiscounts: [{ minQty: '', price: '' }] });
                setAiRecommendations(null);
                setImagePreview(null);
                setImageFile(null);
                fetchInventory();
            } else {
                toast.error(result.message || 'Failed to add product');
            }
            setIsLoading(false);
        } catch (error) {
            toast.error('Failed to add product');
            setIsLoading(false);
        }
    };

    const addBulkDiscount = () => {
        setProductForm({ ...productForm, bulkDiscounts: [...productForm.bulkDiscounts, { minQty: '', price: '' }] });
    };

    const removeBulkDiscount = (index) => {
        setProductForm({ ...productForm, bulkDiscounts: productForm.bulkDiscounts.filter((_, i) => i !== index) });
    };

    const updateBulkDiscount = (index, field, value) => {
        const updated = [...productForm.bulkDiscounts];
        updated[index][field] = value;
        setProductForm({ ...productForm, bulkDiscounts: updated });
    };

    const startEditing = (product) => {
        setEditingProduct(product._id);
        setEditForm({
            productName: product.productName,
            category: product.category,
            unit: product.unit,
            costPrice: product.costPrice || '',
            pricePerUnit: product.pricePerUnit,
            minOrderQty: product.minOrderQty,
            availableQty: product.availableQty,
            expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().split('T')[0] : '',
            bulkDiscounts: product.bulkDiscounts?.length > 0 ? product.bulkDiscounts : [{ minQty: '', price: '' }],
            isActive: product.isActive
        });
    };

    const cancelEditing = () => {
        setEditingProduct(null);
        setEditForm(null);
    };

    const saveProduct = async (productId) => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

            const response = await fetch(`${API_BASE_URL}/api/wholesalers/inventory/update`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId,
                    productName: editForm.productName,
                    category: editForm.category,
                    unit: editForm.unit,
                    pricePerUnit: parseFloat(editForm.pricePerUnit),
                    costPrice: editForm.costPrice ? parseFloat(editForm.costPrice) : undefined,
                    minOrderQty: parseFloat(editForm.minOrderQty),
                    availableQty: parseFloat(editForm.availableQty),
                    expiryDate: editForm.expiryDate || undefined,
                    bulkDiscounts: editForm.bulkDiscounts.filter(d => d.minQty && d.price).map(d => ({
                        minQty: parseFloat(d.minQty), price: parseFloat(d.price)
                    })),
                    isActive: editForm.isActive
                })
            });

            const result = await response.json();
            if (result.success) {
                toast.success('Product updated successfully!');
                cancelEditing();
                fetchInventory();
            } else {
                toast.error(result.message || 'Failed to update product');
            }
            setIsLoading(false);
        } catch (error) {
            toast.error('Failed to update product');
            setIsLoading(false);
        }
    };

    const deleteProduct = async (productId) => {
        if (!window.confirm('Are you sure you want to deactivate this product?')) return;

        try {
            const token = localStorage.getItem('token');
            let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

            const response = await fetch(`${API_BASE_URL}/api/wholesalers/inventory/delete`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId })
            });

            const result = await response.json();
            if (result.success) {
                toast.success('Product deactivated');
                fetchInventory();
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('Failed to delete product');
        }
    };

    const updateEditBulkDiscount = (index, field, value) => {
        const updated = [...editForm.bulkDiscounts];
        updated[index][field] = value;
        setEditForm({ ...editForm, bulkDiscounts: updated });
    };

    const addEditBulkDiscount = () => {
        setEditForm({ ...editForm, bulkDiscounts: [...editForm.bulkDiscounts, { minQty: '', price: '' }] });
    };

    const removeEditBulkDiscount = (index) => {
        setEditForm({ ...editForm, bulkDiscounts: editForm.bulkDiscounts.filter((_, i) => i !== index) });
    };

    const getStockStatus = (availableQty, minOrderQty) => {
        const ratio = availableQty / minOrderQty;
        if (ratio < 2) return { label: 'Low Stock', color: 'red', icon: AlertCircle };
        if (ratio < 5) return { label: 'Medium Stock', color: 'yellow', icon: Package };
        return { label: 'Good Stock', color: 'green', icon: CheckCircle };
    };

    const calculateProfit = (selling, cost) => {
        if (!cost || !selling) return null;
        const profit = selling - cost;
        const margin = (profit / cost * 100).toFixed(1);
        return { profit: profit.toFixed(2), margin };
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => navigate('/wholesaler-dashboard')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg">
                            <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
                    </div>
                    <button onClick={() => setShowAddModal(true)} className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                        <Plus className="h-5 w-5" /><span>Add Product</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {inventory.length === 0 ? (
                        <div className="col-span-full text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
                            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 dark:text-gray-400">No products yet. Add your first product!</p>
                        </div>
                    ) : (
                        inventory.map((product) => {
                            const isEditing = editingProduct === product._id;
                            const stockStatus = getStockStatus(product.availableQty, product.minOrderQty);
                            const StockIcon = stockStatus.icon;
                            const profitInfo = calculateProfit(product.pricePerUnit, product.costPrice);

                            return (
                                <div key={product._id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border-2 transition-all ${isEditing ? 'border-primary-500 ring-4 ring-primary-100 dark:ring-primary-900/50' : 'border-transparent hover:shadow-xl'}`}>
                                    {/* Card Header */}
                                    <div className={`px-6 py-4 ${product.isActive ? 'bg-gradient-to-r from-primary-500 to-primary-600' : 'bg-gray-400'}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editForm.productName}
                                                        onChange={(e) => setEditForm({ ...editForm, productName: e.target.value })}
                                                        className="w-full px-3 py-2 text-lg font-bold bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70"
                                                        placeholder="Product Name"
                                                    />
                                                ) : (
                                                    <h3 className="text-xl font-bold text-white mb-1">{product.productName}</h3>
                                                )}
                                                {isEditing ? (
                                                    <select
                                                        value={editForm.category}
                                                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                                        className="mt-2 px-3 py-1 text-sm bg-white/20 border border-white/30 rounded-lg text-white"
                                                    >
                                                        <option value="Grains">Grains</option>
                                                        <option value="Pulses">Pulses</option>
                                                        <option value="Oils">Oils</option>
                                                        <option value="Spices">Spices</option>
                                                        <option value="Sweeteners">Sweeteners</option>
                                                        <option value="Beverages">Beverages</option>
                                                        <option value="Dairy">Dairy</option>
                                                        <option value="Snacks">Snacks</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                ) : (
                                                    <p className="text-sm text-white/90">{product.category}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center space-x-2 ml-3">
                                                {!isEditing && (
                                                    <>
                                                        <button
                                                            onClick={() => startEditing(product)}
                                                            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                                                        >
                                                            <Edit className="h-4 w-4 text-white" />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteProduct(product._id)}
                                                            className="p-2 bg-white/20 hover:bg-red-500 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="h-4 w-4 text-white" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-6 space-y-4">
                                        {/* Stock Status Badge */}
                                        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg bg-${stockStatus.color}-50 dark:bg-${stockStatus.color}-900/20 border border-${stockStatus.color}-200 dark:border-${stockStatus.color}-800`}>
                                            <StockIcon className={`h-5 w-5 text-${stockStatus.color}-600`} />
                                            <span className={`text-sm font-semibold text-${stockStatus.color}-800 dark:text-${stockStatus.color}-200`}>{stockStatus.label}</span>
                                        </div>

                                        {/* Pricing Section */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Selling Price</p>
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editForm.pricePerUnit}
                                                        onChange={(e) => setEditForm({ ...editForm, pricePerUnit: e.target.value })}
                                                        className="w-full px-2 py-1 text-lg font-bold bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                                                    />
                                                ) : (
                                                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">₹{product.pricePerUnit}</p>
                                                )}
                                                <p className="text-xs text-gray-500 mt-1">per {product.unit}</p>
                                            </div>

                                            {profitInfo && (
                                                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Profit Margin</p>
                                                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{profitInfo.margin}%</p>
                                                    <p className="text-xs text-gray-500 mt-1">₹{profitInfo.profit} profit</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Cost Price (Editable) */}
                                        {isEditing && (
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Cost Price (₹)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={editForm.costPrice}
                                                    onChange={(e) => setEditForm({ ...editForm, costPrice: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                                    placeholder="Your purchase cost"
                                                />
                                            </div>
                                        )}

                                        {/* Quantity Section */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Available Stock</p>
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editForm.availableQty}
                                                        onChange={(e) => setEditForm({ ...editForm, availableQty: e.target.value })}
                                                        className="w-full px-2 py-1 text-lg font-semibold bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                                                    />
                                                ) : (
                                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{product.availableQty} {product.unit}</p>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Min Order</p>
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editForm.minOrderQty}
                                                        onChange={(e) => setEditForm({ ...editForm, minOrderQty: e.target.value })}
                                                        className="w-full px-2 py-1 text-lg font-semibold bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                                                    />
                                                ) : (
                                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{product.minOrderQty} {product.unit}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Unit Selection (Edit Mode) */}
                                        {isEditing && (
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                                                <select
                                                    value={editForm.unit}
                                                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                                >
                                                    <option value="kg">Kilogram (kg)</option>
                                                    <option value="litre">Litre</option>
                                                    <option value="box">Box</option>
                                                    <option value="piece">Piece</option>
                                                    <option value="dozen">Dozen</option>
                                                </select>
                                            </div>
                                        )}

                                        {/* Expiry Date */}
                                        {(product.expiryDate || isEditing) && (
                                            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Expiry Date</p>
                                                {isEditing ? (
                                                    <input
                                                        type="date"
                                                        value={editForm.expiryDate}
                                                        onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })}
                                                        className="w-full px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                                                    />
                                                ) : (
                                                    <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">{new Date(product.expiryDate).toLocaleDateString()}</p>
                                                )}
                                            </div>
                                        )}

                                        {/* Bulk Discounts */}
                                        {((product.bulkDiscounts && product.bulkDiscounts.length > 0) || isEditing) && (
                                            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                                                    <TrendingUp className="h-4 w-4 mr-1" />
                                                    Bulk Discounts
                                                </p>
                                                {isEditing ? (
                                                    <div className="space-y-2">
                                                        {editForm.bulkDiscounts.map((discount, idx) => (
                                                            <div key={idx} className="flex space-x-2">
                                                                <input
                                                                    type="number"
                                                                    placeholder="Min Qty"
                                                                    value={discount.minQty}
                                                                    onChange={(e) => updateEditBulkDiscount(idx, 'minQty', e.target.value)}
                                                                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                                                                />
                                                                <input
                                                                    type="number"
                                                                    placeholder="Price"
                                                                    value={discount.price}
                                                                    onChange={(e) => updateEditBulkDiscount(idx, 'price', e.target.value)}
                                                                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                                                                />
                                                                {idx > 0 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeEditBulkDiscount(idx)}
                                                                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                        <button
                                                            type="button"
                                                            onClick={addEditBulkDiscount}
                                                            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                                                        >
                                                            + Add Discount Tier
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        {product.bulkDiscounts.map((discount, idx) => (
                                                            <div key={idx} className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded text-sm">
                                                                <span className="text-gray-700 dark:text-gray-300">≥ {discount.minQty} {product.unit}</span>
                                                                <span className="font-semibold text-blue-700 dark:text-blue-300">₹{discount.price}/{product.unit}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Analytics (if available) */}
                                        {product.totalOrders > 0 && !isEditing && (
                                            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3">
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Performance</p>
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div>
                                                        <p className="text-xs text-gray-500">Total Orders</p>
                                                        <p className="font-bold text-indigo-700 dark:text-indigo-300">{product.totalOrders}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Qty Sold</p>
                                                        <p className="font-bold text-indigo-700 dark:text-indigo-300">{product.totalQuantitySold} {product.unit}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Buttons (Edit Mode) */}
                                        {isEditing && (
                                            <div className="flex space-x-2 pt-2">
                                                <button
                                                    onClick={() => saveProduct(product._id)}
                                                    disabled={isLoading}
                                                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
                                                >
                                                    <Save className="h-4 w-4" />
                                                    <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
                                                </button>
                                                <button
                                                    onClick={cancelEditing}
                                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                                                >
                                                    <X className="h-5 w-5" />
                                                </button>
                                            </div>
                                        )}

                                        {/* Active/Inactive Toggle (Edit Mode) */}
                                        {isEditing && (
                                            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                                                <span className="text-sm text-gray-700 dark:text-gray-300">Product Status</span>
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={editForm.isActive}
                                                        onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                                                        className="rounded"
                                                    />
                                                    <span className={`text-sm font-semibold ${editForm.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                                        {editForm.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {showAddModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                            <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Add New Product</h3>

                            <div className="mb-6 flex space-x-4">
                                <button onClick={() => setAddMethod('manual')} className={`flex-1 py-3 px-4 rounded-lg border-2 ${addMethod === 'manual' ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-300 dark:border-gray-600'}`}>
                                    <Package className="h-6 w-6 mx-auto mb-2" /><span className="font-semibold">Manual Entry</span>
                                </button>
                                <button onClick={() => setAddMethod('image')} className={`flex-1 py-3 px-4 rounded-lg border-2 ${addMethod === 'image' ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-300 dark:border-gray-600'}`}>
                                    <Camera className="h-6 w-6 mx-auto mb-2" /><span className="font-semibold">Upload Image</span>
                                </button>
                            </div>

                            {addMethod === 'image' && (
                                <div className="mb-6">
                                    <label className="block w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-primary-600">
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded" />
                                        ) : (
                                            <div><Upload className="h-12 w-12 mx-auto text-gray-400 mb-2" /><p className="text-gray-600 dark:text-gray-400">Click to upload product image</p><p className="text-sm text-gray-500 mt-1">AI will extract product details</p></div>
                                        )}
                                    </label>
                                </div>
                            )}

                            <form onSubmit={handleAddProduct} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Product Name *</label><input type="text" required value={productForm.productName} onChange={(e) => setProductForm({ ...productForm, productName: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="e.g., Basmati Rice Premium" /></div>

                                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category *</label><select required value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"><option value="">Select Category</option><option value="Grains">Grains</option><option value="Pulses">Pulses</option><option value="Oils">Oils</option><option value="Spices">Spices</option><option value="Sweeteners">Sweeteners</option><option value="Beverages">Beverages</option><option value="Dairy">Dairy</option><option value="Snacks">Snacks</option><option value="Other">Other</option></select></div>

                                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit *</label><select value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"><option value="kg">Kilogram (kg)</option><option value="litre">Litre</option><option value="box">Box</option><option value="piece">Piece</option><option value="dozen">Dozen</option></select></div>

                                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cost Price (₹)</label><input type="number" step="0.01" value={productForm.costPrice} onChange={(e) => setProductForm({ ...productForm, costPrice: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Your purchase cost" /></div>

                                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Selling Price (₹) *</label><input type="number" required step="0.01" value={productForm.sellingPrice} onChange={(e) => setProductForm({ ...productForm, sellingPrice: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Price per unit" /></div>

                                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Min Order Qty *</label><input type="number" required step="0.01" value={productForm.minOrderQty} onChange={(e) => setProductForm({ ...productForm, minOrderQty: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Minimum order quantity" /></div>

                                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Available Qty *</label><input type="number" required step="0.01" value={productForm.availableQty} onChange={(e) => setProductForm({ ...productForm, availableQty: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Stock quantity" /></div>

                                    <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Expiry Date (Optional)</label><input type="date" value={productForm.expiryDate} onChange={(e) => setProductForm({ ...productForm, expiryDate: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                                </div>

                                {addMethod === 'manual' && !aiRecommendations && (
                                    <button type="button" onClick={getAIRecommendations} disabled={isLoading} className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                                        <Sparkles className="h-5 w-5" /><span>{isLoading ? 'Getting AI Recommendations...' : 'Get AI Recommendations'}</span>
                                    </button>
                                )}

                                {aiRecommendations && (
                                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-2 border-purple-300 dark:border-purple-800 rounded-lg p-5">
                                        <h4 className="font-bold text-purple-900 dark:text-purple-200 mb-4 flex items-center text-lg"><Sparkles className="h-6 w-6 mr-2" />AI Business Recommendations</h4>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                                                <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">Recommended Selling Price</p>
                                                <p className="text-2xl font-bold text-green-600">₹{aiRecommendations.recommendedPrice}</p>
                                                {productForm.costPrice && <p className="text-xs text-gray-500 mt-1">Profit: ₹{(parseFloat(aiRecommendations.recommendedPrice) - parseFloat(productForm.costPrice)).toFixed(2)}</p>}
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                                                <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">Min Order Quantity</p>
                                                <p className="text-2xl font-bold text-blue-600">{aiRecommendations.recommendedMinOrder} {productForm.unit}</p>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                                                <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">Expected Profit Margin</p>
                                                <p className="text-2xl font-bold text-purple-600">{aiRecommendations.profitMargin}%</p>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                                                <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">Sales Velocity</p>
                                                <p className="text-lg font-bold text-orange-600">{aiRecommendations.salesVelocity || 'Medium'}</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 space-y-3">
                                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                                                <p className="font-semibold text-gray-900 dark:text-white mb-1">📢 Marketing Strategy</p>
                                                <p className="text-gray-700 dark:text-gray-300 text-sm">{aiRecommendations.marketingStrategy}</p>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                                                <p className="font-semibold text-gray-900 dark:text-white mb-1">🎯 Target Retailers</p>
                                                <p className="text-gray-700 dark:text-gray-300 text-sm">{aiRecommendations.targetRetailers}</p>
                                            </div>
                                            {aiRecommendations.expiryConsiderations && (
                                                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                                                    <p className="font-semibold text-red-900 dark:text-red-200 mb-1">⏰ Expiry Management</p>
                                                    <p className="text-red-700 dark:text-red-300 text-sm">{
                                                        typeof aiRecommendations.expiryConsiderations === 'object'
                                                            ? aiRecommendations.expiryConsiderations.managementStrategy || JSON.stringify(aiRecommendations.expiryConsiderations)
                                                            : aiRecommendations.expiryConsiderations
                                                    }</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bulk Discounts</label>
                                    {productForm.bulkDiscounts.map((discount, index) => (
                                        <div key={index} className="flex space-x-2 mb-2">
                                            <input type="number" placeholder="Min Qty" value={discount.minQty} onChange={(e) => updateBulkDiscount(index, 'minQty', e.target.value)} className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                            <input type="number" placeholder="Price" value={discount.price} onChange={(e) => updateBulkDiscount(index, 'price', e.target.value)} className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                            {index > 0 && <button type="button" onClick={() => removeBulkDiscount(index)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 className="h-5 w-5" /></button>}
                                        </div>
                                    ))}
                                    <button type="button" onClick={addBulkDiscount} className="text-sm text-primary-600 hover:text-primary-700">+ Add Bulk Discount</button>
                                </div>

                                <div className="flex justify-end space-x-3 pt-4">
                                    <button type="button" onClick={() => { setShowAddModal(false); setAiRecommendations(null); setImagePreview(null); }} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
                                    <button type="submit" disabled={isLoading} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">{isLoading ? 'Adding...' : 'Add Product'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WholesalerInventory;
