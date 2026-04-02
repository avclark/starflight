import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function NotificationsPage() {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect(`/people/${currentUser.id}?tab=notifications`);
  }
  redirect("/login");
}
