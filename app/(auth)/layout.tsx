export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth pages don't have Navbar or Footer
  return <>{children}</>;
}
