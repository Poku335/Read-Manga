import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://read-manboh.vercel.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/manga/"],
        disallow: ["/admin/", "/api/", "/auth/", "/settings/", "/wallet/", "/topup/", "/refer/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
