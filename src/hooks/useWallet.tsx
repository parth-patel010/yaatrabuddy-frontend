import { useState } from 'react';
import { api } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function useWallet() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const createRazorpayOrder = async (
    amount: number,
    purpose: string,
    rideRequestId?: string,
    _rideId?: string
  ) => {
    if (!user) throw new Error('Not authenticated');
    return api.post<{ order_id: string; amount: number; currency: string; key_id: string }>(
      '/payments/create-order',
      { amount, purpose, ride_request_id: rideRequestId }
    );
  };

  const verifyPayment = async (
    paymentData: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      purpose: string;
      amount: number;
      ride_id?: string;
      ride_request_id?: string;
      requester_show_profile_photo?: boolean;
      requester_show_mobile_number?: boolean;
    }
  ) => {
    return api.post<{ success: boolean; message?: string; request_id?: string; expiry_date?: string }>(
      '/payments/verify',
      paymentData
    );
  };

  return {
    loading,
    loadRazorpayScript,
    createRazorpayOrder,
    verifyPayment,
  };
}
