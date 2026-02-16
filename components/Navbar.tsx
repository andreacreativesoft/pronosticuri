'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Navbar({ playerName }: { playerName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const links = [
    { href: '/', label: 'Etapa curentă', icon: '🏠' },
    { href: '/clasament', label: 'Clasament', icon: '🏆' },
    { href: '/istoric', label: 'Istoric', icon: '📋' },
  ];

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <>
      {/* Top bar */}
      <header className="bg-[#1B5E20] text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight">
            PronoLiga
          </Link>
          {playerName && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-green-200 hidden sm:inline">
                {playerName}
              </span>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-md transition"
              >
                {loggingOut ? '...' : 'Ieșire'}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Bottom mobile nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 sm:hidden">
        <div className="flex justify-around">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center py-2 px-3 text-xs ${
                  isActive
                    ? 'text-[#1B5E20] font-semibold'
                    : 'text-gray-500'
                }`}
              >
                <span className="text-lg mb-0.5">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop nav tabs */}
      <nav className="hidden sm:block bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 flex gap-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                  isActive
                    ? 'border-[#1B5E20] text-[#1B5E20]'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {link.icon} {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
