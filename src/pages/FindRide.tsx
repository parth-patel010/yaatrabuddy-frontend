import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { TealHeader } from '@/components/TealHeader';
import { LocationDropdown } from '@/components/LocationDropdown';
import { RideRequestButton } from '@/components/RideRequestButton';
import { useAuth } from '@/hooks/useAuth';
import { useLocations } from '@/hooks/useLocations';
import { useUserRating } from '@/hooks/useUserRating';
import { api } from '@/api/client';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Ride {
  id: string;
  from_location: string;
  to_location: string;
  ride_date: string;
  ride_time: string;
  seats_available: number;
  user_id: string;
  transport_mode: string;
  user_profile?: {
    full_name: string;
    avatar_url: string | null;
    is_verified?: boolean;
    is_premium?: boolean;
    phone_number?: string | null;
  };
  request_status?: string | null;
  show_profile_photo?: boolean;
  show_mobile_number?: boolean;
}

function FindRideCard({
  ride,
  onRequestSent,
}: {
  ride: Ride;
  onRequestSent: () => void;
}) {
  const { averageRating } = useUserRating(ride.user_id);
  const displayName = ride.user_profile?.full_name || 'Traveler';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="bg-dark-teal rounded-app p-4 shadow-md border border-white/5">
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-copper" />
            <span className="text-white font-medium text-sm">{ride.from_location}</span>
          </div>
          <div className="ml-1 pl-4 border-l border-dashed border-white/20 h-4" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full border border-copper" />
            <span className="text-white font-medium text-sm">{ride.to_location}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="bg-copper/20 text-copper px-2 py-1 rounded-full flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">directions_car</span>
          </div>
          <div className="bg-white/10 text-cream text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="material-symbols-outlined text-[10px]">person</span>
            {ride.seats_available} seat{ride.seats_available !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center bg-deep-teal/30 p-2 rounded-lg mb-3">
        <div className="flex items-center gap-2 text-xs text-cream/80">
          <span className="material-symbols-outlined text-sm">calendar_today</span>
          <span>{format(new Date(ride.ride_date), 'MMM d, yyyy')}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-cream/80">
          <span className="material-symbols-outlined text-sm">schedule</span>
          <span>{ride.ride_time}</span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-copper/30 flex items-center justify-center text-white font-bold text-xs">
            {initial}
          </div>
          <div>
            <p className="text-white text-xs font-medium">{displayName}</p>
            <div className="flex items-center gap-0.5">
              <span className="material-symbols-outlined text-yellow-400 text-[10px] filled">star</span>
              <span className="text-[10px] text-cream/70">{averageRating > 0 ? averageRating.toFixed(1) : '—'}</span>
            </div>
          </div>
        </div>
        <RideRequestButton
          rideId={ride.id}
          rideOwnerId={ride.user_id}
          rideOwnerName={displayName}
          existingStatus={ride.request_status}
          onRequestSent={onRequestSent}
        />
      </div>
    </div>
  );
}

export default function FindRide() {
  const [fromSearch, setFromSearch] = useState('');
  const [toSearch, setToSearch] = useState('');
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocations, setUserLocations] = useState<{ from: string[]; to: string[] }>({ from: [], to: [] });

  const { user, loading: authLoading } = useAuth();
  const { locations: predefinedLocations } = useLocations();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchRides();
      fetchUserLocations();
    }
  }, [user]);

  const fetchUserLocations = async () => {
    try {
      const data = await api.get<{ from_location: string; to_location: string }[]>('/data/rides');

      if (data && Array.isArray(data)) {
        const predefinedNames = new Set(predefinedLocations.map(l => l.name.toLowerCase()));
        const fromSet = new Set<string>();
        const toSet = new Set<string>();

        data.forEach(ride => {
          if (!predefinedNames.has(ride.from_location.toLowerCase())) fromSet.add(ride.from_location);
          if (!predefinedNames.has(ride.to_location.toLowerCase())) toSet.add(ride.to_location);
        });

        setUserLocations({ from: Array.from(fromSet).sort(), to: Array.from(toSet).sort() });
      }
    } catch (error) {
      console.error('Error fetching user locations:', error);
    }
  };


  const fetchRides = useCallback(async () => {
    setLoading(true);
    try {
      const fromTrimmed = fromSearch.trim();
      const toTrimmed = toSearch.trim();
      const params: Record<string, string> = { ride_date_gte: new Date().toISOString().split('T')[0] };
      if (fromTrimmed) params.from_ilike = fromTrimmed;
      if (toTrimmed) params.to_ilike = toTrimmed;

      const ridesData = await api.get<any[]>('/data/rides', { params });
      if (!ridesData || ridesData.length === 0) { setRides([]); return; }

      const userIds = [...new Set(ridesData.map((r: any) => r.user_id))];

      const [profilesResult, requestsResult] = await Promise.all([
        userIds.length > 0 ? api.get<any[]>('/data/profiles', { ids: userIds.join(',') }) : Promise.resolve([]),
        user ? api.get<any[]>('/data/ride_requests', { requester_id: user.id }) : Promise.resolve([]),
      ]);

      const profileMap = new Map<string, any>();
      if (Array.isArray(profilesResult)) {
        profilesResult.forEach((p: any) => {
          profileMap.set(p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url, is_verified: p.is_verified });
        });
      }

      const requestMap = new Map<string, any>();
      const rideIds = new Set(ridesData.map((r: any) => r.id));
      (Array.isArray(requestsResult) ? requestsResult : []).forEach((req: any) => {
        if (rideIds.has(req.ride_id)) requestMap.set(req.ride_id, req);
      });

      const premiumMap = new Map<string, boolean>();
      if (Array.isArray(profilesResult)) {
        profilesResult.forEach((p: any) => {
          premiumMap.set(p.user_id, !!(p.is_premium && p.subscription_expiry && new Date(p.subscription_expiry) > new Date()));
        });
      }

      const ridesWithDetails = ridesData.map(ride => {
        const request = requestMap.get(ride.id);
        const profile = profileMap.get(ride.user_id);
        const isPremiumUser = premiumMap.get(ride.user_id) || false;

        return {
          ...ride,
          user_profile: profile ? {
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            is_verified: profile.is_verified,
            is_premium: isPremiumUser,
            phone_number: null as string | null,
          } : undefined,
          request_status: request?.status || null,
          show_profile_photo: request?.show_profile_photo || false,
          show_mobile_number: request?.show_mobile_number || false,
        };
      });

      setRides(ridesWithDetails);
    } catch (error) {
      console.error('Error fetching rides:', error);
    } finally {
      setLoading(false);
    }
  }, [fromSearch, toSearch, user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRides();
  };

  if (authLoading) {
    return (
      <AppShell activeTab="find" hideTopBar shellClassName="bg-deep-teal">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-cream" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activeTab="find" hideTopBar shellClassName="bg-deep-teal">
      <div className="relative w-full max-w-[390px] mx-auto h-full flex flex-col text-cream font-poppins antialiased overflow-hidden">
        <TealHeader title="YaatraBuddy" />
        <main className="flex-1 min-h-0 flex flex-col px-4 gap-4 overflow-y-auto overflow-x-hidden pb-24">
          <h1 className="text-white font-bold text-3xl text-left shrink-0">Find a Ride</h1>

          <form onSubmit={handleSearch} className="bg-dark-teal rounded-app p-4 shadow-lg shrink-0 flex flex-col gap-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <span className="material-symbols-outlined text-gray-400 text-lg">location_on</span>
              </div>
              <LocationDropdown
                value={fromSearch}
                onValueChange={setFromSearch}
                placeholder="Starting location"
                type="from"
                excludeLocation={toSearch || undefined}
                hideLeftIcon
                triggerClassName="h-12 pl-10 pr-4 py-3 text-sm text-gray-900 bg-white rounded-lg border-none focus:ring-2 focus:ring-copper w-full"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <span className="material-symbols-outlined text-gray-400 text-lg">sports_score</span>
              </div>
              <LocationDropdown
                value={toSearch}
                onValueChange={setToSearch}
                placeholder="Destination"
                type="to"
                excludeLocation={fromSearch || undefined}
                hideLeftIcon
                triggerClassName="h-12 pl-10 pr-4 py-3 text-sm text-gray-900 bg-white rounded-lg border-none focus:ring-2 focus:ring-copper w-full"
              />
            </div>

            <button
              type="submit"
              className="w-full copper-gradient text-white font-semibold py-3 rounded-lg shadow-md active:opacity-90 transition-opacity mt-1"
            >
              Search
            </button>
          </form>

          <div className="shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-white font-semibold text-lg">Available Rides</h2>
              <div className="h-0.5 w-8 bg-copper rounded-full mt-1" />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-cream" />
              </div>
            ) : rides.length === 0 ? (
              <div className="bg-dark-teal/50 rounded-app p-8 text-center border border-white/5">
                <span className="material-symbols-outlined text-4xl text-white/50 mb-3">directions_car</span>
                <p className="text-white font-medium">No rides found</p>
                <p className="text-sm text-cream/70 mt-1">
                  {fromSearch || toSearch ? 'Try adjusting your search' : 'Be the first to post a ride!'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {rides.map((ride) => (
                  <FindRideCard key={ride.id} ride={ride} onRequestSent={fetchRides} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </AppShell>
  );
}
