import { useAuth } from '@/contexts/AuthContext';
import { AuthPage } from '@/components/auth/AuthPage';
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

  // If MFA verification is required
  if (mfaRequired) {
    return <MfaVerification />;
  }

  // If not authenticated, show auth page
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return <MainLayout />;
};

export default Index;
