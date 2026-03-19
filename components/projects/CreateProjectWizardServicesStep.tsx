"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CreateProjectWizardFormData, ServiceOption } from "./create-project-wizard-shared";

type CreateProjectWizardServicesStepProps = {
    formData: CreateProjectWizardFormData;
    serviceInput: string;
    services: ServiceOption[];
    setServiceInput: React.Dispatch<React.SetStateAction<string>>;
    addServiceName: (rawName: string) => void;
    removeServiceName: (serviceName: string) => void;
};

export function CreateProjectWizardServicesStep({
    formData,
    serviceInput,
    services,
    setServiceInput,
    addServiceName,
    removeServiceName,
}: CreateProjectWizardServicesStepProps) {
    return (
        <div className="space-y-4 py-4">
            <Label>Project Services</Label>
            <div className="flex gap-2">
                <Input
                    placeholder="Type service name and click Add"
                    value={serviceInput}
                    onChange={(e) => setServiceInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            addServiceName(serviceInput);
                        }
                    }}
                />
                <Button type="button" variant="secondary" onClick={() => addServiceName(serviceInput)}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
            </div>

            {services.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Quick add from existing services</p>
                    <div className="flex flex-wrap gap-2">
                        {services.map((service) => {
                            const isSelected = formData.services.some((name) => name.toLowerCase() === String(service.name).toLowerCase());
                            return (
                                <button
                                    key={service.id}
                                    type="button"
                                    disabled={isSelected}
                                    onClick={() => addServiceName(String(service.name))}
                                    className={cn(
                                        "px-2.5 py-1.5 rounded-md border text-xs transition-colors",
                                        isSelected
                                            ? "bg-primary/10 text-primary border-primary/30 cursor-not-allowed"
                                            : "bg-background hover:bg-accent border-border",
                                    )}
                                >
                                    {service.name}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {formData.services.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Selected services</p>
                    <div className="flex flex-wrap gap-2">
                        {formData.services.map((serviceName) => (
                            <span key={serviceName} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
                                {serviceName}
                                <button type="button" onClick={() => removeServiceName(serviceName)} className="hover:text-red-500 transition-colors">
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {formData.services.length === 0 && (
                <p className="text-sm text-muted-foreground text-center pt-2">Please add at least one service</p>
            )}
        </div>
    );
}
