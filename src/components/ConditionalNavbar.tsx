'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';

/**
 * Conditionally renders Navbar - hidden on auth pages
 */
export function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Hide navbar on auth pages
  if (pathname?.startsWith('/auth')) {
    return null;
  }
  
  return <Navbar />;
}
