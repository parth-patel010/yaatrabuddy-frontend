import { useNavigate } from 'react-router-dom';
import { useDrawer } from '@/contexts/DrawerContext';
import { Logo } from '@/components/Logo';

interface TealHeaderProps {
  /** Optional page title shown next to logo (default: YaatraBuddy) */
  title?: string;
}

export function TealHeader({ title = 'YaatraBuddy' }: TealHeaderProps) {
  const navigate = useNavigate();
  const drawer = useDrawer();

  const handleMenuClick = () => {
    if (drawer?.openDrawer) {
      drawer.openDrawer();
    } else {
      navigate('/');
    }
  };

  return (
    <header className="shrink-0 relative flex items-center bg-deep-teal px-4 py-3 justify-between border-b border-white/10">
      <div className="w-10 flex items-center justify-start [&_img]:rounded-xl [&_div]:rounded-xl" aria-hidden>
        <Logo size="sm" showText={false} />
      </div>
      <h2 className="text-white text-lg font-bold leading-tight tracking-tight absolute left-1/2 -translate-x-1/2">{title}</h2>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className="text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button
          type="button"
          onClick={handleMenuClick}
          className="text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </div>
    </header>
  );
}
