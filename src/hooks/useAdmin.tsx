import { useEffect, useRef, useState } from 'react';
import { api } from '@/api/client';
import { useAuth } from './useAuth';

const FOUNDER_EMAIL = 'founder@yaatrabuddy.com';

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const ensuredRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAdminRole() {
      if (!user) {
        if (!cancelled) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        if (!ensuredRef.current && (user.email ?? '').toLowerCase() === FOUNDER_EMAIL) {
          ensuredRef.current = true;
          await api.post('/auth/admin/ensure-admin').catch(() => {});
        }

        const data = await api.get<{ role: string }[]>('/data/user_roles');

        if (cancelled) return;

        setIsAdmin(Array.isArray(data) && data.some((r) => r.role === 'admin'));
      } catch (error) {
        if (cancelled) return;
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    checkAdminRole();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { isAdmin, loading };
}

