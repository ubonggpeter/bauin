"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAV = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    href: "/admin/stories",
    label: "Stories",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    ),
  },
  {
    href: "/admin/investments",
    label: "Investments",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    href: "/admin/withdrawals",
    label: "Withdrawals",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
  {
    href: "/admin/pools",
    label: "Tool Pools",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    href: "/admin/approvals",
    label: "Approvals",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  {
    href: "/admin/support",
    label: "Support",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    href: "/admin/rate-limits",
    label: "Rate Limits",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
];

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={`w-4 h-4 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function NavItems({
  isActive, onNav,
}: {
  isActive: (href: string) => boolean;
  onNav?: () => void;
}) {
  return (
    <>
      {NAV.map((item) => {
        const active = isActive(item.href);
        return (
          <div key={item.href} className="relative group">
            <Link
              href={item.href}
              onClick={onNav}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-sm font-medium ${
                active ? "bg-white/20 text-white" : "text-primary-light hover:bg-white/10 hover:text-white"
              }`}
            >
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gold rounded-r-full" />}
              <span className="flex-shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          </div>
        );
      })}
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("admin-sidebar-collapsed");
    if (stored !== null) setCollapsed(stored === "true");
  }, []);

  // Close drawer on outside-touch
  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setMobileOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("admin-sidebar-collapsed", String(next));
      return next;
    });
  }

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  async function handleSignOut() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-bg-light flex">

      {/* ── Mobile top bar ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-primary text-white flex items-center gap-3 px-4 border-b border-white/10">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-xl hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <span className="block w-5 h-0.5 bg-white rounded-full" />
          <span className="block w-5 h-0.5 bg-white rounded-full" />
          <span className="block w-4 h-0.5 bg-white rounded-full" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gold rounded-md flex items-center justify-center flex-shrink-0">
            <span className="text-text-dark font-black text-xs">B</span>
          </div>
          <span className="font-bold text-white text-sm">BAUIN Admin</span>
        </div>
        <div className="flex-1" />
        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-primary-light hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </header>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside
            ref={drawerRef}
            className="relative z-10 w-72 max-w-[85vw] bg-primary text-white flex flex-col h-full overflow-y-auto"
            style={{ animation: "slideInLeft 0.25s ease" }}
          >
            {/* Drawer header */}
            <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
              <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-text-dark font-black text-sm">B</span>
              </div>
              <div>
                <p className="font-bold text-white leading-none">BAUIN</p>
                <p className="text-[10px] text-primary-light mt-0.5">Admin Panel</p>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="ml-auto w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-primary-light hover:text-white"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {/* Nav */}
            <nav className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto">
              <NavItems isActive={isActive} onNav={() => setMobileOpen(false)} />
            </nav>
            {/* Sign out */}
            <div className="px-2 pb-6 border-t border-white/10 pt-3">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-primary-light hover:text-white hover:bg-white/10 transition-colors text-sm w-full"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <aside className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-primary text-white z-30 transition-[width] duration-300 ${collapsed ? "w-16" : "w-64"}`}>
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-text-dark font-black text-sm">B</span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-bold text-white leading-none">BAUIN</p>
              <p className="text-[10px] text-primary-light mt-0.5 whitespace-nowrap">Admin Panel</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <div key={item.href} className="relative group">
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-sm font-medium ${collapsed ? "justify-center" : ""} ${active ? "bg-white/20 text-white" : "text-primary-light hover:bg-white/10 hover:text-white"}`}
                >
                  {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gold rounded-r-full" />}
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
                {collapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-text-dark text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className={`px-2 pb-4 flex flex-col gap-1 border-t border-white/10 pt-3 ${collapsed ? "items-center" : ""}`}>
          <button
            onClick={toggleCollapse}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-primary-light hover:text-white hover:bg-white/10 transition-colors text-sm w-full ${collapsed ? "justify-center" : ""}`}
          >
            <CollapseIcon collapsed={collapsed} />
            {!collapsed && <span>Collapse</span>}
          </button>
          <button
            onClick={handleSignOut}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-primary-light hover:text-white hover:bg-white/10 transition-colors text-sm w-full ${collapsed ? "justify-center" : ""}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className={`flex-1 min-h-screen transition-[margin] duration-300 pt-14 lg:pt-0 ${collapsed ? "lg:ml-16" : "lg:ml-64"}`}>
        {children}
      </main>

      <style>{`@keyframes slideInLeft{from{transform:translateX(-100%)}to{transform:translateX(0)}}`}</style>
    </div>
  );
}
