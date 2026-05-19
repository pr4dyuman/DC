import { Suspense } from "react";
import GetStartedLoadingScreen from "./_components/GetStartedLoadingScreen";
import GetStartedPageClient from "./_components/GetStartedPageClient";

function getSearchParamValue(searchParams, key) {
    const value = searchParams?.[key];
    return Array.isArray(value) ? value[0] : value;
}

export default async function GetStartedPage({ searchParams }) {
    const resolvedSearchParams = await searchParams;
    const mode = getSearchParamValue(resolvedSearchParams, "mode");
    const source = getSearchParamValue(resolvedSearchParams, "source");
    const isAIBloggerFlow = source === "ai-blogger";
    const directAuthMode = mode === "auth" || isAIBloggerFlow;

    return (
        <Suspense fallback={<GetStartedLoadingScreen />}>
            <GetStartedPageClient
                directAuthMode={directAuthMode}
                isAIBloggerFlow={isAIBloggerFlow}
            />
        </Suspense>
    );
}
