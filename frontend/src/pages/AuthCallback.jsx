import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Auth Callback Page
 * Handles OAuth redirect from Supabase
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const hasProcessed = useRef(false); // Use ref to persist across re-renders

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent duplicate processing using ref
      if (hasProcessed.current) {
        return;
      }
      
      hasProcessed.current = true;
      
      try {
        // Get the session from URL hash
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          setStatus('error');
          toast.error('Authentication failed. Please try again.');
          setTimeout(() => window.location.href = '/login', 2000);
          return;
        }

        if (session) {
          // Extract user info from Google
          const { user } = session;
          const pendingUserType = localStorage.getItem('pendingGoogleUserType') || 'retailer';
          const pendingLocation = localStorage.getItem('pendingGoogleLocation');
          
          // Clean up temporary storage
          localStorage.removeItem('pendingGoogleUserType');
          localStorage.removeItem('pendingGoogleLocation');
          
          const googleData = {
            email: user.email,
            name: user.user_metadata?.full_name || user.email?.split('@')[0],
            google_id: user.id,
            avatar_url: user.user_metadata?.avatar_url,
            provider: 'google',
            intended_user_type: pendingUserType, // Tell backend if user wants to be customer or retailer
            location: pendingLocation ? JSON.parse(pendingLocation) : null // Include location if available
          };

          // Send to backend to create/login user
          const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/api$/, '');
          const response = await fetch(`${API_BASE_URL}/api/auth/google-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(googleData)
          });

          const result = await response.json();

          if (result.success) {
            // Store only token and userType (not full user data for security)
            localStorage.setItem('token', result.data.token);
            localStorage.setItem('userType', result.data.user.userType || 'retailer');
            
            setStatus('success');
            toast.success('Welcome! Redirecting to dashboard...');
            
            // Use window.location for hard redirect to force AuthContext re-initialization
            setTimeout(() => {
              if (result.data.user.userType === 'customer') {
                window.location.href = '/customer-dashboard';
              } else {
                window.location.href = '/dashboard';
              }
            }, 1000);
          } else {
            setStatus('error');
            toast.error(result.message || 'Login failed');
            setTimeout(() => window.location.href = '/login', 2000);
          }
        } else {
          setStatus('error');
          toast.error('No session found');
          setTimeout(() => window.location.href = '/login', 2000);
        }
      } catch (error) {
        console.error('Callback handling error:', error);
        setStatus('error');
        toast.error('An error occurred. Please try again.');
        setTimeout(() => window.location.href = '/login', 2000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 dark:from-black dark:to-gray-900">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white dark:bg-gray-800 rounded-full shadow-lg mb-4">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {status === 'processing' && 'Authenticating...'}
          {status === 'success' && 'Success!'}
          {status === 'error' && 'Authentication Failed'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {status === 'processing' && 'Please wait while we sign you in'}
          {status === 'success' && 'Redirecting to your dashboard'}
          {status === 'error' && 'Redirecting to login page'}
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
