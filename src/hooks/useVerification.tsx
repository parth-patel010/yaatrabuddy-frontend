import { useState, useEffect, useCallback } from 'react';
import { api } from '@/api/client';
import { useAuth } from './useAuth';

interface VerificationStatus {
  isVerified: boolean;
  isBlocked: boolean;
  hasSubmittedId: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useVerification(): VerificationStatus {
  const { user } = useAuth();
  const [status, setStatus] = useState<Omit<VerificationStatus, 'refresh'>>({
    isVerified: false,
    isBlocked: false,
    hasSubmittedId: false,
    loading: true,
  });

  const checkVerification = useCallback(async () => {
    if (!user) {
      setStatus({
        isVerified: false,
        isBlocked: false,
        hasSubmittedId: false,
        loading: false,
      });
      return;
    }

    try {
      const data = await api.get<{ is_verified: boolean; is_blocked: boolean; university_id_url: string | null }>('/data/profiles/me');
      setStatus({
        isVerified: data?.is_verified ?? false,
        isBlocked: data?.is_blocked ?? false,
        hasSubmittedId: !!data?.university_id_url,
        loading: false,
      });
    } catch (error) {
      console.error('Error checking verification:', error);
      setStatus({
        isVerified: false,
        isBlocked: false,
        hasSubmittedId: false,
        loading: false,
      });
    }
  }, [user]);

  useEffect(() => {
    checkVerification();
  }, [checkVerification]);

  return {
    ...status,
    refresh: checkVerification,
  };
}
