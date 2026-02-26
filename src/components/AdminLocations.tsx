import { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  MapPin, Plus, Loader2, Search, Building2, 
  Home, Train, ShoppingBag, Landmark, GraduationCap 
} from 'lucide-react';
import { CATEGORY_ORDER } from '@/hooks/useLocations';
import { AdminLocationStats } from './AdminLocationStats';

interface Location {
  id: string;
  name: string;
  category: string;
  city: string;
  active: boolean;
  display_order: number;
  created_at: string;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Universities & Colleges':
      return <GraduationCap className="h-4 w-4" />;
    case 'Student Hostel & PG Zones':
      return <Home className="h-4 w-4" />;
    case 'Transport Hubs':
      return <Train className="h-4 w-4" />;
    case 'Residential & Society Zones':
      return <Building2 className="h-4 w-4" />;
    case 'Malls & Commercial Areas':
      return <ShoppingBag className="h-4 w-4" />;
    case 'Major Landmarks & Offices':
      return <Landmark className="h-4 w-4" />;
    default:
      return <MapPin className="h-4 w-4" />;
  }
};

export function AdminLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Add location dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationCategory, setNewLocationCategory] = useState('');
  const [newLocationCity, setNewLocationCity] = useState('Vadodara');
  const [addingLocation, setAddingLocation] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const data = await api.get<Location[]>('/data/locations');
      const list = Array.isArray(data) ? data : [];
      setLocations(list);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load locations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (locationId: string, currentActive: boolean) => {
    setActionLoading(locationId);
    try {
      await api.patch(`/data/locations/${locationId}`, { active: !currentActive });

      toast({
        title: currentActive ? 'Location Disabled' : 'Location Enabled',
        description: currentActive 
          ? 'Location is now hidden from users' 
          : 'Location is now visible to users',
      });

      fetchLocations();
    } catch (error) {
      console.error('Error toggling location:', error);
      toast({
        title: 'Error',
        description: 'Failed to update location',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocationName.trim() || !newLocationCategory) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setAddingLocation(true);
    try {
      const existing = await api.get<{ display_order: number }[]>('/data/locations');
      const list = Array.isArray(existing) ? existing : [];
      const inCategory = list.filter((l: any) => l.category === newLocationCategory);
      const maxOrder = inCategory.length ? Math.max(...inCategory.map((l: any) => l.display_order || 0)) : 0;
      const newOrder = maxOrder + 1;

      await api.post('/data/locations', {
        name: newLocationName.trim(),
        category: newLocationCategory,
        city: newLocationCity,
        display_order: newOrder,
        active: true,
      });

      toast({
        title: 'Location Added',
        description: `"${newLocationName}" has been added successfully`,
      });

      setAddDialogOpen(false);
      setNewLocationName('');
      setNewLocationCategory('');
      fetchLocations();
    } catch (error: any) {
      console.error('Error adding location:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add location',
        variant: 'destructive',
      });
    } finally {
      setAddingLocation(false);
    }
  };

  // Filter locations based on search and category
  const filteredLocations = locations.filter(loc => {
    const matchesSearch = loc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || loc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Group by category for display
  const groupedLocations: Record<string, Location[]> = {};
  filteredLocations.forEach(loc => {
    if (!groupedLocations[loc.category]) {
      groupedLocations[loc.category] = [];
    }
    groupedLocations[loc.category].push(loc);
  });

  // Stats
  const activeLocations = locations.filter(l => l.active).length;
  const totalLocations = locations.length;
  const cities = [...new Set(locations.map(l => l.city))];

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Location Analytics - Most Used Locations */}
      <AdminLocationStats />
      
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalLocations}</p>
                <p className="text-sm text-muted-foreground">Total Locations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeLocations}</p>
                <p className="text-sm text-muted-foreground">Active Locations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cities.length}</p>
                <p className="text-sm text-muted-foreground">Cities</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Add Button */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Manage Locations</CardTitle>
              <CardDescription>Add, enable, or disable locations for Vadodara</CardDescription>
            </div>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Location
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Location</DialogTitle>
                  <DialogDescription>
                    Add a new location for users to select when posting or searching rides.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="location-name">Location Name *</Label>
                    <Input
                      id="location-name"
                      value={newLocationName}
                      onChange={(e) => setNewLocationName(e.target.value)}
                      placeholder="e.g., New Market Area"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location-category">Category *</Label>
                    <Select value={newLocationCategory} onValueChange={setNewLocationCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {CATEGORY_ORDER.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            <span className="flex items-center gap-2">
                              {getCategoryIcon(cat)}
                              {cat}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location-city">City</Label>
                    <Input
                      id="location-city"
                      value={newLocationCity}
                      onChange={(e) => setNewLocationCity(e.target.value)}
                      placeholder="Vadodara"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddLocation} disabled={addingLocation}>
                    {addingLocation ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Adding...
                      </>
                    ) : (
                      'Add Location'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search locations..."
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORY_ORDER.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    <span className="flex items-center gap-2">
                      {getCategoryIcon(cat)}
                      {cat}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Locations List */}
          {Object.keys(groupedLocations).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No locations found matching your criteria
            </div>
          ) : (
            <div className="space-y-6">
              {CATEGORY_ORDER.filter(cat => groupedLocations[cat]).map((category) => (
                <div key={category}>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
                    {getCategoryIcon(category)}
                    {category}
                    <Badge variant="secondary" className="ml-auto">
                      {groupedLocations[category].length}
                    </Badge>
                  </h3>
                  <div className="grid gap-2">
                    {groupedLocations[category].map((location) => (
                      <div 
                        key={location.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          location.active 
                            ? 'bg-background' 
                            : 'bg-muted/50 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <MapPin className={`h-4 w-4 ${location.active ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className={location.active ? 'text-foreground' : 'text-muted-foreground'}>
                            {location.name}
                          </span>
                          {!location.active && (
                            <Badge variant="outline" className="text-xs">
                              Disabled
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {actionLoading === location.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Switch
                              checked={location.active}
                              onCheckedChange={() => handleToggleActive(location.id, location.active)}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
