import { Link, useLocation } from 'react-router-dom';
import { Home, Search, MessageCircle, Plus, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useChatStore } from '@/hooks/useChatStore';

type TabId = 'home' | 'find' | 'chats' | 'post' | 'rewards';

interface NavItem {
  id: TabId;
  icon: React.ElementType;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { id: 'home', icon: Home, label: 'Home', path: '/home' },
  { id: 'find', icon: Search, label: 'Find', path: '/find' },
  { id: 'chats', icon: MessageCircle, label: 'Chat', path: '/chats' },
  { id: 'post', icon: Plus, label: 'Post', path: '/post' },
  { id: 'rewards', icon: Gift, label: 'Rewards', path: '/rewards' },
];

interface BottomNavProps {
  activeTab?: TabId;
}

export function BottomNav({ activeTab }: BottomNavProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { totalUnreadCount } = useChatStore();

  const getActiveTab = (): TabId => {
    if (activeTab) return activeTab;
    const path = location.pathname;
    if (path === '/home') return 'home';
    if (path === '/find') return 'find';
    if (path.startsWith('/chats')) return 'chats';
    if (path === '/post') return 'post';
    if (path === '/rewards') return 'rewards';
    return 'home';
  };

  const currentTab = getActiveTab();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border safe-area-pb">
      <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          const isCenter = item.id === 'chats';
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-200 active:scale-90",
                isCenter && "relative -mt-4",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {isCenter ? (
                <div className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-primary/30 scale-110" 
                    : "bg-card border border-border text-muted-foreground hover:scale-105"
                )}>
                  <Icon className="h-6 w-6" />
                  {totalUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                    </span>
                  )}
                </div>
              ) : (
                <div className={cn(
                  "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                  isActive && "bg-primary/10 scale-105",
                )}>
                  <Icon className={cn(
                    "h-5 w-5 transition-all duration-200",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
              )}
              <span className={cn(
                "text-[10px] font-medium transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground",
                isCenter && "mt-1"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
