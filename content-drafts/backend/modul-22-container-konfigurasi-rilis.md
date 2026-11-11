---
title: 'Modul 22: Container, Konfigurasi, dan Rilis'
description: Membuat deploy jadi pekerjaan yang membosankan, dan itu pujian. Container yang benar, migrasi tanpa menurunkan layanan, rilis bertahap, dan mundur dalam dua menit.
date: 2026-12-29
slug: modul-22-container-konfigurasi-rilis
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Layanan Anda sekarang teruji dan terukur, dan masih berjalan dengan `pnpm dev` di laptop. Lima pertanyaan yang belum pernah dijawab:

| Pertanyaan | Kalau tidak dijawab |
| --- | --- |
| Apakah yang di produksi sama dengan yang diuji? | "Jalan di laptop saya" |
| Bagaimana migrasi dijalankan tanpa menurunkan layanan? | Error 500 selama tiga menit setiap rilis |
| Bagaimana mundur saat ternyata salah? | Panik, dan perbaikan terburu-buru yang menambah masalah |
| Di mana rahasia produksi disimpan? | Di laptop beberapa orang |
| Kalau satu instance mati pukul tiga pagi, siapa menggantinya? | Anda, dan Anda harus bangun |

Tujuan modul ini satu kalimat: **deploy harus jadi pekerjaan yang membosankan.** Kalau setiap rilis butuh rapat, orang berjaga, dan doa, yang perlu diperbaiki jalurnya, bukan tingkat kewaspadaannya.

## Analogi: resep, dapur, dan pengiriman

Restoran yang kualitasnya tetap di sepuluh cabang punya tiga hal yang dipisahkan dengan tegas.

**Resep tertulis yang sama persis.** Bukan "garam secukupnya", tapi takaran yang sama di semua cabang. Itu image container: satu artefak yang sama, dijalankan di mana pun.

**Bahan yang berbeda per cabang.** Harga jual, nomor telepon, dan pemasok lokal berbeda, dan itu bukan bagian dari resep. Itu konfigurasi dari lingkungan.

**Prosedur pergantian menu.** Menu baru tidak langsung diganti di semua cabang pada hari yang sama. Dicoba di satu cabang, diamati, baru diperluas. Dan ada prosedur kembali ke menu lama yang pernah dilatih. Itu rilis bertahap dan prosedur mundur.

| Dunia restoran | Dunia backend |
| --- | --- |
| Resep tertulis | Image container yang tidak berubah |
| Takaran yang sama di semua cabang | Satu artefak, dibangun sekali |
| Bahan lokal per cabang | Variabel lingkungan |
| Kunci gudang yang tidak dibawa pulang | Rahasia dari pengelola rahasia |
| Mencoba menu di satu cabang | Canary |
| Prosedur kembali ke menu lama | Rollback yang pernah dilatih |
| Mengganti perabot sambil restoran buka | Migrasi tanpa menurunkan layanan |
| Papan nomor versi menu di dapur | Versi rilis yang terlihat di aplikasi |

Batas analoginya: resep yang salah bisa dikoreksi besok, sedangkan migrasi basis data yang salah mengubah data yang tidak bisa dikembalikan dengan mengganti versi aplikasi. Itu sebabnya bagian migrasi di modul ini diperlakukan paling hati-hati.

## Konfigurasi

Prinsipnya satu: **artefak yang sama berjalan di semua lingkungan, dan yang berbeda hanya variabel lingkungannya.**

```ts
// src/config.ts, dari modul 2 dengan tambahan
const skema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().default(3000),

  DATABASE_URL: z.string().url(),
  DATABASE_REPLICA_URL: z.string().url().optional(),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(8),

  REDIS_URL: z.string().url().optional(),
  BROKER_URL: z.string().url().optional(),

  AUTH_SECRET: z.string().min(32),
  WEBHOOK_SECRET: z.string().min(32),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  BEHIND_PROXY: z.coerce.boolean().default(false),

  // Dipakai di log, metrik, dan respons, supaya versi yang tayang selalu jelas
  VERSI_RILIS: z.string().default('dev'),
  JEDA_DRAIN_MS: z.coerce.number().int().default(5_000),
});

const hasil = skema.safeParse(process.env);

if (!hasil.success) {
  console.error('Konfigurasi tidak valid:', hasil.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = hasil.data;
```

Empat aturan konfigurasi:

**Satu, divalidasi saat start dan mati kalau kurang.** Proses yang berjalan dengan `DATABASE_URL` kosong akan gagal pada permintaan pertama, dan itu jauh lebih sulit didiagnosis daripada gagal saat start dengan pesan jelas.

**Dua, jangan pernah ada nilai bawaan untuk rahasia.** `AUTH_SECRET` tanpa bawaan berarti lupa menyetelnya di produksi menghasilkan kegagalan start. Dengan bawaan, Anda akan tayang dengan rahasia yang sama dengan yang tertulis di repositori.

**Tiga, satu berkas untuk seluruh daftar.** Konfigurasi yang dibaca dengan `process.env.X` tersebar di dua puluh berkas tidak bisa diaudit, dan tidak ada yang tahu variabel apa saja yang dibutuhkan layanan ini.

**Empat, `VERSI_RILIS` disuntikkan saat build.** Dengan itu, pertanyaan "versi berapa yang tayang" dijawab dari endpoint, log, dan metrik, bukan dari ingatan.

Soal rahasia di produksi, tiga pilihan dari yang terburuk ke yang terbaik:

| Cara | Penilaian |
| --- | --- |
| Di dalam image | Tidak boleh. Siapa pun yang bisa menarik image memilikinya |
| Variabel lingkungan dari panel hosting | Dapat diterima, dan paling umum |
| Dipasang sebagai berkas dari pengelola rahasia | Terbaik: bisa diputar tanpa membangun ulang, dan tidak terlihat di daftar proses |

## Container

```dockerfile
# syntax=docker/dockerfile:1

# --- Tahap 1: dependensi ---
FROM node:22-bookworm-slim AS deps
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
# Cache mount: pemasangan dependensi tidak diulang kalau lockfile tidak berubah
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# --- Tahap 2: build ---
FROM deps AS build
COPY . .
RUN pnpm tsc

# Buang dependensi pengembangan setelah build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm prune --prod

# --- Tahap 3: jalankan ---
FROM node:22-bookworm-slim AS jalan
WORKDIR /app

ENV NODE_ENV=production

# Jangan jalan sebagai root
USER node

# Hanya yang dibutuhkan untuk berjalan
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./

# dumb-init sebagai PID 1 supaya SIGTERM benar-benar diteruskan ke Node
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.js"]

EXPOSE 3000
```

```text
# .dockerignore
node_modules
dist
.git
.env*
*.md
test
coverage
.github
```

Enam keputusan di Dockerfile itu, dan masing-masing mencegah masalah nyata:

**Satu, build bertahap.** Image akhir tidak memuat kode sumber TypeScript, dependensi pengembangan, maupun perkakas build. Ukurannya bisa seperempat dari build satu tahap.

**Dua, `USER node`.** Proses yang berjalan sebagai root di container berarti satu celah eksekusi kode berjalan dengan hak penuh. Ini satu baris yang hampir selalu terlupakan.

**Tiga, PID 1 yang benar.** Node sebagai PID 1 tidak menangani sinyal seperti proses biasa, dan `SIGTERM` bisa diabaikan sehingga penutupan rapi dari modul 20 tidak pernah berjalan. `dumb-init` atau `--init` pada runtime menyelesaikannya.

**Empat, `.dockerignore` yang benar.** Tanpa itu, `node_modules` lokal dan berkas `.env` Anda ikut masuk ke konteks build, dan yang kedua berarti rahasia Anda masuk ke image.

**Lima, lockfile disalin terpisah sebelum kode.** Dengan urutan ini, perubahan kode tidak membatalkan cache pemasangan dependensi, dan build jadi hitungan detik alih-alih menit.

**Enam, tanpa `HEALTHCHECK` di Dockerfile.** Kalau Anda memakai orkestrator, probe-nya yang menentukan, dan `HEALTHCHECK` di image hanya membingungkan. Untuk Docker Compose saja, pasang.

Satu hal yang spesifik untuk Node dan sering jadi penyebab proses mati tanpa penjelasan:

```yaml
# Batas memori container 512 MB, tapi Node tidak tahu itu
resources:
  limits:
    memory: 512Mi

env:
  # Beri tahu V8 supaya mulai membersihkan sebelum container dimatikan sistem
  - name: NODE_OPTIONS
    value: '--max-old-space-size=384'
```

Tanpa `--max-old-space-size` yang lebih kecil daripada batas container, V8 akan terus menumbuhkan heap sampai melewati batas, lalu kernel mematikan proses tanpa pesan apa pun. Gejalanya: container mati berkala dengan kode 137 dan tidak ada error di log.

## Migrasi tanpa menurunkan layanan

Ini bagian yang paling sering menyebabkan gangguan saat rilis, dan aturannya satu: **saat migrasi berjalan, aplikasi versi lama masih melayani permintaan.**

Urutan rilis yang benar:

```text
1. Jalankan migrasi (hanya yang kompatibel dengan versi lama)
2. Pastikan migrasi berhasil
3. Luncurkan versi aplikasi baru secara bergulir
4. Setelah semua instance versi baru, jalankan migrasi pembersihan (kalau ada)
```

Dan aturan kompatibilitasnya, dengan contoh yang sering ditemui:

| Perubahan | Aman dalam satu rilis? | Cara yang benar |
| --- | --- | --- |
| Tambah tabel | Ya | Langsung |
| Tambah kolom nullable | Ya | Langsung |
| Tambah kolom `NOT NULL` dengan bawaan | Ya di Postgres modern | Langsung, periksa versinya |
| Tambah indeks | Ya | `CREATE INDEX CONCURRENTLY`, di luar transaksi |
| Ganti nama kolom | **Tidak** | Empat tahap: tambah, tulis dua-duanya, pindah baca, hapus |
| Hapus kolom | **Tidak** | Hentikan pemakaian dulu, hapus di rilis berikutnya |
| Ubah tipe kolom | **Tidak** | Kolom baru, salin bertahap, tukar |
| Tambah batasan `NOT NULL` | **Tidak langsung** | Isi dulu, lalu tambahkan |
| Tambah foreign key | **Tidak langsung** | `NOT VALID`, lalu `VALIDATE CONSTRAINT` |

```sql
-- Contoh: menambahkan NOT NULL tanpa mengunci tabel besar
-- Tahap 1 (rilis N)
ALTER TABLE pesanan ADD COLUMN kode_promo text;

-- Tahap 2 (rilis N, pekerjaan latar): isi bertahap
UPDATE pesanan SET kode_promo = '' WHERE kode_promo IS NULL AND id IN (
  SELECT id FROM pesanan WHERE kode_promo IS NULL LIMIT 5000
);

-- Tahap 3 (rilis N+1): batasan ditambahkan tanpa memeriksa seluruh tabel dulu
ALTER TABLE pesanan ADD CONSTRAINT kode_promo_ada CHECK (kode_promo IS NOT NULL) NOT VALID;
ALTER TABLE pesanan VALIDATE CONSTRAINT kode_promo_ada;
```

Dan satu hal yang paling penting dan paling sering dilewatkan: **migrasi yang mengubah data tidak bisa dibatalkan dengan mundurnya aplikasi.**

```text
Rilis N+1 menjalankan: UPDATE pesanan SET total_sen = total_rp * 100
Lalu ternyata ada bug, dan aplikasi dimundurkan ke versi N.

Versi N membaca total_rp. Kolomnya masih ada, nilainya masih benar.
-> Aman, karena migrasinya aditif.

Bandingkan dengan:
Rilis N+1 menjalankan: UPDATE pesanan SET total_rp = total_rp * 100
Aplikasi dimundurkan ke versi N.
-> Semua nilai seratus kali lebih besar, dan tidak ada cara mengembalikannya
   kecuali dari cadangan.
```

Aturan praktisnya: **migrasi yang mengubah data yang ada harus aditif, dan pembacaannya dipindahkan di rilis terpisah.** Dengan begitu, mundur selalu mungkin.

## Strategi rilis

| Strategi | Cara | Kapan |
| --- | --- | --- |
| **Bergulir** | Ganti instance satu per satu, menunggu readiness | Bawaan untuk hampir semua kasus |
| **Biru hijau** | Dua lingkungan penuh, alihkan lalu lintas sekaligus | Saat perlu mundur seketika, dan sanggup membayar dua lingkungan |
| **Canary** | 5% lalu lintas ke versi baru, amati, lalu perluas | Perubahan berisiko, dan ada metrik yang cukup untuk menilai |
| **Feature flag** | Kode tayang dalam keadaan mati, dinyalakan terpisah | Memisahkan rilis dari peluncuran. Pelengkap, bukan pengganti |

Rilis bergulir butuh dua hal yang sudah Anda bangun di modul 20: readiness yang jujur, dan penutupan yang rapi. Tanpa keduanya, rilis bergulir berarti permintaan yang gagal di setiap pergantian instance.

```yaml
# Kubernetes, bagian yang menentukan
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1          # satu instance tambahan saat pergantian
      maxUnavailable: 0    # jangan pernah mengurangi kapasitas

  template:
    spec:
      terminationGracePeriodSeconds: 45   # harus > jeda drain + pekerjaan terpanjang

      containers:
        - name: api
          image: registry/layanan:1.24.0   # tag versi, bukan "latest"

          startupProbe:                    # untuk start yang lambat
            httpGet: { path: /sehat, port: 3000 }
            failureThreshold: 30
            periodSeconds: 2

          livenessProbe:                   # tidak memeriksa ketergantungan
            httpGet: { path: /sehat, port: 3000 }
            periodSeconds: 10
            failureThreshold: 5            # longgar, pelajaran modul 20

          readinessProbe:                  # memeriksa yang wajib saja
            httpGet: { path: /siap, port: 3000 }
            periodSeconds: 5
            failureThreshold: 2

          resources:
            requests: { cpu: 200m, memory: 256Mi }
            limits: { memory: 512Mi }      # CPU tanpa limit: lihat catatan di bawah
```

Tiga catatan tentang konfigurasi itu:

**`maxUnavailable: 0`** memastikan kapasitas tidak berkurang saat rilis. Dengan nilai bawaan, Anda bisa kehilangan sepertiga kapasitas tepat saat rilis, dan kalau rilisnya dilakukan pada jam sibuk, itu cukup untuk memicu insiden.

**`terminationGracePeriodSeconds` harus lebih besar** daripada jeda drain ditambah pekerjaan terpanjang Anda. Kalau worker Anda punya pekerjaan yang butuh 30 detik, grace period 30 detik berarti pekerjaan itu terputus di setiap rilis.

**Batas CPU sering lebih merugikan daripada menolong.** CPU throttling pada Node menghasilkan latensi yang melonjak tak terduga, karena proses dihentikan di tengah pekerjaan. Setel `requests` supaya penjadwalan benar, dan pertimbangkan tidak memasang `limits` CPU sama sekali. Untuk memori, `limits` tetap perlu.

Dan satu hal yang berlaku apa pun orkestratornya: **bangun sekali, deploy banyak kali.** Image yang sama yang diuji di staging adalah image yang tayang di produksi, dengan tag versi yang sama. Membangun ulang untuk produksi berarti Anda menayangkan sesuatu yang belum pernah diuji.

## Rilis dan peluncuran bukan hal yang sama

Feature flag memisahkan keduanya, dan itu mengubah cara tim bekerja.

```ts
// src/fitur/pesanan/rute.ts, memisahkan rilis dari peluncuran
// Kode tayang, fitur masih mati
export async function hitungDiskon(pesanan: Pesanan, pelaku: Pelaku) {
  if (await flag.aktif('diskon-berjenjang', { tenantId: pelaku.tenantId })) {
    return hitungDiskonBerjenjang(pesanan);
  }

  return hitungDiskonLama(pesanan);
}
```

Empat manfaat yang nyata: perubahan besar bisa digabung ke `main` dalam potongan kecil tanpa menunggu selesai, fitur bisa dinyalakan untuk satu tenant dulu, mematikan fitur yang bermasalah butuh detik bukan rilis, dan rilis jadi lebih sering sehingga tiap rilis membawa lebih sedikit perubahan.

Dua aturan yang mencegah flag jadi utang:

**Satu, setiap flag punya pemilik dan tanggal kedaluwarsa.** Flag yang sudah dinyalakan 100% selama dua bulan harus dihapus beserta cabang kode lamanya.

**Dua, jumlah flag aktif dipantau.** Lima puluh flag aktif berarti dua pangkat lima puluh kemungkinan kombinasi, dan tidak ada satu pun yang pernah diuji.

## Pipeline

```yaml
name: Rilis
on:
  push:
    branches: [main]

jobs:
  bangun:
    runs-on: ubuntu-latest
    outputs:
      versi: ${{ steps.versi.outputs.versi }}
    steps:
      - uses: actions/checkout@v4

      - id: versi
        run: echo "versi=$(git rev-parse --short HEAD)" >> "$GITHUB_OUTPUT"

      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: |
            registry/layanan:${{ steps.versi.outputs.versi }}
            registry/layanan:main
          build-args: VERSI_RILIS=${{ steps.versi.outputs.versi }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  migrasi:
    needs: bangun
    runs-on: ubuntu-latest
    environment: produksi
    steps:
      # Image yang sama dipakai untuk migrasi, bukan skrip terpisah
      - run: |
          docker run --rm \
            -e DATABASE_URL="${{ secrets.DATABASE_URL }}" \
            registry/layanan:${{ needs.bangun.outputs.versi }} \
            node dist/migrasi.js

  luncurkan:
    needs: [bangun, migrasi]
    runs-on: ubuntu-latest
    environment: produksi
    steps:
      - run: |
          kubectl set image deployment/api \
            api=registry/layanan:${{ needs.bangun.outputs.versi }}
          kubectl rollout status deployment/api --timeout=300s

  pantau:
    needs: luncurkan
    runs-on: ubuntu-latest
    steps:
      # Amati 10 menit, mundur otomatis kalau tingkat error naik
      - run: node skrip/pantau-rilis.js --versi=${{ needs.bangun.outputs.versi }} --menit=10
```

Empat hal yang membedakan pipeline ini dari yang asal jalan:

**Satu, migrasi adalah tahap terpisah sebelum peluncuran**, dan kalau gagal, versi aplikasi tidak pernah diganti.

**Dua, image yang sama dipakai untuk migrasi.** Dengan begitu, kode migrasi yang dijalankan persis yang ada di image yang akan tayang, bukan versi dari checkout yang mungkin berbeda.

**Tiga, tag versi dari commit.** `latest` tidak pernah dipakai, karena tag itu membuat pertanyaan "versi apa yang tayang" tidak bisa dijawab, dan membuat mundur jadi tebakan.

**Empat, tahap pemantauan setelah rilis.** Sepuluh menit mengamati metrik, dan mundur otomatis kalau tingkat kesalahan melewati ambang. Ini yang mengubah rilis dari momen menegangkan jadi proses yang berjalan sendiri.

## Mundur

```bash
# Mundur aplikasi: cepat, dan harus selalu mungkin
kubectl rollout undo deployment/api

# Atau eksplisit ke versi tertentu
kubectl set image deployment/api api=registry/layanan:1.23.4
```

Empat hal yang menentukan apakah mundur benar-benar bisa dilakukan:

| Syarat | Kalau tidak dipenuhi |
| --- | --- |
| Versi lama masih ada di registry | Tidak ada yang bisa dikembalikan |
| Migrasi kompatibel dua arah | Versi lama error karena skemanya berubah |
| Migrasi data aditif | Data sudah berubah dan tidak bisa dikembalikan |
| Prosedurnya pernah dilatih | Dua menit jadi dua puluh menit saat panik |

Baris terakhir adalah yang paling sering diabaikan. **Latih mundur di staging secara berkala, dan ukur waktunya.** Prosedur yang hanya ada di dokumen akan dibaca pertama kali saat produksi rusak, dan itu waktu terburuk untuk belajar.

Dua angka yang pantas Anda ketahui tentang layanan Anda, dan dipakai di modul 19 seri frontend juga: **berapa lama dari commit sampai tayang, dan berapa lama dari tahu rusak sampai pulih.** Keduanya menggambarkan kesehatan jalur rilis Anda lebih baik daripada metrik lain mana pun.

## Kalau Kubernetes terasa berlebihan

Dan untuk banyak tim, memang berlebihan. Kubernetes memberi kendali penuh dengan harga kerumitan operasional yang nyata: jaringan, penyimpanan, ingress, pembaruan versi klaster, dan satu orang yang harus memahaminya.

| Pilihan | Cocok untuk | Harganya |
| --- | --- | --- |
| **PaaS**: Railway, Render, Fly.io | Tim kecil, satu sampai lima layanan | Lebih mahal per sumber daya, kendali lebih sedikit |
| **Container terkelola**: Cloud Run, ECS Fargate | Beban yang naik turun, tanpa mengelola server | Cold start pada konfigurasi tertentu |
| **Kubernetes terkelola**: GKE, EKS | Banyak layanan, tim yang punya kapasitas operasional | Kerumitan, dan orang yang harus memahaminya |
| **VPS dengan Docker Compose** | Produk kecil, anggaran ketat | Tidak ada penyembuhan otomatis, rilis manual |

Patokan yang jujur: **mulai dari PaaS atau container terkelola.** Pindah ke Kubernetes saat Anda punya alasan yang bisa disebutkan, misalnya biaya yang sudah melebihi gaji satu orang operasional, atau kebutuhan konfigurasi yang tidak dilayani PaaS. Memulai dari Kubernetes untuk satu layanan adalah menambah pekerjaan tanpa manfaat.

## Buktikan jalan

Container punya satu kelas kegagalan yang tidak pernah muncul di `pnpm dev`. Lima pemeriksaan sebelum menyentuh produksi.

```bash
# 1. Image terbangun, dan ukurannya wajar
docker build -t layanan:coba .
docker images layanan:coba
```

```text
REPOSITORY   TAG    SIZE
layanan      coba   184MB
```

Ratusan megabyte wajar untuk Node. **Lebih dari satu gigabyte** berarti `node_modules` pengembangan atau cache build ikut terbawa, dan `.dockerignore` Anda perlu diperiksa.

```bash
# 2. Jalan di dalam container, dan bisa dihubungi dari luar
docker run --rm -p 3000:3000 --env-file .env layanan:coba
curl -s localhost:3000/sehat | jq
```

```json
{ "status": "ok" }
```

Kalau `curl` menjawab `Connection refused` padahal log container menunjukkan server menyala, penyebabnya hampir pasti satu: server mendengarkan di `127.0.0.1`, bukan `0.0.0.0`. Di dalam container, `127.0.0.1` berarti "hanya dari dalam container ini".

```bash
# 3. Tidak berjalan sebagai root
docker run --rm layanan:coba whoami
```

```text
node
```

```bash
# 4. SIGTERM ditangani, bukan dibunuh paksa
docker run --rm --name coba -p 3000:3000 --env-file .env layanan:coba &
sleep 3
time docker stop coba
```

```text
{"level":"info","msg":"mematikan server","sinyal":"SIGTERM"}
{"level":"info","msg":"permintaan berjalan selesai, keluar"}
real    0m1.284s
```

Angka yang penting adalah `real`. **Di bawah beberapa detik berarti proses Anda keluar sendiri.** Tepat sepuluh detik berarti Docker menunggu habis batas sabarnya lalu membunuh paksa dengan `SIGKILL`, dan itu berarti permintaan yang sedang berjalan terputus di tengah pada setiap deploy.

```bash
# 5. Migrasi berjalan terpisah dari server
docker run --rm --env-file .env layanan:coba node dist/migrasi.js
```

Migrasi yang dijalankan dari dalam `CMD` server berarti tiga instance menjalankan migrasi yang sama bersamaan saat deploy.

## Latihan

### Latihan 1: Tulis container yang layak produksi

Buat Dockerfile untuk layanan Anda, lalu periksa tujuh hal.

| # | Yang diperiksa | Cara |
| --- | --- | --- |
| 1 | Ukuran image | `docker images`, target di bawah 250 MB |
| 2 | Tidak berjalan sebagai root | `docker run ... whoami` |
| 3 | SIGTERM diteruskan | `docker stop`, lihat log penutupan rapi |
| 4 | Tidak ada rahasia di image | `docker history --no-trunc`, dan periksa isi berkas |
| 5 | Build cepat saat hanya kode berubah | Ubah satu berkas, ukur waktu build |
| 6 | Tidak ada dependensi pengembangan | Periksa isi `node_modules` |
| 7 | Mati bersih saat memori habis | Batasi memori, jalankan beban berat |

> [!petunjuk]
> Untuk nomor 3, cara paling cepat membuktikan: pasang log di penutupan rapi, jalankan container, lalu `docker stop`. Kalau log itu tidak muncul dan container mati setelah 10 detik, SIGTERM Anda tidak sampai ke Node.

> [!jawaban]
>
> Lima temuan khas pada Dockerfile pertama:
>
> 1. **Image 1,2 GB, bukan 250 MB.** Penyebab tersering: satu tahap build tanpa `prune`, dan memakai image `node:22` penuh alih-alih `slim`. Perbaikan dengan build bertahap biasanya memangkas ke sekitar 200 MB.
> 2. **SIGTERM tidak sampai.** Gejalanya `docker stop` butuh tepat 10 detik setiap kali, yaitu batas waktu bawaan sebelum Docker mengirim SIGKILL. Penyebabnya Node sebagai PID 1, atau `CMD` ditulis dalam bentuk shell sehingga prosesnya dibungkus `/bin/sh`.
>
> ```dockerfile
> # Salah: dijalankan lewat shell, sinyal tidak diteruskan
> CMD node dist/server.js
>
> # Benar: bentuk exec
> CMD ["node", "dist/server.js"]
> ```
>
> 3. **Berkas `.env` ikut masuk.** Periksa dengan `docker run --rm image ls -la`, dan cek `.dockerignore`. Kalau rahasianya sudah pernah masuk ke image yang di-push, anggap bocor dan ganti.
> 4. **Build selalu 3 menit, bahkan untuk perubahan satu baris.** Penyebabnya `COPY . .` dilakukan sebelum `pnpm install`. Urutan yang benar menyalin lockfile dulu.
> 5. **Container mati dengan kode 137 di bawah beban.** Itu OOM kill dari kernel, dan Node tidak mencatat apa pun. Perbaikannya `--max-old-space-size` yang lebih kecil daripada batas container, dan kalau masih terjadi, memang memorinya kurang.
>
> Satu pemeriksaan tambahan yang pantas dijalankan: pemindai kerentanan pada image.
>
> ```bash
> docker scout cves registry/layanan:terbaru
> # atau
> trivy image registry/layanan:terbaru --severity HIGH,CRITICAL
> ```
>
> Temuan khasnya: paket sistem di image dasar yang perlu diperbarui. Perbaikan paling sederhana adalah membangun ulang secara berkala dengan image dasar terbaru, dan itu satu alasan bagus untuk membangun ulang mingguan meski kodenya tidak berubah.

### Latihan 2: Ganti nama kolom tanpa menurunkan layanan

Kolom `pesanan.total_rp` perlu diganti nama jadi `pesanan.total_minor`. Rancang seluruh langkahnya, lalu jalankan sambil uji beban tetap berjalan, dan buktikan tidak ada satu pun permintaan yang gagal.

> [!petunjuk]
> Aturan yang menentukan seluruh rancangan: pada setiap saat, **versi kode lama dan versi kode baru harus sama-sama bisa berjalan** terhadap bentuk basis data saat itu. Dari aturan itu, pikirkan berapa deploy terpisah yang Anda butuhkan, dan di deploy mana kolom lamanya boleh dihapus. Jawabannya lebih dari dua. Dan satu pertanyaan yang sering terlewat: apa yang mengisi kolom baru untuk baris yang ditulis kode lama selama masa peralihan?

> [!pembahasan]
>
> | Rilis | Migrasi | Kode aplikasi |
> | --- | --- | --- |
> | N+1 | `ADD COLUMN total_minor bigint` | Tulis ke **keduanya**, baca dari `total_rp` |
> | N+1 (latar) | Isi `total_minor` dari `total_rp` per batch | Tidak ada |
> | N+2 | Tambahkan `CHECK` kesamaan sebagai pengaman | Baca dari `total_minor`, tetap tulis keduanya |
> | N+3 | Tidak ada | Berhenti menulis ke `total_rp` |
> | N+4 | `DROP COLUMN total_rp` | Tidak ada |
>
> ```sql
> -- Rilis N+1: aditif, aman
> ALTER TABLE pesanan ADD COLUMN total_minor bigint;
>
> -- Pengisian bertahap, dijalankan pekerjaan latar.
> -- Per batch, supaya tidak satu transaksi raksasa yang membengkakkan tabel.
> UPDATE pesanan SET total_minor = total_rp
> WHERE total_minor IS NULL
>   AND id IN (SELECT id FROM pesanan WHERE total_minor IS NULL LIMIT 5000);
>
> -- Rilis N+2: pengaman supaya penyimpangan terlihat
> ALTER TABLE pesanan
>   ADD CONSTRAINT total_cocok CHECK (total_rp IS NULL OR total_rp = total_minor) NOT VALID;
> ALTER TABLE pesanan VALIDATE CONSTRAINT total_cocok;
> ```
>
> ```ts
> // Rilis N+1: penulisan ganda, dengan satu tempat yang bertanggung jawab
> await tx.execute(sql`
>   INSERT INTO pesanan (id, total_rp, total_minor, ...)
>   VALUES (${id}, ${total}, ${total}, ...)
> `);
> ```
>
> Lima hal yang akan Anda temukan:
>
> 1. **Lima rilis untuk satu penggantian nama**, dan itu memang harganya. Satu rilis yang melakukan `RENAME COLUMN` akan menyebabkan error 500 selama beberapa menit, karena aplikasi versi lama masih mencari kolom lama.
> 2. **Penulisan ganda harus di satu tempat.** Kalau ada tiga jalur yang menyisipkan pesanan, ketiganya harus menulis ke dua kolom. Satu yang terlupakan menghasilkan baris dengan `total_minor` kosong, dan `CHECK` di rilis N+2 akan menemukannya.
> 3. **Batasan `CHECK` sementara adalah teknik yang pantas ditiru.** Batasan itu mengubah penyimpangan dari sesuatu yang ditemukan pengguna jadi error saat penulisan.
> 4. **Pengisian bertahap tidak boleh satu `UPDATE` besar.** Pada dua juta baris, satu `UPDATE` menahan kunci, membengkakkan tabel, dan bisa memicu batas waktu. Per batch 5.000 dengan jeda kecil di antaranya.
> 5. **Buktikan dengan uji beban yang berjalan selama migrasi.** Itu satu-satunya cara memastikan tidak ada permintaan yang gagal, dan biasanya menemukan satu jalur yang terlupakan.
>
> Satu catatan terakhir: kalau penggantian nama ini sekaligus mengubah **satuannya**, misalnya rupiah jadi sen, jangan pernah mengalikan nilai di kolom yang sama. Isi kolom baru dengan nilai yang sudah dikonversi, dan biarkan kolom lama apa adanya. Dengan begitu mundur tetap mungkin, dan ini pelajaran dari modul 4 tentang perubahan satuan yang tidak menimbulkan error.

### Latihan 3: Bangun pipeline dan ukur dua angka

Bangun pipeline lengkap dari commit sampai produksi, lalu ukur dua angka: **lead time** dari commit sampai tayang, dan **MTTR** dari tahu rusak sampai pulih.

> [!jawaban]
>
> Pengukuran lead time, dengan memasukkan waktu commit ke dalam image:
>
> ```yaml
> build-args: |
>   VERSI_RILIS=${{ github.sha }}
>   WAKTU_COMMIT=${{ github.event.head_commit.timestamp }}
> ```
>
> ```ts
> // Saat start, catat selisihnya sebagai metrik
> const waktuCommit = Date.parse(config.WAKTU_COMMIT);
>
> if (Number.isFinite(waktuCommit)) {
>   metrik.leadTimeDetik.set((Date.now() - waktuCommit) / 1000);
> }
> ```
>
> Angka khas untuk pipeline yang disusun seperti di modul ini:
>
> | Tahap | Waktu |
> | --- | --- |
> | Test cepat: tsc, lint, unit | 1 menit |
> | Test integrasi dengan Testcontainers | 4 menit |
> | Build image dengan cache | 2 menit |
> | Migrasi | 10 detik |
> | Peluncuran bergulir 3 instance | 90 detik |
> | **Total lead time** | **sekitar 9 menit** |
>
> Lalu latihan MTTR, yang lebih berharga: **rilis perubahan yang sengaja rusak, lalu ukur berapa lama sampai pulih.**
>
> ```ts
> // Perubahan yang sengaja dibuat untuk latihan
> app.get('/v1/produk', async () => {
>   throw new Error('kerusakan yang disengaja untuk latihan MTTR');
> });
> ```
>
> | Tahap | Waktu khas tanpa persiapan | Dengan persiapan |
> | --- | --- | --- |
> | Dari tayang sampai peringatan menyala | 4 menit | 1 menit |
> | Dari peringatan sampai ada yang melihat | 6 menit | 1 menit |
> | Dari melihat sampai memutuskan mundur | 8 menit | 1 menit |
> | Dari memutuskan sampai selesai mundur | 12 menit | 2 menit |
> | **Total MTTR** | **30 menit** | **5 menit** |
>
> Empat hal yang memangkas dari 30 menit jadi 5:
>
> 1. **Peringatan berbasis gejala dengan ambang yang tepat**, bukan peringatan pada CPU.
> 2. **Runbook yang menyebut langkah mundur sebagai langkah pertama**, bukan "selidiki penyebabnya". Saat produksi rusak, memulihkan lebih dulu, menyelidiki sesudahnya.
> 3. **Pemantauan otomatis setelah rilis** yang mundur sendiri tanpa menunggu manusia. Ini yang paling berdampak.
> 4. **Prosedur mundur yang pernah dilatih.** Perintahnya sudah ada di runbook, lengkap, siap disalin.
>
> Jalankan latihan ini sekali di staging setiap kuartal. Itu satu jam yang menghemat dua puluh lima menit pada insiden berikutnya, dan menemukan bagian prosedur yang ternyata sudah tidak berlaku.

### Latihan 4: Audit kesiapan produksi

Periksa layanan Anda terhadap dua puluh pertanyaan berikut, dan jawab dengan bukti.

| # | Pertanyaan |
| --- | --- |
| 1 | Apakah image yang tayang persis yang diuji di staging? |
| 2 | Apakah versi yang tayang bisa dilihat dari endpoint? |
| 3 | Apakah ada rahasia di dalam image atau di riwayat Git? |
| 4 | Apakah proses berjalan sebagai non-root? |
| 5 | Apakah SIGTERM benar-benar memicu penutupan rapi? |
| 6 | Apakah `terminationGracePeriod` lebih besar dari pekerjaan terpanjang? |
| 7 | Apakah liveness tidak memeriksa ketergantungan? |
| 8 | Apakah rilis bergulir tidak mengurangi kapasitas? |
| 9 | Apakah migrasi tahap terpisah sebelum peluncuran? |
| 10 | Apakah migrasi terakhir kompatibel dengan versi aplikasi sebelumnya? |
| 11 | Apakah mundur pernah dilatih, dan berapa lama? |
| 12 | Apakah batas memori container dan heap Node sudah diselaraskan? |
| 13 | Apakah worker berjalan sebagai deployment terpisah dari API? |
| 14 | Apakah jumlah instance worker bisa diubah tanpa mengubah API? |
| 15 | Apakah ada tahap pemantauan setelah rilis? |
| 16 | Apakah ada flag yang sudah lewat tanggal kedaluwarsanya? |
| 17 | Apakah cadangan basis data berjalan, dan pemulihannya pernah diuji? |
| 18 | Apakah ada yang tahu cara memutar kredensial basis data? |
| 19 | Apakah ada prosedur insiden tertulis, dan siapa yang dihubungi? |
| 20 | Berapa lead time dan MTTR Anda? |

> [!jawaban]
>
> Lima temuan yang paling sering muncul pada audit pertama, dan semuanya bisa diperbaiki dalam sehari:
>
> **Nomor 13 belum terpenuhi.** Worker berjalan di proses yang sama dengan API, karena itu yang paling mudah saat membangun. Akibatnya dari modul 2 dan 15: pekerjaan berat membuat API melambat, dan menambah kapasitas worker berarti menambah instance API juga. Perbaikannya satu `Dockerfile` yang sama dengan `CMD` berbeda.
>
> ```yaml
> # Dua deployment, satu image
> - name: api
>   command: ['node', 'dist/server.js']
> - name: worker
>   command: ['node', 'dist/worker.js']
> ```
>
> **Nomor 17 belum pernah diuji.** Cadangan berjalan, dan tidak ada yang pernah memulihkannya. Latihan yang pantas dijalankan sekali: pulihkan cadangan ke basis data baru, jalankan layanan terhadapnya, dan ukur berapa lama. Angka itu adalah RTO Anda yang sebenarnya, dan biasanya jauh lebih besar daripada dugaan.
>
> **Nomor 12 terlewat.** Batas memori container 512 MB, heap Node bawaan, dan container mati dengan kode 137 beberapa kali seminggu tanpa ada yang menyadari penyebabnya.
>
> **Nomor 16 menemukan tiga flag yang sudah dinyalakan 100% selama empat bulan**, beserta cabang kode lama yang masih ada dan tidak pernah dijalankan. Hapus keduanya.
>
> **Nomor 20 tidak bisa dijawab.** Dan itu temuan paling penting: dua angka itu adalah ukuran kesehatan jalur rilis Anda, dan tanpa mengukurnya, perbaikan apa pun tidak bisa dibuktikan berhasil.

## Batasnya

Jalur rilis yang baik menyelesaikan tiga hal, dan menyisakan tiga lainnya.

**Infrastruktur bukan sepenuhnya milik Anda.** Pada banyak tim, keputusan tentang orkestrator, jaringan, dan basis data dibuat tim platform. Yang bisa Anda lakukan: pastikan layanan Anda memenuhi kontrak yang baik, yaitu stateless, konfigurasi dari lingkungan, probe yang jujur, dan penutupan rapi.

**Otomasi tidak menggantikan keputusan.** Mundur otomatis bagus untuk kegagalan yang jelas. Untuk penurunan 5% pada satu metrik, manusia yang harus memutuskan.

**Satu layanan yang dikelola baik tidak menyelesaikan masalah banyak tim.** Dan itu masalah berikutnya.

## Rangkuman

- Deploy harus membosankan. Kalau butuh rapat dan doa, yang perlu diperbaiki jalurnya.
- Satu artefak dibangun sekali, dijalankan di semua lingkungan. Yang berbeda hanya variabel lingkungan.
- Konfigurasi divalidasi saat start, tanpa nilai bawaan untuk rahasia, dan terkumpul di satu berkas.
- Container: build bertahap, non-root, PID 1 yang benar, `.dockerignore` yang menutup rahasia, lockfile disalin sebelum kode.
- Selaraskan heap Node dengan batas memori container, atau proses mati dengan kode 137 tanpa pesan.
- Saat migrasi berjalan, aplikasi versi lama masih melayani. Semua perubahan skema harus kompatibel dua arah.
- Migrasi yang mengubah data harus aditif, karena mundurnya aplikasi tidak membatalkan perubahan data.
- Ganti nama kolom butuh lima rilis. Itu harganya, dan jauh lebih murah daripada tiga menit error.
- Rilis bergulir butuh readiness yang jujur dan penutupan rapi. `maxUnavailable: 0` supaya kapasitas tidak berkurang saat rilis.
- Tag versi dari commit, bukan `latest`. Dan versinya terlihat dari endpoint, log, dan metrik.
- Feature flag memisahkan rilis dari peluncuran, dengan syarat setiap flag punya pemilik dan tanggal kedaluwarsa.
- Mundur hanya mungkin kalau empat syaratnya dipenuhi, dan yang paling sering gagal adalah prosedurnya belum pernah dilatih.
- Mulai dari PaaS atau container terkelola. Pindah ke Kubernetes dengan alasan yang bisa disebutkan.
- Dua angka yang menggambarkan kesehatan jalur rilis: lead time dan MTTR.

## Masalah terbuka

Satu layanan Anda sekarang dikelola dengan baik: teruji, terukur, tahan banting, terpantau, dan dirilis dengan jalur yang membosankan.

Lalu perusahaan Anda tumbuh. Delapan engineer jadi tiga puluh, satu produk jadi empat, dan satu basis kode mulai terasa sesak dengan cara yang baru:

Satu pull request menunggu dua hari karena pemiliknya tidak jelas. Dua tim mengubah berkas yang sama dan bentrok setiap minggu. Satu tim siap merilis dan menunggu tim lain menyelesaikan fiturnya karena mereka berbagi jalur rilis. Pipeline yang dulu sembilan menit sekarang dua puluh lima menit karena semua test berjalan untuk setiap perubahan. Dan tidak ada yang berani mengubah modul pembayaran karena tidak jelas apa saja yang memakainya.

Tidak satu pun dari itu masalah teknis dalam arti sempit. Semuanya masalah **koordinasi antar manusia yang muncul sebagai masalah kode.**

Itu isi modul berikutnya: batas modul yang ditegakkan, kapan memecah layanan benar-benar menjawab masalahnya, cara memecahnya tanpa menghentikan pengembangan, dan harga yang harus Anda hitung sebelum memulainya.
