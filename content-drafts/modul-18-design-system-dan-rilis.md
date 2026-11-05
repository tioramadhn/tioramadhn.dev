---
title: 'Modul 18: Design System, Monorepo, dan Jalur Rilis'
description: Modul terakhir, dan satu-satunya yang masalahnya bukan tentang kode melainkan tentang orang. Berbagi komponen antar tim, merilis tanpa menahan napas, dan mengetahui ada yang rusak sebelum pengguna mengeluh.
date: 2026-11-28
slug: modul-18-design-system-dan-rilis
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Tujuh belas modul sebelumnya mengajarkan cara membangun aplikasi yang benar, aman, cepat, dan bisa diakses. Semuanya mengasumsikan satu hal yang tidak pernah disebut: Anda, atau tim kecil Anda, mengerjakan satu produk.

Modul ini tentang apa yang berubah saat asumsi itu gugur:

| Gejala | Akar masalahnya |
| --- | --- |
| Tombol yang sama ada tiga versi di tiga produk | Tidak ada satu sumber komponen |
| Perbaikan aksesibilitas di satu produk tidak sampai ke produk lain | Kode disalin, bukan dibagikan |
| Tim A menunggu tim B untuk rilis | Jalur rilis yang saling mengunci |
| Tidak ada yang tahu versi mana yang tayang di mana | Tidak ada pencatatan rilis |
| Insiden ketahuan dari keluhan di media sosial | Tidak ada pemantauan |
| Keputusan arsitektur diulang perdebatannya tiap kuartal | Tidak ada catatan alasan |

Tidak satu pun bisa diperbaiki dengan menulis kode yang lebih baik di satu berkas. Semuanya soal bagaimana banyak orang bekerja tanpa saling menabrak.

## Analogi: standar colokan listrik

Bayangkan setiap pabrik perangkat elektronik merancang colokannya sendiri. Setiap kali membeli kipas angin, Anda juga perlu memasang stopkontak baru.

Standar colokan dan tegangan menyelesaikannya dengan satu ide: **sepakati antarmukanya, lalu bebaskan sisanya.** Pabrik kipas tidak perlu tahu cara kerja pembangkit listrik, dan pembangkit tidak perlu tahu merek kipas Anda. Yang disepakati hanya bentuk colokan dan tegangannya.

| Dunia kelistrikan | Dunia frontend |
| --- | --- |
| Standar colokan | Kontrak komponen: nama props dan perilakunya |
| Tegangan yang disepakati | Design token |
| Sertifikasi keamanan | Pemeriksaan aksesibilitas dan test pada komponen bersama |
| Katalog produk resmi | Dokumentasi design system |
| Mengganti kabel di satu rumah | Rilis per produk |
| Mengganti standar nasional | Perubahan yang merusak pada paket bersama |

Batas analoginya: standar colokan hampir tidak pernah berubah, sedangkan design system berubah terus. Karena itu bagian tersulitnya bukan membuat standar, melainkan **mengubah standar tanpa merusak yang sudah memakainya.**

## Design system sebagai produk, bukan folder

Kesalahan paling umum: menaruh komponen bersama di satu folder, menyebutnya design system, lalu heran kenapa tidak ada yang memakainya.

Design system yang bekerja punya lima hal:

**1. Token yang dipublikasikan.** Lapis primitif dan semantik dari modul 10, diterbitkan sebagai paket yang bisa dipasang, bukan disalin.

**2. Komponen dengan kontrak yang jelas.** Props yang stabil, perilaku yang sudah benar secara aksesibilitas, dan tidak ada asumsi tentang produk tertentu.

**3. Dokumentasi yang bisa dicoba.** Storybook atau yang setara, berisi setiap varian dan keadaan. Tanpa ini, orang akan membuat ulang karena tidak tahu komponennya sudah ada.

**4. Model kontribusi.** Siapa yang boleh menambah, bagaimana usulan diajukan, dan berapa lama jawabannya. Design system yang hanya bisa diubah satu tim akan dilewati tim lain saat mereka dikejar tenggat.

**5. Cara mengukur pemakaian.** Berapa persen tombol di produk Anda berasal dari paket bersama? Tanpa angka ini, Anda tidak tahu apakah sistemnya dipakai atau hanya ada.

Yang menentukan kontrak komponen:

```tsx
// Kontrak yang baik: pemakai bisa menyesuaikan tanpa meminta izin
interface TombolProps extends React.ComponentProps<'button'> {
  varian?: 'utama' | 'kedua' | 'bahaya';
  ukuran?: 'kecil' | 'sedang' | 'besar';
  sedangMemuat?: boolean;
}

// Kontrak yang buruk: setiap kebutuhan baru berarti menambah props
interface TombolBurukProps {
  teks: string;
  warnaKustom?: string;
  marginAtas?: number;
  punyaIkonKiri?: boolean;
  namaIkonKiri?: string;
  bisaDiklikDuaKali?: boolean;
}
```

Yang pertama menerima semua atribut `button` bawaan dan `className`, sehingga tim produk bisa menyesuaikan kebutuhan kecil tanpa menunggu rilis paket. Yang kedua menjadikan tim design system sebagai penghambat bagi semua orang.

Soal perubahan yang merusak, pola yang terbukti bekerja: **tandai usang, jangan langsung hapus.**

```tsx
/**
 * @deprecated Pakai `varian="utama"`. Props `primary` akan dihapus di v3.
 * Jalankan codemod: pnpm dlx @ds/codemod tombol-varian
 */
primary?: boolean;
```

Tiga langkahnya: tandai usang dengan jalan keluar yang jelas, sediakan codemod kalau perubahannya mekanis, lalu hapus pada versi mayor berikutnya setelah memeriksa tidak ada lagi yang memakainya.

## Monorepo: kapan iya, kapan tidak

Monorepo adalah satu repositori berisi beberapa aplikasi dan paket. Nilainya ada pada satu hal: **perubahan yang menyentuh beberapa paket bisa dilakukan dalam satu commit dan satu telaah.**

```text
repo/
├── apps/
│   ├── web/            produk utama
│   ├── admin/          dasbor internal
│   └── docs/
├── packages/
│   ├── ui/             komponen bersama
│   ├── token/          design token
│   ├── konfigurasi/    eslint, tsconfig, prettier bersama
│   └── util/
├── pnpm-workspace.yaml
└── turbo.json
```

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// turbo.json: urutan pekerjaan dan apa yang boleh di-cache
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "test": { "dependsOn": ["^build"] },
    "lint": {},
    "dev": { "cache": false, "persistent": true }
  }
}
```

Manfaat yang paling terasa adalah cache dan eksekusi terpilih: mengubah satu paket hanya membangun ulang paket itu beserta yang bergantung padanya. Pada repositori dengan sepuluh aplikasi, perbedaannya antara pipeline sepuluh menit dan empat puluh menit.

| Pakai monorepo kalau | Jangan kalau |
| --- | --- |
| Ada kode yang benar-benar dibagikan antar aplikasi | Setiap aplikasi berdiri sendiri tanpa kode bersama |
| Perubahan sering menyentuh lebih dari satu paket | Tim terpisah dengan jadwal rilis yang sama sekali berbeda |
| Ingin satu konfigurasi lint, format, dan tsconfig | Repositori sudah sangat besar dan tooling-nya mulai megap |
| Ingin melihat dampak perubahan sebelum merilisnya | Perusahaan punya aturan akses yang berbeda per proyek |

Untuk penomoran versi paket bersama, Changesets adalah pilihan yang wajar: setiap pull request yang mengubah paket menyertakan catatan perubahan, lalu rilis dan catatan rilisnya dihasilkan otomatis.

## Micro-frontend: baca bagian ini sebelum memutuskan

Micro-frontend adalah memecah satu aplikasi jadi beberapa bagian yang dibangun dan dirilis tim berbeda, lalu disatukan di browser atau saat build.

Masalah yang benar-benar diselesaikannya hanya satu: **tim yang terlalu banyak untuk satu jalur rilis.** Kalau delapan tim harus antre merilis lewat satu pipeline dan saling memblokir, micro-frontend memberi mereka kemerdekaan.

Harganya nyata, dan sering diremehkan:

| Biaya | Wujudnya |
| --- | --- |
| Dependensi ganda | Dua versi React terunduh di satu halaman |
| Ukuran total membengkak | Setiap bagian membawa pustakanya sendiri |
| Versi yang bergeser | Satu bagian pakai design system v2, yang lain masih v1 |
| Bug integrasi | Hanya muncul saat semuanya disatukan, dan sulit direproduksi |
| Pemecahan masalah lintas tim | "Lambatnya di bagian siapa?" jadi pertanyaan rutin |
| Konsistensi pengalaman | Transisi antar bagian terasa seperti berpindah aplikasi |

Rekomendasi yang jujur: **untuk hampir semua perusahaan di bawah lima puluh frontend engineer, jangan.** Yang biasanya dibutuhkan lebih dulu adalah batas modul yang jelas di dalam satu aplikasi, paket bersama yang rapi, dan jalur rilis yang cepat. Tiga hal itu memberi sebagian besar manfaat tanpa sebagian besar biayanya.

Kalau memang diperlukan, pisahkan berdasarkan **wilayah domain**, bukan berdasarkan lapisan teknis. Satu tim memiliki "checkout" dari ujung ke ujung jauh lebih sehat daripada satu tim memiliki "semua header".

## Jalur rilis

Merilis seharusnya membosankan. Kalau setiap rilis butuh rapat dan doa, yang perlu diperbaiki jalurnya, bukan kewaspadaannya.

Tahapan yang jadi patokan:

```text
Pull request
  → periksa otomatis (tsc, lint, format, unit, komponen)
  → deploy pratinjau dengan URL sendiri
  → telaah kode dan telaah visual oleh desainer
  → gabung ke main
  → build dan test e2e
  → rilis ke produksi
  → pantau, dan siap mundur
```

Empat praktik yang paling berpengaruh:

**Deploy pratinjau per pull request.** Satu URL yang bisa dibuka desainer, pemilik produk, dan QA tanpa menjalankan apa pun. Ini mengubah telaah dari membaca kode jadi mencoba fitur.

**Rilis kecil dan sering.** Sepuluh perubahan kecil per minggu lebih aman daripada satu rilis besar per bulan, karena saat ada yang rusak, penyebabnya jelas.

**Feature flag memisahkan rilis dari peluncuran.** Kode bisa masuk ke produksi dalam keadaan mati, lalu dinyalakan untuk 1% pengguna, lalu 10%, lalu semua.

```tsx
const { fiturBaru } = useFlag();

return fiturBaru ? <EditorBaru /> : <EditorLama />;
```

Satu peringatan dari pengalaman banyak tim: flag yang tidak pernah dibersihkan jadi utang. Setiap flag perlu tanggal kedaluwarsa dan pemilik, dan menghapusnya setelah fiturnya mapan adalah bagian dari pekerjaan, bukan tambahan.

**Mundur harus semudah maju.** Sebelum rilis besar, pastikan Anda tahu persis cara mengembalikan versi sebelumnya, dan pastikan perubahan basis data tidak menghalanginya. Perubahan skema yang kompatibel dua arah adalah syarat untuk bisa mundur.

## Observability: tahu lebih dulu daripada pengguna

Empat lapis, dan ketiganya saling melengkapi:

| Lapis | Alat | Menjawab |
| --- | --- | --- |
| Pelacakan error | Sentry dan sejenisnya | Apa yang pecah, di mana, pada siapa |
| Data performance lapangan | `web-vitals` dikirim ke penyimpanan sendiri | Seberapa cepat di perangkat nyata |
| Log dan jejak | Log server, penanda jejak | Kenapa permintaan ini lambat |
| Analitik produk | Apa pun yang dipakai tim produk | Fiturnya benar-benar dipakai atau tidak |

```ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  // Versi dikirim supaya error bisa dihubungkan ke rilis tertentu
  release: process.env.VERSI_RILIS,

  beforeSend(peristiwa) {
    // Jangan pernah mengirim data pribadi dan rahasia ke pihak ketiga
    delete peristiwa.request?.cookies;
    if (peristiwa.request?.headers) delete peristiwa.request.headers.authorization;
    return bersihkanDataPribadi(peristiwa);
  },
});
```

Tiga hal yang sering terlewat dan menentukan berguna atau tidaknya pemantauan Anda:

**Unggah source map, tapi jangan sajikan ke publik.** Tanpa source map, jejak error berisi kode terminifikasi yang tidak bisa dibaca. Dengan source map yang bisa diunduh siapa saja, kode sumber Anda ikut terbuka.

**Saring data pribadi di sumbernya.** Token, nomor kartu, isi form, dan email pengguna tidak boleh ikut terkirim. Ini bukan hanya soal etika, tapi juga kewajiban perlindungan data.

**Peringatan harus bisa ditindaklanjuti.** Peringatan yang muncul lima puluh kali sehari akan diabaikan. Pasang ambang yang berarti, misalnya "tingkat error di atas 1% selama lima menit", dan tetapkan siapa yang menerimanya.

## Hal lain yang muncul pada skala ini

**Internasionalisasi.** Kalau produk Anda akan melayani lebih dari satu bahasa, mulai dari awal jauh lebih murah. Yang perlu disiapkan: teks tidak ditulis langsung di komponen, aturan jamak yang berbeda per bahasa, format tanggal dan angka lewat `Intl`, serta properti logis di CSS supaya arah tulisan kanan ke kiri tidak jadi penulisan ulang.

**Catatan keputusan arsitektur.** Satu berkas Markdown pendek per keputusan besar: apa yang diputuskan, apa alternatifnya, kenapa dipilih, dan kapan perlu ditinjau ulang. Ini yang menghentikan perdebatan yang sama berulang tiap kuartal, dan yang menjelaskan kepada orang baru kenapa sesuatu dikerjakan dengan cara yang terlihat aneh.

**Dokumentasi orientasi.** Ukuran yang jujur: berapa lama seorang engineer baru bisa merilis perubahan kecil ke produksi? Kalau lebih dari dua hari, masalahnya ada di dokumentasi atau di jalur rilis.

## Latihan

### Latihan 1: Terbitkan token Anda sebagai paket

Ambil sistem token dari modul 10, ubah jadi paket di monorepo, lalu pakai dari dua aplikasi (Proyek 3 dan Proyek 4).

Syaratnya: token didefinisikan satu kali dalam format yang netral, lalu dihasilkan jadi CSS dan konstanta TypeScript, dan mengubah satu nilai cukup satu commit.

> [!petunjuk]
> Simpan sumbernya sebagai JSON atau TypeScript biasa, lalu buat skrip kecil yang menghasilkan CSS. Jangan menulis CSS sebagai sumber, karena nilainya juga dibutuhkan dalam bentuk yang bisa dibaca kode.

> [!jawaban]
>
> ```ts
> // packages/token/src/sumber.ts
> export const token = {
>   warna: {
>     primitif: { biru500: '#2b4cf2', abu50: '#f7f7f5', abu900: '#11100f' },
>     semantik: {
>       terang: { latar: 'abu50', teks: 'abu900', aksi: 'biru500' },
>       gelap: { latar: 'abu900', teks: 'abu50', aksi: '#8aa2ff' },
>     },
>   },
>   jarak: { 1: '0.25rem', 2: '0.5rem', 3: '0.75rem', 4: '1rem', 6: '1.5rem' },
> } as const;
>
> export type NamaJarak = keyof typeof token.jarak;
> ```
>
> ```json
> // packages/token/package.json
> {
>   "name": "@ds/token",
>   "exports": {
>     ".": "./dist/index.js",
>     "./css": "./dist/token.css"
>   },
>   "scripts": { "build": "tsx skrip/hasilkan.ts && tsc" }
> }
> ```
>
> Empat keputusan yang menentukan apakah paket ini akan dipakai atau dilewati:
>
> 1. **Satu sumber, banyak keluaran.** CSS untuk styling, TypeScript untuk kode yang butuh nilainya (misalnya grafik dan canvas), dan bisa ditambah keluaran untuk desainer.
> 2. **Paket mengekspor dua jalur.** Aplikasi yang hanya butuh CSS tidak perlu mengimpor JavaScript apa pun.
> 3. **Penomoran versi dengan Changesets sejak awal.** Mengubah nilai token adalah perubahan yang terlihat pengguna, dan pantas punya catatan rilis.
> 4. **Rencana adopsi, bukan penulisan ulang.** Jangan mengganti semua nilai di dua aplikasi dalam satu pull request. Mulai dari warna, satu aplikasi, satu halaman. Ukur: berapa persen nilai desain yang sudah datang dari paket? Angka itu yang dilaporkan, bukan "sudah dikerjakan".

### Latihan 2: Monorepo atau tidak

Putuskan untuk tiga keadaan ini, lalu tulis alasan dan risikonya.

| | Keadaan |
| --- | --- |
| **A** | Startup, 4 engineer, satu aplikasi Next.js, berencana menambah aplikasi admin terpisah |
| **B** | Perusahaan, 30 engineer, 5 produk, satu tim design system, rilis mingguan per produk |
| **C** | Agensi, 12 engineer, 20 proyek klien yang tidak saling terkait, masa hidup proyek 3 sampai 6 bulan |

> [!pembahasan]
>
> **A: belum, tapi siapkan jalannya.** Dengan satu aplikasi, monorepo menambah tooling tanpa manfaat. Yang masuk akal sekarang: susun kode dengan batas modul yang jelas (`fitur/`, `komponen/`, `lib/` seperti di Proyek 2 dan 3), dan jangan menyebarkan impor lintas fitur sembarangan. Saat aplikasi admin benar-benar dibuat dan mulai ada komponen yang ingin dibagikan, pindah ke pnpm workspaces butuh satu hari, bukan satu kuartal.
>
> **B: ya, ini kasus bukunya.** Lima produk dengan design system bersama persis masalah yang diselesaikan monorepo: perubahan token dan komponen bisa diuji terhadap kelima produk dalam satu pull request, sebelum dirilis. Yang perlu dijaga: waktu pipeline (pakai cache dan eksekusi terpilih), kepemilikan berkas (`CODEOWNERS` per folder), dan aturan bahwa aplikasi tidak boleh saling impor, hanya boleh lewat `packages/`.
>
> **C: tidak.** Dua puluh proyek yang tidak saling terkait dengan masa hidup pendek tidak punya kode bersama yang berarti, dan aturan akses klien sering melarang kodenya berada di satu tempat. Yang benar-benar berguna untuk agensi: satu paket templat awalan dan satu paket konfigurasi bersama (eslint, tsconfig, prettier) yang diterbitkan, lalu setiap proyek berdiri sendiri.
>
> Pola yang bisa ditarik dari ketiganya: **monorepo adalah jawaban untuk kode yang dibagikan, bukan untuk tim yang banyak.** Kalau tidak ada yang dibagikan, tidak ada yang perlu disatukan.

### Latihan 3: Rancang jalur rilis

Rancang jalur rilis lengkap untuk Proyek 4, mulai dari pull request sampai pemantauan setelah tayang. Sebutkan setiap tahap, apa yang menggagalkannya, dan berapa lama targetnya.

> [!jawaban]
>
> | Tahap | Isi | Gagal kalau | Target waktu |
> | --- | --- | --- | --- |
> | Hook pra-commit | format dan lint berkas yang berubah | Ada pelanggaran | di bawah 5 detik |
> | Periksa PR | `tsc`, lint, format, unit, komponen | Ada yang merah | di bawah 5 menit |
> | Anggaran ukuran | `size-limit` pada bundel utama | Melewati batas | bagian dari periksa PR |
> | Deploy pratinjau | URL per PR dengan basis data uji | Build gagal | di bawah 3 menit |
> | Telaah | Kode oleh engineer, tampilan oleh desainer | Ada perubahan diminta | sesuai tim |
> | Gabung ke main | | | |
> | E2E | 5 alur utama di Playwright | Ada yang merah | di bawah 8 menit |
> | Rilis | Deploy bertahap, mulai 10% | Tingkat error naik | di bawah 5 menit |
> | Pemantauan | Error, Core Web Vitals, log | Peringatan menyala | 30 menit pengawasan |
>
> Lima keputusan pelengkap yang perlu ditulis, bukan diasumsikan:
>
> 1. **Siapa yang boleh menggabungkan ke main**, dan apakah perlu persetujuan. Untuk tim kecil, satu persetujuan sudah memadai.
> 2. **Apa yang terjadi saat produksi rusak.** Tulis prosedurnya sebelum dibutuhkan: siapa yang memutuskan mundur, perintahnya apa, dan siapa yang diberi tahu.
> 3. **Migrasi basis data dipisah dari deploy aplikasi**, dan dibuat kompatibel dua arah, supaya mundur tetap mungkin.
> 4. **Flag dibersihkan dalam dua minggu** setelah fiturnya mapan, dengan pemilik yang namanya tercatat.
> 5. **Setiap rilis punya nomor versi yang terlihat di aplikasi**, misalnya di footer atau sebagai meta tag. Saat ada laporan bug, pertanyaan pertama "versi berapa" jadi bisa dijawab.
>
> Patokan yang bisa dipakai menilai jalur rilis mana pun: **berapa lama dari commit sampai tayang, dan berapa lama dari tahu rusak sampai pulih.** Dua angka itu lebih menggambarkan kesehatan tim daripada metrik lain mana pun.

### Latihan 4: Pasang pemantauan tanpa membocorkan data

Pasang pelacakan error dan pengukuran Core Web Vitals di Proyek 4, lalu tulis daftar hal yang tidak boleh ikut terkirim beserta cara menyaringnya.

> [!jawaban]
>
> ```ts
> const FIELD_SENSITIF = ['password', 'sandi', 'token', 'otp', 'nik', 'kartu'];
>
> function bersihkanDataPribadi(peristiwa: Peristiwa): Peristiwa {
>   // 1. Cookie dan header otorisasi
>   delete peristiwa.request?.cookies;
>   if (peristiwa.request?.headers) {
>     delete peristiwa.request.headers.authorization;
>     delete peristiwa.request.headers.cookie;
>   }
>
>   // 2. Parameter kueri yang mungkin berisi token berbagi
>   if (peristiwa.request?.url) {
>     const url = new URL(peristiwa.request.url);
>     for (const kunci of ['token', 'kode', 'undangan']) {
>       if (url.searchParams.has(kunci)) url.searchParams.set(kunci, '[disaring]');
>     }
>     peristiwa.request.url = url.toString();
>   }
>
>   // 3. Isi form yang terbawa di data tambahan
>   if (peristiwa.extra) {
>     for (const kunci of Object.keys(peristiwa.extra)) {
>       if (FIELD_SENSITIF.some((f) => kunci.toLowerCase().includes(f))) {
>         peristiwa.extra[kunci] = '[disaring]';
>       }
>     }
>   }
>
>   return peristiwa;
> }
> ```
>
> Daftar yang tidak boleh terkirim, dan tempat kebocorannya yang khas:
>
> | Data | Biasanya bocor lewat |
> | --- | --- |
> | Token sesi | Cookie, header, parameter URL |
> | Password | Isi form yang ikut dilampirkan saat error |
> | Isi catatan atau pesan pengguna | Potongan state yang dilampirkan ke laporan error |
> | Email dan nomor telepon | Pengenal pengguna yang dikirim ke pelacak |
> | Token tautan berbagi | Parameter URL pada halaman publik |
> | Nomor identitas dan rekening | Isian form dan log |
>
> Tiga hal pelengkap:
>
> 1. **Pakai id pengguna yang tidak bermakna** untuk mengaitkan error dengan sesi, bukan email. Anda tetap bisa melacak, tanpa mengirim data pribadi ke pihak ketiga.
> 2. **Sampling untuk jejak performance, bukan untuk error.** Error sebaiknya dikirim semua, jejak cukup sebagian supaya biayanya wajar.
> 3. **Uji penyaringnya.** Tulis satu test yang membuat peristiwa berisi token lalu memastikan hasilnya tersaring. Penyaring yang tidak diuji biasanya berhenti bekerja setelah ada perubahan bentuk data.

## Batasnya

Modul ini menyentuh wilayah yang bukan sepenuhnya milik frontend, dan jujur soal itu penting.

**Banyak keputusan di sini bukan keputusan Anda sendiri.** Monorepo, jalur rilis, dan pemantauan menyangkut platform, backend, dan manajemen. Yang bisa Anda lakukan sebagai engineer: menunjukkan masalahnya dengan angka, mengusulkan langkah kecil yang bisa dibuktikan, dan tidak menunggu izin untuk hal yang bisa dikerjakan dalam lingkup Anda sendiri.

**Alat tidak menyelesaikan masalah organisasi.** Design system tanpa model kontribusi akan ditinggalkan. Monorepo tanpa kesepakatan kepemilikan akan jadi tempat semua orang mengubah segalanya. Feature flag tanpa pembersihan jadi utang.

**Konteks menentukan jawabannya.** Hampir semua rekomendasi di modul ini berubah kalau ukuran tim dan jumlah produknya berubah. Yang bertahan bukan jawabannya, melainkan pertanyaannya: siapa yang terhambat, oleh apa, dan apa langkah terkecil yang menghapus hambatan itu.

## Rangkuman

- Pada skala tim, masalahnya bukan kualitas kode satu berkas, melainkan bagaimana banyak orang bekerja tanpa saling menabrak.
- Design system adalah produk dengan pengguna, bukan folder. Butuh token yang diterbitkan, kontrak komponen yang stabil, dokumentasi yang bisa dicoba, model kontribusi, dan ukuran pemakaian.
- Komponen bersama menerima `className` dan atribut bawaan, supaya tim design system tidak jadi penghambat semua orang.
- Perubahan yang merusak ditandai usang lebih dulu, disertai codemod kalau mekanis, baru dihapus di versi mayor.
- Monorepo adalah jawaban untuk kode yang dibagikan, bukan untuk tim yang banyak.
- Micro-frontend hanya menyelesaikan masalah terlalu banyak tim dalam satu jalur rilis, dan biayanya nyata. Untuk sebagian besar perusahaan, jawabannya belum.
- Rilis seharusnya membosankan: periksa otomatis, pratinjau per PR, rilis kecil dan sering, flag yang memisahkan rilis dari peluncuran, dan jalan mundur yang teruji.
- Pemantauan tanpa penyaringan data pribadi adalah kebocoran yang Anda pasang sendiri.
- Dua angka yang paling menggambarkan kesehatan tim: lama dari commit sampai tayang, dan lama dari tahu rusak sampai pulih.

## Masalah terbuka

Delapan belas modul dan empat proyek. Anda sudah membangun aplikasi tanpa framework, dengan React, dengan Next.js, dan dengan pengguna sungguhan. Sudah mengamankannya, mengujinya, membuatnya bisa diakses, dan membuatnya cepat.

Satu hal yang belum pernah diminta sepanjang seri ini: **mempertanggungjawabkan setiap keputusannya.**

Di setiap modul, pilihannya sudah disediakan beserta alasannya. Di pekerjaan nyata, tidak ada yang menyediakan itu. Anda yang memutuskan bagian mana dirender di server, data mana yang di-cache dan berapa lama, komponen mana yang dibuat sendiri dan mana yang diambil dari library, serta apa yang sengaja tidak dikerjakan karena waktunya lebih baik dipakai untuk hal lain.

Bagian terakhir seri ini adalah proyek yang meminta hal itu: satu platform utuh, dibangun dari nol sampai tayang, disertai dokumen yang menjelaskan kenapa setiap keputusan besarnya diambil, lengkap dengan angka yang membuktikannya.
