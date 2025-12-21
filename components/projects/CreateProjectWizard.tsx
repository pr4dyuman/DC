"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Check, Calendar, CreditCard, Layers, User, Banknote } from "lucide-react";
import { format } from "date-fns";
import { getClients, getServices, createProject } from "@/lib/actions";
import { ProjectServiceConfig, PaymentConfig } from "@/lib/db";
import { cn } from "@/lib/utils";

interface CreateProjectWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onProjectCreated?: () => void;
}

export function CreateProjectWizard({ open, onOpenChange, onProjectCreated }: CreateProjectWizardProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Data
    const [clients, setClients] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        slug: "", // Helper for URL
        clientId: "",
        clientName: "", // Derived for display
        services: [] as string[], // Helper for legacy support and selection
        serviceConfigs: [] as ProjectServiceConfig[],
        budget: 0,
        dueDate: "",
        aiEnabled: false
    });

    useEffect(() => {
        if (open) {
            setStep(1);
            loadData();
        }
    }, [open]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [c, s] = await Promise.all([getClients(), getServices()]);
            setClients(c);
            setServices(s);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (step === 2 && formData.serviceConfigs.length === 0) {
            // Need to initialize configs based on selected services
            const configs = formData.services.map(svc => {
                const existing = formData.serviceConfigs.find(c => c.serviceId === svc);
                return existing || {
                    serviceId: svc,
                    name: svc,
                    paymentConfig: {
                        type: 'installment',
                        paymentDetailsLater: false,
                        installments: 1,
                        installmentAmount: 0,
                        monthlyAmount: 0
                    } as PaymentConfig
                };
            });
            setFormData(prev => ({ ...prev, serviceConfigs: configs }));
        }
        setStep(prev => prev + 1);
    };

    const handleBack = () => setStep(prev => prev - 1);

    const toggleService = (svcName: string) => {
        setFormData(prev => {
            const exists = prev.services.includes(svcName);
            const newServices = exists
                ? prev.services.filter(s => s !== svcName)
                : [...prev.services, svcName];

            // Sync configs if removing
            const newConfigs = exists
                ? prev.serviceConfigs.filter(c => c.serviceId !== svcName)
                : prev.serviceConfigs;

            return { ...prev, services: newServices, serviceConfigs: newConfigs };
        });
    };

    const updatePaymentConfig = (serviceId: string, updates: Partial<PaymentConfig>) => {
        setFormData(prev => ({
            ...prev,
            serviceConfigs: prev.serviceConfigs.map(c => {
                if (c.serviceId === serviceId) {
                    const currentConfig = c.paymentConfig || {};
                    const newConfig = { ...currentConfig, ...updates } as PaymentConfig;

                    // Handle resizing installment dates array if installments count changes
                    if (updates.installments !== undefined) {
                        const count = updates.installments || 1;
                        const currentDates = newConfig.installmentDates || [];
                        // Resize array: keep existing, fill new with empty string
                        newConfig.installmentDates = Array(count).fill("").map((_, i) => currentDates[i] || "");

                        // Sync firstPaymentDate with first installment
                        if (newConfig.installmentDates.length > 0) {
                            newConfig.firstPaymentDate = newConfig.installmentDates[0];
                        }
                    }

                    // Sync first installment date if firstPaymentDate changes
                    if (updates.firstPaymentDate !== undefined && newConfig.type === 'installment' && (newConfig.installments || 1) === 1) {
                        newConfig.installmentDates = [updates.firstPaymentDate];
                    }

                    return { ...c, paymentConfig: newConfig };
                }
                return c;
            })
        }));
    };

    const updateInstallmentDate = (serviceId: string, index: number, date: string) => {
        setFormData(prev => ({
            ...prev,
            serviceConfigs: prev.serviceConfigs.map(c => {
                if (c.serviceId === serviceId && c.paymentConfig) {
                    const newDates = [...(c.paymentConfig.installmentDates || [])];
                    newDates[index] = date;
                    return {
                        ...c,
                        paymentConfig: {
                            ...c.paymentConfig,
                            installmentDates: newDates,
                            firstPaymentDate: index === 0 ? date : c.paymentConfig.firstPaymentDate // Sync first
                        }
                    };
                }
                return c;
            })
        }));
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            // Map form data to project object
            // Just assume client name lookup for legacy support
            const client = clients.find(c => c.id === formData.clientId);

            await createProject({
                name: formData.name,
                slug: formData.slug || undefined, // Send if present
                client: client?.name, // Optional: might be undefined
                clientId: formData.clientId || undefined,
                services: formData.services,
                // @ts-ignore - Schema update pending in actions
                serviceConfigs: formData.serviceConfigs,
                budget: formData.budget,
                dueDate: formData.dueDate,
                aiEnabled: formData.aiEnabled
            });

            if (onProjectCreated) onProjectCreated();
            onOpenChange(false);
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    // Render Steps
    const renderStep1 = () => (
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label>Project Name <span className="text-red-500">*</span></Label>
                <div className="relative">
                    <Layers className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="e.g. Website Redesign"
                        className="pl-8"
                        value={formData.name}
                        onChange={(e) => {
                            const name = e.target.value;
                            // Auto-generate slug if not manually edited (simplistic check: if empty or matches old)
                            // Ideally assume auto-gen unless user focused slug input.
                            // Let's just always suggest one if name is typed and slug is empty or "dirty".
                            // Simple approach: Set slug = kebab-case of name
                            setFormData(prev => ({
                                ...prev,
                                name,
                                slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                            }));
                        }}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label>URL Slug (Optional)</Label>
                <div className="relative">
                    <Layers className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="e.g. website-redesign"
                        className="pl-8 text-muted-foreground"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    />
                </div>
                <p className="text-xs text-muted-foreground">Example: /projects/{formData.slug || 'your-project'}</p>
            </div>

            <div className="space-y-2">
                <Label>Client (Optional)</Label>
                <div className="relative">
                    <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={formData.clientId}
                        onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    >
                        <option value="">No Client (Internal/Later)</option>
                        {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.companyName})</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Overall Budget Estimate (₹)</Label>
                <div className="relative">
                    <Banknote className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="number"
                        className="pl-8"
                        value={formData.budget}
                        onChange={(e) => setFormData({ ...formData, budget: parseInt(e.target.value) || 0 })}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Target Due Date</Label>
                <Input
                    type="date"
                    className="[&::-webkit-calendar-picker-indicator]:filter-[invert(82%)_sepia(38%)_saturate(1324%)_hue-rotate(358deg)_brightness(103%)_contrast(106%)] cursor-pointer"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-4 py-4">
            <Label>Select Services</Label>
            <div className="grid grid-cols-2 gap-3">
                {services.map(svc => {
                    const selected = formData.services.includes(svc.name);
                    return (
                        <div
                            key={svc.id}
                            onClick={() => toggleService(svc.name)}
                            className={cn(
                                "cursor-pointer rounded-lg border p-4 transition-all hover:bg-accent hover:text-accent-foreground hover:border-yellow-500/50 flex items-center justify-between",
                                selected ? "border-yellow-500 bg-yellow-500/10 ring-1 ring-yellow-500" : "bg-card"
                            )}
                        >
                            <span className="font-medium text-sm">{svc.name}</span>
                            {selected && <Check className="h-4 w-4 text-primary" />}
                        </div>
                    );
                })}
            </div>
            {formData.services.length === 0 && (
                <p className="text-sm text-muted-foreground text-center pt-2">Please select at least one service</p>
            )}
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <p className="text-sm text-muted-foreground">Configure payment details for each service.</p>
            {
                formData.serviceConfigs.map((config, idx) => (
                    <Card key={config.serviceId} className="border-l-4 border-l-primary/40 relative">
                        <div className="absolute top-0 right-0 p-2 opacity-5">
                            <Layers className="h-24 w-24" />
                        </div>
                        <CardHeader className="py-3 bg-muted/20">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">{idx + 1}</span>
                                {config.name}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="flex items-center gap-4">
                                <Label className="text-xs uppercase text-muted-foreground font-bold">Payment Model</Label>
                                <div className="flex bg-muted rounded-lg p-1">
                                    <button
                                        type="button"
                                        onClick={() => updatePaymentConfig(config.serviceId, { type: 'installment' })}
                                        className={cn(
                                            "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                            config.paymentConfig?.type === 'installment' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Installments
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updatePaymentConfig(config.serviceId, { type: 'monthly' })}
                                        className={cn(
                                            "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                            config.paymentConfig?.type === 'monthly' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Monthly
                                    </button>
                                </div>
                            </div>

                            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${!config.paymentConfig?.paymentDetailsLater ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                                <div className="overflow-hidden">
                                    <div className="grid grid-cols-2 gap-4">
                                        {config.paymentConfig?.type === 'installment' ? (
                                            <>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Number of Installments</Label>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        placeholder="e.g. 2"
                                                        value={config.paymentConfig?.installments || ''}
                                                        onChange={(e) => updatePaymentConfig(config.serviceId, { installments: parseInt(e.target.value) })}
                                                    />
                                                </div>

                                                {(config.paymentConfig?.installments || 1) <= 1 ? (
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Payment Date</Label>
                                                        <Input
                                                            type="date"
                                                            value={config.paymentConfig?.firstPaymentDate || ''}
                                                            onChange={(e) => updatePaymentConfig(config.serviceId, { firstPaymentDate: e.target.value })}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="col-span-2 space-y-2 pt-2 border-t mt-2">
                                                        <Label className="text-xs font-semibold">Installment Schedule</Label>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {Array.from({ length: config.paymentConfig?.installments || 0 }).map((_, i) => (
                                                                <div key={i} className="space-y-1">
                                                                    <Label className="text-[10px] text-muted-foreground">Installment {i + 1}</Label>
                                                                    <Input
                                                                        type="date"
                                                                        className="h-8 text-xs"
                                                                        value={config.paymentConfig?.installmentDates?.[i] || ''}
                                                                        onChange={(e) => updateInstallmentDate(config.serviceId, i, e.target.value)}
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
                                                    <Label className="text-xs">Monthly Amount (₹)</Label>
                                                    <Input
                                                        type="number"
                                                        placeholder="e.g. 500"
                                                        value={config.paymentConfig?.monthlyAmount || ''}
                                                        onChange={(e) => updatePaymentConfig(config.serviceId, { monthlyAmount: parseInt(e.target.value) })}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Billing Start Date</Label>
                                                    <Input
                                                        type="date"
                                                        value={config.paymentConfig?.billingStartDate || ''}
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
                                    className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                                    checked={config.paymentConfig?.paymentDetailsLater || false}
                                    onChange={(e) => updatePaymentConfig(config.serviceId, { paymentDetailsLater: e.target.checked })}
                                />
                                <Label htmlFor={`later-${config.serviceId}`} className="text-sm cursor-pointer">Set payment details later</Label>
                            </div>
                        </CardContent>
                    </Card>
                ))
            }
        </div >
    );

    const renderSummary = () => (
        <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4 space-y-3">
                <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Project</span>
                    <span className="font-medium">{formData.name}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Client</span>
                    <span className="font-medium">{clients.find(c => c.id === formData.clientId)?.name || "None"}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Due Date</span>
                    <span className="font-medium">{formData.dueDate ? format(new Date(formData.dueDate), "MMM d, yyyy") : "-"}</span>
                </div>
                <div className="space-y-1 pt-2">
                    <span className="text-muted-foreground block text-sm">Services & Payments</span>
                    <div className="grid gap-2">
                        {formData.serviceConfigs.map(c => (
                            <div key={c.serviceId} className="flex justify-between items-center text-sm bg-background p-2 rounded border">
                                <span className="font-medium">{c.name}</span>
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                    {c.paymentConfig?.type === 'installment' ? 'Installments' : 'Monthly'}
                                    {c.paymentConfig?.paymentDetailsLater && ' (Later)'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

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
                    <DialogDescription>
                        Step {step} of 4
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-[300px] p-1">
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && renderSummary()}
                </div>

                <DialogFooter className="flex justify-between items-center sm:justify-between w-full mt-4">
                    <Button
                        variant="ghost"
                        onClick={handleBack}
                        disabled={step === 1}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>

                    {step < 4 ? (
                        <Button onClick={handleNext} disabled={
                            (step === 1 && (!formData.name || !formData.dueDate)) ||
                            (step === 2 && formData.services.length === 0)
                        }>
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
