import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Flag } from 'lucide-react';

interface ReportUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUserId: string;
  reportedUserName: string;
  rideId: string;
}

const REPORT_REASONS = [
  { value: 'fake_profile', label: 'Fake profile / fake ID' },
  { value: 'abusive_behaviour', label: 'Abusive or rude behaviour' },
  { value: 'safety_concern', label: 'Safety concern' },
  { value: 'spam_misleading', label: 'Spam / misleading ride' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'other', label: 'Other' },
];

export function ReportUserModal({
  open,
  onOpenChange,
  reportedUserId,
  reportedUserName,
  rideId,
}: ReportUserModalProps) {
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!reason) {
      toast({
        title: 'Reason required',
        description: 'Please select a reason for your report.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      if (!user) throw new Error('Not authenticated');

      await api.post('/data/user_reports', {
        reported_user_id: reportedUserId,
        ride_id: rideId,
        reason,
        description: description.trim() || null,
      });

      await api.post('/data/notifications', {
        title: 'Report Submitted',
        message: 'Your report has been submitted. We will review it within 24–48 hours.',
        type: 'info',
      });

      toast({
        title: 'Report submitted',
        description: 'Thank you. We will review your report within 24–48 hours.',
      });

      // Reset form and close
      setReason('');
      setDescription('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Report User
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Report <span className="font-medium text-foreground">{reportedUserName}</span> for violating community guidelines.
          </p>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason <span className="text-destructive">*</span></Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Add details (optional)</Label>
            <Textarea
              id="description"
              placeholder="Provide additional context about your report..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/500
            </p>
          </div>

          <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            🔐 Your identity will remain confidential and will not be shared with the reported user.
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={submitting || !reason}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
