import type { MetadataRoute } from "next";

// Add to Home Screen opens K.I.V. full-screen, like an app. Served without
// a session (PUBLIC_PATHS in proxy.ts): the browser fetches it on its own.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "K.I.V. — Kivaro Intelligence Vectoring",
    short_name: "K.I.V.",
    description: "The unified operating system for Kivaro AI.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#080c0a",
    theme_color: "#080c0a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
