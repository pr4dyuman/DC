"use client";

interface SystemSettingsInfoSectionProps {
    platformName: string;
    lastRestartText: string;
}

export function SystemSettingsInfoSection({
    platformName,
    lastRestartText,
}: SystemSettingsInfoSectionProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
                { label: "Platform", value: platformName },
                { label: "Version", value: "1.0.0" },
                { label: "Framework", value: "Next.js 16" },
                { label: "Database", value: "MongoDB" },
                { label: "Environment", value: "Production" },
                { label: "Last Restart", value: lastRestartText },
            ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-medium text-foreground">{item.value}</span>
                </div>
            ))}
        </div>
    );
}
