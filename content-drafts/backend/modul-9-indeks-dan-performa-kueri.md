---
title: 'Modul 9: Indeks dan Performa Kueri'
description: Kueri yang sama bisa punya dua perilaku yang sama sekali berbeda pada seribu dan dua juta baris. Cara membaca rencana kueri, merancang indeks, dan mengenali kapan indeks bukan jawabannya.
date: 2026-12-11
slug: modul-9-indeks-dan-performa-kueri
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Perpustakaan Anda sudah berjalan setahun, dan tiga laporan masuk tanpa satu baris kode pun berubah:

| Endpoint | Dulu | Sekarang |
| --- | --- | --- |
| Daftar peminjaman | 15 ms | 4.200 ms |
| Pencarian buku | 20 ms | 900 ms |
| Laporan bulanan | 80 ms | 2 menit, dan endpoint lain ikut melambat |

Yang berubah hanya jumlah baris: peminjaman dari 3 ribu jadi 2 juta. Dan pola pertumbuhannya bukan linear, melainkan jauh lebih buruk, karena kueri tanpa indeks harus memeriksa **setiap** baris.

Ini satu-satunya topik di seri ini di mana perbedaan antara tahu dan tidak tahu bisa berarti seribu kali lipat. Bukan dua kali, bukan sepuluh kali. Seribu.

## Analogi: indeks di belakang buku

Bayangkan buku setebal dua ribu halaman tanpa indeks. Untuk mencari semua halaman yang menyebut "fotosintesis", Anda membaca dua ribu halaman. Itu sequential scan.

Sekarang bayangkan buku yang sama dengan indeks di belakang: daftar istilah tersusun alfabetis beserta nomor halamannya. Anda membuka indeks, menemukan "fotosintesis" dalam hitungan detik karena urutannya memungkinkan pencarian terbelah, lalu membuka tiga halaman yang disebut. Itu index scan.

Tiga hal yang langsung masuk akal dari analogi ini:

**Indeks menempati halaman tambahan.** Buku jadi lebih tebal, dan basis data jadi lebih besar.

**Indeks harus diperbarui setiap kali isi buku berubah.** Menambah satu paragraf berarti memperbarui indeks. Di basis data, itu berarti setiap `INSERT` dan `UPDATE` jadi lebih mahal.

**Indeks hanya berguna kalau sesuai cara Anda mencari.** Indeks istilah tidak membantu kalau Anda mencari "semua halaman yang ditulis pada hari Selasa".

| Dunia buku | Dunia basis data |
| --- | --- |
| Membaca semua halaman | Sequential scan |
| Membuka indeks lalu ke halaman yang disebut | Index scan |
| Indeks tersusun alfabetis | B-tree |
| Indeks yang memuat ringkasan isinya | Covering index dengan `INCLUDE` |
| Indeks khusus untuk satu bab saja | Partial index |
| Indeks kata per kata untuk pencarian isi | GIN untuk teks penuh |
| Halaman yang ditambahkan jadi indeksnya kedaluwarsa | Statistik yang belum di-`ANALYZE` |

Batas analoginya: pembaca manusia memutuskan sendiri memakai indeks atau tidak, sedangkan di basis data yang memutuskan adalah **perencana kueri**, berdasarkan perkiraan biaya. Dan perkiraan itu bisa salah. Memahami cara ia memutuskan adalah keterampilan yang membedakan menebak dan tahu.

## `EXPLAIN`: melihat keputusan perencana

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT p.id, p.jatuh_tempo
FROM peminjaman p
WHERE p.anggota_id = '0192...'
  AND p.status = 'berjalan'
ORDER BY p.dipinjam_pada DESC
LIMIT 20;
```

Tanpa indeks, keluarannya seperti ini:

```text
Limit  (cost=93847.21..93847.26 rows=20 width=48)
       (actual time=1842.113..1842.119 rows=3 loops=1)
  ->  Sort  (cost=93847.21..93851.44 rows=1693 width=48)
            (actual time=1842.111..1842.114 rows=3 loops=1)
        Sort Key: dipinjam_pada DESC
        Sort Method: quicksort  Memory: 25kB
        ->  Seq Scan on peminjaman p  (cost=0.00..93780.00 rows=1693 width=48)
                                      (actual time=0.287..1841.982 rows=3 loops=1)
              Filter: ((status = 'berjalan') AND (anggota_id = '0192...'))
              Rows Removed by Filter: 1999997
              Buffers: shared hit=1024 read=42756
Planning Time: 0.214 ms
Execution Time: 1842.158 ms
```

Lima angka yang perlu dibaca, dan urutan memeriksanya:

| Yang dilihat | Di contoh ini | Artinya |
| --- | --- | --- |
| **Jenis scan** | `Seq Scan` | Seluruh tabel dibaca |
| **Rows Removed by Filter** | 1.999.997 | Dua juta baris dibaca untuk mengambil 3 |
| **`rows` perkiraan vs aktual** | 1693 vs 3 | Statistik melenceng jauh |
| **Buffers** | `read=42756` | 42 ribu blok dibaca dari disk, sekitar 334 MB |
| **Execution Time** | 1842 ms | Yang dirasakan pengguna |

Baris kedua adalah yang paling cepat memberi jawaban: **kalau `Rows Removed by Filter` jauh lebih besar daripada baris yang dikembalikan, Anda butuh indeks.**

Dengan indeks yang tepat:

```sql
CREATE INDEX peminjaman_anggota_aktif_idx
  ON peminjaman (anggota_id, dipinjam_pada DESC)
  WHERE status = 'berjalan';
```

```text
Limit  (cost=0.43..8.91 rows=3 width=48) (actual time=0.038..0.042 rows=3 loops=1)
  ->  Index Scan using peminjaman_anggota_aktif_idx on peminjaman p
        (actual time=0.036..0.039 rows=3 loops=1)
        Index Cond: (anggota_id = '0192...')
        Buffers: shared hit=5
Execution Time: 0.061 ms
```

Dari 1.842 ms jadi 0,061 ms. Tiga puluh ribu kali lebih cepat, dan tidak ada `Sort` sama sekali karena indeksnya sudah menyimpan urutan yang diminta.

Dua catatan tentang membaca `EXPLAIN`:

**Selalu pakai `ANALYZE`, dan selalu pada data yang ukurannya mirip produksi.** `EXPLAIN` tanpa `ANALYZE` hanya menunjukkan perkiraan, bukan kenyataan. Dan rencana pada 1.000 baris akan berbeda dari rencana pada 2 juta baris, karena perencana memang sengaja memilih berbeda.

**`ANALYZE` menjalankan kuerinya.** Untuk `UPDATE` dan `DELETE`, bungkus dalam transaksi lalu `ROLLBACK`, atau Anda akan benar-benar mengubah data.

Jenis scan yang akan Anda lihat:

| Jenis | Artinya | Baik atau buruk |
| --- | --- | --- |
| `Seq Scan` | Semua baris dibaca | Baik untuk tabel kecil atau kalau sebagian besar baris dibutuhkan, buruk kalau menyaring sedikit dari banyak |
| `Index Scan` | Lewat indeks, lalu ambil barisnya | Baik untuk hasil sedikit |
| `Index Only Scan` | Semua kolom ada di indeks, tabel tidak disentuh | Terbaik |
| `Bitmap Heap Scan` | Kumpulkan posisi dari indeks, baru baca tabel urut | Baik untuk hasil menengah |
| `Nested Loop` | Untuk setiap baris kiri, cari di kanan | Baik kalau kiri sedikit, bencana kalau banyak |
| `Hash Join` | Bangun tabel hash di memori | Baik untuk gabungan besar |

Satu tanda bahaya yang pantas dihafal: **`Nested Loop` dengan `loops` bernilai ribuan.** Itu N+1 yang terjadi di dalam basis data, dan penyebabnya biasanya perkiraan baris yang terlalu kecil.

## Indeks komposit dan urutan kolomnya

Ini bagian yang paling sering salah, dan aturannya bisa dihafal.

```sql
-- Untuk kueri ini:
SELECT * FROM peminjaman
WHERE anggota_id = $1 AND status = 'berjalan' AND jatuh_tempo < $2
ORDER BY dipinjam_pada DESC;

-- Urutan kolom indeks: kesetaraan dulu, lalu rentang, lalu pengurut
CREATE INDEX ON peminjaman (anggota_id, status, dipinjam_pada DESC, jatuh_tempo);
```

**Aturan urutan: kolom yang dibandingkan dengan kesetaraan lebih dulu, lalu kolom pengurut, lalu kolom rentang.** Alasannya: indeks B-tree tersusun seperti kamus multi-kolom. Begitu satu kolom dipakai dengan rentang (`<`, `>`, `BETWEEN`), kolom setelahnya tidak bisa lagi dipakai untuk pencarian terarah.

Konsekuensi praktisnya:

```sql
CREATE INDEX ON peminjaman (anggota_id, status, dipinjam_pada);

-- Dipakai penuh
WHERE anggota_id = $1 AND status = 'berjalan' ORDER BY dipinjam_pada

-- Dipakai sebagian: hanya kolom pertama
WHERE anggota_id = $1 ORDER BY jatuh_tempo

-- Tidak dipakai: kolom pertama tidak disebut
WHERE status = 'berjalan'
```

Baris terakhir penting: **indeks komposit hanya berguna kalau kolom paling kiri ikut disebut.** Jadi indeks `(a, b, c)` sekaligus melayani kueri atas `(a)` dan `(a, b)`, dan tidak melayani kueri atas `(b)` saja.

Tiga bentuk indeks yang memberi hasil besar dengan biaya kecil:

```sql
-- 1. Partial: hanya mengindeks baris yang memang dicari.
-- Peminjaman berjalan mungkin hanya 2% dari 2 juta baris,
-- jadi indeksnya 50 kali lebih kecil dan lebih cepat.
CREATE INDEX ON peminjaman (anggota_id, dipinjam_pada DESC)
  WHERE status = 'berjalan';

-- 2. Covering: kolom tambahan dibawa di dalam indeks,
-- sehingga tabelnya tidak perlu disentuh sama sekali.
CREATE INDEX ON peminjaman (anggota_id, dipinjam_pada DESC)
  INCLUDE (jatuh_tempo, denda_rp);

-- 3. Expression: mengindeks hasil perhitungan, bukan kolom mentah.
CREATE INDEX ON anggota (lower(email));
-- Sekarang kueri ini bisa memakai indeks:
-- WHERE lower(email) = lower($1)
```

Untuk pagination kursor dari modul 4, indeksnya harus cocok persis dengan `ORDER BY`:

```sql
-- Kueri kursor
SELECT * FROM peminjaman
WHERE (dipinjam_pada, id) < ($1, $2)
ORDER BY dipinjam_pada DESC, id DESC
LIMIT 20;

-- Indeksnya harus sama persis urutan dan arahnya
CREATE INDEX ON peminjaman (dipinjam_pada DESC, id DESC);
```

Inilah mengapa di modul 4 disebut bahwa tiga pilihan pengurutan berarti tiga indeks, dan itu keputusan dengan biaya.

## Jenis indeks selain B-tree

| Jenis | Untuk | Contoh |
| --- | --- | --- |
| **B-tree** | Kesetaraan, rentang, pengurutan | Bawaan, 95% kebutuhan |
| **GIN** | Isi di dalam nilai: teks penuh, `jsonb`, array | Pencarian buku, tag |
| **GiST** | Rentang dan geometri | `EXCLUDE` jadwal dari modul 5 |
| **BRIN** | Tabel sangat besar yang urut secara alami | Log dan data waktu, indeksnya mungil |
| **Hash** | Hanya kesetaraan | Jarang dipakai, B-tree biasanya cukup |

```sql
-- Pencarian teks dari modul 6
CREATE INDEX buku_cari_idx ON buku USING gin (cari);

-- Pencarian potongan kata dengan ILIKE '%...%'
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX buku_judul_trgm_idx ON buku USING gin (judul gin_trgm_ops);

-- Mencari di dalam kolom jsonb
CREATE INDEX pesanan_meta_idx ON pesanan USING gin (metadata jsonb_path_ops);

-- Tabel log 500 juta baris: BRIN berukuran beberapa megabyte,
-- B-tree akan berukuran puluhan gigabyte
CREATE INDEX log_waktu_brin ON log_aktivitas USING brin (dibuat_pada);
```

Baris `pg_trgm` menyelesaikan laporan kedua di awal modul: `ILIKE '%bumi%'` tidak bisa memakai B-tree karena pencarian dimulai dari tengah kata, dan indeks trigram membuatnya bisa.

## Kenapa indeks saya tidak dipakai

Enam penyebab paling umum, dan semuanya sering dialami:

```sql
-- 1. Fungsi membungkus kolom
WHERE lower(email) = 'tio@contoh.com'          -- indeks pada email tidak dipakai
WHERE date(dibuat_pada) = '2026-12-11'         -- indeks pada dibuat_pada tidak dipakai

-- Perbaikan: pindahkan fungsi ke sisi nilai, atau buat indeks ekspresi
WHERE email = lower($1)
WHERE dibuat_pada >= '2026-12-11' AND dibuat_pada < '2026-12-12'

-- 2. Tipe tidak cocok
WHERE anggota_id = 12345                       -- kolom text, nilai angka
WHERE id = $1::text                            -- kolom uuid, dikonversi ke text

-- 3. Wildcard di awal
WHERE judul LIKE '%manusia'                    -- butuh trigram

-- 4. OR di antara kolom berbeda
WHERE email = $1 OR telepon = $1               -- sering jadi seq scan
-- Perbaikan: UNION dari dua kueri yang masing-masing pakai indeks

-- 5. Selektivitas rendah
WHERE aktif = true                             -- kalau 95% baris aktif, seq scan lebih murah
-- Ini keputusan yang benar dari perencana, bukan masalah

-- 6. Statistik kedaluwarsa
-- Setelah impor besar, jalankan: ANALYZE peminjaman;
```

Nomor enam pantas diingat setelah operasi massal: perencana memutuskan berdasarkan statistik, dan statistik yang mengira tabel berisi seribu baris padahal dua juta akan menghasilkan rencana yang buruk. `autovacuum` biasanya mengurusnya, dan setelah impor besar sebaiknya Anda menjalankan `ANALYZE` sendiri.

## Biaya indeks

Indeks bukan gratis, dan tim yang menambahkan indeks untuk setiap kueri lambat akan menemukan masalah baru.

| Biaya | Akibatnya |
| --- | --- |
| Penulisan jadi lebih lambat | Setiap `INSERT` memperbarui semua indeks tabel itu |
| Penyimpanan | Indeks bisa lebih besar daripada tabelnya kalau terlalu banyak |
| Memori | Indeks yang sering dipakai menempati cache, menggeser data lain |
| Waktu perencanaan | Puluhan indeks pada satu tabel memperlambat setiap kueri sedikit |

Cara menemukan indeks yang tidak berguna:

```sql
-- Indeks yang hampir tidak pernah dipakai
SELECT schemaname, relname AS tabel, indexrelname AS indeks,
       idx_scan AS jumlah_dipakai,
       pg_size_pretty(pg_relation_size(indexrelid)) AS ukuran
FROM pg_stat_user_indexes
WHERE idx_scan < 50
ORDER BY pg_relation_size(indexrelid) DESC;

-- Kueri paling mahal secara total, bukan hanya yang paling lambat sekali
SELECT substring(query, 1, 80) AS kueri,
       calls,
       round(total_exec_time::numeric, 0) AS total_ms,
       round(mean_exec_time::numeric, 2) AS rata_ms
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

Kueri kedua itu alat terpenting di seluruh modul ini. Ia menjawab pertanyaan yang benar: bukan "kueri mana yang paling lambat", tapi **"kueri mana yang paling banyak menghabiskan waktu basis data secara total"**. Kueri 5 ms yang dipanggil sejuta kali per jam lebih merugikan daripada laporan 3 detik yang dipanggil sepuluh kali sehari.

## Perawatan

Postgres tidak menghapus baris secara langsung saat `UPDATE` atau `DELETE`, melainkan menandainya mati. `autovacuum` yang membersihkannya.

| Masalah | Gejala | Tindakan |
| --- | --- | --- |
| Bloat tabel | Ukuran tabel jauh lebih besar daripada isinya, kueri melambat | Periksa `pg_stat_user_tables`, setel autovacuum lebih agresif |
| Bloat indeks | Indeks membengkak setelah banyak pembaruan | `REINDEX CONCURRENTLY` |
| Statistik melenceng | Perkiraan `rows` jauh dari aktual | `ANALYZE`, atau naikkan `statistics target` |
| Tabel sangat besar | Kueri dan perawatan melambat | Partisi berdasarkan waktu |

Satu catatan tentang tabel yang sering diperbarui, misalnya tabel pekerjaan antrean: tabel seperti itu bisa membengkak cepat, dan `autovacuum` bawaan kadang tidak cukup sering. Setel per tabel:

```sql
ALTER TABLE pekerjaan SET (autovacuum_vacuum_scale_factor = 0.02);
```

## Kapan indeks bukan jawabannya

Laporan ketiga di awal modul, yaitu laporan bulanan yang membuat basis data sibuk dua menit, **tidak** bisa diselesaikan indeks. Agregasi atas dua juta baris memang harus membaca dua juta baris.

Empat jalan keluar, berurutan dari yang paling sederhana:

| Pendekatan | Cara | Cocok untuk |
| --- | --- | --- |
| **Cache hasilnya** | Simpan di Redis, berlaku 1 jam | Laporan yang sama diminta banyak orang. Modul 13 |
| **Tabel ringkasan** | Dihitung berkala oleh pekerjaan latar | Dasbor yang tidak perlu angka detik ini. Modul 14 |
| **Materialized view** | Kueri yang hasilnya disimpan, disegarkan berkala | Laporan tetap, dengan `REFRESH CONCURRENTLY` |
| **Replika baca** | Laporan berat dijalankan di salinan basis data | Melindungi beban transaksi dari beban laporan |

Yang terakhir menyelesaikan bagian yang paling merugikan dari laporan itu: **endpoint lain ikut melambat.** Memisahkan beban analitik dari beban transaksi adalah langkah yang hampir selalu benar begitu keduanya bersaing.

```sql
-- Materialized view untuk dasbor
CREATE MATERIALIZED VIEW rekap_bulanan AS
SELECT date_trunc('month', dipinjam_pada) AS bulan,
       count(*) AS total,
       count(*) FILTER (WHERE dikembalikan_pada::date > jatuh_tempo) AS telat,
       coalesce(sum(denda_rp), 0) AS denda
FROM peminjaman
GROUP BY 1;

CREATE UNIQUE INDEX ON rekap_bulanan (bulan);   -- wajib untuk CONCURRENTLY

-- Disegarkan tiap jam tanpa memblokir pembacaan
REFRESH MATERIALIZED VIEW CONCURRENTLY rekap_bulanan;
```

## Latihan

### Latihan 1: Buktikan sendiri pada dua juta baris

Buat data benih besar, lalu ukur empat kueri sebelum dan sesudah indeks.

```sql
-- Dua juta peminjaman dengan sebaran yang masuk akal
INSERT INTO peminjaman (id, anggota_id, salinan_id, buku_id, status, dipinjam_pada, jatuh_tempo, denda_rp)
SELECT
  gen_random_uuid(),
  (SELECT id FROM anggota ORDER BY random() LIMIT 1),
  (SELECT id FROM salinan ORDER BY random() LIMIT 1),
  (SELECT id FROM buku ORDER BY random() LIMIT 1),
  CASE WHEN random() < 0.03 THEN 'berjalan' ELSE 'selesai' END,
  now() - (random() * interval '365 days'),
  (now() - (random() * interval '350 days'))::date,
  CASE WHEN random() < 0.2 THEN (random() * 20)::int * 1000 ELSE 0 END
FROM generate_series(1, 2_000_000);

ANALYZE peminjaman;
```

Lalu ukur: daftar peminjaman berjalan satu anggota, pencarian buku dengan `ILIKE`, daftar terlambat yang diurutkan, dan rekap per bulan. Catat waktu, jenis scan, dan `Rows Removed by Filter` untuk masing-masing.

> [!petunjuk]
> Subquery `ORDER BY random() LIMIT 1` di dalam `generate_series` akan sangat lambat untuk dua juta baris. Lebih baik: ambil daftar id ke array lebih dulu, lalu pilih dengan indeks acak. Atau sisipkan per batch 50 ribu baris.

> [!jawaban]
>
> Hasil khas pada laptop biasa:
>
> | Kueri | Sebelum | Sesudah | Indeks yang menolong |
> | --- | --- | --- | --- |
> | Pinjaman berjalan satu anggota | 1.800 ms, Seq Scan | 0,1 ms, Index Scan | Partial `(anggota_id, dipinjam_pada DESC) WHERE status='berjalan'` |
> | `ILIKE '%bumi%'` pada judul | 900 ms, Seq Scan | 4 ms, Bitmap Index Scan | GIN trigram |
> | Daftar terlambat urut jatuh tempo | 2.100 ms + Sort | 0,3 ms | Partial `(jatuh_tempo) WHERE status='berjalan'` |
> | Rekap per bulan | 2.400 ms | **2.300 ms** | Tidak ada yang menolong |
>
> Empat pelajarannya:
>
> 1. **Indeks partial memberi hasil terbaik di sini.** Hanya 3% peminjaman berstatus berjalan, jadi indeksnya 30 kali lebih kecil daripada indeks penuh. Lebih kecil berarti lebih banyak masuk cache memori, dan itu berlapis manfaatnya.
> 2. **Pengurutan ikut hilang.** Pada kueri ketiga, yang semula memakan waktu bukan hanya pencarian tapi juga `Sort` atas puluhan ribu baris. Indeks yang arah urutannya cocok menghapus langkah itu sepenuhnya.
> 3. **Kueri keempat tidak membaik, dan itu pelajaran terpenting.** Agregasi atas dua juta baris harus membaca dua juta baris. Indeks tidak bisa menolong, dan jawabannya tabel ringkasan atau materialized view.
> 4. **Ukuran data menentukan rencana.** Jalankan kueri pertama pada tabel 1.000 baris, dan Postgres akan memilih `Seq Scan` meski indeksnya ada, karena membaca seluruh tabel kecil memang lebih murah. Itu keputusan yang benar, dan alasan kenapa menguji performa pada data kecil tidak membuktikan apa pun.

### Latihan 2: Baca tiga rencana kueri

Diagnosis tiga keluaran `EXPLAIN ANALYZE` berikut, lalu tulis perbaikannya.

```text
-- A
Nested Loop  (actual time=0.412..4821.337 rows=4822 loops=1)
  ->  Seq Scan on pesanan  (actual time=0.019..42.331 rows=4822 loops=1)
  ->  Index Scan using pengguna_pkey on pengguna
        (actual time=0.98..0.99 rows=1 loops=4822)

-- B
Index Scan using buku_judul_idx on buku
  (cost=0.42..8.44 rows=1 width=120) (actual time=0.021..1284.882 rows=98412 loops=1)
  Index Cond: (judul > 'A'::text)

-- C
Limit  (actual time=8421.113..8421.118 rows=20 loops=1)
  ->  Sort  (actual time=8421.111..8421.114 rows=20 loops=1)
        Sort Key: dibuat_pada DESC
        Sort Method: external merge  Disk: 184320kB
        ->  Seq Scan on log_aktivitas (actual time=0.287..6213.982 rows=1984221 loops=1)
```

> [!jawaban]
>
> **A: `loops=4822` adalah N+1 di dalam basis data.** Untuk setiap baris pesanan, Postgres mencari satu baris pengguna. Masing-masing hanya 1 ms, dikali 4.822 jadi 4,8 detik.
>
> Penyebabnya biasanya perencana memperkirakan baris kiri sedikit, lalu memilih `Nested Loop`. Perbaikannya: pastikan statistik mutakhir dengan `ANALYZE`, dan kalau perkiraannya tetap melenceng, periksa apakah kondisi penyaringan pesanan punya indeks. Dengan baris kiri yang benar-benar banyak, perencana akan memilih `Hash Join` yang membaca tabel pengguna satu kali saja.
>
> **B: perkiraan 1 baris, kenyataan 98.412 baris.** Perencana memilih `Index Scan` karena menyangka hasilnya satu baris, lalu harus mengambil hampir seratus ribu baris satu per satu lewat indeks, yang jauh lebih mahal daripada membaca tabel langsung.
>
> Dua penyebab yang mungkin: statistik kedaluwarsa, atau syaratnya memang tidak selektif (`judul > 'A'` cocok dengan hampir semua baris). Perbaikan: `ANALYZE buku`, dan periksa apakah kuerinya memang bermaksud mengambil seratus ribu baris. Kalau ya, masalahnya bukan rencana kueri melainkan tidak adanya `LIMIT`.
>
> **C: `Sort Method: external merge Disk: 184320kB`.** Pengurutan 1,9 juta baris tidak cukup di memori, jadi Postgres memakai disk. Itu 180 MB tulis-baca hanya untuk mengambil 20 baris teratas.
>
> Perbaikan utamanya indeks pada `(dibuat_pada DESC)`, yang menghapus `Sort` sepenuhnya dan membuat `LIMIT 20` hanya membaca 20 entri indeks. Tabel log juga kandidat kuat untuk BRIN dan partisi per bulan. Menaikkan `work_mem` akan memindahkan pengurutan ke memori dan tetap salah, karena akar masalahnya mengurutkan 1,9 juta baris untuk mengambil 20.
>
> Pola yang menghubungkan ketiganya: **bandingkan perkiraan dengan aktual, dan perhatikan `loops`.** Dua angka itu menjawab sebagian besar pertanyaan tentang rencana kueri.

### Latihan 3: Rancang indeks untuk enam kueri

Untuk enam kueri berikut pada tabel `peminjaman` berisi 2 juta baris, rancang kumpulan indeks seminimal mungkin. Sebutkan indeks mana yang melayani kueri mana.

| # | Kueri |
| --- | --- |
| 1 | Peminjaman berjalan satu anggota, urut terbaru |
| 2 | Semua peminjaman satu anggota, urut terbaru, dengan kursor |
| 3 | Peminjaman terlambat di seluruh perpustakaan, urut jatuh tempo |
| 4 | Satu peminjaman berdasarkan id |
| 5 | Peminjaman satu salinan yang masih berjalan |
| 6 | Rekap jumlah per bulan untuk 12 bulan terakhir |

> [!pembahasan]
>
> ```sql
> -- Melayani #1, dan sebagian #2
> CREATE INDEX peminjaman_anggota_waktu_idx
>   ON peminjaman (anggota_id, dipinjam_pada DESC, id DESC);
>
> -- Melayani #3. Partial, karena terlambat hanya relevan untuk yang berjalan
> CREATE INDEX peminjaman_telat_idx
>   ON peminjaman (jatuh_tempo)
>   WHERE status = 'berjalan';
>
> -- #4 sudah dilayani primary key, tidak perlu indeks tambahan
>
> -- Melayani #5, dan sekaligus menegakkan aturan dari modul 5
> CREATE UNIQUE INDEX satu_pinjaman_aktif_per_salinan
>   ON peminjaman (salinan_id)
>   WHERE status = 'berjalan';
>
> -- #6 tidak dilayani indeks. Pakai materialized view.
> ```
>
> Empat keputusan dan alasannya:
>
> 1. **Satu indeks untuk #1 dan #2.** Indeks `(anggota_id, dipinjam_pada DESC, id DESC)` melayani keduanya, karena kueri #1 hanya menambahkan syarat `status` yang bisa disaring setelah indeks mempersempit ke beberapa baris milik satu anggota. Menambah indeks partial terpisah untuk #1 memang akan sedikit lebih cepat, dan belum tentu sepadan dengan biaya penulisannya. Ukur dulu.
> 2. **`id DESC` sebagai kolom terakhir** supaya pagination kursor dari modul 4 tidak butuh pengurutan tambahan.
> 3. **Indeks unik untuk #5 memberi dua manfaat sekaligus**, yaitu pencarian cepat dan jaminan aturan bisnis. Indeks yang sekaligus menjadi batasan adalah indeks yang paling pantas dibuat.
> 4. **Empat indeks untuk enam kueri**, dan primary key sudah menanggung satu. Ini jumlah yang sehat. Kalau Anda berakhir dengan dua belas indeks pada satu tabel, hampir pasti ada yang tidak terpakai, dan kueri `pg_stat_user_indexes` akan menunjukkannya setelah sepekan berjalan.
>
> Satu catatan tentang menambah indeks di produksi: **selalu `CREATE INDEX CONCURRENTLY`.** Versi biasa memblokir seluruh penulisan ke tabel itu selama pembuatan, yang pada tabel 2 juta baris bisa berarti satu menit penuh tanpa layanan.

### Latihan 4: Enam kueri yang mengabaikan indeksnya

Semua kueri ini punya indeks yang tampak cocok dan tidak memakainya. Jelaskan dan perbaiki.

```sql
-- Indeks: anggota(email)
SELECT * FROM anggota WHERE lower(email) = 'tio@contoh.com';

-- Indeks: peminjaman(dipinjam_pada)
SELECT * FROM peminjaman WHERE date(dipinjam_pada) = '2026-12-11';

-- Indeks: buku(judul)
SELECT * FROM buku WHERE judul ILIKE '%manusia%';

-- Indeks: anggota(email), anggota(telepon)
SELECT * FROM anggota WHERE email = $1 OR telepon = $1;

-- Indeks: peminjaman(status)
SELECT * FROM peminjaman WHERE status = 'selesai';

-- Indeks: pesanan(nomor_invoice) dengan kolom bertipe text
SELECT * FROM pesanan WHERE nomor_invoice = 20261211;
```

> [!jawaban]
>
> | # | Penyebab | Perbaikan |
> | --- | --- | --- |
> | 1 | Fungsi membungkus kolom | `CREATE INDEX ON anggota (lower(email))`, dan selalu simpan email dalam huruf kecil sejak awal |
> | 2 | `date()` membungkus kolom | Ganti ke rentang: `>= '2026-12-11' AND < '2026-12-12'` |
> | 3 | Wildcard di awal | Indeks GIN trigram dengan `pg_trgm` |
> | 4 | `OR` antar kolom berbeda | Pecah jadi `UNION` dari dua kueri yang masing-masing pakai indeksnya |
> | 5 | Selektivitas rendah: 97% baris berstatus selesai | **Tidak perlu diperbaiki.** Seq Scan memang lebih murah, dan indeksnya layak dihapus |
> | 6 | Tipe tidak cocok: angka dibanding kolom text | Kirim nilainya sebagai string, dan pastikan tipe parameter benar di kode aplikasi |
>
> ```sql
> -- Perbaikan #4
> SELECT * FROM anggota WHERE email = $1
> UNION
> SELECT * FROM anggota WHERE telepon = $1;
> ```
>
> Dua hal yang pantas dibawa dari latihan ini:
>
> **Nomor 5 adalah jawaban yang paling sering salah dipahami.** Melihat `Seq Scan` tidak otomatis berarti ada masalah. Kalau kueri memang mengambil 97% baris, membaca tabel berurutan lebih cepat daripada melompat lewat indeks dua juta kali. Perencana mengambil keputusan yang benar, dan indeks `status` di situ hanya memperlambat setiap penulisan tanpa memberi manfaat.
>
> **Nomor 6 sering tersembunyi di kode aplikasi.** Mengirim `20261211` sebagai angka ke kolom `text` memaksa Postgres mengonversi setiap baris sebelum membandingkan. Gejalanya: kueri yang di `psql` cepat jadi lambat lewat aplikasi, karena driver mengirim tipe parameter yang berbeda. Periksa dengan `EXPLAIN` yang dijalankan dari aplikasi, bukan hanya dari `psql`.

## Batasnya

Indeks dan rencana kueri menyelesaikan kecepatan pembacaan, dan tiga hal tetap terbuka.

**Agregasi atas data besar tetap mahal.** Jawabannya cache, tabel ringkasan, atau replika baca, dan ketiganya dibahas di modul 13 dan 14.

**Basis data punya batas.** Pada data yang sangat besar, jawabannya partisi, replikasi baca, dan akhirnya sharding. Yang terakhir dibahas di modul 23, dan sebaiknya ditunda selama mungkin.

**Semua yang Anda lakukan sejauh ini mengasumsikan semua pemanggil berhak atas semua data.** Belum ada satu pun pemeriksaan tentang siapa yang memanggil, dan itu lubang terbesar yang masih terbuka di layanan Anda.

## Rangkuman

- Kueri tanpa indeks tumbuh jauh lebih buruk daripada linear. Perbedaannya bisa seribu kali, bukan dua kali.
- `EXPLAIN (ANALYZE, BUFFERS)` adalah alat utamanya. Periksa jenis scan, `Rows Removed by Filter`, perkiraan versus aktual, `loops`, dan buffer.
- Rencana kueri bergantung pada ukuran data. Menguji performa pada seribu baris tidak membuktikan apa pun.
- Urutan kolom indeks komposit: kesetaraan dulu, lalu pengurut, lalu rentang. Indeks hanya berguna kalau kolom paling kiri disebut.
- Indeks partial, covering, dan ekspresi memberi hasil besar dengan biaya kecil. Indeks untuk pagination kursor harus cocok persis dengan `ORDER BY`.
- Fungsi pada kolom, tipe yang tidak cocok, wildcard di awal, dan `OR` antar kolom membuat indeks tidak terpakai.
- `Seq Scan` tidak selalu salah. Pada kueri yang mengambil sebagian besar baris, itu pilihan yang benar.
- Indeks memperlambat penulisan dan memakan ruang. Periksa `pg_stat_user_indexes` untuk membuang yang tidak terpakai.
- `pg_stat_statements` diurutkan berdasarkan total waktu menjawab pertanyaan yang benar: kueri mana yang paling banyak menghabiskan waktu basis data.
- Agregasi tidak bisa diperbaiki indeks. Pakai materialized view, tabel ringkasan, cache, atau replika baca.
- Di produksi, selalu `CREATE INDEX CONCURRENTLY`.

## Masalah terbuka

Layanan Anda sekarang benar dan cepat. Dan ada satu hal yang belum pernah dibahas sejak modul 1: **siapa yang memanggilnya.**

Sepanjang sembilan modul, identitas pemanggil datang dari header `X-Anggota-Id` yang dikirim klien sendiri. Artinya siapa pun bisa mengirim id orang lain dan melihat seluruh riwayat peminjamannya, mengajukan perpanjangan atas namanya, atau menghapus data miliknya. Setiap indeks yang Anda buat, setiap transaksi yang Anda jaga, dan setiap batasan yang Anda pasang tidak berarti apa-apa kalau siapa pun bisa berpura-pura jadi siapa pun.

Tapi sebelum menutup lubang itu, saatnya membuktikan bahwa lima modul tentang basis data sudah menempel.

Bagian berikutnya adalah Proyek 2: API toko dengan Postgres, lengkap dengan transaksi saat memesan, pencegahan pemesanan ganda, pagination kursor, dan laporan `EXPLAIN ANALYZE` yang membuktikan setiap kueri utamanya memakai indeks.
