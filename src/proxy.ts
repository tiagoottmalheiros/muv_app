import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/", "/entrar", "/obrigado", "/ativar", "/muv-starter(.*)", "/sign-in(.*)", "/sign-up(.*)", "/checkout(.*)", "/api/access/cart-status", "/api/meta/conversion", "/api/stripe/checkout", "/api/webhooks/stripe", "/api/webhooks/eduzz", "/api/eduzz/cart", "/api/eduzz/cart-postback", "/api/eduzz/custom-delivery", "/acesso-nao-encontrado", "/__clerk(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
