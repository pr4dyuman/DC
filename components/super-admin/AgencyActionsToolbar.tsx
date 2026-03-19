"use client";

import { Ban, CheckCircle, Clock, Edit, Trash2 } from "lucide-react";
import type { Agency } from "@/lib/types";
import { AgencyActionAgency, AgencyPlanDuration, ModalType } from "./agency-actions-shared";

type AgencyActionsToolbarProps = {
    agency: AgencyActionAgency;
    loading: boolean;
    setModal: (modal: ModalType) => void;
    setSelectedPlan: (plan: Agency["plan"]) => void;
    setSelectedDuration: (duration: AgencyPlanDuration) => void;
    handleActivate: () => void;
};

export function AgencyActionsToolbar({
    agency,
    loading,
    setModal,
    setSelectedPlan,
    setSelectedDuration,
    handleActivate,
}: AgencyActionsToolbarProps) {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            <button
                onClick={() => {
                    setSelectedPlan(agency.plan);
                    setSelectedDuration(agency.planDuration || "lifetime");
                    setModal("plan");
                }}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
                <Edit className="w-4 h-4" />
                <span>Change Plan</span>
            </button>

            {agency.status === "trial" && (
                <button
                    onClick={() => setModal("trial")}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                >
                    <Clock className="w-4 h-4" />
                    <span>Extend Trial</span>
                </button>
            )}

            {agency.status === "active" || agency.status === "trial" ? (
                <button
                    onClick={() => setModal("suspend")}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
                >
                    <Ban className="w-4 h-4" />
                    <span>Suspend</span>
                </button>
            ) : (
                <button
                    onClick={handleActivate}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                >
                    <CheckCircle className="w-4 h-4" />
                    <span>{loading ? "Activating..." : "Activate"}</span>
                </button>
            )}

            <button
                onClick={() => setModal("delete")}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-600/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-600/20 transition-colors text-sm"
            >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
            </button>
        </div>
    );
}
