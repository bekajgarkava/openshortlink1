const robotsHeader = { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet, noimageindex" };
const privateHeaders = [
 { key: "Cache-Control", value: "private, no-store, max-age=0" },
 { key: "Referrer-Policy", value: "no-referrer" },
 { key: "X-Content-Type-Options", value: "nosniff" }
];
const nextConfig = {
 async headers() {
  return [
   { source: "/:path*", headers: [robotsHeader] },
   { source: "/", headers: privateHeaders },
   { source: "/sms/:path*", headers: privateHeaders },
   { source: "/api/:path*", headers: privateHeaders }
  ];
 }
};
export default nextConfig;
