import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Link2, Gift, Trophy, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface RewardProgressProps {
  totalConnections: number;
  currentProgress: number;
  nextMilestone: number;
  spinUnlocked: boolean;
  hasPendingReward: boolean;
  rewardsEnabled: boolean;
}

export function RewardProgress({
  totalConnections,
  currentProgress,
  nextMilestone,
  spinUnlocked,
  hasPendingReward,
  rewardsEnabled,
}: RewardProgressProps) {
  const navigate = useNavigate();
  const progressPercentage = (currentProgress / 25) * 100;

  if (!rewardsEnabled) {
    return (
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <span>Rewards are currently disabled for your account</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-elevated overflow-hidden">
      {/* Pending Reward Banner */}
      {hasPendingReward && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-b border-yellow-500/30 p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Gift className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="font-semibold text-yellow-700 dark:text-yellow-400">
                🎉 You've won a reward!
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-500">
                Our YaatraBuddy team will contact you shortly to deliver your reward.
              </p>
            </div>
          </div>
        </div>
      )}

      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Stats Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Link2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Connections</p>
                <p className="text-2xl font-bold text-foreground">{totalConnections}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Next Spin At</p>
                <p className="text-2xl font-bold text-foreground">{nextMilestone}</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress to next spin</span>
              <span className="font-medium text-foreground">{currentProgress}/25</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>

          {/* Spin Button */}
          {spinUnlocked ? (
            <Button
              onClick={() => navigate('/rewards')}
              variant="hero"
              className="w-full"
              size="lg"
            >
              <Gift className="mr-2 h-5 w-5" />
              Spin Available! Claim Now
            </Button>
          ) : (
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground">
                {25 - currentProgress} more connections to unlock your next spin!
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
