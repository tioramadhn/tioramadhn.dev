---
title: 'Modul 0: Menyiapkan Alat Kerja Backend'
description: Modul yang hampir selalu dilewati tutorial backend, dan jadi alasan paling sering orang berhenti sebelum modul ketiga. Node, pnpm, TypeScript, Docker, Postgres, dan satu server yang benar-benar menjawab permintaan Anda.
date: 2026-12-02
slug: modul-0-menyiapkan-alat-kerja-backend
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Tutorial backend hampir selalu dimulai dengan `pnpm add fastify` dan kalimat "lalu jalankan servernya". Pembaca yang sudah pernah membangun sesuatu tidak merasakan masalahnya. Pembaca yang belum berhenti di kalimat itu, karena tidak ada yang pernah menjelaskan apa itu "menjalankan server", di mana servernya berjalan, bagaimana cara tahu dia benar-benar hidup, dan apa yang harus dilakukan saat terminal menjawab `command not found`.

Modul ini mengisi celah tersebut. Isinya bukan materi backend, melainkan enam alat yang akan Anda pakai setiap hari selama seri ini, satu server kecil yang benar-benar menjawab permintaan Anda di akhir modul, dan satu keterampilan yang menentukan apakah Anda selesai atau berhenti di Modul 3: cara bersikap saat ada yang merah di layar.

| Alat | Fungsinya | Dipakai sejak |
| --- | --- | --- |
| Node.js LTS dan pnpm | Menjalankan kode Anda, memasang kode orang lain | Modul 2 |
| Editor kode | Menulis dan menavigasi berkas | Modul 2 |
| `curl` dan `jq` | Mengirim permintaan dan membaca jawabannya dari terminal | Modul 1 |
| Docker Desktop | Menjalankan Postgres dan Redis tanpa memasangnya | Modul 5 |
| `psql` | Berbicara langsung dengan Postgres | Modul 5 |
| Bruno atau Insomnia | Menyimpan kumpulan permintaan yang sering diulang | Modul 3 |

Tiga yang pertama dibutuhkan hampir segera. Tiga yang terakhir baru benar-benar dipakai di Modul 3 dan 5, dan tetap dipasang sekarang supaya Anda tidak terhenti di tengah modul nanti.

Satu hal yang tidak ada di daftar ini: Git. Git wajib bagi backend engineer, dan tempatnya di Modul 22 saat jalur rilis dibahas. Kalau Anda sudah memakainya, teruskan. Kalau belum, memasangnya sekarang hanya akan jadi hafalan tanpa konteks.

## Analogi: dapur yang melayani pesanan, bukan memasak untuk sendiri

Di seri frontend, analogi persiapannya adalah menata meja sebelum memasak. Untuk backend, naikkan satu tingkat: Anda tidak memasak untuk diri sendiri, Anda membuka dapur yang menerima pesanan dari luar.

Bedanya ada pada tiga hal yang tidak dibutuhkan juru masak rumahan. Pertama, ada **jendela pesanan** yang harus selalu terbuka dan selalu dijaga, karena pesanan datang kapan saja tanpa diminta. Kedua, ada **gudang bahan** yang terpisah dari dapur, punya kuncinya sendiri, dan isinya harus tetap ada walau dapurnya tutup semalam. Ketiga, ada **cara memastikan pesanan benar-benar sampai**, karena pelanggan tidak berdiri di depan Anda.

| Dunia dapur | Dunia backend | Alatnya di modul ini |
| --- | --- | --- |
| Dapur tempat masakan dibuat | Proses Node yang menjalankan kode Anda | Node.js |
| Lemari bahan yang dipinjam dari pemasok | Paket dari npm | pnpm |
| Jendela pesanan yang selalu terbuka | Port yang didengarkan server | Server di akhir modul ini |
| Pelanggan yang menitipkan pesanan | Klien yang mengirim permintaan | `curl` |
| Gudang bahan terkunci di gedung sebelah | Basis data | Docker dan Postgres |
| Kunci gudang | Kredensial di berkas `.env` | Modul 2 |
| Buku pesanan yang dipakai berulang | Kumpulan permintaan tersimpan | Bruno |

Batas analoginya: dapur sungguhan bisa Anda lihat isinya dengan melongok ke dalam, sedangkan proses server tidak terlihat sama sekali kecuali Anda sengaja bertanya kepadanya. Hampir semua perintah di modul ini pada dasarnya satu hal: **cara bertanya kepada sesuatu yang tidak kelihatan apakah dia hidup dan sehat.** Kebiasaan itu yang akan Anda pakai sampai Modul 19.

## Node dan pnpm

**Node.js** adalah program yang menjalankan JavaScript di luar browser. Di frontend, Node hanya menjalankan perkakas. Di backend, Node menjalankan **layanan Anda sendiri**, dan itu bedanya: prosesnya hidup terus, mendengarkan sambungan, dan baru berhenti saat Anda menghentikannya.

**pnpm** adalah pengelola paket, yaitu program yang mengunduh dan memasang kode orang lain ke dalam proyek Anda beserta seluruh kode yang dibutuhkan kode itu.

Pasang Node versi **LTS** dari `nodejs.org`. LTS berarti dukungan jangka panjang, dan itu yang Anda inginkan. Hindari versi "Current", karena sebagian pustaka belum mengejarnya.

Setelah pemasangan selesai, **tutup terminal lalu buka lagi**. Ini langkah yang paling sering dilewati, dan penyebab nomor satu pesan `command not found` tepat setelah berhasil memasang sesuatu. Terminal membaca daftar program yang tersedia saat dibuka, jadi terminal yang sudah terbuka sebelum pemasangan tidak mengetahui program barunya.

Lalu buktikan keduanya terpasang:

```bash
node --version
corepack enable
pnpm --version
```

Yang Anda harapkan muncul:

```text
v22.11.0
9.15.0
```

Angkanya boleh berbeda. Yang penting: Node diawali `v20`, `v22`, atau lebih tinggi, dan pnpm menjawab dengan angka, bukan dengan error. Kalau `corepack enable` gagal, `npm install -g pnpm` juga bekerja.

Kenapa pnpm dan bukan npm yang sudah ikut terpasang? Tiga alasan: jauh lebih hemat ruang disk karena paket disimpan sekali lalu dihubungkan, lebih cepat, dan lebih ketat sehingga paket yang tidak Anda daftarkan tidak bisa dipakai diam-diam. Untuk sekarang cukup tahu keduanya mengerjakan hal yang sama, dan seri ini memakai pnpm.

## Editor kode

Pasang **VS Code** dari `code.visualstudio.com` kalau Anda belum punya editor. Gratis, tersedia untuk Windows, Mac, dan Linux, dan jadi pilihan mayoritas di industri. Zed dan WebStorm juga pilihan yang baik.

Empat ekstensi yang pantas dipasang sejak hari pertama:

| Ekstensi | Gunanya |
| --- | --- |
| **Prettier** | Merapikan format kode otomatis saat disimpan |
| **ESLint** | Menandai kode yang berpotensi jadi bug |
| **Docker** | Melihat container yang jalan tanpa pindah ke terminal |
| **PostgreSQL** (oleh Chris Kolkman) | Menjalankan kueri dari dalam editor |

Dua pengaturan yang layak dinyalakan sekarang lewat **Ctrl + ,** atau **Cmd + ,**: **Format On Save** dan **Editor: Word Wrap**.

Satu pengaturan khusus backend yang jarang disebut dan sangat berguna: nyalakan **Files: Auto Save** dengan nilai `onFocusChange`. Saat bekerja dengan server yang memuat ulang otomatis, berpindah dari editor ke terminal akan langsung menyimpan dan memuat ulang, dan Anda berhenti bertanya-tanya kenapa perubahan Anda belum terlihat.

## Terminal, dan satu kebiasaan baru

Kalau Anda datang dari seri frontend, tujuh perintah dari Modul 0 di sana sudah cukup: `pwd`, `ls`, `cd`, `cd ..`, `mkdir`, `code .`, dan panah atas untuk mengulang.

Backend menambahkan satu kebiasaan yang tidak ada di frontend: **Anda akan sering butuh dua terminal sekaligus.** Satu menjalankan server dan tidak pernah dikembalikan ke Anda, satu lagi untuk mengirim permintaan ke server itu. Terminal yang sedang menjalankan server terlihat seperti menggantung, dan itu memang perilakunya yang benar: proses itu sedang menunggu permintaan.

Di VS Code, buka terminal dengan **Ctrl + `**, lalu tekan ikon **+** untuk terminal kedua. Keduanya muncul berdampingan dan bisa diklik bergantian.

Dua perintah baru yang perlu Anda kenal:

| Perintah | Artinya |
| --- | --- |
| **Ctrl + C** | Hentikan program yang sedang berjalan di terminal ini |
| `lsof -i :3000` (Mac dan Linux) | Program apa yang sedang memakai port 3000? |

Yang pertama akan Anda tekan ratusan kali dalam seri ini. Yang kedua akan menyelamatkan Anda saat server menolak menyala karena portnya masih dipakai server lama yang lupa dimatikan. Di Windows, padanannya `netstat -ano | findstr :3000`.

## `curl` dan `jq`

Backend tidak punya tampilan. Satu-satunya cara melihat hasil kerja Anda adalah mengirim permintaan dan membaca jawabannya, dan `curl` adalah alat paling dasar untuk itu.

`curl` sudah terpasang di macOS, Linux, dan Windows 10 ke atas. Buktikan:

```bash
curl --version
```

**`jq`** membaca JSON di terminal supaya hasilnya bisa dibaca manusia. Tanpa jq, jawaban server muncul sebagai satu baris panjang tanpa spasi.

| Sistem | Cara memasang `jq` |
| --- | --- |
| macOS | `brew install jq` |
| Windows | `winget install jqlang.jq` |
| Ubuntu dan Debian | `sudo apt install jq` |

Kalau `brew` belum ada di Mac, pasang Homebrew dari `brew.sh` lebih dulu. Homebrew akan dipakai lagi nanti untuk `psql`, jadi memasangnya sekarang bukan pekerjaan sia-sia.

Buktikan keduanya bekerja bersama:

```bash
curl -s https://api.github.com/repos/nodejs/node | jq '{nama: .name, bintang: .stargazers_count}'
```

Yang Anda harapkan muncul:

```json
{
  "nama": "node",
  "bintang": 112000
}
```

Angkanya tentu berbeda. Yang penting: muncul dua baris JSON yang rapi, bukan satu baris panjang dan bukan pesan error. Kalau yang muncul `jq: command not found`, pemasangan jq belum berhasil atau terminalnya belum dibuka ulang.

Satu saran yang menghemat banyak waktu: belajar memakai `curl` dengan nyaman. Alat berantarmuka grafis memudahkan, dan saat Anda sedang memeriksa sesuatu di server produksi lewat SSH pada jam dua pagi, yang ada di sana hanya `curl`.

## Docker

Layanan backend hampir tidak pernah berdiri sendiri. Minimal ada basis data, sering ada Redis, kadang ada beberapa lagi. Memasang semuanya langsung ke laptop berarti setiap proyek berebut satu Postgres yang sama, versinya tidak bisa berbeda antar proyek, dan menghapusnya saat selesai belajar tidak pernah benar-benar bersih.

**Docker** menyelesaikan itu dengan menjalankan setiap layanan di dalam kotaknya sendiri. Satu berkas teks di dalam proyek Anda menyebutkan apa yang dibutuhkan, dan satu perintah menyalakan semuanya dengan versi yang persis sama di laptop siapa pun.

Pasang **Docker Desktop** dari `docker.com`. Setelah terpasang, **jalankan aplikasinya**, dan ini bagian yang paling sering terlewat: Docker Desktop harus dalam keadaan **terbuka dan berjalan** sebelum perintah `docker` apa pun bekerja. Ikonnya ada di bilah menu Mac atau di baki sistem Windows, dan harus menunjukkan status berjalan, bukan berhenti.

Buktikan:

```bash
docker --version
docker run --rm hello-world
```

Yang Anda harapkan muncul, setelah beberapa baris pengunduhan:

```text
Hello from Docker!
This message shows that your installation appears to be working correctly.
```

Kalau yang muncul `Cannot connect to the Docker daemon`, artinya Docker Desktop belum berjalan. Buka aplikasinya, tunggu sampai statusnya hijau, lalu ulangi.

Dua perintah yang akan Anda pakai setiap hari mulai Modul 5:

| Perintah | Artinya |
| --- | --- |
| `docker compose up -d` | Nyalakan semua layanan proyek ini di latar belakang |
| `docker compose down` | Matikan semuanya |
| `docker compose ps` | Apa yang sedang berjalan? |
| `docker compose logs -f db` | Tampilkan catatan dari layanan `db`, terus-menerus |

Satu hal yang perlu diluruskan sejak sekarang: **container tidak menyimpan apa pun kecuali Anda memintanya.** Menghapus container berarti menghapus isinya. Berkas `docker-compose.yml` di Modul 5 memakai `volumes` tepat untuk alasan ini, supaya data Postgres Anda bertahan saat containernya dimatikan dan dinyalakan lagi.

## `psql`

`psql` adalah program kecil untuk berbicara langsung dengan Postgres: mengetik kueri, melihat daftar tabel, dan memeriksa isi data tanpa lewat aplikasi Anda.

Ada dua cara memakainya, dan yang kedua lebih sedikit masalahnya.

**Cara pertama, memasangnya ke laptop.** Berguna kalau Anda sering menyambung ke basis data di tempat lain.

| Sistem | Perintahnya |
| --- | --- |
| macOS | `brew install libpq` lalu `brew link --force libpq` |
| Windows | `winget install PostgreSQL.psql` |
| Ubuntu dan Debian | `sudo apt install postgresql-client` |

**Cara kedua, memakai `psql` yang sudah ada di dalam container Postgres.** Tidak perlu memasang apa pun, dan versinya dijamin cocok dengan servernya:

```bash
docker compose exec -it db psql -U postgres -d perpustakaan
```

Seri ini memakai cara kedua di semua contohnya, jadi kalau pemasangan cara pertama merepotkan, lewati saja. Anda tidak akan kehilangan apa pun.

Empat perintah di dalam `psql` yang cukup untuk seluruh seri:

| Perintah | Artinya |
| --- | --- |
| `\dt` | Daftar tabel |
| `\d nama_tabel` | Bentuk satu tabel beserta kolom dan indeksnya |
| `\x` | Tampilkan hasil memanjang ke bawah, berguna untuk baris yang lebar |
| `\q` | Keluar |

## Bruno

Mulai Modul 3, Anda akan mengulang permintaan yang sama berkali-kali: buat pesanan, ambil daftarnya, coba dengan token yang salah. Mengetik ulang `curl` yang panjang setiap kali melelahkan dan rawan salah ketik.

**Bruno** dari `usebruno.com` menyimpan kumpulan permintaan sebagai berkas di dalam folder proyek Anda, sehingga ikut tersimpan bersama kodenya. Insomnia dan Postman mengerjakan hal yang sama dan menyimpannya di akun daring; kalau Anda sudah memakai salah satunya, tetap pakai.

Alat ini tidak dibutuhkan sampai Modul 3, jadi memasangnya boleh ditunda. Yang penting Anda tahu bahwa mengetik ulang `curl` bukan satu-satunya pilihan.

## Satu folder untuk semuanya

Buat satu tempat tinggal untuk seluruh pekerjaan seri ini:

```bash
cd ~
mkdir belajar-backend
cd belajar-backend
mkdir modul-00-halo
cd modul-00-halo
code .
```

`~` berarti folder utama pengguna Anda, yaitu `C:\Users\nama` di Windows atau `/Users/nama` di Mac.

Satu aturan yang menghemat banyak kebingungan nanti: **jangan menaruh proyek di dalam folder yang disinkronkan layanan penyimpanan awan**, misalnya Google Drive, OneDrive, atau iCloud Drive. Folder `node_modules` berisi puluhan ribu berkas kecil, dan sinkronisasi terus-menerus terhadapnya membuat komputer lambat serta kadang merusak pemasangan.

## Latihan

### Latihan 1: Buktikan enam alat Anda siap

Jalankan enam perintah berikut satu per satu, dan **catat hasil setiap baris**. Jangan lanjut ke latihan berikutnya sebelum keenamnya menjawab dengan angka atau teks, bukan dengan error.

```bash
node --version
pnpm --version
curl --version
jq --version
docker --version
docker compose version
```

> [!petunjuk]
> Kalau salah satu menjawab `command not found` padahal Anda baru saja memasangnya, hampir selalu penyebabnya satu: terminalnya dibuka sebelum pemasangan selesai. Tutup seluruh jendela terminal, buka yang baru, lalu ulangi perintah itu saja.

> [!jawaban]
>
> Bentuk jawaban yang benar, dengan angka yang boleh berbeda:
>
> ```text
> v22.11.0
> 9.15.0
> curl 8.7.1 (x86_64-apple-darwin23.0)
> jq-1.7.1
> Docker version 27.3.1, build ce12230
> Docker Compose version v2.29.7
> ```
>
> Tiga kegagalan yang paling sering terjadi, beserta jawabannya:
>
> **`command not found` untuk `node` atau `pnpm`.** Terminal belum dibuka ulang sejak pemasangan. Kalau sudah dibuka ulang dan tetap gagal, pemasangannya belum selesai: buka kembali pemasang Node dan jalankan sampai tuntas.
>
> **`docker: command not found` atau `Cannot connect to the Docker daemon`.** Keduanya berbeda dan sering tertukar. Yang pertama berarti Docker belum terpasang. Yang kedua berarti Docker **sudah terpasang tapi aplikasinya belum berjalan**, dan jawabannya membuka Docker Desktop lalu menunggu statusnya hijau.
>
> **Versi Node diawali `v18` atau lebih rendah.** Sebagian kode di seri ini memakai kemampuan Node yang lebih baru. Pasang ulang versi LTS terbaru dari `nodejs.org`, dan di Mac atau Linux pertimbangkan `nvm` supaya beberapa versi bisa hidup berdampingan.

### Latihan 2: Server pertama yang benar-benar menjawab

Sekarang Anda membuat server. Tidak ada framework, tidak ada TypeScript, dan tidak ada yang perlu dipasang: semuanya sudah ada di dalam Node.

Di folder `modul-00-halo`, buat berkas bernama `server.mjs` berisi persis ini. Akhiran `.mjs` berarti "pakai sintaks modul modern", yaitu `import` dan bukan `require`. Modul 2 akan mengaturnya lewat `package.json` supaya akhiran `.js` biasa pun ikut memakainya.

```js
// server.mjs
import { createServer } from 'node:http';

const server = createServer((req, res) => {
  console.log(`masuk: ${req.method} ${req.url}`);

  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ pesan: 'halo dari server Anda', waktu: new Date().toISOString() }));
});

server.listen(3000, () => {
  console.log('server mendengarkan di http://localhost:3000');
});
```

Di **terminal pertama**, jalankan:

```bash
node server.mjs
```

Yang Anda harapkan muncul:

```text
server mendengarkan di http://localhost:3000
```

Lalu terminal itu **berhenti dan tidak mengembalikan prompt**. Itu bukan kemacetan, melainkan tanda berhasil: prosesnya sedang menunggu permintaan.

Di **terminal kedua**, kirim permintaan:

```bash
curl -s http://localhost:3000 | jq
```

Yang Anda harapkan muncul:

```json
{
  "pesan": "halo dari server Anda",
  "waktu": "2026-12-02T04:17:52.481Z"
}
```

Sekarang lihat kembali terminal pertama. Satu baris baru muncul di sana: `masuk: GET /`. Lalu buka `http://localhost:3000` di browser, dan perhatikan terminal pertama lagi.

**Pertanyaannya:** saat Anda membuka alamat itu di browser, berapa baris `masuk:` yang muncul di terminal pertama, dan kenapa jumlahnya bisa lebih dari satu?

> [!petunjuk]
> Perhatikan isi `req.url` pada setiap baris yang muncul. Browser tidak hanya meminta halaman yang Anda ketik.

> [!jawaban]
>
> Biasanya dua baris, dan kadang tiga:
>
> ```text
> masuk: GET /
> masuk: GET /favicon.ico
> ```
>
> Baris kedua datang karena **browser meminta ikon tab secara otomatis**, tanpa Anda menyuruhnya. Server kecil ini menjawab semua permintaan dengan JSON yang sama, termasuk permintaan ikon itu, karena tidak ada satu pun pemeriksaan tentang alamat yang diminta.
>
> Tiga hal yang pantas menempel dari server sepuluh baris ini:
>
> **Satu, server adalah proses yang hidup terus.** Berbeda dari skrip yang jalan lalu selesai, proses ini menunggu. Hentikan dengan **Ctrl + C** di terminal pertama, lalu coba `curl` lagi dari terminal kedua. Yang muncul: `Connection refused`. Itu jawaban sistem operasi saat tidak ada program yang mendengarkan di port itu, dan Anda akan sering bertemu pesan itu lagi di Modul 5 saat Postgres belum dinyalakan.
>
> **Dua, server tidak peduli siapa yang memanggil.** `curl`, browser, aplikasi ponsel, atau skrip buatan orang lain diperlakukan sama persis. Itu sebabnya seluruh Modul 3 bersikeras bahwa masukan dari luar tidak pernah dipercaya: Anda tidak pernah bisa memastikan pemanggilnya adalah antarmuka yang Anda buat sendiri.
>
> **Tiga, server ini menjawab apa pun dengan hal yang sama.** Tidak ada perbedaan antara `/`, `/pesanan`, dan `/alamat-yang-tidak-ada`. Membuatnya membedakan itulah pekerjaan Modul 3, dan sekarang Anda tahu persis apa yang dikerjakan sebuah framework untuk Anda.

### Latihan 3: Nyalakan Postgres dan lihat isinya

Di folder yang sama, buat berkas bernama `docker-compose.yml`:

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: rahasia
      POSTGRES_DB: coba
    ports: ['5432:5432']
    volumes: ['pgdata:/var/lib/postgresql/data']

volumes:
  pgdata:
```

Pastikan Docker Desktop berjalan, lalu:

```bash
docker compose up -d
docker compose ps
```

Yang Anda harapkan muncul dari perintah kedua:

```text
NAME                IMAGE         STATUS         PORTS
modul-00-halo-db-1  postgres:17   Up 4 seconds   0.0.0.0:5432->5432/tcp
```

Lalu masuk ke dalamnya dan buat satu tabel:

```bash
docker compose exec -it db psql -U postgres -d coba
```

Setelah muncul `coba=#`, ketik tiga pernyataan berikut, masing-masing diakhiri titik koma:

```sql
CREATE TABLE catatan (id serial PRIMARY KEY, isi text NOT NULL);
INSERT INTO catatan (isi) VALUES ('baris pertama saya');
SELECT * FROM catatan;
```

> [!petunjuk]
> Kalau prompt berubah jadi `coba-#` dan tidak ada yang terjadi setelah Enter, titik komanya terlewat. Postgres sedang menunggu kelanjutan pernyataan Anda. Ketik `;` lalu Enter.

> [!jawaban]
>
> Yang muncul setelah `SELECT`:
>
> ```text
>  id |        isi
> ----+--------------------
>   1 | baris pertama saya
> (1 row)
> ```
>
> Sekarang kerjakan satu hal lagi yang membuat latihan ini ada gunanya. Keluar dengan `\q`, lalu matikan dan nyalakan ulang containernya, lalu periksa lagi:
>
> ```bash
> docker compose down
> docker compose up -d
> docker compose exec -it db psql -U postgres -d coba -c 'SELECT * FROM catatan;'
> ```
>
> Baris Anda masih ada. Itu kerja `volumes` di berkas tadi: datanya disimpan di luar container, jadi container boleh dibuang dan dibuat ulang tanpa kehilangan apa pun.
>
> Coba sekali lagi tanpa jaring pengaman itu, supaya Anda merasakan bedanya:
>
> ```bash
> docker compose down -v
> ```
>
> Tanda `-v` ikut menghapus volume. Nyalakan lagi, dan tabel `catatan` sudah tidak ada. Dua perintah yang bedanya satu huruf, dan akibatnya seluruh basis data. Ingat baik-baik, karena `docker compose down -v` adalah perintah yang pantas membuat Anda berhenti sejenak sebelum menekan Enter.

### Latihan 4: Baca empat pesan error

Keempat pesan ini akan Anda temui berkali-kali selama seri ini. Mengenalinya dalam satu detik, bukan lima belas menit, adalah salah satu perbedaan paling nyata antara pemula dan orang yang sudah terbiasa.

Picu keempatnya dengan sengaja, lalu tulis satu kalimat untuk masing-masing: apa penyebabnya, dan apa langkah pertama Anda.

| # | Cara memicunya |
| --- | --- |
| 1 | Jalankan `node server.mjs` di dua terminal sekaligus |
| 2 | Hentikan servernya dengan Ctrl + C, lalu jalankan `curl http://localhost:3000` |
| 3 | Jalankan `node berkas-yang-tidak-ada.mjs` |
| 4 | Jalankan `docker compose ps` setelah menutup Docker Desktop |

> [!jawaban]
>
> | # | Pesannya | Artinya | Langkah pertama |
> | --- | --- | --- | --- |
> | 1 | `Error: listen EADDRINUSE: address already in use :::3000` | Sudah ada program yang mendengarkan di port 3000 | Hentikan yang lama dengan Ctrl + C, atau cari pemakainya dengan `lsof -i :3000` |
> | 2 | `curl: (7) Failed to connect to localhost port 3000: Connection refused` | Tidak ada yang mendengarkan di sana | Nyalakan servernya. Kalau sudah menyala, periksa nomor portnya |
> | 3 | `Error: Cannot find module '/Users/anda/.../berkas-yang-tidak-ada.mjs'` | Berkasnya tidak ada di folder tempat terminal berada | Jalankan `pwd` dan `ls`, lalu periksa ejaan nama berkasnya |
> | 4 | `Cannot connect to the Docker daemon at unix:///var/run/docker.sock` | Docker terpasang, aplikasinya tidak berjalan | Buka Docker Desktop, tunggu statusnya hijau |
>
> Dua pengamatan yang berlaku untuk keempatnya, dan sebenarnya untuk hampir semua error yang akan Anda temui:
>
> **Pesannya menyebutkan penyebabnya.** `EADDRINUSE` secara harfiah berarti "alamat sedang dipakai". `Connection refused` berarti ada yang menolak, bukan ada yang rusak. `Cannot find module` menyebutkan path lengkap berkas yang dicari, dan membandingkan path itu dengan hasil `pwd` biasanya langsung menyelesaikan masalahnya. Sebagian besar waktu yang hilang saat menghadapi error dihabiskan untuk **tidak membaca pesannya sampai habis**.
>
> **Nomor 1 dan 2 adalah pasangan.** Keduanya tentang port: yang satu karena ada dua penghuni, yang satu karena tidak ada penghuni sama sekali. Begitu konsep "port hanya boleh punya satu pendengar" masuk, keduanya berhenti jadi misteri.

## Kalau tersangkut

Ini bagian terpenting di modul ini, dan satu-satunya yang tidak bisa Anda lewati.

Anda akan melihat tulisan merah. Sering. Itu bukan tanda Anda tidak berbakat, melainkan cara kerja normal pekerjaan ini. Yang membedakan orang yang maju dan orang yang berhenti bukan seberapa jarang errornya muncul, tapi apa yang dilakukan setelah error itu muncul.

**Urutan yang hampir selalu berhasil:**

1. **Baca pesannya sampai habis.** Terdengar sepele, dan kebanyakan orang hanya melihat bahwa warnanya merah lalu langsung menyalin ke mesin pencari. Pesan error hampir selalu menyebutkan apa yang salah, dan sangat sering menyebutkan nama berkas beserta nomor barisnya.
2. **Cari baris pertama yang menyebut berkas Anda sendiri.** Pada tumpukan error yang panjang, sebagian besar barisnya milik kode orang lain. Baris yang menyebut nama berkas Anda adalah tempat memulai.
3. **Periksa yang terakhir Anda ubah.** Error hampir selalu berasal dari perubahan terakhir, bukan dari kode yang sudah berjalan sejak tadi.
4. **Periksa apakah semuanya benar-benar menyala.** Ini tambahan khas backend yang tidak ada di frontend. Sebelum menduga kode Anda salah, pastikan servernya berjalan, Docker Desktop terbuka, dan containernya hidup. `docker compose ps` dan melihat terminal server menjawab sebagian besar kebingungan "kenapa tidak jalan padahal kemarin jalan".
5. **Kecilkan masalahnya.** Hapus atau nonaktifkan separuh kode. Kalau errornya hilang, penyebabnya di separuh yang dihapus. Ulangi sampai tinggal beberapa baris. Teknik ini membosankan dan hampir selalu lebih cepat daripada menebak.
6. **Cari dengan kata kunci yang tepat.** Salin pesan errornya, lalu **buang bagian yang khas milik komputer Anda**: nama folder, path lengkap, dan nomor baris. `listen EADDRINUSE: address already in use` adalah kata kunci yang baik. `Error: listen EADDRINUSE: address already in use :::3000 at Server.setupListenHandle [as _listen2] (node:net:1872:16)` hampir tidak akan menemukan apa pun.
7. **Baca dokumentasi resminya.** Dokumentasi Node di `nodejs.org/docs`, Postgres di `postgresql.org/docs`, dan situs resmi setiap pustaka. Jawaban di forum berumur lima tahun sering sudah tidak berlaku, sedangkan dokumentasi resmi ikut diperbarui.
8. **Tulis ulang pertanyaan Anda sebelum bertanya ke siapa pun.** Sebutkan apa yang Anda coba lakukan, apa yang Anda harapkan, apa yang terjadi, pesan error lengkapnya, dan apa yang sudah Anda coba. Separuh waktu, menyusun pertanyaan dengan lengkap membuat Anda menemukan jawabannya sendiri sebelum selesai menulis.

Satu catatan soal alat bantu AI, karena pasti Anda pakai dan memang masuk akal dipakai. Alat itu sangat baik untuk menjelaskan pesan error dan konsep yang belum Anda pahami, dan di situlah nilainya paling besar bagi pemula. Yang perlu dijaga: jangan memintanya menuliskan jawaban latihan. Latihan di seri ini dirancang supaya Anda merasakan masalahnya, dan masalah yang tidak pernah Anda rasakan tidak akan menempel.

Untuk backend, ada satu bahaya tambahan yang pantas disebut sekarang. Kode backend yang dihasilkan AI hampir selalu **terlihat benar**, dan kesalahannya adalah jenis yang tidak terlihat: celah konkurensi yang baru muncul saat dua orang menekan tombol bersamaan, kueri yang cepat pada seratus baris dan tidak terpakai pada dua juta, atau pembayaran yang diproses dua kali saat jaringan tersendat. Seluruh seri ini pada dasarnya melatih satu hal: mengenali kesalahan jenis itu. Itu keterampilan yang nilainya justru naik, bukan turun, karena menulis kode jadi murah.

## Batasnya

Modul ini menyiapkan alat, dan tidak mengajarkan backend sama sekali.

**Server di Latihan 2 bukan layanan.** Sepuluh baris itu menjawab semua alamat dengan hal yang sama, tidak memeriksa apa pun, tidak mencatat apa pun dengan benar, dan kehilangan seluruh datanya saat dimatikan. Jarak antara itu dan sesuatu yang pantas dipakai orang adalah isi dua puluh empat modul berikutnya.

**Anda belum tahu kenapa alat-alat ini dipilih.** Kenapa Postgres dan bukan MongoDB, kenapa pnpm dan bukan npm, kenapa Fastify dan bukan Express: semuanya punya alasan, dan alasannya baru masuk akal setelah Anda bertemu masalah yang mereka selesaikan. Jangan menghafalnya sekarang.

**Daftar alat ini akan berubah.** Versi berganti beberapa kali setahun. Yang perlu menempel bukan versi yang Anda pasang hari ini, melainkan kebiasaan memeriksa apa yang sudah terpasang dengan `--version`, dan membaca pesan error sampai habis saat sesuatu tidak cocok.

## Rangkuman

- Backend menjalankan proses yang hidup terus dan mendengarkan port. Terminal yang terlihat menggantung setelah `node server.mjs` adalah tanda berhasil, bukan tanda macet.
- Anda akan sering butuh dua terminal: satu menjalankan server, satu mengirim permintaan.
- Tutup dan buka ulang terminal setelah memasang apa pun. Itu penyebab nomor satu `command not found` yang menyesatkan.
- Docker menjalankan basis data tanpa memasangnya ke laptop, dan Docker Desktop harus **berjalan**, bukan sekadar terpasang.
- `volumes` adalah yang membuat data Postgres bertahan saat container dimatikan. `docker compose down -v` menghapusnya.
- Satu port hanya boleh punya satu pendengar. `EADDRINUSE` berarti ada dua, `Connection refused` berarti tidak ada.
- `curl` dan `jq` adalah mata Anda untuk backend, karena tidak ada tampilan yang bisa dilihat.
- Saat tersangkut: baca pesannya sampai habis, periksa apakah semuanya benar-benar menyala, kecilkan masalahnya, lalu cari dengan kata kunci yang sudah dibersihkan.
- Pakai AI untuk menjelaskan error dan konsep, bukan untuk menuliskan jawaban latihan.

## Masalah terbuka

Server Anda menjawab. Sekarang pertanyaan yang pantas diajukan sebelum menambah satu baris pun kode ke dalamnya.

Saat `curl` mengirim permintaan ke `localhost:3000`, apa saja yang terjadi di antara Anda menekan Enter dan jawaban muncul? Di produksi, jawaban yang sama butuh 40 ms atau 2 detik, dan selisihnya hampir tidak pernah ada di kode Anda sendiri, melainkan di tahap-tahap yang belum pernah Anda lihat.

Lalu ada pertanyaan yang jawabannya menentukan hampir semua keputusan arsitektur nanti: kalau satu permintaan butuh waktu lama, apa yang terjadi pada permintaan orang lain yang datang bersamaan?

Itu isi modul berikutnya: apa yang terjadi di sisi server antara permintaan masuk dan respons keluar, dan di mana waktunya habis.
