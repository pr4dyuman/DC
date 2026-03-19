import type { Agency } from "@/lib/types";

export type ModalType = "suspend" | "delete" | "plan" | "trial" | null;
export type AgencyPlanDuration = NonNullable<Agency["planDuration"]>;
export type AgencyActionAgency = Pick<Agency, "id" | "name" | "plan" | "status" | "planDuration" | "trialEndsAt">;
