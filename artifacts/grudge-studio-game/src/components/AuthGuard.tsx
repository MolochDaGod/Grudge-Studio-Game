import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuthStore } from '@/store/use-auth-store';

interface AuthGuardProps {
  children: React.ReactNode;
  /** If true, guest mode is allowed (no redirect) */
  allowGuest?: boolean;
}

/**
 * Wraps protected routes. Redirects to /login if the user is
 * neither authenticated nor in guest mode (when allowGuest=true).
 */
export function AuthGuard({ children, allowGuest = true }: AuthGuardProps) {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isGuest, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) return;
    if (allowGuest && isGuest) return;
    setLocation('/login');
  }, [isAuthenticated, isGuest, isLoading, allowGuest, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
          <p className="text-white/30 text-sm font-display uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !(allowGuest && isGuest)) return null;

  return <>{children}</>;
}
