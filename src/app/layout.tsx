import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

// Configure base URL based on environment or fallback to standard domain
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://vidyaverse.vercel.app");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "VidyaVerse — Your AI Study Universe",
    template: "%s | VidyaVerse",
  },
  description:
    "VidyaVerse is an AI-powered educational dashboard featuring VAYU, your mystical study mentor, Flash-Forge vision analysis, Pomodoro coaching, and personalized learning paths.",
  keywords: [
    "VidyaVerse",
    "study",
    "AI",
    "education",
    "VAYU",
    "pomodoro",
    "flash-forge",
    "AI study planner",
    "interactive learning",
    "virtual study mentor"
  ],
  authors: [{ name: "VidyaVerse", url: SITE_URL }],
  creator: "VidyaVerse",
  publisher: "VidyaVerse",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "VidyaVerse — Your AI Study Universe",
    description: "Meet VAYU, your AI mentor. Study smarter, not harder.",
    url: SITE_URL,
    siteName: "VidyaVerse",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/globe.svg", // Fallback to icon; can be updated to specific og-image later
        width: 512,
        height: 512,
        alt: "VidyaVerse logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VidyaVerse — Your AI Study Universe",
    description: "Meet VAYU, your AI mentor. Study smarter, not harder.",
    creator: "@VidyaVerse",
    images: ["/globe.svg"],
  },
  verification: {
    // Drop in the verification token here once received from Google Search Console
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "google_verification_placeholder",
  },
  manifest: "/manifest.json",
};

// Rich Structured Data Schema (JSON-LD) for Search Engines
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "VidyaVerse",
      alternateName: ["Vidya Verse", "VidyaVerse AI", "VidyaVerse Study", "vidyaverse.vercel.app"],
      description: "Your AI-powered study companion and productivity dashboard.",
      publisher: {
        "@type": "Organization",
        name: "VidyaVerse",
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/globe.svg`,
        },
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: "VidyaVerse",
      operatingSystem: "All",
      applicationCategory: "EducationalApplication",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      description:
        "VidyaVerse is an AI-powered educational dashboard featuring VAYU, your mystical study mentor, Flash-Forge vision analysis, Pomodoro coaching, and personalized learning paths.",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full" style={{ fontFamily: 'var(--font-sans), system-ui, sans-serif' }} suppressHydrationWarning>
        {/* Permanent Obsidian dark theme */}
        {children}
        {/* Inject JSON-LD Schema Markup */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
