import type { NextRequest } from "next/server";

import { middleware } from "@/lib/supabase/middleware";

export function proxy(request: NextRequest) {
  return middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
