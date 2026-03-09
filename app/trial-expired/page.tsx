import Link from 'next/link';
import { getCurrentAgency, checkTrialExpired } from '@/lib/agency-context';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { fmtDateLong } from '@/lib/date-utils';

export default async function TrialExpiredPage() {
    await connectDB();
    const session = await getSessionUser();
    if (!session) redirect('/login');

    const agency = await getCurrentAgency();

    // If trial is not expired, redirect back to dashboard
    if (!await checkTrialExpired(agency)) {
        redirect('/dashboard');
    }

    const trialEndDate = agency?.trialEndsAt
        ? fmtDateLong(agency.trialEndsAt, 'UTC', 'en-US')
        : 'N/A';

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
            <div className="max-w-lg w-full text-center">
                {/* Icon */}
                <div className="w-24 h-24 rounded-full bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center mx-auto mb-8">
                    <svg className="w-12 h-12 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                </div>

                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                    Your Trial Has Expired
                </h1>

                <p className="text-gray-400 text-lg mb-2">
                    Your 7-day free trial ended on <span className="text-yellow-400 font-semibold">{trialEndDate}</span>.
                </p>

                <p className="text-gray-500 text-base mb-10">
                    Upgrade to Pro to continue using all features including the AI Assistant,
                    unlimited projects, financial tools, and team management.
                </p>

                {/* What was included */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 mb-8 text-left">
                    <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wide mb-4">
                        Your trial included
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
                                <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full flex-shrink-0" />
                                {feature}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/contact"
                        className="inline-flex items-center justify-center gap-2 bg-yellow-400 text-black font-bold uppercase text-sm px-8 py-3.5 rounded-full hover:bg-yellow-300 transition-all"
                    >
                        Contact Us to Upgrade
                    </Link>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 border border-white/20 text-white font-bold uppercase text-sm px-8 py-3.5 rounded-full hover:border-yellow-400 hover:text-yellow-400 transition-all"
                    >
                        Back to Home
                    </Link>
                </div>

                <p className="text-xs text-gray-600 mt-6">
                    Agency: {agency?.name || 'Unknown'} · Plan: Trial (expired)
                </p>
            </div>
        </div>
    );
}
