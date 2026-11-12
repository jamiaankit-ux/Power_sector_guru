// Lets the owner install the admin console as its own app ("PSA Admin") on a phone or computer.
export function GET() {
  return Response.json({
    name: "Power Sector Academy Admin",
    short_name: "PSA Admin",
    description: "Manage courses, learners, payments and website content",
    id: "/admin",
    start_url: "/admin",
    scope: "/admin",
    display: "standalone",
    background_color: "#0b1b3f",
    theme_color: "#0b1b3f",
    icons: [
      { src: "/icons/admin-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/admin-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
    shortcuts: [{ name: "Orders", url: "/admin/orders" }, { name: "Courses", url: "/admin/courses" }, { name: "Discount codes", url: "/admin/coupons" }],
  }, { headers: { "Content-Type": "application/manifest+json" } });
}
