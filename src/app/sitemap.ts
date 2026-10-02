import type { MetadataRoute } from "next";

const BASE_URL = "https://www.kliniva.cl";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${BASE_URL}/login`, changeFrequency: "yearly", priority: 0.5 },
  ];
}
