---
title: 'Modul 6: SQL yang Dipakai Sehari-hari'
description: Satu pernyataan yang dijalankan di tempat datanya berada mengalahkan seribu baris pengolahan di aplikasi. Select, join, agregasi, penulisan bersyarat, dan jebakan NULL yang memberi jawaban salah tanpa error.
date: 2026-12-09
slug: modul-6-sql-sehari-hari
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Empat pertanyaan dari pengelola perpustakaan di akhir modul 5 punya dua kemungkinan jawaban.

**Cara pertama:** ambil semua peminjaman ke aplikasi, lalu olah dengan `filter`, `map`, dan `reduce`. Terasa akrab, dan punya empat masalah: seluruh baris berpindah lewat jaringan, memori proses membengkak, event loop tertahan seperti di modul 2, dan waktunya bertambah setiap bulan seiring data tumbuh.

**Cara kedua:** kirim satu pernyataan, dan biarkan basis data mengerjakannya di tempat datanya berada, memakai indeks yang sudah ada.

| Pertanyaan | Di aplikasi | Dengan SQL |
| --- | --- | --- |
| Total denda bulan ini | Ambil 80.000 baris, jumlahkan | Satu baris hasil |
| Sepuluh peminjam teraktif | Ambil semua, kelompokkan, urutkan | Satu kueri dengan `LIMIT 10` |
| Buku yang belum pernah dipinjam | Ambil dua tabel, bandingkan | Satu `LEFT JOIN` |
| Stok berkurang hanya kalau masih ada | Baca, periksa, tulis, dan ada celah di antaranya | Satu `UPDATE ... WHERE` |

SQL bukan bahasa tambahan yang bisa ditunda sampai nanti. Untuk backend, SQL adalah bagian dari pekerjaan sehari-hari, dan kemampuan menulisnya membedakan layanan yang tetap cepat pada data besar dari layanan yang perlu ditulis ulang tiap tahun.

Modul ini membahas bagian SQL yang Anda pakai hampir setiap hari, dan berhenti di situ dengan sengaja. Pertanyaan analitik yang lebih berat, misalnya peringkat per kategori dan pertumbuhan dibanding bulan lalu, punya alat sendiri yang dibahas di modul 7.

## Yang harus sudah siap

Modul 5 meninggalkan satu basis data `perpustakaan` yang berjalan di Docker, berisi tabel `buku`, `salinan`, `anggota`, `peminjaman`, `kategori`, dan `buku_kategori`. Semua kueri di modul ini dijalankan di sana.

```bash
# Dari folder proyek Anda
docker compose up -d
docker compose exec -it db psql -U postgres -d perpustakaan
```

Kalau yang muncul adalah `perpustakaan=#`, Anda siap. Ketik `\dt` untuk melihat daftar tabel, dan `\q` untuk keluar.

## Analogi: dua cara meminta data ke petugas arsip

Analogi kantor dari modul 1 masih dipakai, sekarang untuk gudang arsipnya.

**Cara pertama:** Anda meminta petugas membawa **seluruh** lemari arsip ke meja Anda, lalu Anda sendiri memilah lembar yang dibutuhkan. Lima lembar yang Anda cari ada di antara delapan puluh ribu lembar yang diangkut.

**Cara kedua:** Anda menuliskan permintaan, misalnya "semua peminjaman bulan ini yang terlambat, dikelompokkan per kategori, urutkan dari terbanyak". Petugas tahu letak rak dan punya kartu indeks, lalu kembali membawa satu lembar ringkasan.

Satu sifat SQL yang perlu dipahami sejak awal: Anda menyatakan **apa** yang diinginkan, bukan **bagaimana** mengambilnya. Yang memutuskan caranya adalah perencana kueri di dalam Postgres, dan perencana itu bisa memilih jalan berbeda untuk pernyataan yang sama tergantung ukuran data dan indeks yang tersedia. Modul 10 membahas cara membaca keputusannya.

| Dunia arsip | Dunia SQL |
| --- | --- |
| Lembar permintaan yang Anda tulis | Pernyataan SQL |
| Petugas yang memutuskan rak mana dibuka | Perencana kueri |
| Kartu indeks di tepi rak | Indeks |
| Menggabungkan dua buku induk | `JOIN` |
| Rekap per kecamatan | `GROUP BY` |
| Mencoret satu baris hanya kalau stoknya masih ada | `UPDATE ... WHERE` |

Batas analoginya: petugas manusia mengerti maksud Anda meski permintaannya kurang jelas, sedangkan basis data menjalankan tepat seperti yang tertulis. Kueri yang salah tidak protes, hanya memberi jawaban yang salah dengan percaya diri, dan jebakan `NULL` di akhir modul ini contoh terbaiknya.

## Dasar yang dipakai terus

```sql
-- Ambil kolom yang dibutuhkan, bukan semua
SELECT id, judul, penulis, tahun
FROM buku
WHERE tahun >= 2020
  AND penulis ILIKE '%pramoedya%'   -- ILIKE: tidak peduli huruf besar kecil
ORDER BY tahun DESC, id DESC        -- selalu ada pengurut kedua yang unik
LIMIT 20;
```

Tiga kebiasaan yang membedakan kueri yang layak produksi:

**`SELECT *` tidak dipakai di kode aplikasi.** Bentuk itu mengirim kolom yang tidak dibutuhkan, memecah kode saat ada kolom baru ditambahkan, dan menghalangi pengoptimalan di mana indeks saja sudah cukup untuk menjawab kueri. Untuk eksplorasi di `psql`, silakan.

**`LIMIT` tanpa `ORDER BY` tidak menjamin apa pun.** Tanpa urutan, Postgres bebas mengembalikan baris mana pun, dan hasilnya bisa berbeda antar pemanggilan. Ini sumber bug pagination yang paling sering.

**Nilai selalu lewat parameter, tidak pernah disambung.** Alasannya injeksi SQL, dan modul 8 menunjukkan bentuknya di kode Node.


## Join: menggabungkan tabel

```sql
-- INNER JOIN: hanya baris yang punya pasangan di kedua sisi
SELECT p.id, a.nama, b.judul, p.jatuh_tempo
FROM peminjaman p
JOIN anggota a ON a.id = p.anggota_id
JOIN salinan s ON s.id = p.salinan_id
JOIN buku    b ON b.id = s.buku_id
WHERE p.status = 'berjalan';

-- LEFT JOIN: semua baris kiri, dengan NULL kalau tidak ada pasangan
-- Ini cara menjawab "buku yang belum pernah dipinjam"
SELECT b.id, b.judul, count(p.id) AS jumlah_dipinjam
FROM buku b
LEFT JOIN salinan s    ON s.buku_id = b.id
LEFT JOIN peminjaman p ON p.salinan_id = s.id
GROUP BY b.id, b.judul
HAVING count(p.id) = 0;
```

Empat jenis join, dan kapan masing-masing dipakai:

| Jenis | Hasilnya | Dipakai untuk |
| --- | --- | --- |
| `JOIN` (inner) | Hanya yang berpasangan | Kebutuhan normal |
| `LEFT JOIN` | Semua kiri, kanan bisa `NULL` | "Termasuk yang belum punya ..." |
| `FULL JOIN` | Semua dari dua sisi | Rekonsiliasi dua sumber data |
| `CROSS JOIN` | Semua kombinasi | Membuat matriks, misalnya semua tanggal kali semua cabang |

Satu kesalahan yang sangat sering terjadi: **memasang syarat tabel kanan di `WHERE` pada sebuah `LEFT JOIN`**, yang secara diam-diam mengubahnya jadi inner join.

```sql
-- Salah: baris tanpa peminjaman ikut hilang,
-- karena NULL tidak lolos perbandingan di WHERE
SELECT b.judul, p.id
FROM buku b
LEFT JOIN peminjaman p ON p.buku_id = b.id
WHERE p.status = 'berjalan';

-- Benar: syaratnya ikut di dalam ON
SELECT b.judul, p.id
FROM buku b
LEFT JOIN peminjaman p ON p.buku_id = b.id AND p.status = 'berjalan';
```

Patokannya: syarat tentang **pasangan** tempatnya di `ON`, syarat tentang **baris kiri** tempatnya di `WHERE`.


## Agregasi

```sql
-- Rekap keterlambatan bulan ini per kategori
SELECT k.nama AS kategori,
       count(*)                                  AS jumlah_terlambat,
       sum(p.denda_rp)                           AS total_denda,
       round(avg(p.dikembalikan_pada::date - p.jatuh_tempo), 1) AS rata_hari_telat
FROM peminjaman p
JOIN salinan s        ON s.id = p.salinan_id
JOIN buku_kategori bk ON bk.buku_id = s.buku_id
JOIN kategori k       ON k.id = bk.kategori_id
WHERE p.dikembalikan_pada >= date_trunc('month', now())
  AND p.dikembalikan_pada::date > p.jatuh_tempo
GROUP BY k.nama
HAVING count(*) > 5          -- HAVING menyaring setelah pengelompokan
ORDER BY jumlah_terlambat DESC;
```

Empat hal yang perlu dikuasai tentang agregasi:

**`WHERE` menyaring baris sebelum dikelompokkan, `HAVING` menyaring kelompok setelahnya.** Memakai `HAVING` untuk hal yang bisa di `WHERE` membuat basis data bekerja lebih banyak tanpa alasan.

**Semua kolom non-agregat harus ada di `GROUP BY`.** Postgres akan menolak kalau tidak, dan penolakan itu menyelamatkan Anda dari hasil yang ambigu.

**`count(*)` menghitung baris, `count(kolom)` hanya menghitung yang bukan `NULL`.** Perbedaan ini sering jadi sumber angka yang tidak cocok antara dua laporan.

**Agregat mengabaikan `NULL`.** `avg` atas sepuluh baris yang tiga di antaranya `NULL` membagi dengan tujuh, bukan sepuluh. Kadang itu yang Anda inginkan, kadang bukan, dan `coalesce` menentukannya.


## Menulis data

```sql
-- INSERT dengan RETURNING: tidak perlu kueri kedua untuk tahu hasilnya
INSERT INTO buku (id, isbn, judul, penulis, tahun)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, judul, dibuat_pada;

-- UPSERT: sisipkan, atau perbarui kalau sudah ada
INSERT INTO kategori (id, slug, nama)
VALUES ($1, $2, $3)
ON CONFLICT (slug) DO UPDATE
  SET nama = excluded.nama,
      diperbarui_pada = now()
RETURNING *;

-- Sisipkan kalau belum ada, diam kalau sudah.
-- Ini yang dipakai untuk kunci idempotency di modul 4.
INSERT INTO idempotency (kunci, pengguna_id, sidik_jari, status)
VALUES ($1, $2, $3, 'diproses')
ON CONFLICT (kunci) DO NOTHING
RETURNING kunci;

-- UPDATE bersyarat: pengurangan yang aman dari konkurensi.
-- Baris terpengaruh 0 berarti stok tidak cukup. Modul 9 membahasnya.
UPDATE produk
SET stok = stok - $2
WHERE id = $1 AND stok >= $2
RETURNING stok;
```

Empat pola di atas pantas dihafal. `ON CONFLICT DO NOTHING ... RETURNING` adalah penulisan bersyarat atomik yang dibutuhkan di Latihan 2 modul 4, dan `UPDATE ... WHERE stok >= $2` adalah bentuk paling sederhana dari pencegahan konkurensi yang akan dibahas tuntas di modul 9.

Satu bentuk lagi yang menghemat banyak perjalanan jaringan: menyisipkan banyak baris sekaligus.

```sql
-- Satu perjalanan untuk 500 baris, bukan 500 perjalanan
INSERT INTO pesanan_item (id, pesanan_id, produk_id, nama_produk, harga_satuan, jumlah)
SELECT (x->>'id')::uuid, $1, (x->>'produk_id')::uuid,
       x->>'nama', (x->>'harga')::bigint, (x->>'jumlah')::int
FROM jsonb_array_elements($2::jsonb) AS x;
```


## Jebakan `NULL`

`NULL` berarti "tidak diketahui", bukan "kosong", dan perbandingan dengan sesuatu yang tidak diketahui menghasilkan hasil yang juga tidak diketahui. Dari sifat itu muncul empat jebakan yang menghasilkan jawaban salah tanpa error apa pun.

```sql
-- 1. NULL tidak sama dengan apa pun, termasuk NULL
SELECT NULL = NULL;        -- NULL, bukan true
SELECT NULL IS NULL;       -- true, ini cara yang benar

-- 2. NOT IN dengan NULL mengembalikan kosong, selalu
SELECT * FROM buku
WHERE id NOT IN (SELECT buku_id FROM peminjaman);
-- Kalau satu saja buku_id bernilai NULL, hasilnya nol baris.
-- Pakai NOT EXISTS:
SELECT * FROM buku b
WHERE NOT EXISTS (SELECT 1 FROM peminjaman p WHERE p.buku_id = b.id);

-- 3. Penggabungan teks dengan NULL menghasilkan NULL
SELECT 'Halo ' || NULL;           -- NULL
SELECT 'Halo ' || coalesce(NULL, 'tamu');  -- 'Halo tamu'

-- 4. Agregat mengabaikan NULL, dan itu kadang bukan yang Anda mau
SELECT avg(denda_rp) FROM peminjaman;                   -- hanya yang terisi
SELECT avg(coalesce(denda_rp, 0)) FROM peminjaman;      -- semua baris
```

Nomor dua pantas diingat selamanya: `NOT IN` dengan subquery adalah salah satu penyebab bug paling membingungkan di SQL, karena kueri tidak error dan hasilnya nol baris yang terlihat masuk akal. Biasakan memakai `NOT EXISTS`, yang juga biasanya lebih cepat.

Jebakan kelima datang dari zona waktu:

```sql
-- Salah untuk perpustakaan di Jakarta: batas harinya pakai UTC
SELECT count(*) FROM peminjaman
WHERE dipinjam_pada >= date_trunc('day', now());

-- Benar: tentukan zona waktunya secara eksplisit
SELECT count(*) FROM peminjaman
WHERE dipinjam_pada >= date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta')
                       AT TIME ZONE 'Asia/Jakarta';
```

Laporan "transaksi hari ini" yang memakai batas UTC akan memasukkan transaksi dari pukul 07.00 kemarin sampai 06.59 hari ini untuk Jakarta. Selisih tujuh jam yang membuat angka laporan tidak pernah cocok dengan hitungan manual kasir.

## Latihan

### Latihan 1: Ramalkan dulu, jalankan kemudian

Latihan paling murah dan paling sering dilewati. Untuk tujuh pernyataan berikut, **tulis dugaan Anda di kertas atau komentar sebelum menjalankannya**, lalu jalankan di `psql` dan bandingkan. Yang dicari bukan nilai benarnya, melainkan tempat dugaan Anda meleset.

```sql
-- 1
SELECT count(*) FROM buku;

-- 2
SELECT count(*) FROM buku WHERE tahun IS NULL;

-- 3
SELECT 'Halo ' || NULL;

-- 4
SELECT NULL = NULL;

-- 5
SELECT count(*) FROM peminjaman p JOIN anggota a ON a.id = p.anggota_id;

-- 6
SELECT count(*) FROM peminjaman p LEFT JOIN anggota a ON a.id = p.anggota_id;

-- 7
SELECT judul FROM buku LIMIT 3;
-- lalu jalankan persis pernyataan yang sama sekali lagi
```

> [!petunjuk]
> Untuk nomor 3 dan 4, ingat bahwa `NULL` tidak berarti "kosong", melainkan "tidak diketahui". Apa hasil penjumlahan sesuatu dengan nilai yang tidak diketahui? Untuk nomor 7, pertanyaannya bukan "apa isinya" melainkan "apakah urutannya dijamin sama".

> [!jawaban]
>
> | # | Hasil | Yang dipelajari |
> | --- | --- | --- |
> | 1 | Jumlah seluruh baris | `count(*)` menghitung baris, titik |
> | 2 | Jumlah buku yang tahunnya belum diisi | `IS NULL`, bukan `= NULL` |
> | 3 | `NULL`, bukan `'Halo '` | Apa pun yang digabung dengan sesuatu yang tidak diketahui jadi tidak diketahui |
> | 4 | `NULL`, bukan `true` | Dua hal yang sama-sama tidak diketahui tidak bisa dinyatakan sama |
> | 5 dan 6 | Angkanya sama | `anggota_id` punya foreign key dan `NOT NULL`, jadi setiap peminjaman pasti punya pasangan. `LEFT JOIN` tidak menambah apa pun di sini |
> | 7 | Boleh berbeda antar pemanggilan | `LIMIT` tanpa `ORDER BY` tidak menjamin urutan apa pun |
>
> Tiga hal yang pantas menempel dari latihan sekecil ini:
>
> **Nomor 3 dan 4 adalah akar dari hampir semua kesalahan `NULL`.** Bagian "Jebakan `NULL`" di modul ini hanya memperluas dua baris itu. Kalau keduanya sudah masuk akal, sisanya tinggal penerapan.
>
> **Nomor 5 dan 6 menunjukkan bahwa `LEFT JOIN` bukan selalu lebih aman.** Pada relasi yang dijamin `NOT NULL` dan foreign key dari modul 5, hasilnya identik, dan memakai `LEFT JOIN` di situ hanya menyamarkan maksud Anda. Pakai `LEFT JOIN` saat Anda memang ingin baris tanpa pasangan ikut muncul.
>
> **Nomor 7 adalah bug pagination yang paling sering.** Postgres tidak berjanji apa-apa soal urutan sampai Anda memintanya. Pada tabel kecil hasilnya sering kebetulan stabil, dan itu justru yang berbahaya: bugnya baru muncul setelah data bertambah atau setelah ada `UPDATE`.

### Latihan 2: Jawab empat pertanyaan pengelola

Tulis kueri untuk empat pertanyaan dari akhir modul 5, pakai basis data perpustakaan Anda.

1. Berapa buku terlambat per kategori bulan ini, beserta total dendanya.
2. Sepuluh peminjam teraktif tahun ini.
3. Buku yang paling lama tidak pernah dipinjam, termasuk yang belum pernah sama sekali.
4. Rata-rata hari keterlambatan per anggota, hanya untuk anggota yang pernah terlambat lebih dari dua kali.

> [!petunjuk]
> Nomor 3 adalah yang paling menjebak: "belum pernah dipinjam sama sekali" berarti tidak ada baris pasangannya, jadi `JOIN` biasa akan membuangnya. Dan `max()` atas himpunan kosong menghasilkan `NULL`, bukan nol, jadi urutannya perlu diatur.

> [!jawaban]
>
> ```sql
> -- 3. Paling lama tidak dipinjam, yang belum pernah di urutan teratas
> SELECT b.id,
>        b.judul,
>        max(p.dipinjam_pada) AS terakhir_dipinjam,
>        count(p.id)          AS total_dipinjam
> FROM buku b
> LEFT JOIN salinan s    ON s.buku_id = b.id
> LEFT JOIN peminjaman p ON p.salinan_id = s.id
> GROUP BY b.id, b.judul
> ORDER BY max(p.dipinjam_pada) ASC NULLS FIRST
> LIMIT 20;
>
> -- 4. Rata-rata keterlambatan, hanya anggota dengan lebih dari 2 kali telat
> SELECT a.nama,
>        count(*) AS jumlah_telat,
>        round(avg(p.dikembalikan_pada::date - p.jatuh_tempo), 1) AS rata_hari
> FROM peminjaman p
> JOIN anggota a ON a.id = p.anggota_id
> WHERE p.dikembalikan_pada IS NOT NULL
>   AND p.dikembalikan_pada::date > p.jatuh_tempo
> GROUP BY a.id, a.nama
> HAVING count(*) > 2
> ORDER BY rata_hari DESC;
> ```
>
> Lima hal yang jadi inti latihan ini:
>
> 1. **`NULLS FIRST` menyelesaikan nomor 3.** Buku yang belum pernah dipinjam punya `max()` bernilai `NULL`, dan bawaan Postgres menaruh `NULL` di akhir untuk urutan naik. Tanpa `NULLS FIRST`, buku yang paling pantas muncul justru tersembunyi di halaman terakhir.
> 2. **`dikembalikan_pada IS NOT NULL` wajib ada** di nomor 4. Tanpa itu, peminjaman yang masih berjalan ikut terhitung dengan selisih `NULL`.
> 3. **`GROUP BY a.id, a.nama`, bukan hanya `a.nama`.** Dua anggota bisa punya nama sama, dan mengelompokkan berdasarkan nama akan menyatukan statistik dua orang berbeda.
> 4. **Pengurangan dua `date` menghasilkan jumlah hari sebagai bilangan bulat.** Ini lebih aman daripada mengurangi dua `timestamptz` yang menghasilkan interval.
> 5. **Keempat kueri ini masing-masing satu perjalanan jaringan**, dan hasilnya puluhan baris, bukan puluhan ribu. Bandingkan dengan versi aplikasi yang harus mengambil seluruh tabel.


### Latihan 3: Perbaiki kueri yang salah

Lima kueri ini berjalan tanpa error dan memberi hasil yang salah. Jelaskan dan perbaiki.

```sql
-- A
SELECT a.nama, count(p.id) AS jumlah
FROM anggota a
LEFT JOIN peminjaman p ON p.anggota_id = a.id
WHERE p.status = 'berjalan'
GROUP BY a.nama;

-- B
SELECT * FROM buku
WHERE id NOT IN (SELECT buku_id FROM peminjaman WHERE status = 'berjalan');

-- C
SELECT judul, penulis FROM buku ORDER BY tahun DESC LIMIT 10 OFFSET 20;

-- D
SELECT count(*) AS total, avg(denda_rp) AS rata_denda FROM peminjaman;

-- E
SELECT date_trunc('day', dipinjam_pada) AS hari, count(*)
FROM peminjaman
WHERE dipinjam_pada >= now() - interval '7 days'
GROUP BY 1 ORDER BY 1;
```

> [!petunjuk]
> Tidak satu pun dari kelimanya menghasilkan error, jadi cara menemukannya bukan dengan menjalankannya, melainkan dengan bertanya: baris apa yang **seharusnya** muncul dan ternyata hilang? Untuk A, bayangkan anggota yang belum pernah meminjam. Untuk B, bayangkan satu baris yang kolomnya `NULL`. Untuk D, perhatikan bahwa dua angka di satu baris itu dihitung dari himpunan yang berbeda. Dan untuk C dan E, pikirkan pembaca yang ada di Jakarta.

> [!jawaban]
>
> **A: `LEFT JOIN` yang berubah jadi inner join.** Syarat `p.status` di `WHERE` membuang anggota yang tidak punya peminjaman berjalan, padahal maksudnya menampilkan semua anggota beserta angka nol. Pindahkan syaratnya ke `ON`. Masalah kedua: `GROUP BY a.nama` menyatukan anggota bernama sama, jadi pakai `a.id, a.nama`.
>
> **B: `NOT IN` dengan kemungkinan `NULL`.** Kalau satu saja `buku_id` bernilai `NULL`, hasilnya nol baris. Pakai `NOT EXISTS`, dan perhatikan juga bahwa peminjaman menunjuk ke salinan, bukan langsung ke buku, sehingga relasinya perlu dilewati dengan benar.
>
> **C: `tahun` bisa `NULL`, dan pengurutnya tidak unik.** Dua masalah: buku tanpa tahun akan muncul di urutan yang tidak diduga, dan banyak buku dengan tahun sama membuat urutannya tidak stabil antar permintaan sehingga `OFFSET 20` bisa melewatkan atau menggandakan baris. Tambahkan `NULLS LAST` dan pengurut kedua `id DESC`. Lebih baik lagi: ganti ke pagination kursor dari modul 4.
>
> **D: `count(*)` dan `avg` menghitung himpunan yang berbeda.** `count(*)` menghitung semua baris, sedangkan `avg(denda_rp)` hanya atas baris yang dendanya bukan `NULL`. Dua angka di satu baris laporan yang basisnya berbeda akan dibaca sebagai hal yang tidak cocok. Pakai `avg(coalesce(denda_rp, 0))`, atau tambahkan `count(denda_rp)` supaya basisnya terlihat.
>
> **E: batas hari memakai UTC.** Untuk perpustakaan di Jakarta, pengelompokan "per hari" akan memotong pada pukul 07.00 pagi. Tulis `date_trunc('day', dipinjam_pada AT TIME ZONE 'Asia/Jakarta')`. Masalah kedua: `now() - interval '7 days'` menghasilkan rentang dari jam ini tujuh hari lalu, bukan dari awal hari, sehingga hari pertama hanya terisi sebagian dan grafiknya terlihat aneh.
>
> Pola yang menghubungkan kelimanya: **tidak satu pun menghasilkan error.** SQL yang salah memberi jawaban dengan percaya diri, dan satu-satunya pertahanan adalah memeriksa hasilnya terhadap data yang Anda tahu jawabannya.


### Latihan 4: Satu kueri untuk setiap operasi tulis

Tulis SQL untuk enam operasi tulis di Proyek 1, masing-masing sebagai **satu pernyataan**, tanpa membaca dulu lalu menulis.

| # | Operasi |
| --- | --- |
| 1 | Simpan kunci idempotency, atau beri tahu kalau sudah ada |
| 2 | Pinjam satu salinan yang tersedia dari sebuah buku |
| 3 | Kembalikan buku dan hitung dendanya |
| 4 | Perpanjang, hanya kalau belum pernah dan belum terlambat |
| 5 | Tandai semua denda satu anggota sudah dibayar |
| 6 | Sisipkan 300 buku dari satu permintaan impor |

> [!jawaban]
>
> ```sql
> -- 1. Penulisan bersyarat atomik. Tidak ada baris kembali berarti kunci sudah ada.
> INSERT INTO idempotency (kunci, pengguna_id, sidik_jari, status, kedaluwarsa_pada)
> VALUES ($1, $2, $3, 'diproses', now() + interval '24 hours')
> ON CONFLICT (kunci) DO NOTHING
> RETURNING kunci;
>
> -- 2. Pilih satu salinan tersedia dan kunci barisnya dalam satu pernyataan.
> -- SKIP LOCKED membuat permintaan bersamaan mengambil salinan berbeda,
> -- bukan saling menunggu. Modul 9 membahasnya.
> INSERT INTO peminjaman (id, anggota_id, salinan_id, buku_id, status, jatuh_tempo)
> SELECT $1, $2, s.id, s.buku_id, 'berjalan', (now() + interval '14 days')::date
> FROM salinan s
> WHERE s.buku_id = $3
>   AND s.kondisi = 'baik'
>   AND NOT EXISTS (
>     SELECT 1 FROM peminjaman p
>     WHERE p.salinan_id = s.id AND p.status = 'berjalan'
>   )
> ORDER BY s.kode_rak
> LIMIT 1
> RETURNING id, salinan_id, jatuh_tempo;
>
> -- 3. Pengembalian beserta perhitungan denda, dijaga oleh WHERE status
> UPDATE peminjaman
> SET status = 'selesai',
>     dikembalikan_pada = now(),
>     denda_rp = greatest(0, (now()::date - jatuh_tempo)) * 1000,
>     versi = versi + 1
> WHERE id = $1 AND status = 'berjalan'
> RETURNING id, denda_rp, dikembalikan_pada;
>
> -- 4. Semua syarat masuk ke WHERE, jadi tidak ada celah antara periksa dan tulis
> UPDATE peminjaman
> SET jatuh_tempo = jatuh_tempo + 7,
>     diperpanjang = 1,
>     versi = versi + 1
> WHERE id = $1
>   AND status = 'berjalan'
>   AND diperpanjang = 0
>   AND jatuh_tempo >= now()::date
> RETURNING id, jatuh_tempo;
>
> -- 5. Satu pernyataan untuk banyak baris
> UPDATE peminjaman
> SET denda_dibayar = true, versi = versi + 1
> WHERE anggota_id = $1 AND denda_rp > 0 AND denda_dibayar = false
> RETURNING id, denda_rp;
>
> -- 6. Impor massal dalam satu perjalanan
> INSERT INTO buku (id, isbn, judul, penulis, tahun)
> SELECT (x->>'id')::uuid, x->>'isbn', x->>'judul', x->>'penulis', (x->>'tahun')::smallint
> FROM jsonb_array_elements($1::jsonb) AS x
> ON CONFLICT (isbn) DO NOTHING
> RETURNING id, isbn;
> ```
>
> Satu gagasan menghubungkan keenamnya: **semua syarat dipindahkan ke dalam pernyataan `WHERE`, sehingga tidak ada jeda antara memeriksa dan menulis.**
>
> Cara membacanya di aplikasi juga berubah: yang Anda periksa bukan hasil pemeriksaan sebelumnya, melainkan **jumlah baris yang terpengaruh**.
>
> ```ts
> const hasil = await db.query(sqlPerpanjangan, [peminjamanId]);
>
> if (hasil.rowCount === 0) {
>   // Satu dari empat kemungkinan, dan untuk pesan yang tepat
>   // kita perlu satu kueri pembaca terpisah di sini
>   throw new ErrorKonflik('Peminjaman tidak dapat diperpanjang');
> }
> ```
>
> Pertukarannya jelas dan pantas disadari: pola ini menghapus celah konkurensi, dengan harga pesan error yang kurang spesifik. Untuk pengalaman pengguna yang lebih baik, lakukan pemeriksaan pembaca lebih dulu untuk pesan yang ramah, lalu tetap andalkan `WHERE` sebagai penjaga kebenaran. Memakai pemeriksaan saja tanpa penjaga adalah yang berbahaya.

## Batasnya

SQL dasar menyelesaikan sebagian besar pertanyaan harian, dan empat hal berada di luarnya.

**Pertanyaan analitik butuh alat yang belum dibahas.** "Tiga buku terpopuler di setiap kategori" dan "pertumbuhan dibanding bulan lalu" tidak bisa ditulis rapi hanya dengan `GROUP BY`. Itu modul 7.

**Kueri yang benar belum tentu cepat.** Semua kueri di modul ini bisa memakan beberapa detik pada data besar tanpa indeks yang tepat. Itu modul 10.

**Satu pernyataan tidak cukup untuk operasi yang menyentuh beberapa tabel.** Mengurangi saldo di satu tabel dan menambahnya di tabel lain butuh keduanya berhasil atau keduanya gagal. Itu modul 9.

**Anda masih menjalankannya dari `psql`.** Cara memanggilnya dari Node, mengelola sambungan, dan memetakan hasilnya ke tipe TypeScript belum dibahas, dan di situ ada beberapa kesalahan yang mahal.

## Rangkuman

- Kerjakan di tempat datanya berada. Mengangkut delapan puluh ribu baris ke aplikasi untuk mengambil lima adalah pemborosan jaringan, memori, dan event loop.
- `SELECT *` tidak dipakai di kode aplikasi, dan `LIMIT` tanpa `ORDER BY` yang unik tidak menjamin apa pun.
- Syarat tentang pasangan tempatnya di `ON`, syarat tentang baris kiri di `WHERE`. Salah tempat pada `LEFT JOIN` membuangnya jadi inner join.
- `WHERE` menyaring sebelum pengelompokan, `HAVING` menyaring kelompok sesudahnya.
- `count(*)` menghitung baris, `count(kolom)` hanya yang bukan `NULL`, dan semua agregat mengabaikan `NULL`.
- `ON CONFLICT DO NOTHING ... RETURNING` adalah penulisan bersyarat atomik, dan `UPDATE ... WHERE syarat` adalah bentuk paling sederhana dari pencegahan konkurensi.
- `NULL` berarti tidak diketahui: `NOT IN` dengan `NULL` selalu kosong, penggabungan teks jadi `NULL`, dan `= NULL` tidak pernah benar.
- Batas hari dan bulan wajib menyebut zona waktu, atau laporan Anda tidak akan pernah cocok dengan hitungan manual kasir.
- Pindahkan syarat ke dalam `WHERE` dan periksa jumlah baris terpengaruh, daripada memeriksa dulu lalu menulis.

## Masalah terbuka

Pengelola perpustakaan membaca laporan Anda, lalu datang dengan empat permintaan baru yang terdengar sama sederhananya dengan yang tadi:

1. "Tampilkan **tiga buku terpopuler di setiap kategori**." Bukan tiga terpopuler keseluruhan, melainkan tiga teratas di dalam setiap kategori sekaligus.
2. "Berapa **pertumbuhan peminjaman bulan ini dibanding bulan lalu**, untuk dua belas bulan terakhir?"
3. "Grafik saya melompat dari Februari ke April. Bulan Maret memang nol, dan saya tetap ingin batangnya terlihat."
4. "Saya mengetik `bumi manusa` dan tidak ketemu apa-apa, padahal bukunya ada."

Coba tulis nomor 1 dengan alat yang sudah Anda punya. `GROUP BY kategori` memberi satu baris per kategori, bukan tiga. Mengambil semua lalu memotong di aplikasi berarti kembali ke cara pertama yang baru saja kita tinggalkan. Dan nomor 3 meminta baris untuk data yang **tidak ada**, sesuatu yang belum pernah dilakukan satu pun kueri di modul ini.

Keempatnya punya jawaban satu kueri, dan keempatnya butuh alat yang belum diperkenalkan: CTE untuk menyusun kueri bertingkat supaya tetap terbaca, window function untuk menghitung per baris sambil melihat baris lain, `generate_series` untuk membuat rangka waktu, dan pencarian teks penuh yang mengerti kata, bukan hanya potongan huruf.

Itu isi modul berikutnya.
