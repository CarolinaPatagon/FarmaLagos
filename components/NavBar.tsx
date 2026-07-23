'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from '@/lib/clsx';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/pedidos', label: 'Pedidos históricos' },
  { href: '/importar', label: 'Importar pedido' },
];

const SOLICITAR_MEJORA_HREF =
  'mailto:carolinagerosa@hotmail.com?subject=' + encodeURIComponent('Solicitud mejora FarmaLagos');

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold text-brand-700">
          FarmaLagos
        </Link>
        <nav className="flex gap-1">
          {LINKS.map((link) => {
            const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'rounded-lg px-3 py-2 text-sm font-medium transition',
                  active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <a
            href={SOLICITAR_MEJORA_HREF}
            className="ml-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Solicitar mejora
          </a>
        </nav>
      </div>
    </header>
  );
}
