import { AIBloggerSubNav } from "@/components/ai-blogger/AIBloggerSubNav";

export default function AIBloggerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-1 flex-col gap-5">
            <AIBloggerSubNav />
            <div className="mx-auto w-full max-w-[1500px] space-y-6">{children}</div>
        </div>
    );
}
