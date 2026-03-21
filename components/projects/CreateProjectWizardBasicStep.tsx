"use client";

import { Banknote, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClientOption, CreateProjectWizardFormData } from "./create-project-wizard-shared";

type CreateProjectWizardBasicStepProps = {
    formData: CreateProjectWizardFormData;
    clients: ClientOption[];
    symbol: string;
    setFormData: React.Dispatch<React.SetStateAction<CreateProjectWizardFormData>>;
};

export function CreateProjectWizardBasicStep({
    formData,
    clients,
    symbol,
    setFormData,
}: CreateProjectWizardBasicStepProps) {
    return (
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
                            setFormData((prev) => ({
                                ...prev,
                                name,
                                slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
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
                        onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    />
                </div>
                <p className="text-xs text-muted-foreground">Example: /projects/{formData.slug || "your-project"}</p>
            </div>

            <div className="space-y-2">
                <Label>Clients (Optional)</Label>
                <div className="max-h-40 overflow-y-auto rounded-md border border-input bg-background p-2 space-y-1">
                    {clients.length === 0 && (
                        <p className="text-sm text-muted-foreground px-1">No clients yet</p>
                    )}
                    {clients.map((client) => {
                        const isChecked = formData.clientIds.includes(client.id);
                        return (
                            <label
                                key={client.id}
                                className="flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-muted text-sm"
                            >
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    className="rounded border-input"
                                    onChange={() => {
                                        setFormData((prev) => ({
                                            ...prev,
                                            clientIds: isChecked
                                                ? prev.clientIds.filter((id) => id !== client.id)
                                                : [...prev.clientIds, client.id],
                                        }));
                                    }}
                                />
                                <span className="font-medium">{client.name}</span>
                                {client.companyName && (
                                    <span className="text-muted-foreground">({client.companyName})</span>
                                )}
                            </label>
                        );
                    })}
                </div>
                {formData.clientIds.length > 0 && (
                    <p className="text-xs text-muted-foreground">{formData.clientIds.length} client(s) selected</p>
                )}
            </div>

            <div className="space-y-2">
                <Label>Overall Budget Estimate ({symbol})</Label>
                <div className="relative">
                    <Banknote className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="number"
                        className="pl-8"
                        value={formData.budget}
                        onChange={(e) => setFormData((prev) => ({ ...prev, budget: parseInt(e.target.value) || 0 }))}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Target Due Date</Label>
                <div className="relative">
                    <input
                        type="date"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        value={formData.dueDate}
                        onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                    />
                </div>
            </div>
        </div>
    );
}
