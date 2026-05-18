"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

export default function NavbarWrapper() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return (
    <Suspense fallback={<div className="h-16 bg-surface/95 border-b border-border sticky top-0 z-50" />}>
      <Navbar />
    </Suspense>
  );
}
