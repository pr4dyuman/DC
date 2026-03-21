"use client";

import { CreateProjectWizardFormData, ClientOption } from "./create-project-wizard-shared";

type CreateProjectWizardSummaryStepProps = {
    formData: CreateProjectWizardFormData;
    clients: ClientOption[];
    formatDate: (value?: string | Date) => string;
};

export function CreateProjectWizardSummaryStep({
    formData,
    clients,
    formatDate,
}: CreateProjectWizardSummaryStepProps) {
    return (
        <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4 space-y-3">
                <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Project</span>
                    <span className="font-medium">{formData.name}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Clients</span>
                    <span className="font-medium">
                        {formData.clientIds.length > 0
                            ? clients
                                .filter((c) => formData.clientIds.includes(c.id))
                                .map((c) => c.name)
                                .join(", ")
                            : "None"}
                    </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Due Date</span>
                    <span className="font-medium">{formData.dueDate ? formatDate(formData.dueDate) : "-"}</span>
                </div>
                <div className="space-y-1 pt-2">
                    <span className="text-muted-foreground block text-sm">Services & Payments</span>
                    <div className="grid gap-2">
                        {formData.serviceConfigs.map((config) => (
                            <div key={config.serviceId} className="flex justify-between items-center text-sm bg-background p-2 rounded border">
                                <span className="font-medium">{config.name}</span>
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                    {config.paymentConfig?.type === "installment" ? "Installments" : "Monthly"}
                                    {config.paymentConfig?.paymentDetailsLater && " (Later)"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
