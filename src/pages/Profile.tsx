import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AppShell } from '@/components/AppShell';
import { TealHeader } from '@/components/TealHeader';
import { RideCard } from '@/components/RideCard';
import { AvatarUpload } from '@/components/AvatarUpload';
import { RideRequestsManager } from '@/components/RideRequestsManager';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { UserRatingBadge } from '@/components/UserRatingBadge';
import { RewardProgress } from '@/components/RewardProgress';
import { useAuth } from '@/hooks/useAuth';
import { useVerification } from '@/hooks/useVerification';
import { usePremium } from '@/hooks/usePremium';
import { useUserRating } from '@/hooks/useUserRating';
import { useRewardSystem } from '@/hooks/useRewardSystem';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/api/client';
import { User, Mail, Phone, MapPin, Edit2, Save, X, Users, Loader2, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  avatar_url: string | null;
  is_verified?: boolean;
  university_id_url?: string | null;
}

interface Ride {
  id: string;
  from_location: string;
  to_location: string;
  ride_date: string;
  ride_time: string;
  seats_available: number;
  user_id: string;
  transport_mode: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myRides, setMyRides] = useState<Ride[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { user, loading: authLoading } = useAuth();
  const { isVerified } = useVerification();
  const { isPremium, subscriptionExpiry } = usePremium();
  const { averageRating, completedRides, loading: ratingLoading } = useUserRating(user?.id);
  const { progress, hasPendingReward, loading: rewardLoading } = useRewardSystem();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchMyRides();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const data = await api.get<Profile>('/data/profiles/me');
      setProfile(data);
      setEditName(data.full_name);
      setEditPhone(data.phone_number || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRides = async () => {
    try {
      const data = await api.get<unknown[]>('/data/rides', { params: { user_id: user!.id } });
      setMyRides(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching rides:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      toast({ title: 'Error', description: 'Name cannot be empty', variant: 'destructive' });
      return;
    }
    if (!editPhone.trim()) {
      toast({ title: 'Error', description: 'Phone number is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await api.patch('/data/profiles/me', { full_name: editName.trim(), phone_number: editPhone.trim() });
      setProfile((prev) => prev ? { ...prev, full_name: editName.trim(), phone_number: editPhone.trim() } : null);
      setIsEditing(false);
      toast({ title: 'Profile Updated', description: 'Your profile has been saved.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update profile', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpdate = (newUrl: string) => {
    setProfile((prev) => prev ? { ...prev, avatar_url: newUrl } : null);
  };

  if (authLoading || loading) {
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
      <div className="space-y-6">
        <Card className="border-white/10 bg-dark-teal shadow-soft rounded-xl text-cream">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-white">My Profile</CardTitle>
                <CardDescription className="text-sm text-cream/90">Manage your account information</CardDescription>
              </div>
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="shrink-0 border-2 border-cream bg-cream/20 text-cream hover:bg-cream/30 hover:text-white font-semibold text-sm [&_svg]:text-cream [&_svg]:shrink-0"
                >
                  <Edit2 className="mr-2 h-4 w-4" /> Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <AvatarUpload
                userId={user!.id}
                currentAvatarUrl={profile?.avatar_url || null}
                userName={profile?.full_name || 'User'}
                onUploadComplete={handleAvatarUpdate}
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-lg font-semibold text-white">{profile?.full_name}</p>
                  {isPremium ? (
                    <VerifiedBadge size="sm" isPremium />
                  ) : isVerified ? (
                    <VerifiedBadge size="sm" />
                  ) : null}
                  {!ratingLoading && (
                    <UserRatingBadge averageRating={averageRating} totalRides={completedRides} showRides size="md" className="text-cream [&_span]:text-cream" />
                  )}
                </div>
                <p className="text-sm text-cream">Member since {new Date().getFullYear()}</p>
              </div>
            </div>

            {/* Premium Status */}
            {isPremium && subscriptionExpiry && (
              <div className="rounded-lg p-3 border flex items-center gap-3" 
                style={{ background: 'linear-gradient(135deg, #FFD70010, #14B8A610)', borderColor: '#FFD70040' }}>
                <Crown className="h-5 w-5 shrink-0" style={{ color: '#FFD700' }} />
                <div>
                  <p className="text-sm font-medium text-white">Premium Active</p>
                  <p className="text-xs text-cream/70">
                    Expires: {format(new Date(subscriptionExpiry), 'dd MMM yyyy')}
                  </p>
                </div>
              </div>
            )}

            {!isPremium && (
              <Button 
                variant="outline" 
                className="w-full gap-2 border-amber-400/80 bg-amber-50/95 text-amber-900 hover:bg-amber-100 font-semibold text-xs min-w-0 px-3 py-2.5 overflow-visible"
                onClick={() => navigate('/premium')}
              >
                <Crown className="h-4 w-4 shrink-0" style={{ color: '#B45309' }} />
                <span>Upgrade to Premium · ₹99/mo</span>
              </Button>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-cream/80"><User className="h-4 w-4" /> Full Name</Label>
                {isEditing ? (
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Your name" className="bg-white/10 border-white/20 text-cream placeholder:text-cream/50" />
                ) : (
                  <p className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-cream">{profile?.full_name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-cream/80"><Mail className="h-4 w-4" /> Email</Label>
                <p className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-cream">{profile?.email}</p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-cream/80"><Phone className="h-4 w-4" /> Phone Number <span className="text-red-300">*</span></Label>
                {isEditing ? (
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Your phone number" type="tel" className="bg-white/10 border-white/20 text-cream placeholder:text-cream/50" />
                ) : (
                  <p className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-cream">{profile?.phone_number || <span className="text-amber-200">Please add your phone number</span>}</p>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-3">
                <Button variant="hero" onClick={handleSaveProfile} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={() => {
                  setIsEditing(false);
                  setEditName(profile?.full_name || '');
                  setEditPhone(profile?.phone_number || '');
                }}>
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {!rewardLoading && progress && (
          <RewardProgress
            totalConnections={progress.total_connections}
            currentProgress={progress.current_progress}
            nextMilestone={progress.next_milestone}
            spinUnlocked={progress.spin_unlocked}
            hasPendingReward={hasPendingReward}
            rewardsEnabled={progress.rewards_enabled}
          />
        )}

        <div>
          <h2 className="mb-4 text-xl font-bold text-white">My Posted Rides</h2>
          {myRides.length === 0 ? (
            <Card className="border-white/10 bg-dark-teal">
              <CardContent className="flex flex-col items-center justify-center py-12 text-cream">
                <MapPin className="mb-4 h-12 w-12 text-cream/50" />
                <p className="text-lg font-medium text-white">No rides posted yet</p>
                <p className="mt-1 text-cream/80">Post your first ride to find travel partners</p>
                <Button variant="hero" className="mt-4" onClick={() => navigate('/post-ride')}>Post a Ride</Button>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="single" collapsible className="space-y-4">
              {myRides.map((ride) => (
                <AccordionItem key={ride.id} value={ride.id} className="border border-white/10 rounded-lg bg-dark-teal">
                  <AccordionTrigger className="px-4 hover:no-underline text-cream">
                    <div className="flex items-center gap-3 text-left">
                      <MapPin className="h-4 w-4 text-copper" />
                      <span className="font-medium text-white">{ride.from_location} → {ride.to_location}</span>
                      <span className="text-sm text-cream/70">{new Date(ride.ride_date).toLocaleDateString()}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-4">
                      <RideCard
                        id={ride.id}
                        fromLocation={ride.from_location}
                        toLocation={ride.to_location}
                        rideDate={ride.ride_date}
                        rideTime={ride.ride_time}
                        seatsAvailable={ride.seats_available}
                        userName={profile?.full_name || 'You'}
                        userAvatar={profile?.avatar_url}
                        transportMode={ride.transport_mode}
                        showContact={false}
                      />
                      <div>
                        <h4 className="flex items-center gap-2 font-medium text-cream mb-3"><Users className="h-4 w-4" /> Join Requests</h4>
                        <RideRequestsManager rideId={ride.id} />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>
      </main>
    </div>
    </AppShell>
  );
}
