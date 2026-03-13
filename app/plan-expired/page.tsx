import Link from 'next/link';
import { getCurrentAgency, checkPlanExpired } from '@/lib/agency-context';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { fmtDateLong } from '@/lib/date-utils';

export default async function PlanExpiredPage() {
    await connectDB();
    const session = await getSessionUser();
    if (!session) redirect('/login');

    const agency = await getCurrentAgency();

    // If plan is not expired, redirect back to dashboard
    if (!await checkPlanExpired(agency)) {
        redirect('/dashboard');
    }

    const expiryDate = agency?.planExpiresAt
        ? fmtDateLong(agency.planExpiresAt, 'UTC', 'en-US')
        : 'N/A';

    const planName = agency?.plan?.toUpperCase() || 'Unknown';

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
            <div className="max-w-lg w-full text-center">
                {/* Icon */}
                <div className="w-24 h-24 rounded-full bg-red-400/10 border border-red-400/20 flex items-center justify-center mx-auto mb-8">
                    <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                </div>

                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                    Your Plan Has Expired
                </h1>

                <p className="text-gray-400 text-lg mb-2">
                    Your <span className="text-red-400 font-semibold">{planName}</span> plan expired on <span className="text-red-400 font-semibold">{expiryDate}</span>.
                </p>

                <p className="text-gray-500 text-base mb-10">
                    Renew your subscription to continue using all features including the AI Assistant,
                    unlimited projects, financial tools, and team management.
                </p>

                {/* What was included */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 mb-8 text-left">
                    <h3 className="text-sm font-bold text-red-400 uppercase tracking-wide mb-4">
                        Your {planName} plan included
                    </h3>
                    <ul className="space-y-2.5">
                        {[
                            'Singularity AI Assistant',
                            'Unlimited Projects & Tasks',
                            'Financial Management & Invoicing',
                            'Team Management & Roles',
                            'Client Portal',
                            'Real-time Messaging',
                        ].map((feature, i) => (
                            <li key={i} className="flex items-center gap-3 text-sm text-gray-400">
                                <div className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0" />
                                {feature}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/contact"
                        className="inline-flex items-center justify-center gap-2 bg-red-500 text-white font-bold uppercase text-sm px-8 py-3.5 rounded-full hover:bg-red-400 transition-all"
                    >
                        Contact Us to Renew
                    </Link>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 border border-white/20 text-white font-bold uppercase text-sm px-8 py-3.5 rounded-full hover:border-red-400 hover:text-red-400 transition-all"
                    >
                        Back to Home
                    </Link>
                </div>

                <p className="text-xs text-gray-600 mt-6">
                    Agency: {agency?.name || 'Unknown'} · Plan: {planName} (expired)
                </p>
            </div>
        </div>
    );
}
