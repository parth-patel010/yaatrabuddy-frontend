import { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Gift, Loader2, CheckCircle, Smartphone, Tv, 
  ShoppingBag, Banknote, Package, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface AdminReward {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  reward_type: string;
  reward_name: string;
  reward_description: string;
  connection_milestone: number;
  status: string;
  delivered_at: string | null;
  created_at: string;
}

interface UserWithRewards {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  total_connections: number;
  rewards_enabled: boolean;
  pending_rewards: number;
  total_rewards: number;
}

const REWARD_ICONS: Record<string, React.ElementType> = {
  mobile_recharge: Smartphone,
  ott_subscription: Tv,
  myntra_coupon: ShoppingBag,
  upi_cash: Banknote,
  surprise_gift: Package,
};

export function AdminRewards() {
  const [rewards, setRewards] = useState<AdminReward[]>([]);
  const [usersWithRewards, setUsersWithRewards] = useState<UserWithRewards[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRewards = async () => {
    try {
      const data = await api.post<AdminReward[]>('/rpc/admin_get_all_rewards', {});
      setRewards(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching rewards:', error);
      toast({
        title: 'Error',
        description: 'Failed to load rewards',
        variant: 'destructive',
      });
    }
  };

  const fetchUsersWithRewards = async () => {
    try {
      const profiles = await api.get<any[]>('/data/profiles');
      const list = Array.isArray(profiles) ? profiles : [];
      const allRewards = await api.post<any[]>('/rpc/admin_get_all_rewards', {});
      const rewardsList = Array.isArray(allRewards) ? allRewards : [];
      const byUser: Record<string, { pending: number; total: number }> = {};
      for (const r of rewardsList) {
        const uid = r.user_id;
        if (!byUser[uid]) byUser[uid] = { pending: 0, total: 0 };
        byUser[uid].total++;
        if (r.status === 'pending_delivery') byUser[uid].pending++;
      }
      const usersData: UserWithRewards[] = list
        .map((p) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          avatar_url: p.avatar_url,
          total_connections: p.total_connections ?? 0,
          rewards_enabled: p.rewards_enabled ?? false,
          pending_rewards: byUser[p.user_id]?.pending ?? 0,
          total_rewards: byUser[p.user_id]?.total ?? 0,
        }))
        .filter((u) => u.total_connections > 0 || u.total_rewards > 0)
        .sort((a, b) => b.total_connections - a.total_connections);
      setUsersWithRewards(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
    fetchUsersWithRewards();
  }, []);

  const handleMarkDelivered = async (rewardId: string) => {
    setActionLoading(rewardId);
    try {
      await api.post('/rpc/admin_mark_reward_delivered', { _reward_id: rewardId });
      toast({
        title: 'Reward Delivered',
        description: 'Reward has been marked as delivered.',
      });
      fetchRewards();
      fetchUsersWithRewards();
    } catch (error) {
      console.error('Error marking reward delivered:', error);
      toast({
        title: 'Error',
        description: 'Failed to update reward status',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleRewards = async (userId: string, enabled: boolean) => {
    setActionLoading(userId);
    try {
      await api.post('/rpc/admin_toggle_user_rewards', {
        _target_user_id: userId,
        _enabled: enabled,
      });
      toast({
        title: enabled ? 'Rewards Enabled' : 'Rewards Disabled',
        description: `User reward system has been ${enabled ? 'enabled' : 'disabled'}.`,
      });
      fetchUsersWithRewards();
    } catch (error) {
      console.error('Error toggling rewards:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user rewards',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const pendingRewards = rewards.filter(r => r.status === 'pending_delivery');
  const deliveredRewards = rewards.filter(r => r.status === 'delivered');

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Gift className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingRewards.length}</p>
                <p className="text-sm text-muted-foreground">Pending Delivery</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{deliveredRewards.length}</p>
                <p className="text-sm text-muted-foreground">Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rewards.length}</p>
                <p className="text-sm text-muted-foreground">Total Rewards Won</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Rewards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-yellow-600" />
            Pending Deliveries
          </CardTitle>
          <CardDescription>Rewards waiting to be delivered to users</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRewards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending rewards
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRewards.map((reward) => {
                const Icon = REWARD_ICONS[reward.reward_type] || Gift;
                return (
                  <div
                    key={reward.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">{reward.user_name}</p>
                        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                          Pending
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{reward.user_email}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline">{reward.reward_name}</Badge>
                        <span className="text-xs text-muted-foreground">
                          @ {reward.connection_milestone} connections
                        </span>
                        <span className="text-xs text-muted-foreground">
                          • {format(new Date(reward.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{reward.reward_description}</p>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-1"
                      onClick={() => handleMarkDelivered(reward.id)}
                      disabled={actionLoading === reward.id}
                    >
                      {actionLoading === reward.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Mark Delivered
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users with Connections */}
      <Card>
        <CardHeader>
          <CardTitle>User Reward Status</CardTitle>
          <CardDescription>Manage reward eligibility and view user progress</CardDescription>
        </CardHeader>
        <CardContent>
          {usersWithRewards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users with connections yet
            </div>
          ) : (
            <div className="space-y-4">
              {usersWithRewards.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>{user.full_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{user.full_name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap text-sm">
                      <span className="text-primary font-medium">
                        🔗 {user.total_connections} connections
                      </span>
                      {user.total_rewards > 0 && (
                        <span className="text-muted-foreground">
                          🎁 {user.total_rewards} rewards ({user.pending_rewards} pending)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Rewards</span>
                      <Switch
                        checked={user.rewards_enabled}
                        onCheckedChange={(checked) => handleToggleRewards(user.user_id, checked)}
                        disabled={actionLoading === user.user_id}
                      />
                    </div>
                    {!user.rewards_enabled && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Disabled
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Rewards History */}
      <Card>
        <CardHeader>
          <CardTitle>All Rewards History</CardTitle>
          <CardDescription>Complete history of all rewards won</CardDescription>
        </CardHeader>
        <CardContent>
          {rewards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No rewards won yet
            </div>
          ) : (
            <div className="space-y-4">
              {rewards.map((reward) => {
                const Icon = REWARD_ICONS[reward.reward_type] || Gift;
                return (
                  <div
                    key={reward.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground">{reward.user_name}</p>
                        <Badge
                          variant={reward.status === 'delivered' ? 'default' : 'secondary'}
                          className={
                            reward.status === 'delivered'
                              ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                              : 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                          }
                        >
                          {reward.status === 'delivered' ? 'Delivered' : 'Pending'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {reward.reward_name} • {reward.reward_description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Won at {reward.connection_milestone} connections • {format(new Date(reward.created_at), 'MMM d, yyyy')}
                        {reward.delivered_at && ` • Delivered ${format(new Date(reward.delivered_at), 'MMM d, yyyy')}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
