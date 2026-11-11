---
title: 'Modul 0: Menyiapkan Alat Kerja'
description: Modul yang hampir selalu dilewati tutorial, dan jadi alasan paling sering orang berhenti di hari pertama. Terminal, editor, Node, dan satu berkas HTML yang benar-benar terbuka di browser Anda sendiri.
date: 2026-11-07
slug: modul-0-menyiapkan-alat-kerja
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Hampir semua tutorial frontend dimulai dengan sebuah potongan kode dan kalimat "coba jalankan ini". Pembaca yang sudah pernah koding tidak merasakan masalahnya. Pembaca yang belum berhenti di kalimat itu, karena tidak ada yang pernah menjelaskan di mana kode itu ditulis, bagaimana cara menyimpannya, dan apa artinya "dijalankan".

Modul ini mengisi celah tersebut. Isinya bukan materi frontend, melainkan empat alat yang akan Anda pakai setiap hari selama seri ini, dan satu keterampilan yang menentukan apakah Anda selesai atau menyerah di modul keempat: cara bersikap saat ada yang merah di layar.

Yang akan Anda pasang, beserta alasannya:

| Alat | Fungsinya | Dipakai sejak |
| --- | --- | --- |
| Browser dengan DevTools | Menampilkan hasil kerja, dan mengukurnya | Modul 1 |
| Editor kode | Menulis dan menavigasi berkas | Modul 2 |
| Terminal | Menjalankan perkakas yang tidak punya tombol | Modul 7 |
| Node dan pnpm | Menjalankan perkakas, memasang kode orang lain | Modul 7 |

Dua yang pertama dibutuhkan hampir segera. Dua yang terakhir baru benar-benar dipakai di Modul 7, dan tetap dipasang sekarang supaya Anda tidak terhenti di tengah modul nanti.

Satu hal yang tidak ada di daftar ini: Git. Git memang wajib bagi frontend engineer, dan tempatnya di Modul 7, saat Anda punya proyek sungguhan yang pantas disimpan riwayatnya. Memasangnya sekarang hanya akan jadi hafalan tanpa konteks.

## Analogi: menata meja sebelum mulai

Bayangkan dua orang belajar memasak.

**Orang pertama** membuka resep, lalu mencari pisau. Pisaunya tumpul. Dia mencari talenan, tidak ada. Dia mencari garam, ternyata habis. Setelah empat puluh menit, dia belum memotong apa pun, dan kesimpulan yang dia ambil bukan "dapurnya belum siap", melainkan "ternyata saya tidak bisa memasak".

**Orang kedua** menata meja lebih dulu: pisau, talenan, wadah, bumbu, dan tempat sampah dalam jangkauan. Lalu dia membuka resep. Satu jam kemudian dia sedang makan.

Keduanya punya kemampuan yang sama. Yang membedakan hasilnya adalah tiga puluh menit persiapan yang terasa membosankan.

| Dunia dapur | Dunia frontend |
| --- | --- |
| Meja kerja | Folder proyek di komputer Anda |
| Pisau dan talenan | Editor kode |
| Kompor yang menyalakan bahan | Browser yang menjalankan berkas Anda |
| Lemari bumbu | Node dan pnpm, tempat kode orang lain dipasang |
| Perintah lisan ke asisten | Terminal |
| Resep | Modul-modul setelah ini |

Batas analoginya: meja dapur ditata sekali lalu bertahan bertahun-tahun, sedangkan perkakas frontend berganti versi beberapa kali setahun. Jadi yang perlu menempel dari modul ini bukan versi yang Anda pasang hari ini, melainkan cara memeriksa apa yang sudah terpasang dan cara memperbaruinya.

## Browser: alat ukur, bukan hanya penampil

Anda sudah punya browser. Yang mungkin belum Anda ketahui: di dalamnya ada seperangkat alat ukur yang akan jadi teman kerja Anda setiap hari.

Buka browser, lalu tekan **F12**. Di Mac, kalau F12 tidak bekerja, pakai **Cmd + Option + I**. Panel yang muncul itu DevTools.

Lima tab yang akan paling sering Anda buka:

| Tab | Isinya | Dipakai untuk |
| --- | --- | --- |
| **Elements** | Struktur halaman yang sedang tampil | Melihat markup dan gaya yang benar-benar berlaku |
| **Console** | Pesan dari halaman, termasuk error | Tempat pertama yang diperiksa saat ada yang aneh |
| **Network** | Semua berkas yang diunduh halaman | Mencari yang lambat dan yang gagal |
| **Sources** | Berkas sumber halaman | Membaca dan menghentikan kode saat berjalan |
| **Application** | Penyimpanan, cookie, cache | Memeriksa data yang disimpan halaman |

Satu saran yang akan terbayar sepanjang seri ini: pasang dua browser, misalnya Chrome dan Firefox. Bug yang hanya muncul di satu browser jauh lebih mudah dikenali kalau Anda sudah biasa membandingkan.

Console juga bisa dipakai sebagai tempat mencoba kode tanpa membuat berkas apa pun. Buka tab Console, ketik `1 + 1`, lalu tekan Enter. Hasilnya langsung muncul. Modul 4 akan memakai ini sebagai ruang latihan utama, jadi biasakan sekarang.

## Editor kode

Anda bisa menulis HTML di Notepad, dan sebaiknya tidak. Editor kode memberi pewarnaan sintaks, pelengkapan otomatis, penanda kesalahan, dan kemampuan mencari di seluruh folder sekaligus. Keempatnya menghemat waktu yang nyata.

**Pasang VS Code** dari `code.visualstudio.com`. Gratis, tersedia untuk Windows, Mac, dan Linux, dan jadi pilihan mayoritas di industri sehingga hampir semua panduan yang Anda temui nanti mengasumsikannya. Zed dan WebStorm juga pilihan yang baik, dan kalau Anda sudah nyaman dengan salah satunya, tetap pakai.

Tiga ekstensi yang pantas dipasang sejak hari pertama, lewat ikon Extensions di bilah kiri:

| Ekstensi | Gunanya |
| --- | --- |
| **Prettier** | Merapikan format kode otomatis saat disimpan |
| **ESLint** | Menandai kode yang berpotensi jadi bug |
| **Live Server** | Menyajikan berkas Anda lewat HTTP, dan memuat ulang browser saat Anda menyimpan |

Yang ketiga perlu penjelasan, karena akan jadi penyelamat di Modul 2 sampai Proyek 1. Berkas HTML bisa dibuka langsung dengan klik dua kali, dan alamatnya akan dimulai dengan `file://`. Sebagian kemampuan browser tidak bekerja pada alamat seperti itu, termasuk `import` antar berkas JavaScript yang Anda pakai di Proyek 1. Live Server menyajikan folder Anda lewat `http://localhost`, sehingga semuanya bekerja seperti di internet.

Dua pengaturan yang layak dinyalakan sekarang. Buka Settings dengan **Ctrl + ,** atau **Cmd + ,**, lalu cari dan nyalakan:

- **Format On Save**, supaya kode Anda dirapikan otomatis dan Anda berhenti memikirkan spasi.
- **Editor: Word Wrap**, supaya baris panjang dilipat dan tidak perlu digulir ke samping.

## Terminal

Terminal adalah jendela tempat Anda mengetik perintah, bukan mengklik tombol. Reputasinya menakutkan dan sebenarnya tidak, karena yang perlu Anda kuasai hanya tujuh perintah.

Cara membukanya:

| Sistem | Caranya |
| --- | --- |
| Windows | Cari "Terminal" di menu Start, atau pakai Windows Terminal |
| macOS | Cari "Terminal" di Spotlight dengan Cmd + spasi |
| Linux | Ctrl + Alt + T pada sebagian besar distribusi |
| Di dalam VS Code | **Ctrl + `** atau menu Terminal, lalu New Terminal |

Yang terakhir itu yang akan paling sering Anda pakai, karena terminalnya langsung berada di folder proyek yang sedang Anda buka.

Satu konsep yang menjelaskan hampir semua kebingungan pemula di terminal: **terminal selalu berada di satu folder tertentu**, dan setiap perintah berlaku terhadap folder itu. Folder tersebut disebut direktori kerja, dan biasanya ditampilkan di sebelah kiri tempat Anda mengetik.

Tujuh perintah yang cukup untuk seluruh seri ini:

| Perintah | Artinya | Contoh |
| --- | --- | --- |
| `pwd` | Saya sedang di folder mana? | `pwd` |
| `ls` | Apa isi folder ini? | `ls` |
| `cd nama-folder` | Masuk ke folder | `cd belajar-frontend` |
| `cd ..` | Naik satu tingkat | `cd ..` |
| `mkdir nama-folder` | Buat folder baru | `mkdir halaman-pertama` |
| `code .` | Buka folder ini di VS Code | `code .` |
| Panah atas | Ulangi perintah sebelumnya | |

Di Windows PowerShell, `pwd` dan `ls` bekerja. Kalau Anda memakai Command Prompt lama, padanannya `cd` tanpa argumen dan `dir`. Untuk menghindari perbedaan ini sama sekali, pakai terminal di dalam VS Code.

Tiga kebiasaan yang mencegah sebagian besar frustrasi:

**Pertama, baca prompt sebelum mengetik.** Perintah yang benar di folder yang salah akan gagal, dan pesan errornya jarang menyebutkan bahwa itu masalahnya.

**Kedua, pakai Tab untuk melengkapi nama.** Ketik beberapa huruf pertama nama folder lalu tekan Tab. Ini bukan sekadar mempercepat, tapi juga membuktikan folder itu memang ada dan ejaannya benar.

**Ketiga, jangan pernah menyalin perintah yang tidak Anda pahami dari internet.** Terminal menjalankan apa pun yang Anda ketik dengan hak Anda sendiri, termasuk perintah yang menghapus berkas tanpa konfirmasi dan tanpa tempat sampah. Kalau sebuah panduan menyuruh Anda menjalankan sesuatu yang panjang dan tidak jelas, cari tahu dulu apa isinya.

## Node dan pnpm

**Node.js** adalah program yang menjalankan JavaScript di luar browser. Anda tidak akan menulis kode Node di seri ini, dan tetap membutuhkannya, karena hampir semua perkakas frontend (Vite, ESLint, Prettier, Vitest, Playwright) ditulis sebagai program Node.

**pnpm** adalah pengelola paket, yaitu program yang mengunduh dan memasang kode orang lain ke dalam proyek Anda, beserta seluruh kode yang dibutuhkan kode itu.

Pasang Node versi **LTS** dari `nodejs.org`. LTS berarti dukungan jangka panjang, dan itu yang Anda inginkan. Hindari versi "Current" yang lebih baru, karena sebagian perkakas belum mengejarnya.

Setelah pemasangan selesai, **tutup terminal lalu buka lagi**. Ini langkah yang paling sering dilewati, dan penyebab nomor satu pesan "command not found" tepat setelah berhasil memasang sesuatu. Terminal membaca daftar program yang tersedia saat dibuka, jadi terminal yang sudah terbuka sebelum pemasangan tidak mengetahui program barunya.

Lalu buktikan keduanya terpasang:

```bash
node --version
# v22.11.0 atau versi LTS lain yang diawali v20 ke atas

corepack enable
pnpm --version
# 9.x atau lebih baru
```

`corepack enable` adalah cara memasang pnpm yang paling sedikit masalahnya, karena Corepack sudah ikut bersama Node. Kalau perintah itu gagal, `npm install -g pnpm` juga bekerja.

Kenapa pnpm dan bukan npm yang sudah ikut terpasang? Tiga alasan yang akan Anda rasakan di Modul 7: jauh lebih hemat ruang disk karena paket disimpan sekali lalu dihubungkan, lebih cepat, dan lebih ketat sehingga paket yang tidak Anda daftarkan tidak bisa dipakai diam-diam. Untuk sekarang cukup tahu keduanya mengerjakan hal yang sama, dan seri ini memakai pnpm.

## Satu folder untuk semuanya

Sebelum menulis apa pun, buat satu tempat tinggal untuk seluruh pekerjaan seri ini. Buka terminal, lalu:

```bash
cd ~
mkdir belajar-frontend
cd belajar-frontend
mkdir modul-02-html
cd modul-02-html
code .
```

`~` berarti folder utama pengguna Anda, yaitu `C:\Users\nama` di Windows atau `/Users/nama` di Mac. Setelah `code .` dijalankan, VS Code terbuka dengan folder itu sebagai proyek, dan terminal di dalamnya sudah berada di tempat yang benar.

Satu aturan yang menghemat banyak kebingungan nanti: **jangan menaruh proyek di dalam folder yang disinkronkan layanan penyimpanan awan**, misalnya Google Drive, OneDrive, atau iCloud Drive. Folder `node_modules` berisi puluhan ribu berkas kecil, dan sinkronisasi terus-menerus terhadapnya membuat komputer lambat serta kadang merusak pemasangan.

## Kalau tersangkut

Ini bagian terpenting di modul ini, dan satu-satunya yang tidak bisa Anda lewati.

Anda akan melihat tulisan merah. Sering. Itu bukan tanda Anda tidak berbakat, melainkan cara kerja normal pekerjaan ini. Yang membedakan orang yang maju dan orang yang berhenti bukan seberapa jarang errornya muncul, tapi apa yang dilakukan setelah error itu muncul.

**Urutan yang hampir selalu berhasil:**

1. **Baca pesannya sampai habis.** Terdengar sepele, dan kebanyakan orang hanya melihat bahwa warnanya merah lalu langsung menyalin ke mesin pencari. Pesan error hampir selalu menyebutkan apa yang salah, dan sangat sering menyebutkan nama berkas beserta nomor barisnya.
2. **Cari baris pertama yang menyebut berkas Anda sendiri.** Pada tumpukan error yang panjang, sebagian besar barisnya milik kode orang lain. Baris yang menyebut nama berkas Anda adalah tempat memulai.
3. **Periksa yang terakhir Anda ubah.** Error hampir selalu berasal dari perubahan terakhir, bukan dari kode yang sudah berjalan sejak tadi.
4. **Kecilkan masalahnya.** Hapus atau nonaktifkan separuh kode. Kalau errornya hilang, penyebabnya di separuh yang dihapus. Ulangi sampai tinggal beberapa baris. Teknik ini membosankan dan hampir selalu lebih cepat daripada menebak.
5. **Cari dengan kata kunci yang tepat.** Salin pesan errornya, lalu **buang bagian yang khas milik komputer Anda**: nama folder, path lengkap, dan nomor baris. `Cannot find module './util/format.js'` adalah kata kunci yang baik. `Cannot find module 'C:\Users\tio\belajar\modul-07\src\util\format.js'` hampir tidak akan menemukan apa pun.
6. **Baca dokumentasi resminya.** MDN untuk HTML, CSS, dan JavaScript. Situs resmi untuk setiap perkakas. Jawaban di forum berumur lima tahun sering sudah tidak berlaku, sedangkan dokumentasi resmi ikut diperbarui.
7. **Tulis ulang pertanyaan Anda sebelum bertanya ke siapa pun.** Sebutkan apa yang Anda coba lakukan, apa yang Anda harapkan, apa yang terjadi, pesan error lengkapnya, dan apa yang sudah Anda coba. Separuh waktu, menyusun pertanyaan dengan lengkap membuat Anda menemukan jawabannya sendiri sebelum selesai menulis.

Satu catatan soal alat bantu AI, karena pasti Anda pakai dan memang masuk akal dipakai. Alat itu sangat baik untuk menjelaskan pesan error dan konsep yang belum Anda pahami, dan di situlah nilainya paling besar bagi pemula. Yang perlu dijaga: jangan memintanya menuliskan jawaban latihan. Latihan di seri ini dirancang supaya Anda merasakan masalahnya, dan masalah yang tidak pernah Anda rasakan tidak akan menempel. Pakailah untuk bertanya "kenapa ini error", bukan "tuliskan kodenya".

## Latihan

### Latihan 1: Jelajahi terminal

Kerjakan seluruhnya dari terminal, tanpa menyentuh penjelajah berkas sama sekali. Tujuannya membangun rasa bahwa terminal adalah tempat yang bisa Anda tinggali, bukan kotak hitam yang menakutkan.

1. Tampilkan folder tempat Anda berada sekarang.
2. Pindah ke folder utama pengguna Anda.
3. Buat folder `latihan-terminal`, lalu masuk ke dalamnya.
4. Buat tiga folder di dalamnya: `satu`, `dua`, `tiga`.
5. Tampilkan isi folder dan pastikan ketiganya ada.
6. Masuk ke `dua`, lalu naik dua tingkat sekaligus dalam satu perintah.
7. Buka folder `latihan-terminal` di VS Code dari terminal.

> [!petunjuk]
> Untuk nomor 6, `..` bisa dirangkai dengan garis miring. Dan untuk nomor 4, sebagian besar terminal menerima beberapa nama sekaligus dalam satu perintah `mkdir`.

> [!jawaban]
>
> ```bash
> pwd
> cd ~
> mkdir latihan-terminal
> cd latihan-terminal
> mkdir satu dua tiga
> ls
> cd dua
> cd ../..
> cd latihan-terminal
> code .
> ```
>
> Tiga hal yang pantas diperhatikan:
>
> 1. **`mkdir satu dua tiga` membuat tiga folder sekaligus.** Hampir semua perintah terminal menerima beberapa sasaran, dan kebiasaan ini menghemat banyak ketikan nanti.
> 2. **`cd ../..` naik dua tingkat.** Setiap `..` berarti satu tingkat ke atas, dan keduanya dirangkai dengan garis miring.
> 3. **`code .` memakai titik sebagai nama folder.** Titik berarti "folder tempat saya sekarang", dan dua titik berarti "folder di atasnya". Dua tanda ini akan muncul terus, termasuk di dalam kode pada Modul 5.

### Latihan 2: Halaman pertama Anda

Buat berkas `index.html` di folder `modul-02-html`, isi dengan potongan di bawah, lalu buka di browser dengan Live Server.

```html
<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Halaman pertama saya</title>
  </head>
  <body>
    <h1>Halo, ini halaman pertama saya</h1>
    <p>Dibuat pada hari pertama belajar frontend.</p>
  </body>
</html>
```

Cara menjalankan Live Server: klik kanan pada `index.html` di panel kiri VS Code, lalu pilih **Open with Live Server**. Browser akan terbuka dengan alamat yang dimulai `http://127.0.0.1` atau `http://localhost`.

Setelah halamannya muncul, kerjakan empat hal berikut:

1. Ubah tulisan di dalam `h1`, simpan, dan perhatikan browser memuat ulang sendiri.
2. Buka DevTools, pilih tab Elements, lalu cari `h1` Anda di dalamnya.
3. Di tab Console, ketik `document.title` lalu tekan Enter.
4. Perhatikan alamat di bilah URL. Catat bedanya dengan alamat yang muncul kalau Anda membuka berkas itu dengan klik dua kali dari penjelajah berkas.

> [!jawaban]
>
> Empat hal yang baru saja Anda buktikan sendiri, dan semuanya akan dipakai terus:
>
> 1. **Menyimpan berkas sudah cukup untuk melihat hasilnya.** Tidak ada langkah "membangun" atau "mengompilasi" untuk HTML dan CSS. Berkasnya langsung dibaca browser, dan ini akan berubah di Modul 7 saat perkakas mulai masuk.
> 2. **Tab Elements menampilkan halaman yang sedang hidup, bukan berkas Anda.** Anda bahkan bisa mengubahnya langsung di situ, dan perubahannya hilang saat dimuat ulang. Itu tempat bereksperimen tanpa risiko.
> 3. **Console bisa membaca dan mengubah halaman.** `document.title` mengembalikan isi tag `title` Anda. Ini pintu masuk ke seluruh Modul 6.
> 4. **Alamatnya `http://localhost:5500`, bukan `file:///C:/Users/...`.** Perbedaan ini yang membuat Proyek 1 bisa berjalan, karena `import` antar berkas JavaScript ditolak browser pada alamat `file://`. Simpan informasi ini, karena Anda akan bertemu lagi dengannya dan pesan errornya cukup membingungkan kalau belum pernah mendengar sebabnya.

### Latihan 3: Baca tiga pesan error

Ini latihan yang paling berharga di modul ini. Sengaja buat tiga kesalahan berikut, baca pesannya, lalu tulis dugaan Anda sebelum membuka pembahasan.

| # | Lakukan ini | Di mana pesannya muncul |
| --- | --- | --- |
| 1 | Di terminal, jalankan `pnpmm --version` (dengan dua huruf m) | Terminal |
| 2 | Di terminal, jalankan `cd folder-yang-tidak-ada` | Terminal |
| 3 | Di `index.html`, tambahkan `<script>halo()</script>` sebelum `</body>`, lalu muat ulang dan buka tab Console | Console browser |

> [!petunjuk]
> Untuk setiap pesan, jawab tiga pertanyaan yang sama: siapa yang berbicara (terminal, browser, atau perkakas), apa yang dia cari, dan di mana dia mencarinya. Hampir semua pesan error menjawab ketiganya kalau dibaca sampai habis.

> [!jawaban]
>
> **1. `command not found: pnpmm` atau `pnpmm is not recognized`.**
> Yang berbicara adalah terminal, dan dia mengatakan tidak menemukan program bernama itu. Dua penyebabnya hanya ada dua: salah ketik, atau programnya memang belum terpasang. Dalam urutan memeriksa, selalu curigai salah ketik lebih dulu. Dan kalau Anda yakin baru memasangnya, ingat langkah yang paling sering dilewati: tutup terminal lalu buka lagi.
>
> **2. `cd: no such file or directory: folder-yang-tidak-ada`.**
> Terminal mengatakan folder itu tidak ada **di tempat dia sedang berada sekarang**. Bagian terakhir itu yang penting, dan tidak disebutkan oleh pesannya. Jadi langkah pertamanya bukan membuat ulang foldernya, melainkan menjalankan `pwd` dan `ls` untuk memastikan Anda berada di tempat yang Anda kira.
>
> **3. `Uncaught ReferenceError: halo is not defined`.**
> Yang berbicara browser. Dia menemukan perintah memanggil sesuatu bernama `halo`, dan tidak pernah diberi tahu apa itu. Perhatikan tiga bagian pesannya, karena bentuk ini akan Anda baca ribuan kali:
>
> | Bagian | Artinya |
> | --- | --- |
> | `Uncaught` | Tidak ada kode yang menangani masalah ini, jadi eksekusi berhenti |
> | `ReferenceError` | Jenis masalahnya: sebuah nama dipakai tanpa pernah didefinisikan |
> | `halo is not defined` | Nama yang dimaksud |
>
> Di sebelah kanan pesan itu ada nama berkas beserta nomor barisnya, dan bisa diklik. Klik, dan DevTools membawa Anda tepat ke baris penyebabnya. Kemampuan ini saja sudah memotong sebagian besar waktu yang biasanya habis untuk menebak.
>
> Satu pelajaran yang berlaku untuk ketiganya: **pesan error adalah petunjuk, bukan hukuman.** Ketiganya menyebutkan dengan tepat apa yang dicari dan tidak ditemukan. Membaca dengan tenang hampir selalu lebih cepat daripada langsung menyalinnya ke mesin pencari.

### Latihan 4: Buktikan semuanya siap

Jalankan daftar periksa ini, dan jangan beranjak ke Modul 1 sebelum tujuh barisnya hijau.

| # | Yang diperiksa | Cara |
| --- | --- | --- |
| 1 | Node terpasang, versi LTS | `node --version` menampilkan v20 atau lebih tinggi |
| 2 | pnpm terpasang | `pnpm --version` menampilkan angka |
| 3 | VS Code bisa dibuka dari terminal | `code .` membuka folder itu |
| 4 | Live Server bekerja | Halaman Latihan 2 terbuka di `localhost` |
| 5 | Format On Save bekerja | Rusak sengaja indentasinya, simpan, dan indentasinya rapi lagi |
| 6 | DevTools bisa dibuka | F12 memunculkan panel |
| 7 | Anda tahu folder kerja Anda di mana | Bisa menyebutkannya tanpa melihat |

Lalu satu langkah terakhir, untuk membuktikan pnpm benar-benar bisa mengunduh sesuatu:

```bash
cd ~/belajar-frontend
mkdir uji-pnpm && cd uji-pnpm
pnpm init
pnpm add dayjs
ls node_modules
```

> [!pembahasan]
>
> Yang baru saja terjadi, dan tiga hal yang pantas Anda perhatikan sekarang supaya Modul 7 tidak terasa ajaib:
>
> `pnpm init` membuat satu berkas bernama `package.json`. Isinya daftar identitas proyek dan, nanti, daftar paket yang Anda pakai. Buka berkas itu di VS Code dan lihat betapa pendeknya.
>
> `pnpm add dayjs` mengunduh sebuah library pengolah tanggal, menambahkannya ke `package.json`, membuat `pnpm-lock.yaml`, dan membuat folder `node_modules`.
>
> | Yang muncul | Isinya | Masuk repositori nanti? |
> | --- | --- | --- |
> | `package.json` | Daftar paket yang Anda minta | Ya |
> | `pnpm-lock.yaml` | Versi persis yang benar-benar terpasang | Ya, dan ini wajib |
> | `node_modules/` | Kode paketnya sendiri | Tidak, bisa dibuat ulang |
>
> Tiga hal yang layak dicatat:
>
> 1. **`node_modules` berisi jauh lebih banyak folder daripada satu paket yang Anda minta.** Itu karena `dayjs` dan paket lain punya kebutuhannya sendiri. Modul 7 membahas kenapa jumlah ini adalah keputusan, bukan detail.
> 2. **Folder itu tidak pernah disimpan ke repositori dan tidak pernah dibagikan.** Siapa pun yang punya `package.json` dan lockfile Anda bisa membuatnya ulang dengan satu perintah.
> 3. **Anda bisa menghapusnya kapan saja.** Kalau pemasangan terasa rusak, `rm -rf node_modules` lalu `pnpm install` adalah perbaikan pertama yang dicoba semua orang, dan sering berhasil.
>
> Setelah ini, hapus saja seluruh folder `uji-pnpm`. Tugasnya sudah selesai.

## Batasnya

Modul ini memberi alat, bukan keterampilan. Setelah selesai, Anda belum bisa membuat apa pun, dan itu memang bukan tujuannya.

Dua hal lain yang perlu diluruskan.

**Versi akan berubah.** Angka versi di modul ini akan kedaluwarsa, dan itu tidak masalah. Yang perlu menempel adalah cara memeriksa apa yang terpasang (`--version`) dan kebiasaan memakai LTS. Tutorial yang menyuruh Anda memasang versi tertentu yang sangat spesifik biasanya tutorial yang sudah tua.

**Alat tidak menggantikan pemahaman.** Format On Save merapikan kode yang salah dengan sama rapinya seperti kode yang benar. ESLint menandai sebagian masalah, bukan semua. Perkakas memperbesar kemampuan Anda, dan tidak menciptakannya.

## Rangkuman

- Browser bukan hanya penampil, tapi juga alat ukur. DevTools dibuka dengan F12, dan Console bisa dipakai mencoba kode tanpa membuat berkas.
- Editor kode memberi pewarnaan, pelengkapan, penanda kesalahan, dan pencarian lintas berkas. Nyalakan Format On Save sejak hari pertama.
- Berkas yang dibuka sebagai `file://` tidak mendapat semua kemampuan browser. Live Server menyajikannya lewat `http://localhost`, dan itu yang dipakai sepanjang seri ini.
- Terminal selalu berada di satu folder, dan setiap perintah berlaku terhadap folder itu. `pwd` dan `ls` menjawab sebagian besar kebingungan.
- Node menjalankan perkakas frontend, pnpm memasang kode orang lain. Setelah memasang program baru, tutup terminal lalu buka lagi.
- `package.json` menyatakan apa yang Anda minta, lockfile mencatat apa yang benar-benar terpasang, dan `node_modules` bisa dibuat ulang kapan saja.
- Pesan error menyebutkan apa yang dicari dan tidak ditemukan. Baca sampai habis, cari baris yang menyebut berkas Anda sendiri, dan buang bagian khas komputer Anda sebelum mencari di internet.
- Alat bantu AI paling berguna untuk menjelaskan error dan konsep, dan paling merugikan kalau dipakai menuliskan jawaban latihan.

## Masalah terbuka

Alat sudah siap, dan Anda sudah punya satu halaman yang terbuka di `localhost`. Halaman itu berisi satu judul dan satu paragraf, dan muncul dalam waktu yang terasa seketika.

Pertanyaannya: apa yang sebenarnya terjadi di antara Anda menekan Enter dan tulisan itu muncul?

Terdengar seperti pertanyaan iseng, dan jawabannya menentukan kemampuan Anda sepanjang karier. Saat suatu hari ada yang melapor "halamannya lambat", "layarnya kosong", atau "tombolnya tidak bisa diklik di dua detik pertama", tiga laporan itu punya penyebab yang sama sekali berbeda. Tanpa model mental tentang perjalanan sebuah halaman, ketiganya terasa seperti sihir.

Itu isi modul berikutnya: cara kerja web, dari DNS sampai piksel pertama, dan di mana pekerjaan frontend sebenarnya dimulai.
