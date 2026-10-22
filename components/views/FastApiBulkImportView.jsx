"use client";

import { useCallback, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileCheck2,
  FileSpreadsheet,
  HelpCircle,
  Image as ImageIcon,
  Info,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Table,
  Upload,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "../AppContext";
import {
  Badge,
  DataTable,
  GhostButton,
  IconButton,
  Panel,
  PanelTitle,
  PrimaryButton,
  Td,
  useToast,
} from "../ui";
import { formatCurrency } from "@/lib/format";

const COLUMN_GUIDE_ROWS = [
  { letter: "A", name: "nama_kost", required: true, format: "Teks (Contoh: Kos Melati Indah Panam)", description: "Nama kos yang dicari pencari" },
  { letter: "B", name: "tipe_kost", required: false, format: "PUTRA / PUTRI / CAMPUR (Default: CAMPUR)", description: "Kategori gender penghuni kamar. Kosong atau tidak dikenal otomatis diisi CAMPUR dan tetap diimpor." },
  { letter: "C", name: "alamat", required: true, format: "Teks alamat jalan fisik", description: "Contoh: Jl. Bina Krida No. 18, Panam" },
  { letter: "D", name: "provinsi", required: false, format: "Teks (Default: Riau)", description: "Nama provinsi wilayah properti" },
  { letter: "E", name: "kota", required: false, format: "Teks (Default: Kota Pekanbaru)", description: "Nama kota / kabupaten" },
  { letter: "F", name: "kecamatan", required: true, format: "Nama kecamatan Pekanbaru", description: "Contoh: Tampan / Binawidya, Tuah Madani, Marpoyan Damai" },
  { letter: "G", name: "kelurahan", required: false, format: "Teks kelurahan", description: "Contoh: Simpang Baru, Simpang Tiga, Sidomulyo" },
  { letter: "H", name: "harga_bulanan", required: true, format: "Angka Rupiah (Contoh: 850000)", description: "Tarif sewa per bulan tanpa titik/koma" },
  { letter: "I", name: "harga_tahunan", required: false, format: "Angka Rupiah (Contoh: 9500000)", description: "Tarif sewa per tahun jika tersedia" },
  { letter: "J", name: "total_kamar", required: true, format: "Angka bulat >= 1 (Contoh: 10)", description: "Total seluruh unit kamar kos" },
  { letter: "K", name: "kamar_tersedia", required: true, format: "Angka bulat >= 0 (Contoh: 3)", description: "Jumlah kamar kosong siap huni" },
  { letter: "L", name: "deskripsi", required: false, format: "Teks spesifikasi kos", description: "Kelebihan dan gambaran kamar/lingkungan" },
  { letter: "M", name: "aturan_kost", required: false, format: "Teks aturan tata tertib", description: "Contoh: Jam malam 23.00, Tamu pria dilarang masuk" },
  { letter: "N", name: "fasilitas", required: false, format: "Teks dipisah koma", description: "Contoh: AC Dingin, Kamar Mandi Dalam, WiFi Cepat, Kasur Springbed" },
  { letter: "O", name: "no_whatsapp", required: false, format: "Format: 081234567890", description: "Nomor WhatsApp aktif pemilik kos" },
  { letter: "P", name: "nama_pemilik", required: false, format: "Teks nama pemilik", description: "Nama pemilik untuk kontak penyewa" },
  { letter: "Q", name: "email_pemilik", required: false, format: "Email valid", description: "Akun pemilik terdaftar di aplikasi (jika ada)" },
  { letter: "R", name: "latitude", required: false, format: "Angka desimal (~0.482)", description: "Garis lintang peta Pekanbaru" },
  { letter: "S", name: "longitude", required: false, format: "Angka desimal (~101.375)", description: "Garis bujur peta Pekanbaru" },
  { letter: "T", name: "status_ketersediaan", required: false, format: "TERSEDIA / PENUH", description: "Status ketersediaan kos saat ini" },
  { letter: "U", name: "foto_kost", required: false, format: "URL foto dipisah koma ATAU sisipkan foto di Excel", description: "Foto kost langsung termuat di database dan aplikasi" },
];

export function FastApiBulkImportView() {
  const toast = useToast();
  const { setView } = useApp() || {};
  const fileInputRef = useRef(null);

  // States
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview & Validate, 3: Completed Report
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [fileBase64, setFileBase64] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Preview data
  const [previewData, setPreviewData] = useState(null);
  const [duplicateAction, setDuplicateAction] = useState("skip"); // "skip" | "update"

  // Commit result
  const [commitResult, setCommitResult] = useState(null);
  const [committing, setCommitting] = useState(false);

  // Handle template download directly from public static templates
  const handleDownloadTemplate = (format = "xlsx") => {
    try {
      const link = document.createElement("a");
      link.href = `/Template_Import_Kost_CariKostKita.${format}`;
      link.download = `Template_Import_Kost_CariKostKita.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast(`Template ${format.toUpperCase()} (Per Kolom A s/d U) berhasil diunduh.`);
    } catch (err) {
      toast("Gagal mengunduh template: " + err.message, "error");
    }
  };

  // Handle File selection
  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setErrorMsg("");

    const name = selected.name.toLowerCase();
    if (!name.endsWith(".csv") && !name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      setErrorMsg("Format file harus berakhiran .csv atau .xlsx / .xls");
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setErrorMsg("Ukuran file maksimal 10 MB.");
      return;
    }

    setFile(selected);
    setFileName(selected.name);

    // Read base64
    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result);
    };
    reader.onerror = () => {
      setErrorMsg("Gagal membaca file di browser.");
    };
    reader.readAsDataURL(selected);
  };

  // Submit preview
  const handleValidatePreview = async () => {
    if (!fileBase64) {
      setErrorMsg("Silakan pilih file spreadsheet terlebih dahulu.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const payload = {
        file_name: fileName,
        file_base64: fileBase64,
      };
      const res = await api("fastapi-bulk-import/preview", {
        method: "POST",
        body: payload,
      });
      setPreviewData(res);
      setStep(2);
      toast("Validasi berhasil! Silakan periksa ringkasan data.");
    } catch (err) {
      setErrorMsg(err.message || "Gagal memproses validasi spreadsheet.");
      toast(err.message || "Validasi gagal.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Commit Import
  const handleCommitImport = async () => {
    if (!previewData?.batch_payload?.length) {
      toast("Tidak ada data yang dapat disimpan.", "error");
      return;
    }
    setCommitting(true);
    try {
      const payload = {
        batch_rows: previewData.batch_payload,
        duplicate_action: duplicateAction,
        file_name: fileName,
      };
      const res = await api("fastapi-bulk-import/commit", {
        method: "POST",
        body: payload,
      });
      setCommitResult(res);
      setStep(3);
      toast("Import massal selesai disimpan ke database!");
    } catch (err) {
      toast(err.message || "Gagal menyimpan data import.", "error");
    } finally {
      setCommitting(false);
    }
  };

  // Reset to initial
  const handleReset = () => {
    setStep(1);
    setFile(null);
    setFileName("");
    setFileBase64("");
    setPreviewData(null);
    setCommitResult(null);
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Download Commit Report
  const handleDownloadReport = () => {
    if (!commitResult?.report_csv_base64) return;
    const linkSource = `data:text/csv;charset=utf-8;base64,${commitResult.report_csv_base64}`;
    const downloadLink = document.createElement("a");
    downloadLink.href = linkSource;
    downloadLink.download = commitResult.download_report_filename || "Laporan_Import_Kost.csv";
    downloadLink.click();
  };

  return (
    <div className="grid gap-5">
      {/* Header Panel */}
      <Panel className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <PanelTitle eyebrow="Properti" title="Import Data Kos Massal" />
            <p className="mt-1 max-w-3xl text-xs sm:text-sm leading-relaxed text-muted">
              Fitur khusus platform administrator untuk menambahkan direktori kos secara cepat
              menggunakan spreadsheet (CSV UTF-8 atau Excel XLSX) dengan validasi otomatis,
              normalisasi wilayah Pekanbaru, dan audit log.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <GhostButton
              onClick={() => handleDownloadTemplate("xlsx")}
              disabled={downloadingTemplate}
              className="text-xs sm:text-sm font-semibold text-good-fg hover:text-good-fg"
            >
              <Download size={15} />
              <span>Template Excel (.xlsx)</span>
            </GhostButton>
            <GhostButton
              onClick={() => handleDownloadTemplate("csv")}
              disabled={downloadingTemplate}
              className="text-xs sm:text-sm"
            >
              <Download size={15} />
              <span>Template CSV (.csv)</span>
            </GhostButton>
          </div>
        </div>
      </Panel>

      {/* Stepper Progress Indicator */}
      <div className="flex items-center justify-between max-w-2xl mx-auto w-full px-2">
        <div className={`flex items-center gap-2 ${step >= 1 ? "text-maroon font-bold" : "text-muted"}`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
            step >= 1 ? "bg-maroon text-[#EEEAD7]" : "bg-track text-muted"
          }`}>
            1
          </div>
          <span className="text-xs sm:text-sm">Pilih File</span>
        </div>
        <div className={`h-0.5 flex-1 mx-3 ${step >= 2 ? "bg-maroon" : "bg-line"}`} />
        <div className={`flex items-center gap-2 ${step >= 2 ? "text-maroon font-bold" : "text-muted"}`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
            step >= 2 ? "bg-maroon text-[#EEEAD7]" : "bg-track text-muted"
          }`}>
            2
          </div>
          <span className="text-xs sm:text-sm">Validasi & Preview</span>
        </div>
        <div className={`h-0.5 flex-1 mx-3 ${step >= 3 ? "bg-maroon" : "bg-line"}`} />
        <div className={`flex items-center gap-2 ${step >= 3 ? "text-maroon font-bold" : "text-muted"}`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
            step >= 3 ? "bg-maroon text-[#EEEAD7]" : "bg-track text-muted"
          }`}>
            3
          </div>
          <span className="text-xs sm:text-sm">Laporan Hasil</span>
        </div>
      </div>

      {/* STEP 1: UPLOAD & GUIDELINES */}
      {step === 1 && (
        <div className="grid gap-5">
          {/* Card 1: Unduh Template Spreadsheet Per-Kolom */}
          <Panel className="p-5 border-2 border-primary/20 bg-surface">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-good-bg text-good-fg flex items-center justify-center shrink-0 mt-0.5">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold text-ink">
                      1. Unduh Template File (Kolom Terpisah A s/d T)
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-good-bg text-good-fg">
                      Per Kolom (Bukan 1 Kolom)
                    </span>
                  </div>
                  <p className="mt-1 text-xs sm:text-sm text-muted leading-relaxed max-w-3xl">
                    File template resmi telah dikonfigurasi agar <strong>setiap kolom terpisah secara rapi</strong> (Kolom A s/d Kolom T di Microsoft Excel & Google Sheets). Anda tidak perlu memisahkan teks secara manual.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate("xlsx")}
                  disabled={downloadingTemplate}
                  className="px-4 py-2.5 rounded-xl bg-good-fg hover:opacity-95 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  <Download size={16} />
                  <span>Download Excel (.xlsx) [Rekomendasi]</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate("csv")}
                  disabled={downloadingTemplate}
                  className="px-3.5 py-2.5 rounded-xl bg-track hover:bg-line text-ink text-xs sm:text-sm font-semibold flex items-center gap-2 border border-line transition active:scale-95 disabled:opacity-50"
                >
                  <Download size={15} />
                  <span>Download CSV (.csv) [Per Kolom A s/d T]</span>
                </button>
              </div>
            </div>

            {/* Accordion Guide: 20 Kolom Spreadsheet */}
            <div className="mt-4 pt-3.5 border-t border-line">
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="flex items-center gap-2 text-xs font-bold text-maroon hover:underline"
              >
                <Table size={15} />
                <span>
                  {showGuide
                    ? "Sembunyikan Panduan Kolom (Kolom A s/d U)"
                    : "Klik di sini untuk melihat Panduan 21 Kolom Spreadsheet (Kolom A s/d U)"}
                </span>
                {showGuide ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {showGuide && (
                <div className="mt-3.5 overflow-x-auto rounded-xl border border-line bg-surface/40 p-2">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-line text-muted">
                        <th className="py-2.5 px-3 font-semibold">Kolom</th>
                        <th className="py-2.5 px-3 font-semibold">Nama Kolom (Header)</th>
                        <th className="py-2.5 px-3 font-semibold">Status</th>
                        <th className="py-2.5 px-3 font-semibold">Format Nilai / Contoh</th>
                        <th className="py-2.5 px-3 font-semibold">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60">
                      {COLUMN_GUIDE_ROWS.map((col) => (
                        <tr key={col.letter} className="hover:bg-track/50 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-maroon">{col.letter}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-ink">{col.name}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                col.required ? "bg-bad-bg text-bad-fg" : "bg-track text-muted"
                              }`}
                            >
                              {col.required ? "Wajib" : "Opsional"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-ink/90 font-medium">{col.format}</td>
                          <td className="py-2.5 px-3 text-muted">{col.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Panel>

          {/* Card 2: Upload Box & Photo Policy Sidebar */}
          <div className="grid gap-5 lg:grid-cols-3">
            {/* File Picker Box */}
            <Panel className="p-5 lg:col-span-2">
              <h3 className="text-sm font-bold text-ink mb-3 flex items-center gap-2">
                <Upload size={16} className="text-maroon" />
                <span>2. Pilih File Spreadsheet yang Telah Diisi</span>
              </h3>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-line hover:border-maroon/60 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-surface/50 hover:bg-surface"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <FileSpreadsheet size={42} className="text-maroon/80 mb-3" />
                <p className="text-sm font-bold text-ink">
                  {fileName ? fileName : "Klik atau seret file spreadsheet ke sini"}
                </p>
                <p className="text-xs text-muted mt-1">
                  Format didukung: <strong>.XLSX (Excel)</strong> atau <strong>.CSV (UTF-8)</strong> &bull; Maks. 10 MB &bull; Maks. 500 baris
                </p>
              </div>

              {errorMsg && (
                <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-bad-bg text-bad-fg text-xs">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="mt-5 flex items-center justify-between">
                <span className="text-xs text-muted font-medium">
                  {fileName ? `File terpilih: ${fileName}` : "Belum ada file yang dipilih"}
                </span>
                <PrimaryButton
                  onClick={handleValidatePreview}
                  disabled={!file || loading}
                  loading={loading}
                >
                  <span>Validasi & Preview Data</span>
                  <ArrowRight size={16} />
                </PrimaryButton>
              </div>
            </Panel>

            {/* Photo Management Policy Box */}
            <Panel className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-sage dark:text-sage mb-3">
                  <ImageIcon size={18} />
                  <h4 className="text-sm font-bold text-ink">Foto Kost Langsung dari File</h4>
                </div>
                <div className="space-y-3 text-xs leading-relaxed text-muted">
                  <p>
                    <strong>Bisa langsung masukkan foto:</strong> Masukkan link gambar (URL)
                    di kolom U (<code>foto_kost</code>) dipisah koma, atau sisipkan foto langsung ke dalam baris Excel (.xlsx).
                  </p>
                  <div className="p-2.5 rounded-lg bg-ok-bg text-ok-fg font-medium">
                    Foto yang disertakan akan otomatis disimpan ke database dan langsung tampil di halaman admin serta aplikasi mobile!
                  </div>
                  <p>
                    Jika dikosongkan, status kos adalah <em>Foto belum diunggah</em> dan foto tetap dapat dilengkapi kapan saja melalui menu Manajemen Kost.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-line text-xs text-muted flex items-center gap-2">
                <Info size={14} className="text-maroon shrink-0" />
                <span>Formula injection (=, +, -, @) otomatis disanitasi.</span>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* STEP 2: PREVIEW & VALIDATION */}
      {step === 2 && previewData && (
        <div className="grid gap-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Panel className="p-4">
              <span className="text-xs text-muted">Total Baris</span>
              <p className="text-xl font-extrabold text-ink mt-1">
                {previewData.summary?.total_rows || 0}
              </p>
            </Panel>
            <Panel className="p-4">
              <span className="text-xs text-sage">Baris Valid</span>
              <p className="text-xl font-extrabold text-sage mt-1">
                {previewData.summary?.valid_rows || 0}
              </p>
            </Panel>
            <Panel className="p-4">
              <span className="text-xs text-gold">Data Duplikat</span>
              <p className="text-xl font-extrabold text-gold mt-1">
                {previewData.summary?.duplicate_rows || 0}
              </p>
            </Panel>
            <Panel className="p-4">
              <span className="text-xs text-clay">Baris Error</span>
              <p className="text-xl font-extrabold text-clay mt-1">
                {previewData.summary?.invalid_rows || 0}
              </p>
            </Panel>
            <Panel className="p-4">
              <span className="text-xs text-blue">Foto Terdeteksi</span>
              <p className="text-xl font-extrabold text-blue mt-1">
                {previewData.summary?.photos_present_count || 0}
              </p>
            </Panel>
          </div>

          {/* Photo Policy / Status Notification */}
          {previewData.summary?.photo_policy_message && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                previewData.summary.photos_present_count > 0
                  ? "bg-ok-bg/50 border-ok-fg/20 text-ok-fg"
                  : "bg-warn-bg/50 border-warn-fg/20 text-warn-fg"
              }`}
            >
              <ImageIcon size={17} className="shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">
                {previewData.summary.photo_policy_message}
              </div>
            </div>
          )}

          {/* Duplicate Action & Policy Banner */}
          <Panel className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-surface">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-ink">Aksi untuk Data Duplikat:</span>
              <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
                <input
                  type="radio"
                  name="dupAction"
                  value="skip"
                  checked={duplicateAction === "skip"}
                  onChange={() => setDuplicateAction("skip")}
                  className="text-maroon focus:ring-maroon"
                />
                <span>Lewati (Skip)</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
                <input
                  type="radio"
                  name="dupAction"
                  value="update"
                  checked={duplicateAction === "update"}
                  onChange={() => setDuplicateAction("update")}
                  className="text-maroon focus:ring-maroon"
                />
                <span>Perbarui Data (Update)</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <GhostButton onClick={handleReset} className="text-xs">
                <RotateCcw size={14} />
                <span>Unggah File Lain</span>
              </GhostButton>
              <PrimaryButton
                onClick={handleCommitImport}
                disabled={committing || !previewData.summary?.can_commit}
                loading={committing}
                className="text-xs"
              >
                <CheckCircle2 size={16} />
                <span>Konfirmasi & Simpan ke Database</span>
              </PrimaryButton>
            </div>
          </Panel>

          {/* Errors List if any */}
          {previewData.errors?.length > 0 && (
            <Panel className="p-4 border-l-4 border-clay">
              <h4 className="text-xs font-bold text-clay flex items-center gap-1.5 mb-2">
                <AlertTriangle size={15} />
                <span>Daftar Kesalahan Pada Baris ({previewData.errors.length} masalah)</span>
              </h4>
              <div className="max-h-40 overflow-y-auto space-y-1.5 text-xs text-muted pr-2">
                {previewData.errors.map((err, i) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-line/40">
                    <span>
                      <strong>Baris {err.row}:</strong> {err.message}
                    </span>
                    <span className="text-xs text-muted font-mono">{err.value}</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* Warnings: tidak memblokir impor */}
          {(previewData.warnings?.length > 0 || previewData.defaulted_tipe_count > 0) && (
            <Panel className="p-4 border-l-4 border-amber-500/50">
              <h4 className="text-xs font-bold text-ink flex items-center gap-1.5 mb-2">
                <AlertTriangle size={15} className="text-amber-600" />
                <span>
                  Peringatan Otomatis ({previewData.warnings?.length || 0} baris)
                </span>
              </h4>
              {previewData.defaulted_tipe_count > 0 && (
                <p className="text-xs text-muted mb-2">
                  <strong>{previewData.defaulted_tipe_count}</strong> baris tanpa tipe kost yang jelas
                  diisi otomatis <strong>CAMPUR</strong> dan tetap diimpor.
                </p>
              )}
              {previewData.warnings?.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-muted pr-2">
                  {previewData.warnings.slice(0, 50).map((warn, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-line/40">
                      <span>
                        <strong>Baris {warn.row}:</strong> {warn.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}

          {/* Preview Table */}
          <Panel className="p-4 overflow-hidden">
            <h4 className="text-xs font-bold text-ink mb-3 flex items-center justify-between">
              <span>Preview Data (50 Baris Pertama)</span>
              <span className="text-xs text-muted font-normal">
                {previewData.summary?.photos_present_count || 0} properti memiliki foto
              </span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="py-2.5 px-3">Baris</th>
                    <th className="py-2.5 px-3">Nama Kost & Lokasi</th>
                    <th className="py-2.5 px-3">Tipe</th>
                    <th className="py-2.5 px-3">Harga/bln</th>
                    <th className="py-2.5 px-3">Kamar</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Foto Kost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40">
                  {previewData.preview_data?.map((row, idx) => {
                    const isValid = row.validation_status === "valid";
                    const isDup = row.validation_status === "duplicate";
                    return (
                      <tr key={idx} className="hover:bg-surface/50">
                        <td className="py-2.5 px-3 font-mono text-muted">{row._row_num}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            {row.thumbnail_url ? (
                              <img
                                src={row.thumbnail_url}
                                alt=""
                                className="h-9 w-12 shrink-0 rounded object-cover border border-line"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="h-9 w-12 shrink-0 rounded border border-line bg-track grid place-items-center text-muted">
                                <ImageIcon size={15} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-ink truncate max-w-xs">{row.nama_kost}</p>
                              <p className="text-[10px] text-muted truncate max-w-xs">
                                {row.kecamatan ? `${row.kecamatan} · ` : ""}{row.alamat}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-track text-ink">
                            {row.tipe_kost}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-ink">
                          {formatCurrency(row.harga_bulanan)}
                        </td>
                        <td className="py-2.5 px-3 text-muted">
                          {row.kamar_tersedia} / {row.total_kamar}
                        </td>
                        <td className="py-2.5 px-3">
                          {isValid && <Badge status="Aktif" label="Valid" tone="ok" size="sm" />}
                          {isDup && <Badge status="Pending" label="Duplikat" tone="warn" size="sm" />}
                          {!isValid && !isDup && <Badge status="Ditolak" label="Error" tone="bad" size="sm" />}
                        </td>
                        <td className="py-2.5 px-3">
                          {row.has_photo ? (
                            <span className="text-[10px] text-ok-fg bg-ok-bg font-bold px-2 py-0.5 rounded whitespace-nowrap inline-flex items-center gap-1">
                              <CheckCircle2 size={12} /> {row.photo_count || 1} Foto
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted bg-track px-2 py-0.5 rounded whitespace-nowrap">
                              Tanpa Foto
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {/* STEP 3: FINAL EXECUTION REPORT */}
      {step === 3 && commitResult && (
        <div className="grid gap-5">
          <Panel className="p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-ok-bg text-ok-fg flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-extrabold text-ink">Import Data Kos Berhasil Selesai</h3>
            <p className="text-xs sm:text-sm text-muted mt-1 max-w-lg mx-auto">
              Seluruh proses import telah dieksekusi dengan aman dan dicatat ke dalam audit log aktivitas platform.
            </p>

            {/* Results Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-2xl mx-auto my-6 text-left">
              <div className="p-3 rounded-xl bg-surface border border-line">
                <span className="text-[11px] text-muted">Berhasil Dibuat</span>
                <p className="text-xl font-black text-sage mt-0.5">
                  {commitResult.summary?.inserted_count || 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-line">
                <span className="text-[11px] text-muted">Diperbarui</span>
                <p className="text-xl font-black text-blue mt-0.5">
                  {commitResult.summary?.updated_count || 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-line">
                <span className="text-[11px] text-muted">Dilewati (Skip)</span>
                <p className="text-xl font-black text-gold mt-0.5">
                  {commitResult.summary?.skipped_count || 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-line">
                <span className="text-[11px] text-muted">Foto Terpasang</span>
                <p className="text-xl font-black text-blue mt-0.5">
                  {commitResult.summary?.photos_committed || 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-line">
                <span className="text-[11px] text-muted">Gagal</span>
                <p className="text-xl font-black text-clay mt-0.5">
                  {commitResult.summary?.failed_count || 0}
                </p>
              </div>
            </div>

            {/* Photo Notice */}
            {commitResult.summary?.photos_committed > 0 ? (
              <div className="p-4 rounded-xl bg-ok-bg/50 border border-ok-fg/20 text-ok-fg text-xs max-w-xl mx-auto mb-6 text-left flex items-start gap-3">
                <ImageIcon size={18} className="shrink-0 mt-0.5 text-sage" />
                <div>
                  <strong>Foto Kost Berhasil Dimuat!</strong>
                  <p className="mt-0.5 leading-relaxed">
                    Sebanyak <strong>{commitResult.summary.photos_committed}</strong> properti kos
                    telah tersimpan lengkap dengan galeri foto dan langsung dapat ditampilkan di katalog aplikasi mobile serta halaman admin.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-warn-bg text-warn-fg text-xs max-w-xl mx-auto mb-6 text-left flex items-start gap-3">
                <ImageIcon size={18} className="shrink-0 mt-0.5" />
                <div>
                  <strong>Langkah Selanjutnya: Unggah Foto Kos</strong>
                  <p className="mt-0.5 text-warn-fg/90">
                    Data kos baru disimpan dengan status verifikasi <code>PENDING</code> dan
                    belum memiliki foto. Silakan buka halaman <strong>Manajemen Kost</strong> untuk
                    melengkapi galeri foto sebelum mempublikasikannya.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <PrimaryButton onClick={handleDownloadReport} className="text-xs">
                <Download size={15} />
                <span>Unduh Laporan Hasil (.csv)</span>
              </PrimaryButton>
              <GhostButton
                onClick={() => {
                  if (typeof setView === "function") setView("fastapi_kosts");
                  else window.location.hash = "fastapi_kosts";
                }}
                className="text-xs"
              >
                <span>Buka Manajemen Kost</span>
                <ArrowRight size={15} />
              </GhostButton>
              <GhostButton onClick={handleReset} className="text-xs">
                <RotateCcw size={15} />
                <span>Impor File Baru</span>
              </GhostButton>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
