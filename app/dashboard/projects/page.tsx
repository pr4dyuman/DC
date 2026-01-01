"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getProjects, getServices, createProject, getCurrentUser } from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Plus, Calendar, Folder } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CreateProjectWizard } from "@/components/projects/CreateProjectWizard";

export default function ProjectsPage() {
    const router = useRouter();
    const [projects, setProjects] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null); // State for current user

    const [showWizard, setShowWizard] = useState(false);



    const loadData = async () => {
        // Project service doesn't need categories in this view anymore if wizard handles it, 
        // but we might use it for filtering later.
        const [p, s, u] = await Promise.all([getProjects(), getServices(), getCurrentUser()]);
        setProjects(p);
        setServices(s);
        setCurrentUser(u);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                <h1 className="text-2xl sm:text-3xl font-bold">Projects</h1>
                {isAdmin && (
                    <button
                        onClick={() => setShowWizard(true)}
                        className="w-full sm:w-auto inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                    >
                        <Plus className="mr-2 h-4 w-4" /> New Project
                    </button>
                )}
            </div>

            <CreateProjectWizard
                open={showWizard}
                onOpenChange={setShowWizard}
                onProjectCreated={loadData}
            />

            {/* Projects Grid */}
            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map(project => (
                        <Link key={project.id} href={`/dashboard/projects/${project.slug || project.id}`} className="block group">
                            <Card className="h-full transition-all border-neutral-800 hover:border-yellow-500/50 hover:bg-neutral-900 hover:shadow-lg">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <CardTitle className="text-lg">{project.name}</CardTitle>
                                            <div className="text-sm text-muted-foreground line-clamp-1">
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {project.client && project.client !== project.name ? <Badge variant="outline" className="font-normal text-xs">{project.client}</Badge> : null}
                                                    {project.services && project.services.length > 0 && project.services
                                                        .filter((svc: string) => services.some(s => s.name === svc))
                                                        .map((svc: string) => (
                                                            <Badge key={svc} variant="secondary" className="font-normal text-xs bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20">
                                                                {svc}
                                                            </Badge>
                                                        ))}
                                                </div>
                                            </div>
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
                                            ₹{project.budget.toLocaleString()}
                                        </div>
                                        <div className="flex items-center">
                                            <Calendar className="mr-1 h-3 w-3 text-yellow-500" />
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
