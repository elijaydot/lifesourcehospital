import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Stethoscope, Droplets, Users, Activity, LogOut, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

interface BloodRequest {
  id: string;
  blood_type: string;
  quantity_ml: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  needed_by: string;
  medical_reason: string;
  doctor_name: string;
  recipient: {
    user: {
      full_name: string;
      email: string;
    };
  };
}

interface InventoryItem {
  id: string;
  blood_type: string;
  quantity_ml: number;
  collection_date: string;
  expiry_date: string;
  status: string;
}

export default function HospitalStaffDashboard() {
  const { profile, signOut } = useAuth();
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('requests');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get hospital ID for this staff member
      const { data: staffData, error: staffError } = await supabase
        .from('hospital_staff')
        .select('hospital_id')
        .eq('user_id', profile?.user_id)
        .single();

      if (staffError || !staffData) {
        console.error('Staff error:', staffError);
        toast.error('Could not find hospital assignment');
        return;
      }

      // Fetch blood requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('blood_requests')
        .select(`
          id,
          blood_type,
          quantity_ml,
          urgency,
          status,
          needed_by,
          medical_reason,
          doctor_name,
          recipient:recipients (
            user:profiles!recipients_user_id_fkey (
              full_name,
              email
            )
          )
        `)
        .eq('hospital_id', staffData.hospital_id)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch blood inventory
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('blood_inventory')
        .select('*')
        .eq('hospital_id', staffData.hospital_id)
        .eq('status', 'available')
        .order('expiry_date', { ascending: true });

      if (inventoryError) throw inventoryError;

      setRequests(requestsData || []);
      setInventory(inventoryData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return <Badge className="bg-destructive text-destructive-foreground">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-500 text-white">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 text-white">Medium</Badge>;
      case 'low':
        return <Badge className="bg-success text-success-foreground">Low</Badge>;
      default:
        return <Badge variant="outline">{urgency}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'assigned':
        return <Badge className="bg-primary text-primary-foreground">Assigned</Badge>;
      case 'fulfilled':
        return <Badge className="bg-success text-success-foreground">Fulfilled</Badge>;
      case 'partially_fulfilled':
        return <Badge className="bg-yellow-500 text-white">Partial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-full">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Hospital Staff Dashboard</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {profile?.full_name}</p>
              </div>
            </div>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {requests.filter(r => r.status === 'pending').length}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Cases</CardTitle>
              <Activity className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {requests.filter(r => r.urgency === 'critical').length}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Units</CardTitle>
              <Droplets className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{inventory.length}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{requests.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="requests">Blood Requests</TabsTrigger>
            <TabsTrigger value="inventory">Inventory Management</TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Blood Requests</CardTitle>
                <CardDescription>
                  Manage and fulfill blood requests from recipients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search requests..."
                      className="pl-10"
                    />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Urgency</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Blood Type</TableHead>
                      <TableHead>Quantity (ml)</TableHead>
                      <TableHead>Urgency</TableHead>
                      <TableHead>Needed By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{request.recipient?.user?.full_name || 'Unknown Patient'}</div>
                            <div className="text-sm text-muted-foreground">{request.doctor_name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {request.blood_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{request.quantity_ml}</TableCell>
                        <TableCell>{getUrgencyBadge(request.urgency)}</TableCell>
                        <TableCell>
                          {new Date(request.needed_by).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          {request.status === 'pending' && (
                            <Button size="sm">
                              Assign Unit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory">
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Blood Inventory</CardTitle>
                    <CardDescription>
                      Manage blood unit inventory and stock levels
                    </CardDescription>
                  </div>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Unit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Blood Type</TableHead>
                      <TableHead>Quantity (ml)</TableHead>
                      <TableHead>Collection Date</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {item.blood_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.quantity_ml}</TableCell>
                        <TableCell>
                          {new Date(item.collection_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <span className={
                            new Date(item.expiry_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                              ? 'text-destructive font-medium'
                              : ''
                          }>
                            {new Date(item.expiry_date).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-success text-success-foreground">
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}