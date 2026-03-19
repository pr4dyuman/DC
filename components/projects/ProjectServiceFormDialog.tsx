"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ChevronDown, Loader2, X } from "lucide-react";
import type { ServiceDirectoryUser, ServiceItem } from "./project-services-shared";

type ProjectServiceFormDialogProps = {
    open: boolean;
    editing: ServiceItem | null;
    name: string;
    selectedEmployees: string[];
    employeeUsers: ServiceDirectoryUser[];
    dropdownOpen: boolean;
    submitting: boolean;
    onOpenChange: (open: boolean) => void;
    onNameChange: (value: string) => void;
    onToggleEmployee: (userId: string) => void;
    onDropdownToggle: () => void;
    onDropdownClose: () => void;
    onSubmit: (event: React.FormEvent) => void;
    getUserName: (userId: string) => string;
};

export function ProjectServiceFormDialog({
    open,
    editing,
    name,
    selectedEmployees,
    employeeUsers,
    dropdownOpen,
    submitting,
    onOpenChange,
    onNameChange,
    onToggleEmployee,
    onDropdownToggle,
    onDropdownClose,
    onSubmit,
    getUserName,
}: ProjectServiceFormDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>{editing ? "Edit Service" : "Add New Service"}</DialogTitle>
                    <DialogDescription>
                        {editing ? "Update the service name and assigned employees." : "Create a new service and assign employees."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-5 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="svc-name">Service Name <span className="text-red-500">*</span></Label>
                        <Input
                            id="svc-name"
                            value={name}
                            onChange={(event) => onNameChange(event.target.value)}
                            placeholder="e.g. UI/UX Design, Web Development"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Assign Employees</Label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={onDropdownToggle}
                                className="flex items-center justify-between w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-left hover:bg-accent/50 transition-colors"
                            >
                                <span className={selectedEmployees.length > 0 ? "text-foreground" : "text-muted-foreground"}>
                                    {selectedEmployees.length > 0
                                        ? `${selectedEmployees.length} employee${selectedEmployees.length > 1 ? "s" : ""} selected`
                                        : "Select employees..."}
                                </span>
                                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                            </button>
                            {dropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-[60]" onClick={onDropdownClose} />
                                    <div className="absolute top-full left-0 right-0 z-[70] mt-1 max-h-48 overflow-y-auto border border-border rounded-lg bg-popover shadow-lg">
                                        {employeeUsers.length > 0 ? employeeUsers.map((user) => {
                                            const isSelected = selectedEmployees.includes(user.id);
                                            return (
                                                <button
                                                    key={user.id}
                                                    type="button"
                                                    onClick={() => onToggleEmployee(user.id)}
                                                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-accent/50 transition-colors ${isSelected ? "bg-primary/5" : ""}`}
                                                >
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? "bg-primary border-primary" : "border-input"}`}>
                                                        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="font-medium">{user.name}</span>
                                                        {user.jobTitle && <span className="text-muted-foreground ml-1.5 text-xs">• {user.jobTitle}</span>}
                                                    </div>
                                                </button>
                                            );
                                        }) : (
                                            <div className="px-3 py-3 text-sm text-muted-foreground">No team members found</div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {selectedEmployees.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {selectedEmployees.map((employeeId) => (
                                    <span
                                        key={employeeId}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                                    >
                                        {getUserName(employeeId)}
                                        <button type="button" onClick={() => onToggleEmployee(employeeId)} className="hover:text-red-500 transition-colors">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editing ? "Save Changes" : "Create Service"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
