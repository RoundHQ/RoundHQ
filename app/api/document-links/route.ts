import { NextResponse } from "next/server";
import { createDocumentShareLink } from "@/lib/messaging/server";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { documentType?: unknown; documentId?: unknown }
    | null;
  const documentType = body?.documentType;
  const documentId = typeof body?.documentId === "string" ? body.documentId.trim() : "";

  if ((documentType !== "quote" && documentType !== "invoice") || !documentId) {
    return NextResponse.json({ error: "Choose a valid quote or invoice." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  try {
    const organizationId = await ensureWorkspace(supabase, user);
    const url = await createDocumentShareLink({
      supabase,
      organizationId,
      documentType,
      documentId,
      createdBy: user.id,
      requestUrl: request.url,
    });
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create the secure link." },
      { status: 500 }
    );
  }
}
