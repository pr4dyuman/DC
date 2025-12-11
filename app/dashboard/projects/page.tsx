"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getProjects, getCategories, createProject } from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Plus, Calendar, Folder } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function ProjectsPage() {
    const router = useRouter();
    const [projects, setProjects] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    // Create Form State
    const [showCreate, setShowCreate] = useState(false);
    const [newProject, setNewProject] = useState({ client: "", services: [] as string[], budget: 0, dueDate: "" });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [p, c] = await Promise.all([getProjects(), getCategories()]);
        setProjects(p);
        setCategories(c);
        setLoading(false);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        // @ts-ignore - simplified type handling for Action
        await createProject(newProject);
        setCreating(false);
        setShowCreate(false);
        setNewProject({ client: "", services: [], budget: 0, dueDate: "" });
        loadData();
    };

    const toggleService = (svc: string) => {
        setNewProject(prev => {
            const exists = prev.services.includes(svc);
            return {
                ...prev,
                services: exists
                    ? prev.services.filter(s => s !== svc)
                    : [...prev.services, svc]
            };
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                <h1 className="text-2xl sm:text-3xl font-bold">Projects</h1>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="w-full sm:w-auto inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                    <Plus className="mr-2 h-4 w-4" /> New Project
                </button>
            </div>

            {/* Create Project Panel */}
            {showCreate && (
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle>Create New Project</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-4 items-start">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Client Name</label>
                                <input required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={newProject.client} onChange={e => setNewProject({ ...newProject, client: e.target.value })} placeholder="Acme Corp" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Services</label>
                                <div className="flex flex-col gap-2 p-2 border rounded-md bg-background max-h-40 overflow-y-auto">
                                    {categories.map(c => (
                                        <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={newProject.services.includes(c.name)}
                                                onChange={() => toggleService(c.name)}
                                                className="rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                            {c.name}
                                        </label>
                                    ))}
                                </div>
                                {newProject.services.length === 0 && <p className="text-xs text-red-500">Select at least one</p>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Budget ($)</label>
                                <input required type="number" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={newProject.budget} onChange={e => setNewProject({ ...newProject, budget: parseInt(e.target.value) })} placeholder="5000" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Due Date</label>
                                <input required type="date" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={newProject.dueDate} onChange={e => setNewProject({ ...newProject, dueDate: e.target.value })} />
                            </div>
                            <div className="md:col-span-4 flex justify-end">
                                <button disabled={creating || newProject.services.length === 0} type="submit" className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-indigo-600 text-white h-10 px-4 hover:bg-indigo-700 disabled:opacity-50">
                                    {creating ? "Creating..." : "Create Project"}
                                </button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Projects Grid */}
            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map(project => (
                        <Link key={project.id} href={`/dashboard/projects/${project.id}`} className="block group">
                            <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <CardTitle className="text-lg">{project.client}</CardTitle>
                                            <CardDescription className="line-clamp-1">
                                                {(project.services || [project.department]).join(', ')}
                                            </CardDescription>
                                        </div>
                                        <div className={`px-2 py-1 rounded-full text-xs font-medium ml-2 whitespace-nowrap ${project.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {project.status}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between text-sm text-muted-foreground mt-4">
                                        <div className="flex items-center">
                                            <Folder className="mr-1 h-3 w-3" />
                                            ${project.budget.toLocaleString()}
                                        </div>
                                        <div className="flex items-center">
                                            <Calendar className="mr-1 h-3 w-3" />
                                            {format(new Date(project.dueDate), "MMM d, yyyy")}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
