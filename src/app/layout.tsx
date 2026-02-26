import type { Metadata } from "next";
import { Inter, IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

const ibmPlexSerif = IBM_Plex_Serif({
  variable: "--font-ibm-plex-serif",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rick Peruse - The Perfect PDF Reader",
  description:
    "A paradigm-shifting PDF reader with text reflow, customizable typography, immersive audio, AI features, and full accessibility.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Rick Peruse",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0f0f0f" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        className={`${inter.variable} ${ibmPlexSans.variable} ${ibmPlexSerif.variable} antialiased`}
      >
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
