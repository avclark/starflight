# Starflight — PRD Addendum: Phases 8–16

This document extends the original PRD (starflight-prd-v4.md) with requirements for phases 8 through 16. The original PRD remains the source of truth for the core data model and concepts. This addendum covers new features, changes, and additions built on top of that foundation.

---

## Phase 8: Task Editing in Episodes

### Principle

Tasks inside an episode instance should have the same block editing capabilities as tasks in the process builder. The user should be able to modify, add, remove, and reorder blocks on tasks in both contexts. Changes made inside an episode are one-offs — they do not propagate to the process or other episodes.

### Requirements

**Task renaming in episodes:**
- Clicking a task title in an episode should make it editable inline, same as the process builder.
- Save on explicit Update button click.

**Add/edit/delete blocks in episode tasks:**
- Each task in an episode should have a "+ New block" button below the existing blocks.
- Clicking it opens the same block type picker used in the process builder (description, text input, rich text, dropdown, radio, checkbox, file attachment, date & time, heading, comments).
- After selecting a type, the user configures the block (label, required toggle, options for dropdown/radio/checkbox).
- Existing blocks on a task should have a three-dot menu with: Block Settings (edit label, required, options), Send to top, Move up, Move down, Send to bottom, Delete Block.
- These block additions/edits are stored on the task instance, not the template. They only affect this one episode.

**Data model addition for episode-level blocks:**
- New table: `task_instance_blocks` — stores blocks added directly to a task in an episode (not inherited from the template).

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| task_id | uuid | FK → tasks |
| block_type | text | Same types as task_template_blocks |
| label | text | |
| required | boolean | default false |
| options_json | jsonb | |
| display_order | int | |
| created_at | timestamptz | |

- When rendering a task in an episode, merge template blocks and instance blocks, ordered by display_order.
- Template blocks can be hidden/removed per-instance by adding a `hidden_template_block_ids` jsonb column on the tasks table.

**Block management behavior:**
- Deleting a template-inherited block adds its ID to hidden_template_block_ids on the task (hidden, not actually deleted from the template).
- Deleting an instance-level block removes it from task_instance_blocks.
- When rendering blocks on a task, merge template blocks (excluding hidden ones) with instance blocks, sorted by display_order.
- Moving blocks up/down updates display_order for both template-inherited and instance blocks within the merged list.

---

## Phase 9: Drag & Drop and Duplicate Tasks

### Requirements

**Drag and drop reordering:**
- Both process builder and episode task lists should support drag-and-drop reordering of tasks using dnd-kit.
- In the process builder, reordering updates the task template positions.
- In an episode, reordering updates the task instance positions (one-off, does not affect template).
- Blocks within a task should also be drag-and-droppable for reordering.
- Show a drag handle icon on the left of each draggable item.

**Duplicate task from another process:**
- When clicking "+ Add Task" (in both process builder and episode), show two options:
  - "Blank task" — creates an empty task (default, can just press Enter)
  - "Copy from existing" — opens a searchable command palette (using shadcn Command component) showing all tasks across all processes, grouped by process name. User types to filter, clicks to select.
- Selected task is duplicated with all its blocks, visibility rules, dependencies, date rules, and assignment settings.
- In an episode context, the duplicated task is added as a standalone instance task (not linked to any template). Its blocks are stored in task_instance_blocks.
- In a process builder context, the duplicated task is added as a new task template in the current process.

---

## Phase 10: People & Profiles

### Requirements

**Person profile page (/people/[id]):**
- Fields: First name, Last name, Email, Avatar (upload), Timezone (dropdown of common timezones).
- All fields editable with explicit Save button.
- Avatar upload stores image in Supabase Storage (Phase 12 will formalize storage setup, but basic upload can work here).

**Edit existing people:**
- Clicking a person's name in the People list navigates to their profile page.
- Name and email are editable (currently can only add or delete people).

**Avatar display throughout the app:**
- Wherever a person's name appears, show their avatar next to it (or initials if no avatar):
  - Episode task list (assigned person)
  - Dashboard My Tasks and My Episodes
  - People list
  - Role member pools
  - Show role assignments
  - Notification dropdown
  - Task comments
  - Anywhere else a person is referenced

**Data model changes:**
- Add `first_name` and `last_name` columns to users table (keep `full_name` as a computed/display field for backward compatibility, or migrate to first/last).
- Add `timezone` column to users table (text, e.g., "America/New_York").

---

## Phase 11: Show Settings Reorganization

### Requirements

**Move settings management under Shows:**
- Remove "Settings" from the main sidebar navigation.
- On the Shows list page (/shows), add a second tab: "Shows" (the list, active by default) and "Settings" (where show setting definitions are managed).
- The Settings tab contains the same setting definition management UI that was previously at /settings/show-settings: add, edit, reorder, delete definitions.

**Additional field types for show setting definitions:**
Add these field types to the show_setting_definitions system:
- rich_text — rich text editor
- select_dropdown — single-select from predefined options
- radio_options — radio button selection from predefined options
- website_url — text input with URL validation
- email_address — text input with email validation
- file_upload — file upload field (stores URL after upload)

For select_dropdown and radio_options, the definition needs an `options_json` column (add it to show_setting_definitions if it doesn't exist) to store the list of choices.

**Update show settings rendering:**
- On the show detail Show Settings tab, render the new field types appropriately:
  - rich_text → rich text editor
  - select_dropdown → dropdown select
  - radio_options → radio button group
  - website_url → URL input with validation
  - email_address → email input with validation
  - file_upload → placeholder file upload button (actual upload in Phase 12)

---

## Phase 12: Image Uploads

### Requirements

**Supabase Storage setup:**
- Create a `avatars` bucket for user profile photos.
- Create a `show-artwork` bucket for show logos/artwork.
- Create a `task-attachments` bucket for file attachment blocks.
- Set up appropriate storage policies (authenticated users can upload/read).

**Show artwork:**
- On the show detail page, add an artwork upload area near the show name.
- Accepted formats: PNG, JPG, WEBP. Max size: 2MB.
- Show artwork displays:
  - Next to the show name on the show detail page
  - In the Shows list (small thumbnail next to each show name)
  - In any dropdown where shows are selectable (episode creation modal)
  - In the episode list on workflow detail pages

**User avatars:**
- On the person profile page, add avatar upload.
- Accepted formats: PNG, JPG, WEBP. Max size: 1MB.
- Displays everywhere a person is referenced (see Phase 10 list).

**File attachment blocks:**
- When a task has a file_attachment block type, the episode task detail should render an upload zone.
- Uploaded files are stored in Supabase Storage `task-attachments` bucket.
- Store the file URL in task_block_responses value_json.
- Display uploaded files as downloadable links.

---

## Phase 13: Auth

### Requirements

**Supabase Auth setup:**
- Email/password authentication.
- Magic link as an alternative login method.
- Sign up flow for new users (admin creates accounts, users receive invite email to set password).

**Login/logout:**
- Login page at /login.
- Redirect unauthenticated users to /login.
- Logout option in the sidebar or header.

**Link auth users to app users:**
- When a user logs in, match their Supabase Auth email to the existing users table record (match by email).
- If no matching user record exists, create one from their auth profile.
- Store the Supabase Auth user ID in a new column on the users table: auth_id (uuid, nullable, unique).

**Invite flow:**
- Admin can invite new users by entering their email on the People page.
- This creates a user record in the users table AND sends a Supabase Auth invite email.
- The invited user clicks the link, sets their password, and can log in.

**Replace user switcher:**
- Remove the "Viewing as" dropdown from the dashboard.
- Remove the cookie-based user selection throughout the app.
- All user-specific queries (My Tasks, My Episodes, notifications) use the authenticated user's ID.
- Add the current user's name and avatar to the sidebar footer or header with a dropdown menu: Profile, Notification Settings, Logout.

**Row Level Security:**
- All authenticated users can read all data (internal team tool).
- All authenticated users can write all data (tighten later if needed).
- Notifications: users can only see their own.

---

## Phase 14: Notifications, Email & Slack

### Requirements

**Email provider: Resend**
- Free tier: 3,000 emails/month, 100/day.
- Install: npm install resend
- Setup: create Resend account, get API key, store as RESEND_API_KEY environment variable.

**Real email sending:**
- Replace all "log + toast" email placeholders with actual Resend API calls.
- Email templates render HTML.
- Configurable "from" address via RESEND_FROM_EMAIL environment variable.

**Notification triggers — all create in-app notification AND send email:**
1. When a user is assigned to a task
2. When a task the user is assigned to reaches its start date
3. When a task the user is assigned to reaches its due date
4. When someone @mentions the user in a task comment

For triggers 2 and 3, implement a scheduled check (every 15 minutes) via Supabase Edge Function or Next.js API route with cron. Track sent notifications via a `notifications_sent` jsonb column on the tasks table.

**Notification preferences:**

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → users, unique |
| on_task_assigned | boolean | default true |
| on_task_starting | boolean | default true |
| on_task_due | boolean | default true |
| on_comment_mention | boolean | default true |
| email_on_task_assigned | boolean | default true |
| email_on_task_starting | boolean | default true |
| email_on_task_due | boolean | default true |
| email_on_comment_mention | boolean | default true |

- Notification preferences page accessible from user menu.
- All preferences default to ON.

**Slack integration (stretch goal):**
- Slack incoming webhooks.
- User configures webhook URL in profile.
- Notifications post to Slack when webhook is configured.
- Defer if too complex.

---

## Phase 15: Performance Optimization

### Requirements

**Optimistic UI updates:**
- Task completion: update UI immediately, sync in background, roll back on failure.
- Date updates: show new dates immediately, cascade in background.
- Form saves: show saved state immediately, persist in background.
- Task/block reordering: update positions immediately, persist in background.

**Supabase Realtime:**
- Subscribe to task changes per episode for live updates.
- Subscribe to notifications per user (replace polling).

**Database indexes:**
- tasks(episode_id), tasks(assigned_user_id), tasks(task_template_id)
- episodes(workflow_id), episodes(show_id)
- task_block_responses(task_id)
- notifications(user_id, read)
- show_role_assignments(show_id), show_setting_values(show_id)

**Prefetching and caching:**
- Next.js Link prefetching for common navigation paths.
- Cache roles, show setting definitions, processes.

**Episode creation optimization:**
- Consolidate episode creation into a single Supabase Postgres function to reduce round trips.

---

## Phase 16: UI/Design Pass

### Requirements

This phase is deliberately left open-ended. The goal is to transform the app from functional-but-plain to polished-and-professional.

**Areas to address:**
- Overall visual identity: colors, typography, spacing, shadows
- Sidebar design and navigation
- Card and list designs
- Process builder card design
- Episode task list and detail panel
- Dashboard layout
- Form and input styling
- Empty states and loading states
- Notification styling
- Consistent icon usage
- Mobile responsiveness (if needed)

**Design references to consider:**
- Linear (clean, fast, modern)
- Notion (flexible blocks, clean typography)
- ProcessKit screenshots for layout patterns
- The user's Swiss/Bauhaus aesthetic preference

This phase should be done with a clear design direction established first, then applied systematically.
