"use client";
import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";

const HIDE_NAV_ON = ["/success"];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = !HIDE_NAV_ON.includes(pathname);

  return (
    <>
      {children}
      {showNav && <BottomNav />}
    </>
  );
}
