---
title: 'Modul 1: Cara Kerja Web dan Peran Frontend'
description: Antara menekan Enter dan halaman muncul ada belasan langkah. Mengenal langkah-langkah itu adalah bedanya menebak dan tahu, saat nanti ada yang lambat atau layarnya kosong.
date: 2026-11-07
slug: modul-1-cara-kerja-web
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Hari ini Anda mungkin sudah membuka tiga puluh halaman web. Masing-masing butuh waktu kurang dari dua detik, dan Anda tidak pernah bertanya apa yang terjadi di dalam dua detik itu. Pekerjaan frontend dimulai tepat di sana.

Setiap halaman web dibangun dari tiga lapisan, dan paling mudah dipahami dengan membayangkan satu lapisan dihapus:

| Lapisan | Tugasnya | Kalau dihapus |
| --- | --- | --- |
| **HTML** | Struktur dan makna: ini judul, ini tombol, ini daftar | Tidak ada halaman sama sekali |
| **CSS** | Tampilan: tata letak, warna, jarak, tipografi | Halaman tetap bisa dibaca, tapi jadi teks hitam putih bertumpuk |
| **JavaScript** | Perilaku: merespons klik, mengambil data, mengubah tampilan | Halaman tetap tampil, tapi berhenti bereaksi |

Perhatikan urutan kehilangannya. Tanpa JavaScript sebagian situs masih berguna, tanpa CSS masih terbaca, tanpa HTML tidak ada apa-apa. Urutan itu bukan kebetulan, dan akan kembali muncul di modul tentang aksesibilitas dan performance.

## Masalahnya dulu, teknologinya belakangan

Bayangkan Anda sudah bisa membuat halaman yang rapi. Suatu pagi datang lima laporan sekaligus:

1. "Halamannya lambat." Cepat di laptop Anda, enam detik di HP pelapor.
2. "Layarnya kosong." Padahal API-nya normal dan datanya ada.
3. "Tulisannya melompat." Pengguna sudah mau menekan tombol, lalu tombolnya bergeser ke bawah.
4. "Tombolnya tidak bisa diklik." Hanya pada dua detik pertama, setelah itu normal.
5. "Datanya salah." Di database sudah benar, di layar masih yang lama.

Lima laporan ini punya penyebab yang sama sekali berbeda, dan tidak satu pun bisa diselesaikan dengan menebak. Yang pertama soal jaringan, ukuran file, dan kekuatan perangkat. Yang kedua biasanya satu error JavaScript yang menghentikan render. Yang ketiga soal gambar atau font yang datang belakangan tanpa ruang yang dipesan lebih dulu. Yang keempat soal pekerjaan berat yang menyandera satu-satunya jalur yang bisa memproses klik. Yang kelima soal cache.

Tanpa model mental tentang perjalanan sebuah halaman, lima laporan itu terasa seperti sihir. Dengan model mental, masing-masing punya tempat yang jelas untuk dicari. Itulah isi modul ini: bukan cara menulis kode, tapi cara kerja mesin yang akan menjalankan kode Anda selama sepuluh tahun ke depan.

> Modul ini satu-satunya modul yang tidak meminta Anda memasang apa pun. Cukup browser yang sudah ada di komputer Anda, karena DevTools di dalamnya adalah alat ukur paling penting dalam seri ini.

## Sedikit sejarah

**1991: web hanya untuk membaca.** Tim Berners-Lee menerbitkan situs pertama. Isinya HTML saja, tanpa CSS, tanpa JavaScript, tanpa gambar.

**1995 dan 1996: perilaku dan tampilan menyusul.** JavaScript dibuat dalam waktu sangat singkat untuk Netscape, lalu CSS lahir setahun kemudian. Keduanya awalnya dianggap pelengkap, dan sekarang justru di situ sebagian besar pekerjaan frontend berada.

**2006: jQuery menambal perbedaan browser.** Setiap browser punya cara sendiri memilih elemen dan menangani event. jQuery menyeragamkannya dan jadi standar tidak resmi selama hampir satu dekade.

**2009: JavaScript keluar dari browser.** Node.js memungkinkan JavaScript berjalan di komputer biasa. Dampak terbesarnya bukan backend, melainkan tooling: build, bundler, linter, dan test runner yang Anda pakai nanti semuanya hidup di atas Node.

**2013: React dan UI deklaratif.** Daripada memerintahkan perubahan DOM satu per satu, Anda mendeklarasikan tampilan sebagai hasil dari data. Modul 5 dan 8 akan menunjukkan kenapa pergeseran ini terjadi.

**2020: kecepatan jadi angka.** Google memperkenalkan Core Web Vitals, dan kualitas yang tadinya terasa subjektif berubah jadi tiga metrik yang bisa ditagih.

**2023 sampai sekarang: sebagian pekerjaan kembali ke server.** React Server Component dan Next.js App Router mengembalikan render ke server, sementara platform browser sendiri makin kaya dengan container query, `:has()`, dan view transition. Pertanyaan utama bergeser dari "pakai library apa" menjadi "kode ini sebaiknya berjalan di mana".

Empat kejadian yang layak diingat, karena polanya berulang:

**Flash mati karena platform mengejar.** Dulu animasi, video, dan game di web dikerjakan dengan Flash, sebuah plugin milik satu perusahaan. Setelah HTML5, `<video>`, dan canvas cukup matang, Flash kehilangan alasan untuk ada dan resmi dihentikan pada 2020.

**jQuery kehilangan alasan dengan cara yang sama.** Masalah yang dipecahkannya adalah browser yang tidak seragam. Setelah `querySelector` dan `fetch` ada di semua browser, kebutuhannya menyusut. Pelajarannya: banyak tools populer sebenarnya penambal kekurangan platform yang sifatnya sementara.

**AMP ditinggalkan.** Sekitar 2016 Google mendorong AMP, format halaman serba cepat yang disajikan dari infrastruktur Google. Halamannya memang cepat, tapi penerbit kehilangan kendali atas kode dan audiensnya, dan dorongan itu mereda beberapa tahun kemudian. Kecepatan yang ditukar dengan kendali tidak bertahan lama.

**Core Web Vitals mengubah prioritas banyak tim.** Begitu kecepatan punya angka dan angka itu memengaruhi peringkat pencarian, pekerjaan performance berhenti jadi hobi akhir pekan dan masuk ke sprint. Hal yang bisa diukur adalah hal yang dikerjakan.

## Analogi: pertunjukan teater

Bayangkan sebuah pertunjukan yang naskahnya dikirim bertahap oleh kurir, dan kru harus mulai bekerja sebelum naskahnya lengkap.

- **Naskah** menentukan siapa tokohnya dan apa urutannya. Itu HTML.
- **Tata panggung, kostum, dan lampu** menentukan bagaimana semuanya terlihat. Itu CSS.
- **Sutradara yang masih berdiri di samping panggung** mengubah adegan saat ada reaksi penonton. Itu JavaScript.
- **Gedung teater beserta krunya** menyediakan lantai, lampu, dan pengeras suara. Itu browser.
- **Kurir** mengantar naskah dan properti bagian demi bagian, kadang tersendat. Itu jaringan.

Dua aturan kru yang penting:

Pertama, pertunjukan tidak dimulai sebelum lampu siap. Browser menunda menampilkan apa pun sampai CSS selesai diunduh dan dibaca, karena menampilkan halaman tanpa gaya lalu mengubahnya mendadak justru lebih buruk. Itu sebabnya CSS disebut *render-blocking*.

Kedua, kalau sutradara menyetop pembacaan naskah untuk memberi arahan panjang, semua ikut menunggu. Script yang dimuat tanpa penanda khusus menghentikan pembacaan HTML sampai script itu selesai diunduh dan dijalankan.

Pemetaannya:

| Dunia teater | Dunia web |
| --- | --- |
| Naskah | HTML |
| Tata panggung dan kostum | CSS |
| Sutradara yang menyesuaikan adegan | JavaScript |
| Gedung dan kru | Browser dan mesin render |
| Kurir pengantar naskah | Jaringan, HTTP |
| Papan nama gedung yang dicari penonton | DNS |
| Adegan pertama yang terlihat penonton | First paint, LCP |
| Penonton berteriak dan sutradara menanggapi | Event dan INP |

Batas analoginya ada pada satu hal, dan ini penting: di teater naskah dibaca sampai habis baru dimainkan. Browser tidak begitu. Browser menampilkan sambil membaca, dan terus memperbaiki tampilan saat bahan baru datang. Sifat "sambil jalan" itu sumber dari sebagian besar kejadian aneh pada halaman web, termasuk teks yang melompat.

## Apa yang terjadi saat Anda menekan Enter

Urutannya kira-kira begini:

1. **Browser membaca URL** dan memisahkan protokol, nama domain, dan path.
2. **DNS** menerjemahkan nama domain jadi alamat IP, seperti mencari nomor dari buku telepon.
3. **Sambungan dibuka** lewat TCP, lalu diamankan dengan TLS kalau alamatnya `https`.
4. **Permintaan HTTP dikirim**, biasanya mendarat di server CDN yang paling dekat secara geografis.
5. **Server menjawab dengan HTML.** Jeda sampai byte pertama datang disebut TTFB.
6. **Browser mem-parse HTML** menjadi DOM, yaitu struktur pohon dari dokumen Anda.
7. **Sambil mem-parse, browser menemukan** rujukan ke CSS, font, gambar, dan JavaScript, lalu mengunduhnya. CSS diubah jadi CSSOM.
8. **DOM dan CSSOM digabung** jadi render tree, lalu browser menghitung posisi dan ukuran setiap elemen (layout), menggambarnya (paint), dan menyusun lapisannya (composite). Di titik ini halaman mulai terlihat.
9. **JavaScript dijalankan**: memasang event listener, mengambil data tambahan, dan mengubah DOM. Setiap perubahan bisa memicu layout dan paint ulang.
10. **Halaman jadi responsif.** Mulai dari sini, klik dan ketikan pengguna diproses pada jalur yang sama dengan JavaScript Anda, yang disebut main thread.

```text
Ketik URL
   |
   v
 DNS  ->  alamat IP
   |
   v
 TCP + TLS  ->  sambungan aman
   |
   v
 HTTP request  ->  CDN / server
                        |
                        v
                  HTML (byte pertama = TTFB)
   |
   v
 Parse HTML ------------------------+
   |                                |
   +--> temukan <link>, <script>,   |
   |    <img>, font, lalu unduh     |
   |                                v
   |                              DOM
   +--> CSS --> CSSOM               |
                  \                 |
                   +--> Render tree --> Layout --> Paint --> Composite --> terlihat
   |
   v
 Jalankan JavaScript -> pasang listener, fetch data, ubah DOM
   |
   v
 Siap menerima interaksi (main thread harus bebas)
```

Istilah yang akan terus muncul di modul-modul berikutnya:

| Istilah | Artinya | Kenapa Anda peduli |
| --- | --- | --- |
| **DNS** | Penerjemah nama domain ke alamat IP | Satu penyebab lambat yang terjadi sebelum kode Anda jalan sama sekali |
| **TTFB** | Waktu sampai byte pertama diterima | Memisahkan masalah server dari masalah frontend |
| **DOM** | Pohon objek hasil parsing HTML | Semua manipulasi halaman bekerja di atasnya |
| **CSSOM** | Pohon aturan gaya hasil parsing CSS | Menjelaskan kenapa CSS menunda tampilnya halaman |
| **Render-blocking** | Sumber daya yang menunda tampilan pertama | Target utama saat mengoptimalkan kecepatan |
| **Main thread** | Jalur tunggal tempat JavaScript dan interaksi diproses | Kalau sibuk, halaman terasa macet |
| **LCP** | Waktu elemen terbesar tampil | Mewakili "kapan halaman terasa muncul" |
| **CLS** | Seberapa banyak tata letak bergeser | Penyebab salah klik dan teks yang melompat |
| **INP** | Seberapa cepat halaman menanggapi interaksi | Mewakili "kapan halaman terasa hidup" |
| **Hydration** | Proses JavaScript mengambil alih HTML yang sudah dirender server | Jembatan antara cepat tampil dan cepat bereaksi |

## Tiga cara halaman sampai ke pengguna

Keputusan ini akan Anda ambil berulang kali sepanjang karier, jadi kenali bentuknya sejak sekarang:

| Cara | Kapan HTML dibuat | Cocok untuk | Harganya |
| --- | --- | --- | --- |
| **Static** | Sekali, saat build | Blog, dokumentasi, halaman pemasaran | Konten baru butuh build ulang |
| **Server-render per permintaan** | Setiap kali halaman diminta | Halaman yang datanya personal atau sering berubah | Server bekerja lebih keras, butuh strategi cache |
| **Client-render** | Di browser, setelah JavaScript jalan | Aplikasi dengan banyak interaksi di balik login | Pertama kali dibuka terasa lambat, mesin pencari sulit membacanya |

Jawaban yang baik sering campuran: kerangka halaman dirender di server supaya cepat terlihat, bagian interaktifnya diambil alih JavaScript setelahnya. Modul 13 membahas cara memilih dan mencampurnya dengan Next.js.

## Di mana frontend berakhir dan backend dimulai

Garisnya lebih kabur dari yang dibayangkan pemula, dan beberapa tugas memang harus dikerjakan dua kali di dua tempat:

| Pekerjaan | Tempatnya | Catatan |
| --- | --- | --- |
| Struktur dan tampilan halaman | Frontend | |
| Validasi isian form | Keduanya | Di klien untuk kenyamanan, di server untuk kebenaran |
| Memeriksa hak akses | Backend | Menyembunyikan tombol di frontend bukan pengamanan |
| Menyimpan password | Backend | Frontend tidak boleh ikut mengurusnya |
| Metadata SEO dan social card | Frontend | Dihasilkan saat halaman dirender |
| Cache | Keduanya | Browser, CDN, dan server punya lapisan masing-masing |
| Mengubah ukuran gambar | Backend atau CDN | Frontend menentukan ukuran yang diminta |
| Mengukur Core Web Vitals | Frontend | Datanya dikirim ke backend untuk dipantau |

Yang dinilai pada frontend engineer hari ini, di luar bisa membuat tampilan sesuai desain:

- Memilih tempat kode berjalan: server atau klien, dan bisa menjelaskan alasannya.
- Menulis TypeScript sebagai bahasa kerja sehari-hari, bukan tambahan.
- Mengelola data dari server beserta semua keadaan gagalnya.
- Membuat antarmuka yang bisa dipakai dengan keyboard dan pembaca layar.
- Membaca angka performance dan memperbaikinya, bukan hanya menyebutkannya.
- Menulis test yang benar-benar menangkap kerusakan.
- Bekerja di dalam design system bersama tim desain, bukan membuat ulang tombol setiap sprint.

## Alat kerja minimum

Anda tidak perlu memasang semuanya hari ini. Daftar ini supaya Anda tahu apa yang akan dipakai dan untuk apa:

| Alat | Fungsinya | Contoh | Kapan dibutuhkan |
| --- | --- | --- | --- |
| Browser dengan DevTools | Memeriksa, mengukur, mencari penyebab | Chrome, Firefox | Modul ini |
| Editor kode | Menulis dan menavigasi proyek | VS Code, Zed | Modul 2 |
| Runtime dan package manager | Menjalankan tooling dan memasang dependensi | Node LTS, pnpm | Modul 6 |
| Version control | Menyimpan riwayat dan berkolaborasi | Git, GitHub | Modul 6 |
| Hosting | Menaruh hasil kerja di internet | Cloudflare Pages, Vercel, Netlify | Proyek 1 |

Satu saran: pakai dua browser sejak awal. Bug yang hanya muncul di satu browser jauh lebih mudah dikenali kalau Anda sudah biasa membandingkan.

## Latihan

### Latihan 1: Membaca satu permintaan

Buka situs berita favorit Anda, tekan F12 untuk membuka DevTools, pilih tab **Network**, centang **Disable cache**, lalu muat ulang halaman.

Catat lima angka:

| Yang dicatat | Di mana melihatnya |
| --- | --- |
| Jumlah request | Baris ringkasan di bawah daftar |
| Total data yang diunduh | Kolom "transferred" pada ringkasan |
| Waktu sampai byte pertama dokumen | Klik request paling atas, lihat Timing, bagian "Waiting for server response" |
| Request paling besar | Urutkan kolom Size |
| Request paling lama | Urutkan kolom Time |

Setelah itu klik request paling atas (dokumen HTML-nya) dan buka tab **Headers**. Cari tiga hal: `content-type`, `content-encoding`, dan `cache-control`.

**Pertanyaannya:** dari total data yang diunduh, berapa persen yang sebenarnya HTML? Angka itu biasanya mengejutkan, dan sisanya adalah pekerjaan yang akan Anda kelola sepanjang karier.

### Latihan 2: Matikan satu lapisan

Pilih dua situs: satu situs konten (berita, blog, dokumentasi) dan satu aplikasi (dasbor, marketplace, media sosial).

Pada masing-masing, lakukan tiga percobaan lewat DevTools:

1. **Tanpa CSS.** Buka tab Network, blokir request bertipe stylesheet lewat klik kanan, lalu muat ulang.
2. **Tanpa JavaScript.** Buka Command Palette DevTools dengan Ctrl+Shift+P atau Cmd+Shift+P, ketik "JavaScript", pilih "Disable JavaScript", lalu muat ulang.
3. **Jaringan dan perangkat lemah.** Di tab Network pilih throttling "Slow 4G", dan di tab Performance setel CPU ke "4x slowdown". Muat ulang dan perhatikan urutan munculnya elemen.

Catat apa yang masih bisa dilakukan pengguna pada setiap percobaan.

> [!petunjuk]
> Jangan hanya menilai "rusak" atau "tidak rusak". Tanyakan: apakah tujuan utama pengguna di halaman ini masih tercapai? Membaca artikel dan mengirim komentar adalah dua tujuan dengan ketergantungan yang berbeda.

> [!jawaban]
>
> Pola yang hampir selalu muncul:
>
> | Percobaan | Situs konten | Aplikasi |
> | --- | --- | --- |
> | Tanpa CSS | Masih terbaca, urutannya aneh tapi lengkap | Sering berantakan, menu jadi daftar panjang |
> | Tanpa JavaScript | Artikel biasanya tetap terbaca | Umumnya layar kosong atau kerangka kosong |
> | Jaringan lemah | Teks muncul dulu, gambar menyusul, kadang teks bergeser | Lama tidak ada apa-apa, lalu semuanya muncul sekaligus |
>
> Tiga pelajarannya:
>
> 1. HTML yang bermakna membuat halaman tetap berguna saat lapisan lain gagal. Ini alasan teknis, bukan idealisme.
> 2. Semakin banyak yang digantungkan ke JavaScript, semakin banyak yang hilang saat satu file gagal diunduh di jaringan yang buruk.
> 3. Teks yang bergeser saat gambar datang adalah CLS, dan penyebabnya hampir selalu ukuran yang tidak dipesan lebih dulu.

### Latihan 3: Frontend, backend, atau keduanya

Tentukan tempat pengerjaan delapan tugas berikut. Tulis jawaban Anda dulu, baru buka pembahasannya.

| # | Tugas |
| --- | --- |
| 1 | Menampilkan pesan "email tidak valid" saat pengguna masih mengetik |
| 2 | Memastikan hanya admin yang bisa menghapus artikel |
| 3 | Membuat tabel tetap terbaca di layar 360px |
| 4 | Menyusun judul dan gambar yang muncul saat tautan dibagikan ke WhatsApp |
| 5 | Mengirim email verifikasi pendaftaran |
| 6 | Menyimpan isi form yang belum selesai supaya tidak hilang saat tab tertutup |
| 7 | Membatasi percobaan login jadi lima kali per menit |
| 8 | Memastikan halaman tetap terbaca saat pengguna memperbesar teks ke 200% |

> [!petunjuk]
> Pertanyaan penyaringnya satu: kalau pengguna membuka DevTools dan mengubah apa pun yang dia mau, apakah aturan itu masih berlaku? Kalau tidak, tempatnya di server.

> [!jawaban]
>
> | # | Tempat | Alasan |
> | --- | --- | --- |
> | 1 | Keduanya | Pesan cepat di klien, kebenaran tetap diperiksa server |
> | 2 | Backend | Frontend hanya menyembunyikan tombol, itu bukan pengamanan |
> | 3 | Frontend | Layout responsif |
> | 4 | Frontend | Metadata dihasilkan saat halaman dirender |
> | 5 | Backend | Frontend tidak memegang kredensial pengirim email |
> | 6 | Frontend | Penyimpanan lokal di browser pengguna |
> | 7 | Backend | Pembatasan yang bisa dilewati klien tidak ada gunanya |
> | 8 | Frontend | Satuan ukuran yang ikut membesar, bukan nilai piksel tetap |
>
> Yang nomor 1 adalah pola yang paling sering salah dipahami pemula: validasi di klien adalah soal kenyamanan, validasi di server adalah soal kebenaran. Keduanya dikerjakan, dan tidak saling menggantikan.

### Latihan 4: Di mana sebaiknya dirender

Untuk tiga skenario ini, pilih static, server-render per permintaan, atau client-render, lalu tulis alasannya dalam dua tiga kalimat.

| | Skenario |
| --- | --- |
| **A** | Halaman profil dan jadwal kuliah sebuah kampus, diperbarui sebulan sekali |
| **B** | Dasbor internal yang menampilkan antrean pesanan dan berubah setiap beberapa detik |
| **C** | Halaman detail produk e-commerce dengan harga yang berubah dan stok per gudang |

> [!pembahasan]
>
> **A: static.** Kontennya sama untuk semua orang dan hampir tidak berubah. Dibuat sekali saat build, disajikan dari CDN, dan jadi yang paling cepat serta paling murah. Ribut memasang framework untuk ini adalah pekerjaan yang tidak perlu.
>
> **B: client-render di balik login, boleh tanpa HTML dari server.** Datanya personal, berubah cepat, dan tidak perlu diindeks mesin pencari. Kerangkanya bisa dirender di server supaya cepat terlihat, tapi isinya tetap diambil dari klien, biasanya lewat polling atau WebSocket.
>
> **C: server-render per permintaan, dengan cache.** Harga dan stok harus akurat, dan halaman ini wajib bisa dibaca mesin pencari serta cepat bagi pengunjung pertama. Bagian yang jarang berubah (deskripsi, gambar) di-cache, bagian yang cepat berubah (stok) diambil terpisah. Campuran inilah yang paling sering dipakai di tempat kerja, dan paling sering salah diambil sebagai "pokoknya SPA".

## Batasnya

Modul ini memberi model mental, bukan keterampilan membuat. Anda belum bisa membuat satu halaman pun setelah membacanya, dan itu memang bukan tujuannya. Yang Anda dapat adalah peta, supaya sepuluh modul ke depan terasa seperti mengisi bagian yang sudah punya tempat, bukan menumpuk istilah baru.

Satu hal lagi yang perlu diluruskan: tidak semua yang disebut di sini perlu Anda hafal. DevTools akan tetap ada, dokumentasi MDN akan tetap ada. Yang perlu menempel hanya alurnya, karena alur itulah yang menentukan tempat pertama yang Anda periksa saat sesuatu rusak.

## Rangkuman

- Halaman web punya tiga lapisan: HTML memberi struktur dan makna, CSS mengatur tampilan, JavaScript menambahkan perilaku. Urutan kehilangannya menunjukkan urutan kepentingannya.
- Antara Enter dan halaman muncul ada rantai panjang: DNS, sambungan, HTTP, parse HTML jadi DOM, parse CSS jadi CSSOM, render tree, layout, paint, composite, lalu JavaScript.
- Browser menampilkan sambil membaca. Sifat itu menjelaskan teks yang melompat, gambar yang datang belakangan, dan tombol yang sebentar tidak bisa diklik.
- JavaScript dan interaksi pengguna memakai jalur yang sama. Jalur yang sibuk membuat halaman terasa macet meski datanya sudah ada.
- Garis frontend dan backend tidak selalu tegas, tapi ada satu aturan tegas: apa pun yang menyangkut keamanan dan kebenaran harus diputuskan di server.
- Tiga cara halaman sampai ke pengguna (static, server-render, client-render) adalah keputusan berulang, bukan selera, dan jawabannya sering campuran.

## Masalah terbuka

Sekarang Anda tahu browser butuh HTML sebelum bisa menampilkan apa pun. Pertanyaan berikutnya: HTML seperti apa?

Dua potongan berikut tampak sama persis di layar kalau diberi CSS yang sama:

```html
<div class="tombol" onclick="kirim()">Kirim</div>

<button type="submit">Kirim</button>
```

Yang pertama tidak bisa dijangkau dengan tombol Tab, tidak merespons tombol Enter dan spasi, tidak dibacakan sebagai tombol oleh pembaca layar, dan tidak ikut mengirim form. Secara visual identik, secara fungsi berbeda jauh.

Jadi apa sebenarnya yang membuat satu elemen HTML "benar", dan kenapa pilihan elemen menentukan siapa saja yang bisa memakai halaman Anda?

Itu isi modul berikutnya: HTML semantik, struktur dokumen, dan form yang benar.
