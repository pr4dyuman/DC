import "server-only";

import { revalidatePath } from "next/cache";
import type { Service } from "../db";
import { generateId } from "../utils-server";
import { sanitizeName } from "../validation";
import { ProjectModel, ServiceModel, TaskModel, connectDB } from "../mongodb";
import { createDefaultProjectPaymentConfig, type ProjectLike } from "./projects-shared";

type ServiceDoc = Service;

export async function addServiceImpl(name: string, projectId: string, employees: string[], agencyId?: string) {
    name = sanitizeName(name, 200);
    if (!name) throw new Error("Service name is required");
    if (!projectId) throw new Error("Project is required");
    employees = (employees || []).filter((employee) => typeof employee === "string" && employee.trim());

    await connectDB();

    const projectExists = await ProjectModel.exists({ id: projectId, agencyId });
    if (!projectExists) throw new Error("Project not found");

    const duplicateByName = await ServiceModel.find({ agencyId, projectId }).select("id name").lean() as Array<Pick<Service, "id" | "name">>;
    if (duplicateByName.some((service) => String(service.name).toLowerCase() === name.toLowerCase())) {
        throw new Error(`Service "${name}" already exists in this project`);
    }

    const newService = { id: generateId(), agencyId, name, projectId, employees };
    await ServiceModel.create(newService);

    const defaultPaymentConfig = createDefaultProjectPaymentConfig();
    await ProjectModel.updateOne(
        { id: projectId, agencyId },
        { $addToSet: { services: newService.id } }
    );

    const project = await ProjectModel.findOne({ id: projectId, agencyId })
        .select("serviceConfigs")
        .lean() as Pick<ProjectLike, "serviceConfigs"> | null;

    const hasConfig = Array.isArray(project?.serviceConfigs)
        && project.serviceConfigs.some((config) =>
            String(config?.serviceId || "").toLowerCase() === String(newService.id).toLowerCase()
            || String(config?.name || "").toLowerCase() === name.toLowerCase()
        );

    if (!hasConfig) {
        await ProjectModel.updateOne(
            { id: projectId, agencyId },
            {
                $push: {
                    serviceConfigs: {
                        serviceId: newService.id,
                        name,
                        paymentConfig: defaultPaymentConfig,
                    },
                },
            }
        );
    }

    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard/projects/[slug]", "page");
    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard/settings");
    return newService;
}

export async function deleteServiceImpl(id: string, agencyId?: string) {
    await connectDB();

    const serviceToDelete = await ServiceModel.findOne({ id, agencyId }).lean() as ServiceDoc | null;
    if (!serviceToDelete) throw new Error("Service not found");

    const serviceName = serviceToDelete.name;
    const serviceProjectId = serviceToDelete.projectId;

    const tasksUsingService = await TaskModel.countDocuments({
        agencyId,
        projectId: serviceProjectId,
        category: serviceName,
    });
    if (tasksUsingService > 0) {
        throw new Error(
            `Cannot delete "${serviceName}": ${tasksUsingService} task(s) are still using this service as their category. Please reassign or delete those tasks first.`
        );
    }

    await ServiceModel.deleteOne({ id, agencyId });
    if (serviceProjectId) {
        await ProjectModel.updateOne(
            { agencyId, id: serviceProjectId },
            {
                $pull: {
                    services: { $in: [id, serviceName] },
                    serviceConfigs: { $or: [{ serviceId: { $in: [id, serviceName] } }, { name: serviceName }] },
                },
            }
        );
    } else {
        await ProjectModel.updateMany(
            { agencyId, services: id },
            { $pull: { services: id } }
        );
        await ProjectModel.updateMany(
            { agencyId, "serviceConfigs.serviceId": id },
            { $pull: { serviceConfigs: { serviceId: id } } }
        );
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard/projects/[slug]", "page");
    revalidatePath("/dashboard/finance");
}

export async function updateServiceImpl(id: string, name: string, projectId: string, employees: string[], agencyId?: string) {
    name = sanitizeName(name, 200);
    if (!name) throw new Error("Service name is required");
    if (!projectId) throw new Error("Project is required");
    employees = (employees || []).filter((employee) => typeof employee === "string" && employee.trim());

    await connectDB();

    const oldService = await ServiceModel.findOne({ id, agencyId }).lean() as ServiceDoc | null;
    if (!oldService) throw new Error("Service not found");

    const oldName = oldService.name;
    const oldProjectId = oldService.projectId || projectId;
    const duplicateByName = await ServiceModel.find({ agencyId, projectId }).select("id name").lean() as Array<Pick<Service, "id" | "name">>;
    if (duplicateByName.some((service) => service.id !== id && String(service.name).toLowerCase() === name.toLowerCase())) {
        throw new Error(`Service "${name}" already exists in this project`);
    }

    await ServiceModel.updateOne(
        { id, agencyId },
        { $set: { name, projectId, employees } }
    );

    if (oldName && oldName !== name && oldProjectId === projectId) {
        await TaskModel.updateMany(
            { agencyId, projectId: oldProjectId, category: oldName },
            { $set: { category: name } }
        );
    }

    if (oldProjectId !== projectId) {
        await ProjectModel.updateOne(
            { id: oldProjectId, agencyId },
            {
                $pull: {
                    services: { $in: [id, oldName] },
                    serviceConfigs: { $or: [{ serviceId: { $in: [id, oldName] } }, { name: oldName }] },
                },
            }
        );
    }

    await ProjectModel.updateOne(
        { id: projectId, agencyId },
        { $addToSet: { services: id } }
    );
    await ProjectModel.updateOne(
        { id: projectId, agencyId },
        { $pull: { services: oldName } }
    );
    await ProjectModel.updateOne(
        { id: projectId, agencyId, "serviceConfigs.serviceId": oldName },
        { $set: { "serviceConfigs.$[cfg].serviceId": id, "serviceConfigs.$[cfg].name": name } },
        { arrayFilters: [{ "cfg.serviceId": oldName }] }
    );
    await ProjectModel.updateOne(
        { id: projectId, agencyId, "serviceConfigs.name": oldName },
        { $set: { "serviceConfigs.$[cfg].serviceId": id, "serviceConfigs.$[cfg].name": name } },
        { arrayFilters: [{ "cfg.name": oldName }] }
    );
    await ProjectModel.updateOne(
        { id: projectId, agencyId, "serviceConfigs.serviceId": id },
        { $set: { "serviceConfigs.$[cfg].name": name } },
        { arrayFilters: [{ "cfg.serviceId": id }] }
    );

    const project = await ProjectModel.findOne({ id: projectId, agencyId })
        .select("serviceConfigs")
        .lean() as Pick<ProjectLike, "serviceConfigs"> | null;
    const hasConfig = Array.isArray(project?.serviceConfigs)
        && project.serviceConfigs.some((config) =>
            String(config?.serviceId || "").toLowerCase() === String(id).toLowerCase()
            || String(config?.name || "").toLowerCase() === name.toLowerCase()
        );

    if (!hasConfig) {
        await ProjectModel.updateOne(
            { id: projectId, agencyId },
            {
                $push: {
                    serviceConfigs: {
                        serviceId: id,
                        name,
                        paymentConfig: createDefaultProjectPaymentConfig(),
                    },
                },
            }
        );
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard/projects/[slug]", "page");
    revalidatePath("/dashboard/finance");
}
