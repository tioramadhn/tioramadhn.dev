---
title: 'Modul 12: Keamanan Backend'
description: API Anda terbuka di internet, dan tidak semua yang memanggilnya berniat baik. Sepuluh celah yang paling sering ditemukan, pengelolaan rahasia, dan daftar periksa sebelum layanan dibuka ke publik.
date: 2026-12-15
slug: modul-12-keamanan-backend
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Dalam beberapa hari setelah layanan Anda tayang, log-nya akan berisi permintaan yang tidak pernah datang dari aplikasi Anda sendiri:

```text
POST /v1/pesanan            {"item":[...],"tenantId":"tenant-lain"}
GET  /v1/produk?urut=harga; DROP TABLE produk--
POST /v1/pengguna           {"nama":"X","peran":"pemilik","isAdmin":true}
POST /v1/impor-url          {"url":"http://169.254.169.254/latest/meta-data/"}
GET  /v1/berkas?nama=../../../../etc/passwd
POST /v1/masuk              ribuan kali dari 400 alamat IP berbeda
```

Kabar baiknya: sebagian besar sudah tertutup oleh hal yang Anda bangun di sebelas modul sebelumnya. Parameter kueri menutup injeksi SQL, skema validasi menolak field yang tidak dikenal, otorisasi memeriksa tenant, dan pembatasan laju meredam percobaan login.

Modul ini memetakan apa yang sudah tertutup, apa yang belum, dan satu hal yang tidak bisa diselesaikan kode: pengelolaan rahasia.

| Celah | Status setelah 11 modul |
| --- | --- |
| Otorisasi tingkat objek (membaca data orang lain) | Tertutup, modul 11 |
| Autentikasi yang lemah | Tertutup, modul 10 |
| Injeksi SQL | Tertutup, modul 7 |
| Konsumsi sumber daya tanpa batas | Sebagian, modul 3 |
| Mass assignment | Sebagian, tergantung cara Anda menulis skema |
| Konfigurasi yang keliru | **Belum** |
| SSRF | **Belum** |
| Pengelolaan rahasia | **Belum** |
| Pemantauan dan deteksi | **Belum**, modul 18 |
| Rantai pasok dependensi | **Belum** |

## Analogi: gedung yang dibuka untuk umum

Sebelas modul sebelumnya membangun gedung dengan pintu berkartu dan arsip yang terkunci. Modul ini tentang hari pertama gedung itu dibuka untuk umum.

Yang datang bukan hanya pengunjung yang mencari layanan. Ada yang mencoba pintu samping untuk melihat apakah terkunci. Ada yang mengisi formulir dengan kolom tambahan yang dia tulis sendiri di tepi kertas, berharap petugas memprosesnya. Ada yang menitipkan paket dan meminta petugas mengantarkannya ke ruang server. Dan ada yang mengirim seribu orang sekaligus untuk melihat apakah antreannya roboh.

| Dunia gedung | Dunia backend |
| --- | --- |
| Mencoba semua pintu samping | Pemindaian endpoint |
| Kolom tambahan yang ditulis di tepi formulir | Mass assignment |
| "Tolong antar paket ini ke ruang server" | SSRF |
| Formulir dengan lampiran 500 halaman | Payload tanpa batas |
| Seribu orang datang sekaligus | Penolakan layanan |
| Kunci cadangan yang tertempel di balik meja | Rahasia di dalam repositori |
| Petugas baru yang tidak tahu prosedurnya | Dependensi pihak ketiga |
| Kamera dan buku tamu | Log dan audit |

Batas analoginya: penjaga gedung bisa melihat orang yang mencurigakan, sedangkan backend hanya melihat permintaan HTTP yang semuanya terlihat sama. Yang menggantikan intuisi penjaga adalah batas yang ditulis eksplisit dan pemantauan yang mengukur, dan keduanya tidak muncul sendiri.

## Mass assignment

Celah yang paling mudah terjadi dan paling sering ditemukan di API buatan sendiri.

```ts
// Berbahaya: seluruh body masuk ke basis data
app.post('/v1/pengguna', async (req) => {
  return repoPengguna.simpan(req.body);
});

// Penyerang mengirim:
// { "nama": "X", "email": "x@y.z", "peran": "pemilik", "tenantId": "tenant-lain" }
```

Pola ini juga muncul dalam bentuk yang lebih halus:

```ts
// Juga berbahaya: skema memvalidasi, lalu semuanya diteruskan
const data = skemaPengguna.parse(req.body);
await repoPengguna.perbarui(id, { ...data, ...req.body });  // req.body menimpa lagi

// Dan yang paling sering: skema memakai passthrough
const skema = z.object({ nama: z.string() }).passthrough();  // field lain lolos
```

Tiga pertahanan, dan dipakai bersama:

```ts
// 1. Skema ketat: field yang tidak dikenal ditolak, bukan dibuang diam-diam
const buatPengguna = z
  .object({
    nama: z.string().trim().min(3).max(80),
    email: z.string().trim().toLowerCase().email(),
  })
  .strict();   // bukan .passthrough(), dan bukan bawaan yang hanya membuang

// 2. Field yang ditentukan server tidak pernah datang dari klien
await repoPengguna.simpan({
  ...data,
  tenantId: req.pelaku.tenantId,   // dari sesi
  peran: 'pembeli',                // nilai bawaan, bukan dari masukan
  status: 'menunggu-verifikasi',
});

// 3. Perubahan peran punya endpoint sendiri dengan izinnya sendiri
app.patch('/v1/pengguna/:id/peran', { onRequest: [app.autentikasi] }, async (req) => {
  pastikanBoleh(req.pelaku, 'pengguna:kelola');
  // ...
});
```

Aturan ketiga itu prinsip desain yang pantas diterapkan luas: **field yang berbahaya diberi endpoint sendiri.** Peran, status, saldo, dan tanda verifikasi tidak ikut di endpoint pembaruan profil, karena itu membuat satu endpoint harus memeriksa beberapa tingkat izin sekaligus.

Pakai `.strict()` sebagai kebiasaan. Field tidak dikenal yang **ditolak** memberi tahu klien bahwa ada yang salah, sedangkan field yang dibuang diam-diam membuat bug "kenapa perubahan saya tidak tersimpan" yang sulit dilacak.

## SSRF: server Anda jadi alat penyerang

Ini celah yang paling sering diremehkan, dan akibatnya bisa paling parah.

```ts
// Fitur yang terlihat wajar: impor produk dari URL
app.post('/v1/impor', async (req) => {
  const respons = await fetch(req.body.url);   // berbahaya
  return parseCsv(await respons.text());
});
```

Server Anda berada di dalam jaringan yang punya akses ke hal yang tidak bisa dijangkau internet: metadata penyedia cloud, basis data internal, panel admin, dan layanan tetangga. Dengan satu URL, penyerang memakai server Anda sebagai perantara.

```text
http://169.254.169.254/latest/meta-data/iam/security-credentials/
  -> kredensial IAM pada sebagian konfigurasi AWS

http://localhost:9090/metrics        -> data internal
http://db-internal:5432              -> pemindaian port jaringan internal
file:///etc/passwd                   -> berkas lokal
http://pemendek.url/abc              -> pengalihan ke alamat internal
```

Pertahanan yang benar-benar bekerja:

```ts
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const DILARANG = [
  /^127\./, /^10\./, /^192\.168\./, /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./, /^0\./, /^::1$/, /^fe80:/, /^fc00:/,
];

async function ambilUrlPihakLuar(mentah: string): Promise<Response> {
  const url = new URL(mentah);

  // 1. Hanya protokol yang masuk akal
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new ErrorAturanBisnis('Protokol tidak diizinkan', 'URL_TIDAK_VALID');
  }

  // 2. Selesaikan DNS sendiri, lalu periksa alamat IP-nya
  const { address } = isIP(url.hostname)
    ? { address: url.hostname }
    : await lookup(url.hostname);

  if (DILARANG.some((pola) => pola.test(address))) {
    throw new ErrorAturanBisnis('Alamat tidak diizinkan', 'URL_TIDAK_VALID');
  }

  // 3. Jangan ikuti pengalihan, karena tujuannya bisa alamat internal
  const respons = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(5_000),
    headers: { 'user-agent': 'LayananSaya/1.0' },
  });

  if (respons.status >= 300 && respons.status < 400) {
    throw new ErrorAturanBisnis('Pengalihan tidak diizinkan', 'URL_TIDAK_VALID');
  }

  // 4. Batasi ukuran yang dibaca, jangan percaya content-length
  return bacaMaksimal(respons, 5 * 1024 * 1024);
}
```

Empat langkah itu wajib lengkap. Memeriksa nama host saja tidak cukup karena `evil.com` bisa diarahkan ke `127.0.0.1`. Mengizinkan pengalihan membatalkan pemeriksaan pertama. Dan tanpa batas ukuran, satu URL yang mengalirkan data tanpa henti akan menghabiskan memori proses Anda.

Untuk fitur yang memang butuh mengambil URL dari pengguna, pertimbangkan jalan yang lebih aman: kerjakan di worker terpisah yang jaringannya dibatasi lewat egress proxy, sehingga pembatasannya ditegakkan infrastruktur, bukan kode.

## Path traversal dan nama berkas

```ts
// Berbahaya
app.get('/v1/berkas', async (req) => {
  return createReadStream(`./uploads/${req.query.nama}`);
});
// ?nama=../../../../etc/passwd

// Benar: jangan pernah menyusun path dari masukan pengguna
app.get('/v1/berkas/:id', async (req) => {
  const berkas = await repoBerkas.ambil(req.params.id);   // id, bukan nama
  if (!berkas) throw new ErrorTidakDitemukan();

  pastikanBoleh(req.pelaku, 'berkas:baca', { tenantId: berkas.tenantId });

  // Kunci penyimpanan dibuat server, bukan diturunkan dari nama asli
  return penyimpanan.alirkan(berkas.kunciObjek);
});
```

Aturannya: **nama berkas dari pengguna hanya disimpan sebagai metadata untuk ditampilkan, tidak pernah dipakai sebagai path atau kunci penyimpanan.** Modul 17 membahas unggahan dengan lengkap.

## Injeksi di luar SQL

| Jenis | Bentuk berbahaya | Pencegahan |
| --- | --- | --- |
| **Perintah sistem** | `exec(\`convert ${nama}\`)` | `execFile` dengan array argumen, jangan shell |
| **Template** | Templat yang dirender dari masukan | Jangan pernah mengompilasi templat dari masukan pengguna |
| **Header** | Nilai header dari masukan yang berisi baris baru | Bersihkan `\r\n`, dan pakai API yang memvalidasi |
| **Log** | Masukan berisi baris baru yang memalsukan baris log | Log terstruktur JSON, modul 18 |
| **Prototype pollution** | `Object.assign({}, bodyDenganKey__proto__)` | Skema ketat, dan `Object.create(null)` untuk peta |
| **ReDoS** | Regex bersarang pada masukan pengguna | Regex sederhana, batas panjang, lihat modul 2 |

```ts
// Berbahaya: shell menafsirkan karakter khusus
exec(`convert ${namaBerkas} -resize 200x200 keluaran.jpg`);
// namaBerkas = "x.jpg; rm -rf /"

// Benar: tanpa shell, argumen dikirim terpisah
await execFile('convert', [pathAman, '-resize', '200x200', pathKeluaran]);
```

## Batas sumber daya

Setiap masukan dari luar menentukan berapa banyak pekerjaan yang dilakukan server Anda, kecuali Anda yang menentukannya. Ini pelajaran modul 2 yang diterapkan sebagai kebijakan.

```ts
const app = Fastify({
  bodyLimit: 1 * 1024 * 1024,              // 1 MB, naikkan per rute kalau perlu
  requestTimeout: 15_000,
  keepAliveTimeout: 20_000,
  maxParamLength: 200,
});

// Batas kedalaman JSON, mencegah payload bersarang ribuan tingkat
app.addContentTypeParser(
  'application/json',
  { parseAs: 'string', bodyLimit: 1024 * 1024 },
  (req, body, selesai) => {
    try {
      const data = JSON.parse(body as string);
      if (kedalaman(data) > 20) {
        return selesai(new ErrorAplikasi('Struktur terlalu dalam', 400, 'TERLALU_DALAM'));
      }
      selesai(null, data);
    } catch {
      selesai(new ErrorAplikasi('JSON tidak valid', 400, 'JSON_RUSAK'));
    }
  }
);
```

Daftar batas yang pantas ada di setiap layanan:

| Batas | Nilai awal yang wajar |
| --- | --- |
| Ukuran body | 1 MB untuk JSON, lebih besar hanya pada rute unggah |
| Kedalaman dan jumlah field JSON | 20 tingkat, 1.000 field |
| Panjang setiap string | Ditentukan per field di skema |
| Jumlah elemen setiap array | Ditentukan per field di skema |
| `limit` pada daftar | Bawaan 20, maksimum 100 |
| Batas waktu permintaan | 15 detik |
| Batas waktu kueri | 10 detik, modul 7 |
| Pembatasan laju | Per pengguna dan per IP, lebih ketat pada login dan endpoint mahal |
| Jumlah sambungan bersamaan | Lewat `under-pressure`, modul 3 |

Satu tambahan untuk endpoint yang mahal: **kuota, bukan hanya laju.** Ekspor data yang dibatasi 10 per menit masih bisa dipanggil 14.400 kali sehari. Untuk operasi berat, batasi per hari dan per tenant.

## Rahasia

Ini bagian yang tidak bisa diselesaikan kode, dan paling sering jadi sumber insiden besar.

| Praktik | Keterangan |
| --- | --- |
| Rahasia tidak pernah masuk repositori | Termasuk di riwayat Git. Yang pernah ter-commit harus dianggap bocor dan diganti |
| `.env` ada di `.gitignore`, dan `.env.example` tanpa nilai | Dokumentasikan nama variabelnya, bukan isinya |
| Pemindai rahasia di CI | `gitleaks` atau sejenisnya, menolak commit yang berisi pola kredensial |
| Rahasia dibaca saat start, lalu divalidasi | Pola modul 2: mati dengan pesan jelas kalau kurang |
| Rotasi terjadwal | Dan yang lebih penting: **tahu cara memutarnya** sebelum terpaksa |
| Satu rahasia per lingkungan | Kredensial produksi tidak pernah ada di laptop siapa pun |
| Pengelola rahasia untuk produksi | Secrets Manager, Vault, atau fasilitas penyedia hosting |
| Rahasia tidak pernah masuk log | `redact` pada logger, modul 3 |

Dua hal yang sering terlewat:

**Rahasia bisa bocor lewat pesan error.** Pesan `connect ECONNREFUSED postgres://admin:sandi@db-prod:5432` yang sampai ke klien adalah kebocoran lengkap. Inilah alasan modul 3 melarang mengirim error mentah.

**Rahasia bisa bocor lewat dependensi.** Paket yang berbahaya di `node_modules` berjalan dengan hak penuh dan bisa membaca `process.env`. Karena itu lockfile wajib di-commit, kenaikan versi ditelaah, dan jumlah dependensi adalah keputusan keamanan, bukan hanya keputusan ukuran.

```bash
# Jalankan berkala, dan di CI
pnpm audit --audit-level=high
pnpm outdated
```

## Verifikasi webhook

Webhook adalah endpoint publik yang menerima pemberitahuan dari layanan lain, misalnya penyedia pembayaran. Siapa pun bisa memanggilnya, jadi memverifikasi pengirimnya bukan pilihan.

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';

app.post('/v1/webhook/pembayaran', {
  config: { rawBody: true },   // perlu body mentah, bukan hasil parse
}, async (req) => {
  const tandaTangan = req.headers['x-signature'] as string | undefined;
  const timestamp = req.headers['x-timestamp'] as string | undefined;

  if (!tandaTangan || !timestamp) {
    throw new ErrorKredensial('Tanda tangan tidak ada');
  }

  // 1. Tolak yang terlalu tua, supaya permintaan lama tidak bisa diputar ulang
  const umurDetik = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(umurDetik) || umurDetik > 300) {
    throw new ErrorKredensial('Tanda tangan kedaluwarsa');
  }

  // 2. Hitung dari body mentah, bukan dari hasil JSON.parse
  const diharapkan = createHmac('sha256', config.WEBHOOK_SECRET)
    .update(`${timestamp}.${req.rawBody}`)
    .digest();

  const diterima = Buffer.from(tandaTangan, 'hex');

  // 3. Perbandingan yang waktunya tetap, bukan ===
  if (
    diterima.length !== diharapkan.length ||
    !timingSafeEqual(diterima, diharapkan)
  ) {
    throw new ErrorKredensial('Tanda tangan tidak cocok');
  }

  // 4. Idempoten: penyedia akan mengirim ulang, dan kadang beberapa kali
  return layananPembayaran.proses(JSON.parse(req.rawBody), {
    kunci: req.headers['x-event-id'] as string,
  });
});
```

Empat langkah itu lengkap dan semuanya perlu. Yang paling sering dilewati nomor 1 dan 3: tanpa pemeriksaan umur, satu permintaan yang pernah direkam bisa diputar ulang selamanya, dan perbandingan dengan `===` membocorkan informasi lewat selisih waktu yang bisa diukur.

## Daftar periksa sebelum dibuka ke publik

| # | Yang diperiksa |
| --- | --- |
| 1 | Semua endpoint yang mengakses data punya autentikasi dan pemeriksaan otorisasi |
| 2 | Endpoint daftar, pencarian, laporan, ekspor, dan berkas ikut diperiksa |
| 3 | Semua skema masukan `.strict()`, dan field yang ditentukan server tidak bisa dikirim klien |
| 4 | Semua masukan punya batas ukuran, panjang, dan jumlah |
| 5 | Pembatasan laju terpasang, lebih ketat pada login dan endpoint mahal |
| 6 | Error mentah tidak pernah sampai ke klien, dan `requestId` selalu disertakan |
| 7 | Rahasia tidak ada di repositori, dan pemindai rahasia aktif di CI |
| 8 | TLS wajib, dan HSTS terpasang di lapisan yang menyajikan domain |
| 9 | CORS memakai daftar asal yang tertulis, bukan `true` |
| 10 | Log menyaring token, sandi, dan data pribadi |
| 11 | Jejak audit ada untuk login, perubahan izin, dan akses data sensitif |
| 12 | Dependensi: lockfile di-commit, `pnpm audit` bersih untuk tingkat tinggi |
| 13 | Webhook diverifikasi, dengan pemeriksaan umur dan perbandingan aman |
| 14 | Pengambilan URL dari pengguna melewati penyaring SSRF |
| 15 | Tidak ada path berkas yang disusun dari masukan pengguna |
| 16 | Basis data: aplikasi memakai peran terbatas, bukan superuser |
| 17 | Cadangan berjalan, dan **pemulihannya pernah diuji** |
| 18 | Ada cara mencabut sesi dan kunci API dengan cepat |
| 19 | Panel admin dan endpoint internal tidak terbuka ke publik |
| 20 | Ada orang yang jadi penerima laporan kerentanan, dan caranya tertulis |

Nomor 17 pantas ditekankan: cadangan yang belum pernah diuji pemulihannya bukan cadangan, hanya harapan. Dan nomor 20 sering dilupakan: berkas `security.txt` dengan alamat email yang benar-benar dibaca membuat peneliti keamanan melapor kepada Anda, bukan ke tempat lain.

## Latihan

### Latihan 1: Temukan delapan celah

Lima handler ini dari layanan yang sudah punya autentikasi dan otorisasi. Temukan delapan celah keamanannya.

```ts
// A
app.patch('/v1/profil', async (req) => {
  pastikanBoleh(req.pelaku, 'profil:ubah');
  return repoPengguna.perbarui(req.pelaku.penggunaId, req.body as any);
});

// B
app.post('/v1/produk/impor', async (req) => {
  const csv = await (await fetch(req.body.url)).text();
  return layananProduk.imporMassal(parseCsv(csv));
});

// C
app.get('/v1/laporan/unduh', async (req) => {
  pastikanBoleh(req.pelaku, 'laporan:baca');
  return createReadStream(`/var/laporan/${req.query.berkas}`);
});

// D
app.post('/v1/gambar/ubah-ukuran', async (req) => {
  const { nama, lebar } = req.body as any;
  await exec(`convert /tmp/${nama} -resize ${lebar}x /tmp/kecil-${nama}`);
  return { ok: true };
});

// E
app.post('/v1/webhook/pembayaran', async (req) => {
  const data = req.body as any;
  if (data.status === 'paid') {
    await repoPesanan.tandaiDibayar(data.orderId);
  }
  return { ok: true };
});
```

> [!jawaban]
>
> | # | Celah | Akibat |
> | --- | --- | --- |
> | 1 | **A**: `req.body as any` langsung ke basis data | Mass assignment. Penyerang menaikkan perannya sendiri jadi pemilik |
> | 2 | **A**: tidak ada skema ketat | Field `tenantId`, `status`, `sandiHash` bisa ditimpa |
> | 3 | **B**: URL dari pengguna tanpa penyaring | SSRF ke metadata cloud dan layanan internal |
> | 4 | **B**: tanpa batas ukuran dan batas waktu | Satu URL yang mengalir tanpa henti menghabiskan memori |
> | 5 | **C**: path dari query | Path traversal, `?berkas=../../etc/passwd` |
> | 6 | **C**: izin diperiksa, cakupan tenant tidak | Laporan tenant lain bisa diunduh |
> | 7 | **D**: `exec` dengan shell dan masukan pengguna | Injeksi perintah, dan `lebar` juga ikut masuk shell |
> | 8 | **E**: webhook tanpa verifikasi tanda tangan | Siapa pun menandai pesanan apa pun sebagai dibayar |
>
> Celah kesembilan pada **E** yang lebih halus: tidak idempoten. Penyedia pembayaran akan mengirim pemberitahuan yang sama beberapa kali, dan tanpa kunci idempotency, satu pesanan bisa diproses berulang.
>
> Perbaikan untuk **A**, yang paling cepat memberi dampak:
>
> ```ts
> const patchProfil = z
>   .object({
>     nama: z.string().trim().min(3).max(80).optional(),
>     telepon: z.string().regex(/^0\d{8,13}$/).nullable().optional(),
>     bio: z.string().max(300).nullable().optional(),
>   })
>   .strict();
>
> app.patch('/v1/profil', { schema: { body: patchProfil } }, async (req) => {
>   // Hanya tiga field yang bisa diubah, apa pun yang dikirim klien
>   return repoPengguna.perbarui(req.pelaku.penggunaId, req.body);
> });
> ```
>
> Pola yang menghubungkan delapan celah itu: **masukan dari luar dipakai langsung sebagai sesuatu yang berbahaya** (kolom basis data, path berkas, argumen shell, URL jaringan, atau perintah bisnis). Pertanyaan yang pantas ditanyakan di setiap telaah kode: nilai ini berasal dari luar, dan dipakai sebagai apa?

### Latihan 2: Bangun penyaring SSRF yang benar

Terapkan fitur "impor produk dari URL" dengan aman. Lalu uji dengan delapan URL berbahaya dan pastikan semuanya ditolak.

> [!pembahasan]
>
> Delapan URL yang wajib ditolak, dan masing-masing menguji satu lapis pertahanan:
>
> | URL | Yang diuji |
> | --- | --- |
> | `file:///etc/passwd` | Pemeriksaan protokol |
> | `http://127.0.0.1:9090/metrics` | Daftar IP terlarang |
> | `http://169.254.169.254/latest/meta-data/` | Metadata cloud |
> | `http://localhost:5432` | Nama host yang menunjuk lokal |
> | `http://[::1]:9090/` | Bentuk IPv6 |
> | `http://db-internal:5432` | Nama host internal yang terselesaikan ke IP privat |
> | `http://situs-saya.test/alihkan` yang mengalihkan ke `127.0.0.1` | Pengalihan |
> | `http://2130706433/` | IP dalam bentuk desimal, yang juga berarti 127.0.0.1 |
>
> Dua kasus yang paling sering lolos dari implementasi buatan sendiri:
>
> **Baris terakhir: IP dalam bentuk desimal.** `http://2130706433/` adalah cara lain menulis `127.0.0.1`, dan pemeriksaan berbasis pola teks pada nama host tidak akan menangkapnya. Inilah alasan pemeriksaan harus dilakukan **setelah** resolusi DNS, pada alamat IP yang sudah dinormalkan, bukan pada teks nama host.
>
> **Baris ketujuh: pengalihan.** Pemeriksaan pertama lolos karena domainnya publik, lalu server mengalihkan ke alamat internal. Menolak pengalihan sepenuhnya adalah pilihan paling aman. Kalau pengalihan memang perlu didukung, ikuti satu per satu dan periksa ulang setiap tujuan.
>
> Satu jebakan ketiga yang lebih sulit: **DNS rebinding.** Nama host bisa menjawab alamat publik saat Anda memeriksanya, lalu menjawab alamat internal saat `fetch` menyelesaikannya kembali beberapa milidetik kemudian. Pertahanan yang benar-benar menutupnya: **sambungkan ke alamat IP yang sudah Anda periksa**, bukan ke nama host, dengan `lookup` kustom pada agent HTTP.
>
> ```ts
> import { Agent } from 'undici';
>
> const agentAman = new Agent({
>   connect: {
>     lookup: (hostname, opsi, callback) => {
>       dnsLookup(hostname, opsi, (err, address, family) => {
>         if (err) return callback(err, '', 4);
>         if (DILARANG.some((p) => p.test(address))) {
>           return callback(new Error('Alamat tidak diizinkan'), '', 4);
>         }
>         callback(null, address, family);
>       });
>     },
>   },
> });
> ```
>
> Kalau ini terasa terlalu rumit untuk satu fitur impor, itu kesimpulan yang sah: pertimbangkan apakah fiturnya memang harus menerima URL bebas. Alternatif yang jauh lebih aman: pengguna mengunggah berkasnya, atau Anda hanya menerima URL dari daftar domain yang disetujui.

### Latihan 3: Audit rahasia

Periksa proyek Anda dan jawab delapan pertanyaan berikut dengan bukti, bukan dengan ingatan.

| # | Pertanyaan |
| --- | --- |
| 1 | Apakah ada rahasia di riwayat Git, termasuk commit yang sudah lama? |
| 2 | Apakah `.env` ada di `.gitignore` sejak commit pertama? |
| 3 | Siapa saja yang punya kredensial produksi di laptopnya? |
| 4 | Berapa lama waktu yang dibutuhkan untuk memutar kredensial basis data? |
| 5 | Apakah rahasia bisa muncul di log atau pelacak error? |
| 6 | Apakah kredensial berbeda antara pengembangan, staging, dan produksi? |
| 7 | Peran basis data apa yang dipakai aplikasi? |
| 8 | Siapa yang diberi tahu kalau ada kebocoran, dan bagaimana caranya? |

> [!jawaban]
>
> ```bash
> # 1. Pindai seluruh riwayat, bukan hanya kondisi sekarang
> pnpm dlx gitleaks detect --source . --redact -v
>
> # Cari pola yang umum, termasuk di commit lama
> git log -p --all | grep -nE '(SECRET|PASSWORD|API_KEY|BEGIN (RSA|OPENSSH))' | head
>
> # 2. Periksa apakah .env pernah terlacak
> git log --all --full-history -- .env
> ```
>
> Lima temuan khas pada proyek yang belum pernah diaudit:
>
> 1. **Ada `.env` di commit kedua, lalu dihapus di commit keempat.** Isinya masih ada di riwayat, dan siapa pun yang mengkloning repositori memilikinya. Menghapus berkas tidak menghapus riwayat. Yang harus dilakukan: **anggap semua nilai itu bocor dan ganti semuanya**, lalu bersihkan riwayat dengan `git filter-repo` kalau repositorinya privat dan jumlah kloningnya terkendali.
> 2. **Kredensial produksi ada di laptop dua orang** karena pernah dipakai untuk memperbaiki insiden. Perbaikan: akses produksi lewat jalur yang tercatat, misalnya bastion atau tunnel dari pengelola rahasia, bukan lewat salinan kredensial.
> 3. **Jawaban nomor 4 adalah "tidak tahu".** Ini temuan paling penting. Kalau memutar kredensial belum pernah dilatih, Anda tidak akan bisa melakukannya di tengah insiden. Latih sekali pada staging, catat langkahnya, dan ukur waktunya.
> 4. **Aplikasi memakai peran `postgres`**, yaitu superuser. Akibatnya: injeksi SQL atau kompromi aplikasi berarti kendali penuh atas basis data, dan RLS dari modul 11 bisa dilewati. Perbaikan: peran khusus dengan hak minimum.
> 5. **Nomor 8 tidak punya jawaban.** Tulis satu halaman: siapa yang dihubungi, urutan langkahnya, dan siapa yang berwenang mematikan layanan. Satu halaman yang ditulis sebelum insiden bernilai lebih daripada sepuluh rapat sesudahnya.

### Latihan 4: Verifikasi webhook dan uji serangannya

Terapkan verifikasi webhook lengkap, lalu uji dengan lima serangan dan pastikan semuanya ditolak.

> [!jawaban]
>
> | Serangan | Cara menguji | Yang harus terjadi |
> | --- | --- | --- |
> | Tanpa tanda tangan | Kirim body yang sah tanpa header | 401 |
> | Tanda tangan salah | Ubah satu karakter tanda tangan | 401 |
> | Body diubah | Tanda tangan sah, isi body diubah satu angka | 401 |
> | Putar ulang | Rekam permintaan sah, kirim lagi 10 menit kemudian | 401 karena umur |
> | Kirim dua kali dalam 5 menit | Permintaan sah yang sama dikirim dua kali | 200, dan pesanan **tidak** diproses dua kali |
>
> Baris terakhir yang paling sering salah dipahami: permintaan sah yang dikirim dua kali **harus** diterima dengan 200, karena penyedia pembayaran akan mengulanginya kalau mendapat selain 2xx, dan pengulangannya akan makin sering. Yang tidak boleh adalah pekerjaannya dilakukan dua kali.
>
> ```ts
> async function prosesPembayaran(data: PeristiwaPembayaran, idPeristiwa: string) {
>   return dalamTransaksi(db, async (tx) => {
>     // Peristiwa yang sudah pernah diproses: terima, jangan kerjakan lagi
>     const [baru] = await tx.execute(sql`
>       INSERT INTO peristiwa_webhook (id, penyedia, muatan, diterima_pada)
>       VALUES (${idPeristiwa}, 'pembayaran', ${JSON.stringify(data)}, now())
>       ON CONFLICT (id) DO NOTHING
>       RETURNING id
>     `);
>
>     if (!baru) return { ok: true, catatan: 'sudah diproses' };
>
>     // Perubahan status bersyarat: hanya dari menunggu, sehingga aman diulang
>     const [pesanan] = await tx.execute(sql`
>       UPDATE pesanan
>       SET status = 'dibayar', dibayar_pada = now(), versi = versi + 1
>       WHERE id = ${data.pesananId} AND status = 'menunggu'
>       RETURNING id
>     `);
>
>     // Pesanan yang sudah dibayar atau sudah dibatalkan: catat, jangan error
>     if (!pesanan) {
>       await repoAudit(tx).catat({
>         jenis: 'webhook-status-tidak-cocok',
>         pesananId: data.pesananId,
>       });
>     }
>
>     return { ok: true };
>   });
> }
> ```
>
> Empat hal yang membuat penanganan ini layak produksi:
>
> 1. **Peristiwa disimpan sebelum diproses**, dengan `ON CONFLICT DO NOTHING` sebagai penjaga idempotensi, dalam transaksi yang sama dengan pekerjaannya. Pola modul 8.
> 2. **Muatan asli disimpan.** Saat ada selisih dengan penyedia pembayaran nanti, muatan asli adalah bukti yang menyelesaikan perdebatan.
> 3. **Perubahan status bersyarat.** Webhook bisa datang setelah pesanan dibatalkan, dan itu bukan error sistem melainkan keadaan yang perlu dicatat lalu ditangani manusia.
> 4. **Selalu menjawab 2xx untuk permintaan yang sah.** Menjawab 500 karena pesanan tidak cocok akan membuat penyedia mengirim ulang terus, dan log Anda penuh tanpa manfaat. Yang perlu diselidiki manusia dicatat sebagai audit, bukan dikembalikan sebagai error.

## Batasnya

Keamanan yang dikerjakan dengan baik tetap punya tiga batas.

**Daftar periksa bukan jaminan.** Celah baru muncul dari fitur baru, dan dari dependensi yang berubah. Yang bisa dilakukan tim adalah menjadikan pemeriksaan ini bagian dari telaah kode dan pipeline, bukan acara tahunan.

**Anda tidak bisa mendeteksi apa yang tidak Anda ukur.** Serangan yang berhasil biasanya terlihat di log sebagai pola yang aneh beberapa hari sebelumnya. Tanpa pemantauan, Anda mengetahuinya dari pihak lain. Itu modul 18.

**Sebagian serangan tidak menyentuh kode.** Rekayasa sosial terhadap tim Anda, laptop yang disusupi, dan kredensial yang dibagikan lewat pesan adalah celah yang tidak bisa ditutup backend.

## Rangkuman

- Sebagian besar celah tertutup oleh pekerjaan di modul sebelumnya. Yang tersisa: SSRF, rahasia, konfigurasi, dependensi, dan pemantauan.
- Skema `.strict()` sebagai kebiasaan, dan field yang ditentukan server tidak pernah datang dari klien. Field berbahaya diberi endpoint sendiri.
- SSRF ditutup berlapis: protokol, pemeriksaan IP setelah resolusi DNS, penolakan pengalihan, batas ukuran dan waktu, dan idealnya sambungan ke IP yang sudah diperiksa.
- Jangan pernah menyusun path berkas atau argumen shell dari masukan pengguna. `execFile` dengan array, bukan `exec` dengan string.
- Setiap masukan punya batas: ukuran, kedalaman, panjang, jumlah, laju, dan kuota harian untuk operasi mahal.
- Rahasia yang pernah ter-commit harus dianggap bocor dan diganti. Pindai riwayat, bukan hanya kondisi sekarang.
- Aplikasi memakai peran basis data dengan hak minimum, bukan superuser.
- Webhook butuh empat hal: tanda tangan dari body mentah, pemeriksaan umur, perbandingan waktu tetap, dan idempotensi. Permintaan sah yang berulang dijawab 2xx.
- Cadangan yang pemulihannya belum pernah diuji bukan cadangan.
- Tulis cara melaporkan kerentanan, dan siapkan satu halaman prosedur insiden sebelum insiden pertama.

## Masalah terbuka

Tiga modul terakhir membahas siapa pemanggilnya, apa yang boleh dilakukannya, dan bagaimana menahan yang berniat buruk. Saatnya menyatukan ketiganya.

Bagian berikutnya adalah Proyek 3: layanan autentikasi multi-tenant yang bisa dipakai beberapa aplikasi sekaligus, lengkap dengan undangan anggota, peran kustom per tenant, kunci API, jejak audit, isolasi yang dijamin Row Level Security, dan serangkaian uji serangan yang harus semuanya ditolak.
