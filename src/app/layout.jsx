import { Roboto, Roboto_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar/Navbar";
import { Toaster } from "@/components/ui/sonner";
import LoaderProvider from "@/components/ui/Custom/ToastLoader";
import { AuthProvider } from "@/contexts/auth";
import { XpProvider } from "@/contexts/xp";
import { NightModeProvider } from "@/contexts/nightMode";
import { NotificationProvider } from "@/contexts/notifications";
import { Analytics } from "@vercel/analytics/next";
import OfflineIndicator from "@/components/OfflineIndicator";
import NotificationChecker from "@/components/NotificationChecker";
import ClientDebugBoundary from "@/components/debug/ClientDebugBoundary";
import { initServerDebug } from "@/lib/debug/serverDebugInit";

initServerDebug();

const robotoSans = Roboto({
  variable: "--font-roboto-sans",
  subsets: ["latin"],
  weight: ["400", "700"], // Specify font weights if needed
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata = {
  title: "InnoVision",
  description: "Our AI-powered platform creates personalized, chapter-wise courses on any topic you want to learn. Master new skills at your own pace with interactive content.",
  icons: {
    icon: "/InnoVision_LOGO-removebg-preview.png",
    shortcut: "/InnoVision_LOGO-removebg-preview.png",
    apple: "/InnoVision_LOGO-removebg-preview.png",
  },
  openGraph: {
    title: "InnoVision - AI-Powered Learning Platform",
    description: "Our AI-powered platform creates personalized, chapter-wise courses on any topic you want to learn. Master new skills at your own pace with interactive content.",
    url: "https://innovision7.live",
    siteName: "InnoVision",
    images: [
      {
        url: "/InnoVision_LOGO-removebg-preview.png",
        width: 200,
        height: 200,
        alt: "InnoVision Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "InnoVision - AI-Powered Learning Platform",
    description: "Our AI-powered platform creates personalized, chapter-wise courses on any topic you want to learn.",
    images: ["/InnoVision_LOGO-removebg-preview.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/InnoVision_LOGO-removebg-preview.png" />
        <link rel="apple-touch-icon" href="/InnoVision_LOGO-removebg-preview.png" />
      </head>
      <body className={`${robotoSans.variable} ${robotoMono.variable} antialiased`}>
        <AuthProvider>
          <XpProvider>
            <NightModeProvider>
              <NotificationProvider>
                <LoaderProvider>
                  <Navbar />
                  <main className="pt-16 relative">{children}</main>
                  <OfflineIndicator />
                  <NotificationChecker />
                  <Toaster richColors />
                </LoaderProvider>
              </NotificationProvider>
            </NightModeProvider>
          </XpProvider>
        </AuthProvider>
        <Analytics />
        <ClientDebugBoundary />
      </body>
    </html>
  );
}
