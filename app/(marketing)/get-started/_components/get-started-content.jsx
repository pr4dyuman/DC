import {
    BarChart3,
    Bot,
    Wallet,
    Users,
    MessageSquare,
    BriefcaseBusiness,
    Zap,
    TrendingUp,
} from "lucide-react";

export const heroStats = [
    { value: "50+", label: "Agencies Onboard" },
    { value: "10K+", label: "Tasks Managed" },
    { value: "99.9%", label: "Uptime" },
    { value: "5 min", label: "Setup Time" },
];

export const platformFeatures = [
    {
        icon: BarChart3,
        title: "Project Management",
        description:
            "Kanban boards, task assignments, deadlines, priority tracking, and real-time progress updates. Never miss a deadline again.",
        highlights: [
            "Drag-and-drop Kanban boards",
            "Task assignment and deadlines",
            "Progress tracking per project",
            "Client-specific project views",
        ],
    },
    {
        icon: Bot,
        title: "AI-Powered Assistant",
        description:
            "Singularity AI breaks down tasks, estimates hours, manages payroll, creates invoices, and answers business questions through natural conversation.",
        highlights: [
            "Task breakdown and hour estimation",
            "Automated payroll processing",
            "Invoice generation via chat",
            "Business insights on demand",
        ],
    },
    {
        icon: Wallet,
        title: "Financial Intelligence",
        description:
            "Complete financial control with income and expense tracking, invoices, payroll, and AI-powered financial reporting.",
        highlights: [
            "Income and expense tracking",
            "One-click invoice creation",
            "Payroll management",
            "AI financial analysis",
        ],
    },
    {
        icon: Users,
        title: "Team Management",
        description:
            "Manage your entire team from one place with workload tracking, leave management, performance visibility, and role-based permissions.",
        highlights: [
            "Role-based access control",
            "Leave request management",
            "Workload and performance tracking",
            "Team activity timeline",
        ],
    },
    {
        icon: BriefcaseBusiness,
        title: "Client Portal",
        description:
            "Give your clients a branded portal to view progress, approve deliverables, and communicate directly with your team.",
        highlights: [
            "Branded client dashboards",
            "Project progress visibility",
            "Direct client messaging",
            "Asset and file sharing",
        ],
    },
    {
        icon: MessageSquare,
        title: "Team Communication",
        description:
            "Built-in messaging with real-time notifications, project-based conversations, and file sharing so work stays in context.",
        highlights: [
            "Real-time team messaging",
            "Project-based discussions",
            "File and asset sharing",
            "Activity notifications",
        ],
    },
];

export const steps = [
    {
        number: "01",
        icon: BriefcaseBusiness,
        title: "Sign Up Your Company",
        description:
            "Create your company account in minutes. Add your team members, set up roles, and configure permissions.",
    },
    {
        number: "02",
        icon: Zap,
        title: "Set Up Your Workspace",
        description:
            "Add clients, create projects, and customize your dashboard. Import existing data or start fresh.",
    },
    {
        number: "03",
        icon: TrendingUp,
        title: "Scale With AI",
        description:
            "Let Singularity AI handle task estimation, payroll, invoicing, and business insights while you focus on growth.",
    },
];

export const aiBreakdownItems = [
    "UI/UX Design - 35 hours",
    "Frontend Development - 50 hours",
    "Backend Integration - 25 hours",
    "Testing and QA - 10 hours",
];

export const aiHighlights = [
    "Break down complex projects into tasks automatically",
    "Estimate hours based on your past project data",
    "Process payroll and generate payslips",
    "Create and send professional invoices",
    "Manage team onboarding and offboarding",
];
