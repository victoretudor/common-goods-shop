import type { Metadata } from "next";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Common Goods", template: "%s · Common Goods" },
  description: "Thoughtfully made everyday goods.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
        <footer className="border-t border-stone-200 py-8 text-center text-sm text-stone-500">
          © {new Date().getFullYear()} Common Goods. Free shipping on orders over $50.
        </footer>
      </body>
    </html>
  );
}
