---
title: 'Glosarium Frontend: 130 Istilah yang Dipakai Seri Ini'
description: Halaman rujukan untuk dibuka saat ada istilah yang belum jelas, bukan untuk dibaca dari atas ke bawah. Disusun per kelompok, dengan penunjuk modul tempat istilahnya dibahas.
date: 2026-12-02
slug: glosarium-frontend
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Halaman ini bukan materi, melainkan rujukan. Jangan dibaca dari atas ke bawah, dan jangan dihafal. Buka saat ada istilah yang muncul di sebuah modul dan Anda tidak yakin artinya, lalu tutup lagi.

Kolom terakhir menunjukkan modul tempat istilah itu dibahas dengan konteks lengkapnya. Definisi di sini sengaja pendek, karena definisi pendek saja hampir tidak pernah cukup untuk benar-benar memahami sesuatu.

Satu hal yang perlu diluruskan soal bahasa. Sebagian istilah di sini tidak punya padanan Indonesia yang dipakai di tempat kerja, jadi istilah Inggrisnya dipertahankan. Memaksakan terjemahan yang tidak dipakai siapa pun hanya membuat Anda kesulitan saat membaca dokumentasi atau berbicara dengan rekan tim.

## Web dan jaringan

| Istilah | Artinya | Modul |
| --- | --- | --- |
| **URL** | Alamat sebuah sumber daya, terdiri dari protokol, domain, path, dan query string | 1 |
| **DNS** | Penerjemah nama domain jadi alamat IP, seperti mencari nomor dari buku telepon | 1 |
| **HTTP** | Aturan percakapan antara browser dan server: permintaan masuk, jawaban keluar | 1 |
| **HTTPS dan TLS** | HTTP yang disandikan, sehingga tidak bisa dibaca atau diubah di tengah jalan | 1 |
| **Request dan response** | Permintaan yang dikirim browser, dan jawaban yang dikirim server | 1 |
| **Status code** | Angka pada jawaban server: 2xx berhasil, 3xx dialihkan, 4xx salah permintaan, 5xx server bermasalah | 5 |
| **Header** | Keterangan tambahan yang menyertai permintaan atau jawaban, misalnya jenis isi dan aturan cache | 1 |
| **CDN** | Jaringan server yang menyimpan salinan berkas Anda dekat dengan pengguna | 1 |
| **TTFB** | Waktu sampai byte pertama jawaban diterima. Memisahkan masalah server dari masalah frontend | 1 |
| **Origin** | Gabungan protokol, domain, dan port. Jadi dasar hampir semua aturan keamanan browser | 15 |
| **CORS** | Aturan yang menentukan apakah halaman boleh membaca jawaban dari origin lain | 5 |
| **Query string** | Bagian URL setelah tanda tanya, berisi pasangan kunci dan nilai | 10 |
| **Cache** | Salinan yang disimpan supaya tidak perlu diminta ulang. Ada di browser, CDN, dan server | 12 |

## Browser dan rendering

| Istilah | Artinya | Modul |
| --- | --- | --- |
| **DOM** | Pohon objek hasil penguraian HTML. Semua manipulasi halaman bekerja di atasnya | 1 |
| **CSSOM** | Pohon aturan gaya hasil penguraian CSS | 1 |
| **Render tree** | Gabungan DOM dan CSSOM, yaitu apa yang benar-benar akan digambar | 1 |
| **Layout** | Perhitungan posisi dan ukuran setiap elemen | 1 |
| **Paint** | Penggambaran piksel dari hasil layout | 1 |
| **Composite** | Penyusunan lapisan hasil paint jadi satu tampilan | 1 |
| **Render-blocking** | Sumber daya yang menunda tampilan pertama, terutama CSS | 1 |
| **Main thread** | Jalur tunggal tempat JavaScript dan interaksi pengguna diproses. Kalau sibuk, halaman terasa macet | 1 |
| **Viewport** | Area layar yang sedang menampilkan halaman. Diukur dalam piksel CSS, bukan piksel perangkat | 3 |
| **Accessibility tree** | Pohon sederhana berisi role, name, dan state setiap elemen. Inilah yang dibaca pembaca layar, bukan DOM | 2 |
| **DevTools** | Alat ukur di dalam browser. Dibuka dengan F12 | 0 |
| **Hydration** | Proses JavaScript mengambil alih HTML yang sudah dirender server, supaya jadi interaktif | 14 |

## HTML dan aksesibilitas

| Istilah | Artinya | Modul |
| --- | --- | --- |
| **Semantik** | Pemilihan elemen berdasarkan maknanya, bukan tampilannya | 2 |
| **Landmark** | Elemen penanda wilayah halaman: `header`, `nav`, `main`, `footer` | 2 |
| **Role** | Peran sebuah elemen, misalnya button, link, heading | 2 |
| **Accessible name** | Nama yang dibacakan pembaca layar, biasanya dari teks di dalamnya atau dari `label` | 2 |
| **State** | Keadaan sebuah kontrol: checked, disabled, expanded, invalid | 2 |
| **ARIA** | Sekumpulan atribut untuk menambal makna yang tidak bisa disampaikan HTML bawaan. Aturan pertamanya: jangan dipakai kalau elemen bawaan bisa | 16 |
| **`alt`** | Deskripsi gambar. Gambar dekoratif diberi `alt=""` supaya dilewati | 2 |
| **Live region** | Wilayah yang perubahannya diumumkan pembaca layar tanpa pindah halaman | 6 |
| **Focus** | Elemen yang sedang menerima ketikan. Indikatornya tidak pernah dihapus, hanya diganti tampilannya | 16 |
| **Focus trap** | Mengunci fokus di dalam dialog, supaya Tab tidak keluar ke halaman di belakangnya | 16 |
| **Tautan lewati** | Tautan di awal halaman yang melompat ke konten utama | 16 |
| **WCAG** | Standar aksesibilitas yang jadi acuan hampir semua aturan di dunia. Patokan praktisnya level AA | 16 |
| **Kontras** | Perbandingan terang gelap antara teks dan latarnya. Minimal 4.5:1 untuk teks biasa | 3 |

## CSS

| Istilah | Artinya | Modul |
| --- | --- | --- |
| **Cascade** | Urutan penentuan pemenang saat dua aturan mengenai elemen yang sama | 3 |
| **Spesifisitas** | Bobot sebuah selektor, dihitung dari jumlah id, kelas, dan elemen | 3 |
| **Cascade layer** | Pengelompokan aturan dengan urutan yang mengalahkan spesifisitas | 3 |
| **Warisan** | Sifat sebagian properti yang menurun ke elemen anak, misalnya `color` dan `font-family` | 3 |
| **Box model** | Empat lapis setiap elemen: content, padding, border, margin | 3 |
| **`box-sizing: border-box`** | Membuat `width` berarti lebar total, bukan lebar isi saja | 3 |
| **Flexbox** | Tata letak satu dimensi, ukurannya mengikuti isi | 3 |
| **Grid** | Tata letak dua dimensi, bentuk petaknya ditentukan container | 3 |
| **Media query** | Aturan yang berlaku pada syarat tertentu, misalnya lebar layar atau preferensi pengguna | 3 |
| **Container query** | Seperti media query, tapi melihat lebar wadah komponen, bukan lebar layar | 3 |
| **Breakpoint** | Titik ukuran tempat tata letak berganti bentuk | 3 |
| **Custom property** | Variabel CSS, ditulis `--nama` dan dibaca dengan `var(--nama)` | 3 |
| **Design token** | Nilai desain yang punya satu sumber kebenaran dan nama yang menyebut perannya | 11 |
| **Properti logis** | `margin-inline-start` dan sejenisnya, yang ikut benar saat arah tulisan berubah | 3 |
| **Pseudo-class** | Penanda keadaan pada selektor, misalnya `:hover` dan `:focus-visible` | 3 |
| **Pseudo-element** | Bagian semu sebuah elemen, misalnya `::before` dan `::after` | 3 |
| **`rem` dan `em`** | Satuan relatif terhadap ukuran font root dan ukuran font elemen. Menghormati pengaturan pengguna | 3 |
| **CLS** | Ukuran seberapa banyak tata letak bergeser saat halaman dimuat | 18 |

## JavaScript

| Istilah | Artinya | Modul |
| --- | --- | --- |
| **Nilai dan tipe** | Semua yang diolah program adalah nilai, dan tipenya menentukan apa yang boleh dilakukan | 4 |
| **Variabel** | Nama yang diberikan kepada sebuah nilai. `const` sebagai kebiasaan, `let` kalau berganti | 4 |
| **Falsy** | Tujuh nilai yang dianggap salah: `false`, `0`, `-0`, `0n`, `''`, `null`, `undefined`, `NaN`. Dua di antaranya nilai sah dalam pekerjaan nyata | 4 |
| **`undefined` dan `null`** | Belum pernah diisi, dan sengaja dikosongkan | 4 |
| **Parameter dan argumen** | Nama bahan yang diharapkan fungsi, dan bahan yang benar-benar diserahkan | 4 |
| **`return`** | Cara fungsi menyerahkan hasil. Tanpanya, hasilnya `undefined` | 4 |
| **Scope** | Wilayah tempat sebuah nama bisa dilihat | 5 |
| **Closure** | Kemampuan fungsi mengingat variabel di tempat dia dibuat | 5 |
| **Arrow function** | Bentuk singkat penulisan fungsi, dan yang paling sering dipakai | 5 |
| **Destructuring** | Mengambil beberapa nilai dari objek atau array sekaligus ke variabel terpisah | 5 |
| **Spread** | Tanda `...` yang menyebar isi objek atau array ke tempat baru | 5 |
| **Primitif dan rujukan** | Angka dan teks disalin, objek dan array hanya dirujuk | 5 |
| **Mutasi** | Mengubah isi objek yang sudah ada, berbeda dari membuat objek baru | 5 |
| **Fungsi murni** | Fungsi yang hasilnya hanya bergantung masukannya, dan tidak mengubah apa pun di luar dirinya | 5 |
| **Template literal** | Teks dengan tanda petik miring yang bisa menyisipkan nilai lewat `${}` | 4 |
| **Optional chaining** | `?.` yang mengembalikan `undefined` alih-alih melempar error saat jalurnya kosong | 5 |
| **Nullish coalescing** | `??` yang hanya mengganti nilai saat `null` atau `undefined`, berbeda dari `\|\|` | 5 |
| **Asinkron** | Pekerjaan yang butuh waktu dan tidak menghentikan kode lain selama menunggu | 5 |
| **Promise** | Janji bahwa sebuah nilai akan tersedia nanti, atau gagal dengan alasan | 5 |
| **`async` dan `await`** | Cara menulis kode asinkron supaya terbaca berurutan | 5 |
| **Event loop** | Aturan yang menentukan pekerjaan mana dikerjakan berikutnya saat jalur eksekusi kosong | 5 |
| **Microtask dan macrotask** | Dua antrean pekerjaan. Promise selalu diperiksa sebelum `setTimeout` | 5 |
| **`fetch`** | Cara meminta data lewat jaringan. Tidak melempar error untuk 404 dan 500, jadi `respons.ok` harus diperiksa sendiri | 5 |
| **`AbortController`** | Cara membatalkan permintaan yang sudah tidak relevan | 5 |
| **Module** | Satu berkas dengan `import` dan `export`. Namanya tidak bocor ke lingkup global | 5 |
| **Event delegation** | Satu listener di elemen induk yang melayani seluruh isinya | 6 |
| **XSS** | Celah saat kode penyerang berjalan di halaman Anda. Pintu masuk tersering: menyusun HTML dari data pengguna | 6 |
| **Debounce** | Menunda sebuah tindakan sampai pengguna berhenti, misalnya berhenti mengetik | 6 |
| **Race condition** | Keadaan saat jawaban yang datang lebih lambat menimpa jawaban yang lebih baru | 6 |

## Perkakas

| Istilah | Artinya | Modul |
| --- | --- | --- |
| **Node** | Program yang menjalankan JavaScript di luar browser. Hampir semua perkakas frontend berjalan di atasnya | 0 |
| **Package manager** | Program yang mengunduh dan memasang kode orang lain. Seri ini memakai pnpm | 0 |
| **`package.json`** | Berkas yang menyatakan identitas proyek dan paket yang Anda minta | 0 |
| **Lockfile** | Catatan versi persis yang benar-benar terpasang. Wajib masuk repositori | 7 |
| **Semver** | Penomoran versi tiga angka: yang pertama berarti ada yang rusak, kedua fitur baru, ketiga perbaikan | 7 |
| **`dependencies` dan `devDependencies`** | Paket yang ikut terkirim ke pengguna, dan paket yang hanya dipakai saat mengembangkan | 7 |
| **Bundler** | Perkakas yang menggabungkan banyak berkas jadi sedikit berkas siap kirim | 7 |
| **Tree shaking** | Pembuangan kode yang tidak dipakai saat build | 7 |
| **Minifikasi** | Pemangkasan spasi, komentar, dan nama panjang supaya berkasnya kecil | 7 |
| **Transpilasi** | Penerjemahan sintaks baru jadi sintaks yang didukung browser lama | 7 |
| **Dev server** | Server lokal yang menyajikan proyek Anda sambil Anda mengerjakannya | 7 |
| **HMR** | Pembaruan satu modul tanpa memuat ulang halaman, sehingga state sebagian besar bertahan | 7 |
| **Linter** | Alat yang menandai kode berpotensi jadi bug. Contohnya ESLint | 7 |
| **Formatter** | Alat yang menyeragamkan tampilan kode. Contohnya Prettier | 7 |
| **Git** | Penyimpan rangkaian potret proyek beserta alasan setiap perubahan | 7 |
| **Commit** | Satu potret proyek, berisi satu perubahan yang bisa dijelaskan dalam satu kalimat | 7 |
| **Branch** | Jalur kerja terpisah, sehingga `main` tetap utuh selama sebuah fitur belum selesai | 7 |
| **Pull request** | Usulan menggabungkan cabang ke `main`, beserta tempat menelaahnya | 7 |
| **CI** | Pemeriksaan otomatis yang berjalan di setiap perubahan, sebelum digabung | 7 |

## TypeScript

| Istilah | Artinya | Modul |
| --- | --- | --- |
| **Tipe** | Pernyataan tentang bentuk sebuah nilai, diperiksa sebelum kode dijalankan | 8 |
| **`interface` dan `type`** | Dua cara menuliskan bentuk. `interface` untuk bentuk objek, `type` untuk sisanya | 8 |
| **Union** | Tipe yang berarti "salah satu dari beberapa kemungkinan" | 8 |
| **Discriminated union** | Beberapa bentuk yang dibedakan satu field penanda, sehingga keadaan mustahil tidak bisa ditulis | 8 |
| **Narrowing** | Penyempitan tipe oleh pemeriksaan biasa yang Anda tulis sendiri | 8 |
| **Generics** | Cara menulis fungsi atau wadah yang bekerja untuk tipe apa pun tanpa kehilangan informasi tipenya | 8 |
| **`any` dan `unknown`** | Mematikan pemeriksaan, dan menyatakan "belum diketahui" yang memaksa Anda memeriksa dulu | 8 |
| **Type assertion** | `as`, yaitu janji tanpa bukti kepada TypeScript. Pintu belakang yang sebaiknya dihindari | 8 |
| **`strict`** | Pengaturan yang tidak bisa ditawar. Tanpanya, separuh manfaat TypeScript hilang | 8 |
| **Skema** | Aturan bentuk data yang diperiksa saat kode berjalan, bukan hanya sebelum. Contohnya Zod | 13 |

## React

| Istilah | Artinya | Modul |
| --- | --- | --- |
| **Komponen** | Fungsi yang mengembalikan deskripsi tampilan. Namanya dimulai huruf besar | 9 |
| **JSX** | Sintaks penulisan tampilan di dalam JavaScript. Bukan HTML: `class` jadi `className` | 9 |
| **Props** | Nilai yang diberikan induk ke anak. Mengalir satu arah, dan anak tidak boleh mengubahnya | 9 |
| **State** | Ingatan sebuah komponen. Diganti, tidak diubah | 9 |
| **Render** | Pemanggilan fungsi komponen untuk mendapat deskripsi tampilan yang diinginkan | 9 |
| **Rekonsiliasi** | Pembandingan deskripsi baru dengan yang sebelumnya untuk mencari perbedaannya | 9 |
| **Commit** | Penerapan perbedaan itu ke DOM nyata. Hanya yang berubah yang disentuh | 9 |
| **`key`** | Identitas item dalam daftar. Harus unik dan stabil, dan bukan nomor urut | 9 |
| **State turunan** | Nilai yang bisa dihitung dari nilai lain. Jangan disimpan di state | 9 |
| **Controlled input** | Isian yang nilainya selalu berasal dari state, bukan dari DOM | 9 |
| **Komposisi** | Menyusun tampilan dari komponen yang saling dibungkus, alih-alih menambah props tanpa akhir | 9 |
| **Hook** | Fungsi yang namanya dimulai `use` dan boleh memanggil hook lain | 10 |
| **`useEffect`** | Alat untuk menyinkronkan komponen dengan sistem di luar React. Bukan untuk menghitung | 10 |
| **Cleanup** | Pembersihan apa pun yang dipasang sebuah effect: listener, timer, langganan | 10 |
| **`useRef`** | Wadah nilai yang tidak memicu gambar ulang. Untuk elemen DOM dan id timer | 10 |
| **`useReducer`** | Pengelola state yang punya aturan antar-field, ditulis di satu fungsi | 10 |
| **Context** | Alat pengiriman nilai ke seluruh pohon komponen. Bukan alat manajemen state | 10 |
| **Routing** | Pemetaan URL ke layar yang tampil | 10 |
| **Server Component** | Komponen yang berjalan di server. Kodenya, dependensinya, dan rahasianya tidak sampai ke browser | 14 |
| **Client Component** | Komponen yang butuh JavaScript di browser. Ditandai `'use client'`, dan menular ke turunannya | 14 |
| **Server Action** | Fungsi yang dipanggil klien tapi berjalan di server. Tetap endpoint publik yang wajib memeriksa hak akses | 14 |
| **Streaming** | Pengiriman halaman bertahap, sehingga bagian lambat tidak menahan sisanya | 14 |
| **Hydration mismatch** | Ketidakcocokan antara HTML dari server dan hasil render pertama di klien | 14 |

## Data dari server

| Istilah | Artinya | Modul |
| --- | --- | --- |
| **Stale** | Data yang masih ada di cache tapi kemungkinan sudah tidak sesuai dengan server | 12 |
| **`staleTime`** | Berapa lama data lama masih boleh dipercaya. Pertanyaan produk, bukan pertanyaan teknis | 12 |
| **Stale-while-revalidate** | Menampilkan data lama sekarang sambil mengambil yang baru di latar belakang | 12 |
| **`queryKey`** | Kunci cache. Harus memuat semua yang mengubah hasil | 12 |
| **Invalidasi** | Menandai entri cache sebagai basi setelah data berubah | 12 |
| **Deduplikasi** | Menggabungkan beberapa permintaan yang sama jadi satu | 12 |
| **Mutation** | Operasi yang mengubah data di server | 12 |
| **Pembaruan optimistis** | Mengubah tampilan sebelum server menjawab, lalu membatalkannya kalau gagal | 12 |
| **Pagination berbasis kursor** | Pembagian halaman dengan penanda posisi, bukan nomor halaman. Aman untuk data yang berubah | 12 |

## Keamanan

| Istilah | Artinya | Modul |
| --- | --- | --- |
| **Autentikasi** | Menjawab "siapa Anda" | 15 |
| **Otorisasi** | Menjawab "apa yang boleh Anda lakukan". Selalu diputuskan di server | 15 |
| **Sesi** | Catatan bahwa seorang pengguna sedang login, dan bisa dicabut dari server | 15 |
| **Cookie `httpOnly`** | Cookie yang tidak bisa dibaca JavaScript. Tempat yang benar untuk penanda sesi | 15 |
| **CSRF** | Situs lain yang membuat browser pengguna mengirim permintaan ke aplikasi Anda | 15 |
| **CSP** | Header yang memberi tahu browser kode dari mana saja yang boleh dijalankan | 15 |
| **Clickjacking** | Menaruh halaman Anda di iframe tak terlihat supaya pengguna mengklik tanpa sadar | 15 |
| **Open redirect** | Pengalihan yang tujuannya bisa ditentukan penyerang, sehingga domain Anda jadi umpan phishing | 15 |
| **Sanitasi** | Pembersihan HTML dari sumber luar sebelum ditampilkan | 15 |
| **Passkey** | Login tanpa password memakai kunci kriptografi di perangkat. Tahan phishing | 15 |

## Kualitas dan operasional

| Istilah | Artinya | Modul |
| --- | --- | --- |
| **Unit test** | Pengujian satu fungsi, biasanya logika murni | 17 |
| **Component test** | Pengujian satu komponen beserta interaksinya, dari sudut pandang pengguna | 17 |
| **End-to-end test** | Pengujian aplikasi sungguhan di browser, dari awal sampai akhir satu alur | 17 |
| **Flaky test** | Test yang kadang merah kadang hijau. Lebih berbahaya daripada tidak ada test | 17 |
| **Coverage** | Persentase kode yang tersentuh test. Berguna sebagai penunjuk, berbahaya sebagai target | 17 |
| **MSW** | Alat yang memalsukan jaringan di tingkat permintaan, sehingga keadaan gagal mudah diuji | 17 |
| **LCP** | Waktu sampai isi terbesar tampil. Mewakili "kapan halaman terasa muncul" | 18 |
| **INP** | Seberapa cepat halaman menanggapi interaksi. Mewakili "kapan halaman terasa hidup" | 18 |
| **Core Web Vitals** | Tiga metrik (LCP, INP, CLS) yang jadi angka resmi untuk kualitas pemuatan | 18 |
| **Lab dan lapangan** | Pengukuran yang bisa diulang di mesin Anda, dan pengukuran dari pengguna sungguhan | 18 |
| **p75** | Persentil ke-75. Patokan yang dipakai, karena rata-rata disembunyikan pengguna beruntung | 18 |
| **Throttling** | Pelambatan jaringan dan prosesor saat mengukur, supaya hasilnya mewakili pengguna | 18 |
| **Virtualisasi** | Menggambar hanya baris yang terlihat pada daftar yang sangat panjang | 18 |
| **Anggaran ukuran** | Batas ukuran bundel yang dijalankan mesin di CI, bukan diingat manusia | 18 |
| **Monorepo** | Satu repositori berisi beberapa aplikasi dan paket. Jawaban untuk kode yang dibagikan | 19 |
| **Feature flag** | Penanda yang memisahkan rilis kode dari peluncuran fitur | 19 |
| **Observability** | Kemampuan mengetahui apa yang terjadi di produksi: error, performance, log | 19 |
| **Source map** | Berkas yang memetakan kode terminifikasi kembali ke kode sumber. Diunggah ke pelacak error, tidak disajikan ke publik | 19 |
| **Micro-frontend** | Memecah satu aplikasi jadi beberapa bagian yang dirilis tim berbeda. Biayanya nyata, dan jarang diperlukan | 19 |

## Tiga istilah yang paling sering disalahpahami

Tiga ini pantas dibaca meski Anda hanya melewati halaman ini sekali.

**"State" punya dua arti yang sangat berbeda.** Pada aksesibilitas, state berarti keadaan sebuah kontrol yang dibacakan pembaca layar: checked, disabled, expanded. Pada React, state berarti ingatan sebuah komponen. Keduanya dipakai di seri ini, dan konteksnya yang menentukan.

**"Render" juga punya dua arti.** Pada browser, render berarti menggambar piksel ke layar. Pada React, render berarti memanggil fungsi komponen untuk mendapat deskripsi tampilan, dan belum menyentuh layar sama sekali. Perbedaan ini yang membuat kalimat "komponen Anda dirender berkali-kali" tidak seseram bunyinya.

**"Cache" bukan satu tempat.** Browser punya cache, CDN punya cache, server punya cache, dan library data punya cache sendiri di memori. Saat ada laporan "datanya masih yang lama", pertanyaan pertama selalu cache yang mana.

## Kalau sebuah istilah tidak ada di sini

Tiga tempat yang hampir selalu menjawab, dengan urutan ini:

1. **MDN Web Docs** untuk apa pun yang menyangkut HTML, CSS, JavaScript, dan API browser. Ini rujukan paling tepercaya, ikut diperbarui, dan sebagian besar halamannya punya contoh yang bisa dijalankan.
2. **Dokumentasi resmi** untuk setiap library: react.dev, tanstack.com, zod.dev, dan seterusnya. Jawaban di forum berumur lima tahun sering sudah tidak berlaku.
3. **Spesifikasinya sendiri** untuk kasus yang benar-benar aneh. Jarang dibutuhkan, dan satu-satunya sumber yang pasti benar.

Dan satu kebiasaan dari Modul 0 yang berlaku di sini juga: saat mencari istilah, buang bagian yang khas milik proyek Anda. Mencari nama variabel Anda sendiri tidak akan menemukan apa pun.
