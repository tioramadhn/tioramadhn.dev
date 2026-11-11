---
title: 'Modul 5: Pemodelan Data Relasional'
description: Membiarkan basis data menjaga kebenaran data jauh lebih murah daripada mengingatnya di setiap jalur kode. Kunci, relasi, tipe kolom, batasan, dan migrasi yang tidak menurunkan layanan.
date: 2026-12-07
slug: modul-5-pemodelan-data-relasional
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Proyek 1 ditutup dengan lima masalah, dan satu kalimat merangkum keempat di antaranya: **tidak ada yang menjaga kebenaran data kecuali kode Anda sendiri mengingatnya di setiap jalur.**

Itu beban yang tumbuh. Dengan tiga endpoint, mengingatnya mudah. Dengan tiga puluh endpoint, satu worker queue, satu skrip impor, dan satu panel admin, selalu ada satu jalur yang lupa. Dan jalur yang lupa itu tidak menghasilkan error, melainkan data yang salah dan menetap.

Basis data relasional menawarkan pertukaran yang berbeda: Anda **menyatakan** aturannya sekali, dan mesin yang menegakkannya pada setiap penulisan dari mana pun asalnya.

| Aturan | Dijaga kode aplikasi | Dijaga basis data |
| --- | --- | --- |
| Email tidak boleh ganda | Perlu diingat di 5 jalur, dan tetap bisa bocor saat bersamaan | `UNIQUE`, mustahil dilanggar |
| Peminjaman harus milik anggota yang ada | Satu kueri tambahan per jalur | `FOREIGN KEY`, otomatis |
| Denda tidak boleh negatif | Pemeriksaan di setiap tempat | `CHECK (denda >= 0)` |
| Dua penulisan harus menyatu | Tidak mungkin dijamin | Transaksi, modul 8 |
| Satu ruangan tidak dipesan dua kali pada jam sama | Rumit dan rapuh | `EXCLUDE`, satu baris |

Baris terakhir akan dibuktikan di latihan, dan hasilnya sering mengejutkan: aturan yang butuh seratus baris kode aplikasi beserta penguncian bisa diselesaikan satu baris deklarasi.

## Analogi: buku induk desa

Bayangkan kantor desa yang mencatat data penduduk.

**Cara yang buruk.** Setiap kejadian dicatat sebagai satu lembar lengkap: nama, alamat lengkap, nama kelurahan, nama kecamatan, nama kepala desa, lalu isi kejadiannya. Ketika kepala desa berganti, ribuan lembar jadi salah. Ketika nama jalan diubah pemerintah kota, tidak ada yang tahu berapa lembar yang perlu dikoreksi. Dan dua petugas menulis nama kecamatan yang sama dengan ejaan berbeda, sehingga laporan per kecamatan menghasilkan dua baris untuk satu kecamatan.

**Cara yang benar.** Ada buku induk terpisah: buku penduduk, buku wilayah, buku pejabat. Setiap lembar kejadian hanya menyebut **nomor** dari buku-buku itu. Nama kecamatan ditulis satu kali, di satu tempat. Mengganti kepala desa berarti mengubah satu baris.

Itu inti normalisasi: **satu fakta disimpan di satu tempat saja.**

| Dunia kantor desa | Dunia basis data |
| --- | --- |
| Buku induk per jenis data | Tabel |
| Satu lembar catatan | Baris |
| Nomor induk penduduk | Primary key |
| Menyebut nomor induk, bukan menulis ulang nama | Foreign key |
| Aturan "NIK tidak boleh ganda" | `UNIQUE` |
| Aturan "umur tidak boleh negatif" | `CHECK` |
| Petugas yang menolak formulir tidak lengkap | `NOT NULL` |
| Menyalin ringkasan ke papan pengumuman | Denormalisasi yang disengaja |

Batas analoginya: kantor desa punya petugas yang bisa memakai pertimbangan, sedangkan basis data hanya menegakkan apa yang Anda tuliskan. Aturan yang tidak Anda nyatakan tidak akan dijaga siapa pun. Karena itu pekerjaan modul ini adalah menuliskan sebanyak mungkin aturan yang memang bisa dinyatakan.

## Menyiapkan Postgres

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: rahasia
      POSTGRES_DB: perpustakaan
    ports: ['5432:5432']
    volumes: ['pgdata:/var/lib/postgresql/data']
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s

volumes:
  pgdata:
```

```bash
docker compose up -d
psql postgresql://postgres:rahasia@localhost:5432/perpustakaan
```

Kenapa Postgres, dan bukan yang lain: ia menegakkan batasan dengan serius, punya tipe data yang kaya termasuk JSON yang bisa diindeks, transaksinya benar, dan tersedia di semua penyedia cloud. Untuk aplikasi baru, pertanyaan "SQL atau NoSQL" hampir selalu berakhir di Postgres, dan pilihan lain perlu alasan khusus yang bisa dijelaskan.

## Kunci: apa yang mengidentifikasi satu baris

```sql
-- Kunci buatan (surrogate), hampir selalu pilihan yang benar
CREATE TABLE anggota (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_kartu text NOT NULL UNIQUE,   -- kunci alami, tetap dijaga unik
  email       text NOT NULL UNIQUE,
  nama        text NOT NULL
);
```

Dua jenis kunci, dan kapan masing-masing:

| Jenis | Contoh | Catatan |
| --- | --- | --- |
| **Alami** | Email, NIK, nomor kartu, ISBN | Bermakna, dan bisa berubah. Email orang berganti, NIK bisa salah input |
| **Buatan** | UUID, ULID, bigint berurutan | Tidak bermakna, dan karena itu tidak pernah perlu berubah |

Aturan praktis: **pakai kunci buatan sebagai primary key, dan tegakkan kunci alami dengan `UNIQUE`.** Alasannya: primary key yang berubah berarti semua foreign key yang menunjuk ke sana harus ikut berubah, dan itu operasi yang mahal dan berisiko.

Soal bentuk kunci buatan, tiga pilihan dengan konsekuensi berbeda:

| Pilihan | Kelebihan | Kekurangan |
| --- | --- | --- |
| `bigint` dengan `GENERATED ALWAYS AS IDENTITY` | Kecil, cepat, indeks rapi | Bocor jumlah data, mudah ditebak, tidak bisa dibuat di klien |
| `uuid` versi 4 | Acak, bisa dibuat di aplikasi | Tidak berurutan, membuat indeks terpecah dan penulisan lebih mahal |
| **`uuid` versi 7 atau ULID** | Acak sekaligus berurutan menurut waktu | Perlu fungsi pembuat, di Postgres 17 belum bawaan |

Untuk seri ini: UUIDv7 yang dibuat di aplikasi. Modul 9 menjelaskan kenapa keberurutan berpengaruh besar pada performa penulisan.

## Relasi

```sql
-- Satu ke banyak: satu anggota punya banyak peminjaman
CREATE TABLE peminjaman (
  id         uuid PRIMARY KEY,
  anggota_id uuid NOT NULL REFERENCES anggota(id) ON DELETE RESTRICT,
  salinan_id uuid NOT NULL REFERENCES salinan(id) ON DELETE RESTRICT
);

-- Banyak ke banyak: buku punya banyak kategori, kategori punya banyak buku
CREATE TABLE buku_kategori (
  buku_id     uuid NOT NULL REFERENCES buku(id) ON DELETE CASCADE,
  kategori_id uuid NOT NULL REFERENCES kategori(id) ON DELETE RESTRICT,
  PRIMARY KEY (buku_id, kategori_id)
);
```

Pilihan `ON DELETE` adalah keputusan domain, bukan detail teknis:

| Pilihan | Artinya | Dipakai untuk |
| --- | --- | --- |
| `RESTRICT` atau `NO ACTION` | Tolak penghapusan selama masih dirujuk | Data yang punya riwayat: anggota, buku, pesanan |
| `CASCADE` | Hapus yang merujuk juga | Data yang tidak bermakna tanpa induknya: baris keranjang, tabel penghubung |
| `SET NULL` | Kosongkan rujukannya | Rujukan opsional: `ditangani_oleh` yang stafnya sudah keluar |

Aturan praktis: **`RESTRICT` sebagai bawaan, `CASCADE` hanya kalau Anda yakin.** `CASCADE` pada tabel yang salah bisa menghapus setengah basis data karena satu perintah yang terlihat tidak berbahaya. Dan aturan nomor 10 di Proyek 1 ("buku yang sedang dipinjam tidak bisa dihapus") dengan `RESTRICT` jadi dijamin basis data, bukan diingat kode.

## Tipe kolom yang benar

Pilihan tipe adalah tempat kesalahan paling mahal dibuat, karena memperbaikinya setelah ada sepuluh juta baris butuh migrasi.

| Kebutuhan | Pakai | Jangan |
| --- | --- | --- |
| Teks apa pun | `text` | `varchar(255)`, karena angkanya selalu dugaan dan tidak ada manfaat performa |
| Uang | `bigint` satuan terkecil, atau `numeric(14,2)` | `float` atau `real`, selamanya |
| Momen kejadian | `timestamptz` | `timestamp` tanpa zona waktu |
| Tanggal kalender | `date` | `timestamptz`, karena jatuh tempo bisa bergeser sehari |
| Pilihan tetap | Tabel acuan, atau `text` dengan `CHECK` | Tipe `enum` Postgres, karena mengubahnya merepotkan |
| Data tidak berstruktur | `jsonb` | `json`, karena tidak bisa diindeks dengan baik |
| Benar atau salah | `boolean` | `smallint` berisi 0 dan 1 |
| Berkas | `text` berisi kunci objek | `bytea` berisi isi berkasnya |

Empat penjelasan yang paling sering ditanyakan:

**`text` versus `varchar(n)`.** Di Postgres keduanya sama cepat, dan `varchar(n)` hanya menambahkan batasan panjang. Masalahnya, angka `n` biasanya dikarang, dan mengubahnya nanti butuh migrasi. Pakai `text`, lalu batasi panjangnya di skema validasi (modul 3) dan dengan `CHECK` kalau batasnya memang aturan bisnis.

**`float` untuk uang adalah bug yang menunggu waktu.** `0.1 + 0.2` tidak sama dengan `0.3` pada bilangan pecahan biner, dan selisih sepersepuluh sen yang dikalikan sejuta transaksi muncul sebagai ketidakcocokan di laporan keuangan. Untuk rupiah, `bigint` berisi jumlah rupiah paling sederhana.

**`timestamptz` bukan berarti menyimpan zona waktu.** Ia menyimpan momen dalam UTC dan mengubahnya saat dibaca sesuai zona waktu sesi. Yang penting: ia menyimpan **momen yang tidak ambigu**, sedangkan `timestamp` biasa menyimpan angka tanpa keterangan, dan nilainya jadi tergantung siapa yang membacanya.

**Tipe `enum` Postgres terlihat tepat dan merepotkan dalam praktik.** Menambah nilai bisa, tapi menghapus atau mengganti nama butuh langkah yang tidak nyaman di dalam transaksi migrasi. Dua alternatif yang lebih lentur: `text` dengan `CHECK (status IN (...))` untuk daftar yang jarang berubah, atau tabel acuan dengan foreign key kalau daftarnya perlu punya atribut sendiri seperti label dan urutan tampil.

## Batasan: aturan yang dinyatakan sekali

```sql
CREATE TABLE peminjaman (
  id             uuid PRIMARY KEY,
  anggota_id     uuid NOT NULL REFERENCES anggota(id) ON DELETE RESTRICT,
  salinan_id     uuid NOT NULL REFERENCES salinan(id) ON DELETE RESTRICT,
  status         text NOT NULL
                   CHECK (status IN ('berjalan', 'selesai', 'hilang')),
  dipinjam_pada  timestamptz NOT NULL DEFAULT now(),
  jatuh_tempo    date NOT NULL,
  dikembalikan_pada timestamptz,
  diperpanjang   smallint NOT NULL DEFAULT 0 CHECK (diperpanjang BETWEEN 0 AND 1),
  denda_rp       bigint NOT NULL DEFAULT 0 CHECK (denda_rp >= 0),
  denda_dibayar  boolean NOT NULL DEFAULT false,
  versi          integer NOT NULL DEFAULT 1,

  -- Aturan antar kolom: yang selesai wajib punya tanggal kembali, dan sebaliknya
  CONSTRAINT selesai_punya_tanggal CHECK (
    (status = 'selesai') = (dikembalikan_pada IS NOT NULL)
  ),

  -- Jatuh tempo tidak mungkin sebelum tanggal pinjam
  CONSTRAINT tempo_setelah_pinjam CHECK (jatuh_tempo >= dipinjam_pada::date)
);

-- Satu salinan hanya boleh punya satu peminjaman berjalan.
-- Indeks unik sebagian: hanya berlaku untuk baris berstatus 'berjalan'.
CREATE UNIQUE INDEX satu_pinjaman_aktif_per_salinan
  ON peminjaman (salinan_id)
  WHERE status = 'berjalan';

-- Satu anggota tidak boleh meminjam dua salinan dari buku yang sama.
-- Butuh kolom buku_id yang disalin ke sini, lihat catatan denormalisasi di bawah.
CREATE UNIQUE INDEX satu_buku_per_anggota
  ON peminjaman (anggota_id, buku_id)
  WHERE status = 'berjalan';
```

Perhatikan dua indeks unik sebagian di bawah. Keduanya menegakkan aturan nomor 6 dan 7 dari Proyek 1, dan menegakkannya **secara mutlak**: tidak ada urutan permintaan, tidak ada kondisi bersamaan, dan tidak ada jalur kode yang bisa melanggarnya. Dua masalah konkurensi yang di Proyek 1 Anda catat sebagai "akan dibahas di modul 8" sebagian sudah selesai di sini, hanya dengan deklarasi.

Satu batasan yang jarang dikenal dan sangat berguna:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE pemesanan_ruangan (
  id         uuid PRIMARY KEY,
  ruangan_id uuid NOT NULL REFERENCES ruangan(id),
  rentang    tstzrange NOT NULL,

  -- Tidak boleh ada dua pemesanan yang bertabrakan waktunya
  -- untuk ruangan yang sama. Satu baris, dijamin mutlak.
  CONSTRAINT tanpa_tumpang_tindih EXCLUDE USING gist (
    ruangan_id WITH =,
    rentang WITH &&
  )
);
```

Aturan "jangan ada jadwal bertabrakan" biasanya dikerjakan dengan membaca jadwal yang ada, memeriksa tumpang tindih di aplikasi, lalu menulis. Kode itu panjang, dan tetap bisa dilanggar oleh dua permintaan bersamaan. `EXCLUDE` menyelesaikannya dengan jaminan penuh.

## Normalisasi, dan kapan sengaja dilanggar

Tiga langkah normalisasi yang benar-benar dipakai sehari-hari, tanpa istilah akademis:

1. **Satu sel satu nilai.** Kolom `tag` berisi `"fiksi,sejarah,terjemahan"` tidak bisa dicari, diindeks, maupun dijaga ejaannya. Pecah jadi tabel penghubung.
2. **Satu fakta satu tempat.** Nama kategori ditulis di tabel kategori, dan tabel buku hanya menyebut id-nya.
3. **Kolom bergantung pada kunci, bukan pada kolom lain.** `total_harga` yang bisa dihitung dari `harga * jumlah` tidak perlu disimpan, kecuali Anda sengaja mengabadikannya.

Pengecualian untuk nomor tiga, dan ini penting: **data yang menjadi bagian dari catatan historis harus disalin, bukan dirujuk.**

```sql
CREATE TABLE pesanan_item (
  id         uuid PRIMARY KEY,
  pesanan_id uuid NOT NULL REFERENCES pesanan(id) ON DELETE CASCADE,
  produk_id  uuid NOT NULL REFERENCES produk(id) ON DELETE RESTRICT,

  -- Disalin saat pesanan dibuat, dan sengaja tidak mengikuti perubahan produk
  nama_produk  text   NOT NULL,
  harga_satuan bigint NOT NULL CHECK (harga_satuan >= 0),
  jumlah       integer NOT NULL CHECK (jumlah > 0)
);
```

Kalau harga diambil dari tabel produk saat laporan dibuat, kenaikan harga bulan depan akan mengubah nilai transaksi bulan lalu. Itu bukan soal performa, melainkan soal kebenaran: **struk yang sudah dicetak tidak boleh berubah isinya.** Keputusan seperti ini yang membedakan skema yang dirancang dari skema yang kebetulan jadi.

Denormalisasi yang sah lainnya, beserta syaratnya:

| Denormalisasi | Alasan sah | Syaratnya |
| --- | --- | --- |
| Menyalin harga ke item pesanan | Kebenaran historis | Tidak pernah diperbarui |
| `buku_id` di tabel peminjaman meski bisa dicapai lewat salinan | Memungkinkan indeks unik sebagian | Diisi saat insert, tidak pernah berubah |
| Kolom hitungan seperti `jumlah_komentar` | Menghindari agregasi mahal | Diperbarui dalam transaksi yang sama, lihat modul 8 |
| Kolom hasil pencarian teks | Performa pencarian | Kolom tergenerasi, dihitung basis data |

Yang tidak sah: menyalin data **karena merasa join itu mahal**. Join pada kolom terindeks di Postgres sangat cepat, dan modul 9 akan menunjukkan angkanya. Denormalisasi tanpa pengukuran adalah menukar kebenaran dengan performa yang tidak terbukti.

## Kolom audit dan penghapusan

Empat kolom yang pantas ada di hampir semua tabel:

```sql
dibuat_pada     timestamptz NOT NULL DEFAULT now(),
diperbarui_pada timestamptz NOT NULL DEFAULT now(),
dibuat_oleh     uuid REFERENCES pengguna(id),
versi           integer NOT NULL DEFAULT 1   -- untuk penguncian optimistis, modul 8
```

Soal penghapusan, dua pendekatan dengan konsekuensi berbeda:

| Pendekatan | Cara | Masalahnya |
| --- | --- | --- |
| Hapus sungguhan | `DELETE` | Data hilang, dan `RESTRICT` sering menghalanginya |
| **Penghapusan lunak** | `dihapus_pada timestamptz` | **Setiap kueri** harus ingat menyaringnya |

Kalimat tebal itu biaya yang sering tidak diperhitungkan: dengan penghapusan lunak, satu kueri yang lupa menambahkan `WHERE dihapus_pada IS NULL` akan menampilkan data yang seharusnya hilang. Dua cara menguranginya: buat view yang sudah tersaring dan jadikan itu satu-satunya yang dipakai aplikasi, atau pakai Row Level Security.

Patokan memilih: pakai penghapusan lunak kalau data itu punya nilai riwayat atau penghapusannya perlu bisa dibatalkan. Untuk data yang benar-benar sampah, hapus sungguhan lebih jujur.

## Migrasi

Skema basis data berubah seiring produk, dan perubahannya harus bisa dijalankan berulang kali dengan hasil yang sama, di laptop dan di produksi.

```bash
pnpm add drizzle-orm pg
pnpm add -D drizzle-kit @types/pg
```

Apa pun alat yang Anda pilih, lima aturan berikut berlaku sama:

**Satu, migrasi yang sudah dijalankan di produksi tidak pernah diedit.** Perbaikan dilakukan dengan migrasi baru. Mengedit yang lama berarti riwayat di berbagai lingkungan berbeda isinya.

**Dua, setiap migrasi punya pasangan pembalik, atau alasan tertulis kenapa tidak bisa dibalik.** Mengetahui cara mundur adalah syarat untuk bisa merilis dengan tenang.

**Tiga, migrasi dijalankan sebagai langkah terpisah dari deploy aplikasi.** Urutannya: jalankan migrasi, pastikan berhasil, baru ganti versi aplikasi.

**Empat, dan ini yang paling sering menurunkan layanan: setiap perubahan harus kompatibel dengan versi aplikasi yang sedang berjalan.** Saat migrasi berjalan, aplikasi versi lama masih melayani permintaan.

Pola yang menyelesaikannya disebut expand lalu contract, dan contoh paling umum adalah mengganti nama kolom:

| Tahap | Perubahan basis data | Perubahan aplikasi |
| --- | --- | --- |
| 1. Expand | Tambah kolom `nomor_telepon`, boleh `NULL` | Tulis ke kolom lama **dan** baru, baca dari lama |
| 2. Isi | Salin data lama ke kolom baru, bertahap | Tidak ada |
| 3. Pindah baca | Tidak ada | Baca dari kolom baru, tetap tulis ke keduanya |
| 4. Contract | Hapus kolom lama | Berhenti menulis ke kolom lama |

Empat rilis untuk satu penggantian nama. Terasa berlebihan, sampai Anda pernah menjalankan `ALTER TABLE ... RENAME COLUMN` di tengah jam sibuk dan seluruh layanan mengembalikan 500 selama tiga menit karena aplikasi lama masih mencari kolom yang sudah tidak ada.

Lima operasi yang berbahaya di tabel besar, dan versi amannya:

| Berbahaya | Kenapa | Versi aman |
| --- | --- | --- |
| `ADD COLUMN ... NOT NULL` tanpa bawaan | Menulis ulang seluruh tabel di versi Postgres lama | Tambah nullable, isi bertahap, baru tambahkan `NOT NULL` |
| `CREATE INDEX` biasa | Memblokir penulisan selama pembuatan | `CREATE INDEX CONCURRENTLY` |
| `ALTER COLUMN TYPE` | Menulis ulang tabel dan menahan kunci | Kolom baru, isi bertahap, tukar |
| Menambah `FOREIGN KEY` langsung | Memeriksa seluruh baris sambil menahan kunci | Tambah `NOT VALID`, lalu `VALIDATE CONSTRAINT` |
| `UPDATE` tanpa `WHERE` pada tabel besar | Satu transaksi raksasa, tabel membengkak | Potong per batch, misalnya 5.000 baris |

## Skema untuk perpustakaan

Satu keputusan pemodelan di awal menyelesaikan masalah yang di Proyek 1 Anda tangani dengan penghitung manual: **pisahkan buku dari salinan fisiknya.**

```sql
-- Judul sebagai karya, satu baris per judul
CREATE TABLE buku (
  id         uuid PRIMARY KEY,
  isbn       text UNIQUE,
  judul      text NOT NULL,
  penulis    text NOT NULL,
  tahun      smallint CHECK (tahun BETWEEN 1400 AND 2100),
  dibuat_pada timestamptz NOT NULL DEFAULT now()
);

-- Setiap salinan fisik punya identitas sendiri
CREATE TABLE salinan (
  id          uuid PRIMARY KEY,
  buku_id     uuid NOT NULL REFERENCES buku(id) ON DELETE RESTRICT,
  kode_rak    text NOT NULL UNIQUE,
  kondisi     text NOT NULL DEFAULT 'baik'
                CHECK (kondisi IN ('baik', 'rusak', 'hilang')),
  dibuat_pada timestamptz NOT NULL DEFAULT now()
);
```

Dengan bentuk ini, "berapa salinan tersedia" bukan lagi angka yang disimpan dan harus dijaga, melainkan **pertanyaan yang dijawab basis data**:

```sql
SELECT count(*)
FROM salinan s
WHERE s.buku_id = $1
  AND s.kondisi = 'baik'
  AND NOT EXISTS (
    SELECT 1 FROM peminjaman p
    WHERE p.salinan_id = s.id AND p.status = 'berjalan'
  );
```

Masalah kelima di Proyek 1 ("salinan berkurang tanpa catatan peminjamannya") hilang sepenuhnya, karena tidak ada lagi penghitung yang bisa menyimpang. Itulah keuntungan terbesar dari pemodelan yang benar: sebagian bug menjadi tidak mungkin ditulis.

## Latihan

### Latihan 1: Rancang skema penuh perpustakaan

Tulis DDL lengkap untuk domain Proyek 1, dengan syarat sepuluh aturan bisnisnya ditegakkan basis data sejauh mungkin. Untuk setiap aturan, catat apakah bisa dijamin skema, atau harus tetap di lapisan aplikasi.

> [!petunjuk]
> Mulai dari pertanyaan "apa yang mustahil terjadi di dunia nyata", lalu cari batasan yang menyatakannya. Aturan yang melibatkan **jumlah** baris, misalnya maksimal 3 pinjaman, biasanya tidak bisa dinyatakan sebagai batasan sederhana. Aturan tentang **keunikan** dan **nilai** hampir selalu bisa.

> [!jawaban]
>
> | # | Aturan | Dijamin skema? | Caranya |
> | --- | --- | --- | --- |
> | 1 | Maksimal 3 pinjaman per anggota | Tidak | Perlu hitungan baris. Aplikasi + transaksi, modul 8 |
> | 2 | Masa pinjam 14 hari | Sebagian | `CHECK (jatuh_tempo >= dipinjam_pada::date)`, nilai tepatnya di aplikasi |
> | 3 | Perpanjangan satu kali | **Ya** | `CHECK (diperpanjang BETWEEN 0 AND 1)` |
> | 4 | Tidak boleh pinjam kalau ada terlambat | Tidak | Perlu kueri, aplikasi |
> | 5 | Denda di atas 50 ribu memblokir | Tidak | Perlu agregasi, aplikasi |
> | 6 | Hanya bisa pinjam salinan tersedia | **Ya** | Indeks unik sebagian pada `(salinan_id) WHERE status='berjalan'` |
> | 7 | Tidak boleh dua salinan buku sama | **Ya** | Indeks unik sebagian pada `(anggota_id, buku_id) WHERE status='berjalan'` |
> | 8 | Denda 1.000 per hari | Tidak | Perhitungan, aplikasi. Tapi `CHECK (denda_rp >= 0)` tetap dipasang |
> | 9 | Nonaktif tidak boleh pinjam | Tidak | Perlu membaca tabel lain, aplikasi |
> | 10 | Buku dipinjam tidak bisa dihapus | **Ya** | `ON DELETE RESTRICT` berantai |
>
> Empat dari sepuluh dijamin mutlak, dan empat itu justru yang paling rawan dilanggar oleh permintaan bersamaan. Itu pembagian yang sehat: **serahkan ke basis data semua yang bisa dinyatakan, karena di situlah jaminannya paling kuat.**
>
> Dua catatan tambahan untuk skemanya:
>
> ```sql
> -- buku_id disalin ke peminjaman supaya aturan 7 bisa jadi indeks unik.
> -- Konsistensinya dijaga batasan di bawah, bukan oleh ingatan.
> ALTER TABLE peminjaman
>   ADD CONSTRAINT buku_cocok_dengan_salinan CHECK (true) NOT VALID;
>
> -- Cara yang lebih kuat: foreign key komposit ke salinan(id, buku_id)
> ALTER TABLE salinan ADD CONSTRAINT salinan_id_buku UNIQUE (id, buku_id);
>
> ALTER TABLE peminjaman
>   ADD CONSTRAINT peminjaman_salinan_buku
>   FOREIGN KEY (salinan_id, buku_id) REFERENCES salinan(id, buku_id);
> ```
>
> Teknik terakhir itu pantas dihafal: dengan foreign key komposit, kolom `buku_id` yang didenormalisasi **tidak mungkin** menyimpang dari salinannya. Denormalisasi yang dijaga basis data adalah denormalisasi yang aman.

### Latihan 2: Perbaiki skema yang buruk

Skema ini dari aplikasi nyata. Temukan sepuluh masalahnya, lalu tulis ulang.

```sql
CREATE TABLE orders (
  id          SERIAL PRIMARY KEY,
  user_email  VARCHAR(255),
  user_name   VARCHAR(255),
  user_addr   VARCHAR(255),
  items       TEXT,              -- '2x kopi susu, 1x matcha'
  total       FLOAT,
  status      VARCHAR(50),       -- 'pending', 'Pending', 'PENDING', 'menunggu'
  created     VARCHAR(50),       -- '2026-12-05 10:12:44'
  paid        SMALLINT,          -- 0 atau 1
  notes       TEXT,
  deleted     SMALLINT DEFAULT 0
);
```

> [!jawaban]
>
> | # | Masalah | Akibat nyata |
> | --- | --- | --- |
> | 1 | `items` sebagai teks bebas | Tidak bisa dicari, dihitung, maupun dilaporkan. Pertanyaan "berapa kopi susu terjual" jadi mustahil |
> | 2 | `total FLOAT` | Selisih pembulatan di laporan keuangan |
> | 3 | Data pengguna disalin tanpa relasi | Alamat berubah di satu pesanan tidak sinkron, dan tidak ada tabel pengguna |
> | 4 | `status` teks bebas tanpa batasan | Empat ejaan untuk satu status, laporan jadi pecah |
> | 5 | `created` sebagai teks | Tidak bisa diurutkan dengan benar, tidak ada zona waktu, tidak bisa dipakai dalam perhitungan |
> | 6 | `paid` sebagai `SMALLINT` | Harusnya `boolean`. Apa arti nilai 2? |
> | 7 | `SERIAL` id berurutan | Bocor jumlah pesanan, dan id orang lain mudah ditebak |
> | 8 | Semua kolom nullable | Pesanan tanpa total bisa tersimpan |
> | 9 | `deleted` sebagai angka tanpa waktu | Tidak tahu kapan dan oleh siapa |
> | 10 | Tidak ada satu pun foreign key, unique, atau check | Basis data tidak menjaga apa pun |
>
> ```sql
> CREATE TABLE pengguna (
>   id          uuid PRIMARY KEY,
>   email       text NOT NULL UNIQUE,
>   nama        text NOT NULL,
>   dibuat_pada timestamptz NOT NULL DEFAULT now()
> );
>
> CREATE TABLE alamat (
>   id          uuid PRIMARY KEY,
>   pengguna_id uuid NOT NULL REFERENCES pengguna(id) ON DELETE CASCADE,
>   baris       text NOT NULL,
>   kota        text NOT NULL,
>   kode_pos    text NOT NULL CHECK (kode_pos ~ '^[0-9]{5}$')
> );
>
> CREATE TABLE pesanan (
>   id           uuid PRIMARY KEY,
>   pengguna_id  uuid NOT NULL REFERENCES pengguna(id) ON DELETE RESTRICT,
>
>   -- Alamat pengiriman disalin, karena struk tidak boleh berubah
>   alamat_kirim text NOT NULL,
>
>   status       text NOT NULL DEFAULT 'menunggu'
>                  CHECK (status IN ('menunggu','dibayar','dikirim','selesai','batal')),
>   total_rp     bigint NOT NULL CHECK (total_rp >= 0),
>   dibayar_pada timestamptz,
>   catatan      text CHECK (catatan IS NULL OR length(catatan) <= 500),
>   dibuat_pada  timestamptz NOT NULL DEFAULT now(),
>   dihapus_pada timestamptz,
>
>   CONSTRAINT dibayar_konsisten CHECK (
>     (status IN ('dibayar','dikirim','selesai')) = (dibayar_pada IS NOT NULL)
>   )
> );
>
> CREATE TABLE pesanan_item (
>   id           uuid PRIMARY KEY,
>   pesanan_id   uuid NOT NULL REFERENCES pesanan(id) ON DELETE CASCADE,
>   produk_id    uuid NOT NULL REFERENCES produk(id) ON DELETE RESTRICT,
>   nama_produk  text NOT NULL,                    -- disalin, historis
>   harga_satuan bigint NOT NULL CHECK (harga_satuan >= 0),
>   jumlah       integer NOT NULL CHECK (jumlah > 0),
>
>   UNIQUE (pesanan_id, produk_id)
> );
> ```
>
> Dua hal yang pantas diperhatikan dari perbaikan ini: `alamat_kirim` disalin sebagai teks ke pesanan meski ada tabel alamat, karena alamat pengiriman pada struk tidak boleh berubah saat pengguna mengedit alamatnya. Dan `UNIQUE (pesanan_id, produk_id)` mencegah dua baris item untuk produk yang sama dalam satu pesanan, yang biasanya menandakan bug di keranjang.

### Latihan 3: Jadwal yang tidak boleh bertabrakan

Rancang skema untuk peminjaman ruangan rapat: setiap pemesanan punya ruangan, waktu mulai, waktu selesai, pemesan, dan status. Syaratnya dua: tidak boleh ada dua pemesanan aktif yang bertabrakan waktunya di ruangan yang sama, dan pemesanan yang dibatalkan tidak dihitung.

> [!pembahasan]
>
> ```sql
> CREATE EXTENSION IF NOT EXISTS btree_gist;
>
> CREATE TABLE pemesanan_ruangan (
>   id          uuid PRIMARY KEY,
>   ruangan_id  uuid NOT NULL REFERENCES ruangan(id) ON DELETE RESTRICT,
>   pemesan_id  uuid NOT NULL REFERENCES pengguna(id) ON DELETE RESTRICT,
>   status      text NOT NULL DEFAULT 'aktif'
>                 CHECK (status IN ('aktif','batal')),
>
>   -- Rentang waktu sebagai satu kolom, batas bawah inklusif, atas eksklusif.
>   -- Dengan begitu rapat 09.00-10.00 dan 10.00-11.00 tidak dianggap bertabrakan.
>   rentang     tstzrange NOT NULL,
>
>   dibuat_pada timestamptz NOT NULL DEFAULT now(),
>
>   CONSTRAINT rentang_wajar CHECK (
>     lower(rentang) IS NOT NULL
>     AND upper(rentang) IS NOT NULL
>     AND upper(rentang) > lower(rentang)
>     AND upper(rentang) - lower(rentang) <= interval '8 hours'
>   ),
>
>   -- Hanya baris berstatus aktif yang diperiksa tumpang tindihnya
>   CONSTRAINT tanpa_tumpang_tindih EXCLUDE USING gist (
>     ruangan_id WITH =,
>     rentang WITH &&
>   ) WHERE (status = 'aktif')
> );
> ```
>
> Lima hal yang membuat bentuk ini jauh lebih baik daripada dua kolom `mulai` dan `selesai`:
>
> 1. **Jaminannya mutlak.** Tidak ada urutan permintaan, tidak ada kondisi balapan, dan tidak ada jalur kode yang bisa melanggarnya. Bandingkan dengan versi aplikasi yang harus membaca jadwal, memeriksa tumpang tindih, lalu menulis: dua permintaan bersamaan sama-sama lolos pemeriksaan.
> 2. **Batas eksklusif di atas menyelesaikan pertanyaan "jam 10 itu milik siapa".** Dengan dua kolom terpisah, perbandingan `<=` atau `<` jadi sumber bug yang berulang.
> 3. **`WHERE (status = 'aktif')` membuat pembatalan bekerja.** Baris yang dibatalkan tetap tersimpan sebagai riwayat, dan tidak lagi menghalangi pemesanan baru.
> 4. **`CHECK` pada durasi mencegah masukan tidak masuk akal**, misalnya rapat tiga minggu, tanpa perlu kode.
> 5. **Operasi pemesanan jadi satu pernyataan `INSERT`.** Aplikasi hanya perlu menangkap pelanggaran batasan dan mengubahnya jadi `409 Conflict`:
>
> ```ts
> try {
>   return await repo.simpanPemesanan(data);
> } catch (error) {
>   // Kode 23P01 = exclusion_violation
>   if (isPgError(error, '23P01')) {
>     throw new ErrorKonflik('Ruangan sudah dipesan pada waktu tersebut');
>   }
>   throw error;
> }
> ```
>
> Pola "coba tulis, tangkap pelanggaran batasan, ubah jadi error domain" akan dipakai berulang di seri ini. Ia lebih benar **dan** lebih sederhana daripada memeriksa dulu sebelum menulis, dan modul 8 menjelaskan alasannya secara lengkap.

### Latihan 4: Simpan atau hitung

Untuk delapan nilai berikut, putuskan: dihitung saat diminta, disimpan sebagai kolom biasa, atau disimpan sebagai kolom tergenerasi. Sebutkan alasannya.

| # | Nilai |
| --- | --- |
| 1 | Total harga satu pesanan |
| 2 | Jumlah salinan tersedia untuk satu buku |
| 3 | Jumlah komentar pada satu artikel dengan 2 juta komentar |
| 4 | Usia anggota dari tanggal lahir |
| 5 | Nama lengkap dari nama depan dan belakang |
| 6 | Denda satu peminjaman yang sudah dikembalikan |
| 7 | Status "terlambat" pada peminjaman berjalan |
| 8 | Total pendapatan bulan lalu untuk dasbor |

> [!jawaban]
>
> | # | Keputusan | Alasan |
> | --- | --- | --- |
> | 1 | **Simpan**, sebagai bagian dari catatan historis | Harus sama dengan yang dibayar pelanggan, meski harga produk berubah |
> | 2 | **Hitung** | Hanya beberapa baris yang dibaca, dan penghitung yang disimpan bisa menyimpang |
> | 3 | **Simpan** sebagai penghitung | Agregasi pada 2 juta baris terlalu mahal untuk setiap kali tampil. Diperbarui dalam transaksi yang sama, modul 8 |
> | 4 | **Hitung** | Berubah sendiri setiap hari. Menyimpannya berarti perlu pekerjaan harian yang memperbaruinya |
> | 5 | **Kolom tergenerasi** | Dihitung basis data, selalu konsisten, bisa diindeks |
> | 6 | **Simpan** | Sudah final saat pengembalian. Menghitung ulang nanti bisa menghasilkan angka berbeda kalau aturan dendanya berubah |
> | 7 | **Hitung** | Bergantung pada tanggal hari ini, jadi tidak boleh dibekukan |
> | 8 | **Simpan** sebagai ringkasan berkala | Agregasi atas jutaan baris transaksi. Dihitung sekali per jam, lihat modul 14 |
>
> Contoh kolom tergenerasi untuk nomor 5:
>
> ```sql
> ALTER TABLE anggota
>   ADD COLUMN nama_lengkap text
>   GENERATED ALWAYS AS (trim(nama_depan || ' ' || coalesce(nama_belakang, ''))) STORED;
> ```
>
> Pola yang bisa ditarik dari delapan jawaban di atas:
>
> - **Nilai yang bergantung pada waktu sekarang: selalu dihitung.** Menyimpannya berarti berjanji memperbaruinya setiap hari, dan janji itu akan gagal.
> - **Nilai yang bagian dari catatan historis: selalu disimpan.** Struk, denda final, dan total pesanan tidak boleh berubah karena data lain berubah.
> - **Nilai yang mahal dihitung dan sering dibaca: disimpan dengan satu tempat yang bertanggung jawab memperbaruinya.** Itu cache, dan harus diperlakukan sebagai cache, termasuk punya cara untuk dihitung ulang dari nol kalau menyimpang.

## Batasnya

Skema yang dirancang baik menjaga bentuk dan kebenaran data, dan tidak menyelesaikan tiga hal.

**Aturan yang melibatkan jumlah baris tidak bisa dinyatakan sebagai batasan sederhana.** "Maksimal 3 pinjaman per anggota" butuh membaca lalu memutuskan, dan itu membuka celah konkurensi yang baru ditutup di modul 8.

**Skema tidak membuat kueri cepat.** Tabel dengan batasan lengkap tetap bisa butuh empat detik untuk satu pertanyaan kalau indeksnya tidak ada. Itu modul 9.

**Anda belum bisa mengambil datanya.** DDL sudah ada, dan cara menanyakan sesuatu kepada basis data belum dibahas sama sekali.

## Rangkuman

- Aturan yang dinyatakan di skema dijaga mesin pada setiap penulisan dari mana pun. Aturan yang hanya ada di kode aplikasi dijaga oleh ingatan.
- Primary key memakai kunci buatan yang tidak pernah berubah, kunci alami ditegakkan dengan `UNIQUE`. UUIDv7 atau ULID sebagai bawaan.
- `ON DELETE RESTRICT` sebagai bawaan, `CASCADE` hanya untuk data yang tidak bermakna tanpa induknya.
- `text` bukan `varchar(n)`, `bigint` atau `numeric` untuk uang bukan `float`, `timestamptz` untuk momen dan `date` untuk tanggal kalender.
- Indeks unik sebagian menegakkan aturan "hanya satu yang aktif", dan `EXCLUDE` menegakkan "tidak boleh bertabrakan". Keduanya jaminan mutlak yang menggantikan ratusan baris kode.
- Satu fakta satu tempat, kecuali untuk catatan historis: harga dan alamat pada struk disalin, dan sengaja tidak mengikuti perubahan.
- Penghapusan lunak membuat setiap kueri wajib menyaringnya. Pakai view atau Row Level Security supaya tidak bergantung pada ingatan.
- Migrasi tidak pernah diedit setelah dijalankan, dijalankan terpisah dari deploy, dan setiap perubahan harus kompatibel dengan versi aplikasi yang masih berjalan. Ganti nama kolom butuh empat tahap.
- Nilai yang bergantung waktu sekarang dihitung, nilai historis disimpan, nilai mahal yang sering dibaca disimpan sebagai cache dengan satu pemilik.

## Masalah terbuka

Skema Anda sudah ada, batasannya terpasang, dan migrasinya berjalan. Sekarang datanya perlu ditanyakan.

Pertanyaan dari pengelola perpustakaan terdengar sederhana: berapa buku terlambat per kategori bulan ini, siapa sepuluh peminjam teraktif, buku apa yang paling lama tidak pernah dipinjam, dan berapa rata-rata hari keterlambatan per anggota untuk anggota yang pernah terlambat lebih dari dua kali.

Keempatnya bisa dikerjakan dengan cara Proyek 1: ambil semua baris ke aplikasi, lalu olah dengan `filter` dan `reduce`. Dan keempatnya akan memblokir event loop seperti di modul 2, memakan memori, serta menjadi lebih lambat setiap bulan.

Semuanya juga bisa dijawab dengan satu pernyataan yang dijalankan di tempat datanya berada.

Itu isi modul berikutnya: SQL yang dipakai sehari-hari, dari join sampai window function, beserta jebakan `NULL` yang membuat kueri terlihat benar dan memberi jawaban salah.
