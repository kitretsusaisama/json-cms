import type React from "react";
import type { Metadata } from "next";
import { CMSProviderWithNonce } from "@upflame/adapter-nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wave1 Smoke",
  description: "Generated with create-json-cms",
};

export default async function RootLayout({ children }: { children: React.ReactNode }): Promise<React.ReactElement> {
  return (
    <html lang="en">
      <body>
        <CMSProviderWithNonce locale="en">{children}</CMSProviderWithNonce>
      </body>
    </html>
  );
}
