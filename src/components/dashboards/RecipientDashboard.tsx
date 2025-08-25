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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Heart, Activity, Clock, Plus, LogOut, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface RecipientProfile {
  id: string;
  blood_type: string;
  medical_conditions?: string[];
}

interface BloodRequest {
  id: string;
  blood_type: string;
  quantity_ml: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  needed_by: string;
  medical_reason: string;
  doctor_name: string;
  doctor_contact: string;
  fulfilled_quantity_ml: number;
  created_at: string;
  hospital?: {
    name: string;
    city: string;
  };
}

export default function RecipientDashboard() {
  const { profile, signOut } = useAuth();
  const [recipientProfile, setRecipientProfile] = useState<RecipientProfile | null>(null);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRequest, setShowNewRequest] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch recipient profile
      const { data: recipientData, error: recipientError } = await supabase
        .from('recipients')
        .select('*')
        .eq('user_id', profile?.user_id)
        .single();

      if (recipientError && recipientError.code !== 'PGRST116') {
        throw recipientError;
      }

      setRecipientProfile(recipientData);

      if (recipientData) {
        // Fetch blood requests
        const { data: requestsData, error: requestsError } = await supabase
          .from('blood_requests')
          .select(`
            *,
            hospital:hospitals (
              name,
              city
            )
          `)
          .eq('recipient_id', recipientData.id)
          .order('created_at', { ascending: false });

        if (requestsError) throw requestsError;
        setRequests(requestsData || []);
      }

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
        return <Badge className="bg-destructive text-destructive-foreground"><AlertCircle className="w-3 h-3 mr-1" />Critical</Badge>;
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
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'assigned':
        return <Badge className="bg-primary text-primary-foreground">Assigned</Badge>;
      case 'fulfilled':
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" />Fulfilled</Badge>;
      case 'partially_fulfilled':
        return <Badge className="bg-yellow-500 text-white">Partial</Badge>;
      case 'unavailable':
        return <Badge variant="destructive">Unavailable</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!recipientProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Complete Your Recipient Profile</CardTitle>
            <CardDescription>
              Please complete your recipient profile to start requesting blood.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">Complete Profile</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeRequests = requests.filter(r => ['pending', 'assigned', 'partially_fulfilled'].includes(r.status));
  const criticalRequests = requests.filter(r => r.urgency === 'critical');
  const fulfilledRequests = requests.filter(r => r.status === 'fulfilled');

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
                <h1 className="text-xl font-bold text-foreground">Recipient Dashboard</h1>
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
              <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{activeRequests.length}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Requests</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{criticalRequests.length}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fulfilled Requests</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{fulfilledRequests.length}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blood Type</CardTitle>
              <Heart className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{recipientProfile.blood_type}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList>
            <TabsTrigger value="requests">My Requests</TabsTrigger>
            <TabsTrigger value="new">New Request</TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Blood Requests</CardTitle>
                <CardDescription>
                  Track the status of your blood requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No requests yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first blood request to get started.
                    </p>
                    <Button onClick={() => setShowNewRequest(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Request
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Blood Type</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Urgency</TableHead>
                        <TableHead>Needed By</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Hospital</TableHead>
                        <TableHead>Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {request.blood_type}
                            </Badge>
                          </TableCell>
                          <TableCell>{request.quantity_ml} ml</TableCell>
                          <TableCell>{getUrgencyBadge(request.urgency)}</TableCell>
                          <TableCell>
                            {new Date(request.needed_by).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell>
                            {request.hospital ? (
                              <div>
                                <div className="font-medium">{request.hospital.name}</div>
                                <div className="text-sm text-muted-foreground">{request.hospital.city}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Not assigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="w-24">
                              <div className="text-xs text-muted-foreground mb-1">
                                {request.fulfilled_quantity_ml}/{request.quantity_ml} ml
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className="bg-success h-2 rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(100, (request.fulfilled_quantity_ml / request.quantity_ml) * 100)}%`
                                  }}
                                />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="new">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Create New Blood Request</CardTitle>
                <CardDescription>
                  Submit a new request for blood transfusion
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NewRequestForm recipientId={recipientProfile.id} onSuccess={fetchData} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function NewRequestForm({ recipientId, onSuccess }: { recipientId: string; onSuccess: () => void }) {
  const [formData, setFormData] = useState<{
    blood_type: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | '';
    quantity_ml: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    needed_by: string;
    medical_reason: string;
    doctor_name: string;
    doctor_contact: string;
  }>({
    blood_type: '',
    quantity_ml: '',
    urgency: 'medium',
    needed_by: '',
    medical_reason: '',
    doctor_name: '',
    doctor_contact: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.blood_type || !formData.quantity_ml || !formData.needed_by || !formData.doctor_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('blood_requests')
        .insert({
          recipient_id: recipientId,
          blood_type: formData.blood_type as 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-',
          quantity_ml: parseInt(formData.quantity_ml),
          urgency: formData.urgency,
          needed_by: formData.needed_by,
          medical_reason: formData.medical_reason,
          doctor_name: formData.doctor_name,
          doctor_contact: formData.doctor_contact
        });

      if (error) throw error;

      toast.success('Blood request submitted successfully');
      setFormData({
        blood_type: '',
        quantity_ml: '',
        urgency: 'medium',
        needed_by: '',
        medical_reason: '',
        doctor_name: '',
        doctor_contact: ''
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="blood_type">Blood Type *</Label>
          <Select 
            value={formData.blood_type} 
            onValueChange={(value: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-') => 
              setFormData(prev => ({ ...prev, blood_type: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select blood type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A+">A+</SelectItem>
              <SelectItem value="A-">A-</SelectItem>
              <SelectItem value="B+">B+</SelectItem>
              <SelectItem value="B-">B-</SelectItem>
              <SelectItem value="AB+">AB+</SelectItem>
              <SelectItem value="AB-">AB-</SelectItem>
              <SelectItem value="O+">O+</SelectItem>
              <SelectItem value="O-">O-</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity_ml">Quantity (ml) *</Label>
          <Input
            id="quantity_ml"
            type="number"
            min="1"
            placeholder="450"
            value={formData.quantity_ml}
            onChange={(e) => setFormData(prev => ({ ...prev, quantity_ml: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="urgency">Urgency Level</Label>
          <Select 
            value={formData.urgency} 
            onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => 
              setFormData(prev => ({ ...prev, urgency: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="needed_by">Needed By *</Label>
          <Input
            id="needed_by"
            type="date"
            value={formData.needed_by}
            onChange={(e) => setFormData(prev => ({ ...prev, needed_by: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="doctor_name">Doctor Name *</Label>
          <Input
            id="doctor_name"
            placeholder="Dr. John Smith"
            value={formData.doctor_name}
            onChange={(e) => setFormData(prev => ({ ...prev, doctor_name: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="doctor_contact">Doctor Contact</Label>
          <Input
            id="doctor_contact"
            placeholder="Phone or email"
            value={formData.doctor_contact}
            onChange={(e) => setFormData(prev => ({ ...prev, doctor_contact: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="medical_reason">Medical Reason</Label>
        <Textarea
          id="medical_reason"
          placeholder="Please describe the medical reason for this blood request..."
          value={formData.medical_reason}
          onChange={(e) => setFormData(prev => ({ ...prev, medical_reason: e.target.value }))}
        />
      </div>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Submitting...' : 'Submit Request'}
      </Button>
    </form>
  );
}