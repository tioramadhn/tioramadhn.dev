---
title: 'Modul 2: HTML Semantik, Struktur Dokumen, dan Form'
description: Dua potongan markup bisa identik di layar tapi berbeda jauh bagi keyboard, pembaca layar, dan mesin pencari. Pilihan elemen adalah keputusan teknis, bukan selera.
date: 2026-11-08
slug: modul-2-html-semantik
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Modul sebelumnya ditutup dengan dua potongan yang terlihat sama di layar:

```html
<div class="tombol" onclick="kirim()">Kirim</div>

<button type="submit">Kirim</button>
```

Dengan CSS yang sama, keduanya kotak biru bertulisan "Kirim". Perbedaannya baru terlihat saat pengguna tidak memakai mouse, atau tidak melihat layar sama sekali.

| Kemampuan | `div` dengan `onclick` | `button` |
| --- | --- | --- |
| Dijangkau tombol Tab | Tidak | Ya |
| Merespons Enter dan spasi | Tidak | Ya |
| Dibacakan sebagai "tombol" | Tidak | Ya |
| Ikut mengirim form | Tidak | Ya |
| Bisa dinonaktifkan dengan `disabled` | Tidak | Ya |
| Muncul di daftar kontrol pembaca layar | Tidak | Ya |

Enam baris kemampuan itu Anda dapat gratis, hanya dengan memilih elemen yang benar. Kalau memilih `div`, keenamnya harus dikerjakan ulang dengan tangan, dan di tempat kerja hampir tidak pernah dikerjakan sampai lengkap.

## Kenapa ini sering salah

HTML terasa mudah karena hasilnya langsung terlihat. Begitu tampilannya cocok dengan desain, pekerjaan terasa selesai. Masalahnya, tampilan cuma satu dari empat pembaca markup Anda:

1. **Browser**, yang menggambarnya di layar.
2. **Teknologi bantu**, yaitu pembaca layar, navigasi keyboard, dan kendali suara, yang membaca struktur bukan tampilan.
3. **Mesin pencari dan pratinjau tautan**, yang mengambil judul, deskripsi, dan hierarki heading.
4. **Rekan satu tim**, termasuk Anda enam bulan kemudian.

Tiga dari empat pembaca itu tidak melihat CSS Anda sama sekali. Mereka hanya punya struktur dan makna. Kalau strukturnya hanya tumpukan `div`, yang mereka terima adalah dokumen tanpa petunjuk apa pun.

Di Indonesia ada alasan tambahan yang jarang disebut: sebagian besar pengunjung memakai HP kelas menengah dengan jaringan yang kadang tersendat. Pada keadaan itu, CSS dan JavaScript bisa datang terlambat atau gagal sama sekali. Yang tersisa adalah HTML. Markup yang bermakna membuat halaman tetap berguna di keadaan terburuk, dan itu alasan teknis, bukan idealisme.

## Analogi: dokumen yang headingnya dibold manual

Bayangkan dua dokumen dengan tampilan cetak yang persis sama.

**Dokumen pertama** dibuat oleh orang yang menandai setiap judul bab dengan cara memblok teks, membesarkan ukuran font, lalu menebalkannya.

**Dokumen kedua** dibuat oleh orang yang memakai gaya "Heading 1" dan "Heading 2".

Dicetak, keduanya tidak bisa dibedakan. Tapi pada dokumen kedua Anda bisa membuat daftar isi otomatis, melompat antar bab dari panel navigasi, mengubah seluruh tampilan judul dalam satu klik, dan mengekspornya ke format lain tanpa kehilangan struktur. Pada dokumen pertama semua itu mustahil, karena informasi "ini judul bab" tidak pernah benar-benar disimpan. Yang disimpan hanya "teks ini besar dan tebal".

Pembaca layar bekerja seperti panel navigasi itu. Penggunanya tidak membaca halaman dari atas ke bawah, tapi melompat antar heading, antar landmark, dan antar form control. Halaman tanpa struktur memaksa mereka membaca semuanya berurutan, setiap kali.

Pemetaannya:

| Dunia dokumen | Dunia HTML |
| --- | --- |
| Gaya "Heading 1" sampai "Heading 3" | `h1` sampai `h6` |
| Daftar isi otomatis | Navigasi antar heading di pembaca layar |
| Panel navigasi dokumen | Landmark: `header`, `nav`, `main`, `footer` |
| Teks yang hanya dibesarkan dan ditebalkan | `div` dengan `class="judul"` |
| Caption gambar | `figure` dan `figcaption` |
| Formulir cetak dengan label di sebelah kotak | `label` yang terhubung ke `input` |

Batas analoginya: dokumen dibaca satu arah, halaman web bisa diklik, diisi, dan berubah. Karena itu HTML punya satu urusan yang tidak dimiliki dokumen cetak, yaitu interaksi, dan di situ pemilihan elemen jadi makin menentukan.

## Cara kerjanya: accessibility tree

Modul 1 menyebut browser mengubah HTML jadi DOM. Ada satu pohon lagi yang dibangun bersamaan dan jarang dibahas: **accessibility tree**. Isinya versi sederhana dari DOM, tempat setiap elemen diringkas jadi tiga hal:

- **Role**: perannya, misalnya button, link, heading, textbox, list.
- **Name**: namanya yang akan dibacakan, biasanya dari teks di dalamnya atau dari `label`.
- **State**: keadaannya, misalnya checked, disabled, expanded, invalid.

Pembaca layar tidak membaca DOM, tapi pohon ini. Jadi pertanyaan yang benar saat menulis markup bukan "apakah tampilannya mirip desain", tapi "apa role, name, dan state yang dihasilkan baris ini".

Anda bisa melihatnya langsung. Di Chrome DevTools, buka tab **Elements**, pilih sebuah elemen, lalu lihat panel **Accessibility** di sisi kanan.

Yang Anda dapat gratis dari elemen bawaan:

| Elemen | Role bawaan | Yang ikut didapat |
| --- | --- | --- |
| `button` | button | Fokus keyboard, Enter dan spasi, `disabled` |
| `a` dengan `href` | link | Fokus keyboard, Enter, menu konteks "buka di tab baru" |
| `input type="checkbox"` | checkbox | State checked, spasi untuk mengubah |
| `select` | combobox | Navigasi panah, pencarian huruf pertama |
| `details` dan `summary` | group dan button | Buka tutup tanpa JavaScript, state expanded |
| `dialog` | dialog | Fokus terkunci di dalam, Escape untuk menutup |
| `table` dengan `th` | table | Navigasi antar sel dan pembacaan judul kolom |
| `h1` sampai `h6` | heading beserta levelnya | Navigasi antar heading |

Baris terakhir pada tabel itu yang paling sering dibuang orang. Menulis `<div class="text-2xl font-bold">` menghasilkan tampilan heading tanpa role heading, dan navigasi antar bagian langsung hilang.

## Struktur dokumen

Rangka halaman yang bisa dinavigasi terdiri dari landmark:

```html
<body>
  <header>
    <a href="/">Logo</a>
    <nav aria-label="Utama">
      <ul>
        <li><a href="/blog">Blog</a></li>
        <li><a href="/proyek">Proyek</a></li>
      </ul>
    </nav>
  </header>

  <main>
    <h1>Judul halaman</h1>

    <article>
      <h2>Bagian pertama</h2>
      <p>Isi paragraf.</p>
    </article>

    <aside>
      <h2>Tulisan terkait</h2>
    </aside>
  </main>

  <footer>
    <p>© 2026 Nama Anda</p>
  </footer>
</body>
```

Lima aturan yang menyelesaikan sebagian besar persoalan struktur:

1. **Satu `main` per halaman**, berisi konten utama tanpa header dan footer yang berulang di semua halaman.
2. **Satu `h1` per halaman**, yaitu judul halaman itu. Sisanya turun bertahap tanpa melompat dari `h2` ke `h4`.
3. **`nav` diberi nama** lewat `aria-label` kalau ada lebih dari satu, misalnya navigasi utama dan navigasi footer.
4. **`section` butuh heading.** Kalau sebuah bagian tidak punya judul, biasanya yang Anda butuhkan hanya `div`.
5. **`article` untuk isi yang berdiri sendiri**, misalnya satu tulisan, satu kartu produk, satu komentar. Patokannya: masih bermakna kalau dipindahkan ke tempat lain.

Perbedaan `div` dan elemen semantik sering dibesar-besarkan sampai orang takut memakai `div`. `div` dan `span` tetap benar, selama tugasnya murni pengelompokan untuk keperluan tata letak. Yang salah adalah memakainya untuk hal yang punya makna, karena maknanya ikut hilang.

## Delapan kesalahan yang paling sering terjadi

**1. `a` dipakai untuk aksi, `button` dipakai untuk navigasi.** Aturannya tegas: `a` memindahkan pengguna ke alamat lain, `button` menjalankan sesuatu di halaman yang sama. Tautan tanpa `href` tidak bisa difokus, dan tombol yang sebenarnya navigasi merusak klik tengah, Ctrl+klik, dan menu "buka di tab baru".

**2. `placeholder` dipakai sebagai label.** Placeholder hilang begitu pengguna mengetik, kontrasnya rendah, dan tidak dibacakan konsisten. Label tetap diperlukan, meski secara desain terlihat mubazir.

**3. Teks tautan yang tidak bermakna.** Pengguna pembaca layar sering meminta daftar semua tautan di halaman. Sepuluh tautan bernama "klik di sini" jadi daftar yang tidak berguna. Tulis "Baca laporan keuangan 2026" sebagai teks tautannya.

**4. Gambar tanpa `alt`, atau dengan `alt` yang mengulang.** Gambar bermakna butuh deskripsi singkat, gambar dekoratif butuh `alt=""` supaya dilewati. Kata "gambar" dan "foto" tidak perlu ditulis, karena perannya sudah disebutkan.

**5. Heading dipilih karena ukurannya.** Level heading menentukan struktur, bukan ukuran huruf. Ukuran diatur CSS.

**6. Tabel dipakai untuk tata letak, atau tabel data tanpa `th`.** Tabel tanpa `th` dan `caption` menghilangkan hubungan antara angka dan judul kolomnya.

**7. `div` interaktif dengan `onclick`.** Kalau benar-benar harus, Anda wajib menambahkan `role`, `tabindex="0"`, serta penanganan Enter dan spasi. Memakai `button` lebih singkat dan lebih benar.

**8. `lang` tidak diisi atau salah.** `<html lang="id">` menentukan cara pembaca layar melafalkan teks. Halaman berbahasa Indonesia dengan `lang="en"` akan dibacakan dengan pelafalan Inggris dan nyaris tidak bisa dipahami.

## Form yang benar

Form adalah tempat pengguna paling sering gagal, dan tempat paling banyak kemampuan bawaan yang terbuang. Bandingkan dua versi.

Versi yang biasa ditemui:

```html
<div class="form">
  <input type="text" placeholder="Email" />
  <input type="text" placeholder="Password" />
  <div class="btn" onclick="login()">Masuk</div>
</div>
```

Versi yang benar:

```html
<form method="post" action="/login">
  <div>
    <label for="email">Email</label>
    <input
      id="email"
      name="email"
      type="email"
      autocomplete="email"
      inputmode="email"
      required
      aria-describedby="email-bantuan"
    />
    <p id="email-bantuan">Pakai email yang terdaftar di kantor Anda.</p>
  </div>

  <div>
    <label for="sandi">Password</label>
    <input
      id="sandi"
      name="sandi"
      type="password"
      autocomplete="current-password"
      required
      minlength="8"
    />
  </div>

  <button type="submit">Masuk</button>
</form>
```

Yang didapat versi kedua tanpa satu baris JavaScript: Enter di dalam input mengirim form, pengelola password browser mengenali kolomnya, HP memunculkan papan tombol yang sesuai, validasi dasar berjalan, dan pembaca layar membacakan label beserta teks bantuannya.

Atribut yang paling berdampak:

| Atribut | Fungsinya | Contoh nilai |
| --- | --- | --- |
| `type` | Menentukan papan tombol dan validasi bawaan | `email`, `tel`, `number`, `date`, `password` |
| `inputmode` | Papan tombol di HP tanpa mengubah validasi | `numeric`, `decimal`, `tel` |
| `autocomplete` | Mengisi otomatis dari data browser | `email`, `name`, `one-time-code`, `street-address` |
| `required`, `minlength`, `pattern` | Validasi bawaan browser | |
| `aria-describedby` | Menghubungkan teks bantuan atau pesan error | id elemen penjelas |
| `aria-invalid` | Menandai kolom yang gagal validasi | `true` |
| `fieldset` dan `legend` | Mengelompokkan pilihan terkait | pilihan metode pembayaran |

Dua catatan yang selalu berlaku:

`autocomplete` bukan detail kecil. Untuk form alamat pengiriman, isian yang benar memotong waktu pengisian lebih dari setengah, dan itu langsung terlihat di angka konversi.

Validasi bawaan browser tidak cukup, tapi jangan dimatikan tanpa alasan. Modul 12 membahas cara mengambil alih pesan error supaya seragam dengan desain, tanpa menghapus kemampuan dasarnya.

## Yang masuk ke `head`

Bagian yang tidak terlihat pengguna tapi menentukan bagaimana halaman Anda muncul di tempat lain:

```html
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Harga paket internet rumah 2026 | Nama Situs</title>
  <meta name="description" content="Perbandingan paket internet rumah di Jakarta beserta kecepatan dan biaya pemasangan." />
  <link rel="canonical" href="https://contoh.com/paket-internet" />
  <meta property="og:title" content="Harga paket internet rumah 2026" />
  <meta property="og:description" content="Perbandingan paket beserta kecepatan dan biaya pemasangan." />
  <meta property="og:image" content="https://contoh.com/og/paket-internet.png" />
</head>
```

`title` dipakai mesin pencari dan jadi nama tab, `description` jadi cuplikan hasil pencarian, dan tag `og:` menentukan pratinjau saat tautan dibagikan ke WhatsApp atau LinkedIn. Tanpa `meta viewport`, halaman akan dibuka dalam ukuran desktop yang diperkecil di HP, dan seluruh pekerjaan responsif di modul berikutnya jadi tidak terpakai.

## Latihan

### Latihan 1: Rapikan div soup

Di bawah ini potongan markup yang tampilannya sudah sesuai desain. Tulis ulang supaya bermakna, tanpa mengubah urutan isinya.

```html
<div class="page">
  <div class="top">
    <div class="logo">Warung Kopi Tio</div>
    <div class="menu">
      <div class="menu-item" onclick="goto('/menu')">Menu</div>
      <div class="menu-item" onclick="goto('/lokasi')">Lokasi</div>
    </div>
  </div>

  <div class="content">
    <div class="title-big">Kopi harian kami</div>
    <div class="text">Tiga pilihan yang selalu tersedia setiap hari.</div>

    <div class="card">
      <div class="title-med">Kopi susu gula aren</div>
      <img src="/kopi-susu.jpg" />
      <div class="text">Manisnya dari gula aren asli Lampung.</div>
      <div class="btn" onclick="goto('/menu/kopi-susu')">Lihat detail</div>
    </div>
  </div>

  <div class="bottom">
    <div class="text">Buka setiap hari 08.00 sampai 22.00</div>
  </div>
</div>
```

> [!petunjuk]
> Kerjakan tiga lapis berurutan: pertama landmark terluar, lalu hierarki heading, lalu elemen interaktif. Pada lapisan ketiga tanyakan untuk setiap item: ini memindahkan pengguna ke halaman lain, atau menjalankan sesuatu di halaman ini?

> [!jawaban]
>
> ```html
> <body>
>   <header>
>     <a href="/">Warung Kopi Tio</a>
>     <nav aria-label="Utama">
>       <ul>
>         <li><a href="/menu">Menu</a></li>
>         <li><a href="/lokasi">Lokasi</a></li>
>       </ul>
>     </nav>
>   </header>
>
>   <main>
>     <h1>Kopi harian kami</h1>
>     <p>Tiga pilihan yang selalu tersedia setiap hari.</p>
>
>     <article>
>       <h2>Kopi susu gula aren</h2>
>       <img src="/kopi-susu.jpg" alt="Segelas kopi susu gula aren dengan es" />
>       <p>Manisnya dari gula aren asli Lampung.</p>
>       <a href="/menu/kopi-susu">Lihat detail kopi susu gula aren</a>
>     </article>
>   </main>
>
>   <footer>
>     <p>Buka setiap hari 08.00 sampai 22.00</p>
>   </footer>
> </body>
> ```
>
> Lima keputusan di dalamnya:
>
> 1. Semua `menu-item` jadi `a` dengan `href`, karena tugasnya memindahkan halaman. Sekarang bisa dibuka di tab baru dan muncul di daftar tautan.
> 2. "Lihat detail" juga `a`, bukan `button`, karena alasan yang sama. Teksnya diperjelas supaya tetap bermakna saat dibaca di luar konteks kartunya.
> 3. `title-big` jadi `h1`, `title-med` jadi `h2`. Ukuran huruf tetap diatur CSS, struktur tidak lagi bergantung pada nama kelas.
> 4. Kartu kopi jadi `article`, karena tetap bermakna kalau dipindahkan ke halaman lain.
> 5. Gambar diberi `alt` yang mendeskripsikan isinya, tanpa kata "gambar".

### Latihan 2: `a` atau `button`

Tentukan elemen yang benar untuk delapan kontrol berikut.

| # | Kontrol |
| --- | --- |
| 1 | "Beranda" di navigasi atas |
| 2 | "Tambah ke keranjang" |
| 3 | "Lihat semua 240 ulasan" yang membuka halaman ulasan |
| 4 | "Tampilkan 10 ulasan berikutnya" yang menambah isi di halaman yang sama |
| 5 | "Unduh PDF laporan" |
| 6 | Ikon X untuk menutup dialog |
| 7 | "Masuk dengan Google" yang mengarahkan ke halaman Google |
| 8 | "Hapus akun" yang memunculkan konfirmasi dulu |

> [!petunjuk]
> Satu pertanyaan saja: setelah kontrol ini dipakai, apakah alamat di bilah URL berubah? Kalau ya, hampir selalu `a`.

> [!jawaban]
>
> | # | Elemen | Alasan |
> | --- | --- | --- |
> | 1 | `a` | Pindah halaman |
> | 2 | `button` | Aksi di halaman yang sama |
> | 3 | `a` | Pindah ke halaman ulasan |
> | 4 | `button` | Menambah isi tanpa pindah halaman |
> | 5 | `a` dengan `download` | Tetap sebuah alamat, dan pengguna berhak membukanya di tab baru |
> | 6 | `button` | Aksi, dan perlu bisa dinonaktifkan serta difokus |
> | 7 | `a` | Pengguna benar-benar dipindahkan ke domain Google |
> | 8 | `button` | Aksi, konfirmasinya muncul di halaman yang sama |
>
> Nomor 5 adalah yang paling sering diperdebatkan. Karena sebuah file punya alamat sendiri, `a` memberi pengguna hak yang mereka harapkan: menyalin tautannya, membukanya di tab lain, atau menyimpannya.

### Latihan 3: Form pendaftaran acara

Tulis markup form pendaftaran acara dengan isian berikut, tanpa JavaScript sama sekali: nama lengkap, nomor WhatsApp, email, pilihan sesi (pagi atau malam), jumlah tiket (1 sampai 4), catatan makanan yang bersifat opsional, dan persetujuan syarat.

Target: pengguna HP mendapat papan tombol yang benar di setiap isian, pengelola data browser bisa mengisi otomatis, pilihan sesi dibacakan sebagai satu kelompok, dan isian opsional jelas terlihat opsional.

> [!pembahasan]
>
> ```html
> <form method="post" action="/daftar">
>   <h1>Daftar acara</h1>
>
>   <label for="nama">Nama lengkap</label>
>   <input id="nama" name="nama" type="text" autocomplete="name" required />
>
>   <label for="wa">Nomor WhatsApp</label>
>   <input
>     id="wa"
>     name="wa"
>     type="tel"
>     inputmode="tel"
>     autocomplete="tel"
>     required
>     aria-describedby="wa-bantuan"
>   />
>   <p id="wa-bantuan">Contoh: 081234567890</p>
>
>   <label for="email">Email</label>
>   <input id="email" name="email" type="email" autocomplete="email" required />
>
>   <fieldset>
>     <legend>Pilih sesi</legend>
>     <input id="pagi" name="sesi" type="radio" value="pagi" required />
>     <label for="pagi">Sesi pagi, 09.00</label>
>     <input id="malam" name="sesi" type="radio" value="malam" />
>     <label for="malam">Sesi malam, 19.00</label>
>   </fieldset>
>
>   <label for="tiket">Jumlah tiket</label>
>   <input id="tiket" name="tiket" type="number" min="1" max="4" value="1" inputmode="numeric" required />
>
>   <label for="catatan">Catatan makanan (opsional)</label>
>   <textarea id="catatan" name="catatan" rows="3"></textarea>
>
>   <input id="setuju" name="setuju" type="checkbox" required />
>   <label for="setuju">Saya setuju dengan syarat dan ketentuan</label>
>
>   <button type="submit">Daftar</button>
> </form>
> ```
>
> Keputusan yang penting:
>
> - Nomor WhatsApp pakai `type="tel"`, bukan `number`. `number` membuang angka nol di depan dan memunculkan tombol naik turun yang tidak ada artinya untuk nomor telepon.
> - Pilihan sesi dibungkus `fieldset` dengan `legend`, supaya pembaca layar menyebut "Pilih sesi" sebelum membacakan pilihannya.
> - Kata "(opsional)" ditulis di label. Menandai yang wajib dengan tanda bintang memaksa pengguna mencari keterangan arti bintangnya.
> - `required` pada radio pertama cukup untuk mewajibkan satu pilihan pada kelompok yang sama.

### Latihan 4: Audit halaman nyata

Pilih satu situs yang sering Anda pakai, lalu lakukan empat pemeriksaan:

1. Tekan Tab berulang kali dari awal halaman. Catat apakah fokusnya terlihat, dan apakah ada kontrol yang terlewat.
2. Di DevTools, buka panel **Accessibility** pada tombol dan tautan utamanya. Catat role dan name-nya.
3. Jalankan halaman itu di [validator.w3.org](https://validator.w3.org) dan catat tiga kesalahan teratas.
4. Cari `h1` halaman itu, lalu periksa apakah urutan headingnya melompat.

**Pertanyaannya:** dari temuan Anda, mana yang murni kesalahan markup dan mana yang keputusan desain? Catat jawabannya, karena modul 15 akan kembali ke daftar ini dengan alat ukur yang lebih tajam.

## Batasnya

HTML semantik menyelesaikan struktur dan makna, dan berhenti di situ. Ada tiga hal yang tidak bisa diselesaikannya.

Pertama, tampilan. Markup yang benar tetap tampak seperti dokumen tahun 1995 tanpa CSS.

Kedua, widget yang tidak punya padanan bawaan. Combobox dengan pencarian, tab, dan tree view tidak ada di HTML. Membangunnya butuh ARIA dan penanganan keyboard sendiri, dan itu isi modul 15. Aturan praktisnya tetap: pakai elemen bawaan dulu, ARIA hanya saat tidak ada pilihan.

Ketiga, isi yang berubah tanpa memuat ulang halaman. HTML bisa mengirim form dan pindah halaman, tapi tidak bisa memperbarui sebagian halaman saja. Itu pekerjaan JavaScript di modul 4 dan 5.

## Rangkuman

- Browser membangun dua pohon dari markup Anda: DOM untuk tampilan dan accessibility tree yang berisi role, name, dan state. Pembaca layar membaca pohon kedua.
- Elemen bawaan memberi fokus keyboard, penanganan tombol, state, dan peran secara gratis. `div` tidak memberi apa pun.
- Landmark (`header`, `nav`, `main`, `footer`) dan hierarki heading adalah panel navigasi halaman Anda. Satu `h1`, tanpa lompatan level.
- `a` memindahkan pengguna, `button` menjalankan aksi. Ini aturan, bukan preferensi.
- Form bawaan memberi pengiriman dengan Enter, pengisian otomatis, papan tombol yang sesuai, dan validasi dasar. `label` yang terhubung dengan `input` tidak bisa digantikan `placeholder`.
- `lang`, `title`, `meta description`, dan tag `og:` menentukan bagaimana halaman Anda hidup di luar browser.

## Masalah terbuka

Markup Anda sekarang bermakna, bisa dinavigasi, dan tetap berguna saat lapisan lain gagal. Tapi tampilannya masih satu kolom teks hitam di atas putih, dan desainer sudah mengirim rancangan dengan tiga kolom di layar lebar, satu kolom di HP, mode gelap, serta kartu yang tingginya harus sama meski isinya berbeda panjang.

Lebih dari itu: Anda tidak tahu lebar layar pengguna, tidak tahu panjang teks yang akan dimuat dari database, dan tidak tahu apakah pengguna memperbesar teksnya ke 200%. Bagaimana memberi instruksi tata letak kepada mesin yang ukuran ruangannya belum Anda ketahui?

Itu isi modul berikutnya: cascade, box model, flexbox dan grid, container query, dan cara berpikir responsif yang dimulai dari konten.
