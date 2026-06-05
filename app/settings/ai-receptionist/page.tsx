import { redirect } from "next/navigation";

export default function AiReceptionistSettingsPage() {
  redirect("/dashboard?page=settings");
}
