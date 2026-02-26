import { useNavigate } from 'react-router-dom';
import { AppShell } from "@/components/AppShell";
import { TealHeader } from '@/components/TealHeader';
import { Bell, CheckCircle2, XCircle, Wallet, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { api } from '@/api/client';
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'ride_accepted':
      return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
    case 'ride_declined':
      return <XCircle className="h-5 w-5 text-destructive" />;
    case 'payment_confirmed':
    case 'payment_success':
      return <CreditCard className="h-5 w-5 text-primary" />;
    case 'wallet_refunded':
      return <Wallet className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
    default:
      return <Bell className="h-5 w-5 text-primary" />;
  }
};

const getStatusColor = (type: string) => {
  switch (type) {
    case 'ride_accepted': return 'bg-green-500';
    case 'ride_declined': return 'bg-destructive';
    case 'payment_confirmed':
    case 'payment_success': return 'bg-primary';
    case 'wallet_refunded': return 'bg-amber-500';
    default: return 'bg-primary';
  }
};

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const data = await api.get<Notification[]>('/data/notifications');
      return (data || []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!user?.id,
  });

  const handleNotificationClick = (notificationId: string) => {
    navigate(`/notification/${notificationId}`);
  };

  return (
    <AppShell hideTopBar shellClassName="bg-deep-teal">
      <div className="relative w-full max-w-[390px] mx-auto h-full flex flex-col text-cream font-poppins antialiased overflow-hidden">
        <TealHeader title="YaatraBuddy" />
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-3 pb-24">
      <div className="max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-white">Notifications</h1>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl bg-dark-teal border border-white/5 p-4 flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full shrink-0 bg-white/10" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4 bg-white/10" />
                  <Skeleton className="h-3 w-1/2 bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        ) : !notifications || notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center">
              <Bell className="h-10 w-10 text-cream/50" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-white">No notifications yet</h3>
              <p className="text-sm text-cream/70 max-w-[250px]">
                Stay tuned! You'll receive updates about your rides and rewards here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                onClick={() => handleNotificationClick(notification.id)}
                className={cn(
                  "rounded-xl border transition-all cursor-pointer p-4 flex gap-4",
                  "hover:shadow-md active:scale-[0.98]",
                  !notification.read ? "bg-copper/10 border-copper/30" : "bg-dark-teal border-white/5"
                )}
              >
                  <div className="relative">
                    <div className={cn(
                      "h-10 w-10 rounded-full shrink-0 flex items-center justify-center",
                      "bg-white/10"
                    )}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    {!notification.read && (
                      <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-copper border-2 border-deep-teal" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn(
                        "text-sm leading-tight truncate",
                        !notification.read ? "font-bold text-white" : "font-semibold text-cream"
                      )}>
                        {notification.title}
                      </p>
                      <span className="text-[10px] text-cream/70 shrink-0 whitespace-nowrap">
                        {format(new Date(notification.created_at), 'h:mm a')}
                      </span>
                    </div>
                    <p className={cn(
                      "text-xs line-clamp-2",
                      !notification.read ? "text-cream/90" : "text-cream/70"
                    )}>
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={cn("h-1.5 w-1.5 rounded-full", getStatusColor(notification.type))} />
                      <span className="text-[10px] uppercase tracking-wider font-bold text-cream/70">
                        {notification.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>
            ))}
          </div>
        )}
      </div>
        </main>
      </div>
    </AppShell>
  );
}
