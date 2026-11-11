---
title: 'Modul 3: Server HTTP, Routing, dan Validasi'
description: Dari tiga `if` di node:http jadi layanan dengan rute, middleware, validasi skema, dan penanganan error yang terpusat. Plus satu aturan yang tidak boleh dilanggar: masukan dari luar tidak pernah dipercaya.
date: 2026-12-05
slug: modul-3-http-routing-validasi
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Server di akhir modul 2 bekerja, dan bentuknya tidak bertahan:

```ts
// Bentuk dari akhir modul 2, untuk dibandingkan
const server = createServer(async (req, res) => {
  if (req.url === '/sehat') { /* ... */ }
  if (req.url === '/menunggu') { /* ... */ }
  res.statusCode = 404;
  res.end('tidak ada');
});
```

Tambahkan lima puluh endpoint ke dalam bentuk itu, dan Anda akan menulis ulang hal yang sama lima puluh kali:

| Pekerjaan | Kalau ditulis per endpoint |
| --- | --- |
| Mencocokkan path dan method | Rantai `if` yang tidak bisa dibaca |
| Mengambil parameter dari path seperti `/pesanan/:id` | Pemotongan string dengan tangan |
| Membaca dan mem-parse body | Diulang, dan sering tanpa batas ukuran |
| Memeriksa token | Lima puluh kesempatan untuk lupa |
| Memeriksa bentuk masukan | Lima puluh versi yang berbeda-beda |
| Menyusun respons error | Lima puluh bentuk error yang membingungkan klien |
| Mencatat log permintaan | Tidak ada, atau `console.log` di mana-mana |

Modul ini menyusunnya jadi satu lapisan yang rapi, dan menegakkan satu aturan yang berlaku sampai modul terakhir: **masukan dari luar tidak pernah dipercaya, pada setiap permintaan, tanpa pengecualian.**

## Analogi: satu pintu masuk dengan rangkaian pemeriksaan

Modul 1 memakai analogi kantor berloket. Sekarang perbesar satu bagiannya: jalur yang dilewati setiap pengunjung sebelum sampai ke petugas.

Pengunjung masuk lewat **satu pintu**, bukan lewat jendela mana pun yang kebetulan terbuka. Di jalur itu berturut-turut ada: petugas yang mencatat kedatangan, pemeriksaan kapasitas ("hari ini sudah penuh"), pemeriksaan identitas, pemeriksaan kelengkapan formulir, baru petugas yang mengurus perkaranya. Dan kalau ada yang tidak beres di titik mana pun, pengunjung dapat penjelasan yang sama bentuknya, bukan jawaban berbeda-beda tergantung petugas yang kebetulan menolaknya.

| Dunia kantor | Dunia backend |
| --- | --- |
| Satu pintu masuk | Satu instance aplikasi dengan satu rangkaian middleware |
| Buku catatan kedatangan | Log permintaan dengan id |
| "Hari ini sudah penuh" | Rate limit |
| Pemeriksaan identitas | Autentikasi |
| Pemeriksaan kelengkapan formulir | Validasi skema |
| Petugas yang mengurus perkara | Handler |
| Format penolakan yang seragam | Bentuk respons error yang konsisten |
| Nomor berkas yang bisa disebut saat bertanya | `X-Request-Id` |

Batas analoginya: pengunjung kantor tidak bisa menyelinap langsung ke meja petugas, sedangkan di internet siapa pun bisa memanggil endpoint mana pun, dalam urutan mana pun, dengan isi apa pun. Jadi pemeriksaannya tidak boleh bergantung pada urutan yang Anda harapkan. Setiap handler harus benar meski dipanggil pertama, dipanggil seribu kali, atau dipanggil dengan data yang tidak masuk akal.

## Memilih framework

Lima pilihan yang akan Anda temui, beserta kapan masing-masing masuk akal:

| Pilihan | Kelebihan | Kekurangan | Pilih kalau |
| --- | --- | --- | --- |
| **Fastify** | Cepat, validasi dan serialisasi berbasis skema, plugin terenkapsulasi | Konsep plugin butuh waktu dipahami | Layanan baru di Node, kebanyakan kasus |
| **Express** | Paling banyak dipakai, contoh tersedia di mana-mana | Minim bawaan, penanganan async yang canggung | Proyek yang sudah memakainya |
| **Hono** | Ringan, jalan di Node, Bun, Deno, dan runtime edge | Ekosistem lebih kecil | Target edge atau beberapa runtime |
| **NestJS** | Struktur baku, dependency injection, cocok untuk tim besar | Banyak lapisan, kurva belajar | Tim besar yang butuh keseragaman |
| **`node:http` mentah** | Nol dependensi | Semua ditulis tangan | Belajar, atau layanan satu endpoint |

Seri ini memakai **Fastify**, dengan tiga alasan yang terkait langsung ke materi: validasi berbasis skema sudah jadi bagian dari kerangkanya, sistem plugin memaksa batas yang jelas antar bagian, dan Fastify tidak menyembunyikan HTTP sehingga apa yang Anda pelajari tetap berlaku di tempat lain.

```bash
pnpm add fastify
pnpm add fastify-type-provider-zod zod
pnpm add @fastify/helmet @fastify/cors @fastify/rate-limit @fastify/under-pressure
```

Modul ini juga menambah dua baris ke `src/config.ts` dari modul 2, keduanya dipakai di potongan kode berikutnya:

```ts
// src/config.ts, tambahkan ke dalam z.object({ ... })
BEHIND_PROXY: z.coerce.boolean().default(false),
// Daftar asal yang boleh memanggil API ini, dipisah koma
ALLOWED_ORIGINS: z
  .string()
  .default('http://localhost:5173')
  .transform((v) => v.split(',').map((x) => x.trim())),
```

## Bentuk dasar yang layak dipakai

```ts
// src/app.ts
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { randomUUID } from 'node:crypto';
import { config } from './config.js';
import { rutePesanan } from './fitur/pesanan/rute.js';
import { pasangPenangananError } from './http/error.js';

export function buatApp() {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      // Jangan pernah mencatat kredensial
      redact: ['req.headers.authorization', 'req.headers.cookie', 'body.sandi'],
    },
    // Id permintaan yang akan ikut di semua baris log permintaan ini
    genReqId: (req) => (req.headers['x-request-id'] as string) ?? randomUUID(),
    // Batas ukuran body, berlaku untuk semua rute kecuali yang menimpanya
    bodyLimit: 1 * 1024 * 1024,
    // Jangan percaya header proxy kecuali Anda yang mengelola proxy-nya
    trustProxy: config.BEHIND_PROXY,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  pasangPenangananError(app);

  app.get('/sehat', { logLevel: 'warn' }, async () => ({ status: 'ok' }));

  app.register(rutePesanan, { prefix: '/v1/pesanan' });

  return app;
}
```

```ts
// src/server.ts
import { buatApp } from './app.js';
import { config } from './config.js';

const app = buatApp();

try {
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
} catch (error) {
  app.log.error(error, 'gagal menyalakan server');
  process.exit(1);
}

// Matikan dengan rapi: berhenti menerima permintaan baru,
// selesaikan yang sedang berjalan, baru keluar. Rinciannya di modul 22.
for (const sinyal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(sinyal, async () => {
    app.log.info({ sinyal }, 'mematikan server');
    await app.close();
    process.exit(0);
  });
}
```

Lima keputusan di potongan itu yang pantas ditiru:

**`host: '0.0.0.0'`.** Bawaan Node hanya mendengarkan localhost, dan di dalam container itu berarti tidak ada yang bisa menghubunginya. Ini penyebab "jalan di laptop, tidak jalan di Docker" yang paling sering terjadi.

**Id permintaan dari header kalau ada.** Dengan begitu id yang dibuat gateway atau layanan pemanggil ikut terbawa, dan satu permintaan bisa dilacak melintasi beberapa layanan. Modul 19 memakainya.

**`redact` pada logger.** Mencatat seluruh header berarti mencatat token. Daftar ini ditulis sekali, dan menghemat satu insiden kebocoran.

**`bodyLimit` yang eksplisit.** Tanpa ini, `JSON.parse` dari modul 2 bisa dipanggil dengan payload 50 MB oleh siapa pun.

**`logLevel: 'warn'` pada health check.** Endpoint ini dipanggil beberapa kali per detik oleh platform. Mencatatnya pada level info akan menenggelamkan log Anda dengan kebisingan.

## Rute, validasi, dan tiga lapisan

Satu berkas rute per fitur, dan handler-nya tetap tipis.

```ts
// src/fitur/pesanan/skema.ts
import { z } from 'zod';

export const paramsPesanan = z.object({
  id: z.string().uuid('id pesanan harus berupa UUID'),
});

export const kueriDaftar = z.object({
  status: z.enum(['menunggu', 'dibayar', 'dikirim', 'batal']).optional(),
  // Masukan dari URL selalu string, jadi perlu diubah dan dibatasi
  limit: z.coerce.number().int().min(1).max(100).default(20),
  kursor: z.string().optional(),
});

export const bodyBuatPesanan = z.object({
  idempotencyKey: z.string().min(16).max(128),
  item: z
    .array(
      z.object({
        produkId: z.string().uuid(),
        jumlah: z.number().int().min(1).max(99),
      })
    )
    .min(1, 'pesanan harus punya minimal satu item')
    .max(50, 'maksimal 50 item per pesanan'),
  catatan: z.string().trim().max(500).optional(),
});

export const pesananResponse = z.object({
  id: z.string().uuid(),
  status: z.enum(['menunggu', 'dibayar', 'dikirim', 'batal']),
  total: z.number().int(),
  dibuatPada: z.string().datetime(),
});
```

```ts
// src/fitur/pesanan/rute.ts
import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { bodyBuatPesanan, kueriDaftar, paramsPesanan, pesananResponse } from './skema.js';
import { layananPesanan } from './layanan.js';

export const rutePesanan: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/',
    { schema: { querystring: kueriDaftar, response: { 200: z.object({
      data: z.array(pesananResponse),
      kursorBerikutnya: z.string().nullable(),
    }) } } },
    async (req) => {
      // req.query sudah tervalidasi dan bertipe. Tidak ada `as` di sini.
      return layananPesanan.daftar(req.user.id, req.query);
    }
  );

  app.get(
    '/:id',
    { schema: { params: paramsPesanan, response: { 200: pesananResponse } } },
    async (req) => layananPesanan.ambil(req.user.id, req.params.id)
  );

  app.post(
    '/',
    { schema: { body: bodyBuatPesanan, response: { 201: pesananResponse } } },
    async (req, res) => {
      const pesanan = await layananPesanan.buat(req.user.id, req.body);

      res.status(201).header('Location', `/v1/pesanan/${pesanan.id}`);
      return pesanan;
    }
  );
};
```

Tiga hal yang didapat dari skema di tempat itu, dan ketiganya bukan sekadar kenyamanan:

**Tipe tanpa penegasan.** `req.body.item[0].jumlah` bertipe `number` karena memang sudah diperiksa, bukan karena Anda menulis `as`. Lubang yang dibahas di seri frontend modul 8 tertutup di sini.

**Dokumentasi otomatis.** Skema yang sama bisa diubah jadi OpenAPI, dan itu pekerjaan Proyek 1.

**Respons yang ikut disaring.** Ini manfaat yang paling sering diremehkan: dengan skema respons, field yang tidak Anda daftarkan **tidak akan terkirim**. Kalau suatu hari seseorang menambahkan kolom `catatanInternal` ke tabel dan mengembalikan seluruh baris, field itu tidak bocor ke klien. Satu lapisan pengaman yang bekerja tanpa diingat siapa pun.

Lapisan di bawahnya persis seperti di modul 1:

```ts
// src/fitur/pesanan/layanan.ts
export const layananPesanan = {
  async buat(penggunaId: string, masukan: BodyBuatPesanan) {
    // Aturan bisnis hidup di sini, bukan di handler.
    // Tidak ada satu pun hal tentang HTTP di berkas ini.
    const produk = await repoProduk.ambilBanyak(masukan.item.map((i) => i.produkId));

    if (produk.length !== masukan.item.length) {
      throw new ErrorTidakDitemukan('Sebagian produk tidak tersedia');
    }

    const total = hitungTotal(masukan.item, produk);

    return repoPesanan.simpan({ penggunaId, total, item: masukan.item });
  },
};
```

Keuntungannya terasa di modul 15 dan 21: fungsi `buat` yang sama bisa dipanggil dari worker queue dan dari test, tanpa menyalakan server HTTP.

## Penanganan error yang terpusat

Ini bagian yang paling menentukan kualitas sebuah API, dan paling sering dikerjakan setengah jalan.

```ts
// src/http/error.ts
export class ErrorAplikasi extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly kode: string,
    readonly detail?: unknown
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ErrorTidakDitemukan extends ErrorAplikasi {
  constructor(pesan = 'Sumber daya tidak ditemukan') {
    super(pesan, 404, 'TIDAK_DITEMUKAN');
  }
}

export class ErrorKonflik extends ErrorAplikasi {
  constructor(pesan: string, detail?: unknown) {
    super(pesan, 409, 'KONFLIK', detail);
  }
}

export class ErrorTidakBerhak extends ErrorAplikasi {
  constructor(pesan = 'Tidak berhak melakukan tindakan ini') {
    super(pesan, 403, 'TIDAK_BERHAK');
  }
}

// Pelanggaran aturan bisnis: bentuk permintaannya benar, isinya melanggar aturan.
// Kodenya ditentukan pemanggil, karena tiap aturan punya kode sendiri.
export class ErrorAturanBisnis extends ErrorAplikasi {
  constructor(pesan: string, kode: string, detail?: unknown) {
    super(pesan, 422, kode, detail);
  }
}
```

Empat kelas pertama menutupi kegagalan yang bentuknya selalu sama. Yang kelima berbeda: `ErrorAturanBisnis` dipakai untuk pelanggaran aturan yang khas bagi domain Anda, misalnya "stok tidak cukup" atau "anggota sudah meminjam tiga buku", dan karena itu kodenya ikut sebagai parameter. Kelas inilah yang paling sering dilempar di lapisan service sepanjang sisa seri ini.

```ts
// src/http/error.ts, lanjutan
export function pasangPenangananError(app: FastifyInstance) {
  app.setNotFoundHandler((req, res) => {
    res.status(404).send({
      kode: 'RUTE_TIDAK_ADA',
      pesan: `Tidak ada ${req.method} ${req.url}`,
      requestId: req.id,
    });
  });

  app.setErrorHandler((error, req, res) => {
    // 1. Error validasi dari skema
    if (error.validation) {
      req.log.info({ err: error }, 'permintaan tidak lolos validasi');

      return res.status(422).send({
        kode: 'VALIDASI_GAGAL',
        pesan: 'Sebagian isian tidak valid',
        perKolom: ringkasIsuValidasi(error),
        requestId: req.id,
      });
    }

    // 2. Error yang kita lempar sendiri, dengan pesan yang memang untuk pengguna
    if (error instanceof ErrorAplikasi) {
      req.log.info({ kode: error.kode }, error.message);

      return res.status(error.status).send({
        kode: error.kode,
        pesan: error.message,
        detail: error.detail,
        requestId: req.id,
      });
    }

    // 3. Error yang tidak kita duga: catat lengkap, balas seminim mungkin
    req.log.error({ err: error }, 'kesalahan tidak tertangani');

    return res.status(500).send({
      kode: 'KESALAHAN_INTERNAL',
      pesan: 'Terjadi kesalahan di sisi kami. Sebutkan id ini saat melapor.',
      requestId: req.id,
    });
  });
}
```

Empat aturan yang terkandung di dalamnya:

**Satu, jangan pernah mengirim pesan error mentah ke klien.** Jejak tumpukan, nama tabel, dan pesan driver basis data adalah informasi yang berguna bagi penyerang. Catat semuanya di log, kirim yang minimum.

**Dua, sertakan `requestId` di setiap respons error.** Pengguna melaporkan "error saat menyimpan", menyebut id-nya, dan Anda menemukan baris lognya dalam hitungan detik. Tanpa ini, menelusuri satu keluhan di jutaan baris log adalah pekerjaan setengah hari.

**Tiga, bedakan level log.** Permintaan yang gagal validasi bukan kesalahan sistem, jadi `info` atau `warn`. Kesalahan tidak terduga `error`. Kalau semuanya dicatat sebagai error, peringatan Anda jadi tidak berarti.

**Empat, `kode` yang stabil, bukan hanya pesan.** Klien memakai `kode` untuk mengambil keputusan, dan pesan boleh diubah kapan saja tanpa merusak klien. Teks pesan adalah untuk manusia, kode adalah untuk program.

Soal bentuk respons error, ada standar yang bisa dipakai: RFC 9457 dengan `application/problem+json`. Memakainya berguna kalau API Anda dikonsumsi pihak luar. Yang penting bukan standarnya, tapi konsistensinya: **satu bentuk untuk semua error, di semua endpoint.**

## Lapisan pelindung

Empat plugin yang pantas ada di hampir semua layanan:

```ts
// src/app.ts, di dalam buatApp() sebelum rute didaftarkan
// Urutannya mengikuti prinsip di modul 1: tolak sedini mungkin
await app.register(import('@fastify/helmet'));          // header keamanan
await app.register(import('@fastify/cors'), {
  origin: config.ALLOWED_ORIGINS,                       // jangan pakai true
  credentials: true,
});
await app.register(import('@fastify/rate-limit'), {
  max: 100,
  timeWindow: '1 minute',
  // Batas per pengguna kalau sudah terautentikasi, per IP kalau belum
  keyGenerator: (req) => req.user?.id ?? req.ip,
});
await app.register(import('@fastify/under-pressure'), {
  maxEventLoopDelay: 1000,
  maxHeapUsedBytes: 1_000_000_000,
  // Menolak dengan 503 saat proses sudah kewalahan, bukan ikut tumbang
  retryAfter: 10,
});
```

Plugin terakhir adalah penerapan langsung dari modul 2: plugin itu membaca lag event loop, lalu menolak permintaan baru dengan 503 saat proses sudah tidak sanggup daripada menerima semuanya lalu melambat untuk semua orang. Pola itu disebut load shedding, dan modul 20 membahasnya lebih jauh.

Satu catatan tentang CORS: `origin: true` berarti "izinkan semua asal", dan itu sering dipasang saat mengejar tenggat lalu tertinggal selamanya. Daftar asal yang diizinkan datang dari konfigurasi, dan berbeda antara pengembangan dan produksi.

## Buktikan jalan

Empat perintah yang membuktikan seluruh isi modul ini terpasang dengan benar. Jalankan `pnpm dev` di terminal pertama, lalu dari terminal kedua:

```bash
# 1. Rute sehat
curl -s localhost:3000/sehat | jq

# 2. Rute yang tidak ada: bentuk error harus sama seperti error lain
curl -s localhost:3000/tidak-ada | jq

# 3. Body yang melanggar skema
curl -s -X POST localhost:3000/v1/pesanan \
  -H 'content-type: application/json' \
  -d '{"item": []}' | jq

# 4. Body yang melebihi batas ukuran
head -c 2000000 /dev/zero | tr '\0' 'a' > /tmp/besar.txt
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/v1/pesanan \
  -H 'content-type: application/json' --data-binary @/tmp/besar.txt
```

Yang Anda harapkan:

```json
{ "status": "ok" }
```

```json
{
  "kode": "RUTE_TIDAK_ADA",
  "pesan": "Tidak ada GET /tidak-ada",
  "requestId": "req-1"
}
```

```json
{
  "kode": "VALIDASI_GAGAL",
  "pesan": "Sebagian isian tidak valid",
  "perKolom": { "item": ["pesanan harus punya minimal satu item"] },
  "requestId": "req-2"
}
```

```text
413
```

Periksa empat hal dari hasil itu, karena keempatnya adalah inti modul ini. Bentuk error nomor 2 dan 3 **identik strukturnya** meski penyebabnya berbeda. Keduanya membawa `requestId` yang bisa Anda cari di log terminal pertama. Nomor 3 menyebutkan kolom mana yang salah, bukan hanya "bad request". Dan nomor 4 ditolak dengan 413 **sebelum** body-nya di-parse, yang berarti batas ukuran Anda bekerja.

## Latihan

### Latihan 1: Dari `node:http` ke Fastify

Bangun API catatan sederhana dua kali, dan rasakan perbedaannya.

**Bagian A, dengan `node:http` saja.** Empat endpoint: `GET /catatan`, `GET /catatan/:id`, `POST /catatan`, `DELETE /catatan/:id`. Penyimpanan di memori. Syaratnya: parameter path diambil dari URL, body dibaca dengan batas ukuran 100 kB, isi body diperiksa (judul wajib, 3 sampai 120 huruf), dan semua error punya bentuk JSON yang sama.

**Bagian B, dengan Fastify dan Zod.** Fungsi yang sama.

Catat tiga hal: jumlah baris masing-masing, berapa lama Anda mengerjakannya, dan apa yang Anda lupakan di bagian A.

> [!petunjuk]
> Untuk bagian A, bagian yang paling melelahkan adalah membaca body dengan batas ukuran. Ingat dari modul 2: `req` adalah stream, jadi datanya datang bertahap, dan Anda harus menolak begitu akumulasinya melewati batas, bukan setelah semuanya diterima.

> [!jawaban]
>
> Bagian yang paling banyak orang lupakan di bagian A:
>
> ```ts
> // Membaca body dengan benar lebih rumit daripada dugaan
> async function bacaBody(req: IncomingMessage, batas = 100_000): Promise<unknown> {
>   const potongan: Buffer[] = [];
>   let ukuran = 0;
>
>   for await (const bagian of req) {
>     ukuran += bagian.length;
>
>     // Tolak di tengah jalan, jangan tunggu sampai 50 MB masuk memori
>     if (ukuran > batas) {
>       req.destroy();
>       throw new ErrorAplikasi('Body terlalu besar', 413, 'TERLALU_BESAR');
>     }
>
>     potongan.push(bagian);
>   }
>
>   if (ukuran === 0) return undefined;
>
>   try {
>     return JSON.parse(Buffer.concat(potongan).toString('utf8'));
>   } catch {
>     throw new ErrorAplikasi('Body bukan JSON yang valid', 400, 'JSON_RUSAK');
>   }
> }
> ```
>
> Lima hal yang biasanya terlewat di bagian A, dan semuanya ditangani Fastify:
>
> 1. **Content-Type tidak diperiksa.** Permintaan dengan `text/plain` berisi JSON tetap diterima, atau sebaliknya.
> 2. **Error di dalam handler async tidak tertangkap.** Pada `node:http`, promise yang ditolak tanpa `try/catch` akan membuat permintaan menggantung sampai batas waktu klien, dan pada konfigurasi tertentu bisa mematikan proses.
> 3. **Tidak ada batas waktu permintaan.** Klien yang membuka sambungan lalu mengirim satu byte per menit menahan sumber daya Anda.
> 4. **Path dicocokkan dengan `startsWith` atau `split('/')`.** Tidak menangani garis miring di ujung, parameter kueri, maupun karakter yang di-encode.
> 5. **Respons error berbeda bentuk di tiap tempat**, karena ditulis di tiap tempat.
>
> Perbandingan khas: bagian A sekitar 180 baris dan masih punya lima lubang di atas. Bagian B sekitar 70 baris, termasuk skema, dan kelima lubang itu tertutup.
>
> Nilai latihan ini bukan "framework lebih sedikit baris". Nilainya: Anda sekarang tahu **apa** yang dikerjakan framework untuk Anda, jadi saat ada yang aneh, Anda tahu di mana mencarinya.

### Latihan 2: Tulis skema untuk endpoint yang berantakan

Endpoint ini menerima apa saja. Tulis skema Zod untuk params, query, body, dan respons, lalu sebutkan setiap batas yang Anda pasang beserta alasannya.

```ts
// Endpoint yang harus Anda perbaiki di latihan ini
// POST /v1/toko/:tokoId/produk?draf=true
app.post('/v1/toko/:tokoId/produk', async (req, res) => {
  const { tokoId } = req.params as any;
  const body = req.body as any;

  const produk = await db.produk.simpan({
    tokoId,
    nama: body.nama,
    harga: body.harga,
    stok: body.stok,
    kategori: body.kategori,
    tag: body.tag,
    deskripsi: body.deskripsi,
    beratGram: body.beratGram,
    varian: body.varian,
    draf: (req.query as any).draf === 'true',
  });

  return res.send(produk);
});
```

> [!petunjuk]
> Untuk setiap field, tanyakan empat hal: tipenya apa, wajib atau tidak, apa batas bawah dan atasnya, dan apa yang terjadi kalau nilainya ekstrem. Harga negatif, stok 10 juta, dan array tag berisi 50 ribu elemen semuanya harus punya jawaban.

> [!jawaban]
>
> ```ts
> const paramsToko = z.object({ tokoId: z.string().uuid() });
>
> const kueriSimpan = z.object({
>   // "true" dan "1" diterima, sisanya dianggap false
>   draf: z
>     .enum(['true', 'false', '1', '0'])
>     .default('false')
>     .transform((v) => v === 'true' || v === '1'),
> });
>
> const bodyProduk = z.object({
>   nama: z.string().trim().min(3).max(140),
>   // Uang dalam rupiah: bilangan bulat, tanpa desimal, tidak negatif
>   harga: z.number().int().min(0).max(1_000_000_000),
>   stok: z.number().int().min(0).max(1_000_000),
>   kategori: z.string().trim().min(1).max(60),
>   tag: z.array(z.string().trim().min(1).max(30)).max(20).default([]),
>   deskripsi: z.string().trim().max(5_000).optional(),
>   beratGram: z.number().int().min(1).max(150_000),
>   varian: z
>     .array(
>       z.object({
>         nama: z.string().trim().min(1).max(60),
>         hargaTambahan: z.number().int().min(0).max(1_000_000_000).default(0),
>         stok: z.number().int().min(0).max(1_000_000),
>       })
>     )
>     .max(50)
>     .default([]),
> });
>
> const produkResponse = z.object({
>   id: z.string().uuid(),
>   nama: z.string(),
>   harga: z.number().int(),
>   stok: z.number().int(),
>   draf: z.boolean(),
>   diperbaruiPada: z.string().datetime(),
> });
> ```
>
> Enam keputusan yang pantas dijelaskan:
>
> 1. **Harga sebagai bilangan bulat rupiah, bukan desimal.** Bilangan pecahan biner tidak bisa menyimpan nilai uang dengan tepat, dan penjumlahan berulang menghasilkan selisih satu rupiah yang memalukan di laporan keuangan. Simpan satuan terkecil sebagai bilangan bulat. Modul 5 kembali ke topik ini untuk tipe kolomnya.
> 2. **Setiap angka punya batas atas.** Tanpa `max`, seseorang bisa mengirim stok `9e15`, dan kerusakannya baru terlihat di laporan.
> 3. **Setiap array punya `max`.** `varian` tanpa batas berarti satu permintaan bisa membuat 100 ribu baris di basis data. Ini bukan soal validasi data, melainkan soal batas beban kerja seperti di modul 2.
> 4. **`draf` tidak diterima sebagai boolean langsung.** Parameter kueri selalu string, dan `Boolean("false")` bernilai `true`. Ini bug klasik yang membuat semua produk tersimpan sebagai draf.
> 5. **`tokoId` dari params tidak cukup divalidasi bentuknya.** Memastikan pemanggil benar-benar berhak atas toko itu adalah pekerjaan otorisasi, dan tidak bisa dikerjakan skema. Modul 12 membahasnya.
> 6. **Respons punya skema sendiri yang lebih sempit.** Kolom seperti `catatanInternal`, `biayaModal`, atau `skorRisiko` tidak akan pernah terkirim meski ada di baris basis data.

### Latihan 3: Rancang penanganan error untuk satu layanan

Sebuah layanan punya tujuh kegagalan yang mungkin terjadi. Untuk masing-masing, tentukan status code, apakah klien boleh mencoba lagi, level log, dan apa yang boleh disebut di pesan.

| # | Kegagalan |
| --- | --- |
| 1 | Body bukan JSON valid |
| 2 | `produkId` tidak ada di basis data |
| 3 | Stok tidak cukup |
| 4 | Pengguna bukan pemilik toko |
| 5 | Basis data menolak sambungan |
| 6 | Layanan pembayaran tidak menjawab dalam 3 detik |
| 7 | Kunci idempotency sama dengan permintaan yang masih diproses |

> [!petunjuk]
> Untuk tiap kegagalan, pisahkan dua pertanyaan yang sering tercampur: apakah **bentuk** permintaannya salah, atau bentuknya benar tapi **keadaannya** tidak mengizinkan? Jawaban itu memisahkan 4xx dari 4xx yang lain. Lalu untuk kolom "boleh ulang", tanyakan apakah mengulang bisa memperbaiki keadaan tanpa campur tangan pemanggil. Nomor 6 adalah yang paling sulit, dan petunjuknya: Anda tidak tahu apakah operasinya terjadi atau tidak.

> [!pembahasan]
>
> | # | Status | Boleh ulang | Level log | Pesan ke klien |
> | --- | --- | --- | --- | --- |
> | 1 | 400 | Tidak, sampai diperbaiki | info | "Body bukan JSON yang valid" |
> | 2 | 422 | Tidak | info | "Sebagian produk tidak tersedia" tanpa menyebut id mana kalau bisa dipakai menebak katalog |
> | 3 | 409 | Ya, setelah stok berubah | info | "Stok tidak cukup", sertakan sisa stok kalau memang publik |
> | 4 | 404, bukan 403 | Tidak | warn | "Toko tidak ditemukan" |
> | 5 | 503 | **Ya**, sertakan `Retry-After` | error | "Layanan sedang terganggu, coba beberapa saat lagi" |
> | 6 | 504 atau 503 | Ya, dengan hati-hati | error | "Pembayaran belum dapat dipastikan, jangan ulangi tanpa kunci idempotency" |
> | 7 | 409 | Ya, setelah jeda | info | "Permintaan dengan kunci ini masih diproses" |
>
> Lima penjelasan yang jadi inti latihan ini:
>
> **Nomor 4 memakai 404, bukan 403.** Membalas 403 untuk toko milik orang lain memberi tahu penyerang bahwa toko itu ada. Dengan menyamakan jawaban "tidak ada" dan "bukan milik Anda", id tidak bisa dipetakan. Pola ini dipakai sepanjang seri, dan modul 12 menerapkannya secara menyeluruh.
>
> **Nomor 5 adalah 503, bukan 500.** Perbedaannya penting bagi pemanggil: 500 berarti "ada yang salah di kode mereka, mengulang tidak akan membantu", 503 berarti "coba lagi nanti". Sertakan `Retry-After` supaya pemanggil tidak membanjiri Anda saat baru pulih.
>
> **Nomor 6 adalah yang paling berbahaya di seluruh tabel.** Batas waktu pada pembayaran berarti Anda **tidak tahu** apakah pembayarannya terjadi. Jangan pernah membalas dengan pesan yang membuat klien mengulang tanpa kunci idempotency, karena akibatnya pelanggan terdebet dua kali. Pola yang benar: catat permintaan sebagai "belum pasti", periksa statusnya ke penyedia secara terpisah, dan modul 16 membahas pola rekonsiliasinya.
>
> **Nomor 2 memakai 422, bukan 404.** Produk yang tidak ada bukan berarti endpoint-nya tidak ada. 404 untuk isi body akan membingungkan klien yang menyimpulkan URL-nya salah.
>
> **Level log bukan hiasan.** Nomor 1 sampai 3 adalah hal normal yang terjadi ratusan kali sehari. Kalau dicatat sebagai `error`, grafik error Anda penuh kebisingan dan peringatan yang benar-benar penting akan terlewat.

### Latihan 4: Temukan enam masalah

Handler ini lolos telaah kode di banyak tim. Temukan enam masalahnya.

```ts
// Handler yang harus Anda telaah. Temukan enam masalahnya.
app.post('/v1/transfer', async (req, res) => {
  const { dariRekening, keRekening, jumlah } = req.body as any;

  const saldo = await db.rekening.saldo(dariRekening);

  if (saldo < jumlah) {
    return res.status(400).send({ error: 'Saldo tidak cukup' });
  }

  await db.rekening.kurangi(dariRekening, jumlah);
  await db.rekening.tambah(keRekening, jumlah);

  console.log('transfer', req.body);

  return res.send({ sukses: true, saldoBaru: saldo - jumlah });
});
```

> [!jawaban]
>
> | # | Masalah | Akibat |
> | --- | --- | --- |
> | 1 | Tidak ada autentikasi dan otorisasi | Siapa pun bisa memindahkan uang dari rekening mana pun. Ini masalah terbesarnya |
> | 2 | `as any` tanpa validasi | `jumlah` bisa negatif (transfer terbalik), berupa string, atau `1e308` |
> | 3 | Dua operasi tanpa transaksi | Kalau proses mati setelah `kurangi`, uang hilang. Modul 9 |
> | 4 | Pola baca lalu tulis | Dua permintaan bersamaan sama-sama lolos pemeriksaan saldo. Modul 9 |
> | 5 | Tidak idempoten | Klik ganda atau percobaan ulang klien berarti transfer dobel. Modul 4 |
> | 6 | `console.log(req.body)` | Mencatat data keuangan ke log tanpa penyaringan, dan tanpa id permintaan |
>
> Dua masalah tambahan yang pantas disebut: status 400 untuk saldo tidak cukup sebaiknya 409 atau 422 karena bentuk permintaannya benar, dan `saldoBaru` yang dihitung di aplikasi bisa tidak sama dengan saldo sebenarnya kalau ada transaksi lain yang masuk bersamaan. Kembalikan nilai yang dibaca ulang dari basis data setelah transaksi, atau jangan kembalikan sama sekali.
>
> Bentuk yang benar, dengan bagian yang akan dibangun di modul 9:
>
> ```ts
> app.post(
>   '/v1/transfer',
>   {
>     schema: { body: bodyTransfer, response: { 200: transferResponse } },
>     onRequest: [app.autentikasi],
>     config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
>   },
>   async (req) => {
>     // Otorisasi: rekening sumber harus milik pengguna ini
>     await pastikanPemilikRekening(req.user.id, req.body.dariRekening);
>
>     // Satu transaksi, dengan pengurangan bersyarat di dalam basis data,
>     // dan kunci idempotency yang disimpan. Modul 9.
>     return layananTransfer.jalankan({
>       penggunaId: req.user.id,
>       ...req.body,
>       kunci: req.headers['idempotency-key'],
>     });
>   }
> );
> ```
>
> Perhatikan: handler-nya jadi lebih pendek, dan semua hal yang berbahaya dipindahkan ke tempat yang memang bertanggung jawab atas hal itu. Itu tujuan dari seluruh modul ini.

## Batasnya

Lapisan HTTP yang rapi menyelesaikan bentuk, dan tidak menyelesaikan isi.

**Validasi tidak menjamin kebenaran.** Skema memastikan `jumlah` adalah bilangan bulat positif. Bahwa pengguna punya saldo sebanyak itu, dan bahwa dia berhak memindahkannya, adalah pertanyaan lain sama sekali.

**Semua kode di modul ini masih kehilangan datanya saat proses dimatikan.** Penyimpanan di memori hanya cukup untuk latihan.

**Bentuk API-nya belum dirancang, hanya ditulis.** Nama endpoint, bentuk respons, cara membagi halaman, cara menangani permintaan ganda, dan cara mengubah API tanpa merusak klien adalah keputusan yang pantas diambil sadar.

## Rangkuman

- Satu rangkaian middleware untuk seluruh layanan: log, pelindung, rate limit, auth, validasi, baru handler. Tolak sedini mungkin.
- Skema di tingkat rute memberi tiga hal sekaligus: tipe tanpa penegasan, bahan dokumentasi, dan penyaringan respons yang mencegah kebocoran field.
- Handler tipis, aturan bisnis di service, kueri di repository. Service tidak boleh tahu apa pun tentang HTTP.
- Satu bentuk respons error untuk seluruh API, dengan `kode` yang stabil untuk program dan `pesan` untuk manusia, plus `requestId` di setiap error.
- Jangan pernah mengirim error mentah ke klien. Catat lengkap di log, balas seminim mungkin.
- Bedakan level log: permintaan yang gagal validasi adalah `info`, kesalahan tak terduga adalah `error`.
- Setiap masukan punya batas: ukuran body, panjang string, nilai maksimum angka, dan jumlah elemen array.
- `host: '0.0.0.0'`, id permintaan dari header, `redact` pada logger, dan penutupan yang rapi pada SIGTERM adalah hal yang dipasang di hari pertama.
- 404 dipakai untuk menyamarkan sumber daya milik orang lain, 503 dengan `Retry-After` untuk gangguan sementara.

## Masalah terbuka

Layanan Anda sekarang punya rute, validasi, dan error yang konsisten. Pertanyaan berikutnya datang dari orang yang memakainya.

Seorang engineer Android akan mengintegrasikan API Anda. Dia bertanya: daftar pesanan dibagi halaman dengan cara apa, dan apa yang terjadi kalau ada pesanan baru masuk saat dia di halaman tiga? Kalau dia mengirim permintaan pembuatan pesanan dan jaringannya mati sebelum respons sampai, bagaimana cara dia memastikan tidak membuat dua pesanan? Field `total` itu dalam rupiah atau sen? Kalau nanti Anda mengubah bentuk respons, aplikasinya yang sudah terpasang di ribuan ponsel akan rusak atau tidak?

Tidak satu pun dari pertanyaan itu bisa dijawab dengan "pakai Fastify". Semuanya keputusan desain.

Itu isi modul berikutnya: desain API yang dipakai orang, mulai dari pemodelan sumber daya sampai idempotency, pagination, dan cara mengubah API tanpa merusak klien.
