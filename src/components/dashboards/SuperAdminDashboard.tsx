import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Users, Activity, Settings, LogOut, Shield, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Hospital {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  license_number: string;
  status: 'pending' | 'verified' | 'suspended';
  created_at: string;
}

interface DashboardStats {
  totalHospitals: number;
  pendingHospitals: number;
  totalUsers: number;
  totalDonations: number;
}

export default function SuperAdminDashboard() {
  const { profile, signOut } = useAuth();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalHospitals: 0,
    pendingHospitals: 0,
    totalUsers: 0,
    totalDonations: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch hospitals
      const { data: hospitalsData, error: hospitalsError } = await supabase
        .from('hospitals')
        .select('*')
        .order('created_at', { ascending: false });

      if (hospitalsError) throw hospitalsError;
      setHospitals(hospitalsData || []);

      // Fetch stats
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('role');

      if (profilesError) throw profilesError;

      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('donation_appointments')
        .select('status')
        .eq('status', 'completed');

      if (appointmentsError) throw appointmentsError;

      setStats({
        totalHospitals: hospitalsData?.length || 0,
        pendingHospitals: hospitalsData?.filter(h => h.status === 'pending').length || 0,
        totalUsers: profilesData?.length || 0,
        totalDonations: appointmentsData?.length || 0
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const updateHospitalStatus = async (hospitalId: string, status: 'verified' | 'suspended') => {
    try {
      const { error } = await supabase
        .from('hospitals')
        .update({ status })
        .eq('id', hospitalId);

      if (error) throw error;

      setHospitals(prev => 
        prev.map(h => h.id === hospitalId ? { ...h, status } : h)
      );

      toast.success(`Hospital ${status} successfully`);
    } catch (error) {
      console.error('Error updating hospital status:', error);
      toast.error('Failed to update hospital status');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      case 'suspended':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Suspended</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
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
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Super Admin Dashboard</h1>
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
              <CardTitle className="text-sm font-medium">Total Hospitals</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalHospitals}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.pendingHospitals}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.totalDonations}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="hospitals" className="space-y-6">
          <TabsList>
            <TabsTrigger value="hospitals">Hospital Management</TabsTrigger>
            <TabsTrigger value="system">System Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="hospitals">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Hospital Verification</CardTitle>
                <CardDescription>
                  Review and approve hospital registration requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hospital Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>License Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hospitals.map((hospital) => (
                      <TableRow key={hospital.id}>
                        <TableCell className="font-medium">{hospital.name}</TableCell>
                        <TableCell>{hospital.city}, {hospital.state}</TableCell>
                        <TableCell>{hospital.license_number}</TableCell>
                        <TableCell>{getStatusBadge(hospital.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {hospital.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateHospitalStatus(hospital.id, 'verified')}
                                  className="bg-success hover:bg-success/90"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateHospitalStatus(hospital.id, 'suspended')}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {hospital.status === 'verified' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateHospitalStatus(hospital.id, 'suspended')}
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Suspend
                              </Button>
                            )}
                            {hospital.status === 'suspended' && (
                              <Button
                                size="sm"
                                onClick={() => updateHospitalStatus(hospital.id, 'verified')}
                                className="bg-success hover:bg-success/90"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Reactivate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
                <CardDescription>
                  Platform-wide settings and configurations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border border-border rounded-lg">
                    <h3 className="font-medium mb-2">Security Settings</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure system-wide security policies and access controls.
                    </p>
                    <Button variant="outline">
                      <Settings className="w-4 h-4 mr-2" />
                      Configure Security
                    </Button>
                  </div>
                  
                  <div className="p-4 border border-border rounded-lg">
                    <h3 className="font-medium mb-2">Notification Settings</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Manage system notifications and alert preferences.
                    </p>
                    <Button variant="outline">
                      <Settings className="w-4 h-4 mr-2" />
                      Configure Notifications
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}