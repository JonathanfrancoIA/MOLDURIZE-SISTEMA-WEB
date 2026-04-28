import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MOLDURIZE — Otimização de Corte de EPS",
  description:
    "Plataforma SaaS para nesting 2D e geração de G-Code para corte de EPS. Reduza o desperdício em até 30%.",
  keywords: ["EPS", "nesting", "corte", "CNC", "G-Code", "espuma"],
};

// Check if Clerk keys are real (not placeholders)
const hasClerkKey =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("SUBSTITUA");

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (hasClerkKey) {
    // Dynamically import ClerkProvider only when keys are present
    const { ClerkProvider } = await import("@clerk/nextjs");
    return (
      <ClerkProvider>
        <html lang="pt-BR">
          <body>{children}</body>
        </html>
      </ClerkProvider>
    );
  }

  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
