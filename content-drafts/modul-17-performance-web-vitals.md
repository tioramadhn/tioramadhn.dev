---
title: 'Modul 17: Performance dan Core Web Vitals'
description: Mengukur dengan jujur sebelum memperbaiki, lalu memperbaiki yang benar-benar berdampak. LCP, INP, CLS, biaya gambar dan font, dan kenapa skrip pihak ketiga sering jadi tersangka utama.
date: 2026-11-27
slug: modul-17-performance-web-vitals
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Aplikasi Anda benar, aman, dan terjaga test. Sekarang buka di HP dua jutaan dengan jaringan 4G yang penuh di jam pulang kantor, dan hitung tiga hal: berapa detik sampai tulisan pertama muncul, berapa lama sampai tombol benar-benar bisa ditekan, dan apakah tata letaknya melompat saat gambar datang.

Tiga pertanyaan itu punya nama resmi, dan sudah jadi angka yang ditagih:

| Metrik | Mengukur | Baik | Perlu perbaikan | Buruk |
| --- | --- | --- | --- | --- |
| **LCP** | Kapan isi terbesar tampil | di bawah 2,5 detik | 2,5 sampai 4 detik | di atas 4 detik |
| **INP** | Seberapa cepat halaman menanggapi interaksi | di bawah 200 ms | 200 sampai 500 ms | di atas 500 ms |
| **CLS** | Seberapa banyak tata letak bergeser | di bawah 0,1 | 0,1 sampai 0,25 | di atas 0,25 |

Plus dua pendukung yang berguna saat mendiagnosis: **TTFB** (waktu sampai byte pertama dari server) dan **FCP** (kapan piksel pertama digambar).

## Ukur dulu, dan ukur dengan jujur

Kesalahan paling mahal dalam pekerjaan performance adalah memperbaiki bagian yang bukan penyebabnya. Gejalanya khas: satu tim menghabiskan dua minggu memecah bundel JavaScript, dan ternyata penyebab utamanya satu gambar hero 2,8 MB.

Dua jenis pengukuran, dan keduanya diperlukan:

| | Lab | Lapangan (RUM) |
| --- | --- | --- |
| Caranya | Lighthouse, WebPageTest, DevTools | `web-vitals` yang mengirim data dari pengguna sungguhan |
| Kelebihan | Bisa diulang, bisa dibandingkan, bisa dijalankan di CI | Kenyataan, dengan perangkat dan jaringan yang sebenarnya |
| Kekurangan | Bukan kenyataan | Tidak bisa dipakai untuk menguji perubahan sebelum rilis |
| Dipakai untuk | Menemukan penyebab dan mencegah kemunduran | Mengetahui keadaan sebenarnya dan menentukan prioritas |

Tiga aturan pengukuran yang membedakan angka yang berguna dan angka yang menipu:

**Satu, selalu pakai pelambatan.** Di DevTools, setel jaringan ke "Slow 4G" dan CPU ke "4x slowdown". Tanpa itu, Anda sedang mengukur laptop Anda, bukan pengguna Anda.

**Dua, lihat persentil ke-75, bukan rata-rata.** Rata-rata disembunyikan oleh pengguna beruntung. Patokan "baik" di tabel atas semuanya berlaku untuk p75, artinya tiga dari empat kunjungan harus memenuhinya.

**Tiga, ukur di produksi.** Mode pengembangan jauh lebih lambat karena alasan yang tidak berlaku bagi pengguna. Jalankan `pnpm build && pnpm start` sebelum menyimpulkan apa pun.

Pengukuran lapangan cukup beberapa baris:

```ts
import { onLCP, onINP, onCLS } from 'web-vitals';

function kirim(metrik: { name: string; value: number; rating: string }) {
  navigator.sendBeacon('/api/vitals', JSON.stringify(metrik));
}

onLCP(kirim);
onINP(kirim);
onCLS(kirim);
```

Setelah seminggu data terkumpul, Anda bisa memisahkan angka berdasarkan jenis perangkat dan halaman, dan biasanya satu halaman akan menonjol jelek. Mulai dari situ.

## Analogi: pindahan rumah

Anda pindah rumah dan punya satu truk.

**Cara yang buruk.** Semua barang dimasukkan sekaligus, termasuk perabot yang baru dipakai bulan depan. Truk penuh, perjalanan lambat, dan setelah sampai Anda masih harus membongkar semuanya sebelum bisa tidur.

**Cara yang baik.** Barang untuk malam pertama diangkut lebih dulu: kasur, bantal, lampu. Sisanya menyusul. Anda bisa tidur satu jam setelah sampai, bukan setelah tengah malam.

| Dunia pindahan | Dunia frontend |
| --- | --- |
| Barang untuk malam pertama | Jalur kritis: HTML, CSS di atas lipatan, gambar utama |
| Perabot bulan depan | Kode halaman lain, grafik di bagian bawah, skrip analitik |
| Satu truk | Bandwidth dan satu main thread |
| Membongkar kardus | Parsing, eksekusi JavaScript, hidrasi |
| Sofa yang menghalangi pintu | Skrip yang memblokir render |
| Menumpuk kardus di jalan masuk | Antrean tugas panjang di main thread |

Batas analoginya: truk hanya soal volume, sedangkan di web ada dua sumber daya terbatas sekaligus, yaitu jaringan dan prosesor. File kecil yang membutuhkan banyak perhitungan bisa lebih merugikan daripada gambar besar yang hanya perlu digambar.

## LCP: kapan isi terbesar tampil

Elemen LCP hampir selalu gambar hero, judul besar, atau blok teks utama. Cara menemukannya: di Lighthouse, lihat bagian "Largest Contentful Paint element".

Setelah tahu elemennya, urutkan penyebabnya:

| Penyebab | Perbaikan |
| --- | --- |
| TTFB lambat | Cache di server, CDN, kurangi pekerjaan sebelum byte pertama dikirim |
| Sumber daya yang memblokir render | CSS kritis lebih awal, skrip dengan `defer`, hapus font yang tidak dipakai |
| Gambar terlalu besar | Format modern, ukuran yang tepat, kompresi |
| Gambar ditemukan terlambat | `fetchpriority="high"`, hindari gambar hero yang dimuat lewat JavaScript |
| Isi baru digambar setelah JavaScript jalan | Render di server, seperti modul 13 |

Gambar hampir selalu jadi penyebab terbesar, dan perbaikannya paling cepat:

```html
<!-- Gambar utama: prioritas tinggi, ukuran dipesan, format modern -->
<img
  src="/hero-800.webp"
  srcset="/hero-480.webp 480w, /hero-800.webp 800w, /hero-1600.webp 1600w"
  sizes="(min-width: 60rem) 50vw, 100vw"
  width="1600"
  height="900"
  fetchpriority="high"
  alt="Barista menuang susu ke gelas kopi"
/>

<!-- Gambar di bawah lipatan: jangan diprioritaskan, muat saat dibutuhkan -->
<img src="/produk-400.webp" width="400" height="300" loading="lazy" decoding="async" alt="" />
```

Empat kesalahan gambar yang paling sering terjadi, dan semuanya mudah diperiksa:

1. **Mengirim gambar 2000 piksel untuk ruang 400 piksel.** Di DevTools, tab Network, bandingkan ukuran tampil dan ukuran asli.
2. **Memakai PNG untuk foto.** WebP atau AVIF biasanya memangkas lebih dari setengah ukurannya.
3. **`loading="lazy"` pada gambar hero.** Ini justru memperlambat LCP, dan termasuk kesalahan yang paling sering tidak disadari.
4. **Tidak menulis `width` dan `height`.** Penyebab CLS nomor satu.

Font punya pola masalah sendiri:

```css
@font-face {
  font-family: 'Inter';
  src: url('/font/inter-subset.woff2') format('woff2');
  font-display: swap; /* teks tampil dengan font cadangan dulu, bukan tidak tampil */
  size-adjust: 107%; /* samakan metrik dengan font cadangan supaya tidak bergeser */
}
```

Tiga aturan font: sajikan sendiri jangan dari penyedia pihak ketiga (menghemat satu sambungan baru), kirim hanya potongan karakter yang dipakai, dan muat hanya ketebalan yang benar-benar ada di desain. Satu keluarga font dengan sembilan ketebalan adalah beban yang jarang terbayar.

## CLS: tata letak yang melompat

CLS adalah metrik yang paling mudah diperbaiki sekaligus paling menjengkelkan bagi pengguna, karena akibatnya nyata: tombol yang hendak ditekan berpindah, lalu yang tertekan adalah iklan.

Lima penyebab dan perbaikannya:

| Penyebab | Perbaikan |
| --- | --- |
| Gambar dan video tanpa ukuran | `width`, `height`, atau `aspect-ratio` |
| Font yang bergeser saat berganti | `size-adjust` dan font cadangan dengan metrik mirip |
| Iklan dan sematan | Pesan ruangnya dengan `min-height` |
| Isi yang disisipkan di atas isi yang sudah tampil | Sisipkan di bawah, atau sediakan ruangnya sejak awal |
| Kerangka pemuatan beda ukuran dengan isi aslinya | Samakan ukurannya |

Baris terakhir sering terlewat: kerangka pemuatan setinggi 60 piksel yang digantikan kartu setinggi 180 piksel menghasilkan pergeseran persis seperti gambar tanpa ukuran. Kerangka yang baik adalah kerangka seukuran isinya.

## INP: kapan halaman terasa menanggapi

INP mengukur jeda antara pengguna berbuat dan halaman memberi tanggapan terlihat. Penyebabnya hampir selalu main thread yang sibuk, dan itu kembali ke analogi koki tunggal di modul 4.

| Penyebab | Perbaikan |
| --- | --- |
| Pekerjaan berat di penanganan event | Pecah, tunda, atau pindahkan ke Web Worker |
| Daftar sangat panjang yang digambar ulang | Virtualisasi, atau tunda dengan `useDeferredValue` |
| Perhitungan mahal di setiap render | Hitung sekali, atau pindahkan ke server |
| Hidrasi yang berat | Kurangi Client Component, seperti modul 13 |
| Context yang sering berubah | Pisahkan context, seperti modul 9 |
| Skrip pihak ketiga | Muat setelah interaktif, atau buang |

Dua alat React yang khusus untuk ini:

```tsx
import { useDeferredValue, useTransition } from 'react';

function Pencarian() {
  const [kataKunci, setKataKunci] = useState('');
  // Isian tetap responsif, daftar menyusul
  const kataKunciTertunda = useDeferredValue(kataKunci);
  const hasil = saring(semuaData, kataKunciTertunda);

  return (
    <>
      <input value={kataKunci} onChange={(e) => setKataKunci(e.target.value)} />
      <Daftar item={hasil} />
    </>
  );
}
```

`useDeferredValue` menandai pembaruan daftar sebagai tidak mendesak, sehingga ketikan pengguna tidak pernah tertahan oleh penyaringan sepuluh ribu baris. `useTransition` melakukan hal serupa untuk perpindahan tampilan yang berat.

Untuk perhitungan yang benar-benar berat, pindahkan keluar dari main thread:

```ts
// Berjalan di thread terpisah, main thread tetap bebas melayani interaksi
const pekerja = new Worker(new URL('./hitung.worker.ts', import.meta.url), {
  type: 'module',
});

pekerja.postMessage({ baris: dataBesar });
pekerja.onmessage = (peristiwa) => setHasil(peristiwa.data);
```

## Bundel JavaScript dan tamu tak diundang

```bash
pnpm add -D source-map-explorer
pnpm build && pnpm exec source-map-explorer 'dist/assets/*.js'
```

Empat langkah yang hampir selalu berhasil, berurutan dari yang paling berdampak:

**1. Periksa skrip pihak ketiga lebih dulu.** Pada banyak situs, lebih dari separuh JavaScript yang dijalankan bukan tulisan tim sendiri: pengukur analitik, obrolan bantuan, pelacak iklan, uji A/B, peta panas. Masing-masing dipasang satu orang dua tahun lalu untuk alasan yang sudah tidak berlaku. Mulailah dengan membuat daftarnya, lalu tanyakan siapa yang masih memakai datanya.

**2. Pecah per rute.** Pengguna yang membuka halaman masuk tidak perlu mengunduh kode halaman admin.

```tsx
const EditorKaya = lazy(() => import('./EditorKaya'));

<Suspense fallback={<KerangkaEditor />}>
  <EditorKaya />
</Suspense>;
```

**3. Ganti library berat.** Periksa apakah platform sudah menyediakannya: `Intl` menggantikan library format tanggal dan angka, `fetch` menggantikan klien HTTP, `structuredClone` menggantikan fungsi salin dalam.

**4. Pindahkan pekerjaan ke server.** Library yang hanya mengolah data, misalnya pengurai Markdown atau penghitung statistik, tidak perlu ada di browser sama sekali kalau halamannya Server Component.

Untuk skrip pihak ketiga yang memang harus ada, muat setelah halaman bisa dipakai:

```tsx
import Script from 'next/script';

<Script src="https://obrolan.contoh.com/widget.js" strategy="lazyOnload" />;
```

## Anggaran dan pencegahan kemunduran

Memperbaiki performance sekali itu mudah. Yang sulit adalah menjaganya tetap baik setelah enam bulan dan dua puluh fitur baru. Jawabannya anggaran yang dijalankan mesin:

```json
// .size-limit.json
[
  { "path": "dist/assets/index-*.js", "limit": "160 kB" },
  { "path": "dist/assets/*.css", "limit": "30 kB" }
]
```

Jalankan di CI bersama `pnpm check`. Pull request yang menaikkan ukuran melewati batas akan gagal, dan percakapannya terjadi pada saat yang tepat: sebelum kodenya masuk, bukan tiga bulan kemudian saat tidak ada yang ingat siapa menambahkan apa.

Lengkapi dengan Lighthouse CI untuk memantau skor per halaman penting, dan pantau data lapangan setiap bulan.

## Urutan yang benar

Kalau Anda hanya punya satu hari untuk memperbaiki satu halaman lambat, kerjakan dengan urutan ini:

1. **Ukur dengan pelambatan, catat angkanya.** Tanpa angka awal, Anda tidak akan tahu apakah perubahan Anda membantu.
2. **Cari elemen LCP dan ukuran total transfer.** Dua angka ini biasanya langsung menunjuk tersangka.
3. **Perbaiki gambar.** Format, ukuran, prioritas. Sering ini saja sudah memangkas separuh masalah.
4. **Buang atau tunda skrip pihak ketiga yang tidak esensial.**
5. **Pesan ruang untuk semua yang datang belakangan.** CLS selesai.
6. **Pecah bundel per rute, dan buang library yang bisa digantikan platform.**
7. **Ukur lagi, bandingkan, dan catat hasilnya.**

Langkah terakhir bukan formalitas. Angka sebelum dan sesudah adalah satu-satunya cara meyakinkan tim bahwa pekerjaan performance pantas dialokasikan waktu lagi di sprint berikutnya.

## Latihan

### Latihan 1: Ukur dengan jujur

Ambil Proyek 4 yang sudah tayang, lalu ukur dalam tiga keadaan dan catat LCP, INP, CLS, serta total transfer.

| | Keadaan |
| --- | --- |
| A | Tanpa pelambatan, di laptop Anda |
| B | Slow 4G dan CPU 4x slowdown |
| C | HP sungguhan lewat remote debugging, memakai data seluler |

> [!petunjuk]
> Untuk C: sambungkan HP Android dengan kabel, buka `chrome://inspect` di laptop, lalu jalankan Lighthouse pada tab HP itu. Pakai data seluler, bukan Wi-Fi rumah, supaya hasilnya mewakili pengguna sungguhan.

> [!jawaban]
>
> Pola hasil yang khas, dan angka-angkanya biasanya mengejutkan:
>
> | Metrik | A | B | C |
> | --- | --- | --- | --- |
> | LCP | 0,8 detik | 3,4 detik | 4,1 detik |
> | INP | 40 ms | 180 ms | 320 ms |
> | CLS | 0,02 | 0,18 | 0,21 |
>
> Tiga pelajaran dari tabel seperti ini:
>
> 1. **Kolom A tidak pernah layak dijadikan dasar keputusan.** Semua angkanya hijau, dan kolom C menunjukkan dua metrik yang gagal. Semua kesimpulan performance yang diambil dari laptop pengembang akan terlalu optimis.
> 2. **CLS memburuk di jaringan lambat.** Di laptop, gambar datang hampir bersamaan dengan HTML sehingga pergeserannya tidak sempat terlihat. Di jaringan lambat, jeda itu panjang dan pergeserannya nyata. Jadi CLS yang baik di lab tidak membuktikan apa pun.
> 3. **INP memburuk karena CPU, bukan jaringan.** HP kelas menengah punya prosesor yang jauh lebih lemah, dan hidrasi yang di laptop terasa instan bisa memakan ratusan milidetik di sana.
>
> Setelah tabel ini ada, pekerjaan Anda jadi jelas: ada dua metrik merah, dan Anda tahu persis di perangkat mana harus memeriksanya.

### Latihan 2: Urutkan perbaikannya

Sebuah halaman daftar produk punya temuan berikut. Urutkan perbaikan dari yang paling berdampak, dan perkirakan pengaruhnya.

| Temuan | Angka |
| --- | --- |
| Gambar hero PNG | 2,4 MB |
| Bundel JavaScript | 420 kB gzip |
| Tiga skrip pihak ketiga | 180 kB gzip, 1,2 detik waktu CPU |
| Font dari penyedia luar, 4 ketebalan | 320 kB |
| TTFB | 1,1 detik |
| 40 kartu produk tanpa `width` dan `height` | |
| Daftar lengkap 2.000 baris digambar sekaligus | |

> [!jawaban]
>
> | Urutan | Perbaikan | Perkiraan dampak | Usaha |
> | --- | --- | --- | --- |
> | 1 | Gambar hero jadi WebP dengan ukuran yang tepat dan `fetchpriority` | LCP turun 1,5 sampai 2,5 detik | Satu jam |
> | 2 | Tambahkan ukuran pada 40 kartu produk | CLS mendekati nol | Setengah jam |
> | 3 | Audit tiga skrip pihak ketiga, buang yang tidak terpakai, tunda sisanya | INP turun jelas, 180 kB hilang | Satu hari, termasuk diskusi |
> | 4 | Sajikan font sendiri, 2 ketebalan, dengan subset | Hemat 200 kB plus satu sambungan | Dua jam |
> | 5 | Virtualisasi daftar 2.000 baris | INP turun drastis saat menggulir | Setengah hari |
> | 6 | Cache atau perbaiki TTFB | Semua metrik ikut turun 0,5 detik | Tergantung backend |
> | 7 | Pecah bundel per rute | LCP sedikit membaik | Satu hari |
>
> Tiga alasan urutan ini:
>
> **Gambar lebih dulu karena perbandingan dampak dan usaha paling baik.** Satu gambar 2,4 MB pada jaringan 4G butuh beberapa detik sendirian, dan memperbaikinya tidak menyentuh arsitektur apa pun.
>
> **Ukuran gambar kedua karena paling murah.** Setengah jam untuk menghapus satu metrik merah sepenuhnya.
>
> **Skrip pihak ketiga ketiga, dan ini bukan soal teknis.** Perbaikannya mudah, yang sulit adalah menemukan siapa pemilik tiap skrip dan apakah datanya masih dipakai. Mulai mencari sekarang, sambil mengerjakan yang lain.
>
> Yang paling sering dilakukan orang pertama kali, yaitu memecah bundel, ada di urutan ketujuh. Pekerjaannya paling lama dan dampaknya paling kecil di daftar ini. Itulah alasan mengukur dulu.

### Latihan 3: Gambar dan font di Proyek 2

Ambil katalog dari Proyek 2, lalu kerjakan: poster memakai `srcset` dan `sizes` yang benar, hanya poster pertama yang `fetchpriority="high"`, sisanya `loading="lazy"`, semua punya rasio aspek yang dipesan, dan font disajikan sendiri dengan maksimal dua ketebalan.

Catat ukuran transfer dan CLS sebelum dan sesudah.

> [!pembahasan]
>
> ```tsx
> export function PosterJudul({ judul, prioritas = false }: Props) {
>   if (!judul.poster) {
>     // Penampung berukuran sama, bukan ikon gambar rusak
>     return <div className="poster poster-kosong" aria-hidden="true" />;
>   }
>
>   return (
>     <img
>       className="poster"
>       src={judul.poster.kecil}
>       srcSet={`${judul.poster.kecil} 210w, ${judul.poster.besar} 680w`}
>       sizes="(min-width: 64rem) 210px, 45vw"
>       width={210}
>       height={295}
>       loading={prioritas ? 'eager' : 'lazy'}
>       fetchPriority={prioritas ? 'high' : 'auto'}
>       decoding="async"
>       alt={`Poster ${judul.nama}`}
>     />
>   );
> }
> ```
>
> ```css
> .poster,
> .poster-kosong {
>   aspect-ratio: 210 / 295;
>   inline-size: 100%;
>   object-fit: cover;
>   background: var(--warna-latar-naik);
> }
> ```
>
> Empat hal yang membuat potongan ini layak ditiru:
>
> 1. **Hanya kartu pertama yang `prioritas`.** Menandai semuanya prioritas tinggi sama dengan tidak menandai apa pun, dan justru merugikan karena browser kehilangan panduan.
> 2. **Penampung kosong berukuran sama dengan gambar.** Judul tanpa poster tidak boleh membuat kartu lain bergeser.
> 3. **`aspect-ratio` di CSS, dan `width` serta `height` di HTML.** Keduanya, bukan salah satu. Atribut di HTML bekerja sebelum CSS dimuat.
> 4. **`sizes` yang jujur.** Nilai yang salah membuat browser memilih berkas yang terlalu besar, dan `srcset` jadi tidak ada gunanya. Periksa dengan DevTools: pada gambar, kolom "Intrinsic size" harus mendekati ukuran tampilnya.
>
> Hasil yang biasa didapat pada katalog 20 kartu: transfer turun dari sekitar 4 MB jadi di bawah 800 kB, dan CLS dari sekitar 0,2 jadi mendekati nol.

### Latihan 4: Perbaiki interaksi yang tersendat

Dasbor dari Proyek 3 memuat 3.000 baris sekaligus, dan mengetik di kolom pencarian terasa tersendat. Perbaiki dengan tiga pendekatan, lalu ukur INP masing-masing.

> [!jawaban]
>
> **Pendekatan 1: tunda pembaruan daftar.** Paling murah, satu baris.
>
> ```tsx
> const kataKunciTertunda = useDeferredValue(kataKunci);
> const hasil = useMemo(() => saring(semua, kataKunciTertunda), [semua, kataKunciTertunda]);
> ```
>
> Isian langsung responsif karena penyaringan tidak lagi menahan ketikan. Tapi menggambar 3.000 baris tetap mahal, jadi daftarnya masih terasa berat saat digulir.
>
> **Pendekatan 2: virtualisasi.** Hanya baris yang terlihat yang digambar.
>
> ```tsx
> import { useVirtualizer } from '@tanstack/react-virtual';
>
> const virtual = useVirtualizer({
>   count: hasil.length,
>   getScrollElement: () => wadahRef.current,
>   estimateSize: () => 56,
>   overscan: 8,
> });
> ```
>
> INP turun drastis, dan jumlah simpul DOM dari 3.000 jadi sekitar 25. Harganya: aksesibilitas butuh perhatian ekstra, karena pencarian bawaan browser dengan Ctrl+F tidak lagi menemukan baris yang belum digambar. Sediakan pencarian aplikasi yang jelas sebagai gantinya.
>
> **Pendekatan 3, dan ini yang paling sering benar: jangan kirim 3.000 baris.** Pindahkan penyaringan dan pembagian halaman ke server, seperti yang sudah jadi spesifikasi Proyek 3.
>
> | Pendekatan | INP khas | Transfer | Catatan |
> | --- | --- | --- | --- |
> | Apa adanya | 400 ms | besar | |
> | `useDeferredValue` | 120 ms | sama | Satu baris, gulir masih berat |
> | Virtualisasi | 60 ms | sama | Lebih rumit, butuh perhatian aksesibilitas |
> | Di server | 50 ms | kecil | Memperbaiki transfer, memori, dan CPU sekaligus |
>
> Pelajaran utamanya: **masalah performance yang paling bersih diselesaikan dengan tidak mengerjakan pekerjaan itu sama sekali.** Virtualisasi adalah cara pintar menggambar sepuluh ribu baris; tidak mengirim sepuluh ribu baris adalah cara yang lebih baik. Virtualisasi tetap dibutuhkan untuk hal yang memang harus ada semuanya di klien, misalnya hasil yang sudah diunduh untuk dipakai luring.

## Batasnya

Performance yang baik tetap punya batas yang bukan urusan kode Anda.

**Sebagian besar waktu bisa ada di backend.** TTFB 1,5 detik tidak bisa diperbaiki frontend. Yang bisa Anda lakukan: menunjukkan angkanya dengan jelas, dan membuat halaman tetap terasa hidup dengan streaming.

**Jaringan dan perangkat pengguna di luar kendali Anda.** Yang bisa dikendalikan adalah berapa banyak yang Anda kirim dan berapa banyak yang harus dikerjakan perangkat itu.

**Cepat tidak sama dengan baik.** Halaman yang muncul dalam satu detik dan membingungkan tetap gagal. Core Web Vitals mengukur kecepatan, bukan kegunaan.

**Dan performance akan mundur lagi.** Tanpa anggaran yang dijalankan mesin, enam bulan lagi angkanya kembali seperti semula. Itu sebabnya bagian terpenting modul ini adalah anggaran di CI, bukan daftar trik.

## Rangkuman

- Ukur sebelum memperbaiki, dengan pelambatan, di produksi, dan lihat p75, bukan rata-rata.
- Lab untuk mencari penyebab dan mencegah kemunduran, data lapangan untuk mengetahui kenyataan dan menentukan prioritas.
- LCP biasanya soal gambar, TTFB, dan sumber daya yang memblokir render. Gambar hampir selalu perbaikan dengan hasil tercepat.
- CLS diselesaikan dengan memesan ruang: `width` dan `height`, `aspect-ratio`, kerangka seukuran isinya, dan metrik font yang disamakan.
- INP soal main thread yang sibuk. Pecah pekerjaan, tunda yang tidak mendesak, virtualisasi daftar panjang, dan kurangi hidrasi.
- Skrip pihak ketiga sering jadi penyumbang terbesar, dan hambatan terbesarnya bukan teknis melainkan menemukan siapa yang masih membutuhkannya.
- Pekerjaan yang tidak dilakukan adalah pengoptimalan terbaik. Pindahkan ke server, atau jangan kirim sama sekali.
- Anggaran ukuran dan Lighthouse di CI adalah yang membuat perbaikan hari ini bertahan tahun depan.

## Masalah terbuka

Anda sekarang bisa membangun aplikasi yang benar, aman, terjaga test, bisa diakses, dan cepat. Sebagai satu orang, atau tim kecil, pada satu produk.

Sekarang bayangkan keadaan yang akan Anda temui di perusahaan yang sedang tumbuh: lima produk, empat tim, satu merek. Tombol yang sama dibuat ulang di tiga tempat dengan perbedaan kecil yang tidak disengaja. Perbaikan di satu produk tidak sampai ke produk lain. Setiap tim punya cara rilis sendiri, dan tidak ada yang tahu versi mana yang sedang tayang di mana. Insiden baru ketahuan dari keluhan pengguna di media sosial.

Tidak satu pun dari tujuh belas modul sebelumnya menjawab itu, karena masalahnya bukan tentang kode satu halaman, melainkan tentang bagaimana banyak orang mengerjakan banyak halaman tanpa saling menabrak.

Itu isi modul terakhir: design system, monorepo, jalur rilis, dan hal-hal yang membuat frontend layak disebut siap produksi.
