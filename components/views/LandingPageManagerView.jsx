"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  Globe,
  Save,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Upload,
  Sparkles,
  Megaphone,
  Palette,
  ShieldCheck,
  CheckCircle,
  FileArchive,
  Image as ImageIcon,
  HelpCircle,
  ListOrdered,
  Users,
  Building2,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  FileText,
  MessageSquare,
  Shield,
  Layers,
  Search,
  Sliders,
  Compass,
  Bolt,
  Lock,
} from "lucide-react";
import { useApp } from "../AppContext";
import { api, readImage } from "@/lib/api";
import { evaluateBrandColor } from "@/lib/color-contrast";
import { broadcastSettingsUpdated } from "@/lib/realtime";
import BrandColorField from "../BrandColorField";
import {
  Badge,
  ConfirmDialog,
  ErrorState,
  Field,
  FilterTabs,
  GhostButton,
  IconButton,
  ImageField,
  LoadingState,
  Modal,
  Panel,
  PanelTitle,
  PrimaryButton,
  DangerButton,
  SelectField,
  TextArea,
  Toggle,
  useToast,
} from "../ui";

export function LandingPageManagerView() {
  const { admin } = useApp();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("Branding & SEO");

  // Form State
  const [settings, setSettings] = useState({
    appName: "CariKostKita",
    tagline: "",
    targetCity: "Pekanbaru",
    brandColor: "#6D0808",
    logoUrl: "",
    footerLogoUrl: "",
    appIconUrl: "",
    faviconUrl: "",
    ogImageUrl: "",
    siteTitle: "",
    siteDescription: "",
    metaKeywords: "",
    apkUrl:
      "https://github.com/WalZetass-kar/CariKostKita/releases/download/v1.1.2/CariKostKita-v1.1.2-release.apk",
    versionName: "v1.1.2",
    apkSize: "3.3 MB",
    minAndroid: "Android 8.0+",
    releaseNotes: "",
    // Banner
    bannerActive: false,
    bannerType: "promo",
    bannerText: "",
    bannerLink: "",
    // Pop-up Modal Dialog
    popupActive: false,
    popupTitle: "",
    popupContent: "",
    popupImageUrl: "",
    popupButtonLabel: "",
    popupButtonUrl: "",
    // Hero
    heroHeadline: "",
    heroSubheadline: "",
    heroCtaPrimaryLabel: "Download APK",
    heroCtaSecondaryLabel: "Lihat Fitur",
    heroCtaSecondaryLink: "#fitur",
    heroAdFreeText: "Bebas Iklan",
    heroTrustBadge1: "Mudah Digunakan",
    heroTrustBadge2: "Data Terpercaya",
    heroTrustBadge3: "Update Rutin",
    heroBadge1: "Lokasi dekat kampus & area strategis",
    heroBadge2: "Detail kost & foto kamar lengkap",
    heroImageUrl: "",
    // Contact
    whatsapp: "6281270008899",
    contactPhone: "0761-555-0123",
    supportEmail: "support@carikostkita.id",
    address: "Jl. Soekarno Hatta No. 1, Pekanbaru, Riau",
    githubUrl: "https://github.com/WalZetass-kar/CariKostKita",
    instagram: "https://instagram.com/carikostkita",
    facebook: "https://facebook.com/carikostkita",
    tiktok: "https://tiktok.com/@carikostkita",
    youtube: "",
    linkedin: "",
    // Sections
    ownerTitle: "Anda punya kost di Pekanbaru?",
    ownerIntro: "Daftarkan kost Anda di CariKostKita agar lebih mudah ditemukan calon penyewa mahasiswa dan pekerja tanpa komisi perantara.",
    ownerWaLabel: "Daftar via WhatsApp",
    aboutTitle: "Dibangun untuk Kebutuhan Pencari Kost",
    aboutStory: "CariKostKita adalah aplikasi yang dikembangkan untuk membantu masyarakat, terutama anak rantau dan mahasiswa, dalam mencari kost dengan lebih mudah, cepat, dan terpercaya.",
    feedbackActive: true,
    feedbackTitle: "Bantu kami menyempurnakan CariKostKita",
    feedbackDesc: "Menemukan bug atau punya usulan fitur untuk CariKostKita? Sampaikan masukan Anda langsung ke admin WhatsApp kami.",
    feedbackButtonLabel: "Kirim Masukan via WhatsApp",
    finalCtaEyebrow: "JANGAN TUNGGU LAGI!",
    finalCtaTitle: "Yuk, Temukan Kost Terbaikmu Sekarang!",
    finalCtaDesc: "Download CariKostKita sekarang dan mulai pencarian kost impianmu.",
    finalCtaButtonLabel: "Download APK Sekarang",
    footerTagline: "Kost terbaik, untuk masa depanmu.",
    footerCopyright: "© 2026 CariKostKita. All rights reserved.",
    securityModalActive: true,
    securityModalTitle: "Panduan Dialog Download Android",
    securityModalDesc: "Saat mengunduh berkas APK di luar Google Play Store, peramban (Chrome) akan menampilkan pesan standar keamanan:",
    securityModalNote: "Berkas APK CariKostKita 100% aman dan diverifikasi langsung dari repositori resmi proyek.",
    legalPrivacy: "Kebijakan Privasi CariKostKita: Kami menghargai privasi Anda dan hanya menggunakan data untuk keperluan operasional layanan pencarian kost.",
    legalTerms: "Syarat & Ketentuan CariKostKita: Layanan ini disediakan secara gratis untuk mempermudah pencarian kost di Pekanbaru.",
    // Lists
    navLinks: [],
    trustItems: [],
    featureItems: [],
    installSteps: [],
    ownerSteps: [],
    faqItems: [],
  });

  // Modal editors state
  const [modalItem, setModalItem] = useState(null); // { type, mode, index, data }
  const [confirmDelete, setConfirmDelete] = useState(null); // { type, index, title }
  const [uploadingApk, setUploadingApk] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  // Baseline of the last confirmed content. Only the difference against this
  // baseline is sent to the backend, so a save can never reset a field the
  // administrator did not touch.
  const baselineRef = useRef(null);
  const [saveReport, setSaveReport] = useState(null);

  const tabs = [
    "Branding & SEO",
    "Navigasi",
    "Hero & Banner",
    "Kepercayaan",
    "Fitur Aplikasi",
    "Panduan Install",
    "Pemilik Kost",
    "Tentang & Kontak",
    "FAQ",
    "Feedback & CTA",
    "Footer & Legal",
  ];

  // Load settings on mount
  useEffect(() => {
    let active = true;
    setLoading(true);
    api("settings/landing")
      .then((res) => {
        if (!active) return;
        const s = res?.system || res?.data || res || {};
        const merged = { ...s };
        setSettings((prev) => {
          const next = {
            ...prev,
            ...merged,
            navLinks: Array.isArray(s.navLinks) && s.navLinks.length ? s.navLinks : (Array.isArray(s.nav_links) && s.nav_links.length ? s.nav_links : prev.navLinks),
            trustItems: Array.isArray(s.trustItems) && s.trustItems.length ? s.trustItems : (Array.isArray(s.trust_items) && s.trust_items.length ? s.trust_items : prev.trustItems),
            featureItems: Array.isArray(s.featureItems) && s.featureItems.length ? s.featureItems : (Array.isArray(s.feature_items) && s.feature_items.length ? s.feature_items : prev.featureItems),
            installSteps: Array.isArray(s.installSteps) && s.installSteps.length ? s.installSteps : (Array.isArray(s.install_steps) && s.install_steps.length ? s.install_steps : prev.installSteps),
            ownerSteps: Array.isArray(s.ownerSteps) && s.ownerSteps.length ? s.ownerSteps : (Array.isArray(s.owner_steps) && s.owner_steps.length ? s.owner_steps : prev.ownerSteps),
            faqItems: Array.isArray(s.faqItems) && s.faqItems.length ? s.faqItems : (Array.isArray(s.faq_items) && s.faq_items.length ? s.faq_items : prev.faqItems),
          };
          // Remember exactly what the server confirmed so the next save can
          // send only the fields that actually changed.
          baselineRef.current = next;
          return next;
        });
      })
      .catch((err) => {
        if (active) setError(err.message || "Gagal memuat pengaturan Landing Page.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  /** Only the fields that differ from the confirmed baseline are submitted. */
  const buildDiff = () => {
    const baseline = baselineRef.current || {};
    const diff = {};
    for (const [key, value] of Object.entries(settings)) {
      if (key === "revision" || key === "updated_at") continue;
      const before = baseline[key];
      const same =
        Array.isArray(value) && Array.isArray(before)
          ? JSON.stringify(value) === JSON.stringify(before)
          : value === before;
      if (!same) diff[key] = value;
    }
    return diff;
  };

  const saveSettings = async () => {
    setSaving(true);
    setSaveReport(null);
    try {
      const diff = buildDiff();
      if (Object.keys(diff).length === 0) {
        toast("Tidak ada perubahan yang perlu disimpan.");
        setSaving(false);
        return;
      }
      // Warna brand harus lolos kontras WCAG; server juga akan menolaknya,
      // tapi dicek di sini supaya admin dapat pesan yang jelas.
      const brandDiff = diff.brandColor ?? diff.brand_color;
      if (brandDiff !== undefined) {
        const evaluation = evaluateBrandColor(brandDiff);
        if (!evaluation.valid) {
          toast("Format warna brand tidak valid. Gunakan hex 3 atau 6 digit, contoh #6D0808.");
          setSaving(false);
          return;
        }
        if (!evaluation.allPass) {
          const worst = evaluation.worst;
          toast(
            `Warna brand ditolak: kontras ${worst.ratio.toFixed(2)}:1 pada "${worst.label}" ` +
              `(minimal 4.5:1). Pakai warna aman terdekat dari palet.`
          );
          setSaving(false);
          return;
        }
      }
      const res = await api("settings/landing", {
        method: "PATCH",
        body: diff,
      });
      const saved = res?.system || res?.data || null;
      if (saved) {
        setSettings((prev) => {
          const next = { ...prev, ...saved };
          baselineRef.current = next;
          return next;
        });
      } else {
        baselineRef.current = { ...settings };
      }
      // Invalidation is published ONLY after the backend confirms the commit.
      // The revision comes from FastAPI (single authority); subscribers use
      // it to dedupe and order rapid sequential saves.
      const revision = res?.revision ?? saved?.revision ?? 0;
      const updated_at = res?.updated_at ?? saved?.updated_at ?? null;
      const changedKeys = res?.changed_keys ?? saved?.changed_keys ?? Object.keys(diff);
      const persistence = res?.persistence ?? null;
      setSaveReport({ revision, updated_at, changedKeys, persistence });
      broadcastSettingsUpdated({ revision, updated_at, changedKeys }).then((delivered) => {
        if (!delivered) {
          console.info(
            "Perubahan tersimpan di server; event real-time tidak terkirim " +
              "(Supabase Realtime belum dikonfigurasi atau offline). " +
              "Landing Page akan mengejar via version check 10 detik / saat tab fokus."
          );
        }
      });
      toast("Semua perubahan Landing Page berhasil disimpan!");
    } catch (err) {
      toast(err.message || "Gagal menyimpan perubahan.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Generic List Manipulators (Reorder, Toggle, Delete, Save)
  const moveItem = (listKey, index, direction) => {
    setSettings((prev) => {
      const list = [...(prev[listKey] || [])];
      const target = index + direction;
      if (target < 0 || target >= list.length) return prev;
      const temp = list[index];
      list[index] = list[target];
      list[target] = temp;
      // Re-assign order indices
      const updated = list.map((item, i) => ({ ...item, order: i + 1 }));
      return { ...prev, [listKey]: updated };
    });
  };

  const toggleItemActive = (listKey, index) => {
    setSettings((prev) => {
      const list = [...(prev[listKey] || [])];
      list[index] = { ...list[index], is_active: !list[index].is_active };
      return { ...prev, [listKey]: list };
    });
  };

  const deleteItem = (listKey, index) => {
    setSettings((prev) => {
      const list = [...(prev[listKey] || [])];
      list.splice(index, 1);
      const updated = list.map((item, i) => ({ ...item, order: i + 1 }));
      return { ...prev, [listKey]: updated };
    });
    setConfirmDelete(null);
  };

  const saveModalItem = (itemData) => {
    if (!modalItem) return;
    const { type, mode, index } = modalItem;
    setSettings((prev) => {
      const list = [...(prev[type] || [])];
      if (mode === "add") {
        list.push({ ...itemData, id: `${type}-${Date.now()}`, order: list.length + 1, is_active: true });
      } else {
        list[index] = { ...list[index], ...itemData };
      }
      return { ...prev, [type]: list };
    });
    setModalItem(null);
  };

  // Upload handlers
  const handleFileUpload = async (event, fieldName, isApk = false) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (isApk) setUploadingApk(true);
    else setUploadingImg(true);

    try {
      if (!isApk && file.type && file.type.startsWith("image/")) {
        let dataUrl;
        if (file.type === "image/svg+xml") {
          const reader = new FileReader();
          dataUrl = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        } else {
          dataUrl = await readImage(file, 1200);
        }
        handleChange(fieldName, dataUrl);
        toast("Gambar berhasil dipilih dan siap disimpan!");
      } else {
        const formData = new FormData();
        formData.append("file", file);
        const endpoint = isApk ? "/api/admin/upload-apk" : "/api/admin/upload-image";
        const res = await fetch(endpoint, { method: "POST", body: formData });
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error || "Gagal mengunggah berkas.");
        handleChange(fieldName, json.url);
        if (isApk && json.size) handleChange("apkSize", json.size);
        toast(`Berkas berhasil diunggah: ${json.url}`);
      }
    } catch (err) {
      toast(err.message || "Gagal upload.", "error");
    } finally {
      if (isApk) setUploadingApk(false);
      else setUploadingImg(false);
      event.target.value = "";
    }
  };

  if (loading) {
    return (
      <Panel>
        <LoadingState rows={6} />
      </Panel>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <Panel className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <PanelTitle eyebrow="Manajemen Konten CMS" title="Pengelolaan 100% Landing Page" />
          <p className="text-xs sm:text-sm text-muted">
            Atur dan kendalikan seluruh teks, gambar, navigasi, fitur, FAQ, warna brand, dan legalitas Landing Page secara langsung.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <a
            href="https://carikostkita-landing.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-paper text-xs font-bold text-ink hover:border-muted transition"
          >
            <Globe size={15} />
            <span>Lihat Live Website</span>
            <ExternalLink size={13} className="text-muted" />
          </a>
          <PrimaryButton onClick={saveSettings} loading={saving}>
            <Save size={16} />
            <span>Simpan Perubahan</span>
          </PrimaryButton>
        </div>
      </Panel>

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {saveReport && (
        <div className="rounded-lg border border-line bg-paper px-4 py-3 text-xs text-muted space-y-1">
          <p className="font-bold text-ink">
            Perubahan tersimpan di database (revisi {saveReport.revision || "—"})
          </p>
          <p>
            Field yang diperbarui:{" "}
            <span className="font-mono">
              {(saveReport.changedKeys || []).join(", ") || "—"}
            </span>
          </p>
          {saveReport.persistence && saveReport.persistence.revision_durable === false && (
            <p className="text-warning">
              Penyimpanan berjalan, tetapi revisi belum dipatok di database. Jalankan ulang
              migration <span className="font-mono">supabase_landing_settings_persistence.sql</span>.
            </p>
          )}
        </div>
      )}

      {/* Tabs */}
      <FilterTabs options={tabs} value={activeTab} onChange={setActiveTab} />

      {/* Tab 1: Branding, Warna & SEO */}
      {activeTab === "Branding & SEO" && (
        <Panel className="max-w-4xl space-y-6">
          <div>
            <h3 className="font-extrabold text-base text-ink mb-1 flex items-center gap-2">
              <Palette size={18} className="text-accent" />
              <span>Identitas Brand, Visual & Warna</span>
            </h3>
            <p className="text-xs text-muted">Sesuaikan nama brand, logo, favicon, dan warna aksen utama website.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nama Aplikasi / Brand"
              value={settings.appName || ""}
              onChange={(e) => handleChange("appName", e.target.value)}
              placeholder="CariKostKita"
              required
            />
            <Field
              label="Tagline Brand"
              value={settings.tagline || ""}
              onChange={(e) => handleChange("tagline", e.target.value)}
              placeholder="Temukan Kost Nyaman & Terpercaya di Pekanbaru"
            />
            <Field
              label="Kota / Wilayah Layanan Utama"
              value={settings.targetCity || ""}
              onChange={(e) => handleChange("targetCity", e.target.value)}
              placeholder="Pekanbaru"
              hint="Otomatis menyatu di seluruh teks website"
              required
            />
            <div className="sm:col-span-2">
              <BrandColorField
                value={settings.brandColor || "#6D0808"}
                onChange={(next) => handleChange("brandColor", next)}
              />
            </div>
            <div className="sm:col-span-2 space-y-4 pt-3 border-t border-line">
              <h4 className="font-extrabold text-sm text-ink uppercase tracking-wider flex items-center gap-2">
                <ImageIcon size={16} className="text-accent" />
                <span>Logo & Aset Identitas Visual</span>
              </h4>
              <p className="text-xs text-muted">
                Atur secara mandiri logo untuk navbar atas, logo footer bawah, favicon browser, dan ikon aplikasi.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* 1. Logo Navbar Header */}
                <div className="rounded-xl border border-line bg-track/20 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-ink">1. Logo Navbar Header</span>
                    {settings.logoUrl && (
                      <button
                        type="button"
                        onClick={() => handleChange("logoUrl", "")}
                        className="text-[11px] font-bold text-red-600 hover:underline"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg border border-line bg-field flex items-center justify-center overflow-hidden shrink-0">
                      {settings.logoUrl ? (
                        <img src={settings.logoUrl} alt="Navbar Logo" className="w-full h-full object-contain p-1" />
                      ) : (
                        <Globe size={20} className="text-muted" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Field
                        value={settings.logoUrl || ""}
                        onChange={(e) => handleChange("logoUrl", e.target.value)}
                        placeholder="https://... atau upload file"
                      />
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-accent cursor-pointer hover:underline">
                    <Upload size={13} />
                    <span>Upload Logo Navbar</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "logoUrl")}
                      disabled={uploadingImg}
                    />
                  </label>
                </div>

                {/* 2. Logo Footer Website */}
                <div className="rounded-xl border border-line bg-track/20 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-ink">2. Logo Footer Website</span>
                    {settings.footerLogoUrl && (
                      <button
                        type="button"
                        onClick={() => handleChange("footerLogoUrl", "")}
                        className="text-[11px] font-bold text-red-600 hover:underline"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg border border-line bg-field flex items-center justify-center overflow-hidden shrink-0">
                      {settings.footerLogoUrl || settings.logoUrl ? (
                        <img src={settings.footerLogoUrl || settings.logoUrl} alt="Footer Logo" className="w-full h-full object-contain p-1" />
                      ) : (
                        <Globe size={20} className="text-muted" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Field
                        value={settings.footerLogoUrl || ""}
                        onChange={(e) => handleChange("footerLogoUrl", e.target.value)}
                        placeholder="Jika kosong, gunakan logo navbar"
                      />
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-accent cursor-pointer hover:underline">
                    <Upload size={13} />
                    <span>Upload Logo Footer</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "footerLogoUrl")}
                      disabled={uploadingImg}
                    />
                  </label>
                </div>

                {/* 3. Favicon Browser */}
                <div className="rounded-xl border border-line bg-track/20 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-ink">3. Favicon Browser Tab</span>
                    {settings.faviconUrl && (
                      <button
                        type="button"
                        onClick={() => handleChange("faviconUrl", "")}
                        className="text-[11px] font-bold text-red-600 hover:underline"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg border border-line bg-field flex items-center justify-center overflow-hidden shrink-0">
                      {settings.faviconUrl ? (
                        <img src={settings.faviconUrl} alt="Favicon" className="w-6 h-6 object-contain" />
                      ) : (
                        <Globe size={20} className="text-muted" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Field
                        value={settings.faviconUrl || ""}
                        onChange={(e) => handleChange("faviconUrl", e.target.value)}
                        placeholder="/favicon.ico atau https://..."
                      />
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-accent cursor-pointer hover:underline">
                    <Upload size={13} />
                    <span>Upload Favicon</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "faviconUrl")}
                      disabled={uploadingImg}
                    />
                  </label>
                </div>

                {/* 4. Ikon Aplikasi (App Icon) */}
                <div className="rounded-xl border border-line bg-track/20 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-ink">4. Ikon Aplikasi (App Icon)</span>
                    {settings.appIconUrl && (
                      <button
                        type="button"
                        onClick={() => handleChange("appIconUrl", "")}
                        className="text-[11px] font-bold text-red-600 hover:underline"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl border border-line bg-field flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                      {settings.appIconUrl || settings.logoUrl ? (
                        <img src={settings.appIconUrl || settings.logoUrl} alt="App Icon" className="w-full h-full object-cover" />
                      ) : (
                        <Bolt size={20} className="text-muted" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Field
                        value={settings.appIconUrl || ""}
                        onChange={(e) => handleChange("appIconUrl", e.target.value)}
                        placeholder="Ikon APK / mockup aplikasi"
                      />
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-accent cursor-pointer hover:underline">
                    <Upload size={13} />
                    <span>Upload Ikon Aplikasi</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "appIconUrl")}
                      disabled={uploadingImg}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-line">
            <h3 className="font-extrabold text-base text-ink mb-1 flex items-center gap-2">
              <Search size={18} className="text-accent" />
              <span>Optimasi Mesin Pencari (SEO) & OpenGraph</span>
            </h3>
            <p className="text-xs text-muted mb-4">Pengaturan judul halaman dan pratinjau tautan ketika dibagikan ke WhatsApp / media sosial.</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="SEO Meta Title"
                className="sm:col-span-2"
                value={settings.siteTitle || ""}
                onChange={(e) => handleChange("siteTitle", e.target.value)}
                placeholder="CariKostKita — Download Aplikasi Pencarian Kost Pekanbaru (APK)"
              />
              <TextArea
                label="SEO Meta Description"
                className="sm:col-span-2"
                value={settings.siteDescription || ""}
                onChange={(e) => handleChange("siteDescription", e.target.value)}
                placeholder="Aplikasi Android ringan untuk mencari kost di Pekanbaru. Foto asli, lokasi presisi..."
              />
              <Field
                label="Meta Keywords (Pisahkan dengan koma)"
                className="sm:col-span-2"
                value={settings.metaKeywords || ""}
                onChange={(e) => handleChange("metaKeywords", e.target.value)}
                placeholder="cari kost pekanbaru, kost UIR, kost UNRI, kost Bukit Raya, APK CariKostKita"
              />
              <div className="sm:col-span-2 rounded-xl border border-line bg-track/20 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-ink">OpenGraph Social Share Preview Image (1200x630)</span>
                  {settings.ogImageUrl && (
                    <button
                      type="button"
                      onClick={() => handleChange("ogImageUrl", "")}
                      className="text-[11px] font-bold text-red-600 hover:underline"
                    >
                      Hapus
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-12 rounded-lg border border-line bg-field flex items-center justify-center overflow-hidden shrink-0">
                    {settings.ogImageUrl ? (
                      <img src={settings.ogImageUrl} alt="OG Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={20} className="text-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Field
                      value={settings.ogImageUrl || ""}
                      onChange={(e) => handleChange("ogImageUrl", e.target.value)}
                      placeholder="/og-image.jpg atau https://..."
                    />
                  </div>
                </div>
                <label className="inline-flex items-center gap-1.5 text-xs font-bold text-accent cursor-pointer hover:underline">
                  <Upload size={13} />
                  <span>Upload Gambar OpenGraph</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, "ogImageUrl")}
                    disabled={uploadingImg}
                  />
                </label>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* Tab 2: Header & Navigasi */}
      {activeTab === "Navigasi" && (
        <Panel className="max-w-4xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base text-ink mb-1 flex items-center gap-2">
                <Layers size={18} className="text-accent" />
                <span>Menu Navigasi Header & Mobile Drawer</span>
              </h3>
              <p className="text-xs text-muted">Kelola item menu navbar atas dan navigasi drawer smartphone.</p>
            </div>
            <GhostButton
              onClick={() =>
                setModalItem({
                  type: "navLinks",
                  mode: "add",
                  data: { label: "", href: "#", is_active: true },
                })
              }
            >
              <Plus size={16} />
              <span>Tambah Menu</span>
            </GhostButton>
          </div>

          <div className="space-y-2">
            {(settings.navLinks || []).map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-line bg-track/20 hover:bg-track/40 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-track flex items-center justify-center text-xs font-bold text-muted">
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-ink">{item.label}</h4>
                    <p className="text-xs text-muted font-mono">{item.href}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => toggleItemActive("navLinks", idx)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${
                      item.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                    }`}
                  >
                    {item.is_active ? <Eye size={13} /> : <EyeOff size={13} />}
                    <span>{item.is_active ? "Aktif" : "Mati"}</span>
                  </button>
                  <IconButton
                    label="Naikkan"
                    onClick={() => moveItem("navLinks", idx, -1)}
                    disabled={idx === 0}
                  >
                    <ArrowUp size={15} />
                  </IconButton>
                  <IconButton
                    label="Turunkan"
                    onClick={() => moveItem("navLinks", idx, 1)}
                    disabled={idx === settings.navLinks.length - 1}
                  >
                    <ArrowDown size={15} />
                  </IconButton>
                  <IconButton
                    label="Edit"
                    onClick={() =>
                      setModalItem({
                        type: "navLinks",
                        mode: "edit",
                        index: idx,
                        data: { ...item },
                      })
                    }
                  >
                    <Pencil size={15} />
                  </IconButton>
                  <IconButton
                    label="Hapus"
                    tone="danger"
                    onClick={() =>
                      setConfirmDelete({
                        type: "navLinks",
                        index: idx,
                        title: `Hapus menu "${item.label}"?`,
                      })
                    }
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </div>
            ))}
            {(!settings.navLinks || settings.navLinks.length === 0) && (
              <p className="text-xs text-muted italic p-4 text-center border border-dashed border-line rounded-lg">
                Belum ada menu navigasi kustom. Menu standar bawaan akan ditampilkan.
              </p>
            )}
          </div>
        </Panel>
      )}

      {/* Tab 3: Hero & Banner */}
      {activeTab === "Hero & Banner" && (
        <Panel className="max-w-4xl space-y-6">
          {/* Banner Pengumuman */}
          <div className="rounded-xl border border-line bg-track/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-extrabold text-sm text-ink uppercase tracking-wider flex items-center gap-2">
                <Megaphone size={16} className="text-accent" />
                <span>Bilah Pengumuman & Promosi (Atas)</span>
              </h4>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-ink">
                <input
                  type="checkbox"
                  checked={Boolean(settings.bannerActive)}
                  onChange={(e) => handleChange("bannerActive", e.target.checked)}
                  className="w-4 h-4 rounded border-line text-accent focus:ring-accent"
                />
                <span>Aktifkan Banner</span>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Pesan Banner"
                className="sm:col-span-2"
                value={settings.bannerText || ""}
                onChange={(e) => handleChange("bannerText", e.target.value)}
                placeholder="🎉 Promo Rilis Beta: Listing Kost Gratis untuk Pemilik Kost di Pekanbaru!"
              />
              <Field
                label="Tautan Tombol Banner"
                value={settings.bannerLink || ""}
                onChange={(e) => handleChange("bannerLink", e.target.value)}
                placeholder="#pemilik atau https://..."
              />
              <SelectField
                label="Tipe Tampilan Banner"
                value={settings.bannerType || "promo"}
                onChange={(e) => handleChange("bannerType", e.target.value)}
                options={[
                  ["promo", "Promo (Gradien Aksen Menarik)"],
                  ["info", "Informasi Penting (Elegan Netral)"],
                  ["warning", "Pemberitahuan Sistem (Kuning Waspada)"],
                ]}
              />
            </div>
          </div>

          {/* Modal Pop-up Beranda */}
          <div className="rounded-xl border border-line bg-track/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-extrabold text-sm text-ink uppercase tracking-wider flex items-center gap-2">
                <Layers size={16} className="text-accent" />
                <span>Dialog Pop-up Beranda (Modal Pop-up Otomatis)</span>
              </h4>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-ink">
                <input
                  type="checkbox"
                  checked={Boolean(settings.popupActive)}
                  onChange={(e) => handleChange("popupActive", e.target.checked)}
                  className="w-4 h-4 rounded border-line text-accent focus:ring-accent"
                />
                <span>Aktifkan Pop-up</span>
              </label>
            </div>
            <p className="text-xs text-muted mb-4">
              Jika diaktifkan, dialog pop-up akan muncul saat pengunjung membuka Landing Page. Jika dinonaktifkan, pop-up 100% tidak akan dirender.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Judul Pop-up"
                className="sm:col-span-2"
                value={settings.popupTitle || ""}
                onChange={(e) => handleChange("popupTitle", e.target.value)}
                placeholder="🎉 Selamat Datang di CariKostKita!"
              />
              <TextArea
                label="Konten / Pesan Pop-up"
                className="sm:col-span-2"
                value={settings.popupContent || ""}
                onChange={(e) => handleChange("popupContent", e.target.value)}
                placeholder="Tulis pesan pengumuman penting, diskon, atau event khusus di sini..."
              />
              <div className="sm:col-span-2">
                <Field
                  label="URL Banner / Gambar Pop-up (Opsional)"
                  value={settings.popupImageUrl || ""}
                  onChange={(e) => handleChange("popupImageUrl", e.target.value)}
                  placeholder="https://... atau upload berkas"
                />
                <div className="flex items-center gap-3 mt-2">
                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-accent cursor-pointer hover:underline">
                    <Upload size={13} />
                    <span>Upload Gambar Pop-up</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "popupImageUrl")}
                      disabled={uploadingImg}
                    />
                  </label>
                  {settings.popupImageUrl && (
                    <button
                      type="button"
                      onClick={() => handleChange("popupImageUrl", "")}
                      className="text-xs font-bold text-red-600 hover:underline"
                    >
                      Hapus Gambar
                    </button>
                  )}
                </div>
              </div>
              <Field
                label="Label Tombol Aksi Pop-up (Opsional)"
                value={settings.popupButtonLabel || ""}
                onChange={(e) => handleChange("popupButtonLabel", e.target.value)}
                placeholder="Lihat Sekarang"
              />
              <Field
                label="Tautan Tombol Aksi Pop-up (Opsional)"
                value={settings.popupButtonUrl || ""}
                onChange={(e) => handleChange("popupButtonUrl", e.target.value)}
                placeholder="#pemilik atau https://..."
              />
            </div>
          </div>

          {/* Hero Content */}
          <div>
            <h4 className="font-extrabold text-sm text-ink uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-accent" />
              <span>Teks Utama & Ajakan Bertindak (Hero Section)</span>
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Headline Utama (H1)"
                className="sm:col-span-2"
                value={settings.heroHeadline || ""}
                onChange={(e) => handleChange("heroHeadline", e.target.value)}
                placeholder="Temukan Kost Nyaman & Terpercaya di Pekanbaru"
              />
              <TextArea
                label="Subheadline / Deskripsi Hero"
                className="sm:col-span-2"
                value={settings.heroSubheadline || ""}
                onChange={(e) => handleChange("heroSubheadline", e.target.value)}
                placeholder="CariKostKita hadir untuk memudahkan kamu menemukan kost terbaik..."
              />
              <Field
                label="Label Tombol Utama (CTA 1)"
                value={settings.heroCtaPrimaryLabel || "Download APK"}
                onChange={(e) => handleChange("heroCtaPrimaryLabel", e.target.value)}
              />
              <Field
                label="URL Download APK"
                value={settings.apkUrl || ""}
                onChange={(e) => handleChange("apkUrl", e.target.value)}
                placeholder="https://github.com/WalZetass-kar/CariKostKita/releases/download/v1.1.2/CariKostKita-v1.1.2-release.apk"
              />
              <Field
                label="Label Tombol Kedua (CTA 2)"
                value={settings.heroCtaSecondaryLabel || "Lihat Fitur"}
                onChange={(e) => handleChange("heroCtaSecondaryLabel", e.target.value)}
              />
              <Field
                label="Tautan Tombol Kedua"
                value={settings.heroCtaSecondaryLink || "#fitur"}
                onChange={(e) => handleChange("heroCtaSecondaryLink", e.target.value)}
              />
            </div>
          </div>

          {/* Spec Capsule & Trust Row */}
          <div className="pt-4 border-t border-line grid gap-4 sm:grid-cols-2">
            <Field
              label="Spesifikasi: Versi Rilis"
              value={settings.versionName || ""}
              onChange={(e) => handleChange("versionName", e.target.value)}
              placeholder="v1.1.2"
            />
            <Field
              label="Spesifikasi: Ukuran File APK"
              value={settings.apkSize || ""}
              onChange={(e) => handleChange("apkSize", e.target.value)}
              placeholder="3.3 MB"
            />
            <Field
              label="Spesifikasi: Minimum OS Android"
              value={settings.minAndroid || ""}
              onChange={(e) => handleChange("minAndroid", e.target.value)}
              placeholder="Android 8.0+"
            />
            <Field
              label="Spesifikasi: Teks Keunggulan"
              value={settings.heroAdFreeText || "Bebas Iklan"}
              onChange={(e) => handleChange("heroAdFreeText", e.target.value)}
              placeholder="Bebas Iklan"
            />
            <Field
              label="Trust Badge Bawah 1"
              value={settings.heroTrustBadge1 || "Mudah Digunakan"}
              onChange={(e) => handleChange("heroTrustBadge1", e.target.value)}
            />
            <Field
              label="Trust Badge Bawah 2"
              value={settings.heroTrustBadge2 || "Data Terpercaya"}
              onChange={(e) => handleChange("heroTrustBadge2", e.target.value)}
            />
            <Field
              label="Trust Badge Bawah 3"
              className="sm:col-span-2"
              value={settings.heroTrustBadge3 || "Update Rutin"}
              onChange={(e) => handleChange("heroTrustBadge3", e.target.value)}
            />
          </div>

          {/* Floating Cards & Showcase Image */}
          <div className="pt-4 border-t border-line grid gap-4 sm:grid-cols-2">
            <Field
              label="Kartu Melayang Atas (Floating Card 1)"
              value={settings.heroBadge1 || ""}
              onChange={(e) => handleChange("heroBadge1", e.target.value)}
              placeholder="Lokasi dekat kampus & area strategis"
            />
            <Field
              label="Kartu Melayang Bawah (Floating Card 2)"
              value={settings.heroBadge2 || ""}
              onChange={(e) => handleChange("heroBadge2", e.target.value)}
              placeholder="Detail kost & foto kamar lengkap"
            />
            <div className="sm:col-span-2">
              <Field
                label="URL Gambar Showcase Layar Ponsel 3D (Opsional)"
                value={settings.heroImageUrl || ""}
                onChange={(e) => handleChange("heroImageUrl", e.target.value)}
                placeholder="/uploads/showcase.png atau https://..."
                hint="Jika diisi, gambar ini langsung menggantikan mockup default pada layar smartphone 3D hero."
              />
              <label className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-accent cursor-pointer hover:underline">
                <Upload size={13} />
                <span>{uploadingImg ? "Mengunggah..." : "Upload Gambar Showcase Baru"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "heroImageUrl")}
                  disabled={uploadingImg}
                />
              </label>
            </div>
          </div>
        </Panel>
      )}

      {/* Tab 4: Kepercayaan (Trust Cards) */}
      {activeTab === "Kepercayaan" && (
        <Panel className="max-w-4xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base text-ink mb-1 flex items-center gap-2">
                <ShieldCheck size={18} className="text-accent" />
                <span>Kartu Kepercayaan Aplikasi</span>
              </h3>
              <p className="text-xs text-muted">
                Tiga atau lebih pilar keunggulan aplikasi (resmi terverifikasi, hemat kuota, izin masuk akal, dsb).
              </p>
            </div>
            <GhostButton
              onClick={() =>
                setModalItem({
                  type: "trustItems",
                  mode: "add",
                  data: { icon: "shield", title: "", desc: "", is_active: true },
                })
              }
            >
              <Plus size={16} />
              <span>Tambah Kartu</span>
            </GhostButton>
          </div>

          <div className="grid gap-3">
            {(settings.trustItems || []).map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-line bg-track/20 hover:bg-track/40 transition"
              >
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-ink">{item.title}</h4>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">{item.desc}</p>
                    <small className="text-[10px] text-muted font-mono">Ikon: {item.icon || "shield"}</small>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleItemActive("trustItems", idx)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${
                      item.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                    }`}
                  >
                    {item.is_active ? <Eye size={13} /> : <EyeOff size={13} />}
                    <span>{item.is_active ? "Aktif" : "Mati"}</span>
                  </button>
                  <IconButton
                    label="Naik"
                    onClick={() => moveItem("trustItems", idx, -1)}
                    disabled={idx === 0}
                  >
                    <ArrowUp size={15} />
                  </IconButton>
                  <IconButton
                    label="Turun"
                    onClick={() => moveItem("trustItems", idx, 1)}
                    disabled={idx === settings.trustItems.length - 1}
                  >
                    <ArrowDown size={15} />
                  </IconButton>
                  <IconButton
                    label="Edit"
                    onClick={() =>
                      setModalItem({
                        type: "trustItems",
                        mode: "edit",
                        index: idx,
                        data: { ...item },
                      })
                    }
                  >
                    <Pencil size={15} />
                  </IconButton>
                  <IconButton
                    label="Hapus"
                    tone="danger"
                    onClick={() =>
                      setConfirmDelete({
                        type: "trustItems",
                        index: idx,
                        title: `Hapus kartu "${item.title}"?`,
                      })
                    }
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Tab 5: Fitur Aplikasi */}
      {activeTab === "Fitur Aplikasi" && (
        <Panel className="max-w-4xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base text-ink mb-1 flex items-center gap-2">
                <Sliders size={18} className="text-accent" />
                <span>Kartu Fitur Aplikasi</span>
              </h3>
              <p className="text-xs text-muted">Fitur-fitur unggulan yang ditampilkan di section #fitur.</p>
            </div>
            <GhostButton
              onClick={() =>
                setModalItem({
                  type: "featureItems",
                  mode: "add",
                  data: { icon: "search", title: "", desc: "", is_active: true },
                })
              }
            >
              <Plus size={16} />
              <span>Tambah Fitur</span>
            </GhostButton>
          </div>

          <div className="grid gap-3">
            {(settings.featureItems || []).map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-line bg-track/20 hover:bg-track/40 transition"
              >
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-ink">{item.title}</h4>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">{item.desc}</p>
                    <small className="text-[10px] text-muted font-mono">Ikon: {item.icon || "search"}</small>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleItemActive("featureItems", idx)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${
                      item.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                    }`}
                  >
                    {item.is_active ? <Eye size={13} /> : <EyeOff size={13} />}
                    <span>{item.is_active ? "Aktif" : "Mati"}</span>
                  </button>
                  <IconButton
                    label="Naik"
                    onClick={() => moveItem("featureItems", idx, -1)}
                    disabled={idx === 0}
                  >
                    <ArrowUp size={15} />
                  </IconButton>
                  <IconButton
                    label="Turun"
                    onClick={() => moveItem("featureItems", idx, 1)}
                    disabled={idx === settings.featureItems.length - 1}
                  >
                    <ArrowDown size={15} />
                  </IconButton>
                  <IconButton
                    label="Edit"
                    onClick={() =>
                      setModalItem({
                        type: "featureItems",
                        mode: "edit",
                        index: idx,
                        data: { ...item },
                      })
                    }
                  >
                    <Pencil size={15} />
                  </IconButton>
                  <IconButton
                    label="Hapus"
                    tone="danger"
                    onClick={() =>
                      setConfirmDelete({
                        type: "featureItems",
                        index: idx,
                        title: `Hapus fitur "${item.title}"?`,
                      })
                    }
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Tab 6: Panduan Install */}
      {activeTab === "Panduan Install" && (
        <Panel className="max-w-4xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base text-ink mb-1 flex items-center gap-2">
                <ListOrdered size={18} className="text-accent" />
                <span>Langkah Panduan Instalasi APK</span>
              </h3>
              <p className="text-xs text-muted">4 langkah instalasi interaktif yang terhubung ke mockup simulasi 3D.</p>
            </div>
            <GhostButton
              onClick={() =>
                setModalItem({
                  type: "installSteps",
                  mode: "add",
                  data: { step_number: String((settings.installSteps || []).length + 1), title: "", desc: "", is_active: true },
                })
              }
            >
              <Plus size={16} />
              <span>Tambah Langkah</span>
            </GhostButton>
          </div>

          <div className="grid gap-3">
            {(settings.installSteps || []).map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-line bg-track/20 hover:bg-track/40 transition"
              >
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-accent text-[#EEEAD7] flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5">
                    {item.step_number || idx + 1}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-ink">{item.title}</h4>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  <IconButton
                    label="Naik"
                    onClick={() => moveItem("installSteps", idx, -1)}
                    disabled={idx === 0}
                  >
                    <ArrowUp size={15} />
                  </IconButton>
                  <IconButton
                    label="Turun"
                    onClick={() => moveItem("installSteps", idx, 1)}
                    disabled={idx === settings.installSteps.length - 1}
                  >
                    <ArrowDown size={15} />
                  </IconButton>
                  <IconButton
                    label="Edit"
                    onClick={() =>
                      setModalItem({
                        type: "installSteps",
                        mode: "edit",
                        index: idx,
                        data: { ...item },
                      })
                    }
                  >
                    <Pencil size={15} />
                  </IconButton>
                  <IconButton
                    label="Hapus"
                    tone="danger"
                    onClick={() =>
                      setConfirmDelete({
                        type: "installSteps",
                        index: idx,
                        title: `Hapus langkah "${item.title}"?`,
                      })
                    }
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Tab 7: Khusus Pemilik Kost */}
      {activeTab === "Pemilik Kost" && (
        <Panel className="max-w-4xl space-y-6">
          <div>
            <h3 className="font-extrabold text-base text-ink mb-1 flex items-center gap-2">
              <Building2 size={18} className="text-accent" />
              <span>Section Kemitraan Pemilik Kost</span>
            </h3>
            <p className="text-xs text-muted">Kelola ajakan mendaftar dan tahapan pendaftaran properti kost.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Judul Section Pemilik"
              className="sm:col-span-2"
              value={settings.ownerTitle || ""}
              onChange={(e) => handleChange("ownerTitle", e.target.value)}
              placeholder="Anda punya kost di Pekanbaru?"
            />
            <TextArea
              label="Deskripsi / Ajakan"
              className="sm:col-span-2"
              value={settings.ownerIntro || ""}
              onChange={(e) => handleChange("ownerIntro", e.target.value)}
              placeholder="Daftarkan kost Anda di CariKostKita agar lebih mudah ditemukan..."
            />
            <Field
              label="Label Tombol WhatsApp Pemilik"
              value={settings.ownerWaLabel || "Daftar via WhatsApp"}
              onChange={(e) => handleChange("ownerWaLabel", e.target.value)}
            />
            <Field
              label="Nomor WhatsApp Hotline"
              value={settings.whatsapp || ""}
              onChange={(e) => handleChange("whatsapp", e.target.value)}
              placeholder="6281270008899"
            />
          </div>

          <div className="pt-4 border-t border-line">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-sm text-ink">5 Langkah Pendaftaran Pemilik Kost</h4>
              <GhostButton
                onClick={() =>
                  setModalItem({
                    type: "ownerSteps",
                    mode: "add",
                    data: { title: "", is_active: true },
                  })
                }
              >
                <Plus size={15} />
                <span>Tambah Langkah</span>
              </GhostButton>
            </div>

            <div className="space-y-2">
              {(settings.ownerSteps || []).map((step, idx) => (
                <div
                  key={step.id || idx}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-line bg-track/20"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-accent/15 text-accent font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs sm:text-sm text-ink">{step.title}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <IconButton
                      label="Naik"
                      onClick={() => moveItem("ownerSteps", idx, -1)}
                      disabled={idx === 0}
                    >
                      <ArrowUp size={14} />
                    </IconButton>
                    <IconButton
                      label="Turun"
                      onClick={() => moveItem("ownerSteps", idx, 1)}
                      disabled={idx === settings.ownerSteps.length - 1}
                    >
                      <ArrowDown size={14} />
                    </IconButton>
                    <IconButton
                      label="Edit"
                      onClick={() =>
                        setModalItem({
                          type: "ownerSteps",
                          mode: "edit",
                          index: idx,
                          data: { ...step },
                        })
                      }
                    >
                      <Pencil size={14} />
                    </IconButton>
                    <IconButton
                      label="Hapus"
                      tone="danger"
                      onClick={() =>
                        setConfirmDelete({
                          type: "ownerSteps",
                          index: idx,
                          title: `Hapus langkah "${step.title}"?`,
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      )}

      {/* Tab 8: Tentang & Kontak */}
      {activeTab === "Tentang & Kontak" && (
        <Panel className="max-w-4xl space-y-6">
          <div>
            <h3 className="font-extrabold text-base text-ink mb-1 flex items-center gap-2">
              <Users size={18} className="text-accent" />
              <span>Profil Tentang Kami & Kontak Resmi</span>
            </h3>
            <p className="text-xs text-muted">Informasi kantor, kontak narahubung, dan tautan jejaring sosial resmi.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Judul Tentang Kami"
              className="sm:col-span-2"
              value={settings.aboutTitle || ""}
              onChange={(e) => handleChange("aboutTitle", e.target.value)}
              placeholder="Dibangun untuk Kebutuhan Pencari Kost"
            />
            <TextArea
              label="Cerita / Deskripsi Tentang Kami"
              className="sm:col-span-2"
              value={settings.aboutStory || ""}
              onChange={(e) => handleChange("aboutStory", e.target.value)}
              placeholder="CariKostKita adalah aplikasi yang dikembangkan untuk membantu..."
            />
            <Field
              label="Alamat Kantor Resmi"
              className="sm:col-span-2"
              value={settings.address || ""}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="Jl. Soekarno Hatta No. 1, Pekanbaru, Riau"
            />
            <Field
              label="Nomor Telepon Kantor"
              value={settings.contactPhone || ""}
              onChange={(e) => handleChange("contactPhone", e.target.value)}
              placeholder="0761-555-0123"
            />
            <Field
              label="Email Bantuan / Dukungan"
              type="email"
              value={settings.supportEmail || ""}
              onChange={(e) => handleChange("supportEmail", e.target.value)}
              placeholder="support@carikostkita.id"
            />
            <Field
              label="WhatsApp Hotline"
              value={settings.whatsapp || ""}
              onChange={(e) => handleChange("whatsapp", e.target.value)}
              placeholder="6281270008899"
            />
            <Field
              label="URL Repositori GitHub"
              value={settings.githubUrl || ""}
              onChange={(e) => handleChange("githubUrl", e.target.value)}
              placeholder="https://github.com/..."
            />
            <Field
              label="Instagram URL"
              value={settings.instagram || ""}
              onChange={(e) => handleChange("instagram", e.target.value)}
              placeholder="https://instagram.com/carikostkita"
            />
            <Field
              label="Facebook URL"
              value={settings.facebook || ""}
              onChange={(e) => handleChange("facebook", e.target.value)}
              placeholder="https://facebook.com/carikostkita"
            />
            <Field
              label="TikTok URL"
              value={settings.tiktok || ""}
              onChange={(e) => handleChange("tiktok", e.target.value)}
              placeholder="https://tiktok.com/@carikostkita"
            />
            <Field
              label="YouTube URL (Opsional)"
              value={settings.youtube || ""}
              onChange={(e) => handleChange("youtube", e.target.value)}
              placeholder="https://youtube.com/@carikostkita"
            />
          </div>
        </Panel>
      )}

      {/* Tab 9: FAQ */}
      {activeTab === "FAQ" && (
        <Panel className="max-w-4xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base text-ink mb-1 flex items-center gap-2">
                <HelpCircle size={18} className="text-accent" />
                <span>Pertanyaan yang Sering Diajukan (FAQ)</span>
              </h3>
              <p className="text-xs text-muted">Daftar tanya-jawab akordeon yang tampil pada halaman utama.</p>
            </div>
            <GhostButton
              onClick={() =>
                setModalItem({
                  type: "faqItems",
                  mode: "add",
                  data: { question: "", answer: "", is_active: true },
                })
              }
            >
              <Plus size={16} />
              <span>Tambah FAQ</span>
            </GhostButton>
          </div>

          <div className="grid gap-3">
            {(settings.faqItems || []).map((faq, idx) => (
              <div
                key={faq.id || idx}
                className="p-3.5 rounded-lg border border-line bg-track/20 hover:bg-track/40 transition space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-accent/15 text-accent font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      Q{idx + 1}
                    </span>
                    <h4 className="text-sm font-bold text-ink">{faq.question}</h4>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleItemActive("faqItems", idx)}
                      className={`px-2 py-0.5 rounded text-xs font-bold transition flex items-center gap-1 ${
                        faq.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                      }`}
                    >
                      {faq.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                      <span>{faq.is_active ? "Aktif" : "Mati"}</span>
                    </button>
                    <IconButton
                      label="Naik"
                      onClick={() => moveItem("faqItems", idx, -1)}
                      disabled={idx === 0}
                    >
                      <ArrowUp size={14} />
                    </IconButton>
                    <IconButton
                      label="Turun"
                      onClick={() => moveItem("faqItems", idx, 1)}
                      disabled={idx === settings.faqItems.length - 1}
                    >
                      <ArrowDown size={14} />
                    </IconButton>
                    <IconButton
                      label="Edit"
                      onClick={() =>
                        setModalItem({
                          type: "faqItems",
                          mode: "edit",
                          index: idx,
                          data: { ...faq },
                        })
                      }
                    >
                      <Pencil size={14} />
                    </IconButton>
                    <IconButton
                      label="Hapus"
                      tone="danger"
                      onClick={() =>
                        setConfirmDelete({
                          type: "faqItems",
                          index: idx,
                          title: `Hapus pertanyaan "${faq.question}"?`,
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                </div>
                <p className="text-xs text-muted leading-relaxed pl-8">{faq.answer}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Tab 10: Feedback & CTA Akhir */}
      {activeTab === "Feedback & CTA" && (
        <Panel className="max-w-4xl space-y-6">
          {/* Feedback Section */}
          <div className="rounded-xl border border-line bg-track/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-extrabold text-sm text-ink uppercase tracking-wider flex items-center gap-2">
                <MessageSquare size={16} className="text-accent" />
                <span>Bagian Uji Coba & Masukan (Feedback Section)</span>
              </h4>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-ink">
                <input
                  type="checkbox"
                  checked={Boolean(settings.feedbackActive)}
                  onChange={(e) => handleChange("feedbackActive", e.target.checked)}
                  className="w-4 h-4 rounded border-line text-accent focus:ring-accent"
                />
                <span>Tampilkan Section Ini</span>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Judul Feedback"
                className="sm:col-span-2"
                value={settings.feedbackTitle || ""}
                onChange={(e) => handleChange("feedbackTitle", e.target.value)}
                placeholder="Bantu kami menyempurnakan CariKostKita"
              />
              <TextArea
                label="Deskripsi Ajakan Masukan"
                className="sm:col-span-2"
                value={settings.feedbackDesc || ""}
                onChange={(e) => handleChange("feedbackDesc", e.target.value)}
                placeholder="Menemukan bug atau punya usulan fitur..."
              />
              <Field
                label="Teks Tombol WhatsApp Feedback"
                value={settings.feedbackButtonLabel || "Kirim Masukan via WhatsApp"}
                onChange={(e) => handleChange("feedbackButtonLabel", e.target.value)}
              />
            </div>
          </div>

          {/* Final CTA */}
          <div className="pt-4 border-t border-line">
            <h4 className="font-extrabold text-sm text-ink uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-accent" />
              <span>Section Penutup (Final Call To Action)</span>
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Teks Eyebrow"
                value={settings.finalCtaEyebrow || "JANGAN TUNGGU LAGI!"}
                onChange={(e) => handleChange("finalCtaEyebrow", e.target.value)}
              />
              <Field
                label="Judul Utama Final CTA"
                value={settings.finalCtaTitle || "Yuk, Temukan Kost Terbaikmu Sekarang!"}
                onChange={(e) => handleChange("finalCtaTitle", e.target.value)}
              />
              <TextArea
                label="Deskripsi Ajakan Download"
                className="sm:col-span-2"
                value={settings.finalCtaDesc || ""}
                onChange={(e) => handleChange("finalCtaDesc", e.target.value)}
              />
              <Field
                label="Label Tombol Final CTA"
                value={settings.finalCtaButtonLabel || "Download APK Sekarang"}
                onChange={(e) => handleChange("finalCtaButtonLabel", e.target.value)}
              />
            </div>
          </div>
        </Panel>
      )}

      {/* Tab 11: Footer & Legal */}
      {activeTab === "Footer & Legal" && (
        <Panel className="max-w-4xl space-y-6">
          <div>
            <h3 className="font-extrabold text-base text-ink mb-1 flex items-center gap-2">
              <FileText size={18} className="text-accent" />
              <span>Footer, Dokumen Legal & Dialog Keamanan</span>
            </h3>
            <p className="text-xs text-muted">Pengaturan teks penutup footer, modal panduan Play Protect, serta syarat & ketentuan.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Tagline Footer"
              value={settings.footerTagline || ""}
              onChange={(e) => handleChange("footerTagline", e.target.value)}
              placeholder="Kost terbaik, untuk masa depanmu."
            />
            <Field
              label="Teks Hak Cipta (Copyright)"
              value={settings.footerCopyright || ""}
              onChange={(e) => handleChange("footerCopyright", e.target.value)}
              placeholder="© 2026 CariKostKita. All rights reserved."
            />
          </div>

          <div className="pt-4 border-t border-line">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-sm text-ink">Modal Panduan Dialog Keamanan Android (Play Protect)</h4>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-ink">
                <input
                  type="checkbox"
                  checked={settings.securityModalActive !== false}
                  onChange={(e) => handleChange("securityModalActive", e.target.checked)}
                  className="w-4 h-4 rounded border-line text-accent focus:ring-accent"
                />
                <span>Aktifkan Panduan Dialog</span>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Judul Modal"
                className="sm:col-span-2"
                value={settings.securityModalTitle || "Panduan Dialog Download Android"}
                onChange={(e) => handleChange("securityModalTitle", e.target.value)}
              />
              <TextArea
                label="Penjelasan Modal"
                className="sm:col-span-2"
                value={settings.securityModalDesc || ""}
                onChange={(e) => handleChange("securityModalDesc", e.target.value)}
              />
              <TextArea
                label="Catatan Keamanan di Bagian Bawah Modal"
                className="sm:col-span-2"
                value={settings.securityModalNote || ""}
                onChange={(e) => handleChange("securityModalNote", e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-line">
            <h4 className="font-bold text-sm text-ink mb-3">Halaman / Modal Kebijakan Privasi & Syarat Ketentuan</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextArea
                label="Isi Kebijakan Privasi (Privacy Policy)"
                rows={5}
                value={settings.legalPrivacy || ""}
                onChange={(e) => handleChange("legalPrivacy", e.target.value)}
                placeholder="Tuliskan kebijakan privasi aplikasi di sini..."
              />
              <TextArea
                label="Isi Syarat & Ketentuan (Terms of Service)"
                rows={5}
                value={settings.legalTerms || ""}
                onChange={(e) => handleChange("legalTerms", e.target.value)}
                placeholder="Tuliskan syarat & ketentuan layanan di sini..."
              />
            </div>
          </div>
        </Panel>
      )}

      {/* Item Modal Editor (Nav, Trust, Features, Install Steps, Owner Steps, FAQ) */}
      {modalItem && (
        <Modal
          title={
            modalItem.type === "navLinks"
              ? `${modalItem.mode === "add" ? "Tambah" : "Edit"} Menu Navigasi`
              : modalItem.type === "trustItems"
              ? `${modalItem.mode === "add" ? "Tambah" : "Edit"} Kartu Kepercayaan`
              : modalItem.type === "featureItems"
              ? `${modalItem.mode === "add" ? "Tambah" : "Edit"} Fitur Aplikasi`
              : modalItem.type === "installSteps"
              ? `${modalItem.mode === "add" ? "Tambah" : "Edit"} Langkah Install`
              : modalItem.type === "ownerSteps"
              ? `${modalItem.mode === "add" ? "Tambah" : "Edit"} Langkah Pemilik`
              : `${modalItem.mode === "add" ? "Tambah" : "Edit"} FAQ`
          }
          onClose={() => setModalItem(null)}
        >
          <div className="space-y-4">
            {modalItem.type === "navLinks" && (
              <>
                <Field
                  label="Label Menu"
                  value={modalItem.data.label || ""}
                  onChange={(e) =>
                    setModalItem((prev) => ({
                      ...prev,
                      data: { ...prev.data, label: e.target.value },
                    }))
                  }
                  placeholder="Fitur"
                  required
                />
                <Field
                  label="Tautan / Target (#id atau URL)"
                  value={modalItem.data.href || ""}
                  onChange={(e) =>
                    setModalItem((prev) => ({
                      ...prev,
                      data: { ...prev.data, href: e.target.value },
                    }))
                  }
                  placeholder="#fitur"
                  required
                />
              </>
            )}

            {(modalItem.type === "trustItems" || modalItem.type === "featureItems") && (
              <>
                <Field
                  label="Judul"
                  value={modalItem.data.title || ""}
                  onChange={(e) =>
                    setModalItem((prev) => ({
                      ...prev,
                      data: { ...prev.data, title: e.target.value },
                    }))
                  }
                  placeholder="Pencarian Mudah"
                  required
                />
                <SelectField
                  label="Ikon"
                  value={modalItem.data.icon || (modalItem.type === "trustItems" ? "shield" : "search")}
                  onChange={(e) =>
                    setModalItem((prev) => ({
                      ...prev,
                      data: { ...prev.data, icon: e.target.value },
                    }))
                  }
                  options={[
                    ["search", "Search (Kaca Pembesar)"],
                    ["file-lines", "File / Dokumen Lengkap"],
                    ["location-dot", "Location / Peta Lokasi"],
                    ["sliders", "Sliders / Tampilan Sederhana"],
                    ["shield", "Shield / Keamanan Terverifikasi"],
                    ["bolt", "Bolt / Ringan Cepat"],
                    ["lock", "Lock / Privasi Aman"],
                    ["heart", "Heart / Favorit Nyaman"],
                    ["building", "Building / Gedung Kost"],
                  ]}
                />
                <TextArea
                  label="Deskripsi Penjelasan"
                  value={modalItem.data.desc || ""}
                  onChange={(e) =>
                    setModalItem((prev) => ({
                      ...prev,
                      data: { ...prev.data, desc: e.target.value },
                    }))
                  }
                  placeholder="Tuliskan keterangan detail..."
                  required
                />
              </>
            )}

            {modalItem.type === "installSteps" && (
              <>
                <Field
                  label="Nomor Langkah"
                  value={modalItem.data.step_number || "1"}
                  onChange={(e) =>
                    setModalItem((prev) => ({
                      ...prev,
                      data: { ...prev.data, step_number: e.target.value },
                    }))
                  }
                  placeholder="1"
                  required
                />
                <Field
                  label="Judul Langkah"
                  value={modalItem.data.title || ""}
                  onChange={(e) =>
                    setModalItem((prev) => ({
                      ...prev,
                      data: { ...prev.data, title: e.target.value },
                    }))
                  }
                  placeholder="Download APK"
                  required
                />
                <TextArea
                  label="Deskripsi Instruksi"
                  value={modalItem.data.desc || ""}
                  onChange={(e) =>
                    setModalItem((prev) => ({
                      ...prev,
                      data: { ...prev.data, desc: e.target.value },
                    }))
                  }
                  placeholder="Klik tombol unduh untuk mendapatkan berkas..."
                  required
                />
              </>
            )}

            {modalItem.type === "ownerSteps" && (
              <>
                <TextArea
                  label="Deskripsi Langkah Pendaftaran"
                  value={modalItem.data.title || ""}
                  onChange={(e) =>
                    setModalItem((prev) => ({
                      ...prev,
                      data: { ...prev.data, title: e.target.value },
                    }))
                  }
                  placeholder="Buka Profil, lalu pilih 'Daftar sebagai Pemilik Kost'..."
                  required
                />
              </>
            )}

            {modalItem.type === "faqItems" && (
              <>
                <Field
                  label="Pertanyaan (Question)"
                  value={modalItem.data.question || ""}
                  onChange={(e) =>
                    setModalItem((prev) => ({
                      ...prev,
                      data: { ...prev.data, question: e.target.value },
                    }))
                  }
                  placeholder="Apakah mencari kost dikenakan biaya?"
                  required
                />
                <TextArea
                  label="Jawaban (Answer)"
                  rows={4}
                  value={modalItem.data.answer || ""}
                  onChange={(e) =>
                    setModalItem((prev) => ({
                      ...prev,
                      data: { ...prev.data, answer: e.target.value },
                    }))
                  }
                  placeholder="Tidak. Layanan pencarian kost 100% gratis..."
                  required
                />
              </>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <GhostButton onClick={() => setModalItem(null)}>Batal</GhostButton>
              <PrimaryButton onClick={() => saveModalItem(modalItem.data)}>Simpan Item</PrimaryButton>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <ConfirmDialog
          title="Konfirmasi Hapus"
          message={confirmDelete.title}
          confirmLabel="Hapus Sekarang"
          tone="danger"
          onConfirm={() => deleteItem(confirmDelete.type, confirmDelete.index)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
