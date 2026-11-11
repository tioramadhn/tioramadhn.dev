---
title: 'Belajar Backend dari Nol sampai Mahir: Peta Belajar 23 Modul'
description: Rute belajar backend yang disusun dari masalah ke solusi. Dari satu permintaan HTTP sampai sistem terdistribusi, dengan Node.js dan TypeScript, Postgres, Redis, queue, dan jalur operasional yang dipakai di tempat kerja.
date: 2026-12-01
slug: belajar-backend-dari-nol-peta-belajar
tags: tutorial backend
series: Tutorial Backend
status: draftla
---

Roadmap backend biasanya berbentuk daftar: Node, Express, MongoDB, Docker, Kubernetes, microservice. Masalahnya, daftar itu tidak pernah menjelaskan hal yang paling menentukan: kapan sebuah teknologi dipakai, dan kapan memakainya justru membuat sistem Anda lebih sulit dirawat tanpa manfaat apa pun.

Backend punya satu sifat yang membuat kesalahan di sini lebih mahal daripada di frontend: **kesalahan di backend meninggalkan jejak.** Bug tampilan bisa diperbaiki lalu hilang. Transaksi yang tercatat dobel, stok yang jadi minus, atau tabel tanpa indeks yang baru terasa saat datanya dua juta baris adalah masalah yang hidup di dalam data Anda, dan memperbaikinya butuh migrasi, bukan sekadar deploy.

Seri ini disusun dari masalah ke solusi. Setiap modul dimulai dari satu masalah yang konkret, teknologinya muncul sebagai jawaban, lalu modul ditutup dengan masalah baru yang jadi pintu masuk modul berikutnya.

## Prasyarat

Dasar JavaScript (variabel, fungsi, `async`/`await`, array method), terbiasa dengan terminal, dan Git dasar. Tidak perlu pengalaman mengelola server, tidak perlu tahu SQL, dan tidak perlu pernah menyentuh Docker.

Kalau Anda datang dari [seri frontend](/blog/series/tutorial-frontend), modul 4 sampai 7 di sana sudah cukup sebagai bekal, dan TypeScript yang Anda pakai di sini bahasa yang sama. Kalau Anda belum pernah menulis TypeScript sama sekali, modul 2 dan 3 seri ini tetap bisa diikuti, dan tipenya dijelaskan saat dipakai.

## Rantai masalahnya

Ini inti dari cara seri ini disusun. Bacalah sebagai satu alur, bukan daftar:

1. Browser mengirim permintaan ke suatu tempat. **Apa yang sebenarnya menerima dan menjawabnya?**
2. Server HTTP menjawabnya. **Kenapa satu permintaan berat membuat semua permintaan lain ikut lambat?**
3. Model eksekusi Node menjelaskannya. **Bagaimana menyusun ratusan rute tanpa jadi satu berkas raksasa?**
4. Routing, middleware, dan validasi menjawabnya. **Bentuk API seperti apa yang tidak menyiksa pemakainya?**
5. Desain API menjawabnya. **Data hilang setiap kali server dinyalakan ulang. Ke mana data disimpan?**
6. Basis data relasional menjawabnya. **Bagaimana cara mengambil dan menggabungkan data itu?**
7. SQL menjawabnya. **Bagaimana aplikasi Node berbicara dengannya tanpa membuka seribu sambungan?**
8. Driver, pool, dan ORM menjawabnya. **Dua pembeli terakhir mengambil stok yang sama. Siapa yang menang?**
9. Transaksi dan penguncian menjawabnya. **Kueri yang tadinya 5 ms sekarang 4 detik. Apa yang berubah?**
10. Indeks dan rencana kueri menjawabnya. **Siapa pengguna yang mengirim permintaan ini?**
11. Autentikasi menjawabnya. **Pengguna ini boleh melihat data milik siapa saja?**
12. Otorisasi dan multi-tenancy menjawabnya. **Apa yang terjadi kalau ada yang sengaja menyerang API ini?**
13. Keamanan backend menjawabnya. **Kueri yang sama dijalankan sepuluh ribu kali per menit. Perlu tidak?**
14. Caching menjawabnya. **Mengirim email dan membuat PDF membuat permintaan tertahan 8 detik. Bagaimana?**
15. Pekerjaan latar dan queue menjawabnya. **Lima layanan perlu tahu saat ada pesanan baru. Siapa memberi tahu siapa?**
16. Arsitektur berbasis peristiwa menjawabnya. **Pengguna ingin melihat perubahan tanpa menekan muat ulang.**
17. WebSocket dan SSE menjawabnya. **Pengguna mengunggah video 800 MB. Lewat mana?**
18. Penyimpanan objek dan unggahan langsung menjawabnya. **Produksi lambat, dan tidak ada yang tahu bagian mana.**
19. Observability menjawabnya. **Satu layanan pihak ketiga mati, dan seluruh sistem Anda ikut mati.**
20. Pola ketahanan menjawabnya. **Setiap rilis mempertaruhkan yang sudah jalan.**
21. Testing backend menjawabnya. **Jalan di laptop saya, mati di server.**
22. Container, konfigurasi, dan jalur rilis menjawabnya. **Satu basis kode, delapan tim, satu jadwal rilis.**
23. Pemisahan layanan menjawabnya. **Sekarang datanya tersebar, dan tidak ada lagi satu transaksi yang menyatukannya.**
24. Pola sistem terdistribusi menjawabnya, dengan harga yang harus Anda hitung sendiri.

## Peta modul

| No | Modul | Masalah yang diselesaikan | Tingkat |
| --- | --- | --- | --- |
| 1 | Cara kerja backend dan jaringan | Apa yang terjadi di sisi server antara permintaan masuk dan respons keluar, dan di mana waktunya habis? | Pemula |
| 2 | Node.js: model eksekusi dan I/O | Satu permintaan yang berat membuat seluruh server tidak menanggapi siapa pun. | Pemula |
| 3 | Server HTTP, routing, dan validasi | Dua ratus rute, penanganan error yang disalin ke mana-mana, dan masukan yang tidak pernah dipercaya. | Pemula |
| 4 | Desain API yang dipakai orang | Pemakai API Anda harus menebak nama, bentuk, dan arti setiap respons. | Pemula |
| 5 | Pemodelan data relasional | Data yang disimpan sembarangan jadi sumber kebenaran yang saling bertentangan. | Menengah |
| 6 | SQL yang dipakai sehari-hari | Pertanyaan bisnis sederhana jadi tiga puluh baris kode aplikasi yang lambat. | Menengah |
| 7 | Akses basis data dari Node | Sambungan habis, kueri berulang, dan satu daftar memicu seratus kueri. | Menengah |
| 8 | Transaksi dan konkurensi | Dua permintaan bersamaan menghasilkan stok minus dan saldo ganda. | Menengah |
| 9 | Indeks dan performa kueri | Kueri yang cepat saat data seribu baris jadi tak terpakai saat dua juta. | Menengah |
| 10 | Autentikasi dan sesi | Menyimpan password, memulihkan akun, dan menjaga sesi tanpa membuka celah. | Menengah |
| 11 | Otorisasi dan multi-tenancy | Satu kesalahan kecil membuat data satu pelanggan terlihat pelanggan lain. | Menengah |
| 12 | Keamanan backend | API Anda terbuka di internet, dan tidak semua yang memanggilnya berniat baik. | Menengah |
| 13 | Caching dari HTTP sampai Redis | Kueri mahal yang sama dijalankan ribuan kali untuk jawaban yang sama. | Menengah |
| 14 | Pekerjaan latar dan queue | Pengguna menunggu delapan detik karena email, PDF, dan notifikasi dikerjakan di tengah permintaan. | Lanjut |
| 15 | Arsitektur berbasis peristiwa | Lima bagian sistem perlu bereaksi terhadap satu kejadian, tanpa saling mengunci. | Lanjut |
| 16 | Realtime: WebSocket dan SSE | Data berubah di server, dan pengguna baru tahu setelah menekan muat ulang. | Lanjut |
| 17 | Berkas dan media | Unggahan besar, pemrosesan gambar, dan tautan yang tidak boleh bisa ditebak. | Lanjut |
| 18 | Observability | Ada yang lambat atau rusak, dan tidak ada data untuk menunjuk bagian mana. | Lanjut |
| 19 | Ketahanan dan degradasi | Satu ketergantungan melambat, lalu seluruh sistem tumbang bersamanya. | Lanjut |
| 20 | Testing backend | Setiap perubahan mempertaruhkan yang sudah berjalan, dan uji manual tidak pernah cukup. | Lanjut |
| 21 | Container, konfigurasi, dan rilis | "Jalan di laptop saya", migrasi yang menurunkan layanan, dan rilis yang menegangkan. | Lanjut |
| 22 | Dari monolit ke beberapa layanan | Satu basis kode dan satu jalur rilis mulai jadi penghambat banyak tim. | Mahir |
| 23 | Sistem terdistribusi | Data tersebar di beberapa layanan, dan tidak ada lagi satu transaksi yang menyatukannya. | Mahir |

## Proyek sebagai checkpoint

Setiap tiga sampai lima modul ada satu proyek yang menggabungkan semuanya:

- **Proyek 1: API perpustakaan tanpa basis data.** Routing, validasi, penanganan error, pagination, dan dokumentasi OpenAPI. Penyimpanannya di memori, supaya Anda merasakan sendiri kenapa basis data dibutuhkan.
- **Proyek 2: API toko dengan Postgres.** Pemodelan data, transaksi saat memesan, pencegahan pemesanan ganda, keyset pagination, dan kueri yang sudah diukur dengan `EXPLAIN ANALYZE`.
- **Proyek 3: Layanan autentikasi multi-tenant.** Sesi, rotasi token, peran dan izin, isolasi data antar tenant, pembatasan laju, dan jejak audit.
- **Proyek 4: Sistem pemesanan berbasis peristiwa.** Queue, pola outbox, percobaan ulang dengan dead letter queue, notifikasi, dan laporan yang dihitung di latar.
- **Proyek 5: Audit ketahanan dan beban.** Ambil layanan dari proyek sebelumnya, pasang logging terstruktur, metrik, dan tracing, lalu uji beban dengan k6 sampai patah, dan perbaiki sampai gagal dengan baik.
- **Proyek Akhir: Platform pengiriman terdistribusi.** Beberapa layanan, komunikasi berbasis peristiwa, saga untuk transaksi lintas layanan, idempotency di setiap batas, observability, jalur rilis, dan dokumen keputusan yang menjelaskan kenapa setiap batas layanan ditarik di situ.

## Struktur tiap modul

Formatnya tetap, supaya Anda tahu apa yang diharapkan:

1. **Pengenalan.** Jembatan dari modul sebelumnya, masalah dulu, lalu analogi sehari-hari.
2. **Cara kerja.** Bagaimana komponennya bekerja, bukan hanya cara memakainya.
3. **Opsi tools.** Kategori, fungsi, contoh, dan kapan memilih yang mana.
4. **Latihan bertahap.** Terpandu, lalu berpetunjuk, lalu mandiri.
5. **Batasnya.** Apa yang tetap tidak bisa diselesaikan bagian ini.
6. **Rangkuman dan masalah terbuka.** Poin kunci, lalu pertanyaan yang dijawab modul berikutnya.

## Pilihan teknologi, dan alasannya

Seri ini memakai satu tumpukan dari awal sampai akhir, supaya pembahasannya bisa masuk ke detail yang nyata, bukan berhenti di permukaan:

| Bagian | Pilihan | Alasannya |
| --- | --- | --- |
| Runtime | Node.js LTS | Paling banyak dipakai di pasar kerja Indonesia, dan satu bahasa dengan frontend |
| Bahasa | TypeScript, mode ketat | Bentuk data yang dijaga mesin, bukan dijaga ingatan |
| Framework HTTP | Fastify, dengan catatan untuk Hono dan NestJS | Cepat, validasi skema bawaan, tidak menyembunyikan HTTP |
| Basis data | PostgreSQL | Jawaban bawaan yang benar untuk hampir semua aplikasi |
| Akses data | SQL langsung, lalu Drizzle | SQL dipelajari dulu, abstraksi menyusul |
| Cache dan queue | Redis, BullMQ | Satu alat yang Anda akan temui di hampir semua tempat kerja |
| Peristiwa | NATS atau Kafka | Dibahas berdampingan beserta kapan memilih yang mana |
| Pengujian | Vitest, Testcontainers, k6 | Uji terhadap Postgres sungguhan, bukan tiruan |
| Operasional | Docker, OpenTelemetry, GitHub Actions | Standar yang berlaku di mana-mana |

Yang Anda pelajari tetap berpindah. Pola transaksi, indeks, idempotency, queue, dan observability berlaku sama di Go, Python, Java, atau PHP. Yang berganti hanya sintaksisnya.

## Yang dicari industri sekarang

Isi seri ini dipilih dari apa yang benar-benar diminta pada pekerjaan backend hari ini, bukan dari apa yang sedang ramai. Lima pergeseran yang paling terasa:

**Postgres jadi jawaban bawaan.** Sepuluh tahun lalu pertanyaannya "SQL atau NoSQL". Sekarang jawabannya hampir selalu Postgres dulu, dan pilihan lain perlu alasan khusus. Karena itu lima modul seri ini masuk ke dalamnya dengan serius, termasuk transaksi dan rencana kueri.

**Reliability jadi pertanyaan wawancara standar.** Timeout, percobaan ulang, idempotency, dan graceful shutdown dulu dianggap urusan senior. Sekarang ditanyakan di tingkat menengah, karena begitu sistem Anda memanggil layanan lain, semuanya jadi kebutuhan sehari-hari.

**Observability bukan tambahan.** Logging terstruktur, metrik, dan tracing adalah bagian dari definisi "selesai" untuk sebuah fitur, bukan pekerjaan yang dijadwalkan setelah ada insiden.

**Biaya ikut dihitung.** Kueri yang tidak diindeks, cache yang tidak dipakai, dan instance yang kebesaran punya angka di tagihan bulanan. Engineer yang bisa menjelaskan dampak biaya dari keputusan teknisnya punya nilai tambah yang nyata.

**Menulis kode jadi murah, menilai kode jadi mahal.** Dengan bantuan AI, menghasilkan endpoint butuh sepuluh detik, dan endpoint itu akan terlihat benar. Yang tidak bisa dihasilkan otomatis: menyadari bahwa kode itu punya celah konkurensi, akan lambat pada sepuluh juta baris, atau akan memproses satu pembayaran dua kali saat jaringan pengguna tersendat. Karena itu setiap latihan di seri ini meminta alasan, bukan hanya hasil.

## Satu hal yang perlu diluruskan di awal

Tujuan seri ini bukan membuat Anda membangun microservice.

Dua puluh dua modul pertama membangun **satu layanan yang dikerjakan dengan benar**, dan modul 22 serta 23 membahas pemecahan layanan sebagai jawaban untuk masalah yang sangat spesifik, yaitu terlalu banyak tim dalam satu jalur rilis. Kalau masalah itu belum ada, memecah layanan hanya menambahkan jaringan di antara fungsi yang tadinya memanggil satu sama lain secara langsung, dan jaringan bisa gagal.

Yang pantas jadi tujuan: mampu merancang, membangun, mengamankan, mengukur, dan merilis layanan yang menjaga data pengguna tetap benar, **sekaligus tahu kapan sebuah pola tidak perlu dipakai.** Monolit yang tersusun rapi dengan batas modul yang jelas adalah jawaban yang benar untuk sebagian besar perusahaan, dan mengatakannya di ruang rapat butuh pemahaman yang lebih dalam daripada menyetujui hal yang sedang populer.

## Berapa lama

Dengan ritme satu modul tiga sampai empat hari dan proyek seminggu, seri ini habis dalam empat sampai lima bulan. Lebih lambat kalau Anda mengerjakan proyeknya dengan sungguh-sungguh, dan itu versi yang lebih baik.

Satu saran yang menentukan hasil: kerjakan proyeknya dengan domain yang Anda pahami. Ganti toko jadi klinik, ganti pengiriman jadi penyewaan alat. Aturan bisnis yang Anda mengerti akan memunculkan pertanyaan yang tidak muncul dari spesifikasi yang disalin, dan pertanyaan itulah tempat belajar yang sebenarnya.

Mulai dari Modul 1: apa yang terjadi di sisi server, dan di mana waktunya habis.
