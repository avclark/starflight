# Starflight — Project Setup & Claude Code Build Prompts

---

## Part 1: Project Initialization (Do This Before Opening Claude Code)

### Prerequisites

Make sure you have these installed:
- **Node.js** 18+ (check with `node --version`)
- **npm** or **pnpm** (pnpm is faster; install with `npm install -g pnpm`)
- **Claude Code** (install with `npm install -g @anthropic-ai/claude-code` — see https://docs.claude.com/en/docs/claude-code/overview for current instructions)
- **Git** (for version control)
- A **Supabase account** at https://supabase.com (free tier is fine to start)

### Step 1: Create the Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Name it `starflight`
4. Set a strong database password — **save this password somewhere**, you'll need it
5. Choose a region close to you (e.g., East US)
6. Click "Create new project" and wait for it to provision (~2 minutes)
7. Once ready, go to **Project Settings → API**
8. Copy two values and save them somewhere:
   - `Project URL` (looks like `https://xxxxx.supabase.co`)
   - `anon / public` key (a long string starting with `eyJ...`)

### Step 2: Scaffold the Next.js Project

Open your terminal and run:

```bash
npx create-next-app@latest starflight --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

When prompted:
- Would you like to use Turbopack? → **Yes**

Then:

```bash
cd starflight
```

### Step 3: Initialize shadcn/ui

```bash
npx shadcn@latest init
```

When prompted:
- Which style would you like to use? → **Default**
- Which color would you like to use as base color? → **Slate** (you can change this later)
- Would you like to use CSS variables for colors? → **Yes**

Then install the components you'll need right away:

```bash
npx shadcn@latest add button card dialog dropdown-menu form input label select separator sheet sidebar table tabs textarea toast badge avatar checkbox command popover calendar
```

### Step 4: Install Supabase

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### Step 5: Set Up Environment Variables

Create a `.env.local` file in the project root:

```bash
touch .env.local
```

Add your Supabase credentials (use the values from Step 1):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 6: Add the PRD to the Project

Copy the `starflight-prd-v3.md` file into the project root:

```bash
cp /path/to/starflight-prd-v3.md ./PRD.md
```

### Step 7: Initialize Git

```bash
git init
git add .
git commit -m "Initial scaffold: Next.js + shadcn/ui + Supabase"
```

### Step 8: Create a CLAUDE.md File

This file tells Claude Code about the project. Create it in the project root:

```
# Starflight

Internal podcast/video production workflow management tool.

## Tech Stack
- Next.js 14+ (App Router, TypeScript)
- Supabase (Postgres, Auth, Realtime)
- Tailwind CSS + shadcn/ui components
- Deployed on Vercel

## Key Decisions
- No auto-save. All edits require explicit Save/Update button clicks.
- Sidebar navigation is always visible, never collapsed.
- shadcn/ui for all UI components.
- Supabase client created via @supabase/ssr for server components.

## Domain Language
- "Shows" = clients/podcast shows (replaces "Organizations")
- "Episodes" = live production instances (replaces "Projects")
- "Show Settings" = conditional metadata on shows (replaces "Organization Attributes")
- Workflows, Processes, Tasks, People, Roles = same as ProcessKit

## Project Structure
- /src/app — Next.js App Router pages
- /src/components — Shared UI components
- /src/components/ui — shadcn/ui components
- /src/lib — Utilities, Supabase client, types
- /supabase — Migrations and seed data

## Full Spec
Read PRD.md for the complete product requirements document.
```

### Step 9: Verify Everything Works

```bash
npm run dev
```

Open http://localhost:3000 — you should see the default Next.js page. If it loads, you're ready for Claude Code.

```bash
# Kill the dev server (Ctrl+C), then:
git add .
git commit -m "Add CLAUDE.md, env config, shadcn components"
```

### You're Ready

Open Claude Code in your project directory:

```bash
cd starflight
claude
```

---

## Part 2: Claude Code Phase Prompts

Copy and paste these prompts into Claude Code one phase at a time. **Do not move to the next phase until the current phase is working and committed to git.** After each phase, run the app, verify it works, and commit.

---

### Phase 1: Foundation

```
Read PRD.md — this is the full product spec for Starflight.

Start with Phase 1: Foundation. Here's what to build:

DATABASE:
1. Create Supabase migration files in /supabase/migrations/ for all tables in the PRD data model section: users, shows, show_setting_definitions, show_setting_values, workflows, roles, role_members, show_role_assignments, processes, task_templates, task_template_blocks, task_template_visibility_rules, task_template_dependencies, task_template_date_rules, task_template_email_templates, task_template_completion_actions, episodes, tasks, task_block_responses, task_comments. Note: the roles table has NO workflow_id — roles are workspace-global.
2. Include all foreign keys, unique constraints, and indexes as specified in the PRD.
3. Create a seed migration that inserts the default show_setting_definitions listed in the PRD (the podcast production defaults like "Do we edit video for this show?", etc.).
4. Enable Row Level Security on all tables but create permissive policies for now (allow all authenticated users full access). We'll tighten this later.

SUPABASE CLIENT:
1. Set up the Supabase client using @supabase/ssr with proper server/client helpers in /src/lib/supabase/.
2. Create TypeScript types for all database tables in /src/lib/types/database.ts.

LAYOUT & NAVIGATION:
1. Create the app layout with an always-visible left sidebar using shadcn/ui's sidebar component.
2. Sidebar shows: Dashboard, Workflows, Processes, Shows, People — each with an appropriate icon.
3. The sidebar should highlight the active route.
4. Main content area takes remaining width.

CRUD PAGES:
1. /dashboard — placeholder page with "My Episodes" and "My Tasks" section headers (no data yet, just the layout).
2. /shows — list all shows in a data table (name, status, created date). Include a "New Show" button that opens a dialog to create a show (name field only for now).
3. /shows/[id] — show detail page with the show name and three tabs: "Episodes" (list of episodes for this show — empty table for now), "Show Settings", and "Role Assignments" (both placeholder content for now).
4. /people — two tabs: "People" (list all people in a data table, "Add Person" button with dialog for name and email) and "Roles" (placeholder for now — "Role management coming in Phase 3").
5. /workflows — card grid showing all workflows. "New Workflow" button with dialog (name, item label, process selection dropdown).
6. /workflows/[id] — workflow detail with one tab: "Episodes" (empty table for now). Show the assigned process name near the header with ability to change it.
7. /processes — list all processes in a data table. "New Process" button with dialog (name only).
8. /processes/[id] — placeholder page that will become the process builder. For now just show the process name and a message "Process builder coming in Phase 5."

Do NOT build:
- Any conditional logic, visibility rules, or dependencies
- Any date rule logic
- Any email templates or completion actions
- Any episode creation logic
- Any assignment resolution
- Auth/login (we'll add that later)

Use server components where possible, client components only where interactivity is needed. Follow shadcn/ui patterns for all forms and dialogs.
```

**After Phase 1**: Run the app, click through all pages, verify CRUD works. Run the migration against your Supabase project. Commit.

```bash
git add .
git commit -m "Phase 1: Foundation — schema, layout, CRUD pages"
```

---

### Phase 2: Episode Execution

```
Read PRD.md sections: Episode Creation Logic, Task Completion, and Screens 1, 6, 9, 10.

Build Phase 2: Episode Execution. Here's what to build:

EPISODE CREATION:
1. On the workflow detail page (/workflows/[id]), add a "New Episode" button to the Episodes tab.
2. Clicking it opens a modal with: Title (required), Show (required dropdown of all shows), Create button.
3. On create: insert a new episode row, then for each task_template in this workflow's process, create a task row. Copy the title and position from the template. Set status to "open" and is_visible to true for all tasks (visibility rules come in Phase 4). Do NOT resolve role assignments yet (Phase 3). Do NOT calculate dates yet (Phase 6).
4. After creation, navigate to the new episode detail page.

EPISODE LIST:
1. On the workflow detail page Episodes tab, show a data table of episodes: title, show name, progress_percent (as a visual indicator — use a small progress bar or percentage badge), last updated.
2. Include text search filter for episode title.
3. Each row is clickable and navigates to /workflows/[workflowId]/episodes/[episodeId].

EPISODE DETAIL PAGE (/workflows/[workflowId]/episodes/[episodeId]):
1. Show episode title, show name, and overall progress at the top.
2. Below, show the ordered task list. Each task row displays:
   - Checkbox to mark complete (functional)
   - Task title
   - Date range as "Mar 27 → Mar 30" if both dates set, or individual dates, or blank
   - Status indicator
3. Clicking a task row expands it inline (accordion style) showing:
   - A date section with start date and due date pickers (using shadcn calendar/popover)
   - A notes/description area (read-only for now, form blocks come in Phase 5)
   - An "Update Task" button that saves date changes. NOTHING auto-saves.
   - A "Mark Complete" button
4. When a task is marked complete: update its status to "completed", set completed_at to now, recalculate the episode's progress_percent (completed tasks / total visible tasks).

DASHBOARD (/dashboard):
1. "My Episodes" widget: list the 10 most recently updated episodes across all workflows. Show episode title, show name, progress indicator, last updated. Each row links to the episode detail page.
2. "My Tasks" widget: list open tasks (placeholder — since we don't have assignment yet, show all open tasks across all episodes for now). Show task title, episode title, due date (red text if overdue), checkbox to mark complete inline.

TASK DELETION:
1. Add a row action menu (three dots) on each task in the episode detail. Include a "Delete Task" option.
2. Deleting a task removes it from this episode only. Show a confirmation dialog.
3. Recalculate progress after deletion.

Do NOT build:
- Role-based assignment (Phase 3)
- Visibility rules or dependencies (Phase 4)
- Form blocks or task content (Phase 5)
- Date rules or cascading dates (Phase 6)
- Email templates (Phase 7)
```

**After Phase 2**: Create a workflow, create a process with a few task templates (manually in Supabase or build a quick add-task UI), create an episode, verify you can view tasks, check them off, see progress update. Commit.

```bash
git add .
git commit -m "Phase 2: Episode execution — creation, task list, completion, dashboard"
```

---

### Phase 3: Assignment System

```
Read PRD.md sections: roles, role_members, show_role_assignments, task_templates (assignment fields), and the "Resolve assignments" step in Episode Creation Logic.

Build Phase 3: Assignment System.

IMPORTANT CONTEXT: Roles in this app are GLOBAL — they are not tied to workflows. A role like "Video Editor" exists once and is used across all processes, shows, and workflows. Roles are managed under the People section, not on workflows.

DATABASE CHANGES:
1. The roles table should NOT have a workflow_id column. Roles are workspace-global.
2. Create a new role_members table: id (uuid PK), role_id (FK → roles), user_id (FK → users), with a unique constraint on (role_id, user_id). This is the pool of people qualified to fill each role.
3. The show_role_assignments table stays as-is: show_id, role_id, user_id — mapping one person from the role's pool to a specific show.
4. Create migration files for these changes.

GLOBAL ROLES MANAGEMENT (People → Roles tab):
1. On the People page (/people), add a second tab called "Roles" alongside the existing people list.
2. The Roles tab shows all global roles.
3. "New Role" button creates a role (name only).
4. Each role shows:
   - Role name (editable)
   - Member pool: the people assigned to this role, shown as avatar chips or a list
   - "Add Member" button/dropdown to add a person from the people list to this role's pool
   - Ability to remove a member from the pool
   - Delete role option (with warning if the role is used by task templates or show assignments)
5. Save button for changes.

SHOW ROLE ASSIGNMENTS:
1. On the show detail page (/shows/[id]), implement the "Role Assignments" tab.
2. List ALL global roles (not filtered by workflow).
3. For each role, show a dropdown to pick ONE person. The dropdown options should be filtered to only show people who are in that role's member pool (from role_members).
4. If a role has only one member in its pool, pre-fill that person automatically (but allow clearing).
5. Include a Save button — role assignments are saved explicitly, not on each dropdown change.

TASK TEMPLATE ASSIGNMENT:
1. On the process builder page, for each task template, show an "Assignment" section with three options:
   - "Unassigned" (assignment_mode = "none")
   - "Assign to person" (assignment_mode = "user") — shows a dropdown of all people
   - "Assign to role" (assignment_mode = "role") — shows a dropdown of all global roles
2. Save the assignment_mode, assigned_role_id, or assigned_user_id on the task template.

EPISODE CREATION UPDATE:
1. Update the episode creation logic: after creating task instances, resolve assignments.
2. For each task where assignment_mode is "role": look up the show_role_assignments table for this episode's show + the task's assigned_role_id. If a mapping exists, set the task's assigned_user_id to that person. If no mapping exists, leave unassigned.
3. For each task where assignment_mode is "user": copy the assigned_user_id directly from the template.
4. For each task where assignment_mode is "none": leave unassigned.

DISPLAY:
1. On the episode detail task list, show the assigned person's name or avatar next to each task.
2. On the dashboard "My Tasks" widget, now filter to only show tasks assigned to the current user. (If you haven't set up auth yet, use a hardcoded user ID for now and leave a TODO comment.)

CLEANUP:
1. Remove the "Roles" tab from the workflow detail page if one exists. Roles are NOT managed on workflows.

Do NOT build:
- Notification sending on assignment (defer to Phase 7)
- Any visibility or dependency logic
```

**After Phase 3**: Create roles under People → Roles, add members to role pools, assign roles on a show's Role Assignments tab, set up task template assignments in the process builder, create an episode, verify people are auto-assigned based on the show's role assignments. Commit.

```bash
git add .
git commit -m "Phase 3: Assignment system — roles, show assignments, auto-resolution"
```

---

### Phase 4: Conditional Logic

```
Read PRD.md sections: show_setting_definitions, show_setting_values, task_template_visibility_rules, task_template_dependencies, and the evaluation logic described in each.

Build Phase 4: Conditional Logic.

SHOW SETTINGS:
1. On the show detail page (/shows/[id]), implement the "Show Settings" tab fully.
2. Query show_setting_definitions to get all defined settings.
3. For each setting, render the appropriate input based on field_type:
   - yes_no → radio buttons (Yes / No)
   - text → text input
   - textarea → textarea
   - checklist → a list of checkable items with an "add item" input
4. Pre-populate with existing show_setting_values for this show.
5. Include a "Save Settings" button at the bottom. Nothing saves until clicked.

SHOW SETTING DEFINITIONS MANAGEMENT:
1. Create a settings management area (could be a section at the bottom of the Shows list page, or under a global settings route like /settings/show-settings).
2. Allow adding new setting definitions (label + field type).
3. Allow reordering, editing labels, and deleting definitions.
4. Deleting a definition should warn that it will remove all show values and any visibility rules referencing it.

VISIBILITY RULES ON TASK TEMPLATES:
1. This requires the process builder to be functional enough to edit task template sub-tabs. On the process builder page (/processes/[id]), show the vertical list of task templates. Each task template card should now be expandable with inline tabs: for this phase, implement the "Visibility" tab.
2. The Visibility tab shows a list of visibility rules for this task.
3. "Add Rule" button creates a new rule with:
   - Rule name (text input)
   - Show setting dropdown (lists all show_setting_definitions)
   - Operator dropdown: must contain, must not contain, must not be empty, must be empty
   - Target value input (shown only for must contain / must not contain operators)
   - Active/inactive toggle
4. Each rule can be duplicated or deleted.
5. When multiple rules exist, show an AND/OR toggle at the top of the rules list. Store this on the task template (add a visibility_logic field: "and" or "or", default "and").
6. Include a Save button for the rules.

VISIBILITY EVALUATION IN EPISODE CREATION:
1. Update episode creation logic: after instantiating all tasks, evaluate visibility.
2. For each task whose template has active visibility rules:
   - Look up the show's setting values
   - Evaluate each rule against the setting value
   - If visibility_logic is "and": all rules must pass → task is visible
   - If visibility_logic is "or": any rule must pass → task is visible
   - If evaluation fails: set is_visible = false on the task
3. Tasks with is_visible = false should never appear in the episode detail UI.
4. Update progress calculation to only count visible tasks.

DEPENDENCIES:
1. On the process builder, add the "Dependencies" tab to each task template card.
2. The Dependencies tab shows a list of dependency rules.
3. "Add Dependency" button lets the user pick another task template from the same process (dropdown). The condition is always "completed" for now.
4. Dependencies can be deleted.
5. Include a Save button.

DEPENDENCY EVALUATION:
1. Update episode creation logic: after evaluating visibility, evaluate dependencies.
2. For each visible task that has dependencies: check if all prerequisite task templates map to visible tasks in this episode. If any prerequisite task is not yet completed, set the task's status to "blocked".
3. On the episode detail page, blocked tasks appear greyed out with their checkbox disabled. They are visible but not interactive.
4. Update task completion logic: when a task is marked complete, check all sibling tasks in the episode. For any task whose dependencies are now all met (all prerequisite tasks completed), change its status from "blocked" to "open".

Do NOT build:
- Form blocks / task content tabs (Phase 5)
- Date rules tab (Phase 6)
- Actions tab (Phase 7)
```

**After Phase 4**: Set show settings for a show. Add visibility rules to task templates. Create an episode and verify that tasks are hidden/shown based on settings. Add dependencies and verify blocked/unblocked behavior. Commit.

```bash
git add .
git commit -m "Phase 4: Conditional logic — show settings, visibility rules, dependencies"
```

---

### Phase 5: Structured Task Content

```
Read PRD.md sections: task_template_blocks, task_block_responses, task_comments, and the Content tab description in Screen 8 (Process Builder).

Build Phase 5: Structured Task Content.

PROCESS BUILDER — CONTENT TAB:
1. On each task template card in the process builder, implement the "Content" tab.
2. Show an ordered list of blocks for this task template.
3. "Add Block" button shows a dropdown of block types: description, text_input, rich_text, dropdown, radio, checkbox, file_attachment, date_time, heading, todo_list.
4. Each block has:
   - A label field (editable)
   - A "Required" toggle
   - Type-specific configuration:
     - dropdown: list of options (add/remove/reorder)
     - radio: list of options
     - checkbox: list of options
     - todo_list: no extra config (items are added at runtime)
     - description: a static text block (the label IS the content)
     - heading: a static heading (the label IS the heading text)
     - text_input, rich_text, date_time, file_attachment: no extra config
5. Blocks can be reordered (drag or move up/down buttons), duplicated, and deleted.
6. Save button for the block list.

PROCESS BUILDER — FULL TEMPLATE BUILDER UX:
1. Now that we have Content, Visibility, and Dependencies tabs, upgrade the process builder to match the PRD description:
   - Task template cards displayed as vertical cards with visual connectors between them
   - Each card shows: sequence number, task title (editable inline), icons indicating if dates/actions/assignments are configured, drag handle for reordering
   - "+" buttons between cards to insert a new task template at that position
   - Overflow menu on each card: duplicate, delete, move to top, move to bottom
2. Cards expand to show the inline tabs: Content, Visibility, Dependencies, Dates (placeholder), Actions (placeholder), Assignment (already built in Phase 3 — integrate it here as a tab).

EPISODE TASK DETAIL — FORM RENDERING:
1. When a task is expanded in the episode detail page, render its form blocks.
2. For each block from the task's template, render the appropriate input:
   - description → static text paragraph
   - heading → bold heading text
   - text_input → text input field
   - rich_text → textarea (or a simple rich text editor if easy, otherwise textarea is fine)
   - dropdown → select dropdown with the defined options
   - radio → radio button group
   - checkbox → checkbox group
   - todo_list → checklist with add-item input (items are created and checked off at runtime)
   - date_time → date and time picker
   - file_attachment → file upload zone (store as a URL/path for now, actual file storage can be added later)
3. Pre-populate inputs with existing task_block_responses for this task.
4. Required fields show a red asterisk. The "Update Task" button should validate required fields before saving.
5. Clicking "Update Task" saves all block responses to task_block_responses.

TASK COMMENTS:
1. Below the form blocks in the task detail, add a comments section.
2. Show existing comments (user name, timestamp, message body) in chronological order.
3. Add a text input to write a new comment.
4. Support @mentions: when the user types "@", show a dropdown of people in the workspace. Selecting a person inserts their name. Store the raw text with @[name] syntax.
5. "Post Comment" button to save. Comments are the one exception to the no-auto-save rule — each comment is posted individually.

Do NOT build:
- Date rules tab (Phase 6)
- Actions tab (Phase 7)
- File upload storage backend (just the UI for now)
```

**After Phase 5**: Add blocks to task templates in the process builder, create an episode, fill out form fields on tasks, post comments. Verify everything saves and loads correctly. Commit.

```bash
git add .
git commit -m "Phase 5: Structured task content — form blocks, process builder UX, comments"
```

---

### Phase 6: Dates and Scheduling

```
Read PRD.md sections: task_template_date_rules, Date Recalculation, and the Dates tab description in Screen 8.

Build Phase 6: Dates and Scheduling.

DATE RULES ON TASK TEMPLATES:
1. On the process builder, implement the "Dates" tab on each task template card.
2. The Dates tab allows configuring rules for start_date and due_date separately.
3. For each date field, the user can add a rule:
   - "Relative to" dropdown: "Another task's start date", "Another task's due date", "Episode creation date"
   - If relative to another task: a dropdown to select which task template in the process
   - Offset: days (integer input) and hours (integer input), can be 0
4. Example display: "Start date: 0 days, 0 hours after 'Download files from Riverside' starts"
5. Save button for date rules.

DATE CALCULATION AT EPISODE CREATION:
1. Update episode creation logic: after resolving assignments, calculate dates.
2. For each task with date rules:
   - If the rule references another task: look up that task's start_date or due_date. If it has a value, apply the offset. If it doesn't have a value yet, skip (leave null).
   - If the rule references "episode creation date": use the episode's created_at timestamp and apply the offset.
3. This means some tasks may not get dates at creation time — that's fine, they get calculated when the referenced task's dates are set.

DATE CASCADE RECALCULATION:
1. When a user manually sets or updates a date on a task (via the Update Task button), trigger a cascade:
   - Find all other tasks in this episode whose date rules (via their task_template) reference the updated task's template
   - Recalculate those tasks' dates based on the new values
   - Continue cascading: if task B's dates changed because of task A, check if any task C references task B, and so on
2. Prevent infinite loops: track which tasks have been updated in this cascade and don't revisit them.
3. Show a brief toast or indicator after cascade: "Updated dates for 3 dependent tasks" so the user knows what happened.

OVERDUE INDICATORS:
1. On the episode detail task list, if a task's due_date is in the past and the task is not completed, show the date in red.
2. On the dashboard "My Tasks" widget, same treatment — overdue dates in red.

DATE DISPLAY:
1. Task rows in the episode detail show dates as "Mar 27 → Mar 30" when both start and due are set.
2. If only start date: show "Mar 27 →"
3. If only due date: show "→ Mar 30"
4. If neither: blank

Do NOT build:
- Actions tab or email templates (Phase 7)
```

**After Phase 6**: Add date rules to task templates. Create an episode and manually set dates on the first task. Verify dependent task dates auto-calculate. Update a date and verify cascading. Check overdue styling. Commit.

```bash
git add .
git commit -m "Phase 6: Dates and scheduling — rules, cascade recalculation, overdue indicators"
```

---

### Phase 7: Communication

```
Read PRD.md sections: task_template_email_templates, task_template_completion_actions, and the email task UI description in Screen 9.

Build Phase 7: Communication.

ACTIONS TAB ON TASK TEMPLATES:
1. On the process builder, implement the "Actions" tab on each task template card.
2. Allow adding completion actions. For now, support two types:
   - send_notification: sends an in-app notification (or placeholder — just log it for now)
   - send_email: references an email template on this task
3. Save button for actions.

EMAIL TEMPLATES:
1. If a task template has a send_email action, show an email template editor within the Actions tab (or as a sub-section).
2. Fields: From Name, Subject, Body.
3. Subject and Body support token interpolation. Show a helper panel or tooltip listing available tokens:
   - {{episode.title}}
   - {{show.name}}
   - {{show.setting.SETTING_LABEL}} (for any show setting)
   - {{task.response.BLOCK_LABEL}} (for any form block response on any task in the episode)
4. Auto-send on complete toggle.
5. Save button.

EMAIL TASK UI IN EPISODE DETAIL:
1. When a task in an episode has an associated email template, render it differently in the expanded task view.
2. Show a preview of the email with tokens resolved:
   - Look up the episode's show settings and replace {{show.setting.X}} tokens
   - Look up task block responses across the episode and replace {{task.response.X}} tokens
   - Replace {{episode.title}} and {{show.name}}
3. Below the preview, show buttons:
   - "Copy Message Body" — copies the resolved body to clipboard
   - "Edit Message" — lets the user modify the resolved text for this specific send (stored on the task, not the template)
   - "Send Message" — placeholder action (log to console, show toast "Email sent"). Actual email sending via Supabase Edge Functions + an email provider like Resend can be wired up later.
   - "Send & Mark Complete" — sends + marks the task complete in one action
4. If auto_send_on_complete is true, show a notice: "This email will be sent automatically when this task is marked complete."

NOTIFICATION ON ASSIGNMENT:
1. When a task is assigned to a person during episode creation, create a simple notification record. Create a notifications table if it doesn't exist: id, user_id, type, title, body, read, created_at.
2. Show a notification badge on the sidebar or header with unread count.
3. Click to see a simple notification dropdown/panel listing recent notifications.
4. For now, notifications are in-app only. Email notification delivery is a future enhancement.

Do NOT build:
- Actual email sending infrastructure (just the UI and token resolution)
- Webhook actions (placeholder only)
- Tag management (not needed)
```

**After Phase 7**: Add an email template to a task, create an episode, open the email task, verify tokens resolve. Test copy to clipboard and send & mark complete flow. Check notification badge. Commit.

```bash
git add .
git commit -m "Phase 7: Communication — email templates, token resolution, notifications"
```

---

## Part 3: Post-Build Checklist

After all 7 phases, go through this:

- [ ] Create a real workflow + process that mirrors your actual ATH production workflow
- [ ] Add your actual shows with their real settings
- [ ] Add your team members
- [ ] Assign roles per show
- [ ] Create a test episode and run through the full flow
- [ ] Note any UX friction and create a list for a polish pass
- [ ] Set up Supabase Auth (email/password or magic link) and add RLS policies
- [ ] Deploy to Vercel and test in production
- [ ] Wire up actual email sending via Resend or SendGrid + Supabase Edge Functions

---

## Tips for Working with Claude Code on This Project

1. **Commit after every phase.** If Claude Code makes a mess, you can always roll back.

2. **Test before moving on.** Don't start Phase 3 until Phase 2 is solid. Each phase builds on the last.

3. **If Claude Code gets confused**, tell it: "Read CLAUDE.md and PRD.md to re-orient yourself."

4. **If a phase is too big**, break it up. Say: "Just do the database/migration part of Phase 4 first, nothing else."

5. **For bugs or regressions**, be specific: "The episode detail page is not showing blocked tasks as greyed out. The task status is 'blocked' in the database but the UI renders it the same as 'open'. Fix the task row component to check status and apply disabled styling."

6. **Keep the PRD as the source of truth.** If Claude Code suggests deviating from it, push back unless the deviation makes sense.
