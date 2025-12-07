'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';

/**
 * Conditionally renders Navbar - hidden on auth and preview pages
 */
export function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Hide navbar on auth pages and preview pages
  if (pathname?.startsWith('/auth') || pathname?.startsWith('/preview')) {
    return null;
  }
  
  return <Navbar />;
}
