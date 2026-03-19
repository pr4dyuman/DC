export function EmployeeProfileSkeleton() {
    return (
        <div className="space-y-8 animate-in fade-in duration-300 pb-10">
            <div className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                <div className="h-7 w-52 rounded-md bg-muted animate-pulse" />
            </div>

            <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-secondary to-muted border border-border shadow-2xl">
                <div className="p-8 md:p-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
                    <div className="h-32 w-32 rounded-full bg-muted-foreground/10 animate-pulse" />

                    <div className="flex-1 space-y-4 w-full">
                        <div className="space-y-3">
                            <div className="h-8 w-48 rounded-md bg-muted-foreground/10 animate-pulse mx-auto md:mx-0" />
                            <div className="h-5 w-32 rounded-md bg-muted-foreground/10 animate-pulse mx-auto md:mx-0" />
                            <div className="h-5 w-64 rounded-md bg-muted-foreground/10 animate-pulse mx-auto md:mx-0" />
                        </div>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            <div className="h-7 w-40 rounded-full bg-muted-foreground/10 animate-pulse" />
                            <div className="h-7 w-32 rounded-full bg-muted-foreground/10 animate-pulse" />
                            <div className="h-7 w-36 rounded-full bg-muted-foreground/10 animate-pulse" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 min-w-[200px]">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="h-20 rounded-lg bg-muted-foreground/10 animate-pulse" />
                            <div className="h-20 rounded-lg bg-muted-foreground/10 animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-12 w-full rounded-lg bg-muted animate-pulse" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="col-span-1 md:col-span-2 h-64 rounded-xl bg-muted/50 border border-border animate-pulse" />
                <div className="h-64 rounded-xl bg-muted/50 border border-border animate-pulse" />
            </div>
        </div>
    );
}
