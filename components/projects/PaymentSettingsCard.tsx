"use client";

import { useState } from "react";
import { Project, ProjectServiceConfig, PaymentConfig } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProjectPayment } from "@/lib/actions";
import { Pencil, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentSettingsCardProps {
    project: Project;
}

export function PaymentSettingsCard({ project }: PaymentSettingsCardProps) {
    const [editingConfig, setEditingConfig] = useState<ProjectServiceConfig | null>(null);
    const [loading, setLoading] = useState(false);

    // Initial state for form when editing
    const [formConfig, setFormConfig] = useState<PaymentConfig | null>(null);

    const handleEdit = (config: ProjectServiceConfig) => {
        setEditingConfig(config);
        // Ensure default payment config structure if missing
        setFormConfig(config.paymentConfig || {
            type: 'installment',
            paymentDetailsLater: false,
            installments: 1,
            installmentAmount: 0,
            monthlyAmount: 0
        });
    };

    const handleSave = async () => {
        if (!editingConfig || !formConfig) return;
        setLoading(true);
        try {
            await updateProjectPayment(project.id, editingConfig.serviceId, {
                ...formConfig,
                paymentDetailsLater: false // Explicitly uncheck this since we are editing now
            });
            setEditingConfig(null);
        } catch (error) {
            console.error("Failed to update payment", error);
        } finally {
            setLoading(false);
        }
    };

    const serviceConfigs = project.serviceConfigs || [];

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Service Payments</CardTitle>
                    <CardDescription>Manage payment terms for each service in this project.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {serviceConfigs.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">No specific service configurations found.</p>
                    )}

                    {serviceConfigs.map((config) => {
                        const isPending = config.paymentConfig?.paymentDetailsLater;
                        return (
                            <div key={config.serviceId} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">{config.name}</span>
                                        {isPending ? (
                                            <Badge variant="outline" className="text-amber-500 border-amber-200 bg-amber-50">Pending Setup</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                {config.paymentConfig?.type === 'installment' ? 'Installments' : 'Monthly'}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {isPending ? (
                                            <span className="flex items-center text-amber-600 text-xs">
                                                <AlertCircle className="w-3 h-3 mr-1" />
                                                Payment details need to be configured.
                                            </span>
                                        ) : (
                                            <span className="flex items-center text-xs">
                                                {config.paymentConfig?.type === 'installment'
                                                    ? `${config.paymentConfig.installments} Installments • Starts ${config.paymentConfig.firstPaymentDate}`
                                                    : `₹${config.paymentConfig?.monthlyAmount}/mo • Billing starts ${config.paymentConfig?.billingStartDate}`
                                                }
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => handleEdit(config)}>
                                    <Pencil className="w-4 h-4" />
                                </Button>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            <Dialog open={!!editingConfig} onOpenChange={(open) => !open && setEditingConfig(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Payment: {editingConfig?.name}</DialogTitle>
                    </DialogHeader>

                    {formConfig && (
                        <div className="space-y-4 py-4">
                            <div className="flex items-center gap-4">
                                <Label className="text-xs uppercase text-muted-foreground font-bold">Payment Model</Label>
                                <div className="flex bg-muted rounded-lg p-1">
                                    <button
                                        type="button"
                                        onClick={() => setFormConfig({ ...formConfig, type: 'installment' })}
                                        className={cn(
                                            "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                            formConfig.type === 'installment' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Installments
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormConfig({ ...formConfig, type: 'monthly' })}
                                        className={cn(
                                            "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                            formConfig.type === 'monthly' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Monthly
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {formConfig.type === 'installment' ? (
                                    <>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Number of Installments</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={formConfig.installments || ''}
                                                onChange={(e) => setFormConfig({ ...formConfig, installments: parseInt(e.target.value) })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">First Payment Date</Label>
                                            <Input
                                                type="date"
                                                value={formConfig.firstPaymentDate || ''}
                                                onChange={(e) => setFormConfig({ ...formConfig, firstPaymentDate: e.target.value })}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Monthly Amount (₹)</Label>
                                            <Input
                                                type="number"
                                                value={formConfig.monthlyAmount || ''}
                                                onChange={(e) => setFormConfig({ ...formConfig, monthlyAmount: parseInt(e.target.value) })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Billing Start Date</Label>
                                            <Input
                                                type="date"
                                                value={formConfig.billingStartDate || ''}
                                                onChange={(e) => setFormConfig({ ...formConfig, billingStartDate: e.target.value })}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingConfig(null)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={loading}>
                            {loading ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
