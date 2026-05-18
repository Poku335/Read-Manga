"use client";

import { usePathname } from "next/navigation";

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <main className="max-w-[88rem] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 page-enter">{children}</main>;
}
