import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";

export type SearchResult = {
  id: string;
  title: string;
  subtitle: string | null;
  type: "episode" | "show" | "task" | "person" | "workflow" | "process";
  link: string;
  meta?: { avatarUrl?: string | null };
};

export type SearchResponse = {
  results: { type: string; label: string; items: SearchResult[] }[];
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] } satisfies SearchResponse);
  }

  const supabase = await createClient();
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdminUser = isAdmin(currentUser);
  const pattern = `%${q}%`;

  // Build queries based on role
  const queries: Promise<{ type: string; label: string; items: SearchResult[] }>[] = [];

  // Episodes — admins see all, users see only episodes where they have assigned tasks
  queries.push(
    (async () => {
      let episodeQuery = supabase
        .from("episodes")
        .select("id, title, workflow_id, show_id")
        .ilike("title", pattern)
        .limit(5);

      if (!isAdminUser) {
        // Get episode IDs where user has tasks
        const { data: userTasks } = await supabase
          .from("tasks")
          .select("episode_id")
          .eq("assigned_user_id", currentUser.id)
          .eq("is_visible", true);
        const episodeIds = [...new Set((userTasks ?? []).map((t) => t.episode_id))];
        if (episodeIds.length === 0) return { type: "episode", label: "Episodes", items: [] };
        episodeQuery = episodeQuery.in("id", episodeIds);
      }

      const { data } = await episodeQuery;
      // Get show names for subtitles
      const showIds = [...new Set((data ?? []).map((e) => e.show_id))];
      const { data: shows } = showIds.length
        ? await supabase.from("shows").select("id, name, avatar_url").in("id", showIds)
        : { data: [] };
      const showMap = new Map((shows ?? []).map((s) => [s.id, s]));

      return {
        type: "episode",
        label: "Episodes",
        items: (data ?? []).map((e) => {
          const show = showMap.get(e.show_id);
          return {
            id: e.id,
            title: e.title,
            subtitle: show?.name ?? null,
            type: "episode" as const,
            link: `/workflows/${e.workflow_id}/episodes/${e.id}`,
            meta: { avatarUrl: show?.avatar_url ?? null },
          };
        }),
      };
    })()
  );

  // Tasks — admins see all visible non-completed, users see only their assigned tasks
  queries.push(
    (async () => {
      let taskQuery = supabase
        .from("tasks")
        .select("id, title, episode_id")
        .ilike("title", pattern)
        .eq("is_visible", true)
        .neq("status", "completed")
        .limit(5);

      if (!isAdminUser) {
        taskQuery = taskQuery.eq("assigned_user_id", currentUser.id);
      }

      const { data } = await taskQuery;
      const episodeIds = [...new Set((data ?? []).map((t) => t.episode_id))];
      const { data: episodes } = episodeIds.length
        ? await supabase.from("episodes").select("id, title, workflow_id").in("id", episodeIds)
        : { data: [] };
      const episodeMap = new Map((episodes ?? []).map((e) => [e.id, e]));

      return {
        type: "task",
        label: "Tasks",
        items: (data ?? []).map((t) => {
          const ep = episodeMap.get(t.episode_id);
          return {
            id: t.id,
            title: t.title,
            subtitle: ep?.title ?? null,
            type: "task" as const,
            link: ep
              ? `/workflows/${ep.workflow_id}/episodes/${ep.id}#task-${t.id}`
              : "#",
          };
        }),
      };
    })()
  );

  // People — admins see all, users see only themselves
  queries.push(
    (async () => {
      if (!isAdminUser) {
        // User can only find themselves
        const matches =
          currentUser.full_name.toLowerCase().includes(q.toLowerCase()) ||
          currentUser.email.toLowerCase().includes(q.toLowerCase());
        return {
          type: "person",
          label: "People",
          items: matches
            ? [{
                id: currentUser.id,
                title: currentUser.full_name,
                subtitle: currentUser.email,
                type: "person" as const,
                link: `/people/${currentUser.id}`,
              }]
            : [],
        };
      }

      const { data } = await supabase
        .from("users")
        .select("id, full_name, email")
        .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
        .limit(5);

      return {
        type: "person",
        label: "People",
        items: (data ?? []).map((u) => ({
          id: u.id,
          title: u.full_name,
          subtitle: u.email,
          type: "person" as const,
          link: `/people/${u.id}`,
        })),
      };
    })()
  );

  // Admin-only: Shows, Workflows, Processes
  if (isAdminUser) {
    queries.push(
      (async () => {
        const { data } = await supabase
          .from("shows")
          .select("id, name, status, avatar_url")
          .ilike("name", pattern)
          .limit(5);
        return {
          type: "show",
          label: "Shows",
          items: (data ?? []).map((s) => ({
            id: s.id,
            title: s.name,
            subtitle: s.status,
            type: "show" as const,
            link: `/shows/${s.id}`,
            meta: { avatarUrl: s.avatar_url },
          })),
        };
      })()
    );

    queries.push(
      (async () => {
        const { data } = await supabase
          .from("workflows")
          .select("id, name")
          .ilike("name", pattern)
          .limit(5);
        return {
          type: "workflow",
          label: "Workflows",
          items: (data ?? []).map((w) => ({
            id: w.id,
            title: w.name,
            subtitle: null,
            type: "workflow" as const,
            link: `/workflows/${w.id}`,
          })),
        };
      })()
    );

    queries.push(
      (async () => {
        const { data } = await supabase
          .from("processes")
          .select("id, name")
          .ilike("name", pattern)
          .limit(5);
        return {
          type: "process",
          label: "Processes",
          items: (data ?? []).map((p) => ({
            id: p.id,
            title: p.name,
            subtitle: null,
            type: "process" as const,
            link: `/processes/${p.id}`,
          })),
        };
      })()
    );
  }

  const groups = await Promise.all(queries);
  const results = groups.filter((g) => g.items.length > 0);

  return NextResponse.json({ results } satisfies SearchResponse);
}
