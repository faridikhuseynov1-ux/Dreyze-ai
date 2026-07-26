import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ToastContainer } from "@/components/ui/ToastContainer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Dreyze AI",
    template: "%s | Dreyze AI",
  },
  description: "Приватный AI-чат с памятью, множеством передовых моделей (ChatGPT, Claude, Gemini, DeepSeek) и расширенными режимами работы.",
  keywords: ["Dreyze AI", "Dreyze", "AI chat", "нейросеть чат", "ИИ ассистент", "ChatGPT альтернатива", "Claude альтернатива", "приватный чат", "dreyzfarid"],
  authors: [{ name: "Dreyze AI" }],
  creator: "Dreyze",
  metadataBase: new URL("https://dreyzfarid.online"),
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "https://dreyzfarid.online",
    title: "Dreyze AI - Ваш умный ИИ-ассистент",
    description: "Приватный AI-чат с памятью, множеством передовых моделей и расширенными режимами работы. Dreyze AI — это ваш личный помощник.",
    siteName: "Dreyze AI",
  },
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
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport: import("next").Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=JSON.parse(localStorage.getItem('dreyz-ai-theme'));var th=(t&&t.state&&t.state.theme)?t.state.theme:'dark';if(th==='dark'){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark');}else{document.documentElement.classList.remove('dark');document.documentElement.setAttribute('data-theme','light');}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="antialiased bg-bg text-text">
        <AuthProvider>
          {children}
          <ToastContainer />
        </AuthProvider>
      </body>
    </html>
  );
}
