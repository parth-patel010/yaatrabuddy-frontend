import { useState, useEffect, useCallback } from 'react';
import { api } from '@/api/client';
import { useAuth } from './useAuth';

interface PremiumStatus {
  isPremium: boolean;
  isAdmin: boolean;
  subscriptionExpiry: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function usePremium(): PremiumStatus {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscriptionExpiry, setSubscriptionExpiry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkPremium = useCallback(async () => {
    if (!user) {
      setIsPremium(false);
      setIsAdmin(false);
      setSubscriptionExpiry(null);
      setLoading(false);
      return;
    }

    try {
      const roles = await api.get<{ role: string }[]>('/data/user_roles');
      const userIsAdmin = Array.isArray(roles) && roles.some((r) => r.role === 'admin');

      if (userIsAdmin) {
        setIsAdmin(true);
        setIsPremium(true);
        setSubscriptionExpiry(null);
        setLoading(false);
        return;
      }

      setIsAdmin(false);

      const data = await api.get<{ is_premium: boolean; subscription_expiry: string | null }>('/data/profiles/me');
      const active = data?.is_premium === true &&
        data?.subscription_expiry &&
        new Date(data.subscription_expiry) > new Date();
      setIsPremium(!!active);
      setSubscriptionExpiry(data?.subscription_expiry || null);
    } catch (error) {
      console.error('Error checking premium:', error);
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkPremium();
  }, [checkPremium]);

  return {
    isPremium,
    isAdmin,
    subscriptionExpiry,
    loading,
    refresh: checkPremium,
  };
}
