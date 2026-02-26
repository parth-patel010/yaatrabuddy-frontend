import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/api/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileCheck, Image } from 'lucide-react';

interface UniversityIdUploadProps {
  userId?: string; // Optional - if not provided, works in temporary mode
  currentIdUrl: string | null;
  onUploadComplete: (url: string) => void;
  onFileSelect?: (file: File) => void; // For temporary mode - returns file instead of uploading
  disabled?: boolean;
  mode?: 'upload' | 'temporary'; // 'upload' = direct upload, 'temporary' = store file locally
  /** Use when placed on dark background (e.g. Auth verification card) for readable text */
  darkBackground?: boolean;
}

export function UniversityIdUpload({
  userId,
  currentIdUrl,
  onUploadComplete,
  onFileSelect,
  disabled = false,
  mode = 'upload',
  darkBackground = false,
}: UniversityIdUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload an image file',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please upload an image smaller than 5MB',
          variant: 'destructive',
        });
        return;
      }

      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);

      // Temporary mode - just store the file locally
      if (mode === 'temporary' || !userId) {
        onFileSelect?.(file);
        onUploadComplete(previewUrl); // Pass preview URL as temporary reference
        toast({
          title: 'ID Ready',
          description: 'Your university ID will be uploaded when you complete registration.',
        });
        return;
      }

      // Upload mode - upload via API
      const formData = new FormData();
      formData.append('file', file);
      const data = await api.postForm<{ url: string }>('/upload/university-id', formData);
      onUploadComplete(data.url);
      toast({
        title: 'ID Uploaded',
        description: 'Your university ID has been uploaded for verification.',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      setPreview(null);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload university ID',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const hasUpload = currentIdUrl || preview;

  return (
    <div className="space-y-3">
      <div 
        className={`relative border-2 border-dashed rounded-xl p-6 transition-colors ${
          hasUpload 
            ? 'border-primary bg-accent' 
            : darkBackground 
              ? 'border-white/20 bg-white/5 hover:border-copper/50' 
              : 'border-border bg-muted/30 hover:border-primary/50'
        }`}
      >
        {hasUpload ? (
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileCheck className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${darkBackground ? 'text-cream' : 'text-foreground'}`}>ID Card uploaded</p>
              <p className={`text-xs ${darkBackground ? 'text-cream/70' : 'text-muted-foreground'}`}>
                {mode === 'temporary' ? 'Ready for submission' : 'Pending verification'}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={darkBackground ? 'border-white/30 text-cream hover:bg-white/10' : ''}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || disabled}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Replace'
              )}
            </Button>
          </div>
        ) : (
          <div 
            className="flex flex-col items-center gap-3 cursor-pointer"
            onClick={() => !disabled && fileInputRef.current?.click()}
          >
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${darkBackground ? 'bg-white/10' : 'bg-muted'}`}>
              {uploading ? (
                <Loader2 className={`h-6 w-6 animate-spin ${darkBackground ? 'text-cream' : 'text-muted-foreground'}`} />
              ) : (
                <Image className={`h-6 w-6 ${darkBackground ? 'text-cream' : 'text-muted-foreground'}`} />
              )}
            </div>
            <div className="text-center">
              <p className={`text-sm font-medium ${darkBackground ? 'text-cream' : 'text-foreground'}`}>
                {uploading ? 'Processing...' : 'Upload your University ID'}
              </p>
              <p className={`text-xs ${darkBackground ? 'text-cream/70' : 'text-muted-foreground'}`}>
                PNG, JPG up to 5MB
              </p>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
