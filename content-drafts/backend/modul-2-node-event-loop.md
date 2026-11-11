---
title: 'Modul 2: Node.js, Event Loop, dan I/O yang Tidak Memblokir'
description: Satu permintaan berat bisa menghentikan pelayanan untuk semua orang sekaligus. Modul ini menjelaskan kenapa, cara mengukurnya, dan cara memperbaikinya.
date: 2026-12-03
slug: modul-2-node-event-loop
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Modul sebelumnya meninggalkan satu laporan yang belum dijawab: satu endpoint lambat membuat semua endpoint ikut lambat, termasuk yang sama sekali tidak terkait.

Pada banyak bahasa lain, laporan itu tidak masuk akal. Satu permintaan lambat di Java atau Go hanya menahan satu utas, sementara utas lain terus melayani. Di Node, ada satu hal yang kalau dihentikan, menghentikan pelayanan untuk semua orang sekaligus.

Perbandingannya begini:

|  | Model satu utas per permintaan | Model Node |
| --- | --- | --- |
| Melayani 1.000 sambungan menganggur | 1.000 utas, mahal di memori | Hampir gratis |
| Satu permintaan menunggu basis data 900 ms | Utas itu tertahan, yang lain jalan | Proses lanjut melayani yang lain |
| Satu permintaan menghitung berat 900 ms | Utas itu tertahan, yang lain jalan | **Semua permintaan lain ikut tertahan** |
| Memakai 8 inti prosesor | Otomatis | Perlu beberapa proses |

Baris ketiga adalah seluruh isi modul ini. Node sangat baik dalam **menunggu**, dan sangat buruk dalam **berpikir keras**. Memahami perbedaan antara keduanya adalah keterampilan paling menentukan saat bekerja dengan Node di produksi.

## Analogi: resepsionis yang tidak pernah menunggu

Bayangkan sebuah kantor dengan satu resepsionis yang sangat cepat.

Tamu datang dan meminta dokumen dari gudang arsip. Resepsionis tidak berjalan ke gudang. Dia menelepon petugas gudang, mencatat "tamu nomor 12 menunggu dokumen", lalu **langsung melayani tamu berikutnya**. Saat petugas gudang menelepon balik, resepsionis menyerahkan dokumennya ke tamu nomor 12. Dengan cara ini, satu orang bisa melayani ratusan tamu, karena dia tidak pernah ikut menunggu.

Sekarang bayangkan seorang tamu datang dan meminta resepsionis menjumlahkan dua ribu angka dengan tangan. Resepsionis tidak bisa menitipkan pekerjaan itu ke siapa pun. Selama dia menghitung, **tidak ada tamu lain yang dilayani**, bahkan yang hanya ingin menitipkan surat.

| Dunia kantor | Dunia Node |
| --- | --- |
| Resepsionis tunggal | Event loop, satu utas JavaScript |
| Menelepon gudang lalu lanjut melayani | I/O asinkron: basis data, jaringan, berkas |
| Catatan "tamu 12 menunggu dokumen" | Callback, promise |
| Telepon balik dari gudang | Peristiwa yang masuk ke antrean |
| Menjumlahkan dua ribu angka sendiri | Pekerjaan CPU yang memblokir |
| Beberapa petugas di belakang | Thread pool libuv |
| Membuka cabang kantor baru | Beberapa proses, `cluster` atau beberapa instance |
| Antrean tamu yang memanjang | Event loop lag |

Batas analoginya: resepsionis manusia bisa melihat antreannya memanjang, sedangkan event loop tidak memberi tahu siapa pun saat ia tertahan. Antrean itu hanya terlihat kalau Anda sengaja mengukurnya, dan bagian "cara mengukur" di modul ini yang paling layak Anda praktikkan hari ini.

## Cara kerjanya

Node punya satu utas yang menjalankan JavaScript Anda, dan di sekelilingnya ada mesin yang mengurus penantian.

**Satu putaran event loop** melewati beberapa fase, dan dua yang paling sering Anda temui:

- **timers**: menjalankan callback dari `setTimeout` dan `setInterval` yang waktunya sudah lewat.
- **poll**: mengambil peristiwa I/O yang sudah selesai, misalnya data dari basis data atau permintaan HTTP baru.
- **check**: menjalankan callback dari `setImmediate`.

Di antara setiap langkah, Node mengosongkan dua antrean prioritas: `process.nextTick` lebih dulu, lalu promise. Artinya `await` selalu dilayani sebelum `setTimeout`, berapa pun kecilnya waktunya.

```js
console.log('1');
setTimeout(() => console.log('2'), 0);
setImmediate(() => console.log('3'));
Promise.resolve().then(() => console.log('4'));
process.nextTick(() => console.log('5'));
console.log('6');

// Urutan: 1, 6, 5, 4, 3, 2
```

**Siapa yang mengerjakan penantian** itu dua pihak berbeda, dan pembedaan ini penting:

| Jenis pekerjaan | Dikerjakan oleh | Benar-benar paralel? |
| --- | --- | --- |
| Jaringan: HTTP, soket, basis data | Kernel sistem operasi | Ya, ribuan sekaligus |
| Berkas, DNS lookup, `zlib`, sebagian `crypto` | Thread pool libuv, bawaan 4 utas | Ya, tapi hanya sebanyak ukuran pool |
| JavaScript Anda sendiri | Event loop, satu utas | Tidak |

Baris kedua sumber kejutan yang nyata: thread pool bawaan hanya empat utas. Kalau aplikasi Anda melakukan banyak hashing password dengan `bcrypt` secara bersamaan, empat permintaan sudah mengisi pool, dan permintaan kelima menunggu. Ukurannya bisa dinaikkan lewat `UV_THREADPOOL_SIZE`, dan itu salah satu penyetelan produksi yang paling sering terlewat.

## Apa yang memblokir, dan tidak selalu terlihat

Lima bentuk pemblokiran yang paling sering ditemui di kode produksi:

```js
// 1. API sinkron pada berkas
const config = JSON.parse(fs.readFileSync('./besar.json', 'utf8'));

// 2. Mengolah payload besar
const data = JSON.parse(bodyDuaPuluhMegabyte); // memblokir ratusan milidetik

// 3. Kriptografi sinkron
const hash = crypto.pbkdf2Sync(sandi, garam, 600_000, 32, 'sha256');

// 4. Perulangan atas data besar
const total = seratusRibuBaris.reduce(hitungPajakRumit, 0);

// 5. Regex yang bisa meledak
const cocok = /^(\w+\s?)*$/.test(masukanDariPengguna);
```

Nomor lima layak diperhatikan khusus. Regex seperti itu bisa berjalan beberapa mikrosekon untuk masukan biasa dan beberapa menit untuk masukan yang dirancang jahat. Namanya catastrophic backtracking, dan karena bisa dipicu dari luar, itu bukan hanya masalah performa, melainkan celah penolakan layanan. Modul 12 kembali ke titik ini.

Yang membuat pemblokiran sulit ditemukan: di mesin pengembangan dengan satu pengguna, kode di atas terasa cepat. Gejalanya baru muncul di produksi, dalam bentuk yang menyesatkan, misalnya health check yang kadang gagal padahal layanan "terlihat jalan".

## Cara mengukurnya

Jangan menebak. Node menyediakan dua angka yang langsung menjawab pertanyaan "apakah event loop saya tertahan".

```ts
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';

const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();

setInterval(() => {
  const elu = performance.eventLoopUtilization();

  console.log({
    // Berapa lama callback tertunda dari waktu seharusnya
    lagMeanMs: +(histogram.mean / 1e6).toFixed(2),
    lagP99Ms: +(histogram.percentile(99) / 1e6).toFixed(2),
    // 0 berarti selalu menganggur, 1 berarti selalu sibuk menjalankan JS
    utilization: +elu.utilization.toFixed(3),
  });

  histogram.reset();
}, 5000).unref();
```

Cara membacanya:

| Angka | Artinya | Tindakan |
| --- | --- | --- |
| lag p99 di bawah 20 ms | Sehat | Tidak ada |
| lag p99 50 sampai 200 ms | Ada pekerjaan berat berkala | Cari sumbernya |
| lag p99 di atas 500 ms | Pengguna merasakannya | Perbaiki sekarang |
| utilization di atas 0,8 terus-menerus | Sudah mentok CPU | Tambah proses, atau pindahkan pekerjaan |
| utilization rendah tapi latensi tinggi | Bukan masalah CPU | Cari di basis data atau layanan lain |

Baris terakhir yang paling berharga: dua angka ini **memisahkan masalah CPU dari masalah penantian**, dan itu membuat Anda berhenti memperbaiki tempat yang salah. Pasang keduanya sebagai metrik sejak sekarang, dan modul 18 akan menghubungkannya ke sistem pemantauan.

Untuk menemukan baris mana yang memakan CPU, pakai profiler:

```bash
# Rekam profil CPU, hasilnya bisa dibuka di Chrome DevTools
node --cpu-prof --cpu-prof-dir=./profil dist/server.js

# Atau dengan flame graph
pnpm dlx 0x dist/server.js
```

## Memperbaikinya

Empat jalan keluar, berurutan dari yang paling sering tepat:

**1. Jangan kerjakan di dalam permintaan.** Pembuatan PDF, pengolahan gambar, pengiriman email, dan laporan besar tidak perlu ditunggu pengguna. Kirim ke queue, kembalikan `202 Accepted`. Itu modul 14, dan hampir selalu jawaban terbaik.

**2. Pakai bentuk asinkronnya.** Hampir semua API Node punya pasangan asinkron yang menyerahkan pekerjaan ke thread pool.

```ts
import { scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const kunci = await scryptAsync(sandi, garam, 64); // tidak memblokir event loop
```

**3. Pecah pekerjaan panjang.** Kalau perhitungannya harus di dalam proses ini, beri event loop kesempatan bernapas:

```ts
async function prosesBanyak<T>(baris: T[], kerjakan: (x: T) => void) {
  for (let i = 0; i < baris.length; i++) {
    kerjakan(baris[i]!);

    // Setiap 500 item, serahkan kendali supaya permintaan lain terlayani
    if (i % 500 === 0) await new Promise(setImmediate);
  }
}
```

**4. Pindahkan ke utas lain.** Untuk pekerjaan CPU yang benar-benar perlu dilakukan di proses ini:

```ts
import { Worker } from 'node:worker_threads';

function hitungDiWorker(data: unknown): Promise<unknown> {
  return new Promise((selesai, gagal) => {
    const worker = new Worker(new URL('./hitung.worker.js', import.meta.url), {
      workerData: data,
    });

    worker.once('message', selesai);
    worker.once('error', gagal);
    worker.once('exit', (kode) => {
      if (kode !== 0) gagal(new Error(`Worker berhenti dengan kode ${kode}`));
    });
  });
}
```

Dan untuk memakai semua inti prosesor, jangan pakai `cluster` kalau Anda sudah berada di container: jalankan beberapa container dan biarkan load balancer membagi beban. Satu proses per container lebih mudah dipantau, dibatasi memorinya, dan dimatikan dengan rapi.

## Stream dan backpressure

Backend sering memegang data yang lebih besar daripada memorinya. Membaca berkas 2 GB dengan `readFile` berarti meminta 2 GB memori sekaligus, dan proses Anda akan mati.

```ts
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';

// Memori yang dipakai tetap kecil, berapa pun besar berkasnya
await pipeline(
  createReadStream('./ekspor.csv'),
  createGzip(),
  createWriteStream('./ekspor.csv.gz')
);
```

Konsep yang perlu dipahami di balik itu adalah **backpressure**: kalau penerima lebih lambat daripada pengirim, pengirim harus ikut melambat. `pipeline` mengurusnya untuk Anda, sekaligus membersihkan semua stream saat salah satunya gagal. Menyusun stream dengan `.pipe()` secara manual tidak menangani kegagalan dengan benar, dan itu sumber kebocoran deskriptor berkas yang baru terasa setelah berjalan berminggu-minggu.

Pola yang sama berlaku untuk HTTP: mengalirkan unggahan langsung ke penyimpanan objek, dan mengalirkan hasil kueri besar langsung ke respons, tanpa menampung semuanya di memori. Modul 17 mengerjakannya.

## Menyiapkan proyek TypeScript untuk Node

```bash
mkdir layanan && cd layanan
pnpm init
pnpm add -D typescript tsx @types/node
pnpm tsc --init
```

```json
// tsconfig.json, bagian yang penting
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "nodenext",
    "outDir": "dist",
    "sourceMap": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

```json
// package.json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "check": "tsc --noEmit && eslint ."
  }
}
```

Dua catatan yang menghemat waktu: `tsx` dipakai untuk pengembangan karena cepat dan tidak memeriksa tipe, jadi `tsc --noEmit` harus tetap jalan di `pnpm check` dan di CI. Dan `"type": "module"` dipilih sejak awal, karena ekosistem Node sudah bergerak ke ESM dan bercampur dua sistem modul adalah sumber frustrasi yang bisa dihindari.

Satu hal yang wajib ada sejak berkas pertama: **validasi konfigurasi saat proses mulai.**

```ts
// src/config.ts
import { z } from 'zod';

const skema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const hasil = skema.safeParse(process.env);

if (!hasil.success) {
  // Mati sekarang, dengan pesan jelas, bukan nanti saat permintaan pertama masuk
  console.error('Konfigurasi tidak valid:', hasil.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = hasil.data;
```

Pola ini mengubah kelas kesalahan yang paling membingungkan di produksi ("kenapa `undefined` muncul di tengah kueri") jadi kegagalan saat start dengan pesan yang menyebut variabel mana yang kurang.

## Latihan

### Latihan 1: Blokir event loop Anda sendiri

Buat server kecil dengan tiga endpoint, pasang pengukur lag dari bagian sebelumnya, lalu amati apa yang terjadi.

```ts
import { createServer } from 'node:http';

const server = createServer(async (req, res) => {
  if (req.url === '/sehat') {
    res.end('ok');
    return;
  }

  if (req.url === '/menunggu') {
    // Mewakili kueri basis data 500 ms
    await new Promise((r) => setTimeout(r, 500));
    res.end('selesai menunggu');
    return;
  }

  if (req.url === '/berpikir') {
    // Mewakili perhitungan berat 500 ms
    const mulai = Date.now();
    let n = 0;
    while (Date.now() - mulai < 500) n++;
    res.end(`selesai berpikir ${n}`);
    return;
  }

  res.statusCode = 404;
  res.end('tidak ada');
});

server.listen(3000);
```

Lalu jalankan dua percobaan dan catat waktunya:

```bash
# A: 20 permintaan ke /menunggu bersamaan
time (for i in $(seq 20); do curl -s localhost:3000/menunggu & done; wait)

# B: 20 permintaan ke /berpikir bersamaan
time (for i in $(seq 20); do curl -s localhost:3000/berpikir & done; wait)

# C: saat B sedang jalan, dari terminal lain, ukur endpoint sehat
curl -s -o /dev/null -w "%{time_total}s\n" localhost:3000/sehat
```

> [!petunjuk]
> Sebelum menjalankan, tulis dugaan Anda untuk tiga angka: total waktu A, total waktu B, dan waktu respons `/sehat` saat B berjalan.

> [!jawaban]
>
> Hasil yang akan Anda lihat:
>
> | Percobaan | Waktu | Penjelasan |
> | --- | --- | --- |
> | A: 20 permintaan menunggu | sekitar 0,5 detik total | Semuanya menunggu bersamaan. Event loop bebas |
> | B: 20 permintaan berpikir | sekitar 10 detik total | Dikerjakan berurutan, 500 ms masing-masing |
> | C: `/sehat` saat B berjalan | bisa beberapa detik | Permintaan sepele ikut mengantre |
>
> Tiga pelajarannya:
>
> 1. **Node unggul mutlak untuk pekerjaan yang isinya menunggu.** Dua puluh permintaan yang masing-masing menunggu basis data 500 ms selesai dalam 500 ms. Model satu utas per permintaan akan menghabiskan dua puluh utas untuk hal yang sama.
> 2. **Pekerjaan CPU tidak sekadar lambat, tapi menular.** Percobaan C adalah laporan nomor 4 dari modul 1, sekarang Anda melihatnya sendiri. Endpoint yang sama sekali tidak terkait ikut melambat.
> 3. **Health check Anda ikut korban.** Ini efek samping yang berbahaya: platform seperti Kubernetes menyimpulkan layanan Anda tidak sehat lalu mematikannya, padahal sebenarnya hanya sibuk. Hasilnya layanan dimatikan tepat saat sedang paling sibuk. Modul 19 membahas cara membuat health check yang tidak menipu.

### Latihan 2: Temukan yang memblokir

Berkas ini dari layanan nyata. Temukan enam baris atau pola yang memblokir event loop, dan urutkan dari yang paling berbahaya.

```ts
import fs from 'node:fs';
import crypto from 'node:crypto';

const templat = fs.readFileSync('./templat/invoice.html', 'utf8');

export async function buatInvoice(req: Request): Promise<Response> {
  const body = JSON.parse(await req.text());

  const pengguna = await db.pengguna.ambil(body.penggunaId);

  const tokenAkses = crypto.pbkdf2Sync(body.pin, pengguna.garam, 310_000, 32, 'sha512');

  const semuaTransaksi = await db.transaksi.semuaMilik(pengguna.id);
  const ringkasan = semuaTransaksi.reduce(hitungPajakPerBaris, { total: 0, pajak: 0 });

  if (!/^([\w.+-]+@([\w-]+\.)+[\w-]{2,})*$/.test(body.emailPenagihan)) {
    return new Response('Email tidak valid', { status: 422 });
  }

  const html = templat.replace('{{isi}}', renderBaris(semuaTransaksi));
  const pdf = buatPdfSinkron(html);
  fs.writeFileSync(`./tmp/invoice-${pengguna.id}.pdf`, pdf);

  return new Response(pdf, { headers: { 'content-type': 'application/pdf' } });
}
```

> [!jawaban]
>
> | Urutan | Baris | Mengapa berbahaya | Perbaikan |
> | --- | --- | --- | --- |
> | 1 | `buatPdfSinkron(html)` | Pembuatan PDF bisa ratusan ms sampai detik, dan dipicu setiap permintaan | Pindahkan ke queue, kembalikan 202 |
> | 2 | Regex pada `emailPenagihan` | Bersarang dan bisa meledak. Dipicu masukan dari luar, jadi ini celah penolakan layanan | Validasi dengan Zod, atau regex sederhana tanpa pengulangan bersarang |
> | 3 | `crypto.pbkdf2Sync` dengan 310 ribu iterasi | Memang dirancang lambat, dan versi sinkronnya menahan semua orang | Pakai `pbkdf2` asinkron, atau `argon2` (modul 10) |
> | 4 | `reduce` atas seluruh transaksi pengguna | Tanpa batas. Pengguna dengan 200 ribu transaksi menghentikan layanan | Hitung di basis data dengan agregasi (modul 6) |
> | 5 | `JSON.parse` tanpa batas ukuran | Payload 50 MB memblokir, dan bisa dikirim siapa saja | Batasi ukuran body di lapisan HTTP (modul 3) |
> | 6 | `fs.writeFileSync` | Menulis ke disk lokal, sinkron, dan di container berkasnya akan hilang | Alirkan ke penyimpanan objek (modul 17) |
>
> Satu baris yang **tidak** masalah: `fs.readFileSync` untuk templat di tingkat modul. Itu berjalan sekali saat proses mulai, sebelum ada permintaan masuk, dan memuat berkas konfigurasi secara sinkron saat start adalah pola yang sah. Yang salah adalah memakai API sinkron di dalam jalur permintaan.
>
> Perhatikan pola yang menghubungkan nomor 2, 4, dan 5: ketiganya dipicu dari luar dan **tidak punya batas**. Itu patokan yang pantas dibawa seterusnya: setiap masukan dari luar harus punya batas ukuran, batas jumlah, dan batas waktu. Tanpa batas, pengguna atau penyerang yang menentukan berapa banyak pekerjaan yang dilakukan server Anda.

### Latihan 3: Pecah pekerjaan berat

Sebuah endpoint menghitung ulang skor 50.000 anggota dari data yang sudah ada di memori, dan butuh sekitar 3 detik CPU. Kerjakan tiga pendekatan, ukur lag event loop pada masing-masing, lalu putuskan mana yang Anda pakai di produksi.

> [!pembahasan]
>
> **Pendekatan 1: pecah dengan `setImmediate`.** Satu baris tambahan, lag turun drastis, tapi total waktunya justru sedikit lebih lama.
>
> ```ts
> for (let i = 0; i < anggota.length; i++) {
>   hitungSkor(anggota[i]!);
>   if (i % 500 === 0) await new Promise(setImmediate);
> }
> ```
>
> **Pendekatan 2: worker thread.** Event loop utama tetap bebas sepenuhnya, dan perhitungan memakai inti lain.
>
> ```ts
> const skor = await hitungDiWorker({ anggota });
> ```
>
> **Pendekatan 3: queue.** Endpoint mengembalikan `202` beserta id pekerjaan, worker terpisah mengerjakannya, dan klien memeriksa statusnya.
>
> | Pendekatan | Lag p99 | Waktu total | Cocok untuk |
> | --- | --- | --- | --- |
> | Apa adanya | 3.000 ms | 3,0 detik | Tidak pernah |
> | `setImmediate` | sekitar 25 ms | 3,4 detik | Pekerjaan menengah yang harus selesai dalam permintaan |
> | Worker thread | di bawah 5 ms | 3,0 detik | Perhitungan yang hasilnya ditunggu pemanggil |
> | Queue | di bawah 5 ms | pengguna tidak menunggu | **Pilihan untuk produksi** |
>
> Jawaban untuk produksi adalah queue, dan alasannya bukan angka lag. Alasannya: pekerjaan 3 detik yang dilakukan di dalam permintaan akan bermasalah di tempat lain. Load balancer punya batas waktu, pengguna akan menutup tab lalu mencoba lagi sehingga pekerjaannya dilakukan dua kali, dan tidak ada cara mengetahui progresnya. Memindahkannya ke queue menyelesaikan empat hal sekaligus, dan itu modul 14.
>
> Worker thread tetap berguna, untuk hal yang hasilnya memang perlu ada dalam respons dan tidak bisa ditunda, misalnya pengolahan gambar kecil atau verifikasi tanda tangan kriptografi yang berat.
>
> Satu catatan tentang `setImmediate`: pendekatan ini sering jadi tambalan cepat yang layak dipakai saat Anda sedang menangani insiden. Tapi jangan berhenti di situ, karena masalahnya hanya disebar, bukan hilang.

### Latihan 4: Tiga cara memanggil seratus API

Anda perlu mengambil data dari 100 URL layanan mitra. Tulis dan ukur tiga pendekatan, lalu jelaskan kenapa yang paling cepat belum tentu yang Anda pakai.

```ts
// A: berurutan
for (const url of urls) hasil.push(await ambil(url));

// B: semuanya bersamaan
const hasil = await Promise.all(urls.map(ambil));

// C: dibatasi 10 bersamaan
const hasil = await denganBatas(10, urls, ambil);
```

> [!petunjuk]
> Untuk C, tulis sendiri pembatasnya sebelum memakai library. Idenya: jalankan 10 pekerja yang masing-masing mengambil tugas berikutnya dari daftar sampai habis.

> [!jawaban]
>
> ```ts
> async function denganBatas<T, R>(
>   batas: number,
>   item: readonly T[],
>   kerjakan: (x: T) => Promise<R>
> ): Promise<R[]> {
>   const hasil: R[] = new Array(item.length);
>   let indeks = 0;
>
>   const pekerja = Array.from({ length: Math.min(batas, item.length) }, async () => {
>     while (indeks < item.length) {
>       const i = indeks++;
>       hasil[i] = await kerjakan(item[i]!);
>     }
>   });
>
>   await Promise.all(pekerja);
>   return hasil;
> }
> ```
>
> | Pendekatan | Waktu khas | Masalahnya |
> | --- | --- | --- |
> | A: berurutan | 100 x latensi, misalnya 20 detik | Terlalu lambat, dan tidak ada alasan |
> | B: 100 bersamaan | sekitar 1 x latensi | Terlihat terbaik, dan paling berbahaya |
> | C: 10 bersamaan | sekitar 10 x latensi dibagi 10 | Pilihan yang benar |
>
> Empat alasan kenapa B salah meski paling cepat di laptop Anda:
>
> 1. **Anda menyerang mitra Anda sendiri.** Seratus permintaan serentak bisa menembus batas laju mereka, dan jawabannya 429 untuk semuanya. Lebih buruk lagi, mereka bisa memblokir alamat IP Anda.
> 2. **Memori melonjak.** Seratus respons ditampung bersamaan. Kalau masing-masing 5 MB, itu 500 MB sekaligus.
> 3. **`Promise.all` gagal seluruhnya kalau satu gagal.** Untuk pekerjaan seperti ini, `Promise.allSettled` hampir selalu lebih tepat, supaya 99 yang berhasil tidak terbuang.
> 4. **Pola ini menular ke dalam.** Kalau setiap permintaan juga menyentuh basis data, 100 permintaan serentak bisa menghabiskan seluruh pool sambungan, dan endpoint lain yang tidak terkait ikut gagal. Itu modul 7.
>
> Tambahan yang membuat versi C siap produksi: batas waktu per permintaan, percobaan ulang dengan jeda bertambah hanya untuk kegagalan yang layak diulang, dan pencatatan berapa yang gagal. Modul 19 membangun semuanya sebagai satu pola yang bisa dipakai ulang.

## Batasnya

Modul ini menjelaskan mesin yang menjalankan kode Anda, dan tidak menyentuh tiga hal.

**Node bukan pilihan terbaik untuk semua beban kerja.** Pekerjaan yang didominasi perhitungan, misalnya pengolahan video, inferensi model, atau simulasi numerik, lebih cocok dikerjakan di tempat lain. Yang benar untuk Node: layanan yang sebagian besar waktunya menunggu basis data, jaringan, dan layanan lain, dan itu bentuk sebagian besar backend aplikasi.

**Satu proses tidak memakai seluruh prosesor Anda.** Mesin delapan inti dengan satu proses Node memakai satu inti untuk JavaScript. Jawabannya beberapa instance, bukan kode yang lebih pintar.

**Anda belum punya server yang layak.** `node:http` mentah tidak punya routing, parsing body, validasi, maupun penanganan error terpusat. Latihan 1 membuktikannya: tiga endpoint sudah berisi tiga `if` dan satu `404` yang ditulis tangan. Dua ratus endpoint dengan pola itu adalah berkas yang tidak bisa dirawat.

## Rangkuman

- Node sangat baik dalam menunggu dan buruk dalam berpikir keras. Semua keputusan arsitektur di Node berangkat dari satu kalimat itu.
- Satu utas menjalankan JavaScript Anda. Jaringan ditangani kernel, sedangkan berkas, DNS, dan sebagian kriptografi memakai thread pool libuv yang bawaannya hanya empat utas.
- `process.nextTick` dan promise selalu dilayani sebelum `setTimeout`, berapa pun kecilnya waktunya.
- Pemblokiran sering tidak terlihat: payload besar, kriptografi sinkron, perulangan tanpa batas, dan regex yang bisa meledak.
- Ukur dengan `monitorEventLoopDelay` dan `eventLoopUtilization`. Dua angka itu memisahkan masalah CPU dari masalah penantian.
- Urutan jalan keluar: pindahkan ke queue, pakai bentuk asinkron, pecah dengan `setImmediate`, atau pindahkan ke worker thread.
- Setiap masukan dari luar harus punya batas ukuran, jumlah, dan waktu. Tanpa batas, penyerang yang menentukan beban kerja server Anda.
- Pekerjaan bersamaan selalu dibatasi jumlahnya. `Promise.all` atas seratus panggilan adalah serangan terhadap mitra Anda sendiri.
- Validasi konfigurasi saat start, lalu mati dengan pesan jelas kalau ada yang kurang.

## Masalah terbuka

Server dari Latihan 1 bekerja, dan bentuknya tidak bertahan. Tiga `if` untuk tiga endpoint, parsing body yang ditulis tangan, dan tidak ada satu pun pemeriksaan bahwa isi permintaan masuk akal.

Sekarang bayangkan menambah lima puluh endpoint ke dalamnya. Siapa yang memastikan setiap endpoint memeriksa token? Siapa yang memastikan error yang tidak terduga tidak membocorkan jejak tumpukan ke pengguna? Siapa yang memastikan setiap respons punya bentuk yang konsisten sehingga klien tidak perlu menebak? Dan kalau satu handler melempar error tanpa tertangkap, apakah seluruh proses ikut mati?

Itu isi modul berikutnya: server HTTP yang layak dipakai, routing, middleware, validasi masukan dengan skema, dan penanganan error yang terpusat.
