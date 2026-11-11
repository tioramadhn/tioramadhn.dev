---
title: 'Modul 11: Styling Skala Aplikasi dan Design Token'
description: Warna yang disalin di empat puluh tempat, jarak yang ditebak per komponen, dan mode gelap yang jadi pekerjaan dua minggu. Semuanya satu masalah: nilai desain tidak punya satu sumber.
date: 2026-11-20
slug: modul-11-styling-dan-design-token
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Proyek 2 ditutup dengan keluhan yang sangat khas: nama kelas mulai bertabrakan, warna disalin ke banyak berkas, jarak antar elemen ditulis dengan angka berbeda di tiap komponen, dan hasilnya terlihat sedikit tidak rapi tanpa ada yang bisa menunjuk penyebabnya.

Modul 3 sudah mengajarkan cara menulis CSS. Modul ini tentang masalah yang baru muncul saat CSS dikerjakan banyak orang pada aplikasi yang hidup bertahun-tahun:

| Masalah | Terasa saat |
| --- | --- |
| Nama kelas bertabrakan | Dua orang menulis `.card` di dua berkas |
| Nilai desain disalin | Warna utama perlu diubah, dan ada di 40 tempat |
| Jarak tidak konsisten | Satu komponen pakai 12px, sebelahnya 14px, tanpa alasan |
| Mode gelap | Setiap berkas CSS harus disentuh |
| CSS mati | Tidak ada yang berani menghapus, karena tidak tahu masih dipakai atau tidak |
| Tampilan berbeda antar halaman | Lima orang membuat lima tombol yang mirip tapi tidak sama |

Keenamnya satu akar: **nilai desain dan keputusan desain tidak punya satu sumber kebenaran.** Pola yang sama dengan masalah state di modul 6, hanya pindah wilayah.

## Analogi: dapur dengan takaran standar

Bayangkan dua dapur yang memasak menu sama.

**Dapur pertama** memakai ukuran "secukupnya". Setiap koki menuang garam sesuai perasaannya. Hasilnya bisa enak, dan tidak pernah sama dua kali. Koki baru butuh berminggu-minggu untuk menebak takaran yang dimaksud, dan kalau resepnya harus diubah, tidak ada yang bisa memastikan semua koki ikut berubah.

**Dapur kedua** memakai sendok ukur dan daftar takaran yang ditempel di dinding. Menu baru disusun dari takaran yang sudah ada. Hasilnya seragam, koki baru bisa bekerja di hari pertama, dan satu perubahan di daftar dinding berlaku untuk semua menu.

Design token adalah daftar takaran yang ditempel di dinding itu.

| Dunia dapur | Dunia frontend |
| --- | --- |
| Daftar takaran di dinding | Design token |
| Sendok ukur | Satuan dan skala yang konsisten |
| "Garam secukupnya" | `margin-top: 14px` yang ditulis karena kelihatannya pas |
| Resep yang menyebut takaran, bukan angka | `padding: var(--jarak-3)` |
| Resep yang hanya ada di kepala satu koki | CSS yang hanya dipahami penulis aslinya |
| Mengganti merek garam sekali, berlaku di semua menu | Mengubah satu token, berlaku di seluruh aplikasi |

Batas analoginya: takaran standar menjamin keseragaman, bukan rasa yang enak. Design token tidak membuat desain Anda bagus, hanya membuatnya konsisten dan bisa diubah. Keputusan rasanya tetap pekerjaan desainer.

## Design token: tiga lapis

Kesalahan paling umum dalam menyusun token adalah membuat satu lapis saja, yaitu daftar warna. Lapisan yang benar ada tiga, dan pemisahan ini yang membuat mode gelap jadi pekerjaan sepuluh menit.

```css
@layer tokens {
  :root {
    /* Lapis 1, primitif: nama yang menyebut nilainya */
    --biru-500: #2b4cf2;
    --biru-700: #1e35aa;
    --abu-50: #f7f7f5;
    --abu-900: #11100f;
    --merah-500: #d92d20;

    /* Lapis 2, semantik: nama yang menyebut perannya */
    --warna-latar: var(--abu-50);
    --warna-teks: var(--abu-900);
    --warna-aksi: var(--biru-500);
    --warna-aksi-hover: var(--biru-700);
    --warna-bahaya: var(--merah-500);
    --warna-garis: #e3e2de;

    /* Skala jarak: hanya nilai di daftar ini yang boleh dipakai */
    --jarak-1: 0.25rem;
    --jarak-2: 0.5rem;
    --jarak-3: 0.75rem;
    --jarak-4: 1rem;
    --jarak-6: 1.5rem;
    --jarak-8: 2rem;

    --radius-kecil: 0.375rem;
    --radius: 0.75rem;

    --tumpukan-dropdown: 10;
    --tumpukan-dialog: 40;
    --tumpukan-notifikasi: 60;
  }

  /* Mode gelap: hanya lapis semantik yang dipetakan ulang */
  :root[data-tema='gelap'] {
    --warna-latar: var(--abu-900);
    --warna-teks: var(--abu-50);
    --warna-aksi: #8aa2ff;
    --warna-aksi-hover: #b3c2ff;
    --warna-garis: #2a2927;
  }
}
```

Lapis ketiga, token per komponen, dipakai saat sebuah komponen punya kebutuhan yang perlu bisa diatur dari luar:

```css
.tombol {
  --tombol-latar: var(--warna-aksi);
  --tombol-teks: white;

  background: var(--tombol-latar);
  color: var(--tombol-teks);
  padding: var(--jarak-2) var(--jarak-4);
  border-radius: var(--radius-kecil);
}

.tombol[data-varian='bahaya'] {
  --tombol-latar: var(--warna-bahaya);
}
```

Tiga aturan yang membuat sistem token bertahan:

**Satu, komponen tidak pernah memakai primitif.** `.kartu { background: var(--biru-500) }` adalah pelanggaran, karena menguncinya ke satu warna di semua tema. Komponen memakai lapis semantik.

**Dua, nama semantik menyebut peran, bukan tampilan.** `--warna-aksi` bertahan saat mereknya berganti warna, `--warna-biru` tidak. Ini terdengar sepele sampai suatu hari desainer mengganti biru jadi hijau, dan Anda punya token bernama `--warna-biru: green`.

**Tiga, skala jarak adalah daftar tertutup.** Begitu seseorang menulis `margin-top: 14px`, sistemnya mulai bocor. Enam sampai sepuluh nilai cukup untuk hampir semua desain.

Soal `z-index`, satu catatan dari pengalaman: perang `z-index: 9999` selalu berawal dari tidak adanya daftar. Dengan skala tumpukan yang ditulis di satu tempat, pertanyaan "dialog harus di atas dropdown atau di bawah" dijawab sekali.

## Empat pendekatan, dan kapan memilihnya

| Pendekatan | Cara kerja | Kelebihan | Kekurangan |
| --- | --- | --- | --- |
| **CSS Modules** | Nama kelas diacak per berkas | Tabrakan nama hilang, CSS biasa, nol runtime | Tetap perlu disiplin soal token, banyak berkas kecil |
| **Utility class** (Tailwind) | Kelas kecil sekali guna, token jadi utility | Konsisten secara paksa, tidak ada CSS mati, cepat ditulis | Markup jadi panjang, butuh kesepakatan tim |
| **CSS-in-JS runtime** (styled-components) | Gaya dihitung saat aplikasi jalan | Gaya dinamis berbasis props terasa mulus | Biaya runtime, bermasalah dengan Server Component |
| **CSS-in-JS nol runtime** (vanilla-extract) | Gaya ditulis di TypeScript, dikompilasi jadi CSS | Tipe pada token, nol runtime | Ekosistem lebih kecil, butuh konfigurasi build |

Rekomendasi yang jujur untuk tahun ini: **Tailwind untuk aplikasi baru, CSS Modules kalau tim Anda tidak nyaman dengan utility class.** Hindari CSS-in-JS yang menghitung gaya saat runtime untuk proyek baru, karena model Server Component di modul 14 menjalankan komponen di server tempat gaya itu tidak bisa dihitung, dan hampir semua library kategori itu sedang berpindah ke pendekatan nol runtime.

Tailwind versi modern mendefinisikan token langsung di CSS, dan setiap token otomatis jadi utility:

```css
@import 'tailwindcss';

@theme {
  --color-latar: #f7f7f5;
  --color-aksi: #2b4cf2;
  --radius-kartu: 0.75rem;
  --spacing-gutter: 1.25rem;
}

/* Sekarang bg-latar, text-aksi, rounded-kartu, p-gutter tersedia */
```

Tiga kebiasaan yang membedakan proyek Tailwind yang rapi dan yang kacau:

**Satu, nilai sembarang adalah tanda bahaya.** `mt-[14px]` berarti Anda keluar dari sistem. Kalau sering terjadi, yang salah bukan penulisnya, tapi skalanya yang kurang lengkap.

**Dua, komponen diekstrak sebagai komponen React, bukan dengan `@apply`.** Menumpuk `@apply` hanya memindahkan masalah CSS lama ke tempat baru, dan menghapus keuntungan utamanya, yaitu bisa melihat seluruh gaya sebuah elemen di tempat elemen itu ditulis.

**Tiga, kelas kondisional disusun dengan alat, bukan rangkaian template string.** `clsx` atau `cva` membuat varian bisa dibaca:

```tsx
import { clsx } from 'clsx';

interface TombolProps extends React.ComponentProps<'button'> {
  varian?: 'utama' | 'kedua' | 'bahaya';
  ukuran?: 'kecil' | 'sedang';
}

export function Tombol({
  varian = 'utama',
  ukuran = 'sedang',
  className,
  ...sisa
}: TombolProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-md font-semibold',
        'focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        {
          utama: 'bg-aksi text-white hover:bg-aksi-hover',
          kedua: 'border border-garis bg-transparent hover:bg-latar',
          bahaya: 'bg-bahaya text-white',
        }[varian],
        { kecil: 'px-3 py-1.5 text-sm', sedang: 'px-5 py-2.5' }[ukuran],
        className
      )}
      {...sisa}
    />
  );
}
```

Perhatikan tiga hal yang bukan soal gaya penulisan: `focus-visible` tidak pernah dihapus, `disabled` punya tampilannya sendiri, dan `className` dari luar diletakkan terakhir supaya pemakai bisa menimpa tanpa berdebat spesifisitas.

## Mode gelap tanpa kedipan

Mode gelap punya satu masalah teknis yang sering diabaikan: kalau tema dibaca dari `localStorage` oleh React, halaman sempat tampil terang sebelum React jalan. Pengguna melihat kedipan putih di ruangan gelap, dan itu terasa seperti cacat.

Jawabannya satu skrip kecil yang jalan sebelum halaman digambar:

```html
<script>
  // Dijalankan sebelum first paint, jadi tidak ada kedipan
  try {
    const tersimpan = localStorage.getItem('tema');
    const gelap =
      tersimpan === 'gelap' ||
      (!tersimpan && matchMedia('(prefers-color-scheme: dark)').matches);
    if (gelap) document.documentElement.dataset.tema = 'gelap';
  } catch {}
</script>
```

Lalu dua hal pelengkapnya:

```css
:root {
  /* Supaya scrollbar, date picker, dan kontrol bawaan ikut bertema */
  color-scheme: light dark;
}
```

Dan satu keputusan arsitektur yang layak dicontoh: tombol pengubah tema tidak perlu menyimpan state React sama sekali. Tombol itu cukup menulis atribut pada elemen `html`, lalu ikonnya dipilih CSS dengan selektor berdasarkan atribut tadi. Tidak ada state, tidak ada hidrasi, tidak ada kemungkinan tampilan tombol berselisih dengan tema sebenarnya.

Satu jebakan terakhir yang nyata: **utility class berada di cascade layer yang lebih belakang daripada komponen.** Jadi kalau Anda menulis aturan komponen untuk menyembunyikan sesuatu, lalu seseorang menambahkan utility tampilan pada elemen yang sama, utility itu yang menang terlepas dari spesifisitasnya. Urutan layer mengalahkan spesifisitas, seperti di modul 3.

## Jangan membuat semuanya sendiri

Komponen yang kelihatan sederhana ternyata punya banyak aturan perilaku. Dialog harus mengunci fokus di dalamnya, mengembalikan fokus ke pemicunya saat ditutup, menutup dengan Escape, dan mencegah halaman di belakangnya ikut digulir. Combobox punya belasan aturan keyboard.

Pilihan yang masuk akal:

| Kebutuhan | Pilihan | Catatan |
| --- | --- | --- |
| Perilaku dan aksesibilitas, tampilan bebas | Radix UI, React Aria, Base UI | "Headless": tanpa gaya, perilakunya sudah benar |
| Komponen jadi yang kodenya Anda miliki | shadcn/ui | Disalin ke proyek, lalu Anda yang merawat |
| Sistem lengkap dengan tampilan bawaan | MUI, Mantine, Chakra | Cepat jadi, lebih sulit disesuaikan dengan merek sendiri |
| Dialog dan menu sederhana | Elemen bawaan: `dialog`, `details`, `popover` | Sudah cukup untuk banyak kebutuhan, nol kilobyte |

Baris terakhir layak dicoba lebih dulu. Elemen `dialog` bawaan sudah mengurus fokus dan Escape, dan atribut `popover` menangani menu sederhana tanpa satu baris JavaScript.

## Latihan

### Latihan 1: Susun sistem token untuk Proyek 2

Ambil katalog Anda, lalu ganti seluruh nilai desain yang ditulis langsung dengan token. Target: satu berkas token, mode gelap tanpa menyentuh berkas komponen, dan tidak ada satu pun warna atau jarak yang ditulis sebagai angka di komponen.

Mulai dengan menginventarisasi: jalankan pencarian untuk `#`, `px`, dan `rem` di seluruh `src/`, lalu catat berapa nilai unik yang Anda temukan.

> [!petunjuk]
> Hampir pasti Anda akan menemukan lima varian abu-abu yang berbeda tiga digit dan enam nilai jarak antara 10px dan 18px. Kelompokkan dulu, baru beri nama. Jangan beri nama sebelum tahu berapa nilai yang sebenarnya dibutuhkan.

> [!jawaban]
>
> Pola temuan yang khas pada proyek sebesar ini:
>
> | Jenis | Nilai unik ditemukan | Sebaiknya jadi |
> | --- | --- | --- |
> | Warna abu | 7 | 3 token semantik: latar, latar-naik, garis |
> | Warna teks | 4 | 2: teks, teks-lembut |
> | Jarak | 11 | 6 token skala |
> | Radius | 4 | 2 |
> | Ukuran font | 8 | 5 token skala |
>
> Pengurangan itu bukan soal kerapian saja. Setiap nilai unik yang hilang berarti satu keputusan yang tidak perlu diambil lagi oleh orang berikutnya.
>
> Urutan pengerjaan yang paling tidak menyakitkan:
>
> 1. **Buat lapis primitif dari nilai yang sudah ada**, jangan dari angka baru. Tujuan langkah ini mengelompokkan, bukan mendesain ulang.
> 2. **Buat lapis semantik** dan petakan ke primitif. Di sini Anda akan menemukan pertanyaan yang belum pernah terjawab, misalnya "abu ini dipakai untuk garis atau untuk latar?". Pertanyaan itu memang temuan.
> 3. **Ganti di komponen, satu komponen per commit.** Diff yang hanya mengubah nilai gaya mudah ditelaah, dan kalau ada yang berubah tampilannya, penyebabnya mudah ditemukan.
> 4. **Baru setelah itu tambahkan mode gelap**, dengan memetakan ulang lapis semantik saja. Kalau langkah 1 sampai 3 benar, langkah ini kurang dari dua puluh baris.
>
> Kalau mode gelap ternyata butuh menyentuh berkas komponen, itu tanda masih ada komponen yang memakai primitif langsung. Cari dan perbaiki, jangan ditambal dengan aturan khusus di tema gelap.

### Latihan 2: Audit angka ajaib

Potongan ini dari proyek nyata. Temukan semua pelanggaran sistem token, lalu tulis ulang.

```css
.kartu-judul {
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 11px;
  padding: 14px;
  margin-bottom: 18px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  z-index: 5;
}

.kartu-judul:hover {
  border-color: #2b4cf2;
}

.kartu-judul .judul {
  font-size: 17px;
  color: #222;
  margin-bottom: 7px;
}

.kartu-judul .tombol-favorit {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 9999;
}
```

> [!jawaban]
>
> Delapan pelanggaran, dan masing-masing punya akibat yang konkret:
>
> 1. **`#ffffff` dan `#e5e5e5` langsung.** Di mode gelap, kartu ini akan tetap putih. Ini pelanggaran yang paling mahal.
> 2. **`border-radius: 11px`.** Angka yang tidak ada di skala mana pun, jadi kartu ini sedikit berbeda dari semua kartu lain tanpa alasan.
> 3. **`padding: 14px` dan `margin-bottom: 18px`.** Dua nilai di luar skala. Dari jauh terlihat sebagai "agak tidak rapi".
> 4. **Ukuran font `17px` dalam piksel.** Tidak ikut membesar saat pengguna memperbesar teks, dan itu kegagalan aksesibilitas.
> 5. **`color: #222`.** Varian abu kelima yang tidak ada di sistem.
> 6. **`margin-bottom: 7px`.** Sama dengan nomor 3, plus angka ganjil yang jelas hasil mencocokkan dengan mata.
> 7. **`z-index: 5` dan `z-index: 9999`.** Tidak ada yang tahu kedua angka ini relatif terhadap apa. Yang kedua adalah tanda seseorang pernah kalah berperang.
> 8. **`margin-bottom` pada kartu untuk mengatur jarak antar kartu.** Jarak antar item adalah tanggung jawab wadahnya, dan `gap` menyelesaikannya tanpa margin yang menumpuk atau tersisa di item terakhir.
>
> ```css
> .daftar-judul {
>   display: grid;
>   grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
>   gap: var(--jarak-6); /* jarak diurus wadah, bukan item */
> }
>
> .kartu-judul {
>   position: relative;
>   background: var(--warna-latar-naik);
>   border: 1px solid var(--warna-garis);
>   border-radius: var(--radius);
>   padding: var(--jarak-4);
>   box-shadow: var(--bayangan-kecil);
> }
>
> .kartu-judul:hover {
>   border-color: var(--warna-aksi);
> }
>
> .kartu-judul .judul {
>   font-size: var(--teks-lg);
>   color: var(--warna-teks);
>   margin-bottom: var(--jarak-2);
> }
>
> .kartu-judul .tombol-favorit {
>   position: absolute;
>   inset-block-start: var(--jarak-3);
>   inset-inline-end: var(--jarak-3);
>   z-index: var(--tumpukan-konten-atas);
> }
> ```
>
> Perhatikan `inset-inline-end` menggantikan `right`. Itu properti logis dari modul 3, dan nilainya baru terasa saat suatu hari ada versi bahasa dengan arah tulisan kanan ke kiri.

### Latihan 3: Satu komponen tombol untuk seluruh aplikasi

Buat komponen `Tombol` yang menggantikan semua tombol di Proyek 2, dengan syarat: tiga varian (utama, kedua, bahaya), dua ukuran, keadaan memuat dengan penanda dan tombol yang tidak bisa diklik dua kali, bisa dipakai sebagai tautan kalau diberi `href`, dan menerima `className` dari luar.

> [!pembahasan]
>
> ```tsx
> type TombolDasarProps = {
>   varian?: 'utama' | 'kedua' | 'bahaya';
>   ukuran?: 'kecil' | 'sedang';
>   sedangMemuat?: boolean;
> };
>
> type TombolProps = TombolDasarProps &
>   (
>     | ({ href: string } & React.ComponentProps<'a'>)
>     | ({ href?: never } & React.ComponentProps<'button'>)
>   );
>
> export function Tombol({
>   varian = 'utama',
>   ukuran = 'sedang',
>   sedangMemuat = false,
>   className,
>   children,
>   ...sisa
> }: TombolProps) {
>   const kelas = clsx(dasar, gayaVarian[varian], gayaUkuran[ukuran], className);
>
>   if ('href' in sisa && sisa.href) {
>     return (
>       <a className={kelas} {...(sisa as React.ComponentProps<'a'>)}>
>         {children}
>       </a>
>     );
>   }
>
>   const propsTombol = sisa as React.ComponentProps<'button'>;
>
>   return (
>     <button
>       type={propsTombol.type ?? 'button'}
>       className={kelas}
>       disabled={propsTombol.disabled || sedangMemuat}
>       aria-busy={sedangMemuat || undefined}
>       {...propsTombol}
>     >
>       {sedangMemuat && <Pemutar aria-hidden="true" />}
>       {children}
>     </button>
>   );
> }
> ```
>
> Lima keputusan yang membuatnya layak dipakai di proyek nyata:
>
> 1. **`type` bawaan `'button'`.** Tombol di dalam form tanpa `type` akan mengirim form itu, dan bug ini sangat sering terjadi.
> 2. **`disabled` saat memuat.** Menghindari pengiriman ganda, yang pada form pembayaran berarti transaksi dobel.
> 3. **`aria-busy`,** supaya pembaca layar tahu tombolnya sedang bekerja. Penanda berputar diberi `aria-hidden` karena tidak membawa informasi untuk yang tidak melihatnya.
> 4. **`href` menentukan elemennya.** Modul 2 masih berlaku: navigasi memakai `a`, aksi memakai `button`. Satu komponen boleh melayani keduanya, tapi elemen yang dihasilkan harus benar.
> 5. **`className` diletakkan terakhir** supaya bisa ditimpa. Kalau Anda memakai Tailwind, pertimbangkan `tailwind-merge` supaya `p-8` dari luar benar-benar menggantikan `px-5 py-2.5`, bukan bertabrakan dengannya.

### Latihan 4: Pilih pendekatannya

Untuk tiga situasi ini, pilih pendekatan styling dan tulis alasannya dalam dua tiga kalimat.

| | Situasi |
| --- | --- |
| **A** | Startup dengan dua frontend engineer, aplikasi dasbor baru, target rilis enam minggu, tanpa desainer tetap |
| **B** | Perusahaan dengan lima produk, satu tim design system, 40 engineer, merek yang ketat |
| **C** | Proyek lama dengan 800 berkas styled-components, sedang bermigrasi ke Next.js App Router |

> [!pembahasan]
>
> **A: Tailwind, tanpa ragu.** Dua orang tanpa desainer tetap paling diuntungkan oleh sistem yang memaksa konsistensi lewat skala bawaan. Tidak ada CSS mati, tidak ada rapat soal penamaan kelas, dan komponen yang diambil dari shadcn/ui memberi awalan yang masuk akal. Yang perlu dijaga satu hal: sepakati sejak awal bahwa nilai sembarang harus dibicarakan, bukan ditulis diam-diam.
>
> **B: design system sendiri di atas token, dengan headless component.** Di skala ini yang dibutuhkan bukan cara menulis CSS, tapi kontrak: token yang dipublikasikan sebagai paket, komponen dengan perilaku yang sudah benar dari Radix atau React Aria, dan dokumentasi yang bisa dibuka 40 orang. Pilihan sintaksisnya (CSS Modules atau vanilla-extract) jadi detail. Yang menentukan: siapa yang berhak menambah token, dan bagaimana perubahan token dirilis ke lima produk.
>
> **C: jangan migrasi besar-besaran, dan prioritaskan jalur render.** styled-components menghitung gaya saat runtime, jadi komponennya harus jadi Client Component dan tidak bisa dirender di server. Strategi yang masuk akal: biarkan yang ada, tapi tetapkan aturan bahwa komponen baru memakai pendekatan nol runtime, dan pindahkan lebih dulu komponen yang berada di jalur tampilan pertama (header, kerangka halaman, kartu di halaman utama). Penulisan ulang 800 berkas sekaligus adalah proyek enam bulan yang tidak menghasilkan satu pun fitur, dan hampir selalu ditinggalkan di tengah jalan.

## Batasnya

Sistem token dan pendekatan styling menyelesaikan konsistensi tampilan, dan tidak menyentuh tiga hal.

**Tidak membuat desain Anda bagus.** Token menjamin keseragaman. Pilihan warna, hierarki, dan ritme tetap keputusan desain.

**Tidak menjamin aksesibilitas.** Token warna bisa seragam dan sekaligus gagal kontras di semua tempat. Modul 16 mengukurnya.

**Tidak mengurus data.** Kartu yang sekarang rapi masih memuat datanya sendiri dari nol setiap kali muncul, dan itu keluhan kedua dari Proyek 2 yang belum terjawab.

## Rangkuman

- Nilai desain butuh satu sumber kebenaran, sama seperti state. Warna yang disalin di 40 tempat adalah 40 kesempatan untuk berselisih.
- Token disusun tiga lapis: primitif menyebut nilai, semantik menyebut peran, komponen untuk yang perlu diatur dari luar. Komponen tidak pernah memakai primitif.
- Skala jarak dan tipografi adalah daftar tertutup. Nilai sembarang adalah tanda skalanya kurang lengkap.
- Mode gelap cukup memetakan ulang lapis semantik, dan skrip kecil sebelum first paint menghilangkan kedipan.
- Tailwind untuk aplikasi baru, CSS Modules kalau tim tidak nyaman dengan utility. Hindari CSS-in-JS runtime untuk proyek baru.
- Utility berada di layer paling belakang, jadi selalu menang atas aturan komponen.
- Dialog, menu, dan combobox punya aturan perilaku yang banyak. Pakai elemen bawaan atau library headless sebelum membuat sendiri.

## Masalah terbuka

Aplikasi Anda sekarang rapi dan konsisten. Keluhan kedua dari Proyek 2 masih berdiri, dan sekarang bisa dirinci:

1. `useHasilCari` dan `useDetail` punya kode yang hampir sama: penundaan, pembatalan, empat keadaan, penanganan error.
2. Pengguna yang membuka detail lalu menekan kembali menunggu pencarian yang sama dimuat ulang dari nol.
3. Dua komponen yang butuh data sama memanggil API dua kali.
4. Tidak ada cara menyegarkan data di latar belakang tanpa tampilan berkedip ke keadaan memuat.
5. Setelah pengguna menambah favorit, daftar di halaman lain masih menampilkan data lama.

Kelimanya masalah yang sudah diselesaikan orang lain, berulang kali, dan jawabannya bukan menulis hook yang lebih pintar.

Itu isi modul berikutnya: lapisan data dengan cache, status yang jujur, pembaruan di latar belakang, dan pembaruan optimistis.
