import { AIBloggerSubNav } from "@/components/ai-blogger/AIBloggerSubNav";

export default function AIBloggerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex-1 flex flex-col">
            <AIBloggerSubNav />
            <div className="space-y-6 px-4 sm:px-6 py-6">{children}</div>
        </div>
    );
}
