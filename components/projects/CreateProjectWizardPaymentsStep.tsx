"use client";

import { Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaymentConfig } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CreateProjectWizardFormData } from "./create-project-wizard-shared";

type CreateProjectWizardPaymentsStepProps = {
    formData: CreateProjectWizardFormData;
    symbol: string;
    updatePaymentConfig: (serviceId: string, updates: Partial<PaymentConfig>) => void;
    updateInstallmentDate: (serviceId: string, index: number, date: string) => void;
};

export function CreateProjectWizardPaymentsStep({
    formData,
    symbol,
    updatePaymentConfig,
    updateInstallmentDate,
}: CreateProjectWizardPaymentsStepProps) {
    return (
        <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <p className="text-sm text-muted-foreground">Configure payment details for each service.</p>
            {formData.serviceConfigs.map((config, index) => (
                <Card key={config.serviceId} className="border-l-4 border-l-primary/40 relative">
                    <div className="absolute top-0 right-0 p-2 opacity-5">
                        <Layers className="h-24 w-24" />
                    </div>
                    <CardHeader className="py-3 bg-muted/20">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">{index + 1}</span>
                            {config.name}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        <div className="flex items-center gap-4">
                            <Label className="text-xs uppercase text-muted-foreground font-bold">Payment Model</Label>
                            <div className="flex bg-muted rounded-lg p-1">
                                <button
                                    type="button"
                                    onClick={() => updatePaymentConfig(config.serviceId, { type: "installment" })}
                                    className={cn(
                                        "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                        config.paymentConfig?.type === "installment"
                                            ? "bg-background shadow-sm text-foreground"
                                            : "text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    Installments
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updatePaymentConfig(config.serviceId, { type: "monthly" })}
                                    className={cn(
                                        "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                        config.paymentConfig?.type === "monthly"
                                            ? "bg-background shadow-sm text-foreground"
                                            : "text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    Monthly
                                </button>
                            </div>
                        </div>

                        <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${!config.paymentConfig?.paymentDetailsLater ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                            <div className="overflow-hidden">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {config.paymentConfig?.type === "installment" ? (
                                        <>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Number of Installments</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    placeholder="e.g. 2"
                                                    value={config.paymentConfig?.installments || ""}
                                                    onChange={(e) => updatePaymentConfig(config.serviceId, { installments: parseInt(e.target.value) })}
                                                />
                                            </div>

                                            {(config.paymentConfig?.installments || 1) <= 1 ? (
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Payment Date</Label>
                                                    <Input
                                                        type="date"
                                                        value={config.paymentConfig?.firstPaymentDate || ""}
                                                        onChange={(e) => updatePaymentConfig(config.serviceId, { firstPaymentDate: e.target.value })}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="sm:col-span-2 space-y-2 pt-2 border-t mt-2">
                                                    <Label className="text-xs font-semibold">Installment Schedule</Label>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {Array.from({ length: config.paymentConfig?.installments || 0 }).map((_, installmentIndex) => (
                                                            <div key={installmentIndex} className="space-y-1">
                                                                <Label className="text-[10px] text-muted-foreground">Installment {installmentIndex + 1}</Label>
                                                                <Input
                                                                    type="date"
                                                                    className="h-8 text-xs"
                                                                    value={config.paymentConfig?.installmentDates?.[installmentIndex] || ""}
                                                                    onChange={(e) => updateInstallmentDate(config.serviceId, installmentIndex, e.target.value)}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Monthly Amount ({symbol})</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="e.g. 500"
                                                    value={config.paymentConfig?.monthlyAmount || ""}
                                                    onChange={(e) => updatePaymentConfig(config.serviceId, { monthlyAmount: parseInt(e.target.value) })}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Billing Start Date</Label>
                                                <Input
                                                    type="date"
                                                    value={config.paymentConfig?.billingStartDate || ""}
                                                    onChange={(e) => updatePaymentConfig(config.serviceId, { billingStartDate: e.target.value })}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id={`later-${config.serviceId}`}
                                className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                                checked={config.paymentConfig?.paymentDetailsLater || false}
                                onChange={(e) => updatePaymentConfig(config.serviceId, { paymentDetailsLater: e.target.checked })}
                            />
                            <Label htmlFor={`later-${config.serviceId}`} className="text-sm cursor-pointer">Set payment details later</Label>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
