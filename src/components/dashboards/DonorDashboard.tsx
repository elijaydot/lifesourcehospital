import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Heart, Calendar, Droplets, Award, LogOut, MapPin, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface DonorProfile {
  blood_type: string;
  last_donation_date?: string;
  is_eligible: boolean;
}

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  notes?: string;
  hospital: {
    name: string;
    address: string;
    city: string;
  };
}

interface DonationStats {
  totalDonations: number;
  nextEligibleDate?: string;
  totalImpact: number;
}

export default function DonorDashboard() {
  const { profile, signOut } = useAuth();
  const [donorProfile, setDonorProfile] = useState<DonorProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<DonationStats>({
    totalDonations: 0,
    totalImpact: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch donor profile
      const { data: donorData, error: donorError } = await supabase
        .from('donors')
        .select('*')
        .eq('user_id', profile?.user_id)
        .single();

      if (donorError && donorError.code !== 'PGRST116') {
        throw donorError;
      }

      setDonorProfile(donorData);

      if (donorData) {
        // Fetch appointments
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('donation_appointments')
          .select(`
            id,
            appointment_date,
            status,
            notes,
            hospital:hospitals (
              name,
              address,
              city
            )
          `)
          .eq('donor_id', donorData.id)
          .order('appointment_date', { ascending: false });

        if (appointmentsError) throw appointmentsError;

        setAppointments(appointmentsData || []);

        // Calculate stats
        const completedDonations = appointmentsData?.filter(a => a.status === 'completed').length || 0;
        
        let nextEligibleDate;
        if (donorData.last_donation_date) {
          const lastDate = new Date(donorData.last_donation_date);
          lastDate.setDate(lastDate.getDate() + 56); // 8 weeks between donations
          nextEligibleDate = lastDate.toISOString();
        }

        setStats({
          totalDonations: completedDonations,
          nextEligibleDate,
          totalImpact: completedDonations * 3 // Each donation can save up to 3 lives
        });
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Scheduled</Badge>;
      case 'confirmed':
        return <Badge className="bg-primary text-primary-foreground">Confirmed</Badge>;
      case 'completed':
        return <Badge className="bg-success text-success-foreground">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const canDonate = () => {
    if (!donorProfile?.is_eligible) return false;
    if (!stats.nextEligibleDate) return true;
    return new Date() >= new Date(stats.nextEligibleDate);
  };

  const getDaysUntilEligible = () => {
    if (!stats.nextEligibleDate) return 0;
    const today = new Date();
    const eligibleDate = new Date(stats.nextEligibleDate);
    const diffTime = eligibleDate.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!donorProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Complete Your Donor Profile</CardTitle>
            <CardDescription>
              Please complete your donor profile to start scheduling donations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">Complete Profile</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-full">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Donor Dashboard</h1>
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
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-8 text-white mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Thank You for Saving Lives!</h2>
              <p className="text-primary-foreground/90 mb-4">
                Your blood type {donorProfile.blood_type} is needed by patients in your area.
              </p>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.totalDonations}</div>
                  <div className="text-sm opacity-90">Donations</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.totalImpact}</div>
                  <div className="text-sm opacity-90">Lives Impacted</div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <Badge 
                className={`mb-4 ${canDonate() ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'}`}
              >
                {canDonate() ? 'Eligible to Donate' : `Eligible in ${getDaysUntilEligible()} days`}
              </Badge>
              {canDonate() && (
                <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Donation
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blood Type</CardTitle>
              <Droplets className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{donorProfile.blood_type}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
              <Award className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.totalDonations}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Donation</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {canDonate() ? 'Now' : `${getDaysUntilEligible()}d`}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="appointments" className="space-y-6">
          <TabsList>
            <TabsTrigger value="appointments">My Appointments</TabsTrigger>
            <TabsTrigger value="impact">My Impact</TabsTrigger>
          </TabsList>

          <TabsContent value="appointments">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Donation Appointments</CardTitle>
                <CardDescription>
                  View your upcoming and past donation appointments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {appointments.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No appointments scheduled</h3>
                    <p className="text-muted-foreground mb-4">
                      Schedule your first donation appointment to start saving lives.
                    </p>
                    <Button>
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Appointment
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Hospital</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell>
                            {new Date(appointment.appointment_date).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            {appointment.hospital?.name || 'Unknown Hospital'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              <span className="text-sm">
                                {appointment.hospital?.city || 'Unknown Location'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                          <TableCell>
                            {appointment.status === 'scheduled' && (
                              <Button size="sm" variant="outline">
                                Reschedule
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="impact">
            <div className="grid gap-6">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Your Donation Impact</CardTitle>
                  <CardDescription>
                    See how your donations have helped save lives
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Lives Potentially Saved</span>
                        <span className="text-2xl font-bold text-success">{stats.totalImpact}</span>
                      </div>
                      <Progress value={(stats.totalDonations / 10) * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Each donation can help save up to 3 lives
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 border border-border rounded-lg">
                        <Heart className="w-8 h-8 text-destructive mx-auto mb-2" />
                        <div className="text-2xl font-bold">{stats.totalDonations}</div>
                        <div className="text-sm text-muted-foreground">Total Donations</div>
                      </div>
                      
                      <div className="text-center p-4 border border-border rounded-lg">
                        <Award className="w-8 h-8 text-success mx-auto mb-2" />
                        <div className="text-2xl font-bold">{stats.totalImpact}</div>
                        <div className="text-sm text-muted-foreground">Lives Impacted</div>
                      </div>
                      
                      <div className="text-center p-4 border border-border rounded-lg">
                        <Droplets className="w-8 h-8 text-primary mx-auto mb-2" />
                        <div className="text-2xl font-bold">{stats.totalDonations * 450}</div>
                        <div className="text-sm text-muted-foreground">ML Donated</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}