---
title: "Proyek Akhir: Platform Komunitas Terdesentralisasi"
description: Rancang, bangun, uji, amankan, dan deploy satu platform komunitas utuh, lalu pertanggungjawabkan setiap keputusan arsitekturnya.
date: 2026-10-25
slug: proyek-akhir-platform-komunitas
tags: tutorial web 3
series: Tutorial Web 3
status: draft
---

> **Proyek penutup kelas Web3.** Anda merancang, membangun, menguji, mengamankan, dan men-deploy satu platform komunitas utuh untuk RT 05: keanggotaan, kas bersama yang dikelola lewat voting, kegiatan dengan tiket, dan aplikasi web yang bisa dipakai warga awam. Yang paling penting, Anda mempertanggungjawabkan **setiap keputusan arsitektur**, termasuk bagian mana yang sengaja **tidak** diletakkan di blockchain.
>
> **Jenis:** Proyek · **Tingkat:** Lanjut · **Estimasi waktu:** ± 30–40 jam (2–3 minggu)
> **Prasyarat:** Seluruh Modul 1–13 dan Proyek 1–4.

## Menutup lingkaran

Kelas ini dimulai dari satu masalah sederhana di Modul 1: **Bu Bendahara memegang buku kas dan uang semua warga**. Sejak itu, setiap modul menjawab satu masalah yang muncul di modul sebelumnya:

| Masalah | Dijawab di |
| --- | --- |
| Bagaimana membuktikan kepemilikan tanpa admin? | Modul 2 (kriptografi) |
| Bagaimana ribuan orang asing sepakat pada satu catatan? | Modul 3 (konsensus), Proyek 1 |
| Bagaimana masuk ke jaringan publik sungguhan? | Modul 4 (Ethereum, wallet, gas) |
| Bagaimana menjalankan aturan tanpa perantara? | Modul 5 (smart contract) |
| Bagaimana memastikan aturan itu benar? | Modul 6 (testing), Proyek 2 |
| Bagaimana nilai yang stabil dan aset unik bisa dipakai di mana saja? | Modul 7 (token) |
| Bagaimana warga awam bisa memakainya? | Modul 8 (frontend) |
| Di mana data besar, data dunia nyata, dan riwayat disimpan? | Modul 9 (IPFS, oracle, indexing), Proyek 3 |
| Bagaimana jika ada yang berniat jahat? | Modul 10 (keamanan) |
| Bagaimana agar terjangkau? | Modul 11 (Layer 2, gas) |
| Siapa yang memutuskan penggunaan kas? | Modul 12 (DeFi, DAO), Proyek 4 |
| Bagaimana siap dipakai orang sungguhan? | Modul 13 (produksi) |

Proyek Akhir menggabungkan semua jawaban itu menjadi satu sistem, dan menguji kemampuan yang paling dicari dari seorang developer Web3: **menimbang trade-off**.

## Cerita proyek

RT 05 ingin sebuah platform bernama **"Warga Berdaya"** dengan kebutuhan berikut:

1. **Keanggotaan:** setiap kepala keluarga yang terdaftar mendapat kartu anggota digital dan hak suara.
2. **Kas bersama:** iuran warga masuk ke kas. Kas hanya bisa dipakai lewat proposal yang disetujui warga.
3. **Kegiatan:** pengurus bisa membuat kegiatan (lomba 17 Agustus, kerja bakti) dengan tiket atau pendaftaran, lengkap dengan check-in di lokasi.
4. **Transparansi:** siapa pun bisa melihat riwayat pemasukan, pengeluaran, dan hasil voting.
5. **Ramah warga awam:** warga lansia bisa ikut voting tanpa memegang ETH dan tanpa memahami gas.
6. **Aman dan bisa diawasi:** ada rencana jika terjadi insiden.

> **Ini bukan proyek "masukkan semuanya ke blockchain".** Nilai tertinggi diberikan kepada keputusan yang berani dan beralasan, misalnya "data alamat rumah warga sengaja tidak disimpan on-chain karena aturan perlindungan data pribadi". Ingat aturan praktis dari Modul 1: Web3 bersinar ketika ada banyak pihak yang tidak saling percaya, berbagi satu catatan tentang nilai atau kepemilikan.

## Arsitektur referensi

Arsitektur di bawah adalah **titik awal**, bukan jawaban wajib. Anda boleh mengubahnya, asalkan setiap perubahan dijelaskan di dokumen keputusan arsitektur.

```text
PENGGUNA                 FRONTEND                 TESTNET LAYER 2
┌───────────────┐        ┌──────────────┐         ┌──────────────────────────────┐
│ Warga         │        │              │         │ KartuAnggota                 │
│ (MetaMask)    ├───────►│ dApp React   ├────────►│  ERC-721, tidak bisa dipindah│
│               │        │ + wagmi      │         ├──────────────────────────────┤
│ Warga awam    │        │              ├────────►│ TokenSuara (ERC20Votes)      │
│ (tanda tangan ├───────►│              │         ├──────────────────────────────┤
│  saja)        │        │              ├────────►│ Kegiatan / Tiket             │
│               │        │              │         │  ERC-721 + check-in          │
│ Pengurus /    ├───────►│              │         ├──────────────────────────────┤
│ panitia       │        └──────┬───────┘    ┌───►│ DaoRT (Governor)             │
└───────────────┘               │            │    └───────────────┬──────────────┘
                                ▼            │       proposal lolos│
                        ┌───────────────┐    │                    ▼
                        │ Relayer       ├────┘    ┌──────────────────────────────┐
                        │ castVoteBySig │         │ Timelock = Kas RT            │
                        │ delegateBySig │         └───────────────┬──────────────┘
                        └───────────────┘             bayar kegiatan

DI LUAR BLOCKCHAIN
┌────────────────────┬──────────────────────┬─────────────────┬────────────────────┐
│ IPFS               │ Indexing             │ Monitoring      │ Database biasa     │
│ metadata kartu     │ riwayat kas & voting │ & peringatan    │ data pribadi warga │
│ dan tiket          │ (dari event)         │ (dari event)    │                    │
└────────────────────┴──────────────────────┴─────────────────┴────────────────────┘
```

### Komponen dan asalnya

| Komponen | Fungsi | Bisa dibangun dari |
| --- | --- | --- |
| Kartu anggota | Bukti keanggotaan, sumber hak suara | `KartuAnggota` (Modul 7) + hook `_update` yang menolak pemindahan (Proyek 3) |
| Token suara | Bobot suara dengan snapshot | `TokenWarga` (Proyek 4) |
| DAO dan kas | Proposal, voting, timelock | `DaoRT` + `TimelockController` (Proyek 4) |
| Kegiatan dan tiket | Pendaftaran, stok, check-in | `TiketAcara` (Proyek 3) |
| Iuran | Setoran warga ke kas | Pola setor dari Arisan (Proyek 2) atau transfer langsung ke timelock |
| Frontend | Antarmuka warga dan pengurus | Modul 8, Proyek 3 |
| Voting tanpa gas | Warga awam cukup menandatangani | Modul 13 |
| Riwayat | Pemasukan, pengeluaran, voting | Indexing event (Modul 9) |
| Monitoring | Peringatan transaksi besar, upgrade, pause | Modul 13 |

### Keputusan yang harus Anda ambil sendiri

Tidak ada jawaban tunggal untuk pertanyaan-pertanyaan ini. Setiap pilihan harus dijelaskan di dokumen keputusan arsitektur.

1. **Satu orang satu suara, atau berdasarkan jumlah token?** Jika satu kartu anggota = satu suara, bagaimana mencegah satu orang memegang banyak kartu (ingat Sybil attack di Modul 3 dan 5)?
2. **Siapa yang menerbitkan kartu anggota?** Pengurus? Lewat proposal DAO? Apa yang terjadi jika warga pindah rumah?
3. **Kas memakai ETH, stablecoin, atau poin internal?** Pertimbangkan volatilitas, regulasi (Modul 13), dan kemudahan warga.
4. **Contract upgradeable atau immutable?** Jika upgradeable, siapa pemegang haknya?
5. **Siapa yang membayar gas relayer**, dan bagaimana mencegah relayer disalahgunakan untuk spam?
6. **Data apa yang sengaja disimpan di luar blockchain?**

## Opsi tools

| Lapisan | Pilihan yang disarankan | Alternatif |
| --- | --- | --- |
| Contract | Solidity + OpenZeppelin (Contracts dan Contracts Upgradeable) | Solady untuk optimasi |
| Testing | Foundry: unit, fuzz, invariant | Hardhat |
| Analisis statis | Slither atau Aderyn | — |
| Jaringan | Anvil → testnet Layer 2 (Base Sepolia, OP Sepolia, Arbitrum Sepolia) | Sepolia L1 |
| Metadata | IPFS dengan layanan pinning | Arweave |
| Frontend | Vite + React + wagmi + viem | Next.js, RainbowKit |
| Relayer | Server kecil Node.js dengan viem dan kunci relayer khusus | Layanan paymaster ERC-4337 |
| Indexing | `getLogs` dengan cache, atau Ponder | The Graph |
| Monitoring | Skrip `watchContractEvent` + bot Telegram | Tenderly, Forta |
| Hosting frontend | Vercel atau Netlify, bonus di IPFS | — |

## Spesifikasi wajib

### A. Dokumen (dikerjakan lebih dulu)

- [ ] **A1, Dokumen Keputusan Arsitektur** (ADR): untuk setiap keputusan di atas, tulis konteks, pilihan yang dipertimbangkan, keputusan, dan konsekuensinya.
- [ ] **A2, Tabel on-chain vs off-chain** untuk setiap jenis data, beserta alasannya.
- [ ] **A3, Model ancaman:** siapa penyerang yang mungkin (warga curang, pengurus curang, orang luar, bot), apa yang mereka incar, dan pertahanan Anda.
- [ ] **A4, Daftar kekuasaan admin:** setiap peran, pemegangnya, dan alasannya.

### B. Smart contract

- [ ] **B1** Keanggotaan: kartu anggota NFT yang tidak bisa dipindahkan, diterbitkan lewat proses yang Anda jelaskan di ADR.
- [ ] **B2** Hak suara dengan snapshot (`ERC20Votes` atau `ERC721Votes`).
- [ ] **B3** DAO dengan Governor dan Timelock yang memegang kas. Admin dilepas atau diserahkan ke DAO.
- [ ] **B4** Kegiatan dengan pendaftaran atau tiket, kuota, dan check-in oleh panitia.
- [ ] **B5** Minimal satu proposal yang memanggil contract lain (mendanai kegiatan, menunjuk panitia).
- [ ] **B6** Mendukung voting dengan tanda tangan (`castVoteBySig`).

### C. Kualitas dan keamanan

- [ ] **C1** Unit test untuk semua jalur sukses dan gagal, termasuk "siapa yang ditolak".
- [ ] **C2** Minimal 2 fuzz test dan 1 invariant test untuk sifat terpenting, misalnya "kas hanya berkurang lewat proposal yang dieksekusi".
- [ ] **C3** Coverage baris di atas 85% untuk logika buatan sendiri.
- [ ] **C4** Laporan analisis statis beserta tanggapan atas setiap peringatan.
- [ ] **C5** Checklist keamanan Modul 10 terisi lengkap.

### D. Frontend dan pengalaman pengguna

- [ ] **D1** Halaman beranda: ringkasan kas, proposal aktif, kegiatan mendatang.
- [ ] **D2** Halaman proposal: daftar, detail, hasil, tombol vote biasa, dan tombol "vote tanpa gas".
- [ ] **D3** Halaman kegiatan: daftar, pendaftaran atau beli tiket, dan "tiket saya" dengan bukti tanda tangan untuk check-in.
- [ ] **D4** Halaman transparansi: riwayat pemasukan dan pengeluaran kas dari event.
- [ ] **D5** Status transaksi, pesan error ramah, dan peringatan jaringan yang salah.

### E. Deploy dan operasional

- [ ] **E1** Skrip deploy yang bisa diulang, dari nol sampai semua peran terpasang.
- [ ] **E2** Deploy ke testnet Layer 2 dengan kode terverifikasi.
- [ ] **E3** Relayer berjalan untuk voting tanpa gas, dengan batasan sederhana agar tidak disalahgunakan.
- [ ] **E4** Monitoring yang mengirim peringatan untuk event penting.
- [ ] **E5** Runbook insiden tertulis.

### F. Demo dan presentasi

- [ ] **F1** Video demo 5–10 menit: warga mendaftar, mengajukan proposal, voting (termasuk tanpa gas), proposal dieksekusi, kas membiayai kegiatan, warga membeli tiket, check-in.
- [ ] **F2** README lengkap: cara menjalankan lokal, alamat contract, tautan frontend, hash transaksi demo.
- [ ] **F3** Refleksi akhir.

## Langkah pengerjaan bertahap

### Minggu 1: Rancang dulu, baru koding

**Tahap 1: Dokumen sebelum kode.** Kerjakan A1–A4 sebelum menulis contract. Contoh satu entri ADR:

> **ADR-003: Data pribadi warga tidak disimpan on-chain**
>
> **Konteks:** pengurus perlu tahu nama dan alamat rumah pemegang kartu anggota.
> **Pilihan:** (a) simpan di metadata NFT di IPFS, (b) simpan hash-nya saja on-chain, (c) simpan di database pengurus, dan on-chain hanya ID kartu.
> **Keputusan:** (c).
> **Alasan:** data di blockchain dan IPFS publik bersifat permanen dan publik, sehingga bertentangan dengan prinsip perlindungan data pribadi. Hash nama juga mudah ditebak (Modul 2).
> **Konsekuensi:** verifikasi "kartu ini milik keluarga siapa" bergantung pada database pengurus. Ini titik kepercayaan yang kami terima secara sadar.

**Tahap 2: Contract inti.** Mulailah dari solusi referensi Proyek 3 dan 4, lalu sesuaikan:

- Kartu anggota: turunan `KartuAnggota` dari Modul 7, ditambah hook `_update` yang menolak pemindahan setelah diterbitkan (pola Proyek 3).
- Jika memilih "satu kartu satu suara", pelajari `ERC721Votes` dari OpenZeppelin sebagai pengganti `ERC20Votes`.
- Hubungkan Governor dan Timelock persis seperti Proyek 4.

### Minggu 2: Integrasi dan keamanan

**Tahap 3: Proposal lintas contract.** Contoh calldata untuk proposal "danai kegiatan lomba sebesar 1 ETH dan tunjuk Sari sebagai panitia":

```solidity
address[] memory targets = new address[](2);
uint256[] memory values = new uint256[](2);
bytes[] memory calldatas = new bytes[](2);

targets[0] = address(kegiatan);   values[0] = 1 ether;
calldatas[0] = abi.encodeCall(Kegiatan.danai, (idLomba));

targets[1] = address(kegiatan);   values[1] = 0;
calldatas[1] = abi.encodeCall(Kegiatan.aturPanitia, (sari, true));
```

Agar ini bekerja, pemilik contract `Kegiatan` harus **Timelock**, bukan alamat pribadi Anda.

**Tahap 4: Test berlapis.** Unit, fuzz, dan invariant. Contoh invariant yang kuat: "saldo kas hanya berkurang ketika ada event eksekusi proposal di blok yang sama", atau "jumlah kartu anggota aktif sama dengan total suara yang bisa dipakai".

**Tahap 5: Tinjauan keamanan.** Jalankan analisis statis, isi checklist Modul 10, lalu minta satu teman berperan sebagai penyerang selama satu jam. Catat temuannya di laporan.

### Minggu 3: Frontend, deploy, dan operasional

**Tahap 6: Frontend.** Gunakan kembali `Koneksi`, `useTx`, dan pola Proyek 3. Untuk voting tanpa gas, gunakan `useSignTypedData` dari wagmi dengan tipe `Ballot`, lalu kirim hasilnya ke relayer.

**Tahap 7: Relayer sederhana.** Server kecil yang menerima `{proposalId, support, voter, signature}`, memeriksa bahwa `voter` memegang kartu anggota dan belum memilih, lalu memanggil `castVoteBySig` dengan kunci relayer. Batasi jumlah permintaan per alamat agar dana gas relayer tidak dikuras. **Jangan pernah menaruh kunci relayer di frontend.**

**Tahap 8: Deploy, monitoring, dan demo.** Deploy ke testnet L2, isi kas, jalankan skenario demo lengkap, nyalakan monitoring, lalu rekam video.

## Bahan referensi dari proyek sebelumnya

Proyek Akhir tidak memiliki satu solusi referensi, karena keputusan arsitektur Anda bisa berbeda. Gunakan solusi teruji dari halaman sebelumnya sebagai balok bangunan:

| Butuh | Ambil dari |
| --- | --- |
| Pola state machine dan pull payment | Proyek 2: Smart Contract Arisan |
| ERC-721, hook `_update`, check-in, bukti tanda tangan, `useTx` | Proyek 3: dApp Tiket Acara |
| Governor, Timelock, ERC20Votes, skrip deploy, alur `cast` | Proyek 4: Mini DAO |
| AMM, composability, perlindungan slippage | Modul 12 |
| Reentrancy, kontrol akses, invariant test | Modul 10 |
| Upgradeable, pause, monitoring, voting tanpa gas | Modul 13 |
| Metadata IPFS, oracle, indexing event | Modul 9 |
| Optimasi gas dan deploy L2 | Modul 11 |

## Kriteria penilaian

| Kriteria | Bobot | Ciri jawaban yang sangat baik |
| --- | --- | --- |
| Keputusan arsitektur (A1–A4) | 20% | Setiap pilihan beralasan, trade-off diakui jujur, ada keputusan sadar untuk *tidak* memakai blockchain |
| Kebenaran contract (B1–B6) | 20% | Semua alur berjalan, kekuasaan admin minimal dan jelas |
| Kualitas dan keamanan (C1–C5) | 20% | Test berlapis, invariant bermakna, temuan keamanan ditindaklanjuti |
| Frontend dan UX (D1–D5) | 15% | Warga awam bisa memakai tanpa bantuan, termasuk voting tanpa gas |
| Deploy dan operasional (E1–E5) | 15% | Bisa diulang dari nol, monitoring aktif, runbook realistis |
| Demo dan refleksi (F1–F3) | 10% | Demo lancar dan refleksi yang jujur tentang keterbatasan |

**Predikat:**

- **Istimewa (≥ 90):** siap ditunjukkan sebagai portofolio profesional.
- **Baik (75–89):** semua fitur wajib berjalan dengan dokumentasi memadai.
- **Cukup (60–74):** fitur inti berjalan, beberapa aspek kualitas atau operasional belum lengkap.
- **Perlu perbaikan (di bawah 60):** lengkapi bagian yang kurang, lalu ajukan ulang.

**Tantangan bonus:**

1. Frontend di-hosting di IPFS, sehingga pintu masuk aplikasi juga terdesentralisasi.
2. Kas memakai sebagian dana untuk menukar token lewat AMM (Modul 12) melalui proposal.
3. Guardian multisig darurat dengan hak membatalkan proposal berbahaya, disertai analisis dampaknya terhadap desentralisasi.
4. Smart wallet dengan passkey untuk warga awam (ERC-4337 atau EIP-7702).

## Refleksi akhir

Yang telah Anda kuasai sepanjang kelas:

- Memahami **kenapa** Web3 ada dan kapan ia tidak diperlukan.
- Membangun dari bawah: hash, tanda tangan, konsensus, sampai blockchain mini.
- Menulis, menguji, mengamankan, dan men-deploy smart contract profesional.
- Membangun dApp lengkap dengan token, NFT, IPFS, oracle, dan indexing.
- Menimbang biaya, desentralisasi, keamanan, dan pengalaman pengguna.
- Merancang tata kelola bersama dan membawa sistem ke kondisi siap produksi.

Pertanyaan refleksi untuk README Anda. Jawab dengan jujur, karena tidak ada jawaban benar atau salah:

1. Setelah membangun semuanya, bagian mana dari platform Anda yang **benar-benar** butuh blockchain? Bagian mana yang sebenarnya cukup dengan database biasa?
2. Di mana saja titik kepercayaan (sentralisasi tersembunyi) dalam sistem Anda? Apakah warga RT 05 benar-benar lebih baik dibanding memiliki Bu Bendahara yang jujur?
3. Apa satu hal yang akan Anda lakukan berbeda jika memulai proyek ini dari awal?
4. Jika platform ini dipakai oleh 10.000 RT di seluruh Indonesia, apa yang harus diubah?

> **Selamat!** Anda telah menyelesaikan seluruh kurikulum Web3. Anda tidak hanya tahu cara membangun aplikasi terdesentralisasi, tetapi juga tahu kapan sebaiknya **tidak** membangunnya, dan itulah yang membedakan developer yang matang.
>
> Langkah lanjutan: berlatih tantangan keamanan (CTF) seperti Ethernaut dan Damn Vulnerable DeFi, ikut kompetisi audit, berkontribusi ke proyek open source Web3, atau membangun dApp untuk masalah nyata di komunitas Anda sendiri.
