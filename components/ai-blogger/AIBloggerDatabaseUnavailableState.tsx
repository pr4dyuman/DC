import Link from "next/link";

type AIBloggerDatabaseUnavailableStateProps = {
    retryHref?: string;
    title?: string;
    message?: string;
};

export function AIBloggerDatabaseUnavailableState({
    retryHref = "/dashboard/ai-blogger",
    title = "Database connection issue",
    message = "AI Blogger couldn't reach MongoDB for this refresh. Please wait a moment and try again.",
}: AIBloggerDatabaseUnavailableStateProps) {
    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <div className="w-full max-w-xl rounded-lg border border-border/60 bg-background/70 p-6 text-center shadow-sm">
                <div className="space-y-3">
                    <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
                    <p className="text-sm leading-6 text-muted-foreground">{message}</p>
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <Link
                        href={retryHref}
                        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                        Try Again
                    </Link>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                    >
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
