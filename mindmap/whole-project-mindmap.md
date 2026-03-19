# Whole Project Mind Map

The diagrams below give a visual summary of the current project.

## 1. Product Mind Map

```mermaid
mindmap
  root((Agency OS))
    Public Website
      Home
      About
      Services
        Web Development
        Video Production Ad
        Social Media Marketing
        SEO
        PPC
        Influencer Marketing
        Manage Company
      Blog
      Contact
      Get Started
      Marketing Admin CMS
    Auth And Identity
      JWT Session Cookies
      Login
      Signup With OTP
      Forgot Password With OTP
      Super Admin Auth
      User Auth
      Client Auth
      Marketing Admin Auth
    Agency Dashboard
      Dashboard Home
        Admin And Manager Metrics
        Employee Personal View
        Client Portal View
      Projects
        Project List
        Create Project Wizard
        Project Workspace
          Kanban Board
          Task Comments
          Project Settings
          Payment Configuration
          Services
          Assets
          Project Finance
      Team
        Team Directory
        Employee Profiles
        Document Manager
        Contribution Heatmap
        Leave Requests
      Clients
        Client Directory
        Client Profiles
        Client Finance View
        Client Activity
      Finance
        Overview
        Transactions
        Invoices
        Payroll
        Refunds
        Category Views
        Project Views
        Team Views
      Messages
        Contacts
        Threads
        Presence
        Overlay Chat
      Settings
        Appearance
        Permissions
        AI Settings
        Security
        Branding
        Email Settings
    Singularity AI
      Chat Mode
      Agent Mode
      Task AI
        Explain Task
        Enhance Description
        Extract Fields
        Estimate Hours
      Attachments
        Images
        Documents
      History
      Checkpoints
      Rollback
      Tool Execution
        Read Tools
        Project Task Tools
        Finance Tools
        Management Tools
        Admin Tools
        Delete Tools
      AI Usage Logging
    Super Admin Platform
      Platform Dashboard
      Agencies
        Create
        Update
        Suspend
        Activate
        Delete
        Extend Trial
        Plan Changes
      Billing
      Analytics
      AI Usage Monitor
      Logs
      System Settings
      Default AI Config
      Per Agency AI Config
    Data And Infrastructure
      MongoDB Models
        Agency
        User
        Client
        Project
        Task
        Service
        Asset
        Invoice
        Transaction
        Message
        Notification
        Activity
        LeaveRequest
        Settings
        OTP
        RateLimit
        SingularitySession
        SingularityCheckpoint
      Multi Tenancy
        agencyId Scoping
        Usage Counters
        Plan Limits
        Trial Expiry
        Plan Expiry
      Storage
        Vercel Blob
        Azure Blob
        Secure Upload Validation
      Email
        Brevo
        Project Emails
        Task Emails
        Finance Emails
        Team Emails
        Account Emails
      Security
        CSRF Validation
        Rate Limiting
        Security Headers
        Upload Checks
        Role Access Control
    Scripts
      Seed Accounts
      Migrate Passwords
      Import Export DB
      Verify And Fix DB
      AI Live Tests
      Email Template Tools
```

## 2. Architecture Flow

```mermaid
flowchart LR
  A[Browser UI] --> B[Next.js App Router]
  B --> C[Pages And Layouts]
  B --> D[API Routes]
  C --> E[Server Actions in lib/actions]
  D --> E

  E --> F[Access Control]
  F --> G[JWT Session]
  F --> H[Agency Context]

  E --> I[MongoDB Models]
  E --> J[Brevo Email]
  E --> K[Storage Layer]
  E --> L[AI Provider Layer]

  K --> K1[Vercel Blob]
  K --> K2[Azure Blob]

  L --> L1[Gemini]
  L --> L2[OpenAI Compatible Backends]

  E --> M[Notifications And Activity]
  E --> N[Export Reporting]

  O[Singularity UI] --> D
  D --> P[Singularity Route Logic]
  P --> Q[Tool Declarations]
  P --> R[Tool Executor]
  R --> E
  P --> S[History And Checkpoints]
  S --> I

  T[Super Admin UI] --> E
  E --> U[Platform Analytics And AI Usage]
  U --> I
```

## 3. Fast Interpretation Guide

- Public routes generate leads, content, and agency signups.
- Dashboard routes handle day-to-day agency operations under agency scope.
- Super-admin routes operate above agencies and manage the platform itself.
- Server actions are the main business-logic layer.
- MongoDB is the core data store, while Brevo, storage adapters, and AI providers are external integrations.
- Singularity is layered on top of the same action and data model, with extra history and rollback support.
