import { useAuth } from '@/contexts/AuthContext';
import { LandingPage } from '@/components/LandingPage';
import { MfaVerification } from '@/components/auth/MfaVerification';
import { MainLayout } from '@/components/MainLayout';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { isAuthenticated, isLoading, mfaRequired } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (mfaRequired) {
    return <MfaVerification />;
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return <MainLayout />;
};

export default Index;
