import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ChatStoreProvider } from "@/hooks/useChatStore";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { lazy, Suspense, useState } from "react";
import { PageSkeleton } from "@/components/PageSkeleton";
import { NotificationRealtimeSubscriber } from "@/components/NotificationRealtimeSubscriber";
import { DrawerProvider } from "@/contexts/DrawerContext";

// Eagerly loaded (core routes)
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Lazy loaded (secondary routes)
const PostRide = lazy(() => import("./pages/PostRide"));
const FindRide = lazy(() => import("./pages/FindRide"));
const Profile = lazy(() => import("./pages/Profile"));
const MyPostedRides = lazy(() => import("./pages/MyPostedRides"));
const RideRequestsSent = lazy(() => import("./pages/RideRequestsSent"));
const Chats = lazy(() => import("./pages/Chats"));
const ChatDetail = lazy(() => import("./pages/ChatDetail"));
const GroupChatDetail = lazy(() => import("./pages/GroupChatDetail"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Rewards = lazy(() => import("./pages/Rewards"));
const Premium = lazy(() => import("./pages/Premium"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotificationDetail = lazy(() => import("./pages/NotificationDetail"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AdminOnlyRoute({ children }: { children: JSX.Element }) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();

  if (authLoading || adminLoading) {
    return <PageSkeleton />;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/home" replace />;
  return children;
}

const App = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerValue = {
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
    isOpen: drawerOpen,
  };

  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ChatStoreProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <DrawerProvider value={drawerValue}>
            <BrowserRouter>
              <NotificationRealtimeSubscriber />
              <Suspense fallback={<PageSkeleton />}>
                <Routes>
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="/home" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/post" element={<PostRide />} />
                <Route path="/find" element={<FindRide />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/rewards" element={<Rewards />} />
                <Route path="/premium" element={<Premium />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/notification/:id" element={<NotificationDetail />} />
                <Route path="/my-posted-rides" element={<MyPostedRides />} />
                <Route path="/ride-requests-sent" element={<RideRequestsSent />} />
                <Route path="/post-ride" element={<Navigate to="/post" replace />} />
                <Route path="/find-ride" element={<Navigate to="/find" replace />} />
                <Route path="/chats" element={<Chats />} />
                <Route path="/chats/:chatId" element={<ChatDetail />} />
                <Route path="/group-chats/:groupId" element={<GroupChatDetail />} />
                <Route
                  path="/admin"
                  element={
                    <AdminOnlyRoute>
                      <AdminPanel />
                    </AdminOnlyRoute>
                  }
                />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </BrowserRouter>
          </DrawerProvider>
        </TooltipProvider>
      </ChatStoreProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
