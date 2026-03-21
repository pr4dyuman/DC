"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDateFormat } from "@/context/TimezoneContext";
import { useCurrency } from "@/context/CurrencyContext";
import { createProject, getClients, getServices } from "@/lib/actions";
import { PaymentConfig, ProjectServiceConfig } from "@/lib/types";
import { CreateProjectWizardBasicStep } from "./CreateProjectWizardBasicStep";
import { CreateProjectWizardPaymentsStep } from "./CreateProjectWizardPaymentsStep";
import { CreateProjectWizardServicesStep } from "./CreateProjectWizardServicesStep";
import { CreateProjectWizardSummaryStep } from "./CreateProjectWizardSummaryStep";
import {
    ClientOption,
    CreateProjectWizardFormData,
    ServiceOption,
} from "./create-project-wizard-shared";

interface CreateProjectWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onProjectCreated?: () => void;
}

export function CreateProjectWizard({ open, onOpenChange, onProjectCreated }: CreateProjectWizardProps) {
    const fmt = useDateFormat();
    const { symbol } = useCurrency();
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [serviceInput, setServiceInput] = useState("");
    const [clients, setClients] = useState<ClientOption[]>([]);
    const [services, setServices] = useState<ServiceOption[]>([]);
    const [formData, setFormData] = useState<CreateProjectWizardFormData>({
        name: "",
        slug: "",
        clientIds: [],
        clientName: "",
        services: [],
        serviceConfigs: [] as ProjectServiceConfig[],
        budget: 0,
        dueDate: "",
    });

    useEffect(() => {
        if (open) {
            setStep(1);
            loadData();
        }
    }, [open]);

    const loadData = async () => {
        try {
            const [loadedClients, loadedServices] = await Promise.all([getClients(), getServices()]);
            setClients(loadedClients);
            setServices(loadedServices);
        } catch (error) {
            console.error("Failed to load data", error);
        }
    };

    const handleNext = () => {
        if (step === 2 && formData.serviceConfigs.length === 0) {
            const configs = formData.services.map((serviceName) => {
                const existing = formData.serviceConfigs.find((config) => config.serviceId === serviceName);
                return existing || {
                    serviceId: serviceName,
                    name: serviceName,
                    paymentConfig: {
                        type: "installment",
                        paymentDetailsLater: false,
                        installments: 1,
                        installmentAmount: 0,
                        monthlyAmount: 0,
                    } as PaymentConfig,
                };
            });
            setFormData((prev) => ({ ...prev, serviceConfigs: configs }));
        }

        setStep((prev) => prev + 1);
    };

    const handleBack = () => setStep((prev) => prev - 1);

    const addServiceName = (rawName: string) => {
        const normalized = rawName.trim().replace(/\s+/g, " ");
        if (!normalized) return;

        setFormData((prev) => {
            const exists = prev.services.some((serviceName) => serviceName.toLowerCase() === normalized.toLowerCase());
            if (exists) return prev;
            return { ...prev, services: [...prev.services, normalized] };
        });
        setServiceInput("");
    };

    const removeServiceName = (serviceName: string) => {
        setFormData((prev) => {
            const updatedServices = prev.services.filter((name) => name !== serviceName);
            const updatedConfigs = prev.serviceConfigs.filter(
                (config) => config.serviceId !== serviceName && config.name !== serviceName,
            );
            return { ...prev, services: updatedServices, serviceConfigs: updatedConfigs };
        });
    };

    const updatePaymentConfig = (serviceId: string, updates: Partial<PaymentConfig>) => {
        setFormData((prev) => ({
            ...prev,
            serviceConfigs: prev.serviceConfigs.map((config) => {
                if (config.serviceId !== serviceId) return config;

                const currentConfig = config.paymentConfig || {};
                const newConfig = { ...currentConfig, ...updates } as PaymentConfig;

                if (updates.installments !== undefined) {
                    const count = updates.installments || 1;
                    const currentDates = newConfig.installmentDates || [];
                    newConfig.installmentDates = Array(count).fill("").map((_, index) => currentDates[index] || "");

                    if (newConfig.installmentDates.length > 0) {
                        newConfig.firstPaymentDate = newConfig.installmentDates[0];
                    }
                }

                if (
                    updates.firstPaymentDate !== undefined &&
                    newConfig.type === "installment" &&
                    (newConfig.installments || 1) === 1
                ) {
                    newConfig.installmentDates = [updates.firstPaymentDate];
                }

                return { ...config, paymentConfig: newConfig };
            }),
        }));
    };

    const updateInstallmentDate = (serviceId: string, index: number, date: string) => {
        setFormData((prev) => ({
            ...prev,
            serviceConfigs: prev.serviceConfigs.map((config) => {
                if (config.serviceId !== serviceId || !config.paymentConfig) return config;

                const newDates = [...(config.paymentConfig.installmentDates || [])];
                newDates[index] = date;

                return {
                    ...config,
                    paymentConfig: {
                        ...config.paymentConfig,
                        installmentDates: newDates,
                        firstPaymentDate: index === 0 ? date : config.paymentConfig.firstPaymentDate,
                    },
                };
            }),
        }));
    };

    const handleSubmit = async () => {
        setSubmitting(true);

        try {
            await createProject({
                name: formData.name,
                slug: formData.slug || undefined,
                clientIds: formData.clientIds,
                services: formData.services,
                serviceConfigs: formData.serviceConfigs,
                budget: formData.budget,
                dueDate: formData.dueDate,
            } as Parameters<typeof createProject>[0]);

            if (onProjectCreated) onProjectCreated();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] h-[80vh] sm:h-auto flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        {step === 1 && "Start New Project"}
                        {step === 2 && "Select Services"}
                        {step === 3 && "Payment Configuration"}
                        {step === 4 && "Review & Create"}
                    </DialogTitle>
                    <DialogDescription>Step {step} of 4</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-[300px] p-1">
                    {step === 1 && (
                        <CreateProjectWizardBasicStep
                            formData={formData}
                            clients={clients}
                            symbol={symbol}
                            setFormData={setFormData}
                        />
                    )}

                    {step === 2 && (
                        <CreateProjectWizardServicesStep
                            formData={formData}
                            serviceInput={serviceInput}
                            services={services}
                            setServiceInput={setServiceInput}
                            addServiceName={addServiceName}
                            removeServiceName={removeServiceName}
                        />
                    )}

                    {step === 3 && (
                        <CreateProjectWizardPaymentsStep
                            formData={formData}
                            symbol={symbol}
                            updatePaymentConfig={updatePaymentConfig}
                            updateInstallmentDate={updateInstallmentDate}
                        />
                    )}

                    {step === 4 && (
                        <CreateProjectWizardSummaryStep
                            formData={formData}
                            clients={clients}
                            formatDate={fmt.date}
                        />
                    )}
                </div>

                <DialogFooter className="flex justify-between items-center sm:justify-between w-full mt-4">
                    <Button variant="ghost" onClick={handleBack} disabled={step === 1}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>

                    {step < 4 ? (
                        <Button
                            onClick={handleNext}
                            disabled={
                                (step === 1 && (!formData.name || !formData.dueDate)) ||
                                (step === 2 && formData.services.length === 0)
                            }
                        >
                            Next <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={submitting}>
                            {submitting ? "Creating..." : "Create Project"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
