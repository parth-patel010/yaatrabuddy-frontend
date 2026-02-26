import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload, Loader2, X } from 'lucide-react';
import { api } from '@/api/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface ProfilePhotoOnboardingProps {
  open: boolean;
  userId: string;
  userName: string;
  onComplete: () => void;
  onSkip: () => void;
}

export function ProfilePhotoOnboarding({
  open,
  userId,
  userName,
  onComplete,
  onSkip,
}: ProfilePhotoOnboardingProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image under 5MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      await api.postForm<{ url: string }>('/upload/avatar', formData);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['home-profile'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });

      toast({
        title: 'Photo uploaded!',
        description: 'Your profile photo has been saved.',
      });

      onComplete();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Could not upload photo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const firstLetter = userName?.charAt(0)?.toUpperCase() || 'U';

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-sm mx-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl">Add your profile photo</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Your photo helps build trust with travel partners
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* Avatar Preview */}
          <div className="relative">
            <Avatar className="w-28 h-28 border-4 border-primary/20">
              {preview ? (
                <AvatarImage src={preview} alt="Preview" className="object-cover" />
              ) : (
                <AvatarFallback className="bg-primary/10 text-primary text-3xl font-semibold">
                  {firstLetter}
                </AvatarFallback>
              )}
            </Avatar>
            
            {preview && (
              <button
                onClick={clearPreview}
                className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            
            {!preview && (
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                <Camera className="h-4 w-4" />
              </div>
            )}
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Action Buttons */}
          <div className="w-full space-y-3">
            {!preview ? (
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full gap-2"
                variant="hero"
              >
                <Upload className="h-4 w-4" />
                Choose Photo
              </Button>
            ) : (
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full gap-2"
                variant="hero"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload Photo
                  </>
                )}
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={onSkip}
              disabled={uploading}
              className="w-full text-muted-foreground"
            >
              Skip for now
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            You can always update your photo later in your profile settings
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
