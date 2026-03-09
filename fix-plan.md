# AGENCY OS — VERIFIED BUG FIX PLAN
## Prioritized, Grouped, and Ordered for Resolution

---

## ⚠️ MANDATORY FIX RULES — READ BEFORE EVERY FIX

> **These rules are NON-NEGOTIABLE. Read them EVERY TIME before starting any bug fix.**

### Rule 1: Zero Breakage Policy
- **No fix may break any existing feature, page, API route, or functionality.**
- Before applying a fix, understand what the current code does and why it exists.
- If a piece of code looks wrong but the feature works, investigate further before changing it.
- After fixing, verify the affected feature still works end-to-end.

### Rule 2: Full Scope Audit Before Fixing
- **If a bug exists in one place, assume it exists everywhere.**
- Before fixing a bug, search the ENTIRE codebase for the same pattern (e.g., if one server action lacks auth, check ALL server actions).
- Collect every instance first, then fix them all together in one pass.
- Never fix one occurrence and leave identical issues elsewhere — that creates inconsistency.

### Rule 3: Consequence Analysis
- **Before making ANY change, trace all downstream effects.**
- Ask: "What calls this function? What depends on this return value? What breaks if I change this signature?"
- Check imports, callers, components, API consumers, and tests.
- If fixing a security bug changes a function's return shape (e.g., stripping password hash), verify every consumer handles the new shape.
- If adding `requireAuth()` to a function, verify it's not called during SSR/build where no session exists.

### Rule 4: Full Context Awareness
- **Read and understand every file you touch — not just the bug line.**
- Read the entire function, the entire file's imports/exports, and the components that use it.
- Understand the feature's purpose, the user roles involved, and the expected behavior.
- Never make blind or pattern-based edits without understanding the surrounding code.

### Rule 5: Verify Then Report
- **After fixing, confirm the code is correct by reading the changed files.**
- Check for syntax errors, import issues, and logical correctness.
- Provide the user with clear verification steps:
  - Which pages/features to test manually
  - What behavior to expect before vs. after the fix
  - Any specific user roles or scenarios to test
- Only mark a bug as fixed after verification passes.

### Rule 6: Ask Before Assuming
- **If a fix requires user input, a design decision, or could go multiple ways — ASK first.**
- Examples that require asking:
  - Choosing between two valid approaches (e.g., block vs. redirect on unauthorized access)
  - Removing a feature vs. securing it
  - Changing user-facing behavior or error messages
  - Modifying database schemas or adding new fields
  - Any change visible to end users
- Never guess the user's preference — pause and ask.

### Rule 7: Mark Fixed in This File
- **After confirming a fix, update this file immediately.**
- Add `✅ FIXED` next to the bug number in the relevant group.
- Add the date and a one-line summary of what was changed.
- Example: `BUG-058 ✅ FIXED (2026-03-09) — Removed env block from next.config.ts`

### Rule 8: Small Batches Only
- **Fix only what you can fully verify in one session.**
- Do NOT fix 20 bugs at once — fix 1-3 related bugs, verify them, then move on.
- Group fixes by the file they touch (e.g., all `next.config.ts` fixes together).
- If a group is too large (like Group 3A with 86 functions), break it into sub-batches of 5-10 functions.

### Rule 9: Never Skip Error Handling
- **When adding auth checks or validation, always handle the failure case gracefully.**
- Return proper error messages — don't just throw unhandled exceptions.
- Ensure the UI can handle auth rejection responses (redirect to login, show error toast, etc.).
- Match the error handling pattern already used in the codebase.

### Rule 10: Preserve Existing Patterns
- **Follow the codebase's existing conventions, not ideal best practices.**
- If the codebase uses `requireRole('admin', 'manager')` — use that, not a custom solution.
- If errors are returned as `{ error: 'message' }` — follow that pattern, don't switch to throwing.
- Consistency with existing code is more important than theoretical perfection.

### Rule 11: Document Risky Fixes
- **If a fix touches auth, payments, or data deletion — add a comment in this file explaining exactly what changed and why.**
- This creates a paper trail for future debugging.
- Include: what was before, what was changed, and what to watch for.

### Rule 12: Fix Globally, Never Partially
- **If a bug pattern exists in 10 places, fixing it in 1 place is NOT acceptable.**
- Before writing a single line of fix code, grep/search the entire project for every occurrence of the same pattern.
- Collect ALL instances (every route, page, action, component, API handler) into a list.
- Fix ALL of them in one batch — a partial fix is worse than no fix because it creates a false sense of security.
- Examples:
  - If adding `requireAuth()` to one server action, add it to ALL server actions that lack it.
  - If sanitizing input in one API route, sanitize ALL API routes that accept input.
  - If fixing a password hash leak in one function, check EVERY function that returns user data.
- After fixing, re-search to confirm zero remaining instances of the vulnerable pattern.

### Rule 13: No Temporary or Workaround Fixes
- **Every fix must be permanent and production-grade.**
- No TODO comments like "fix this properly later" — fix it properly NOW.
- No quick patches that only cover one code path while leaving others exposed.
- If the proper fix is too large for one session, document the full scope in this file and fix it in planned sub-batches — but never ship a half-fix.

---

### VERIFICATION SUMMARY

| Status | Count |
|--------|-------|
| **Verified (unique)** | 208 |
| **Duplicates removed** | 48 |
| **False positives removed** | 11 |
| **Needs manual check (kept)** | 28 |
| **Original total** | 295 |

### REMOVED — FALSE POSITIVES (11 bugs that don't exist)

| Bug | Why It's False |
|-----|----------------|
| BUG-005 | `getSessionId()` legacy cookie fallback was already removed. Code comment: "Only accept JWT — legacy cookie fallback removed for security" |
| BUG-080 | `getSessionId()` only reads JWT now — not legacy auth. Works correctly. |
| BUG-131 | Standard shadcn/ui export pattern. No actual duplicate. |
| BUG-239 | Dead hardcoded label in a non-functional placeholder settings page. Not a real bug. |
| BUG-279 | Code uses `$unset: { aiConfig: '' }` NOT `SettingsModel.deleteOne()`. Only removes aiConfig field correctly. |
| BUG-283 | Speculative — says "May contain" without confirming. Build files may not have sensitive data. |
| BUG-286 | Speculative — says "Should verify" without checking actual robots.txt content. |
| BUG-289 | FALSE — History API route HAS auth (`getSessionUser()`) AND IDOR protection (checks session ownership). |
| BUG-290 | FALSE — Checkpoint API route HAS auth AND `verifySessionOwnership()` helper. |
| BUG-259 (partial) | "Legacy auth" claim is wrong — getSessionId() is JWT-only. Data-before-redirect concern is borderline. |
| BUG-273 | `logged_in` cookie is intentionally not httpOnly by design (UI login indicator, value is just "1"). |

### REMOVED — DUPLICATES (48 bugs that are repeats)

| Duplicate | Keep Instead | Reason |
|-----------|-------------|--------|
| BUG-242 | BUG-058 | Same: next.config.ts env exposes secrets |
| BUG-243, 244, 245 | BUG-023 | Same: Upload API auth/validation/size |
| BUG-246 | BUG-024 | Same: Upload path traversal |
| BUG-248, 249 | BUG-006 | Same: In-memory rate limiting |
| BUG-250 | BUG-025 | Same: Contact form no rate limiting |
| BUG-251 | BUG-026 | Same: Contact form no sanitization |
| BUG-252 | BUG-027 | Same: Blog POST raw body |
| BUG-253 | BUG-029 | Same: Category raw body |
| BUG-258 | BUG-030 | Same: Singularity logs user-supplied userId |
| BUG-263 | BUG-082 | Same: Suspend password not verified |
| BUG-280 | BUG-127 | Same: Base64 logo in DB |
| BUG-292 | BUG-064 | Same: 10MB body size limit |
| BUG-203 | BUG-001 | Same: Hardcoded marketing cookie |
| BUG-206, 136 | Keep 136 | Same: Hardcoded sender email |
| BUG-118 | BUG-074 | Same: Separate marketing DB connection |
| BUG-221 | BUG-078 | Same: Super-admin settings non-functional |
| BUG-223, 224 | BUG-088 | Same: window.location.reload |
| BUG-225 | BUG-084 | Same: Analytics division by zero |
| BUG-226 | BUG-120 | Same: Blog XSS |
| BUG-227 | BUG-122 | Same: SingularityChat regex bypass |
| BUG-228 | BUG-156 | Same: FinanceContent component-level role check |
| BUG-238 | BUG-082 | Same: Suspend password collected not verified |
| BUG-240 | BUG-155 | Same: Sidebar security by obscurity |
| BUG-076 | BUG-268 | Same: No CSRF protection |
| BUG-015 | BUG-140 | Subset: getAllUsers/getAllClients part of systemic RBAC |
| BUG-016 | BUG-140 | Subset: getRecentActivity part of systemic RBAC |
| BUG-086 | BUG-141 | Subset: Page access part of systemic page auth |
| BUG-154 | BUG-141 | Restates: AuthenticatedLayout no role mapping |
| BUG-210, 211, 212, 215, 216 | BUG-141 | Instances: Settings/Clients/Team pages part of systemic page auth |
| BUG-150 | BUG-217 | Same: Salary client-side visibility |
| BUG-151 | BUG-032 | Same: getUserRole no agency scoping |
| BUG-152, 172 | BUG-146 | Subset: Financial functions lack role checks |
| BUG-177 | BUG-153 | Same: getClientFinancialSummary no role check |

---

## PRIORITIZED FIX PLAN — GROUPED BY AREA

Fixes are ordered: **PRIORITY 1 (fix immediately)** → **PRIORITY 5 (fix when possible)**

Each group contains bugs that should be **fixed together** in one coding session since they touch the same files/area.

---

## PRIORITY 1 — FIX IMMEDIATELY (System compromise risks)

### Group 1A: Remove Secrets from Client Bundle
**Files:** `next.config.ts`
**Bugs:** BUG-058 ✅ FIXED (2026-03-09) — Removed entire `env` block from next.config.ts. Server code accesses process.env directly.
**Time:** 5 minutes
**Fix:**
```ts
// REMOVE the entire env block from next.config.ts
// Server code already has access to process.env without this
// Only NEXT_PUBLIC_ vars should ever be in this block
```
**Impact if not fixed:** Anyone can view page source → get JWT_SECRET → forge tokens for any user/role → full system compromise. Get MONGODB_URI → direct database access. Get BREVO_API_KEY → send emails as you.
**Verification:** Verified all 6 files using these env vars are server-side only (lib/mongodb.ts, lib/auth-utils.ts, lib/brevo-mail.ts, lib/brevo.ts, lib/email.js, lib/marketing-db.js). Build completes successfully. Zero client components affected.

---

### Group 1B: Fix Upload API (Zero Auth + Zero Validation)
**Files:** `app/api/upload-dc/route.js`
**Bugs:** BUG-023 ✅ FIXED (2026-03-09), BUG-024 ✅ FIXED (2026-03-09)
**Time:** 30 minutes
**Fix:**
1. Add authentication check (getSessionUser or checkAuth)
2. Add file type allowlist (images only: jpg, png, gif, webp, svg)
3. Add file size limit (e.g., 5MB)
4. Use `path.basename()` to strip path traversal from filename
5. Sanitize filename to remove special characters
**What changed:** Added `getSessionUser()` auth check (returns 401 if not logged in). Added ALLOWED_EXTENSIONS allowlist (images + common docs). Added 5MB size limit. Sanitized filename with `path.basename()` + regex to strip special chars. Added `path.resolve()` + prefix check to prevent path traversal.
**Scope check:** Only upload endpoint in the project (verified: `writeFile` only appears in this file). Dashboard uploads use base64 via server actions, not this API. Marketing admin create page calls `/api/upload` (wrong URL, would 404 — separate pre-existing issue).

---

### Group 1C: Remove Hardcoded API Key from Source Code
**Files:** `scripts/create-email-templates.js`
**Bugs:** BUG-202 ✅ FIXED (2026-03-09) — Replaced hardcoded Brevo API key with `process.env.BREVO_API_KEY` via dotenv. Also replaced hardcoded sender email/name with env vars.
**Time:** 10 minutes
**Fix:** Replace hardcoded key with `process.env.BREVO_API_KEY`. Revoke the exposed key and generate a new one in Brevo dashboard.
**Scope check:** Searched entire codebase for `xkeysib-` and hardcoded API key patterns — this was the only instance.
**⚠️ ACTION REQUIRED BY USER:** The exposed API key `xkeysib-8ffc276...` must be revoked in the Brevo dashboard and a new key generated. The old key is compromised since it was in source code.

---

### Group 1D: Fix console.error Removal in Production
**Files:** `next.config.ts`
**Bugs:** BUG-060 ✅ FIXED (2026-03-09) — Changed removeConsole to `{ exclude: ['error', 'warn'] }` so errors/warnings still log in production.
**Time:** 2 minutes
**Fix:**
```ts
compiler: {
  removeConsole: process.env.NODE_ENV === "production"
    ? { exclude: ['error', 'warn'] }
    : false,
},
```

---

### Group 1E: Create middleware.ts (Route Protection)
**Files:** `proxy.ts` (already active)
**Bugs:** BUG-235 ❌ FALSE POSITIVE (2026-03-09) — Next.js 16 renamed the convention from `middleware.ts` → `proxy.ts`. Build output confirms `Proxy (Middleware)` is active and matching `/dashboard/:path*` and `/super-admin/:path*`. The proxy was already working correctly.
**BUG-008:** Route protection IS active via proxy.ts. The matcher covers `/dashboard/:path*` and `/super-admin/:path*`. Not a bug.
**Time:** N/A — no fix needed
**Note:** Renaming to `middleware.ts` triggers a deprecation warning in Next.js 16: "The middleware file convention is deprecated. Please use proxy instead." Keeping as `proxy.ts` is correct.
4. This single fix enables the entire route-protection layer that's currently dead code

---

## PRIORITY 2 — FIX URGENTLY (Auth bypass, data exposure)

### Group 2A: Add Auth to chat.ts (ALL 7 Functions) ✅ FIXED (2025-07-17)
**Files:** `lib/chat.ts`
**Bugs:** BUG-165 ✅, BUG-166 ✅, BUG-167 ✅, BUG-169 ✅, BUG-170 ✅, BUG-171 ✅
**Fix Applied:**
- Added `getSessionUser()` auth to ALL 7 exported functions
- IDOR prevention: all functions ignore client-supplied userId parameter and use session userId instead
- Parameters renamed with `_` prefix to indicate untrusted/ignored
- `sendMessage` also fixed `.select('-password')` on fallback UserModel query

---

### Group 2B: Add Auth to singularity-history.ts (ALL 11 Functions) ✅ FIXED (2025-07-17)
**Files:** `lib/singularity-history.ts`
**Bugs:** BUG-188 ✅, BUG-190 ✅, BUG-191 ✅, BUG-192 ✅, BUG-196 ✅, BUG-197 ✅, BUG-199 ✅
**Fix Applied:**
- Added `getSessionUser()` auth + ownership verification to ALL 11 exported functions
- Functions that take `userId` param now ignore it and use session userId
- Session-specific functions verify `chatSession.userId === authSession.userId`
- Checkpoint functions verify ownership via parent session lookup

---

### Group 2C: Remove server action exposure from brevo.ts & brevo-mail.ts ✅ FIXED (2025-07-17)
**Files:** `lib/brevo.ts`, `lib/brevo-mail.ts`
**Bugs:** BUG-189 ✅, BUG-195 ✅
**Fix Applied:** Removed `"use server"` directive from both files. They are only imported server-side (brevo.ts by API route, brevo-mail.ts by lib/actions.ts).

---

### Group 2D: Fix Login Function (Rate Limiting + Password Hash Leak) — PASSWORD LEAK ✅ FIXED
**Files:** `lib/actions/auth.ts`
**Bugs:** BUG-254 (rate limiting — TODO), BUG-255 ✅ FIXED (2025-07-16)
**Fix Applied:**
- `login()` in `lib/actions/auth.ts`: stripped password hash from return values using destructuring for all 3 account types (superadmin, user, client)
- Rate limiting (BUG-254) still needs to be implemented separately

---

### Group 2E: Fix getAgencyAIConfig Exposure ✅ FIXED (2025-07-17)
**Files:** `lib/actions.ts`, `lib/utils-server.ts`, `app/api/singularity/route.ts`
**Bugs:** BUG-168 ✅ FIXED
**Fix Applied:**
- Created `getAgencyAIConfigInternal()` (non-exported) in `actions.ts` that delegates to `getAgencyAIConfigServer()` in `utils-server.ts`
- Exported `getAgencyAIConfig()` now masks the API key (`****` + last 4 chars) — safe for server action calls from client
- All 7 internal AI callers in `actions.ts` use `getAgencyAIConfigInternal()` to get the real key
- `app/api/singularity/route.ts` now imports `getAgencyAIConfigServer` from `utils-server.ts` (not a server action)
- `getAgencyAIConfigServer()` in `utils-server.ts` — server-only, returns decrypted key for API routes

---

### Group 2F: Add Auth to agency-context.ts Functions ✅ FIXED (2025-07-17)
**Files:** `lib/agency-context.ts`
**Bugs:** BUG-004 ✅ FIXED, BUG-193 ✅ FIXED, BUG-194 ✅ FIXED, BUG-198 ✅ FIXED, BUG-201 ✅ FIXED
**Fix Applied:**
1. ✅ Removed legacy userId cookie fallback in `getCurrentAgency()` — returns null immediately if no JWT session
2. ✅ Added `getSessionUser()` auth to `getAllAgencies()` (+ superadmin role check), `getAgencyById()`, `getAgencyBySlug()`
3. ✅ Added auth to `incrementAgencyUsage()`, `decrementAgencyUsage()`, `updateAgencyUsage()`
4. ✅ Added super-admin check to `clearAgencySelection()` and fixed `switchAgency()` to use JWT instead of legacy cookie

---

### Group 2G: Fix Password Hash Leak — GLOBAL ✅ FIXED (2025-07-16)
**Files:** `lib/actions.ts`, `lib/actions/auth.ts`, `lib/actions/super-admin.ts`, `lib/utils-server.ts`, `lib/chat.ts`, `lib/db.ts`
**Bugs:** BUG-276 ✅ FIXED, BUG-255 ✅ FIXED (password strip in login), BUG-254 (rate limiting TODO)
**Fix Applied (Rule 12 — Global Fix):**
- Added `.select('-password')` to ALL UserModel, ClientModel, and SuperAdminModel queries across the entire codebase
- **Files fixed:**
  - `lib/actions.ts`: ~34 UserModel queries, ~16 ClientModel queries, ~4 SuperAdminModel queries — ALL now have `.select('-password')` except 4 that need password for bcrypt verification (verifyAdminPassword, deleteTransaction, updateUser password change)
  - `lib/actions/auth.ts`: login() strips password from returned objects using destructuring
  - `lib/actions/super-admin.ts`: getAgencyDetails() UserModel.find has `.select('-password')`
  - `lib/utils-server.ts`: resolveUserOrClient() all 3 queries have `.select('-password')`
  - `lib/chat.ts`: getContacts() UserModel + ClientModel queries have `.select('-password')`
  - `lib/db.ts`: db.get() all 3 model queries have `.select('-password')`
- **Intentionally skipped** (needs password for bcrypt.compare):
  - `verifyAdminPassword()` — reads password for admin verification
  - `deleteTransaction()` — reads password for destructive action confirmation
  - `updateUser()` — reads password to validate old password on change
  - `deleteAgency()` in super-admin.ts — reads password for destructive action
  - `login()` in auth.ts — needs password for comparison, but strips before return

---

### Group 2H: Fix Marketing Admin Auth System ✅ FIXED (2025-07-17)
**Files:** `lib/authMiddleware.js`, `app/api/auth-dc/login/route.js`, `app/api/auth-dc/me/route.js`, `models/marketing/Admin.js`
**Bugs:** BUG-001 ✅ FIXED, BUG-002 ✅ FIXED, BUG-003 ✅ FIXED, BUG-119 ✅ FIXED, BUG-121 ✅ FIXED, BUG-232 ✅ FIXED
**Fix Applied:**
1. ✅ JWT-based auth via `jose` (same `JWT_SECRET` as main platform) — replaced hardcoded `'logged_in_secret_value'` cookie
2. ✅ bcrypt password hashing via pre-save hook in Admin model + `comparePassword()` method
3. ✅ Removed auto-account creation on first login — returns 401 for unknown emails
4. ✅ `authMiddleware.js` now verifies JWT and checks `role === 'marketing-admin'`
5. ✅ Rate limiting: 10 attempts per email per 15-minute window
6. ✅ `/me` route now uses `checkAuth()` (JWT-based) instead of cookie string comparison

---

## PRIORITY 3 — FIX SOON (RBAC, data leaks, business logic)

### Group 3A: Systemic RBAC — Add Role Checks to Server Actions
**Files:** `lib/actions.ts` (main file — ~111 functions)
**Bugs:** BUG-140 (systemic), BUG-142, BUG-143, BUG-144, BUG-145, BUG-146, BUG-147, BUG-148, BUG-149, BUG-153, BUG-157, BUG-158, BUG-159, BUG-160, BUG-161, BUG-162, BUG-163, BUG-164, BUG-175, BUG-176, BUG-178, BUG-179, BUG-180, BUG-181, BUG-182, BUG-183, BUG-184, BUG-185, BUG-187, BUG-294
**Time:** 3-4 hours
**This is the largest single fix.** ~86 functions need `requireAuth()` or `requireRole()` added.
**Strategy:**
1. READ functions (getUsers, getClients, getTasks, etc.) — add `await requireAuth()` at minimum
2. WRITE functions (update, delete, create) — add `await requireRole('admin', 'manager')` or appropriate role
3. FINANCIAL functions — add `await requireRole('admin', 'manager')`
4. SENSITIVE functions (getSuperAdmins, getPayrollStatus) — add `await requireRole('admin')`
5. User-specific functions (getUserTasks, getUserActivity) — verify ownership (session userId matches parameter)

**Functions needing `requireRole('admin')` or `requireRole('admin', 'manager')`:**
- getSuperAdmins, getPayrollStatus, getFinanceStats, getFinanceChartData
- getTransactions, getInvoices, getCategoryMemberSummary
- getSystemSettings, updateSystemSettings, getAIPermissions, updateAIPermissions
- getAgencySettings, updateAgencyDetails, adminResetPassword
- getLeaveRequests, globalSearch, getExportData

**Functions needing `requireAuth()` (any logged-in user, but scoped):**
- getClients, getClientByUsername, getClientById, getClientFinanceData
- getTasks, getProject, getProjectBySlug, getProjectTasks
- getUserProjects, getProjectAssets, getProjectRefunds
- getHighPriorityTasks, getProjectDistribution, getRecentActivity
- getUserActivity, getEmployeeDashboardData

**Functions needing ownership verification:**
- addComment (use session userId, not parameter), getClientCreatedTasks
- explainTask, aiEstimateTaskHours, getClientActivityLogs

---

### Group 3B: Fix Page-Level Auth in Dashboard
**Files:** `components/layout/AuthenticatedLayout.tsx`, all dashboard pages
**Bugs:** BUG-141, BUG-155, BUG-156, BUG-217, BUG-218, BUG-219, BUG-220, BUG-229, BUG-230, BUG-231, BUG-261, BUG-262
**Time:** 2 hours
**Fix:** Add role-based route protection in AuthenticatedLayout:
```ts
// Define role → allowed routes mapping
const ROLE_ROUTES = {
  client: ['/dashboard', '/dashboard/projects', '/dashboard/messages', '/dashboard/singularity'],
  employee: ['/dashboard', '/dashboard/projects', '/dashboard/messages', '/dashboard/singularity', '/dashboard/team'],
  manager: ['/dashboard', '/dashboard/projects', '/dashboard/messages', '/dashboard/singularity', '/dashboard/team', '/dashboard/finance', '/dashboard/clients'],
  admin: ['*'], // all routes
};
```
Also:
- Salary data: Strip from server response for non-admin users (not just hide in UI)
- Government IDs: Strip adharCardImage/panCardImage from responses for non-admin users
- Projects page: Filter projects by assignment for employees, by ownership for clients

---

### Group 3C: Fix Agency Data Isolation (agencyFilter = {})
**Files:** `lib/actions.ts` (multiple locations)
**Bugs:** BUG-014, BUG-019
**Time:** 1 hour
**Fix:** Change the agencyFilter pattern from:
```ts
const agencyFilter = agency ? { agencyId: agency.id } : {};
```
To:
```ts
const agency = await getCurrentAgency();
if (!agency) throw new Error('Agency context required');
const agencyFilter = { agencyId: agency.id };
```
Apply to ALL functions that currently use this pattern. Super-admin functions should use their own explicit agencyId parameter (they already do via verifySuperAdmin).

---

### Group 3D: Fix Stored XSS (dangerouslySetInnerHTML)
**Files:** `app/(marketing)/blog/[slug]/page.jsx`, `components/singularity/SingularityChat.tsx`
**Bugs:** BUG-120, BUG-122, BUG-234
**Time:** 1 hour
**Fix:**
1. Blog: Sanitize HTML with DOMPurify before rendering: `dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}`
2. SingularityChat: Use react-markdown's built-in sanitization instead of regex-based HTML stripping + dangerouslySetInnerHTML
3. Blog POST API: Sanitize content on input too (defense in depth)

---

### Group 3E: Fix Financial Business Logic
**Files:** `lib/actions.ts`
**Bugs:** BUG-042, BUG-043, BUG-044, BUG-045, BUG-046, BUG-047, BUG-265, BUG-266, BUG-291
**Time:** 2 hours
**Fix:**
1. BUG-042: Fix revalidatePath spaces on line 2326: `'/ dashboard / projects / ...'` → `'/dashboard/projects/...'`
2. BUG-043: Add duplicate payment check in payEmployee() — query for existing transaction with same userId+month
3. BUG-044: Add invoice state machine validation (Pending→Paid allowed, Paid→Pending blocked)
4. BUG-045: Use MongoDB findOneAndUpdate with atomic conditions for refund
5. BUG-046: Use validateAmount() in createTransaction()
6. BUG-047: Validate billing dates in project creation
7. BUG-265: Add NaN/negative/max validation on invoice amount
8. BUG-266: Add confirmation dialog before bulk pay
9. BUG-291: Add `performedBy` field to transaction records for audit trail

---

### Group 3F: Fix OTP Security
**Files:** `app/api/signup/send-otp/route.ts`
**Bugs:** BUG-247, BUG-007
**Time:** 20 minutes
**Fix:**
1. Replace `Math.random()` with `crypto.randomInt(100000, 999999)`
2. Store OTPs in MongoDB with TTL index instead of in-memory Map

---

## PRIORITY 4 — FIX WHEN POSSIBLE (Important but not urgent)

### Group 4A: Fix Rate Limiting (Make Production-Ready)
**Files:** `lib/auth.ts`, `app/api/signup/send-otp/route.ts`, `app/api/signup/route.ts`
**Bugs:** BUG-006, BUG-010, BUG-254 (rate limit part)
**Time:** 2 hours
**Fix:** Replace all in-memory Maps with MongoDB-backed rate limiting:
```ts
// Create a RateLimit collection with TTL index
const RateLimitSchema = new Schema({
  key: { type: String, index: true },
  count: Number,
  expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }
});
```
Also add rate limiting to the actions/auth.ts login() function.

---

### Group 4B: Fix Input Sanitization on API Routes
**Files:** `app/api/contact-dc/route.js`, `app/api/blog-dc/route.js`, `app/api/testimonial/route.js`, `app/api/category/route.js`
**Bugs:** BUG-025, BUG-026, BUG-027, BUG-028, BUG-029, BUG-269, BUG-270
**Time:** 1.5 hours
**Fix:**
1. Contact: Add rate limiting + input sanitization (use sanitizeName, sanitizeString, validateEmail)
2. Blog: Whitelist allowed fields, sanitize content
3. Testimonial: Sanitize text/name/company on create/update
4. Category: Validate body fields, whitelist allowed fields
5. Testimonial GET: Filter by status=active for public requests
6. Blog GET: Add pagination (limit/offset params)

---

### Group 4C: Fix Data Cascade Deletions
**Files:** `lib/actions.ts`
**Bugs:** BUG-017, BUG-018, BUG-022, BUG-071
**Time:** 1 hour
**Fix:**
1. deleteClient: Disable login (set archived flag checked in auth), clean up notifications
2. deleteProject: Add `TransactionModel.deleteMany({ projectId: id })`
3. User deletion: Add `NotificationModel.deleteMany({ userId: id })`
4. Record deletion: Delete associated uploaded files from disk

---

### Group 4D: Fix Database Performance
**Files:** `lib/db.ts`, `lib/mongodb.ts`, `lib/actions.ts`
**Bugs:** BUG-012, BUG-013, BUG-020, BUG-061, BUG-065, BUG-035
**Time:** 2 hours
**Fix:**
1. BUG-012/013: Deprecate or remove db.get()/db.update() — replace callers with direct MongoDB queries
2. BUG-020: Add `{ unique: true, index: true }` to `id` field in ALL Mongoose schemas
3. BUG-061: Paginate getContacts() — only fetch recent messages for preview
4. BUG-065: Use MongoDB aggregation pipeline for dashboard metrics
5. BUG-035: Batch fetch all tasks once, filter by projectId in memory

---

### Group 4E: Fix Email Security
**Files:** `lib/actions.ts`, `lib/brevo-mail.ts`, `lib/email.js`
**Bugs:** BUG-050, BUG-051, BUG-048, BUG-136, BUG-275
**Time:** 1 hour
**Fix:**
1. BUG-050/051: Remove plain text passwords from welcome emails. Use a password-setup link instead.
2. BUG-048: Add fallback values for all email template parameters
3. BUG-136: Move hardcoded sender email to environment variable
4. BUG-275: Standardize bcrypt salt rounds to 12 everywhere

---

### Group 4F: Fix Authentication Edge Cases
**Files:** `lib/auth.ts`, `lib/actions/auth.ts`, `lib/validation.ts`
**Bugs:** BUG-009, BUG-081, BUG-174, BUG-256, BUG-257, BUG-274, BUG-295
**Time:** 1 hour
**Fix:**
1. BUG-009: Add validateEmail() before DB queries in authenticateUser()
2. BUG-081: Align password requirements — use 8 chars minimum everywhere
3. BUG-174: Remove duplicate getCurrentUser() from actions/auth.ts; use one source of truth
4. BUG-256: Add constant-time comparison to prevent timing attacks
5. BUG-257: Return generic "check your email" instead of "email already exists"
6. BUG-274: Stop setting legacy userId/userRole cookies on login
7. BUG-295: Add token version/nonce to JWT; increment on password change to invalidate old tokens

---

### Group 4G: Fix CSRF Protection
**Files:** API route handlers
**Bugs:** BUG-268
**Time:** 1 hour
**Fix:** Add Origin/Referer header validation to all API routes, or create a shared middleware wrapper that validates the origin before processing. Server actions already have built-in CSRF protection in Next.js 16.

---

### Group 4H: Add Security Headers
**Files:** `next.config.ts` or create `middleware.ts` headers
**Bugs:** BUG-284, BUG-285
**Time:** 30 minutes
**Fix:** Add to next.config.ts:
```ts
async headers() {
  return [{ source: '/(.*)', headers: [
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Content-Security-Policy', value: "default-src 'self'; ..." },
  ]}];
}
```

---

## PRIORITY 5 — FIX EVENTUALLY (Polish, UX, minor issues)

### Group 5A: Fix UI/UX Issues
**Bugs:** BUG-036, BUG-038, BUG-039, BUG-041, BUG-052, BUG-053, BUG-054, BUG-055, BUG-056, BUG-057, BUG-069, BUG-078, BUG-084, BUG-085, BUG-088, BUG-093, BUG-094, BUG-095, BUG-096, BUG-130, BUG-132, BUG-233, BUG-267
**Time:** Several sessions
**Fix:**
- Add error.tsx error boundaries to key routes
- Add Suspense skeletons to more pages
- Fix optimistic message duplication
- Fix window.location.reload → router.refresh
- Add empty state components
- Fix division by zero in analytics
- Add mobile navigation support
- Share ChatContext between overlay and messages page
- Fix hardcoded INR currency — read from agency settings

---

### Group 5B: Fix Scripts & Data Files
**Files:** `scripts/*`, `data/backup/`, `.gitignore`
**Bugs:** BUG-204, BUG-205, BUG-207, BUG-208, BUG-209, BUG-241, BUG-282
**Time:** 1 hour
**Fix:**
1. Add `data/backup/` to `.gitignore`
2. Remove hardcoded passwords from scripts (use env vars)
3. Add confirmation prompt to import-db.js before dropping collections
4. Remove check-env.js or move to dev-only

---

### Group 5C: Fix Miscellaneous Code Quality
**Bugs:** BUG-021, BUG-030, BUG-033, BUG-034, BUG-040, BUG-047, BUG-062, BUG-063, BUG-064, BUG-066, BUG-067, BUG-068, BUG-070, BUG-072, BUG-073, BUG-074, BUG-075, BUG-077, BUG-081, BUG-087, BUG-089, BUG-090, BUG-091, BUG-092, BUG-097, BUG-098, BUG-099, BUG-100, BUG-101, BUG-102, BUG-103, BUG-104, BUG-106, BUG-109, BUG-110, BUG-112, BUG-113, BUG-115, BUG-116, BUG-117, BUG-122, BUG-124, BUG-127, BUG-133, BUG-134, BUG-138, BUG-222, BUG-236, BUG-237, BUG-264, BUG-271, BUG-272, BUG-277, BUG-281, BUG-287, BUG-288, BUG-293
**Time:** Multiple sessions
**These can be done incrementally as part of regular maintenance.**

---

## QUICK REFERENCE — FIX ORDER

| Step | Group | Bugs | Files | Time Est |
|------|-------|------|-------|----------|
| 1 | 1A | BUG-058 | next.config.ts | 5 min |
| 2 | 1B | BUG-023, 024 | upload-dc/route.js | 30 min |
| 3 | 1C | BUG-202 | scripts/create-email-templates.js | 10 min |
| 4 | 1D | BUG-060 | next.config.ts | 2 min |
| 5 | 1E | BUG-008, 235 | proxy.ts → middleware.ts | 30 min |
| 6 | 2A | BUG-165-171 | lib/chat.ts | 45 min |
| 7 | 2B | BUG-188-199 | lib/singularity-history.ts | 45 min |
| 8 | 2C | BUG-189, 195 | lib/brevo.ts, lib/brevo-mail.ts | 30 min |
| 9 | 2D | BUG-254, 255 | lib/actions/auth.ts | 30 min |
| 10 | 2E | BUG-168 | lib/actions.ts | 15 min |
| 11 | 2F | BUG-004, 193-201 | lib/agency-context.ts | 30 min |
| 12 | 2G | BUG-276 | lib/actions/super-admin.ts | 10 min |
| 13 | 2H | BUG-001-003 | authMiddleware.js, auth-dc routes | 2 hr |
| 14 | 3A | BUG-140 (systemic) | lib/actions.ts | 3-4 hr |
| 15 | 3B | BUG-141 (systemic) | AuthenticatedLayout, pages | 2 hr |
| 16 | 3C | BUG-014, 019 | lib/actions.ts | 1 hr |
| 17 | 3D | BUG-120, 122 | blog page, SingularityChat | 1 hr |
| 18 | 3E | BUG-042-047, 265-266, 291 | lib/actions.ts | 2 hr |
| 19 | 3F | BUG-247, 007 | send-otp/route.ts | 20 min |
| 20+ | 4A-H | Various | Various | Several hours |
| 21+ | 5A-C | Various | Various | Multiple sessions |

**Steps 1-5 should be done TODAY. Steps 6-13 this week. Steps 14-19 next week. Steps 20+ ongoing.**
