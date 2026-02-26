import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { NotificationBell } from '@/components/NotificationBell';
import { ChatIcon } from '@/components/ChatIcon';
import { Logo } from '@/components/Logo';
import { MobileDrawer } from '@/components/MobileDrawer';
import { User, LogOut, Menu, Shield, Car, Send, ChevronDown, HelpCircle, MessageSquare, Gift, Wallet } from 'lucide-react';
import { useState, memo } from 'react';

export const Header = memo(function Header() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center">
            <Logo size="md" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-2 md:flex">
            <Link to="/find-ride">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">Find a Ride</Button>
            </Link>
            {user && (
              <Link to="/post-ride">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">Post a Ride</Button>
              </Link>
            )}
            <Link to="/faq">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">FAQ</Button>
            </Link>
            <Link to="/contact">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">Contact</Button>
            </Link>
            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
                      <Shield className="h-4 w-4" />
                      Admin
                    </Button>
                  </Link>
                )}
                <ChatIcon />
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-1">
                      <User className="h-5 w-5" />
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex cursor-pointer items-center gap-2">
                        <User className="h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/my-posted-rides" className="flex cursor-pointer items-center gap-2">
                        <Car className="h-4 w-4" />
                        My Posted Rides
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/ride-requests-sent" className="flex cursor-pointer items-center gap-2">
                        <Send className="h-4 w-4" />
                        Requests Sent
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/wallet" className="flex cursor-pointer items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        Wallet
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/rewards" className="flex cursor-pointer items-center gap-2">
                        <Gift className="h-4 w-4" />
                        Rewards
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link to="/auth">
                <Button variant="hero">Sign In</Button>
              </Link>
            )}
          </nav>

          {/* Mobile: Icons + Menu Button */}
          <div className="flex items-center gap-1 md:hidden">
            {user && (
              <>
                <ChatIcon />
                <NotificationBell />
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {user && (
        <MobileDrawer 
          open={mobileDrawerOpen} 
          onClose={() => setMobileDrawerOpen(false)} 
        />
      )}

      {/* Non-authenticated mobile menu */}
      {!user && mobileDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-50 md:hidden"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div 
            className="fixed top-0 right-0 h-full w-[80%] max-w-[320px] bg-background z-50 shadow-2xl rounded-l-[20px] p-6 animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="flex flex-col gap-2 mt-8">
              <Link to="/find-ride" onClick={() => setMobileDrawerOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">Find a Ride</Button>
              </Link>
              <Link to="/faq" onClick={() => setMobileDrawerOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  FAQ
                </Button>
              </Link>
              <Link to="/contact" onClick={() => setMobileDrawerOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Contact
                </Button>
              </Link>
              <div className="border-t border-border my-4" />
              <Link to="/auth" onClick={() => setMobileDrawerOpen(false)}>
                <Button variant="hero" className="w-full">Sign In</Button>
              </Link>
            </nav>
          </div>
        </div>
      )}
    </>
  );
});

