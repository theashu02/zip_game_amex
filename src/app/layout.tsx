import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zip — Daily Path Puzzle",
  description: "Connect the numbers in order by drawing a continuous path through every cell. A daily logic puzzle inspired by LinkedIn Zip.",
  openGraph: {
    title: "Zip — Daily Path Puzzle",
    description: "Can you trace the perfect path? Try today's Zip puzzle!",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
