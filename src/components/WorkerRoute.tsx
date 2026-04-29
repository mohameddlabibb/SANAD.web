import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const WorkerRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'worker') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default WorkerRoute;
