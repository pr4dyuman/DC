import type { Metadata } from "next";

import CaseStudyList from "@/components/super-admin/case-studies/CaseStudyList";
import { listCaseStudies } from "@/lib/actions/super-admin-case-studies";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Case Studies | Super Admin",
};

export default async function CaseStudiesPage() {
    const list = await listCaseStudies();
    return <CaseStudyList initial={list} />;
}
