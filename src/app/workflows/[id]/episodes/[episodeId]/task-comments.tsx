"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { MentionTextarea } from "@/components/mention-textarea";
import { UserAvatar } from "@/components/user-avatar";
import { postComment } from "@/lib/actions/blocks";
import type { Tables } from "@/lib/types/database";

type Comment = Tables<"task_comments">;
type Person = { id: string; full_name: string };

export function TaskComments({
  taskId,
  episodeId,
  workflowId,
  comments,
  userMap,
  userAvatarMap = {},
  people,
}: {
  taskId: string;
  episodeId: string;
  workflowId: string;
  comments: Comment[];
  userMap: Record<string, string>;
  userAvatarMap?: Record<string, string | null>;
  people: Person[];
}) {
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  async function handlePost() {
    if (!body.trim()) return;
    setPosting(true);
    const result = await postComment(taskId, episodeId, workflowId, body);
    setPosting(false);
    if (result.error) {
      const { toast } = await import("sonner");
      toast(result.error);
      return;
    }
    setBody("");
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Comments</h4>

      {comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No comments yet.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <UserAvatar name={userMap[c.user_id] ?? "?"} avatarUrl={userAvatarMap[c.user_id]} size="xs" />
                <span className="text-xs font-medium">
                  {userMap[c.user_id] ?? "Unknown"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(c.created_at), "MMM d, h:mm a")}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
        </div>
      )}

      <MentionTextarea
        value={body}
        onChange={setBody}
        people={people}
        placeholder="Write a comment... Type @ to mention someone"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handlePost();
          }
        }}
      />

      <Button size="sm" onClick={handlePost} disabled={posting || !body.trim()}>
        {posting ? "Posting..." : "Post Comment"}
      </Button>
    </div>
  );
}
