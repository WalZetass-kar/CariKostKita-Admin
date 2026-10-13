"use client";

import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  LogOut,
  Monitor,
  Moon,
  Save,
  Sun,
  Users,
  Plus,
  Pencil,
  Trash2,
  Power,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";
import { useApp } from "../AppContext";
import { api } from "@/lib/api";
import {
  Avatar,
  Badge,
  ConfirmDialog,
  DataTable,
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
  SelectField,
  Td,
  TextArea,
  Toggle,
  useForm,
  useToast,
} from "../ui";
import { ROLES, ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export function SettingsView() {
  const { admin } = useApp();
  const isSuperAdmin = admin?.role === "super_admin";

  const tabs = [
    "Profil",
    "Keamanan",
    "Notifikasi",
    "Tampilan",
    "Sistem",
    ...(isSuperAdmin ? ["Kelola Admin"] : []),
  ];

  const [tab, setTab] = useState("Profil");

  return (
    <div className="space-y-4">
      <FilterTabs options={tabs} value={tab} onChange={setTab} />
      {tab === "Profil" && <ProfileTab />}
      {tab === "Keamanan" && <SecurityTab />}
      {tab === "Notifikasi" && <NotificationTab />}
      {tab === "Tampilan" && <AppearanceTab />}
      {tab === "Sistem" && <SystemTab />}
      {tab === "Kelola Admin" && isSuperAdmin && <AdminsTab />}
    </div>
  );
}

function useSave(path, method = "PATCH") {
  const { act } = useApp();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const save = async (body, success) => {
    setSaving(true);
    setErrors({});
    try {
      const res = await act(path, { method, body });
      toast(success);
      return res;
    } catch (e) {
      setErrors(e.fields || {});
      toast(e.message, "error");
      return null;
    } finally {
      setSaving(false);
    }
  };
  return { save, saving, errors };
}

function ProfileTab() {
  const { admin } = useApp();
  const form = useForm({
    name: admin?.name || "",
    email: admin?.email || "",
    phone: admin?.phone || "",
    photo: admin?.photo || "",
  });
  const { save, saving, errors } = useSave("settings/profile");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [source, setSource] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    api("settings/profile")
      .then((response) => {
        if (!active) return;
        const profile = response.profile || {};
        form.setValues({
          name: profile.name || "",
          email: profile.email || admin?.email || "",
          phone: profile.phone || "",
          photo: profile.photo || "",
        });
        setSource(response.source || "fastapi");
      })
      .catch((error) => active && setLoadError(error.message || "Profil tidak bisa dimuat."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [admin?.id, attempt]);

  const submit = async (event) => {
    event.preventDefault();
    const response = await save(form.values, "Profil berhasil diperbarui.");
    if (response?.admin) {
      form.setValues({
        name: response.admin.name || "",
        email: response.admin.email || "",
        phone: response.admin.phone || "",
        photo: response.admin.photo || "",
      });
    }
    if (response?.source) setSource(response.source);
  };

  if (loading) return <Panel className="max-w-3xl"><LoadingState rows={3} /></Panel>;
  if (loadError) return <ErrorState message={loadError} onRetry={() => setAttempt((value) => value + 1)} />;

  return (
    <Panel className="max-w-3xl">
      {source === "legacy" && (
        <div role="status" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          FastAPI profile endpoint belum tersedia. Perubahan memakai fallback lokal dan belum tersinkron ke Supabase.
        </div>
      )}
      <div className="mb-5 flex items-center gap-3">
        <Avatar name={form.values.name} src={form.values.photo} size={64} />
        <div>
          <h2 className="text-2xl font-extrabold text-ink">{form.values.name}</h2>
          <p className="text-muted">
            {form.values.email} · <Badge status={admin.role} label={ROLE_LABELS[admin.role] || admin.role} />
          </p>
        </div>
      </div>
      <form
        noValidate
        onSubmit={submit}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Field label="Nama" {...form.bind("name")} error={errors.name} required />
        <Field label="Email login" type="email" {...form.bind("email")} readOnly hint="Email dikelola Supabase dan tidak dapat diubah di sini." />
        <Field label="Nomor Telepon" {...form.bind("phone")} error={errors.phone} />
        <ImageField
          label="Foto Profil"
          round
          value={form.values.photo}
          onChange={(v) => form.set("photo", v)}
          error={errors.photo}
        />
        <div className="sm:col-span-2 pt-2 border-t border-line">
          <PrimaryButton type="submit" loading={saving}>
            <Save size={18} />
            <span>Simpan Perubahan</span>
          </PrimaryButton>
        </div>
      </form>
    </Panel>
  );
}

function PasswordField({ label, error, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Field label={label} type={show ? "text" : "password"} error={error} autoComplete="off" {...props} />
      <button
        type="button"
        aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
        onClick={() => setShow(!show)}
        className="absolute right-3 top-[34px] text-muted hover:text-ink"
      >
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

function SecurityTab() {
  const { act } = useApp();
  const toast = useToast();
  const form = useForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const { save, saving, errors } = useSave("settings/password", "POST");
  const [confirm, setConfirm] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const res = await save(form.values, "Password Supabase berhasil diubah.");
    if (res) {
      form.reset();
    }
  };

  const revoke = async () => {
    try {
      const res = await act("sessions/revoke-others");
      if (res.revoked) toast("Refresh token sesi perangkat lain berhasil dicabut.");
    } catch (error) {
      toast(error.message || "Gagal mencabut sesi perangkat lain.", "error");
    } finally {
      setConfirm(null);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel>
        <PanelTitle eyebrow="Keamanan" title="Ubah Password" />
        <form noValidate onSubmit={submit} className="grid gap-4">
          <PasswordField label="Password saat ini" {...form.bind("currentPassword")} error={errors.currentPassword} required />
          <PasswordField label="Password baru" {...form.bind("newPassword")} error={errors.newPassword} placeholder="Minimal 8 karakter, huruf dan angka" required />
          <PasswordField label="Konfirmasi password baru" {...form.bind("confirmPassword")} error={errors.confirmPassword} required />
          <div className="pt-2">
            <PrimaryButton type="submit" loading={saving}>
              <Save size={18} />
              <span>Ubah Password</span>
            </PrimaryButton>
          </div>
        </form>
      </Panel>
      <Panel>
        <div className="mb-3 flex items-start justify-between gap-3">
          <PanelTitle eyebrow="Session Supabase" title="Perangkat Login" />
          <GhostButton onClick={() => setConfirm("others")}>
              <LogOut size={16} />
              <span>Keluar dari perangkat lain</span>
          </GhostButton>
        </div>
        <p className="text-sm leading-6 text-muted">
          Supabase tidak menyediakan daftar perangkat yang aman untuk ditampilkan panel ini. Kamu bisa mencabut refresh token sesi lain; perangkat tersebut mungkin masih memakai access token sampai token itu kedaluwarsa. Sesi Admin-Gue ini tetap aktif.
        </p>
      </Panel>
      <ConfirmDialog
        open={Boolean(confirm)}
        tone="danger"
        title="Keluar dari perangkat lain"
        message="Refresh token sesi Supabase pada perangkat lain akan dicabut. Access token aktifnya tetap berlaku sampai kedaluwarsa; perangkat Admin-Gue ini tetap masuk."
        confirmLabel="Keluarkan"
        onConfirm={revoke}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

function NotificationTab() {
  const { admin } = useApp();
  const [prefs, setPrefs] = useState(admin.notifications || {});
  const { save, saving } = useSave("settings/notifications");
  const items = [
    ["newReport", "Notifikasi laporan baru", "Tampilkan notifikasi jika ada laporan kost berstatus Baru."],
    ["newOwner", "Notifikasi pemilik baru", "Tampilkan notifikasi jika ada akun pemilik kost baru menunggu verifikasi."],
    ["pendingKost", "Notifikasi kost menunggu verifikasi", "Tampilkan notifikasi jika ada pendaftaran kost baru."],
    ["other", "Notifikasi lainnya", "Pengingat iklan promosi yang akan berakhir dalam 3 hari ke depan."],
  ];

  return (
    <Panel className="max-w-3xl">
      <PanelTitle eyebrow="Notifikasi" title="Pengaturan Notifikasi" />
      <div className="space-y-3">
        {items.map(([k, label, desc]) => (
          <Toggle key={k} label={label} description={desc} checked={Boolean(prefs[k])} onChange={(v) => setPrefs({ ...prefs, [k]: v })} />
        ))}
      </div>
      <div className="mt-5 pt-3 border-t border-line">
        <PrimaryButton onClick={() => save(prefs, "Pengaturan notifikasi disimpan.")} loading={saving}>
          <Save size={18} />
          <span>Simpan Notifikasi</span>
        </PrimaryButton>
      </div>
    </Panel>
  );
}

function AppearanceTab() {
  const { theme, setTheme, collapsed, setSidebarPref } = useApp();
  const toast = useToast();
  const themes = [
    ["light", "Terang", Sun],
    ["dark", "Gelap", Moon],
    ["system", "Ikuti Sistem", Monitor],
  ];

  return (
    <Panel className="max-w-3xl">
      <PanelTitle eyebrow="Tampilan" title="Tema & Tampilan Admin" />
      <p className="mb-2 text-sm font-extrabold text-muted">Tema Antarmuka</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {themes.map(([v, l, Icon]) => (
          <button
            key={v}
            type="button"
            aria-pressed={theme === v}
            onClick={() => {
              setTheme(v);
              toast(`Tema ${l} diterapkan.`);
            }}
            className={`flex items-center gap-2 rounded-xl border p-4 font-bold transition ${
              theme === v ? "border-maroon bg-maroon text-[#EEEAD7] shadow-sm" : "border-line bg-field text-ink hover:bg-track"
            }`}
          >
            <Icon size={18} />
            {l}
          </button>
        ))}
      </div>
      <div className="mt-5 pt-4 border-t border-line">
        <Toggle
          label="Sidebar mode ciut (Collapsed)"
          description="Pada desktop, sidebar akan menciut hanya menampilkan icon navigasi dengan tooltip."
          checked={collapsed}
          onChange={setSidebarPref}
        />
      </div>
    </Panel>
  );
}

function SystemTab() {
  const { data, admin } = useApp();
  const form = useForm({
    appName: "",
    tagline: "",
    whatsapp: "",
    apkUrl: "",
    versionName: "",
    releaseNotes: "",
    supportEmail: "",
    contactPhone: "",
    address: "",
    targetCity: "",
    apkSize: "",
    minAndroid: "",
    heroBadge1: "",
    heroBadge2: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    siteTitle: "",
    siteDescription: "",
  });
  const { save, saving, errors } = useSave("settings/system");
  const [loadingInitial, setLoadingInitial] = useState(true);
  const locked = !["super_admin", "admin"].includes(admin?.role);
  const b = (n) => ({ ...form.bind(n), disabled: locked });

  const populate = (s) => {
    if (!s) return;
    form.setValues((prev) => ({
      ...prev,
      appName: s.appName ?? s.app_name ?? prev.appName ?? "",
      tagline: s.tagline ?? prev.tagline ?? "",
      whatsapp: s.whatsapp ?? s.contact_whatsapp ?? prev.whatsapp ?? "",
      apkUrl: s.apkUrl ?? s.apk_url ?? prev.apkUrl ?? "",
      versionName: s.versionName ?? s.version_name ?? prev.versionName ?? "",
      releaseNotes: s.releaseNotes ?? s.release_notes ?? prev.releaseNotes ?? "",
      supportEmail: s.supportEmail ?? s.support_email ?? prev.supportEmail ?? "",
      contactPhone: s.contactPhone ?? s.contact_phone ?? prev.contactPhone ?? "",
      address: s.address ?? s.office_address ?? prev.address ?? "",
      targetCity: s.targetCity ?? s.target_city ?? prev.targetCity ?? "Pekanbaru",
      apkSize: s.apkSize ?? s.apk_size ?? prev.apkSize ?? "6.9 MB",
      minAndroid: s.minAndroid ?? s.min_android ?? prev.minAndroid ?? "Android 8.0+",
      heroBadge1: s.heroBadge1 ?? s.hero_badge_1 ?? prev.heroBadge1 ?? "",
      heroBadge2: s.heroBadge2 ?? s.hero_badge_2 ?? prev.heroBadge2 ?? "",
      instagram: s.instagram ?? prev.instagram ?? "",
      facebook: s.facebook ?? prev.facebook ?? "",
      tiktok: s.tiktok ?? prev.tiktok ?? "",
      siteTitle: s.siteTitle ?? s.site_title ?? prev.siteTitle ?? "",
      siteDescription: s.siteDescription ?? s.site_description ?? prev.siteDescription ?? "",
    }));
  };

  useEffect(() => {
    if (data?.system) {
      populate(data.system);
    }
  }, [data?.system]);

  useEffect(() => {
    let active = true;
    api("settings/system")
      .then((res) => {
        if (!active || !res?.system) return;
        populate(res.system);
      })
      .catch(() => {
        if (data?.system) populate(data.system);
      })
      .finally(() => {
        if (active) setLoadingInitial(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loadingInitial && !data?.system) {
    return (
      <Panel className="max-w-4xl">
        <LoadingState rows={6} />
      </Panel>
    );
  }

  return (
    <Panel className="max-w-4xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <PanelTitle eyebrow="Sistem & Landing Page" title="Pengaturan Platform & Rilis APK" />
          <p className="text-sm text-muted">
            Data pada halaman ini langsung tersinkronisasi ke <strong>Landing Page</strong> dan aplikasi mobile CariKostKita tanpa perlu ubah kode manual.
            {locked && " Hanya Administrator yang memiliki hak akses untuk mengubah data ini."}
          </p>
        </div>
      </div>

      <form
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await save(form.values, "Pengaturan sistem dan rilis APK berhasil disimpan.");
          if (res?.system) {
            populate(res.system);
          }
        }}
        className="mt-6 grid gap-6"
      >
        {/* Bagian 1: Sinkronisasi Rilis APK Landing Page */}
        <div className="rounded-xl border border-line bg-track/30 p-4">
          <h4 className="font-extrabold text-ink text-sm uppercase tracking-wider mb-1">
            📦 Rilis Berkas Aplikasi Android (APK)
          </h4>
          <p className="text-xs text-muted mb-4">
            Link APK ini otomatis dipakai oleh semua tombol <em>&ldquo;Download APK&rdquo;</em> di Landing Page.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="URL Berkas APK Terbaru (Direct Download Link)"
              className="sm:col-span-2"
              {...b("apkUrl")}
              error={errors.apkUrl}
              placeholder="https://github.com/.../CariKostKita-v1.0.0.apk"
              hint="Masukkan URL langsung ke file .apk (misal dari GitHub Release atau server storage)."
              required
            />
            <Field
              label="Versi Aplikasi"
              {...b("versionName")}
              error={errors.versionName}
              placeholder="v1.0.1"
              hint="Contoh: v1.0.0-beta atau v1.0.1"
            />
            <Field
              label="WhatsApp Hotline Layanan"
              {...b("whatsapp")}
              error={errors.whatsapp}
              placeholder="6281270008899"
              hint="Otomatis dipakai tombol chat WhatsApp di Landing Page (gunakan awalan 62)"
              required
            />
            <Field
              label="Ukuran File APK"
              {...b("apkSize")}
              error={errors.apkSize}
              placeholder="6.9 MB"
              hint="Ditampilkan di badge spesifikasi dan FAQ"
            />
            <Field
              label="Minimum Versi Android"
              {...b("minAndroid")}
              error={errors.minAndroid}
              placeholder="Android 8.0+"
              hint="Contoh: Android 8.0+ atau Android 9.0+"
            />
            <TextArea
              label="Catatan Rilis (Changelog)"
              className="sm:col-span-2"
              {...b("releaseNotes")}
              error={errors.releaseNotes}
              placeholder="Apa yang baru pada versi ini..."
            />
          </div>
        </div>

        {/* Bagian 2: Identitas Platform & Konten Landing Page */}
        <div className="rounded-xl border border-line bg-track/30 p-4">
          <h4 className="font-extrabold text-ink text-sm uppercase tracking-wider mb-1">
            🎯 Wilayah Layanan & Tampilan Landing Page
          </h4>
          <p className="text-xs text-muted mb-4">
            Mengatur kota operasional dan kartu sorotan yang muncul pada banner utama Landing Page.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Kota / Wilayah Layanan Utama"
              {...b("targetCity")}
              error={errors.targetCity}
              placeholder="Pekanbaru"
              hint="Otomatis mengubah nama wilayah di seluruh teks Landing Page"
              required
            />
            <Field
              label="Kartu Sorotan 1 (Floating Card Atas)"
              {...b("heroBadge1")}
              error={errors.heroBadge1}
              placeholder="Lokasi dekat kampus & area strategis"
            />
            <Field
              label="Kartu Sorotan 2 (Floating Card Bawah)"
              className="sm:col-span-2"
              {...b("heroBadge2")}
              error={errors.heroBadge2}
              placeholder="Detail kost & foto kamar lengkap"
            />
          </div>
        </div>

        {/* Bagian 3: Identitas Platform & Kontak */}
        <div>
          <h4 className="font-extrabold text-ink text-sm uppercase tracking-wider mb-3">
            🌐 Informasi Aplikasi & Kontak Kantor
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama Aplikasi" {...b("appName")} error={errors.appName} required />
            <Field label="Tagline Aplikasi" {...b("tagline")} />
            <Field label="Email Support" type="email" {...b("supportEmail")} error={errors.supportEmail} required />
            <Field label="Nomor Kontak Kantor" {...b("contactPhone")} error={errors.contactPhone} />
            <Field label="Alamat Kantor" className="sm:col-span-2" {...b("address")} />
            <Field label="Instagram URL" {...b("instagram")} error={errors.instagram} placeholder="https://instagram.com/carikostkita" />
            <Field label="Facebook URL" {...b("facebook")} error={errors.facebook} placeholder="https://facebook.com/carikostkita" />
            <Field label="TikTok URL" {...b("tiktok")} error={errors.tiktok} placeholder="https://tiktok.com/@carikostkita" />
            <Field label="Judul Website (SEO Meta Title)" className="sm:col-span-2" {...b("siteTitle")} error={errors.siteTitle} required />
            <TextArea label="Deskripsi Website (SEO Meta Description)" className="sm:col-span-2" {...b("siteDescription")} />
          </div>
        </div>

        {!locked && (
          <div className="pt-3 border-t border-line flex justify-end">
            <PrimaryButton type="submit" loading={saving}>
              <Save size={18} />
              <span>Simpan Perubahan & Sinkronkan</span>
            </PrimaryButton>
          </div>
        )}
      </form>
    </Panel>
  );
}

/** Tab Khusus Super Admin: Manajemen Admin & Role Permission */
function AdminsTab() {
  const { data, act, admin: currentAdmin } = useApp();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editAdmin, setEditAdmin] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const form = useForm({
    name: "",
    username: "",
    email: "",
    phone: "",
    role: "admin",
    password: "",
  });

  const openCreate = () => {
    setEditAdmin(null);
    form.setValues({
      name: "",
      username: "",
      email: "",
      phone: "",
      role: "admin",
      password: "",
    });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (adm) => {
    setEditAdmin(adm);
    form.setValues({
      name: adm.name,
      username: adm.username,
      email: adm.email,
      phone: adm.phone || "",
      role: adm.role,
      password: "",
    });
    setErrors({});
    setModalOpen(true);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      if (editAdmin) {
        const body = {
          name: form.values.name,
          email: form.values.email,
          phone: form.values.phone,
          role: form.values.role,
        };
        if (form.values.password) body.password = form.values.password;
        await act(`admins/${editAdmin.id}`, { method: "PATCH", body });
        toast(`Data admin ${form.values.name} berhasil diperbarui.`);
      } else {
        await act("admins", { method: "POST", body: form.values });
        toast(`Admin baru ${form.values.name} berhasil ditambahkan.`);
      }
      setModalOpen(false);
    } catch (err) {
      setErrors(err.fields || {});
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (adm) => {
    try {
      await act(`admins/${adm.id}`, { method: "PATCH", body: { active: !adm.active } });
      toast(`Akun admin ${adm.name} ${!adm.active ? "diaktifkan" : "dinonaktifkan"}.`);
      setConfirm(null);
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const removeAdmin = async (adm) => {
    try {
      await act(`admins/${adm.id}`, { method: "DELETE" });
      toast(`Admin ${adm.name} berhasil dihapus.`);
      setConfirm(null);
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const [localAdmins, setLocalAdmins] = useState(null);
  useEffect(() => {
    let active = true;
    api("admins")
      .then((res) => {
        if (active && Array.isArray(res?.admins)) {
          setLocalAdmins(res.admins);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const adminList = (localAdmins && localAdmins.length > 0)
    ? localAdmins
    : (data?.admins && data.admins.length > 0)
    ? data.admins
    : (currentAdmin ? [currentAdmin] : []);

  return (
    <div className="space-y-6">
      <Panel>
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <PanelTitle eyebrow="Hak Akses" title="Kelola Admin & Akun Tim" />
            <p className="text-xs text-muted mt-1">
              Atur daftar staf pengelola, penetapan role, dan batas kewenangan sistem.
            </p>
          </div>
          <PrimaryButton onClick={openCreate}>
            <Plus size={18} />
            <span>Tambah Admin Baru</span>
          </PrimaryButton>
        </div>

        <DataTable headers={["Admin", "Username / Email", "Role Akses", "Status", "Dibuat", "Aksi"]} minWidth={750}>
          {adminList.map((adm) => (
            <tr key={adm.id}>
              <Td>
                <div className="flex items-center gap-2.5">
                  <Avatar name={adm.name} size={32} />
                  <div>
                    <strong className="block text-ink">{adm.name}</strong>
                    <span className="text-xs text-muted font-mono">{adm.phone || "-"}</span>
                  </div>
                </div>
              </Td>
              <Td>
                <div>
                  <span className="font-mono text-xs font-bold text-ink">@{adm.username}</span>
                  <span className="block text-xs text-muted">{adm.email}</span>
                </div>
              </Td>
              <Td>
                <Badge
                  status={adm.role}
                  label={ROLE_LABELS[adm.role] || adm.role}
                  tone={
                    adm.role === "super_admin"
                      ? "brand"
                      : adm.role === "admin"
                      ? "info"
                      : adm.role === "moderator"
                      ? "warning"
                      : "neutral"
                  }
                />
              </Td>
              <Td>
                <Badge status={adm.active ? "Aktif" : "Nonaktif"} />
              </Td>
              <Td className="text-xs">{formatDate(adm.createdAt)}</Td>
              <Td>
                <div className="flex items-center gap-1.5">
                  <IconButton label="Edit Data Admin" tone="info" onClick={() => openEdit(adm)}>
                    <Pencil size={16} />
                  </IconButton>
                  {adm.id !== currentAdmin?.id && (
                    <>
                      <IconButton
                        label={adm.active ? "Nonaktifkan" : "Aktifkan"}
                        tone={adm.active ? "warning" : "success"}
                        onClick={() => setConfirm({ type: "toggle", admin: adm })}
                      >
                        <Power size={16} />
                      </IconButton>
                      <IconButton
                        label="Hapus Admin"
                        tone="danger"
                        onClick={() => setConfirm({ type: "delete", admin: adm })}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </DataTable>
      </Panel>

      {/* Matriks Kewenangan Role */}
      <Panel>
        <PanelTitle eyebrow="Hak Akses" title="Matriks Kewenangan Role (RBAC)" />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs border border-line rounded-lg overflow-hidden">
            <thead className="bg-track text-muted uppercase font-extrabold">
              <tr>
                <th className="p-2.5">Fitur / Menu</th>
                <th className="p-2.5 text-center">Super Admin</th>
                <th className="p-2.5 text-center">Admin</th>
                <th className="p-2.5 text-center">Moderator</th>
                <th className="p-2.5 text-center">Marketing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[
                ["Dashboard & Action Center", "✓", "✓", "✓", "✓"],
                ["Manajemen Kost (Review/CRUD)", "✓", "✓", "✓ (Review)", "-"],
                ["Verifikasi Pemilik", "✓", "✓", "✓", "-"],
                ["Manajemen Pengguna", "✓", "✓", "-", "-"],
                ["Laporan Masalah Kost", "✓", "✓", "✓", "-"],
                ["Iklan & Promosi Banner", "✓", "-", "-", "✓"],
                ["Statistik & Analisis", "✓", "✓", "-", "✓ (Iklan)"],
                ["Audit Log Aktivitas", "✓", "-", "-", "-"],
                ["Kelola Admin & Role", "✓", "-", "-", "-"],
                ["Hapus Permanen Data", "✓", "-", "-", "-"],
              ].map(([item, sa, adm, mod, mkt]) => (
                <tr key={item} className="hover:bg-track/30">
                  <td className="p-2.5 font-bold text-ink">{item}</td>
                  <td className="p-2.5 text-center font-bold text-maroon">{sa}</td>
                  <td className="p-2.5 text-center font-semibold text-muted">{adm}</td>
                  <td className="p-2.5 text-center font-semibold text-muted">{mod}</td>
                  <td className="p-2.5 text-center font-semibold text-muted">{mkt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Modal Tambah / Edit Admin */}
      <Modal
        open={modalOpen}
        onClose={saving ? undefined : () => setModalOpen(false)}
        title={editAdmin ? `Edit Admin: ${editAdmin.name}` : "Tambah Admin Baru"}
        maxWidth="max-w-md"
      >
        <form onSubmit={submitForm} noValidate className="grid gap-4">
          <Field label="Nama Lengkap" {...form.bind("name")} error={errors.name} required />
          {!editAdmin && (
            <Field label="Username Login" {...form.bind("username")} error={errors.username} required />
          )}
          <Field label="Email" type="email" {...form.bind("email")} error={errors.email} required />
          <Field label="Nomor Telepon" {...form.bind("phone")} error={errors.phone} />
          <SelectField
            label="Role Kewenangan"
            value={form.values.role}
            onChange={(e) => form.set("role", e.target.value)}
            error={errors.role}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]} ({r})
              </option>
            ))}
          </SelectField>
          <Field
            label={editAdmin ? "Password Baru (Opsional)" : "Password Awal"}
            type="password"
            {...form.bind("password")}
            error={errors.password}
            placeholder={editAdmin ? "Kosongkan jika tidak diganti" : "Minimal 8 karakter"}
            required={!editAdmin}
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <GhostButton onClick={() => setModalOpen(false)} disabled={saving}>
              Batal
            </GhostButton>
            <PrimaryButton type="submit" loading={saving}>
              <Save size={18} />
              <span>{editAdmin ? "Simpan Perubahan" : "Buat Akun Admin"}</span>
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(confirm)}
        tone={confirm?.type === "delete" ? "danger" : "warning"}
        title={confirm?.type === "delete" ? "Hapus Akun Admin" : confirm?.admin?.active ? "Nonaktifkan Admin" : "Aktifkan Admin"}
        message={
          confirm &&
          (confirm.type === "delete"
            ? `Apakah Anda yakin ingin menghapus akun admin "${confirm.admin.name}"? Staf ini tidak akan dapat login lagi.`
            : `Apakah Anda yakin ingin ${confirm.admin.active ? "menonaktifkan" : "mengaktifkan"} akses admin "${confirm.admin.name}"?`)
        }
        confirmLabel={confirm?.type === "delete" ? "Hapus Admin" : confirm?.admin?.active ? "Nonaktifkan" : "Aktifkan"}
        onConfirm={() => (confirm.type === "delete" ? removeAdmin(confirm.admin) : toggleActive(confirm.admin))}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
