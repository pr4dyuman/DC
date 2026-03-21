import { ProjectServiceConfig } from "@/lib/types";

export type ClientOption = {
    id: string;
    name: string;
    companyName?: string;
};

export type ServiceOption = {
    id: string;
    name: string;
};

export type CreateProjectWizardFormData = {
    name: string;
    slug: string;
    clientIds: string[];
    clientName: string;
    services: string[];
    serviceConfigs: ProjectServiceConfig[];
    budget: number;
    dueDate: string;
};
