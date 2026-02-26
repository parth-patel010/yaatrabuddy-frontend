import { useState, useEffect, useCallback } from 'react';
import { api } from '@/api/client';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface UserRating {
  averageRating: number;
  totalRatings: number;
  completedRides: number;
}

export function useUserRating(userId: string | null | undefined) {
  const [rating, setRating] = useState<UserRating>({
    averageRating: 0,
    totalRatings: 0,
    completedRides: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchRating = useCallback(async () => {
    const id = typeof userId === 'string' ? userId.trim() : '';
    if (!id || !UUID_REGEX.test(id)) {
      setLoading(false);
      return;
    }

    try {
      const data = await api.post<any[]>('/rpc/get_user_rating', { _user_id: id });
      const first = Array.isArray(data) ? data[0] : null;
      if (first) {
        setRating({
          averageRating: Number(first.average_rating) || 0,
          totalRatings: Number(first.total_ratings) || 0,
          completedRides: Number(first.completed_rides) || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching user rating:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchRating();
  }, [fetchRating]);

  return { ...rating, loading, refetch: fetchRating };
}

export async function submitRating(
  rideId: string,
  raterUserId: string,
  ratedUserId: string,
  rating: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const hasRatedData = await api.post<any>('/rpc/has_rated_user', {
      _rater_id: raterUserId,
      _rated_id: ratedUserId,
      _ride_id: rideId,
    });
    const alreadyRated = Array.isArray(hasRatedData) ? hasRatedData[0] : hasRatedData;
    if (alreadyRated) {
      return { success: false, error: 'You have already rated this user for this ride' };
    }

    await api.post('/data/ratings', {
      ride_id: rideId,
      rater_user_id: raterUserId,
      rated_user_id: ratedUserId,
      rating,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error submitting rating:', error);
    return { success: false, error: error.message || 'Failed to submit rating' };
  }
}

export async function checkIfRated(
  raterUserId: string,
  ratedUserId: string,
  rideId: string
): Promise<boolean> {
  try {
    const data = await api.post<any>('/rpc/has_rated_user', {
      _rater_id: raterUserId,
      _rated_id: ratedUserId,
      _ride_id: rideId,
    });
    return Array.isArray(data) ? !!data[0] : !!data;
  } catch (error) {
    console.error('Error checking if rated:', error);
    return false;
  }
}
