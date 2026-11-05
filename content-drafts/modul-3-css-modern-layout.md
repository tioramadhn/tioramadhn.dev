---
title: 'Modul 3: CSS Modern, Layout, dan Responsif'
description: Anda menulis instruksi tata letak untuk ruangan yang ukurannya belum diketahui. Cascade, box model, flexbox, grid, dan container query adalah cara menulis instruksi itu tanpa menebak.
date: 2026-11-09
slug: modul-3-css-modern-layout
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Markup Anda sudah bermakna, dan tampilannya masih satu kolom teks hitam di atas putih. Sekarang desainer mengirim rancangan: tiga kolom di layar lebar, satu kolom di HP, kartu yang tingginya sama meski isinya berbeda panjang, dan mode gelap.

Masalahnya, Anda tidak tahu tiga hal yang paling menentukan hasilnya:

| Yang tidak Anda ketahui | Akibatnya |
| --- | --- |
| Lebar layar pengguna | Ukuran tetap dalam piksel akan salah di salah satu ujung |
| Panjang teks dari database | Judul yang di desain dua kata bisa jadi dua belas kata |
| Pengaturan pengguna | Teks diperbesar ke 200%, mode gelap, animasi dikurangi |

CSS sering dikeluhkan karena terasa tidak bisa diduga. Sebagian besar keluhan itu sebenarnya berasal dari satu kesalahpahaman: CSS diperlakukan seperti alat menggambar, padahal fungsinya memberi instruksi. Yang menggambar adalah browser, di ruangan yang ukurannya baru diketahui saat halaman dibuka.

## Analogi: instruksi untuk penata ruang yang belum melihat ruangannya

Bayangkan Anda menyewa penata ruang, tapi tidak bisa menemuinya dan tidak tahu ukuran ruangan yang akan ditata. Yang bisa Anda kirim hanya catatan instruksi.

Instruksi yang buruk: "taruh sofa 300 cm dari dinding kiri". Di ruangan sempit, sofanya menembus dinding kanan.

Instruksi yang baik: "sofa dan rak berdampingan dengan jarak satu jengkal, dan kalau ruangannya lebih sempit dari dua meter, tumpuk jadi satu kolom".

Seluruh isi modul ini adalah cara menulis instruksi jenis kedua. CSS modern punya alat untuk itu: `flex` dan `grid` untuk hubungan antar elemen, `gap` untuk jarak, `min()`, `max()`, dan `clamp()` untuk batas, serta media query dan container query untuk syarat.

| Dunia penata ruang | Dunia CSS |
| --- | --- |
| Ukuran ruangan yang belum diketahui | Viewport dan lebar container |
| "Berdampingan, jarak satu jengkal" | `display: flex; gap: 1rem` |
| "Kalau lebih sempit dari dua meter, tumpuk" | Media query atau container query |
| "Tidak boleh lebih sempit dari 20 cm" | `min-width`, `minmax()` |
| Perabot yang ukurannya mengikuti isinya | `min-content`, `max-content`, `fit-content` |
| Satu kaleng cat yang dipakai di banyak sudut | Custom property, misalnya `--warna-aksen` |

Batas analoginya: penata ruang bekerja sekali lalu selesai, sedangkan CSS dievaluasi ulang setiap kali layar berubah ukuran, teks berubah panjang, atau pengguna mengubah pengaturannya. Jadi instruksi Anda harus benar untuk semua ukuran sekaligus, bukan untuk satu ukuran tertentu.

## Cara kerjanya: cascade, spesifisitas, dan warisan

Tiga mekanisme ini sumber dari hampir semua kejadian "kenapa CSS saya tidak jalan".

**Cascade** adalah urutan penentuan pemenang saat dua aturan mengenai elemen yang sama. Urutan pemeriksaannya, dari yang paling menentukan:

1. **Origin dan `!important`.** Gaya penulis mengalahkan gaya bawaan browser, dan `!important` membalik urutannya.
2. **Cascade layer.** Aturan di layer yang dideklarasikan belakangan menang, terlepas dari spesifisitas.
3. **Spesifisitas.** Dihitung dari tiga angka: id, lalu kelas beserta atribut dan pseudo-class, lalu elemen.
4. **Urutan kemunculan.** Kalau semua di atas sama, yang ditulis terakhir menang.

Contoh perhitungan spesifisitas:

```css
/* 0,1,0 */
.tombol { background: blue; }

/* 0,2,1 */
.kartu .tombol:hover { background: navy; }

/* 1,0,0: menang atas keduanya, dan sulit ditimpa */
#kirim { background: gray; }
```

Angka ketiga itu alasan kenapa selektor dengan id dan `!important` dihindari di proyek bersama: begitu dipakai, satu-satunya cara menimpanya adalah memakai yang lebih buruk lagi.

**Cascade layer** adalah cara modern keluar dari perang spesifisitas:

```css
@layer reset, dasar, komponen, utilitas;

@layer komponen {
  .tombol { background: blue; }
}

@layer utilitas {
  /* Menang meski spesifisitasnya lebih rendah, karena layernya belakangan */
  .bg-merah { background: red; }
}
```

Situs ini memakai mekanisme itu, dan satu catatan di dokumentasinya layak dicatat sebagai pelajaran: utility Tailwind berada di layer yang lebih belakang daripada komponen, jadi satu kelas `hidden` akan mengalahkan aturan komponen yang justru dipakai untuk menyembunyikan elemen itu. Urutan layer mengalahkan spesifisitas, selalu.

**Warisan** membuat sebagian properti menurun ke anak, dan sebagian tidak. `color`, `font-family`, dan `line-height` menurun. `background`, `padding`, `border`, dan semua properti layout tidak. Itu sebabnya mengatur `font-family` satu kali di `body` cukup, sementara `border` harus ditulis di setiap elemen yang membutuhkannya.

## Box model dan satuan

Setiap elemen adalah kotak dengan empat lapis: content, padding, border, margin. Satu baris di awal proyek menghilangkan kebingungan terbesarnya:

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}
```

Tanpa baris itu, `width: 300px` berarti lebar isinya saja, sehingga padding dan border menambah lebar total. Dengan `border-box`, `width: 300px` berarti lebar totalnya, persis seperti yang dimaksud desainer.

Satuan yang dipakai menentukan apakah halaman Anda menghormati pengaturan pengguna:

| Satuan | Relatif terhadap | Dipakai untuk |
| --- | --- | --- |
| `px` | Piksel tetap | Border, shadow, hal yang memang tidak boleh ikut membesar |
| `rem` | Ukuran font root | Ukuran teks, jarak, radius. Ikut membesar saat pengguna memperbesar teks |
| `em` | Ukuran font elemen itu | Jarak yang harus menyesuaikan ukuran teks lokal, misalnya padding tombol |
| `%` | Ukuran elemen induk | Lebar di dalam container |
| `ch` | Lebar karakter "0" | Batas lebar baris teks, misalnya `max-width: 70ch` |
| `svh`, `dvh` | Tinggi viewport | Tinggi layar penuh di HP, tanpa masalah bilah alamat yang muncul hilang |
| `fr` | Sisa ruang di grid | Pembagian kolom |

Aturan praktisnya: ukuran teks dan jarak memakai `rem`, lebar baca memakai `ch`, pembagian ruang memakai `fr` dan persen, dan `px` hanya untuk hal yang benar-benar tidak boleh berubah. Mengatur ukuran font dalam `px` membuat pengaturan "teks lebih besar" di browser pengguna tidak berpengaruh, dan itu kegagalan aksesibilitas yang nyata.

## Flexbox atau grid

Dua sistem layout ini sering dipertentangkan, padahal pembagiannya jelas:

| | Flexbox | Grid |
| --- | --- | --- |
| Arahnya | Satu dimensi: baris atau kolom | Dua dimensi: baris dan kolom sekaligus |
| Ukuran ditentukan | Oleh isinya | Oleh container lewat template |
| Cocok untuk | Toolbar, baris tombol, item navigasi, label di samping ikon | Rangka halaman, galeri kartu, tabel yang bukan tabel data |
| Pertanyaan penentunya | "Barang-barang ini berbaris, dan panjangnya ikut isinya" | "Saya sudah tahu bentuk petaknya, isinya menyesuaikan" |

Pola flexbox yang paling sering dipakai:

```css
/* Logo di kiri, menu di kanan, rata tengah secara vertikal */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

/* Baris yang otomatis turun saat kehabisan ruang, tanpa media query */
.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
```

Pola grid yang paling sering dipakai:

```css
/* Galeri kartu: sebanyak mungkin kolom, minimal 16rem, tanpa satu pun media query */
.galeri {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1.5rem;
}

/* Rangka halaman dengan nama area, mudah dibaca dan mudah diubah */
.layout {
  display: grid;
  grid-template-columns: 16rem 1fr;
  grid-template-areas:
    'sidebar konten'
    'sidebar footer';
  gap: 2rem;
}

.layout > nav { grid-area: sidebar; }
.layout > main { grid-area: konten; }
```

`repeat(auto-fit, minmax(16rem, 1fr))` layak dihafal. Satu baris itu menghasilkan galeri responsif untuk semua ukuran layar, dan menggantikan tiga sampai empat media query yang biasa ditulis orang.

## Responsif yang dimulai dari konten

Cara lama: pilih breakpoint berdasarkan ukuran perangkat populer. Masalahnya, perangkat berganti setiap tahun dan ukurannya tidak pernah berhenti bertambah.

Cara yang bertahan: tulis gaya untuk layar sempit lebih dulu, lalu tambahkan aturan saat ruangnya cukup. Breakpoint-nya ditentukan dari titik ketika tata letak Anda mulai jelek, bukan dari nama perangkat.

```css
/* Dasar: satu kolom, berlaku di mana saja */
.kartu-list {
  display: grid;
  gap: 1rem;
}

/* Saat ruang cukup untuk dua kolom yang nyaman, barulah dua kolom */
@media (min-width: 40rem) {
  .kartu-list {
    grid-template-columns: 1fr 1fr;
  }
}
```

Tiga alat yang mengurangi jumlah media query secara drastis:

**`clamp()` untuk nilai yang ikut bernapas.** Satu deklarasi menggantikan tiga breakpoint ukuran font:

```css
h1 {
  /* Minimal 1.75rem, ideal 4% lebar viewport, maksimal 3rem */
  font-size: clamp(1.75rem, 4vw, 3rem);
}
```

**Container query untuk komponen yang dipakai di banyak tempat.** Media query melihat lebar layar, padahal yang menentukan tampilan sebuah kartu adalah lebar wadahnya. Kartu yang sama bisa berada di konten utama yang lebar dan di sidebar yang sempit pada layar yang sama.

```css
.kolom-kartu {
  container-type: inline-size;
}

/* Berlaku saat wadahnya lebar, bukan saat layarnya lebar */
@container (min-width: 28rem) {
  .kartu {
    display: grid;
    grid-template-columns: 8rem 1fr;
    gap: 1rem;
  }
}
```

**Properti logis supaya arah tulisan tidak mengunci Anda.** `margin-inline-start` dan `padding-block` menggantikan `margin-left` dan `padding-top`, dan ikut benar saat suatu hari situs Anda punya versi bahasa Arab.

## Tema, warna, dan menghormati pengaturan pengguna

Custom property mengubah tema dari pekerjaan dua minggu jadi satu blok CSS:

```css
:root {
  --warna-latar: #ffffff;
  --warna-teks: #11100f;
  --warna-aksen: #2b4cf2;
  --radius: 0.75rem;
}

@media (prefers-color-scheme: dark) {
  :root {
    --warna-latar: #11100f;
    --warna-teks: #f5f3ef;
    --warna-aksen: #8aa2ff;
  }
}

body {
  background: var(--warna-latar);
  color: var(--warna-teks);
}
```

Tiga pengaturan pengguna yang wajib dihormati:

```css
/* Pengguna yang mual karena animasi */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Lalu `color-scheme: light dark` pada `:root`, supaya kontrol bawaan browser seperti scrollbar dan date picker ikut bertema. Dan jangan pernah menghapus indikator fokus:

```css
/* Salah: pengguna keyboard langsung kehilangan arah */
*:focus { outline: none; }

/* Benar: ganti tampilannya, jangan hilangkan */
:focus-visible {
  outline: 3px solid var(--warna-aksen);
  outline-offset: 2px;
}
```

Soal kontras, patokan WCAG: teks biasa minimal 4.5:1 terhadap latarnya, teks besar minimal 3:1. Angka ini bisa dicek di DevTools saat memilih warna, dan akan kembali di modul 15.

## Opsi pendekatan styling

| Pendekatan | Cara kerjanya | Contoh | Kapan dipilih |
| --- | --- | --- | --- |
| CSS biasa dengan konvensi nama | Satu file, nama kelas disiplin | BEM | Situs kecil, halaman statis |
| CSS Modules | Nama kelas diacak per komponen | `styles.module.css` | Proyek komponen tanpa utility |
| Utility class | Kelas kecil sekali guna | Tailwind | Tim yang butuh konsistensi cepat |
| CSS-in-JS | Gaya ditulis di dalam JavaScript | styled-components | Proyek lama, makin jarang dipilih |

Modul 10 membahas pilihan ini dengan serius, termasuk kenapa CSS-in-JS yang menghitung gaya saat runtime kehilangan tempat di era server rendering. Untuk sekarang cukup tahu bahwa semuanya menghasilkan CSS yang sama, dan yang Anda pelajari di modul ini berlaku pada semuanya.

## Latihan

### Latihan 1: Galeri tanpa media query

Buat halaman dengan enam kartu berisi judul, gambar, dan deskripsi. Syaratnya: tiga kolom di layar lebar, dua kolom di tablet, satu kolom di HP, tanpa menulis satu pun media query. Setiap kartu minimal 16rem, jarak antar kartu 1.5rem, dan tombol di setiap kartu harus rata bawah meski panjang deskripsinya berbeda.

> [!petunjuk]
> Dua lapis. Lapisan luar grid dengan `auto-fit` dan `minmax`. Lapisan dalam setiap kartu memakai flex kolom, dengan satu elemen yang mengambil sisa ruang supaya tombolnya terdorong ke bawah.

> [!jawaban]
>
> ```css
> .galeri {
>   display: grid;
>   grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
>   gap: 1.5rem;
> }
>
> .kartu {
>   display: flex;
>   flex-direction: column;
>   gap: 0.75rem;
>   padding: 1rem;
>   border: 1px solid #ddd;
>   border-radius: var(--radius, 0.75rem);
> }
>
> .kartu img {
>   aspect-ratio: 16 / 9;
>   width: 100%;
>   object-fit: cover;
> }
>
> /* Mendorong tombol ke dasar kartu */
> .kartu p {
>   flex: 1;
> }
> ```
>
> Tiga hal yang membuat ini bekerja:
>
> 1. `auto-fit` dengan `minmax` membuat jumlah kolom dihitung browser dari ruang yang tersedia, jadi tidak ada angka breakpoint yang perlu dirawat.
> 2. `flex: 1` pada paragraf membuatnya menyerap sisa tinggi, sehingga tombol selalu menempel di bawah. Ini jawaban untuk "kartu dengan panjang isi berbeda".
> 3. `aspect-ratio` memesan ruang gambar sebelum gambarnya datang, dan itu mencegah CLS yang Anda lihat di latihan modul 1.

### Latihan 2: Kenapa warnanya tidak berubah

Seorang rekan menulis CSS berikut dan melapor bahwa tombol hapus tetap biru, padahal kelas `.tombol-hapus` sudah dipasang di HTML.

```css
#panel .tombol {
  background: blue;
}

.tombol-hapus {
  background: red;
}
```

```html
<div id="panel">
  <button class="tombol tombol-hapus">Hapus</button>
</div>
```

Jelaskan penyebabnya, lalu berikan dua perbaikan: satu yang cepat dan satu yang benar untuk proyek bersama.

> [!petunjuk]
> Hitung spesifisitas kedua selektor dalam tiga angka: id, kelas, elemen. Urutan penulisan hanya menentukan pemenang kalau angkanya sama.

> [!pembahasan]
>
> `#panel .tombol` bernilai 1,1,0 sedangkan `.tombol-hapus` bernilai 0,1,0. Selektor pertama menang karena punya satu id, dan urutan penulisan tidak berpengaruh sama sekali.
>
> **Perbaikan cepat yang sebaiknya tidak jadi kebiasaan:** naikkan spesifisitasnya, misalnya `#panel .tombol-hapus`. Berhasil, tapi masalahnya menular. Setiap aturan baru harus ikut memakai id, dan beberapa bulan kemudian seseorang akan memakai `!important` untuk menembusnya.
>
> **Perbaikan yang benar:** hapus id dari selektor dan pakai cascade layer, supaya pemenangnya ditentukan arsitektur, bukan lomba spesifisitas.
>
> ```css
> @layer komponen, varian;
>
> @layer komponen {
>   .tombol { background: blue; }
> }
>
> @layer varian {
>   .tombol-hapus { background: red; }
> }
> ```
>
> Sekarang varian selalu menang atas komponen, dengan spesifisitas yang sama rendah dan tanpa `!important`. Aturan praktisnya: id untuk JavaScript dan `label for`, kelas untuk styling.

### Latihan 3: Rangka dasbor

Bangun rangka halaman dasbor: header penuh di atas, sidebar 16rem di kiri, konten utama di kanan, dan footer di bawah konten utama saja (tidak melewati sidebar). Di bawah 48rem, sidebar pindah jadi daftar menu horizontal di atas konten. Pakai `grid-template-areas`, dan pastikan sidebar tetap terlihat saat halaman digulir di layar lebar.

> [!pembahasan]
>
> ```css
> .app {
>   display: grid;
>   gap: 1.5rem;
>   grid-template-areas:
>     'header'
>     'nav'
>     'konten'
>     'footer';
> }
>
> @media (min-width: 48rem) {
>   .app {
>     grid-template-columns: 16rem 1fr;
>     grid-template-areas:
>       'header header'
>       'nav konten'
>       'nav footer';
>   }
>
>   .app > nav {
>     position: sticky;
>     /* Tinggi header ditulis sekali sebagai variabel, bukan ditebak */
>     top: calc(var(--tinggi-header) + 1rem);
>     align-self: start;
>   }
> }
>
> .app > header { grid-area: header; }
> .app > nav { grid-area: nav; }
> .app > main { grid-area: konten; }
> .app > footer { grid-area: footer; }
> ```
>
> Empat hal yang sering salah di latihan ini:
>
> 1. **Urutan markup.** Susunan HTML tetap header, nav, main, footer. Grid hanya mengubah posisi visual, dan urutan Tab tetap mengikuti markup. Menata ulang secara visual sampai urutan fokusnya aneh adalah bug aksesibilitas.
> 2. **`align-self: start`.** Tanpa baris ini, nav merentang setinggi barisnya dan `position: sticky` tidak terasa efeknya.
> 3. **Tinggi header sebagai variabel.** Menebak offset dengan angka acak adalah penyebab sidebar yang menyelip di bawah header. Tulis tingginya sekali sebagai custom property, lalu rujuk di mana pun dibutuhkan.
> 4. **Breakpoint dalam `rem`.** Dengan `rem`, tata letak ikut berpindah saat pengguna memperbesar teksnya, dan itu yang diinginkan.

### Latihan 4: Audit satu komponen Anda sendiri

Ambil satu komponen yang sudah Anda buat, lalu uji lima keadaan berikut dan catat yang rusak:

| # | Pengujian | Cara |
| --- | --- | --- |
| 1 | Teks dua belas kata di judul yang didesain dua kata | Ubah langsung di DevTools |
| 2 | Teks diperbesar 200% | Ctrl atau Cmd dengan plus beberapa kali |
| 3 | Mode gelap | Di DevTools, Rendering, lalu `prefers-color-scheme: dark` |
| 4 | Animasi dikurangi | Di DevTools, Rendering, lalu `prefers-reduced-motion: reduce` |
| 5 | Navigasi keyboard | Tab sampai masuk ke komponen itu |

**Pertanyaannya:** berapa dari lima keadaan itu yang rusak? Pada proyek nyata, hampir selalu minimal dua. Kelima pengujian ini butuh waktu kurang dari tiga menit, dan jauh lebih murah daripada menerima laporan bug seminggu kemudian.

## Batasnya

CSS mengurus tampilan dan menolak mengurus logika, dan batas itu sehat. Ada tiga hal yang akan mendorong Anda keluar dari CSS.

Pertama, keadaan yang bergantung pada data. CSS tahu hover, fokus, dan checked, tapi tidak tahu "pengguna sudah login" atau "stok tinggal tiga".

Kedua, isi yang datang dari server. CSS tidak bisa mengambil data, dan `content` pada pseudo-element bukan tempat menaruh teks yang berarti karena tidak terbaca semua pembaca layar.

Ketiga, urutan dan jumlah elemen. Grid bisa menata sepuluh kartu, tapi yang memutuskan ada sepuluh kartu adalah kode yang membuatnya.

Satu catatan yang menghemat waktu Anda bertahun-tahun: sebelum menjangkau JavaScript, periksa dulu apakah CSS sudah bisa. Menu buka tutup bisa dengan `details` dan `summary`, dialog dengan elemen `dialog`, animasi masuk halaman dengan `@keyframes`, dan penanda tab aktif dengan `:has()`. Setiap pekerjaan yang bisa diserahkan ke CSS adalah pekerjaan yang tidak membebani main thread.

## Rangkuman

- CSS adalah instruksi untuk ruangan yang ukurannya belum diketahui. Nilai tetap dalam piksel adalah dugaan tentang ruangan itu.
- Cascade menentukan pemenang lewat origin, layer, spesifisitas, lalu urutan. Layer mengalahkan spesifisitas, dan itu jalan keluar dari perang `!important`.
- `box-sizing: border-box` di awal proyek menghapus sebagian besar kebingungan ukuran.
- Flexbox untuk satu arah yang ukurannya ikut isinya, grid untuk petak dua dimensi yang bentuknya sudah Anda tentukan.
- `repeat(auto-fit, minmax(…, 1fr))` dan `clamp()` menggantikan banyak media query. Container query membuat komponen menyesuaikan wadahnya, bukan layarnya.
- Satuan `rem` dan `ch` menghormati pengaturan pengguna, `px` tidak. Jangan pernah menghapus indikator fokus, cukup gantikan tampilannya.
- Custom property membuat tema, mode gelap, dan konsistensi nilai jadi pekerjaan satu blok.

## Masalah terbuka

Halaman Anda sekarang bermakna dan tampil benar di layar mana pun. Tapi tetap diam.

Tombol "Tambah ke keranjang" tidak menambah apa pun. Form pencarian hanya bisa mengirim dan memuat ulang seluruh halaman. Daftar produk harus ditulis tangan satu per satu di HTML, padahal datanya ada di server dan berubah tiap jam. Dan menu yang harus menutup saat pengguna menekan Escape tidak punya cara untuk tahu Escape ditekan.

Supaya halaman bisa bereaksi, mengambil data, dan mengubah dirinya sendiri, Anda butuh bahasa pemrograman yang berjalan di browser.

Itu isi modul berikutnya: JavaScript, mulai dari bagian bahasa yang benar-benar dipakai setiap hari sampai cara menangani pekerjaan yang butuh waktu seperti permintaan jaringan.
