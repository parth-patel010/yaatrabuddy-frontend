import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, ArrowRight, RefreshCw, TrendingUp } from 'lucide-react';
import { getLocationAnalytics } from '@/hooks/useLocationSuggestions';

interface LocationStat {
  name: string;
  count: number;
}

export function AdminLocationStats() {
  const [topFromLocations, setTopFromLocations] = useState<LocationStat[]>([]);
  const [topToLocations, setTopToLocations] = useState<LocationStat[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await getLocationAnalytics();
      setTopFromLocations(data.topFromLocations);
      setTopToLocations(data.topToLocations);
    } catch (error) {
      console.error('Error fetching location stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Location Analytics
        </h3>
        <Button variant="outline" size="sm" onClick={fetchStats}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top From Locations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Most Used "From" Locations
            </CardTitle>
            <CardDescription>
              Where riders are starting their journeys
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topFromLocations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No data yet
              </p>
            ) : (
              <div className="space-y-2">
                {topFromLocations.map((loc, index) => (
                  <div
                    key={loc.name}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-muted-foreground w-5">
                        #{index + 1}
                      </span>
                      <span className="text-sm font-medium truncate max-w-[200px]">
                        {loc.name}
                      </span>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {loc.count} rides
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top To Locations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-secondary" />
              Most Used "To" Locations
            </CardTitle>
            <CardDescription>
              Popular destinations for riders
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topToLocations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No data yet
              </p>
            ) : (
              <div className="space-y-2">
                {topToLocations.map((loc, index) => (
                  <div
                    key={loc.name}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-muted-foreground w-5">
                        #{index + 1}
                      </span>
                      <span className="text-sm font-medium truncate max-w-[200px]">
                        {loc.name}
                      </span>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {loc.count} rides
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      {(topFromLocations.length > 0 || topToLocations.length > 0) && (
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                Top Routes:
              </span>{' '}
              {topFromLocations[0]?.name || 'N/A'} 
              <ArrowRight className="h-3 w-3 inline mx-1" /> 
              {topToLocations[0]?.name || 'N/A'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
