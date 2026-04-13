'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const errorMessage = error?.message || "";
  const isDatabaseConnectionIssue = /mongodb|mongoose|serverselectionerror|replicasetnoprimary|ssl3_read_bytes|tlsv1 alert internal error/i.test(errorMessage);

  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-2xl font-bold text-foreground">
          {isDatabaseConnectionIssue ? "Database connection issue" : "Something went wrong"}
        </h2>
        <p className="text-muted-foreground">
          {isDatabaseConnectionIssue
            ? "The dashboard couldn't reach MongoDB for this refresh. Please try again in a moment."
            : "An error occurred while loading this page. Please try again."}
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
