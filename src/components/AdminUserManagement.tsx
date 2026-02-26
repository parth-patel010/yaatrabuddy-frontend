import { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Crown, Loader2, Search, UserCheck, XCircle, Gift } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

interface ManagedUser {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  is_verified: boolean;
  is_premium: boolean;
  subscription_expiry: string | null;
}

export function AdminUserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      const data = await api.get<any[]>('/data/profiles');
      const list = Array.isArray(data) ? data : [];
      const sorted = list.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      setUsers(sorted.map((p) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email,
        avatar_url: p.avatar_url,
        is_verified: p.is_verified,
        is_premium: p.is_premium,
        subscription_expiry: p.subscription_expiry,
      })) as ManagedUser[]);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleGiftPremium = async (userId: string) => {
    setActionLoading(userId);
    try {
      await api.post('/rpc/admin_gift_premium', { _target_user_id: userId });
      toast({ title: 'Premium Gifted', description: 'User has been upgraded to Premium for 30 days.' });
      fetchUsers();
    } catch (error) {
      console.error('Error gifting premium:', error);
      toast({ title: 'Error', description: 'Failed to gift premium', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemovePremium = async (userId: string) => {
    setActionLoading(userId);
    try {
      await api.post('/rpc/admin_remove_premium', { _target_user_id: userId });
      toast({ title: 'Premium Removed', description: 'User premium status has been removed.' });
      fetchUsers();
    } catch (error) {
      console.error('Error removing premium:', error);
      toast({ title: 'Error', description: 'Failed to remove premium', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSet25RidesUnlockSpin = async (userId: string) => {
    setActionLoading(userId);
    try {
      await api.post('/admin/set-25-rides-unlock-spin', { user_id: userId });
      toast({
        title: '25 rides set & spin unlocked',
        description: 'User can now use Spin & Win on the Rewards page.',
      });
      fetchUsers();
    } catch (error: unknown) {
      console.error('Error setting 25 rides:', error);
      const msg = error instanceof Error ? error.message : 'Failed to set 25 rides';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const getPlan = (user: ManagedUser) => {
    if (!user.is_premium) return 'Free';
    if (user.subscription_expiry) return 'Premium';
    return 'Premium';
  };

  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          User Management
        </CardTitle>
        <CardDescription>Gift or remove Premium subscriptions for users</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No users found</div>
          ) : (
            filtered.map((user) => {
              const plan = getPlan(user);
              const isPremiumActive = user.is_premium && (!user.subscription_expiry || new Date(user.subscription_expiry) > new Date());
              return (
                <div
                  key={user.user_id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border"
                >
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>{user.full_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground truncate">{user.full_name}</p>
                      {user.is_verified && (
                        <Badge variant="outline" className="text-blue-600 border-blue-600 text-[10px]">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={isPremiumActive ? 'default' : 'secondary'}
                        className={isPremiumActive ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-[10px]' : 'text-[10px]'}
                      >
                        {isPremiumActive ? '⭐ Premium' : 'Free'}
                      </Badge>
                      {isPremiumActive && user.subscription_expiry && (
                        <span className="text-xs text-muted-foreground">
                          Expires {format(new Date(user.subscription_expiry), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => handleSet25RidesUnlockSpin(user.user_id)}
                      disabled={actionLoading === user.user_id}
                      title="Set 25 completed rides and unlock Spin & Win"
                    >
                      {actionLoading === user.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Gift className="h-4 w-4" />
                          25 rides + Spin
                        </>
                      )}
                    </Button>
                    {!isPremiumActive ? (
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={() => handleGiftPremium(user.user_id)}
                        disabled={actionLoading === user.user_id}
                      >
                        {actionLoading === user.user_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Crown className="h-4 w-4" />
                            Gift Premium
                          </>
                        )}
                      </Button>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1"
                            disabled={actionLoading === user.user_id}
                          >
                            {actionLoading === user.user_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="h-4 w-4" />
                                Remove
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Premium?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove premium status from <strong>{user.full_name}</strong>. They will lose all premium benefits and the ₹21 fee will apply again.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemovePremium(user.user_id)}>
                              Remove Premium
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
