import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api } from '@/api/client';
import { useAuth } from './useAuth';

interface Connection {
  id: string;
  partner_id: string;
  ride_id: string;
  ride_request_id: string;
  created_at: string;
  expires_at: string;
  status: string;
  is_expired: boolean;
  time_remaining: unknown;
}

export function useConnection() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const hasFetchedRef = useRef(false);

  const fetchConnections = useCallback(async () => {
    if (!user?.id || typeof user.id !== 'string' || user.id.trim() === '') {
      setConnections([]);
      setLoading(false);
      return;
    }

    try {
      const data = await api.post<Connection[]>('/rpc/get_user_connections', { _user_id: user.id });

      setConnections(prev => {
        const newData = Array.isArray(data) ? data : [];
        if (JSON.stringify(prev) === JSON.stringify(newData)) return prev;
        return newData;
      });
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id || typeof user.id !== 'string' || user.id.trim() === '') {
      setConnections([]);
      setLoading(false);
      hasFetchedRef.current = false;
      return;
    }

    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      setLoading(true);
      fetchConnections();
    }

    const interval = setInterval(fetchConnections, 15000);
    return () => {
      clearInterval(interval);
      hasFetchedRef.current = false;
    };
  }, [user, fetchConnections]);

  // Memoize filtered arrays to prevent new references on every render
  const activeConnections = useMemo(
    () => connections.filter((c) => !c.is_expired),
    [connections]
  );
  
  const expiredConnections = useMemo(
    () => connections.filter((c) => c.is_expired),
    [connections]
  );

  return {
    connections,
    activeConnections,
    expiredConnections,
    loading,
    refetch: fetchConnections,
  };
}

// Helper function to create a connection after approval
export async function createConnection(
  user1Id: string,
  user2Id: string,
  rideId: string,
  rideRequestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await api.post('/data/connections', {
      user1_id: user1Id,
      user2_id: user2Id,
      ride_id: rideId,
      ride_request_id: rideRequestId,
    });
    return { success: true };
  } catch (error: any) {
    if (error?.message?.includes('23505')) return { success: true };
    console.error('Error creating connection:', error);
    return { success: false, error: error?.message };
  }
}
