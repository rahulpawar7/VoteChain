'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { FullPageLoader } from '@/components/LoadingSpinner';

export default function HomePage() {
  const { isAuthenticated, isAdmin, isVoter, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace('/login');
    } else if (isAdmin) {
      router.replace('/dashboard/admin');
    } else if (isVoter) {
      router.replace('/dashboard/voter');
    } else {
      router.replace('/dashboard/voter');
    }
  }, [isAuthenticated, isAdmin, isVoter, loading, router]);

  return (
    <FullPageLoader message="Initializing VoteChain..." />
  );
}
