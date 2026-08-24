import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dalili | M&E Intelligence",
  description: "AI-assisted M&E and research intelligence for African organisations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
