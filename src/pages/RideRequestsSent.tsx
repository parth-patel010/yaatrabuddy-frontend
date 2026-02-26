import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AppShell } from '@/components/AppShell';
import { TealHeader } from '@/components/TealHeader';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/api/client';
import { MapPin, Calendar, Clock, Loader2, Send, CheckCircle, XCircle, Clock as ClockIcon } from 'lucide-react';
import { format } from 'date-fns';

interface RideRequest {
  id: string;
  ride_id: string;
  status: string;
  created_at: string;
  show_profile_photo: boolean;
  show_mobile_number: boolean;
  ride: {
    from_location: string;
    to_location: string;
    ride_date: string;
    ride_time: string;
    transport_mode: string;
    user_id: string;
  };
  owner_profile?: {
    full_name: string;
    avatar_url: string | null;
    phone_number: string | null;
    is_verified: boolean;
    is_premium?: boolean;
    show_profile_photo: boolean;
    show_mobile_number: boolean;
  };
}

const transportIcons: Record<string, string> = {
  car: '🚗',
  taxi: '🚕',
  auto: '🛺',
};

export default function RideRequestsSent() {
  const [requests, setRequests] = useState<RideRequest[]>([]);
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
      fetchMyRequests();
    }
  }, [user]);

  const fetchMyRequests = async () => {
    try {
      const requestsData = await api.get<any[]>('/data/ride_requests', { requester_id: user!.id });
      const list = Array.isArray(requestsData) ? requestsData : [];

      const requestsWithRides = await Promise.all(
        list.map(async (request: any) => {
          const rideList = await api.get<any[]>('/data/rides', { id: request.ride_id });
          const ride = Array.isArray(rideList) && rideList.length > 0 ? rideList[0] : null;
          return { ...request, ride };
        })
      );

      const requestsWithOwners = await Promise.all(
        requestsWithRides
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .map(async (request: any) => {
            const rideOwnerId = request.ride?.user_id;
            if (!rideOwnerId) return { ...request, owner_profile: undefined };

            if (request.status === 'approved') {
              const contactRows = await api.post<any[]>('/rpc/get_approved_contact_details', {
                _target_user_id: rideOwnerId,
                _requesting_user_id: user!.id,
              });
              const contact = Array.isArray(contactRows) ? contactRows[0] : null;
              if (contact) {
                return {
                  ...request,
                  owner_profile: {
                    full_name: contact.full_name,
                    avatar_url: contact.avatar_url,
                    phone_number: contact.phone_number,
                    is_verified: contact.is_verified,
                    show_profile_photo: contact.show_profile_photo,
                    show_mobile_number: contact.show_mobile_number,
                  },
                };
              }
            }

            const profileRows = await api.post<any[]>('/rpc/get_public_profile', { _user_id: rideOwnerId });
            const profile = Array.isArray(profileRows) ? profileRows[0] : null;
            const profilesList = await api.get<any[]>('/data/profiles', { ids: rideOwnerId });
            const premiumData = Array.isArray(profilesList) && profilesList.length > 0 ? profilesList[0] : null;
            const ownerIsPremium =
              premiumData?.is_premium &&
              premiumData?.subscription_expiry &&
              new Date(premiumData.subscription_expiry) > new Date();

            return {
              ...request,
              owner_profile: profile
                ? {
                    full_name: profile.full_name,
                    avatar_url: profile.avatar_url,
                    phone_number: null,
                    is_verified: profile.is_verified,
                    is_premium: !!ownerIsPremium,
                    show_profile_photo: false,
                    show_mobile_number: false,
                  }
                : undefined,
            };
          })
      );

      setRequests(requestsWithOwners);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          label: 'Accepted',
          variant: 'default' as const,
          icon: CheckCircle,
          color: 'text-green-600 border-green-600',
          bgColor: 'bg-green-50 dark:bg-green-950',
        };
      case 'declined':
        return {
          label: 'Declined',
          variant: 'destructive' as const,
          icon: XCircle,
          color: 'text-red-600 border-red-600',
          bgColor: 'bg-red-50 dark:bg-red-950',
        };
      default:
        return {
          label: 'Pending',
          variant: 'secondary' as const,
          icon: ClockIcon,
          color: 'text-yellow-600 border-yellow-600',
          bgColor: 'bg-yellow-50 dark:bg-yellow-950',
        };
    }
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
        <div className="mx-auto max-w-3xl">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-xl font-bold text-white">Ride Requests Sent</h1>
            <p className="mt-1 text-muted-foreground">Track all ride requests you've sent</p>
          </div>

          {/* Requests List */}
          {requests.length === 0 ? (
            <Card className="border-border">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Send className="mb-4 h-16 w-16 text-muted-foreground/30" />
                <p className="text-lg font-medium text-foreground">You haven't sent any ride requests yet</p>
                <p className="mt-1 text-muted-foreground">Find a ride and send a request to travel together</p>
                <button
                  onClick={() => navigate('/find-ride')}
                  className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90"
                >
                  Find a Ride
                </button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => {
                const statusConfig = getStatusConfig(request.status);
                const StatusIcon = statusConfig.icon;
                const canShowPhoto = request.status === 'approved' && request.show_profile_photo;
                const canShowPhone = request.status === 'approved' && request.show_mobile_number && request.owner_profile?.phone_number;

                return (
                  <Card key={request.id} className="overflow-hidden border-border shadow-soft">
                    <CardContent className="p-0">
                      {/* Status Banner for Approved/Declined */}
                      {request.status === 'approved' && (
                        <div className="flex items-center gap-2 border-b border-green-200 bg-green-50 px-6 py-3 dark:border-green-800 dark:bg-green-950">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <p className="text-sm font-medium text-green-700 dark:text-green-300">
                            Your request was accepted. You can now chat with your travel partner.
                          </p>
                        </div>
                      )}
                      {request.status === 'declined' && (
                        <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-6 py-3 dark:border-red-800 dark:bg-red-950">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <p className="text-sm font-medium text-red-700 dark:text-red-300">
                            Your request was declined by the ride owner.
                          </p>
                        </div>
                      )}

                      <div className="p-6">
                        {/* Route & Status */}
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{transportIcons[request.ride?.transport_mode] || '🚗'}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                <p className="font-semibold text-foreground">
                                  {request.ride?.from_location} → {request.ride?.to_location}
                                </p>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {request.ride?.ride_date && format(new Date(request.ride.ride_date), 'MMM d, yyyy')}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {request.ride?.ride_time}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className={statusConfig.color}>
                            <StatusIcon className="mr-1 h-3.5 w-3.5" />
                            {statusConfig.label}
                          </Badge>
                        </div>

                        {/* Ride Owner Info */}
                        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              {canShowPhoto ? (
                                <AvatarImage src={request.owner_profile?.avatar_url || undefined} />
                              ) : null}
                              <AvatarFallback className={canShowPhoto ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground blur-[2px]"}>
                                {request.owner_profile?.full_name?.charAt(0).toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-1">
                                <p className="font-medium text-foreground">
                                  {request.owner_profile?.full_name || 'Unknown'}
                                </p>
                                {request.owner_profile?.is_premium ? (
                                  <VerifiedBadge size="sm" isPremium />
                                ) : request.owner_profile?.is_verified ? (
                                  <VerifiedBadge size="sm" />
                                ) : null}
                              </div>
                              <p className="text-xs text-muted-foreground">Ride Owner</p>
                            </div>
                          </div>

                          {/* Status indicator */}
                          <div className="flex items-center gap-2">
                            {request.status === 'pending' && (
                              <span className="text-xs text-muted-foreground">Waiting for approval</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        </main>
      </div>
    </AppShell>
  );
}
