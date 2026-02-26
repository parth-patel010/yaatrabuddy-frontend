import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/AppShell';
import { TealHeader } from '@/components/TealHeader';
import { LocationDropdown } from '@/components/LocationDropdown';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import { useVerification } from '@/hooks/useVerification';
import { useLocations } from '@/hooks/useLocations';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/api/client';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { format, startOfDay } from 'date-fns';

const startOfToday = () => startOfDay(new Date());

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function formatDateDisplay(isoDate: string): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}-${m}-${y}`;
}

const TRANSPORT_MODES = [
  { value: 'car', label: 'Car', icon: 'directions_car' },
  { value: 'taxi', label: 'Taxi', icon: 'local_taxi' },
  { value: 'auto', label: 'Auto', icon: 'airport_shuttle' },
];

const rideSchema = z.object({
  fromLocation: z.string().min(3, 'From location must be at least 3 characters').max(100, 'Location too long'),
  toLocation: z.string().min(3, 'To location must be at least 3 characters').max(100, 'Location too long'),
  rideDate: z.string().min(1, 'Please select a date'),
  rideTime: z.string().min(1, 'Please select a time'),
  seatsAvailable: z.number().min(1, 'At least 1 seat required').max(10, 'Maximum 10 seats'),
  transportMode: z.string().min(1, 'Please select a transport mode'),
});

export default function PostRide() {
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [rideDate, setRideDate] = useState('');
  const [rideTime, setRideTime] = useState('');
  const [seatsAvailable, setSeatsAvailable] = useState<number>(1);
  const [transportMode, setTransportMode] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  const { user, loading: authLoading } = useAuth();
  const { isVerified } = useVerification();
  const { getLocationByName } = useLocations();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      checkProfileComplete();
    }
  }, [user]);

  const checkProfileComplete = async () => {
    try {
      const data = await api.get<{ avatar_url: string | null; phone_number: string | null }>('/data/profiles/me');
      setProfileComplete(!!data?.avatar_url && !!data?.phone_number);
    } catch (error) {
      console.error('Error checking profile:', error);
    } finally {
      setCheckingProfile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isVerified) {
      toast({
        title: 'Account Not Verified',
        description: 'Your account is not verified yet. We verify ID proofs within 24 hours.',
        variant: 'destructive',
      });
      return;
    }

    if (!profileComplete) {
      toast({
        title: 'Complete your profile first',
        description: 'Please add your profile photo and phone number before posting a ride.',
        variant: 'destructive',
      });
      navigate('/profile');
      return;
    }

    if (!fromLocation || !toLocation) {
      toast({
        title: 'Missing Location',
        description: 'Please select or enter both From and To locations.',
        variant: 'destructive',
      });
      return;
    }

    if (fromLocation === toLocation) {
      toast({
        title: 'Invalid Selection',
        description: 'From and To locations cannot be the same.',
        variant: 'destructive',
      });
      return;
    }

    const result = rideSchema.safeParse({
      fromLocation,
      toLocation,
      rideDate,
      rideTime,
      seatsAvailable,
      transportMode,
    });

    if (!result.success) {
      toast({
        title: 'Validation Error',
        description: result.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const fromLoc = getLocationByName(fromLocation);
      const toLoc = getLocationByName(toLocation);

      await api.post('/data/rides', {
        from_location: fromLocation,
        to_location: toLocation,
        from_location_id: fromLoc?.id || null,
        to_location_id: toLoc?.id || null,
        ride_date: rideDate,
        ride_time: rideTime,
        seats_available: seatsAvailable,
        transport_mode: transportMode,
      });

      toast({
        title: 'Ride Posted!',
        description: 'Your ride has been posted successfully.',
      });
      navigate('/find');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to post ride. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || checkingProfile) {
    return (
      <AppShell activeTab="post" hideTopBar shellClassName="bg-deep-teal">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-cream" />
        </div>
      </AppShell>
    );
  }

  const formValid =
    fromLocation.trim().length >= 3 &&
    toLocation.trim().length >= 3 &&
    fromLocation !== toLocation &&
    rideDate &&
    /^\d{4}-\d{2}-\d{2}$/.test(rideDate) &&
    rideTime &&
    /^\d{1,2}:\d{2}$/.test(rideTime) &&
    seatsAvailable >= 1 &&
    seatsAvailable <= 10 &&
    !!transportMode;

  const todayIso = new Date().toISOString().split('T')[0];
  const isTodaySelected = rideDate === todayIso;
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const [rideHour, rideMinute] = (() => {
    if (!rideTime || !/^\d{1,2}:\d{2}$/.test(rideTime)) return [0, 0];
    const [h, m] = rideTime.split(':').map(Number);
    return [Math.min(23, Math.max(0, h)), Math.min(59, Math.max(0, m))];
  })();

  const setRideTimeFromHM = (h: number, m: number) => {
    setRideTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  const isHourDisabled = (h: number) => isTodaySelected && h < currentHour;
  const isMinuteDisabled = (h: number, m: number) =>
    isTodaySelected && h === currentHour && m < currentMinute;

  return (
    <AppShell activeTab="post" hideTopBar shellClassName="bg-deep-teal">
      <div className="relative w-full max-w-[390px] mx-auto min-h-[100dvh] flex flex-col text-cream font-poppins antialiased overflow-hidden">
        <TealHeader title="YaatraBuddy" />
        {/* Main - compact so POST button visible without scroll */}
        <main className="flex-1 min-h-0 overflow-hidden flex flex-col px-4 pt-2 pb-24">
          {/* Profile warning */}
          {isVerified && !profileComplete && (
            <div className="mb-2 rounded-lg p-2.5 border border-amber-500/50 bg-amber-500/10 shrink-0">
              <p className="text-amber-200 text-xs">Complete profile (photo & phone) before posting.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-1.5 border-amber-400/50 text-amber-100 hover:bg-amber-500/20 h-8 text-xs"
                onClick={() => navigate('/profile')}
              >
                Go to Profile
              </Button>
            </div>
          )}

          {/* Page header */}
          <div className="mb-2 shrink-0">
            <h1 className="text-white text-lg font-bold leading-tight">Post a Ride</h1>
            <p className="text-cream text-[11px] font-normal mt-0.5">Share your journey and find travel partners</p>
            <div className="w-8 h-0.5 bg-copper mt-0.5 rounded-full" />
          </div>

          {/* Form card */}
          <div className="bg-dark-teal rounded-xl p-3 pb-3 shadow-lg border border-white/5 space-y-2 flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden flex flex-col">
            <form onSubmit={handleSubmit} className="space-y-2 flex flex-col min-h-0 min-w-0 overflow-x-hidden">
              {/* Transport Mode */}
              <div className="shrink-0">
                <label className="text-cream text-xs font-medium mb-1 block">Transport Mode*</label>
                <div className="flex gap-1.5">
                  {TRANSPORT_MODES.map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => setTransportMode(mode.value)}
                      className={`flex-1 min-w-0 h-9 flex items-center justify-center gap-1 rounded-lg text-xs font-medium transition-colors ${
                        transportMode === mode.value
                          ? 'bg-copper text-white'
                          : 'bg-deep-teal/50 text-white border border-white/10 hover:bg-white/5'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">{mode.icon}</span>
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* From & To */}
              <div className="space-y-1.5 shrink-0">
                <div>
                  <label className="text-cream text-xs font-medium mb-0.5 block">From*</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-teal text-base z-10 pointer-events-none">location_on</span>
                    <LocationDropdown
                      value={fromLocation}
                      onValueChange={setFromLocation}
                      placeholder="Select or enter starting location"
                      type="from"
                      excludeLocation={toLocation || undefined}
                      hideLeftIcon
                      triggerClassName="w-full h-11 pl-9 pr-3 rounded-lg bg-white text-slate-900 text-sm border-none focus:ring-2 focus:ring-copper/50 min-w-0"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-cream text-xs font-medium mb-0.5 block">To*</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-teal text-base z-10 pointer-events-none">flag</span>
                    <LocationDropdown
                      value={toLocation}
                      onValueChange={setToLocation}
                      placeholder="Select or enter destination"
                      type="to"
                      excludeLocation={fromLocation || undefined}
                      hideLeftIcon
                      triggerClassName="w-full h-11 pl-9 pr-3 rounded-lg bg-white text-slate-900 text-sm border-none focus:ring-2 focus:ring-copper/50 min-w-0"
                    />
                  </div>
                </div>
              </div>

              {/* Date & Time - custom popups */}
              <div className="flex gap-2 shrink-0">
                <div className="flex-1 min-w-[7.5rem] relative">
                  <label className="text-cream text-xs font-medium mb-0.5 block">Date*</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="relative w-full h-11 pl-9 pr-3 rounded-lg bg-white text-slate-900 text-sm border-none focus:ring-2 focus:ring-copper/50 text-left flex items-center whitespace-nowrap overflow-hidden"
                      >
                        <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-dark-teal text-base pointer-events-none shrink-0">calendar_today</span>
                        <span className={`min-w-0 truncate ${!rideDate ? 'text-slate-500' : ''}`}>{rideDate ? formatDateDisplay(rideDate) : 'dd-mm-yyyy'}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-0 bg-popover" align="start">
                      <Calendar
                        mode="single"
                        selected={rideDate && /^\d{4}-\d{2}-\d{2}$/.test(rideDate) ? new Date(rideDate + 'T12:00:00') : undefined}
                        onSelect={(d) => d && setRideDate(format(d, 'yyyy-MM-dd'))}
                        disabled={{ before: startOfToday() }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex-1 min-w-0 relative">
                  <label className="text-cream text-xs font-medium mb-0.5 block">Time*</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="relative w-full h-11 pl-9 pr-3 rounded-lg bg-white text-slate-900 text-sm border-none focus:ring-2 focus:ring-copper/50 text-left flex items-center"
                      >
                        <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-dark-teal text-base pointer-events-none">schedule</span>
                        <span className={!rideTime ? 'text-slate-500' : ''}>{rideTime || '--:--'}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3 border-0 bg-popover" align="start">
                      <div className="flex items-center gap-2">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">Hour</label>
                          <select
                            value={rideHour}
                            onChange={(e) => setRideTimeFromHM(Number(e.target.value), rideMinute)}
                            className="h-10 w-16 rounded-lg border border-input bg-background px-2 text-sm font-medium focus:ring-2 focus:ring-copper/50"
                          >
                            {HOURS.map((h) => (
                              <option key={h} value={h} disabled={isHourDisabled(h)}>
                                {String(h).padStart(2, '0')}
                              </option>
                            ))}
                          </select>
                        </div>
                        <span className="text-lg font-bold text-muted-foreground pt-5">:</span>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">Minute</label>
                          <select
                            value={rideMinute}
                            onChange={(e) => setRideTimeFromHM(rideHour, Number(e.target.value))}
                            className="h-10 w-16 rounded-lg border border-input bg-background px-2 text-sm font-medium focus:ring-2 focus:ring-copper/50"
                          >
                            {MINUTES.map((m) => (
                              <option key={m} value={m} disabled={isMinuteDisabled(rideHour, m)}>
                                {String(m).padStart(2, '0')}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Seats Available */}
              <div className="shrink-0">
                <label className="text-cream text-xs font-medium mb-1 block">Seats Available*</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSeatsAvailable((s) => Math.max(1, s - 1))}
                    className="w-9 h-9 rounded-full bg-copper text-white flex items-center justify-center shadow-md hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none shrink-0"
                    disabled={seatsAvailable <= 1}
                  >
                    <span className="material-symbols-outlined text-lg">remove</span>
                  </button>
                  <div className="w-14 h-9 bg-white rounded-lg flex items-center justify-center text-slate-900 font-bold text-base">
                    {seatsAvailable}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSeatsAvailable((s) => Math.min(10, s + 1))}
                    className="w-9 h-9 rounded-full bg-copper text-white flex items-center justify-center shadow-md hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none shrink-0"
                    disabled={seatsAvailable >= 10}
                  >
                    <span className="material-symbols-outlined text-lg">add</span>
                  </button>
                </div>
              </div>

              {/* Post button: enabled when form is valid; verification & profile checked on submit */}
              <button
                type="submit"
                disabled={loading || !formValid}
                className="w-full max-w-full min-w-0 h-11 rounded-xl copper-gradient text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none shrink-0 mt-0.5 mb-2 box-border"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : null}
                {loading ? 'Posting...' : 'Post Ride'}
              </button>
            </form>
          </div>
        </main>
      </div>
    </AppShell>
  );
}
