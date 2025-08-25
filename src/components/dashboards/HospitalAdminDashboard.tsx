import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Users, Calendar, Droplets, LogOut, Settings, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardStats {
  totalAppointments: number;
  pendingAppointments: number;
  completedDonations: number;
  totalStaff: number;
}

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  notes?: string;
  donor: {
    user: {
      full_name: string;
      email: string;
    };
    blood_type: string;
  };
}

export default function HospitalAdminDashboard() {
  const { profile, signOut } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalAppointments: 0,
    pendingAppointments: 0,
    completedDonations: 0,
    totalStaff: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // First, get the hospital associated with this admin
      const { data: hospitalData, error: hospitalError } = await supabase
        .from('hospitals')
        .select('id')
        .eq('admin_user_id', profile?.user_id)
        .single();

      if (hospitalError) {
        console.error('Hospital error:', hospitalError);
        toast.error('Could not find associated hospital');
        return;
      }

      if (!hospitalData) {
        toast.error('No hospital found for this admin');
        return;
      }

      // Fetch appointments for this hospital
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('donation_appointments')
        .select(`
          id,
          appointment_date,
          status,
          notes,
          donor:donors (
            blood_type,
            user:profiles!donors_user_id_fkey (
              full_name,
              email
            )
          )
        `)
        .eq('hospital_id', hospitalData.id)
        .order('appointment_date', { ascending: false });

      if (appointmentsError) throw appointmentsError;

      // Fetch staff count
      const { data: staffData, error: staffError } = await supabase
        .from('hospital_staff')
        .select('id')
        .eq('hospital_id', hospitalData.id);

      if (staffError) throw staffError;

      setAppointments(appointmentsData || []);
      
      const totalAppointments = appointmentsData?.length || 0;
      const pendingAppointments = appointmentsData?.filter(a => a.status === 'scheduled').length || 0;
      const completedDonations = appointmentsData?.filter(a => a.status === 'completed').length || 0;
      
      setStats({
        totalAppointments,
        pendingAppointments,
        completedDonations,
        totalStaff: staffData?.length || 0
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled') => {
    try {
      const { error } = await supabase
        .from('donation_appointments')
        .update({ 
          status,
          confirmed_by: profile?.user_id,
          confirmed_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointments(prev => 
        prev.map(a => a.id === appointmentId ? { ...a, status } : a)
      );

      toast.success(`Appointment ${status} successfully`);
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Scheduled</Badge>;
      case 'confirmed':
        return <Badge className="bg-primary text-primary-foreground"><CheckCircle className="w-3 h-3 mr-1" />Confirmed</Badge>;
      case 'completed':
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
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
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Hospital Admin Dashboard</h1>
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
              <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalAppointments}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Appointments</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.pendingAppointments}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Donations</CardTitle>
              <Droplets className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.completedDonations}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{stats.totalStaff}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="appointments" className="space-y-6">
          <TabsList>
            <TabsTrigger value="appointments">Donation Appointments</TabsTrigger>
            <TabsTrigger value="settings">Hospital Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="appointments">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Manage Appointments</CardTitle>
                <CardDescription>
                  Review, confirm, and manage donation appointments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Donor</TableHead>
                      <TableHead>Blood Type</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{appointment.donor?.user?.full_name || 'Unknown Donor'}</div>
                            <div className="text-sm text-muted-foreground">{appointment.donor?.user?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {appointment.donor?.blood_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(appointment.appointment_date).toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {appointment.status === 'scheduled' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                                >
                                  Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                            {appointment.status === 'confirmed' && (
                              <Button
                                size="sm"
                                className="bg-success hover:bg-success/90"
                                onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                              >
                                Mark Complete
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

          <TabsContent value="settings">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Hospital Configuration</CardTitle>
                <CardDescription>
                  Manage hospital profile and staff settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border border-border rounded-lg">
                    <h3 className="font-medium mb-2">Hospital Profile</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Update hospital information, contact details, and services offered.
                    </p>
                    <Button variant="outline">
                      <Settings className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                  
                  <div className="p-4 border border-border rounded-lg">
                    <h3 className="font-medium mb-2">Staff Management</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add and manage hospital staff members and their permissions.
                    </p>
                    <Button variant="outline">
                      <Users className="w-4 h-4 mr-2" />
                      Manage Staff
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