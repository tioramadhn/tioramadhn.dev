---
title: 'Proyek 2: API Toko dengan Postgres'
description: Pemodelan data dengan batasan yang menegakkan aturan, transaksi saat memesan, pencegahan pesanan ganda, pagination kursor, dan laporan EXPLAIN yang membuktikan setiap kueri utama memakai indeks.
date: 2026-12-12
slug: proyek-2-api-toko-postgres
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Lima modul terakhir membahas basis data dari pemodelan sampai rencana kueri. Proyek ini memakai semuanya pada domain yang paling sering jadi pertanyaan wawancara backend: **toko dengan stok.**

| Dari modul | Yang dipakai |
| --- | --- |
| 5 | Batasan yang menegakkan aturan, tipe kolom yang benar, migrasi bertahap |
| 6 | Join, agregasi, CTE, `ON CONFLICT`, `UPDATE ... WHERE`, window function |
| 7 | Pool yang berukuran wajar, repository, penerjemah error, pencegahan N+1 |
| 8 | Transaksi, pembaruan atomik, `FOR UPDATE`, idempotency transaksional |
| 9 | Indeks yang dirancang dari kueri, `EXPLAIN ANALYZE` sebagai bukti |

Yang membedakan proyek ini dari tutorial toko biasa ada pada tiga syarat: **stok tidak boleh pernah minus walau diserang seratus permintaan bersamaan**, **setiap kueri utama wajib disertai bukti rencana kueri**, dan **laporan penjualan tidak boleh memperlambat endpoint pembelian**.

## Domain

Toko kopi daring dengan varian produk, stok per varian, kupon, dan pesanan.

```text
produk          judul, deskripsi, kategori, status
varian          ukuran atau rasa, harga, SKU, stok
kupon           kode, jenis diskon, batas pakai, masa berlaku
pesanan         pembeli, alamat kirim, total, status, riwayat
pesanan_item    salinan harga dan nama saat pesanan dibuat
pembayaran      simulasi: menunggu, berhasil, gagal
```

Satu keputusan pemodelan di awal menentukan seluruh kerumitan proyek ini: **stok ada di varian, bukan di produk.** Pembeli memesan "Kopi susu gula aren ukuran besar", bukan "Kopi susu gula aren". Model yang menaruh stok di produk akan memaksa Anda menulis ulang separuh layanan begitu varian pertama ditambahkan.

## Spesifikasi wajib

### A. Skema dan batasan

1. Skema lengkap dengan migrasi yang bisa dijalankan dari nol.
2. Setiap kolom uang bertipe `bigint` satuan rupiah, dengan `CHECK (>= 0)`.
3. Stok punya `CHECK (stok >= 0)`, sehingga bug konkurensi apa pun jadi error yang terlihat, bukan data salah yang diam.
4. SKU unik, kode kupon unik, dan satu produk tidak boleh punya dua varian dengan nama sama.
5. `ON DELETE RESTRICT` pada semua rujukan yang punya nilai riwayat, `CASCADE` hanya untuk item pesanan.
6. `pesanan_item` menyalin nama dan harga produk saat pesanan dibuat.
7. Batasan antar kolom: pesanan berstatus dibayar wajib punya `dibayar_pada`, dan sebaliknya.
8. Kupon punya batasan bahwa `berlaku_sampai` tidak boleh sebelum `berlaku_dari`.

### B. Fungsi

9. Katalog publik dengan filter kategori dan rentang harga, pencarian nama, dan pagination kursor.
10. Detail produk beserta semua variannya, dalam satu kueri.
11. Membuat pesanan dengan beberapa item sekaligus, dalam satu transaksi.
12. Menerapkan kupon pada pesanan, dengan validasi masa berlaku dan batas pemakaian.
13. Membatalkan pesanan, dan stok kembali.
14. Menyimulasikan pembayaran berhasil atau gagal, lalu status pesanan ikut berubah.
15. Riwayat pesanan pembeli dengan kursor.
16. Laporan penjualan: per hari 30 hari terakhir, produk terlaris, dan rata-rata nilai pesanan.

### C. Kebenaran di bawah beban

17. `POST /v1/pesanan` idempoten dengan `Idempotency-Key`, dan kuncinya tercatat dalam transaksi yang sama.
18. Stok dikurangi dengan pembaruan atomik bersyarat, bukan baca-putuskan-tulis.
19. Satu kupon dengan batas 100 pemakaian tidak boleh terpakai 101 kali, walau 200 permintaan datang bersamaan.
20. Membatalkan pesanan dua kali tidak mengembalikan stok dua kali.
21. Deadlock dicegah dengan mengunci baris dalam urutan id yang stabil.
22. Operasi tulis utama dibungkus percobaan ulang untuk `40001` dan `40P01`.

### D. Performa, dengan bukti

23. Semua kueri utama punya indeks, dan tidak satu pun memakai `Seq Scan` pada tabel besar.
24. Data benih minimal 100 ribu pesanan dan 300 ribu item.
25. Berkas `docs/explain.md` berisi keluaran `EXPLAIN (ANALYZE, BUFFERS)` untuk delapan kueri utama, sebelum dan sesudah indeks.
26. Penghitung kueri per permintaan terpasang, dan tidak ada endpoint yang melewati 10 kueri.
27. Laporan penjualan dijalankan dari materialized view atau tabel ringkasan, bukan agregasi langsung.
28. `pg_stat_statements` aktif, dan Anda bisa menyebutkan tiga kueri termahal di layanan Anda.

### E. Kualitas

29. TypeScript ketat, `pnpm check` bersih.
30. Error Postgres diterjemahkan ke error domain, dengan nama batasan sebagai kunci pesan.
31. Semua masukan divalidasi skema, termasuk parameter kursor.
32. Dokumentasi OpenAPI dihasilkan dari skema.

Autentikasi masih belum ada: id pembeli tetap dikirim lewat header sementara, seperti di Proyek 1. Itu ditutup di Proyek 3.

## Skema inti

```sql
CREATE TABLE produk (
  id          uuid PRIMARY KEY,
  slug        text NOT NULL UNIQUE,
  nama        text NOT NULL,
  deskripsi   text,
  kategori    text NOT NULL,
  status      text NOT NULL DEFAULT 'draf'
                CHECK (status IN ('draf', 'terbit', 'arsip')),
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  cari        tsvector GENERATED ALWAYS AS (
                to_tsvector('indonesian', coalesce(nama,'') || ' ' || coalesce(deskripsi,''))
              ) STORED
);

CREATE TABLE varian (
  id         uuid PRIMARY KEY,
  produk_id  uuid NOT NULL REFERENCES produk(id) ON DELETE RESTRICT,
  nama       text NOT NULL,
  sku        text NOT NULL UNIQUE,
  harga_rp   bigint NOT NULL CHECK (harga_rp >= 0),
  stok       integer NOT NULL DEFAULT 0 CHECK (stok >= 0),
  berat_gram integer NOT NULL CHECK (berat_gram > 0),

  UNIQUE (produk_id, nama)
);

CREATE TABLE kupon (
  id             uuid PRIMARY KEY,
  kode           text NOT NULL UNIQUE,
  jenis          text NOT NULL CHECK (jenis IN ('persen', 'nominal')),
  nilai          integer NOT NULL CHECK (nilai > 0),
  min_belanja_rp bigint NOT NULL DEFAULT 0 CHECK (min_belanja_rp >= 0),
  batas_pakai    integer CHECK (batas_pakai IS NULL OR batas_pakai > 0),
  terpakai       integer NOT NULL DEFAULT 0 CHECK (terpakai >= 0),
  berlaku_dari   timestamptz NOT NULL,
  berlaku_sampai timestamptz NOT NULL,

  CONSTRAINT masa_berlaku_wajar CHECK (berlaku_sampai > berlaku_dari),
  CONSTRAINT persen_wajar CHECK (jenis <> 'persen' OR nilai BETWEEN 1 AND 100),
  CONSTRAINT tidak_melebihi_batas CHECK (batas_pakai IS NULL OR terpakai <= batas_pakai)
);

CREATE TABLE pesanan (
  id            uuid PRIMARY KEY,
  pembeli_id    uuid NOT NULL REFERENCES pembeli(id) ON DELETE RESTRICT,
  kupon_id      uuid REFERENCES kupon(id) ON DELETE RESTRICT,
  status        text NOT NULL DEFAULT 'menunggu'
                  CHECK (status IN ('menunggu','dibayar','dikirim','selesai','batal')),
  alamat_kirim  text NOT NULL,
  subtotal_rp   bigint NOT NULL CHECK (subtotal_rp >= 0),
  diskon_rp     bigint NOT NULL DEFAULT 0 CHECK (diskon_rp >= 0),
  total_rp      bigint NOT NULL CHECK (total_rp >= 0),
  dibayar_pada  timestamptz,
  dibatalkan_pada timestamptz,
  versi         integer NOT NULL DEFAULT 1,
  dibuat_pada   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT total_konsisten CHECK (total_rp = subtotal_rp - diskon_rp),
  CONSTRAINT diskon_tidak_melebihi CHECK (diskon_rp <= subtotal_rp),
  CONSTRAINT dibayar_konsisten CHECK (
    (status IN ('dibayar','dikirim','selesai')) = (dibayar_pada IS NOT NULL)
  ),
  CONSTRAINT batal_konsisten CHECK (
    (status = 'batal') = (dibatalkan_pada IS NOT NULL)
  )
);

CREATE TABLE pesanan_item (
  id           uuid PRIMARY KEY,
  pesanan_id   uuid NOT NULL REFERENCES pesanan(id) ON DELETE CASCADE,
  varian_id    uuid NOT NULL REFERENCES varian(id) ON DELETE RESTRICT,
  nama_produk  text NOT NULL,
  nama_varian  text NOT NULL,
  harga_rp     bigint NOT NULL CHECK (harga_rp >= 0),
  jumlah       integer NOT NULL CHECK (jumlah BETWEEN 1 AND 99),

  UNIQUE (pesanan_id, varian_id)
);
```

Tiga batasan yang pantas diperhatikan khusus:

**`total_konsisten`** membuat kesalahan aritmetika di kode aplikasi jadi error yang terlihat. Kalau suatu hari ada jalur yang menghitung total dengan cara berbeda, basis data menolaknya alih-alih menyimpan pesanan dengan total yang salah.

**`tidak_melebihi_batas`** pada kupon adalah penjaga terakhir untuk syarat nomor 19. Logika aplikasi tetap memeriksanya lebih dulu untuk memberi pesan yang ramah, dan batasan ini memastikan tidak ada jalur yang bisa melanggarnya.

**`UNIQUE (pesanan_id, varian_id)`** mencegah dua baris item untuk varian yang sama dalam satu pesanan. Kalau klien mengirim varian yang sama dua kali, jumlahnya harus digabung di aplikasi, dan batasan ini memastikan Anda tidak lupa.

## Jalur pembelian, lengkap

Ini bagian paling menentukan di seluruh proyek. Perhatikan urutan dan alasan setiap langkah.

```ts
export async function buatPesanan(
  pembeliId: string,
  kunciIdempotency: string,
  masukan: MasukanPesanan
) {
  return dalamTransaksiDenganUlang(db, async (tx) => {
    // 1. Kunci idempotency, dalam transaksi yang sama dengan pekerjaannya
    const [terkunci] = await tx.execute(sql`
      INSERT INTO idempotency (kunci, pembeli_id, sidik_jari, status, kedaluwarsa_pada)
      VALUES (${kunciIdempotency}, ${pembeliId}, ${sidikJari(masukan)}, 'diproses',
              now() + interval '24 hours')
      ON CONFLICT (kunci) DO NOTHING
      RETURNING kunci
    `);

    if (!terkunci) return bacaHasilIdempotency(tx, kunciIdempotency, pembeliId, masukan);

    // 2. Gabungkan item dengan varian yang sama, lalu urutkan id.
    //    Urutan stabil ini yang mencegah deadlock, pelajaran modul 8.
    const item = gabungkanItemSama(masukan.item).sort((a, b) =>
      a.varianId.localeCompare(b.varianId)
    );

    // 3. Ambil harga dan nama dari basis data, bukan dari klien.
    //    Angka dari klien tidak pernah dipercaya, pelajaran modul 4.
    const varian = await tx.execute(sql`
      SELECT v.id, v.nama AS nama_varian, v.harga_rp, p.nama AS nama_produk
      FROM varian v
      JOIN produk p ON p.id = v.produk_id
      WHERE v.id = ANY(${item.map((i) => i.varianId)})
        AND p.status = 'terbit'
    `);

    if (varian.length !== item.length) {
      throw new ErrorAturanBisnis('Sebagian produk tidak tersedia', 'VARIAN_TIDAK_ADA');
    }

    // 4. Kurangi stok dengan pembaruan atomik, satu per varian, urut.
    for (const baris of item) {
      const [hasil] = await tx.execute(sql`
        UPDATE varian SET stok = stok - ${baris.jumlah}
        WHERE id = ${baris.varianId} AND stok >= ${baris.jumlah}
        RETURNING stok
      `);

      if (!hasil) {
        const nama = petaNama.get(baris.varianId) ?? 'Produk';
        throw new ErrorAturanBisnis(`Stok ${nama} tidak cukup`, 'STOK_KURANG', {
          varianId: baris.varianId,
        });
      }
    }

    const subtotal = hitungSubtotal(item, petaHarga);

    // 5. Kupon: naikkan pemakaian secara atomik, dengan syarat di dalam WHERE
    let diskon = 0;
    let kuponId: string | null = null;

    if (masukan.kodeKupon) {
      const [kupon] = await tx.execute(sql`
        UPDATE kupon
        SET terpakai = terpakai + 1
        WHERE kode = ${masukan.kodeKupon}
          AND now() BETWEEN berlaku_dari AND berlaku_sampai
          AND (batas_pakai IS NULL OR terpakai < batas_pakai)
          AND min_belanja_rp <= ${subtotal}
        RETURNING id, jenis, nilai
      `);

      if (!kupon) {
        throw new ErrorAturanBisnis(
          'Kupon tidak berlaku atau kuotanya habis',
          'KUPON_TIDAK_BERLAKU'
        );
      }

      kuponId = kupon.id;
      diskon = hitungDiskon(kupon, subtotal);
    }

    // 6. Simpan pesanan beserta itemnya
    const pesananId = idBaru();

    await tx.execute(sql`
      INSERT INTO pesanan (id, pembeli_id, kupon_id, alamat_kirim,
                           subtotal_rp, diskon_rp, total_rp)
      VALUES (${pesananId}, ${pembeliId}, ${kuponId}, ${masukan.alamatKirim},
              ${subtotal}, ${diskon}, ${subtotal - diskon})
    `);

    // Satu INSERT untuk semua item, bukan satu per item
    await tx.execute(sqlSisipkanItemMassal, [pesananId, JSON.stringify(barisItem)]);

    const pesanan = await bacaPesananPenuh(tx, pesananId);

    // 7. Catat hasilnya untuk percobaan ulang berikutnya
    await tx.execute(sql`
      UPDATE idempotency
      SET status = 'selesai', respons = ${JSON.stringify({ status: 201, body: pesanan })}
      WHERE kunci = ${kunciIdempotency}
    `);

    return pesanan;
  });
}
```

Tujuh langkah, dan masing-masing menjawab satu syarat spesifikasi. Yang paling sering dilewati pemula adalah langkah 3: **harga diambil dari basis data, tidak pernah dari klien.** Tanpa itu, siapa pun bisa memesan kopi seharga seribu rupiah dengan mengubah satu angka di permintaan.

## Indeks yang dirancang dari kueri

Jangan menambahkan indeks dengan menebak. Tulis daftar kueri utama lebih dulu, lalu rancang indeks untuk daftar itu.

| Kueri | Indeks |
| --- | --- |
| Katalog terbit per kategori, urut terbaru, kursor | `(kategori, dibuat_pada DESC, id DESC) WHERE status='terbit'` |
| Pencarian nama produk | `USING gin (cari)` |
| Varian satu produk | `(produk_id)` |
| Riwayat pesanan pembeli, kursor | `(pembeli_id, dibuat_pada DESC, id DESC)` |
| Item satu pesanan | `(pesanan_id)` |
| Pesanan menunggu pembayaran lebih dari 1 jam | `(dibuat_pada) WHERE status='menunggu'` |
| Pencarian kupon dengan kode | `(kode)` sudah dari `UNIQUE` |
| Laporan harian | tidak ada, pakai materialized view |

```sql
-- Laporan penjualan, disegarkan tiap jam oleh pekerjaan latar
CREATE MATERIALIZED VIEW rekap_harian AS
SELECT (dibuat_pada AT TIME ZONE 'Asia/Jakarta')::date AS tanggal,
       count(*)                       AS jumlah_pesanan,
       sum(total_rp)                  AS pendapatan_rp,
       round(avg(total_rp))           AS rata_nilai_rp,
       count(*) FILTER (WHERE status = 'batal') AS dibatalkan
FROM pesanan
WHERE status <> 'menunggu'
GROUP BY 1;

CREATE UNIQUE INDEX ON rekap_harian (tanggal);
```

Syarat nomor 27 selesai dengan view ini: laporan dibaca dari tabel berisi beberapa ratus baris, bukan agregasi atas 100 ribu pesanan, sehingga endpoint pembelian tidak pernah ikut melambat karena seseorang membuka dasbor.

## Yang harus Anda kerjakan sendiri

1. **Pembatalan pesanan yang mengembalikan stok tepat satu kali.** Syarat nomor 20 lebih sulit daripada kelihatannya. Petunjuk: jadikan perubahan status sebagai syarat di `WHERE`, dan lakukan pengembalian stok hanya kalau baris statusnya benar-benar berubah.
2. **Pembayaran yang mengubah status pesanan**, dengan kemungkinan pemberitahuan datang dua kali dari penyedia. Perlakukan itu sebagai idempotensi.
3. **Pekerjaan pembatalan otomatis** untuk pesanan yang tidak dibayar dalam 1 jam, beserta pengembalian stoknya. Untuk sekarang jalankan sebagai skrip manual, dan modul 14 memindahkannya ke penjadwal.
4. **`docs/explain.md`** dengan keluaran sebelum dan sesudah untuk delapan kueri. Ini bukan pekerjaan administratif: menuliskannya memaksa Anda benar-benar membaca rencananya.

## Checklist penilaian

| # | Yang diperiksa |
| --- | --- |
| 1 | 100 permintaan bersamaan untuk varian berstok 5. Tepat 5 berhasil, stok akhir 0? |
| 2 | Kupon batas 10 pemakaian, 50 permintaan bersamaan. Tepat 10 terpakai? |
| 3 | Kirim `Idempotency-Key` sama dua kali. Respons identik, dan stok hanya berkurang sekali? |
| 4 | Batalkan pesanan dua kali. Stok kembali tepat sekali? |
| 5 | Transfer harga dari klien yang dimanipulasi. Diabaikan, total dihitung server? |
| 6 | Pesan 30 item dalam satu pesanan. Berapa kueri terjadi? Harus di bawah 10 |
| 7 | Dua permintaan pesanan yang itemnya sama tapi urutannya terbalik, bersamaan. Ada deadlock? |
| 8 | `EXPLAIN` katalog dengan filter dan kursor. `Index Scan`, tanpa `Sort`? |
| 9 | Buka laporan 30 hari saat 50 pembelian per detik berjalan. Latensi pembelian naik? |
| 10 | Kirim kursor dari urutan berbeda. 400, bukan hasil acak? |
| 11 | Matikan Postgres saat layanan jalan. 503 dengan `Retry-After`, bukan 500? |
| 12 | Jalankan migrasi dari basis data kosong. Berhasil tanpa langkah manual? |
| 13 | `SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0`. Ada indeks yang tidak terpakai? |
| 14 | Pesan varian dari produk berstatus draf. Ditolak? |
| 15 | Buat pesanan dengan diskon melebihi subtotal lewat kupon nominal besar. Ditolak batasan? |

Nomor 1, 2, dan 7 adalah inti proyek ini. Cara mengujinya:

```bash
# Seratus permintaan bersamaan, masing-masing dengan kunci idempotency berbeda
seq 100 | xargs -P 100 -I{} curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST localhost:3000/v1/pesanan \
  -H 'content-type: application/json' \
  -H 'x-pembeli-id: 0192...' \
  -H "idempotency-key: uji-{}" \
  -d '{"item":[{"varianId":"...","jumlah":1}],"alamatKirim":"Jl. Contoh 1"}' \
  | sort | uniq -c
```

Keluaran yang benar: `5` baris berisi `201` dan `95` baris berisi `409`. Kalau Anda melihat enam atau lebih `201`, ada celah konkurensi yang belum tertutup.

## Tantangan bonus

- **Reservasi stok dengan masa berlaku** daripada mengurangi langsung, supaya pesanan yang tidak dibayar tidak menahan stok selamanya. Perhatikan bagaimana ini mengubah perhitungan "stok tersedia".
- **Riwayat perubahan status pesanan** sebagai tabel peristiwa, bukan hanya kolom status terakhir.
- **Partisi tabel pesanan per bulan**, lalu bandingkan `EXPLAIN` laporan sebelum dan sesudah.
- **Replika baca** dengan Postgres streaming replication di Docker, dan arahkan kueri laporan ke sana.

## Rangkuman

- Stok ada di tingkat yang dipesan pembeli. Salah menempatkannya berarti menulis ulang separuh layanan saat varian pertama ditambahkan.
- Harga, total, dan diskon dihitung di server dari data basis data. Angka dari klien hanya petunjuk tampilan.
- Batasan basis data adalah penjaga terakhir, dan logika aplikasi tetap memeriksa lebih dulu untuk memberi pesan yang bisa ditindaklanjuti.
- Kunci idempotency dan pekerjaannya dalam satu transaksi, atau percobaan ulang bisa menghasilkan dua pesanan.
- Item diurutkan berdasarkan id sebelum dikunci, supaya dua pesanan dengan item yang sama tidak saling mengunci.
- Indeks dirancang dari daftar kueri, bukan dari dugaan. Laporan agregat tidak diselesaikan indeks, melainkan view yang disegarkan berkala.
- Bug konkurensi hanya muncul kalau Anda mengirim permintaan bersamaan dengan sengaja. Jadikan itu bagian dari checklist, bukan harapan.

## Masalah terbuka

Toko Anda benar, cepat, dan tahan permintaan bersamaan. Dan masih punya lubang yang membuat semua itu tidak berarti.

Buka terminal dan jalankan ini:

```bash
curl localhost:3000/v1/pesanan -H 'x-pembeli-id: id-orang-lain'
```

Anda baru saja membaca seluruh riwayat pembelian orang lain, beserta alamat pengirimannya. Dengan satu header yang Anda tulis sendiri.

Setiap batasan yang dipasang, setiap transaksi yang dijaga, dan setiap indeks yang dirancang tidak berarti apa-apa kalau siapa pun bisa berpura-pura jadi siapa pun. Dan pertanyaannya bukan hanya "siapa Anda", tapi juga: di mana sandi disimpan supaya tidak bisa dibaca meski basis data bocor, bagaimana sesi bertahan tanpa bisa dicuri, dan apa yang terjadi saat pengguna mengganti sandinya di satu perangkat sementara lima perangkat lain masih login.

Itu isi modul berikutnya: autentikasi, penyimpanan sandi, dan pengelolaan sesi yang bisa dicabut.
