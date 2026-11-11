---
title: 'Modul 18: Observability'
description: Pukul dua pagi, satu pelanggan melapor dan Anda punya ratusan ribu baris log dari tujuh proses. Logging terstruktur, metrik, dan tracing yang membuat pertanyaan "apa yang terjadi" bisa dijawab dalam hitungan menit.
date: 2026-12-23
slug: modul-18-observability
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Pukul dua pagi, satu pesan masuk: "pesanan saya tidak bisa dibuat sejak satu jam lalu."

Tanpa observability, Anda hanya punya pertanyaan:

| Pertanyaan | Jawaban yang tersedia |
| --- | --- |
| Permintaan mana yang miliknya? | Tidak tahu, log tidak punya penanda |
| Masalahnya di API, worker, atau penyedia pembayaran? | Tidak tahu, harus membaca tiga log terpisah |
| Satu pelanggan atau seribu? | Tidak tahu, tidak ada hitungan |
| Sejak kapan tepatnya? | Hanya dari kesaksian pelanggan |
| Apakah sudah membaik atau makin buruk? | Tidak tahu |
| Apa yang berubah satu jam lalu? | Mungkin deploy, mungkin bukan |

Dengan observability yang dipasang benar, keenam pertanyaan itu dijawab dalam lima menit. Dan yang lebih berharga: Anda sudah tahu sebelum pelanggan mengirim pesan.

Modul ini tentang tiga hal yang saling melengkapi, dan satu yang mengikatnya:

| Alat | Menjawab | Bentuk |
| --- | --- | --- |
| **Log** | Apa yang terjadi pada satu kejadian | Baris terstruktur dengan konteks |
| **Metrik** | Berapa banyak, seberapa sering, seberapa lama | Angka yang diagregasi, murah disimpan |
| **Trace** | Waktunya habis di mana, melintasi banyak komponen | Rangkaian rentang waktu yang terhubung |
| **Id korelasi** | Menghubungkan ketiganya untuk satu permintaan | Satu id yang ikut ke mana-mana |

Baris terakhir yang paling sering terlewat, dan tanpa itu ketiga alat di atasnya hanya jadi tiga tumpukan data yang tidak bisa disambungkan.

## Analogi: tiga catatan di rumah sakit

Bayangkan rumah sakit yang ingin menjawab "kenapa pasien ini menunggu empat jam".

**Rekam medis per pasien.** Catatan rinci satu pasien: pukul berapa datang, keluhannya apa, siapa yang memeriksa, apa yang diberikan. Sangat rinci, dan tidak bisa menjawab "apakah hari ini lebih sibuk dari biasanya". Itu log.

**Papan statistik harian.** Jumlah pasien per jam, rata-rata waktu tunggu, persentase yang dirujuk. Tidak menyebut satu pun nama, dan langsung menjawab "hari ini lebih sibuk". Itu metrik.

**Kartu perjalanan pasien.** Satu lembar yang mengikuti pasien dari pendaftaran, ke poli, ke laboratorium, ke apotek, dengan cap waktu di setiap meja. Langsung terlihat bahwa tiga jam dari empat jam itu dihabiskan menunggu hasil laboratorium. Itu trace.

**Nomor rekam medis.** Satu nomor yang tertulis di ketiganya, sehingga catatan apotek bisa disambungkan dengan catatan poli. Itu id korelasi.

| Dunia rumah sakit | Dunia backend |
| --- | --- |
| Rekam medis | Log terstruktur |
| Papan statistik | Metrik |
| Kartu perjalanan dengan cap waktu | Trace dan span |
| Nomor rekam medis | `trace_id` dan `request_id` |
| "Rata-rata tunggu 20 menit" yang menyembunyikan yang 4 jam | Rata-rata yang menyembunyikan p99 |
| Alarm yang berbunyi untuk setiap hal kecil | Peringatan yang diabaikan karena terlalu sering |
| Buku prosedur gawat darurat | Runbook |

Batas analoginya: rumah sakit punya perawat yang melihat ruang tunggu penuh dan bertindak tanpa data. Backend tidak punya mata. Apa pun yang tidak Anda ukur tidak ada, dan satu-satunya yang Anda ketahui tentang produksi adalah yang Anda putuskan untuk dicatat.

## Log terstruktur

Aturan pertamanya: **log adalah data, bukan tulisan untuk manusia.**

```ts
// Tidak bisa dicari, dan tidak bisa diagregasi
console.log(`Pesanan ${id} gagal untuk user ${userId}: ${error.message}`);

// Bisa dicari, difilter, dihitung, dan dibuat grafik
log.error(
  { pesananId: id, penggunaId: userId, kode: 'STOK_KURANG', varianId, err: error },
  'pembuatan pesanan gagal'
);
```

Dengan bentuk kedua, pertanyaan seperti "berapa pesanan gagal karena stok dalam satu jam terakhir, dikelompokkan per varian" jadi satu kueri di alat log Anda. Dengan bentuk pertama, pertanyaan itu butuh regex dan keberuntungan.

Konteks yang harus ikut di **setiap** baris log:

```ts
// src/log/konteks.ts
import { AsyncLocalStorage } from 'node:async_hooks';

interface KonteksPermintaan {
  requestId: string;
  traceId: string;
  penggunaId?: string;
  tenantId?: string;
  rute?: string;
}

export const konteks = new AsyncLocalStorage<KonteksPermintaan>();

// Logger yang otomatis menyertakan konteks, tanpa diteruskan sebagai parameter
export const log = pino({
  level: config.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization', 'req.headers.cookie',
      '*.sandi', '*.token', '*.kartu', '*.nik',
    ],
    censor: '[disaring]',
  },
  mixin() {
    return konteks.getStore() ?? {};
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
});
```

```ts
// Dipasang sekali di awal setiap permintaan
app.addHook('onRequest', (req, _res, selesai) => {
  konteks.run(
    {
      requestId: req.id,
      traceId: ambilTraceId(req) ?? req.id,
      rute: req.routeOptions.url,
    },
    selesai
  );
});

// Dan diperbarui setelah autentikasi
app.addHook('preHandler', async (req) => {
  const store = konteks.getStore();
  if (store && req.pelaku) {
    store.penggunaId = req.pelaku.penggunaId;
    store.tenantId = req.pelaku.tenantId;
  }
});
```

`AsyncLocalStorage` adalah bagian terpenting di potongan itu: ia membawa konteks melintasi `await` tanpa Anda meneruskannya sebagai parameter ke setiap fungsi. Tanpa itu, satu-satunya cara memberi konteks ke log di lapisan repository adalah mengirim objek logger lewat sepuluh pemanggilan fungsi, dan itu tidak akan dikerjakan konsisten.

Enam aturan log yang pantas jadi kesepakatan tim:

| Aturan | Alasan |
| --- | --- |
| Satu baris JSON per kejadian | Bisa diparse alat apa pun |
| Tingkat yang tepat: `debug`, `info`, `warn`, `error` | Permintaan gagal validasi adalah `info`, bukan `error` |
| Jangan mencatat hal yang berulang per permintaan sukses | Satu baris ringkasan per permintaan cukup |
| Penyaringan data sensitif di konfigurasi, bukan di tempat pemanggilan | Supaya tidak bergantung ingatan |
| Pesan tetap, konteks berubah | `'pembuatan pesanan gagal'` bisa dikelompokkan, kalimat berisi id tidak |
| Jangan mencatat seluruh objek | Pilih field yang berguna. Objek utuh bisa memuat data pribadi |

Dan satu hal tentang biaya: log adalah komponen tagihan yang mudah lepas kendali. Satu layanan dengan 1.000 permintaan per detik yang mencatat 5 baris per permintaan menghasilkan 432 juta baris per hari. Dua pengendaliannya: `debug` dimatikan di produksi, dan log yang sangat berulang disampel, misalnya hanya 1 dari 100 permintaan sukses yang dicatat lengkap.

## Metrik

Metrik murah, tetap berguna pada volume besar, dan menjawab pertanyaan yang tidak bisa dijawab log.

```ts
import { Counter, Histogram, Gauge, register } from 'prom-client';

export const metrik = {
  // Counter: hanya naik. Untuk menghitung kejadian.
  permintaan: new Counter({
    name: 'http_permintaan_total',
    help: 'Jumlah permintaan HTTP',
    labelNames: ['metode', 'rute', 'status'] as const,
  }),

  // Histogram: untuk durasi. Memberi p50, p95, p99.
  durasi: new Histogram({
    name: 'http_durasi_detik',
    help: 'Durasi permintaan HTTP',
    labelNames: ['metode', 'rute'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  }),

  // Gauge: naik turun. Untuk keadaan sekarang.
  queueMenunggu: new Gauge({
    name: 'queue_pekerjaan_menunggu',
    help: 'Pekerjaan yang menunggu di queue',
    labelNames: ['queue'] as const,
  }),

  queueUmurTertua: new Gauge({
    name: 'queue_umur_tertua_detik',
    help: 'Umur pekerjaan tertua yang menunggu',
    labelNames: ['queue'] as const,
  }),

  dbPool: new Gauge({
    name: 'db_pool_sambungan',
    help: 'Sambungan pool basis data',
    labelNames: ['keadaan'] as const,
  }),
};
```

```ts
app.addHook('onResponse', async (req, res) => {
  const rute = req.routeOptions.url ?? 'tidak-dikenal';
  const label = { metode: req.method, rute };

  metrik.permintaan.inc({ ...label, status: String(res.statusCode) });
  metrik.durasi.observe(label, res.elapsedTime / 1000);
});

app.get('/metrics', { logLevel: 'silent' }, async (_req, res) => {
  res.header('content-type', register.contentType);
  return register.metrics();
});
```

Empat sinyal yang pantas ada di dasbor pertama Anda, dan cukup untuk menjawab sebagian besar pertanyaan:

| Sinyal | Metrik | Kenapa |
| --- | --- | --- |
| **Lalu lintas** | Permintaan per detik, per rute | Memberi konteks untuk semua angka lain |
| **Kesalahan** | Persentase 5xx dan 4xx, per rute | Tanda pertama ada yang rusak |
| **Latensi** | p50, p95, p99, per rute | Yang dirasakan pengguna |
| **Kejenuhan** | Pool basis data, lag event loop, kedalaman queue, memori | Memberi tahu sebelum tumbang |

Baris keempat yang membedakan tim yang reaktif dari yang siap: tiga sinyal pertama memberi tahu saat masalah **sudah** terjadi, sedangkan kejenuhan memberi tahu bahwa masalah **akan** terjadi. Pool yang 90% terpakai dan lag event loop 200 ms adalah peringatan setengah jam sebelum insiden.

Satu bahaya yang perlu dipahami: **kardinalitas label.**

```ts
// Berbahaya: satu seri metrik per pengguna. Dengan 100 ribu pengguna,
// itu 100 ribu seri, dan sistem metrik Anda akan tumbang.
metrik.permintaan.inc({ penggunaId: req.pelaku.penggunaId });

// Berbahaya juga: rute dengan parameter yang belum dinormalkan
metrik.permintaan.inc({ rute: '/v1/pesanan/0192abc-...' });   // satu seri per pesanan

// Benar: pola rute, bukan path sebenarnya
metrik.permintaan.inc({ rute: '/v1/pesanan/:id' });
```

Aturannya: **label hanya untuk nilai dengan kemungkinan terbatas.** Metode, pola rute, status, nama queue, dan jenis pekerjaan aman. Id pengguna, id pesanan, alamat IP, dan pesan error tidak. Yang beragam itu tempatnya di log, bukan di metrik.

## Tracing

Trace menjawab pertanyaan yang tidak bisa dijawab log maupun metrik: **waktunya habis di mana, melintasi komponen.**

```ts
// src/jejak/setup.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  serviceName: config.NAMA_LAYANAN,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Jangan jejak endpoint pemantauan
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingRequestHook: (req) =>
          ['/metrics', '/sehat', '/siap'].includes(req.url ?? ''),
      },
    }),
  ],
});

sdk.start();
```

Instrumentasi otomatis sudah memberi banyak: permintaan HTTP masuk dan keluar, kueri Postgres, perintah Redis. Yang perlu Anda tambahkan adalah rentang untuk logika bisnis Anda sendiri:

```ts
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('pesanan');

export async function buatPesanan(/* ... */) {
  return tracer.startActiveSpan('buat-pesanan', async (span) => {
    span.setAttributes({
      'pesanan.jumlah_item': masukan.item.length,
      'tenant.id': pelaku.tenantId,
    });

    try {
      const hasil = await jalurPembuatan();

      span.setAttribute('pesanan.total_rp', hasil.totalRp);
      return hasil;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

Bagian yang paling berharga, dan paling sering tidak dikerjakan: **meneruskan konteks jejak melintasi queue dan peristiwa.**

```ts
// Saat mendaftarkan pekerjaan: bawa konteks jejak di muatan
import { propagation, context } from '@opentelemetry/api';

export async function daftarkanPekerjaan(jenis: string, muatan: object) {
  const pembawa: Record<string, string> = {};
  propagation.inject(context.active(), pembawa);

  return queue.add(jenis, { ...muatan, _jejak: pembawa });
}

// Saat memproses: lanjutkan jejak yang sama, jangan mulai yang baru
export function prosesDenganJejak(nama: string, data: { _jejak?: Record<string, string> }) {
  const indukKonteks = propagation.extract(context.active(), data._jejak ?? {});

  return context.with(indukKonteks, () =>
    tracer.startActiveSpan(nama, async (span) => {
      /* ... */
    })
  );
}
```

Dengan ini, satu permintaan `POST /v1/pesanan` menghasilkan satu trace yang memuat: permintaan HTTP, transaksi basis data, penerbitan outbox, pengiriman ke broker, enam konsumen, dan panggilan ke penyedia pembayaran. Pertanyaan "kenapa email struk baru terkirim delapan menit kemudian" dijawab dengan melihat satu gambar.

Soal sampling: menjejak 100% permintaan mahal dan tidak perlu. Pola yang baik: sampel 1% sampai 10% dari permintaan sukses, dan **100% dari yang gagal atau lambat**. Itu disebut tail sampling, dan hampir semua penyedia mendukungnya.

## SLO dan peringatan

Pertanyaan yang pantas dijawab sebelum memasang peringatan: **berapa persen kegagalan yang dapat diterima?**

```text
SLI: persentase permintaan POST /v1/pesanan yang berhasil (bukan 5xx)
SLO: 99,9% dalam 30 hari
Anggaran kesalahan: 0,1% dari 30 hari = sekitar 43 menit tidak tersedia
```

Angka itu mengubah percakapan. Tanpa SLO, setiap kegagalan terasa darurat dan setiap peringatan terasa penting. Dengan SLO, Anda bisa berkata "kita sudah memakai 80% anggaran kesalahan bulan ini, jadi minggu ini tidak ada rilis berisiko" dan itu keputusan yang bisa dipertanggungjawabkan.

Tiga aturan peringatan yang menentukan apakah peringatan Anda dipercaya:

**Satu, beri peringatan pada gejala, bukan penyebab.** "Tingkat kesalahan `POST /v1/pesanan` di atas 2% selama 5 menit" berguna. "CPU di atas 80%" tidak, karena CPU tinggi tanpa dampak ke pengguna bukan masalah, dan masalah bisa terjadi dengan CPU rendah.

**Dua, peringatan yang menyala harus bisa ditindaklanjuti.** Kalau penerimanya tidak bisa melakukan apa pun, itu bukan peringatan, melainkan informasi, dan tempatnya di dasbor.

**Tiga, satu peringatan yang sering menyala tanpa sebab akan membuat semua peringatan diabaikan.** Ini kegagalan organisasi yang berawal dari keputusan teknis. Peringatan yang menyala tiga kali semalam tanpa ada yang perlu dikerjakan harus dimatikan atau diperbaiki, bukan dibiarkan.

Daftar peringatan yang pantas ada:

| Peringatan | Ambang | Tingkat |
| --- | --- | --- |
| Tingkat 5xx pada jalur utama | Di atas 2% selama 5 menit | Mendesak |
| Latensi p95 jalur utama | Di atas 2 kali normal selama 10 menit | Peringatan |
| Anggaran kesalahan terpakai cepat | Laju yang akan menghabiskannya sebelum akhir bulan | Peringatan |
| Pool basis data | Di atas 90% selama 5 menit | Peringatan |
| Lag event loop p99 | Di atas 500 ms selama 5 menit | Peringatan |
| Umur pekerjaan queue tertua | Di atas batas janji produk | Peringatan |
| Worker queue hidup | Nol selama 2 menit | Mendesak |
| Keterlambatan konsumen peristiwa | Di atas 5 menit | Peringatan |
| Kegagalan cadangan | Satu kali | Mendesak |
| Sertifikat TLS | Kedaluwarsa dalam 14 hari | Peringatan |

Dan satu hal yang sering dilupakan: **setiap peringatan butuh runbook.** Satu halaman berisi: apa artinya, di mana melihat datanya, tiga penyebab yang paling sering, dan langkah pertama. Ditulis saat tenang, dibaca saat panik.

## Menelusuri insiden

Dengan ketiga alat terpasang, pesan pukul dua pagi itu dijawab seperti ini:

```text
1. Buka dasbor. Tingkat 5xx POST /v1/pesanan: 18%, mulai 01:05.
   -> Bukan satu pelanggan. Ini insiden.

2. Lihat metrik kejenuhan. Pool basis data 100% sejak 01:03.
   -> Penyebabnya bukan di aplikasi, tapi di jalur basis data.

3. Buka trace dari permintaan yang gagal, sampel 100% karena error.
   -> 95% waktunya di satu kueri: daftar pesanan untuk panel admin.

4. Cari di log: siapa yang memanggil endpoint itu sejak 01:00.
   -> Satu kunci API, 400 permintaan per menit, dari integrasi mitra baru.

5. Periksa pg_stat_statements: kueri itu Seq Scan pada 2 juta baris.
   -> Indeks untuk filter barunya belum ada.

6. Tindakan segera: batasi laju kunci API itu.
   Tindakan menyusul: tambahkan indeks dengan CREATE INDEX CONCURRENTLY.
```

Enam langkah, sekitar lima menit, dan tidak ada tebakan. Perhatikan bahwa setiap langkah memakai alat yang berbeda: metrik untuk cakupan, trace untuk lokasi, log untuk pelaku, dan basis data untuk penyebab. Itu sebabnya ketiganya dipasang, bukan salah satunya.

## Latihan

### Latihan 1: Pasang observability di layanan Anda

Pasang ketiga alat di Proyek 4, lalu buktikan dengan satu pertanyaan: **lacak satu permintaan pembuatan pesanan dari HTTP sampai email terkirim, dan tunjukkan satu trace yang memuat seluruh jalurnya.**

> [!petunjuk]
> Bagian tersulit adalah meneruskan konteks jejak lewat outbox. Simpan pembawa jejak sebagai kolom di tabel outbox, bukan di dalam muatan peristiwa, supaya kontrak peristiwa Anda tidak tercampur dengan urusan pemantauan.

> [!jawaban]
>
> ```sql
> ALTER TABLE outbox ADD COLUMN jejak_pembawa jsonb;
> ```
>
> ```ts
> // Saat menerbitkan
> export async function terbitkan(tx, jenis, kunciAgregat, muatan) {
>   const pembawa: Record<string, string> = {};
>   propagation.inject(context.active(), pembawa);
>
>   await tx.insert(outbox).values({
>     jenis, kunciAgregat, muatan,
>     jejakPembawa: pembawa,   // terpisah dari muatan
>   });
> }
>
> // Saat pengirim outbox meneruskan ke broker
> await broker.terbitkan({
>   topik: baris.jenis,
>   muatan: baris.muatan,
>   header: { ...baris.jejak_pembawa },   // jadi header pesan, bukan isi
> });
>
> // Saat konsumen memproses
> const indukKonteks = propagation.extract(context.active(), pesan.header);
> await context.with(indukKonteks, () => prosesPesan(pesan));
> ```
>
> Lima hal yang akan Anda lihat di trace pertama Anda:
>
> 1. **Satu gambar yang memuat delapan komponen**, dan jarak waktu antar komponen langsung terlihat. Biasanya ada satu jeda yang mengejutkan, dan paling sering itu jeda polling pengirim outbox.
> 2. **Jeda pengirim outbox akan terasa besar.** Polling setiap 500 ms berarti rata-rata 250 ms jeda hanya untuk menunggu giliran dibaca. Kalau itu penting, tambahkan pemberitahuan dengan `NOTIFY` Postgres supaya pengirim bangun seketika.
> 3. **Rentang basis data jauh lebih banyak daripada dugaan Anda.** Instrumentasi otomatis akan memperlihatkan kueri yang tidak Anda sadari ada, dan sering menemukan N+1 yang lolos dari modul 7.
> 4. **Konteks jejak di log membuat keduanya saling terhubung.** Dengan `traceId` di setiap baris log, alat pemantauan modern bisa melompat dari satu rentang trace ke log yang dihasilkan di dalamnya.
> 5. **Satu hal yang perlu diputuskan: berapa lama trace disimpan.** Trace mahal, dan 7 hari biasanya cukup. Untuk insiden yang perlu diselidiki lebih lama, log dan metrik yang bertahan lebih panjang.

### Latihan 2: Rancang peringatan untuk layanan Anda

Buat daftar peringatan untuk Proyek 4, dan untuk masing-masing tulis runbook satu halaman.

Lalu jalankan uji yang paling penting: **matikan satu komponen, dan catat berapa lama sampai peringatan menyala.**

> [!pembahasan]
>
> | Komponen dimatikan | Peringatan yang harus menyala | Waktu khas |
> | --- | --- | --- |
> | Postgres | 5xx jalur utama, kegagalan health check | Di bawah 1 menit |
> | Redis | Kemungkinan **tidak ada**, karena cache gagal tanpa suara | Perlu peringatan sendiri |
> | Worker email | Umur pekerjaan tertua naik | 5 sampai 10 menit |
> | Pengirim outbox | Baris outbox menunggu menumpuk | Perlu metrik sendiri |
> | Satu konsumen peristiwa | Keterlambatan konsumen | 5 menit |
> | Penyedia pembayaran | Tingkat kegagalan pembayaran | 5 menit |
>
> Dua baris yang menghasilkan temuan paling berharga:
>
> **Redis yang mati tidak memicu apa pun.** Itu hasil dari keputusan yang benar di modul 13: kegagalan cache tidak menjatuhkan layanan. Akibatnya, Redis bisa mati berjam-jam dan satu-satunya gejalanya adalah latensi yang naik sedikit dan tagihan basis data yang naik banyak. Perbaikan: metrik tingkat kena cache, dan peringatan kalau tiba-tiba nol.
>
> **Pengirim outbox yang mati adalah kegagalan paling tenang di seluruh sistem.** API tetap sehat, semua permintaan 200, pesanan tersimpan dengan benar, dan tidak ada satu pun email terkirim atau poin diberikan. Dari luar, semuanya normal. Perbaikan: metrik gauge berisi jumlah baris outbox yang belum terkirim dan umur yang tertua, dengan peringatan di atas 2 menit.
>
> ```ts
> // Dijalankan tiap 15 detik
> const [stat] = await db.execute(sql`
>   SELECT count(*) AS menunggu,
>          coalesce(max(extract(epoch from now() - dibuat_pada)), 0) AS umur_tertua
>   FROM outbox WHERE terkirim_pada IS NULL
> `);
>
> metrik.outboxMenunggu.set(Number(stat.menunggu));
> metrik.outboxUmurTertua.set(Number(stat.umur_tertua));
> ```
>
> Satu contoh runbook untuk peringatan ini:
>
> ```markdown
> ## Peringatan: outbox_umur_tertua > 120s
>
> Artinya: peristiwa tidak diteruskan ke broker. Pesanan tetap tersimpan,
> tapi email, poin, dan proses gudang berhenti berjalan.
>
> Lihat: dasbor Outbox, log layanan `pengirim-outbox`.
>
> Tiga penyebab tersering:
> 1. Proses pengirim mati. Periksa jumlah instance, dan log penutupan terakhir.
> 2. Broker tidak bisa dihubungi. Periksa metrik kegagalan penerbitan.
> 3. Satu baris selalu gagal dan memblokir kuncinya. Periksa kolom `kesalahan`
>    pada baris outbox tertua.
>
> Langkah pertama: `SELECT * FROM outbox WHERE terkirim_pada IS NULL
> ORDER BY id LIMIT 5` dan lihat kolom kesalahan serta percobaan.
>
> Kalau penyebabnya nomor 3: pindahkan baris itu ke tabel karantina supaya
> kunci agregatnya tidak terus terblokir, lalu selidiki terpisah.
> ```

### Latihan 3: Jawab lima pertanyaan dari data

Dengan observability terpasang, jawab lima pertanyaan berikut tentang layanan Anda, masing-masing dengan kueri atau grafik yang nyata.

| # | Pertanyaan |
| --- | --- |
| 1 | Endpoint mana yang paling lambat pada p95, dan apa isi waktunya? |
| 2 | Berapa persen pesanan gagal dalam 24 jam terakhir, dan karena apa? |
| 3 | Satu pelanggan melapor pesanannya gagal pukul 14.22. Apa yang terjadi? |
| 4 | Apakah deploy terakhir memperlambat sesuatu? |
| 5 | Kalau lalu lintas naik 10 kali, apa yang patah lebih dulu? |

> [!jawaban]
>
> | # | Cara menjawab |
> | --- | --- |
> | 1 | Metrik histogram per rute, lalu buka trace p95 dari rute itu untuk melihat isi waktunya |
> | 2 | Log dengan kode error yang terstruktur, dikelompokkan per `kode` |
> | 3 | Cari log dengan `penggunaId` di rentang waktu itu, ambil `traceId`, buka trace-nya |
> | 4 | Metrik latensi dan error dengan label versi rilis, dibandingkan sebelum dan sesudah |
> | 5 | Metrik kejenuhan: yang persentasenya tertinggi sekarang akan patah lebih dulu |
>
> Empat catatan yang jadi inti latihan ini:
>
> **Nomor 2 hanya bisa dijawab kalau error Anda punya kode.** Itu hasil dari keputusan di modul 3: `kode` yang stabil di setiap error. Dengan log terstruktur yang memuat kode itu, laporan "pesanan gagal karena apa" jadi satu kueri pengelompokan. Tanpa kode, Anda hanya punya pesan bebas yang tidak bisa dikelompokkan.
>
> **Nomor 3 adalah alasan `penggunaId` ada di konteks log.** Tanpa itu, satu-satunya cara menemukan permintaan pelanggan adalah mencari id pesanannya, dan kalau pesanannya gagal dibuat, id itu tidak pernah ada.
>
> **Nomor 4 butuh label versi.** Tambahkan versi rilis sebagai label pada metrik utama, dan sebagai field di log. Dengan itu, pertanyaan "apakah rilis tadi memperburuk sesuatu" dijawab grafik, bukan perasaan.
>
> ```ts
> const label = { rute, versi: config.VERSI_RILIS };
> ```
>
> **Nomor 5 adalah pertanyaan kapasitas, dan jawabannya hampir selalu mengejutkan.** Pada layanan yang dibangun di seri ini, kandidat terkuat adalah pool sambungan basis data dari modul 7, bukan CPU aplikasi. Angka pemakaian pool yang sudah 60% pada beban normal berarti 10 kali lalu lintas akan menabrak batasnya jauh sebelum CPU penuh. Itu temuan yang mengubah prioritas pekerjaan.

### Latihan 4: Selidiki insiden dari log

Berikut potongan log dari satu insiden. Tentukan apa yang terjadi, dan apa tindakan pertama Anda.

```json
{"level":"warn","traceId":"a1","rute":"/v1/pesanan","msg":"pool sambungan penuh, menunggu","tunggu_ms":2400}
{"level":"error","traceId":"a1","kode":"TERLALU_LAMA","msg":"permintaan gagal","durasi_ms":10021}
{"level":"warn","queue":"email","menunggu":48210,"umur_tertua_detik":1820,"msg":"kedalaman queue"}
{"level":"error","jenis":"kirim-email","percobaan":5,"err":"ETIMEDOUT","msg":"pekerjaan gagal permanen"}
{"level":"info","rute":"/v1/laporan/ekspor","durasi_ms":48200,"baris":1840000,"msg":"permintaan selesai"}
{"level":"warn","msg":"lag event loop tinggi","lag_p99_ms":1840}
```

> [!jawaban]
>
> **Apa yang terjadi, dibaca dari bawah ke atas:**
>
> Baris kelima adalah penyebabnya: satu ekspor laporan membaca 1,84 juta baris dan berjalan 48 detik **di dalam permintaan HTTP**. Itu melanggar dua pelajaran sekaligus: pekerjaan panjang di jalur permintaan (modul 2 dan 14), dan daftar tanpa batas (modul 12).
>
> Akibatnya berantai:
>
> 1. Kueri 48 detik menahan sambungan basis data selama itu. Beberapa permintaan ekspor bersamaan menghabiskan pool, dan baris pertama menunjukkan permintaan lain menunggu 2,4 detik hanya untuk mendapat sambungan.
> 2. Baris kedua: permintaan biasa gagal dengan batas waktu, padahal kueri mereka sendiri cepat. Pengguna yang tidak ada hubungannya dengan ekspor ikut terdampak.
> 3. Baris keenam: lag event loop 1,8 detik, karena 1,84 juta baris diserialisasi jadi JSON di event loop.
> 4. Baris ketiga dan keempat: worker email ikut melambat karena pool yang sama, pekerjaan menumpuk sampai 48 ribu, dan sebagian gagal permanen karena batas waktu.
>
> **Tindakan pertama, dalam urutan:**
>
> | Urutan | Tindakan | Waktu |
> | --- | --- | --- |
> | 1 | Batasi laju endpoint ekspor jadi 1 per tenant per 5 menit | Menit |
> | 2 | Pasang `statement_timeout` lebih ketat untuk rute ekspor | Menit |
> | 3 | Periksa apakah pekerjaan email yang gagal permanen bisa diputar ulang | Menit |
> | 4 | Ubah ekspor jadi pekerjaan latar dengan 202 dan pengunduhan terpisah | Rilis berikutnya |
> | 5 | Pisahkan pool sambungan untuk beban laporan, atau arahkan ke replika baca | Rilis berikutnya |
>
> Tiga pelajaran dari insiden ini:
>
> 1. **Satu endpoint yang tidak dibatasi bisa menjatuhkan seluruh layanan**, termasuk bagian yang sama sekali tidak terkait. Pool sambungan adalah sumber daya bersama, dan itu membuatnya jadi jalur penularan.
> 2. **Pemisahan sumber daya adalah pertahanan yang nyata.** Kalau laporan memakai pool terpisah dengan batas kecil, kerusakannya terkurung di laporan. Pola itu disebut bulkhead, dan modul 19 membahasnya.
> 3. **Semua gejala terlihat di log, dan tidak satu pun menyebut penyebabnya secara langsung.** Yang menghubungkannya adalah pengetahuan tentang bagaimana komponen saling bergantung, dan itu tidak bisa diotomatiskan. Observability memberi data, dan penalaran tetap pekerjaan Anda.

## Batasnya

Observability memberi jawaban, dan tiga hal tetap di luarnya.

**Anda hanya melihat apa yang diukur.** Pertanyaan yang tidak terpikir saat memasang instrumentasi tidak bisa dijawab setelah insiden terjadi. Karena itu metrik kejenuhan dan log terstruktur dipasang sebelum dibutuhkan.

**Biayanya nyata dan bisa lepas kendali.** Log, metrik dengan kardinalitas tinggi, dan trace 100% bisa menghabiskan anggaran yang lebih besar daripada layanan yang dipantaunya. Sampel dengan sadar.

**Observability tidak memperbaiki apa pun.** Ia hanya memberi tahu. Yang membuat layanan tetap berjalan saat ada yang rusak adalah pola ketahanan, dan itu modul berikutnya.

## Rangkuman

- Log untuk satu kejadian, metrik untuk jumlah dan laju, trace untuk waktunya habis di mana. Id korelasi yang mengikat ketiganya.
- Log adalah data: satu baris JSON, pesan tetap, konteks berubah, penyaringan di konfigurasi.
- `AsyncLocalStorage` membawa konteks melintasi `await`, sehingga setiap baris log punya id permintaan tanpa diteruskan sebagai parameter.
- Empat sinyal: lalu lintas, kesalahan, latensi, dan kejenuhan. Yang keempat memberi tahu sebelum masalah terjadi.
- Kardinalitas label adalah bahaya nyata. Label hanya untuk nilai dengan kemungkinan terbatas, dan id yang beragam tempatnya di log.
- Trace harus melintasi queue dan peristiwa, dengan pembawa konteks yang disimpan terpisah dari kontrak peristiwa.
- Sampel 100% untuk yang gagal dan lambat, sebagian kecil untuk yang sukses.
- SLO mengubah percakapan dari "ini darurat" jadi "ini menghabiskan berapa persen anggaran kesalahan".
- Beri peringatan pada gejala, bukan penyebab. Peringatan yang tidak bisa ditindaklanjuti adalah informasi, dan peringatan yang sering salah akan membuat semuanya diabaikan.
- Setiap peringatan punya runbook satu halaman, ditulis saat tenang.
- Kegagalan yang paling berbahaya adalah yang tenang: Redis mati, pengirim outbox mati, dan worker mati. Pantau bahwa komponen itu **ada**, bukan hanya bahwa layanannya 200.

## Masalah terbuka

Sekarang Anda tahu saat ada yang rusak, dan tahu di mana. Pertanyaan berikutnya: apa yang dilakukan layanan Anda **saat** itu terjadi?

Dari insiden di Latihan 4, polanya terlihat: satu endpoint lambat menghabiskan pool sambungan, lalu endpoint yang tidak terkait ikut gagal, lalu worker ikut melambat, lalu pekerjaan menumpuk sampai gagal permanen. Satu masalah kecil menular ke seluruh sistem.

Dan pola yang sama berlaku untuk ketergantungan luar. Penyedia pembayaran yang melambat dari 200 ms jadi 30 detik tidak membuat layanan Anda error, melainkan membuat semua sambungan tertahan menunggu, sampai tidak ada lagi yang bisa melayani siapa pun. Layanan Anda tumbang karena layanan orang lain lambat, bukan karena mati.

Itu isi modul berikutnya: ketahanan, yaitu batas waktu di setiap sambungan keluar, pemutus arus, pemisahan sumber daya, penolakan beban, dan degradasi yang disengaja supaya satu bagian yang rusak tidak menjatuhkan semuanya.
