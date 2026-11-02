/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        // Halaman admin & login tidak boleh di-cache agar tombol Back tidak menampilkan dashboard setelah logout.
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
