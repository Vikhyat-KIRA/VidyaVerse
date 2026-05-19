import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://vidyaverse.vercel.app");

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"], // Disallow bots from indexing API routes
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
