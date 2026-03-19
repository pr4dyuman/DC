"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Agency } from "@/lib/types";
import {
    activateAgency,
    deleteAgency,
    extendTrial,
    suspendAgency,
    updateAgencyPlan,
} from "@/lib/actions/super-admin";
import { AgencyActionsToolbar } from "./AgencyActionsToolbar";
import { AgencyActionAgency, AgencyPlanDuration, ModalType } from "./agency-actions-shared";
import { DeleteAgencyModal } from "./DeleteAgencyModal";
import { ExtendTrialModal } from "./ExtendTrialModal";
import { SuspendAgencyModal } from "./SuspendAgencyModal";
import { UpdatePlanModal } from "./UpdatePlanModal";

function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
}

export default function AgencyActions({ agency }: { agency: AgencyActionAgency }) {
    const router = useRouter();
    const [modal, setModal] = useState<ModalType>(null);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [reason, setReason] = useState("");
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [selectedPlan, setSelectedPlan] = useState<Agency["plan"]>(agency.plan);
    const [selectedDuration, setSelectedDuration] = useState<AgencyPlanDuration>(agency.planDuration || "lifetime");
    const [trialDays, setTrialDays] = useState(7);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const resetModal = () => {
        setModal(null);
        setPassword("");
        setShowPassword(false);
        setReason("");
        setDeleteConfirmText("");
        setError("");
        setLoading(false);
        setTrialDays(7);
    };

    const handleSuspend = async () => {
        if (!password) {
            setError("Password is required");
            return;
        }
        setLoading(true);
        setError("");
        try {
            await suspendAgency(agency.id, password, reason || undefined);
            router.refresh();
            resetModal();
        } catch (err: unknown) {
            setError(getErrorMessage(err, "Failed to suspend agency"));
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async () => {
        setLoading(true);
        try {
            await activateAgency(agency.id);
            router.refresh();
            resetModal();
        } catch (err: unknown) {
            setError(getErrorMessage(err, "Failed to activate agency"));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (deleteConfirmText !== "DELETE") {
            setError("Type DELETE to confirm");
            return;
        }
        if (!password) {
            setError("Password is required");
            return;
        }
        setLoading(true);
        setError("");
        try {
            await deleteAgency(agency.id, password);
            router.push("/super-admin/agencies");
        } catch (err: unknown) {
            setError(getErrorMessage(err, "Failed to delete agency"));
            setLoading(false);
        }
    };

    const handleUpdatePlan = async () => {
        if (selectedPlan === agency.plan && selectedDuration === (agency.planDuration || "lifetime")) {
            resetModal();
            return;
        }
        setLoading(true);
        setError("");
        try {
            await updateAgencyPlan(agency.id, selectedPlan, selectedDuration);
            router.refresh();
            resetModal();
        } catch (err: unknown) {
            setError(getErrorMessage(err, "Failed to update plan"));
            setLoading(false);
        }
    };

    const handleExtendTrial = async () => {
        if (!trialDays || trialDays < 1) {
            setError("Enter a valid number of days");
            return;
        }
        setLoading(true);
        setError("");
        try {
            await extendTrial(agency.id, trialDays);
            router.refresh();
            resetModal();
        } catch (err: unknown) {
            setError(getErrorMessage(err, "Failed to extend trial"));
            setLoading(false);
        }
    };

    return (
        <>
            <AgencyActionsToolbar
                agency={agency}
                loading={loading}
                setModal={setModal}
                setSelectedPlan={setSelectedPlan}
                setSelectedDuration={setSelectedDuration}
                handleActivate={handleActivate}
            />

            {modal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={resetModal}>
                    <div className="bg-card rounded-xl border border-border shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        {modal === "suspend" && (
                            <SuspendAgencyModal
                                agency={agency}
                                reason={reason}
                                password={password}
                                showPassword={showPassword}
                                loading={loading}
                                error={error}
                                setReason={setReason}
                                setPassword={setPassword}
                                setShowPassword={setShowPassword}
                                setError={setError}
                                resetModal={resetModal}
                                handleSuspend={handleSuspend}
                            />
                        )}

                        {modal === "delete" && (
                            <DeleteAgencyModal
                                agency={agency}
                                password={password}
                                showPassword={showPassword}
                                deleteConfirmText={deleteConfirmText}
                                loading={loading}
                                error={error}
                                setPassword={setPassword}
                                setShowPassword={setShowPassword}
                                setDeleteConfirmText={setDeleteConfirmText}
                                setError={setError}
                                resetModal={resetModal}
                                handleDelete={handleDelete}
                            />
                        )}

                        {modal === "plan" && (
                            <UpdatePlanModal
                                agency={agency}
                                selectedPlan={selectedPlan}
                                selectedDuration={selectedDuration}
                                loading={loading}
                                error={error}
                                setSelectedPlan={setSelectedPlan}
                                setSelectedDuration={setSelectedDuration}
                                resetModal={resetModal}
                                handleUpdatePlan={handleUpdatePlan}
                            />
                        )}

                        {modal === "trial" && (
                            <ExtendTrialModal
                                agency={agency}
                                trialDays={trialDays}
                                loading={loading}
                                error={error}
                                setTrialDays={setTrialDays}
                                resetModal={resetModal}
                                handleExtendTrial={handleExtendTrial}
                            />
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
