import type { Metadata } from 'next';
import { NavBar } from '@/components/NavBar';
import './globals.css';

export const metadata: Metadata = {
  title: 'FarmaLagos · Análisis de pedidos',
  description: 'Importación y análisis de pedidos de medicamentos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <NavBar />
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
          Desarrollado por Carolina Gerosa
        </footer>
      </body>
    </html>
  );
}
