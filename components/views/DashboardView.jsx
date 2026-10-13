"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight, BadgeCheck, BriefcaseBusiness, Building2, CheckCircle2,
  Clock3, ExternalLink, Flag, Megaphone, OctagonX, ShieldQuestion, Users
} from "lucide-react";
import { useApp, useStats } from "../AppContext";
import { ChartCanvas } from "../charts";
import {
  Badge, DataTable, EmptyState, ErrorState, ExportMenu, GhostButton,
  LoadingState, Panel, PanelTitle, SkeletonDashboard, Td, selectCls
} from "../ui";
import { PERIODS } from "@/lib/constants";
import { timeAgo } from "@/lib/format";

export function PeriodSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Periode data" className={selectCls}>
      {PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

export function DashboardView() {
  const { data, admin, setView } = useApp();
  const [period, setPeriod] = useState("bulanan");
  const { stats, loading, error, retry } = useStats(period);

  const pendingOwners = (data?.owners || []).filter((o) => o.verificationStatus === "Pending" && !o.archived).length;
  const newReports = (data?.reports || []).filter((r) => r.status === "Baru").length;
  const pendingKosts = (data?.kosts || []).filter((k) => k.status === "Menunggu Verifikasi" && !k.archived).length;
  const soonAds = (data?.ads || []).filter((a) => a.effective === "Aktif" && (new Date(`${a.end}T23:59:59`) - Date.now()) / 86400000 <= 3).length;

  const actionItems = useMemo(() => {
    const role = admin?.role || "admin";
    const items = [];

    if (["super_admin", "admin", "moderator"].includes(role)) {
      items.push({
        tone: "danger",
        count: pendingOwners,
        label: "Pemilik Menunggu Verifikasi",
        desc: "Verifikasi KTP dan keabsahan usaha pemilik",
        view: "owners",
        icon: BriefcaseBusiness,
      });
      items.push({
        tone: "danger",
        count: newReports,
        label: "Laporan Kost Baru",
        desc: "Laporan pengguna butuh investigasi & tindakan",
        view: "reports",
        icon: Flag,
      });
      items.push({
        tone: "warning",
        count: pendingKosts,
        label: "Kost Menunggu Review",
        desc: "Pengajuan data kost baru menunggu persetujuan",
        view: "kost",
        icon: Building2,
      });
    }

    if (["super_admin", "marketing"].includes(role)) {
      items.push({
        tone: "warning",
        count: soonAds,
        label: "Iklan Akan Berakhir",
        desc: "Iklan dengan sisa masa tayang ≤ 3 hari",
        view: "ads",
        icon: Megaphone,
      });
    }

    return items.filter((item) => item.count > 0);
  }, [admin?.role, pendingOwners, newReports, pendingKosts, soonAds]);

  if (error && !stats) return <Panel><ErrorState message={error} onRetry={retry} /></Panel>;
  if (!stats) return <SkeletonDashboard />;

  const t = stats.totals;
  const periodLabel = PERIODS.find(([v]) => v === period)?.[1] || period;

  const summaryRows = [
    { metric: "Total Kost", value: t.kost },
    { metric: "Kost Aktif", value: t.kostActive },
    { metric: "Kost Pending Verifikasi", value: t.kostPending },
    { metric: "Kost Ditolak", value: t.kostRejected },
    { metric: "Total Pemilik", value: t.owners },
    { metric: "Pemilik Pending Verifikasi", value: t.ownersPending },
    { metric: "Total Pengguna", value: t.users },
    { metric: "Laporan Baru", value: t.reportsNew },
    { metric: "Iklan Aktif", value: t.adsActive },
  ];
  const summaryCols = [
    { label: "Indikator / Metrik", value: (r) => r.metric },
    { label: "Jumlah / Nilai", value: (r) => r.value },
  ];

  const cards = [
    ["Total Kost", t.kost, Building2, "var(--maroon)", "kost"],
    ["Kost Aktif", t.kostActive, BadgeCheck, "var(--sage)", "kost"],
    ["Kost Pending", t.kostPending, Clock3, "var(--gold)", "kost"],
    ["Kost Ditolak", t.kostRejected, OctagonX, "var(--clay)", "kost"],
    ["Total Pemilik", t.owners, BriefcaseBusiness, "var(--blue)", "owners"],
    ["Pemilik Pending Verifikasi", t.ownersPending, ShieldQuestion, "var(--gold)", "owners"],
    ["Total Pengguna", t.users, Users, "var(--sage)", "users"],
    ["Laporan Baru", t.reportsNew, Flag, "var(--clay)", "reports"],
    ["Iklan Aktif", t.adsActive, Megaphone, "var(--maroon)", "ads"],
  ];

  const areaEntries = Object.entries(stats.kostArea).sort((a, b) => b[1] - a[1]);
  const maxArea = Math.max(...areaEntries.map((e) => e[1]), 1);

  return (
    <div className={`space-y-4 transition-opacity ${loading ? "opacity-70" : ""}`}>
      {/* ACTION CENTER - PERLU TINDAKAN */}
      <section className="rounded-xl border border-line bg-paper p-5 shadow-panel">
        <div className="mb-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-maroon opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-maroon" />
              </span>
              <p className="text-xs font-extrabold uppercase text-accent">Pusat Tindakan</p>
            </div>
            <h2 className="text-xl font-extrabold text-ink mt-0.5">Perlu Tindakan Hari Ini</h2>
          </div>
          <span className="rounded-full bg-field border border-line px-3 py-1 text-xs font-bold text-muted">
            {actionItems.reduce((acc, it) => acc + it.count, 0)} tugas menunggu
          </span>
        </div>

        {actionItems.length === 0 ? (
          <div className="flex items-center gap-2.5 rounded-lg border border-line bg-field p-4 text-sm text-muted">
            <CheckCircle2 size={18} className="text-ok-fg shrink-0" />
            <span>Semua antrean beres! Tidak ada verifikasi atau laporan tertunda saat ini.</span>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {actionItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setView(item.view)}
                  className={`group flex items-start gap-3 rounded-lg border p-3.5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                    item.tone === "danger"
                      ? "border-bad-fg/30 bg-bad-bg/30 hover:border-bad-fg"
                      : "border-warn-fg/30 bg-warn-bg/30 hover:border-warn-fg"
                  }`}
                >
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg font-extrabold text-sm ${
                      item.tone === "danger" ? "bg-maroon text-[#EEEAD7]" : "bg-[#A8782F] text-white"
                    }`}
                  >
                    {item.count}
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="block text-xs font-bold text-ink group-hover:text-accent">
                      {item.label}
                    </strong>
                    <p className="mt-0.5 text-[11px] text-muted line-clamp-1">{item.desc}</p>
                    <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-extrabold text-accent">
                      <span>Proses sekarang</span>
                      <ArrowRight size={12} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* FILTER PERIODE & EXPORT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <h2 className="text-lg font-extrabold text-ink">Ringkasan Statistik</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <PeriodSelect value={period} onChange={setPeriod} />
          <ExportMenu
            name="Ringkasan_Dashboard"
            title="Ringkasan Dashboard"
            columns={summaryCols}
            rows={summaryRows}
            filters={[`Periode: ${periodLabel}`]}
          />
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {cards.map(([label, value, Icon, color, view]) => (
          <button
            key={label}
            type="button"
            onClick={() => setView(view)}
            className="animate-fade-in flex items-center gap-3 rounded-xl border border-line bg-paper p-3.5 sm:p-4 text-left shadow-panel transition hover:-translate-y-0.5 min-w-0"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[#EEEAD7]" style={{ backgroundColor: color }}>
              <Icon size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted truncate">{label}</p>
              <strong className="mt-0.5 block text-xl sm:text-2xl font-extrabold leading-tight text-ink">{value}</strong>
            </div>
          </button>
        ))}
      </div>

      {/* CHARTS */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
        <Panel><PanelTitle eyebrow="Pertumbuhan" title="Kost Baru" /><ChartCanvas labels={stats.kostGrowth.labels} values={stats.kostGrowth.values} /></Panel>
        <Panel><PanelTitle eyebrow="Status" title="Kondisi Kost" /><ChartCanvas type="donut" data={stats.kostStatus} /></Panel>
        <Panel>
          <PanelTitle eyebrow="Wilayah" title="Sebaran Kost" />
          <div className="grid gap-3">
            {areaEntries.length ? areaEntries.map(([area, total]) => (
              <div key={area} className="grid gap-1.5">
                <div className="flex justify-between text-sm font-bold"><span>{area}</span><span>{total}</span></div>
                <div className="h-2.5 overflow-hidden rounded-full bg-track"><div className="h-full bg-maroon transition-all" style={{ width: `${(total / maxArea) * 100}%` }} /></div>
              </div>
            )) : <EmptyState title="Belum ada kost" message="Data sebaran akan muncul setelah ada kost." />}
          </div>
        </Panel>
        <Panel><PanelTitle eyebrow="Laporan" title="Status Laporan" /><ChartCanvas type="donut" data={stats.reportStatus} /></Panel>
        <Panel><PanelTitle eyebrow="Pengguna" title="Pertumbuhan Pengguna" /><ChartCanvas labels={stats.userGrowth.labels} values={stats.userGrowth.values} color="#64705F" /></Panel>
        <Panel><PanelTitle eyebrow="Pemilik" title="Pertumbuhan Pemilik" /><ChartCanvas labels={stats.ownerGrowth.labels} values={stats.ownerGrowth.values} color="#3F6475" /></Panel>
      </div>

      <Panel>
        <PanelTitle eyebrow="Iklan" title="Performa Iklan (14 hari terakhir)" />
        <ChartCanvas type="line" labels={stats.ads.daily.labels} series={[{ name: "Impression", values: stats.ads.daily.impressions, color: "#6D0808" }, { name: "Click", values: stats.ads.daily.clicks, color: "#3F6475" }]} />
      </Panel>

      {/* AKTIVITAS TERBARU */}
      <Panel>
        <div className="mb-4 flex items-center justify-between gap-3">
          <PanelTitle eyebrow="Aktivitas" title="Aktivitas Terbaru" />
          <GhostButton onClick={() => setView("audit")}><ExternalLink size={17} /><span>Lihat Audit</span></GhostButton>
        </div>
        <DataTable headers={["Admin", "Aktivitas", "Objek", "Waktu", "Status"]}>
          {data.audit.slice(0, 5).map((item) => (
            <tr key={item.id}>
              <Td>{item.adminName}</Td><Td>{item.activity}</Td><Td>{item.object}</Td><Td>{timeAgo(item.time)}</Td><Td><Badge status={item.status} /></Td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </div>
  );
}
