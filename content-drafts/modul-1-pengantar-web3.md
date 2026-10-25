---
title: "Modul 1: Pengantar Web3 dan Masalah Sentralisasi"
description: Web 1 membaca, Web 2 menulis, Web3 memiliki. Satu kata tambahan yang mengubah siapa yang memegang data, identitas, dan aturan main sebuah aplikasi.
date: 2026-10-08
slug: modul-1-pengantar-web3
tags: tutorial web 3
series: Tutorial Web 3
status: draft
---

Tanpa sadar Anda sudah hidup di dua generasi web. Yang ketiga sedang dibangun, dan perbedaannya hanya satu kata.

| Generasi | Kira-kira kapan | Sifat utama | Contoh |
| --- | --- | --- | --- |
| Web 1 | 1990-an – awal 2000-an | **Read**: halaman statis, pengunjung hanya menonton | Situs profil perusahaan, Geocities |
| Web 2 | pertengahan 2000-an – sekarang | **Read-Write**: pengguna ikut membuat konten | Instagram, YouTube, Tokopedia, Gojek |
| Web3 | sekitar 2014 – sekarang | **Read-Write-Own**: membaca, menulis, dan memiliki | Aplikasi berbasis blockchain |

Web 2 memberi Anda kekuatan untuk *menulis*. Tapi apa yang Anda tulis (foto, ulasan, pengikut, saldo) tetap disimpan dan dikendalikan perusahaan pemilik platform. Web3 menambahkan satu kata kecil yang dampaknya besar: **Own**.

## Masalahnya dulu, teknologinya belakangan

Bayangkan Anda kreator dengan 500 ribu pengikut. Suatu pagi akun Anda dinonaktifkan karena sistem otomatis salah menandai konten. Tidak ada tombol banding yang jelas. Pengikut, riwayat, dan penghasilan Anda hilang dalam semalam.

Itu pola Web 2: **terpusat**. Satu perusahaan memegang server, database, dan aturan main. Kelemahannya:

1. **Data Anda bukan milik Anda.** Platform bisa membaca, menjual, atau menghapusnya. Kasus Cambridge Analytica (2018) menunjukkan data puluhan juta pengguna bisa dipakai pihak ketiga tanpa disadari pemiliknya.
2. **Platform risk.** Aturan bisa berubah sepihak. Pada 2023, perubahan kebijakan API Twitter mematikan banyak aplikasi klien yang sudah bertahun-tahun berjalan.
3. **Single point of failure.** Kalau server pusat tumbang atau diretas, semua pengguna terdampak sekaligus.
4. **Perantara di mana-mana.** Kirim uang lintas negara harus lewat bank, bank koresponden, dan lembaga kliring.
5. **Kepercayaan harus diberikan, bukan diverifikasi.** Anda tidak bisa mengecek sendiri apakah saldo Anda benar-benar ada.

> Supaya adil, model terpusat punya alasan kuat untuk ada. Cepat, murah, mudah dipakai, dan ada pihak yang bisa dimintai tanggung jawab. Web3 bukan "lebih baik di segala hal", melainkan menawarkan trade-off yang berbeda.

## Sedikit sejarah

**2008: lahir dari ketidakpercayaan.** Di tengah krisis keuangan global, seseorang bernama samaran Satoshi Nakamoto menerbitkan whitepaper Bitcoin: uang elektronik peer-to-peer tanpa bank sebagai perantara. Blok pertamanya dibuat Januari 2009.

**2013–2015: dari uang ke program.** Vitalik Buterin bertanya: kalau blockchain bisa mencatat transaksi uang, kenapa tidak bisa menjalankan program? Lahirlah Ethereum dengan konsep *smart contract*.

**2014: istilah "Web3" muncul.** Gavin Wood, salah satu pendiri Ethereum, memakainya untuk web yang tidak bergantung pada kepercayaan kepada satu perusahaan.

Empat kejadian yang layak diingat:

**CryptoKitties (2017).** Game mengoleksi kucing digital ini begitu populer sampai membuat jaringan Ethereum macet dan biaya transaksi melonjak. Pelajarannya: blockchain publik punya batas kapasitas.

**Peretasan Ronin Bridge (2022).** Axie Infinity sempat sangat populer di Asia Tenggara. Maret 2022, jembatan antar-blockchain yang dipakainya diretas, kehilangan aset lebih dari 600 juta dolar AS. Ironisnya, celahnya ada di bagian yang dijaga segelintir pihak saja, alias kurang terdesentralisasi.

**Runtuhnya FTX (2022).** FTX adalah bursa kripto *terpusat*. Pengguna menitipkan aset ke perusahaan, persis seperti bank. Ketika perusahaan bangkrut, dana pengguna ikut tertahan. Pelajarannya: memakai aset kripto lewat perantara terpusat justru mengulang masalah Web 2. *Not your keys, not your coins.*

**The Merge (2022).** Kritik terbesar terhadap blockchain adalah boros listrik. September 2022, Ethereum mengganti cara jaringannya mencapai kesepakatan dan memangkas konsumsi energinya lebih dari 99%.

## Analogi: buku kas arisan

Bayangkan arisan RT dengan 20 anggota.

**Cara lama.** Hanya Bu Bendahara yang memegang buku kas. Kalau bukunya hilang, catatan lenyap. Kalau beliau salah catat atau curang, anggota sulit membuktikan. Kalau beliau memutuskan seseorang tidak boleh ikut lagi, ya sudah.

**Cara baru.** Setiap anggota memegang salinan buku kas yang sama persis. Setiap ada setoran:

1. Transaksi diumumkan ke semua anggota.
2. Anggota mengecek: benar tidak Pak Budi punya uang untuk setor?
3. Kalau mayoritas setuju, semua menambahkan baris baru di bukunya masing-masing.
4. Halaman yang sudah terisi tidak bisa dirobek. Kalau ada salinan yang berbeda, 19 orang lain langsung tahu.

Pemetaannya ke istilah teknis:

| Dunia arisan | Dunia Web3 |
| --- | --- |
| Buku kas yang disalin semua anggota | **Blockchain** |
| Setiap anggota pemegang salinan | **Node** |
| Halaman buku kas | **Block** |
| Proses "mayoritas setuju" | **Consensus** |
| Tanda tangan unik | **Private key** dan **digital signature** |
| Nomor anggota yang boleh diketahui semua orang | **Public address** |
| Aturan arisan yang berjalan otomatis | **Smart contract** |

Analogi ini punya batas. Di arisan, tanda tangan bisa dicek karena semua saling kenal wajah. Di internet, Anda tidak pernah bertemu pemilik sebuah alamat wallet. Simpan pertanyaan itu, karena di situlah modul berikutnya dimulai.

## Definisi

**Web3** adalah generasi web yang dibangun di atas jaringan terdesentralisasi, umumnya blockchain, sehingga data dan aturan aplikasi tidak dikendalikan satu pihak. Pengguna berinteraksi lewat wallet yang dikendalikan kunci kriptografi miliknya sendiri, sehingga ia memiliki aset dan identitas digitalnya secara langsung. Logika aplikasinya dijalankan smart contract yang kodenya terbuka dan bisa diverifikasi siapa pun.

## Keunggulan dan tantangan

Karakteristik utamanya: **decentralized** (divalidasi banyak node), **permissionless** (siapa pun bisa membangun di atasnya), **trustless** (cukup verifikasi kode, bukan percaya orangnya), **native ownership** (aset tercatat atas alamat wallet Anda), **transparent**, dan **composable** (contract orang lain bisa dipakai seperti balok LEGO).

Sisi yang jarang dibahas, dan justru paling sering membunuh proyek Web3:

1. **UX masih sulit.** Seed phrase, biaya gas, dan alamat seperti `0x71C7...` membingungkan pengguna awam.
2. **Kesalahan tidak bisa dibatalkan.** Salah kirim atau kehilangan seed phrase? Tidak ada customer service.
3. **Skalabilitas dan biaya.** Blockchain publik jauh lebih lambat dan mahal per operasi dibanding database biasa, karena setiap data disalin dan diverifikasi ribuan kali.
4. **Bug berarti uang hilang.** Kode yang sudah di-deploy sulit diubah. Satu celah bisa dieksploitasi dalam hitungan menit.
5. **Penipuan dan spekulasi.** Rug pull, phishing, dan skema cepat kaya.
6. **Desentralisasi sering hanya di atas kertas.** Banyak aplikasi diam-diam bergantung pada penyedia node atau hosting frontend terpusat.
7. **Privasi.** Transparan juga berarti transaksi Anda bisa dilacak bila alamat wallet terhubung ke identitas asli. Data hampir mustahil dihapus.
8. **Regulasi masih berkembang.** Di Indonesia aset kripto boleh diperdagangkan di platform berizin, tapi bukan alat pembayaran yang sah.

## Arsitekturnya

Di Web 2, alurnya pendek:

```text
Pengguna -> Browser -> Server perusahaan -> Database perusahaan
```

Perusahaan memegang tiga hal sekaligus: identitas Anda, data Anda, dan aturan mainnya.

Di Web3, ketiganya dipisah:

```text
Pengguna -> Frontend dApp
              |
              +-- minta tanda tangan --> Wallet (menyimpan private key)
                                           |
                                           v
                                    Node / RPC provider
                                           |
                                           v
                              Jaringan blockchain (ribuan node)
                                           |
                                           v
                              Smart contract (aturan terbuka)
```

| Yang dipegang | Di Web 2 | Di Web3 |
| --- | --- | --- |
| Identitas | Email + password di server perusahaan | Wallet dengan private key milik Anda |
| Data dan aset | Database perusahaan | Blockchain yang disalin ribuan node |
| Aturan main | Kode server tertutup | Smart contract yang kodenya terbuka |

Misalnya Anda membeli tiket konser berbentuk NFT: Anda klik "Beli", wallet muncul menampilkan rincian dan biaya gas, Anda menyetujui, transaksi dikirim lewat RPC provider, node-node memverifikasi dan memasukkannya ke block baru, smart contract berjalan, lalu frontend membaca blockchain dan menampilkan tiket Anda.

Perhatikan: tidak ada satu pun langkah di mana "admin" bisa menolak Anda sepihak. Tapi perhatikan juga langkah RPC provider. Kalau semua dApp memakai penyedia yang sama, di situlah sentralisasi tersembunyi muncul kembali.

## Kapan Web3 masuk akal: dan kapan tidak

**Masuk akal untuk:** pembayaran lintas negara dengan stablecoin, DeFi, kepemilikan digital lewat NFT (tiket, sertifikat, item game), DAO, dan rantai pasok yang melibatkan banyak pihak yang tidak saling percaya.

**Tidak perlu kalau sebagian besar ini berlaku:**

- Ada satu pihak yang sudah dipercaya semua pengguna.
- Data perlu bisa diubah atau dihapus.
- Butuh respons sangat cepat, volume tinggi, biaya hampir nol.
- Data bersifat rahasia.
- Pengguna belum siap mengelola kunci sendiri dan butuh "lupa password".

> **Aturan praktis:** Web3 bersinar ketika ada *banyak pihak yang tidak saling percaya*, tetapi perlu berbagi *satu catatan yang sama* tentang *nilai atau kepemilikan*. Kalau salah satu unsur itu tidak ada, pertimbangkan ulang.

## Latihan

### Latihan 1: Baca buku kas global

Buka [etherscan.io](https://etherscan.io), klik salah satu transaksi terbaru, lalu catat lima hal:

1. Transaction hash
2. Block
3. From
4. To
5. Transaction fee

Setelah itu klik alamat pengirimnya. Anda bisa melihat seluruh riwayatnya tanpa login dan tanpa izin siapa pun.

**Pertanyaannya:** apa artinya itu bagi privasi, dan apa artinya bagi transparansi?

### Latihan 2: Klasifikasikan

Masukkan tujuh hal berikut ke Web 1, Web 2, atau Web3, lalu tandai terpusat atau terdesentralisasi.

| # | Yang diklasifikasikan |
| --- | --- |
| 1 | Wikipedia |
| 2 | Tokopedia |
| 3 | Bursa kripto tempat Anda mendaftar dengan KTP lalu menitipkan aset |
| 4 | Uniswap |
| 5 | Situs profil sekolah tahun 2001 |
| 6 | MetaMask |
| 7 | Marketplace NFT bermoderasi |

> [!petunjuk]
> Jangan tertipu label "kripto" atau "NFT". Tanyakan dua hal: siapa yang memegang kunci aset, dan siapa yang bisa mengubah aturan.

> [!jawaban]
>
> | Yang diklasifikasikan | Generasi | Kendali |
> | --- | --- | --- |
> | Wikipedia | Web 2 | Terpusat |
> | Tokopedia | Web 2 | Terpusat |
> | Bursa kripto dengan KTP | Web 2 | Terpusat, karena kuncinya dipegang perusahaan |
> | Uniswap | Web3 | Terdesentralisasi, meski frontend-nya dikelola perusahaan |
> | Situs sekolah 2001 | Web 1 | Terpusat |
> | MetaMask | Web3 | Kunci di tangan Anda |
> | Marketplace NFT bermoderasi | Hibrida | Aset Web3, moderasi terpusat |
>
> Pelajarannya: jarang ada aplikasi yang 100% terdesentralisasi, jadi biasakan bertanya *bagian mana* yang terdesentralisasi.

### Latihan 3: Butuh blockchain atau tidak?

Putuskan untuk tiga skenario ini, dan tulis alasan Anda dalam dua tiga kalimat sebelum membuka pembahasan.

| | Skenario |
| --- | --- |
| **A** | Sistem absensi karyawan satu perusahaan |
| **B** | Sertifikat kelulusan dari puluhan kampus yang bisa diverifikasi perusahaan mana pun |
| **C** | Aplikasi kiriman uang pekerja migran ke keluarganya |

> [!pembahasan]
>
> **A, tidak perlu.** Ada satu pihak yang dipercaya, data perlu bisa dikoreksi, dan sifatnya internal. Database biasa lebih murah dan lebih mudah.
>
> **B, layak dipertimbangkan.** Banyak penerbit yang tidak saling terhubung, dan yang dibutuhkan hanyalah bukti keaslian. Tetap simpan data pribadi di luar blockchain, cukup simpan buktinya.
>
> **C, layak dengan catatan.** Transfernya bisa lebih cepat dan murah, tapi ada tantangan UX, penukaran ke rupiah, dan regulasi. Ini contoh teknologi yang cocok tetapi produknya belum tentu mudah.

## Rangkuman

- Web 1 membaca, Web 2 membaca dan menulis, Web3 membaca, menulis, dan **memiliki**.
- Web3 menjawab masalah sentralisasi: data dikuasai platform, aturan bisa berubah sepihak, kepercayaan harus diberikan tanpa bisa diverifikasi.
- Arsitekturnya memisahkan identitas (wallet), data (blockchain), dan aturan main (smart contract) dari kendali satu perusahaan.
- Keunggulannya nyata, dan tantangannya juga nyata.
- "Kripto" tidak otomatis berarti terdesentralisasi. Selalu tanyakan siapa yang memegang kunci.

## Masalah terbuka

Di Web3 tidak ada admin, tidak ada email verifikasi, tidak ada tombol "lupa password". Di analogi arisan, tanda tangan bisa dicek karena semua anggota saling kenal. Tapi di internet, Anda tidak pernah bertemu pemilik sebuah alamat wallet.

Bagaimana Anda membuktikan kepada ribuan orang asing bahwa sebuah transaksi benar-benar Anda yang menyetujui, tanpa pernah memperlihatkan "password" Anda? Dan bagaimana semua orang tahu catatan transaksi itu tidak diubah diam-diam?

Itu isi modul berikutnya: kriptografi dasar, yaitu hash, kunci publik/privat, dan tanda tangan digital.
