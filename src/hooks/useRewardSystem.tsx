import { useState, useEffect, useCallback } from 'react';
import { api } from '@/api/client';
import { useAuth } from './useAuth';
import { useAdmin } from './useAdmin';

interface SpinProgress {
  total_connections: number;
  current_progress: number;
  next_milestone: number;
  spin_unlocked: boolean;
  spin_used: boolean;
  reward_status: string | null;
  rewards_enabled: boolean;
}

interface RewardResult {
  success: boolean;
  reward_type: string | null;
  reward_name: string | null;
  reward_description: string | null;
  error_message: string | null;
}

interface RewardHistory {
  id: string;
  reward_type: string;
  reward_name: string;
  reward_description: string;
  connection_milestone: number;
  status: string;
  delivered_at: string | null;
  created_at: string;
}

const SPIN_WHITELIST_EMAILS = [
  'founder@yaatrabuddy.com',
  'founder@yaatrabuddyy.com',
  'manasjha442@gmail.com',
];

export function useRewardSystem() {
  const [progress, setProgress] = useState<SpinProgress | null>(null);
  const [rewardHistory, setRewardHistory] = useState<RewardHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const isWhitelisted = user?.email ? SPIN_WHITELIST_EMAILS.includes(user.email) : false;

  const fetchProgress = useCallback(async () => {
    if (!user) {
      setProgress(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api.post<any[]>('/rpc/get_spin_progress', { _user_id: user.id });

      if (data && data.length > 0) {
        const raw = data[0] as SpinProgress;
        // Admin override: always unlocked, never used
        if (isAdmin) {
          setProgress({
            ...raw,
            spin_unlocked: true,
            spin_used: false,
            rewards_enabled: true,
          });
        } else if (isWhitelisted) {
          // Whitelisted users: permanent spin unlock, no test badge
          setProgress({
            ...raw,
            spin_unlocked: true,
            spin_used: false,
            rewards_enabled: true,
          });
        } else {
          setProgress(raw);
        }
      }
    } catch (error) {
      console.error('Error fetching spin progress:', error);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, isWhitelisted]);

  const fetchRewardHistory = useCallback(async () => {
    if (!user) {
      setRewardHistory([]);
      return;
    }

    try {
      const data = await api.post<RewardHistory[]>('/rpc/get_user_reward_history', { _user_id: user.id });
      setRewardHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching reward history:', error);
    }
  }, [user]);

  const performSpin = useCallback(async (): Promise<RewardResult | null> => {
    if (!user || spinning) return null;

    setSpinning(true);
    try {
      const data = await api.post<RewardResult[]>('/rpc/perform_spin', { _user_id: user.id });

      if (data && data.length > 0) {
        const result = data[0] as RewardResult;
        await Promise.all([fetchProgress(), fetchRewardHistory()]);
        return result;
      }
      return null;
    } catch (error) {
      console.error('Error performing spin:', error);
      return null;
    } finally {
      setSpinning(false);
    }
  }, [user, spinning, fetchProgress, fetchRewardHistory]);

  useEffect(() => {
    if (user) {
      fetchProgress();
      fetchRewardHistory();
    }
  }, [user, fetchProgress, fetchRewardHistory]);

  return {
    progress,
    rewardHistory,
    loading,
    spinning,
    performSpin,
    refetch: fetchProgress,
    refetchRewardHistory: fetchRewardHistory,
    isAdmin,
    hasPendingReward: progress?.reward_status === 'pending_delivery',
  };
}
