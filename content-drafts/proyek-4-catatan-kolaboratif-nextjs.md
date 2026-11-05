---
title: 'Proyek 4: Aplikasi Catatan Kolaboratif dengan Next.js'
description: Aplikasi pertama yang benar-benar punya pengguna lain. Server Component, Server Action, sesi yang aman, berbagi catatan, pembaruan optimistis, dan deploy ke alamat yang bisa dibuka siapa saja.
date: 2026-11-24
slug: proyek-4-catatan-kolaboratif-nextjs
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Tiga proyek sebelumnya punya satu kesamaan: hanya ada satu pengguna, yaitu Anda. Data cuaca milik semua orang, katalog hanya dibaca, dan dasbor admin memakai server tiruan di komputer sendiri.

Proyek ini berbeda dalam satu hal yang mengubah hampir semua keputusan: **ada pengguna lain.** Begitu ada pengguna lain, muncul pertanyaan yang tidak bisa dihindari. Siapa yang boleh membaca catatan ini? Apa yang terjadi kalau dua orang mengubah catatan yang sama? Dan bagaimana memastikan tautan berbagi tidak bisa ditebak?

| Dari modul | Yang dipakai |
| --- | --- |
| 11 | Pembaruan optimistis untuk aksi ringan, cache di klien untuk bagian yang hidup |
| 12 | Skema Zod sebagai sumber tipe dan validasi di klien maupun server |
| 13 | Server Component, Server Action, `Suspense`, cache berbasis tag |
| 14 | Cookie sesi `httpOnly`, otorisasi per aksi, pembatasan pengalihan, pencegahan kebocoran props |

## Yang dibangun

Aplikasi catatan dengan folder, pencarian, berbagi antar pengguna, dan tautan publik baca saja. Mirip aplikasi yang Anda pakai sehari-hari, dalam bentuk paling kecil yang tetap jujur.

Tiga peran dalam satu catatan:

| Peran | Boleh |
| --- | --- |
| Pemilik | Membaca, mengubah, menghapus, membagikan, mengubah hak orang lain |
| Editor | Membaca dan mengubah |
| Pembaca | Hanya membaca |

Plus satu jalur tanpa akun: tautan publik dengan token acak, baca saja, yang bisa dicabut kapan saja.

## Penyiapan

```bash
pnpm create next-app@latest catatan --typescript --app --eslint
cd catatan
pnpm add zod
pnpm add -D prisma
pnpm add @prisma/client
pnpm dlx prisma init --datasource-provider sqlite
```

SQLite dipilih supaya tidak ada yang perlu dipasang. Untuk deploy nanti, ganti ke Postgres terkelola (Neon, Supabase, atau Turso untuk SQLite) tanpa mengubah satu baris pun kode aplikasi.

```prisma
model Pengguna {
  id        String   @id @default(cuid())
  email     String   @unique
  nama      String
  sandiHash String
  catatan   Catatan[]
  akses     Akses[]
  dibuatPada DateTime @default(now())
}

model Catatan {
  id          String   @id @default(cuid())
  judul       String
  isi         String
  folder      String   @default("umum")
  pemilikId   String
  pemilik     Pengguna @relation(fields: [pemilikId], references: [id])
  akses       Akses[]
  tokenPublik String?  @unique
  diperbarui  DateTime @updatedAt
  dibuatPada  DateTime @default(now())

  @@index([pemilikId, diperbarui])
}

model Akses {
  id         String   @id @default(cuid())
  catatanId  String
  penggunaId String
  peran      String   // 'editor' | 'pembaca'
  catatan    Catatan  @relation(fields: [catatanId], references: [id], onDelete: Cascade)
  pengguna   Pengguna @relation(fields: [penggunaId], references: [id])

  @@unique([catatanId, penggunaId])
}

model Sesi {
  id           String   @id @default(cuid())
  penggunaId   String
  kedaluwarsa  DateTime
}
```

Perhatikan tabel `Sesi`. Modul 14 menjelaskan alasannya: dengan sesi yang tersimpan di server, logout benar-benar mencabut akses dan pencabutan hak langsung berlaku.

## Spesifikasi wajib

### A. Akun dan sesi

1. Daftar dan masuk dengan email dan password, lewat Server Action.
2. Password disimpan dengan hashing yang lambat secara sengaja (argon2 atau bcrypt), tidak pernah disimpan apa adanya.
3. Sesi memakai cookie `httpOnly`, `secure`, `sameSite: 'lax'`, dan tercatat di tabel `Sesi`.
4. Logout menghapus baris sesinya, bukan hanya cookie-nya.
5. Halaman yang butuh login mengalihkan ke `/masuk?lanjut=...`, dan pengalihan hanya boleh ke path internal.
6. Pesan kegagalan login sama untuk email salah dan password salah.

### B. Catatan

7. Daftar catatan dirender di server, diurutkan dari yang terakhir diperbarui.
8. Buat, ubah, dan hapus lewat Server Action dengan validasi skema.
9. Pencarian dan filter folder dibaca dari `searchParams`, jadi tampilan bisa dibagikan.
10. Penyimpanan otomatis saat mengetik, dengan penundaan dan penanda "Tersimpan" yang jujur.
11. Hapus dengan konfirmasi dan pembatalan selama lima detik.

### C. Berbagi

12. Pemilik bisa mengundang pengguna lain lewat email, dengan peran editor atau pembaca.
13. Pemilik bisa mengubah peran dan mencabut akses.
14. Tautan publik baca saja dengan token acak yang panjang, bisa dibuat dan dicabut.
15. Halaman tautan publik tidak boleh membocorkan apa pun selain judul dan isi catatan itu.

### D. Keamanan, dan ini bagian yang dinilai paling ketat

16. Setiap Server Action memeriksa sesi dan hak akses, bukan hanya menyembunyikan tombol.
17. Tidak ada objek pengguna utuh yang dikirim ke Client Component.
18. Catatan orang lain tidak bisa diakses dengan menebak id.
19. Token tautan publik dibuat dengan `crypto.randomUUID()` atau yang setara, bukan dari id yang berurutan.
20. Isi catatan ditampilkan sebagai teks, atau sebagai Markdown yang dibersihkan. Tidak pernah sebagai HTML mentah.

### E. Kualitas

21. Memuat pertama kali menampilkan isi tanpa menunggu JavaScript.
22. Form utama tetap bisa dikirim saat JavaScript dimatikan.
23. Bisa dioperasikan penuh dengan keyboard, dengan pengelolaan fokus pada dialog.
24. `pnpm build` bersih, tanpa `any`, dan `pnpm lint` tanpa peringatan.

Syarat nomor 22 layak dicoba sungguhan: matikan JavaScript di DevTools, lalu buat catatan baru. Dengan Server Action pada `form`, itu tetap bekerja, dan pengalaman melihatnya sendiri mengubah cara Anda memandang form selamanya.

## Lapisan otorisasi

Ini bagian terpenting proyek ini. Satu fungsi yang dipakai semua jalur, supaya tidak ada tempat yang terlewat.

```ts
// lib/akses.ts
import 'server-only';

export type Kewenangan = 'baca' | 'ubah' | 'kelola';

export async function pastikanBolehAkses(
  catatanId: string,
  perlu: Kewenangan
): Promise<{ catatan: Catatan; peran: 'pemilik' | 'editor' | 'pembaca' }> {
  const sesi = await bacaSesi();
  if (!sesi) throw new TidakBerwenang('Sesi berakhir, silakan masuk lagi');

  const catatan = await db.catatan.findUnique({
    where: { id: catatanId },
    include: { akses: { where: { penggunaId: sesi.penggunaId } } },
  });

  // Catatan yang tidak ada dan catatan yang tidak boleh diakses
  // menghasilkan jawaban yang sama, supaya id tidak bisa ditebak
  if (!catatan) throw new TidakDitemukan();

  const peran =
    catatan.pemilikId === sesi.penggunaId
      ? 'pemilik'
      : (catatan.akses[0]?.peran as 'editor' | 'pembaca' | undefined);

  if (!peran) throw new TidakDitemukan();

  const boleh: Record<typeof peran, Kewenangan[]> = {
    pemilik: ['baca', 'ubah', 'kelola'],
    editor: ['baca', 'ubah'],
    pembaca: ['baca'],
  };

  if (!boleh[peran].includes(perlu)) {
    throw new TidakBerwenang('Anda tidak berhak melakukan tindakan ini');
  }

  return { catatan, peran };
}
```

Dua keputusan yang layak ditiru:

**Catatan yang tidak ada dan catatan milik orang lain menghasilkan error yang sama.** Kalau dibedakan, penyerang bisa memakai perbedaan itu untuk memetakan id yang ada di sistem Anda. Teknik ini disebut penghitungan sumber daya, dan pencegahannya semurah menyamakan pesan.

**Kewenangan dipisah dari peran.** Menambah peran baru, misalnya "komentator", cukup menambah satu baris di tabel `boleh`, tanpa menyentuh satu pun Server Action.

Pemakaiannya jadi satu baris di setiap jalur:

```ts
'use server';

export async function simpanIsi(_keadaan: unknown, data: FormData) {
  const hasil = skemaSimpan.safeParse(Object.fromEntries(data));
  if (!hasil.success) return { ok: false, perKolom: ringkasIsu(hasil.error) };

  // Satu baris ini yang menentukan keamanan seluruh jalur
  await pastikanBolehAkses(hasil.data.id, 'ubah');

  await db.catatan.update({
    where: { id: hasil.data.id },
    data: { judul: hasil.data.judul, isi: hasil.data.isi },
  });

  revalidateTag(`catatan-${hasil.data.id}`);
  revalidateTag('daftar-catatan');
  return { ok: true };
}
```

## Penyimpanan otomatis yang jujur

Penanda "Tersimpan" yang muncul sebelum data benar-benar tersimpan adalah kebohongan kecil yang mahal akibatnya. Keadaannya ada empat, dan semuanya perlu terlihat:

```tsx
'use client';

type KeadaanSimpan =
  | { status: 'bersih'; pada: Date }
  | { status: 'ada-perubahan' }
  | { status: 'menyimpan' }
  | { status: 'gagal'; pesan: string };
```

| Keadaan | Yang ditampilkan |
| --- | --- |
| `bersih` | "Tersimpan 14.32" |
| `ada-perubahan` | "Perubahan belum disimpan" |
| `menyimpan` | "Menyimpan…" |
| `gagal` | "Gagal menyimpan. Perubahan Anda masih ada di layar, coba lagi." dengan tombol |

Tiga hal yang wajib ada pada penyimpanan otomatis:

1. **Penundaan, bukan satu permintaan per ketikan.** Dua detik setelah pengguna berhenti mengetik sudah memadai.
2. **Peringatan sebelum menutup tab** saat masih ada perubahan yang belum tersimpan, lewat `beforeunload`.
3. **Perubahan tidak boleh hilang saat gagal.** Isi di layar tetap dipertahankan, dan simpan juga salinannya di `localStorage` sebagai jaring pengaman.

## Konflik dua penyunting

Dua orang mengubah catatan yang sama. Aplikasi Anda tidak perlu menyelesaikannya seperti Google Docs, tapi tidak boleh diam-diam menghapus pekerjaan orang.

Yang paling sederhana dan jujur: **simpan waktu perubahan terakhir, dan tolak penyimpanan yang berdasar versi lama.**

```ts
const terkini = await db.catatan.findUnique({ where: { id }, select: { diperbarui: true } });

if (terkini && terkini.diperbarui.getTime() > Number(data.get('basisVersi'))) {
  return {
    ok: false,
    konflik: true,
    pesan: 'Catatan ini sudah diubah orang lain. Salin perubahan Anda sebelum memuat ulang.',
  };
}
```

Tampilannya: tunjukkan pesan, tampilkan isi terbaru di samping isi pengguna, dan biarkan pengguna memutuskan. Menimpa diam-diam adalah pilihan yang paling mudah ditulis dan paling buruk dirasakan.

## Deploy

Aplikasi ini harus bisa dibuka orang lain, karena itu syarat nomor satu "kolaboratif".

| Bagian | Pilihan |
| --- | --- |
| Hosting | Vercel, Cloudflare Workers dengan adapter OpenNext, atau VPS dengan Docker |
| Basis data | Neon, Supabase (Postgres), atau Turso (SQLite) |
| Rahasia | Variabel lingkungan di panel hosting, tidak pernah di repositori |
| Migrasi | `prisma migrate deploy` sebagai langkah dalam pipeline |

Empat hal yang wajib diperiksa setelah tayang:

1. `.env` ada di `.gitignore`, dan tidak pernah ter-commit. Kalau pernah, anggap rahasianya bocor dan ganti semuanya.
2. Cookie benar-benar `Secure` di produksi. Periksa di tab Application pada DevTools.
3. Halaman tautan publik bisa dibuka di jendela penyamaran, dan tidak menampilkan apa pun selain catatan itu.
4. Jalankan Lighthouse pada URL produksi, simpan hasilnya.

## Checklist penilaian

| # | Yang diperiksa |
| --- | --- |
| 1 | Buat dua akun. Akun B membuka URL catatan milik akun A dengan menebak id. Tertolak dengan pesan yang sama seperti catatan tidak ada? |
| 2 | Bagikan catatan ke akun B sebagai pembaca. Tombol ubah hilang, **dan** Server Action menolak saat dipanggil langsung? |
| 3 | Matikan JavaScript. Masuk, buat catatan, dan simpan. Berhasil? |
| 4 | Cabut tautan publik, lalu buka URL lamanya. Tertolak? |
| 5 | "View source" pada halaman catatan. Ada hash password atau email pengguna lain di dalamnya? |
| 6 | Ketik satu paragraf panjang. Berapa permintaan simpan terkirim? |
| 7 | Matikan jaringan saat mengetik. Penanda jujur dan isi tidak hilang? |
| 8 | Buka catatan yang sama di dua jendela, ubah keduanya. Ada peringatan konflik? |
| 9 | Logout di satu tab. Tab lain ikut kehilangan akses setelah aksi berikutnya? |
| 10 | Navigasi keyboard penuh: masuk, buat, bagikan, hapus, batalkan |
| 11 | `?lanjut=https://contoh-jahat.com` pada halaman masuk. Diabaikan? |
| 12 | Lighthouse pada URL produksi: performa dan aksesibilitas di atas 90? |

Nomor 2 adalah inti proyek ini. Cara mengujinya: buka DevTools, salin permintaan Server Action sebagai cURL dari tab Network saat akun A menyimpan, lalu jalankan dengan cookie akun B. Kalau berhasil, otorisasi Anda belum bekerja.

## Tantangan bonus

- **Kolaborasi waktu nyata** dengan WebSocket atau Server-Sent Events, mulai dari penanda "Ani sedang mengetik".
- **Riwayat versi** dengan pemulihan ke versi sebelumnya, beserta tampilan perbedaannya.
- **Pencarian teks penuh** memakai kemampuan basis data, bukan `LIKE` di aplikasi.
- **Ekspor ke Markdown dan PDF**, dengan penanganan untuk catatan yang sangat panjang.
- **Login dengan passkey** sebagai alternatif password.

## Rangkuman

- Begitu ada pengguna kedua, setiap jalur data punya pertanyaan "siapa yang boleh". Jawabannya satu fungsi otorisasi yang dipakai semua jalur, bukan pemeriksaan yang ditulis ulang di tiap tempat.
- Catatan yang tidak ada dan catatan milik orang lain harus menghasilkan jawaban yang sama.
- Kewenangan dipisah dari peran, supaya peran baru tidak berarti menyentuh semua aksi.
- Penanda penyimpanan harus jujur, punya empat keadaan, dan tidak pernah menghilangkan pekerjaan pengguna saat gagal.
- Konflik antar penyunting diselesaikan dengan menolak penyimpanan berdasar versi lama, bukan dengan menimpa diam-diam.
- Form dengan Server Action tetap bekerja tanpa JavaScript, dan itu bukan hal sepele di jaringan yang buruk.
- Menguji keamanan berarti mencoba melewati antarmuka Anda sendiri, bukan hanya memeriksa tombolnya hilang.

## Masalah terbuka

Aplikasi ini sudah tayang dan dipakai orang lain. Sekarang ada tiga hal yang tidak bisa Anda jawab dengan jujur.

**Pertama: siapa saja yang sebenarnya bisa memakainya?** Anda menguji dengan mouse dan mata yang sehat, pada laptop dengan layar besar. Apakah editor catatan Anda bisa dipakai dengan pembaca layar? Apakah dialog berbagi bisa ditutup dengan keyboard dan mengembalikan fokus ke tempat yang benar? Apakah penanda "Tersimpan" terbaca oleh yang tidak melihat layar?

**Kedua: berapa lama lagi aplikasi ini aman diubah?** Setiap fitur baru berisiko merusak yang sudah jalan, dan satu-satunya pengujian Anda adalah mencoba sendiri sebelum rilis.

**Ketiga: seberapa cepat ini di HP sungguhan?** Lighthouse di laptop Anda bukan jawaban. Pengguna membuka ini di HP dua jutaan dengan jaringan yang penuh.

Tiga pertanyaan itu jadi tiga modul berikutnya, dimulai dari yang paling sering diabaikan dan paling sering jadi temuan audit: aksesibilitas.
