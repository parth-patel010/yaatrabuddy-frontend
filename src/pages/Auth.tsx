import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
import { ArrowLeft, Camera, Loader2, CheckCircle, Mail, KeyRound, ShieldCheck } from 'lucide-react';
import { z } from 'zod';
import { UniversityIdUpload } from '@/components/UniversityIdUpload';
import yaatraBuddyLogo from '@/assets/yaatrabuddy-logo.jpg';


const signUpSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  mobileNumber: z.string().regex(/^\+?[0-9]{10,15}$/, 'Please enter a valid mobile number (10-15 digits)'),
});

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [universityIdUrl, setUniversityIdUrl] = useState<string | null>(null);
  const [universityIdFile, setUniversityIdFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'credentials' | 'verification' | 'forgotPassword' | 'verifyOtp' | 'newPassword'>('credentials');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { signUp, signIn, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Forgot password states
  const [resetEmail, setResetEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user && step !== 'verification' && step !== 'forgotPassword' && step !== 'verifyOtp' && step !== 'newPassword') {
      navigate('/');
    }
  }, [user, navigate, step]);

  // Handle forgot password request
  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(resetEmail)) {
        toast({
          title: 'Invalid Email',
          description: 'Please enter a valid email address.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_URL.replace(/\/$/, '')}/auth/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || res.statusText);

      toast({
        title: 'Code Sent',
        description: 'If an account exists with this email, you will receive a password reset code.',
      });
      setStep('verifyOtp');
    } catch (error: any) {
      console.error('Forgot password error:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to send reset code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP verification and password reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (newPassword !== confirmPassword) {
        toast({
          title: 'Passwords Do Not Match',
          description: 'Please ensure both passwords are the same.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (newPassword.length < 6) {
        toast({
          title: 'Password Too Short',
          description: 'Password must be at least 6 characters.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_URL.replace(/\/$/, '')}/auth/verify-reset-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, otp, newPassword }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        toast({
          title: 'Verification Failed',
          description: data?.error || 'Invalid or expired code.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      toast({
        title: 'Password Reset Successful',
        description: 'You can now sign in with your new password.',
      });

      // Reset states and go back to sign in
      setResetEmail('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setStep('credentials');
      setIsSignUp(false);
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Validate form data but DO NOT create account yet
        const result = signUpSchema.safeParse({ fullName, email, password, mobileNumber });
        if (!result.success) {
          toast({
            title: 'Validation Error',
            description: result.error.errors[0].message,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        // Email validation passed - proceed to verification step
        // The actual signUp() call will handle email existence naturally
        // Move to verification step without creating account
        setStep('verification');
      } else {
        const result = signInSchema.safeParse({ email, password });
        if (!result.success) {
          toast({
            title: 'Validation Error',
            description: result.error.errors[0].message,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: 'Sign In Failed',
            description: 'Invalid email or password. Please try again.',
            variant: 'destructive',
          });
        } else {
          navigate('/');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Store university ID URL temporarily (account not created yet)
  const handleUniversityIdUpload = async (url: string) => {
    setUniversityIdUrl(url);
  };

  // Store avatar file temporarily (will upload after account creation)
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setAvatarUploading(true);
      const file = event.target.files?.[0];
      
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload an image file',
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please upload an image smaller than 2MB',
          variant: 'destructive',
        });
        return;
      }

      // Store file for later upload and create preview
      setAvatarFile(file);
      const previewUrl = URL.createObjectURL(file);
      setAvatarUrl(previewUrl);
      
      toast({
        title: 'Photo ready',
        description: 'Your profile photo will be uploaded when you complete registration.',
      });
    } catch (error: any) {
      console.error('Error preparing photo:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to prepare photo',
        variant: 'destructive',
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleCompleteSignUp = async () => {
    if (!avatarFile) {
      toast({
        title: 'Profile Photo Required',
        description: 'Please upload your profile photo to continue.',
        variant: 'destructive',
      });
      return;
    }

    if (!universityIdFile) {
      toast({
        title: 'University ID Required',
        description: 'Please upload your university ID to complete registration.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError, token } = await signUp(email, password, fullName);

      if (signUpError) {
        let message = signUpError.message;
        if (message.includes('already registered')) {
          message = 'This email is already registered. Please sign in instead.';
        }
        toast({
          title: 'Sign Up Failed',
          description: message,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (!token) {
        toast({
          title: 'Sign Up Failed',
          description: 'Unable to create account. Please try again.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const authHeader = { Authorization: `Bearer ${token}` };

      // Upload avatar
      const avatarForm = new FormData();
      avatarForm.append('file', avatarFile);
      const avatarRes = await fetch(`${API_URL.replace(/\/$/, '')}/upload/avatar`, {
        method: 'POST',
        headers: authHeader,
        body: avatarForm,
      });
      if (!avatarRes.ok) {
        console.error('Avatar upload error:', await avatarRes.text());
      }

      // Upload university ID
      const idForm = new FormData();
      idForm.append('file', universityIdFile);
      const idRes = await fetch(`${API_URL.replace(/\/$/, '')}/upload/university-id`, {
        method: 'POST',
        headers: authHeader,
        body: idForm,
      });
      if (!idRes.ok) {
        console.error('University ID upload error:', await idRes.text());
      }

      // Update profile with phone and verification submitted
      await fetch(`${API_URL.replace(/\/$/, '')}/data/profiles/me`, {
        method: 'PATCH',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: mobileNumber,
          verification_submitted_at: new Date().toISOString(),
        }),
      });

      toast({
        title: 'Welcome to YaatraBuddy!',
        description: 'Your account has been created. Your verification is pending admin approval (usually within 24 hours).',
      });
      navigate('/');
    } catch (error: any) {
      console.error('Signup error:', error);
      const isNetworkError =
        error?.message === 'Failed to fetch' ||
        error?.name === 'TypeError' ||
        (error?.message && /network|timeout|connection/i.test(error.message));
      const description = isNetworkError
        ? 'Cannot reach the server. Check your internet connection and that the API server is running.'
        : (error?.message || 'An error occurred during sign up.');
      toast({
        title: 'Sign Up Failed',
        description,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen flex-col bg-deep-teal text-cream font-poppins antialiased">
      <main className="flex flex-1 items-center justify-center p-4 md:p-8 overflow-y-auto">
        {step === 'credentials' ? (
          <div className="w-full max-w-md animate-fade-up">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white/10 shadow-lg mb-4">
                <img src={yaatraBuddyLogo} alt="YaatraBuddy" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">YaatraBuddy</h1>
              <p className="text-cream/80 text-sm mt-1">Find your travel partner</p>
            </div>

            {isSignUp && (
              <div className="flex justify-center gap-3 mb-6">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full copper-gradient text-white flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <span className="text-sm font-medium text-white">Account</span>
                </div>
                <div className="h-px w-8 bg-white/20 self-center" />
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-white/10 text-cream/70 flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <span className="text-sm text-cream/70">Verification</span>
                </div>
              </div>
            )}

            <Card className="bg-dark-teal border-white/10 shadow-xl">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl md:text-2xl text-white">
                  {isSignUp ? 'Create Account' : 'Welcome Back'}
                </CardTitle>
                <CardDescription className="text-cream/80">
                  {isSignUp
                    ? 'Join YaatraBuddy and start finding travel partners'
                    : 'Sign in to your account to continue'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                  {isSignUp && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-cream font-medium">
                          Full Name
                        </Label>
                        <Input
                          id="fullName"
                          type="text"
                          placeholder="John Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          className="h-11 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-cream/50 focus-visible:ring-copper"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mobileNumber" className="text-cream font-medium">
                          Mobile Number
                        </Label>
                        <Input
                          id="mobileNumber"
                          type="tel"
                          placeholder="+91 9876543210"
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value)}
                          required
                          className="h-11 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-cream/50 focus-visible:ring-copper"
                        />
                        <p className="text-xs text-cream/60">Used for ride coordination</p>
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-cream font-medium">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-cream/50 focus-visible:ring-copper"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-cream font-medium">
                        Password
                      </Label>
                      {!isSignUp && (
                        <button
                          type="button"
                          className="text-sm text-copper hover:text-copper-light hover:underline transition-colors"
                          onClick={() => {
                            setResetEmail(email);
                            setStep('forgotPassword');
                          }}
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-cream/50 focus-visible:ring-copper"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 rounded-xl text-base font-semibold copper-gradient text-white border-0 hover:opacity-90" 
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Please wait...
                      </span>
                    ) : isSignUp ? (
                      'Continue'
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>

                <div className="text-center text-sm text-cream/80 pt-2">
                  {isSignUp ? (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        className="font-semibold text-copper hover:text-copper-light hover:underline transition-colors"
                        onClick={() => setIsSignUp(false)}
                      >
                        Sign In
                      </button>
                    </>
                  ) : (
                    <>
                      Don't have an account?{' '}
                      <button
                        type="button"
                        className="font-semibold text-copper hover:text-copper-light hover:underline transition-colors"
                        onClick={() => setIsSignUp(true)}
                      >
                        Sign Up
                      </button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : step === 'forgotPassword' ? (
          <div className="w-full max-w-md animate-fade-up">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white/10 shadow-lg mb-4">
                <img src={yaatraBuddyLogo} alt="YaatraBuddy" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">YaatraBuddy</h1>
              <p className="text-cream/80 text-sm mt-1">Reset your password</p>
            </div>

            <Card className="bg-dark-teal border-white/10 shadow-xl">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-copper/20 flex items-center justify-center">
                  <Mail className="h-7 w-7 text-copper" />
                </div>
                <CardTitle className="text-xl md:text-2xl text-white">Forgot Password?</CardTitle>
                <CardDescription className="text-cream/80">
                  Enter your email and we'll send you a verification code
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <form onSubmit={handleForgotPasswordRequest} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetEmail" className="text-cream font-medium">
                      Email Address
                    </Label>
                    <Input
                      id="resetEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      className="h-11 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-cream/50 focus-visible:ring-copper"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 rounded-xl text-base font-semibold copper-gradient text-white border-0 hover:opacity-90" 
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending code...
                      </span>
                    ) : (
                      'Send Reset Code'
                    )}
                  </Button>
                </form>

                <Button 
                  variant="ghost" 
                  className="w-full text-cream/80 hover:text-white hover:bg-white/5"
                  onClick={() => {
                    setResetEmail('');
                    setStep('credentials');
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : step === 'verifyOtp' ? (
          <div className="w-full max-w-md animate-fade-up">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white/10 shadow-lg mb-4">
                <img src={yaatraBuddyLogo} alt="YaatraBuddy" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">YaatraBuddy</h1>
              <p className="text-cream/80 text-sm mt-1">Verify your identity</p>
            </div>

            <Card className="bg-dark-teal border-white/10 shadow-xl">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-copper/20 flex items-center justify-center">
                  <KeyRound className="h-7 w-7 text-copper" />
                </div>
                <CardTitle className="text-xl md:text-2xl text-white">Enter Verification Code</CardTitle>
                <CardDescription className="text-cream/80">
                  We sent a 6-digit code to <span className="font-medium text-white">{resetEmail}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex justify-center [&_.bg-border]:bg-white/20 [&_input]:text-white [&_input]:caret-white">
                  <InputOTP 
                    maxLength={6} 
                    value={otp} 
                    onChange={(value) => setOtp(value)}
                  >
                    <InputOTPGroup className="border-white/20">
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <p className="text-center text-sm text-cream/70">
                  Code expires in 10 minutes
                </p>

                <Button 
                  className="w-full h-12 rounded-xl text-base font-semibold copper-gradient text-white border-0 hover:opacity-90" 
                  disabled={otp.length !== 6}
                  onClick={() => setStep('newPassword')}
                >
                  Verify Code
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm text-copper hover:text-copper-light hover:underline transition-colors"
                    onClick={() => {
                      setOtp('');
                      handleForgotPasswordRequest({ preventDefault: () => {} } as React.FormEvent);
                    }}
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : "Didn't receive code? Resend"}
                  </button>
                </div>

                <Button 
                  variant="ghost" 
                  className="w-full text-cream/80 hover:text-white hover:bg-white/5"
                  onClick={() => {
                    setOtp('');
                    setStep('forgotPassword');
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Change email
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : step === 'newPassword' ? (
          <div className="w-full max-w-md animate-fade-up">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white/10 shadow-lg mb-4">
                <img src={yaatraBuddyLogo} alt="YaatraBuddy" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">YaatraBuddy</h1>
              <p className="text-cream/80 text-sm mt-1">Create new password</p>
            </div>

            <Card className="bg-dark-teal border-white/10 shadow-xl">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-copper/20 flex items-center justify-center">
                  <ShieldCheck className="h-7 w-7 text-copper" />
                </div>
                <CardTitle className="text-xl md:text-2xl text-white">Set New Password</CardTitle>
                <CardDescription className="text-cream/80">
                  Choose a strong password for your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-cream font-medium">
                      New Password
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="h-11 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-cream/50 focus-visible:ring-copper"
                    />
                    <p className="text-xs text-cream/60">Minimum 6 characters</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-cream font-medium">
                      Confirm Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="h-11 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-cream/50 focus-visible:ring-copper"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 rounded-xl text-base font-semibold copper-gradient text-white border-0 hover:opacity-90" 
                    disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Resetting password...
                      </span>
                    ) : (
                      'Reset Password'
                    )}
                  </Button>
                </form>

                <Button 
                  variant="ghost" 
                  className="w-full text-cream/80 hover:text-white hover:bg-white/5"
                  onClick={() => setStep('verifyOtp')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to verification
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="w-full max-w-lg animate-fade-up">
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-white/10 shadow-lg mb-3">
                <img src={yaatraBuddyLogo} alt="YaatraBuddy" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-xl font-bold text-white">YaatraBuddy</h1>
            </div>

            <div className="flex justify-center gap-3 mb-8">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full copper-gradient text-white flex items-center justify-center text-sm">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-white">Account</span>
              </div>
              <div className="h-px w-8 bg-copper self-center" />
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full copper-gradient text-white flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <span className="text-sm font-medium text-white">Verification</span>
              </div>
            </div>

            <Card className="bg-dark-teal border-white/10 shadow-xl">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl md:text-2xl text-white">Complete Your Profile</CardTitle>
                <CardDescription className="text-cream/80">
                  Upload your photo and university ID to get verified
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-cream font-medium">
                    Profile Photo <span className="text-red-400">*</span>
                  </Label>
                  <div className="flex flex-col items-center p-6 rounded-xl border-2 border-dashed border-white/20 bg-white/5 hover:border-copper/50 transition-colors">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <div className="relative mb-3">
                      <Avatar className="h-20 w-20 border-2 border-white/20">
                        <AvatarImage src={avatarUrl || undefined} />
                        <AvatarFallback className="bg-copper/30 text-cream text-xl">
                          {fullName ? fullName.charAt(0).toUpperCase() : '?'}
                        </AvatarFallback>
                      </Avatar>
                      {avatarUrl && (
                        <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full copper-gradient flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                    <Button 
                      type="button" 
                      size="sm"
                      className="gap-2 rounded-xl bg-white text-deep-teal hover:bg-cream border border-white/30 font-medium shadow-sm"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                    >
                      {avatarUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="h-4 w-4" />
                          {avatarUrl ? 'Change Photo' : 'Upload Photo'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-cream font-medium">
                    University ID Card <span className="text-red-400">*</span>
                  </Label>
                  <UniversityIdUpload 
                    currentIdUrl={universityIdUrl}
                    onUploadComplete={handleUniversityIdUpload}
                    onFileSelect={(file) => setUniversityIdFile(file)}
                    darkBackground
                    mode="temporary"
                  />
                  {universityIdFile && (
                    <div className="flex items-center gap-2 text-sm text-copper">
                      <CheckCircle className="h-4 w-4" />
                      University ID ready for submission
                    </div>
                  )}
                </div>

                <Button 
                  className="w-full h-12 rounded-xl text-base font-semibold copper-gradient text-white border-0 hover:opacity-90" 
                  onClick={handleCompleteSignUp}
                  disabled={!avatarFile || !universityIdFile || loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Account...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </Button>

                {(!avatarFile || !universityIdFile) && (
                  <p className="text-center text-sm text-cream/70">
                    Both profile photo and university ID are required to complete registration
                  </p>
                )}

                <Button 
                  variant="ghost" 
                  className="w-full text-cream/80 hover:text-white hover:bg-white/5"
                  onClick={() => setStep('credentials')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to account details
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
