---
title: Belajar Web3 dari Nol: Peta Belajar 13 Modul
description: Rute belajar Web3 yang disusun dari masalah ke solusi, bukan dari daftar istilah. Setiap modul menjawab pertanyaan yang ditinggalkan modul sebelumnya.
date: 2026-10-07
slug: belajar-web3-dari-nol-peta-belajar
tags: tutorial web 3
series: Tutorial Web 3
status: draft
---

Kebanyakan materi Web3 dimulai dari daftar istilah: blockchain, token, DAO, DeFi. Masalahnya, istilah tanpa konteks cepat menguap. Anda hafal definisinya, tapi tidak tahu kapan harus memakainya, apalagi kapan sebaiknya tidak dipakai.

Seri ini disusun terbalik. Setiap modul dimulai dari satu masalah konkret, lalu teknologinya muncul sebagai jawaban. Dan setiap modul ditutup dengan masalah baru yang jadi pintu masuk modul berikutnya.

## Prasyarat

Dasar JavaScript (variabel, fungsi, `async/await`), terbiasa dengan terminal, dan Git dasar. Tidak perlu latar belakang kriptografi atau keuangan.

## Rantai masalahnya

Ini inti dari cara seri ini disusun. Bacalah sebagai satu alur, bukan daftar:

1. Web 2 terpusat. **Bagaimana membuktikan kepemilikan tanpa admin?**
2. Kriptografi menjawabnya. **Tapi bagaimana banyak pihak menyepakati satu catatan?**
3. Konsensus menjawabnya. **Bagaimana masuk ke jaringan publik sungguhan?**
4. Ethereum dan wallet. **Bagaimana menjalankan aturan, bukan sekadar transfer?**
5. Smart contract. **Bagaimana memastikan kodenya benar sebelum jadi permanen?**
6. Testing dan deploy. **Bagaimana token buatan saya dikenali aplikasi lain?**
7. Standar token. **Bagaimana pengguna awam memakainya?**
8. Frontend dApp. **Di mana menyimpan gambar dan data dunia nyata?**
9. IPFS, oracle, indexing. **Bagaimana kalau ada yang menyerang?**
10. Keamanan. **Bagaimana kalau biayanya terlalu mahal?**
11. Layer 2. **Bagaimana protokol saling terhubung dan dikelola bersama?**
12. DeFi dan DAO. **Bagaimana supaya siap dipakai publik?**
13. Siap produksi.

## Peta modul

| No | Modul | Masalah yang diselesaikan | Tingkat |
| --- | --- | --- | --- |
| 1 | Pengantar Web3 | Data dan aturan main di Web 2 dikendalikan satu perusahaan. Apa alternatifnya, dan kapan alternatif itu layak? | Pemula |
| 2 | Kriptografi dasar | Tanpa admin dan tombol "lupa password", bagaimana membuktikan sebuah akun benar-benar milik Anda? | Pemula |
| 3 | Blockchain dan konsensus | Ribuan komputer yang tidak saling kenal harus sepakat pada satu buku kas, tanpa pemimpin. | Pemula |
| 4 | Ethereum, wallet, transaksi | Bagaimana berinteraksi dengan jaringan publik, dan siapa yang membayar biaya komputasinya? | Pemula |
| 5 | Smart contract dengan Solidity | Bagaimana menjalankan aturan bisnis di atas blockchain tanpa perantara? | Menengah |
| 6 | Testing dan deploy | Contract sulit diubah setelah deploy dan bug berarti uang hilang. | Menengah |
| 7 | Standar token ERC-20 dan ERC-721 | Bagaimana agar token kompatibel di wallet dan aplikasi mana pun? | Menengah |
| 8 | Frontend dApp dengan viem dan wagmi | Pengguna awam tidak akan memanggil contract lewat terminal. | Menengah |
| 9 | IPFS, oracle, indexing | Menyimpan gambar di blockchain sangat mahal, dan contract tidak tahu harga dunia nyata. | Menengah |
| 10 | Keamanan smart contract | dApp Anda memegang aset bernilai dan bisa diserang siapa saja. | Lanjut |
| 11 | Layer 2 dan optimasi gas | Biaya di Layer 1 mahal dan lambat saat ramai. | Lanjut |
| 12 | DeFi dan DAO | Bagaimana contract dirakit seperti LEGO, dan dikelola komunitas tanpa pemilik? | Lanjut |
| 13 | Web3 siap produksi | Seed phrase, upgradeability, monitoring, dan regulasi. | Lanjut |

## Proyek sebagai checkpoint

Teori tanpa praktik tidak bertahan. Setiap dua sampai tiga modul ada satu proyek:

- **Proyek 1: Blockchain mini (JavaScript).** Membangun rantai blok, hashing, tanda tangan transaksi, dan konsensus sederhana dari nol.
- **Proyek 2: Smart contract arisan di testnet Sepolia.** Menggabungkan wallet, Solidity, dan testing jadi satu contract teruji yang berjalan di jaringan publik.
- **Proyek 3: dApp tiket acara berbasis NFT.** Standar token, frontend, dan IPFS jadi satu aplikasi utuh.
- **Proyek 4: Mini DAO pengelola kas komunitas di Layer 2.** Keamanan, optimasi gas, dan governance.
- **Proyek Akhir: Platform komunitas terdesentralisasi.** Semuanya sekaligus, plus dokumen keputusan "kenapa bagian ini on-chain dan bagian itu off-chain".

## Struktur tiap modul

Formatnya tetap, supaya Anda tahu apa yang diharapkan:

1. **Pengenalan.** Jembatan dari modul sebelumnya, masalah dulu, lalu analogi sehari-hari.
2. **Cara kerja.** Bagaimana komponennya bekerja.
3. **Opsi tools.** Kategori, fungsi, contoh, dan kapan memilih yang mana.
4. **Latihan bertahap.** Terpandu, lalu berpetunjuk, lalu mandiri.
5. **Rangkuman.** Poin kunci dan masalah terbuka berikutnya.
6. **Kuis.** Untuk mengecek pemahaman sendiri.

## Satu hal yang perlu diluruskan di awal

Tujuan akhir seri ini bukan membuat Anda jadi penganut Web3. Tujuannya adalah membuat Anda mampu merancang, membangun, menguji, mengamankan, dan men-deploy sebuah dApp, **sekaligus tahu kapan Web3 tidak perlu dipakai sama sekali**.

Bagian terakhir itu sering hilang dari materi lain, padahal justru itu yang membedakan engineer dari penjual ide. Database biasa masih jadi jawaban yang benar untuk sebagian besar masalah.

Mulai dari Modul 1: evolusi web dan masalah sentralisasi.
