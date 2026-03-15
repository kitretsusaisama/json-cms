import { createCspMiddleware } from "@upflame/adapter-nextjs";

export const middleware = createCspMiddleware();

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
