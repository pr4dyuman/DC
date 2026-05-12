"use client";

import { useState, useEffect } from "react";
import { Loader2, Check, LogOut } from "lucide-react";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AIBloggerGlassCard } from "./AIBloggerPrimitives";

interface SearchConsoleOAuthButtonProps {
    currentStatus?: "not-connected" | "configured" | "token-expired";
    selectedDomain?: string;
    onConnected?: () => void;
    onDisconnected?: () => void;
}

interface OAuthSession {
    domains: Array<{
        url: string;
        name: string;
    }>;
}

export function SearchConsoleOAuthButton({
    currentStatus = "not-connected",
    selectedDomain,
    onConnected,
    onDisconnected,
}: SearchConsoleOAuthButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [showDomainsDialog, setShowDomainsDialog] = useState(false);
    const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
    const [oauthSession, setOAuthSession] = useState<OAuthSession | null>(null);
    const [selectedDomainForSave, setSelectedDomainForSave] = useState<string | null>(null);

    useEffect(() => {
        const checkOAuthCompletion = async () => {
            const params = new URLSearchParams(window.location.search);
            if (params.get("oauth_complete") === "true") {
                try {
                    const response = await fetch("/api/ai-blogger/search-console-oauth/session", {
                        cache: "no-store",
                    });

                    if (!response.ok) {
                        throw new Error("OAuth session expired. Please connect again.");
                    }

                    const sessionData = await response.json();
                    setOAuthSession({
                        domains: Array.isArray(sessionData.domains) ? sessionData.domains : [],
                    });
                    setShowDomainsDialog(true);
                } catch (e) {
                    console.error("Failed to load OAuth session:", e);
                    toast.error(e instanceof Error ? e.message : "Failed to load OAuth data");
                } finally {
                    window.history.replaceState({}, "", window.location.pathname);
                }
            }
        };

        void checkOAuthCompletion();
    }, []);

    const handleConnect = async () => {
        try {
            setIsLoading(true);

            // Step 1: Request authorization URL
            const connectResponse = await fetch(
                "/api/ai-blogger/search-console-oauth/connect",
                { method: "POST" }
            );

            if (!connectResponse.ok) {
                throw new Error("Failed to initiate OAuth connection");
            }

            const { redirectUrl } = await connectResponse.json();

            // Step 2: Redirect to Google OAuth
            window.location.href = redirectUrl;
        } catch (error) {
            console.error("OAuth connect error:", error);
            toast.error("Failed to connect to Google Search Console");
            setIsLoading(false);
        }
    };

    const handleSelectDomain = async (domain: string) => {
        if (!oauthSession) {
            toast.error("OAuth session not found");
            return;
        }

        try {
            setIsLoading(true);
            setSelectedDomainForSave(domain);

            const saveResponse = await fetch(
                "/api/ai-blogger/search-console-oauth/save",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        selectedDomain: domain,
                    }),
                }
            );

            if (!saveResponse.ok) {
                const error = await saveResponse.json();
                throw new Error(error.error || "Failed to save OAuth tokens");
            }

            toast.success(`Connected to ${domain}`);
            setShowDomainsDialog(false);
            setOAuthSession(null);
            onConnected?.();
        } catch (error) {
            console.error("Failed to select domain:", error);
            toast.error(error instanceof Error ? error.message : "Failed to select domain");
        } finally {
            setIsLoading(false);
            setSelectedDomainForSave(null);
        }
    };

    const handleDisconnect = async () => {
        try {
            setIsLoading(true);

            const response = await fetch(
                "/api/ai-blogger/search-console-oauth/disconnect",
                { method: "POST" }
            );

            if (!response.ok) {
                throw new Error("Failed to disconnect");
            }

            toast.success("Disconnected from Google Search Console");
            setShowDisconnectDialog(false);
            onDisconnected?.();
        } catch (error) {
            console.error("Disconnect error:", error);
            toast.error("Failed to disconnect from Google Search Console");
        } finally {
            setIsLoading(false);
        }
    };

    const disconnectedStatusLabel = currentStatus === "token-expired" ? "Reconnect Required" : "Not Connected";

    // Render based on status
    if (currentStatus === "configured" && selectedDomain) {
        return (
            <>
                <AIBloggerGlassCard className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Check className="w-5 h-5 text-green-500" />
                            <div>
                                <p className="text-sm font-medium">Google Search Console Connected</p>
                                <p className="text-xs text-muted-foreground">{selectedDomain}</p>
                            </div>
                        </div>
                        <Badge className="bg-green-500/20 text-green-700">Connected</Badge>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDisconnectDialog(true)}
                            disabled={isLoading}
                            className="gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            Disconnect
                        </Button>
                    </div>
                </AIBloggerGlassCard>

                <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Disconnect Google Search Console?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will remove the connection to {selectedDomain}. You can reconnect anytime.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDisconnect}
                                disabled={isLoading}
                                className="bg-destructive hover:bg-destructive/90"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    "Disconnect"
                                )}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </>
        );
    }

    // Not connected state
    return (
        <>
            <AIBloggerGlassCard className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium">Google Search Console</p>
                        <p className="text-xs text-muted-foreground">
                            Connect to track your blog&apos;s Search Console metrics
                        </p>
                    </div>
                    <Badge variant="outline">{disconnectedStatusLabel}</Badge>
                </div>

                <Button
                    onClick={handleConnect}
                    disabled={isLoading}
                    className="w-full gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Connecting...
                        </>
                    ) : (
                        <>
                            <svg
                                className="w-4 h-4"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Connect with Google
                        </>
                    )}
                </Button>
            </AIBloggerGlassCard>

            {/* Domain selection dialog */}
            <Dialog open={showDomainsDialog} onOpenChange={setShowDomainsDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Select Search Console Domain</DialogTitle>
                        <DialogDescription>
                            Choose which domain&apos;s Search Console metrics you want to track
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {oauthSession?.domains && oauthSession.domains.length > 0 ? (
                            oauthSession.domains.map((domain) => (
                                <Button
                                    key={domain.url}
                                    onClick={() => handleSelectDomain(domain.url)}
                                    disabled={isLoading}
                                    variant="outline"
                                    className="w-full justify-start text-left h-auto py-3 px-4"
                                >
                                    {isLoading && selectedDomainForSave === domain.url && (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2 flex-shrink-0" />
                                    )}
                                    <div className="flex-1">
                                        <p className="font-medium">{domain.name}</p>
                                        <p className="text-xs text-muted-foreground">{domain.url}</p>
                                    </div>
                                </Button>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No Search Console properties found
                            </p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
