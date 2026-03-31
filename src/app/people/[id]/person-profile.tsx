"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/file-upload";
import { UserAvatar } from "@/components/user-avatar";
import { updatePerson } from "@/lib/actions/people";
import { uploadFile, ACCEPTED_IMAGE_TYPES } from "@/lib/storage";
import type { Tables } from "@/lib/types/database";

const TIMEZONES: { value: string; label: string; offset: number }[] = [
  { value: "Pacific/Honolulu", label: "(GMT-10:00) Hawaii", offset: -10 },
  { value: "America/Anchorage", label: "(GMT-09:00) Alaska", offset: -9 },
  { value: "America/Los_Angeles", label: "(GMT-08:00) Pacific Time (US & Canada)", offset: -8 },
  { value: "America/Vancouver", label: "(GMT-08:00) Vancouver", offset: -8 },
  { value: "America/Denver", label: "(GMT-07:00) Mountain Time (US & Canada)", offset: -7 },
  { value: "America/Phoenix", label: "(GMT-07:00) Arizona", offset: -7 },
  { value: "America/Chicago", label: "(GMT-06:00) Central Time (US & Canada)", offset: -6 },
  { value: "America/Mexico_City", label: "(GMT-06:00) Mexico City", offset: -6 },
  { value: "America/New_York", label: "(GMT-05:00) Eastern Time (US & Canada)", offset: -5 },
  { value: "America/Toronto", label: "(GMT-05:00) Toronto", offset: -5 },
  { value: "America/Bogota", label: "(GMT-05:00) Bogota", offset: -5 },
  { value: "America/Halifax", label: "(GMT-04:00) Atlantic Time (Canada)", offset: -4 },
  { value: "America/Sao_Paulo", label: "(GMT-03:00) Brasilia", offset: -3 },
  { value: "America/Argentina/Buenos_Aires", label: "(GMT-03:00) Buenos Aires", offset: -3 },
  { value: "Atlantic/Cape_Verde", label: "(GMT-01:00) Cape Verde", offset: -1 },
  { value: "Europe/London", label: "(GMT+00:00) London, Dublin", offset: 0 },
  { value: "Africa/Lagos", label: "(GMT+01:00) Lagos, West Africa", offset: 1 },
  { value: "Europe/Paris", label: "(GMT+01:00) Paris, Brussels", offset: 1 },
  { value: "Europe/Berlin", label: "(GMT+01:00) Berlin, Amsterdam", offset: 1 },
  { value: "Europe/Madrid", label: "(GMT+01:00) Madrid", offset: 1 },
  { value: "Europe/Rome", label: "(GMT+01:00) Rome", offset: 1 },
  { value: "Europe/Stockholm", label: "(GMT+01:00) Stockholm", offset: 1 },
  { value: "Africa/Cairo", label: "(GMT+02:00) Cairo", offset: 2 },
  { value: "Africa/Johannesburg", label: "(GMT+02:00) Johannesburg", offset: 2 },
  { value: "Europe/Helsinki", label: "(GMT+02:00) Helsinki", offset: 2 },
  { value: "Europe/Moscow", label: "(GMT+03:00) Moscow", offset: 3 },
  { value: "Asia/Dubai", label: "(GMT+04:00) Dubai, Abu Dhabi", offset: 4 },
  { value: "Asia/Kolkata", label: "(GMT+05:30) Mumbai, Kolkata", offset: 5.5 },
  { value: "Asia/Bangkok", label: "(GMT+07:00) Bangkok, Hanoi", offset: 7 },
  { value: "Asia/Singapore", label: "(GMT+08:00) Singapore, Kuala Lumpur", offset: 8 },
  { value: "Asia/Hong_Kong", label: "(GMT+08:00) Hong Kong", offset: 8 },
  { value: "Asia/Shanghai", label: "(GMT+08:00) Beijing, Shanghai", offset: 8 },
  { value: "Australia/Perth", label: "(GMT+08:00) Perth", offset: 8 },
  { value: "Asia/Seoul", label: "(GMT+09:00) Seoul", offset: 9 },
  { value: "Asia/Tokyo", label: "(GMT+09:00) Tokyo, Osaka", offset: 9 },
  { value: "Australia/Sydney", label: "(GMT+10:00) Sydney, Canberra", offset: 10 },
  { value: "Australia/Melbourne", label: "(GMT+10:00) Melbourne", offset: 10 },
  { value: "Pacific/Auckland", label: "(GMT+12:00) Auckland, Wellington", offset: 12 },
].sort((a, b) => a.offset - b.offset);

const NONE_VALUE = "__none__";

export function PersonProfile({
  person,
}: {
  person: Tables<"users">;
}) {
  const [firstName, setFirstName] = useState(
    person.first_name ?? person.full_name.split(" ")[0] ?? ""
  );
  const [lastName, setLastName] = useState(
    person.last_name ?? person.full_name.split(" ").slice(1).join(" ") ?? ""
  );
  const [email, setEmail] = useState(person.email);
  const [timezone, setTimezone] = useState(person.timezone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(person.avatar_url);
  const [saving, setSaving] = useState(false);

  const displayName = `${firstName} ${lastName}`.trim();

  async function handleSave() {
    setSaving(true);
    const result = await updatePerson(person.id, {
      first_name: firstName,
      last_name: lastName,
      email,
      timezone: timezone || null,
    });
    setSaving(false);
    if (result.error) {
      toast(result.error);
    } else {
      toast("Profile saved");
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href="/people">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <UserAvatar
          name={displayName || person.email}
          avatarUrl={avatarUrl}
          size="lg"
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {displayName || "New Person"}
          </h1>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name</Label>
            <Input
              id="first_name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name</Label>
            <Input
              id="last_name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select
            value={timezone || NONE_VALUE}
            onValueChange={(v) => setTimezone(v === NONE_VALUE ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>No timezone set</SelectItem>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Avatar</Label>
          <div className="flex items-center gap-4">
            <UserAvatar
              name={displayName || person.email}
              avatarUrl={avatarUrl}
              size="lg"
            />
            <FileUpload
              accept="image/png,image/jpeg,image/webp"
              maxSizeMB={1}
              currentUrl={avatarUrl}
              label="Upload avatar"
              onUpload={async (file) => {
                const ext = file.name.split(".").pop() ?? "jpg";
                const result = await uploadFile(
                  "avatars",
                  `${person.id}.${ext}`,
                  file,
                  { maxSizeMB: 1, acceptedTypes: ACCEPTED_IMAGE_TYPES }
                );
                if (result.url) {
                  setAvatarUrl(result.url);
                  // Save immediately
                  const { createClient } = await import("@/lib/supabase/client");
                  const supabase = createClient();
                  await supabase
                    .from("users")
                    .update({ avatar_url: result.url })
                    .eq("id", person.id);
                  toast("Avatar uploaded");
                }
                return result;
              }}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </div>
  );
}
