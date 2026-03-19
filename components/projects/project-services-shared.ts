import type { User } from "@/lib/types";

export type ServiceItem = {
    id: string;
    name: string;
    projectId?: string;
    employees?: string[];
};

export type ServiceDirectoryUser = Pick<User, "id" | "name" | "jobTitle" | "role">;
