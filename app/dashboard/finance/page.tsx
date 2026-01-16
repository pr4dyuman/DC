
import { Suspense } from 'react';
import { FinanceContent } from '@/components/finance/FinanceContent';
import { FinanceSkeleton } from '@/components/finance/FinanceSkeleton';

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const resolvedParams = await searchParams;

    return (
        <Suspense fallback={<FinanceSkeleton />}>
            <FinanceContent searchParams={resolvedParams} />
        </Suspense>
    );
}
