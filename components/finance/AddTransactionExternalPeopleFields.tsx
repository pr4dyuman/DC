"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Project, User } from "@/lib/types";

import { FieldRow, InfoBox, LockedProjectDisplay } from "@/components/finance/AddTransactionFieldPrimitives";

interface ReimbursementTransactionFieldsProps {
    employees: User[];
    projects: Project[];
    memberId: string;
    expenseType: string;
    description: string;
    projectId: string;
    amount: string;
    onMemberChange: (value: string) => void;
    onExpenseTypeChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onProjectChange: (value: string) => void;
    onAmountChange: (value: string) => void;
}

export function ReimbursementTransactionFields({
    employees,
    projects,
    memberId,
    expenseType,
    description,
    projectId,
    amount,
    onMemberChange,
    onExpenseTypeChange,
    onDescriptionChange,
    onProjectChange,
    onAmountChange,
}: ReimbursementTransactionFieldsProps) {
    return (
        <>
            <FieldRow label="Employee">
                <Select value={memberId || "none"} onValueChange={onMemberChange}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Select Employee</SelectItem>
                        {employees.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                                {user.name} {user.jobTitle ? `(${user.jobTitle})` : ""}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FieldRow>
            {memberId && (
                <>
                    <FieldRow label="Expense Type">
                        <Select value={expenseType || "none"} onValueChange={onExpenseTypeChange}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select Expense Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Select Expense Type</SelectItem>
                                <SelectItem value="Travel">Travel</SelectItem>
                                <SelectItem value="Meals">Meals</SelectItem>
                                <SelectItem value="Client Meeting">Client Meeting</SelectItem>
                                <SelectItem value="Equipment">Equipment</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </FieldRow>
                    <FieldRow label="Description">
                        <Input
                            value={description}
                            onChange={(event) => onDescriptionChange(event.target.value)}
                            className="col-span-3"
                            placeholder="e.g. Travel Reimbursement - Client Visit"
                            required
                        />
                    </FieldRow>
                    {projects.length > 0 && (
                        <FieldRow label={<><span>Project </span><span className="text-xs text-muted-foreground">(Optional)</span></>}>
                            <Select value={projectId || "none"} onValueChange={onProjectChange}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Link to Project (Optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Project</SelectItem>
                                    {projects.map((project) => (
                                        <SelectItem key={project.id} value={project.id}>
                                            {project.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FieldRow>
                    )}
                    <FieldRow label="Amount">
                        <Input
                            type="number"
                            min="1"
                            value={amount}
                            onChange={(event) => onAmountChange(event.target.value)}
                            className="col-span-3"
                            required
                        />
                    </FieldRow>
                </>
            )}
            <InfoBox className="bg-violet-50 dark:bg-violet-950 border-violet-200 dark:border-violet-800">
                <p className="text-violet-800 dark:text-violet-200">Employee reimbursement - recorded as Expense.</p>
            </InfoBox>
        </>
    );
}

interface FreelancerTransactionFieldsProps {
    freelancers: User[];
    projects: Project[];
    isProjectScoped: boolean;
    projectName?: string;
    memberId: string;
    description: string;
    projectId: string;
    amount: string;
    formatMoney: (value: number) => string;
    onMemberChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onProjectChange: (value: string) => void;
    onAmountChange: (value: string) => void;
}

export function FreelancerTransactionFields({
    freelancers,
    projects,
    isProjectScoped,
    projectName,
    memberId,
    description,
    projectId,
    amount,
    formatMoney,
    onMemberChange,
    onDescriptionChange,
    onProjectChange,
    onAmountChange,
}: FreelancerTransactionFieldsProps) {
    return (
        <>
            <FieldRow label="Freelancer">
                {freelancers.length > 0 ? (
                    <Select value={memberId || "none"} onValueChange={onMemberChange}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select Freelancer" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Select Freelancer</SelectItem>
                            {freelancers.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                    {user.name} {user.jobTitle ? `(${user.jobTitle})` : ""} {user.salary ? `- ${formatMoney(user.salary)}` : ""}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <div className="col-span-3 text-sm text-muted-foreground bg-muted p-3 rounded-md">
                        No freelancers found. Add team members with &quot;Freelancer&quot; employment type in Settings -&gt; Team.
                    </div>
                )}
            </FieldRow>
            {memberId && (
                <>
                    <FieldRow label="Description">
                        <Input
                            value={description}
                            onChange={(event) => onDescriptionChange(event.target.value)}
                            className="col-span-3"
                            placeholder="e.g. Freelancer Payment - Web Development"
                            required
                        />
                    </FieldRow>
                    {projects.length > 0 && !isProjectScoped && (
                        <FieldRow label={<><span>Project </span><span className="text-xs text-muted-foreground">(Optional)</span></>}>
                            <Select value={projectId || "none"} onValueChange={onProjectChange}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Link to Project (Optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Project</SelectItem>
                                    {projects.map((project) => (
                                        <SelectItem key={project.id} value={project.id}>
                                            {project.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FieldRow>
                    )}
                    {isProjectScoped && (
                        <FieldRow label="Project">
                            <LockedProjectDisplay projectName={projectName} />
                        </FieldRow>
                    )}
                    <FieldRow label="Amount">
                        <Input
                            type="number"
                            min="1"
                            value={amount}
                            onChange={(event) => onAmountChange(event.target.value)}
                            className="col-span-3"
                            required
                        />
                    </FieldRow>
                </>
            )}
            <InfoBox className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
                <p className="text-orange-800 dark:text-orange-200">Freelancer/Contractor payment - recorded as Expense.</p>
            </InfoBox>
        </>
    );
}
