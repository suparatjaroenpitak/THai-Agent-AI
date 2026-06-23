import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const sarabun = Sarabun({ 
  subsets: ["latin", "thai"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
  variable: "--font-sarabun"
});

export const metadata: Metadata = {
  title: "OpenCodex",
  description: "Browser-native AI coding agent with cloud workspaces, local folders, GitHub, MCP, and multi-agent workflows."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={sarabun.variable} suppressHydrationWarning>
      <body className="font-sarabun" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
