import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CaseStudyEditor from "@/components/super-admin/case-studies/CaseStudyEditor";
import { getCaseStudyForEdit } from "@/lib/actions/super-admin-case-studies";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Edit Case Study | Super Admin",
};

export default async function EditCaseStudyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const caseStudy = await getCaseStudyForEdit(id);
    if (!caseStudy) {
        notFound();
    }

    return <CaseStudyEditor key={caseStudy.id} initial={caseStudy} />;
}
