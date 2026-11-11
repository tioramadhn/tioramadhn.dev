---
title: 'Proyek Akhir: Platform Kursus Mini Siap Produksi'
description: Rancang, bangun, uji, amankan, percepat, dan rilis satu platform utuh, lalu pertanggungjawabkan setiap keputusan arsitekturnya dengan angka.
date: 2026-12-01
slug: proyek-akhir-platform-kursus
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Sembilan belas modul dan empat proyek. Setiap kali, pilihannya sudah disediakan beserta alasannya. Proyek ini mencabut kemudahan itu.

Yang diminta bukan hanya aplikasi yang berfungsi, tapi aplikasi yang bisa Anda pertahankan dalam percakapan: kenapa bagian ini dirender di server, kenapa data itu di-cache selama lima menit, kenapa komponen ini memakai library dan yang itu dibuat sendiri, dan apa yang sengaja tidak dikerjakan.

Kemampuan itulah yang membedakan engineer dari orang yang bisa mengikuti tutorial. Terutama sekarang, saat menghasilkan kode jadi murah dan menilai kode jadi mahal.

## Menutup lingkaran

| Modul | Yang dipakai di proyek ini |
| --- | --- |
| 0 | Terminal, editor, dan kebiasaan membaca pesan error sampai habis |
| 1 | Keputusan rendering per halaman, dan kemampuan membaca dari mana lambatnya berasal |
| 2 | Struktur dokumen, form, dan semantik yang jadi dasar aksesibilitas |
| 3 | Layout responsif, container query, mode gelap |
| 4 | Kondisi, perulangan, fungsi, dan kehati-hatian terhadap tipe serta nilai nol |
| 5 | Pengolahan data, asinkron, pembatalan |
| 6 | Satu sumber kebenaran, dan pembagian state antara URL, penyimpanan, dan memori |
| 7 | Tooling, lint, format, Git, pemeriksaan di CI |
| 8 | TypeScript ketat, discriminated union untuk keadaan |
| 9, 10 | Komponen, komposisi, hook, Context yang dipisah per laju perubahan, routing |
| 11 | Design token tiga lapis, tema, komponen dasar yang konsisten |
| 12 | Cache, kunci query, invalidasi, pembaruan optimistis |
| 13 | Skema sebagai sumber tipe dan validasi, pesan error untuk manusia |
| 14 | Server Component, Server Action, streaming, cache berbasis tag |
| 15 | Sesi `httpOnly`, otorisasi per aksi, pencegahan kebocoran rahasia |
| 16 | Keyboard, pembaca layar, kontras, wilayah live |
| 17 | Unit, komponen, dan lima E2E yang dipilih |
| 18 | Anggaran ukuran, Core Web Vitals yang diukur di perangkat nyata |
| 19 | Jalur rilis, feature flag, pemantauan dengan penyaringan data pribadi |

## Cerita proyek

Sebuah komunitas belajar di Jakarta punya 40 pengajar dan beberapa ribu peserta. Sekarang semuanya dikelola dengan spreadsheet, grup pesan, dan tautan video yang disebar manual. Tiga keluhan yang paling sering muncul:

1. Peserta tidak tahu sudah sampai mana progres belajarnya.
2. Pengajar menghabiskan waktu untuk menyalin data pendaftaran dari satu tempat ke tempat lain.
3. Tidak ada yang bisa menjawab pertanyaan "materi mana yang paling banyak ditinggalkan di tengah".

Anda diminta membangun platformnya. Anggaran kecil, tenggat tiga minggu, dan satu syarat dari ketua komunitas: "harus bisa dipakai di HP murah dengan sinyal pas-pasan, karena separuh peserta kami begitu."

Syarat terakhir itu bukan hiasan. Syarat itu yang menentukan hampir semua keputusan teknis Anda.

## Arsitektur referensi

Ini satu susunan yang bekerja. Anda tidak wajib mengikutinya, tapi kalau menyimpang, simpangannya harus bisa dijelaskan.

```text
                    Pengunjung / Peserta / Pengajar
                                 |
                                 v
                 +-------------------------------+
                 |   Next.js App Router (Worker  |
                 |   atau Node di hosting)       |
                 |                               |
                 |  Server Component  <--- baca data
                 |  Server Action     <--- tulis data + otorisasi
                 |  Route Handler     <--- webhook, OG image, RSS
                 +---------------+---------------+
                                 |
         +----------------+------+-------+----------------+
         |                |              |                |
         v                v              v                v
   Basis data        Penyimpanan     Penyedia auth     Pemantauan
   (Postgres)        berkas (R2/S3)  (Auth.js)         (Sentry, vitals)
```

### Komponen dan asalnya

| Bagian | Asalnya | Catatan |
| --- | --- | --- |
| Halaman publik katalog kursus | Server Component, di-cache dengan tag | Harus terbaca mesin pencari dan cepat |
| Halaman materi | Server Component | Isi Markdown dirender di server |
| Penanda progres | Client Component kecil + Server Action | Pembaruan optimistis |
| Dasbor pengajar | Server Component + tabel dari Proyek 3 | Filter di URL |
| Form pendaftaran | Server Action + skema Zod | Bekerja tanpa JavaScript |
| Komponen dasar | Paket token dan UI dari modul 11 dan 19 | Satu sumber |
| Notifikasi dan dialog | Library headless | Jangan buat sendiri |

### Keputusan yang harus Anda ambil sendiri

Tujuh pertanyaan berikut tidak punya satu jawaban benar, dan setiap jawaban Anda wajib disertai alasan di dokumen keputusan:

1. **Mana yang di-cache, dan berapa lama?** Katalog kursus, daftar materi, progres peserta, dan statistik pengajar punya jawaban yang berbeda.
2. **Progres belajar disimpan di mana saat peserta belum login?** Penyimpanan lokal, atau wajib login dari awal?
3. **Video materi: disematkan dari YouTube, atau diunggah sendiri?** Pertimbangkan biaya, kecepatan di jaringan lemah, dan ketergantungan pada pihak ketiga.
4. **Pencarian: di basis data, atau layanan pencarian terpisah?** Pada skala ribuan materi, keduanya masuk akal dengan konsekuensi berbeda.
5. **Statistik "materi yang paling banyak ditinggalkan": dihitung langsung saat diminta, atau dihitung berkala?** Yang pertama selalu akurat, yang kedua jauh lebih murah.
6. **TanStack Query masih dipakai atau tidak?** Dengan Server Component, sebagian besar pembacaan tidak lagi membutuhkannya. Mana bagian yang masih butuh?
7. **Apa yang sengaja tidak dikerjakan?** Daftar ini wajib ada, dan justru paling dinilai.

## Opsi tools

| Kebutuhan | Pilihan yang wajar | Catatan |
| --- | --- | --- |
| Framework | Next.js App Router | Atau Remix, kalau Anda bisa menjelaskan alasannya |
| Basis data | Postgres (Neon, Supabase) | SQLite (Turso) juga sah untuk skala ini |
| ORM | Prisma, Drizzle | Drizzle lebih ringan, Prisma lebih mapan |
| Autentikasi | Auth.js, Clerk | Jangan buat sendiri |
| Penyimpanan berkas | Cloudflare R2, S3 | Unggahan langsung dari klien dengan URL bertanda tangan |
| Styling | Tailwind dengan token sendiri | Konsisten dengan modul 11 |
| Validasi | Zod | Satu skema, tiga pemakai |
| Test | Vitest, Testing Library, Playwright | Lima E2E, tidak lima puluh |
| Pemantauan | Sentry, `web-vitals` | Dengan penyaringan data pribadi |
| Hosting | Vercel, Cloudflare Workers | Pratinjau per pull request wajib |

## Spesifikasi wajib

### A. Dokumen, dikerjakan lebih dulu

Sebelum satu baris kode, tulis empat dokumen pendek. Masing-masing cukup satu halaman.

1. **Peta halaman dan keputusan rendering.** Setiap halaman beserta jawaban: static, server per permintaan, atau klien, dan alasannya.
2. **Rancangan data.** Tabel, relasi, dan indeks. Sertakan kueri yang paling sering dijalankan.
3. **Matriks peran.** Pengunjung, peserta, pengajar, admin, dan apa yang boleh masing-masing untuk setiap sumber daya.
4. **Rencana cache.** Setiap pengambilan data beserta waktu kedaluwarsa dan pemicu invalidasinya.

Dokumen ini bukan formalitas. Dokumen inilah yang akan menghemat satu minggu penulisan ulang.

### B. Fitur

**Publik**

5. Katalog kursus dengan pencarian dan filter kategori, keadaannya di URL.
6. Halaman detail kursus: silabus, pengajar, jumlah peserta, dan ulasan.
7. Pratinjau satu materi gratis per kursus.
8. Halaman OG image yang dihasilkan per kursus untuk pratinjau tautan.

**Peserta**

9. Daftar akun, masuk, dan keluar.
10. Mendaftar kursus, lalu kursus itu muncul di dasbor pribadi.
11. Membaca materi berurutan, dengan navigasi sebelumnya dan berikutnya.
12. Menandai materi selesai, dengan progres yang terlihat di dasbor.
13. Melanjutkan dari materi terakhir yang dibuka.
14. Mengerjakan kuis pilihan ganda per bab, dengan hasil yang tersimpan.
15. Memberi ulasan setelah menyelesaikan minimal separuh materi.

**Pengajar**

16. Dasbor berisi kursus miliknya, jumlah peserta, dan tingkat penyelesaian.
17. Membuat dan mengubah kursus, bab, dan materi, dengan penyunting Markdown.
18. Mengunggah gambar untuk materi.
19. Menerbitkan dan menarik kembali kursus, dengan draf yang tidak terlihat publik.
20. Melihat materi mana yang paling banyak ditinggalkan di tengah.

**Admin**

21. Menyetujui pengajar baru, dan mencabut akses.
22. Melihat daftar laporan dari pengguna.

### C. Kualitas dan keamanan

23. Seluruh basis kode TypeScript ketat, tanpa `any`, tanpa `as` yang tidak dibenarkan komentar.
24. Satu skema Zod per bentuk data, dipakai di form, Server Action, dan pembacaan respons luar.
25. Satu fungsi otorisasi terpusat, dipakai setiap jalur tulis dan setiap pembacaan data pribadi.
26. Sumber daya milik orang lain tidak bisa diakses dengan menebak id, dan jawabannya sama dengan "tidak ditemukan".
27. Markdown dari pengajar dirender dengan aman, tanpa HTML mentah yang tidak dibersihkan.
28. Unggahan gambar dibatasi jenis dan ukurannya, dan diperiksa di server.
29. Pembatasan laju pada pendaftaran, login, dan pengiriman ulasan.
30. Tidak ada rahasia di bundel klien, dan tidak ada objek pengguna utuh yang dikirim ke Client Component.

### D. Aksesibilitas dan performance

31. Lulus pemeriksaan axe tanpa pelanggaran serius pada lima halaman utama.
32. Seluruh alur peserta bisa dikerjakan dengan keyboard saja.
33. Diuji dengan satu pembaca layar untuk alur "cari kursus, daftar, baca materi, tandai selesai".
34. Teks diperbesar 200% tanpa ada yang terpotong, dan lebar 320 piksel tanpa gulir horizontal.
35. Core Web Vitals pada HP kelas menengah dengan jaringan dilambatkan: LCP di bawah 2,5 detik, INP di bawah 200 ms, CLS di bawah 0,1 untuk katalog dan halaman materi.
36. Anggaran ukuran bundel ditetapkan dan dijalankan di CI.

### E. Deploy dan operasional

37. Tayang di domain yang bisa dibuka siapa saja.
38. Pipeline CI: `tsc`, lint, format, unit, komponen, anggaran ukuran, lalu E2E.
39. Pratinjau per pull request.
40. Migrasi basis data sebagai langkah terpisah yang kompatibel dua arah.
41. Pelacakan error dengan source map yang tidak terbuka publik, dan penyaringan data pribadi.
42. Pengiriman Core Web Vitals dari pengguna sungguhan ke penyimpanan Anda sendiri.
43. Satu feature flag yang benar-benar dipakai, beserta rencana pembersihannya.
44. Berkas `README` yang memungkinkan orang lain menjalankan proyek ini dalam 15 menit.

### F. Demo dan dokumen keputusan

45. Rekaman demo 5 sampai 7 menit: alur peserta, alur pengajar, dan satu keadaan gagal yang ditangani dengan baik.
46. Dokumen keputusan berisi minimal delapan keputusan, masing-masing dengan format: apa yang diputuskan, alternatifnya, alasannya, dan apa yang akan membuat Anda mengubahnya.
47. Satu halaman berisi angka: ukuran bundel, Core Web Vitals, jumlah test, waktu pipeline, dan hasil audit aksesibilitas.
48. Daftar "sengaja tidak dikerjakan" beserta alasannya.

Nomor 48 sering dianggap kelemahan. Sebaliknya: daftar itu bukti Anda membuat keputusan, bukan sekadar mengerjakan apa yang terpikir lebih dulu.

### Garis finis

Empat puluh delapan syarat adalah daftar lengkapnya, dan daftar lengkap bukan syarat kelulusan. Yang menentukan proyek ini berhasil atau tidak ada di bobot penilaian di bawah, dan "semua fitur jalan" hanya mewakili sebagian kecilnya.

| Tingkat | Yang wajib ada | Alasan |
| --- | --- | --- |
| **Inti** | Bagian A seluruhnya, alur peserta (9 sampai 14), alur pengajar (16 sampai 19), bagian C seluruhnya, dan syarat 37, 38, 44, 46, 48 | Satu alur utuh dari dua sisi, aman, tayang, dan bisa dipertanggungjawabkan |
| **Lengkap** | Seluruh 1 sampai 48 | Setara dengan pekerjaan yang dinilai di wawancara senior |
| **Dikurangi dengan sengaja** | Apa pun yang Anda putuskan tidak dikerjakan, **asalkan masuk daftar nomor 48** | Ini bukan kekurangan, dan dinilai |

Perhatikan baris ketiga. Memotong fitur dengan alasan yang tertulis adalah keputusan engineering, dan nilainya lebih tinggi daripada mengerjakan semuanya dengan setengah hati. Yang tidak dinilai hanya satu: fitur yang hilang tanpa ada yang tahu kenapa.

Bagian A (empat dokumen rancangan) dan bagian C (kualitas serta keamanan) tidak punya versi ringan. Keduanya murah dikerjakan sejak awal dan sangat mahal ditambal di akhir, dan itu seluruh pelajaran dari Modul 16 sampai 19.

## Langkah pengerjaan bertahap

### Minggu 1: rancang, lalu bangun kerangka

**Hari 1 sampai 2: dokumen dan rancangan.** Empat dokumen di bagian A. Tahan keinginan membuka editor kode. Kalau rancangan datanya salah, Anda akan membayarnya dengan penulisan ulang di minggu ketiga.

**Hari 3: kerangka proyek.** Next.js, TypeScript ketat, ESLint, Prettier, Vitest, Playwright, token dan komponen dasar, `pnpm check` yang jalan di CI, dan deploy pertama yang masih kosong. Tayang sejak hari ketiga, bukan hari terakhir.

**Hari 4 sampai 5: data dan autentikasi.** Skema basis data, migrasi, Auth.js dengan sesi `httpOnly`, fungsi otorisasi terpusat beserta test-nya. Autentikasi dikerjakan lebih awal karena hampir semua fitur bergantung padanya.

**Hari 6 sampai 7: jalur publik.** Katalog dan detail kursus sebagai Server Component, dengan data contoh. Di akhir minggu pertama, katalog sudah bisa dibuka orang lain di internet.

### Minggu 2: fitur inti

**Hari 8 sampai 9: alur peserta.** Pendaftaran kursus, pembacaan materi, penanda progres dengan pembaruan optimistis, dan melanjutkan dari materi terakhir.

**Hari 10 sampai 11: alur pengajar.** Penyunting materi, unggahan gambar, penerbitan dan penarikan, serta otorisasi yang diuji dengan sungguhan: masuk sebagai pengajar lain dan coba ubah kursus yang bukan miliknya.

**Hari 12: kuis dan ulasan.** Validasi berlapis, dan aturan "ulasan hanya setelah separuh materi selesai" yang diperiksa di server.

**Hari 13 sampai 14: test dan perbaikan.** Unit untuk otorisasi dan skema, komponen untuk form dan penanda progres, lima E2E untuk alur utama. Tambahkan test untuk setiap bug yang Anda temukan minggu ini.

### Minggu 3: siap produksi

**Hari 15 sampai 16: aksesibilitas.** Audit keyboard untuk semua alur, perbaiki, lalu uji dengan pembaca layar. Jalankan axe pada lima halaman utama.

**Hari 17 sampai 18: performance.** Ukur di HP sungguhan dengan data seluler, catat angka awal, perbaiki dengan urutan dari modul 18, lalu ukur lagi. Pasang anggaran ukuran di CI.

**Hari 19: operasional.** Pelacakan error dengan penyaringan, pengiriman vitals, satu feature flag, dan prosedur mundur yang benar-benar Anda coba sekali.

**Hari 20 sampai 21: dokumen dan demo.** Dokumen keputusan, halaman angka, daftar yang tidak dikerjakan, `README`, dan rekaman demo.

Satu saran yang menentukan hasil: **jangan menyimpan aksesibilitas dan performance untuk minggu ketiga.** Keduanya ada di jadwal minggu ketiga sebagai audit, bukan sebagai pekerjaan dari nol. Kalau Anda menulis markup yang benar dan memesan ukuran gambar sejak hari pertama, minggu ketiga akan berisi perbaikan kecil, bukan penulisan ulang.

## Bahan referensi dari proyek sebelumnya

Anda tidak memulai dari nol. Empat proyek sebelumnya menyediakan potongan yang bisa dipakai langsung:

| Dari | Yang bisa dipakai |
| --- | --- |
| Proyek 1 | Pola keadaan: kosong, memuat, tanpa hasil, gagal, offline, sebagian gagal |
| Proyek 2 | Lapisan data yang memisahkan bentuk API dari bentuk aplikasi, pola kartu dan kerangka |
| Proyek 3 | Tabel yang benar, keadaan di URL dengan skema, pembaruan optimistis, aksi massal |
| Proyek 4 | Fungsi otorisasi terpusat, penanda penyimpanan yang jujur, penanganan konflik |

Menyalin dan menyesuaikan dari pekerjaan Anda sendiri bukan kemalasan, itu cara kerja yang normal. Yang perlu dihindari hanya menyalin tanpa memahami, karena di proyek ini Anda yang harus menjelaskannya.

## Kriteria penilaian

| Bobot | Aspek | Yang dinilai |
| --- | --- | --- |
| 20% | Keputusan arsitektur | Dokumen keputusan yang jujur, alternatif yang benar-benar dipertimbangkan, dan alasan yang bertahan saat ditanya |
| 15% | Keamanan | Otorisasi di setiap jalur, tidak ada kebocoran rahasia, id yang tidak bisa ditebak |
| 15% | Kualitas kode | TypeScript ketat, batas modul yang jelas, tidak ada state turunan, komponen yang bisa dipakai ulang |
| 15% | Aksesibilitas | Keyboard penuh, lulus axe, teruji dengan pembaca layar |
| 15% | Performance | Angka sebelum dan sesudah pada perangkat nyata, anggaran di CI |
| 10% | Testing | Pilihan test yang tepat, bukan jumlahnya |
| 10% | Operasional | Pipeline, pratinjau, pemantauan, prosedur mundur, `README` |

Perhatikan bobot terbesarnya bukan "fiturnya jalan". Fitur yang jalan adalah syarat minimum. Yang dinilai paling tinggi adalah kemampuan menjelaskan kenapa dibangun seperti itu.

## Pertanyaan yang harus bisa Anda jawab

Anggap ini wawancara setelah proyek selesai. Sepuluh pertanyaan, dan semuanya pertanyaan nyata yang pernah muncul di ruang wawancara:

1. Halaman mana yang dirender di server dan mana di klien, dan apa yang akan berubah kalau separuh pengguna memakai jaringan 2G?
2. Di mana progres belajar peserta disimpan, dan apa yang terjadi kalau dia membuka dari dua perangkat sekaligus?
3. Bagaimana Anda memastikan pengajar tidak bisa mengubah kursus orang lain, dan bagaimana Anda membuktikannya?
4. Berapa lama katalog kursus di-cache, dan apa yang terjadi saat pengajar menerbitkan kursus baru?
5. Apa tiga hal paling berat di bundel klien Anda, dan kenapa yang paling berat itu tetap ada?
6. Angka Core Web Vitals Anda berapa, diukur di perangkat apa, dan bagian mana yang paling sulit diperbaiki?
7. Komponen apa yang Anda buat sendiri padahal ada library-nya, dan kenapa?
8. Test apa yang Anda tulis, dan yang lebih penting: test apa yang Anda putuskan tidak ditulis?
9. Kalau aplikasi ini rusak di produksi malam ini, bagaimana Anda tahu, dan apa langkah pertama Anda?
10. Kalau diberi waktu dua minggu lagi, apa yang Anda kerjakan, dan kenapa itu lebih penting daripada yang lain?

Kalau sepuluh jawaban itu lancar, proyek ini selesai. Kalau ada yang tersangkut, di situ tempat belajar berikutnya.

## Rangkuman

- Membangun aplikasi yang berfungsi adalah syarat minimum. Yang membedakan adalah kemampuan mempertanggungjawabkan keputusannya.
- Dokumen dulu, kode belakangan. Empat halaman rancangan menghemat satu minggu penulisan ulang.
- Tayang sejak hari ketiga. Aplikasi yang hanya hidup di laptop tidak membuktikan apa pun.
- Aksesibilitas dan performance adalah cara bekerja sejak hari pertama, bukan tahap audit di akhir.
- Daftar "sengaja tidak dikerjakan" adalah bukti Anda memilih, dan dinilai sama tinggi dengan yang dikerjakan.
- Angka sebelum dan sesudah adalah satu-satunya bahasa yang meyakinkan untuk kualitas yang tidak terlihat.

## Refleksi akhir

Kalau Anda mengerjakan seri ini sampai sini, Anda punya sesuatu yang lebih berharga daripada daftar teknologi di CV: **rantai sebab akibat.**

Anda tahu kenapa React ada, karena Anda pernah merasakan `render()` tunggal yang membengkak. Anda tahu kenapa TypeScript dipakai, karena Anda pernah mengganti nama field dan mencarinya dengan pencarian teks. Anda tahu kenapa ada lapisan data dengan cache, karena Anda pernah menulis tujuh pekerjaannya dengan tangan. Anda tahu kenapa rendering pindah ke server, karena Anda pernah menghitung empat langkah yang ditunggu pengguna sebelum melihat isi.

Itu bentuk pengetahuan yang tidak bisa didapat dengan membaca dokumentasi, dan tidak bisa digantikan alat bantu apa pun. Alat bantu bisa menuliskan komponen dalam sepuluh detik. Yang tidak bisa dilakukannya: memutuskan apakah komponen itu memang yang Anda butuhkan, menemukan bug pada kode yang kelihatan benar, dan tahu apa yang akan rusak enam bulan lagi.

Tiga hal untuk diteruskan setelah ini:

**Satu, rawat satu proyek lebih dari enam bulan.** Semua pelajaran tentang kode yang bisa dirawat hanya benar-benar masuk setelah Anda sendiri yang kembali ke kode Anda delapan bulan kemudian.

**Dua, baca kode orang lain.** Buka repositori library yang Anda pakai setiap hari. Membaca kode orang yang lebih berpengalaman adalah cara belajar tercepat yang paling jarang dilakukan.

**Tiga, tulis apa yang Anda pelajari.** Menjelaskan sesuatu kepada orang lain memaksa Anda menemukan bagian yang sebenarnya belum Anda pahami. Seri ini sendiri hasil dari proses itu.

Selamat. Sekarang bangun sesuatu yang Anda sendiri ingin pakai.
