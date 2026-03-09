import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/dashboard/Sidebar";

export const metadata: Metadata = {
  title: "AI SDR Dashboard",
  description: "Autonomous AI Sales Development Representative",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        {/* Restore path after GitHub Pages 404 redirect */}
        <script dangerouslySetInnerHTML={{
          __html: `(function(){var q=window.location.search;var p=/[?&]p=([^&]+)/.exec(q);if(p){window.history.replaceState(null,null,decodeURIComponent(p[1])+(q.replace(/[?&]p=[^&]+/,'').replace(/^&/,'?')||'')+(window.location.hash||''));}})();`
        }} />
      </head>
      <body className="font-sans bg-slate-50 antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
