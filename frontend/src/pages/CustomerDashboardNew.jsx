import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Send, Package, Clock, CheckCircle, XCircle, Plus, Store, ShoppingCart, AlertCircle, Settings, Bot, MessageCircle, Moon, Sun, Bell, User, LogOut, Sparkles, TrendingUp, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import NotificationBell from '../components/NotificationBell';
import FloatingAIChatbot from '../components/FloatingAIChatbot';

const CustomerDashboardNew = () => {
    const [retailers, setRetailers] = useState([]);
    const [requests, setRequests] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showMessageForm, setShowMessageForm] = useState(false);
    const [selectedRetailer, setSelectedRetailer] = useState(null);
    const [messageForm, setMessageForm] = useState({
        items: [{ item_name: '', quantity: 1 }],
        notes: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('stores');
    const [retailerInventory, setRetailerInventory] = useState([]);
    const [itemAvailability, setItemAvailability] = useState({});
    const [checkingStock, setCheckingStock] = useState(false);
    const [showInventory, setShowInventory] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('darkMode') === 'true');

    const navigate = useNavigate();

    let API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    API_URL = API_URL.replace(/\/api$/, '');
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        if (!token || localStorage.getItem('userType') !== 'customer') {
            navigate('/login');
            return;
        }

        fetchRetailers();
        fetchMyRequests();
    }, [token, navigate]);

    useEffect(() => {
        localStorage.setItem('darkMode', isDarkMode);
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    const fetchRetailers = async (search = '') => {
        try {
            const url = `${API_URL}/api/customer-requests/retailers?search=${encodeURIComponent(search)}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();

            if (result.success) {
                setRetailers(result.data.retailers || []);
            } else {
                toast.error('Failed to load retailers');
            }
        } catch (error) {
            console.error('Fetch retailers error:', error);
            toast.error('Error loading retailers');
        }
    };

    const fetchMyRequests = async () => {
        try {
            const response = await fetch(`${API_URL}/api/customer-requests/customer`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();

            if (result.success) {
                setRequests(result.data.requests);
            }
        } catch (error) {
            console.error('Fetch requests error:', error);
        }
    };

    const handleSearch = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        fetchRetailers(query);
    };

    const handleSelectRetailer = async (retailer) => {
        setSelectedRetailer(retailer);
        setShowMessageForm(true);
        setShowInventory(false);
        await fetchRetailerInventory(retailer._id);
    };

    const fetchRetailerInventory = async (retailer_id) => {
        try {
            const response = await fetch(`${API_URL}/api/customer-requests/retailer/${retailer_id}/inventory`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();

            if (result.success) {
                setRetailerInventory(result.data.items || []);
            }
        } catch (error) {
            console.error('Fetch inventory error:', error);
        }
    };