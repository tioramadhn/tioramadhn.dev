---
title: 'Proyek 5: Audit Ketahanan dan Beban'
description: Ambil layanan yang sudah Anda bangun, ukur keadaannya dengan angka, dorong sampai patah, perbaiki titik sempitnya, lalu tulis dokumen yang hampir tidak ada tim punya jawabannya.
date: 2026-12-27
slug: proyek-5-audit-ketahanan-dan-beban
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Empat proyek sebelumnya membangun fitur. Proyek ini tidak menambahkan satu fitur pun.

Yang dikerjakan: mengukur layanan yang sudah ada, mendorongnya sampai patah, memperbaiki titik sempitnya, memasang pemantauan dan jalan mundur, lalu menulis empat dokumen yang menjawab pertanyaan berikut:

| Pertanyaan | Hampir tidak ada tim punya jawabannya |
| --- | --- |
| Berapa kapasitas layanan ini, dalam permintaan per detik? | Biasanya ditebak |
| Apa yang patah lebih dulu kalau lalu lintas naik 5 kali? | Biasanya tidak tahu |
| Apa yang terjadi kalau setiap ketergantungan gagal? | Biasanya belum pernah diuji |
| Berapa lama dari tahu rusak sampai pulih? | Biasanya tidak diukur |

Pertanyaan-pertanyaan itu akan ditanyakan saat perusahaan Anda tumbuh, biasanya oleh orang yang menandatangani anggaran infrastruktur. Dan kemampuan menjawabnya dengan angka, bukan dengan perasaan, adalah salah satu pembeda paling jelas antara engineer menengah dan senior.

| Dari modul | Yang dipakai |
| --- | --- |
| 8, 10 | Ukuran pool, `EXPLAIN`, `pg_stat_statements`, indeks |
| 14, 15 | Cache, queue, dan pemindahan pekerjaan keluar dari permintaan |
| 19 | Logging terstruktur, metrik, tracing, SLO, peringatan |
| 20 | Batas waktu, pemutus arus, pemisahan sumber daya, matriks degradasi |
| 21 | Uji beban bertangga, uji soak, uji kekacauan sebagai test |

## Yang diaudit

Pilih salah satu: layanan toko dari Proyek 2 yang sudah diperluas, atau sistem pemesanan dari Proyek 4. Yang kedua lebih berharga karena punya worker, broker, dan ketergantungan luar.

Kalau Anda mengerjakan seri ini sampai sini, kemungkinan besar layanan Anda punya titik sempit yang belum diketahui. Tujuan proyek ini menemukannya sebelum pengguna yang menemukannya.

## Spesifikasi wajib

### A. Pengukuran awal

1. Pasang metrik empat sinyal dari modul 19: lalu lintas, kesalahan, latensi, kejenuhan.
2. Pasang trace yang melintasi HTTP, basis data, queue, dan konsumen peristiwa.
3. Siapkan data uji realistis: minimal 500 ribu pesanan, 2 juta item, 100 ribu pengguna.
4. Jalankan smoke test, lalu catat garis dasar: p50, p95, p99 per endpoint utama pada beban rendah.
5. Jalankan `pg_stat_statements` dan catat sepuluh kueri termahal secara total.
6. Tulis `docs/dasar.md` yang memuat semua angka awal beserta tanggal dan spesifikasi mesinnya.

### B. Uji beban dan titik patah

7. Jalankan uji bertangga sampai tingkat kesalahan melewati 5%, dan catat titiknya.
8. Catat **urutan** patahnya, bukan hanya titiknya: komponen mana yang jenuh lebih dulu.
9. Jalankan uji soak 2 jam pada 60% kapasitas, dan catat tren memori, sambungan, kedalaman queue, dan jumlah sambungan realtime.
10. Jalankan uji lonjakan: dari 10% ke 100% kapasitas dalam 10 detik, dan catat perilakunya.
11. Tulis `docs/kapasitas.md`: kapasitas aman, kapasitas maksimum, urutan patah, dan apa yang membatasinya.

### C. Perbaikan dengan bukti

12. Perbaiki minimal lima titik sempit, dan untuk masing-masing catat angka sebelum dan sesudah.
13. Minimal satu perbaikan harus di lapisan basis data, satu di lapisan aplikasi, dan satu berupa pemindahan pekerjaan keluar dari permintaan.
14. Dokumentasikan satu perbaikan yang ternyata **tidak** membantu, beserta alasannya. Ini wajib ada.
15. Tulis `docs/perbaikan.md` dengan tabel sebelum dan sesudah untuk semuanya.

### D. Ketahanan

16. Pasang batas waktu di semua sambungan keluar, dengan anggaran waktu per permintaan.
17. Pasang pemutus arus untuk setiap ketergantungan yang punya jalan mundur.
18. Pisahkan pool basis data: transaksi, laporan, dan pekerjaan latar.
19. Pasang penolakan beban, dan buktikan bahwa saat kewalahan sebagian permintaan tetap cepat.
20. Pisahkan liveness dan readiness, dan buktikan dengan empat skenario dari modul 20.
21. Tulis `docs/degradasi.md`: matriks setiap ketergantungan, apa yang tetap jalan, apa yang hilang.

### E. Pemantauan dan operasional

22. Tetapkan SLO untuk tiga jalur utama, beserta anggaran kesalahannya.
23. Pasang peringatan dari daftar modul 19, dan buktikan setiap peringatan menyala pada percobaan yang sesuai.
24. Tulis runbook satu halaman untuk setiap peringatan.
25. Ubah uji kekacauan dari modul 20 jadi berkas test yang berjalan di CI setiap minggu.
26. Ukur satu angka yang paling sering tidak diukur: **berapa lama dari komponen dimatikan sampai peringatan menyala.**

## Langkah pengerjaan bertahap

Proyek ini berbeda dari empat sebelumnya: Anda tidak membangun fitur, Anda **mengukur, merusak, lalu memperbaiki dengan angka sebagai bukti.** Urutannya tidak boleh ditukar, karena perbaikan tanpa garis dasar tidak bisa dibuktikan berhasil.

**Hari 1: pasang alat ukur.** Logging terstruktur dengan id permintaan, metrik, tracing, dan `pg_stat_statements`. Tanpa ini, seluruh sisa proyek jadi tebakan.

**Hari 2: garis dasar.** Jalankan beban yang wajar, catat angkanya di `docs/dasar.md` dengan bentuk seperti contoh di bawah. **Jangan memperbaiki apa pun hari ini**, sekalipun Anda sudah melihat sesuatu yang jelas salah. Angka sebelum adalah satu-satunya hal yang membuat angka sesudah punya arti.

**Hari 3: dorong sampai patah.** Uji bertangga sampai layanan gagal, lalu catat tiga hal: pada beban berapa layanan mulai melambat, pada beban berapa mulai menolak, dan **bagian mana yang patah lebih dulu**. Yang ketiga hampir selalu mengejutkan.

**Hari 4 dan 5: perbaiki titik sempit.** Satu perbaikan, satu pengukuran ulang, satu catatan. Jangan memperbaiki tiga hal sekaligus, karena Anda tidak akan tahu mana yang bekerja. Catat juga perbaikan yang **tidak** berhasil beserta alasannya.

**Hari 6: perilaku saat kewalahan.** Layanan yang baik tidak menolak patah, melainkan patah dengan rapi: menolak beban berlebih dengan 503, menjaga jalur utama tetap hidup, dan tidak menyeret ketergantungannya ikut jatuh.

**Hari 7: SLO, peringatan, dan runbook.** Lalu ukur satu angka yang hampir tidak pernah diukur siapa pun: berapa lama dari komponen dimatikan sampai peringatan menyala.

Satu catatan soal sikap yang menentukan nilai proyek ini: **temuan yang memalukan adalah temuan terbaik.** Kueri tanpa indeks yang Anda tulis sendiri di Proyek 2, pool yang kekecilan, atau peringatan yang ternyata tidak pernah menyala adalah persis yang dicari audit. Menemukannya sekarang jauh lebih murah daripada menemukannya saat pengguna yang melapor.

## Garis dasar: contoh bentuk laporannya

```markdown
# docs/dasar.md

Diukur: 2026-12-26
Mesin: aplikasi 2 vCPU / 2 GB (3 instance), Postgres 4 vCPU / 8 GB, Redis 1 GB
Data: 512.400 pesanan, 1.980.112 item, 98.230 pengguna, 14.200 produk

## Latensi pada 30 permintaan per detik

| Endpoint | p50 | p95 | p99 | Kueri per permintaan |
| --- | --- | --- | --- | --- |
| GET /v1/produk | 12 ms | 28 ms | 61 ms | 2 |
| GET /v1/produk/:id | 8 ms | 19 ms | 44 ms | 2 |
| POST /v1/pesanan | 41 ms | 96 ms | 210 ms | 7 |
| GET /v1/pesanan | 18 ms | 51 ms | 140 ms | 3 |
| GET /v1/laporan/harian | 24 ms | 58 ms | 120 ms | 1 |

## Sepuluh kueri termahal secara total (pg_stat_statements)

| Kueri | Panggilan/jam | Rata | Total/jam |
| --- | --- | --- | --- |
| SELECT izin pengguna | 108.000 | 1,2 ms | 130 detik |
| SELECT produk daftar | 43.000 | 6,8 ms | 292 detik |
| INSERT pesanan_item | 2.400 | 18 ms | 43 detik |
| ... |  |  |  |

## Catatan awal

- Pembacaan izin adalah kueri dengan panggilan terbanyak. Sudah di-cache,
  tingkat kena 94%. Tanpa cache, angkanya akan 1.800 panggilan per detik.
- `INSERT pesanan_item` 18 ms untuk rata-rata 4 item. Perlu diperiksa:
  apakah masih satu pernyataan per item.
```

Perhatikan kolom terakhir pada tabel pertama: **jumlah kueri per permintaan.** Angka itu lebih berguna daripada latensi untuk memperkirakan apa yang terjadi saat lalu lintas naik, karena kapasitas basis data dihitung dari total kueri per detik, bukan dari jumlah permintaan.

## Menjalankan uji bertangga

```js
// beban/tangga.js
export const options = {
  scenarios: {
    tangga: {
      executor: 'ramping-arrival-rate',
      startRate: 20,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 800,
      stages: [
        { target: 50, duration: '2m' },
        { target: 100, duration: '2m' },
        { target: 200, duration: '2m' },
        { target: 350, duration: '2m' },
        { target: 500, duration: '2m' },
        { target: 700, duration: '2m' },
      ],
    },
  },
  // Sengaja tanpa threshold yang menggagalkan: tujuannya menemukan batas
};

export default function () {
  // Campuran yang mendekati lalu lintas nyata, bukan satu endpoint saja
  const undi = Math.random();

  if (undi < 0.55) bacaKatalog();
  else if (undi < 0.80) bacaDetailProduk();
  else if (undi < 0.92) bacaRiwayatPesanan();
  else buatPesanan();
}
```

Campuran lalu lintas itu penting dan sering dilewatkan: uji beban yang hanya memukul satu endpoint memberi angka yang tidak pernah terjadi di produksi. Ambil proporsi sebenarnya dari metrik Anda, dan kalau belum ada data, perkirakan dengan jujur lalu catat asumsinya.

Yang dicatat selama uji berjalan, dan semuanya harus dilihat bersamaan di satu dasbor:

| Lapisan | Metrik |
| --- | --- |
| Klien | Permintaan per detik, p95, p99, tingkat kesalahan |
| Aplikasi | Lag event loop, memori, jumlah sambungan masuk |
| Pool | Sambungan terpakai, menunggu, waktu tunggu |
| Basis data | CPU, kueri per detik, kueri lambat, kunci yang menunggu |
| Queue | Kedalaman, umur tertua, laju pemrosesan |
| Redis | Perintah per detik, latensi, pemakaian memori |

## Contoh hasil dan diagnosis

```markdown
# docs/kapasitas.md

## Titik patah

| Beban | p95 | Error | Keadaan |
| --- | --- | --- | --- |
| 100/s | 110 ms | 0% | Sehat. Pool 35% |
| 200/s | 240 ms | 0% | Pool 68%, CPU db 55% |
| 350/s | 1.350 ms | 1,2% | **Pool 100%, 40 permintaan menunggu sambungan** |
| 500/s | 6.800 ms | 18% | Batas waktu, 503 mulai muncul |
| 700/s | 9.200 ms | 46% | Penolakan beban aktif, sisanya tetap 180 ms |

## Urutan patah

1. **Pool sambungan basis data** (280 permintaan per detik)
2. CPU basis data (420 per detik)
3. Lag event loop pada instance aplikasi (600 per detik)
4. Memori Redis tidak pernah jadi batas

## Kesimpulan

- Kapasitas aman: **200 permintaan per detik** dengan p95 di bawah 250 ms.
- Kapasitas maksimum sebelum error: 280 per detik.
- Yang membatasi: jumlah kueri per permintaan, bukan kecepatan kueri.
  POST /v1/pesanan memakai 7 kueri, dan pada 350 per detik total
  kueri mencapai 1.400 per detik yang melebihi kemampuan pool.

## Perilaku saat kewalahan

Pada 700 per detik, penolakan beban bekerja: 46% permintaan ditolak 503
dalam 4 ms, dan 54% yang diterima tetap dilayani dengan p95 180 ms.
Itu perilaku yang diinginkan, dan hasil dari under-pressure di modul 20.
```

Baris terakhir pada bagian kesimpulan adalah jenis temuan yang mengubah prioritas: masalahnya bukan kueri yang lambat, melainkan **jumlah** kueri. Perbaikan yang tepat jadi menggabungkan kueri, bukan mengoptimalkan masing-masing.

## Lima perbaikan yang khas

Berdasarkan pola yang muncul di hampir semua audit layanan yang dibangun dengan seri ini:

| # | Titik sempit | Perbaikan | Dampak khas |
| --- | --- | --- | --- |
| 1 | `INSERT` per item pesanan | Satu pernyataan untuk semua item | 7 kueri jadi 4 per pesanan |
| 2 | Pembacaan izin tanpa cache di worker | Cache yang sama dipakai worker | 15% beban basis data hilang |
| 3 | Rekap dihitung di dalam transaksi pesanan | Pindah ke konsumen peristiwa | Transaksi 40 ms jadi 22 ms |
| 4 | Laporan memakai pool yang sama | Pool terpisah dengan 2 sambungan | Laporan tidak lagi menjatuhkan pembelian |
| 5 | Kueri daftar tanpa indeks komposit | Indeks sesuai `ORDER BY` kursor | 180 ms jadi 4 ms |
| 6 | Pool dinaikkan dari 8 ke 24 | **Dibatalkan** | Kapasitas turun 12% |

Baris keenam wajib ada di dokumen Anda, dan bukan sebagai kegagalan. Mencatat perbaikan yang tidak berhasil beserta alasannya adalah bagian terpenting dari laporan teknis, karena catatan itu mencegah orang berikutnya mencoba hal yang sama.

```markdown
## Perbaikan yang dibatalkan: menaikkan ukuran pool

Hipotesis: pool penuh pada 280 per detik, jadi menaikkannya akan
menambah kapasitas.

Hasil: kapasitas turun dari 280 ke 246 per detik, dan p95 pada 200 per
detik naik dari 240 ms ke 310 ms.

Penyebab: 24 sambungan aktif memperebutkan 4 vCPU basis data. Perebutan
membuat setiap kueri melambat, sehingga sambungan dipegang lebih lama,
dan throughput total turun.

Pelajaran: pool yang penuh adalah gejala, bukan penyebab. Yang perlu
dikurangi adalah jumlah kueri per permintaan, atau durasi kueri.
Ini sesuai perhitungan di modul 8.
```

## Mengukur waktu deteksi

Syarat nomor 26 adalah angka yang hampir tidak pernah diukur, dan paling menentukan saat insiden.

```bash
# Catat waktu, matikan komponen, tunggu peringatan, catat waktu lagi
echo "mematikan redis: $(date -u +%H:%M:%S)"
docker compose stop redis

# Pantau sampai peringatan menyala, lalu catat selisihnya
```

| Komponen dimatikan | Peringatan | Waktu deteksi khas | Target |
| --- | --- | --- | --- |
| Postgres | 5xx jalur utama | 40 detik | Di bawah 1 menit |
| Redis | Tingkat kena cache nol | **Tidak terdeteksi** | Perlu metrik baru |
| Worker email | Umur pekerjaan tertua | 6 menit | Dapat diterima |
| Pengirim outbox | Outbox menumpuk | **Tidak terdeteksi** | Perlu metrik baru |
| Satu konsumen peristiwa | Keterlambatan konsumen | 5 menit | Dapat diterima |
| Penyedia pembayaran | Tingkat kegagalan pembayaran | 3 menit | Dapat diterima |

Dua baris "tidak terdeteksi" itu adalah temuan paling berharga dari seluruh proyek ini, dan keduanya sudah diperingatkan di modul 19: **kegagalan yang paling berbahaya adalah yang tenang.** Redis mati dan pengirim outbox mati sama-sama tidak menghasilkan satu pun error di API, dan keduanya bisa berlangsung berjam-jam sebelum ada yang menyadarinya dari keluhan pengguna.

## Dokumen SLO

```markdown
# docs/slo.md

## Jalur utama 1: membuat pesanan

SLI: persentase POST /v1/pesanan yang berhasil (bukan 5xx) dan di bawah 1 detik
SLO: 99,5% dalam 30 hari
Anggaran kesalahan: 0,5% = sekitar 3,6 jam per 30 hari

Alasan angkanya: pesanan adalah jalur yang menghasilkan pendapatan.
99,9% akan membutuhkan replika basis data dengan failover otomatis,
dan itu belum sepadan dengan volume saat ini.

## Jalur utama 2: membaca katalog

SLI: persentase GET /v1/produk yang berhasil dan di bawah 300 ms
SLO: 99,9% dalam 30 hari
Anggaran kesalahan: 0,1% = sekitar 43 menit per 30 hari

Alasan: katalog disajikan dari cache dan CDN dengan stale-if-error,
jadi SLO tinggi bisa dicapai tanpa biaya tambahan.

## Jalur utama 3: email struk terkirim

SLI: persentase email struk yang terkirim dalam 5 menit setelah pembayaran
SLO: 99% dalam 30 hari

Alasan: ini janji yang ditulis di antarmuka. Kalau diubah jadi
"dalam beberapa menit", SLO-nya mengikuti janji itu, bukan sebaliknya.
```

Perhatikan bahwa setiap SLO punya **alasan tertulis**, dan satu di antaranya menyebut keputusan untuk tidak mengejar angka lebih tinggi. Itu bentuk kejujuran teknis yang membuat dokumen ini dipercaya: SLO 99,99% untuk semua jalur adalah tanda dokumen yang disalin, bukan dipikirkan.

## Checklist penilaian

| # | Yang diperiksa |
| --- | --- |
| 1 | Keempat dokumen ada, berisi angka, dan menyebut tanggal serta spesifikasi mesin |
| 2 | Garis dasar memuat jumlah kueri per permintaan, bukan hanya latensi |
| 3 | Urutan patah tertulis, bukan hanya titik patahnya |
| 4 | Minimal lima perbaikan dengan angka sebelum dan sesudah |
| 5 | Minimal satu perbaikan yang dibatalkan, beserta analisis penyebabnya |
| 6 | Uji soak 2 jam dijalankan, dan tren memori serta sambungan tercatat |
| 7 | Uji lonjakan dijalankan, dan perilakunya tercatat |
| 8 | Semua sambungan keluar punya batas waktu, dibuktikan dengan uji menggantung |
| 9 | Pemutus arus terpasang dan terbuka pada uji kegagalan 100% |
| 10 | Pool terpisah, dibuktikan: laporan berat tidak menaikkan latensi pembelian |
| 11 | Penolakan beban aktif, dibuktikan: saat kewalahan sebagian tetap cepat |
| 12 | Liveness tidak memeriksa ketergantungan, dibuktikan dengan mematikan Postgres |
| 13 | Setiap peringatan menyala pada percobaan yang sesuai, dan waktunya tercatat |
| 14 | Setiap peringatan punya runbook satu halaman |
| 15 | Uji kekacauan berjalan di CI, dan pernah merah setidaknya sekali |
| 16 | Matriks degradasi lengkap, dan setiap jalan mundur sudah diuji |

Nomor 15 pantas ditekankan: uji kekacauan yang **selalu** hijau sejak pertama dibuat biasanya berarti ujinya tidak benar-benar menguji apa pun. Pastikan uji itu pernah merah, lalu perbaikannya membuatnya hijau.

## Tantangan bonus

- **Profil CPU saat beban puncak**, lalu temukan fungsi yang paling banyak memakan waktu. Hasilnya sering mengejutkan: sering kali serialisasi JSON atau pembuatan log.
- **Uji dengan Postgres yang lebih kecil**, misalnya 1 vCPU, untuk melihat apakah kesimpulan urutan patah berubah. Memahami bahwa kesimpulan bergantung pada ukuran mesin adalah pelajaran tersendiri.
- **Bandingkan dengan replika baca**: arahkan semua pembacaan laporan ke replika, lalu ukur ulang kapasitasnya.
- **Simulasikan jaringan buruk** dengan `tc` atau toxiproxy: tambahkan latensi 200 ms dan kehilangan paket 2% pada sambungan ke basis data, lalu lihat apa yang terjadi.

## Rangkuman

- Kapasitas yang tidak diukur adalah kapasitas yang ditebak, dan tebakan selalu salah pada arah yang merugikan.
- Jumlah kueri per permintaan lebih berguna daripada latensi untuk memperkirakan kapasitas.
- Urutan patah lebih berguna daripada titik patah, karena urutan patah memberi tahu apa yang harus diperbaiki lebih dulu.
- Uji beban harus memakai campuran lalu lintas yang mendekati kenyataan, bukan satu endpoint.
- Perbaikan yang tidak berhasil wajib dicatat beserta analisisnya. Itu bagian paling berguna dari laporan teknis.
- Pool yang penuh adalah gejala. Menaikkannya saat basis data sudah jenuh justru menurunkan kapasitas.
- Kegagalan yang tenang adalah yang paling berbahaya, dan ukuran yang membuktikannya adalah waktu deteksi.
- Perilaku saat kewalahan lebih penting daripada titik patahnya: sebagian ditolak cepat, sisanya tetap dilayani dengan baik.
- Setiap SLO punya alasan tertulis, termasuk alasan untuk tidak mengejar angka yang lebih tinggi.

## Masalah terbuka

Layanan Anda sekarang terukur, tahan banting, dan terpantau. Dan ada satu masalah yang tidak muncul di satu pun uji beban: **cara layanan itu sampai ke produksi.**

Sejauh ini layanan Anda berjalan dengan `pnpm dev` di laptop, atau paling jauh dengan `docker compose up`. Pertanyaan yang belum pernah dijawab:

Bagaimana memastikan yang berjalan di produksi persis sama dengan yang Anda uji? Bagaimana menjalankan migrasi basis data tanpa menurunkan layanan, dengan dua versi aplikasi yang berjalan bersamaan? Bagaimana merilis tanpa menegangkan, dan bagaimana mundur dalam dua menit saat ternyata ada yang salah? Di mana rahasia produksi disimpan, dan siapa yang bisa membacanya? Dan kalau satu instance mati pukul tiga pagi, siapa yang menggantinya?

Itu isi modul berikutnya: container, konfigurasi, dan jalur rilis yang membuat deploy jadi pekerjaan yang membosankan, dan itu pujian.
