import { MapPin, Calendar, Clock, Users, Car, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { RideRequestButton } from './RideRequestButton';
import { VerifiedBadge } from './VerifiedBadge';
import { UserRatingBadge } from './UserRatingBadge';
import { useUserRating } from '@/hooks/useUserRating';

interface RideCardProps {
  id: string;
  fromLocation: string;
  toLocation: string;
  rideDate: string;
  rideTime: string;
  seatsAvailable: number;
  userName: string;
  userId?: string;
  userAvatar?: string | null;
  userPhone?: string | null;
  transportMode?: string;
  showContact?: boolean;
  requestStatus?: string | null;
  showRequestStatus?: boolean;
  showProfilePhoto?: boolean;
  showMobileNumber?: boolean;
  isVerified?: boolean;
  isPremium?: boolean;
  onRequestSent?: () => void;
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

export function RideCard({
  id,
  fromLocation,
  toLocation,
  rideDate,
  rideTime,
  seatsAvailable,
  userName,
  userId,
  userAvatar,
  userPhone,
  transportMode = 'car',
  showContact = true,
  requestStatus,
  showRequestStatus = false,
  showProfilePhoto = false,
  showMobileNumber = false,
  isVerified = false,
  isPremium = false,
  onRequestSent,
}: RideCardProps) {
  // Determine if we should show the photo clearly (approved + consent given)
  const canShowPhoto = requestStatus === 'approved' && showProfilePhoto;
  
  // Fetch user rating
  const { averageRating, completedRides, loading: ratingLoading } = useUserRating(userId);

  return (
    <Card className="overflow-hidden border-border bg-background shadow-soft transition-all duration-200 hover:shadow-elevated rounded-2xl">
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-6">
          {/* Transport Mode Badge */}
          {transportMode && (
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="gap-1">
                <span>{transportIcons[transportMode] || '🚗'}</span>
                {transportLabels[transportMode] || 'Car'}
              </Badge>
              {showRequestStatus && requestStatus && (
                <Badge 
                  variant="outline" 
                  className={
                    requestStatus === 'approved' 
                      ? 'text-green-600 border-green-600' 
                      : requestStatus === 'declined' 
                        ? 'text-red-600 border-red-600'
                        : 'text-yellow-600 border-yellow-600'
                  }
                >
                  {requestStatus === 'approved' ? 'Approved' : requestStatus === 'declined' ? 'Declined' : 'Pending'}
                </Badge>
              )}
            </div>
          )}

          {/* Route */}
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className="h-3 w-3 rounded-full border-2 border-primary bg-primary/20" />
              <div className="h-8 w-0.5 bg-border" />
              <div className="h-3 w-3 rounded-full border-2 border-secondary bg-secondary/20" />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">From</p>
                <p className="font-semibold text-foreground">{fromLocation}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">To</p>
                <p className="font-semibold text-foreground">{toLocation}</p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" />
              <span>{format(new Date(rideDate), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" />
              <span>{rideTime}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-secondary" />
              <span>{seatsAvailable} seat{seatsAvailable > 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* User & Contact */}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Avatar className="h-8 w-8">
                  {canShowPhoto ? (
                    <>
                      <AvatarImage src={userAvatar || undefined} alt={userName} />
                      <AvatarFallback className="bg-accent text-sm font-semibold text-accent-foreground">
                        {userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </>
                  ) : (
                    <AvatarFallback className="bg-muted text-sm font-semibold text-muted-foreground blur-[2px]">
                      {userName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                {!canShowPhoto && requestStatus !== 'approved' && userAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/60 rounded-full">
                    <Shield className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-foreground">{userName}</span>
                  {isPremium ? (
                    <VerifiedBadge size="sm" isPremium />
                  ) : isVerified ? (
                    <VerifiedBadge size="sm" />
                  ) : null}
                </div>
                {!ratingLoading && (
                  <UserRatingBadge
                    averageRating={averageRating}
                    totalRides={completedRides}
                    size="sm"
                  />
                )}
                {requestStatus === 'approved' ? (
                  <p className="text-xs text-green-600">Connected • Chat available</p>
                ) : requestStatus === 'pending' ? (
                  <p className="text-xs text-muted-foreground">Awaiting approval</p>
                ) : null}
              </div>
            </div>
            {showContact && userId && (
              <RideRequestButton
                rideId={id}
                rideOwnerId={userId}
                rideOwnerName={userName}
                existingStatus={requestStatus}
                onRequestSent={onRequestSent}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}