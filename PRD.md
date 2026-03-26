# Starflight — Product Requirements Document

## What To Build

Build a full-stack web application that is an internal operations tool for running repeatable workflows for a podcast and video production company. The core idea: define a process once, then stamp out live episodes from it — where the tasks, assignees, visibility, dates, and communication are all generated automatically based on the process plus per-show settings.

This tool replaces an app called ProcessKit. The user runs a podcast production company where each client is a podcast show. Each show follows a similar production process (download files, edit audio, edit video, write show notes, QA, send to client, publish) but the specifics vary by show. The power of this system is that one or two processes can serve dozens of shows, with conditional logic hiding/showing tasks based on each show's settings.

---

## Tech Stack

- **Frontend**: React (Next.js App Router)
- **Backend**: Supabase (Postgres + Auth + Realtime + Edge Functions)
- **Styling**: Tailwind CSS + shadcn/ui
- **Deployment**: Vercel

---

## Domain Language

This app uses ProcessKit's original terminology with two domain-specific renames:

| Original (ProcessKit) | Starflight | Description |
|----------------------|------------|-------------|
| Organizations | **Shows** | A podcast or video show (e.g., "All The Hacks", "Next Mile") |
| Organization Attributes | **Show Settings** | Yes/no questions and fields that drive conditional logic |
| Projects | **Episodes** | A live production run stamped from a process |
| Workflows | Workflows | Groups episodes and has one process |
| Processes | Processes | The reusable blueprint of ordered tasks with rules |
| Tasks | Tasks | A step in the production process |
| People | People | Team members who do the work |
| Roles | Roles | Production roles like Audio Editor, Video Editor, Writer |

---

## Core Concepts

There are four pillars: **Workflows**, **Processes**, **Shows**, and **People**.

- A **Workflow** is a container for a type of production work (e.g., "NXT Episodes"). It groups episodes and has exactly one process. The same process can be shared across multiple workflows, but each workflow only has one.
- A **Process** is the reusable blueprint inside a workflow. It defines an ordered sequence of task templates with rules for assignment, visibility, dependencies, dates, and form content.
- An **Episode** is a live instance stamped from a process (e.g., "ATH0271 — Sahil Bloom"). Creating an episode evaluates all the process rules against the show's settings to produce concrete tasks.
- A **Show** is a client podcast/video show (e.g., "All The Hacks", "Next Mile"). It stores show settings (yes/no questions, text fields) that drive conditional logic, and it maps real people to roles for that show.
- **People** are team members who get assigned to tasks either directly or via role-based resolution through the show.
- **Roles** are global production job functions (e.g., "Video Editor", "Audio Editor", "Writer"). Each role has a **member pool** — the people qualified to fill that role. Each show then picks from the pool to assign one person per role for that show.

### The Critical Dependency Chain

```
Show settings + show role assignments
        ↓ feeds into
Process rules (visibility, assignment, dates)
        ↓ which produce
Episode tasks (what shows, who's assigned, when it's due)
```

This is the heart of the system. Every feature revolves around this chain.

---

## Data Model

### users
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| full_name | text | |
| email | text | unique |
| avatar_url | text | nullable |
| created_at | timestamptz | |

### shows
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| name | text | e.g., "All The Hacks" |
| slug | text | unique |
| avatar_url | text | nullable |
| status | text | active, archived |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### show_setting_definitions
Defines the set of custom questions/fields that shows answer. These are workspace-level definitions reused across all shows. The app should ship with sensible defaults for podcast production:

Default setting definitions to seed:
- "Is this a Podcast Royale client?" (yes_no)
- "Is this show recorded with Riverside?" (yes_no)
- "Is this show hosted with Megaphone?" (yes_no)
- "Do we edit audio for this show?" (yes_no)
- "Do we edit video for this show?" (yes_no)
- "Do we create social assets for this show?" (yes_no)
- "Does the client need to approve all final assets?" (yes_no)
- "Do we publish this show for the client?" (yes_no)
- "Is compliance needed?" (yes_no)
- "Are we running ad spots?" (yes_no)
- "Client email" (text)
- "Client first name" (text)
- "List of social assets to create" (checklist)

These are editable and new ones can be added. They just provide a useful starting point.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| label | text | e.g., "Do we create social assets for this show?" |
| field_type | text | yes_no, text, textarea, checklist |
| display_order | int | |
| created_at | timestamptz | |

### show_setting_values
Stores each show's answers to the setting definitions.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| show_id | uuid | FK → shows |
| setting_definition_id | uuid | FK → show_setting_definitions |
| value_json | jsonb | Stores the answer (boolean, string, array, etc.) |
| updated_at | timestamptz | |

**Unique constraint**: (show_id, setting_definition_id)

### workflows
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| name | text | e.g., "NXT Episodes" |
| item_label | text | e.g., "Episode" — used for button text like "New Episode" |
| process_id | uuid | FK → processes (one process per workflow) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### roles
Roles are **workspace-global** — not tied to any specific workflow. A role like "Video Editor" exists once and is used across all processes, shows, and workflows.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| name | text | e.g., "Video Editor", "Audio Editor", "Writer" |
| display_order | int | |
| created_at | timestamptz | |

### role_members
The pool of people qualified to fill each role. For example, "Video Editor" might have JP, Enrique, and Maria as members. When assigning a role to a show, the user picks from this pool.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| role_id | uuid | FK → roles |
| user_id | uuid | FK → users |

**Unique constraint**: (role_id, user_id)

### show_role_assignments
Maps one person from the role's member pool to a specific show. This is how role-based task assignment resolves: "Video Editor for All The Hacks = JP."

If a role has only one member in its pool, that person is automatically assigned to every show (the UI should pre-fill this, but it can be overridden or cleared).

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| show_id | uuid | FK → shows |
| role_id | uuid | FK → roles |
| user_id | uuid | FK → users |

**Unique constraint**: (show_id, role_id)

### processes
A process can be referenced by multiple workflows, but each workflow only has one. This allows reuse: one process powering several workflows for different shows.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| name | text | e.g., "ATH Episode Production" |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### task_templates
The ordered sequence of task definitions inside a process. This is the core builder.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| process_id | uuid | FK → processes |
| title | text | e.g., "Edit video" |
| description | text | nullable |
| position | int | Display/sequence order |
| assignment_mode | text | "role" or "user" or "none" |
| assigned_role_id | uuid | nullable FK → roles (global roles table) |
| assigned_user_id | uuid | nullable FK → users |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Assignment modes:**
- **none**: Task is not automatically assigned when an episode is created. Can be assigned manually later.
- **user**: Task is always assigned to a specific person, regardless of which show the episode belongs to.
- **role**: Task is assigned to whichever person fills that role for the episode's show. At episode creation, the system looks up the show_role_assignments for this role + show combo and assigns accordingly.

### task_template_blocks
Structured form content inside a task template. Tasks are not just checkboxes — they can be data collection forms.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| task_template_id | uuid | FK → task_templates |
| block_type | text | description, text_input, rich_text, dropdown, radio, checkbox, file_attachment, date_time, heading, todo_list |
| label | text | |
| required | boolean | default false |
| options_json | jsonb | For dropdown/radio/checkbox — stores option list |
| display_order | int | |

### task_template_visibility_rules
Controls whether a task **exists at all** in an episode for a given show. These are evaluated at episode creation time. If a rule fails, the task is not created (or is created with `is_visible = false` and completely hidden from the UI).

**This is the "does this show need this task?" system.** Example: "Create social assets" only appears if the show's setting "Do we create social assets for this show?" is Yes.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| task_template_id | uuid | FK → task_templates |
| name | text | Human-readable rule name |
| setting_definition_id | uuid | FK → show_setting_definitions |
| operator | text | must_contain, must_not_contain, must_not_be_empty, must_be_empty |
| target_value | text | The value to match against (for must_contain / must_not_contain) |
| is_active | boolean | default true |
| created_at | timestamptz | |

**Evaluation logic**: When creating an episode, for each task template that has visibility rules:
- Look up the show's setting values for the referenced setting definitions
- Evaluate each active rule
- The user should be able to configure whether multiple rules use AND or OR logic (default: AND — all rules must pass)
- If evaluation fails, the task does not appear in the episode at all

### task_template_dependencies
Controls task **availability during execution**. A task with unmet dependencies appears in the episode but is **greyed out and unclickable** until the prerequisite task is completed.

**This is the "is this task available yet?" system.** Example: "QA audio" is greyed out until "Edit audio" is marked complete.

This is distinct from visibility rules:
- **Visibility rules** = does this task exist for this show? (evaluated once at episode creation, based on show settings)
- **Dependencies** = is this task available yet? (evaluated continuously during execution, based on sibling task completion)

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| task_template_id | uuid | FK → task_templates (the dependent task) |
| depends_on_task_template_id | uuid | FK → task_templates (the prerequisite) |
| condition_type | text | "completed" (blocked until prerequisite is done) |

### task_template_date_rules
Rules that automatically calculate task dates relative to other tasks or the episode.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| task_template_id | uuid | FK → task_templates |
| date_field | text | "start_date" or "due_date" |
| relative_to | text | "task_start", "task_due", "episode_start" |
| relative_task_template_id | uuid | nullable FK → task_templates |
| offset_days | int | default 0 |
| offset_hours | int | default 0 |

**Example from the user's actual usage**: "Start date = 0 days, 0 hours after 'Download files from Riverside' starts" means this task gets the same start date as the referenced task. The user also sets date rules like "this task's start and due dates match that task's start and due dates" for tasks that should always align.

### task_template_email_templates
Email templates attached to communication tasks. When the task is marked complete, the email fires.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| task_template_id | uuid | FK → task_templates |
| from_name | text | |
| subject_template | text | Can contain tokens like {{episode.title}}, {{show.setting.client_first_name}} |
| body_template | text | Can contain tokens referencing task responses and show settings |
| auto_send_on_complete | boolean | default false |

### task_template_completion_actions
Actions that fire when a task is marked complete.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| task_template_id | uuid | FK → task_templates |
| action_type | text | send_notification, send_email, add_tag, remove_tag, send_webhook |
| config_json | jsonb | Action-specific configuration |

### episodes
A live instance of a process, belonging to a workflow and show.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| workflow_id | uuid | FK → workflows |
| process_id | uuid | FK → processes |
| show_id | uuid | FK → shows |
| title | text | e.g., "ATH0271 — Sahil Bloom" |
| status | text | active, completed, archived |
| progress_percent | numeric | Calculated: completed visible tasks / total visible tasks |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### tasks
Live task instances inside an episode.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| episode_id | uuid | FK → episodes |
| task_template_id | uuid | FK → task_templates |
| title | text | Copied from template at creation |
| position | int | |
| status | text | open, completed, blocked |
| is_visible | boolean | Determined by visibility rules at episode creation. If false, completely hidden. |
| assigned_user_id | uuid | nullable FK → users |
| start_date | timestamptz | nullable |
| due_date | timestamptz | nullable |
| completed_at | timestamptz | nullable |
| completed_by | uuid | nullable FK → users |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Note on live episode changes**: Any changes made to tasks within a live episode (editing, deleting, reordering) affect only that episode. They do not propagate back to the process or to other episodes.

### task_block_responses
Stores the actual form data entered by users for each task's form blocks.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| task_id | uuid | FK → tasks |
| task_template_block_id | uuid | FK → task_template_blocks |
| value_json | jsonb | The user's response |
| updated_at | timestamptz | |

### task_comments
Notes and @mentions within a task.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| task_id | uuid | FK → tasks |
| user_id | uuid | FK → users |
| body | text | Supports @mentions |
| created_at | timestamptz | |

---

## Episode Creation Logic

This is the most important system behavior. When a user creates a new episode:

1. **Input**: User provides title, selects show.
2. **Instantiate tasks**: For each task template in the process, create a task instance.
3. **Evaluate visibility**: For each task with visibility rules, check the show's setting values. If rules fail, set `is_visible = false` (task is completely hidden from the episode — the user never sees it).
4. **Evaluate dependencies**: For each visible task with dependencies, check if prerequisite tasks exist and are visible. If prerequisites are not yet completed, set `status = blocked` (task appears greyed out and unclickable).
5. **Resolve assignments**: For each task:
   - If assignment_mode is "none": leave unassigned.
   - If assignment_mode is "user": copy the assigned_user_id directly from the template.
   - If assignment_mode is "role": look up show_role_assignments for this show + the task's assigned_role_id. If a mapping exists, set the task's assigned_user_id to that person. If no mapping exists, leave unassigned.
6. **Calculate dates**: For each task with date rules, compute start/due dates based on the rules. If a rule references another task that doesn't have dates yet, leave null (dates get recalculated when the referenced task's dates are set).
7. **Copy form blocks**: Task inherits its template's block structure for data entry.
8. **Calculate progress**: `progress_percent = completed visible tasks / total visible tasks × 100`.

### Template Changes and Existing Episodes

Changes to a process **only affect future episodes**. Existing episodes are untouched. This is a deliberate simplification. The ability to propagate process changes to existing episodes may be added later, but it requires a clear diff/preview UI to be safe, and is not needed for launch.

### Date Recalculation

When a user manually sets or updates dates on a task, the system should find all other tasks in the episode whose date rules reference that task, and recalculate their dates. This should cascade (if Task B depends on Task A, and Task C depends on Task B, updating A recalculates B which recalculates C).

### Task Completion

When a task is marked complete:
1. Set `status = completed`, `completed_at = now()`, `completed_by = current_user`
2. Recalculate episode `progress_percent`
3. Check all sibling tasks that have a dependency on this task. If all their dependencies are now met, change their status from `blocked` to `open`
4. Execute any completion actions (send email, notification, etc.)

---

## Screens

### 1. Dashboard
The landing page after login.

**My Episodes widget**: List of active episodes the user is involved in. Shows episode title, show name, progress indicator, last updated.

**My Tasks widget**: List of open tasks assigned to the current user across all episodes. Shows task title, episode name, due date (red if overdue), checkbox to complete.

### 2. Sidebar Navigation
**Always visible** (not hidden behind icons). Shows:
- Dashboard
- Workflows
- Processes
- Shows
- People

### 3. Shows List
List of all shows with: name, assigned people (avatar chips), last activity timestamp, row action menu (edit, archive, delete).

**Includes a search/filter bar.**

Clicking a show opens its detail view with three tabs:
- **Episodes**: List of all episodes for this show. Table with: episode title, workflow name, progress indicator, last updated. Each row links to the episode detail page.
- **Show Settings**: The list of custom questions with current answers. Editable inline. These are the yes/no, text, checklist fields that drive conditional logic. Save button at the bottom.
- **Role Assignments**: Lists all global roles. For each role, a dropdown to pick one person from that role's member pool. If a role has only one member, it is pre-filled (but can be cleared). Save button at the bottom.

### 4. People
The People section has two tabs accessible from the People page:

**Tab: People**
List of all people in the workspace. Name, email, avatar, status. Add/edit/delete.

**Tab: Roles**
List of all global roles. Each role shows:
- Role name (editable)
- Member pool: the people assigned to this role, shown as avatar chips
- "Add Member" dropdown to add a person to the pool
- Ability to remove a member from the pool
- Delete role option (with warning if the role is referenced by task templates or show assignments)

"New Role" button to create a role (name only).

Roles are managed here and **only here** — they do not appear on workflow pages.

### 5. Workflow List
Card grid showing all workflows. Each card shows: workflow name, count of active episodes, progress/status summary.

### 6. Workflow Detail
Clicking a workflow opens a tabbed view:

**Tab: Episodes**
- Filterable/sortable list of episodes
- Columns: title, show, assigned people, progress, last updated
- Filters: people, show, text search
- Row action menu
- "New Episode" button → opens episode creation modal

The workflow detail page also shows the assigned process name near the header, with an option to change it.

### 7. Process List
List of all processes. Each row shows: process name, number of workflows using it, last updated, row action menu.

### 8. Process Builder
This is the most important screen in the app.

Displays task templates as **vertical cards in sequence**, connected by visual connectors. Each card shows:
- Sequence number
- Task title (editable)
- Icons for: dates, actions, assignment
- Drag handle for reordering
- "+" buttons between cards to insert new tasks
- Overflow menu: duplicate, delete, move to top, move to bottom

Each task card has **inline tabs** (not a separate screen):
- **Content**: The form block editor. Add/edit/remove blocks (description, text input, rich text, dropdown, radio, checkboxes, file attachment, date/time, heading, todo list).
- **Visibility**: Add/edit visibility rules. Each rule has: a name field, a dropdown to select which show setting to evaluate, an operator dropdown (must contain, must not contain, must not be empty, must be empty), and a target value input (for the contain operators). Rules can be enabled/disabled, duplicated, or deleted. When multiple rules exist on one task, the user can toggle between AND mode (all rules must pass) and OR mode (any rule passes).
- **Dependencies**: Add dependency rules linking to other task templates. The dependent task will appear greyed out / unclickable in live episodes until the prerequisite is marked complete.
- **Dates**: Configure start date rules, due date rules. Each rule specifies a relative-to target (another task's start/due, episode start) and an offset in days/hours.
- **Actions**: Configure what happens on task completion (send notification, send email, etc.).
- **Assignment**: Set assignment mode:
  - **Unassigned**: no auto-assignment
  - **Assign to person**: dropdown of all people — this person is always assigned regardless of show
  - **Assign to role**: dropdown of all global roles — at episode creation, the system resolves to the person filling this role for the episode's show

### 9. Episode Detail
Opens when clicking an episode from the workflow episode list.

Shows the **ordered task list** for this episode. Only visible tasks appear. Each task row shows:
- Checkbox (to mark complete) — disabled/greyed out if status is `blocked`
- Task title — greyed out if blocked
- Assigned person avatar/name
- Date range (start → due) if dates are set. Red if overdue.
- Status indicator

Clicking a task row **expands it inline** or opens a detail panel showing:
- Form blocks with current responses (editable)
- Comments/notes section with @mention support
- Date fields (start, due) — manually editable with date/time picker
- **"Update Task" button** — nothing saves until this is clicked. This is critical UX. No auto-save.
- "Close & Done" button for completing the task

For email-type tasks, the detail shows:
- Email preview (from name, subject, body with interpolated values)
- "Send Message" button
- "Send & Mark Complete" button
- "Copy Message Body" button
- "Edit Message" button

### 10. Episode Creation Modal
Triggered from "New Episode" button in workflow episode list.

Fields:
- Title (required)
- Show (required — dropdown of shows)
- Create button

On submit, runs the full episode creation logic described above.

---

## UX Requirements

### Explicit Save
**There is no auto-save anywhere in this app.** All edits to tasks, form responses, dates, comments, etc. require the user to click an "Update" / "Save" button before changes are persisted. This is a hard requirement. The user needs confidence that changes are saved, and the combination of auto-save + slow performance in the original app destroyed that confidence.

### Performance
The original app became unusable due to slow performance. Speed is a primary motivator for building this clone. Every action (creating episodes, marking tasks complete, navigating between screens) should feel instant. Use optimistic UI updates, efficient queries, and Supabase realtime where appropriate.

### Sidebar Always Visible
The left sidebar navigation is always visible, not collapsed behind hover-icons.

### Task Cards in Vertical Flow
The process builder uses vertical task cards with connectors — not a flat table. This communicates ordered process better than a list/table.

### Date Range Display
Task lists show date ranges as "Mar 27 → Mar 30" inline, not hidden behind a click.

### Blocked Task Appearance
Tasks with unmet dependencies appear in the episode task list but are **greyed out and unclickable**. They become active (full color, clickable) once all prerequisite tasks are completed.

---

## Features NOT Needed (Explicitly Excluded)

- **Kanban/board view** — never used
- **Recurring/scheduled episode creation** — not needed for how the business works
- **Episode-level start/end dates** — not useful in practice
- **Episode visibility/access controls** — no need for "who can see this episode"
- **Tree view for shows** — not needed
- **Heavy automation system** — keep actions simple (email on complete, notification on assign)
- **Process propagation to existing episodes** — process changes only affect future episodes (may add later with a proper diff/preview UI)

---

## Build Phases

### Phase 1: Foundation
Users, shows, workflows, processes, task templates, episodes, tasks. Basic CRUD for all entities. Navigation and layout with always-visible sidebar.

### Phase 2: Episode Execution
Dashboard (my episodes, my tasks). Workflow episode list with filters. Episode detail with task list. Task completion with progress calculation. Manual date editing with explicit Update button. One-off task deletion within an episode.

### Phase 3: Assignment System
Global roles with member pools (managed under People → Roles). Show role assignments (pick from pool per show). Task template assignment modes (none, user, role). Role-based task assignment resolution during episode creation.

### Phase 4: Conditional Logic
Show setting definitions (seeded with podcast production defaults). Show setting values. Visibility rules on task templates with AND/OR toggle and four operators (must contain, must not contain, must not be empty, must be empty). Visibility evaluation during episode creation. Task dependencies with blocked/greyed-out state and unblocking on prerequisite completion.

### Phase 5: Structured Task Content
Form blocks in task templates. Block types: description, text input, rich text, dropdown, radio, checkboxes, file attachment, date/time, heading, todo list. Response storage in live tasks. Required field validation. Task comments with @mentions.

### Phase 6: Dates and Scheduling
Date rules on task templates. Automatic date calculation during episode creation. Date cascade recalculation when dates change. Overdue indicators.

### Phase 7: Communication
Email templates on tasks. Token interpolation (episode title, show settings, task responses). Send, send & mark complete, copy body. Auto-send on task completion option.

---

## Key Interaction Patterns to Preserve

1. **Process-first architecture**: Build the production process once, stamp out episodes repeatedly.
2. **Show-driven conditionality**: One show's settings change which tasks appear automatically.
3. **Role abstraction**: Processes stay generic ("Video Editor"); shows personalize ("Video Editor = JP"). Roles are global with member pools; shows pick from the pool.
4. **Visibility vs dependencies**: Visibility determines if a task exists for this show at all (hidden entirely). Dependencies determine if an existing task is available yet based on other tasks' completion (greyed out). One hides completely, the other blocks interaction.
5. **Mixed operational and data-entry tasks**: A task can be both "do this work" and "fill out this form."
6. **Embedded communication**: Email tasks tie client communication to production completion.
7. **Date cascading**: Setting dates on one task ripples through to dependent tasks automatically.
8. **Explicit save**: Nothing persists until the user clicks Update/Save.
9. **Live episodes are independent**: Changes to an episode only affect that episode, never the process or other episodes.
