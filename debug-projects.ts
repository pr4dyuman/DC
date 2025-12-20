
import { getProjects, getClients } from "@/lib/actions";

async function main() {
    const projects = await getProjects();
    const clients = await getClients();

    console.log("Projects:", JSON.stringify(projects, null, 2));
    console.log("Clients:", JSON.stringify(clients, null, 2));
}

main().catch(console.error);
