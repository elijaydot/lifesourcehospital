import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import SuperAdminDashboard from '@/components/dashboards/SuperAdminDashboard';
import HospitalAdminDashboard from '@/components/dashboards/HospitalAdminDashboard';
import HospitalStaffDashboard from '@/components/dashboards/HospitalStaffDashboard';
import DonorDashboard from '@/components/dashboards/DonorDashboard';
import RecipientDashboard from '@/components/dashboards/RecipientDashboard';

export default function AppLayout() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // If no user or profile, show a default welcome page
  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-primary">Welcome to LifeSource</h1>
          <p className="text-muted-foreground">Blood Bank Management System</p>
          <a href="/auth" className="inline-block mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  // Route to appropriate dashboard based on user role
  switch (profile.role) {
    case 'super_admin':
      return <SuperAdminDashboard />;
    case 'hospital_admin':
      return <HospitalAdminDashboard />;
    case 'hospital_staff':
      return <HospitalStaffDashboard />;
    case 'donor':
      return <DonorDashboard />;
    case 'recipient':
      return <RecipientDashboard />;
    default:
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
          <div className="text-center space-y-4">
            <p className="text-destructive">Unknown user role: {profile.role}</p>
            <p className="text-muted-foreground">Please contact support for assistance.</p>
          </div>
        </div>
      );
  }
}