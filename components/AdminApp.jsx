"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell, BriefcaseBusiness, Building2, ChartNoAxesCombined, ChevronDown,
  Flag, History, LayoutDashboard, LogOut, Megaphone, Menu, Search, Settings,
  Users, X, Shield, Sparkles, BadgeCheck, Globe, FileSpreadsheet
} from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { AppProvider } from "./AppContext";
import {
  Avatar, Badge, ConfirmDialog, ErrorState, GlobalSearchModal, IconButton,
  NotificationCenterDropdown, SkeletonDashboard, SkeletonTable, ToastProvider, useToast
} from "./ui";
import { ROLE_LABELS, ROLE_MENUS } from "@/lib/constants";
import { FastApiOverviewView } from "./views/FastApiOverviewView";
import { FastApiKostsView } from "./views/FastApiKostsView";
import { FastApiBulkImportView } from "./views/FastApiBulkImportView";
import { FastApiOwnersView } from "./views/FastApiOwnersView";
import { OwnerVerificationQueueView } from "./views/OwnerVerificationQueueView";
import { FastApiUsersView } from "./views/FastApiUsersView";
import { FastApiReportQueueView } from "./views/FastApiReportQueueView";
import { FastApiAdsView } from "./views/FastApiAdsView";
import { LandingPageManagerView } from "./views/LandingPageManagerView";
import { FastApiAnalyticsView } from "./views/FastApiAnalyticsView";
import { FastApiActivityLogsView } from "./views/FastApiActivityLogsView";
import { SettingsView } from "./views/SettingsView";
import { KostFormModal } from "./views/KostView";
import { AdFormModal } from "./views/AdsView";
import { UserFormModal } from "./views/UsersView";

const navItems = [
  ["fastapi_overview", "Ringkasan", LayoutDashboard],
  ["fastapi_kosts", "Manajemen Kost", Building2],
  ["fastapi_bulk_import", "Import Data Kos", FileSpreadsheet],
  ["fastapi_owners", "Pemilik Kost", BriefcaseBusiness],
  ["verification", "Antrean Verifikasi", BadgeCheck],
  ["fastapi_users", "Pengguna", Users],
  ["fastapi_reports", "Laporan Kost", Flag],
  ["fastapi_ads", "Manajemen Iklan", Megaphone],
  ["landing_page", "Konten Landing Page", Globe],
  ["fastapi_analytics", "Analitik & Telemetri", ChartNoAxesCombined],
  ["fastapi_activity_logs", "Audit Log", History],
  ["settings", "Pengaturan", Settings],
];

const viewMeta = {
  fastapi_overview: ["Platform", "Ringkasan & Statistik"],
  fastapi_kosts: ["Properti", "Manajemen Kost"],
  fastapi_bulk_import: ["Properti", "Import Data Kos"],
  fastapi_owners: ["Mitra", "Pemilik Kost"],
  verification: ["Moderasi", "Antrean Verifikasi Pemilik"],
  fastapi_users: ["Pengguna", "Manajemen Pengguna"],
  fastapi_reports: ["Moderasi", "Laporan Pelanggaran Kost"],
  fastapi_ads: ["Pemasaran", "Manajemen Iklan"],
  landing_page: ["CMS", "Manajemen Konten Landing Page"],
  fastapi_analytics: ["Performa", "Analitik & Telemetri"],
  fastapi_activity_logs: ["Keamanan", "Audit Log Aktivitas"],
  settings: ["Sistem", "Pengaturan Profil & Sistem"],
  // Alias backward compatibility
  dashboard: ["Platform", "Ringkasan & Statistik"],
  kost: ["Properti", "Manajemen Kost"],
  owners: ["Mitra", "Pemilik Kost"],
  users: ["Pengguna", "Manajemen Pengguna"],
  reports: ["Moderasi", "Laporan Pelanggaran Kost"],
  ads: ["Pemasaran", "Manajemen Iklan"],
  analytics: ["Performa", "Analitik & Telemetri"],
  audit: ["Keamanan", "Audit Log Aktivitas"],
};

const views = {
  fastapi_overview: FastApiOverviewView,
  fastapi_kosts: FastApiKostsView,
  fastapi_bulk_import: FastApiBulkImportView,
  fastapi_owners: FastApiOwnersView,
  verification: OwnerVerificationQueueView,
  fastapi_users: FastApiUsersView,
  fastapi_reports: FastApiReportQueueView,
  fastapi_ads: FastApiAdsView,
  landing_page: LandingPageManagerView,
  fastapi_analytics: FastApiAnalyticsView,
  fastapi_activity_logs: FastApiActivityLogsView,
  settings: SettingsView,
  // Alias fallbacks for bookmarks / global search
  dashboard: FastApiOverviewView,
  kost: FastApiKostsView,
  owners: FastApiOwnersView,
  users: FastApiUsersView,
  reports: FastApiReportQueueView,
  ads: FastApiAdsView,
  analytics: FastApiAnalyticsView,
  audit: FastApiActivityLogsView,
};

export default function AdminApp(props) {
  return (
    <ToastProvider>
      <Shell {...props} />
    </ToastProvider>
  );
}

function applyTheme(theme) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

function Shell({ initialAdmin }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [admin, setAdmin] = useState(initialAdmin);
  const [activeView, setActiveViewState] = useState(
    initialAdmin?.role === "moderator"
      ? "fastapi_reports"
      : "fastapi_overview"
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setThemeState] = useState("light");
  const [search, setSearch] = useState("");
  const [kostForm, setKostForm] = useState(null);
  const [adForm, setAdForm] = useState(null);
  const [userForm, setUserForm] = useState(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [menu, setMenu] = useState(""); // "bell" | "profile" | ""
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [targetEntityId, setTargetEntityId] = useState(null);
  const isApiFirstView = activeView.startsWith("fastapi_") || activeView === "verification";

  /* preferensi tampilan & shortcut */
  useEffect(() => {
    const t = localStorage.getItem("ckk.theme") || "light";
    setThemeState(t);
    applyTheme(t);
    setCollapsed(localStorage.getItem("ckk.sidebar") === "collapsed");
    const fromHash = window.location.hash.slice(1);
    if (views[fromHash]) setActiveViewState(fromHash);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => localStorage.getItem("ckk.theme") === "system" && applyTheme("system");
    mq.addEventListener("change", onChange);

    const handleKeydown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeydown);

    return () => {
      mq.removeEventListener("change", onChange);
      window.removeEventListener("keydown", handleKeydown);
    };
  }, []);

  const setTheme = (t) => {
    setThemeState(t);
    localStorage.setItem("ckk.theme", t);
    applyTheme(t);
  };

  const setSidebarPref = (c) => {
    setCollapsed(c);
    localStorage.setItem("ckk.sidebar", c ? "collapsed" : "expanded");
  };

  const setView = useCallback((key) => {
    setActiveViewState(key);
    setSearch("");
    setMobileOpen(false);
    setMenu("");
    window.history.replaceState(null, "", `#${key}`);
    window.scrollTo({ top: 0 });
  }, []);

  /* Snapshot legacy hanya dimuat saat halaman legacy dibuka. */
  const load = useCallback(async () => {
    setError("");
    try {
      const res = await api("data");
      setData(res.data);
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  /* proteksi navigasi kembali setelah logout */
  useEffect(() => {
    const check = () => {
      fetch("/api/auth/me", { cache: "no-store" }).then((r) => {
        if (r.status === 401) window.location.replace("/login?expired=1");
      });
    };
    window.addEventListener("pageshow", check);
    return () => window.removeEventListener("pageshow", check);
  }, []);

  /** Panggil endpoint mutasi lalu sinkronkan state dengan snapshot dari server. */
  const act = useCallback(async (path, { method = "POST", body } = {}) => {
    const res = await api(path, { method, body });
    if (res.data) {
      setData(res.data);
    }
    if (res.admin) setAdmin(res.admin);
    return res;
  }, []);

  const doLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } finally {
      window.location.replace("/login?loggedout=1");
    }
  };

  const handleMarkNotifRead = async (id) => {
    try {
      await act("notifications/read", { body: { id } });
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      await act("notifications/read-all");
      toast("Semua notifikasi ditandai telah dibaca.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectNotif = (n) => {
    handleMarkNotifRead(n.id);
    setMenu("");
    setView(n.targetView);
    setTargetEntityId(n.targetId);
  };

  const handleSelectSearch = (res) => {
    setView(res.targetView);
    setTargetEntityId(res.id);
  };

  /* filter menu berdasarkan peran (role-based access) */
  const allowedMenus = useMemo(() => {
    const role = admin?.role || "admin";
    return ROLE_MENUS[role] || ROLE_MENUS.super_admin;
  }, [admin?.role]);

  useEffect(() => {
    if (admin?.role && !allowedMenus.includes(activeView)) {
      setActiveViewState(admin?.role === "moderator" ? "fastapi_reports" : "fastapi_overview");
    }
  }, [admin?.role, allowedMenus, activeView]);

  const filteredNavItems = useMemo(
    () => navItems.filter(([key]) => allowedMenus.includes(key)),
    [allowedMenus]
  );

  const notifications = data?.notifications || [];
  const unreadNotifs = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const ctx = useMemo(
    () => ({
      data,
      admin,
      act,
      setView,
      setActiveView: setView,
      search,
      setSearch,
      openKostForm: (k = {}) => setKostForm(k),
      openAdForm: (a = {}) => setAdForm(a),
      openUserForm: (u = {}) => setUserForm(u),
      theme,
      setTheme,
      collapsed,
      setSidebarPref,
      reload: load,
      targetEntityId,
      clearTargetEntityId: () => setTargetEntityId(null),
    }),
    [data, admin, act, setView, search, theme, collapsed, load, targetEntityId]
  );

  const [eyebrow, title] = viewMeta[activeView] || ["Menu", "CariKostKita"];
  const View = views[activeView] || DashboardView;
  const sidebarText = collapsed ? "lg:hidden" : "";
  const toggleSidebar = () => (window.innerWidth >= 1024 ? setSidebarPref(!collapsed) : setMobileOpen((o) => !o));

  return (
    <AppProvider value={ctx}>
      <div
        className={`min-h-screen bg-cream lg:grid ${
          collapsed ? "sidebar-collapsed lg:grid-cols-[84px_minmax(0,1fr)]" : "lg:grid-cols-[280px_minmax(0,1fr)]"
        }`}
        style={{ transition: "grid-template-columns .25s ease" }}
      >
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-overlay lg:hidden backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* SIDEBAR */}
        <aside
          aria-label="Navigasi utama"
          className={`fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col gap-5 bg-sidebar p-4 text-[#EEEAD7] transition-transform duration-300 max-h-screen overflow-y-auto lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:w-auto lg:translate-x-0 ${
            mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          } ${collapsed ? "lg:items-center lg:px-3" : ""}`}
        >
          <div
            className={`flex items-center ${
              collapsed ? "lg:flex-col lg:gap-3 lg:items-center" : "justify-between gap-2"
            } px-2 w-full`}
          >
            <div className={`flex items-center gap-3 ${collapsed ? "lg:justify-center" : "min-w-0"}`}>
              {data?.system?.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.system.logo}
                  alt="Logo"
                  className="h-11 w-11 shrink-0 rounded-lg border border-[#EEEAD766] bg-[#EEEAD71F] object-cover"
                />
              ) : (
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[#EEEAD766] bg-[#EEEAD71F] font-extrabold text-[#EEEAD7]">
                  CK
                </div>
              )}
              <div className={`min-w-0 ${sidebarText}`}>
                <strong className="block truncate text-sm font-extrabold">{data?.system?.appName || "CariKostKita"}</strong>
                <span className="block text-xs text-[#EEEAD7B8]">Admin Panel</span>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              type="button"
              aria-label="Tutup navigasi"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-2 hover:bg-[#EEEAD71F] lg:hidden"
            >
              <X size={20} />
            </button>

            {/* Desktop hamburger toggle in sidebar */}
            <button
              type="button"
              aria-label={collapsed ? "Perlebar sidebar" : "Ciutkan sidebar"}
              title={collapsed ? "Perlebar sidebar" : "Ciutkan sidebar"}
              data-label={collapsed ? "Perlebar sidebar" : "Ciutkan sidebar"}
              onClick={toggleSidebar}
              className="nav-tip hidden lg:grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#EEEAD7] hover:bg-[#EEEAD71F] transition"
            >
              <Menu size={18} />
            </button>
          </div>

          <nav className={`grid gap-1.5 ${collapsed ? "lg:overflow-visible" : "overflow-y-auto"}`} aria-label="Menu">
            {filteredNavItems.map(([key, label, Icon]) => {
              const badgeCount =
                key === "owners" && data
                  ? data.owners.filter((o) => o.verificationStatus === "Pending" && !o.archived).length
                  : key === "reports" && data
                  ? data.reports.filter((r) => r.status === "Baru").length
                  : key === "kost" && data
                  ? data.kosts.filter((k) => k.status === "Menunggu Verifikasi" && !k.archived).length
                  : 0;

              return (
                <button
                  key={key}
                  type="button"
                  data-label={label}
                  title={collapsed ? label : undefined}
                  aria-current={activeView === key ? "page" : undefined}
                  onClick={() => setView(key)}
                  className={`nav-tip flex min-h-11 items-center gap-3 rounded-lg px-3 text-left transition ${
                    collapsed ? "lg:justify-center lg:px-0" : ""
                  } ${
                    activeView === key
                      ? "bg-[#EEEAD7] text-[#6D0808] font-extrabold shadow-sm"
                      : "text-[#EEEAD7D1] hover:bg-[#EEEAD71F]"
                  }`}
                >
                  <Icon size={19} className="shrink-0" />
                  <span className={`flex-1 text-sm ${sidebarText}`}>{label}</span>
                  {badgeCount > 0 && (
                    <span
                      className={`grid h-5 min-w-5 place-items-center rounded-full bg-[#A8782F] px-1.5 text-[11px] font-extrabold text-white ${
                        collapsed ? "lg:hidden" : ""
                      }`}
                    >
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Profile in Sidebar */}
          <div
            className={`mt-auto flex items-center gap-3 rounded-lg border border-[#EEEAD73D] bg-[#EEEAD70F] p-3 ${
              collapsed ? "lg:flex-col lg:p-2" : ""
            }`}
          >
            <Avatar name={admin?.name} src={admin?.photo} className="!bg-[#EEEAD71F] border border-[#EEEAD766]" />
            <div className={`min-w-0 flex-1 ${sidebarText}`}>
              <strong className="block truncate text-xs font-extrabold text-[#EEEAD7]">{admin?.name}</strong>
              <span className="block text-[11px] text-[#EEEAD7B8]">
                {ROLE_LABELS[admin?.role] || "Admin"}
              </span>
            </div>
            <button
              type="button"
              data-label="Logout"
              title={collapsed ? "Logout" : undefined}
              aria-label="Logout"
              onClick={() => setLogoutOpen(true)}
              className="nav-tip rounded-lg p-2 text-bad-fg hover:bg-[#EEEAD71F]"
            >
              <LogOut size={18} />
            </button>
          </div>
        </aside>

        {/* MOBILE TOPBAR - Satu-satunya pengontrol sidebar di mobile */}
        <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-paper px-4 lg:hidden">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              aria-label="Buka navigasi sidebar"
              onClick={toggleSidebar}
              className="rounded-lg p-2 text-accent hover:bg-track transition"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-1.5 min-w-0">
              <strong className="text-sm sm:text-base font-extrabold text-maroon truncate max-w-[130px] sm:max-w-none">
                {data?.system?.appName || "CariKostKita"}
              </strong>
              <span className="shrink-0 rounded bg-maroon/10 px-1.5 py-0.5 text-[10px] font-bold text-maroon">
                {ROLE_LABELS[admin?.role] || "Admin"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <IconButton label="Pencarian Global" onClick={() => setSearchModalOpen(true)} className="!h-9 !w-9">
              <Search size={16} />
            </IconButton>

            <div className="relative">
              <IconButton
                label="Notifikasi"
                onClick={() => setMenu(menu === "bell" ? "" : "bell")}
                className="!h-9 !w-9 relative"
              >
                <Bell size={16} />
                {unreadNotifs > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-maroon px-1 text-[10px] font-extrabold text-[#EEEAD7]">
                    {unreadNotifs}
                  </span>
                )}
              </IconButton>
              {menu === "bell" && (
                <NotificationCenterDropdown
                  notifications={notifications}
                  onSelect={handleSelectNotif}
                  onMarkRead={handleMarkNotifRead}
                  onMarkAllRead={handleMarkAllNotifsRead}
                  onClose={() => setMenu("")}
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => setMenu(menu === "profile" ? "" : "profile")}
              className="flex items-center rounded-full border border-line p-0.5"
            >
              <Avatar name={admin?.name} src={admin?.photo} size={28} />
            </button>
            {menu === "profile" && (
              <div
                role="menu"
                className="animate-fade-in absolute right-3 top-14 z-40 w-56 rounded-lg border border-line bg-paper p-2 shadow-panel"
              >
                <div className="border-b border-line px-2 pb-2">
                  <strong className="block truncate text-sm">{admin?.name}</strong>
                  <span className="block truncate text-xs text-muted">{admin?.email}</span>
                </div>
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => { setView("settings"); setMenu(""); }}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-bold hover:bg-track"
                >
                  <Settings size={15} />Pengaturan
                </button>
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => { setMenu(""); setLogoutOpen(true); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-bold text-bad-fg hover:bg-bad-bg"
                >
                  <LogOut size={15} />Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <main className="min-w-0 p-4 lg:p-6">
          <header className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="mb-0.5 text-xs font-extrabold uppercase text-accent">{eyebrow}</p>
              <h1 className="text-2xl font-extrabold leading-tight lg:text-3xl">{title}</h1>
            </div>

            {/* DESKTOP TOP ACTIONS (Hidden on mobile karena sudah ada di mobile topbar) */}
            <div className="hidden lg:flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSearchModalOpen(true)}
                className="flex h-10 w-64 items-center justify-between rounded-lg border border-line bg-paper px-3 text-xs text-muted shadow-xs transition hover:border-accent hover:text-ink"
              >
                <span className="flex items-center gap-2">
                  <Search size={15} />
                  <span>Cari apapun di sini...</span>
                </span>
                <kbd className="rounded border border-line bg-field px-1.5 py-0.5 text-[10px] font-bold text-muted">
                  Ctrl K
                </kbd>
              </button>

              <div className="relative">
                <IconButton
                  label="Notifikasi"
                  onClick={() => setMenu(menu === "bell" ? "" : "bell")}
                  className="relative"
                >
                  <Bell size={18} />
                  {unreadNotifs > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-maroon px-1 text-[11px] font-extrabold text-[#EEEAD7]">
                      {unreadNotifs}
                    </span>
                  )}
                </IconButton>
                {menu === "bell" && (
                  <NotificationCenterDropdown
                    notifications={notifications}
                    onSelect={handleSelectNotif}
                    onMarkRead={handleMarkNotifRead}
                    onMarkAllRead={handleMarkAllNotifsRead}
                    onClose={() => setMenu("")}
                  />
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  aria-label="Menu profil"
                  aria-haspopup="menu"
                  aria-expanded={menu === "profile"}
                  onClick={() => setMenu(menu === "profile" ? "" : "profile")}
                  className="flex h-10 items-center gap-2.5 rounded-lg border border-line bg-paper pl-1.5 pr-2.5 transition hover:shadow-xs"
                >
                  <Avatar name={admin?.name} src={admin?.photo} size={30} />
                  <div className="text-left">
                    <span className="block text-xs font-bold text-ink truncate max-w-[120px]">{admin?.name}</span>
                    <span className="block text-[10px] font-semibold text-muted">{ROLE_LABELS[admin?.role] || "Admin"}</span>
                  </div>
                  <ChevronDown size={14} className="text-muted" />
                </button>
                {menu === "profile" && (
                  <div
                    role="menu"
                    className="animate-fade-in absolute right-0 z-40 mt-2 w-60 rounded-xl border border-line bg-paper p-2 shadow-panel"
                  >
                    <div className="border-b border-line px-2 pb-2">
                      <strong className="block truncate text-sm">{admin?.name}</strong>
                      <span className="block truncate text-xs text-muted">{admin?.email}</span>
                      <span className="mt-1 inline-block rounded bg-maroon/10 px-2 py-0.5 text-[10px] font-extrabold text-maroon">
                        {ROLE_LABELS[admin?.role] || "Admin"}
                      </span>
                    </div>
                    <button
                      role="menuitem"
                      type="button"
                      onClick={() => { setView("settings"); setMenu(""); }}
                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left text-xs font-bold hover:bg-track"
                    >
                      <Settings size={16} />Pengaturan
                    </button>
                    <button
                      role="menuitem"
                      type="button"
                      onClick={() => { setMenu(""); setLogoutOpen(true); }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left text-xs font-bold text-bad-fg hover:bg-bad-bg"
                    >
                      <LogOut size={16} />Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {menu && <div className="fixed inset-0 z-30" onClick={() => setMenu("")} aria-hidden="true" />}

          {isApiFirstView ? (
            <View key={activeView} />
          ) : error && !data ? (
            <ErrorState message={error} onRetry={load} />
          ) : !data ? (
            activeView === "dashboard" ? (
              <SkeletonDashboard />
            ) : (
              <SkeletonTable rows={7} cols={6} />
            )
          ) : <View key={activeView} />}
        </main>

        <KostFormModal kost={kostForm} onClose={() => setKostForm(null)} />
        <AdFormModal ad={adForm} onClose={() => setAdForm(null)} onSaved={load} />
        <UserFormModal user={userForm} onClose={() => setUserForm(null)} onSaved={load} />
        <GlobalSearchModal
          open={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          onSelect={handleSelectSearch}
          data={data}
        />
        <ConfirmDialog
          open={logoutOpen}
          title="Keluar dari Admin Panel"
          message="Apakah Anda yakin ingin keluar dari Admin Panel CariKostKita?"
          confirmLabel="Ya, Keluar"
          tone="danger"
          onConfirm={doLogout}
          onClose={() => setLogoutOpen(false)}
        />
      </div>
    </AppProvider>
  );
}
