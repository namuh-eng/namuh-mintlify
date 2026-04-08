import { SETTINGS_DEFAULT_HREF } from "@/lib/settings-nav";
import { redirect } from "next/navigation";

export default function SettingsIndexPage() {
  redirect(SETTINGS_DEFAULT_HREF);
}
