
import { Suspense } from 'react';
import { getCurrentUser } from '@/lib/actions';
import { redirect } from 'next/navigation';
import { FinanceContent } from '@/components/finance/FinanceContent';
import { FinanceSkeleton } from '@/components/finance/FinanceSkeleton';

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const [user, resolvedParams] = await Promise.all([
        getCurrentUser(),
        searchParams,
    ]);

    if (!user) redirect('/login');
    if (user.role === 'employee') redirect('/dashboard');

    return (
        <Suspense fallback={<FinanceSkeleton />}>
            <FinanceContent searchParams={resolvedParams} />
        </Suspense>
    );
}
