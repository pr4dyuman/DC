"use client";

import { SingularityTypingIndicator } from "./SingularityTypingIndicator";

type StreamingPhase = "idle" | "thinking" | "responding" | "rechecking";

type SingularityMessageStreamingIndicatorProps = {
    isAgent: boolean;
    phase: StreamingPhase;
    hasToolActions: boolean;
};

export function SingularityMessageStreamingIndicator({
    isAgent,
    phase,
    hasToolActions,
}: SingularityMessageStreamingIndicatorProps) {
    if (!isAgent) {
        if (phase !== "thinking") {
            return null;
        }

        return (
            <SingularityTypingIndicator
                className="pl-1"
                label="Thinking..."
            />
        );
    }

    if (hasToolActions) {
        return null;
    }

    return (
        <SingularityTypingIndicator
            className="pl-1"
            label="Processing..."
        />
    );
}
