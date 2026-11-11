---
title: 'Proyek Akhir: Platform Pengiriman Terdistribusi'
description: Rancang, bangun, amankan, ukur, dan rilis satu platform utuh, lalu pertanggungjawabkan setiap keputusan arsitekturnya dengan angka.
date: 2027-01-01
slug: proyek-akhir-platform-pengiriman
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Dua puluh tiga modul dan lima proyek. Setiap kali, pilihannya sudah disediakan beserta alasannya: Postgres, sesi tersimpan, outbox, monolit modular lebih dulu.

Proyek ini mencabut kemudahan itu. Yang diminta bukan hanya platform yang berfungsi, tapi platform yang bisa Anda pertahankan dalam percakapan: kenapa batas layanan ditarik di situ, data apa yang boleh tertunda, aturan mana yang dijaga basis data, berapa kapasitasnya, dan apa yang sengaja tidak dikerjakan.

Kemampuan itu yang membedakan engineer dari orang yang bisa mengikuti tutorial. Terutama sekarang, saat menghasilkan kode jadi murah dan menilai kode jadi mahal.

## Menutup lingkaran

| Modul | Yang dipakai |
| --- | --- |
| 1 | Anatomi permintaan, anggaran latensi, batas backend dan infrastruktur |
| 2 | Tidak ada pemblokiran event loop, batas pada setiap masukan, konfigurasi tervalidasi |
| 3, 4 | Fastify, skema ketat, error terpusat, desain API, kursor, idempotensi |
| 5 | Pemodelan dengan batasan yang menegakkan aturan, migrasi bertahap |
| 6, 7 | SQL, pool yang berukuran wajar, penerjemah error, pencegahan N+1 |
| 8 | Transaksi, pembaruan atomik, penguncian, percobaan ulang |
| 9 | Indeks dirancang dari kueri, `EXPLAIN` sebagai bukti |
| 10, 11, 12 | Sesi yang bisa dicabut, otorisasi terpusat, RLS, daftar periksa keamanan |
| 13, 14, 15 | Cache, queue, outbox, peristiwa, konsumen idempoten |
| 16, 17 | Realtime lintas instance, unggahan langsung ke penyimpanan objek |
| 18, 19 | Observability, SLO, batas waktu, pemutus arus, degradasi |
| 20, 21 | Uji konkurensi dan beban, container, migrasi tanpa waktu henti |
| 22, 23 | Batas modul, satu layanan dipecah, saga, rekonsiliasi |

## Cerita proyek

Sebuah perusahaan logistik di Jakarta melayani 400 pengirim bisnis dan 60 ribu paket per hari lewat 120 kurir. Sekarang semuanya dikelola dengan spreadsheet, grup pesan, dan telepon. Empat keluhan yang paling sering:

1. Pengirim tidak tahu paketnya di mana, dan menelepon tiap jam.
2. Petugas gudang memasukkan data pengiriman yang sama ke tiga tempat berbeda.
3. Tidak ada yang bisa menjawab berapa persen paket terlambat per rute bulan ini.
4. Tagihan bulanan pengirim sering tidak cocok dengan catatan mereka.

Anda diminta membangun platformnya. Tenggat empat bulan, anggaran sedang, dan satu syarat dari direktur operasional: **"sistem ini tidak boleh berhenti melayani penerimaan paket, apa pun yang rusak."**

Syarat terakhir itu bukan hiasan. Syarat itu yang menentukan hampir semua keputusan arsitektur Anda, dan harus muncul di dokumen keputusan Anda berkali-kali.

## Arsitektur referensi

Satu susunan yang bekerja. Kalau Anda menyimpang, simpangannya harus bisa dijelaskan.

```text
          Pengirim (web)    Kurir (ponsel)    Petugas gudang    Mitra (API)
                |                 |                  |               |
                +--------+--------+--------+---------+------+--------+
                         |                 |                |
                         v                 v                v
                  +-----------------------------------------------+
                  |   API Gateway: TLS, rate limit, auth awal     |
                  +-----------------------+-----------------------+
                                          |
        +---------------------------------+---------------------------------+
        |                                 |                                 |
        v                                 v                                 v
+----------------+          +--------------------------+         +-------------------+
| Layanan        |          | Monolit modular inti     |         | Worker            |
| Identitas      |          |                          |         |                   |
| (dipecah)      |          |   modul: pengiriman      |         | queue: notifikasi |
|                |          |   modul: rute            |         | queue: tagihan    |
|  pengguna      |          |   modul: penagihan       |         | queue: laporan    |
|  sesi, peran   |          |   modul: pelacakan       |         | pengirim outbox   |
|  kunci API     |          |                          |         | saga              |
+-------+--------+          +------------+-------------+         +---------+---------+
        |                                |                                 |
        v                                v                                 v
  db identitas                   db inti (+ replika)              Redis + broker
                                         |
                                         v
                                 Penyimpanan objek
                                 (foto bukti kirim)
```

### Keputusan yang harus Anda ambil sendiri

Sepuluh pertanyaan berikut tidak punya satu jawaban benar, dan setiap jawaban wajib disertai alasan di dokumen keputusan:

1. **Kenapa identitas dipecah dan yang lain tidak?** Atau: kenapa tidak ada yang dipecah sama sekali?
2. **Siapa yang memiliki data status paket?** Pelacakan, pengiriman, atau keduanya dengan proyeksi?
3. **Posisi kurir masuk basis data utama atau penyimpanan terpisah?** Pertimbangkan: 120 kurir mengirim posisi tiap 15 detik berarti 8 ribu penulisan per jam yang hampir tidak pernah dibaca ulang.
4. **Status paket: kolom status terakhir, atau rangkaian peristiwa?** Keluhan nomor 4 tentang tagihan yang tidak cocok mengarah ke satu jawaban tertentu.
5. **Tagihan bulanan: dihitung saat diminta, atau disusun bertahap?** Dan bagaimana kalau ada koreksi data setelah tagihan terbit?
6. **Pelacakan untuk pengirim: realtime atau polling?** Hitung bebannya dengan angka, jangan ditebak.
7. **Foto bukti kirim dari ponsel kurir dengan sinyal buruk: bagaimana alurnya?** Dan apa yang terjadi kalau unggahannya gagal tapi pengirimannya sudah selesai?
8. **Mana yang boleh tertunda?** Status paket, posisi kurir, angka dasbor, dan tagihan punya jawaban berbeda.
9. **Apa yang tetap jalan kalau broker, Redis, penyimpanan objek, dan layanan identitas mati satu per satu?** Ingat syarat direktur operasional.
10. **Apa yang sengaja tidak dikerjakan?** Daftar ini wajib ada, dan justru paling dinilai.

## Opsi tools

| Kebutuhan | Pilihan yang wajar | Catatan |
| --- | --- | --- |
| Runtime dan bahasa | Node LTS, TypeScript ketat | Sesuai seri |
| Framework | Fastify | Atau Hono, kalau bisa dijelaskan |
| Basis data | PostgreSQL, dengan satu replika baca | Partisi untuk tabel peristiwa |
| Akses data | Drizzle, SQL langsung untuk laporan | SQL tetap terlihat |
| Cache dan queue | Redis, BullMQ | Atau queue Postgres kalau Redis dihindari |
| Peristiwa | NATS JetStream, atau tabel outbox saja | Pilih dengan alasan |
| Penyimpanan objek | R2 atau S3, dengan URL bertanda tangan | Unggahan langsung |
| Realtime | SSE, WebSocket hanya kalau perlu dua arah | Pub/sub lintas instance |
| Observability | OpenTelemetry, Prometheus, pino | Tracing wajib |
| Pengujian | Vitest, Testcontainers, k6 | Uji konkurensi dan beban |
| Operasional | Docker, GitHub Actions, PaaS atau Kubernetes | Pilih dengan alasan biaya |

## Spesifikasi wajib

### A. Dokumen, dikerjakan lebih dulu

Sebelum satu baris kode, tulis lima dokumen. Masing-masing cukup satu sampai dua halaman.

1. **Peta modul dan batas.** Daftar modul, data yang dimiliki masing-masing, dan peristiwa yang diterbitkan. Plus jawaban pertanyaan 1 dan 2 di atas.
2. **Rancangan data.** Tabel, relasi, indeks, dan kueri utama yang akan dijalankan. Sebutkan aturan mana yang dijaga batasan basis data.
3. **Matriks peran.** Pengirim, kurir, petugas gudang, admin, dan mitra API, dikali setiap sumber daya.
4. **Rencana konsistensi.** Data apa yang boleh tertunda berapa lama, dan apa yang tidak boleh sama sekali.
5. **Matriks degradasi.** Setiap ketergantungan, apa yang tetap jalan, apa yang hilang, dan caranya.

### B. Fungsi

**Pengirim**

6. Mendaftar, mengelola anggota tim, dan membuat kunci API untuk integrasi.
7. Membuat pengiriman satuan dan massal (impor sampai 5.000 baris).
8. Melacak paket, dengan riwayat status dan posisi perkiraan.
9. Melihat tagihan bulanan beserta rinciannya per paket.
10. Menerima notifikasi perubahan status lewat webhook ke sistem mereka.

**Petugas gudang**

11. Menerima paket dengan pemindaian, satu kali masuk data untuk seluruh sistem.
12. Menyortir ke kantong rute, dan menyerahkan ke kurir.
13. Mencatat paket bermasalah: rusak, alamat tidak lengkap, atau hilang.

**Kurir**

14. Menerima daftar antaran harian, diurutkan rute.
15. Memperbarui status: dijemput, dalam perjalanan, diantar, gagal diantar.
16. Mengunggah foto bukti kirim dan tanda tangan penerima.
17. Bekerja saat sinyal buruk: perubahan status tersimpan lokal lalu disinkronkan.

**Admin dan operasional**

18. Dasbor: paket per status, persentase keterlambatan per rute, kurir aktif.
19. Daftar selisih dan paket bermasalah yang butuh penanganan manusia.
20. Laporan bulanan per pengirim dan per rute.

**Mitra API**

21. API publik dengan kunci API, cakupan, dan pembatasan laju per mitra.
22. Dokumentasi OpenAPI yang dihasilkan dari skema, dan klien bertipe.

### C. Kebenaran dan keamanan

23. Satu fungsi otorisasi terpusat, dipakai handler, worker, saga, dan perintah terminal.
24. Isolasi antar pengirim dijamin RLS, dan dibuktikan test yang sengaja lupa menyaring.
25. Status paket tidak boleh mundur, apa pun urutan peristiwa yang tiba.
26. Satu paket tidak boleh diantar dua kali, dan tidak boleh ditagih dua kali.
27. Impor massal idempoten: pengulangan dengan kunci yang sama tidak membuat 5.000 paket kedua.
28. Webhook keluar ke pengirim: ditandatangani, dicoba ulang dengan jeda bertambah, dan punya dead letter queue.
29. Webhook masuk dari mitra: tanda tangan, umur, perbandingan aman, idempotensi.
30. Daftar periksa keamanan 20 poin dari modul 13 dijalankan, dan hasilnya dicatat.

### D. Kinerja dan kapasitas

31. Dasbor di bawah 100 ms pada 5 juta baris peristiwa paket.
32. Pelacakan paket di bawah 50 ms, dari proyeksi atau cache.
33. Impor 5.000 baris selesai di bawah 30 detik, dan tidak memblokir permintaan lain.
34. `docs/explain.md` dengan `EXPLAIN (ANALYZE, BUFFERS)` untuk sepuluh kueri utama.
35. Uji beban bertangga sampai patah, dengan urutan patah tercatat.
36. Anggaran: tidak ada endpoint yang melewati 10 kueri per permintaan.

### E. Ketahanan dan operasional

37. Semua sambungan keluar punya batas waktu, dengan anggaran per permintaan.
38. Pemutus arus untuk setiap ketergantungan yang punya jalan mundur.
39. **Penerimaan paket tetap bekerja saat broker, Redis, penyimpanan objek, dan layanan identitas mati.** Ini syarat direktur operasional, dan harus dibuktikan uji kekacauan.
40. Saga untuk alur yang melintasi layanan identitas dan inti, dengan pemulihan saga mandek.
41. Rekonsiliasi harian: paket diantar versus paket ditagih, dan angkanya dipantau.
42. Observability lengkap: log terstruktur, metrik empat sinyal, tracing lintas layanan dan queue.
43. SLO untuk tiga jalur utama, beserta anggaran kesalahan dan peringatannya.
44. Container non-root, migrasi tahap terpisah, rilis bergulir, dan mundur yang pernah dilatih.
45. `README` yang memungkinkan orang lain menjalankan seluruh sistem dalam 20 menit.

### F. Demo dan dokumen keputusan

46. Rekaman demo 8 sampai 10 menit: alur pengirim, gudang, kurir, dan satu uji kekacauan.
47. Dokumen keputusan berisi minimal dua belas keputusan, masing-masing dengan format: apa yang diputuskan, alternatifnya, alasannya, dan apa yang akan membuat Anda mengubahnya.
48. Satu halaman angka: kapasitas, p95 per jalur, ukuran bundel kontainer, jumlah test, waktu pipeline, lead time, dan MTTR.
49. Daftar "sengaja tidak dikerjakan" beserta alasannya.

Nomor 49 sering dianggap kelemahan. Sebaliknya: daftar itu bukti Anda membuat keputusan, bukan sekadar mengerjakan apa yang terpikir lebih dulu.

## Langkah pengerjaan bertahap

### Bulan 1: rancang, lalu bangun inti

**Minggu 1: dokumen.** Lima dokumen di bagian A. Tahan keinginan membuka editor. Rancangan data yang salah akan Anda bayar dengan migrasi berisiko di bulan ketiga.

**Minggu 2: kerangka.** Monolit modular dengan batas yang ditegakkan linter, skema per modul, konfigurasi tervalidasi, logging terstruktur, `pnpm check` di CI, container, dan deploy pertama yang masih kosong. Tayang sejak minggu kedua.

**Minggu 3: identitas dan otorisasi.** Sesi tersimpan, peran, kunci API, RLS, dan fungsi otorisasi terpusat beserta test matriksnya. Dikerjakan awal karena semua fitur bergantung padanya.

**Minggu 4: jalur penerimaan paket.** Modul pengiriman: membuat paket, memindai masuk, dan menyimpan peristiwa. Ini jalur yang tidak boleh berhenti, jadi jalur ini dibangun lebih dulu dan paling sedikit ketergantungannya.

### Bulan 2: alur operasional

**Minggu 5: status dan peristiwa.** Outbox, kontrak peristiwa, proyeksi status paket dengan nomor urut, dan konsumen idempoten.

**Minggu 6: kurir.** Daftar antaran, perubahan status, dan sinkronisasi dari ponsel bersinyal buruk. Yang terakhir adalah latihan idempotensi yang paling nyata di seluruh proyek.

**Minggu 7: berkas dan notifikasi.** Unggahan foto bukti langsung ke penyimpanan objek, dan webhook keluar dengan tanda tangan serta percobaan ulang.

**Minggu 8: pelacakan dan realtime.** Pelacakan dari proyeksi, SSE untuk pembaruan, pub/sub lintas instance.

### Bulan 3: penagihan, laporan, dan pengerasan

**Minggu 9: penagihan.** Tagihan disusun dari peristiwa, dengan jawaban untuk koreksi setelah tagihan terbit.

**Minggu 10: laporan dan dasbor.** Proyeksi dan tabel ringkasan, bukan agregasi langsung. Partisi tabel peristiwa.

**Minggu 11: pengujian.** Uji konkurensi, matriks otorisasi, idempotensi sistem dengan perbandingan keadaan, dan uji migrasi.

**Minggu 12: ketahanan.** Batas waktu, pemutus arus, pemisahan pool, penolakan beban, matriks degradasi, dan uji kekacauan sebagai test.

### Bulan 4: distribusi, kapasitas, dan dokumen

**Minggu 13: pecah identitas.** Delapan tahap dari modul 23, dengan flag untuk kembali di setiap tahap.

**Minggu 14: saga dan rekonsiliasi.** Alur yang melintasi dua layanan, pemulihan saga mandek, dan rekonsiliasi harian.

**Minggu 15: kapasitas.** Uji beban bertangga, perbaikan titik sempit dengan angka sebelum dan sesudah, dan `docs/kapasitas.md`.

**Minggu 16: operasional dan demo.** SLO, peringatan, runbook, latihan mundur, dokumen keputusan, dan rekaman demo.

Satu saran yang menentukan hasil: **jangan menyimpan observability dan pengujian untuk bulan ketiga.** Keduanya ada di jadwal sebagai pengerasan, bukan sebagai pekerjaan dari nol. Logging terstruktur dipasang di minggu kedua, dan setiap bug yang ditemukan datang dengan satu test.

## Bahan referensi dari proyek sebelumnya

| Dari | Yang bisa dipakai |
| --- | --- |
| Proyek 1 | Pola aturan bisnis sebagai fungsi murni, repository sebagai antarmuka |
| Proyek 2 | Transaksi, pembaruan atomik, idempotensi transaksional, indeks dari kueri |
| Proyek 3 | Sesi dengan rotasi, peran sebagai data, RLS, kunci API, audit |
| Proyek 4 | Outbox, kontrak peristiwa bertipe, konsumen idempoten, tabel selisih |
| Proyek 5 | Format dokumen kapasitas, matriks degradasi, uji kekacauan |

Menyalin dan menyesuaikan dari pekerjaan Anda sendiri bukan kemalasan, itu cara kerja yang normal. Yang perlu dihindari hanya menyalin tanpa memahami, karena di proyek ini Anda yang harus menjelaskannya.

## Kriteria penilaian

| Bobot | Aspek | Yang dinilai |
| --- | --- | --- |
| 25% | Keputusan arsitektur | Dokumen yang jujur, alternatif yang benar-benar dipertimbangkan, alasan yang bertahan saat ditanya |
| 15% | Kebenaran data | Transaksi, konkurensi, idempotensi, status yang tidak bisa mundur |
| 15% | Keamanan | Otorisasi di setiap jalur, isolasi antar pengirim, daftar periksa dijalankan |
| 15% | Ketahanan | Syarat direktur operasional terbukti dengan uji kekacauan |
| 10% | Kinerja | Angka sebelum dan sesudah, `EXPLAIN` sebagai bukti, kapasitas terukur |
| 10% | Pengujian | Pilihan test yang tepat, bukan jumlahnya |
| 10% | Operasional | Pipeline, migrasi tanpa waktu henti, pemantauan, runbook, MTTR terukur |

Perhatikan bobot terbesarnya bukan "fiturnya jalan". Fitur yang jalan adalah syarat minimum. Yang dinilai paling tinggi adalah kemampuan menjelaskan kenapa dibangun seperti itu.

## Pertanyaan yang harus bisa Anda jawab

Anggap ini wawancara setelah proyek selesai. Dua belas pertanyaan, semuanya pernah muncul di ruang wawancara nyata:

1. Kenapa identitas dipecah dan yang lain tidak? Apa yang akan membuat Anda memecah yang kedua?
2. Siapa pemilik data status paket, dan apa yang terjadi kalau dua sumber tidak sepakat?
3. Posisi kurir: di mana disimpan, kenapa, dan berapa biayanya per bulan?
4. Penerimaan paket tetap jalan saat empat ketergantungan mati. Tunjukkan kodenya, dan tunjukkan uji yang membuktikannya.
5. Satu paket tidak bisa ditagih dua kali. Jelaskan mekanismenya di tiga lapisan.
6. Kurir mengirim perubahan status dua kali karena sinyal buruk. Apa yang terjadi?
7. Berapa kapasitas sistem ini, apa yang patah lebih dulu, dan bagaimana Anda tahu?
8. Aturan apa saja yang Anda serahkan ke basis data, dan mana yang tetap di kode? Kenapa begitu?
9. Data apa yang boleh tertunda, berapa lama, dan siapa yang menyetujui angka itu?
10. Tagihan bulan lalu ternyata salah karena satu paket terlambat dicatat. Bagaimana sistem Anda menanganinya?
11. Kalau sistem ini rusak malam ini, bagaimana Anda tahu, dan apa langkah pertama Anda?
12. Kalau diberi dua bulan lagi, apa yang Anda kerjakan, dan kenapa itu lebih penting daripada yang lain?

Kalau dua belas jawaban itu lancar, proyek ini selesai. Kalau ada yang tersangkut, di situ tempat belajar berikutnya.

## Rangkuman

- Membangun sistem yang berfungsi adalah syarat minimum. Yang membedakan adalah kemampuan mempertanggungjawabkan keputusannya.
- Dokumen dulu, kode belakangan. Lima halaman rancangan menghemat satu bulan migrasi berisiko.
- Satu syarat dari pemilik produk, yaitu "penerimaan paket tidak boleh berhenti", bisa menentukan separuh keputusan arsitektur. Cari syarat seperti itu di setiap proyek.
- Tayang sejak minggu kedua. Sistem yang hanya hidup di laptop tidak membuktikan apa pun.
- Observability dan pengujian adalah cara bekerja sejak hari pertama, bukan tahap pengerasan di akhir.
- Daftar "sengaja tidak dikerjakan" adalah bukti Anda memilih, dan dinilai sama tinggi dengan yang dikerjakan.
- Angka sebelum dan sesudah adalah satu-satunya bahasa yang meyakinkan untuk kualitas yang tidak terlihat.

## Refleksi akhir

Kalau Anda mengerjakan seri ini sampai sini, Anda punya sesuatu yang lebih berharga daripada daftar teknologi di CV: **rantai sebab akibat.**

Anda tahu kenapa transaksi ada, karena Anda pernah melihat stok jadi minus pada seratus permintaan bersamaan. Anda tahu kenapa indeks penting, karena Anda pernah mengukur kueri yang sama pada seribu dan dua juta baris. Anda tahu kenapa outbox ada, karena Anda pernah mematikan broker dan melihat pesanan gagal. Anda tahu kenapa idempotensi muncul di separuh seri ini, karena Anda pernah mengirim peristiwa yang sama dua kali dan membandingkan isi tabelnya.

Dan Anda tahu satu hal yang paling jarang dimiliki: **kapan sebuah pola belum perlu dipakai.** Tangga keputusan di modul 24 adalah bentuk paling padat dari pengetahuan itu, dan hampir semuanya lahir dari pengalaman orang lain yang membangun terlalu banyak terlalu dini.

Itu bentuk pengetahuan yang tidak bisa didapat dengan membaca dokumentasi, dan tidak bisa digantikan alat bantu apa pun. Alat bantu bisa menuliskan endpoint dalam sepuluh detik, dan endpoint itu akan terlihat benar. Yang tidak bisa dilakukannya: menyadari bahwa kode itu punya celah konkurensi, akan lambat pada sepuluh juta baris, akan memproses satu pembayaran dua kali saat jaringan pengguna tersendat, dan bahwa sebenarnya satu tabel ringkasan sudah cukup tanpa perlu satu layanan baru.

Tiga hal untuk diteruskan setelah ini:

**Satu, rawat satu sistem lebih dari setahun.** Semua pelajaran tentang migrasi, kompatibilitas, dan utang teknis hanya benar-benar masuk setelah Anda sendiri yang kembali ke keputusan Anda delapan belas bulan kemudian.

**Dua, ikut jaga produksi.** Satu insiden pukul dua pagi mengajarkan lebih banyak tentang observability dan ketahanan daripada sepuluh artikel. Dan setelahnya, Anda akan menulis kode yang berbeda.

**Tiga, tulis keputusan Anda.** Bukan untuk orang lain, tapi untuk Anda sendiri enam bulan kemudian. Dokumen keputusan yang jujur, termasuk yang ternyata salah, adalah catatan belajar yang paling bernilai yang bisa Anda miliki.

Selamat. Sekarang bangun sesuatu yang dipercaya orang untuk menyimpan data mereka.
