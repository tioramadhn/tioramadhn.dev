---
title: 'Modul 1: Cara Kerja Backend dan Anatomi Satu Permintaan'
description: Antara permintaan masuk dan respons keluar ada belasan tahap, dan setiap tahap punya biaya waktu. Mengenalinya adalah bedanya menebak dan tahu saat produksi melambat.
date: 2026-12-02
slug: modul-1-cara-kerja-backend
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Kalau Anda pernah membangun antarmuka, Anda sudah menulis `fetch('/api/pesanan')` berkali-kali. Modul ini tentang apa yang ada di ujung sana.

Backend bukan hanya "tempat menyimpan data". Ada lima pekerjaan yang hanya bisa dikerjakan di sisi server, dan kelimanya alasan backend ada:

| Pekerjaan | Kenapa tidak bisa di klien |
| --- | --- |
| **Menyimpan data yang bertahan** | Penyimpanan di browser milik satu perangkat, dan bisa dihapus pengguna |
| **Memegang kebenaran** | Harga, stok, dan saldo tidak boleh ditentukan oleh kode yang bisa diubah pemakainya |
| **Menjalankan aturan bisnis yang mengikat** | Siapa pun bisa mengubah kode di browsernya sendiri |
| **Menyimpan rahasia** | Kunci API dan kredensial basis data tidak pernah aman di klien |
| **Mengoordinasikan banyak pengguna** | Dua orang yang membeli kursi yang sama perlu satu pihak yang memutuskan |

Perhatikan baris kedua dan kelima. Keduanya merangkum seluruh seri ini: backend adalah **satu-satunya pihak yang berwenang memutuskan**, dan sebagian besar kesulitan di dalamnya muncul karena banyak hal terjadi bersamaan.

## Masalahnya dulu: lima laporan dengan lima penyebab

Bayangkan API Anda sudah berjalan. Suatu pagi datang lima laporan:

1. **"API-nya lambat."** Rata-rata respons 90 ms, tapi satu dari dua puluh permintaan butuh empat detik.
2. **"Pesanan saya masuk dua kali."** Pengguna menekan tombol bayar dua kali karena yang pertama terasa tidak merespons.
3. **"Stoknya minus."** Padahal kode sudah memeriksa stok sebelum mengurangi.
4. **"Satu halaman lambat, lalu semua endpoint lambat."** Termasuk endpoint yang sama sekali tidak terkait.
5. **"Data di basis data benar, tapi API mengembalikan yang lama."**

Kelimanya punya penyebab yang sama sekali berbeda, dan tidak satu pun bisa diselesaikan dengan menebak. Yang pertama soal persentil, bukan rata-rata: ada satu jalur lambat yang tersembunyi di balik angka rata-rata yang tampak sehat. Yang kedua soal idempotency. Yang ketiga soal konkurensi dan transaksi. Yang keempat soal model eksekusi Node, atau pool sambungan yang habis. Yang kelima soal cache.

Lima modul berikutnya menjawab satu per satu. Modul ini membangun peta tempat kelima masalah itu duduk, karena tanpa peta, Anda akan memperbaiki tempat yang bukan penyebabnya. Pola itu berulang di hampir semua insiden produksi: tim menghabiskan dua hari mengoptimalkan kode aplikasi, dan ternyata penyebabnya satu kueri tanpa indeks.

## Sedikit sejarah

**1993: CGI.** Setiap permintaan menjalankan satu program baru dari nol. Sederhana, dan tidak mungkin dipakai pada lalu lintas serius.

**1995 sampai 2005: aplikasi server.** PHP, ASP, lalu Rails dan Django. HTML dirakit di server, dan satu kata "aplikasi web" berarti satu program yang mengurus semuanya.

**2005 sampai 2010: API dan JSON.** Ponsel pintar datang, dan satu backend harus melayani web sekaligus aplikasi ponsel. HTML berhenti jadi satu-satunya keluaran, dan REST dengan JSON jadi kesepakatan bersama.

**2010: cloud dan 12-factor.** Server berhenti jadi barang yang dirawat satu per satu. Aplikasi mulai ditulis dengan asumsi bisa dimatikan dan diganti kapan saja, konfigurasi dari variabel lingkungan, dan log dialirkan keluar bukan ditulis ke berkas.

**2014 sampai sekarang: container, serverless, dan edge.** Docker menyeragamkan cara mengemas aplikasi, Kubernetes menyeragamkan cara menjalankannya, dan serverless memindahkan urusan kapasitas ke penyedia. Masing-masing menyelesaikan masalah nyata, dan masing-masing membawa masalah baru.

Empat pelajaran yang polanya berulang, dan layak diingat karena akan Anda temui lagi:

**Microservice: obat yang pernah diresepkan untuk semua penyakit.** Sekitar 2015, memecah aplikasi jadi puluhan layanan jadi jawaban bawaan. Beberapa tahun kemudian banyak perusahaan menggabungkannya kembali, karena ternyata mereka menukar masalah organisasi dengan masalah jaringan yang jauh lebih sulit dilacak. Pelajarannya: pola arsitektur menyelesaikan masalah tertentu, bukan semua masalah.

**NoSQL sebagai pengganti SQL.** Sekitar 2010, basis data tanpa skema dianggap akan menggantikan relasional. Yang terjadi: sebagian besar aplikasi kembali ke Postgres, dan basis data dokumen tinggal di tempat yang memang cocok. Sementara itu Postgres menyerap banyak kemampuan yang dulu jadi alasan pindah, termasuk tipe JSON yang bisa diindeks.

**Serverless bukan tanpa server.** Yang hilang bukan servernya, tapi kendali Anda atas servernya. Yang didapat: kapasitas otomatis dan biaya mengikuti pemakaian. Yang datang bersamanya: cold start, batas waktu eksekusi, dan kesulitan menjaga sambungan basis data yang tetap hidup.

**HTTP terus berubah di bawah kaki Anda.** HTTP/2 membawa multiplexing yang menghapus sebagian alasan menggabungkan berkas, dan HTTP/3 pindah dari TCP ke QUIC untuk mengatasi jaringan yang tidak stabil. Keduanya mengubah anjuran optimasi yang dulu dianggap kebenaran abadi.

## Analogi: kantor layanan dengan loket

Bayangkan kantor layanan publik yang melayani ribuan orang per hari.

Pengunjung datang ke **loket** yang sesuai urusannya. Petugas **memeriksa identitas**, lalu **memeriksa kelengkapan formulir**. Kalau formulirnya salah, pengunjung ditolak di loket dengan penjelasan, bukan dibiarkan masuk sampai ke dalam. Petugas lalu **mengambil arsip** dari gudang dokumen, menerapkan **prosedur resmi**, dan mencatat apa yang dia lakukan di **buku harian**.

Beberapa urusan tidak selesai di loket. Permohonan yang butuh verifikasi lapangan **diberi nomor antrean**, diproses petugas lain, lalu pemohon diberi tahu saat selesai. Dan kantor ini punya **jam kerja serta kapasitas**: ada batas berapa pengunjung yang bisa dilayani dalam satu jam, dan menerima lebih banyak daripada kapasitas hanya memperpanjang antrean semua orang.

| Dunia kantor layanan | Dunia backend |
| --- | --- |
| Loket sesuai urusan | Endpoint dan routing |
| Pemeriksaan identitas | Autentikasi |
| Memeriksa siapa yang berhak atas arsip ini | Otorisasi |
| Memeriksa kelengkapan formulir di loket | Validasi masukan |
| Gudang arsip | Basis data |
| Salinan dokumen yang sering diminta di meja depan | Cache |
| Prosedur resmi yang mengikat | Aturan bisnis |
| Buku harian petugas | Log dan jejak audit |
| Nomor antrean untuk urusan panjang | Queue dan pekerjaan latar |
| Batas pengunjung per jam | Rate limit dan kapasitas |
| Papan pengumuman "sistem sedang gangguan" | Health check dan halaman status |

Batas analoginya penting, dan di situ letak sebagian besar kesulitan backend: di kantor, pengunjung dilayani satu per satu dan antreannya terlihat. Di server, ribuan permintaan ditangani bersamaan dan antreannya tidak terlihat siapa pun kecuali Anda sengaja mengukurnya. Dua pengunjung yang mengambil arsip yang sama pada detik yang sama adalah kejadian yang mustahil di kantor dan terjadi setiap hari di server. Itu modul 8.

## Anatomi satu permintaan

Inilah peta yang dijanjikan. Setiap tahap punya biaya, dan setiap tahap bisa gagal.

```text
Klien (browser, aplikasi ponsel, layanan lain)
   |
   v
 DNS  ->  alamat IP
   |
   v
 TCP + TLS  ->  sambungan aman (bisa dipakai ulang, keep-alive)
   |
   v
 Load balancer / CDN
   |  (TLS diterminasi, permintaan diarahkan ke salah satu instance)
   v
 API gateway (opsional: rate limit, auth awal, routing)
   |
   v
+--------------------------------------------------+
| Proses aplikasi Anda |
|  |
| middleware: log -> auth -> validasi -> handler |
|  |  |
| v |
| service / use case |
|  |  |
| v |
| repository |
+-----------------------------------|--------------+
                                    |
         +--------------+-----------+-----------+--------------+
         v              v                       v              v
    Basis data       Cache                 Layanan lain     Queue
    (Postgres)       (Redis)               (HTTP, gRPC)     (pekerjaan latar)
                                                                |
                                                                v
                                                            Worker
```

Tiga hal yang perlu diperhatikan dari gambar itu:

**Pertama, aplikasi Anda hanya satu kotak dari banyak kotak.** Saat ada laporan "API lambat", penyebabnya bisa berada di kotak mana pun, termasuk di luar kendali Anda.

**Kedua, urutan middleware adalah keputusan desain.** Log sebelum auth supaya permintaan yang ditolak tetap tercatat. Rate limit sebelum validasi supaya penyerang tidak bisa membuat server bekerja keras hanya dengan mengirim data sampah. Auth sebelum handler supaya tidak ada satu pun handler yang perlu mengingat pemeriksaannya.

**Ketiga, pekerjaan tidak harus selesai di dalam permintaan.** Apa pun yang pengguna tidak perlu menunggunya sebaiknya pindah ke queue. Itu modul 14.

Soal anggaran waktu, inilah cara memikirkannya. Misal target Anda 200 ms pada persentil ke-95:

| Tahap | Anggaran khas |
| --- | --- |
| DNS dan pembuatan sambungan | 0 ms kalau sambungan dipakai ulang |
| Jaringan klien ke server | 20 sampai 60 ms dari HP di Indonesia |
| Load balancer dan gateway | 1 sampai 5 ms |
| Middleware: auth, validasi | 1 sampai 5 ms |
| Kueri basis data | 2 sampai 20 ms per kueri yang terindeks |
| Panggilan ke layanan lain | 20 sampai 200 ms, dan ini sumber kejutan terbesar |
| Serialisasi respons | 1 sampai 10 ms, tergantung besarnya |

Dua kesimpulan praktis yang langsung bisa dipakai: satu panggilan ke layanan pihak ketiga bisa memakan seluruh anggaran Anda, dan lima kueri berurutan yang masing-masing 15 ms sudah menghabiskan separuhnya. Karena itu pertanyaan "berapa kali permintaan ini menyentuh jaringan" lebih menentukan daripada seberapa efisien kode Anda.

## HTTP yang perlu dikuasai

Backend adalah pekerjaan yang hidup di atas HTTP, jadi menguasainya bukan pilihan.

**Method, dan sifat yang menyertainya:**

| Method | Aman | Idempoten | Dipakai untuk |
| --- | --- | --- | --- |
| GET | Ya | Ya | Membaca. Tidak boleh mengubah apa pun |
| HEAD | Ya | Ya | Memeriksa keberadaan atau metadata |
| POST | Tidak | **Tidak** | Membuat, atau menjalankan aksi |
| PUT | Tidak | Ya | Mengganti seluruh sumber daya |
| PATCH | Tidak | Tidak dijamin | Mengubah sebagian |
| DELETE | Tidak | Ya | Menghapus |

Kolom "idempoten" berarti mengirim permintaan yang sama dua kali menghasilkan keadaan akhir yang sama. Di situlah laporan nomor 2 di awal modul bermuara: POST tidak idempoten, jadi tombol bayar yang ditekan dua kali benar-benar membuat dua pesanan, kecuali Anda sendiri yang menanganinya. Caranya dibahas di modul 4 dan 8.

**Status code yang benar-benar sering dipakai:**

| Kode | Arti | Dipakai saat |
| --- | --- | --- |
| 200 | OK | Pembacaan dan pembaruan berhasil |
| 201 | Created | Sumber daya baru dibuat, sertakan header `Location` |
| 202 | Accepted | Diterima, dikerjakan di latar belakang |
| 204 | No Content | Berhasil tanpa isi respons, misalnya DELETE |
| 304 | Not Modified | Klien sudah punya versi terbaru |
| 400 | Bad Request | Bentuk permintaan salah |
| 401 | Unauthorized | Belum terautentikasi |
| 403 | Forbidden | Sudah dikenali, tapi tidak berhak |
| 404 | Not Found | Tidak ada, atau sengaja disamarkan |
| 409 | Conflict | Bentrok keadaan, misalnya versi sudah berubah |
| 422 | Unprocessable | Bentuknya benar, isinya tidak lolos aturan |
| 429 | Too Many Requests | Melewati batas laju, sertakan `Retry-After` |
| 500 | Internal Error | Kesalahan Anda sendiri |
| 503 | Service Unavailable | Sedang tidak sanggup melayani, sertakan `Retry-After` |

Perbedaan 401 dan 403 serta 400 dan 422 sering dianggap sepele, dan sebenarnya punya akibat nyata: klien memakai kode itu untuk memutuskan tindakan. 401 berarti "minta pengguna masuk lagi", 403 berarti "jangan ulangi, tampilkan penolakan". Memakai 400 untuk segalanya memaksa setiap klien membaca isi pesan untuk menebak maksud Anda.

**Header yang akan sering Anda sentuh:** `Content-Type`, `Authorization`, `Cache-Control`, `ETag`, `Idempotency-Key`, `Retry-After`, `X-Request-Id`, dan `Accept`. Masing-masing dibahas saat dibutuhkan, tapi satu layak disebut sekarang: `X-Request-Id` adalah pengenal yang mengikuti satu permintaan melintasi semua layanan, dan tanpa itu, menelusuri satu keluhan pengguna di dalam log jutaan baris nyaris mustahil.

## Stateless, dan kenapa itu menentukan segalanya

Satu aturan yang menentukan apakah layanan Anda bisa diperbanyak: **proses aplikasi tidak menyimpan keadaan yang penting di dalam dirinya.**

Alasannya praktis. Kalau layanan Anda berjalan di tiga instance di belakang load balancer, permintaan pertama pengguna bisa mendarat di instance A dan permintaan kedua di instance C. Apa pun yang Anda simpan di variabel global, di memori proses, atau di berkas lokal tidak akan ada di sana.

Jadi keadaan punya tempatnya masing-masing:

| Jenis keadaan | Tempatnya |
| --- | --- |
| Data yang harus bertahan | Basis data |
| Sesi dan token | Basis data atau Redis |
| Hasil kueri mahal | Redis, dengan masa berlaku |
| Berkas yang diunggah | Penyimpanan objek, bukan disk lokal |
| Pekerjaan yang menunggu dikerjakan | Queue |
| Konfigurasi | Variabel lingkungan |
| Cache dalam memori proses | Hanya untuk hal yang boleh berbeda antar instance |

Baris terakhir sering jadi sumber bug yang membingungkan: cache dalam memori terlihat bekerja sempurna saat pengembangan dengan satu proses, lalu di produksi tiga instance punya tiga isi cache berbeda, dan pengguna melihat jawaban yang berubah-ubah saat memuat ulang.

Sifat stateless inilah yang membuat penskalaan horizontal mungkin: menambah kapasitas berarti menambah instance, bukan membeli server yang lebih besar. Modul 21 membahas cara menjalankannya, dan modul 19 membahas apa yang tetap perlu dijaga saat instance dimatikan di tengah permintaan.

## Lapisan di dalam aplikasi

Tiga lapisan ini akan dipakai sepanjang seri, dan pemisahannya bukan soal selera:

```text
handler (HTTP)        -> membaca permintaan, memanggil service, menyusun respons
   |
service / use case    -> aturan bisnis, transaksi, orkestrasi
   |
repository            -> kueri ke basis data, tanpa aturan bisnis
```

Aturannya: **ketergantungan hanya mengarah ke bawah.** Handler tahu tentang HTTP, service tidak. Service tahu tentang aturan bisnis, repository tidak. Dan repository tahu tentang SQL, service tidak perlu.

Manfaatnya terasa di tiga tempat. Aturan bisnis bisa diuji tanpa menjalankan server HTTP, modul 20 akan memakai sifat ini. Aturan yang sama bisa dipanggil dari tempat lain, misalnya dari worker queue atau dari perintah terminal, tanpa duplikasi. Dan saat suatu hari protokolnya berubah, misalnya dari REST ke gRPC di modul 22, hanya lapisan handler yang perlu ditulis ulang.

Yang perlu dihindari: memeras aturan bisnis ke dalam handler, karena itu terasa lebih cepat di awal. Satu endpoint berisi 200 baris yang mencampur parsing, validasi, kueri, dan perhitungan adalah bentuk yang paling sering ditemui di proyek yang sulit diubah.

## Batas backend, frontend, dan infrastruktur

| Pekerjaan | Tempatnya | Catatan |
| --- | --- | --- |
| Validasi bentuk masukan | Keduanya | Klien untuk kenyamanan, server untuk kebenaran |
| Keputusan hak akses | Backend | Menyembunyikan tombol bukan pengamanan |
| Harga dan total tagihan | Backend | Angka yang dikirim klien tidak pernah dipercaya |
| Pembatasan laju | Gateway atau backend | Lebih murah ditolak sedini mungkin |
| Terminasi TLS | Load balancer atau CDN | Bukan pekerjaan aplikasi Anda |
| Percobaan ulang saat gagal | Keduanya, dengan aturan | Harus idempoten sebelum boleh diulang |
| Cache respons publik | CDN dan backend | Lihat modul 13 |
| Pemrosesan gambar | Backend atau layanan khusus | Jangan di tengah permintaan |
| Pemantauan dan peringatan | Backend dan platform | Lihat modul 18 |

## Alat kerja minimum

Anda tidak perlu memasang semuanya hari ini:

| Alat | Fungsinya | Kapan dibutuhkan |
| --- | --- | --- |
| Node.js LTS dan pnpm | Menjalankan dan mengelola proyek | Modul 2 |
| `curl` dan `httpie` | Memeriksa permintaan dari terminal | Modul ini |
| `jq` | Membaca JSON di terminal | Modul ini |
| Bruno, Insomnia, atau Postman | Menyimpan dan membagikan kumpulan permintaan | Modul 3 |
| Docker | Menjalankan Postgres dan Redis tanpa memasangnya | Modul 5 |
| `psql` | Berbicara langsung dengan Postgres | Modul 5 |
| k6 | Menguji beban | Modul 20 |

Satu saran yang menghemat banyak waktu: belajar memakai `curl` dengan nyaman. Alat berantarmuka grafis memudahkan, dan saat Anda sedang memeriksa sesuatu di server produksi lewat SSH pada jam dua pagi, yang ada di sana hanya `curl`.

## Latihan

### Latihan 1: Bedah satu permintaan

Pilih satu API publik, misalnya `https://api.github.com/repos/nodejs/node`, lalu jalankan empat perintah berikut dan catat hasilnya.

```bash
# 1. Lihat seluruh percakapan, termasuk TLS dan header
curl -v https://api.github.com/repos/nodejs/node -o /dev/null

# 2. Pecah waktunya per tahap
curl -w "dns:      %{time_namelookup}s
tcp:      %{time_connect}s
tls:      %{time_appconnect}s
byte-1:   %{time_starttransfer}s
total:    %{time_total}s
versi:    %{http_version}
ukuran:   %{size_download} bytes\n" \
  -o /dev/null -s https://api.github.com/repos/nodejs/node

# 3. Jalankan dua kali dalam satu sambungan, lihat bedanya
curl -s -o /dev/null -w "%{time_total}s\n" \
  https://api.github.com/repos/nodejs/node \
  https://api.github.com/repos/nodejs/node

# 4. Lihat hanya header respons
curl -sI https://api.github.com/repos/nodejs/node
```

Catat enam hal: versi HTTP yang dipakai, berapa lama DNS, berapa lama TLS, berapa lama sampai byte pertama, apa isi header `cache-control`, dan apakah ada header pembatasan laju.

**Pertanyaannya:** pada perintah ketiga, kenapa permintaan kedua jauh lebih cepat, padahal datanya sama besarnya?

> [!petunjuk]
> Perhatikan angka `tcp` dan `tls` pada perintah kedua, lalu pikirkan tahap mana yang tidak perlu diulang kalau sambungannya masih terbuka.

> [!jawaban]
>
> Permintaan kedua tidak perlu melakukan pencarian DNS, pembuatan sambungan TCP, dan negosiasi TLS lagi, karena sambungannya dipakai ulang. Pada koneksi dari Indonesia ke server di luar negeri, tiga tahap itu saja bisa 150 sampai 400 ms, sering kali lebih lama daripada pekerjaan server itu sendiri.
>
> Tiga akibat praktis yang akan terus relevan:
>
> 1. **Klien yang memanggil layanan lain harus memakai ulang sambungan.** Di Node, itu berarti memakai satu agent dengan keep-alive, bukan membuat klien baru per permintaan. Kesalahan ini sering menyebabkan latensi antar layanan yang tidak bisa dijelaskan.
> 2. **Serverless punya kerugian khusus di sini.** Fungsi yang baru dingin harus membangun ulang semua sambungan, termasuk ke basis data, dan itu salah satu sumbangan terbesar cold start.
> 3. **Angka tunggal dari satu kali pemanggilan tidak berarti apa-apa.** Jalankan beberapa kali, dan pisahkan permintaan pertama dari permintaan berikutnya, karena keduanya menjawab pertanyaan yang berbeda.

### Latihan 2: Pilih method dan status code

Untuk delapan operasi berikut, tentukan method, status code saat berhasil, dan apakah operasinya idempoten.

| # | Operasi |
| --- | --- |
| 1 | Mengambil daftar pesanan milik pengguna yang login |
| 2 | Membuat pesanan baru |
| 3 | Membatalkan pesanan |
| 4 | Mengubah alamat pengiriman pada satu pesanan |
| 5 | Mengunggah bukti pembayaran, yang lalu diperiksa petugas |
| 6 | Mengekspor seluruh riwayat pesanan jadi CSV, butuh 40 detik |
| 7 | Masuk dengan email dan password |
| 8 | Memeriksa apakah sebuah kode voucher masih berlaku |

> [!petunjuk]
> Dua pertanyaan penyaring: apakah operasi ini mengubah keadaan, dan kalau dikirim dua kali karena jaringan pengguna tersendat, apakah hasil akhirnya sama? Untuk nomor 6, tanyakan apakah pengguna masuk akal menunggu 40 detik dengan sambungan terbuka.

> [!jawaban]
>
> | # | Method | Status berhasil | Idempoten | Catatan |
> | --- | --- | --- | --- | --- |
> | 1 | GET | 200 | Ya | Jangan pakai POST hanya karena filternya panjang |
> | 2 | POST | 201 + header `Location` | **Tidak** | Perlu `Idempotency-Key` supaya klik ganda tidak membuat dua pesanan |
> | 3 | POST ke `/pesanan/{id}/pembatalan`, atau PATCH status | 200 | Ya, kalau ditulis dengan benar | Membatalkan pesanan yang sudah dibatalkan tetap 200, bukan error |
> | 4 | PATCH | 200 | Tidak dijamin | 409 kalau pesanan sudah dikirim |
> | 5 | POST | 201 | Tidak | Lihat modul 17 soal unggahan langsung ke penyimpanan objek |
> | 6 | POST, lalu GET status | **202 Accepted** | Tidak | Kembalikan id pekerjaan, kerjakan di latar, lihat modul 14 |
> | 7 | POST | 200 | Tidak | Pesan sama untuk email salah dan password salah |
> | 8 | GET | 200 | Ya | Jangan beri tahu alasan tidak berlaku secara rinci kalau bisa dipakai menebak kode lain |
>
> Tiga keputusan yang paling sering salah:
>
> **Nomor 3: operasi pembatalan sebaiknya idempoten.** Membatalkan sesuatu yang sudah dibatalkan bukan kesalahan pemanggil, dan mengembalikan error untuk itu memaksa setiap klien menulis penanganan khusus. Kalimat yang pantas jadi pegangan: respons menyatakan keadaan akhir yang diinginkan sudah tercapai.
>
> **Nomor 6: 40 detik di dalam satu permintaan hampir selalu salah.** Load balancer biasanya punya batas waktu, pengguna akan menutup tab, dan percobaan ulang akan memulai pekerjaan yang sama dari awal. Pola yang benar: terima permintaan, kembalikan 202 beserta id pekerjaan, dan sediakan endpoint untuk memeriksa statusnya.
>
> **Nomor 1: GET dengan filter panjang.** Naluri yang muncul saat filternya rumit adalah memakai POST supaya bisa mengirim body. Harganya: respons tidak bisa di-cache, tidak bisa di-bookmark, dan tidak bisa diulang dengan aman. Pakai parameter kueri, dan kalau benar-benar melewati batas panjang URL, sediakan endpoint pencarian terpisah dengan alasan yang ditulis di dokumentasi.

### Latihan 3: Backend, frontend, atau infrastruktur

Tentukan tempat pengerjaan sepuluh tugas berikut. Beberapa jawabannya lebih dari satu tempat.

| # | Tugas |
| --- | --- |
| 1 | Memastikan total tagihan sesuai harga katalog saat ini |
| 2 | Menampilkan pesan "stok tinggal 2" sebelum pengguna menekan beli |
| 3 | Menolak permintaan ke-101 dari satu alamat IP dalam satu menit |
| 4 | Menyimpan file PDF invoice |
| 5 | Mengubah gambar unggahan jadi tiga ukuran |
| 6 | Mengulangi permintaan yang gagal karena jaringan |
| 7 | Memastikan tidak ada dua pengguna mendapat nomor invoice yang sama |
| 8 | Menyembunyikan menu "Hapus" dari pengguna biasa |
| 9 | Mengenkripsi lalu lintas antara pengguna dan server |
| 10 | Memastikan satu pesanan tidak diproses dua kali saat jaringan pengguna tersendat |

> [!petunjuk]
> Pertanyaan penyaringnya sama seperti di seri frontend, tapi ditambah satu: kalau pemanggilnya bukan antarmuka Anda, melainkan skrip buatan orang lain, apakah aturan ini masih berlaku?

> [!jawaban]
>
> | # | Tempat | Alasan |
> | --- | --- | --- |
> | 1 | Backend | Harga dihitung ulang dari sumbernya, angka dari klien hanya petunjuk tampilan |
> | 2 | Frontend, dengan data dari backend | Kenyamanan. Kebenarannya diputuskan saat pesanan dibuat |
> | 3 | Gateway atau backend | Lebih murah di tepi, tapi batas per pengguna biasanya perlu konteks dari aplikasi |
> | 4 | Backend, di penyimpanan objek | Bukan di disk lokal instance, karena instance bisa diganti kapan saja |
> | 5 | Backend, di pekerjaan latar | Jangan di tengah permintaan, lihat modul 14 dan 17 |
> | 6 | Keduanya | Hanya untuk operasi idempoten, dengan jeda yang bertambah |
> | 7 | Backend, dengan jaminan dari basis data | Penomoran unik adalah pekerjaan basis data, bukan kode aplikasi yang membaca lalu menambah |
> | 8 | Frontend untuk tampilan, backend untuk keputusan | Dua-duanya dikerjakan, dengan tujuan berbeda |
> | 9 | Infrastruktur | Terminasi TLS di load balancer atau CDN |
> | 10 | Backend | `Idempotency-Key` yang disimpan, lihat modul 4 dan 8 |
>
> Nomor 7 pantas diperhatikan sekarang karena polanya berulang di seluruh seri. Kode seperti ini terlihat benar dan salah:
>
> ```ts
> const terakhir = await db.ambilNomorInvoiceTerakhir();
> const berikutnya = terakhir + 1; // dua permintaan bersamaan mendapat angka sama
> await db.simpanInvoice({ nomor: berikutnya });
> ```
>
> Ada jeda antara membaca dan menulis, dan pada jeda itu permintaan lain bisa membaca nilai yang sama. Jawabannya bukan menambah pemeriksaan di aplikasi, melainkan menyerahkan jaminan keunikan kepada basis data lewat sequence dan batasan unik. Pola "baca, hitung, tulis" adalah sumber bug konkurensi paling umum di backend, dan modul 8 membahasnya dengan tuntas.

### Latihan 4: Susun anggaran latensi

Sebuah endpoint `GET /pesanan/{id}` punya target 200 ms pada persentil ke-95, dan sekarang tercatat 1.400 ms. Jejaknya seperti ini:

| Tahap | Waktu |
| --- | --- |
| Middleware auth: memeriksa token ke layanan auth | 180 ms |
| Kueri pesanan | 12 ms |
| Kueri item pesanan, satu per item, 14 item | 168 ms |
| Kueri data pengguna | 9 ms |
| Panggilan ke layanan pengiriman untuk status terbaru | 940 ms |
| Serialisasi respons | 8 ms |

Tulis rencana perbaikan Anda, beserta perkiraan hasil dan risikonya masing-masing.

> [!pembahasan]
>
> | Urutan | Perbaikan | Perkiraan hasil | Risiko dan catatan |
> | --- | --- | --- | --- |
> | 1 | Jangan panggil layanan pengiriman di jalur ini | 1.400 ms jadi sekitar 460 ms | Status pengiriman jadi sedikit basi. Hampir selalu dapat diterima |
> | 2 | Gabungkan 14 kueri item jadi satu kueri | 460 ms jadi sekitar 300 ms | Ini masalah N+1, lihat modul 7 |
> | 3 | Verifikasi token secara lokal, bukan memanggil layanan auth | 300 ms jadi sekitar 130 ms | Pencabutan token jadi tidak langsung berlaku, lihat modul 10 |
> | 4 | Gabungkan kueri pesanan dan pengguna dengan join | 130 ms jadi sekitar 120 ms | Dampak kecil, kerjakan terakhir |
>
> Tiga hal yang jadi inti latihan ini:
>
> **Panggilan ke layanan lain adalah tersangka pertama, selalu.** Satu panggilan 940 ms adalah 67% dari seluruh waktu. Tiga pilihan untuk menanganinya, berurutan dari yang terbaik: keluarkan dari jalur permintaan dan segarkan di latar belakang (modul 14), simpan hasilnya di cache dengan masa berlaku pendek (modul 13), atau pasang batas waktu ketat dan kembalikan respons tanpa bagian itu saat lewat batas (modul 19).
>
> **Pola N+1 jarang terlihat di kode dan selalu terlihat di jejak.** Kode `for (const item of items) await ambilDetail(item.id)` terlihat wajar dan menghasilkan 14 perjalanan ke basis data. Satu kueri dengan `WHERE id = ANY($1)` menggantikan semuanya.
>
> **Setiap perbaikan punya harga, dan harganya harus disebut.** Nomor 1 menukar kesegaran data dengan kecepatan. Nomor 3 menukar kecepatan pencabutan token dengan latensi. Keputusan seperti ini bukan keputusan teknis murni, dan pantas dibicarakan dengan pemilik produk, bukan diambil diam-diam. Engineer yang menyebutkan harganya lebih dipercaya daripada yang hanya melaporkan angka membaik.
>
> Satu catatan terakhir: angka 1.400 ms itu persentil ke-95, bukan rata-rata. Kalau Anda hanya melihat rata-rata, endpoint ini mungkin tercatat 180 ms dan terlihat sehat, sementara satu dari dua puluh pengguna menunggu lebih dari satu detik. Lihat p95 dan p99, selalu.

## Batasnya

Modul ini memberi peta, bukan keterampilan membangun. Anda belum menulis satu baris pun kode server, dan itu memang bukan tujuannya.

Satu hal lagi yang perlu diluruskan: peta ini menggambarkan bentuk umum, dan bentuk umum tidak selalu berlaku. Aplikasi serverless tidak punya proses yang hidup terus. Layanan yang berjalan di edge tidak punya sambungan basis data yang dipakai ulang dengan cara yang sama. Dan sistem yang melayani sepuluh permintaan per hari tidak perlu memikirkan kapasitas sama sekali. Yang perlu menempel dari modul ini bukan diagramnya, melainkan kebiasaan bertanya: permintaan ini menyentuh apa saja, berapa biaya waktunya, dan bagian mana yang bisa gagal.

## Rangkuman

- Backend ada karena lima hal yang tidak bisa dikerjakan di klien, dan yang terpenting: backend adalah satu-satunya pihak yang berwenang memutuskan.
- Satu permintaan melewati banyak tahap, dan aplikasi Anda hanya satu di antaranya. Saat ada yang lambat, penyebabnya bisa di tahap mana pun.
- Urutan middleware adalah keputusan desain: log sebelum auth, rate limit sebelum validasi, auth sebelum handler.
- Pertanyaan "berapa kali permintaan ini menyentuh jaringan" lebih menentukan latensi daripada efisiensi kode Anda.
- Method HTTP punya sifat aman dan idempoten yang mengikat. POST tidak idempoten, dan itu sumber pesanan dobel.
- Status code adalah antarmuka: 401 dan 403, 400 dan 422, 202 untuk pekerjaan panjang. Klien memakainya untuk memutuskan tindakan.
- Proses aplikasi harus stateless. Setiap jenis keadaan punya tempatnya, dan cache dalam memori hanya untuk hal yang boleh berbeda antar instance.
- Tiga lapisan (handler, service, repository) dengan ketergantungan yang hanya mengarah ke bawah membuat aturan bisnis bisa diuji dan dipakai ulang.
- Ukur persentil ke-95 dan ke-99, bukan rata-rata. Rata-rata menyembunyikan jalur lambat.

## Masalah terbuka

Sekarang Anda tahu bentuk satu permintaan. Pertanyaan berikutnya: apa yang menjalankannya?

Di Latihan 4 ada satu baris yang pantas diperhatikan ulang: panggilan 940 ms ke layanan pengiriman. Selama 940 ms itu, apa yang dikerjakan proses Node Anda? Kalau jawabannya "menunggu", apakah permintaan dari pengguna lain ikut menunggu?

Dan ini penjelasan untuk laporan nomor 4 di awal modul, yang tadi belum dijawab: satu endpoint lambat membuat semua endpoint ikut lambat, termasuk yang tidak terkait. Pada sebagian besar bahasa lain, satu permintaan lambat hanya menahan satu utas. Di Node, ada satu hal yang kalau diblokir, menghentikan pelayanan untuk semua orang sekaligus, dan menemukan penyebabnya butuh pemahaman tentang cara Node menjalankan kode Anda.

Itu isi modul berikutnya: model eksekusi Node, event loop, I/O yang tidak memblokir, dan hal-hal yang diam-diam memblokirnya.
