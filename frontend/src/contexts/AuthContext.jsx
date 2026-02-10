import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Check if user is logged in on app start
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            const userType = localStorage.getItem('userType');

            // Only check auth for retailers (customers manage their own auth)
            if (token && userType !== 'customer') {
                try {
                    const response = await authAPI.getProfile();
                    if (response.success) {
                        setUser(response.data.user);
                        setIsAuthenticated(true);
                    }
                } catch (error) {
                    console.error('Auth check failed:', error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('userType');
                }
            }
            setLoading(false);
        };

        checkAuth();
    }, []);

    // Login function
    const login = async (credentials) => {
        try {
            setLoading(true);
            const response = await authAPI.login(credentials);

            if (response.success) {
                const { user: userData, token, userType } = response.data;

                console.log('🔐 Frontend Login Response:', {
                    success: response.success,
                    userType: userType,
                    userRole: userData?.role,
                    userName: userData?.name,
                    hasToken: !!token,
                    fullResponse: response.data
                });

                // Store token and userType
                localStorage.setItem('token', token);
                localStorage.setItem('userType', userType || 'retailer');

                console.log('💾 Stored in localStorage:', {
                    token: token ? 'SET' : 'NOT SET',
                    userType: localStorage.getItem('userType')
                });

                // Fetch fresh profile data after login to ensure we have the latest
                try {
                    const profileResponse = await authAPI.getProfile();
                    if (profileResponse.success) {
                        const freshUserData = profileResponse.data.user;
                        console.log('👤 Fresh profile data:', {
                            role: freshUserData.role,
                            name: freshUserData.name
                        });
                        setUser(freshUserData);
                    } else {
                        // Fallback to login response data
                        setUser(userData);
                    }
                } catch (profileError) {
                    console.error('Profile fetch error:', profileError);
                    setUser(userData);
                }

                setIsAuthenticated(true);

                return { success: true, message: response.message, data: { user: userData, userType } };
            } else {
                return { success: false, message: response.message };
            }
        } catch (error) {
            console.error('Login error:', error);
            const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
            const specificError = error.response?.data?.error;

            let displayMessage = errorMessage;
            if (specificError === 'Phone number or password incorrect') {
                displayMessage = 'Invalid phone number or password. Please check your credentials and try again.';
            } else if (specificError && errorMessage !== specificError) {
                displayMessage = `${errorMessage}: ${specificError}`;
            }

            return {
                success: false,
                message: displayMessage
            };
        } finally {
            setLoading(false);
        }
    };

    // Register function
    const register = async (userData) => {
        try {
            setLoading(true);
            const response = await authAPI.register(userData);

            if (response.success) {
                const { user: newUser, token, userType } = response.data;

                // Store token and userType
                localStorage.setItem('token', token);
                localStorage.setItem('userType', userType || 'retailer');

                setUser(newUser);
                setIsAuthenticated(true);

                return { success: true, message: response.message };
            } else {
                return { success: false, message: response.message };
            }
        } catch (error) {
            console.error('Registration error:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);

            const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
            const specificError = error.response?.data?.error;

            let displayMessage = errorMessage;
            if (specificError === 'Phone number already registered') {
                displayMessage = 'This phone number is already registered. Please use a different number or try logging in.';
            } else if (specificError && errorMessage !== specificError) {
                displayMessage = `${errorMessage}: ${specificError}`;
            }

            return {
                success: false,
                message: displayMessage
            };
        } finally {
            setLoading(false);
        }
    };

    // Logout function
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userType');
        setUser(null);
        setIsAuthenticated(false);
    };

    // Update user profile
    const updateProfile = async (userData) => {
        try {
            setLoading(true);
            const response = await authAPI.updateProfile(userData);

            if (response.success) {
                const updatedUser = response.data.user;
                setUser(updatedUser);
                return { success: true, message: response.message };
            } else {
                return { success: false, message: response.message };
            }
        } catch (error) {
            console.error('Profile update error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Profile update failed. Please try again.'
            };
        } finally {
            setLoading(false);
        }
    };

    // Refresh user data from server
    const refreshUser = async () => {
        try {
            const response = await authAPI.getProfile();
            if (response.success) {
                const freshUser = response.data.user;
                setUser(freshUser);
                return { success: true };
            }
            return { success: false };
        } catch (error) {
            console.error('Refresh user error:', error);
            return { success: false };
        }
    };

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        register,
        logout,
        updateProfile,
        refreshUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
