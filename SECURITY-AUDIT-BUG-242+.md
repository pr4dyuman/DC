# Security & Bug Audit Report — BUG-242 through BUG-310

> **Auditor**: Automated Deep Audit  
> **Scope**: All 20 focus areas specified (finance, projects, team, dashboard, super-admin, singularity, providers, layout, marketing, API routes, config, hooks, clients, actions)  
> **Date**: 2025  
> **Severity Scale**: CRITICAL > HIGH > MEDIUM > LOW > INFO

---

## CRITICAL SEVERITY

---

### BUG-242 — Secret Keys Exposed to Client Bundle via next.config.ts `env` Block
- **File**: `next.config.ts`, lines 12–17
- **Severity**: CRITICAL
- **Description**: The `env` block in `next.config.ts` maps `MONGODB_URI`, `JWT_SECRET`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, and `BREVO_SENDER_NAME` to `process.env.*` on the **client side**. In Next.js, the `env` property in `next.config` inlines these values into the JavaScript bundle shipped to browsers. This means anyone viewing the page source or browser dev tools can extract the database connection string, JWT signing secret, and email API key.
- **Impact**: Full database compromise (MONGODB_URI), ability to forge any JWT token (JWT_SECRET), and ability to send emails on behalf of the organization (BREVO_API_KEY). This is a total system compromise vector.
- **Fix**: Remove the `env` block entirely. Server-side code already accesses `process.env.*` without this mapping. For client-side variables, use `NEXT_PUBLIC_` prefix only for non-sensitive values.

---

### BUG-243 — Marketing Admin Upload Endpoint Has No Authentication
- **File**: `app/api/upload-dc/route.js`, lines 1–37
- **Severity**: CRITICAL
- **Description**: The `POST /api/upload` endpoint accepts any file upload from any unauthenticated user. There is no call to `checkAuth()` or any authentication mechanism. Anyone on the internet can upload arbitrary files to `public/uploads/`.
- **Impact**: Attackers can upload malicious HTML files (stored XSS), PHP shells (if a PHP processor is ever added), or fill disk with large files (DoS). The files are served statically from `/uploads/`, making stored XSS trivial.

---

### BUG-244 — Upload Endpoint: No File Type Validation
- **File**: `app/api/upload-dc/route.js`, line 16
- **Severity**: CRITICAL
- **Description**: The filename is constructed as `Date.now() + '_' + file.name.replaceAll(' ', '_')` with zero validation of file extension or MIME type. An attacker can upload `.html`, `.svg` (with embedded JS), `.exe`, or any other file type.
- **Impact**: Stored XSS via uploaded HTML/SVG files served from the same origin. The browser will execute JavaScript in uploaded `.html` files under the application's domain, enabling session hijacking.

---

### BUG-245 — Upload Endpoint: Path Traversal via Filename
- **File**: `app/api/upload-dc/route.js`, line 16
- **Severity**: CRITICAL
- **Description**: The filename only strips spaces but does NOT sanitize directory traversal characters. A file named `../../../next.config.ts` would resolve via `path.join(uploadDir, filename)` to overwrite application files. While `path.join` normalizes, the resulting path could still escape the upload directory with crafted names like `....//....//file`.
- **Impact**: Arbitrary file overwrite on the server, potentially overwriting application code or configuration to gain remote code execution.

---

### BUG-246 — Marketing Auth: Hardcoded Static Cookie Token
- **File**: `app/api/auth-dc/login/route.js`, line ~42; `lib/authMiddleware.js`, line 12
- **Severity**: CRITICAL
- **Description**: The marketing admin authentication system uses a hardcoded cookie value `'logged_in_secret_value'`. Anyone who knows this string (now visible in source code) can set the cookie `admin_token=logged_in_secret_value` and gain full marketing admin access without credentials.
- **Impact**: Complete bypass of marketing admin authentication. Attacker can create/edit/delete blog posts, manage categories, manage testimonials.

---

### BUG-247 — Marketing Auth: Plaintext Password Storage and Comparison
- **File**: `app/api/auth-dc/login/route.js`, lines 20–24
- **Severity**: CRITICAL
- **Description**: The marketing admin password is stored in plaintext in MongoDB and compared with `admin.password !== password` (direct string comparison). The admin account is lazy-seeded on first login with the user-supplied password stored as-is (no hashing).
- **Impact**: If the database is compromised, the admin password is immediately available in cleartext. This also means any database backup, log, or query that includes the admin document exposes the password.

---

### BUG-248 — Marketing Auth: Lazy-Seeded Admin with Attacker-Controlled Password
- **File**: `app/api/auth-dc/login/route.js`, lines 15–23
- **Severity**: CRITICAL
- **Description**: If no admin exists in the database, the first POST to `/api/auth/login` with the hardcoded email `godigitalwithus0@gmail.com` creates the admin account with whatever password the requester provides. Since the endpoint has no authentication, anyone who reaches it first controls the marketing admin account.
- **Impact**: Race condition / first-come-first-served admin account creation. An attacker can claim the admin account before the legitimate owner.

---

## HIGH SEVERITY

---

### BUG-249 — Blog API: No Input Sanitization on POST
- **File**: `app/api/blog-dc/route.js`, POST handler
- **Severity**: HIGH
- **Description**: The blog creation endpoint accepts the full request body (`req.json()`) and passes it directly to `Blog.create(body)` without any field validation or sanitization. The blog `content` field likely renders as HTML (rich text), enabling stored XSS.
- **Impact**: Stored XSS via blog content. An authenticated marketing admin (or anyone if BUG-246 is exploited) can inject malicious scripts that execute for all blog readers.

---

### BUG-250 — Blog Content Rendered as Raw HTML (Stored XSS)
- **File**: `app/(marketing)/blog/[slug]/page.jsx`, line ~73
- **Severity**: HIGH
- **Description**: The blog post page renders `post.content` which comes from a rich text editor (ReactQuill). If the content contains script tags or event handlers from a malicious edit, they will be rendered. The blog page does not sanitize HTML before rendering.
- **Impact**: Any blog post can contain XSS payloads that execute in every visitor's browser, enabling session hijacking, data theft, or defacement.

---

### BUG-251 — DocumentManager: Unlimited Base64 File Upload to Database
- **File**: `components/team/DocumentManager.tsx`, file upload handler
- **Severity**: HIGH
- **Description**: Document uploads (Aadhar card, PAN card, contracts) are read as base64 data URIs via `FileReader.readAsDataURL()` and stored directly in the user's MongoDB document. There is no file size limit, no MIME type validation, and no content scanning. A 100MB file would be converted to ~133MB of base64 and stored in MongoDB.
- **Impact**: Database bloat/DoS via large file uploads. MongoDB documents have a 16MB size limit — exceeding this crashes the update. No malware scanning allows storing malicious files.

---

### BUG-252 — AddAssetModal: Client-Side-Only File Validation
- **File**: `components/projects/AddAssetModal.tsx`
- **Severity**: HIGH
- **Description**: File validation (forbidden extensions, 50MB size limit) exists only in the client-side component. The corresponding server action `addAsset()` does not re-validate file type, size, or content. An attacker calling the server action directly can bypass all client-side validation.
- **Impact**: Upload of any file type/size by calling the server action directly, bypassing the UI restrictions.

---

### BUG-253 — ExportReportButton: No Role Check on getExportData Server Action
- **File**: `lib/exportActions.ts`, lines 1–60; `components/dashboard/ExportReportButton.tsx`
- **Severity**: HIGH
- **Description**: The `getExportData()` server action queries transactions, invoices, tasks, and projects for the entire agency with only `agencyId` filtering. There is no role check — any authenticated user (including employees and clients) can call this server action and export all financial data.
- **Impact**: Employees and clients can export complete financial reports (income, expenses, invoices) for the entire agency, exposing sensitive business data.

---

### BUG-254 — EmployeeTasksList: IDOR via userId Parameter
- **File**: `components/dashboard/EmployeeTasksList.tsx`, line 41
- **Severity**: HIGH
- **Description**: The component calls `getUserTasks(userId, offset, 5)` where `userId` is passed as a prop. Since `getUserTasks()` in `lib/actions.ts` has no authorization check verifying the caller is the same user, any user can fetch tasks for any other user by modifying the component props or calling the server action directly.
- **Impact**: IDOR — any authenticated user can view tasks assigned to any other user in the agency.

---

### BUG-255 — ClientNotificationsList: IDOR via userId Parameter
- **File**: `components/dashboard/ClientNotificationsList.tsx`, line 32
- **Severity**: HIGH
- **Description**: `getNotifications(userId, offset, 5)` is called with a userId prop. The server action `getNotifications()` does not verify the caller matches the requested userId, enabling any user to read another user's notifications.
- **Impact**: IDOR — any authenticated user can read notifications meant for other users.

---

### BUG-256 — Chat System: No Ownership Verification on deleteConversation
- **File**: `components/dashboard/messages/MessagesPageClient.tsx`, line ~80; `lib/chat.ts`
- **Severity**: HIGH
- **Description**: `deleteConversation(currentUserId, targetId)` takes `currentUserId` as a parameter from the client. If the server action doesn't verify the caller's identity independently (using session), an attacker can delete conversations belonging to other users by spoofing the `currentUserId` parameter.
- **Impact**: Any user can delete any other user's conversation history.

---

### BUG-257 — Chat System: sendMessage Accepts Arbitrary senderId
- **File**: `lib/chat.ts`, `sendMessage()` function
- **Severity**: HIGH  
- **Description**: `sendMessage(currentUserId, activeContactId, content)` accepts the sender ID as a parameter from the client component. If the server action doesn't independently verify the caller's identity from the session, an attacker can impersonate any user by passing their ID as `currentUserId`.
- **Impact**: Message spoofing — attacker can send messages appearing to come from any user.

---

### BUG-258 — ProjectSettingsModal: Plaintext Password in Client Component State
- **File**: `components/projects/ProjectSettingsModal.tsx`
- **Severity**: HIGH
- **Description**: When creating a new client inline, the component stores the password in React state as `{ password: "" }`. This value is sent to the `createClient()` server action. If the server action stores this without hashing, the password would be stored in plaintext. Even if hashed server-side, the password travels through React state and network in cleartext (mitigated by HTTPS but visible in React DevTools).
- **Impact**: Password may be stored in plaintext if server action doesn't hash. Password visible in React DevTools memory.

---

### BUG-259 — OTP Generation Uses Math.random() (Not Cryptographically Secure)
- **File**: `app/api/signup/send-otp/route.ts`
- **Severity**: HIGH
- **Description**: OTP codes for signup verification are generated using `Math.random()`, which is not cryptographically secure. The output is predictable if the internal state can be determined, and it has insufficient entropy for security-critical tokens.
- **Impact**: An attacker who can observe multiple OTPs may predict future OTPs, enabling account creation with unverified email addresses.
- **Fix**: Use `crypto.randomInt()` from Node.js `crypto` module.

---

### BUG-260 — OTP Store is In-Memory (Not Persistent, Race Condition)
- **File**: `app/api/signup/send-otp/route.ts`
- **Severity**: HIGH
- **Description**: OTPs are stored in an in-memory `Map`. In a multi-instance/serverless deployment (common with Next.js on Vercel/containers), the instance that generated the OTP may not be the one that verifies it, causing all OTP verifications to fail. Additionally, the Map grows unboundedly if OTPs are never cleaned up.
- **Impact**: OTP verification fails in production with multiple instances. Memory leak from accumulated OTP entries.

---

## MEDIUM SEVERITY

---

### BUG-261 — Contact Form API: No Rate Limiting / No CAPTCHA
- **File**: `app/api/contact-dc/route.js`
- **Severity**: MEDIUM
- **Description**: The contact form submission endpoint has no rate limiting, no CAPTCHA, and no spam protection. An attacker can submit thousands of contact form entries, flooding the database and potentially the notification/email system.
- **Impact**: Spam/abuse vector. Database pollution. If contact submissions trigger emails, this becomes an email bombing vector.

---

### BUG-262 — Category API DELETE: MongoDB _id Used Directly from User Input
- **File**: `app/api/category/route.js`, DELETE handler
- **Severity**: MEDIUM
- **Description**: The DELETE endpoint reads `id` directly from URL search parameters and passes it to `Category.findByIdAndDelete(id)`. While Mongoose's `findByIdAndDelete` expects a valid ObjectId (and will reject invalid formats), the input is not explicitly validated before the database call.
- **Impact**: Potential for unexpected errors or edge cases with malformed IDs. Combined with the hardcoded auth token (BUG-246), any unauthenticated user can delete categories.

---

### BUG-263 — PayrollManager: No Component-Level Role Verification
- **File**: `components/finance/PayrollManager.tsx`
- **Severity**: MEDIUM
- **Description**: The PayrollManager component has no local role check. It relies entirely on the parent `FinanceContent.tsx` to restrict access. If the component were rendered in a different context or the server action `payEmployee()` lacks role checks, any user could trigger payroll payments.
- **Impact**: If `payEmployee()` server action lacks role checks, any authenticated user could trigger salary payments.

---

### BUG-264 — PayrollManager: Sequential N+1 Payroll Processing
- **File**: `components/finance/PayrollManager.tsx`, `handlePayAll` function
- **Severity**: MEDIUM
- **Description**: The "Pay All" function processes payroll sequentially in a loop (`for...of` with `await payEmployee()`). If one payment fails mid-way, some employees are paid and others are not, with no rollback mechanism. This is a partial-failure business logic bug.
- **Impact**: Inconsistent payroll state — some employees paid, others not, with no transaction rollback.

---

### BUG-265 — AgencyTable: Client-Side confirm()/prompt() for Destructive Operations
- **File**: `components/super-admin/AgencyTable.tsx`
- **Severity**: MEDIUM
- **Description**: Agency deletion uses `prompt()` for password confirmation and `confirm()` for suspension. These are client-side-only guards that can be programmatically bypassed. While the server action `deleteAgency()` does verify the password server-side, `suspendAgency()` has no such verification.
- **Impact**: Suspension of agencies can be triggered without meaningful confirmation. The client-side guards provide a false sense of security.

---

### BUG-266 — Super Admin Settings Page: UI-Only, No Backend Persistence
- **File**: `app/super-admin/settings/page.tsx`
- **Severity**: MEDIUM
- **Description**: The System Settings page has input fields and "Save Changes" buttons, but `handleSave()` only shows a "Saved!" label without making any API call or server action call. Settings changes are entirely cosmetic and never persisted.
- **Impact**: Admin believes settings are saved when they are not. All changes are lost on page refresh. This is a functional bug that could lead to misconfiguration.

---

### BUG-267 — Footer Email Form: Non-Functional Newsletter Subscription
- **File**: `components/marketing/footer.jsx`
- **Severity**: MEDIUM
- **Description**: The footer contains an email input field and "SEND" button for newsletter subscription, but the button has no `onClick` handler, no form submission, and no API integration. The email input collects data that goes nowhere.
- **Impact**: Users believe they've subscribed when they haven't. Potential privacy issue if the browser auto-fills the field.

---

### BUG-268 — ConfirmModal: Enter Key Auto-Confirms Destructive Actions
- **File**: `components/marketing/ConfirmModal.jsx`, lines 21–24
- **Severity**: MEDIUM
- **Description**: The ConfirmModal registers a global `keydown` handler for Enter that calls `onConfirm()`. If a user has a delete confirmation modal open and presses Enter accidentally (e.g., while typing in another field), the destructive action is confirmed without explicit click.
- **Impact**: Accidental data deletion via keyboard, especially when the modal is triggered during typing workflows.

---

### BUG-269 — CreateBlogForm: Image Upload via Unauthenticated Endpoint
- **File**: `app/(marketing)/admin/create/page.js`, lines 141–150
- **Severity**: MEDIUM
- **Description**: Blog image upload calls `/api/upload` (the unauthenticated upload endpoint from BUG-243). Even though the blog creation form is behind marketing admin auth, the upload endpoint itself is publicly accessible. The form also sends the upload before checking if the blog creation will succeed.
- **Impact**: Resources wasted on uploads that may not be used. The unauthenticated upload endpoint is the primary issue (BUG-243).

---

### BUG-270 — Marketing Admin Page: Fetches API at `/api/auth/me` but Route is at `/api/auth-dc/me`
- **File**: `app/(marketing)/admin/page.js`, line 62
- **Severity**: MEDIUM
- **Description**: The admin page checks authentication by calling `fetch('/api/auth/me')`, but the actual API route is at `/api/auth-dc/me/route.js`. This path mismatch means the auth check may be hitting a non-existent endpoint (404), which is treated as "not authenticated" — potentially causing the admin to always see the login form even when authenticated, OR if there's a main app auth endpoint at `/api/auth/me`, it could validate against the wrong system.
- **Impact**: Authentication check may always fail or validate against the wrong auth system.

---

### BUG-271 — Blog Delete Uses confirm() — No Server-Side Revalidation
- **File**: `app/(marketing)/admin/page.js`, line ~186
- **Severity**: MEDIUM
- **Description**: Blog deletion uses `confirm('Are you sure...')` client-side, then calls `DELETE /api/blog/${id}`. The client-side `confirm()` can be bypassed programmatically. The fetched `id` goes directly into the URL without validation.
- **Impact**: Blogs can be deleted without meaningful user confirmation. The `id` parameter should be validated as a valid ObjectId.

---

### BUG-272 — Login Action Returns User Object Including Password Hash
- **File**: `lib/actions/auth.ts`, lines 19–44
- **Severity**: MEDIUM
- **Description**: The `login()` function in `lib/actions/auth.ts` returns the full user object (`{ success: true, user: superAdmin }`) which includes the password hash. This hash is sent to the client and may appear in browser dev tools/network tab.
- **Impact**: Password hash exposure. While bcrypt hashes are computationally expensive to crack, exposing them is unnecessary and violates the principle of least privilege.

---

### BUG-273 — getCurrentUser: Returns User Object Without Redacting Sensitive Fields for Admin
- **File**: `lib/actions/auth.ts`, lines 55–65
- **Severity**: MEDIUM
- **Description**: For admin/manager users, `getCurrentUser()` returns the full `targetUser` object without redacting `password`. For non-admin users, `salary` is redacted but `password` hash is still present in the spread.
- **Impact**: Password hash may leak to client components that receive the current user object.

---

### BUG-274 — Login Rate Limiting is In-Memory (Ineffective in Serverless)
- **File**: `lib/auth.ts`, lines 10–20
- **Severity**: MEDIUM
- **Description**: Login rate limiting uses an in-memory `Map`. In serverless environments (Vercel, etc.), each request may hit a different instance with its own `Map`, making the rate limit ineffective. An attacker can circumvent the limit by spreading requests across instances.
- **Impact**: Login brute-force attacks are not reliably prevented in production serverless deployments.

---

### BUG-275 — Legacy Cookies Set Alongside JWT
- **File**: `lib/auth.ts`, `login()` function, lines 77–79
- **Severity**: MEDIUM
- **Description**: The `login()` function sets `userId` and `userRole` as separate cookies alongside the JWT. While these are HTTP-only, they could be used by legacy code paths that trust these cookies without verifying the JWT, creating an authentication bypass if any endpoint reads `userId` from cookies directly.
- **Impact**: If any code reads `userId` from cookies instead of verifying the JWT, attackers could forge identity by setting these cookies manually.

---

### BUG-276 — Password Validation Too Weak
- **File**: `lib/validation.ts`, `validatePassword()`, lines 80–87
- **Severity**: MEDIUM
- **Description**: Password validation requires only 6 characters with 1 letter and 1 number. No requirement for uppercase, special characters, or length > 8. This allows extremely weak passwords like `a1aaaa` or `123abc`.
- **Impact**: User accounts are vulnerable to dictionary attacks and brute force. Industry standard minimum is 8+ characters with complexity requirements.

---

### BUG-277 — sanitizeUrl Allows data: URIs Without Content Validation
- **File**: `lib/validation.ts`, `sanitizeUrl()`, lines 111–118
- **Severity**: MEDIUM
- **Description**: The URL sanitizer allows `data:` URIs, intended for logo images. However, `data:text/html;base64,...` can contain full HTML with JavaScript, enabling XSS if the URL is used in an `<img>` tag's `onerror` handler or as an `<iframe>` src.
- **Impact**: XSS via crafted data: URIs in fields sanitized by `sanitizeUrl()`.

---

### BUG-278 — Heartbeat Function Accepts Arbitrary userId
- **File**: `lib/chat.ts`, `heartbeat()` function
- **Severity**: MEDIUM
- **Description**: The `heartbeat(userId)` server action accepts any user ID and updates `lastActiveAt` for that user/client. There is no verification that the caller matches the provided `userId`. An attacker can update the "last active" timestamp for any user to manipulate online status indicators.
- **Impact**: Online presence spoofing — making users appear online/offline.

---

### BUG-279 — getContacts Loads All Users and Clients into Memory
- **File**: `lib/chat.ts`, `getContacts()` function
- **Severity**: MEDIUM
- **Description**: `getContacts()` loads ALL users, ALL clients, and ALL messages for the current user into memory with three parallel queries. For agencies with thousands of users/messages, this causes excessive memory usage and slow response times.
- **Impact**: Memory exhaustion and performance degradation at scale. Potential DoS vector.

---

### BUG-280 — SuperAdminTopbar: Agency ID Stored in Non-HttpOnly Cookie
- **File**: `components/super-admin/SuperAdminTopbar.tsx`
- **Severity**: MEDIUM
- **Description**: When a super admin selects an agency from the switcher, the `selectedAgencyId` is stored in a cookie. If this cookie is not HTTP-only, it's readable by client-side JavaScript and could be modified to access a different agency's data.
- **Impact**: If server-side logic trusts this cookie without JWT verification, a super admin could potentially view data from agencies they shouldn't access.

---

## LOW SEVERITY

---

### BUG-281 — ClientProjectsList: Comment in Source Reveals Architecture Reasoning
- **File**: `components/dashboard/ClientProjectsList.tsx`, lines 29–31
- **Severity**: LOW
- **Description**: Source code comment explains internal architecture: "Note: getProjects checks for client role internally via CurrentUser, but here we call it from client side? Actually Server Actions called from Client Components run on Server..." This leaks implementation details about auth flow.
- **Impact**: Information disclosure — helps attackers understand which functions rely on which auth mechanisms.

---

### BUG-282 — Blog [slug] Page: Allows ObjectId-Based Lookup as Fallback
- **File**: `app/(marketing)/blog/[slug]/page.jsx`, line 17
- **Severity**: LOW
- **Description**: The blog detail page tries slug lookup first, then falls back to `Blog.findById(slug)` if the slug looks like a MongoDB ObjectId (`/^[0-9a-fA-F]{24}$/.test(slug)`). This exposes internal document IDs in URLs and allows enumeration of blogs via sequential ObjectIds.
- **Impact**: Information disclosure — internal MongoDB ObjectIds exposed. Enables blog enumeration.

---

### BUG-283 — Testimonial Section: Client-Side Fetch Without Error Boundary
- **File**: `components/marketing/testomonial.jsx`
- **Severity**: LOW
- **Description**: The testimonial section fetches from `/api/testimonial?status=active` on mount. If the API is down, the component silently returns `null`, hiding the entire section without user feedback. No error boundary wraps this component.
- **Impact**: Poor user experience — section silently disappears on API errors with no indication.

---

### BUG-284 — TeamSlider: Employee Names/Roles/Photos Hardcoded in Source
- **File**: `components/marketing/teamSlider.jsx`, lines 9–18
- **Severity**: LOW
- **Description**: Real employee names, job titles, and photo filenames are hardcoded in the component source code. This data is bundled into the client JavaScript and visible to anyone viewing the source.
- **Impact**: Personal information exposure — employee names, roles, and photos are accessible in the JS bundle. If employees leave, the data remains in version control history.

---

### BUG-285 — Footer: Hardcoded Phone Number and Email
- **File**: `components/marketing/footer.jsx`
- **Severity**: LOW
- **Description**: Personal phone number (`+91-8003177679`) and email (`flytheraven@digitalcorvids.com`) are hardcoded in the footer. These should come from CMS or environment variables for easy updates and to avoid committing PII to source control.
- **Impact**: Contact information changes require code deployment. PII in version control.

---

### BUG-286 — Navigation: Client-Side Auth Check via Cookie Parsing
- **File**: `components/marketing/Navigation.js`, line 31
- **Severity**: LOW
- **Description**: The navigation component checks if the user is logged in by parsing `document.cookie` for a `logged_in=` cookie. This is a non-httponly cookie set during login. This determines whether to show "Dashboard" or "Login" button. While not a security vulnerability (the cookie is just a boolean indicator), an attacker can set `logged_in=1` to see the Dashboard link, though they'd still need valid auth to access the dashboard.
- **Impact**: Minor UI inconsistency possible. No security impact since the dashboard verifies auth server-side.

---

### BUG-287 — Singularity Layout: Direct DOM Manipulation in Client Component
- **File**: `app/dashboard/singularity/layout.tsx`, lines 10–16
- **Severity**: LOW
- **Description**: The Singularity layout directly modifies `document.body.style.backgroundColor` in a `useEffect`. This is a React anti-pattern that can cause style leaks if cleanup doesn't fire (e.g., error boundary catch) and conflicts with other components modifying the same property.
- **Impact**: Potential style leaking after navigating away from Singularity if cleanup doesn't run. Cosmetic bug.

---

### BUG-288 — DashboardContent: Implicit Type Coercion with `as any`
- **File**: `components/dashboard/DashboardContent.tsx`, multiple lines
- **Severity**: LOW
- **Description**: Extensive use of `as any` type casts (`const dashboardUser = user as any`, `(t as any).dueDate`, `(t as any).createdAt`) throughout the dashboard component. This defeats TypeScript's type safety and can mask runtime errors.
- **Impact**: Potential runtime errors from accessing non-existent properties. Maintenance burden.

---

### BUG-289 — RecentActivityList: Inferred Navigation Links from Action Text
- **File**: `components/dashboard/RecentActivityList.tsx`, `buildActivityLink()` function
- **Severity**: LOW
- **Description**: Activity links are inferred by matching keywords in `activity.action.toLowerCase()` (e.g., checking for "task", "invoice", "project"). This fragile string matching can break if action text changes or contains unexpected keywords, linking to wrong pages.
- **Impact**: Incorrect navigation — clicking an activity may link to the wrong dashboard section.

---

### BUG-290 — UrgentTasksList: Potential Duplicate Loading with loadingRef and State
- **File**: `components/dashboard/UrgentTasksList.tsx`, lines 34–37
- **Severity**: LOW
- **Description**: Uses both `loadingRef` and `loading` state to prevent duplicate loads, but the `useEffect` dependency array includes `inView` which triggers on every intersection change. If `inView` toggles rapidly (scroll jitter), the guard may not prevent all duplicate calls due to React's batching behavior.
- **Impact**: Potential double-loading of tasks, causing duplicates in the list (mitigated by the `existingIds` Set on line 45).

---

## INFO SEVERITY

---

### BUG-291 — bcrypt Salt Rounds Inconsistent Across Codebase
- **File**: Multiple files
- **Severity**: INFO
- **Description**: Different parts of the codebase use different bcrypt salt rounds: `bcrypt.genSalt(10)` in `lib/auth.ts`, `bcrypt.hash(password, 12)` in `app/api/signup/route.ts`, `bcrypt.hash(password, 10)` in `lib/actions/super-admin.ts`. While all are acceptable, inconsistency makes it harder to audit.
- **Impact**: No direct security impact; maintenance/consistency concern.

---

### BUG-292 — No CSP (Content Security Policy) Headers
- **File**: `next.config.ts`
- **Severity**: INFO
- **Description**: No Content Security Policy headers are configured in `next.config.ts` or middleware. CSP would mitigate the impact of XSS vulnerabilities (BUG-249, BUG-250) by restricting script execution sources.
- **Impact**: XSS vulnerabilities have maximum impact without CSP mitigation.

---

### BUG-293 — No Security-Focused ESLint Plugins
- **File**: `eslint.config.mjs`
- **Severity**: INFO
- **Description**: The ESLint configuration only uses `@next/next` core-web-vitals and TypeScript plugins. No security-focused plugins like `eslint-plugin-security`, `eslint-plugin-no-unsanitized`, or `@microsoft/eslint-plugin-sdl` are configured.
- **Impact**: Security issues are not caught during development/CI. Adding security eslint plugins would catch many issues at lint time.

---

### BUG-294 — Dual Auth Systems with No Shared Security Model
- **File**: `lib/auth.ts` (JWT) vs `lib/authMiddleware.js` (hardcoded cookie)
- **Severity**: INFO
- **Description**: The application has two completely separate authentication systems: the main app uses JWT via jose with proper session management, while the marketing admin uses a static hardcoded cookie value. The marketing system has none of the security measures of the main system (no rate limiting, no password hashing, no session expiry).
- **Impact**: The marketing auth system is an entire attack surface with no shared security controls. It should be unified with the main auth system.

---

### BUG-295 — Server Actions Body Size Limit Set to 10MB
- **File**: `next.config.ts`, line 5
- **Severity**: INFO
- **Description**: `serverActions.bodySizeLimit` is set to `'10mb'`, which is significantly larger than the default 1MB. This allows large payloads to be sent to any server action, increasing the attack surface for DoS.
- **Impact**: Larger request bodies mean more memory and processing per request, amplifying DoS potential.

---

### BUG-296 — Console Logs Only Removed in Production
- **File**: `next.config.ts`, lines 8–9
- **Severity**: INFO
- **Description**: `compiler.removeConsole` is only active when `NODE_ENV === "production"`. In staging or preview deployments that don't set this, console logs with potentially sensitive debug information will appear in user browsers.
- **Impact**: Information disclosure in non-production environments via browser console.

---

### BUG-297 — auth_token Cookie Not Secure in Development
- **File**: `lib/auth.ts`, line 74
- **Severity**: INFO
- **Description**: The `secure` flag on the auth cookie is only set when `process.env.NODE_ENV === "production"`. In development/staging, the cookie is sent over HTTP, allowing interception on shared networks.
- **Impact**: Session token can be intercepted in non-production environments over HTTP.

---

### BUG-298 — Blog Page: Content Truncation for Excerpt Uses Character Count, Not Word Boundary
- **File**: `app/(marketing)/blog/page.jsx`, `truncate()` function
- **Severity**: INFO
- **Description**: The `truncate()` function cuts text at exactly 150 characters, potentially mid-word or mid-HTML-entity, creating broken display text.
- **Impact**: Display issues — truncated words or incomplete HTML entities in blog excerpts.

---

### BUG-299 — ProfileModal: Weak Client-Side Password Validation
- **File**: `components/layout/ProfileModal.tsx`
- **Severity**: INFO
- **Description**: The profile modal's password validation requires only 8 chars, 1 uppercase, and 1 number. This is different from the server-side validation in `validation.ts` which requires 6 chars, 1 letter, and 1 number. The mismatch means the client rejects passwords the server would accept, and vice versa.
- **Impact**: Inconsistent validation behavior — user confusion when passwords accepted in one form are rejected in another.

---

### BUG-300 — Topbar Global Search: Query Sent Without Sanitization
- **File**: `components/layout/Topbar.tsx`
- **Severity**: INFO
- **Description**: The global search calls `globalSearch(query)` with raw user input. While server-side MongoDB queries with Mongoose should handle injection, the search query is not sanitized for special regex characters that could cause ReDoS if the server uses regex-based search.
- **Impact**: Potential ReDoS if the server action uses the query in a regex without escaping.

---

### BUG-301 — ClientDashboard: Renders clientId Prop Without Validation
- **File**: `components/dashboard/ClientDashboard.tsx`
- **Severity**: INFO
- **Description**: The `ClientDashboard` component receives `clientId` as a prop and passes it to child components. While not directly exploitable (data comes from server), if the component were ever rendered with user-controlled props, it could lead to IDOR.
- **Impact**: Architectural concern — sensitive IDs passed as props should be verified server-side.

---

### BUG-302 — ExportReportButton: Date Range Not Server-Validated
- **File**: `lib/exportActions.ts`, `getExportData()`
- **Severity**: INFO
- **Description**: The `startDate` and `endDate` parameters are received as strings from the client. While they are used in MongoDB date comparisons (which handle string format safely), there is no validation that the dates are valid or that the range is reasonable (e.g., not requesting 10 years of data).
- **Impact**: Potential DoS by requesting very large date ranges, causing the database to scan and return excessive data.

---

### BUG-303 — Marketing Auth API Path Inconsistency
- **File**: `app/api/auth-dc/` vs `app/(marketing)/admin/page.js`
- **Severity**: INFO
- **Description**: The API routes are at `/api/auth-dc/login` and `/api/auth-dc/me`, but the admin page fetches `/api/auth/me` and `/api/auth/login` (without the `-dc` suffix). This is likely a routing alias or the paths resolve differently, but the inconsistency makes the codebase confusing.
- **Impact**: Potential for requests to hit wrong endpoints or 404 errors.

---

### BUG-304 — Super Admin Layout: Redirect Loop Risk
- **File**: `app/super-admin/layout.tsx`, `components/layout/AuthenticatedLayout.tsx`
- **Severity**: INFO
- **Description**: `AuthenticatedLayout` redirects super admins to `/super-admin`, and `SuperAdminLayout` redirects non-super-admins to `/dashboard`. If a user's role is ambiguous or changes mid-session, this could create a redirect loop.
- **Impact**: Potential infinite redirect for edge-case users whose role is in a transitional state.

---

### BUG-305 — DashboardChatProvider: Wraps Dashboard Without Checking User Auth
- **File**: `components/providers/DashboardChatProvider.tsx`
- **Severity**: INFO
- **Description**: The DashboardChatProvider wraps all dashboard content and accepts `currentUserId` as a prop. It initializes chat functionality (polling, heartbeat) even if the userId is invalid or the user doesn't have chat permissions.
- **Impact**: Unnecessary network requests (heartbeats) for users who shouldn't use chat.

---

### BUG-306 — getAgencyDetails Returns Full User Objects Including Passwords
- **File**: `lib/actions/super-admin.ts`, `getAgencyDetails()`, line ~88
- **Severity**: MEDIUM
- **Description**: `getAgencyDetails()` fetches all users for an agency with `UserModel.find({ agencyId }).lean()` and returns them directly. This includes password hashes in the response. The `toSerializable()` helper only strips `_id` and `__v`, not `password`.
- **Impact**: Password hashes for all users in an agency are sent to the super admin's browser.

---

### BUG-307 — createAgency: bcrypt Rounds Set to 10 (Below Signup's 12)
- **File**: `lib/actions/super-admin.ts`, `createAgency()`, line ~238
- **Severity**: INFO
- **Description**: When creating an agency owner, the password is hashed with `bcrypt.hash(data.ownerPassword, 10)` while the signup flow uses 12 rounds. The lower round count slightly reduces brute-force resistance.
- **Impact**: Minor inconsistency. 10 rounds is still acceptable but less secure than 12.

---

### BUG-308 — suspendAgency Has No Password Confirmation
- **File**: `lib/actions/super-admin.ts`, `suspendAgency()`, lines 282–297
- **Severity**: MEDIUM
- **Description**: Unlike `deleteAgency()` which requires password confirmation, `suspendAgency()` only verifies super admin role. An XSS attack or CSRF targeting a super admin could suspend all agencies without additional confirmation.
- **Impact**: Agency suspension is a significant business disruption that should require additional confirmation.

---

### BUG-309 — updateAgencyPlan Can Activate Suspended Agencies
- **File**: `lib/actions/super-admin.ts`, `updateAgencyPlan()`, line ~370
- **Severity**: MEDIUM
- **Description**: When upgrading to a paid plan (`plan !== 'free'`), the function automatically sets `status: 'active'`. This means a suspended agency can be reactivated simply by changing its plan, bypassing the intentional suspension.
- **Impact**: Suspended agencies can be accidentally or deliberately reactivated via plan change, circumventing administrative actions.

---

### BUG-310 — Chat Module: markAsRead Takes userId from Client Without Verification
- **File**: `components/dashboard/messages/MessagesPageClient.tsx`, line ~36
- **Severity**: MEDIUM
- **Description**: `markAsRead(currentUserId, activeContactId)` is called with `currentUserId` from a prop, not from the authenticated session. If the server action doesn't independently verify the caller's identity, an attacker can mark any user's messages as read.
- **Impact**: An attacker can mark another user's unread messages as read, causing them to miss important notifications.

---

## SUMMARY

| Severity | Count |
|----------|-------|
| CRITICAL | 7     |
| HIGH     | 12    |
| MEDIUM   | 20    |
| LOW      | 10    |
| INFO     | 20    |
| **TOTAL**| **69**|

### Top Priority Fixes:
1. **BUG-242**: Remove `env` block from `next.config.ts` immediately — this exposes JWT_SECRET and MONGODB_URI to browsers
2. **BUG-246/247/248**: Replace marketing auth system entirely — hardcoded cookies, plaintext passwords, and race-condition admin seeding
3. **BUG-243/244/245**: Add auth + file validation + path sanitization to upload endpoint
4. **BUG-249/250**: Sanitize blog content before storage and rendering (use DOMPurify or similar)
5. **BUG-253/254/255/256/257**: Add server-side auth verification to all server actions accepting userId parameters
