---
title: 'Modul 14: Caching dari HTTP sampai Redis'
description: Pekerjaan yang jawabannya sudah diketahui tidak perlu dikerjakan ulang. Lapisan cache, perancangan kunci, dan bagian tersulitnya: memutuskan kapan data yang disimpan harus dianggap tidak berlaku lagi.
date: 2026-12-19
slug: modul-14-caching-redis
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Buka `pg_stat_statements` di layanan yang sudah berjalan, urutkan berdasarkan jumlah pemanggilan, dan Anda akan menemukan pola yang sama di hampir semua aplikasi:

| Kueri | Dipanggil | Berubah |
| --- | --- | --- |
| Pembacaan izin pengguna | 1.000 per detik | Sekali sebulan |
| Konfigurasi tenant | 1.000 per detik | Sekali seminggu |
| Katalog produk halaman pertama | 400 per detik | Beberapa kali sehari |
| Rekap dasbor | 20 per detik | Setiap transaksi baru |
| Detail pesanan | 50 per detik | Jarang setelah selesai |

Kolom kedua dan ketiga adalah seluruh isi modul ini. Pekerjaan yang jawabannya sudah diketahui dan belum berubah tidak perlu dikerjakan ulang seribu kali per detik.

Dan satu peringatan di awal: **caching menambah satu sumber kebenaran kedua.** Setiap bug yang paling membingungkan di produksi punya peluang besar berasal dari cache yang tidak sesuai dengan kenyataan. Karena itu bagian tersulit dari modul ini bukan menyimpan, melainkan memutuskan kapan yang tersimpan harus dibuang.

## Analogi: salinan di meja depan

Analogi kantor dari modul 1 dipakai lagi. Petugas loket butuh daftar tarif layanan beberapa kali setiap jam, dan daftar itu ada di gudang arsip.

**Tanpa salinan.** Setiap kali ada yang bertanya, petugas berjalan ke gudang. Selalu akurat, dan melelahkan.

**Dengan salinan di meja.** Petugas memfotokopi daftarnya sekali, lalu menjawab dari meja. Dua pertanyaan baru muncul, dan keduanya jadi inti modul ini: **berapa lama salinan ini masih bisa dipercaya**, dan **siapa yang memberi tahu petugas saat tarifnya berubah.**

Kantor yang dikelola baik menjawab keduanya dengan dua cara berbeda: ada tanggal berlaku di pojok salinan, dan ada aturan bahwa petugas gudang mengumumkan setiap perubahan tarif ke semua loket.

| Dunia kantor | Dunia backend |
| --- | --- |
| Salinan di meja petugas | Cache |
| Gudang arsip | Basis data |
| Tanggal berlaku di pojok | TTL |
| Pengumuman saat tarif berubah | Invalidasi berbasis peristiwa |
| Salinan yang diperbarui sambil tetap melayani | stale-while-revalidate |
| Sepuluh loket berlari ke gudang bersamaan | Cache stampede |
| Salinan tarif perusahaan A dipakai melayani perusahaan B | Kebocoran cache antar tenant |
| Papan pengumuman untuk semua loket | Redis |
| Catatan di buku pribadi petugas | Cache dalam memori proses |

Batas analoginya yang paling penting: petugas bisa melihat tanggal di pojok salinan dan ragu, sedangkan kode tidak pernah ragu. Data yang basi akan dipakai dengan percaya diri penuh sampai ada yang melapor.

## Lapisan cache

Permintaan melewati beberapa tempat yang bisa menjawab tanpa menyentuh basis data Anda:

```text
Klien (cache peramban)
   |
   v
CDN / cache tepi            <- murah, jauh dari server, untuk data publik
   |
   v
Cache dalam proses          <- paling cepat, tidak dibagi antar instance
   |
   v
Redis                       <- dibagi semua instance, satu perjalanan jaringan
   |
   v
Materialized view           <- di basis data, untuk agregasi (modul 10)
   |
   v
Basis data
```

Aturan memilih lapisannya:

| Data | Lapisan | Alasan |
| --- | --- | --- |
| Berkas statis, gambar produk | CDN | Tidak pernah berubah per pengguna |
| Katalog publik | CDN plus Redis | Sama untuk semua, sering dibaca |
| Konfigurasi aplikasi | Dalam proses, TTL pendek | Hampir tidak pernah berubah, dan dibutuhkan setiap permintaan |
| Izin pengguna | Redis | Per pengguna, harus bisa dibatalkan seketika |
| Rekap dasbor | Redis atau materialized view | Mahal dihitung, tidak harus mutakhir ke detik |
| Data pribadi, saldo, stok | **Jangan di-cache**, atau sangat pendek | Kesalahan di sini berarti angka yang salah |

Baris terakhir pantas ditegaskan. Pertanyaan pertama sebelum menyimpan apa pun bukan "berapa TTL-nya", melainkan **"apa akibatnya kalau pengguna melihat data yang lima menit basi?"** Untuk katalog, tidak ada. Untuk saldo rekening, itu laporan bug.

## Cache HTTP: lapisan yang paling sering dilupakan

Sebelum menyentuh Redis, perhatikan bahwa HTTP sudah punya mekanisme cache yang bisa dipakai gratis.

```ts
// src/fitur/katalog/rute.ts, cache di lapisan HTTP
// Katalog publik: boleh disimpan CDN, disegarkan di latar belakang
app.get('/v1/produk', async (req, res) => {
  const hasil = await layananProduk.daftar(req.query);

  res.header(
    'cache-control',
    'public, max-age=60, stale-while-revalidate=300, stale-if-error=86400'
  );

  return hasil;
});

// Detail pesanan: pribadi, dan pakai ETag supaya klien bisa menghemat
app.get('/v1/pesanan/:id', async (req, res) => {
  const pesanan = await ambilPesanan(req.pelaku, req.params.id);

  // Versi dari modul 9 jadi ETag yang murah dan tepat
  const etag = `W/"${pesanan.id}-${pesanan.versi}"`;

  res.header('cache-control', 'private, no-cache');
  res.header('etag', etag);

  if (req.headers['if-none-match'] === etag) {
    return res.status(304).send();
  }

  return pesanan;
});
```

Empat nilai `Cache-Control` yang perlu dibedakan:

| Nilai | Artinya |
| --- | --- |
| `public, max-age=60` | Boleh disimpan siapa pun, termasuk CDN, selama 60 detik |
| `private, max-age=60` | Hanya boleh disimpan peramban pengguna itu |
| `private, no-cache` | Boleh disimpan, tapi wajib divalidasi dengan ETag setiap kali |
| `no-store` | Tidak boleh disimpan di mana pun. Untuk data sensitif |

Dua arahan tambahan yang sangat berguna dan sering tidak dikenal: `stale-while-revalidate` membuat CDN menyajikan salinan basi sambil menyegarkannya di latar belakang, sehingga tidak ada pengguna yang menunggu. Dan `stale-if-error` membuat CDN menyajikan salinan lama saat server Anda sedang gangguan, yang berarti katalog tetap bisa dibuka meski basis data Anda tumbang.

Satu kesalahan yang berakibat serius: **memasang `public` pada respons yang bergantung pada identitas pemanggil.** Satu respons berisi data pengguna A bisa tersimpan di CDN lalu disajikan ke pengguna B. Aturannya: apa pun yang melewati pemeriksaan otorisasi memakai `private` atau `no-store`, dan `Vary: Authorization` dipasang untuk amannya.

## Cache-aside dengan Redis

Pola yang dipakai 90% waktu:

```ts
// src/cache/redis.ts
import { Redis } from 'ioredis';

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 2,
  enableOfflineQueue: false,   // jangan menumpuk perintah saat Redis mati
  connectTimeout: 2_000,
});

export async function denganCache<T>(
  kunci: string,
  ttlDetik: number,
  hitung: () => Promise<T>,
  skema: z.ZodType<T>
): Promise<T> {
  try {
    const tersimpan = await redis.get(kunci);

    if (tersimpan) {
      // Bentuk data di cache bisa dari versi kode sebelumnya,
      // jadi tetap divalidasi. Kalau tidak cocok, anggap tidak ada.
      const hasil = skema.safeParse(JSON.parse(tersimpan));
      if (hasil.success) return hasil.data;
    }
  } catch (error) {
    // Redis mati tidak boleh menjatuhkan layanan
    log.warn({ err: error, kunci }, 'cache tidak terbaca, lanjut ke sumber');
  }

  const nilai = await hitung();

  try {
    // Jitter mencegah banyak kunci kedaluwarsa pada detik yang sama
    const ttl = ttlDetik + Math.floor(Math.random() * ttlDetik * 0.1);
    await redis.set(kunci, JSON.stringify(nilai), 'EX', ttl);
  } catch (error) {
    log.warn({ err: error, kunci }, 'cache tidak tersimpan');
  }

  return nilai;
}
```

Empat keputusan di potongan itu yang membedakan cache yang aman dari yang merepotkan:

**Satu, kegagalan Redis tidak menjatuhkan layanan.** Cache adalah pengoptimalan, bukan ketergantungan. Setiap pembacaan dan penulisan dibungkus `try`, dan `enableOfflineQueue: false` mencegah perintah menumpuk di memori saat Redis mati.

**Dua, data dari cache divalidasi.** Setelah Anda mengubah bentuk objek dan merilisnya, cache masih berisi bentuk lama. Tanpa validasi, bentuk lama masuk ke kode baru dan menghasilkan error di tempat yang menyesatkan.

**Tiga, ada jitter pada TTL.** Kalau seribu kunci dibuat pada waktu yang hampir sama dengan TTL yang sama, semuanya kedaluwarsa bersamaan, dan basis data Anda menerima seribu kueri dalam satu detik.

**Empat, `JSON.stringify` adalah pilihan yang sadar.** Formatnya sederhana dan terbaca saat Anda memeriksa Redis dengan tangan. Untuk data besar, pertimbangkan kompresi atau format biner, dan ukur dulu sebelum menukar keterbacaan dengan kecepatan.

## Merancang kunci

Kunci yang dirancang buruk adalah penyebab kebocoran data antar pengguna, dan itu bug keamanan, bukan bug performa.

```ts
// src/cache/kunci.ts
const VERSI = 'v3';   // dinaikkan saat bentuk data berubah: seluruh cache lama diabaikan

export const kunciCache = {
  izin: (penggunaId: string, tenantId: string) =>
    `${VERSI}:izin:${tenantId}:${penggunaId}`,

  konfigurasiTenant: (tenantId: string) => `${VERSI}:konfig:${tenantId}`,

  // Semua yang membedakan hasil harus ada di kunci
  katalog: (tenantId: string, f: FilterKatalog) =>
    `${VERSI}:katalog:${tenantId}:${f.kategori}:${f.urut}:${f.limit}:${f.kursor ?? 'awal'}`,

  rekapHarian: (tenantId: string, tanggal: string) =>
    `${VERSI}:rekap:${tenantId}:${tanggal}`,
};
```

Empat aturan kunci:

**Satu, tenant dan pengguna selalu ada di kunci** untuk data yang berbeda per tenant atau per pengguna. Satu kunci yang lupa memuat `tenantId` berarti tenant A melihat data tenant B, dan itu insiden yang mengakhiri kontrak seperti di modul 12.

**Dua, semua yang membedakan hasil ada di kunci.** Ini aturan yang sama dengan `queryKey` pada seri frontend: filter, urutan, dan halaman harus ikut.

**Tiga, ada prefiks versi.** Saat bentuk data berubah, naikkan versinya dan seluruh cache lama diabaikan tanpa perlu menghapus apa pun. Jauh lebih aman daripada `FLUSHALL` di produksi.

**Empat, kunci dikumpulkan di satu berkas.** Kunci yang ditulis sebagai string lepas di tiga puluh tempat tidak bisa diaudit, dan satu salah tulis jadi cache yang tidak pernah kena.

## Invalidasi: bagian yang sulit

Tiga strategi, dan hampir semua aplikasi memakai ketiganya untuk data yang berbeda.

**Satu, biarkan kedaluwarsa sendiri.** Paling sederhana, dan benar untuk data yang tidak masalah basi beberapa saat.

```ts
// Contoh pemakaian denganCache dari potongan sebelumnya
const konfig = await denganCache(
  kunciCache.konfigurasiTenant(tenantId),
  300,  // basi maksimal 5 menit, dan itu dapat diterima
  () => repoTenant.ambilKonfigurasi(tenantId),
  skemaKonfigurasi
);
```

**Dua, hapus saat data berubah.** Dipakai saat kebasian tidak dapat diterima.

```ts
// src/fitur/anggota/layanan.ts, invalidasi setelah transaksi commit
export async function ubahPeranAnggota(pelaku: Pelaku, penggunaId: string, peranBaru: string) {
  await dalamTransaksi(db, async (tx) => {
    await repoKeanggotaan(tx).ubahPeran(pelaku.tenantId, penggunaId, peranBaru);
    await repoAudit(tx).catat({ jenis: 'peran-diubah', target: penggunaId });
  });

  // Dihapus setelah commit, bukan di dalam transaksi.
  // Kalau di dalam dan transaksinya gagal, cache sudah terhapus tanpa alasan,
  // dan kalau transaksi berhasil tapi penghapusan gagal, TTL yang menyelamatkan.
  await redis.del(kunciCache.izin(penggunaId, pelaku.tenantId));
}
```

Urutan itu penting: **invalidasi dilakukan setelah commit.** Melakukannya di dalam transaksi menciptakan jendela di mana cache sudah bersih tapi data lama masih terlihat pembaca lain, yang justru menyebabkan cache terisi kembali dengan nilai lama.

**Tiga, invalidasi berkelompok.** Saat satu perubahan memengaruhi banyak kunci, misalnya satu produk diperbarui lalu semua halaman katalog yang memuatnya jadi basi.

```ts
// src/lib/cache/tag.ts, invalidasi sekelompok kunci sekaligus
// Jangan pakai SCAN atau KEYS untuk mencari kunci yang cocok:
// keduanya mahal, dan KEYS memblokir Redis.
// Pakai penanda versi per kelompok.
async function naikkanVersiKatalog(tenantId: string) {
  await redis.incr(`versi:katalog:${tenantId}`);
}

async function kunciKatalog(tenantId: string, f: FilterKatalog) {
  const versi = (await redis.get(`versi:katalog:${tenantId}`)) ?? '1';
  return `v3:katalog:${tenantId}:${versi}:${f.kategori}:${f.urut}:${f.kursor ?? 'awal'}`;
}
```

Dengan penanda versi, satu `INCR` membuat seluruh kelompok kunci jadi tidak terjangkau sekaligus, dan kunci lama dibersihkan sendiri saat TTL-nya habis. Pola ini jauh lebih murah dan lebih aman daripada mencari kunci dengan pola.

## Cache stampede

Satu kunci populer kedaluwarsa, lalu lima ratus permintaan yang datang pada saat yang sama semuanya menemukan cache kosong, dan semuanya menjalankan kueri mahal yang sama.

```ts
// src/lib/cache/kunci-tunggal.ts
// Pencegahan: hanya satu permintaan yang menghitung, sisanya menunggu hasilnya
export async function denganCacheAman<T>(
  kunci: string,
  ttl: number,
  hitung: () => Promise<T>,
  skema: z.ZodType<T>
): Promise<T> {
  const tersimpan = await bacaCache(kunci, skema);
  if (tersimpan) return tersimpan;

  const kunciGembok = `gembok:${kunci}`;

  // SET NX: hanya satu yang berhasil mengambil gembok
  const dapatGembok = await redis.set(kunciGembok, '1', 'EX', 10, 'NX');

  if (!dapatGembok) {
    // Yang lain menunggu sebentar, lalu baca lagi
    await tidur(50 + Math.random() * 100);

    const kedua = await bacaCache(kunci, skema);
    if (kedua) return kedua;

    // Masih kosong: kerjakan sendiri daripada menunggu tak berujung
    return hitung();
  }

  try {
    const nilai = await hitung();
    await tulisCache(kunci, nilai, ttl);
    return nilai;
  } finally {
    await redis.del(kunciGembok);
  }
}
```

Pencegahan yang lebih baik lagi untuk data yang sangat populer: **jangan biarkan kedaluwarsa.** Simpan dengan TTL panjang, dan segarkan di latar belakang sebelum basi:

```ts
// src/lib/cache/segarkan-awal.ts
const BATAS_SEGARKAN = 0.8;  // segarkan setelah 80% umur terlewati

const { nilai, umurDetik } = await bacaCacheDenganUmur(kunci, skema);

if (nilai) {
  if (umurDetik > ttl * BATAS_SEGARKAN) {
    // Segarkan di latar, jangan ditunggu. Pembaca tetap dapat jawaban cepat.
    void segarkanDiLatar(kunci, ttl, hitung);
  }
  return nilai;
}
```

Pola ini menghapus lonjakan sepenuhnya, dengan harga satu hal yang perlu disadari: pembaca pertama setelah ambang terlewati mendapat data yang sedikit basi. Untuk katalog dan rekap, itu pertukaran yang hampir selalu pantas.

## Cache dalam memori proses

Paling cepat, dan punya satu sifat yang harus Anda sadari sepenuhnya: **tidak dibagi antar instance.**

```ts
// src/lib/cache/memori.ts
import { LRUCache } from 'lru-cache';

// Hanya untuk data yang boleh berbeda antar instance selama beberapa detik
const cacheKonfigurasi = new LRUCache<string, Konfigurasi>({
  max: 500,
  ttl: 30_000,
});
```

Dari modul 1: tiga instance berarti tiga isi cache berbeda. Untuk konfigurasi dengan TTL 30 detik, itu dapat diterima. Untuk izin pengguna, tidak: pencabutan izin yang baru berlaku di satu instance dan belum di dua instance lain adalah lubang keamanan yang muncul dan hilang sendiri.

Patokan memilih:

| Pakai cache dalam proses kalau | Pakai Redis kalau |
| --- | --- |
| Data sama untuk semua pengguna | Data per pengguna atau per tenant |
| Boleh berbeda antar instance beberapa detik | Harus sama di semua instance |
| TTL pendek, di bawah satu menit | Perlu invalidasi yang berlaku seketika |
| Ukurannya kecil dan terbatas | Ukurannya besar |

Pola gabungan yang sering dipakai untuk data yang sangat sering dibaca: lapisan dalam proses dengan TTL beberapa detik di depan Redis. Dengan begitu, seribu permintaan per detik di satu instance jadi beberapa pembacaan Redis per detik, dan invalidasi di Redis tetap berlaku dalam hitungan detik.

## Kesalahan yang mahal

Lima pola yang pantas dihindari, dan semuanya pernah terjadi di produksi nyata:

**Satu, menyimpan respons utuh yang bergantung otorisasi.** Respons yang isinya berbeda per peran tidak boleh memakai kunci yang sama. Masukkan peran atau izin ke dalam kunci, atau cache di tingkat data mentahnya saja lalu saring per peran saat menyajikan.

**Dua, menyimpan hasil kueri yang kuerinya sendiri bergantung pelaku.** Kalau `daftarPesanan(pelaku, filter)` menyaring berdasarkan pelaku, kuncinya wajib memuat cakupan pelaku itu, bukan hanya filternya.

**Tiga, menyimpan error secara tidak sengaja.** Ini perlu sengaja dipikirkan: menyimpan "tidak ditemukan" selama satu menit mencegah serangan yang memukul basis data dengan id yang tidak ada, dan menyimpan "gangguan sementara" berarti layanan Anda tetap terlihat rusak selama satu menit setelah sumbernya pulih. Simpan hasil negatif dengan TTL pendek, jangan simpan kegagalan.

**Empat, memakai cache sebagai penyimpanan.** Redis bisa menghapus kunci saat memorinya penuh, dan bisa kehilangan data saat dimulai ulang tergantung konfigurasi. Apa pun yang tidak boleh hilang tempatnya di basis data.

**Lima, tidak mengukur.** Cache yang tingkat kenanya 20% hampir tidak memberi manfaat, hanya menambah kerumitan. Ukur:

```ts
// src/app.ts, mengukur tingkat kena cache
app.addHook('onResponse', async (req) => {
  if (req.statCache) {
    metrik.cache.inc({ hasil: req.statCache.kena ? 'kena' : 'lewat', kunci: req.statCache.kelompok });
  }
});
```

Tingkat kena di bawah 70% pada data yang seharusnya sering dibaca biasanya berarti satu dari dua hal: TTL terlalu pendek, atau kuncinya terlalu rinci sehingga setiap permintaan menghasilkan kunci baru.

## Buktikan jalan

Cache yang terpasang salah terlihat persis seperti cache yang bekerja, sampai seseorang melihat data basi. Buktikan tiga hal.

```bash
# 1. Panggilan kedua jauh lebih cepat daripada yang pertama
for i in 1 2 3; do
  curl -s -o /dev/null -w "panggilan $i: %{time_total}s\n" localhost:3000/v1/katalog
done
```

```text
panggilan 1: 0.184s
panggilan 2: 0.009s
panggilan 3: 0.008s
```

```bash
# 2. Kuncinya benar-benar ada di Redis, dan punya masa berlaku
docker compose exec -it redis redis-cli --scan --pattern 'katalog:*'
docker compose exec -it redis redis-cli TTL 'katalog:v1:halaman-1'
```

```text
katalog:v1:halaman-1
(integer) 287
```

Angka TTL harus **positif dan menurun**. Kalau jawabannya `-1`, kunci itu tidak punya masa berlaku dan akan hidup selamanya: itu kebocoran memori yang baru terasa berbulan-bulan kemudian.

```bash
# 3. Invalidasi benar-benar bekerja
# Ubah satu produk, lalu panggil lagi
curl -s -X PATCH localhost:3000/v1/produk/<id> -H 'content-type: application/json' \
  -d '{"nama":"Nama Baru"}' > /dev/null
curl -s localhost:3000/v1/katalog | jq '.data[0].nama'
```

```json
"Nama Baru"
```

Pemeriksaan ketiga adalah yang paling penting dan paling sering dilewati. Cache yang cepat dan salah lebih buruk daripada tidak ada cache sama sekali, karena pengguna melihat harga lama lalu menuntut harga itu dihormati.

## Latihan

### Latihan 1: Cache izin dengan invalidasi yang benar

Dari Proyek 3, pembacaan izin dipanggil di setiap permintaan. Pasang cache dengan syarat: tingkat kena di atas 95%, perubahan peran berlaku dalam waktu di bawah 2 detik, dan Redis yang mati tidak menjatuhkan layanan.

> [!petunjuk]
> Dua syarat pertama terlihat bertentangan: TTL panjang memberi tingkat kena tinggi, TTL pendek memberi invalidasi cepat. Jalan keluarnya bukan memilih salah satu TTL, melainkan menggabungkan TTL panjang dengan penghapusan saat perubahan.

> [!jawaban]
>
> ```ts
> const TTL_IZIN = 600;  // 10 menit, karena ada penghapusan eksplisit
>
> export async function ambilIzin(penggunaId: string, tenantId: string): Promise<Set<Izin>> {
>   const kunci = kunciCache.izin(penggunaId, tenantId);
>
>   const daftar = await denganCache(
>     kunci,
>     TTL_IZIN,
>     async () => {
>       const baris = await db.execute(sql`
>         SELECT pi.izin_id
>         FROM keanggotaan k
>         JOIN peran_izin pi ON pi.peran_id = k.peran_id
>         WHERE k.pengguna_id = ${penggunaId} AND k.tenant_id = ${tenantId}
>       `);
>
>       return baris.map((b) => b.izin_id as Izin);
>     },
>     z.array(z.string())
>   );
>
>   return new Set(daftar);
> }
>
> // Satu fungsi yang dipanggil setiap kali ada perubahan yang memengaruhi izin
> export async function batalkanCacheIzin(penggunaId: string, tenantId: string) {
>   await redis.del(kunciCache.izin(penggunaId, tenantId));
> }
>
> // Perubahan definisi peran memengaruhi banyak pengguna sekaligus:
> // pakai penanda versi, bukan mencari semua kunci
> export async function batalkanCacheIzinTenant(tenantId: string) {
>   await redis.incr(`versi:izin:${tenantId}`);
> }
> ```
>
> Lima hal yang membuatnya benar:
>
> 1. **TTL 10 menit plus penghapusan eksplisit.** Tingkat kena tinggi karena TTL panjang, dan perubahan berlaku seketika karena dihapus. TTL di sini berfungsi sebagai jaring kalau penghapusannya gagal.
> 2. **Tiga tempat memanggil `batalkanCacheIzin`**: perubahan peran anggota, pencabutan keanggotaan, dan perubahan definisi peran. Melupakan satu saja membuat izin lama bertahan 10 menit. Tulis daftarnya sebagai komentar di atas fungsi itu.
> 3. **Set dibuat dari array.** `Set` tidak bisa di-serialisasi ke JSON, jadi yang disimpan adalah array dan konversinya terjadi setelah dibaca.
> 4. **`Set` divalidasi sebagai array string**, lalu dipetakan. Kalau suatu hari ada izin yang dihapus dari sistem, izin lama yang tersisa di cache tetap masuk sebagai string yang tidak ada artinya, dan itu aman karena `has()` hanya akan gagal mencocokkan.
> 5. **Kegagalan Redis berarti satu kueri tambahan**, bukan error. Pada saat Redis mati, layanan Anda melambat dan tetap benar. Itu perilaku yang diinginkan.
>
> Satu pertanyaan yang pantas ditanyakan ke pemilik produk: apakah 10 menit dapat diterima **kalau penghapusan gagal**? Untuk pencabutan akses karyawan yang keluar, jawabannya mungkin tidak, dan TTL perlu dipendekkan jadi 60 detik dengan harga tingkat kena yang lebih rendah.

### Latihan 2: Cache HTTP untuk katalog

Pasang cache HTTP pada katalog publik Proyek 2, lalu ukur. Syaratnya: pengunjung yang sama tidak mengunduh ulang data yang tidak berubah, CDN bisa menyajikan salinan basi saat server gangguan, dan harga yang baru diubah admin terlihat dalam waktu di bawah 2 menit.

> [!petunjuk]
> Ketiga syarat itu dipenuhi oleh tiga arahan `Cache-Control` yang berbeda, bukan satu. Syarat pertama butuh cara klien bertanya "apakah berubah?" tanpa mengunduh ulang, dan itu melibatkan satu header respons plus satu header permintaan. Syarat kedua punya arahan khusus yang namanya menyebutkan apa yang boleh dilakukan saat ada error. Syarat ketiga menentukan angka `max-age` Anda.

> [!pembahasan]
>
> ```ts
> app.get('/v1/produk', async (req, res) => {
>   const hasil = await layananProduk.daftar(req.query);
>
>   // Hash dari isi respons jadi ETag. Murah dihitung, dan tepat.
>   const etag = `W/"${hashCepat(JSON.stringify(hasil))}"`;
>
>   res.header('etag', etag);
>   res.header(
>     'cache-control',
>     [
>       'public',
>       'max-age=60',                  // peramban dan CDN percaya 60 detik
>       'stale-while-revalidate=120',  // setelah itu sajikan basi, segarkan di latar
>       'stale-if-error=86400',        // server gangguan: sajikan yang lama sehari
>     ].join(', ')
>   );
>   res.header('vary', 'accept-encoding');
>
>   if (req.headers['if-none-match'] === etag) return res.status(304).send();
>
>   return hasil;
> });
> ```
>
> Dan sisi invalidasinya, supaya syarat ketiga terpenuhi:
>
> ```ts
> // Setelah admin mengubah produk
> await cdn.purge([`/v1/produk`, `/v1/produk/${produk.slug}`]);
> ```
>
> Lima hal yang penting:
>
> 1. **`max-age=60` sudah cukup untuk syarat ketiga** tanpa purge sama sekali. Purge dipasang supaya perubahan terlihat dalam hitungan detik, bukan menit, dan itu nilai tambah.
> 2. **`stale-if-error=86400` adalah fitur ketahanan, bukan performa.** Dengan satu baris ini, katalog Anda tetap bisa dibuka pengunjung saat basis data Anda tumbang. Modul 20 membahas pola seperti ini lebih luas.
> 3. **Jangan pasang `public` pada endpoint yang melewati otorisasi.** Kalau katalog punya harga khusus per tenant, respons ini tidak boleh `public`. Pisahkan endpoint publik dari endpoint yang personal.
> 4. **`Vary` harus hati-hati.** `Vary: Authorization` pada endpoint publik membuat CDN menyimpan salinan per token, dan tingkat kenanya hancur. Kalau endpoint benar-benar publik, jangan baca header `Authorization` sama sekali.
> 5. **Ukur dampaknya di CDN, bukan di aplikasi.** Yang menarik bukan latensi server Anda, melainkan berapa persen permintaan yang tidak pernah sampai ke server Anda. Pada katalog yang dipasang benar, angkanya biasanya di atas 90%.

### Latihan 3: Picu stampede, lalu hentikan

Buat endpoint dengan kueri 800 ms yang di-cache 30 detik. Kirim 300 permintaan bersamaan tepat setelah cache kedaluwarsa, dan catat berapa kali kueri dijalankan. Lalu perbaiki dengan dua cara.

> [!jawaban]
>
> | Implementasi | Kueri dijalankan | Latensi p99 | Catatan |
> | --- | --- | --- | --- |
> | Cache-aside biasa | 280 sampai 300 | 2.400 ms | Pool sambungan habis, endpoint lain ikut lambat |
> | Dengan gembok | 1 | 900 ms | Benar, 299 permintaan menunggu sebentar |
> | Penyegaran dini | **0** | 40 ms | Terbaik, dengan data yang sedikit basi |
>
> Baris pertama menunjukkan akibat yang paling merugikan: **bukan hanya endpoint itu yang melambat.** Tiga ratus kueri bersamaan menghabiskan pool sambungan dari modul 8, dan seluruh layanan ikut terganggu. Cache stampede adalah salah satu penyebab insiden produksi yang paling sering, dan biasanya terjadi tepat saat lalu lintas sedang tinggi.
>
> Implementasi penyegaran dini:
>
> ```ts
> export async function denganCacheSegarDini<T>(
>   kunci: string,
>   ttl: number,
>   hitung: () => Promise<T>,
>   skema: z.ZodType<T>
> ): Promise<T> {
>   // Simpan bersama waktu pembuatan, dan beri TTL dua kali lipat di Redis
>   const mentah = await redis.get(kunci);
>
>   if (mentah) {
>     const terurai = skemaBungkus(skema).safeParse(JSON.parse(mentah));
>
>     if (terurai.success) {
>       const umur = (Date.now() - terurai.data.pada) / 1000;
>
>       if (umur > ttl * 0.8) {
>         // Gembok supaya hanya satu yang menyegarkan
>         const dapat = await redis.set(`segar:${kunci}`, '1', 'EX', 30, 'NX');
>         if (dapat) {
>           void hitung()
>             .then((nilai) => tulisBungkus(kunci, nilai, ttl * 2))
>             .catch((err) => log.warn({ err, kunci }, 'penyegaran latar gagal'))
>             .finally(() => redis.del(`segar:${kunci}`));
>         }
>       }
>
>       return terurai.data.nilai;
>     }
>   }
>
>   // Benar-benar kosong: hitung dengan gembok, seperti pola sebelumnya
>   return denganCacheAman(kunci, ttl, hitung, skema);
> }
> ```
>
> Tiga catatan:
>
> 1. **TTL di Redis dua kali lipat TTL logis.** Dengan begitu, data masih ada saat ambang penyegaran terlewati, dan tidak pernah ada jendela kosong.
> 2. **`void` pada penyegaran latar harus punya penanganan error.** Promise yang ditolak tanpa `catch` di Node bisa menjatuhkan proses, dan ini bentuk kesalahan yang mudah lolos telaah kode.
> 3. **Gembok penyegaran punya TTL sendiri.** Kalau proses mati saat sedang menyegarkan, gembok yang tidak pernah dilepas akan membuat data itu tidak pernah disegarkan lagi.

### Latihan 4: Temukan lima bug cache

Lima potongan ini punya bug cache. Temukan dan jelaskan akibatnya.

```ts
// Tiga potongan untuk Anda telaah di latihan ini
// A
const kunci = `pesanan:${req.params.id}`;
const pesanan = await denganCache(kunci, 300, () => ambilPesanan(req.pelaku, req.params.id));

// B
app.get('/v1/profil/saya', async (req, res) => {
  res.header('cache-control', 'public, max-age=300');
  return ambilProfil(req.pelaku.penggunaId);
});

// C
const kunci = `katalog:${JSON.stringify(req.query)}`;

// D
await dalamTransaksi(db, async (tx) => {
  await repoProduk(tx).perbarui(id, data);
  await redis.del(`produk:${id}`);
});

// E
const stok = await denganCache(`stok:${varianId}`, 60, () => repoVarian.stok(varianId));
if (stok >= jumlah) await buatPesanan(...);
```

> [!jawaban]
>
> **A: kunci tidak memuat pelaku, padahal hasilnya bergantung pelaku.** `ambilPesanan` menyaring berdasarkan tenant dan kepemilikan, jadi pengguna pertama yang berhasil mengisi cache menentukan apa yang dilihat semua orang. Pengguna lain bisa membaca pesanan yang bukan haknya, atau mendapat 404 untuk pesanannya sendiri. Ini bug keamanan, bukan bug performa. Perbaikan: cache di tingkat data mentah dengan kunci `pesanan:{id}`, lalu **pemeriksaan otorisasi dilakukan setelah pembacaan cache**, bukan di dalamnya.
>
> **B: `public` pada data pribadi.** CDN atau proxy di jalur bisa menyimpan profil satu pengguna lalu menyajikannya ke pengguna lain. Ini kebocoran yang pernah terjadi pada layanan besar. Perbaikan: `private, no-store` untuk data pribadi.
>
> **C: `JSON.stringify` pada objek tidak menjamin urutan kunci yang stabil.** `?a=1&b=2` dan `?b=2&a=1` menghasilkan kunci berbeda untuk hasil yang sama, sehingga tingkat kena turun tanpa sebab yang jelas. Dan kalau ada parameter yang tidak memengaruhi hasil, misalnya penanda kampanye dari tautan iklan, setiap pengunjung menghasilkan kunci baru. Perbaikan: susun kunci dari daftar field yang eksplisit, dalam urutan yang tetap.
>
> **D: invalidasi di dalam transaksi.** Dua masalah sekaligus: kalau transaksinya gagal dan di-rollback, cache sudah terhapus padahal datanya tidak berubah, dan yang lebih buruk, ada jendela antara penghapusan cache dan commit di mana pembaca lain mengisi cache dengan **nilai lama** yang baru saja dihapus. Perbaikan: hapus cache setelah commit.
>
> **E: men-cache stok lalu memakainya untuk keputusan.** Ini pola baca-putuskan-tulis dari modul 9, diperburuk cache 60 detik. Stok yang sudah habis masih terlihat tersedia selama satu menit, dan pesanan diterima untuk barang yang tidak ada. Perbaikan: jangan pernah mendasarkan keputusan tulis pada data cache. Tampilkan stok dari cache kalau perlu, dan tetap kurangi dengan `UPDATE ... WHERE stok >= jumlah` sebagai penentu.
>
> Pola yang menghubungkan kelimanya: **cache aman untuk pembacaan yang ditampilkan, berbahaya untuk keputusan.** Dan kunci yang tidak memuat semua yang membedakan hasil adalah kebocoran yang menunggu waktu.

## Batasnya

Cache menyelesaikan pembacaan berulang, dan tiga hal tetap di luarnya.

**Cache tidak menolong penulisan.** Seribu pesanan per detik tetap seribu penulisan ke basis data. Yang menolong di situ: queue untuk menunda yang tidak perlu langsung, dan pada skala ekstrem, partisi dan sharding di modul 24.

**Cache tidak boleh jadi dasar keputusan.** Stok, saldo, dan kuota diputuskan dari sumbernya, dalam transaksi.

**Pekerjaan berat masih dikerjakan di dalam permintaan.** Membuat PDF, mengirim email, memanggil layanan pembayaran, dan menghitung laporan besar tetap membuat pengguna menunggu, dan tetap memblokir event loop seperti di modul 2.

## Rangkuman

- Pertanyaan pertama bukan "berapa TTL", melainkan "apa akibatnya kalau data ini basi lima menit".
- HTTP sudah punya cache. `stale-while-revalidate` menghapus penantian, dan `stale-if-error` membuat layanan Anda tetap bisa dibaca saat basis data tumbang.
- Jangan pernah memasang `public` pada respons yang melewati pemeriksaan otorisasi.
- Kunci cache wajib memuat tenant, pengguna, dan semua yang membedakan hasil, plus prefiks versi untuk perubahan bentuk data.
- Kegagalan Redis tidak boleh menjatuhkan layanan, dan data dari cache tetap divalidasi karena bentuknya bisa dari versi kode lama.
- Invalidasi dilakukan **setelah** commit, bukan di dalam transaksi.
- Untuk membatalkan banyak kunci sekaligus, pakai penanda versi dengan `INCR`, bukan pencarian pola.
- Stampede dicegah dengan gembok, dan lebih baik lagi dengan penyegaran dini sebelum kedaluwarsa. Satu kunci populer yang kedaluwarsa bisa menjatuhkan seluruh layanan lewat pool sambungan.
- Cache dalam proses tidak dibagi antar instance. Aman untuk konfigurasi, berbahaya untuk izin.
- Cache aman untuk pembacaan yang ditampilkan, berbahaya untuk keputusan. Stok dan saldo diputuskan dari sumbernya.
- Ukur tingkat kena. Di bawah 70% berarti TTL terlalu pendek atau kunci terlalu rinci.

## Masalah terbuka

Pembacaan sudah cepat. Sekarang buka berkas yang menangani pembuatan pesanan di Proyek 2, dan hitung apa saja yang terjadi di dalam satu permintaan:

```text
validasi            5 ms
kurangi stok       12 ms
simpan pesanan     15 ms
kirim email       1.400 ms   <- memanggil layanan email
buat PDF struk      900 ms   <- memblokir event loop
kirim notifikasi    600 ms   <- memanggil layanan pihak ketiga
perbarui rekap      300 ms
                 -------
total             3.232 ms
```

Pengguna menunggu 3,2 detik untuk pesanan yang sebenarnya sudah tersimpan setelah 32 milidetik. Lebih buruk lagi: kalau layanan email sedang gangguan, pesanannya **gagal**, padahal stok sudah dikurangi dan pesanan sudah tersimpan. Dan kalau pengguna menutup tab karena lama, dia akan mencoba lagi.

Semua pekerjaan setelah baris ketiga tidak perlu ditunggu siapa pun.

Itu isi modul berikutnya: pekerjaan latar dan queue, percobaan ulang dengan jeda bertambah, dead letter queue, dan cara memastikan pekerjaan yang dijalankan dua kali tidak berakibat dua kali.
