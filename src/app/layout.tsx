import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Workflow - Sistema de Organización y Seguimiento",
  description: "Plataforma SaaS B2B para la gestión eficiente de tareas y equipos.",
};

import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          <Toaster 
            position="top-right" 
            richColors 
            theme="light" 
            toastOptions={{
              style: {
                borderRadius: '16px',
                border: 'none',
                boxShadow: 'var(--shadow-premium)',
                backdropFilter: 'blur(10px)',
                background: 'rgba(255, 255, 255, 0.85)'
              }
            }}
          />
          {children}
        </AuthProvider>
        <div id="modal-root"></div>
      </body>
    </html>
  );
}
