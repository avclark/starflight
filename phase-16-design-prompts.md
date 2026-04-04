# Phase 16: UI/Design Pass — Three Prompts

## Pass 1: Foundation (Layout, Colors, Typography, Sidebar)

```
Phase 16 Pass 1: Design Foundation. This sets up the structural shell that all other styling builds on. Do NOT change any functionality — only visual changes.

FONT:
1. Install DM Sans from Google Fonts. Set it as the primary font for the entire app using next/font/google. Replace the current font configuration.
2. Headings: font-semibold or font-bold, letter-spacing: -0.01em to -0.02em (slightly tight)
3. Base UI text: text-sm (14px)
4. Page titles: text-2xl font-semibold
5. Section titles: text-lg font-semibold
6. Muted/secondary text: text-gray-500

COLOR VARIABLES:
1. Set up CSS variables in globals.css for the color palette so it can be adjusted later:
   --bg-dark: #1a1a1a (sidebar/header)
   --bg-content: #FAFAFA (main content area)
   --bg-card: #FFFFFF
   --border-subtle: rgba(229, 231, 235, 0.6) (gray-200 at 60% opacity)
   --text-primary: #111111
   --text-muted: #6B7280 (gray-500)
   --accent-success: #059669 (emerald-600, used sparingly)
   --accent-warning: #D97706 (amber-600, used sparingly)
   --accent-danger: #E11D48 (rose-600, used sparingly)
2. Update the shadcn/ui theme variables to align with this palette

SIDEBAR:
1. Dark background (#1a1a1a or slate-900)
2. Collapsed by default — shows only icons, no text labels. Width when collapsed: 60-64px.
3. On hover, smoothly expands (200ms ease-in-out transition) to show icon + text label. Width when expanded: 220-240px.
4. When mouse leaves, collapses back. No permanent expanded state.
5. Active nav item: slightly lighter background (slate-800 or rgba(255,255,255,0.08)) with white icon. Inactive items: gray-400 icons and text.
6. "Starflight" at the top: when collapsed, show a small "S" mark or icon. When expanded, show "Starflight" in white text.
7. User avatar at the bottom: when collapsed, just the avatar circle. When expanded, avatar + name + email in small muted text.
8. Nav icons: use Lucide icons, sized at 20px, in gray-400. Active: white.
9. Subtle top-to-bottom gradient on the sidebar background is fine (e.g., from #1a1a1a to #111111) but not required.

TOP HEADER BAR:
1. Dark background matching the sidebar (#1a1a1a)
2. Height: 56-64px
3. Spans the full width to the right of the sidebar
4. Left side: search bar styled as a subtle dark input (bg-white/10 border-white/10 text-white placeholder-gray-500) with "Search..." placeholder and ⌘K badge
5. Right side: notification bell icon (gray-400, white when has unread), user avatar + name
6. No heavy borders — use subtle rgba dividers if needed

CONTENT AREA:
1. Background: #FAFAFA or white
2. The content area should feel elevated above the dark sidebar/header. Apply these treatments:
   - Round the top-left corner of the content area: rounded-tl-2xl (this is the ONE place a larger radius is used, to create the layered effect)
   - Add a very subtle shadow on the left and top edges
3. Page padding: px-6 py-6 on the content area
4. This creates the visual effect of the light content "sitting on top of" the dark shell

LAYOUT STRUCTURE:
1. The overall layout is: sidebar (left) + header (top) + content (remaining space)
2. When sidebar is collapsed, content takes up more horizontal space
3. Content area smoothly adjusts when sidebar expands on hover (no jarring jumps — use transition on the margin/padding)
4. Make sure the layout doesn't break or shift content on sidebar hover

LOGIN PAGE:
1. Full dark background matching the sidebar color
2. Centered white card with the login form
3. "Starflight" branding above the card
4. rounded-lg shadow-2xl on the card

Apply these foundation changes across the entire app — every page should pick up the new sidebar, header, content area, and font. Do NOT restyle individual components yet (buttons, inputs, cards, etc.) — that comes in the next pass.
```

---

## Pass 2: Components (Buttons, Inputs, Cards, Tables, Badges)

```
Phase 16 Pass 2: Component Styling. Restyle every shared UI component to match the design system. The foundation (sidebar, header, content area, font, colors) is already in place from Pass 1. Do NOT change any functionality.

CARDS:
- White background (#FFFFFF)
- Border: border border-gray-200/60 (subtle, semi-transparent)
- Shadow: shadow-sm
- Border radius: rounded-lg (8px)
- Padding: p-5 or p-6
- Clickable cards: hover:shadow-md with transition-shadow duration-150

BUTTONS:
- Primary: bg-gray-900 text-white hover:bg-gray-800, rounded-md, px-4 py-2, text-sm font-medium
- Secondary: bg-white border border-gray-200 text-gray-700 hover:bg-gray-50, rounded-md
- Destructive: bg-rose-600 text-white hover:bg-rose-700
- Ghost: no background, text-gray-600 hover:bg-gray-100 hover:text-gray-900
- Icon buttons: ghost style, rounded-md, p-2
- All buttons: transition-colors duration-150
- Consistent sizing across the app — no oversized or undersized buttons

FORM INPUTS:
- bg-white border border-gray-200 rounded-md px-3 py-2 text-sm
- Focus: ring-2 ring-gray-900/10 border-gray-400 (subtle dark ring, not bright blue)
- Placeholder: text-gray-400
- Labels: text-sm font-medium text-gray-700, space-y-1.5 between label and input
- Required indicator: small red asterisk after label text
- Textareas: same styling, min-h-[80px]
- Select/dropdowns: same base styling as inputs

TABLES AND LISTS:
- No heavy borders between rows — use border-gray-100 dividers or just spacing
- Row hover: bg-gray-50 with transition-colors duration-100
- Column headers: text-xs font-medium text-gray-500 uppercase tracking-wider
- Cell padding: px-4 py-3
- Avatar + name inline: avatar vertically centered with name text

BADGES AND CHIPS:
- Small: rounded-full px-2.5 py-0.5 text-xs font-medium
- Completed: bg-emerald-50 text-emerald-700
- Open: bg-gray-100 text-gray-600
- Overdue: bg-amber-50 text-amber-700
- Blocked: bg-gray-100 text-gray-400
- Role badges: bg-gray-100 text-gray-700
- Status badges should be subtle — desaturated tints, not bright colors

PROGRESS BARS:
- Thin: h-1.5 rounded-full
- Track: bg-gray-100
- Fill: bg-gray-900 (default) or bg-emerald-500 (for completed)
- Percentage text next to bar: text-xs text-gray-500

CHECKBOXES:
- Custom: rounded-sm border-2 border-gray-300
- Checked: bg-gray-900 border-gray-900 with white checkmark
- Smooth transition on check/uncheck
- Size: h-4 w-4

DROPDOWN MENUS (three-dot menus, etc.):
- White background, rounded-lg, shadow-lg, border border-gray-200
- Menu items: px-3 py-2 text-sm, hover:bg-gray-50
- Destructive items: text-rose-600 hover:bg-rose-50
- Separator: border-gray-100

MODALS/DIALOGS:
- White background, rounded-lg, shadow-2xl
- Backdrop: bg-black/50 backdrop-blur-sm
- Header: text-lg font-semibold with subtle bottom border (border-gray-100)
- Padding: p-6
- Footer with buttons: pt-4 flex justify-end gap-3

TABS:
- Understated style — text buttons, not heavy tab bars
- Active tab: text-gray-900 font-medium with a bottom border (border-b-2 border-gray-900)
- Inactive tabs: text-gray-500 hover:text-gray-700
- Tab bar: border-b border-gray-200 with pb-px

TOASTS (sonner):
- Match the card styling: white bg, rounded-lg, shadow-lg, subtle border
- Success: small green icon
- Error: small red icon

TOOLTIPS:
- bg-gray-900 text-white text-xs rounded-md px-2 py-1

Apply these component styles to EVERY instance across the entire app. Search for each component type and restyle it. Be thorough — inconsistency is worse than the wrong style.
```

---

## Pass 3: Page-Specific Polish

```
Phase 16 Pass 3: Page-specific polish. The foundation and components are styled. Now apply finishing touches to each specific page. Do NOT change any functionality.

DASHBOARD:
- Page title: "Dashboard" in text-2xl font-semibold
- My Episodes and My Tasks as side-by-side cards with equal height
- Card headers: title on left ("My Episodes"), "View all →" link on right in text-sm text-gray-500 hover:text-gray-900
- Episode rows: show artwork (small), episode title (font-medium), show name + workflow (text-sm text-gray-500), progress bar + percentage, date — all on one line, vertically centered
- Task rows: custom checkbox, task title (font-medium), episode name (text-sm text-gray-500), date range (text-sm, red if overdue)
- Clean spacing between rows: py-3 with subtle dividers

WORKFLOW LIST:
- Grid of cards (responsive: 1 col mobile, 2 col medium, 3 col large)
- Each card: workflow name (font-semibold), episode count badge, progress summary
- Hover: shadow elevation change

WORKFLOW DETAIL:
- Header: workflow name (text-2xl), process name link, "New Episode" button (primary style)
- Episode table: clean rows with show artwork, title, progress, date, three-dot menu
- Search input above the table

EPISODE DETAIL:
- Header: back arrow (ghost button), episode title (text-2xl font-semibold), show artwork + show name badge, progress bar + percentage, status badge
- Task cards: white cards with subtle border, clean row when collapsed showing drag handle, checkbox, chevron, title, assigned person avatar+name, date range, status badge, three-dot menu
- Expanded task: clean section layout with tab bar, form blocks in their own bordered containers, comfortable spacing
- "+" insert buttons: small circle centered on connector line, gray-200 border, gray-400 icon, hover darkens
- Visual connectors: thin vertical line in gray-200 between task cards
- Update Task / Mark Complete buttons at bottom of expanded area

PROCESS BUILDER:
- Same card treatment as episode detail but with sequence number badges (small rounded-full bg-gray-100 text-gray-600)
- Tab bar inside expanded cards: Content, Assignment, Visibility, Dependencies, Dates, Actions
- Block cards within the Content tab: subtle inner border, drag handle, three-dot menu
- "Add block" / "Save Blocks" buttons: secondary style

SHOWS LIST:
- Clean table: show artwork, name (font-medium), status badge, date, three-dot menu
- Clickable rows with hover state

SHOW DETAIL:
- Header: show artwork (large, 48-64px), show name (text-2xl), status badge
- Tab bar below: Show Settings, Role Assignments, Episodes
- Settings form: clean label + input pairs with comfortable spacing
- Role assignments: role name on left, person dropdown on right, clean rows

PEOPLE LIST:
- Table: avatar, name (font-medium), email (text-gray-500), role badges, three-dot menu
- "Invite Person" button: primary style

PEOPLE DETAIL / PROFILE:
- Header: large avatar (64-80px), name (text-2xl), email (text-gray-500)
- Tab bar: Episodes, Tasks, Shows, Notifications, Profile
- Each tab content: clean lists matching the dashboard styling

NOTIFICATIONS:
- Bell in header: small red dot (not a number badge) when unread > 0
- Dropdown: white, rounded-lg, shadow-xl, max-h-96 overflow-y-auto
- Each notification: px-4 py-3, unread: subtle bg-blue-50/50 or small blue dot on left
- "Mark all read" link in dropdown header
- Notification page: clean list matching dropdown style but full-width

SEARCH COMMAND PALETTE:
- Wider than current: max-w-xl or max-w-2xl
- Clean dark backdrop with blur
- Input: large, prominent, with search icon
- Results grouped with muted section headers (text-xs uppercase text-gray-400)
- Result rows: icon, title, subtitle/metadata right-aligned

EMPTY STATES:
- Centered: muted gray icon (48px), text-gray-500 heading, text-gray-400 description, action button below
- Generous vertical padding: py-16

LOADING SKELETONS:
- bg-gray-100 animate-pulse rounded-md
- Match layout of loaded content: card shapes, text line widths, avatar circles
- Skeleton for task rows: rectangle for checkbox, long rectangle for title, short for date, circle for avatar

FINAL CHECKS:
- Verify contrast: white text on dark sidebar is readable, dark text on light content is readable
- Verify hover states exist on all interactive elements
- Verify focus states on all form inputs (the subtle dark ring)
- Verify the collapsed sidebar doesn't overlap content or cause layout jumps
- Verify all modals have proper backdrop and styling
- Verify the app looks polished at common screen widths (1280px, 1440px, 1920px)
```
