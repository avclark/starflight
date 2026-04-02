import { NextResponse } from "next/server";

// Task reminder notifications have moved to /api/cron/task-reminders.
// This route redirects for backwards compatibility.

export async function GET(request: Request) {
  const url = new URL(request.url);
  url.pathname = "/api/cron/task-reminders";
  return NextResponse.redirect(url, 307);
}
