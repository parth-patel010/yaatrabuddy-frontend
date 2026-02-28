import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { api } from '@/api/client';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, Shield, Car, CheckCircle, XCircle, Ban, 
  UserCheck, Loader2, Phone, Mail, Calendar, 
  FileImage, AlertTriangle, Eye, Flag, MessageSquare, MapPin, Gift, Crown
} from 'lucide-react';
import { AdminLocations } from '@/components/AdminLocations';
import { AdminRewards } from '@/components/AdminRewards';
import { AdminUserManagement } from '@/components/AdminUserManagement';
import { format } from 'date-fns';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  avatar_url: string | null;
  university_id_url: string | null;
  is_verified: boolean;
  is_blocked: boolean;
  created_at: string;
  verification_submitted_at: string | null;
}

interface Ride {
  id: string;
  from_location: string;
  to_location: string;
  ride_date: string;
  ride_time: string;
  seats_available: number;
  transport_mode: string;
  user_id: string;
  status: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface UserReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  ride_id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  reporter_profile?: {
    full_name: string;
    email: string;
  };
  reported_profile?: {
    full_name: string;
    email: string;
    is_verified: boolean;
  };
  ride?: {
    from_location: string;
    to_location: string;
    ride_date: string;
  };
}

export default function AdminPanel() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingRides, setLoadingRides] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // ID Viewer state
  const [idViewerOpen, setIdViewerOpen] = useState(false);
  const [idViewerLoading, setIdViewerLoading] = useState(false);
  const [idViewerUrl, setIdViewerUrl] = useState<string | null>(null);
  const [idViewerError, setIdViewerError] = useState<string | null>(null);
  const [selectedUserForId, setSelectedUserForId] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isAdmin) {
        toast({
          title: 'Access Denied',
          description: 'You do not have admin privileges.',
          variant: 'destructive',
        });
        navigate('/');
      }
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate, toast]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchRides();
      fetchReports();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const data = await api.get<any[]>('/data/profiles');
      setUsers(Array.isArray(data) ? data : []);
    } catch (error: unknown) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchRides = async () => {
    try {
      const data = await api.get<any[]>('/data/rides');
      const list = Array.isArray(data) ? data : [];
      const sorted = list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const ridesWithProfiles = await Promise.all(
        sorted.map(async (ride) => {
          const profile = await api.get<any>(`/data/profiles/${ride.user_id}`).catch(() => null);
          return {
            ...ride,
            profiles: profile || { full_name: 'Unknown', email: '' },
          };
        })
      );

      setRides(ridesWithProfiles);
    } catch (error: unknown) {
      console.error('Error fetching rides:', error);
      toast({
        title: 'Error',
        description: 'Failed to load rides',
        variant: 'destructive',
      });
    } finally {
      setLoadingRides(false);
    }
  };

  const fetchReports = async () => {
    try {
      const data = await api.get<any[]>('/data/user_reports');
      const list = Array.isArray(data) ? data : [];
      const sorted = list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const reportsWithDetails = await Promise.all(
        sorted.map(async (report) => {
          const [reporterProfile, reportedProfile, rideData] = await Promise.all([
            api.get<any>(`/data/profiles/${report.reporter_id}`).catch(() => null),
            api.get<any>(`/data/profiles/${report.reported_user_id}`).catch(() => null),
            api.get<any[]>('/data/rides', { id: report.ride_id }).then((rides) => {
              const arr = Array.isArray(rides) ? rides : [];
              return arr[0] || null;
            }).catch(() => null),
          ]);
          return {
            ...report,
            reporter_profile: reporterProfile ? { full_name: reporterProfile.full_name, email: reporterProfile.email } : undefined,
            reported_profile: reportedProfile ? { full_name: reportedProfile.full_name, email: reportedProfile.email, is_verified: reportedProfile.is_verified } : undefined,
            ride: rideData ? { from_location: rideData.from_location, to_location: rideData.to_location, ride_date: rideData.ride_date } : undefined,
          };
        })
      );

      setReports(reportsWithDetails);
    } catch (error: unknown) {
      console.error('Error fetching reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reports',
        variant: 'destructive',
      });
    } finally {
      setLoadingReports(false);
    }
  };

  const handleUpdateReportStatus = async (reportId: string, newStatus: string) => {
    setActionLoading(reportId);
    try {
      await api.patch(`/data/user_reports/${reportId}`, { status: newStatus });

      toast({
        title: 'Report Updated',
        description: `Report marked as ${newStatus}`,
      });

      fetchReports();
    } catch (error: unknown) {
      console.error('Error updating report:', error);
      toast({
        title: 'Error',
        description: 'Failed to update report',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Extract file path from university_id_url
  const extractFilePath = (url: string): string | null => {
    try {
      // URL format: .../storage/v1/object/public/university-ids/user_id/filename
      // Or signed URL format
      const match = url.match(/university-ids\/(.+?)(?:\?|$)/);
      if (match) {
        return match[1];
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleViewId = async (profile: UserProfile) => {
    if (!profile.university_id_url) {
      toast({
        title: 'No ID Found',
        description: 'This user has not uploaded a university ID.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedUserForId(profile);
    setIdViewerOpen(true);
    setIdViewerLoading(true);
    setIdViewerError(null);
    setIdViewerUrl(null);

    try {
      const filePath = extractFilePath(profile.university_id_url);
      
      if (!filePath) {
        throw new Error('Could not extract file path from URL');
      }

      const data = await api.get<{ signedUrl?: string; error?: string }>('/admin/signed-id-url', { path: filePath });

      if (data?.signedUrl) {
        setIdViewerUrl(data.signedUrl);
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error: unknown) {
      console.error('Error getting signed URL:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load ID image';
      setIdViewerError(errorMessage);
    } finally {
      setIdViewerLoading(false);
    }
  };

  const handleVerifyUser = async (userId: string, verify: boolean) => {
    setActionLoading(userId);
    try {
      await api.patch(`/data/profiles/${userId}`, { is_verified: verify });

      if (verify) {
        await api.post('/data/notifications', {
          user_id: userId,
          type: 'success',
          title: 'Account Verified!',
          message: 'Congratulations! Your account has been verified. You now have full access to YaatraBuddy.',
        });
      }

      toast({
        title: verify ? 'User Approved' : 'Verification Revoked',
        description: verify 
          ? 'User approved. ID remains available for admin review.' 
          : 'User verification has been revoked.',
      });

      fetchUsers();
    } catch (error: unknown) {
      console.error('Error updating verification:', error);
      toast({
        title: 'Error',
        description: 'Failed to update verification status',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      await api.patch(`/data/profiles/${userId}`, {
        university_id_url: null,
        verification_submitted_at: null,
      });

      await api.post('/data/notifications', {
        user_id: userId,
        type: 'warning',
        title: 'ID Verification Rejected',
        message: 'Your university ID verification was rejected. Please upload a clear, valid university ID to verify your account.',
      });

      toast({
        title: 'User Rejected',
        description: 'User has been notified that their ID was rejected.',
      });

      fetchUsers();
    } catch (error: unknown) {
      console.error('Error rejecting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject verification',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlockUser = async (userId: string, block: boolean) => {
    setActionLoading(userId);
    try {
      await api.patch(`/data/profiles/${userId}`, { is_blocked: block });

      if (block) {
        await api.post('/data/notifications', {
          user_id: userId,
          type: 'info',
          title: 'Account Blocked',
          message: 'Your account has been blocked. Please contact support for more information.',
        });
      }

      toast({
        title: block ? 'User Blocked' : 'User Unblocked',
        description: block 
          ? 'User has been blocked from posting and joining rides.' 
          : 'User has been unblocked.',
      });

      fetchUsers();
    } catch (error: unknown) {
      console.error('Error updating block status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleForceCancelRide = async (rideId: string) => {
    setActionLoading(rideId);
    try {
      console.log('ADMIN_CANCEL: Starting force cancel for ride:', rideId);
      
      const data = await api.post<any>('/rpc/admin_force_cancel_ride', { _ride_id: rideId });

      console.log('ADMIN_CANCEL: RPC response:', data);

      const result = Array.isArray(data) ? data[0] : data;
      
      if (!result) {
        console.error('ADMIN_CANCEL_ERROR: No result returned from RPC');
        toast({
          title: 'Cancel Failed',
          description: 'No response from server. The ride may not exist.',
          variant: 'destructive',
        });
        return;
      }

      if (!result.success) {
        const reason = result.error_message || 'Unknown reason';
        console.error('ADMIN_CANCEL_ERROR: RPC returned failure:', reason);
        toast({
          title: 'Cancel Failed',
          description: `Reason: ${reason}`,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: '🚫 Ride Force Cancelled',
        description: `Ride cancelled. ${result.notified_count} user(s) notified. All chats closed.`,
      });

      fetchRides();
    } catch (error: unknown) {
      console.error('ADMIN_CANCEL_ERROR: Unexpected:', error);
      toast({
        title: 'Cancel Failed',
        description: error instanceof Error ? error.message : 'Unexpected error. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };



  if (authLoading || adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const pendingVerifications = users.filter(u => u.university_id_url && !u.is_verified && !u.is_blocked);
  const verifiedUsers = users.filter(u => u.is_verified);
  const blockedUsers = users.filter(u => u.is_blocked);
  const pendingReports = reports.filter(r => r.status === 'pending');

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      fake_profile: 'Fake profile / fake ID',
      abusive_behaviour: 'Abusive or rude behaviour',
      safety_concern: 'Safety concern',
      spam_misleading: 'Spam / misleading ride',
      harassment: 'Harassment',
      other: 'Other',
    };
    return labels[reason] || reason;
  };

  const getVerificationStatus = (profile: UserProfile) => {
    if (profile.is_blocked) return { label: 'Blocked', variant: 'destructive' as const };
    if (profile.is_verified) return { label: 'Approved', variant: 'default' as const };
    if (profile.university_id_url) return { label: 'Pending', variant: 'secondary' as const };
    return { label: 'No ID', variant: 'outline' as const };
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Manage users, verifications, and rides</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingVerifications.length}</p>
                  <p className="text-sm text-muted-foreground">Pending Verifications</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{verifiedUsers.length}</p>
                  <p className="text-sm text-muted-foreground">Verified Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Car className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{rides.length}</p>
                  <p className="text-sm text-muted-foreground">Total Rides</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-4 sm:space-y-6 w-full min-w-0">
          <div className="w-full min-w-0 overflow-x-auto overflow-y-visible pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
            <TabsList className="flex w-full min-w-max sm:min-w-0 gap-1 p-2 h-auto min-h-10 sm:grid sm:grid-cols-4 lg:grid-cols-8 sm:w-full">
            <TabsTrigger value="pending" className="gap-1 sm:gap-2 shrink-0 text-xs sm:text-sm">
              <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Pending</span> ({pendingVerifications.length})
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1 sm:gap-2 shrink-0 text-xs sm:text-sm">
              <Flag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Reports</span> ({pendingReports.length})
            </TabsTrigger>
            <TabsTrigger value="rewards" className="gap-1 sm:gap-2 shrink-0 text-xs sm:text-sm">
              <Gift className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Rewards</span>
            </TabsTrigger>
            <TabsTrigger value="management" className="gap-1 sm:gap-2 shrink-0 text-xs sm:text-sm">
              <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Management</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1 sm:gap-2 shrink-0 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="rides" className="gap-1 sm:gap-2 shrink-0 text-xs sm:text-sm">
              <Car className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Rides</span>
            </TabsTrigger>
            <TabsTrigger value="locations" className="gap-1 sm:gap-2 shrink-0 text-xs sm:text-sm">
              <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Locations</span>
            </TabsTrigger>
            <TabsTrigger value="blocked" className="gap-1 sm:gap-2 shrink-0 text-xs sm:text-sm">
              <Ban className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Blocked</span> ({blockedUsers.length})
            </TabsTrigger>
          </TabsList>
          </div>

          {/* Pending Verifications */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Verifications</CardTitle>
                <CardDescription>Review and approve university ID submissions</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : pendingVerifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending verifications
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingVerifications.map((profile) => (
                      <UserCard 
                        key={profile.id}
                        profile={profile}
                        actionLoading={actionLoading}
                        onVerify={handleVerifyUser}
                        onBlock={handleBlockUser}
                        onReject={handleRejectUser}
                        onViewId={handleViewId}
                        showIdButton
                        showActions
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Reports */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>User Reports</CardTitle>
                <CardDescription>Review and manage user reports</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingReports ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No reports submitted
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <div key={report.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            {/* Reported User */}
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-muted-foreground">Reported:</span>
                              <span className="font-semibold">{report.reported_profile?.full_name || 'Unknown'}</span>
                              {report.reported_profile?.is_verified && <VerifiedBadge size="sm" />}
                            </div>
                            
                            {/* Reporter (hidden from reported user) */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <span>By:</span>
                              <span>{report.reporter_profile?.full_name || 'Unknown'}</span>
                              <span>•</span>
                              <span>{format(new Date(report.created_at), 'MMM d, yyyy h:mm a')}</span>
                            </div>

                            {/* Ride info */}
                            {report.ride && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <Car className="h-3.5 w-3.5" />
                                <span>{report.ride.from_location} → {report.ride.to_location}</span>
                                <span>•</span>
                                <span>{format(new Date(report.ride.ride_date), 'MMM d, yyyy')}</span>
                              </div>
                            )}

                            {/* Reason */}
                            <div className="flex items-center gap-2 mt-3">
                              <Badge variant="outline" className="text-destructive border-destructive">
                                {getReasonLabel(report.reason)}
                              </Badge>
                              <Badge variant={report.status === 'pending' ? 'secondary' : report.status === 'resolved' ? 'default' : 'outline'}>
                                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                              </Badge>
                            </div>

                            {/* Description */}
                            {report.description && (
                              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                                <div className="flex items-start gap-2">
                                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                                  <p className="text-sm">{report.description}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2">
                            {report.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateReportStatus(report.id, 'resolved')}
                                  disabled={actionLoading === report.id}
                                >
                                  {actionLoading === report.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Resolve
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    handleBlockUser(report.reported_user_id, true);
                                    handleUpdateReportStatus(report.id, 'resolved');
                                  }}
                                  disabled={actionLoading === report.id}
                                >
                                  {actionLoading === report.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Ban className="h-4 w-4 mr-1" />
                                      Block User
                                    </>
                                  )}
                                </Button>
                              </>
                            )}
                            {report.status !== 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateReportStatus(report.id, 'pending')}
                                disabled={actionLoading === report.id}
                              >
                                Reopen
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rewards */}
          <TabsContent value="rewards">
            <AdminRewards />
          </TabsContent>

          {/* User Management */}
          <TabsContent value="management">
            <AdminUserManagement />
          </TabsContent>

          {/* All Users */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>Manage all registered users</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {users.map((profile) => (
                      <UserCard 
                        key={profile.id}
                        profile={profile}
                        actionLoading={actionLoading}
                        onVerify={handleVerifyUser}
                        onBlock={handleBlockUser}
                        onViewId={handleViewId}
                        showIdButton
                        showActions
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rides */}
          <TabsContent value="rides">
            <Card>
              <CardHeader>
                <CardTitle>All Rides</CardTitle>
                <CardDescription>View and manage all posted rides</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingRides ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : rides.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No rides found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rides.map((ride) => {
                      const isCancelled = ride.status === 'cancelled_by_admin';
                      return (
                        <div key={ride.id} className={`flex items-center justify-between p-4 border rounded-lg ${isCancelled ? 'opacity-60 bg-muted/30' : ''}`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{ride.from_location}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-medium">{ride.to_location}</span>
                              {isCancelled && (
                                <Badge variant="destructive" className="text-xs">Cancelled by Admin</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span>{format(new Date(ride.ride_date), 'MMM d, yyyy')}</span>
                              <span>{ride.ride_time}</span>
                              <span>by {ride.profiles?.full_name}</span>
                            </div>
                          </div>
                          {!isCancelled && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  disabled={actionLoading === ride.id}
                                >
                                  {actionLoading === ride.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    'Force Cancel'
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Force Cancel this Ride?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will: cancel the ride, close all active chats, and send a system notification to all connected users. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Keep Ride</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleForceCancelRide(ride.id)}>
                                    Force Cancel Ride
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Locations Management */}
          <TabsContent value="locations">
            <AdminLocations />
          </TabsContent>

          {/* Blocked Users */}
          <TabsContent value="blocked">
            <Card>
              <CardHeader>
                <CardTitle>Blocked Users</CardTitle>
                <CardDescription>Users who have been blocked from the platform</CardDescription>
              </CardHeader>
              <CardContent>
                {blockedUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No blocked users
                  </div>
                ) : (
                  <div className="space-y-4">
                    {blockedUsers.map((profile) => (
                      <UserCard 
                        key={profile.id}
                        profile={profile}
                        actionLoading={actionLoading}
                        onVerify={handleVerifyUser}
                        onBlock={handleBlockUser}
                        onViewId={handleViewId}
                        showIdButton
                        showActions
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ID Viewer Modal */}
        <Dialog open={idViewerOpen} onOpenChange={setIdViewerOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileImage className="h-5 w-5" />
                University ID - {selectedUserForId?.full_name}
              </DialogTitle>
              <DialogDescription>
                Review the uploaded identification document
              </DialogDescription>
            </DialogHeader>
            
            {/* ID Metadata */}
            {selectedUserForId && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg text-sm">
                <div>
                  <span className="text-muted-foreground">ID Type:</span>
                  <span className="ml-2 font-medium">University / Government ID</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Upload Date:</span>
                  <span className="ml-2 font-medium">
                    {selectedUserForId.verification_submitted_at 
                      ? format(new Date(selectedUserForId.verification_submitted_at), 'MMM d, yyyy h:mm a')
                      : 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">User Email:</span>
                  <span className="ml-2 font-medium">{selectedUserForId.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Verification Status:</span>
                  <Badge className="ml-2" variant={
                    selectedUserForId.is_verified ? 'default' : 
                    selectedUserForId.is_blocked ? 'destructive' : 'secondary'
                  }>
                    {selectedUserForId.is_verified ? 'Approved' : 
                     selectedUserForId.is_blocked ? 'Blocked' : 'Pending'}
                  </Badge>
                </div>
              </div>
            )}

            {/* ID Image */}
            <div className="mt-4 min-h-[300px] flex items-center justify-center border rounded-lg bg-muted/30">
              {idViewerLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading ID image...</p>
                </div>
              ) : idViewerError ? (
                <div className="flex flex-col items-center gap-2 p-4 text-center">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                  <p className="font-medium text-destructive">ID image not found</p>
                  <p className="text-sm text-muted-foreground">
                    {idViewerError}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Please ask user to re-upload their ID.
                  </p>
                </div>
              ) : idViewerUrl ? (
                <img 
                  src={idViewerUrl} 
                  alt="University ID"
                  className="max-w-full max-h-[500px] object-contain rounded"
                />
              ) : null}
            </div>

            {/* Action buttons in modal */}
            {selectedUserForId && !selectedUserForId.is_verified && !selectedUserForId.is_blocked && selectedUserForId.university_id_url && (
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    handleRejectUser(selectedUserForId.user_id);
                    setIdViewerOpen(false);
                  }}
                  disabled={actionLoading === selectedUserForId.user_id}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject ID
                </Button>
                <Button
                  onClick={() => {
                    handleVerifyUser(selectedUserForId.user_id, true);
                    setIdViewerOpen(false);
                  }}
                  disabled={actionLoading === selectedUserForId.user_id}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve User
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

// User Card Component
interface UserCardProps {
  profile: UserProfile;
  actionLoading: string | null;
  onVerify: (userId: string, verify: boolean) => void;
  onBlock: (userId: string, block: boolean) => void;
  onReject?: (userId: string) => void;
  onViewId?: (profile: UserProfile) => void;
  showIdButton?: boolean;
  showActions?: boolean;
}

function UserCard({ profile, actionLoading, onVerify, onBlock, onReject, onViewId, showIdButton, showActions }: UserCardProps) {
  const getVerificationStatus = () => {
    if (profile.is_blocked) return { label: 'Blocked', variant: 'destructive' as const };
    if (profile.is_verified) return { label: 'Approved', variant: 'default' as const };
    if (profile.university_id_url) return { label: 'Pending', variant: 'secondary' as const };
    return { label: 'No ID', variant: 'outline' as const };
  };

  const status = getVerificationStatus();

  return (
    <div className="flex items-start gap-4 p-4 border rounded-lg">
      <Avatar className="h-12 w-12">
        <AvatarImage src={profile.avatar_url || undefined} />
        <AvatarFallback className="bg-accent text-accent-foreground">
          {profile.full_name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">{profile.full_name}</span>
          {profile.is_verified && <VerifiedBadge size="sm" />}
          <Badge variant={status.variant} className="text-xs">
            {status.label}
          </Badge>
        </div>
        <div className="flex flex-col gap-1 mt-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Mail className="h-3 w-3" />
            <span>{profile.email}</span>
          </div>
          {profile.phone_number && (
            <div className="flex items-center gap-2">
              <Phone className="h-3 w-3" />
              <span>{profile.phone_number}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            <span>Joined {format(new Date(profile.created_at), 'MMM d, yyyy')}</span>
          </div>
          {profile.verification_submitted_at && (
            <div className="flex items-center gap-2">
              <FileImage className="h-3 w-3" />
              <span>ID uploaded {format(new Date(profile.verification_submitted_at), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>
        
        {/* View ID Button */}
        {showIdButton && onViewId && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2 gap-1"
            onClick={() => onViewId(profile)}
            disabled={!profile.university_id_url}
          >
            <Eye className="h-3 w-3" />
            {profile.university_id_url ? 'View ID' : 'No ID Uploaded'}
          </Button>
        )}
      </div>
      
      {showActions && (
        <div className="flex flex-col gap-2">
          {!profile.is_verified && !profile.is_blocked && profile.university_id_url && (
            <>
              <Button
                size="sm"
                className="gap-1"
                onClick={() => onVerify(profile.user_id, true)}
                disabled={actionLoading === profile.user_id}
              >
                {actionLoading === profile.user_id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </>
                )}
              </Button>
              {onReject && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => onReject(profile.user_id)}
                  disabled={actionLoading === profile.user_id}
                >
                  {actionLoading === profile.user_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      Reject ID
                    </>
                  )}
                </Button>
              )}
            </>
          )}
          {profile.is_verified && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => onVerify(profile.user_id, false)}
              disabled={actionLoading === profile.user_id}
            >
              {actionLoading === profile.user_id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  Revoke
                </>
              )}
            </Button>
          )}
          {!profile.is_blocked ? (
            <Button
              variant="destructive"
              size="sm"
              className="gap-1"
              onClick={() => onBlock(profile.user_id, true)}
              disabled={actionLoading === profile.user_id}
            >
              {actionLoading === profile.user_id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Ban className="h-4 w-4" />
                  Block
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => onBlock(profile.user_id, false)}
              disabled={actionLoading === profile.user_id}
            >
              {actionLoading === profile.user_id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserCheck className="h-4 w-4" />
                  Unblock
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
