import { ReactNode } from 'react';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { MobileDrawer } from '@/components/MobileDrawer';
import { useDrawer } from '@/contexts/DrawerContext';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: ReactNode;
  hideBottomNav?: boolean;
  hideTopBar?: boolean;
  activeTab?: 'home' | 'find' | 'chats' | 'post' | 'rewards';
  /** Override shell background (e.g. "bg-deep-teal" for home) to avoid white padding */
  shellClassName?: string;
}

export function AppShell({ 
  children, 
  hideBottomNav = false, 
  hideTopBar = false,
  activeTab = 'home',
  shellClassName,
}: AppShellProps) {
  const drawer = useDrawer();
  const openDrawer = drawer?.openDrawer ?? (() => {});
  const closeDrawer = drawer?.closeDrawer ?? (() => {});
  const isOpen = drawer?.isOpen ?? false;

  return (
    <div className={cn(
          "min-h-screen flex flex-col",
          shellClassName ? "h-screen overflow-hidden" : "",
          shellClassName ?? "bg-background"
        )}>
      {!hideTopBar && <TopBar onMenuClick={openDrawer} />}

      <main className={cn(
        "flex-1 min-h-0 px-4 py-4 pb-24 transition-transform duration-[260ms] ease-out",
        shellClassName && "py-2 flex flex-col overflow-hidden",
        isOpen && "scale-[0.96] origin-center"
      )}>
        {children}
      </main>

      {!hideBottomNav && <BottomNav activeTab={activeTab} />}

      <MobileDrawer open={isOpen} onClose={closeDrawer} />
    </div>
  );
}
