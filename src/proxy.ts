import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

export function proxy(...args: Parameters<typeof handleI18nRouting>) {
  return handleI18nRouting(...args);
}

export const config = {
  matcher: ["/", "/(ar|en)/:path*"],
};
