---
title: 'Modul 19: Ketahanan dan Degradasi'
description: Layanan Anda tumbang karena layanan orang lain lambat, bukan karena mati. Batas waktu, pemutus arus, pemisahan sumber daya, penolakan beban, dan degradasi yang disengaja.
date: 2026-12-24
slug: modul-19-ketahanan-dan-degradasi
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Penyedia pembayaran Anda tidak mati. Ia hanya melambat, dari 200 ms jadi 30 detik. Inilah yang terjadi setelahnya:

```text
00:00  Latensi penyedia naik ke 30 detik
00:05  Setiap permintaan yang memanggilnya menahan satu sambungan 30 detik
00:20  Pool sambungan basis data habis, karena transaksi menunggu panggilan itu
00:40  Permintaan yang tidak terkait mulai gagal, karena tidak dapat sambungan
01:10  Health check ikut gagal, platform mematikan instance yang "tidak sehat"
01:30  Instance tersisa menerima beban lebih besar, lalu tumbang juga
```

Layanan Anda mati total karena layanan orang lain **lambat**, dan tidak ada satu pun bug di kode Anda.

Pola ini punya nama, dan menyadarinya mengubah cara Anda menulis setiap panggilan keluar:

| Pola | Apa yang terjadi |
| --- | --- |
| **Penularan kegagalan** | Satu ketergantungan lambat menghabiskan sumber daya bersama, lalu semua ikut gagal |
| **Badai percobaan ulang** | Semua klien mengulang bersamaan, memukul layanan yang baru pulih sampai tumbang lagi |
| **Gagal total daripada gagal sebagian** | Fitur pinggiran yang rusak menjatuhkan fitur utama |
| **Health check yang menipu** | Layanan yang sibuk dinyatakan mati, lalu dimatikan tepat saat paling dibutuhkan |

Modul ini tentang empat pertahanannya: **batasi waktu, batasi sumber daya, berhenti memanggil yang sedang rusak, dan putuskan apa yang boleh hilang.**

## Analogi: kantor saat satu layanan terganggu

Kantor dari modul 1 punya satu loket yang bergantung pada verifikasi dari kantor pusat lewat telepon. Suatu hari kantor pusat kewalahan dan tidak mengangkat telepon.

**Kantor yang tidak siap.** Petugas loket menelepon, lalu menunggu di sambungan. Pengunjung di depannya menunggu. Petugas kedua juga menelepon dan menunggu. Dalam sepuluh menit, kelima petugas memegang telepon, dan pengunjung yang hanya ingin mengambil formulir juga tidak terlayani. Kantor tutup efektif, padahal 80% layanannya tidak butuh verifikasi pusat.

**Kantor yang siap.** Ada aturan: telepon ditutup setelah sepuluh detik tanpa jawaban. Hanya dua dari lima petugas yang boleh menelepon pada satu waktu. Setelah lima kali gagal berturut-turut, semua petugas berhenti menelepon selama satu menit, dan pengunjung yang butuh verifikasi diberi tahu "layanan ini sedang terganggu, silakan kembali besok atau tinggalkan nomor Anda". Delapan puluh persen layanan tetap jalan.

| Dunia kantor | Dunia backend |
| --- | --- |
| Telepon ditutup setelah 10 detik | Batas waktu |
| Hanya 2 dari 5 petugas boleh menelepon | Bulkhead, pemisahan sumber daya |
| Berhenti menelepon setelah 5 kali gagal | Circuit breaker, pemutus arus |
| "Silakan kembali besok" | Degradasi yang disengaja |
| "Tinggalkan nomor Anda" | Memindahkan ke pekerjaan latar |
| Menolak pengunjung baru saat antrean penuh | Load shedding, penolakan beban |
| Papan "sistem verifikasi sedang gangguan" | Halaman status dan pesan yang jujur |
| Semua petugas menelepon lagi pada detik yang sama | Badai percobaan ulang |

Batas analoginya: petugas manusia bisa menilai situasi dan memutuskan sendiri. Kode tidak. Setiap aturan di kolom kanan harus ditulis, dan yang tidak ditulis berarti tidak ada.

## Batas waktu di setiap sambungan keluar

Aturan paling sederhana dan paling sering dilanggar: **setiap panggilan yang keluar dari proses Anda harus punya batas waktu.**

```ts
// Berbahaya: tanpa batas waktu. Bawaan fetch di Node adalah menunggu
// sampai sistem operasi menyerah, dan itu bisa menit.
const respons = await fetch(url);

// Benar
const respons = await fetch(url, { signal: AbortSignal.timeout(3_000) });
```

Daftar tempat yang butuh batas waktu, dan bawaannya hampir selalu tidak memadai:

| Sambungan | Batas yang wajar | Bawaan kalau tidak diset |
| --- | --- | --- |
| HTTP ke layanan lain | 1 sampai 5 detik | Sangat lama |
| Kueri basis data | `statement_timeout` 10 detik | Tidak terbatas |
| Menunggu kunci baris | `lock_timeout` 3 detik | Tidak terbatas |
| Mendapat sambungan dari pool | 5 detik | Tidak terbatas pada sebagian klien |
| Perintah Redis | 1 detik | Beberapa detik |
| Permintaan HTTP masuk | 15 detik | Tidak terbatas |
| Pekerjaan queue | Sesuai jenis pekerjaan | Tidak terbatas |

Dan satu konsep yang menyatukan semuanya: **anggaran waktu.**

```ts
// Permintaan punya anggaran 3 detik. Setiap panggilan keluar
// hanya boleh memakai sisa anggaran, bukan batas waktunya sendiri.
export function buatAnggaran(totalMs: number) {
  const mulai = Date.now();

  return {
    sisa: () => Math.max(0, totalMs - (Date.now() - mulai)),

    signal(maksMs: number) {
      const sisa = this.sisa();
      if (sisa <= 0) throw new ErrorAnggaranHabis();

      return AbortSignal.timeout(Math.min(maksMs, sisa));
    },
  };
}

// Pemakaian
const anggaran = buatAnggaran(3_000);

const profil = await fetch(urlProfil, { signal: anggaran.signal(1_000) });
const harga = await fetch(urlHarga, { signal: anggaran.signal(1_500) });
// Kalau dua panggilan pertama memakai 2,8 detik, panggilan ketiga
// hanya dapat 200 ms, bukan 1,5 detik lagi
```

Tanpa anggaran, tiga panggilan yang masing-masing dibatasi 3 detik bisa menghabiskan 9 detik, melewati batas waktu klien Anda sendiri. Dan konsep yang sama berlaku melintasi layanan: teruskan sisa anggaran sebagai header, supaya layanan hilir tidak mengerjakan sesuatu yang sudah tidak ada gunanya.

## Percobaan ulang yang tidak merusak

Percobaan ulang menyelamatkan, dan percobaan ulang yang salah menjatuhkan layanan.

```ts
export async function denganPercobaanUlang<T>(
  kerjakan: (percobaanKe: number) => Promise<T>,
  opsi: {
    maks?: number;
    dasarMs?: number;
    bolehDiulang: (error: unknown) => boolean;
    anggaran?: { sisa: () => number };
  }
): Promise<T> {
  const maks = opsi.maks ?? 3;

  for (let ke = 1; ke <= maks; ke++) {
    try {
      return await kerjakan(ke);
    } catch (error) {
      if (!opsi.bolehDiulang(error) || ke === maks) throw error;

      // Jeda bertambah dengan jitter penuh.
      // Tanpa jitter, seribu klien mengulang pada milidetik yang sama.
      const dasar = (opsi.dasarMs ?? 200) * 2 ** (ke - 1);
      const jeda = Math.random() * dasar;

      // Jangan menunggu lebih lama daripada sisa anggaran
      if (opsi.anggaran && jeda > opsi.anggaran.sisa()) throw error;

      await tidur(jeda);
    }
  }

  throw new Error('tidak terjangkau');
}
```

Empat aturan percobaan ulang, dan masing-masing pernah jadi penyebab insiden:

**Satu, hanya untuk operasi idempoten.** Mengulang `POST /bayar` tanpa kunci idempotensi berarti pelanggan terdebet dua kali. Ini pelajaran modul 4 yang jadi syarat di sini.

**Dua, hanya untuk kegagalan yang layak diulang.** 500, 503, batas waktu, dan kegagalan jaringan layak. 400, 401, 403, 404, dan 422 tidak: mengulanginya pasti gagal lagi.

**Tiga, jitter wajib.** Jeda eksponensial tanpa jitter mengubah seribu klien yang gagal bersamaan jadi seribu klien yang mengulang bersamaan. Layanan yang baru pulih akan tumbang lagi, dan siklusnya bisa berlangsung berjam-jam.

**Empat, percobaan ulang tidak boleh berlapis.** Klien mengulang 3 kali, gateway mengulang 3 kali, dan layanan Anda mengulang 3 kali: satu permintaan pengguna jadi 27 permintaan ke layanan hilir. Pada insiden, itu melipatgandakan beban tepat saat beban sudah berlebih. Putuskan satu lapisan yang bertanggung jawab mengulang, dan matikan di lapisan lain.

Satu teknik yang menggantikan percobaan ulang untuk sebagian kasus: **hedging.** Kirim permintaan kedua kalau yang pertama belum menjawab dalam p95, lalu pakai yang lebih dulu tiba. Berguna untuk pembacaan yang idempoten dan latensinya tidak merata, dan jangan dipakai untuk penulisan.

## Pemutus arus

Kalau sebuah ketergantungan sedang rusak, memanggilnya terus hanya membuang sumber daya Anda dan memperlambat pemulihannya.

```ts
type Keadaan = 'tertutup' | 'terbuka' | 'setengah';

export function buatPemutusArus(opsi: {
  nama: string;
  ambangKegagalan: number;    // persentase, misal 50
  minPermintaan: number;      // jangan putuskan dari 2 sampel
  jedaTerbukaMs: number;
}) {
  let keadaan: Keadaan = 'tertutup';
  let gagal = 0;
  let total = 0;
  let bukaSampai = 0;

  return {
    async jalankan<T>(kerjakan: () => Promise<T>, mundur?: () => Promise<T>): Promise<T> {
      if (keadaan === 'terbuka') {
        if (Date.now() < bukaSampai) {
          metrik.pemutusDitolak.inc({ nama: opsi.nama });

          // Tidak memanggil sama sekali: gagal cepat, atau pakai jalan mundur
          if (mundur) return mundur();
          throw new ErrorKetergantunganTidakTersedia(opsi.nama);
        }

        // Coba satu permintaan untuk melihat apakah sudah pulih
        keadaan = 'setengah';
      }

      try {
        const hasil = await kerjakan();

        if (keadaan === 'setengah') {
          keadaan = 'tertutup';
          gagal = 0;
          total = 0;
        }

        total++;
        return hasil;
      } catch (error) {
        gagal++;
        total++;

        const persenGagal = (gagal / total) * 100;

        if (
          keadaan === 'setengah' ||
          (total >= opsi.minPermintaan && persenGagal >= opsi.ambangKegagalan)
        ) {
          keadaan = 'terbuka';
          bukaSampai = Date.now() + opsi.jedaTerbukaMs;
          gagal = 0;
          total = 0;

          log.error({ nama: opsi.nama }, 'pemutus arus terbuka');
          metrik.pemutusTerbuka.set({ nama: opsi.nama }, 1);
        }

        if (mundur) return mundur();
        throw error;
      }
    },
  };
}
```

```ts
const pemutusHarga = buatPemutusArus({
  nama: 'layanan-harga',
  ambangKegagalan: 50,
  minPermintaan: 20,
  jedaTerbukaMs: 30_000,
});

// Harga promo adalah fitur pinggiran: kalau layanannya rusak,
// tampilkan harga normal, jangan gagalkan seluruh katalog
const harga = await pemutusHarga.jalankan(
  () => ambilHargaPromo(produkId),
  async () => ({ hargaRp: produk.hargaNormal, promo: null })
);
```

Tiga catatan penting:

**Pemutus arus hanya masuk akal untuk ketergantungan yang punya jalan mundur atau yang kegagalannya tidak fatal.** Untuk basis data utama, memutus arus tidak menolong: tanpa basis data, layanan Anda memang tidak bisa bekerja. Yang menolong di situ adalah batas waktu dan penolakan beban.

**Ambangnya berbasis persentase, bukan jumlah.** Lima kegagalan dari sepuluh ribu permintaan adalah normal. Lima kegagalan dari sepuluh permintaan adalah masalah.

**Keadaan pemutus harus terlihat di metrik.** Pemutus yang terbuka tanpa ada yang tahu akan membuat fitur hilang diam-diam selama berjam-jam.

## Pemisahan sumber daya

Dari insiden di modul 18: satu endpoint ekspor menghabiskan pool sambungan, lalu seluruh layanan gagal. Pencegahannya memisahkan sumber dayanya.

```ts
// Pool terpisah untuk beban yang berbeda sifatnya
export const poolUtama = new Pool({ connectionString: url, max: 8 });

// Laporan dan ekspor: pool kecil, batas waktu panjang, dan idealnya
// mengarah ke replika baca sehingga tidak bersaing dengan transaksi
export const poolLaporan = new Pool({
  connectionString: config.DATABASE_REPLICA_URL ?? url,
  max: 2,
  statement_timeout: 120_000,
});
```

Dengan ini, sepuluh permintaan ekspor bersamaan paling banyak memakai dua sambungan, dan jalur pembelian tetap punya delapan. Ekspor jadi lebih lambat saat ramai, dan itu memang yang diinginkan: **yang terdampak adalah fitur yang menyebabkannya.**

Pola yang sama berlaku untuk hal lain:

| Sumber daya | Pemisahan |
| --- | --- |
| Pool basis data | Transaksi, laporan, dan pekerjaan latar punya pool sendiri |
| Worker queue | Queue terpisah per jenis, supaya pekerjaan lambat tidak menahan yang cepat |
| Panggilan keluar | Batas konkurensi per ketergantungan, bukan satu batas untuk semua |
| Proses | API dan worker berjalan sebagai proses terpisah, seperti di modul 14 |

```ts
// Batas konkurensi per ketergantungan
const batasPenyediaEmail = buatSemafor(10);
const batasPenyediaPembayaran = buatSemafor(5);

await batasPenyediaEmail.jalankan(() => kirimEmail(data));
```

Tanpa batas per ketergantungan, satu penyedia yang melambat akan menyerap seluruh slot konkurensi worker Anda, dan pekerjaan untuk penyedia lain yang sehat ikut tertahan.

## Penolakan beban

Saat sebuah layanan menerima lebih banyak daripada kemampuannya, menerima semuanya membuat **semua** permintaan lambat sampai tidak ada yang berguna. Menolak sebagian membuat sisanya tetap terlayani dengan baik.

```ts
await app.register(import('@fastify/under-pressure'), {
  maxEventLoopDelay: 1_000,
  maxHeapUsedBytes: 1_200_000_000,
  maxRssBytes: 1_500_000_000,
  retryAfter: 10,

  // Pemeriksaan tambahan: pool basis data
  healthCheck: async () => {
    const terpakai = poolUtama.totalCount - poolUtama.idleCount;
    return terpakai / poolUtama.options.max < 0.95;
  },
  healthCheckInterval: 5_000,
});
```

Tiga prinsip penolakan beban:

**Satu, tolak sedini mungkin.** Permintaan yang ditolak di gateway tidak memakai sumber daya apa pun. Yang ditolak setelah kueri basis data sudah membayar harganya.

**Dua, tolak dengan 503 dan `Retry-After`, bukan dengan menggantung.** Klien yang mendapat jawaban cepat bisa memutuskan tindakan. Klien yang menunggu tak berujung memegang sumber daya di kedua sisi.

**Tiga, prioritaskan kalau bisa.** Saat kewalahan, permintaan pembayaran lebih penting daripada permintaan daftar produk. Satu bentuk sederhananya: batas laju yang lebih ketat untuk endpoint yang mahal dan tidak kritis, dan prioritas lebih rendah untuk lalu lintas dari kunci API dibanding dari pengguna sungguhan.

## Health check yang tidak menipu

Dari latihan modul 2: health check yang gagal karena layanan sedang sibuk menyebabkan platform mematikan instance tepat saat paling dibutuhkan. Jawabannya memisahkan dua pertanyaan yang berbeda.

```ts
// Liveness: apakah proses ini masih hidup dan perlu dibiarkan?
// JANGAN periksa ketergantungan apa pun di sini.
app.get('/sehat', { logLevel: 'silent' }, async () => ({ status: 'ok' }));

// Readiness: apakah proses ini siap menerima lalu lintas?
// Di sini ketergantungan boleh diperiksa.
app.get('/siap', { logLevel: 'silent' }, async (_req, res) => {
  const hasil = await Promise.allSettled([
    periksaDb(),      // SELECT 1 dengan batas waktu 1 detik
    periksaRedis(),   // PING dengan batas waktu 500 ms
  ]);

  const db = hasil[0].status === 'fulfilled';
  const redis = hasil[1].status === 'fulfilled';

  // Basis data wajib. Redis tidak: tanpa cache layanan tetap bekerja.
  if (!db || sedangDimatikan) {
    return res.status(503).send({ status: 'belum-siap', db, redis });
  }

  return { status: 'siap', db, redis };
});
```

Empat aturan health check:

| Aturan | Alasan |
| --- | --- |
| Liveness tidak memeriksa ketergantungan | Basis data yang mati sebentar tidak boleh membuat semua instance dimatikan bersamaan |
| Readiness memeriksa yang wajib saja | Redis yang mati tidak boleh mengeluarkan instance dari lalu lintas |
| Keduanya punya batas waktu sangat pendek | Health check yang lambat sendiri jadi masalah |
| Readiness mengembalikan 503 saat sedang dimatikan | Supaya load balancer berhenti mengirim permintaan sebelum proses keluar |

Baris pertama pantas ditekankan, karena kesalahan di sini menghasilkan kegagalan yang paling buruk: kalau liveness memeriksa basis data dan basis data mati 30 detik, **semua** instance dinyatakan mati dan dimatikan bersamaan. Saat basis data pulih, tidak ada satu pun instance yang hidup untuk melayani, dan pemulihan jadi jauh lebih lama.

## Penutupan yang rapi

Setiap deploy mematikan proses. Tanpa penutupan yang rapi, permintaan yang sedang berjalan terputus dan pekerjaan yang sedang diproses diulang dari awal.

```ts
let sedangDimatikan = false;

async function tutupDenganRapi(sinyal: string) {
  if (sedangDimatikan) return;
  sedangDimatikan = true;

  log.info({ sinyal }, 'mulai menutup');

  // 1. Readiness jadi 503 supaya load balancer berhenti mengirim permintaan baru.
  //    Beri waktu load balancer menyadarinya sebelum berhenti menerima.
  await tidur(config.JEDA_DRAIN_MS ?? 5_000);

  // 2. Berhenti menerima sambungan baru, selesaikan yang sedang jalan
  await app.close();

  // 3. Worker queue: berhenti mengambil pekerjaan baru, selesaikan yang dipegang
  await Promise.all(semuaWorker.map((w) => w.close()));

  // 4. Tutup sambungan panjang dengan pesan sambung ulang (modul 16)
  tutupSemuaSambunganRealtime();

  // 5. Baru tutup sumber daya bersama
  await Promise.all([poolUtama.end(), poolLaporan.end(), redis.quit()]);

  log.info('penutupan selesai');
  process.exit(0);
}

for (const sinyal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(sinyal, () => void tutupDenganRapi(sinyal));
}

// Jaring terakhir: kalau penutupan menggantung, paksa keluar
process.on('SIGTERM', () => {
  setTimeout(() => {
    log.error('penutupan terlalu lama, memaksa keluar');
    process.exit(1);
  }, 30_000).unref();
});
```

Urutan langkah 1 dan 2 itu yang paling sering salah: **menutup server sebelum load balancer tahu** berarti permintaan yang sudah dikirim ke instance ini akan gagal. Jeda beberapa detik dengan readiness 503 memberi load balancer kesempatan mengeluarkan instance dari rotasi.

## Matriks degradasi

Latihan paling berguna dari seluruh modul ini: tuliskan apa yang terjadi saat setiap ketergantungan gagal, lalu putuskan dengan sengaja.

| Ketergantungan gagal | Yang **harus** tetap jalan | Yang boleh hilang | Cara |
| --- | --- | --- | --- |
| Redis | Semua, lebih lambat | Tidak ada | Cache gagal tanpa suara, modul 13 |
| Penyedia pembayaran | Katalog, keranjang, riwayat | Pembuatan pembayaran baru | Pesan jujur, pembayaran bisa dicoba lagi |
| Penyedia email | Semua | Email seketika | Queue menahan, terkirim saat pulih |
| Penyimpanan objek | Semua kecuali unggah dan unduh berkas | Gambar produk | Gambar pengganti, dan CDN dengan `stale-if-error` |
| Broker peristiwa | API penuh | Reaksi hilir, sementara | Outbox menahan, modul 15 |
| Layanan rekomendasi | Semua | Bagian rekomendasi | Jalan mundur: produk terlaris |
| **Postgres primary** | Pembacaan dari replika kalau ada | Semua penulisan | Halaman status, pesan jujur, jangan pura-pura jalan |

Baris terakhir pantas dibahas: **tidak semua kegagalan bisa didegradasi, dan mengakuinya adalah keputusan yang benar.** Layanan yang pura-pura menerima pesanan saat basis data mati menciptakan masalah yang lebih besar daripada menolak dengan jujur.

Tiga hal yang membuat degradasi benar-benar bekerja:

**Satu, jalan mundur harus diuji.** Kode jalan mundur yang tidak pernah dijalankan hampir pasti rusak. Jalankan di lingkungan uji dengan sengaja mematikan ketergantungannya.

**Dua, pengguna harus diberi tahu dengan jujur.** "Rekomendasi sedang tidak tersedia" lebih baik daripada bagian kosong tanpa penjelasan. Dan "pembayaran sedang terganggu, pesanan Anda tersimpan dan bisa dibayar nanti" jauh lebih baik daripada error umum.

**Tiga, degradasi harus terlihat di metrik.** Layanan yang berjalan dengan tiga fitur dalam mode mundur selama dua hari tanpa ada yang tahu adalah kegagalan pemantauan, bukan keberhasilan ketahanan.

## Latihan

### Latihan 1: Bangun klien yang tahan banting

Buat satu klien HTTP yang dipakai untuk semua panggilan keluar di Proyek 4, dengan batas waktu, percobaan ulang yang benar, pemutus arus, batas konkurensi, dan metrik.

> [!petunjuk]
> Buat satu instance klien per ketergantungan, bukan satu untuk semua. Pemutus arus dan batas konkurensi harus per ketergantungan: penyedia email yang rusak tidak boleh memutus arus ke penyedia pembayaran.

> [!jawaban]
>
> ```ts
> export function buatKlien(opsi: {
>   nama: string;
>   dasarUrl: string;
>   batasWaktuMs: number;
>   konkurensiMaks: number;
>   percobaanMaks: number;
> }) {
>   const pemutus = buatPemutusArus({
>     nama: opsi.nama,
>     ambangKegagalan: 50,
>     minPermintaan: 20,
>     jedaTerbukaMs: 30_000,
>   });
>
>   const semafor = buatSemafor(opsi.konkurensiMaks);
>
>   // Agent dengan keep-alive: pelajaran modul 1 tentang sambungan yang dipakai ulang
>   const agent = new Agent({
>     keepAliveTimeout: 30_000,
>     connections: opsi.konkurensiMaks,
>   });
>
>   return {
>     async minta<T>(
>       path: string,
>       init: RequestInit & { idempoten?: boolean; anggaran?: Anggaran } = {}
>     ): Promise<T> {
>       const mulai = Date.now();
>
>       try {
>         return await semafor.jalankan(() =>
>           pemutus.jalankan(() =>
>             denganPercobaanUlang(
>               async (ke) => {
>                 const respons = await fetch(`${opsi.dasarUrl}${path}`, {
>                   ...init,
>                   dispatcher: agent,
>                   signal: init.anggaran
>                     ? init.anggaran.signal(opsi.batasWaktuMs)
>                     : AbortSignal.timeout(opsi.batasWaktuMs),
>                   headers: {
>                     ...init.headers,
>                     // Kunci idempotensi yang sama di semua percobaan
>                     ...(init.idempoten ? { 'idempotency-key': kunciTetap(init) } : {}),
>                     // Teruskan konteks jejak, modul 18
>                     ...pembawaJejak(),
>                   },
>                 });
>
>                 if (!respons.ok) throw ErrorHttp.dari(respons);
>                 return (await respons.json()) as T;
>               },
>               {
>                 // Percobaan ulang hanya untuk GET, atau POST yang idempoten
>                 maks: init.idempoten || init.method === 'GET' ? opsi.percobaanMaks : 1,
>                 bolehDiulang: (e) => layakDiulang(e),
>                 anggaran: init.anggaran,
>               }
>             )
>           )
>         );
>       } finally {
>         metrik.panggilanKeluar.observe(
>           { ketergantungan: opsi.nama },
>           (Date.now() - mulai) / 1000
>         );
>       }
>     },
>   };
> }
> ```
>
> Lima keputusan yang membedakannya dari `fetch` biasa:
>
> 1. **Percobaan ulang bergantung pada idempotensi, bukan pada metode saja.** `POST` dengan kunci idempotensi boleh diulang, dan itu pelajaran modul 4 yang terpakai di sini.
> 2. **Kunci idempotensi sama di semua percobaan.** Membuat kunci baru per percobaan menghapus seluruh manfaatnya, dan ini kesalahan yang mudah lolos telaah kode.
> 3. **Semafor di luar pemutus arus.** Dengan urutan ini, permintaan yang ditolak pemutus tidak memakai slot konkurensi.
> 4. **`finally` untuk metrik.** Durasi dicatat termasuk saat gagal, karena latensi kegagalan adalah data yang berguna.
> 5. **Agent dengan keep-alive dan batas sambungan.** Tanpa keep-alive, setiap panggilan membangun ulang TLS seperti di Latihan 1 modul 1. Dan batas sambungan agent adalah lapisan kedua di bawah semafor.

### Latihan 2: Rancang health check dan buktikan tidak menipu

Pasang liveness dan readiness di Proyek 4, lalu uji empat skenario.

| # | Skenario | Yang harus terjadi |
| --- | --- | --- |
| 1 | Postgres mati | Liveness tetap 200, readiness 503 |
| 2 | Redis mati | Liveness 200, readiness **200** |
| 3 | Event loop tertahan 3 detik | Liveness tetap menjawab, atau platform tidak boleh mematikan |
| 4 | SIGTERM dikirim | Readiness 503 segera, permintaan berjalan selesai |

> [!jawaban]
>
> Skenario 3 yang paling sering salah dan paling berbahaya.
>
> Kalau event loop tertahan tiga detik oleh pekerjaan berat, health check Anda **tidak akan dijawab** sama sekali, karena penanganannya juga berjalan di event loop yang sama. Platform menyimpulkan proses mati, lalu mematikannya. Hasilnya: proses dimatikan tepat saat sedang paling sibuk, dan pekerjaannya pindah ke instance lain yang kemudian mengalami hal yang sama. Itu kegagalan berantai yang dipicu oleh pemantauan sendiri.
>
> Tiga pertahanannya:
>
> 1. **Batas waktu liveness yang longgar di platform.** Beri 3 sampai 5 kegagalan berturut-turut sebelum mematikan, bukan satu, dan jangan setel batas waktunya terlalu ketat.
> 2. **Hapus penyebabnya.** Event loop yang tertahan tiga detik adalah masalah modul 2 yang harus diperbaiki, bukan ditutupi dengan konfigurasi health check.
> 3. **Pisahkan beban berat ke proses lain.** Worker yang memproses pekerjaan berat tidak melayani HTTP, sehingga event loop API tetap bebas.
>
> Dan skenario 2 adalah uji keputusan desain: readiness yang gagal karena Redis mati akan mengeluarkan **semua** instance dari rotasi, dan layanan Anda mati total padahal ia sanggup bekerja tanpa cache. Daftar ketergantungan yang wajib harus dibuat dengan sengaja, dan daftar itu biasanya hanya berisi satu hal: basis data utama.
>
> ```ts
> const KETERGANTUNGAN_WAJIB = ['db'] as const;    // bukan redis, bukan broker
> ```

### Latihan 3: Tulis matriks degradasi untuk layanan Anda

Buat matriks lengkap untuk Proyek 4: setiap ketergantungan, apa yang tetap jalan, apa yang hilang, dan bagaimana caranya. Lalu kerjakan jalan mundurnya untuk tiga ketergantungan.

> [!pembahasan]
>
> Pola jawaban yang muncul, dan tiga kelompok yang berbeda:
>
> **Kelompok 1: kegagalan yang tidak boleh terasa.** Redis, broker peristiwa, penyedia email, dan layanan rekomendasi. Semuanya punya jalan mundur yang sudah dibangun di modul sebelumnya: cache yang gagal tanpa suara, outbox yang menahan, queue yang menunda, dan nilai pengganti.
>
> **Kelompok 2: kegagalan yang terasa tapi terkurung.** Penyedia pembayaran dan penyimpanan objek. Fitur yang bergantung padanya berhenti, dan sisanya jalan. Yang perlu dikerjakan: pesan yang jujur, dan jalur untuk melanjutkan nanti.
>
> ```ts
> // Pembayaran tidak tersedia: pesanan tetap dibuat dengan status menunggu
> const hasil = await pemutusPembayaran.jalankan(
>   () => penyediaPembayaran.buatTagihan(pesanan),
>   async () => {
>     // Jalan mundur: tandai perlu dicoba lagi, dan beri tahu pengguna
>     await repoPesanan.tandaiPembayaranTertunda(pesanan.id);
>     await antreanPembayaran.tambah(
>       { pesananId: pesanan.id, idempotensi: `tagihan:${pesanan.id}` },
>       { delay: 60_000 }
>     );
>
>     return {
>       status: 'tertunda',
>       pesan: 'Pembayaran sedang terganggu. Pesanan Anda tersimpan, '
>            + 'dan kami kirim tautan pembayaran begitu pulih.',
>     };
>   }
> );
> ```
>
> **Kelompok 3: kegagalan yang tidak bisa didegradasi.** Postgres primary. Kalau ada replika baca, pembacaan bisa dilayani dengan catatan datanya mungkin sedikit tertinggal. Penulisan berhenti, dan itu harus dinyatakan dengan jujur.
>
> ```ts
> // Mode baca saja, dinyalakan manual atau otomatis saat primary tidak terjangkau
> app.addHook('onRequest', async (req, res) => {
>   if (!modeBacaSaja) return;
>
>   const mengubah = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
>
>   if (mengubah) {
>     return res.status(503).header('retry-after', '120').send({
>       kode: 'MODE_BACA_SAJA',
>       pesan: 'Sistem sedang dalam pemeliharaan. Pembacaan tersedia, '
>            + 'perubahan data akan bisa dilakukan beberapa saat lagi.',
>     });
>   }
> });
> ```
>
> Satu hal yang akan Anda temukan saat mengerjakannya: **menulis matriks ini memunculkan pertanyaan produk yang belum pernah ditanyakan.** Misalnya: kalau penyedia pembayaran mati tiga jam, apakah kita tetap menerima pesanan dengan janji tautan pembayaran menyusul, atau menolak dari awal? Itu bukan keputusan teknis, dan satu-satunya cara menjawabnya adalah bertanya ke pemilik produk, sebelum kejadian.

### Latihan 4: Matikan ketergantungan dengan sengaja

Jalankan enam percobaan pada Proyek 4, catat apa yang terjadi, lalu perbaiki yang tidak sesuai matriks Anda.

| # | Percobaan |
| --- | --- |
| 1 | Matikan Redis |
| 2 | Buat penyedia pembayaran menjawab setelah 60 detik |
| 3 | Buat penyedia pembayaran menjawab 500 untuk 100% permintaan |
| 4 | Matikan Postgres selama 30 detik, lalu nyalakan |
| 5 | Kirim 10 kali beban normal selama 2 menit |
| 6 | Kirim SIGTERM saat 50 permintaan dan 20 pekerjaan sedang berjalan |

> [!jawaban]
>
> | # | Yang biasanya terjadi tanpa persiapan | Yang seharusnya terjadi |
> | --- | --- | --- |
> | 1 | Layanan error total, karena cache dianggap wajib | Lebih lambat, semua fitur jalan |
> | 2 | **Seluruh layanan tumbang**, pool habis menunggu | Pembayaran gagal cepat dalam 3 detik, fitur lain normal |
> | 3 | Error dikembalikan ke pengguna 100% | Pemutus arus terbuka setelah 20 permintaan, gagal cepat, jalan mundur aktif |
> | 4 | Instance dimatikan platform karena liveness gagal | Liveness tetap hidup, readiness 503, pulih sendiri |
> | 5 | Semua permintaan lambat sampai tidak ada yang berguna | Sebagian ditolak 503, sisanya tetap cepat |
> | 6 | Permintaan dan pekerjaan terputus di tengah | Semuanya selesai, lalu proses keluar |
>
> Percobaan kedua adalah yang paling membuka mata, dan paling tidak terduga: **layanan yang lambat lebih berbahaya daripada layanan yang mati.** Layanan yang mati langsung memberi error, dan kode Anda menanganinya. Layanan yang lambat menahan sumber daya Anda tanpa pernah memberi jawaban, dan tidak ada satu pun error yang muncul sampai semuanya terlambat.
>
> Cara membuat ketergantungan lambat untuk pengujian:
>
> ```ts
> // Layanan tiruan yang bisa dibuat berperilaku buruk
> app.post('/tiruan/pembayaran', async (_req, res) => {
>   const mode = process.env.MODE_TIRUAN ?? 'normal';
>
>   if (mode === 'lambat') await tidur(60_000);
>   if (mode === 'gagal') return res.status(500).send({ pesan: 'gangguan' });
>   if (mode === 'menggantung') await new Promise(() => {});   // tidak pernah menjawab
>   if (mode === 'acak' && Math.random() < 0.3) {
>     return res.status(503).send({ pesan: 'sedang sibuk' });
>   }
>
>   return { status: 'berhasil', referensi: idBaru() };
> });
> ```
>
> Dua catatan terakhir:
>
> **Mode `menggantung` adalah yang paling penting diuji**, karena itu yang paling sering terjadi di jaringan nyata: sambungan terbuka, tidak ada data, tidak ada penutupan. Tanpa batas waktu, kode Anda menunggu selamanya.
>
> **Jadikan percobaan ini bagian dari pengujian rutin, bukan acara tahunan.** Satu berkas test dengan enam skenario di atas, dijalankan di CI setiap minggu, akan menangkap kemunduran ketahanan yang masuk bersama fitur baru. Ini bentuk paling sederhana dari rekayasa kekacauan, dan jauh lebih berharga daripada yang terdengar rumit.

## Batasnya

Ketahanan yang dikerjakan baik tetap punya tiga batas.

**Tidak semua kegagalan bisa didegradasi.** Basis data utama yang mati berarti penulisan berhenti. Mengakui itu dengan jujur lebih baik daripada pura-pura berjalan.

**Pola ini menambah kerumitan.** Pemutus arus, pool terpisah, dan jalan mundur adalah kode tambahan yang harus dirawat dan diuji. Pasang untuk ketergantungan yang memang penting, bukan untuk semuanya.

**Ketahanan tidak menggantikan kapasitas.** Penolakan beban membuat sebagian pengguna tetap terlayani saat kewalahan, dan tidak membuat layanan Anda sanggup melayani lebih banyak. Untuk itu, kapasitasnya memang harus ditambah.

## Rangkuman

- Layanan yang lambat lebih berbahaya daripada yang mati, karena ia menahan sumber daya Anda tanpa memberi error.
- Setiap panggilan keluar punya batas waktu, dan satu permintaan punya anggaran waktu yang dibagi ke semua panggilan di dalamnya.
- Percobaan ulang hanya untuk operasi idempoten dan kegagalan yang layak diulang, selalu dengan jitter, dan hanya di satu lapisan.
- Pemutus arus untuk ketergantungan yang punya jalan mundur, dengan ambang berbasis persentase, dan keadaannya terlihat di metrik.
- Pisahkan sumber daya: pool basis data per jenis beban, queue per jenis pekerjaan, batas konkurensi per ketergantungan.
- Penolakan beban membuat sebagian permintaan tetap cepat. Tolak sedini mungkin, dengan 503 dan `Retry-After`.
- Liveness tidak memeriksa ketergantungan, readiness memeriksa yang wajib saja. Kesalahan di sini mematikan semua instance bersamaan.
- Penutupan rapi dimulai dengan readiness 503 dan jeda, sebelum berhenti menerima sambungan.
- Tulis matriks degradasi: setiap ketergantungan, apa yang tetap jalan, dan apa yang boleh hilang. Menulisnya akan memunculkan pertanyaan produk yang belum pernah ditanyakan.
- Jalan mundur yang tidak pernah diuji hampir pasti rusak. Jalankan uji mematikan ketergantungan secara rutin, termasuk mode menggantung.

## Masalah terbuka

Layanan Anda sekarang tahan terhadap ketergantungan yang rusak, punya pemantauan yang memberi tahu lebih dulu, dan punya jalan mundur yang dirancang. Ada satu hal yang belum pernah dibahas sejak modul pertama.

Semua yang Anda bangun sejauh ini diuji dengan cara yang sama: menjalankannya, memanggilnya dengan `curl` atau Postman, lalu melihat hasilnya. Dan setiap rilis mempertaruhkan ulang semua yang sudah jalan.

Hitung saja yang sudah ada: sepuluh aturan bisnis perpustakaan, pengurangan stok yang tahan konkurensi, idempotensi di empat tempat, otorisasi dengan empat peran kali lima belas endpoint, isolasi tenant lewat RLS, lima konsumen peristiwa yang harus idempoten, dan sekarang matriks degradasi dengan tujuh jalan mundur.

Tidak ada manusia yang bisa memeriksa semuanya dengan tangan sebelum setiap rilis. Dan yang paling berbahaya bukan fitur yang jelas rusak, melainkan yang rusak hanya pada keadaan tertentu: dua permintaan bersamaan, peristiwa yang tiba dua kali, atau peran yang kebetulan tidak pernah diuji.

Itu isi modul berikutnya: testing backend, dari unit sampai uji integrasi terhadap Postgres sungguhan dan uji beban, beserta cara memutuskan apa yang pantas diuji dan apa yang justru membuang waktu.
