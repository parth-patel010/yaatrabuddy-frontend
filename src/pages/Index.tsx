import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { useDrawer } from '@/contexts/DrawerContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { ProfilePhotoOnboarding } from '@/components/ProfilePhotoOnboarding';
import { Logo } from '@/components/Logo';
import { Loader2 } from 'lucide-react';

const PHOTO_ONBOARDING_SKIPPED_KEY = 'yaatrabuddy_photo_onboarding_skipped';

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const drawer = useDrawer();
  const [showPhotoOnboarding, setShowPhotoOnboarding] = useState(false);

  const openMenu = () => {
    if (drawer && typeof drawer.openDrawer === 'function') {
      drawer.openDrawer();
    }
  };

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['home-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const data = await api.get<{ full_name: string; avatar_url: string | null }>('/data/profiles/me');
      return { full_name: data.full_name, avatar_url: data.avatar_url };
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Remove white padding: paint body (and any overflow) deep-teal on home
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = '#3D7A7A';
    return () => {
      document.body.style.background = prev;
    };
  }, []);

  useEffect(() => {
    if (profile && !profile.avatar_url && user?.id) {
      const skippedData = localStorage.getItem(PHOTO_ONBOARDING_SKIPPED_KEY);
      if (skippedData) {
        const skipped = JSON.parse(skippedData);
        if (skipped[user.id]) return;
      }
      setShowPhotoOnboarding(true);
    }
  }, [profile, user?.id]);

  const handlePhotoComplete = () => {
    setShowPhotoOnboarding(false);
    queryClient.invalidateQueries({ queryKey: ['home-profile'] });
  };

  const handlePhotoSkip = () => {
    if (user?.id) {
      const skippedData = localStorage.getItem(PHOTO_ONBOARDING_SKIPPED_KEY);
      const skipped = skippedData ? JSON.parse(skippedData) : {};
      skipped[user.id] = true;
      localStorage.setItem(PHOTO_ONBOARDING_SKIPPED_KEY, JSON.stringify(skipped));
    }
    setShowPhotoOnboarding(false);
  };

  const firstName = profile?.full_name?.split(' ')[0] || 'Traveler';

  if (authLoading || profileLoading) {
    return (
      <AppShell activeTab="home" hideTopBar shellClassName="bg-deep-teal">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-cream" />
        </div>
      </AppShell>
    );
  }

  return (
    <>
      <ProfilePhotoOnboarding
        open={showPhotoOnboarding}
        userId={user?.id || ''}
        userName={firstName}
        onComplete={handlePhotoComplete}
        onSkip={handlePhotoSkip}
      />

      <AppShell activeTab="home" hideTopBar shellClassName="bg-deep-teal">
        <div className="relative w-full max-w-[420px] mx-auto flex-1 min-h-0 flex flex-col text-cream font-poppins antialiased overflow-hidden">
          {/* Header - Logo + YaatraBuddy centered */}
          <header className="shrink-0 relative px-4 py-2.5 flex items-center justify-between border-b border-white/10">
            <div className="w-10 flex items-center justify-start" aria-hidden>
              <Logo size="sm" showText={false} className="[&_img]:rounded-xl [&_div]:rounded-xl" />
            </div>
            <span className="text-white font-bold text-lg tracking-wide absolute left-1/2 -translate-x-1/2">YaatraBuddy</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => navigate('/notifications')}
                className="text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Notifications"
              >
                <span className="material-symbols-outlined text-xl">notifications</span>
              </button>
              <button
                type="button"
                onClick={openMenu}
                className="text-white p-2 rounded-full hover:bg-white/10 transition-colors touch-manipulation"
                aria-label="Open menu"
              >
                <span className="material-symbols-outlined text-xl">more_vert</span>
              </button>
            </div>
          </header>

          <main className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-y-auto overflow-x-hidden px-0 pb-2">
            {/* Hero card */}
            <div className="shrink-0 bg-dark-teal rounded-app p-3.5 flex flex-col justify-center relative shadow-lg">
              <div className="absolute right-3 top-3 opacity-10">
                <span className="material-symbols-outlined text-4xl text-white">commute</span>
              </div>
              <h1 className="text-white font-bold text-xl mb-1 leading-tight z-10">
                Find Your
                <br />
                Ride Partner
              </h1>
              <p className="text-cream/80 text-sm mb-2 z-10">Travel smarter, together.</p>
              <div className="flex gap-2.5 z-10">
                <button
                  type="button"
                  onClick={() => navigate('/post')}
                  className="flex-1 bg-copper text-white py-2 rounded-app font-semibold text-sm shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">add_circle</span>
                  Post a Ride
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/find')}
                  className="flex-1 border border-cream/40 text-cream py-2 rounded-app font-semibold text-sm active:bg-white/5 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">search</span>
                  Find a Ride
                </button>
              </div>
            </div>

            {/* How It Works - expanded */}
            <div className="shrink-0 flex flex-col">
              <h3 className="text-white font-semibold text-sm mb-1.5 pl-0.5">How It Works</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/5 rounded-app p-2.5 flex flex-col items-center justify-center text-center gap-1 border border-white/5">
                  <div className="w-8 h-8 rounded-full bg-copper flex items-center justify-center text-sm font-bold text-white shadow-sm">
                    1
                  </div>
                  <span className="text-xs font-medium text-white">Post a Ride</span>
                  <span className="text-[10px] text-cream/70 leading-tight">Share your route, date & seats</span>
                </div>
                <div className="bg-white/5 rounded-app p-2.5 flex flex-col items-center justify-center text-center gap-1 border border-white/5">
                  <div className="w-8 h-8 rounded-full bg-copper flex items-center justify-center text-sm font-bold text-white shadow-sm">
                    2
                  </div>
                  <span className="text-xs font-medium text-white">Connect</span>
                  <span className="text-[10px] text-cream/70 leading-tight">Match with verified travelers</span>
                </div>
                <div className="bg-white/5 rounded-app p-2.5 flex flex-col items-center justify-center text-center gap-1 border border-white/5">
                  <div className="w-8 h-8 rounded-full bg-copper flex items-center justify-center text-sm font-bold text-white shadow-sm">
                    3
                  </div>
                  <span className="text-xs font-medium text-white">Travel</span>
                  <span className="text-[10px] text-cream/70 leading-tight">Chat, meet & ride together</span>
                </div>
              </div>
            </div>

            {/* What is YaatraBuddy - new section */}
            <div className="shrink-0 bg-dark-teal rounded-app p-3.5 border border-white/5">
              <h3 className="text-white font-semibold text-sm mb-2 pl-0.5">What is YaatraBuddy?</h3>
              <p className="text-cream/90 text-sm leading-relaxed mb-2">
                YaatraBuddy is a student-focused ride-sharing platform that helps you find trusted ride partners for your commute. Whether you travel between campus and home, or across cities, connect with verified students, split costs, and travel safely together.
              </p>
              <ul className="text-cream/80 text-xs space-y-1 list-disc list-inside">
                <li>Only verified students and university members</li>
                <li>No direct phone numbers until you both approve</li>
                <li>24-hour chat expiry for privacy</li>
                <li>Premium option for unlimited connections</li>
              </ul>
            </div>

            {/* Spin & Win section – spin + wheel icons visible */}
            <div className="shrink-0">
              <h3 className="text-white font-semibold text-sm mb-1.5 pl-0.5">Spin & Win</h3>
              <div className="w-full rounded-app copper-gradient flex items-center justify-between px-4 py-2.5 relative overflow-hidden shadow-lg">
                <div className="absolute -right-1 -top-1 w-12 h-12 bg-white/10 rounded-full blur-xl" />
                <div className="flex items-center gap-3 z-10">
                  <div className="flex items-center gap-1.5 bg-white/20 p-2 rounded-full backdrop-blur-sm">
                    <span className="material-symbols-outlined text-white text-lg" aria-hidden>rotate_right</span>
                    <span className="material-symbols-outlined text-white text-lg" aria-hidden>toll</span>
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Complete 25 rides</p>
                    <p className="text-white/90 text-xs font-medium">Unlock your spin & win rewards!</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/rewards')}
                  className="bg-white text-copper font-bold text-sm px-4 py-2 rounded-full shadow-sm z-10 shrink-0"
                >
                  Spin
                </button>
              </div>
            </div>

            {/* Why Trust Us - expanded */}
            <div className="shrink-0 flex flex-col">
              <h3 className="text-white font-semibold text-sm mb-1.5 pl-0.5 shrink-0">Why Trust Us?</h3>
              <div className="grid grid-cols-3 grid-rows-2 gap-1.5 flex-shrink-0">
                {[
                  { icon: 'verified_user', label: 'Verified' },
                  { icon: 'lock', label: 'Secure' },
                  { icon: 'phonelink_erase', label: 'No phone sharing' },
                  { icon: 'privacy_tip', label: '24hr Privacy' },
                  { icon: 'school', label: 'Students only' },
                  { icon: 'diamond', label: 'Premium' },
                ].map(({ icon, label }) => (
                  <div
                    key={icon}
                    className="bg-dark-teal rounded-app flex flex-col items-center justify-center p-1.5 text-center border border-white/5 min-h-0"
                  >
                    <span className="material-symbols-outlined text-copper text-base mb-0.5 shrink-0">{icon}</span>
                    <span className="text-xs leading-tight text-cream truncate w-full">{label}</span>
                  </div>
                ))}
              </div>
              <p className="text-cream/70 text-xs mt-2 pl-0.5">
                All users are verified with a university ID. Your number stays private until you accept a request. Chats expire after 24 hours of the ride for your safety.
              </p>
            </div>

            {/* Quick tips */}
            <div className="shrink-0 bg-white/5 rounded-app p-3.5 border border-white/5">
              <h3 className="text-white font-semibold text-sm mb-2 pl-0.5">Quick Tips</h3>
              <div className="space-y-2 text-sm text-cream/90">
                <p><strong className="text-cream">Post early:</strong> Share your ride a few days ahead to get more matches.</p>
                <p><strong className="text-cream">Be clear:</strong> Mention pickup point, time, and number of seats.</p>
                <p><strong className="text-cream">Respond fast:</strong> Accept or decline requests so others can plan.</p>
                <p><strong className="text-cream">Rate after ride:</strong> Help the community by rating your ride partner.</p>
              </div>
            </div>

            {/* Support & links */}
            <div className="shrink-0 flex flex-col gap-2 pb-6">
              <h3 className="text-white font-semibold text-sm mb-1 pl-0.5">Need Help?</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/faq')}
                  className="bg-white/10 text-cream px-3 py-2 rounded-app text-xs font-medium border border-white/10"
                >
                  FAQ
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/contact')}
                  className="bg-white/10 text-cream px-3 py-2 rounded-app text-xs font-medium border border-white/10"
                >
                  Contact
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/premium')}
                  className="bg-white/10 text-cream px-3 py-2 rounded-app text-xs font-medium border border-white/10"
                >
                  Premium
                </button>
              </div>
            </div>
          </main>
        </div>
      </AppShell>
    </>
  );
}
