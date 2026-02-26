import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/AppShell';
import { TealHeader } from '@/components/TealHeader';
import { RideRequestsManager } from '@/components/RideRequestsManager';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/api/client';
import { MapPin, Calendar, Clock, Users, Car, Loader2, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface Ride {
  id: string;
  from_location: string;
  to_location: string;
  ride_date: string;
  ride_time: string;
  seats_available: number;
  transport_mode: string;
  created_at: string;
}

const transportIcons: Record<string, string> = {
  car: '🚗',
  taxi: '🚕',
  auto: '🛺',
};

const transportLabels: Record<string, string> = {
  car: 'Car',
  taxi: 'Taxi',
  auto: 'Auto',
};

export default function MyPostedRides() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchMyRides();
    }
  }, [user]);

  const fetchMyRides = async () => {
    try {
      const data = await api.get<Ride[]>('/data/rides', { params: { user_id: user!.id } });
      const list = Array.isArray(data) ? data : [];
      setRides(list.filter((r: any) => r.status !== 'deleted'));
    } catch (error) {
      console.error('Error fetching rides:', error);
    } finally {
      setLoading(false);
    }
  };

  const [deletingRideId, setDeletingRideId] = useState<string | null>(null);

  const handleDeleteRide = async (rideId: string) => {
    if (!user) return;
    setDeletingRideId(rideId);
    try {
      const data = await api.post<{ success: boolean; error_message?: string }[]>('/rpc/owner_delete_ride', {
        _user_id: user.id,
        _ride_id: rideId,
      });
      const result = Array.isArray(data) ? data[0] : null;
      if (result?.success) {
        setRides(prev => prev.filter(r => r.id !== rideId));
        toast.success('Ride deleted successfully');
      } else {
        toast.error(result?.error_message || 'Failed to delete ride');
      }
    } catch (error: any) {
      console.error('Error deleting ride:', error);
      toast.error('Failed to delete ride');
    } finally {
      setDeletingRideId(null);
    }
  };

  const getRideStatus = (rideDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ride = new Date(rideDate);
    ride.setHours(0, 0, 0, 0);
    
    if (ride < today) {
      return { label: 'Completed', variant: 'secondary' as const, color: 'text-muted-foreground' };
    }
    return { label: 'Active', variant: 'default' as const, color: 'text-green-600' };
  };

  if (authLoading) {
    return (
      <AppShell hideTopBar shellClassName="bg-deep-teal">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-cream" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell hideTopBar shellClassName="bg-deep-teal">
      <div className="relative w-full max-w-[390px] mx-auto h-full flex flex-col text-cream font-poppins antialiased overflow-hidden">
        <TealHeader title="YaatraBuddy" />
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-3 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-white">My Posted Rides</h1>
        <button type="button" onClick={() => navigate('/post')} className="copper-gradient text-white font-semibold px-3 py-1.5 rounded-xl gap-1 inline-flex items-center text-sm">
          <Plus className="h-4 w-4" />
          Post
        </button>
      </div>

      {rides.length === 0 ? (
        <div className="rounded-xl bg-dark-teal border border-white/10 flex flex-col items-center justify-center py-12">
          <Car className="mb-4 h-12 w-12 text-cream/30" />
          <p className="font-medium text-white">No rides posted yet</p>
          <p className="text-sm text-cream/70 mt-1">Post your first ride</p>
          <button type="button" className="mt-4 copper-gradient text-white font-semibold px-4 py-2 rounded-xl" onClick={() => navigate('/post')}>
            Post a Ride
          </button>
        </div>
      ) : (
        <Accordion type="single" collapsible className="space-y-3">
          {rides.map((ride) => {
            const status = getRideStatus(ride.ride_date);
            return (
              <AccordionItem key={ride.id} value={ride.id} className="border border-white/10 rounded-xl bg-dark-teal shadow-soft overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-white/5 text-cream">
                  <div className="flex flex-1 flex-col gap-2 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{transportIcons[ride.transport_mode] || '🚗'}</span>
                      <p className="font-medium text-white text-sm truncate">
                        {ride.from_location} → {ride.to_location}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full border border-white/20 text-cream/80 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {ride.seats_available}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${status.label === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-cream/70'}`}>
                        {status.label}
                      </span>
                      <span className="text-xs text-cream/70">
                        {format(new Date(ride.ride_date), 'MMM d')}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="border-t border-white/10 px-4 pb-4 pt-3">
                  <div className="mb-4 text-xs text-cream/70 space-y-1">
                    <p>{format(new Date(ride.ride_date), 'EEEE, MMM d, yyyy')} • {ride.ride_time}</p>
                  </div>
                  <h4 className="mb-2 text-sm font-semibold text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-copper" />
                    Join Requests
                  </h4>
                  <RideRequestsManager rideId={ride.id} />
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="mt-4 w-full gap-2 rounded-xl"
                        disabled={deletingRideId === ride.id}
                      >
                        {deletingRideId === ride.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Delete Ride
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to delete this ride?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. All pending requests will be declined, connected users will be notified, and chats will be closed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteRide(ride.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
        </main>
      </div>
    </AppShell>
  );
}
