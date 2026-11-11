---
title: 'Modul 23: Dari Monolit ke Beberapa Layanan'
description: Masalahnya bukan skala lalu lintas, melainkan koordinasi antar manusia yang muncul sebagai masalah kode. Batas modul yang ditegakkan, kapan memecah layanan menjawab masalahnya, dan harganya.
date: 2026-12-30
slug: modul-23-dari-monolit-ke-layanan
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Lima keluhan dari akhir modul 22, dan satu kesamaan di antara semuanya:

| Keluhan | Akar masalahnya |
| --- | --- |
| Pull request menunggu dua hari karena pemiliknya tidak jelas | Kepemilikan kode tidak tertulis |
| Dua tim bentrok di berkas yang sama setiap minggu | Batas modul tidak ada |
| Satu tim menunggu tim lain untuk merilis | Satu jalur rilis untuk semua |
| Pipeline dari 9 menit jadi 25 menit | Semua test berjalan untuk setiap perubahan |
| Tidak ada yang berani mengubah modul pembayaran | Ketergantungan tidak terlihat |

Tidak satu pun soal lalu lintas. Tidak satu pun diselesaikan dengan server yang lebih besar.

Dan di situlah kesalahpahaman terbesar tentang microservice: microservice dijual sebagai jawaban untuk skala, padahal masalah yang benar-benar diselesaikannya adalah **skala organisasi.** Layanan terpisah memberi satu hal yang tidak bisa diberikan monolit: tim bisa merilis tanpa menunggu tim lain.

Harganya nyata, dan modul ini membahas keduanya: cara mendapat sebagian besar manfaatnya tanpa memecah apa pun, dan cara memecahnya kalau memang perlu.

## Analogi: satu kantor, beberapa divisi, atau beberapa gedung

Tiga bentuk organisasi kantor, dan masing-masing menyelesaikan masalah yang berbeda.

**Satu ruangan besar tanpa pembatas.** Semua orang mengerjakan semuanya. Pada lima orang, ini paling efisien: tidak ada rapat koordinasi, dan siapa pun bisa membantu siapa pun. Pada lima puluh orang, ruangan itu berisik dan tidak ada yang tahu siapa yang bertanggung jawab atas apa.

**Satu gedung, divisi dengan ruangan sendiri.** Setiap divisi punya ruangan, pintu, dan kepala divisi. Mereka masih berbagi gedung, resepsionis, dan sistem surat, jadi koordinasinya murah. Perubahan di ruangan sendiri tidak mengganggu yang lain.

**Gedung terpisah di kota berbeda.** Setiap divisi punya gedung, resepsionis, dan sistem suratnya sendiri. Kemandirian penuh, dan harganya: surat antar gedung butuh kurir yang bisa terlambat atau hilang, dan tidak ada lagi percakapan singkat di koridor.

| Dunia kantor | Dunia backend |
| --- | --- |
| Satu ruangan tanpa pembatas | Monolit tanpa batas modul |
| Divisi dengan ruangan sendiri | **Monolit modular** |
| Gedung terpisah | Layanan terpisah |
| Resepsionis bersama | Basis data dan jalur rilis bersama |
| Kurir antar gedung | Panggilan jaringan, yang bisa gagal |
| Percakapan singkat di koridor | Pemanggilan fungsi langsung |
| Papan nama divisi di pintu | `CODEOWNERS` |
| Surat resmi antar divisi | Kontrak API internal |

Batas analoginya yang menentukan: memindahkan divisi ke gedung lain bisa dibatalkan dalam sebulan, sedangkan memecah layanan dengan basis data terpisah sangat sulit dibatalkan. Itu sebabnya urutan yang benar adalah ruangan dulu, gedung nanti.

## Monolit modular: dapatkan dulu yang murah

Empat dari lima keluhan di awal modul bisa diselesaikan **tanpa memecah apa pun.**

```text
src/
├── modul/
│   ├── katalog/
│   │   ├── publik.ts        <- satu-satunya pintu masuk modul ini
│   │   ├── layanan.ts
│   │   ├── repo.ts
│   │   ├── skema.sql        <- tabel milik modul ini
│   │   └── rute.ts
│   ├── pesanan/
│   │   ├── publik.ts
│   │   └── ...
│   ├── pembayaran/
│   ├── gudang/
│   └── identitas/
├── bersama/
│   ├── db.ts
│   ├── log.ts
│   ├── error.ts
│   └── peristiwa.ts         <- kontrak peristiwa, dipakai semua modul
└── app.ts
```

Tiga aturan yang membuatnya bekerja, dan ketiganya harus **ditegakkan mesin**, bukan diimbau:

**Satu, modul hanya boleh diimpor lewat `publik.ts`.**

```ts
// modul/pesanan/publik.ts
// Satu-satunya yang boleh diimpor modul lain. Semuanya bertipe.
export type { Pesanan, StatusPesanan } from './tipe.js';

export async function ambilRingkasanPesanan(
  pelaku: Pelaku,
  pesananId: string
): Promise<RingkasanPesanan | null> {
  /* ... */
}

// Yang TIDAK diekspor: repo, kueri, tabel, dan fungsi internal
```

```js
// eslint.config.mjs: batas ditegakkan linter
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          // Impor ke dalam modul lain selain publik.ts: dilarang
          group: ['**/modul/*/!(publik)', '**/modul/*/!(publik)/**'],
          message: 'Impor modul lain hanya lewat publik.ts',
        },
      ],
    }],
  },
}
```

**Dua, setiap tabel punya modul pemilik, dan hanya pemiliknya yang menyentuhnya.**

```sql
-- Skema terpisah per modul membuat kepemilikan terlihat dan bisa ditegakkan
CREATE SCHEMA katalog;
CREATE SCHEMA pesanan;
CREATE SCHEMA pembayaran;

-- Dan peran basis data per modul, kalau Anda ingin ditegakkan mesin
CREATE ROLE modul_pesanan;
GRANT USAGE ON SCHEMA pesanan TO modul_pesanan;
GRANT SELECT ON katalog.produk TO modul_pesanan;   -- baca saja, eksplisit
```

**Tiga, kepemilikan kode tertulis.**

```text
# CODEOWNERS
/src/modul/katalog/      @tim-katalog
/src/modul/pesanan/      @tim-pesanan
/src/modul/pembayaran/   @tim-pembayaran @tim-keamanan
/src/bersama/            @tim-platform
/src/modul/*/publik.ts   @tim-platform    # perubahan kontrak ditelaah lebih ketat
```

Dengan tiga aturan itu, empat keluhan selesai: pemilik jelas, bentrok berkas hampir hilang karena tim bekerja di folder berbeda, dan ketergantungan jadi terlihat karena semuanya lewat `publik.ts`. Dan pipeline bisa dipercepat dengan menjalankan test hanya untuk modul yang tersentuh:

```bash
# Hanya test modul yang berubah, ditambah modul yang bergantung padanya
pnpm vitest run $(skrip/modul-terdampak.js)
```

Satu keluhan yang **tidak** selesai: jalur rilis yang masih satu. Dan kalau itu memang hambatan terbesar Anda, barulah pemecahan layanan masuk pembicaraan.

## Kapan memecah, dan kapan tidak

| Pecah layanan kalau | Jangan pecah kalau |
| --- | --- |
| Tim harus menunggu tim lain untuk merilis, dan itu sering | Tim masih di bawah 15 orang |
| Satu bagian butuh penskalaan yang sangat berbeda | Alasannya "supaya bisa diskalakan" tanpa angka |
| Satu bagian punya kebutuhan kepatuhan terpisah | Batas modulnya sendiri belum jelas |
| Satu bagian butuh bahasa atau runtime berbe | Belum ada observability dan tracing |
| Satu bagian dikelola tim yang benar-benar terpisah | Belum ada jalur rilis otomatis |

Baris pertama di kolom kanan pantas ditekankan: **pemecahan layanan menambah pekerjaan operasional yang dibagi ke jumlah orang yang sama.** Dengan delapan engineer dan lima layanan, setiap orang harus memahami lima jalur rilis, lima dasbor, dan lima tempat kegagalan bisa muncul. Itu memperlambat, bukan mempercepat.

Dan baris ketiga di kolom kanan adalah syarat mutlak: **kalau batas modul di dalam satu basis kode belum jelas, memecahnya jadi layanan hanya memindahkan kekacauan ke jaringan**, tempat kekacauan jauh lebih mahal.

Harga yang harus Anda hitung sebelum memulai:

| Biaya | Wujudnya |
| --- | --- |
| Panggilan jaringan bisa gagal | Setiap pemanggilan fungsi yang jadi HTTP butuh batas waktu, percobaan ulang, pemutus arus (modul 20) |
| Transaksi hilang | Dua layanan tidak bisa satu transaksi. Butuh saga (modul 24) |
| Pengembangan lokal | Menjalankan lima layanan di laptop, atau menirukannya |
| Pemecahan masalah | Satu permintaan melintasi empat layanan. Tanpa tracing, hampir mustahil |
| Jalur rilis dikali jumlah layanan | Lima pipeline, lima set rahasia, lima dasbor |
| Versi kontrak | Mengubah bentuk data jadi perubahan yang merusak klien |
| Biaya infrastruktur | Lima layanan dengan masing-masing 2 instance adalah 10 instance |

Satu kalimat yang pantas dibawa ke ruang rapat: **microservice adalah pertukaran kerumitan organisasi dengan kerumitan teknis.** Kalau kerumitan organisasi Anda belum terasa, Anda hanya menambah kerumitan teknis.

## Memilih batas

Batas yang baik punya tiga sifat: **data yang dimiliki sendiri, perubahan yang jarang melintas, dan bahasa domain yang berbeda.**

Cara menemukannya tanpa menebak:

```sql
-- 1. Lihat tabel mana yang sering disentuh bersamaan dalam satu transaksi.
--    Tabel yang selalu bersama hampir pasti satu batas.
--    Datanya dari log kueri atau dari pembacaan kode.

-- 2. Lihat modul mana yang paling sering diubah bersamaan
```

```bash
# Berkas yang sering berubah dalam commit yang sama: tanda penggandengan
git log --format='%H' --since='6 months ago' | while read c; do
  git show --name-only --format='' "$c" | grep '^src/modul/' | cut -d/ -f3 | sort -u | paste -sd,
done | sort | uniq -c | sort -rn | head -20
```

Keluaran perintah itu memberi data yang biasanya mengejutkan: dua modul yang Anda anggap terpisah ternyata berubah bersamaan di 70% commit. Itu bukan dua batas, melainkan satu batas yang dipisah di tempat yang salah.

Tiga pola batas yang biasanya benar:

| Batas | Dimiliki | Tidak dimiliki |
| --- | --- | --- |
| **Identitas** | Pengguna, sesi, peran, tenant | Apa pun tentang pesanan |
| **Katalog** | Produk, varian, harga, stok | Pesanan yang memuat produk |
| **Pesanan** | Pesanan, item, status | Harga saat ini, dan stok |
| **Pembayaran** | Tagihan, transaksi, rekonsiliasi | Kenapa pesanan dibuat |
| **Pengiriman** | Pengiriman, resi, kurir | Pembayaran |

Dan tiga pola batas yang biasanya salah:

**Satu, batas berdasarkan lapisan teknis.** Layanan "basis data", layanan "API", dan layanan "logika bisnis" adalah monolit yang dipecah di tempat yang paling merugikan: setiap fitur butuh perubahan di ketiganya.

**Dua, batas yang terlalu kecil.** Layanan yang isinya satu tabel dan tiga endpoint menambah seluruh biaya operasional tanpa memberi kemandirian apa pun, karena layanan sekecil itu tidak pernah bisa berubah tanpa layanan lain ikut berubah.

**Tiga, batas yang tidak sejalan dengan tim.** Layanan yang diubah tiga tim berbeda tidak memberi kemandirian rilis kepada siapa pun. Batas layanan sebaiknya mengikuti batas kepemilikan tim, dan itu pengamatan lama yang dikenal sebagai hukum Conway.

## Memecah satu layanan, langkah demi langkah

Jangan pernah menulis ulang. Pakai pola strangler: layanan baru dibangun di samping, lalu lalu lintas dialihkan sedikit demi sedikit.

```text
Tahap 1  Modul sudah terisolasi di monolit, hanya diakses lewat publik.ts
Tahap 2  Antarmuka publik.ts diubah jadi asinkron semuanya
Tahap 3  Layanan baru dibangun, memakai tabel yang sama (sementara)
Tahap 4  publik.ts di monolit jadi klien HTTP ke layanan baru
Tahap 5  Data dipindahkan ke basis data layanan baru
Tahap 6  Akses langsung monolit ke tabel itu dicabut
```

Tahap 2 pantas dijelaskan: **ubah semua pemanggilan lintas modul jadi `async` sebelum memecah apa pun.** Fungsi sinkron yang nanti jadi panggilan jaringan akan memaksa perubahan di setiap pemanggil, dan melakukannya bersamaan dengan pemecahan berarti dua perubahan besar sekaligus.

```ts
// Perbandingan bentuk sebelum dan sesudah pemisahan
// Sebelum: pemanggilan langsung
const produk = katalog.ambilProduk(id);

// Tahap 2: sudah async, implementasinya masih lokal
const produk = await katalog.ambilProduk(id);

// Tahap 4: implementasi diganti klien HTTP, pemanggil tidak berubah
// modul/katalog/publik.ts
export async function ambilProduk(id: string): Promise<Produk | null> {
  return klienKatalog.minta<Produk>(`/internal/produk/${id}`);
}
```

Tahap 5 adalah yang paling berbahaya, dan pola yang dipakai untuk memindahkan data tanpa berhenti:

```text
1. Layanan baru menulis ke basis data lama (satu sumber kebenaran)
2. Layanan baru menulis ke keduanya, membaca dari yang lama
3. Data lama disalin ke basis data baru, bertahap
4. Pembacaan dipindahkan ke basis data baru, penulisan masih keduanya
5. Penulisan ke basis data lama dihentikan
6. Tabel lama dihapus setelah masa tunggu
```

Enam tahap, dengan pemeriksaan selisih di antara tahap 3 dan 4: jalankan pekerjaan yang membandingkan kedua basis data dan melaporkan baris yang tidak cocok. Memindahkan pembacaan sebelum selisihnya nol adalah cara menemukan masalah dengan cara yang paling mahal.

## Komunikasi antar layanan

| Cara | Untuk | Catatan |
| --- | --- | --- |
| **HTTP dengan JSON** | Pembacaan yang butuh jawaban segera | Paling sederhana, paling mudah didiagnosis |
| **gRPC** | Pembacaan antar layanan internal dengan volume tinggi | Lebih cepat, bertipe, dan butuh perkakas tambahan |
| **Peristiwa** | Memberi tahu bahwa sesuatu terjadi | Modul 16. Pilihan utama antar layanan |
| **Basis data bersama** | **Jangan** | Dua layanan yang berbagi tabel bukan dua layanan |

Baris terakhir adalah aturan yang paling sering dilanggar dan paling merugikan: begitu dua layanan menulis ke tabel yang sama, keduanya tidak bisa mengubah skema tanpa koordinasi, tidak bisa dirilis mandiri, dan tidak punya batas kepemilikan data. Yang Anda dapat: semua biaya microservice tanpa satu pun manfaatnya.

Panduan memilih antara panggilan langsung dan peristiwa:

```text
Butuh jawaban sekarang untuk melanjutkan?          -> panggilan langsung
Memberi tahu bahwa sesuatu sudah terjadi?           -> peristiwa
Pemanggil akan gagal kalau tujuan mati?             -> pertimbangkan ulang
Bisa dikerjakan beberapa saat kemudian?             -> peristiwa
```

Baris ketiga adalah pertanyaan paling penting: **setiap panggilan langsung antar layanan menambah satu titik kegagalan ke jalur permintaan Anda.** Layanan pesanan yang memanggil layanan katalog secara langsung akan gagal saat katalog gangguan. Dua jalan keluar: salin data yang dibutuhkan lewat peristiwa, atau sediakan jalan mundur dari modul 20.

```ts
// src/layanan-pesanan/salinan-katalog.ts
// Layanan pesanan menyimpan salinan data katalog yang dibutuhkannya,
// diperbarui lewat peristiwa. Pembuatan pesanan tidak lagi bergantung
// pada ketersediaan layanan katalog.
export async function konsumenKatalog(pesan: PesanMasuk) {
  await konsumsiSekali('pesanan.salinan-katalog', pesan.id, async (tx) => {
    await tx.execute(sql`
      INSERT INTO pesanan.produk_salinan (id, nama, harga_rp, versi)
      VALUES (${p.produkId}, ${p.nama}, ${p.hargaRp}, ${p.versi})
      ON CONFLICT (id) DO UPDATE
        SET nama = excluded.nama, harga_rp = excluded.harga_rp, versi = excluded.versi
        WHERE pesanan.produk_salinan.versi < excluded.versi
    `);
  });
}
```

Pola itu disebut read model, dan harganya satu hal yang harus diterima dengan sadar: **salinannya bisa tertinggal beberapa detik.** Untuk nama dan harga katalog, itu dapat diterima. Untuk stok yang menentukan apakah pesanan boleh dibuat, tidak, dan di situlah kepemilikan data harus dipikirkan ulang: mungkin stok memang milik layanan pesanan, bukan katalog.

## Gateway, dan apa yang tidak boleh ada di dalamnya

```text
Klien
  |
  v
API Gateway        <- TLS, rate limit, autentikasi awal, routing
  |
  +--> layanan identitas
  +--> layanan katalog
  +--> layanan pesanan
  +--> layanan pembayaran
```

Yang pantas ada di gateway: terminasi TLS, pembatasan laju, verifikasi token, routing, dan agregasi log permintaan.

Yang **tidak** boleh ada di gateway: logika bisnis. Gateway yang memutuskan apakah pesanan boleh dibuat adalah monolit yang pindah tempat, dan jadi titik yang harus diubah setiap kali ada fitur baru di layanan mana pun.

Untuk klien yang butuh data dari beberapa layanan, pola yang lebih sehat adalah **BFF**, yaitu satu lapisan per jenis klien yang menggabungkan panggilan:

```ts
// bff-mobile/src/rute/ringkasan.ts
// bff-mobile: satu endpoint untuk satu layar, menggabungkan tiga layanan
app.get('/mobile/beranda', async (req) => {
  const [profil, pesananTerakhir, promo] = await Promise.all([
    klienIdentitas.minta(`/internal/profil/${req.pelaku.penggunaId}`),
    klienPesanan.minta(`/internal/pesanan?pembeli=${req.pelaku.penggunaId}&limit=3`),
    klienKatalog.minta('/internal/promo-aktif'),
  ]);

  return { profil, pesananTerakhir, promo };
});
```

`Promise.all` di situ penting: tiga panggilan berurutan berarti tiga kali latensi, dan itu pelajaran dari anggaran waktu di modul 20. Dan setiap panggilan tetap butuh batas waktu, pemutus arus, serta jalan mundur masing-masing.

## Kontrak dan versi

Begitu dua layanan dirilis terpisah, bentuk data di antara keduanya jadi API publik yang harus dijaga, dengan aturan yang sama seperti modul 4.

| Praktik | Cara |
| --- | --- |
| Kontrak tertulis dan dihasilkan | OpenAPI atau Protobuf, dari satu sumber |
| Klien bertipe dihasilkan dari kontrak | Bukan ditulis tangan |
| Perubahan aditif saja | Menambah field aman, menghapus dan mengganti tipe tidak |
| Uji kontrak di CI | Konsumen menguji terhadap kontrak penyedia |
| Versi peristiwa | Nomor versi di muatan, seperti modul 16 |

Uji kontrak adalah yang paling berharga dan paling sering tidak ada:

```ts
// layanan-katalog/test/kontrak.test.ts
// Di repositori layanan katalog: test yang memastikan kontraknya tidak rusak
it('kontrak produk tetap kompatibel', async () => {
  const respons = await app.inject({ method: 'GET', url: '/internal/produk/uji-1' });

  // Skema yang disepakati dengan konsumen, disimpan sebagai berkas
  // dan diubah hanya lewat proses yang melibatkan konsumennya
  expect(() => kontrakProdukV1.parse(respons.json())).not.toThrow();
});
```

Tanpa uji kontrak, perubahan yang merusak baru ditemukan saat layanan konsumen gagal di produksi, dan tim yang mengubahnya bukan tim yang menerima peringatannya.

## Biaya operasional yang nyata

Tiga hal yang berubah drastis setelah pemecahan, dan pantas disiapkan sebelumnya:

**Satu, pengembangan lokal.** Menjalankan lima layanan beserta basis data dan broker di laptop butuh memori dan kesabaran. Tiga pilihan: Docker Compose untuk semuanya, tiruan untuk layanan yang tidak sedang dikerjakan, atau lingkungan pengembangan bersama di cloud. Yang kedua paling praktis, dan membutuhkan kontrak yang jelas.

**Dua, pemecahan masalah.** Satu permintaan yang melintasi empat layanan hanya bisa ditelusuri dengan tracing dari modul 19. Tanpa itu, mencari penyebab satu permintaan lambat berarti membuka empat log terpisah dan mencocokkan waktu dengan tangan. **Tracing bukan pelengkap pada arsitektur layanan terpisah, melainkan syarat.**

**Tiga, siapa yang dihubungi.** Dengan satu layanan, jawabannya jelas. Dengan lima, peringatan harus menyebut layanan dan tim pemiliknya, dan harus ada kesepakatan tentang siapa yang memimpin saat insidennya melintasi beberapa layanan.

## Kapan menggabungkan kembali

Keputusan yang jarang dibahas, dan sah: **kalau pemecahan tidak memberi manfaat yang dijanjikan, gabungkan kembali.**

Tanda-tandanya:

| Tanda | Artinya |
| --- | --- |
| Dua layanan hampir selalu dirilis bersamaan | Batasnya salah, dan tidak ada kemandirian rilis |
| Perubahan fitur kecil butuh menyentuh tiga layanan | Batasnya memotong di tempat yang salah |
| Satu layanan hanya dipakai satu layanan lain | Tidak ada manfaat pemisahan |
| Waktu terbanyak habis mengurus komunikasi antar layanan | Biayanya melebihi manfaatnya |

Menggabungkan dua layanan jauh lebih mudah daripada memecahnya, terutama kalau keduanya masih di satu repositori dengan batas modul yang jelas. Dan mengakui bahwa pemecahan sebelumnya tidak tepat adalah keputusan teknis yang dewasa, bukan kegagalan.

## Latihan

### Latihan 1: Temukan batas di layanan Anda

Jalankan analisis penggandengan pada layanan Anda, lalu usulkan tiga sampai lima batas modul beserta tabel yang dimiliki masing-masing.

> [!petunjuk]
> Dua sumber data yang objektif: berkas yang sering berubah dalam commit yang sama, dan tabel yang sering disentuh dalam transaksi yang sama. Keduanya memberi gambaran yang lebih jujur daripada diagram yang digambar di papan tulis.

> [!jawaban]
>
> Hasil khas pada layanan yang dibangun dengan seri ini:
>
> | Batas | Tabel yang dimiliki | Peristiwa yang diterbitkan |
> | --- | --- | --- |
> | Identitas | pengguna, sesi, keanggotaan, peran, undangan, audit | `pengguna.terdaftar`, `keanggotaan.berubah` |
> | Katalog | produk, varian, kategori, kupon | `produk.diubah`, `stok.menipis` |
> | Pesanan | pesanan, pesanan_item, idempotency | `pesanan.dibuat`, `pesanan.dibayar`, `pesanan.dibatalkan` |
> | Pembayaran | tagihan, peristiwa_penyedia, selisih | `pembayaran.berhasil`, `pembayaran.gagal` |
> | Gudang | pengiriman, pengambilan | `pengiriman.dibuat`, `pengiriman.dikirim` |
>
> Dan dua temuan yang biasanya mengejutkan:
>
> **Satu, stok ternyata jadi pertanyaan terbuka.** Secara naluri stok milik katalog, dan yang menguranginya adalah pesanan, dalam transaksi yang sama dengan pembuatan pesanan. Kalau katalog dan pesanan jadi dua layanan, transaksi itu hilang, dan Anda butuh reservasi stok dengan saga dari modul 24.
>
> Tiga pilihan, dan semuanya punya harga: stok tetap milik katalog dengan reservasi dua tahap, stok dipindahkan jadi milik pesanan, atau katalog dan pesanan tetap satu layanan. Untuk sebagian besar toko, pilihan ketiga yang paling masuk akal, dan itu temuan yang layak: **batas yang terlihat jelas di papan tulis sering tidak tahan saat transaksi diperiksa.**
>
> **Dua, analisis commit menunjukkan katalog dan pesanan berubah bersamaan di 40% commit.** Itu angka yang terlalu tinggi untuk dua layanan terpisah, dan menguatkan kesimpulan di atas.
>
> Satu batas yang hampir selalu benar untuk dipisahkan lebih dulu: **identitas.** Identitas punya data yang jelas miliknya sendiri, hampir tidak pernah berubah bersama modul lain, punya kebutuhan kepatuhan tersendiri, dan sering jadi kebutuhan beberapa produk sekaligus.

### Latihan 2: Tegakkan batas modul dengan mesin

Susun layanan Anda jadi monolit modular dengan batas yang ditegakkan, bukan diimbau. Lalu buktikan: tulis kode yang melanggar batas, dan pastikan CI menolaknya.

> [!petunjuk]
> Ada tiga tingkat penegakan, dan sebaiknya Anda memasang lebih dari satu. Yang paling mudah dipasang adalah aturan linter terhadap jalur impor. Yang paling kuat tidak melibatkan TypeScript sama sekali, dan bekerja saat program berjalan, bukan saat lint: pikirkan apa yang bisa dilakukan basis data untuk mencegah satu modul membaca tabel milik modul lain.

> [!pembahasan]
>
> Empat lapis penegakan, dari yang paling murah:
>
> **Satu, linter untuk impor.**
>
> ```js
> // eslint.config.mjs
> import boundaries from 'eslint-plugin-boundaries';
>
> export default [
>   {
>     plugins: { boundaries },
>     settings: {
>       'boundaries/elements': [
>         { type: 'publik', pattern: 'src/modul/*/publik.ts' },
>         { type: 'internal', pattern: 'src/modul/*/!(publik).ts' },
>         { type: 'bersama', pattern: 'src/bersama/**' },
>       ],
>     },
>     rules: {
>       'boundaries/element-types': ['error', {
>         default: 'disallow',
>         rules: [
>           // Internal modul hanya boleh mengakses internal modulnya sendiri
>           { from: 'internal', allow: [['internal', { module: '${from.module}' }], 'publik', 'bersama'] },
>           { from: 'publik', allow: ['internal', 'bersama'] },
>         ],
>       }],
>     },
>   },
> ];
> ```
>
> **Dua, izin basis data per modul.** Ini penegakan terkuat, karena berlaku saat program berjalan, bukan saat lint.
>
> ```sql
> -- Modul pesanan tidak bisa menulis ke tabel katalog, apa pun yang ditulis kodenya
> GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA pesanan TO modul_pesanan;
> GRANT SELECT ON katalog.produk, katalog.varian TO modul_pesanan;
> ```
>
> **Tiga, test yang menguji grafik ketergantungan.**
>
> ```ts
> it('tidak ada ketergantungan melingkar antar modul', () => {
>   const grafik = bacaGrafikImpor('src/modul');
>   expect(cariSiklus(grafik)).toEqual([]);
> });
>
> it('modul pembayaran tidak bergantung pada gudang', () => {
>   const grafik = bacaGrafikImpor('src/modul');
>   expect(grafik.pembayaran).not.toContain('gudang');
> });
> ```
>
> **Empat, `CODEOWNERS` dengan telaah wajib** untuk perubahan pada `publik.ts` dan pada `src/bersama`.
>
> Tiga hal yang akan Anda temukan saat menegakkannya pertama kali:
>
> 1. **Puluhan pelanggaran yang sudah ada.** Jangan perbaiki semuanya sekaligus. Pasang aturannya sebagai peringatan dulu, catat jumlahnya, lalu jadikan error untuk modul yang sudah bersih satu per satu.
> 2. **Satu modul yang diimpor semua modul lain**, biasanya "pengguna" atau "tenant". Itu tanda bahwa sebagian isinya sebenarnya milik `bersama`, misalnya tipe `Pelaku`.
> 3. **Ketergantungan melingkar yang tidak disadari.** Pesanan mengimpor pembayaran, dan pembayaran mengimpor pesanan. Pemecahannya hampir selalu lewat peristiwa: salah satu arah diganti dengan menerbitkan peristiwa alih-alih memanggil langsung.

### Latihan 3: Pecah satu layanan

Pecah modul identitas dari Proyek 3 jadi layanan terpisah, dengan syarat: tidak ada waktu henti, dan bisa dibatalkan di setiap tahap.

> [!jawaban]
>
> | Tahap | Yang dikerjakan | Bisa dibatalkan? |
> | --- | --- | --- |
> | 1 | Isolasi modul, semua akses lewat `publik.ts` | Ya, tanpa biaya |
> | 2 | Ubah seluruh antarmuka `publik.ts` jadi `async` | Ya |
> | 3 | Bangun layanan identitas, memakai tabel yang sama | Ya, tinggal matikan |
> | 4 | `publik.ts` jadi klien HTTP, dengan flag untuk kembali ke lokal | Ya, matikan flag |
> | 5 | Basis data baru, penulisan ganda, pembacaan dari lama | Ya |
> | 6 | Pembacaan pindah ke basis data baru | Ya, dengan risiko |
> | 7 | Penulisan ke basis data lama dihentikan | **Sulit** |
> | 8 | Tabel lama dihapus | Tidak |
>
> ```ts
> // Tahap 4: flag yang memungkinkan kembali ke implementasi lokal
> export async function ambilPengguna(id: string): Promise<Pengguna | null> {
>   if (await flag.aktif('identitas-via-http')) {
>     return klienIdentitas.minta<Pengguna>(`/internal/pengguna/${id}`);
>   }
>
>   return repoPenggunaLokal.ambil(id);   // implementasi lama, masih ada
> }
> ```
>
> Lima hal yang menentukan keberhasilan:
>
> 1. **Flag di tahap 4 adalah yang paling berharga.** Dengan itu, peralihan ke layanan baru bisa dinyalakan untuk 1% lalu lintas, diamati, lalu diperluas, dan dimatikan dalam detik kalau ada masalah.
> 2. **Tahap 3 memakai basis data yang sama**, dan itu sengaja. Memecah kode dan memecah data sekaligus berarti dua perubahan berisiko bersamaan.
> 3. **Verifikasi selisih sebelum tahap 6.** Jalankan pekerjaan yang membandingkan kedua basis data dan melaporkan baris yang tidak cocok. Pindahkan pembacaan hanya setelah selisihnya nol selama beberapa hari.
> 4. **Sesi adalah bagian tersulit.** Token yang diterbitkan layanan lama harus tetap diterima layanan baru, dan sebaliknya. Pastikan kuncinya dibagi, dan uji kedua arah sebelum peralihan.
> 5. **Tahap 7 adalah titik tidak bisa kembali.** Sebelum itu, pastikan layanan baru sudah berjalan beberapa minggu, punya dasbor dan peringatan sendiri, dan pernah melewati satu rilis serta satu insiden kecil.
>
> Dan satu pertanyaan yang pantas ditanyakan setelah selesai: **apakah manfaatnya terasa?** Kalau tim identitas sekarang bisa merilis tanpa menunggu siapa pun, jawabannya ya. Kalau setiap perubahan tetap butuh koordinasi dengan tim pesanan, batasnya salah, dan menggabungkan kembali adalah pilihan yang sah.

### Latihan 4: Hitung biayanya sebelum memutuskan

Sebuah tim 12 orang dengan satu monolit mengusulkan pemecahan jadi enam layanan. Buat perhitungan biaya dan manfaatnya, lalu beri rekomendasi.

> [!pembahasan]
>
> **Biaya yang bisa dihitung:**
>
> | Pos | Perkiraan |
> | --- | --- |
> | Pipeline: 6 jalur rilis, konfigurasi, rahasia | 2 minggu kerja awal, lalu perawatan berkala |
> | Observability: tracing lintas layanan wajib | 1 sampai 2 minggu, dan ini syarat, bukan pilihan |
> | Pengembangan lokal: Compose atau tiruan | 1 minggu, dan keluhan harian setelahnya |
> | Infrastruktur: 6 layanan kali 2 instance | Dari 3 instance jadi 12. Biaya naik sekitar 3 kali |
> | Pemecahan data: 2 batas yang butuh pemindahan | 2 sampai 3 bulan, dengan risiko |
> | Saga untuk transaksi lintas layanan | 3 minggu, dan kerumitan permanen di kode |
> | Uji kontrak antar 6 layanan | 1 minggu awal, lalu perawatan |
>
> **Manfaat yang bisa dihitung:**
>
> | Pos | Perkiraan |
> | --- | --- |
> | Rilis mandiri | Berapa kali per bulan tim menunggu tim lain? Kalikan dengan lama penantian |
> | Pipeline lebih cepat | Dari 25 menit jadi 8 menit per tim, kali jumlah PR per hari |
> | Batas kepemilikan jelas | Sebagian besar manfaat ini bisa didapat dari monolit modular |
>
> **Rekomendasi untuk 12 orang:**
>
> Dua tahap, dan tahap pertama lebih dulu dievaluasi.
>
> **Tahap 1, satu kuartal: monolit modular.** Enam modul dengan batas yang ditegakkan linter dan izin basis data, `CODEOWNERS`, skema terpisah per modul, dan pipeline yang hanya menjalankan test modul terdampak. Biayanya sekitar tiga minggu, dan menyelesaikan empat dari lima keluhan.
>
> **Tahap 2, hanya kalau keluhan rilis masih terasa:** pecah **satu** layanan, yaitu identitas. Satu layanan memberi tim kesempatan belajar seluruh biaya operasionalnya dengan risiko terkendali.
>
> Alasan tidak langsung memecah enam: **dengan 12 orang, enam layanan berarti dua orang per layanan.** Setiap layanan butuh orang yang memahaminya, siap dihubungi saat insiden, dan sempat merawat pipeline-nya. Dua orang per layanan bukan kemandirian, melainkan titik kegagalan tunggal yang dikalikan enam.
>
> Dan satu pertanyaan yang pantas diajukan ke pengusul: **keluhan nyata apa yang sedang kita selesaikan, dan bagaimana kita akan tahu bahwa ini berhasil?** Kalau jawabannya berupa metrik yang bisa diukur, misalnya "waktu dari siap sampai tayang turun dari 3 hari jadi 1 hari", percakapannya jadi produktif. Kalau jawabannya "supaya lebih scalable", pekerjaan tiga bulan sedang dipertimbangkan tanpa dasar.

## Batasnya

Pemecahan layanan menyelesaikan kemandirian rilis, dan membawa empat hal yang tidak bisa dihindari.

**Transaksi lintas layanan tidak ada.** Dua layanan tidak bisa satu `COMMIT`. Yang menggantikannya adalah saga, dan itu modul berikutnya.

**Konsistensi jadi tertunda di lebih banyak tempat.** Setiap salinan data antar layanan punya jeda, dan antarmuka harus jujur tentang itu.

**Pemecahan masalah jadi pekerjaan lintas tim.** Dan itu masalah organisasi sebanyak masalah teknis.

**Sebagian pemecahan akan terbukti salah.** Yang bisa dilakukan: pecah satu per satu, ukur manfaatnya, dan siap menggabungkan kembali.

## Rangkuman

- Masalah yang diselesaikan microservice adalah skala organisasi, bukan skala lalu lintas.
- Empat dari lima keluhan khas monolit bisa diselesaikan tanpa memecah apa pun: batas modul, kepemilikan tertulis, skema per modul, dan test yang terpilih.
- Batas modul harus ditegakkan mesin: linter untuk impor, izin basis data per modul, test grafik ketergantungan, dan `CODEOWNERS`.
- Kalau batas modul di dalam satu basis kode belum jelas, memecahnya jadi layanan hanya memindahkan kekacauan ke jaringan.
- Batas yang baik punya data milik sendiri, perubahan yang jarang melintas, dan sejalan dengan kepemilikan tim.
- Temukan batas dari data: berkas yang berubah bersamaan, dan tabel yang disentuh dalam satu transaksi.
- Batas berdasarkan lapisan teknis, batas yang terlalu kecil, dan batas yang diubah tiga tim adalah tiga pola yang salah.
- Jangan pernah menulis ulang. Isolasi, ubah jadi asinkron, bangun di samping, alihkan dengan flag, lalu pindahkan data bertahap.
- Basis data bersama antara dua layanan berarti semua biaya microservice tanpa satu pun manfaatnya.
- Peristiwa sebagai pilihan utama antar layanan, panggilan langsung hanya kalau butuh jawaban segera, dan setiap panggilan langsung menambah titik kegagalan.
- Tracing bukan pelengkap pada arsitektur layanan terpisah, melainkan syarat.
- Menggabungkan kembali layanan yang batasnya salah adalah keputusan dewasa, dan jauh lebih mudah daripada memecahnya.

## Masalah terbuka

Anda sudah memecah identitas, dan berjalan baik. Lalu datang kebutuhan yang memaksa dua layanan bekerja bersama dalam satu alur yang harus benar seluruhnya.

Pembeli membuat pesanan. Stok dipesan di layanan katalog, tagihan dibuat di layanan pembayaran, dan pesanan disimpan di layanan pesanan. Tiga penulisan di tiga basis data berbeda.

Sekarang pembayaran gagal. Di monolit, satu `ROLLBACK` membatalkan semuanya. Di tiga layanan, **tidak ada `ROLLBACK`.** Stok sudah dipesan, pesanan sudah tersimpan, dan tagihan tidak pernah ada. Dan kalau proses yang mengoordinasikannya mati tepat setelah stok dipesan, tidak ada satu pun pihak yang tahu bahwa alurnya belum selesai.

Pertanyaan berikutnya menyusul. Bagaimana kalau dua layanan punya pendapat berbeda tentang data yang sama? Apa yang terjadi saat jaringan di antara mereka terputus, dan masing-masing menerima penulisan? Dan pada data yang sangat besar, bagaimana satu tabel yang tidak lagi cukup di satu mesin dibagi tanpa kehilangan kebenaran?

Itu isi modul terakhir: sistem terdistribusi, dari saga dan idempotensi di setiap batas sampai konsistensi, replikasi, dan sharding, beserta satu kalimat yang mengikat semuanya.
