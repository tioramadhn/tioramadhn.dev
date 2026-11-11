---
title: 'Modul 9: Transaksi dan Konkurensi'
description: Dua hal yang Anda anggap satu kesatuan bisa diselingi orang lain. Transaksi, tingkat isolasi, penguncian baris, deadlock, dan empat cara benar mengurangi stok.
date: 2026-12-12
slug: modul-9-transaksi-dan-konkurensi
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Modul sebelumnya ditutup dengan satu percobaan: anggota yang sudah punya 2 pinjaman mengirim dua permintaan peminjaman bersamaan, dan berakhir dengan 4 pinjaman meski aturannya ditulis benar.

Tidak ada bug di kode itu. Yang terjadi adalah pola yang akan Anda temui seumur karier:

```ts
// Pola baca-lalu-tulis dari Proyek 1, dan celahnya
const jumlah = await repo.hitungBerjalanMilik(anggotaId); // membaca 2
if (jumlah >= 3) throw new ErrorAturanBisnis(...);        // lolos
await repo.simpan(peminjamanBaru);                        // menulis
```

Antara baris pertama dan ketiga ada jeda, dan pada jeda itu permintaan lain bisa mengerjakan hal yang sama. Namanya **pola baca-putuskan-tulis**, dan ini sumber bug konkurensi paling umum di backend.

| Gejala yang dilaporkan | Penyebab sebenarnya |
| --- | --- |
| Stok jadi minus padahal sudah diperiksa | Baca-putuskan-tulis |
| Batas kuota terlampaui | Baca-putuskan-tulis |
| Saldo berkurang tapi penerima tidak bertambah | Dua penulisan tanpa transaksi |
| Nomor invoice ganda | Baca nomor terakhir lalu tambah |
| Dua pesanan dari satu klik | Tidak idempoten |
| Penghitung komentar tidak cocok dengan jumlah baris | Pembaruan tidak atomik |

Keenamnya tidak muncul saat Anda menguji sendiri, dan muncul setiap hari di produksi.

## Analogi: satu buku kas dan dua petugas

Bayangkan dua petugas melayani dua anggota di loket berbeda, memakai satu buku kas bersama.

**Tanpa aturan.** Petugas A membaca "stok buku X: 1", lalu pergi mengambil formulir. Petugas B juga membaca "stok buku X: 1". Keduanya menulis peminjaman, dan dua anggota pulang dengan satu buku yang sama.

**Dengan aturan "satu transaksi".** Petugas A mengambil buku kas dari rak, mencatat semuanya, lalu mengembalikannya. Selama buku kas di tangannya, petugas B menunggu. Benar, dan lambat.

**Dengan aturan yang lebih baik.** Buku kas punya kolom stok, dan petugas tidak boleh menulis angka baru berdasarkan hasil bacaannya. Mereka hanya boleh menulis instruksi "kurangi satu, dan tolak kalau sudah nol". Petugas yang datang kedua mendapat penolakan. Tidak ada yang perlu menunggu lama, dan hasilnya selalu benar.

| Dunia loket | Dunia basis data |
| --- | --- |
| Satu urusan yang dicatat utuh atau tidak sama sekali | Transaksi |
| Memegang buku kas | Kunci baris |
| "Kurangi satu, tolak kalau nol" | `UPDATE ... WHERE stok > 0` |
| Dua petugas saling menunggu buku yang dipegang satu sama lain | Deadlock |
| Nomor revisi di tiap lembar | Penguncian optimistis dengan kolom versi |
| "Ambil formulir yang belum dipegang siapa pun" | `FOR UPDATE SKIP LOCKED` |

Batas analoginya: petugas manusia bisa berbicara dan berkoordinasi, sedangkan transaksi basis data tidak tahu apa-apa tentang satu sama lain. Satu-satunya yang mereka tahu adalah aturan isolasi, dan memahami aturan itu adalah inti modul ini.

## Transaksi: menyatukan beberapa penulisan

```ts
// src/db/transaksi.ts
export async function dalamTransaksi<T>(
  db: Database,
  kerjakan: (tx: Database) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => kerjakan(tx));
}
```

```ts
// src/fitur/peminjaman/layanan.ts
// Masalah kelima dari Proyek 1, sekarang selesai
async function pinjam(anggotaId: string, bukuId: string) {
  return dalamTransaksi(db, async (tx) => {
    const salinan = await repoSalinan(tx).ambilTersedia(bukuId);
    if (!salinan) throw new ErrorAturanBisnis('Tidak ada salinan tersedia', 'SALINAN_HABIS');

    const pinjaman = await repoPeminjaman(tx).simpan({ anggotaId, salinanId: salinan.id });
    await repoRiwayat(tx).catat({ jenis: 'pinjam', peminjamanId: pinjaman.id });

    return pinjaman;
  });
}
```

Empat jaminan yang diringkas sebagai ACID, dan apa artinya secara praktis:

| Sifat | Artinya | Yang Anda dapat |
| --- | --- | --- |
| **Atomicity** | Semua atau tidak sama sekali | Proses mati di tengah berarti tidak ada yang tersimpan |
| **Consistency** | Batasan tetap berlaku | `CHECK` dan `FOREIGN KEY` diperiksa, modul 5 |
| **Isolation** | Transaksi tidak saling mengacau | Tingkatnya bisa dipilih, dan ini bagian tersulit |
| **Durability** | Yang sudah di-commit tidak hilang | Mati listrik tidak menghapus data yang sudah tersimpan |

Tiga aturan tentang lingkup transaksi yang menyelamatkan banyak insiden:

**Satu, transaksi harus pendek.** Setiap transaksi yang terbuka menahan satu sambungan dari pool dan bisa menahan kunci baris. Transaksi yang berjalan 30 detik pada tabel yang sibuk akan membuat permintaan lain menunggu.

**Dua, jangan pernah memanggil layanan luar di dalam transaksi.**

```ts
// Jangan disalin: transaksi yang menahan sambungan terlalu lama
// Salah: transaksi terbuka selama menunggu jaringan
await dalamTransaksi(db, async (tx) => {
  const pesanan = await repoPesanan(tx).simpan(data);
  await klienPembayaran.tagih(pesanan);  // bisa 3 detik, bisa menggantung
  await repoPesanan(tx).tandaiDibayar(pesanan.id);
});
```

Kalau layanan pembayaran melambat, seluruh transaksi menahan kunci dan sambungan. Kalau layanan itu menggantung sampai batas waktu, transaksinya ikut menggantung. Polanya: tulis dulu niatnya di dalam transaksi, panggil luar di luar transaksi, lalu perbarui hasilnya. Bentuk lengkapnya adalah pola outbox di modul 16.

**Tiga, jangan menunggu pengguna di dalam transaksi.** Transaksi tidak pernah melintasi beberapa permintaan HTTP. Keranjang yang "dikunci" selama pengguna mengisi form adalah masalah domain, bukan masalah transaksi, dan jawabannya reservasi dengan masa berlaku.

## Tingkat isolasi

Postgres punya tiga tingkat yang relevan, dan bawaannya bukan yang paling ketat.

| Tingkat | Yang dicegah | Yang masih bisa terjadi |
| --- | --- | --- |
| **Read Committed** (bawaan) | Membaca data yang belum di-commit | Lost update, write skew, pembacaan yang berubah dalam satu transaksi |
| **Repeatable Read** | Pembacaan dalam satu transaksi konsisten | Write skew. Transaksi bisa gagal dengan `40001` |
| **Serializable** | Hampir semua anomali | Lebih banyak kegagalan `40001`, jadi **wajib** ada percobaan ulang |

Tiga anomali yang namanya perlu Anda kenali, karena itu yang akan Anda lihat di produksi:

**Lost update.** Dua transaksi membaca nilai yang sama, menghitung, lalu menulis. Yang menulis terakhir menimpa pekerjaan yang pertama tanpa jejak. Inilah masalah "4 pinjaman" di awal modul.

**Write skew.** Dua transaksi membaca keadaan yang sama, lalu masing-masing menulis baris **berbeda**, dan hasil gabungannya melanggar aturan yang tidak dilanggar masing-masing. Contoh klasik: aturan "minimal satu dokter harus berjaga". Dua dokter sama-sama melihat ada dua orang berjaga, keduanya mengajukan izin, dan tidak ada yang berjaga.

**Phantom read.** Transaksi menghitung baris yang cocok dengan syarat tertentu, lalu transaksi lain menambahkan baris yang juga cocok. Penghitungan yang pertama jadi usang tanpa barisnya sendiri berubah.

Yang penting dipahami: **Read Committed tidak mencegah ketiganya.** Jadi keamanan harus datang dari cara Anda menulis kueri, bukan dari harapan bahwa basis data mengurusnya.

## Empat cara benar mengurangi stok

Inilah inti modul ini. Masalahnya sama, dan ada empat jalan keluar dengan pertukaran berbeda.

**Cara 1: pembaruan atomik bersyarat.** Paling sederhana, paling cepat, dan pilihan pertama.

```sql
UPDATE produk
SET stok = stok - $2
WHERE id = $1 AND stok >= $2
RETURNING stok;
```

```ts
// src/fitur/pesanan/layanan.ts, cara 1: pembaruan bersyarat
const hasil = await tx.execute(sqlKurangiStok, [produkId, jumlah]);

if (hasil.rowCount === 0) {
  throw new ErrorAturanBisnis('Stok tidak cukup', 'STOK_KURANG');
}
```

Tidak ada celah, karena tidak ada jeda: pemeriksaan dan penulisan terjadi dalam satu pernyataan, dan Postgres mengunci barisnya selama itu. Keterbatasannya: hanya berlaku kalau keputusannya bisa dinyatakan sebagai syarat pada baris yang sama.

**Cara 2: penguncian pesimistis dengan `FOR UPDATE`.** Dipakai saat keputusan butuh membaca beberapa baris lebih dulu.

```sql
BEGIN;

-- Kunci barisnya. Transaksi lain yang mengunci baris sama akan menunggu.
SELECT stok FROM produk WHERE id = $1 FOR UPDATE;

-- Sekarang aman menghitung dan memutuskan, karena tidak ada yang bisa menyelinap
UPDATE produk SET stok = stok - $2 WHERE id = $1;
INSERT INTO pesanan_item (...) VALUES (...);

COMMIT;
```

Benar, dan harganya: permintaan lain untuk produk yang sama akan menunggu. Pada produk yang sangat laris, itu berarti antrean. Pasang `lock_timeout` seperti di modul 8 supaya penantiannya tidak tak berbatas.

**Cara 3: penguncian optimistis dengan kolom versi.** Dipakai saat bentrokan jarang terjadi dan Anda ingin menghindari penguncian.

```sql
UPDATE peminjaman
SET jatuh_tempo = jatuh_tempo + 7, diperpanjang = 1, versi = versi + 1
WHERE id = $1 AND versi = $2
RETURNING versi;
```

```ts
// src/fitur/pesanan/layanan.ts, membaca jumlah baris terpengaruh
if (hasil.rowCount === 0) {
  // Ada yang mengubah baris ini sejak kita membacanya
  throw new ErrorKonflik('Data sudah diubah pihak lain, muat ulang lalu coba lagi');
}
```

Ini pola yang dipakai saat pengguna membuka form edit lalu menyimpannya beberapa menit kemudian. Nilai `versi` dikirim ke klien bersama datanya, dan dikembalikan saat menyimpan. Pelajaran ini sama dengan penanganan konflik di Proyek 4 seri frontend.

**Cara 4: `Serializable` dengan percobaan ulang.** Dipakai untuk aturan yang tidak bisa dinyatakan pada satu baris, misalnya write skew.

```ts
// src/db/transaksi.ts
export async function dalamTransaksiSerializable<T>(
  db: Database,
  kerjakan: (tx: Database) => Promise<T>,
  maksPercobaan = 3
): Promise<T> {
  for (let ke = 1; ke <= maksPercobaan; ke++) {
    try {
      return await db.transaction(async (tx) => {
        await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);
        return kerjakan(tx);
      });
    } catch (error) {
      const dapatDiulang = isPgError(error) && ['40001', '40P01'].includes(error.code);

      if (!dapatDiulang || ke === maksPercobaan) throw error;

      // Jeda acak yang bertambah, supaya dua transaksi tidak bentrok lagi bersamaan
      await tidur(20 * 2 ** ke + Math.random() * 50);
    }
  }

  throw new Error('tidak terjangkau');
}
```

Dengan `Serializable`, Postgres menjamin hasilnya setara dengan menjalankan transaksi satu per satu. Harganya: transaksi bisa ditolak dengan `40001`, dan **percobaan ulang bukan opsional, melainkan bagian dari pola.** Fungsi yang dijalankan di dalamnya juga harus aman dijalankan ulang, artinya tidak boleh punya efek samping di luar basis data.

Ringkasan pilihan:

| Situasi | Pakai |
| --- | --- |
| Keputusan bisa jadi syarat pada satu baris | **Cara 1**, pembaruan atomik |
| Perlu membaca beberapa baris sebelum memutuskan | Cara 2, `FOR UPDATE` |
| Pengguna mengedit lalu menyimpan beberapa menit kemudian | Cara 3, kolom versi |
| Aturan melibatkan agregat atau beberapa tabel | Cara 4, `Serializable` dengan percobaan ulang |
| Memproses pekerjaan dari antrean | `FOR UPDATE SKIP LOCKED` |

## Pekerja antrean dengan `SKIP LOCKED`

Satu pola yang pantas dihafal, dan akan dipakai lagi di modul 15:

```sql
-- Sepuluh pekerja bisa menjalankan ini bersamaan tanpa saling menunggu
-- dan tanpa mengambil pekerjaan yang sama
UPDATE pekerjaan
SET status = 'diproses', diambil_pada = now(), diambil_oleh = $1
WHERE id IN (
  SELECT id FROM pekerjaan
  WHERE status = 'menunggu' AND jalankan_pada <= now()
  ORDER BY prioritas DESC, jalankan_pada
  LIMIT 5
  FOR UPDATE SKIP LOCKED
)
RETURNING *;
```

`SKIP LOCKED` berarti "lewati baris yang sedang dipegang transaksi lain". Tanpa itu, sepuluh pekerja akan berbaris menunggu baris pertama, dan paralelismenya hilang sama sekali.

## Deadlock

Deadlock terjadi saat dua transaksi saling menunggu kunci yang dipegang satu sama lain. Postgres mendeteksinya dan membunuh salah satunya dengan `40P01`.

```text
Transaksi A                      Transaksi B
UPDATE rekening WHERE id='satu'  UPDATE rekening WHERE id='dua'
UPDATE rekening WHERE id='dua'   UPDATE rekening WHERE id='satu'
    (menunggu B)                     (menunggu A)
```

Dua pencegahan, dan yang pertama menyelesaikan sebagian besar kasus:

**Satu, kunci baris dalam urutan yang sama, selalu.** Urutkan berdasarkan id sebelum memperbarui:

```ts
// src/fitur/transfer/layanan.ts, urutan kunci yang mencegah deadlock
// Selalu kunci rekening dengan id lebih kecil dulu, apa pun arah transfernya
const [pertama, kedua] = [dariId, keId].sort();

await tx.execute(sql`SELECT id FROM rekening WHERE id IN (${pertama}, ${kedua}) FOR UPDATE`);
```

**Dua, transaksi yang pendek.** Semakin lama kunci dipegang, semakin besar peluang bertabrakan.

Dan karena deadlock tidak bisa dihapus sepenuhnya, bungkus operasi tulis penting dengan percobaan ulang seperti pada cara 4. Satu catatan: deadlock yang **sering** terjadi adalah tanda ada yang salah dalam urutan penguncian Anda, bukan sesuatu yang cukup ditambal dengan percobaan ulang.

## Idempotency yang benar-benar aman

Pola di modul 4 sekarang bisa dilengkapi: penyimpanan kunci dan pekerjaannya dilakukan dalam **satu transaksi**.

```ts
// src/fitur/pesanan/layanan.ts, idempotency di dalam transaksi yang sama
async function buatPesanan(penggunaId: string, kunci: string, masukan: Masukan) {
  return dalamTransaksi(db, async (tx) => {
    // Penulisan bersyarat atomik. Tidak ada baris kembali berarti kunci sudah ada.
    const [terkunci] = await tx.execute(sql`
      INSERT INTO idempotency (kunci, pengguna_id, sidik_jari, status, kedaluwarsa_pada)
      VALUES (${kunci}, ${penggunaId}, ${sidikJari(masukan)}, 'diproses', now() + interval '24 hours')
      ON CONFLICT (kunci) DO NOTHING
      RETURNING kunci
    `);

    if (!terkunci) {
      const catatan = await repoIdempotency(tx).ambil(kunci, penggunaId);
      if (catatan?.status === 'selesai') return catatan.respons;
      throw new ErrorKonflik('Permintaan dengan kunci ini masih diproses');
    }

    const pesanan = await buatPesananSungguhan(tx, penggunaId, masukan);

    await repoIdempotency(tx).selesaikan(kunci, { status: 201, body: pesanan });

    return pesanan;
  });
}
```

Karena keduanya dalam satu transaksi, tidak mungkin ada keadaan "pesanan sudah dibuat tapi kuncinya belum tercatat", yang akan membuat percobaan ulang membuat pesanan kedua. Inilah pertemuan antara idempotency dari modul 4 dan transaksi dari modul ini.

## Buktikan jalan

Konkurensi tidak bisa dibuktikan dengan satu permintaan. Satu-satunya cara adalah menembakkan banyak sekaligus, lalu memeriksa apakah angkanya masuk akal.

Siapkan satu produk dengan stok 10:

```bash
docker compose exec -it db psql -U postgres -d toko \
  -c "UPDATE produk SET stok = 10 WHERE id = '<id-produk>'; SELECT stok FROM produk WHERE id = '<id-produk>';"
```

Lalu kirim 50 permintaan pembelian bersamaan:

```bash
seq 50 | xargs -P 50 -I{} curl -s -o /dev/null -w '%{http_code}\n' \
  -X POST localhost:3000/v1/pesanan \
  -H 'content-type: application/json' \
  -H "idempotency-key: uji-{}" \
  -d '{"item":[{"produkId":"<id-produk>","jumlah":1}]}' | sort | uniq -c
```

Yang Anda harapkan:

```text
  10 201
  40 409
```

Lalu periksa stoknya:

```text
 stok
------
    0
```

Tiga hal yang membuat hasil ini bernilai. **Tepat sepuluh berhasil**, tidak sebelas dan tidak sembilan. **Stok berhenti di nol**, tidak pernah minus. Dan empat puluh sisanya ditolak dengan **409, bukan 500**: penolakan itu keputusan yang Anda ambil, bukan kecelakaan.

Jalankan seluruh percobaan ini **sepuluh kali**. Bug konkurensi bersifat probabilistik, dan satu kali hijau tidak membuktikan apa pun. Kalau pernah sekali saja muncul sebelas `201` atau stok minus, ada celah antara memeriksa dan menulis yang belum ditutup.

## Latihan

### Latihan 1: Buktikan bugnya, lalu perbaiki empat cara

Siapkan tabel produk dengan satu baris berstok 1. Tulis skrip yang mengirim 20 permintaan pembelian bersamaan, lalu jalankan lima kali.

```ts
// test/konkurensi.test.ts, uji yang membuktikan stok tidak bisa minus
await Promise.all(
  Array.from({ length: 20 }, () =>
    fetch('http://localhost:3000/v1/beli', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ produkId: ID, jumlah: 1 }),
    })
  )
);
```

Mulai dari implementasi baca-putuskan-tulis, catat stok akhirnya, lalu perbaiki dengan empat cara dari modul ini dan catat hasil masing-masing.

> [!petunjuk]
> Supaya bug lebih mudah muncul, tambahkan jeda kecil antara membaca dan menulis, misalnya `await tidur(10)`. Jeda itu mewakili pekerjaan nyata yang biasanya ada di sana: validasi, kueri lain, atau perhitungan.

> [!jawaban]
>
> | Implementasi | Stok akhir | Berhasil | Catatan |
> | --- | --- | --- | --- |
> | Baca-putuskan-tulis | -14 sampai -19 | 15 sampai 20 | Semuanya melihat stok 1 |
> | Pembaruan atomik | 0 | **tepat 1** | Paling sederhana dan paling cepat |
> | `FOR UPDATE` | 0 | tepat 1 | Benar, 19 permintaan sempat menunggu |
> | Kolom versi | 0 | tepat 1 | 19 dapat 409, klien perlu mencoba ulang |
> | `Serializable` | 0 | tepat 1 | Benar, dengan beberapa percobaan ulang internal |
>
> ```ts
> // Yang dipakai untuk kasus ini: pembaruan atomik
> const [baris] = await db.execute(sql`
>   UPDATE produk SET stok = stok - ${jumlah}
>   WHERE id = ${produkId} AND stok >= ${jumlah}
>   RETURNING stok
> `);
>
> if (!baris) throw new ErrorAturanBisnis('Stok tidak cukup', 'STOK_KURANG');
> ```
>
> Empat hal yang akan Anda pelajari dari menjalankannya sendiri:
>
> 1. **Bugnya tidak muncul tanpa beban bersamaan.** Menguji satu per satu dengan Postman selalu benar. Inilah kenapa bug konkurensi lolos ke produksi: cara pengujian normal tidak bisa menemukannya.
> 2. **Pembaruan atomik tidak hanya paling benar, tapi juga tercepat.** Tidak ada penantian, tidak ada percobaan ulang, satu perjalanan jaringan.
> 3. **`FOR UPDATE` membuat permintaan berbaris.** Pada 20 permintaan tidak terasa, pada 2.000 permintaan untuk satu produk flash sale, antreannya jadi masalah tersendiri.
> 4. **Kolom versi memindahkan beban ke klien.** Cocok untuk form edit manusia, tidak cocok untuk pembelian otomatis, karena klien harus tahu cara mencoba ulang.
>
> Satu catatan: stok `-14` pada baris pertama adalah angka yang menjelaskan segalanya. Tidak ada error di log, tidak ada peringatan, dan basis data dengan senang hati menyimpan nilai negatif, kecuali Anda sudah memasang `CHECK (stok >= 0)` dari modul 5. Dengan batasan itu, bugnya berubah dari data yang salah jadi error yang terlihat, dan itu jauh lebih baik.

### Latihan 2: Write skew

Ada aturan: setiap shift harus punya minimal satu petugas yang berjaga. Tabel `jaga` berisi baris per petugas per shift dengan kolom `hadir`.

```ts
// Kode yang harus Anda telaah di latihan ini
async function ajukanIzin(petugasId: string, shiftId: string) {
  const jumlahHadir = await db.hitungHadir(shiftId); // membaca 2

  if (jumlahHadir <= 1) {
    throw new ErrorAturanBisnis('Tidak boleh, Anda petugas terakhir', 'PETUGAS_TERAKHIR');
  }

  await db.tandaiTidakHadir(petugasId, shiftId);
}
```

Dua petugas mengajukan izin bersamaan untuk shift yang sama. Jelaskan apa yang terjadi, lalu perbaiki dengan dua cara berbeda.

> [!petunjuk]
> Perhatikan bahwa kedua transaksi membaca baris yang sama, lalu masing-masing menulis baris yang **berbeda**. Tidak ada satu pun baris yang ditulis dua kali, jadi penguncian baris biasa tidak akan menyadari ada yang salah. Pertanyaan yang membuka jawabannya: apa yang sebenarnya dijaga aturan ini, dan apakah "benda" itu punya baris sendiri di basis data?

> [!pembahasan]
>
> Keduanya membaca `jumlahHadir = 2`, keduanya lolos pemeriksaan, keduanya menulis baris **berbeda**. Hasil akhir: nol petugas berjaga.
>
> Yang membuat kasus ini berbeda dari stok: **tidak ada satu baris pun yang dilanggar.** Baris petugas A benar, baris petugas B benar, dan hanya gabungannya yang salah. Karena itu pembaruan atomik bersyarat dari cara 1 tidak bisa dipakai, dan `FOR UPDATE` pada baris masing-masing juga tidak menolong karena mereka mengunci baris yang berbeda.
>
> **Perbaikan A: kunci baris induknya.** Jadikan shift sebagai titik serialisasi.
>
> ```ts
> await dalamTransaksi(db, async (tx) => {
>   // Semua perubahan jaga pada shift ini harus lewat kunci baris shift
>   await tx.execute(sql`SELECT id FROM shift WHERE id = ${shiftId} FOR UPDATE`);
>
>   const jumlahHadir = await hitungHadir(tx, shiftId);
>   if (jumlahHadir <= 1) throw new ErrorAturanBisnis(...);
>
>   await tandaiTidakHadir(tx, petugasId, shiftId);
> });
> ```
>
> Sederhana dan efektif, dengan dua syarat: setiap jalur yang mengubah kehadiran **wajib** mengunci baris shift lebih dulu, dan satu jalur yang lupa akan membuka kembali celahnya.
>
> **Perbaikan B: `Serializable` dengan percobaan ulang.**
>
> ```ts
> await dalamTransaksiSerializable(db, async (tx) => {
>   const jumlahHadir = await hitungHadir(tx, shiftId);
>   if (jumlahHadir <= 1) throw new ErrorAturanBisnis(...);
>
>   await tandaiTidakHadir(tx, petugasId, shiftId);
> });
> ```
>
> Kodenya hampir sama dengan versi yang salah, dan Postgres yang mendeteksi bahwa dua transaksi bergantung pada pembacaan yang saling membatalkan, lalu menolak salah satunya dengan `40001`. Petugas kedua mendapat pesan "coba lagi", dan pada percobaan kedua dia melihat jumlah yang benar lalu ditolak dengan alasan yang tepat.
>
> **Mana yang dipilih:** B kalau aturan seperti ini banyak di aplikasi Anda, karena tidak bergantung pada kedisiplinan setiap penulis kode. A kalau hanya ada satu dua tempat, dan Anda ingin menghindari percobaan ulang.
>
> Pelajaran yang lebih besar: **aturan yang melibatkan agregat tidak bisa dijamin oleh batasan satu baris.** Tiga di antaranya ada di Proyek 1 (maksimal 3 pinjaman, denda di bawah batas, tidak ada yang terlambat), dan semuanya butuh salah satu dari dua pola di atas.

### Latihan 3: Reproduksi deadlock, lalu hapus

Tulis dua fungsi transfer yang arahnya berlawanan, jalankan bersamaan dalam loop, dan catat berapa kali `40P01` muncul. Lalu perbaiki supaya tidak pernah muncul lagi.

> [!jawaban]
>
> ```ts
> // Versi yang menghasilkan deadlock: urutan kunci mengikuti arah transfer
> async function transferBuruk(dariId: string, keId: string, jumlah: number) {
>   return dalamTransaksi(db, async (tx) => {
>     await tx.execute(sql`UPDATE rekening SET saldo = saldo - ${jumlah} WHERE id = ${dariId}`);
>     await tx.execute(sql`UPDATE rekening SET saldo = saldo + ${jumlah} WHERE id = ${keId}`);
>   });
> }
>
> // A -> B dan B -> A dijalankan bersamaan: deadlock dalam hitungan detik
> ```
>
> ```ts
> // Versi benar: urutan kunci selalu sama, ditentukan id
> async function transfer(dariId: string, keId: string, jumlah: number) {
>   if (dariId === keId) throw new ErrorAturanBisnis('Rekening sama', 'REKENING_SAMA');
>
>   return dalamTransaksi(db, async (tx) => {
>     // Kunci kedua baris sekaligus dalam urutan id yang stabil
>     await tx.execute(sql`
>       SELECT id FROM rekening
>       WHERE id IN (${dariId}, ${keId})
>       ORDER BY id
>       FOR UPDATE
>     `);
>
>     // Pengurangan bersyarat: saldo tidak mungkin jadi negatif
>     const [debit] = await tx.execute(sql`
>       UPDATE rekening SET saldo = saldo - ${jumlah}
>       WHERE id = ${dariId} AND saldo >= ${jumlah}
>       RETURNING saldo
>     `);
>
>     if (!debit) throw new ErrorAturanBisnis('Saldo tidak cukup', 'SALDO_KURANG');
>
>     await tx.execute(sql`
>       UPDATE rekening SET saldo = saldo + ${jumlah} WHERE id = ${keId}
>     `);
>
>     // Catatan mutasi, dalam transaksi yang sama
>     await tx.execute(sql`
>       INSERT INTO mutasi (id, dari_id, ke_id, jumlah_rp, dibuat_pada)
>       VALUES (${idBaru()}, ${dariId}, ${keId}, ${jumlah}, now())
>     `);
>   });
> }
> ```
>
> Lima hal yang membuat versi kedua benar:
>
> 1. **`ORDER BY id FOR UPDATE` menghapus deadlock sepenuhnya**, karena semua transaksi mengunci dalam urutan yang sama.
> 2. **Pengurangan tetap bersyarat.** Kunci sudah mencegah balapan, dan `WHERE saldo >= jumlah` tetap dipasang sebagai jaring kedua. Pertahanan berlapis pada operasi uang bukan pemborosan.
> 3. **Mutasi dicatat dalam transaksi yang sama.** Kalau di luar, bisa ada saldo yang berubah tanpa jejak mutasinya.
> 4. **Rekening yang sama ditolak lebih dulu.** Tanpa itu, `IN` berisi satu nilai dan logikanya jadi aneh.
> 5. **Tetap bungkus dengan percobaan ulang untuk `40001` dan `40P01`.** Deadlock dari interaksi dengan proses lain, misalnya pekerjaan latar yang menyentuh tabel sama, masih mungkin.
>
> Kalau Anda ingin satu lapisan jaminan lagi, tambahkan batasan di basis data: `CHECK (saldo >= 0)`. Dengan itu, bug apa pun di masa depan yang membuat saldo negatif akan jadi error yang terlihat, bukan data salah yang diam.

### Latihan 4: Tiga aturan Proyek 1 yang belum terjamin

Aturan "maksimal 3 pinjaman", "tidak boleh ada yang terlambat", dan "denda di bawah Rp50.000" masih memakai pola baca-putuskan-tulis. Perbaiki ketiganya, dan jelaskan pilihan Anda.

> [!pembahasan]
>
> Ketiganya aturan berbasis agregat, jadi pilihannya antara mengunci baris induk atau `Serializable`. Untuk perpustakaan, jawaban yang paling sederhana dan cukup: **kunci baris anggota.**
>
> ```ts
> async function pinjam(anggotaId: string, bukuId: string) {
>   return dalamTransaksi(db, async (tx) => {
>     // Titik serialisasi: semua peminjaman anggota ini lewat kunci baris anggota.
>     // Dua permintaan bersamaan dari anggota yang sama akan berbaris,
>     // dan anggota lain tidak terpengaruh sama sekali.
>     const [anggota] = await tx.execute(sql`
>       SELECT id, status FROM anggota WHERE id = ${anggotaId} FOR UPDATE
>     `);
>
>     if (!anggota) throw new ErrorTidakDitemukan('Anggota tidak ditemukan');
>
>     // Tiga pemeriksaan dalam satu kueri, dibaca di dalam kunci
>     const [keadaan] = await tx.execute(sql`
>       SELECT
>         count(*) FILTER (WHERE status = 'berjalan') AS berjalan,
>         count(*) FILTER (WHERE status = 'berjalan' AND jatuh_tempo < current_date) AS telat,
>         coalesce(sum(denda_rp) FILTER (WHERE denda_dibayar = false), 0) AS denda
>       FROM peminjaman
>       WHERE anggota_id = ${anggotaId}
>     `);
>
>     const kelayakan = bolehMeminjam({
>       status: anggota.status,
>       jumlahBerjalan: Number(keadaan.berjalan),
>       adaTerlambat: Number(keadaan.telat) > 0,
>       dendaBelumDibayar: Number(keadaan.denda),
>     });
>
>     if (!kelayakan.boleh) throw new ErrorAturanBisnis(kelayakan.pesan, kelayakan.kode);
>
>     // Pemilihan salinan dan penyimpanan dalam satu pernyataan.
>     // Aturan 6 dan 7 tetap dijamin indeks unik dari modul 5.
>     const [pinjaman] = await tx.execute(sqlPinjamSalinanTersedia, [
>       idBaru(), anggotaId, bukuId,
>     ]);
>
>     if (!pinjaman) throw new ErrorAturanBisnis('Tidak ada salinan tersedia', 'SALINAN_HABIS');
>
>     return pinjaman;
>   });
> }
> ```
>
> Lima hal yang pantas diperhatikan:
>
> 1. **`bolehMeminjam` dari Proyek 1 tidak berubah satu baris pun.** Bentuknya tetap fungsi murni yang menerima keadaan. Yang berubah hanya **di mana** keadaan itu dibaca: sekarang di dalam kunci.
> 2. **Kuncinya pada baris anggota, bukan tabel.** Pertengkaran hanya terjadi antar permintaan dari anggota yang sama, dan itu jarang. Seribu anggota bisa meminjam bersamaan tanpa saling menunggu.
> 3. **Tiga pemeriksaan jadi satu kueri** dengan `FILTER`, menghemat dua perjalanan jaringan di dalam transaksi. Mengingat aturan "transaksi harus pendek", setiap perjalanan yang dihemat berarti kunci dipegang lebih singkat.
> 4. **Aturan 6 dan 7 tetap mengandalkan indeks unik.** Pembagian kerjanya: batasan basis data untuk aturan per baris, kunci untuk aturan agregat.
> 5. **Transaksi ini tidak memanggil apa pun di luar basis data.** Pengiriman email pemberitahuan, kalau ada, dilakukan setelah commit, dan modul 16 menunjukkan cara melakukannya tanpa kehilangan pesan.
>
> Alternatif `Serializable` juga benar dan lebih sederhana ditulis. Untuk perpustakaan, `FOR UPDATE` pada anggota dipilih karena pertengkarannya sempit, perilakunya mudah dijelaskan, dan tidak butuh klien yang siap menerima percobaan ulang.

## Batasnya

Transaksi menjamin kebenaran penulisan, dan tiga hal tetap di luarnya.

**Transaksi tidak melintasi sistem.** Menyimpan pesanan di basis data dan mengirim pesan ke layanan lain tidak bisa dijadikan satu transaksi. Pola yang menanganinya adalah outbox di modul 16, dan saga di modul 24.

**Transaksi tidak membuat kueri cepat.** Kunci yang dipegang lebih lama karena kueri lambat memperbesar peluang pertengkaran, jadi performa dan konkurensi saling terkait. Itu modul 10.

**Percobaan ulang butuh idempotensi.** Mengulang transaksi yang sudah sempat mengirim email berarti email terkirim dua kali. Setiap operasi yang dibungkus percobaan ulang harus aman dijalankan ulang.

## Rangkuman

- Pola baca-putuskan-tulis adalah sumber bug konkurensi paling umum. Celahnya ada di jeda antara membaca dan menulis.
- Transaksi harus pendek, tidak memanggil layanan luar, dan tidak pernah melintasi beberapa permintaan HTTP.
- Read Committed, yang jadi bawaan Postgres, tidak mencegah lost update maupun write skew. Keamanan datang dari cara Anda menulis kueri.
- Empat jalan keluar: pembaruan atomik bersyarat, `FOR UPDATE`, kolom versi, dan `Serializable` dengan percobaan ulang. Yang pertama adalah pilihan pertama.
- Aturan berbasis agregat tidak bisa dijamin batasan satu baris. Kunci baris induknya sebagai titik serialisasi, atau pakai `Serializable`.
- `FOR UPDATE SKIP LOCKED` adalah pola untuk banyak pekerja yang mengambil pekerjaan dari satu antrean.
- Deadlock hilang dengan mengunci baris dalam urutan yang selalu sama. Deadlock yang sering adalah tanda urutan penguncian yang salah, bukan sesuatu yang cukup ditambal percobaan ulang.
- Kunci idempotency dan pekerjaannya harus dalam satu transaksi, atau percobaan ulang bisa membuat dua pesanan.
- Bug konkurensi tidak muncul saat diuji satu per satu. Satu-satunya cara menemukannya adalah mengirim permintaan bersamaan dengan sengaja.

## Masalah terbuka

Layanan Anda sekarang benar, bahkan di bawah beban bersamaan. Pertanyaan berikutnya datang dari pertumbuhan.

Perpustakaan sudah berjalan setahun. Tabel peminjaman berisi 2 juta baris, anggota 40 ribu, dan katalog 80 ribu. Lalu laporan mulai datang: halaman daftar peminjaman yang dulu seketika sekarang butuh 4 detik, pencarian buku yang dulu 20 ms sekarang 900 ms, dan laporan bulanan yang dulu selesai dalam sekejap sekarang membuat basis data sibuk selama dua menit sampai endpoint lain ikut melambat.

Tidak ada kode yang berubah. Satu-satunya yang berubah adalah jumlah baris.

Itu isi modul berikutnya: indeks, cara membaca rencana kueri, dan kenapa kueri yang sama bisa punya dua perilaku yang sama sekali berbeda pada seribu dan dua juta baris.
