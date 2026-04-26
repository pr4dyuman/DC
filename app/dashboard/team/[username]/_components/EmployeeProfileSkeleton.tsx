export function EmployeeProfileSkeleton() {
    return (
        <div className="space-y-8 animate-in fade-in duration-300 pb-10">
            <div className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                <div className="h-7 w-52 rounded-md bg-muted animate-pulse" />
            </div>

            <div className="relative overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                <div className="flex flex-col items-center gap-5 p-5 sm:gap-8 sm:p-6 md:flex-row md:items-start md:p-8">
                    <div className="h-20 w-20 rounded-full bg-muted-foreground/10 animate-pulse sm:h-32 sm:w-32" />

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

                    <div className="flex w-full flex-col gap-3 md:w-auto md:min-w-[200px]">
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
