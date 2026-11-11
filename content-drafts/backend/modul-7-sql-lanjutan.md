---
title: 'Modul 7: SQL Lanjutan untuk Laporan dan Pencarian'
description: Empat permintaan yang terdengar sederhana dan tidak bisa dijawab dengan GROUP BY. CTE, window function, rangka waktu dengan generate_series, dan pencarian teks penuh yang mengerti kata.
date: 2026-12-10
slug: modul-7-sql-lanjutan
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Modul sebelumnya menutup dengan empat permintaan pengelola perpustakaan, dan keempatnya punya sifat yang sama: terdengar sederhana, dan buntu kalau alatnya hanya `SELECT`, `JOIN`, dan `GROUP BY`.

| Permintaan | Kenapa `GROUP BY` saja tidak cukup | Alatnya |
| --- | --- | --- |
| Tiga buku terpopuler **di setiap** kategori | `GROUP BY` memberi satu baris per kategori, bukan tiga | Window function |
| Pertumbuhan dibanding bulan sebelumnya | Satu baris tidak bisa melihat baris lain | `lag()` |
| Bulan kosong tetap muncul di grafik | Baris yang tidak ada tidak bisa dikelompokkan | `generate_series` |
| `bumi manusa` tetap menemukan "Bumi Manusia" | `ILIKE` mencocokkan potongan huruf, bukan kata | Pencarian teks penuh |

Ada jalan keluar yang salah untuk keempatnya, dan jalan itu menggoda karena terasa akrab: ambil semua barisnya ke aplikasi, lalu olah dengan JavaScript. Itu persis cara pertama yang ditinggalkan di modul 6, sekarang dengan baju baru. Tiga buku terpopuler per kategori dari 40.000 peminjaman berarti mengangkut 40.000 baris untuk menghasilkan 30.

Modul ini menutup kotak peralatan SQL Anda. Setelah ini, hampir semua pertanyaan dari pemilik produk punya jawaban satu kueri.

## Yang harus sudah siap

Basis data `perpustakaan` yang sama dari modul 5 dan 6, dengan data secukupnya supaya hasilnya ada isinya.

```bash
docker compose up -d
docker compose exec -it db psql -U postgres -d perpustakaan
```

Satu saran yang membuat modul ini jauh lebih berguna: pastikan ada peminjaman yang tersebar di beberapa bulan dan beberapa kategori. Kueri peringkat dan pertumbuhan tidak mengajarkan apa pun kalau semua datanya jatuh di satu hari yang sama.

## Analogi: rekap yang tidak merusak daftarnya

Di modul 6, petugas arsip diminta membuat **rekap**: delapan puluh ribu lembar masuk, satu lembar ringkasan keluar. Berguna, dan ada harganya: setelah direkap, lembar aslinya tidak terlihat lagi. Anda tahu kategori Fiksi dipinjam 1.240 kali, dan tidak tahu buku mana saja yang menyumbangnya.

Window function adalah permintaan yang berbeda: petugas menuliskan **catatan di tepi setiap lembar**, dan untuk menulisnya dia boleh melirik lembar lain di tumpukan yang sama. "Lembar ini peringkat berapa di kategorinya?" "Berapa selisihnya dengan bulan sebelumnya?" Lembarnya tetap utuh, semuanya, hanya bertambah satu kolom.

Perbedaan itu yang menjelaskan kapan memakai masing-masing:

| Pertanyaannya | Alatnya | Jumlah baris keluar |
| --- | --- | --- |
| "Berapa totalnya per kategori?" | `GROUP BY` | Satu per kategori |
| "Buku ini peringkat berapa di kategorinya?" | `OVER (PARTITION BY ...)` | Tetap satu per buku |
| "Berapa totalnya per bulan?" | `GROUP BY` | Satu per bulan |
| "Berapa selisihnya dengan bulan lalu?" | `lag() OVER (ORDER BY ...)` | Tetap satu per bulan |

Batas analoginya: petugas manusia bisa diminta "lihat saja sekelilingnya", sedangkan window function butuh Anda menyebut dengan tepat **tumpukan mana** (`PARTITION BY`) dan **urutan apa** (`ORDER BY`) yang dipakai saat melirik. Salah menyebut salah satunya menghasilkan angka yang terlihat masuk akal dan salah, tanpa error apa pun.

## CTE: memecah kueri panjang

CTE, kependekan dari *common table expression*, adalah cara menamai hasil antara sebuah kueri supaya bisa dipakai di langkah berikutnya. Bentuknya `WITH nama AS (...)`, dan gunanya satu: kueri yang tadinya harus dibaca dari dalam kurung ke luar jadi bisa dibaca dari atas ke bawah, seperti paragraf.

```sql
-- Sepuluh peminjam teraktif tahun ini beserta persentase keterlambatannya
WITH pinjaman_tahun_ini AS (
  SELECT anggota_id,
         count(*) AS total,
         count(*) FILTER (
           WHERE dikembalikan_pada::date > jatuh_tempo
         ) AS telat
  FROM peminjaman
  WHERE dipinjam_pada >= date_trunc('year', now())
  GROUP BY anggota_id
)
SELECT a.nama,
       t.total,
       t.telat,
       round(100.0 * t.telat / t.total, 1) AS persen_telat
FROM pinjaman_tahun_ini t
JOIN anggota a ON a.id = t.anggota_id
ORDER BY t.total DESC
LIMIT 10;
```

`count(*) FILTER (WHERE ...)` layak dihafal: satu kali pembacaan tabel menghasilkan dua angka yang berbeda. Alternatifnya dua kueri terpisah, atau `sum(CASE WHEN ... THEN 1 ELSE 0 END)` yang lebih panjang.

CTE membuat kueri panjang bisa dibaca dari atas ke bawah, dan dua hal perlu diketahui: di Postgres modern, CTE biasa bisa digabung oleh perencana kueri sehingga performanya setara subquery, dan `MATERIALIZED` memaksanya dihitung sekali kalau memang itu yang Anda mau. Yang perlu dihindari hanya CTE rekursif yang tidak sengaja tak berujung.

## Window function

Inilah kemampuan yang paling sering tidak dikenal dan paling sering dibutuhkan: menghitung sesuatu **per baris** dengan melihat baris lain, tanpa menggabungkan barisnya.

```sql
-- Tiga buku terpopuler di setiap kategori
WITH hitungan AS (
  SELECT k.nama AS kategori,
         b.judul,
         count(p.id) AS jumlah,
         row_number() OVER (
           PARTITION BY k.nama
           ORDER BY count(p.id) DESC, b.judul
         ) AS peringkat
  FROM buku b
  JOIN buku_kategori bk ON bk.buku_id = b.id
  JOIN kategori k       ON k.id = bk.kategori_id
  LEFT JOIN salinan s    ON s.buku_id = b.id
  LEFT JOIN peminjaman p ON p.salinan_id = s.id
  GROUP BY k.nama, b.id, b.judul
)
SELECT kategori, judul, jumlah
FROM hitungan
WHERE peringkat <= 3
ORDER BY kategori, peringkat;
```

Empat fungsi yang menutup sebagian besar kebutuhan:

| Fungsi | Gunanya |
| --- | --- |
| `row_number()` | Peringkat tanpa seri, untuk "ambil N teratas per kelompok" |
| `rank()` dan `dense_rank()` | Peringkat yang mengizinkan nilai seri |
| `lag()` dan `lead()` | Membandingkan dengan baris sebelumnya atau sesudahnya |
| `sum(...) OVER (ORDER BY ...)` | Total berjalan, untuk grafik kumulatif |

```sql
-- Pertumbuhan peminjaman per bulan dibanding bulan sebelumnya
SELECT bulan,
       jumlah,
       lag(jumlah) OVER (ORDER BY bulan) AS bulan_lalu,
       jumlah - lag(jumlah) OVER (ORDER BY bulan) AS selisih
FROM (
  SELECT date_trunc('month', dipinjam_pada) AS bulan, count(*) AS jumlah
  FROM peminjaman
  GROUP BY 1
) t
ORDER BY bulan;
```

Pertanyaan "berapa pertumbuhannya dibanding bulan lalu" adalah permintaan rutin dari pemilik produk, dan dengan `lag()` jawabannya satu baris tambahan. Dikerjakan di aplikasi, itu berarti mengambil semua bulan lalu menelusurinya dengan indeks array.

## Rangka waktu dengan `generate_series`

Permintaan ketiga pengelola, "bulan Maret memang nol dan saya tetap ingin batangnya terlihat", adalah masalah yang tidak bisa diselesaikan `GROUP BY` sama sekali, dan alasannya sepele begitu diucapkan: **tidak ada baris untuk dikelompokkan.** Bulan tanpa peminjaman tidak punya satu pun baris di tabel `peminjaman`, jadi tidak ada yang bisa dihitung jadi nol.

Jawabannya: buat sendiri barisnya lebih dulu, lalu pasangkan data ke rangka itu dengan `LEFT JOIN`.

```sql
-- Rangka dua belas bulan, tanpa menyentuh tabel apa pun
SELECT generate_series(
  date_trunc('month', now() AT TIME ZONE 'Asia/Jakarta') - interval '11 months',
  date_trunc('month', now() AT TIME ZONE 'Asia/Jakarta'),
  interval '1 month'
) AS bulan;
```

Jalankan itu sendirian dulu di `psql`. Hasilnya dua belas baris tanggal, dan tidak satu pun berasal dari data Anda. Itu intinya: rangkanya ada lebih dulu, baru diisi.

```sql
-- Rangka, lalu data ditempelkan ke rangkanya
WITH bulan AS (
  SELECT generate_series(
    date_trunc('month', now() AT TIME ZONE 'Asia/Jakarta') - interval '11 months',
    date_trunc('month', now() AT TIME ZONE 'Asia/Jakarta'),
    interval '1 month'
  ) AS bulan
),
rekap AS (
  SELECT date_trunc('month', dipinjam_pada AT TIME ZONE 'Asia/Jakarta') AS bulan,
         count(*) AS total
  FROM peminjaman
  GROUP BY 1
)
SELECT to_char(b.bulan, 'YYYY-MM') AS bulan,
       coalesce(r.total, 0)        AS total
FROM bulan b
LEFT JOIN rekap r ON r.bulan = b.bulan
ORDER BY b.bulan;
```

Tiga hal yang menentukan apakah pola ini bekerja:

**Rangkanya di kiri, datanya di kanan.** `FROM bulan LEFT JOIN rekap` mempertahankan dua belas baris apa pun isi datanya. Dibalik jadi `FROM rekap LEFT JOIN bulan`, bulan kosong hilang lagi dan Anda kembali ke titik awal.

**`coalesce` mengubah `NULL` jadi nol.** Tanpa itu, bulan kosong memang punya baris, dan isinya `NULL`, yang di grafik frontend sering terbaca sebagai "tidak ada data" dan bukan "nol".

**Zona waktu harus sama di kedua sisi.** Rangka dibuat dengan `AT TIME ZONE 'Asia/Jakarta'`, jadi rekap juga harus. Kalau salah satu memakai UTC, batas bulannya bergeser tujuh jam, pasangannya tidak pernah cocok, dan seluruh kolom total jadi nol tanpa satu pun pesan error. Ini kesalahan yang paling sering terjadi pada pola ini, dan paling lama ditemukan.

Pola yang sama berlaku untuk rangka harian pada grafik tujuh hari terakhir, dan untuk daftar jam pada laporan beban per jam. Yang berubah hanya `interval`-nya.

## Pencarian teks

Permintaan keempat pengelola, `bumi manusa` yang tidak menemukan apa-apa, adalah masalah pencocokan huruf melawan pencocokan kata. `ILIKE '%bumi manusa%'` mencari deretan huruf itu persis di dalam judul, jadi satu huruf yang hilang sudah cukup untuk membuatnya gagal, dan urutan kata yang dibalik juga gagal.

```sql
-- Cukup untuk pencarian sederhana, dan bisa pakai indeks dengan pg_trgm
SELECT id, judul FROM buku WHERE judul ILIKE '%bumi manusia%';

-- Pencarian teks penuh: mengerti kata, bukan hanya potongan huruf
ALTER TABLE buku ADD COLUMN cari tsvector
  GENERATED ALWAYS AS (
    to_tsvector('indonesian', coalesce(judul,'') || ' ' || coalesce(penulis,''))
  ) STORED;

CREATE INDEX buku_cari_idx ON buku USING gin (cari);

SELECT id, judul, ts_rank(cari, q) AS skor
FROM buku, websearch_to_tsquery('indonesian', 'bumi manusia') q
WHERE cari @@ q
ORDER BY skor DESC
LIMIT 20;
```

Kolom tergenerasi di situ memastikan isi indeks pencarian **tidak mungkin** menyimpang dari judul dan penulisnya, karena basis data yang menghitungnya. Ini penerapan langsung dari pelajaran modul 5 tentang nilai turunan.

Patokan memilih: `ILIKE` untuk pencarian sederhana pada tabel kecil, teks penuh untuk pencarian di kolom panjang dengan peringkat relevansi, dan layanan pencarian terpisah hanya kalau Anda butuh fitur yang memang tidak ada di Postgres.

## Latihan

### Latihan 1: Dua permintaan pertama pengelola

Jawab permintaan nomor 1 dan 2 dari pembuka modul, masing-masing sebagai satu kueri.

1. Tiga buku terpopuler di **setiap** kategori, beserta jumlah peminjamannya.
2. Jumlah peminjaman per bulan selama dua belas bulan terakhir, beserta selisihnya dengan bulan sebelumnya.

> [!petunjuk]
> Untuk nomor 1, perhatikan bahwa `WHERE peringkat <= 3` tidak bisa ditulis di kueri yang sama dengan `row_number()`: penyaringan `WHERE` berjalan **sebelum** window function dihitung. Jadi hitung peringkatnya di satu lapisan, lalu saring di lapisan di atasnya. Untuk nomor 2, `lag()` butuh tahu urutannya, dan urutan itu disebut di dalam `OVER (...)`, bukan di `ORDER BY` di akhir kueri.

> [!jawaban]
>
> ```sql
> -- 1. Tiga terpopuler per kategori
> WITH hitungan AS (
>   SELECT k.nama AS kategori,
>          b.judul,
>          count(p.id) AS jumlah,
>          row_number() OVER (
>            PARTITION BY k.nama
>            ORDER BY count(p.id) DESC, b.judul
>          ) AS peringkat
>   FROM buku b
>   JOIN buku_kategori bk ON bk.buku_id = b.id
>   JOIN kategori k       ON k.id = bk.kategori_id
>   LEFT JOIN salinan s    ON s.buku_id = b.id
>   LEFT JOIN peminjaman p ON p.salinan_id = s.id
>   GROUP BY k.nama, b.id, b.judul
> )
> SELECT kategori, judul, jumlah
> FROM hitungan
> WHERE peringkat <= 3
> ORDER BY kategori, peringkat;
>
> -- 2. Pertumbuhan per bulan
> WITH per_bulan AS (
>   SELECT date_trunc('month', dipinjam_pada AT TIME ZONE 'Asia/Jakarta') AS bulan,
>          count(*) AS jumlah
>   FROM peminjaman
>   WHERE dipinjam_pada >= date_trunc('month', now()) - interval '11 months'
>   GROUP BY 1
> )
> SELECT to_char(bulan, 'YYYY-MM') AS bulan,
>        jumlah,
>        lag(jumlah) OVER (ORDER BY bulan)          AS bulan_lalu,
>        jumlah - lag(jumlah) OVER (ORDER BY bulan) AS selisih
> FROM per_bulan
> ORDER BY bulan;
> ```
>
> Empat hal yang jadi inti latihan ini:
>
> **Urutan eksekusi menjelaskan kenapa butuh dua lapisan.** Postgres menjalankan `FROM`, lalu `WHERE`, lalu `GROUP BY`, baru window function, baru `ORDER BY` dan `LIMIT`. Karena `WHERE` berjalan sebelum peringkat dihitung, peringkatnya belum ada untuk disaring. CTE di nomor 1 bukan hiasan gaya, melainkan satu-satunya cara memberi window function kesempatan selesai lebih dulu.
>
> **`row_number()` di atas `count()` adalah hal yang sah.** Window function dihitung setelah pengelompokan, jadi `ORDER BY count(p.id) DESC` di dalam `OVER (...)` memakai hasil agregat yang baru saja dihitung. Ini sering terasa seperti kecurangan saat pertama kali melihatnya, dan memang begitu aturannya.
>
> **Pemecah seri wajib ada.** `ORDER BY count(p.id) DESC, b.judul` menambahkan judul sebagai pengurut kedua. Tanpa itu, dua buku dengan jumlah peminjaman sama bisa bertukar peringkat antar pemanggilan, dan "tiga teratas" jadi daftar yang berubah-ubah tanpa ada data yang berubah. Ini aturan yang sama dengan `ORDER BY` yang unik di modul 6.
>
> **Bulan pertama selalu `NULL`.** Tidak ada bulan sebelumnya untuk dibandingkan, jadi `lag()` mengembalikan `NULL` dan `selisih` ikut `NULL`. Itu benar secara matematis dan jelek di antarmuka. Putuskan dengan sengaja: `coalesce(..., 0)` kalau nol lebih masuk akal bagi pembaca grafik, atau biarkan `NULL` kalau frontend memang menampilkan "tidak ada pembanding". Yang salah hanya membiarkannya tanpa memutuskan.

### Latihan 2: Pecah kueri yang tidak terbaca

Kueri ini benar dan hampir tidak mungkin diperiksa orang lain. Tulis ulang dengan CTE sehingga bisa dibaca dari atas ke bawah, lalu jelaskan tiap lapisannya dengan satu kalimat.

```sql
SELECT a.nama,
       t.total,
       t.telat,
       round(100.0 * t.telat / t.total, 1) AS persen
FROM (
  SELECT anggota_id, count(*) AS total,
         count(*) FILTER (WHERE dikembalikan_pada::date > jatuh_tempo) AS telat
  FROM peminjaman
  WHERE dipinjam_pada >= date_trunc('year', now())
  GROUP BY anggota_id
) t
JOIN anggota a ON a.id = t.anggota_id
WHERE t.total >= 5
ORDER BY round(100.0 * t.telat / t.total, 1) DESC
LIMIT 10;
```

> [!petunjuk]
> Ada satu perhitungan yang ditulis dua kali di kueri itu. Menamainya sekali di sebuah CTE menghilangkan duplikasi sekaligus membuat `ORDER BY` jauh lebih mudah dibaca.

> [!jawaban]
>
> ```sql
> WITH pinjaman_tahun_ini AS (
>   -- Lapisan 1: rekap per anggota untuk tahun berjalan
>   SELECT anggota_id,
>          count(*) AS total,
>          count(*) FILTER (
>            WHERE dikembalikan_pada::date > jatuh_tempo
>          ) AS telat
>   FROM peminjaman
>   WHERE dipinjam_pada >= date_trunc('year', now())
>   GROUP BY anggota_id
> ),
> dengan_persen AS (
>   -- Lapisan 2: hitung persentase sekali, lalu namai
>   SELECT anggota_id,
>          total,
>          telat,
>          round(100.0 * telat / total, 1) AS persen
>   FROM pinjaman_tahun_ini
>   WHERE total >= 5
> )
> -- Lapisan 3: tempelkan nama anggota dan ambil sepuluh teratas
> SELECT a.nama, d.total, d.telat, d.persen
> FROM dengan_persen d
> JOIN anggota a ON a.id = d.anggota_id
> ORDER BY d.persen DESC
> LIMIT 10;
> ```
>
> Tiga hal yang didapat, dan satu yang tidak:
>
> **Perhitungan ditulis sekali.** Versi aslinya menghitung `round(100.0 * telat / total, 1)` dua kali, di `SELECT` dan di `ORDER BY`. Saat suatu hari rumusnya berubah dan hanya satu yang ikut diubah, hasilnya adalah daftar yang urutannya tidak cocok dengan angkanya sendiri. Bug seperti ini sangat sulit dipercaya saat dilaporkan.
>
> **`WHERE total >= 5` punya tempat yang jelas.** Di versi asli, syarat itu berada di kueri luar dan menyaring hasil subquery, yang membuat pembaca harus melompat ke dalam kurung untuk tahu `total` itu apa.
>
> **Setiap lapisan bisa dijalankan sendiri.** Saat angkanya terasa aneh, jalankan `SELECT * FROM pinjaman_tahun_ini LIMIT 20` saja dan periksa lapisan pertama. Pada subquery bersarang, memeriksa satu lapisan berarti menyalin potongan kurung ke jendela baru.
>
> **Yang tidak didapat: kecepatan.** Di Postgres modern, CTE biasa bisa digabungkan oleh perencana kueri, sehingga rencana eksekusinya umumnya setara dengan versi subquery. CTE dipilih untuk keterbacaan, bukan performa, dan kalau Anda butuh satu CTE benar-benar dihitung sekali lalu dipakai berulang, sebutkan `MATERIALIZED` secara eksplisit.
>
> Satu catatan soal `total >= 5` yang pantas diperhatikan: tanpa syarat itu, anggota yang meminjam satu kali dan terlambat satu kali punya persentase 100% dan akan memimpin daftar. Persentase atas basis yang kecil hampir selalu menyesatkan, dan ambang minimum adalah keputusan produk, bukan keputusan teknis.

### Latihan 3: Pencarian yang memaafkan salah ketik

Pengelola mengetik `bumi manusa` dan tidak menemukan apa-apa. Kerjakan tiga hal, lalu bandingkan.

1. Jalankan `SELECT id, judul FROM buku WHERE judul ILIKE '%bumi manusa%';` dan catat hasilnya.
2. Pasang kolom `tsvector` tergenerasi beserta indeks GIN seperti di bagian "Pencarian teks", lalu cari `bumi manusia` dan `manusia bumi`.
3. Pasang ekstensi `pg_trgm`, lalu cari dengan kemiripan.

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

SELECT id, judul, similarity(judul, 'bumi manusa') AS skor
FROM buku
WHERE judul % 'bumi manusa'
ORDER BY skor DESC
LIMIT 10;
```

Putuskan: untuk kotak pencarian di aplikasi perpustakaan, mana yang Anda pasang, dan kenapa?

> [!petunjuk]
> Tanyakan dua hal pada setiap pendekatan. Apakah hasilnya tetap ketemu kalau urutan katanya dibalik? Dan apakah tetap ketemu kalau ada satu huruf yang salah ketik?

> [!jawaban]
>
> | Pendekatan | `bumi manusa` | `manusia bumi` | Peringkat relevansi | Bisa pakai indeks |
> | --- | --- | --- | --- | --- |
> | `ILIKE '%...%'` | Tidak ketemu | Tidak ketemu | Tidak ada | Hanya dengan indeks trigram |
> | `tsvector` + `websearch_to_tsquery` | Tidak ketemu | **Ketemu** | `ts_rank` | GIN, cepat |
> | `pg_trgm` + `similarity` | **Ketemu** | Ketemu, skor rendah | Skor kemiripan | GIN atau GiST |
>
> **Teks penuh menang soal kata, trigram menang soal salah ketik.** Keduanya menjawab pertanyaan yang berbeda, dan itu sebabnya banyak aplikasi memasang keduanya: teks penuh sebagai pencarian utama, trigram sebagai jaring pengaman saat hasilnya kosong.
>
> ```sql
> -- Pola yang dipakai di produksi: coba teks penuh dulu, jatuh ke trigram
> WITH utama AS (
>   SELECT id, judul, ts_rank(cari, q) AS skor
>   FROM buku, websearch_to_tsquery('indonesian', $1) q
>   WHERE cari @@ q
>   ORDER BY skor DESC
>   LIMIT 20
> )
> SELECT * FROM utama
> UNION ALL
> SELECT id, judul, similarity(judul, $1) AS skor
> FROM buku
> WHERE NOT EXISTS (SELECT 1 FROM utama)
>   AND judul % $1
> ORDER BY skor DESC
> LIMIT 20;
> ```
>
> Tiga catatan yang menghemat waktu nanti:
>
> **`ILIKE '%kata%'` tidak bisa memakai indeks B-tree biasa.** Tanda persen di depan membuat Postgres tidak punya titik awal untuk menelusuri indeks, jadi Postgres membaca seluruh tabel. Pada 2.000 buku tidak terasa, pada 2 juta terasa sekali. Modul 10 menjelaskan kenapa.
>
> **Kamus `'indonesian'` menentukan hasilnya.** Kamus itu yang tahu bahwa "meminjam" dan "pinjam" berakar sama, dan bahwa "yang" serta "dan" tidak perlu diindeks. Memakai `'simple'` membuat pencarian jadi pencocokan kata mentah tanpa pengetahuan bahasa apa pun.
>
> **Jangan pindah ke layanan pencarian terpisah terlalu cepat.** Elasticsearch dan kawan-kawannya menyelesaikan masalah nyata, dan membawa satu sistem baru yang harus disinkronkan, dipantau, dan dibayar. Postgres cukup sampai jauh, dan batasnya dibahas di bagian berikutnya.

### Latihan 4: Laporan untuk dasbor

Buat satu kueri yang menghasilkan data untuk dasbor pengelola: per bulan selama 12 bulan terakhir, tampilkan jumlah peminjaman, jumlah yang terlambat, persentase keterlambatan, total denda, dan pertumbuhan jumlah peminjaman dibanding bulan sebelumnya. Bulan tanpa peminjaman harus tetap muncul dengan nilai nol.

> [!pembahasan]
>
> ```sql
> WITH bulan AS (
>   -- Rangka 12 bulan, supaya bulan kosong tetap ada barisnya
>   SELECT generate_series(
>     date_trunc('month', now() AT TIME ZONE 'Asia/Jakarta') - interval '11 months',
>     date_trunc('month', now() AT TIME ZONE 'Asia/Jakarta'),
>     interval '1 month'
>   ) AS bulan
> ),
> rekap AS (
>   SELECT date_trunc('month', p.dipinjam_pada AT TIME ZONE 'Asia/Jakarta') AS bulan,
>          count(*) AS total,
>          count(*) FILTER (
>            WHERE p.dikembalikan_pada IS NOT NULL
>              AND p.dikembalikan_pada::date > p.jatuh_tempo
>          ) AS telat,
>          coalesce(sum(p.denda_rp), 0) AS denda
>   FROM peminjaman p
>   WHERE p.dipinjam_pada >= date_trunc('month', now()) - interval '11 months'
>   GROUP BY 1
> )
> SELECT to_char(b.bulan, 'YYYY-MM')              AS bulan,
>        coalesce(r.total, 0)                     AS total,
>        coalesce(r.telat, 0)                     AS telat,
>        CASE WHEN coalesce(r.total, 0) = 0 THEN 0
>             ELSE round(100.0 * r.telat / r.total, 1)
>        END                                      AS persen_telat,
>        coalesce(r.denda, 0)                     AS total_denda_rp,
>        coalesce(r.total, 0) - lag(coalesce(r.total, 0)) OVER (ORDER BY b.bulan)
>                                                 AS pertumbuhan
> FROM bulan b
> LEFT JOIN rekap r ON r.bulan = b.bulan
> ORDER BY b.bulan;
> ```
>
> Lima teknik di dalamnya yang akan terus Anda pakai:
>
> 1. **`generate_series` sebagai rangka waktu.** Tanpa ini, bulan tanpa data hilang dari hasil, dan grafik di frontend melompat dari Februari ke April tanpa penjelasan. Menambal di aplikasi dengan mengisi bulan yang hilang adalah pekerjaan yang tidak perlu.
> 2. **`count(*) FILTER` menghitung dua angka dari satu kali pembacaan.**
> 3. **Pembagian dilindungi `CASE`.** Tanpa itu, bulan kosong menghasilkan pembagian dengan nol. Di Postgres itu error, bukan `NaN`, dan seluruh laporan gagal.
> 4. **`coalesce` di dalam `lag`** supaya pertumbuhan dari bulan kosong terhitung sebagai nol, bukan `NULL`.
> 5. **Zona waktu ditetapkan satu kali dan konsisten** di rangka maupun di rekap. Kalau berbeda, bulan di kedua sisi tidak akan berpasangan dan hasilnya kosong tanpa petunjuk kenapa.
>
> Satu catatan untuk nanti: kueri ini membaca seluruh peminjaman 12 bulan setiap kali dasbor dibuka. Pada data besar, jawabannya bukan kueri yang lebih pintar, melainkan tabel ringkasan yang dihitung berkala. Itu modul 15, dan keputusan kapan beralih dibahas di modul 10.

## Batasnya

Kotak peralatan SQL Anda sekarang lengkap untuk pekerjaan harian, dan empat hal tetap di luarnya.

**Kueri analitik yang benar bisa sangat lambat.** Kueri dasbor di Latihan 4 membaca seluruh peminjaman dua belas bulan setiap kali halamannya dibuka. Pada data besar, jawabannya bukan kueri yang lebih pintar, melainkan indeks yang tepat (modul 10) atau tabel ringkasan yang dihitung berkala di latar belakang (modul 15).

**Postgres bukan mesin analitik.** Untuk laporan atas ratusan juta baris dengan puluhan dimensi, basis data berorientasi kolom memang lebih cepat, dan itu pekerjaan tim data, bukan layanan Anda. Batas yang wajar: selama laporan Anda masih berjalan di bawah beberapa detik pada data produksi, jangan pindah.

**Pencarian teks di Postgres punya langit-langit.** Sinonim, pembobotan per kolom, dan saran "mungkin maksud Anda" bisa dikerjakan, dan menjadi rumit. Kalau pencarian adalah fitur utama produk Anda, bukan pelengkap, layanan pencarian terpisah mulai masuk akal.

**Semua ini masih dijalankan dari `psql`.** Cara memanggilnya dari Node, mengelola sambungan, dan memetakan hasilnya ke tipe TypeScript belum dibahas, dan di situ ada beberapa kesalahan yang mahal.

## Rangkuman

- CTE dipilih untuk keterbacaan, bukan kecepatan. Nilainya: perhitungan ditulis sekali, dan tiap lapisan bisa dijalankan sendiri saat angkanya terasa aneh.
- Window function menghitung per baris sambil melihat baris lain, dan jumlah barisnya tidak berkurang. Itu bedanya dengan `GROUP BY`.
- `row_number() OVER (PARTITION BY ... ORDER BY ...)` menjawab "N teratas per kelompok", dan `ORDER BY` di dalamnya wajib punya pemecah seri.
- `WHERE` berjalan sebelum window function dihitung, jadi menyaring berdasarkan peringkat selalu butuh lapisan kedua.
- `lag()` dan `lead()` menjawab "dibanding periode sebelumnya" tanpa menggabungkan tabel dengan dirinya sendiri.
- Baris yang tidak ada tidak bisa dikelompokkan. Buat rangkanya dengan `generate_series`, taruh di kiri `LEFT JOIN`, dan tutup dengan `coalesce`.
- Zona waktu harus sama di rangka dan di rekap. Beda tujuh jam berarti seluruh kolom nol tanpa satu pun pesan error.
- `ILIKE` mencocokkan potongan huruf, teks penuh mengerti kata, dan trigram memaafkan salah ketik. Ketiganya menjawab pertanyaan yang berbeda.
- Kolom `tsvector` tergenerasi membuat isi indeks pencarian tidak mungkin menyimpang dari sumbernya, karena basis data yang menghitungnya.

## Masalah terbuka

Kueri Anda sudah benar, dan masih dijalankan dari terminal. Memanggilnya dari Node memunculkan pertanyaan baru yang punya jawaban salah yang populer.

Membuka sambungan baru untuk setiap permintaan terlihat paling sederhana, dan akan menghabiskan batas sambungan Postgres pada lalu lintas sedang. Menyambung string ke dalam SQL terlihat paling mudah, dan itu injeksi SQL. Memakai ORM yang mengurus semuanya terlihat paling nyaman, sampai satu endpoint daftar memicu seratus satu kueri tanpa ada yang menyadarinya sampai produksi melambat.

Dan ada satu pertanyaan yang jawabannya tidak intuitif: berapa sambungan yang sebaiknya dibuka? Menambah sambungan terasa seperti menambah kapasitas, dan di luar titik tertentu justru membuat segalanya lebih lambat.

Itu isi modul berikutnya: akses basis data dari Node, pool sambungan, pilihan antara SQL langsung dan ORM, serta masalah N+1 yang paling sering menjatuhkan performa.
