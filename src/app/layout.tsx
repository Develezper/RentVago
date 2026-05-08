import type { Metadata } from "next";
import { AppToaster } from "@/components/ui/toaster";
import "./globals.css";

const APP_TITLE = "RentVago - Arriendos en el Valle de Aburrá";
const APP_DESCRIPTION =
  "Encuentra arriendos confiables en el Valle de Aburrá con filtros inteligentes, alertas y gestión segura.";

const resolveMetadataBase = (): URL => {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!siteUrl) {
    return new URL("http://localhost:3000");
  }

  try {
    return new URL(siteUrl);
  } catch {
    return new URL("http://localhost:3000");
  }
};

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: {
    default: APP_TITLE,
    template: "%s | RentVago",
  },
  description: APP_DESCRIPTION,
  applicationName: "RentVago",
  openGraph: {
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    url: "/",
    siteName: "RentVago",
    locale: "es_CO",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: APP_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    images: ["/opengraph-image"],
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const themeScript = `
    (() => {
      try {
        const theme = window.localStorage.getItem("rentvago-theme") === "light" ? "light" : "dark";
        document.documentElement.dataset.theme = theme;
      } catch {
        document.documentElement.dataset.theme = "dark";
      }
    })();
  `;

  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
