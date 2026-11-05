---
title: 'Modul 13: Next.js App Router dan Server Component'
description: Pertanyaannya bergeser dari "bagaimana mengambil data" jadi "kode ini sebaiknya berjalan di mana". Server Component, Server Action, caching, dan streaming, beserta kapan jawabannya tetap di klien.
date: 2026-11-22
slug: modul-13-nextjs-app-router
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Tiga batas yang Anda temukan di Proyek 3: muat pertama yang lambat, air terjun permintaan, dan tidak adanya tempat yang aman untuk rahasia.

Ketiganya berasal dari satu keputusan arsitektur yang diambil diam-diam sejak modul 8: **seluruh aplikasi berjalan di browser pengguna.** Modul ini mencabut asumsi itu.

Bandingkan urutan kejadiannya:

| Langkah | Aplikasi di klien saja | Dengan render di server |
| --- | --- | --- |
| 1 | Unduh HTML kosong | Server mengambil data |
| 2 | Unduh JavaScript (300 kB) | Server menggambar HTML berisi data |
| 3 | Jalankan React | Browser menampilkan isinya |
| 4 | Minta data ke API | Unduh JavaScript untuk bagian interaktif |
| 5 | Gambar isi | Bagian interaktif diambil alih |

Pada kolom kanan, pengguna melihat isi di langkah ketiga, dan sebagian besar halaman bahkan tidak butuh langkah keempat sama sekali.

## Analogi: dapur restoran dan dapur rumah

Modul 11 memakai analogi kulkas untuk cache. Sekarang pertanyaannya bukan di mana bahan disimpan, tapi **di mana masaknya**.

**Semua dimasak di rumah pelanggan.** Restoran mengirim bahan mentah, resep, dan seluruh peralatan ke rumah pelanggan, lalu pelanggan memasaknya sendiri. Kelebihannya: setelah peralatan sampai, pelanggan bisa memasak ulang kapan saja tanpa menghubungi restoran. Kekurangannya: kiriman pertama besar dan lama, dan kompor di rumah pelanggan bisa jauh lebih lemah daripada dapur restoran.

**Dimasak di restoran, dikirim siap makan.** Pelanggan menerima makanan yang sudah jadi. Cepat, ringan, dan resep rahasianya tidak pernah keluar dari dapur. Kekurangannya: setiap kali ingin menambah sambal, pelanggan harus menghubungi restoran lagi.

**Yang dipakai restoran sungguhan: campuran.** Makanan utama dimasak di dapur, sedangkan sambal, kecap, dan sendok disediakan di meja supaya pelanggan bisa menyesuaikan sendiri tanpa memanggil pelayan.

| Dunia restoran | Dunia Next.js |
| --- | --- |
| Dapur restoran | Server |
| Dapur rumah pelanggan | Browser pengguna |
| Makanan yang sudah matang | HTML berisi data, dari Server Component |
| Sambal dan kecap di meja | Client Component yang interaktif |
| Resep rahasia yang tidak keluar dapur | Kunci API, token, kueri database |
| Memanggil pelayan untuk pesanan tambahan | Server Action |
| Makanan yang dihidangkan bertahap | Streaming dengan Suspense |

Batas analoginya: makanan dingin kalau dikirim jauh, sedangkan HTML tidak. Yang jadi masalah justru kebalikannya, yaitu data yang sudah basi saat sampai. Karena itu sebagian besar pembahasan Next.js yang rumit berujung ke satu topik: cache.

## Server Component: bawaan, bukan tambahan

Di App Router, **setiap komponen adalah Server Component sampai Anda menyatakan sebaliknya.** Ini kebalikan dari kebiasaan empat modul terakhir, dan butuh waktu untuk terbiasa.

```tsx
// app/produk/page.tsx
// Tidak ada 'use client', jadi ini berjalan di server

import { db } from '@/lib/db';

export default async function HalamanProduk({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kategori?: string }>;
}) {
  const { q = '', kategori = 'semua' } = await searchParams;

  // Kueri database langsung. Kode ini tidak pernah dikirim ke browser.
  const produk = await db.produk.cari({ q, kategori });

  return (
    <main>
      <h1>Produk</h1>
      <FilterProduk /> {/* Client Component, karena interaktif */}
      <ul>
        {produk.map((p) => (
          <li key={p.id}>
            {p.nama} - {formatRupiah(p.harga)}
          </li>
        ))}
      </ul>
    </main>
  );
}
```

Empat hal yang berubah dibanding cara kerja tiga modul terakhir:

1. **Komponen boleh `async`** dan menunggu data langsung di dalamnya.
2. **Tidak ada `useState`, `useEffect`, atau event handler** di Server Component. Komponen ini dijalankan sekali di server, lalu hasilnya dikirim sebagai HTML.
3. **Kode dan dependensinya tidak ikut ke browser.** Library pengakses database, SDK yang berat, dan kunci API tetap di server. Itu jawaban untuk batas ketiga di Proyek 3.
4. **Tidak ada endpoint API untuk pembacaan data.** Halaman mengambil datanya sendiri, dan lapisan `/api/produk` yang hanya meneruskan kueri ke database jadi tidak diperlukan.

Begitu sebuah komponen butuh interaksi, nyatakan dengan jelas:

```tsx
'use client';

import { useState } from 'react';

export function FilterProduk() {
  const [terbuka, setTerbuka] = useState(false);
  // State, event, effect, semuanya boleh di sini
}
```

`'use client'` bukan berarti "jangan dirender di server". Client Component tetap dirender di server untuk HTML awalnya, lalu kodenya dikirim ke browser untuk dihidupkan. Artinya yang lebih tepat: "komponen ini butuh JavaScript di browser".

## Menentukan batasnya

Aturan praktis yang bertahan:

| Kebutuhan | Tempatnya |
| --- | --- |
| Mengambil data untuk ditampilkan | Server Component |
| Mengakses database, kunci API, rahasia | Server Component atau Server Action |
| Library besar yang hanya mengolah data | Server Component, supaya tidak ikut ke bundel |
| `useState`, `useEffect`, event handler | Client Component |
| API browser: `localStorage`, `window`, `navigator` | Client Component |
| Animasi dan interaksi mikro | Client Component |
| Form sederhana | Server Action, tanpa Client Component |
| Data yang berubah tiap detik, polling | Client Component dengan TanStack Query |

Kesalahan paling umum pendatang baru: menaruh `'use client'` di komponen teratas. Begitu sebuah komponen jadi klien, **semua turunannya ikut jadi klien**, dan Anda kembali ke aplikasi satu halaman dengan langkah tambahan.

Pola yang benar adalah mendorong batas klien sejauh mungkin ke daun pohon komponen:

```tsx
// Salah: seluruh halaman jadi klien hanya karena satu tombol
'use client';
export default function Halaman() {
  const [suka, setSuka] = useState(false);
  return (
    <article>
      <IsiArtikelPanjang /> {/* ikut jadi klien, padahal statis */}
      <button onClick={() => setSuka(!suka)}>Suka</button>
    </article>
  );
}

// Benar: hanya tombolnya yang klien
export default function Halaman() {
  return (
    <article>
      <IsiArtikelPanjang /> {/* tetap Server Component */}
      <TombolSuka />
    </article>
  );
}
```

Satu teknik yang sering terlewat: Client Component boleh menerima Server Component sebagai `children`. Jadi pembungkus interaktif seperti tab atau accordion bisa jadi klien, sementara isinya tetap dirender di server.

```tsx
// Tab adalah Client Component, isinya tetap Server Component
<Tab>
  <PanelStatistik />  {/* dirender di server */}
</Tab>
```

## Routing dan berkas khusus

```text
app/
├── layout.tsx              kerangka yang dipakai semua halaman
├── page.tsx                /
├── loading.tsx             tampilan saat halaman di-stream
├── error.tsx               penangkap error (wajib Client Component)
├── not-found.tsx           404
├── produk/
│   ├── page.tsx            /produk
│   ├── loading.tsx
│   └── [id]/
│       └── page.tsx        /produk/123
└── (admin)/                pengelompokan tanpa mengubah URL
    └── pengaturan/
        └── page.tsx        /pengaturan
```

`loading.tsx` adalah fitur yang paling cepat terasa manfaatnya. Dengan satu berkas, Next.js menampilkan kerangka sementara halaman masih mengambil data di server, lalu menggantinya saat siap. Pengguna melihat kerangka halaman langsung, bukan layar kosong.

Untuk kendali yang lebih halus, pakai `Suspense` per bagian:

```tsx
export default function HalamanDasbor() {
  return (
    <main>
      <h1>Dasbor</h1>

      {/* Tampil langsung, tidak menunggu apa pun */}
      <RingkasanCepat />

      {/* Bagian lambat tidak menahan sisanya */}
      <Suspense fallback={<KerangkaGrafik />}>
        <GrafikPenjualan />
      </Suspense>

      <Suspense fallback={<KerangkaTabel baris={10} />}>
        <TabelPesananTerbaru />
      </Suspense>
    </main>
  );
}
```

Itu menjawab batas kedua di Proyek 3: dua bagian lambat yang dibungkus `Suspense` terpisah mengambil datanya bersamaan, dan masing-masing tampil begitu siap.

Satu jebakan air terjun yang tetap ada dan harus Anda hindari sendiri:

```tsx
// Air terjun: kategori baru dimulai setelah produk selesai
const produk = await ambilProduk();
const kategori = await ambilKategori();

// Bersamaan, dan ini yang benar
const [produk, kategori] = await Promise.all([ambilProduk(), ambilKategori()]);
```

## Mengubah data: Server Action

```tsx
// app/produk/aksi.ts
'use server';

import { revalidatePath } from 'next/cache';
import { skemaProduk } from '@/lib/skema';

export async function simpanProduk(_keadaanSebelumnya: unknown, data: FormData) {
  // Pemeriksaan hak akses dilakukan di sini, bukan hanya di UI.
  // Server Action adalah endpoint yang bisa dipanggil siapa saja.
  const sesi = await bacaSesi();
  if (sesi?.peran !== 'admin') {
    return { ok: false, pesan: 'Anda tidak berhak mengubah produk' };
  }

  const hasil = skemaProduk.safeParse(Object.fromEntries(data));
  if (!hasil.success) {
    return { ok: false, perKolom: ringkasIsu(hasil.error) };
  }

  await db.produk.simpan(hasil.data);
  revalidatePath('/produk'); // halaman daftar diambil ulang

  return { ok: true };
}
```

```tsx
'use client';

import { useActionState } from 'react';

export function FormProduk() {
  const [keadaan, aksi, sedangKirim] = useActionState(simpanProduk, null);

  return (
    <form action={aksi}>
      <label htmlFor="nama">Nama produk</label>
      <input id="nama" name="nama" required />
      {keadaan?.perKolom?.nama && <p role="alert">{keadaan.perKolom.nama}</p>}

      <button type="submit" disabled={sedangKirim}>
        {sedangKirim ? 'Menyimpan…' : 'Simpan'}
      </button>
    </form>
  );
}
```

Tiga hal yang membuat pola ini berharga:

**Satu, form bekerja sebelum JavaScript selesai dimuat.** Karena `form` punya `action`, pengiriman tetap berjalan meski JavaScript gagal atau belum siap. Pada koneksi lemah, ini bukan kemewahan.

**Dua, tidak perlu membuat endpoint API.** Fungsi yang dipanggil klien itu dijalankan di server, dengan `fetch` yang diurus framework.

**Tiga, dan ini yang paling sering dilupakan: Server Action adalah endpoint publik.** Siapa pun bisa memanggilnya langsung tanpa melewati antarmuka Anda. Pemeriksaan hak akses dan validasi di dalamnya bukan tambahan, melainkan syarat. Modul 14 membahasnya lebih dalam.

## Cache: bagian yang paling sering membingungkan

Next.js punya beberapa lapis cache, dan sebagian besar kebingungan hilang kalau Anda bertanya satu hal: **berapa lama data ini boleh basi?**

```tsx
// Selalu baru, tidak di-cache
const data = await fetch(url, { cache: 'no-store' });

// Di-cache dan diperbarui paling cepat 60 detik sekali
const data = await fetch(url, { next: { revalidate: 60 } });

// Di-cache dengan penanda, bisa dibatalkan kapan saja dari mana saja
const data = await fetch(url, { next: { tags: ['produk'] } });
```

```ts
// Dipanggil setelah data berubah
revalidateTag('produk');
revalidatePath('/produk');
```

Tiga pertanyaan yang menentukan pilihannya:

| Pertanyaan | Kalau ya |
| --- | --- |
| Sama untuk semua pengguna dan jarang berubah? | Cache dengan `revalidate` yang panjang |
| Sama untuk semua, tapi berubah karena aksi admin? | Cache dengan tag, lalu `revalidateTag` setelah perubahan |
| Berbeda per pengguna atau harus selalu akurat? | `no-store` |

Satu catatan yang menghemat banyak waktu: perilaku bawaan cache berubah cukup berarti antar versi mayor Next.js. Jangan mengandalkan ingatan dari artikel lama, dan jangan menyalin konfigurasi dari proyek dua tahun lalu. Periksa dokumentasi versi yang Anda pakai, lalu buktikan dengan satu percobaan kecil: pasang `console.log` di fungsi pengambil data, jalankan `pnpm build && pnpm start`, lalu muat ulang halaman beberapa kali dan lihat berapa kali log itu muncul.

## Metadata dan URL

```tsx
// Statis
export const metadata: Metadata = {
  title: 'Produk | Toko Kopi',
  description: 'Daftar produk beserta harga dan ketersediaan.',
};

// Dinamis, per halaman
export async function generateMetadata({ params }): Promise<Metadata> {
  const { id } = await params;
  const produk = await ambilProduk(id);

  if (!produk) return { title: 'Produk tidak ditemukan' };

  return {
    title: `${produk.nama} | Toko Kopi`,
    description: produk.ringkasan,
    openGraph: { images: [`/api/og/${produk.id}`] },
  };
}
```

Dan `searchParams` menggantikan `useSearchParams` untuk pembacaan di server, yang berarti filter dari Proyek 3 bisa dibaca sebelum satu baris JavaScript dikirim. Untuk menulisnya, Anda tetap butuh Client Component kecil berisi `useRouter` dan `usePathname`.

## Kapan tidak memakai Next.js

Pertanyaan yang layak diajukan, karena jawabannya tidak selalu "pakai saja".

**Pakai Next.js kalau:** halaman perlu dibaca mesin pencari, muat pertama yang cepat penting, ada rahasia yang harus disembunyikan, atau Anda ingin satu kerangka yang mengurus routing, rendering, dan pengiriman data sekaligus.

**Tidak perlu kalau:** aplikasi sepenuhnya di balik login tanpa kebutuhan SEO dan sudah berjalan baik sebagai aplikasi satu halaman, backend-nya sudah ada dan Anda hanya butuh antarmuka, atau yang Anda bangun sebenarnya situs konten yang hampir tidak punya interaksi. Untuk yang terakhir, Astro sering jadi pilihan yang lebih tepat karena mengirim nol JavaScript secara bawaan.

Jujur soal ongkosnya juga perlu: Server Component mengubah cara berpikir, batas klien dan server butuh waktu untuk dikuasai, dan pemecahan masalah cache bisa membuat frustrasi. Bagi tim kecil dengan tenggat pendek dan aplikasi internal, aplikasi satu halaman dari Proyek 3 bisa saja keputusan yang benar.

## Latihan

### Latihan 1: Pindahkan dasbor ke App Router

Buat ulang halaman produk dari Proyek 3 dengan Next.js, dengan syarat: daftar produk dirender di server, filter dan pencarian dibaca dari `searchParams`, tabel tampil tanpa menunggu JavaScript, dan hanya tiga komponen yang boleh `'use client'`.

> [!petunjuk]
> Gambar dulu pohon komponennya dan beri warna: hijau untuk yang hanya menampilkan, merah untuk yang butuh interaksi. Yang merah biasanya hanya tiga: bilah filter (menulis ke URL), tombol status (mutasi), dan dialog form.

> [!jawaban]
>
> ```tsx
> // app/produk/page.tsx (server)
> export default async function HalamanProduk({ searchParams }) {
>   const filter = skemaFilter.parse(await searchParams);
>
>   // Bersamaan, bukan berurutan
>   const [halaman, kategori] = await Promise.all([
>     db.produk.cari(filter),
>     db.kategori.semua(),
>   ]);
>
>   return (
>     <main>
>       <h1>Produk</h1>
>       <BilahFilter kategori={kategori} /> {/* klien */}
>       <TabelProduk halaman={halaman} />   {/* server */}
>     </main>
>   );
> }
> ```
>
> ```tsx
> // fitur/produk/BilahFilter.tsx
> 'use client';
>
> import { useRouter, usePathname, useSearchParams } from 'next/navigation';
>
> export function BilahFilter({ kategori }: { kategori: Kategori[] }) {
>   const router = useRouter();
>   const pathname = usePathname();
>   const parameter = useSearchParams();
>
>   function ubah(kunci: string, nilai: string) {
>     const baru = new URLSearchParams(parameter);
>     if (nilai && nilai !== 'semua') baru.set(kunci, nilai);
>     else baru.delete(kunci);
>     baru.delete('halaman');
>
>     router.replace(`${pathname}?${baru}`);
>   }
>   // ...
> }
> ```
>
> Empat hal yang akan Anda sadari:
>
> 1. **`TabelProduk` tetap Server Component** meski menampilkan data yang berubah-ubah. Setiap perubahan filter mengubah URL, server merender ulang, dan hasilnya dikirim sebagai pembaruan. Tidak ada state tabel di klien sama sekali.
> 2. **Tombol status di dalam baris butuh klien.** Pecah jadi komponen kecil, jangan jadikan seluruh tabel klien hanya karena satu tombol per baris.
> 3. **Bundel JavaScript menyusut drastis.** Library tabel, formatter, dan pengakses data tidak lagi ikut ke browser. Ukur dengan `pnpm build` dan bandingkan dengan Proyek 3.
> 4. **TanStack Query sebagian besar tidak lagi dipakai di halaman ini.** Cache pembacaan ditangani server. Query tetap berguna untuk hal yang benar-benar hidup di klien, misalnya notifikasi yang di-polling.

### Latihan 2: Garis klien atau server

Untuk delapan bagian berikut, tentukan Server Component atau Client Component, lalu tulis alasannya.

| # | Bagian |
| --- | --- |
| 1 | Daftar artikel di halaman utama |
| 2 | Tombol tema terang dan gelap |
| 3 | Kartu statistik yang mengambil data dari database |
| 4 | Kolom pencarian dengan saran otomatis |
| 5 | Tabel data yang kolomnya bisa diurutkan lewat URL |
| 6 | Penghitung mundur sampai acara dimulai |
| 7 | Tombol "Salin tautan" |
| 8 | Komponen grafik dari library yang memakai `canvas` |

> [!jawaban]
>
> | # | Jawaban | Alasan |
> | --- | --- | --- |
> | 1 | Server | Hanya menampilkan, dan datanya perlu terbaca mesin pencari |
> | 2 | Klien | Butuh `localStorage` dan event. Bisa dibuat sangat kecil, bahkan tanpa state React |
> | 3 | Server | Pengambilan data langsung, kredensial database tidak boleh ke klien |
> | 4 | Klien | Butuh ketikan, penundaan, dan pembatalan |
> | 5 | Server | Urutan ada di URL, jadi server merender ulang. Hanya tombol judul kolomnya yang klien |
> | 6 | Klien | Butuh timer dan waktu lokal pengguna. Perhatikan: jangan render angka awal di server, karena jam server dan jam pengguna berbeda sehingga menyebabkan ketidakcocokan hidrasi |
> | 7 | Klien | Butuh `navigator.clipboard` |
> | 8 | Klien | `canvas` hanya ada di browser. Bungkus dengan `dynamic` dan `ssr: false` kalau library-nya mengakses `window` saat diimpor |
>
> Nomor 6 adalah penyebab paling umum pesan "hydration mismatch", dan pola yang sama berlaku untuk apa pun yang bergantung pada waktu, zona waktu, angka acak, atau isi `localStorage`. Pemecahannya: render keadaan netral di server (misalnya tanda hubung), lalu isi nilainya setelah komponen muncul di klien.
>
> Nomor 5 perlu ditegaskan: naluri pertama hampir semua orang adalah menjadikan seluruh tabel klien. Padahal dengan keadaan di URL, tabel hanyalah tampilan dari parameter, dan server bisa mengerjakannya.

### Latihan 3: Buktikan cache-nya

Buat satu halaman yang mengambil data dari API publik, lalu lakukan empat percobaan dan catat hasilnya. Jangan menebak, buktikan.

1. Tanpa opsi cache apa pun. Jalankan `pnpm build && pnpm start`, buka halaman lima kali. Berapa kali fungsi pengambil data dipanggil?
2. Dengan `next: { revalidate: 10 }`. Muat ulang tiga kali dalam 10 detik, lalu sekali setelah 15 detik.
3. Dengan `cache: 'no-store'`.
4. Dengan tag, lalu panggil `revalidateTag` dari sebuah Server Action.

> [!pembahasan]
>
> Yang akan Anda lihat, dan yang jauh lebih berharga daripada menghafal tabel di dokumentasi:
>
> | Percobaan | Hasil khas | Artinya |
> | --- | --- | --- |
> | 1 | Dipanggil sekali atau per permintaan, tergantung versi | Perilaku bawaan tidak boleh diasumsikan, harus diperiksa |
> | 2 | Satu panggilan per jendela 10 detik | Pengguna pertama setelah jendela habis bisa mendapat data lama sementara yang baru diambil |
> | 3 | Satu panggilan per muat halaman | Paling akurat, paling mahal, dan halaman jadi dinamis |
> | 4 | Tidak ada panggilan sampai tag dibatalkan | Pola terbaik untuk data yang berubah karena aksi, bukan karena waktu |
>
> Tiga pelajaran yang terbawa ke pekerjaan:
>
> 1. **`console.log` di fungsi pengambil data adalah alat diagnosis terbaik untuk cache.** Lebih cepat daripada membaca dokumentasi, dan hasilnya pasti benar untuk versi yang Anda pakai.
> 2. **Perbedaan `pnpm dev` dan `pnpm build && pnpm start` itu besar.** Mode pengembangan sengaja mematikan banyak cache. Kesimpulan tentang cache yang diambil dari mode dev hampir selalu salah.
> 3. **Pola berbasis tag paling cocok untuk aplikasi dengan panel admin.** Konten di-cache selamanya sampai ada yang mengubahnya, lalu dibatalkan tepat sasaran. Pengunjung mendapat halaman secepat halaman statis, dan editor melihat perubahannya dalam hitungan detik.

## Batasnya

App Router menyelesaikan tempat kode berjalan, dan membuka pekerjaan baru.

**Keamanan jadi tanggung jawab Anda sepenuhnya.** Server Action adalah endpoint publik, Server Component bisa saja membocorkan data lewat props yang dikirim ke Client Component, dan sekarang ada sesi yang harus dikelola. Itu modul berikutnya.

**Pemecahan masalah jadi dua tempat.** Error bisa terjadi di server (muncul di terminal atau log) atau di klien (muncul di console browser). Kebiasaan memeriksa keduanya perlu dibangun.

**Tidak semuanya jadi lebih sederhana.** Ada kerumitan baru yang nyata: batas klien dan server, hidrasi, cache berlapis, dan komponen pihak ketiga yang belum siap untuk Server Component.

## Rangkuman

- Pertanyaan utamanya bergeser: bukan "bagaimana mengambil data", tapi "kode ini sebaiknya berjalan di mana".
- Server Component adalah bawaan. Kodenya, dependensinya, dan rahasianya tidak pernah sampai ke browser.
- `'use client'` berarti "butuh JavaScript di browser", dan menular ke semua turunannya. Dorong batas klien sejauh mungkin ke daun.
- Client Component boleh menerima Server Component sebagai `children`. Itu cara membungkus isi statis dengan pembungkus interaktif.
- `loading.tsx` dan `Suspense` membuat halaman tampil bertahap, dan dua bagian lambat yang terpisah mengambil datanya bersamaan.
- `Promise.all` tetap diperlukan. Framework tidak menghapus air terjun yang Anda tulis sendiri.
- Server Action menghapus kebutuhan endpoint API dan membuat form bekerja sebelum JavaScript siap, tapi tetap endpoint publik yang wajib memeriksa hak akses.
- Cache ditentukan satu pertanyaan: berapa lama data ini boleh basi. Buktikan perilakunya dengan percobaan, bukan dengan ingatan.
- Next.js bukan jawaban untuk semua proyek. Aplikasi internal di balik login sering lebih baik tetap sederhana.

## Masalah terbuka

Sekarang aplikasi Anda punya server, dan dengan server datang hal yang sebelumnya tidak mungkin: menyimpan rahasia, mengetahui siapa penggunanya, dan menolak yang tidak berhak.

Tapi pertanyaannya jadi lebih tajam. Di mana token sesi disimpan supaya tidak bisa dicuri lewat satu celah XSS? Kenapa menyimpan token di `localStorage` jadi kebiasaan yang ditinggalkan? Apa yang mencegah situs lain mengirim permintaan atas nama pengguna Anda yang sedang login? Dan kalau Server Action bisa dipanggil siapa saja, bagaimana memastikan hanya admin yang benar-benar bisa menghapus produk?

Itu isi modul berikutnya: autentikasi, sesi, dan daftar serangan yang wajib dikenali setiap frontend engineer.
