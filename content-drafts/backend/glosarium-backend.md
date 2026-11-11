---
title: 'Glosarium Backend: 160 Istilah yang Dipakai Seri Ini'
description: Halaman rujukan untuk dibuka saat ada istilah yang belum jelas, bukan untuk dibaca dari atas ke bawah. Disusun per kelompok, dengan penunjuk modul tempat istilahnya dibahas.
date: 2027-01-02
slug: glosarium-backend
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Halaman ini bukan materi, melainkan rujukan. Jangan dibaca dari atas ke bawah, dan jangan dihafal. Buka saat ada istilah yang muncul di sebuah modul dan Anda tidak yakin artinya, lalu tutup lagi.

Kolom terakhir menunjukkan modul tempat istilah itu dibahas dengan konteks lengkapnya. Definisi di sini sengaja pendek, karena definisi pendek saja hampir tidak pernah cukup untuk benar-benar memahami sesuatu.

Satu hal yang perlu diluruskan soal bahasa. Sebagian istilah di sini tidak punya padanan Indonesia yang dipakai di tempat kerja, jadi istilah Inggrisnya dipertahankan. Memaksakan terjemahan yang tidak dipakai siapa pun hanya membuat Anda kesulitan saat membaca dokumentasi atau berbicara dengan rekan tim.

## Alat kerja dan dasar

| Istilah | Artinya | Modul |
| --- | --- | --- |
| **Runtime** | Program yang menjalankan kode Anda. Untuk seri ini, Node.js | 0 |
| **Node.js** | Runtime JavaScript di luar browser. Di backend, yang dijalankannya adalah layanan Anda sendiri | 0 |
| **LTS** | *Long-term support*, versi yang didukung lama. Selalu pilih ini untuk produksi | 0 |
| **pnpm** | Pengelola paket: mengunduh dan memasang kode orang lain ke proyek Anda | 0 |
| **Paket** | Kumpulan kode siap pakai yang dipasang dari npm | 0 |
| **`node_modules`** | Folder tempat semua paket terpasang. Tidak pernah ikut disimpan di Git | 0 |
| **Terminal** | Jendela tempat perintah diketik, bukan diklik | 0 |
| **Port** | Nomor pintu pada sebuah mesin. Satu port hanya boleh punya satu pendengar | 0 |
| **`localhost`** | Nama untuk mesin Anda sendiri, alamat `127.0.0.1` | 0 |
| **`curl`** | Alat terminal untuk mengirim permintaan HTTP. Mata Anda untuk backend | 0 |
| **`jq`** | Alat terminal untuk membaca dan menyaring JSON | 0 |
| **Container** | Kotak berisi aplikasi beserta seluruh kebutuhannya, berjalan sama di mesin mana pun | 0, 22 |
| **Docker** | Program yang menjalankan container di laptop Anda | 0, 22 |
| **Volume** | Penyimpanan di luar container, supaya data bertahan saat containernya dibuang | 0, 22 |
| **Image** | Cetakan container: hasil `docker build`, dijalankan jadi container | 22 |
| **`EADDRINUSE`** | Error "port sudah dipakai". Ada dua program berebut satu port | 0 |
| **`Connection refused`** | Tidak ada yang mendengarkan di alamat dan port itu | 0 |

## Jaringan dan HTTP

| Istilah | Artinya | Modul |
| --- | --- | --- |
| **HTTP** | Aturan percakapan antara klien dan server: permintaan masuk, respons keluar | 1 |
| **DNS** | Penerjemah nama domain jadi alamat IP | 1 |
| **TCP** | Protokol yang memastikan data sampai utuh dan berurutan | 1 |
| **TLS** | Lapisan penyandian yang membuat HTTP jadi HTTPS | 1 |
| **Keep-alive** | Memakai ulang sambungan yang sudah terbuka, menghemat DNS, TCP, dan TLS | 1 |
| **Method** | Kata kerja HTTP: GET, POST, PUT, PATCH, DELETE | 1 |
| **Status code** | Angka pada respons: 2xx berhasil, 4xx salah pemanggil, 5xx salah server | 1 |
| **Header** | Keterangan yang menyertai permintaan atau respons | 1 |
| **Body** | Isi permintaan atau respons, biasanya JSON | 1, 3 |
| **Idempoten** | Mengirim dua kali menghasilkan keadaan akhir yang sama | 1, 4 |
| **Aman (*safe*)** | Tidak mengubah apa pun. GET dan HEAD | 1 |
| **Load balancer** | Pembagi permintaan ke beberapa instance | 1 |
| **CDN** | Jaringan server yang menyimpan salinan dekat dengan pengguna | 1, 14 |
| **API gateway** | Pintu depan bersama: TLS, rate limit, autentikasi awal, routing | 1, 23 |
| **Reverse proxy** | Perantara yang meneruskan permintaan ke layanan di belakangnya | 1 |
| **`X-Request-Id`** | Pengenal yang mengikuti satu permintaan melintasi semua layanan | 1, 19 |
| **Payload** | Isi data yang dikirim, dan ukurannya selalu harus dibatasi | 2, 3 |
| **CORS** | Aturan yang menentukan asal mana yang boleh memanggil API Anda dari browser | 3 |
| **WebSocket** | Sambungan dua arah yang tetap terbuka | 17 |
| **SSE** | *Server-Sent Events*, aliran satu arah dari server, di atas HTTP biasa | 17 |
| **Polling** | Klien bertanya berulang kali. Sederhana, dan mahal pada skala besar | 17 |

## Node dan model eksekusinya

| Istilah | Artinya | Modul |
| --- | --- | --- |
| **Event loop** | Satu utas yang menjalankan JavaScript Anda. Kalau tertahan, semua pengguna ikut menunggu | 2 |
| **Blocking** | Pekerjaan yang menahan event loop, biasanya perhitungan atau API sinkron | 2 |
| **I/O** | Pekerjaan menunggu: basis data, jaringan, berkas. Yang paling dikuasai Node | 2 |
| **Asinkron** | Pekerjaan yang dititipkan lalu hasilnya diambil nanti, tanpa menunggu di tempat | 2 |
| **Promise** | Objek yang mewakili hasil yang belum ada | 2 |
| **`async`/`await`** | Cara menulis kode asinkron supaya terbaca seperti kode biasa | 2 |
| **Thread pool libuv** | Empat utas bawaan di belakang Node untuk berkas, DNS, dan sebagian kriptografi | 2 |
| **Worker thread** | Utas tambahan untuk pekerjaan berat yang hasilnya ditunggu | 2 |
| **Event loop lag** | Berapa lama callback tertunda dari waktu seharusnya. Ukuran kesehatan proses | 2, 19 |
| **Stream** | Data yang mengalir bertahap, bukan ditampung sekaligus di memori | 2, 18 |
| **Backpressure** | Pengirim ikut melambat saat penerima tidak sanggup mengikuti | 2 |
| **Catastrophic backtracking** | Regex yang bisa berjalan bermenit-menit untuk masukan yang dirancang jahat | 2, 13 |
| **TypeScript** | JavaScript dengan tipe yang diperiksa mesin sebelum program berjalan | 2 |
| **ESM** | Sistem modul modern: `import`, bukan `require` | 0, 2 |

## Bentuk layanan

| Istilah | Artinya | Modul |
| --- | --- | --- |
| **Endpoint** | Satu alamat yang bisa dipanggil, misalnya `POST /v1/pesanan` | 1, 3 |
| **Rute** | Pasangan method dan path yang diarahkan ke satu handler | 3 |
| **Handler** | Fungsi yang menjawab satu rute. Tipis, dan tahu soal HTTP | 1, 3 |
| **Middleware** | Lapisan yang dilewati setiap permintaan sebelum sampai ke handler | 1, 3 |
| **Service** | Lapisan aturan bisnis. Tidak tahu apa pun tentang HTTP | 1, 3 |
| **Repository** | Lapisan yang tahu soal SQL. Tidak tahu aturan bisnis | 1, 8 |
| **Fastify** | Framework HTTP yang dipakai seri ini | 3 |
| **Zod** | Pustaka validasi skema yang sekaligus menghasilkan tipe TypeScript | 3 |
| **Skema** | Pernyataan tentang bentuk data yang sah, dan dasar penolakan yang sah | 3 |
| **Validasi** | Memeriksa bentuk masukan. Tidak sama dengan memeriksa kebenarannya | 3 |
| **Serialisasi** | Mengubah objek jadi JSON untuk dikirim | 1, 3 |
| **Stateless** | Proses tidak menyimpan keadaan penting di dalam dirinya | 1 |
| **Instance** | Satu salinan layanan Anda yang sedang berjalan | 1, 22 |
| **Penskalaan horizontal** | Menambah kapasitas dengan menambah instance, bukan membesarkan mesin | 1, 22 |
| **Rate limit** | Batas berapa permintaan yang diterima per pemanggil per satuan waktu | 3, 13 |
| **Graceful shutdown** | Berhenti menerima permintaan baru, selesaikan yang berjalan, baru keluar | 20, 22 |
| **Health check** | Endpoint yang menjawab apakah proses ini sehat dan siap melayani | 20 |
| **Liveness** | "Apakah proses ini masih hidup?" Gagal berarti perlu dimatikan dan diganti | 20 |
| **Readiness** | "Apakah proses ini siap menerima permintaan?" Gagal berarti keluarkan dari rotasi | 20 |

## Desain API

| Istilah | Artinya | Modul |
| --- | --- | --- |
| **REST** | Gaya desain API yang menamai benda, bukan perbuatan | 4 |
| **Sumber daya** | Benda yang punya id dan bisa dialamati, misalnya satu pesanan | 4 |
| **Pagination** | Membagi daftar panjang jadi beberapa halaman | 4 |
| **Kursor** | Penanda posisi baris terakhir. Tidak melewatkan data saat isinya berubah | 4 |
| **Offset** | Melewati N baris. Sederhana, dan bocor pada data yang berubah | 4 |
| **Idempotency key** | Kunci dari klien supaya percobaan ulang tidak membuat dua transaksi | 4, 9 |
| **ISO 8601** | Format waktu baku, misalnya `2026-12-05T03:12:44.000Z` | 4 |
| **UUID** | Pengenal acak 128 bit yang tidak bisa ditebak dari id lain | 4, 5 |
| **ULID** | Pengenal acak yang urut menurut waktu, ramah bagi indeks | 4, 5 |
| **OpenAPI** | Deskripsi API yang bisa dibaca mesin, sumber dokumentasi otomatis | 4 |
| **Versi API** | `/v1/...`, supaya klien lama tidak rusak saat bentuknya berubah | 4, 23 |
| **Breaking change** | Perubahan yang merusak klien yang sudah terpasang | 4, 23 |
| **gRPC** | Protokol panggilan antar layanan dengan kontrak yang ketat | 23 |

## Basis data dan SQL

| Istilah | Artinya | Modul |
| --- | --- | --- |
| **PostgreSQL** | Basis data relasional yang dipakai seri ini | 5 |
| **Skema (basis data)** | Susunan tabel, kolom, tipe, dan batasannya | 5 |
| **Primary key** | Kolom yang mengidentifikasi satu baris secara unik | 5 |
| **Foreign key** | Kolom yang menunjuk baris di tabel lain, dan dijaga basis data | 5 |
| **Surrogate key** | Kunci buatan tanpa arti bisnis, misalnya UUID | 5 |
| **Natural key** | Kunci dari data nyata, misalnya ISBN. Sering berubah, sering menyesal | 5 |
| **Constraint** | Aturan yang ditegakkan basis data: `NOT NULL`, `UNIQUE`, `CHECK` | 5 |
| **Normalisasi** | Menyimpan satu fakta di satu tempat saja | 5 |
| **Denormalisasi** | Menyalin data demi kecepatan, dengan kewajiban menjaganya tetap sinkron | 5 |
| **`timestamptz`** | Tipe waktu yang menyimpan momen tidak ambigu dalam UTC | 5 |
| **Kolom tergenerasi** | Kolom yang dihitung basis data, jadi tidak mungkin menyimpang dari sumbernya | 5, 7 |
| **Migrasi** | Perubahan bentuk basis data yang tercatat, berurutan, dan bisa diulang | 5, 22 |
| **Soft delete** | Menandai baris terhapus alih-alih menghapusnya | 5 |
| **`SELECT`** | Membaca data | 6 |
| **`JOIN`** | Menggabungkan baris dari dua tabel | 6 |
| **`LEFT JOIN`** | Semua baris kiri ikut, meski tidak punya pasangan | 6 |
| **`GROUP BY`** | Mengelompokkan baris lalu menghitung per kelompok | 6 |
| **`HAVING`** | Menyaring kelompok setelah pengelompokan, bukan sebelumnya | 6 |
| **Agregat** | `count`, `sum`, `avg`, `min`, `max`. Semuanya mengabaikan `NULL` | 6 |
| **`NULL`** | "Tidak diketahui". Bukan nol, bukan string kosong | 6 |
| **`coalesce`** | Ambil nilai pertama yang bukan `NULL` | 6 |
| **Upsert** | `INSERT ... ON CONFLICT`: sisipkan, atau perbarui kalau sudah ada | 6 |
| **`RETURNING`** | Mengambil hasil penulisan tanpa kueri kedua | 6 |
| **CTE** | `WITH nama AS (...)`, menamai hasil antara supaya kueri terbaca dari atas ke bawah | 7 |
| **Window function** | Menghitung per baris sambil melihat baris lain, tanpa mengurangi jumlah baris | 7 |
| **`PARTITION BY`** | Menentukan "tumpukan" tempat window function melihat sekeliling | 7 |
| **`row_number()`** | Peringkat tanpa seri, untuk "N teratas per kelompok" | 7 |
| **`lag()` dan `lead()`** | Melihat baris sebelumnya atau sesudahnya, untuk pertumbuhan antar periode | 7 |
| **`generate_series`** | Membuat rangka baris yang tidak ada di data, misalnya bulan kosong | 7 |
| **`tsvector`** | Bentuk teks yang sudah diproses untuk pencarian teks penuh | 7 |
| **`pg_trgm`** | Ekstensi pencarian kemiripan, memaafkan salah ketik | 7 |

## Akses basis data dari aplikasi

| Istilah | Artinya | Modul |
| --- | --- | --- |
| **Driver** | Pustaka yang berbicara dengan basis data, misalnya `pg` | 8 |
| **Pool sambungan** | Sekumpulan sambungan yang dibuat sekali lalu dipakai bergantian | 8 |
| **PgBouncer** | Pooler di luar aplikasi, dipakai saat instance Anda terlalu banyak | 8 |
| **Parameter kueri** | `$1`, `$2`. Pernyataan dan datanya dikirim terpisah, jadi kebal injeksi | 8, 13 |
| **ORM** | Pemeta objek ke baris basis data. Nyaman, dan menyembunyikan jumlah kueri | 8 |
| **Query builder** | Penyusun SQL yang tetap terlihat seperti SQL. Drizzle di seri ini | 8 |
| **N+1** | Satu kueri daftar memicu satu kueri tambahan per baris | 8 |
| **`statement_timeout`** | Batas waktu satu kueri di sisi basis data | 8 |
| **`pg_stat_statements`** | Statistik kueri agregat: alat terbaik untuk menemukan yang perlu diperbaiki | 8, 10 |

## Transaksi dan konkurensi

| Istilah | Artinya | Modul |
| --- | --- | --- |
| **Transaksi** | Beberapa penulisan yang berhasil bersama atau gagal bersama | 9 |
| **`COMMIT`** | Menetapkan perubahan transaksi | 9 |
| **`ROLLBACK`** | Membatalkan seluruh perubahan transaksi | 9 |
| **ACID** | Sifat transaksi: atomik, konsisten, terisolasi, dan tahan gagal | 9 |
| **Tingkat isolasi** | Seberapa jauh transaksi bersamaan boleh saling melihat | 9 |
| **Read committed** | Bawaan Postgres: hanya melihat data yang sudah di-commit | 9 |
| **Serializable** | Isolasi paling ketat: hasilnya seolah transaksinya berurutan | 9 |
| **Konkurensi** | Beberapa hal terjadi bersamaan. Sumber sebagian besar bug mahal di backend | 9 |
| **Race condition** | Hasil akhir bergantung pada siapa yang kebetulan lebih dulu | 9 |
| **Baca-lalu-tulis** | Pola yang terlihat benar dan punya celah di antara dua langkahnya | 9 |
| **`FOR UPDATE`** | Mengunci baris yang dibaca sampai transaksi selesai | 9 |
| **`SKIP LOCKED`** | Lewati baris yang sedang dikunci orang lain, jangan menunggu | 9, 15 |
| **Deadlock** | Dua transaksi saling menunggu kunci milik lawannya | 9 |
| **Write skew** | Dua transaksi membaca hal sama, menulis baris berbeda, dan bersama melanggar aturan | 9 |
| **Optimistic locking** | Menyimpan nomor versi, dan menolak penulisan kalau versinya sudah berubah | 9 |

## Indeks dan performa

| Istilah | Artinya | Modul |
| --- | --- | --- |
| **Indeks** | Struktur tambahan yang membuat pencarian cepat, dengan biaya pada penulisan | 10 |
| **`EXPLAIN ANALYZE`** | Menampilkan rencana kueri beserta waktu sebenarnya | 10 |
| **Perencana kueri** | Bagian Postgres yang memutuskan cara mengambil data, berdasarkan perkiraan biaya | 6, 10 |
| **Seq Scan** | Membaca seluruh tabel. Wajar pada tabel kecil, gejala pada tabel besar | 10 |
| **Index Scan** | Membaca lewat indeks, lalu mengambil barisnya | 10 |
| **Indeks komposit** | Indeks atas beberapa kolom. Urutan kolomnya menentukan segalanya | 10 |
| **B-tree** | Jenis indeks bawaan, untuk kesamaan dan rentang | 10 |
| **GIN** | Indeks untuk isi di dalam nilai: teks penuh, `jsonb`, array | 7, 10 |
| **`CONCURRENTLY`** | Membuat indeks tanpa mengunci tabel dari penulisan | 10, 22 |
| **Latensi** | Berapa lama satu permintaan selesai | 1, 19 |
| **Throughput** | Berapa banyak permintaan yang dilayani per satuan waktu | 8, 21 |
| **p50, p95, p99** | Persentil: waktu yang hanya dilampaui 50%, 5%, dan 1% permintaan terlambat | 1, 19 |

## Autentikasi, otorisasi, dan keamanan

| Istilah | Artinya | Modul |
| --- | --- | --- |
| **Autentikasi** | Membuktikan siapa pemanggilnya | 11 |
| **Otorisasi** | Memutuskan apa yang boleh dilakukan pemanggil itu | 12 |
| **Hash sandi** | Pengubahan satu arah, supaya sandi tidak bisa dibaca meski basis data bocor | 11 |
| **Argon2id** | Algoritma hash sandi yang dianjurkan hari ini | 11 |
| **Salt** | Nilai acak per pengguna, supaya dua sandi sama tidak menghasilkan hash sama | 11 |
| **Sesi** | Catatan di sisi server tentang siapa yang sedang masuk. Bisa dicabut | 11 |
| **JWT** | Token yang isinya diverifikasi tanda tangan, dan tidak bisa dicabut sebelum kedaluwarsa | 11 |
| **Access token** | Token berumur pendek yang menyertai setiap permintaan | 11 |
| **Refresh token** | Token berumur panjang untuk menukar access token baru. Dirotasi setiap dipakai | 11 |
| **Rotasi token** | Mengganti refresh token tiap pemakaian, supaya pencurian bisa terdeteksi | 11 |
| **OAuth dan OIDC** | Standar masuk lewat penyedia lain | 11 |
| **Passkey** | Masuk dengan kunci kriptografi di perangkat, tanpa sandi | 11 |
| **RBAC** | Hak akses berdasarkan peran | 12 |
| **ABAC** | Hak akses berdasarkan atribut, misalnya pemilik atau wilayah | 12 |
| **Multi-tenancy** | Satu layanan melayani banyak pelanggan yang datanya harus terpisah mutlak | 12 |
| **Tenant** | Satu pelanggan beserta seluruh datanya | 12 |
| **RLS** | *Row Level Security*: Postgres menolak baris yang bukan hak sesi itu | 12 |
| **Impersonasi** | Staf platform bertindak sebagai pengguna, dengan alasan dan jejak audit | 12 |
| **Jejak audit** | Catatan siapa melakukan apa, kapan, dan atas data siapa | 12 |
| **Mass assignment** | Menerima seluruh body lalu menyimpannya, termasuk field yang tidak boleh diubah | 13 |
| **Injeksi SQL** | Menyisipkan perintah lewat masukan. Dicegah mutlak oleh parameter | 8, 13 |
| **SSRF** | Menyuruh server Anda memanggil alamat internal yang tidak bisa dijangkau penyerang | 13 |
| **Path traversal** | Keluar dari folder yang diizinkan lewat `../` pada nama berkas | 13 |
| **Webhook** | Panggilan masuk dari pihak ketiga. Wajib diverifikasi tanda tangannya | 13 |
| **HMAC** | Tanda tangan dengan rahasia bersama, untuk memastikan pesan tidak diubah | 13 |
| **Timing attack** | Menyimpulkan rahasia dari selisih waktu respons | 11, 13 |
| **Secret** | Nilai rahasia seperti kunci API. Tidak pernah masuk Git | 13, 22 |

## Cache, queue, dan peristiwa

| Istilah | Artinya | Modul |
| --- | --- | --- |
| **Cache** | Salinan jawaban yang disimpan supaya tidak dihitung ulang | 14 |
| **Redis** | Penyimpanan di memori untuk cache, queue, dan pub/sub | 14, 15 |
| **TTL** | Masa berlaku sebuah kunci cache | 14 |
| **Cache-aside** | Pola: cari di cache, kalau tidak ada hitung lalu simpan | 14 |
| **Invalidasi** | Menyatakan data cache tidak berlaku lagi. Bagian tersulit dari caching | 14 |
| **Cache stampede** | Banyak permintaan menghitung ulang hal sama tepat setelah cache kedaluwarsa | 14 |
| **`ETag`** | Penanda versi respons, supaya klien bisa bertanya "sudah berubah?" | 14 |
| **Queue** | Antrean pekerjaan yang dikerjakan di luar permintaan pengguna | 15 |
| **Worker** | Proses terpisah yang mengambil dan mengerjakan pekerjaan dari queue | 15 |
| **BullMQ** | Pustaka queue di atas Redis yang dipakai seri ini | 15 |
| **At-least-once** | Jaminan bahwa pesan sampai, dan boleh sampai lebih dari sekali | 15, 16 |
| **Idempotensi konsumen** | Penjaga yang membuat pekerjaan aman dijalankan dua kali | 15, 16 |
| **Backoff** | Jeda yang bertambah antar percobaan ulang | 15, 20 |
| **DLQ** | *Dead letter queue*: tempat pekerjaan yang gagal permanen, untuk diperiksa manusia | 15 |
| **Peristiwa** | Fakta tentang sesuatu yang sudah terjadi, misalnya `pesanan.dibayar` | 16 |
| **Perintah** | Permintaan supaya sesuatu dikerjakan. Lawan dari peristiwa | 16 |
| **Outbox** | Tabel tempat peristiwa ditulis dalam transaksi yang sama dengan datanya | 16 |
| **Broker** | Perantara pengiriman peristiwa: NATS, Kafka, RabbitMQ | 16 |
| **Pub/sub** | Penerbit mengirim, banyak pelanggan menerima, tanpa saling mengenal | 16, 17 |
| **Proyeksi** | Tampilan data yang disusun dari rangkaian peristiwa | 16, 24 |
| **Event sourcing** | Menyimpan rangkaian peristiwa sebagai sumber kebenaran, bukan keadaan terakhir | 24 |

## Berkas, operasional, dan sistem terdistribusi

| Istilah | Artinya | Modul |
| --- | --- | --- |
| **Penyimpanan objek** | Tempat menyimpan berkas, misalnya S3 atau R2. Bukan disk lokal instance | 18 |
| **Presigned URL** | Tautan berumur pendek yang mengizinkan unggah atau unduh langsung | 18 |
| **Unggahan langsung** | Klien mengunggah ke penyimpanan objek tanpa melewati server Anda | 18 |
| **Observability** | Kemampuan menjawab "apa yang terjadi" dari data yang sudah dikumpulkan | 19 |
| **Log terstruktur** | Log berbentuk JSON yang bisa dicari dan diagregasi | 19 |
| **Metrik** | Angka yang dikumpulkan berkala: jumlah, durasi, dan nilai saat ini | 19 |
| **Tracing** | Jejak satu permintaan melintasi semua layanan dan kueri | 19 |
| **Span** | Satu potongan pekerjaan di dalam sebuah jejak | 19 |
| **Kardinalitas** | Banyaknya nilai label metrik yang berbeda. Terlalu tinggi menjatuhkan sistem metrik | 19 |
| **OpenTelemetry** | Standar pengumpulan log, metrik, dan jejak | 19 |
| **SLO** | Target layanan yang disepakati, misalnya p95 di bawah 300 ms | 19 |
| **Error budget** | Jatah kegagalan yang masih dapat diterima dalam periode tertentu | 19 |
| **Runbook** | Petunjuk satu halaman: apa yang dilakukan saat sebuah peringatan menyala | 19 |
| **Timeout** | Batas waktu menunggu jawaban. Wajib ada di setiap panggilan keluar | 20 |
| **Retry** | Mencoba ulang. Hanya boleh untuk operasi idempoten | 20 |
| **Circuit breaker** | Pemutus arus: berhenti memanggil ketergantungan yang sudah terbukti bermasalah | 20 |
| **Bulkhead** | Pemisahan sumber daya supaya satu beban tidak menghabiskan jatah yang lain | 20 |
| **Load shedding** | Menolak beban berlebih dengan 503 daripada melambat untuk semua orang | 3, 20 |
| **Degradasi** | Melayani sebagian fungsi saat sebagian ketergantungan tidak tersedia | 20 |
| **Chaos testing** | Mematikan komponen dengan sengaja untuk membuktikan sistem bertahan | 20, 21 |
| **Vitest** | Kerangka pengujian yang dipakai seri ini | 21 |
| **Testcontainers** | Menjalankan Postgres sungguhan di dalam test, bukan tiruan | 21 |
| **k6** | Alat uji beban | 21 |
| **Flaky test** | Test yang kadang merah kadang hijau tanpa ada kode yang berubah | 21 |
| **Soak test** | Uji beban berjam-jam untuk menemukan kebocoran yang pelan | 21 |
| **CI** | *Continuous integration*: pemeriksaan otomatis pada setiap perubahan | 21, 22 |
| **12-factor** | Kumpulan prinsip aplikasi yang siap dijalankan di cloud | 1, 22 |
| **Variabel lingkungan** | Konfigurasi yang masuk dari luar aplikasi, bukan ditulis di kode | 2, 22 |
| **Blue-green** | Dua lingkungan bergantian, lalu lintas dialihkan sekaligus | 22 |
| **Canary** | Melepas versi baru ke sebagian kecil lalu lintas lebih dulu | 22 |
| **Feature flag** | Sakelar yang memisahkan rilis kode dari peluncuran fitur | 22 |
| **Rollback** | Kembali ke versi sebelumnya | 22 |
| **Expand-contract** | Migrasi bertahap supaya kode lama dan baru sama-sama bisa berjalan | 22 |
| **Monolit modular** | Satu aplikasi dengan batas modul yang ditegakkan mesin | 23 |
| **Microservice** | Layanan terpisah dengan jalur rilis sendiri. Jawaban untuk masalah organisasi | 23 |
| **Bounded context** | Batas tempat satu istilah punya satu arti yang konsisten | 23 |
| **BFF** | *Backend for frontend*: satu lapisan penggabung untuk satu jenis klien | 23 |
| **Saga** | Rangkaian langkah lintas layanan, masing-masing dengan pengimbangnya | 24 |
| **Pengimbang** | Langkah yang membatalkan efek langkah sebelumnya saat saga gagal | 24 |
| **Konsistensi tertunda** | Data akan sama di semua tempat, dan belum tentu sekarang | 24 |
| **Baca setelah tulis** | Jaminan bahwa penulis sendiri langsung melihat tulisannya | 24 |
| **Replika baca** | Salinan basis data untuk pembacaan, selalu sedikit tertinggal | 24 |
| **Keterlambatan replikasi** | Jarak waktu antara penulisan di primer dan kemunculannya di replika | 24 |
| **Sharding** | Membagi satu tabel ke beberapa basis data berdasarkan sebuah kunci | 24 |
| **Kunci terdistribusi** | Kunci lintas proses. Sulit dibuat benar, dan sebaiknya dihindari | 24 |
| **Exactly-once** | Pengiriman tepat satu kali. Tidak ada, dan yang ada adalah efek yang idempoten | 24 |
