import CreateAgencyForm from "@/components/super-admin/CreateAgencyForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CreateAgencyPage() {
    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <Link
                    href="/super-admin/agencies"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Agencies</span>
                </Link>
                <h1 className="text-3xl font-bold text-foreground">Create New Agency</h1>
                <p className="text-muted-foreground mt-1">Set up a new agency with an owner account</p>
            </div>

            <CreateAgencyForm />
        </div>
    );
}
