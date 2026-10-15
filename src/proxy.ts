import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

// Arabic is the default for everyone. Browser Accept-Language is ignored so the
// platform never opens in English on its own; only the user's explicit choice
// (the NEXT_LOCALE cookie set when they switch language) can change it.
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete("accept-language");
  return handleI18nRouting(new NextRequest(request, { headers }));
}

export const config = {
  matcher: ["/", "/(ar|en)/:path*"],
};
