@AGENTS.md

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