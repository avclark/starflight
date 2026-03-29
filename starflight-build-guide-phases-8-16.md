# Starflight — Build Guide: Phases 8–16

Follow the same workflow as phases 1–7: create a feature branch, paste the prompt into Claude Code, test, fix issues, commit, merge into main.

---

## Phase 8: Task Editing in Episodes

```bash
git checkout main && git pull && git checkout -b phase-8/episode-task-editing
```

```
Read PRD.md and PRD-phases-8-16.md, specifically the Phase 8 section.

Build Phase 8: Task Editing in Episodes. The core principle is that tasks inside an episode instance should have the SAME block editing capabilities as tasks in the process builder. Currently, the process builder lets me add/edit/delete blocks, but episodes only let me fill in form responses and complete tasks. Fix this gap.

DATABASE:
1. Create a new task_instance_blocks table for blocks added directly to a task in an episode (not inherited from the template). Schema: id (uuid PK), task_id (FK → tasks), block_type, label, required (default false), options_json (jsonb), display_order, created_at.
2. Add a hidden_template_block_ids jsonb column to the tasks table — stores an array of template block IDs that have been removed from this specific task instance.
3. Create migration files.

TASK RENAMING IN EPISODES:
1. Task titles in the episode detail should be editable inline — click the title to edit, save on Update Task button click.

ADD/EDIT/DELETE BLOCKS IN EPISODES:
1. Below the existing blocks on each task in an episode, show a "+ New block" button.
2. Clicking it opens the same block type picker grid used in the process builder (description, text input, rich text, dropdown, radio, checkbox, file attachment, date & time, heading, comments).
3. After selecting a type, show the configuration form: label, required toggle, options (for dropdown/radio/checkbox).
4. New blocks are saved to task_instance_blocks, not the template.
5. Each block (both template-inherited and instance-level) should have a three-dot menu on the right with: Block Settings, Send to top, Move up, Move down, Send to bottom, Delete Block.
6. "Block Settings" opens an inline editor for that block's label, required toggle, and options.
7. Deleting a template-inherited block adds its ID to hidden_template_block_ids on the task (it's hidden, not actually deleted from the template).
8. Deleting an instance-level block removes it from task_instance_blocks.
9. When rendering blocks on a task, merge template blocks (excluding hidden ones) with instance blocks, sorted by display_order.
10. Moving blocks up/down/top/bottom updates display_order across the merged list.

Do NOT build:
- Drag and drop reordering (Phase 9)
- Duplicate task from another process (Phase 9)
- Any visual/design changes beyond making the new features functional
```

**After Phase 8**: Add blocks to a task inside an episode. Edit a block via Block Settings. Delete a template-inherited block and verify it's hidden (not deleted from the template). Move blocks up/down. Create a new episode from the same process and verify the original template blocks are intact. Commit and merge.

```bash
git add . && git commit -m "Phase 8: Episode task editing — add/edit/delete blocks, rename tasks"
git push -u origin phase-8/episode-task-editing
git checkout main && git merge phase-8/episode-task-editing && git push
```

---

## Phase 9: Drag & Drop and Duplicate Tasks

```bash
git checkout -b phase-9/drag-drop-duplicate
```

```
Read PRD-phases-8-16.md, specifically the Phase 9 section.

Build Phase 9: Drag & Drop and Duplicate Tasks.

DRAG AND DROP:
1. Install dnd-kit: npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
2. In the process builder, task template cards should be drag-and-droppable for reordering. Show a drag handle icon on the left of each card. Update positions in the database on drop.
3. In the episode detail, task rows should be drag-and-droppable for reordering. Show a drag handle icon. Position changes only affect this episode instance — they do not propagate to the process template or other episodes.
4. Blocks within a task (in both process builder and episode detail) should also be drag-and-droppable for reordering. Show a drag handle on each block.
5. Use smooth drag animations — the dragged item should have a slight scale-up and shadow while being dragged, and other items should animate to make room.

DUPLICATE TASK FROM ANOTHER PROCESS:
1. Update the "+ Add Task" button (in both process builder and episode detail) to show two options when clicked: "Blank task" and "Copy from existing".
2. "Blank task" — creates an empty task with a title input field. Pressing Enter creates it immediately. This should be the default/fastest path.
3. "Copy from existing" — opens a searchable command palette using shadcn Command/CommandDialog. It lists ALL tasks across ALL processes, grouped by process name. The user types to filter, clicks or presses Enter to select.
4. The selected task is duplicated with all its blocks, visibility rules, dependencies (adjusted to reference tasks within the same process if applicable), date rules, and assignment settings.
5. In a process builder context: the duplicated task is added as a new task_template in the current process.
6. In an episode context: the duplicated task is added as a standalone instance task (not linked to any template). Its blocks are stored in task_instance_blocks. Assignment, visibility rules, dependencies, and date rules are copied to the task instance where applicable.

Do NOT build:
- Any visual/design changes beyond making the new features functional
```

**After Phase 9**: Drag and drop tasks in both the process builder and an episode — verify positions save correctly. Drag and drop blocks within a task. Use "Copy from existing" to duplicate a task from one process into another. Duplicate a task into an episode and verify blocks come with it. Commit and merge.

```bash
git add . && git commit -m "Phase 9: Drag & drop reordering, duplicate task from existing"
git push -u origin phase-9/drag-drop-duplicate
git checkout main && git merge phase-9/drag-drop-duplicate && git push
```

---

## Phase 10: People & Profiles

```bash
git checkout -b phase-10/people-profiles
```

```
Read PRD-phases-8-16.md, specifically the Phase 10 section.

Build Phase 10: People & Profiles.

DATABASE:
1. Add first_name, last_name, and timezone columns to the users table. Migrate existing full_name data: split on the first space into first_name and last_name. Keep full_name as a generated/computed column or update it on save.
2. Create migration file.

PROFILE PAGE (/people/[id]):
1. Clicking a person's name in the People list navigates to their profile page.
2. Profile page shows: First Name (text input), Last Name (text input), Email (text input), Timezone (dropdown of common timezones — use a standard IANA timezone list), Avatar (placeholder for now — actual upload comes in Phase 12).
3. Explicit Save button — no auto-save.

EDIT FUNCTIONALITY:
1. From the People list, each person's row should be clickable to navigate to their profile.
2. The profile page allows editing all fields.
3. When first_name or last_name is updated, update full_name accordingly.

AVATAR DISPLAY:
1. Create a reusable UserAvatar component that shows the person's avatar image if available, or their initials (from first + last name) in a colored circle if not.
2. Use this component everywhere a person is referenced:
   - People list
   - Episode task list (assigned person column)
   - Dashboard My Tasks and My Episodes widgets
   - Role member pools (People → Roles tab)
   - Show role assignment dropdowns
   - Notification dropdown
   - Task comments (comment author)
3. For now, avatars will be initials-only since upload comes in Phase 12. But build the component to accept an avatar_url prop so it's ready.

Do NOT build:
- Actual image upload (Phase 12)
- Notification preferences page (Phase 14)
```

**After Phase 10**: Create/edit people via the profile page. Verify initials avatars appear throughout the app. Check timezone saves correctly. Commit and merge.

```bash
git add . && git commit -m "Phase 10: People profiles — edit, timezone, avatar component"
git push -u origin phase-10/people-profiles
git checkout main && git merge phase-10/people-profiles && git push
```

---

## Phase 11: Show Settings Reorganization

```bash
git checkout -b phase-11/show-settings-reorg
```

```
Read PRD-phases-8-16.md, specifically the Phase 11 section.

Build Phase 11: Show Settings Reorganization.

MOVE SETTINGS UNDER SHOWS:
1. Remove "Settings" from the sidebar navigation.
2. On the Shows list page (/shows), add a second tab alongside the show list: "Shows" (the list, active by default) and "Settings" (the setting definitions management UI).
3. Move all the setting definition management functionality (add, edit, reorder, delete definitions) from /settings/show-settings to this new Settings tab under Shows.
4. Delete the old /settings route and page.

NEW FIELD TYPES:
1. Add these field types to show_setting_definitions: rich_text, select_dropdown, radio_options, website_url, email_address, file_upload.
2. For select_dropdown and radio_options, the definition needs to store options. Use the existing options_json column (add it to show_setting_definitions if it doesn't exist) to store the list of choices. When creating/editing a definition of these types, show an options editor (add, remove, reorder options).
3. Update the Shows → Settings tab to allow selecting these new types when creating a definition.

UPDATE SHOW SETTINGS RENDERING:
1. On the show detail page Show Settings tab, update the rendering to handle new types:
   - rich_text → textarea (or simple rich text editor)
   - select_dropdown → dropdown select populated with the definition's options
   - radio_options → radio button group populated with the definition's options
   - website_url → text input with URL validation (must start with http:// or https://)
   - email_address → text input with email format validation
   - file_upload → placeholder file upload button (actual upload in Phase 12)
2. Save button at the bottom — no auto-save.

Do NOT build:
- Actual file upload functionality (Phase 12)
- Any design changes
```

**After Phase 11**: Verify Settings is under Shows tab, not in sidebar. Create definitions with new field types. Fill in settings on a show. Verify validation on URL and email fields. Commit and merge.

```bash
git add . && git commit -m "Phase 11: Show settings under Shows tab, new field types"
git push -u origin phase-11/show-settings-reorg
git checkout main && git merge phase-11/show-settings-reorg && git push
```

---

## Phase 12: Image Uploads

```bash
git checkout -b phase-12/image-uploads
```

```
Read PRD-phases-8-16.md, specifically the Phase 12 section.

Build Phase 12: Image Uploads using Supabase Storage.

SUPABASE STORAGE SETUP:
1. Create three storage buckets in Supabase: "avatars", "show-artwork", "task-attachments".
2. Set up storage policies: authenticated users can upload and read from all buckets. Files are public-readable (use public URLs for display).
3. Create a reusable upload utility in /src/lib/storage.ts that handles file upload to a specified bucket and returns the public URL.

USER AVATARS:
1. On the person profile page (/people/[id]), add an avatar upload area.
2. Show current avatar (or initials placeholder) with an "Upload" or "Change" button.
3. Accept PNG, JPG, WEBP. Max 1MB. Show error if file is too large or wrong type.
4. Upload to "avatars" bucket with filename: {user_id}.{extension}
5. Save the public URL to users.avatar_url.
6. The UserAvatar component from Phase 10 should now display the actual image when avatar_url is set.

SHOW ARTWORK:
1. On the show detail page, add an artwork upload area near the show name/header.
2. Show current artwork (or a generic placeholder icon) with "Upload artwork" button.
3. Accept PNG, JPG, WEBP. Max 2MB.
4. Upload to "show-artwork" bucket with filename: {show_id}.{extension}
5. Save the public URL to shows.avatar_url.
6. Create a reusable ShowAvatar component (similar to UserAvatar) that shows artwork or a placeholder.
7. Display show artwork:
   - Shows list (small thumbnail next to each show name)
   - Show detail page header
   - Episode creation modal (next to show dropdown options if feasible)
   - Workflow episode list (show column)

FILE ATTACHMENT BLOCKS:
1. When a task has a file_attachment block type, render an upload zone in the episode task detail.
2. Upload files to "task-attachments" bucket with filename: {task_id}/{block_id}/{original_filename}
3. Store the file URL in task_block_responses value_json.
4. Display uploaded files as downloadable links with the original filename.
5. Allow deleting/replacing an uploaded file.

Do NOT build:
- Any design changes beyond making uploads functional
```

**After Phase 12**: Upload a user avatar, verify it replaces initials throughout the app. Upload show artwork, verify it displays in lists and detail pages. Upload a file in a file attachment block, verify download works. Commit and merge.

```bash
git add . && git commit -m "Phase 12: Image uploads — avatars, show artwork, file attachments"
git push -u origin phase-12/image-uploads
git checkout main && git merge phase-12/image-uploads && git push
```

---

## Phase 13: Auth

```bash
git checkout -b phase-13/auth
```

```
Read PRD-phases-8-16.md, specifically the Phase 13 section.

Build Phase 13: Authentication using Supabase Auth.

IMPORTANT: This phase replaces the temporary user switcher with real authentication. Every user-specific feature (dashboard, notifications, My Tasks, My Episodes) should use the authenticated user after this phase.

AUTH SETUP:
1. Enable Email auth in Supabase dashboard (Authentication → Providers → Email).
2. Create auth helper utilities using @supabase/ssr for server-side and client-side auth.
3. Create middleware in /src/middleware.ts that:
   - Checks for an authenticated session on every request
   - Redirects unauthenticated users to /login
   - Allows /login page without auth

LOGIN PAGE (/login):
1. Email + password login form.
2. "Sign in with magic link" option as alternative.
3. Error handling for wrong credentials.
4. Redirect to /dashboard on successful login.

USER LINKING:
1. When a user logs in, match their Supabase Auth email to the users table email.
2. If no matching user record exists, create one from their auth profile.
3. Store the Supabase Auth user ID in a new column on the users table: auth_id (uuid, nullable, unique).
4. Create migration for the auth_id column.

INVITE FLOW:
1. Admin can invite new users by entering their email on the People page.
2. This creates a user record in the users table AND sends a Supabase Auth invite email.
3. The invited user clicks the link, sets their password, and can log in.

REPLACE USER SWITCHER:
1. Remove the "Viewing as" dropdown from the dashboard.
2. Remove the cookie-based user selection throughout the app.
3. All user-specific queries (My Tasks, My Episodes, notifications) use the authenticated user's ID from the session.
4. Add the current user's name and avatar to the sidebar footer or header with a dropdown menu: Profile, Notification Settings, Logout.

ROW LEVEL SECURITY:
1. Update RLS policies on all tables:
   - All authenticated users can SELECT all data (internal team tool).
   - All authenticated users can INSERT, UPDATE, DELETE all data (tighten later if needed).
   - Notifications: users can only see their own (user_id = auth.uid() linked through users table).
2. Test that unauthenticated requests are rejected.

LOGOUT:
1. Logout clears the session and redirects to /login.

Do NOT build:
- Role-based permissions (admin vs contributor) — all users have full access for now
- Password reset flow (Supabase handles this automatically)
```

**After Phase 13**: Test the full auth flow — login, verify dashboard shows your data, verify notifications are yours only, logout, verify redirect to login. Invite a team member, verify they can sign up and log in. Commit and merge.

```bash
git add . && git commit -m "Phase 13: Auth — login, user linking, invite flow, RLS"
git push -u origin phase-13/auth
git checkout main && git merge phase-13/auth && git push
```

---

## Phase 14: Notifications, Email & Slack

```bash
git checkout -b phase-14/notifications-email
```

```
Read PRD-phases-8-16.md, specifically the Phase 14 section.

Build Phase 14: Real email sending, expanded notifications, and notification preferences.

EMAIL SETUP (Resend):
1. Install Resend: npm install resend
2. Add RESEND_API_KEY to .env.local (the user will get this from resend.com).
3. Create an email utility in /src/lib/email.ts that wraps the Resend API.
4. Create a simple HTML email template function that takes a subject, body (HTML), and recipient, and sends via Resend.
5. The "from" address should be configurable via an environment variable (RESEND_FROM_EMAIL), defaulting to "Starflight <notifications@yourdomain.com>".

REPLACE EMAIL PLACEHOLDERS:
1. Find every place where emails are "logged" instead of sent (task email templates, auto-send on completion, etc.).
2. Replace with actual Resend API calls.
3. Keep the toast notifications ("Email sent to client@email.com").
4. Handle errors gracefully — if email fails, show error toast but don't block the task completion.

NOTIFICATION TRIGGERS:
All four triggers should create an in-app notification AND send an email (if the user's preferences allow it):

1. Task assigned: already partially implemented. Ensure it sends a real email with task title, episode title, and a link to the episode.
2. Task starting: when a task's start_date arrives. Needs a scheduled check.
3. Task due: when a task's due_date arrives. Needs a scheduled check.
4. @mention in comment: when a comment containing @[Name] is posted, notify the mentioned user.

For triggers 2 and 3, create a Supabase Edge Function or a Next.js API route that runs on a schedule (cron):
- Query tasks where start_date <= now() AND status != 'completed' AND no "starting" notification has been sent yet.
- Query tasks where due_date <= now() AND status != 'completed' AND no "due" notification has been sent yet.
- To track which notifications have been sent, add a notifications_sent jsonb column to the tasks table that stores which notification types have been triggered (e.g., {"starting": true, "due": true}).
- This check should run every 15 minutes.

NOTIFICATION PREFERENCES:
1. Create notification_preferences table: id (uuid PK), user_id (FK → users, unique), on_task_assigned (bool default true), on_task_starting (bool default true), on_task_due (bool default true), on_comment_mention (bool default true), email_on_task_assigned (bool default true), email_on_task_starting (bool default true), email_on_task_due (bool default true), email_on_comment_mention (bool default true).
2. Create a Notification Settings page accessible from the user menu in the sidebar/header.
3. Show all 8 toggles organized in two columns: "In-app" and "Email" for each trigger type.
4. Save button — explicit save, no auto-save.
5. All triggers check preferences before creating notification or sending email. Default to ON if no preferences record exists.

SLACK INTEGRATION (stretch goal):
1. Add a slack_webhook_url column to users table.
2. On the notification settings page, add a "Slack Webhook URL" field.
3. When a notification is triggered and the user has a Slack webhook configured, POST a formatted message to their webhook.
4. If this is too complex right now, skip it and add a TODO.

Do NOT build:
- Any design changes
- Complex email templates (keep them simple and clean)
```

**After Phase 14**: Set up a Resend account and add the API key to .env.local. Verify real emails are sent on task assignment and email task completion. Test notification preferences — toggle one off, verify no notification/email for that trigger. Commit and merge.

```bash
git add . && git commit -m "Phase 14: Notifications, email via Resend, preferences"
git push -u origin phase-14/notifications-email
git checkout main && git merge phase-14/notifications-email && git push
```

---

## Phase 15: Performance Optimization

```bash
git checkout -b phase-15/performance
```

```
Read PRD-phases-8-16.md, specifically the Phase 15 section.

Build Phase 15: Performance Optimization. The goal is to make every interaction feel as fast as possible.

OPTIMISTIC UI UPDATES:
1. Task completion: when the user clicks the checkbox, immediately update the UI (check it off, update progress). Send the database update in the background. If it fails, roll back the UI and show an error toast.
2. Date updates: when the user clicks "Update Task", immediately show the new dates. Persist and cascade in the background.
3. Form block saves: when clicking "Update Task", immediately show saved state. Persist in background.
4. Task reordering (drag and drop): immediately show new positions. Persist in background.
5. Use React's useOptimistic or manage optimistic state manually with try/catch patterns.

SUPABASE REALTIME:
1. On the episode detail page, subscribe to changes on the tasks table filtered by episode_id. When another user completes a task or updates dates, the UI updates automatically without refresh.
2. For notifications, replace the polling with a Supabase Realtime subscription on the notifications table filtered by user_id. New notifications appear instantly.
3. Clean up subscriptions on component unmount.

DATABASE INDEXES:
1. Create a migration that adds indexes on:
   - tasks(episode_id)
   - tasks(assigned_user_id)
   - tasks(task_template_id)
   - episodes(workflow_id)
   - episodes(show_id)
   - task_block_responses(task_id)
   - notifications(user_id, read)
   - show_role_assignments(show_id)
   - show_setting_values(show_id)

PREFETCHING AND CACHING:
1. Use Next.js Link component with prefetch for navigation links in the sidebar, workflow cards, and episode lists.
2. Cache data that rarely changes using React cache() or Next.js data cache: roles, show setting definitions, processes and task templates (invalidate on edit).

EPISODE CREATION OPTIMIZATION:
1. Consolidate the episode creation logic (create episode, create tasks, evaluate visibility, resolve assignments, calculate dates) into a single Supabase RPC call (Postgres function). This reduces creation time from multiple round trips to one.
2. Create the Postgres function in a migration file.

LOADING STATES:
1. Add skeleton loading states (using shadcn Skeleton component) to episode task list, dashboard widgets, workflow episode list, and any page that takes noticeable time to load.

Do NOT build:
- Any design changes
- Client-side routing conversion (evaluate after deploying)
```

**After Phase 15**: Navigate around the app and verify pages feel faster. Mark tasks complete — verify instant UI response. Open the app in two browser windows, complete a task in one, verify it updates in the other. Check that episode creation is noticeably faster. Commit and merge.

```bash
git add . && git commit -m "Phase 15: Performance — optimistic UI, realtime, indexes, prefetching"
git push -u origin phase-15/performance
git checkout main && git merge phase-15/performance && git push
```

---

## Phase 16: UI/Design Pass

```bash
git checkout -b phase-16/ui-design
```

This phase is different — establish a design direction with Claude (in claude.ai) before prompting Claude Code. Share screenshots, references, color palettes, and preferences. Then use the resulting prompt. Here's a starter:

```
Read PRD.md and PRD-phases-8-16.md, specifically the Phase 16 section. Also read CLAUDE.md for context.

Build Phase 16: Full UI/Design Pass. Transform the app from functional-but-plain to polished and professional.

DESIGN DIRECTION:
[TO BE CUSTOMIZED — insert your design direction, color palette, references, and preferences here before giving this to Claude Code]

Apply changes systematically across every page and component. Maintain all existing functionality — this is purely visual.
```

**After Phase 16**: Click through every screen. Verify design is consistent and nothing is broken. Commit and merge.

```bash
git add . && git commit -m "Phase 16: UI/Design pass — full visual overhaul"
git push -u origin phase-16/ui-design
git checkout main && git merge phase-16/ui-design && git push
```

---

## Deployment

After all phases are merged, deploy to Vercel:

```bash
npm install -g vercel
vercel
```

Set environment variables in Vercel:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- RESEND_API_KEY
- RESEND_FROM_EMAIL

---

## Email Provider Note

**Resend** is the recommended email provider:
- **Free tier**: 3,000 emails/month, 100/day
- **Best integration**: Built for Next.js. One npm package, one API call.
- **Setup**: Create account at resend.com, get API key, add to .env.local
- **Domain verification**: Add DNS records in Resend to send from your own domain. Without this, you can send from their shared domain.
