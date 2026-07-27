import type { Metadata } from "next";

const SITE_URL = "https://panlabs.tech";
const TITLE = "panlabs — catálogo";
const DESCRIPTION =
  "Laboratório vivo de soluções de software criadas com AI. Experimentos que viraram SaaS reais, versionados e em produção.";

export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "panlabs",
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/assets/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/assets/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/assets/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "panlabs",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};
