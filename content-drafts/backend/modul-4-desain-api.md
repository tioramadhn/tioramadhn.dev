---
title: 'Modul 4: Desain API yang Dipakai Orang'
description: Pagination yang tidak melewatkan data, idempotency yang mencegah transaksi dobel, dan cara mengubah API tanpa merusak aplikasi yang sudah terpasang di ribuan ponsel.
date: 2026-12-05
slug: modul-4-desain-api
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Modul sebelumnya menutup dengan empat pertanyaan dari seorang engineer Android yang akan memakai API Anda. Keempatnya pertanyaan desain, dan jawaban yang buruk akan Anda tanggung selama bertahun-tahun.

Sifat itu yang membuat desain API berbeda dari pekerjaan backend lainnya: **kode internal bisa Anda tulis ulang kapan saja, bentuk API tidak.** Begitu ada aplikasi ponsel yang memakainya terpasang di ribuan perangkat, setiap perubahan harus kompatibel dengan versi lama, karena Anda tidak bisa memaksa semua orang memperbarui aplikasinya.

| Keputusan | Kalau salah |
| --- | --- |
| Cara membagi halaman | Data terlewat atau tampil dua kali, dan pemakai menyalahkan Anda |
| Penanganan permintaan ganda | Pelanggan terdebet dua kali |
| Satuan angka uang | Selisih yang baru terlihat di laporan keuangan |
| Bentuk tanggal | Perhitungan jatuh tempo salah untuk pengguna di zona waktu lain |
| Cara mengubah API | Aplikasi lama rusak, dan Anda tidak bisa menariknya kembali |

## Analogi: formulir yang dipakai kantor lain

Analogi kantor dari modul 1 masih berlaku, dengan satu tambahan: sekarang formulir Anda dipakai kantor cabang di kota lain, yang mencetak sendiri formulirnya dan menyimpan stok untuk setahun.

Selama formulir itu hanya dipakai di kantor Anda sendiri, mengubah urutan kolom tidak masalah. Begitu cabang lain sudah mencetak sepuluh ribu lembar, mengubah arti kolom nomor tiga berarti sepuluh ribu formulir yang isinya salah tanpa ada yang tahu.

Yang bisa dilakukan tanpa merusak: **menambah** kolom baru di bagian bawah, dan membuat kolom baru itu opsional. Yang merusak: mengubah arti kolom yang ada, menghapus kolom, mengubah satuan, dan mengubah urutan yang dianggap bermakna.

| Dunia formulir | Dunia API |
| --- | --- |
| Formulir yang sudah dicetak cabang lain | Aplikasi klien yang sudah terpasang |
| Menambah kolom opsional di bawah | Menambah field baru di respons |
| Mengubah arti kolom 3 | Mengubah tipe atau makna field |
| Formulir versi 2 yang berlaku bersamaan dengan versi 1 | Versi API yang hidup berdampingan |
| Petunjuk pengisian di balik formulir | Dokumentasi OpenAPI |
| Nomor berkas yang dicatat cabang | Idempotency key |

Batas analoginya: formulir kertas punya tanggal berlaku yang bisa diumumkan, sedangkan aplikasi lama bisa terus dipakai bertahun-tahun oleh orang yang tidak pernah memperbarui. Jadi "kami sudah mengumumkan perubahan" bukan pembelaan yang berguna saat 12% pengguna Anda tiba-tiba tidak bisa memesan.

## Memodelkan sumber daya

REST yang dikerjakan dengan baik dimulai dari satu hal: **menamai benda, bukan perbuatan.**

```text
Buruk                              Baik
POST /getPesanan                   GET  /pesanan
POST /createOrder                  POST /pesanan
POST /updatePesananStatus          PATCH /pesanan/{id}
GET  /pesananByUserAndStatus       GET  /pesanan?status=dibayar
POST /deleteItem                   DELETE /pesanan/{id}/item/{itemId}
```

Enam konvensi yang pantas diputuskan sekali lalu dipatuhi di seluruh API:

| Hal | Pilihan | Contoh |
| --- | --- | --- |
| Nama koleksi | Bentuk jamak, huruf kecil | `/pesanan`, `/produk` |
| Pemisah pada path | Tanda hubung | `/metode-pembayaran` |
| Nama field | Satu gaya saja, konsisten | `dibuatPada` atau `dibuat_pada`, jangan campur |
| Bersarang | Maksimal satu tingkat | `/pesanan/{id}/item`, bukan `/toko/{a}/pesanan/{b}/item/{c}/riwayat` |
| Versi | Di awal path | `/v1/pesanan` |
| Bahasa | Satu bahasa saja | Jangan `orderId` bersama `idPesanan` |

Baris ketiga sering diremehkan dan paling sering jadi keluhan: API yang mencampur `created_at`, `createdAt`, dan `tanggalBuat` memaksa setiap klien menghafal pengecualian.

**Kapan REST boleh dilonggarkan.** Beberapa perbuatan memang bukan penciptaan atau pembaruan sumber daya: membatalkan, mengirim ulang, menyetujui, menghitung ulang. Untuk itu, buat sub-sumber daya yang mewakili perbuatannya:

```text
POST /v1/pesanan/{id}/pembatalan
POST /v1/pesanan/{id}/pengiriman-ulang-struk
POST /v1/laporan/{id}/perhitungan-ulang
```

Bentuk ini lebih baik daripada `POST /v1/pesanan/{id}/cancel` karena hasilnya bisa jadi sumber daya yang punya id, status, dan riwayat sendiri. Pembatalan yang gagal punya tempat untuk dicatat.

## Pagination yang tidak bohong

Inilah pertanyaan pertama engineer Android itu, dan jawabannya menentukan apakah aplikasinya bisa dipercaya.

**Cara yang biasa dipakai, dan bermasalah:**

```text
GET /v1/pesanan?halaman=3&perHalaman=20
```

Masalahnya muncul pada data yang berubah. Pengguna ada di halaman 3, lalu dua pesanan baru masuk di urutan paling atas. Saat dia membuka halaman 4, dua pesanan yang seharusnya dia lihat sudah bergeser ke halaman 3 yang sudah terlewat. Dua data hilang dari pandangannya, dan dua data lain tampil dua kali.

**Cara yang benar untuk data yang berubah, yaitu kursor:**

```text
GET /v1/pesanan?limit=20
GET /v1/pesanan?limit=20&kursor=eyJkIjoiMjAyNi0xMi0wNVQxMDoxMiIsImkiOiJhYmMifQ
```

```json
{
  "data": [{ "id": "...", "total": 125000 }],
  "kursorBerikutnya": "eyJkIjoiMjAyNi0xMi0wNVQxMDoxMiIsImkiOiJhYmMifQ",
  "adaLagi": true
}
```

Isi kursor itu posisi baris terakhir, bukan nomor urut: gabungan nilai pengurut dan id sebagai pemecah seri, lalu di-encode. Dengan begitu permintaan berikutnya berarti "yang setelah baris ini", bukan "lewati 60 baris".

Tiga aturan yang membuatnya bekerja:

**Satu, urutannya harus stabil dan unik.** Mengurutkan hanya dengan `dibuatPada` tidak cukup, karena dua baris bisa punya waktu yang persis sama lalu urutannya berubah antar permintaan. Selalu tambahkan id sebagai pengurut kedua.

**Dua, kursor diperlakukan sebagai penanda buram.** Klien tidak boleh menyusunnya sendiri, dan Anda bebas mengubah isinya. Encode supaya tidak ada yang tergoda menguraikannya.

**Tiga, jangan kirim jumlah total kecuali diminta.** Menghitung `COUNT(*)` pada tabel besar dengan filter bisa jauh lebih mahal daripada mengambil datanya sendiri. Kalau pemakai butuh, sediakan sebagai parameter terpisah atau nilai perkiraan.

Kapan nomor halaman masih boleh: data yang hampir tidak berubah, dan antarmuka yang memang butuh melompat ke halaman tertentu, misalnya laporan arsip. Untuk daftar yang hidup, pakai kursor.

## Idempotency: mencegah transaksi dobel

Pertanyaan kedua engineer Android: jaringan mati sebelum respons sampai, lalu dia mencoba lagi. Apakah dua pesanan terbuat?

Tanpa penanganan, jawabannya ya. POST tidak idempoten, seperti di tabel modul 1. Dan ini bukan kasus langka: jaringan seluler di Indonesia membuat permintaan terputus setiap hari, dan hampir semua klien HTTP mengulang secara otomatis.

Polanya begini:

```http
POST /v1/pesanan
Idempotency-Key: 01JEX8Q7K9S4V2M6YB3PT0ZQ5R
Content-Type: application/json

{ "item": [{ "produkId": "...", "jumlah": 2 }] }
```

```ts
// Jalur yang dijalankan server
async function buatPesanan(penggunaId: string, kunci: string, masukan: MasukanPesanan) {
  const sidikJari = hashStabil({ penggunaId, masukan });

  const catatan = await repoIdempotency.ambil(kunci);

  if (catatan) {
    // Kunci sama, isi berbeda: klien keliru memakai ulang kunci
    if (catatan.sidikJari !== sidikJari) {
      throw new ErrorKonflik('Kunci idempotency sudah dipakai untuk permintaan lain');
    }

    // Masih diproses: jangan kerjakan dua kali
    if (catatan.status === 'diproses') {
      throw new ErrorKonflik('Permintaan dengan kunci ini masih diproses');
    }

    // Sudah selesai: kembalikan respons yang sama persis
    return catatan.respons;
  }

  await repoIdempotency.kunci({ kunci, sidikJari, penggunaId });

  const pesanan = await layanan.buat(penggunaId, masukan);

  await repoIdempotency.selesaikan(kunci, { status: 201, body: pesanan });

  return pesanan;
}
```

Empat keputusan yang harus Anda ambil, dan sebutkan di dokumentasi:

| Keputusan | Pilihan yang wajar |
| --- | --- |
| Siapa yang membuat kunci | Klien, dengan UUID atau ULID |
| Berapa lama kunci disimpan | 24 jam sampai 7 hari, sesuai perilaku klien |
| Apa yang terjadi kalau isi berbeda | 409, karena ini kesalahan klien yang perlu diketahui |
| Endpoint mana yang wajib pakai kunci | Semua yang membuat atau memindahkan nilai |

Dan satu hal yang sering terlewat: **respons yang dikembalikan harus sama persis, termasuk status code.** Mengembalikan `200` pada percobaan ulang padahal aslinya `201` membuat klien yang memeriksa status jadi bingung.

Untuk endpoint yang tidak menerima kunci dari klien, ada jalan lain yang sering lebih baik: jadikan operasinya idempoten secara alami. `PUT /v1/keranjang/{penggunaId}/item/{produkId}` dengan body `{ "jumlah": 2 }` menghasilkan keadaan akhir yang sama berapa kali pun dikirim, tanpa perlu kunci apa pun.

## Angka, tanggal, dan id

Tiga hal kecil yang menimbulkan kerusakan besar.

**Uang: bilangan bulat dalam satuan terkecil.**

```json
{ "total": 125000, "mataUang": "IDR" }
```

Jangan `125000.00` sebagai bilangan pecahan, dan jangan string angka tanpa keterangan satuan. Bilangan pecahan biner tidak bisa menyimpan nilai uang dengan tepat, dan penjumlahan berulang menghasilkan selisih yang muncul di laporan. Sebutkan satuannya di dokumentasi: untuk rupiah, satuan terkecil adalah rupiah, bukan sen.

**Tanggal: ISO 8601 dengan zona waktu, selalu UTC di penyimpanan.**

```json
{ "dibuatPada": "2026-12-05T03:12:44.000Z", "jatuhTempo": "2026-12-12" }
```

Dua bentuk berbeda untuk dua hal berbeda: `dibuatPada` adalah **momen** sehingga butuh zona waktu, sedangkan `jatuhTempo` adalah **tanggal kalender** yang tidak boleh bergeser karena zona waktu. Mencampur keduanya menghasilkan bug yang hanya muncul untuk pengguna di luar zona waktu server, atau hanya pada jam tertentu.

**Id: jangan pakai nomor urut yang terlihat publik.**

| Pilihan | Catatan |
| --- | --- |
| `bigint` berurutan | Bocor informasi: pesaing bisa tahu Anda punya berapa pesanan, dan id orang lain mudah ditebak |
| UUIDv4 | Aman, acak, dan buruk sebagai kunci indeks karena tidak berurutan |
| **UUIDv7 atau ULID** | Acak sekaligus berurutan menurut waktu. Pilihan bawaan yang baik |
| Nomor urut internal + id publik | Dipakai saat performa indeks sangat kritis |

Modul 9 menjelaskan kenapa keberurutan penting untuk indeks. Untuk sekarang cukup: pakai UUIDv7 atau ULID.

## Memperbarui sebagian, dan jebakan `null`

```http
PATCH /v1/profil/saya
{ "nomorTelepon": null }
```

Apa artinya? Ada dua tafsiran yang sama-sama masuk akal: "hapus nomor telepon saya", atau "saya tidak mengubah nomor telepon". Dan kalau Anda tidak memutuskannya, klien yang berbeda akan menebak berbeda.

Aturan yang jelas dan paling banyak dipakai, yaitu JSON Merge Patch: **field yang tidak disertakan berarti tidak berubah, dan `null` berarti dihapus.** Tulis itu di dokumentasi, dan terapkan di skema:

```ts
const patchProfil = z.object({
  nama: z.string().trim().min(3).max(80).optional(),
  // undefined = tidak diubah, null = dikosongkan
  nomorTelepon: z.string().regex(/^0\d{8,13}$/).nullable().optional(),
  bio: z.string().max(300).nullable().optional(),
});
```

Dan di lapisan service, bedakan keduanya dengan sengaja:

```ts
const perubahan: Record<string, unknown> = {};

if ('nama' in masukan) perubahan.nama = masukan.nama;
if ('nomorTelepon' in masukan) perubahan.nomorTelepon = masukan.nomorTelepon; // bisa null
```

Memakai `masukan.nama !== undefined` di sini juga benar, tapi `'nama' in masukan` menyatakan maksudnya lebih jelas: yang diperiksa adalah kehadiran field, bukan nilainya.

## Operasi panjang dan operasi massal

**Yang butuh waktu lama** tidak dikerjakan di dalam permintaan, seperti di modul 2:

```http
POST /v1/ekspor-pesanan
→ 202 Accepted
   Location: /v1/pekerjaan/01JEX8...

GET /v1/pekerjaan/01JEX8...
→ 200 { "status": "diproses", "progres": 0.4 }
→ 200 { "status": "selesai", "unduhan": "https://..." }
```

**Operasi massal** butuh satu keputusan di depan: apakah seluruhnya harus berhasil, atau boleh sebagian?

```json
POST /v1/produk/impor
{ "item": [ ... 500 produk ... ] }

→ 200
{
  "berhasil": 486,
  "gagal": 14,
  "kegagalan": [
    { "indeks": 12, "kode": "VALIDASI_GAGAL", "pesan": "harga harus positif" },
    { "indeks": 97, "kode": "DUPLIKAT", "pesan": "SKU sudah ada" }
  ]
}
```

Dua hal yang wajib ada pada bentuk seperti ini: **penunjuk posisi** supaya klien tahu baris mana yang gagal, dan **kode yang stabil** per kegagalan. Mengembalikan `400` dengan pesan "14 item gagal" tanpa menyebut yang mana memaksa pemakai mengirim ulang semuanya dan menebak.

Kalau operasinya harus seluruhnya atau tidak sama sekali, katakan begitu, dan pakai transaksi dari modul 8.

## Mengubah API tanpa merusak klien

Ini pertanyaan keempat engineer Android, dan jawabannya satu daftar.

**Yang aman ditambahkan kapan saja:**

- Field baru di respons.
- Endpoint baru.
- Parameter kueri baru yang opsional, dengan nilai bawaan yang mempertahankan perilaku lama.
- Nilai baru pada enum **di dalam masukan**, selama nilai lama tetap diterima.

**Yang merusak, meski terlihat kecil:**

| Perubahan | Kenapa merusak |
| --- | --- |
| Menghapus atau mengganti nama field | Klien lama membacanya dan mendapat `undefined` |
| Mengubah tipe field | `"125000"` jadi `125000` memecahkan parsing yang ketat |
| Mengubah satuan atau makna | Rupiah jadi sen: angka terlihat masuk akal, nilainya seratus kali salah |
| Menambah nilai enum **di respons** | Klien dengan `switch` tanpa cabang bawaan akan tersandung |
| Mewajibkan field masukan yang dulu opsional | Permintaan lama langsung ditolak |
| Mengubah status code untuk keadaan yang sama | Logika percobaan ulang klien berubah perilakunya |
| Memperketat validasi | Data yang dulu diterima jadi ditolak |
| Mengubah urutan bawaan | Klien yang mengandalkan urutan menampilkan hal yang salah |

Baris keempat sering mengejutkan: menambah status `menunggu_verifikasi` ke enum respons adalah perubahan yang merusak, karena klien lama tidak tahu harus menampilkan apa. Karena itu dokumentasikan sejak awal bahwa klien **harus** punya penanganan bawaan untuk nilai yang tidak dikenal.

Soal versi, dua pendekatan yang dipakai:

| Cara | Contoh | Catatan |
| --- | --- | --- |
| Di path | `/v1/pesanan` | Paling terlihat, paling mudah dirute, paling umum |
| Di header | `API-Version: 2026-12-01` | Lebih halus, dan versi berbasis tanggal memudahkan perubahan bertahap |

Pilih satu, dan naikkan versi hanya saat benar-benar perlu. Setiap versi yang hidup adalah kode yang harus dirawat. Pola yang lebih murah: tambahkan secara aditif selama mungkin, dan ubah versi hanya untuk perubahan besar.

Saat sebuah endpoint akan dihentikan, beri jalan keluar:

```http
Deprecation: true
Sunset: Wed, 01 Jul 2027 00:00:00 GMT
Link: </v2/pesanan>; rel="successor-version"
```

Lalu, dan ini bagian yang sering dilewati: **ukur siapa yang masih memakainya.** Catat jumlah permintaan per versi per klien, hubungi pemakainya, dan matikan setelah angkanya mendekati nol. Mengumumkan di changelog tanpa mengukur pemakaian adalah cara menimbulkan insiden yang bisa dihindari.

## Dokumentasi yang tidak pernah kedaluwarsa

Dokumentasi yang ditulis tangan akan salah dalam dua minggu. Satu-satunya yang bertahan adalah dokumentasi yang dihasilkan dari kode yang benar-benar berjalan, dan skema dari modul 3 sudah menyediakan bahannya.

```ts
await app.register(import('@fastify/swagger'), {
  openapi: {
    info: { title: 'API Perpustakaan', version: '1.0.0' },
    servers: [{ url: 'https://api.contoh.com' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  transform: jsonSchemaTransform, // dari fastify-type-provider-zod
});

await app.register(import('@fastify/swagger-ui'), { routePrefix: '/dokumentasi' });
```

Dua manfaat yang langsung terasa: pemakai API bisa mencoba endpoint dari peramban, dan klien bertipe untuk TypeScript, Kotlin, atau Swift bisa dihasilkan otomatis dari berkas OpenAPI yang sama.

Satu kebiasaan yang pantas ditiru dari tim yang API-nya enak dipakai: **telaah desain sebelum kode ditulis.** Satu halaman berisi nama endpoint, bentuk masukan dan keluaran, daftar error, dan contoh permintaan. Lima belas menit percakapan di tahap itu menghemat perubahan yang merusak enam bulan kemudian.

## Kapan bukan REST

| Pilihan | Cocok untuk | Harganya |
| --- | --- | --- |
| **REST + JSON** | API publik, klien beragam, kebanyakan kasus | Klien kadang mengambil lebih banyak data daripada yang dibutuhkan |
| **GraphQL** | Banyak klien dengan kebutuhan data berbeda, satu endpoint | Kerumitan di server: kedalaman kueri, N+1, caching, batas biaya kueri |
| **gRPC** | Komunikasi antar layanan internal, latensi rendah | Tidak ramah peramban, butuh perkakas tambahan. Modul 22 |
| **tRPC** | Monorepo TypeScript, klien dan server satu tim | Terikat TypeScript, tidak cocok untuk API publik |

Patokan praktis: REST untuk apa pun yang dipakai pihak luar, gRPC untuk antar layanan Anda sendiri, GraphQL kalau Anda punya banyak klien dengan kebutuhan yang benar-benar berbeda dan siap mengurus biaya kerumitannya.

## Latihan

### Latihan 1: Rancang ulang API yang buruk

API ini sudah berjalan dan dikeluhkan semua pemakainya. Rancang ulang seluruhnya, dan sebutkan alasan setiap perubahan.

```text
POST /getBooks            body: { "userId": 12, "page": 2 }
POST /addBook             body: { "title": "...", "price": "85.000,00" }
POST /updateBookStatus    body: { "id": 5, "status": 2 }
POST /deleteBook          body: { "id": 5 }
GET  /books/all
POST /borrowBook          body: { "bookId": 5, "memberId": 12 }
```

> [!petunjuk]
> Periksa lima lapis: penamaan dan method, cara membagi halaman, tipe dan satuan, nilai berkode angka, dan apa yang terjadi kalau `borrowBook` dikirim dua kali.

> [!jawaban]
>
> ```text
> GET    /v1/buku?limit=20&kursor=...&status=tersedia
> GET    /v1/buku/{id}
> POST   /v1/buku                     Idempotency-Key wajib
> PATCH  /v1/buku/{id}
> DELETE /v1/buku/{id}
> POST   /v1/peminjaman                Idempotency-Key wajib
> GET    /v1/peminjaman?anggotaId=...&status=berjalan
> POST   /v1/peminjaman/{id}/pengembalian
> ```
>
> Sepuluh masalah pada versi lama:
>
> | # | Masalah | Perbaikan |
> | --- | --- | --- |
> | 1 | Semuanya POST, termasuk pembacaan | Pembacaan pakai GET, supaya bisa di-cache dan diulang dengan aman |
> | 2 | Nama berupa perbuatan | Nama berupa benda, perbuatan ditentukan method |
> | 3 | `userId` dikirim di body | Diambil dari sesi. Mengirimnya sendiri berarti siapa pun bisa membaca data orang lain |
> | 4 | Pagination berbasis nomor halaman | Kursor, karena daftar buku berubah |
> | 5 | `"85.000,00"` sebagai string berformat lokal | `8500000` sebagai bilangan bulat rupiah, plus `mataUang` |
> | 6 | `status: 2` berupa angka | `status: "dipinjam"` sebagai enum yang bisa dibaca |
> | 7 | `/books/all` tanpa batas | Semua daftar wajib punya `limit` dengan nilai bawaan dan maksimum |
> | 8 | `borrowBook` tidak idempoten | Kunci idempotency, atau peminjaman jadi sumber daya dengan id |
> | 9 | Peminjaman tidak punya identitas | Jadi sumber daya `/v1/peminjaman/{id}` yang punya status dan riwayat |
> | 10 | Tidak ada versi | `/v1` dari awal, karena menambahkannya nanti adalah perubahan yang merusak |
>
> Nomor 3 pantas ditekankan: mengirim `userId` di body adalah celah otorisasi yang paling sering ditemui di API buatan sendiri. Identitas pemanggil **selalu** berasal dari kredensialnya, bukan dari isi permintaan yang bisa dia ubah sendiri.
>
> Nomor 9 adalah pergeseran cara berpikir yang paling berharga di latihan ini: perbuatan "meminjam" sebenarnya menciptakan sebuah benda, yaitu catatan peminjaman, yang punya tanggal jatuh tempo, status, denda, dan riwayat. Begitu Anda melihatnya sebagai benda, semua operasi lanjutannya punya tempat yang jelas.

### Latihan 2: Pasang idempotency

Terapkan idempotency pada `POST /v1/peminjaman` dengan lima syarat: kunci wajib dan ditolak kalau tidak ada, percobaan ulang mengembalikan respons dan status yang sama persis, kunci sama dengan isi berbeda ditolak 409, permintaan yang masih diproses ditolak 409, dan kunci kedaluwarsa setelah 24 jam.

> [!pembahasan]
>
> ```ts
> interface CatatanIdempotency {
>   kunci: string;
>   penggunaId: string;
>   sidikJari: string;
>   status: 'diproses' | 'selesai';
>   respons?: { status: number; body: unknown };
>   kedaluwarsaPada: Date;
> }
>
> export async function denganIdempotency<T>(
>   ctx: { kunci: string; penggunaId: string; masukan: unknown },
>   kerjakan: () => Promise<{ status: number; body: T }>
> ): Promise<{ status: number; body: T }> {
>   const sidikJari = createHash('sha256')
>     .update(JSON.stringify({ p: ctx.penggunaId, m: ctx.masukan }))
>     .digest('hex');
>
>   // Penulisan bersyarat: hanya berhasil kalau kuncinya belum ada.
>   // Satu operasi atomik, bukan "periksa dulu lalu tulis".
>   const terkunci = await repo.kunciKalauBelumAda({
>     kunci: ctx.kunci,
>     penggunaId: ctx.penggunaId,
>     sidikJari,
>     status: 'diproses',
>     kedaluwarsaPada: new Date(Date.now() + 24 * 3600_000),
>   });
>
>   if (!terkunci) {
>     const ada = await repo.ambil(ctx.kunci);
>
>     if (!ada) throw new ErrorKonflik('Kunci idempotency sedang dipakai');
>     if (ada.penggunaId !== ctx.penggunaId) throw new ErrorTidakDitemukan();
>     if (ada.sidikJari !== sidikJari) {
>       throw new ErrorKonflik('Kunci ini sudah dipakai untuk permintaan berbeda');
>     }
>     if (ada.status === 'diproses') {
>       throw new ErrorKonflik('Permintaan dengan kunci ini masih diproses');
>     }
>
>     return ada.respons as { status: number; body: T };
>   }
>
>   try {
>     const hasil = await kerjakan();
>     await repo.selesaikan(ctx.kunci, hasil);
>     return hasil;
>   } catch (error) {
>     // Kegagalan tidak boleh mengunci kunci selamanya
>     await repo.hapus(ctx.kunci);
>     throw error;
>   }
> }
> ```
>
> Enam keputusan yang membuatnya benar, dan masing-masing pernah jadi insiden nyata di suatu tempat:
>
> 1. **`kunciKalauBelumAda` adalah satu operasi atomik**, bukan "periksa lalu tulis". Dua permintaan yang datang pada milidetik yang sama akan sama-sama lolos pemeriksaan kalau dipisah. Modul 8 membahas kenapa, dan di Postgres ini jadi `INSERT ... ON CONFLICT DO NOTHING`.
> 2. **Kunci dibatasi per pengguna.** Tanpa itu, pengguna A bisa menebak kunci pengguna B dan membaca responsnya, yang bisa berisi data pribadi.
> 3. **Sidik jari dari isi permintaan.** Ini yang membedakan "percobaan ulang" dari "klien keliru memakai ulang kunci".
> 4. **Respons disimpan utuh, termasuk status code.** Percobaan ulang mengembalikan `201` yang sama, bukan `200`.
> 5. **Kunci dihapus saat gagal.** Kalau tidak, klien yang ingin mencoba lagi dengan kunci yang sama akan terus mendapat 409 sampai kunci kedaluwarsa.
> 6. **Ada masa berlaku.** Tabel idempotency yang tidak pernah dibersihkan akan jadi tabel terbesar di basis data Anda.
>
> Satu catatan tentang nomor 5: untuk operasi keuangan, menghapus kunci saat gagal justru berbahaya kalau Anda tidak yakin apakah pekerjaannya sudah separuh jalan. Pada kasus itu, catat sebagai `gagal` beserta alasannya, dan minta klien memakai kunci baru. Pilihan ini ditentukan oleh seberapa mahal akibat pengerjaan ganda.

### Latihan 3: Rancang kursor

Rancang kursor untuk `GET /v1/peminjaman` yang mendukung tiga pengurutan: terbaru, jatuh tempo terdekat, dan nama anggota. Jelaskan isi kursornya, cara membangunnya, dan apa yang terjadi kalau klien mengirim kursor dari pengurutan yang berbeda.

> [!jawaban]
>
> ```ts
> // Kursor memuat pengurutnya, supaya tidak bisa dipakai lintas urutan
> interface IsiKursor {
>   u: 'terbaru' | 'jatuh-tempo' | 'nama';
>   n: string; // nilai pengurut baris terakhir
>   i: string; // id baris terakhir, sebagai pemecah seri
> }
>
> const encode = (isi: IsiKursor) =>
>   Buffer.from(JSON.stringify(isi)).toString('base64url');
>
> function decode(kursor: string, urutSekarang: string): IsiKursor {
>   try {
>     const isi = skemaKursor.parse(JSON.parse(Buffer.from(kursor, 'base64url').toString()));
>
>     // Kursor dari urutan lain tidak bermakna di urutan ini
>     if (isi.u !== urutSekarang) {
>       throw new ErrorAplikasi('Kursor tidak cocok dengan urutan', 400, 'KURSOR_TIDAK_VALID');
>     }
>
>     return isi;
>   } catch {
>     throw new ErrorAplikasi('Kursor tidak valid', 400, 'KURSOR_TIDAK_VALID');
>   }
> }
> ```
>
> Kueri yang dihasilkan, dengan bentuk perbandingan pasangan nilai:
>
> ```sql
> -- terbaru: menurun berdasarkan dibuat_pada, lalu id
> SELECT * FROM peminjaman
> WHERE (dibuat_pada, id) < ($1, $2)
> ORDER BY dibuat_pada DESC, id DESC
> LIMIT $3;
> ```
>
> Empat hal yang jadi inti latihan ini:
>
> 1. **Pengurut ikut di dalam kursor.** Tanpa itu, klien yang mengganti urutan sambil membawa kursor lama akan mendapat hasil yang acak dan sulit dijelaskan. Menolaknya dengan 400 lebih baik daripada mengembalikan data yang salah.
> 2. **Perbandingan pasangan `(nilai, id)`** menangani nilai yang sama dengan benar. Memakai `WHERE dibuat_pada < $1` saja akan melewatkan baris yang waktunya persis sama.
> 3. **Pengurutan berdasarkan nama butuh perhatian lebih.** Nama tidak unik, bisa berubah, dan urutannya bergantung pada aturan kolasi basis data. Kalau sebuah nama diubah saat pengguna sedang membuka halaman, baris itu bisa terlewat. Sebutkan batas ini di dokumentasi.
> 4. **Kursor yang tidak valid dijawab 400, bukan 500.** Kursor datang dari luar, jadi harus divalidasi seperti masukan lain, dan `JSON.parse` di dalamnya wajib dibungkus.
>
> Satu catatan performa yang akan dibuktikan di modul 9: kueri ini hanya cepat kalau ada indeks komposit pada kolom yang sama persis dengan `ORDER BY`. Tiga pengurutan berarti tiga indeks, dan itu keputusan yang punya biaya penyimpanan serta biaya penulisan.

### Latihan 4: Merusak atau tidak

Untuk sepuluh perubahan berikut, tentukan apakah merusak klien lama, dan kalau ya, bagaimana cara melakukannya dengan aman.

| # | Perubahan |
| --- | --- |
| 1 | Menambah field `dendaRp` ke respons peminjaman |
| 2 | Mengganti nama `judul` jadi `namaBuku` |
| 3 | Menambah nilai `"hilang"` ke enum status peminjaman |
| 4 | Mengubah `limit` bawaan dari 20 jadi 50 |
| 5 | Mengubah `total` dari rupiah jadi sen |
| 6 | Mewajibkan header `Idempotency-Key` pada `POST /v1/peminjaman` |
| 7 | Menambah parameter opsional `?sertakanDihapus=true` |
| 8 | Mengubah 404 jadi 403 untuk buku milik perpustakaan lain |
| 9 | Memperketat validasi `judul` dari 200 jadi 120 huruf |
| 10 | Mengurutkan daftar dari terbaru, yang sebelumnya tidak ditentukan |

> [!jawaban]
>
> | # | Merusak? | Cara aman |
> | --- | --- | --- |
> | 1 | Tidak | Tambahkan saja. Klien yang mengabaikan field tak dikenal tetap jalan |
> | 2 | **Ya** | Kirim keduanya, tandai `judul` usang dengan `Sunset`, hapus setelah pemakaiannya nol |
> | 3 | **Ya** | Dokumentasikan sejak awal bahwa klien butuh penanganan bawaan. Kalau terlambat, luncurkan di versi baru |
> | 4 | **Ya**, secara halus | Klien bisa mengandalkan jumlah 20. Pertahankan bawaan lama, dorong klien mengirim `limit` eksplisit |
> | 5 | **Ya, dan paling berbahaya** | Jangan. Buat field baru `totalSen` dan hentikan yang lama secara bertahap |
> | 6 | **Ya** | Terima tanpa kunci dulu sambil mencatat peringatan, hubungi pemakainya, baru wajibkan |
> | 7 | Tidak | Bawaannya harus mempertahankan perilaku lama |
> | 8 | **Ya**, dan juga memburuk | Jangan. 404 memang pilihan yang benar, lihat modul 11 |
> | 9 | **Ya** | Terapkan hanya untuk data baru, atau tolak di versi baru. Data lama yang sudah 200 huruf tetap harus bisa dibaca dan disimpan ulang |
> | 10 | **Ya**, secara halus | Urutan yang tidak ditentukan sering diandalkan diam-diam. Umumkan, dan uji dengan klien utama |
>
> Nomor 5 adalah jenis perubahan yang paling merusak dan paling sulit dideteksi, karena **tidak ada yang error.** Semua permintaan tetap 200, semua angka tetap terlihat masuk akal, dan setiap tagihan seratus kali lebih besar. Kalau perubahan satuan benar-benar tak terhindarkan, lakukan lewat field baru dengan nama berbeda, supaya kesalahan menghasilkan `undefined` yang segera terlihat, bukan angka yang salah tanpa suara.
>
> Nomor 10 mengajarkan satu hal tentang kontrak: apa pun yang bisa diandalkan klien, akan diandalkan klien, termasuk hal yang tidak pernah Anda janjikan. Karena itu tentukan urutan bawaan secara eksplisit sejak versi pertama, dan tulis di dokumentasi.

## Batasnya

Desain API yang baik tidak menyelesaikan tiga hal.

**Datanya masih belum ke mana-mana.** Semua endpoint di modul ini masih bisa kehilangan seluruh isinya saat proses dimatikan.

**Bentuk API tidak menjamin kebenaran isi.** Idempotency key mencegah permintaan diproses dua kali. Dua permintaan berbeda yang sama-sama mengambil buku terakhir adalah masalah lain, dan itu modul 8.

**Dokumentasi tidak menggantikan percakapan.** API yang enak dipakai lahir dari mendengarkan pemakainya, bukan dari mengikuti aturan REST dengan patuh. Kalau klien Anda selalu memanggil tiga endpoint berurutan untuk satu layar, mungkin yang mereka butuhkan satu endpoint yang memang dirancang untuk layar itu.

## Rangkuman

- Kode internal bisa ditulis ulang, bentuk API tidak. Setiap keputusan di sini bertahan bertahun-tahun.
- Namai benda, bukan perbuatan. Perbuatan yang tidak cocok dengan CRUD jadi sub-sumber daya yang punya id dan status sendiri.
- Pagination berbasis nomor halaman melewatkan dan menggandakan data pada daftar yang berubah. Pakai kursor dengan pengurut yang stabil dan unik.
- Identitas pemanggil selalu dari kredensialnya, tidak pernah dari isi permintaan.
- Idempotency key dengan sidik jari isi, respons yang disimpan utuh, 409 untuk yang masih diproses, dan masa berlaku. Atau rancang operasinya agar idempoten secara alami dengan PUT.
- Uang sebagai bilangan bulat satuan terkecil, momen sebagai ISO 8601 UTC, tanggal kalender sebagai tanggal saja, dan id sebagai UUIDv7 atau ULID.
- Pada PATCH, field yang tidak ada berarti tidak berubah dan `null` berarti dikosongkan. Tulis itu di dokumentasi.
- Operasi panjang dijawab 202 dengan sumber daya pekerjaan. Operasi massal melaporkan kegagalan per posisi dengan kode yang stabil.
- Perubahan aditif aman, perubahan satuan adalah yang paling berbahaya karena tidak menimbulkan error. Ukur pemakaian sebelum mematikan apa pun.
- Dokumentasi dihasilkan dari skema yang sama yang memvalidasi permintaan, sehingga tidak bisa kedaluwarsa.

## Masalah terbuka

Anda sekarang punya API yang dirancang, tervalidasi, terdokumentasi, dan tahan permintaan ganda. Saatnya membuktikannya pada satu layanan utuh.

Bagian berikutnya adalah Proyek 1: API perpustakaan dengan aturan bisnis yang sungguhan, penyimpanan di memori, dan dokumentasi OpenAPI yang bisa dicoba dari peramban.

Satu hal akan terasa mengganggu selama mengerjakannya, dan itu memang disengaja: setiap kali Anda menyalakan ulang server, semua buku, anggota, dan peminjaman lenyap. Catat setiap kali Anda terganggu olehnya, karena modul berikutnya dimulai dari situ.
