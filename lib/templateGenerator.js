import * as XLSX from "xlsx";

export const TEMPLATE_COLUMNS = [
  ["nama_kost", "Nama Kost (Wajib, Contoh: Kos Melati Tampan)"],
  ["tipe_kost", "Tipe Kost (Wajib: PUTRA / PUTRI / CAMPUR)"],
  ["alamat", "Alamat Lengkap (Wajib, Contoh: Jl. Bina Krida No. 12)"],
  ["provinsi", "Provinsi (Opsional, Default: Riau)"],
  ["kota", "Kota (Opsional, Default: Kota Pekanbaru)"],
  ["kecamatan", "Kecamatan (Wajib/Dianjurkan, Contoh: Tampan / Binawidya)"],
  ["kelurahan", "Kelurahan (Opsional, Contoh: Simpang Baru)"],
  ["harga_bulanan", "Harga Sewa Bulanan (Wajib, Angka > 0, Contoh: 850000)"],
  ["harga_tahunan", "Harga Sewa Tahunan (Opsional, Angka > 0, Contoh: 9500000)"],
  ["total_kamar", "Total Kamar (Wajib, Angka >= 1, Contoh: 10)"],
  ["kamar_tersedia", "Kamar Tersedia (Wajib, Angka >= 0, Contoh: 3)"],
  ["deskripsi", "Deskripsi Lengkap (Opsional, Detail spesifikasi & lingkungan)"],
  ["aturan_kost", "Aturan Kost (Opsional, Contoh: Jam malam 23:00, Bebas rokok)"],
  ["fasilitas", "Fasilitas (Opsional, Pisahkan koma, Contoh: AC Dingin, Kamar Mandi Dalam, WiFi Cepat)"],
  ["no_whatsapp", "No. WhatsApp Pemilik (Opsional, Format: 08123456789)"],
  ["nama_pemilik", "Nama Pemilik (Opsional, Untuk referensi kontak)"],
  ["email_pemilik", "Email Pemilik (Opsional, Email akun pemilik terdaftar)"],
  ["latitude", "Latitude (Opsional, Contoh: 0.48271)"],
  ["longitude", "Longitude (Opsional, Contoh: 101.3752)"],
  ["status_ketersediaan", "Status Ketersediaan (Opsional: TERSEDIA / PENUH, Default: TERSEDIA)"],
];

export const SAMPLE_ROWS = [
  {
    nama_kost: "[CONTOH] Kos Melati Indah Tampan (Hapus baris ini sebelum impor)",
    tipe_kost: "PUTRI",
    alamat: "Jl. Bina Krida No. 18, Panam",
    provinsi: "Riau",
    kota: "Kota Pekanbaru",
    kecamatan: "Tampan / Binawidya",
    kelurahan: "Simpang Baru",
    harga_bulanan: 850000,
    harga_tahunan: 9500000,
    total_kamar: 10,
    kamar_tersedia: 2,
    deskripsi: "Kos putri nyaman dan bersih, dekat kampus UNRI Panam. Akses jalan aspal lebar.",
    aturan_kost: "Jam malam 23.00 WIB. Dilarang merokok di dalam kamar. Tamu pria dilarang masuk kamar.",
    fasilitas: "AC Dingin, Kamar Mandi Dalam, WiFi Cepat, Kasur Springbed, Lemari Pakaian, Dapur Bersama",
    no_whatsapp: "081234567890",
    nama_pemilik: "Ibu Hj. Siti Aminah",
    email_pemilik: "pemilik.melati@gmail.com",
    latitude: 0.48271,
    longitude: 101.3752,
    status_ketersediaan: "TERSEDIA",
  },
  {
    nama_kost: "[CONTOH] Kos Putra Garuda Marpoyan (Hapus baris ini sebelum impor)",
    tipe_kost: "PUTRA",
    alamat: "Jl. Kaharuddin Nasution Gg. Garuda No. 5",
    provinsi: "Riau",
    kota: "Kota Pekanbaru",
    kecamatan: "Marpoyan Damai",
    kelurahan: "Simpang Tiga",
    harga_bulanan: 650000,
    harga_tahunan: 7000000,
    total_kamar: 14,
    kamar_tersedia: 4,
    deskripsi: "Kos khusus mahasiswa dan pekerja putra. Dekat kampus UIR. Lingkungan aman dan tenang.",
    aturan_kost: "Bebas jam malam (kunci pagar masing-masing). Menjaga ketertiban lingkungan.",
    fasilitas: "Kamar Mandi Dalam, Kasur Springbed, Lemari Pakaian, Parkir Motor, WiFi Cepat",
    no_whatsapp: "081398765432",
    nama_pemilik: "Bapak H. Darman",
    email_pemilik: "pemilik.garuda@gmail.com",
    latitude: 0.46123,
    longitude: 101.4521,
    status_ketersediaan: "TERSEDIA",
  },
];

export const GUIDELINES = [
  { "Nama Kolom": "nama_kost", Status: "Wajib", "Format": "Teks (3-120 karakter)", Keterangan: "Nama properti kos yang jelas dan mudah dicari." },
  { "Nama Kolom": "tipe_kost", Status: "Wajib", "Format": "PUTRA / PUTRI / CAMPUR", Keterangan: "Kategori gender penghuni kamar." },
  { "Nama Kolom": "alamat", Status: "Wajib", "Format": "Teks alamat jalan", Keterangan: "Alamat fisik lengkap properti." },
  { "Nama Kolom": "provinsi", Status: "Opsional", "Format": "Teks (Default: Riau)", Keterangan: "Nama provinsi." },
  { "Nama Kolom": "kota", Status: "Opsional", "Format": "Teks (Default: Kota Pekanbaru)", Keterangan: "Nama kota / kabupaten." },
  { "Nama Kolom": "kecamatan", Status: "Wajib / Dianjurkan", "Format": "Nama kecamatan resmi di Pekanbaru", Keterangan: "Contoh: Tampan / Binawidya, Tuah Madani, Marpoyan Damai, Bukit Raya, Sukajadi, Payung Sekaki, Rumbai, Tenayan Raya, Kulim, Sail, Senapelan, Lima Puluh." },
  { "Nama Kolom": "kelurahan", Status: "Opsional", "Format": "Teks", Keterangan: "Kelurahan / desa setempat." },
  { "Nama Kolom": "harga_bulanan", Status: "Wajib", "Format": "Angka numerik (Contoh: 850000)", Keterangan: "Tarif sewa per bulan dalam rupiah tanpa titik/koma." },
  { "Nama Kolom": "harga_tahunan", Status: "Opsional", "Format": "Angka numerik (Contoh: 9500000)", Keterangan: "Tarif sewa per tahun jika tersedia." },
  { "Nama Kolom": "total_kamar", Status: "Wajib", "Format": "Angka bulat >= 1", Keterangan: "Total seluruh unit kamar pada properti ini." },
  { "Nama Kolom": "kamar_tersedia", Status: "Wajib", "Format": "Angka bulat >= 0", Keterangan: "Jumlah kamar yang sedang kosong dan siap disewa." },
  { "Nama Kolom": "deskripsi", Status: "Opsional", "Format": "Teks deskripsi", Keterangan: "Informasi tambahan, spesifikasi kamar, dan keunggulan." },
  { "Nama Kolom": "aturan_kost", Status: "Opsional", "Format": "Teks aturan", Keterangan: "Ketentuan tata tertib bagi calon penyewa." },
  { "Nama Kolom": "fasilitas", Status: "Opsional", "Format": "Teks dipisah koma", Keterangan: "Contoh: AC Dingin, Kamar Mandi Dalam, WiFi Cepat, Kasur Springbed, Lemari Pakaian, Dapur Bersama." },
  { "Nama Kolom": "no_whatsapp", Status: "Opsional", "Format": "Nomor ponsel (08xx)", Keterangan: "Nomor kontak WhatsApp pemilik yang valid untuk dihubungi penyewa." },
  { "Nama Kolom": "nama_pemilik", Status: "Opsional", "Format": "Teks", Keterangan: "Nama pemilik atau pengelola kos untuk referensi." },
  { "Nama Kolom": "email_pemilik", Status: "Opsional", "Format": "Email valid", Keterangan: "Email akun pemilik terdaftar jika ada." },
  { "Nama Kolom": "latitude & longitude", Status: "Opsional", "Format": "Desimal koordinat", Keterangan: "Koordinat peta Pekanbaru (Lat ~0.48, Lng ~101.40)." },
  { "Nama Kolom": "status_ketersediaan", Status: "Opsional", "Format": "TERSEDIA / PENUH", Keterangan: "Status ketersediaan saat ini." },
  { "Nama Kolom": "PENGELOLAAN FOTO", Status: "PENTING", "Format": "Dikelola terpisah", Keterangan: "Foto kos TIDAK dimasukkan ke dalam spreadsheet ini. Setelah impor berhasil, foto dikelola melalui menu Manajemen Kost -> Edit / Unggah Foto. Status kos tanpa foto adalah 'Foto belum diunggah' dan verifikasi diset 'PENDING' demi kualitas katalog." },
];

export function getLocalTemplateBase64(format = "xlsx", delimiter = ";") {
  if (format === "csv") {
    const delim = delimiter === "," ? "," : ";";
    const headers = TEMPLATE_COLUMNS.map((c) => c[0]);
    const escapeCsv = (val) => {
      const s = String(val ?? "");
      return s.includes(delim) || s.includes('"') || s.includes("\n") || s.includes("\r")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const lines = [headers.join(delim)];
    for (const row of SAMPLE_ROWS) {
      lines.push(headers.map((h) => escapeCsv(row[h])).join(delim));
    }
    // UTF-8 BOM CSV so Excel and Google Sheets open per-column
    const csvString = "\uFEFF" + lines.join("\r\n");
    return Buffer.from(csvString, "utf-8").toString("base64");
  }

  // Format XLSX
  const wb = XLSX.utils.book_new();
  
  // Sheet 1: Data Kos
  const ws1 = XLSX.utils.json_to_sheet(SAMPLE_ROWS, {
    header: TEMPLATE_COLUMNS.map((c) => c[0]),
  });
  // Explicit column widths (Column A to T)
  ws1["!cols"] = [
    { wch: 34 }, // A: nama_kost
    { wch: 14 }, // B: tipe_kost
    { wch: 38 }, // C: alamat
    { wch: 14 }, // D: provinsi
    { wch: 18 }, // E: kota
    { wch: 24 }, // F: kecamatan
    { wch: 20 }, // G: kelurahan
    { wch: 16 }, // H: harga_bulanan
    { wch: 16 }, // I: harga_tahunan
    { wch: 14 }, // J: total_kamar
    { wch: 16 }, // K: kamar_tersedia
    { wch: 45 }, // L: deskripsi
    { wch: 40 }, // M: aturan_kost
    { wch: 40 }, // N: fasilitas
    { wch: 18 }, // O: no_whatsapp
    { wch: 22 }, // P: nama_pemilik
    { wch: 26 }, // Q: email_pemilik
    { wch: 14 }, // R: latitude
    { wch: 14 }, // S: longitude
    { wch: 20 }, // T: status_ketersediaan
  ];
  ws1["!views"] = [{ state: "frozen", ySplit: 1, activeCell: "A2" }];
  XLSX.utils.book_append_sheet(wb, ws1, "Data Kos");

  // Sheet 2: Panduan & Aturan
  const ws2 = XLSX.utils.json_to_sheet(GUIDELINES);
  ws2["!cols"] = [
    { wch: 24 },
    { wch: 18 },
    { wch: 35 },
    { wch: 55 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, "Panduan & Aturan");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buf).toString("base64");
}
