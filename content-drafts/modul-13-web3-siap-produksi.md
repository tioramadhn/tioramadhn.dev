---
title: "Modul 13: Web3 Siap Produksi"
description: Jarak antara "berfungsi di testnet" dan "siap dipakai orang sungguhan": account abstraction, upgradeability, monitoring, dan regulasi.
date: 2026-10-24
slug: modul-13-web3-siap-produksi
tags: tutorial web 3
series: Tutorial Web 3
status: draft
---

DAO RT 05 berjalan di testnet. Lalu bayangkan hari pertama penggunaannya:

1. Bu Siti tidak punya wallet, bingung dengan seed phrase, dan tidak punya ETH untuk gas.
2. Seminggu setelah peluncuran, ditemukan bug kecil. Contract tidak bisa diubah.
3. Tidak ada yang tahu kalau ada transaksi mencurigakan di kas pada tengah malam.
4. Warga bertanya soal legalitas dan pajak.

Modul terakhir ini membahas jarak antara **"berfungsi di testnet"** dan **"siap dipakai orang sungguhan"**. Banyak proyek Web3 gagal justru di jarak ini.

| Jurang | Kondisi sekarang | Dampak |
| --- | --- | --- |
| **Pengalaman pengguna** | Wallet EOA: seed phrase, harus punya ETH, satu kunci untuk segalanya | Pengguna awam menyerah sebelum mulai |
| **Perbaikan bug** | Contract immutable | Bug harus hidup selamanya |
| **Pengawasan** | Tidak ada yang memantau | Peretasan baru diketahui setelah dana habis |
| **Hukum** | Belum dipikirkan | Risiko pelanggaran aturan data, keuangan, dan pajak |

## Empat analogi

**Account abstraction = rumah dengan kunci pintar.** Wallet EOA seperti rumah dengan satu kunci fisik: hilang ya hilang. Smart wallet seperti kunci pintar: bisa pakai sidik jari, bisa butuh dua orang untuk membuka brankas, bisa diatur batas harian, bisa dipulihkan lewat keluarga tepercaya.

**Relayer/paymaster = prangko berbayar balasan.** Bu Siti cukup menulis dan menandatangani surat suara. Panitia yang menempelkan prangko dan mengantarkannya. Isinya tetap keputusan Bu Siti, dan panitia tidak bisa mengubahnya tanpa merusak tanda tangan.

**Proxy upgradeable = toko dengan alamat tetap tapi bisa ganti pengelola.** Pelanggan selalu datang ke alamat sama, isi gudang tetap di sana. Yang diganti hanya "buku SOP" pengelolanya. Bahayanya, pihak yang berhak mengganti buku SOP bisa memasukkan aturan yang merugikan.

**Pause = tombol darurat di eskalator.**

| Analogi | Konsep teknis |
| --- | --- |
| Kunci pintar | **Smart contract wallet** (ERC-4337, EIP-7702) |
| Brankas yang butuh dua orang | **Multisig** |
| Panitia yang menempelkan prangko | **Relayer** atau **paymaster** |
| Surat suara bertanda tangan | Pesan **EIP-712** (`castVoteBySig`, `delegateBySig`) |
| Alamat toko tetap | **Proxy** (ERC-1967) |
| Buku SOP pengelola | **Implementation contract** |
| Tombol darurat | **Pausable** |
| Satpam malam | **Monitoring** |

## Gas disponsori dengan tanda tangan

```text
Bu Siti (tanpa ETH)          Relayer panitia (punya ETH)      Contract DAO
       |                               |                            |
       | tanda tangani EIP-712:        |                            |
       | Ballot(proposalId, setuju,    |                            |
       |        voter, nonce)          |                            |
       |-- kirim tanda tangan (gratis)->|                           |
       |                               |-- castVoteBySig(...) ----->|
       |                               |   + bayar gas              |
       |                               |                            | pulihkan penanda tangan,
       |                               |                            | cek nonce, hitung suara
```

**EIP-712** adalah standar tanda tangan data terstruktur: wallet menampilkan isi pesan dengan jelas (bukan teks acak), dan tanda tangannya terikat pada **nama contract, versi, chain ID, dan alamat contract**. Ditambah **nonce**, tanda tangan tidak bisa diputar ulang, persis seperti checklist replay tanda tangan dari modul keamanan.

Governor dan ERC20Votes dari OpenZeppelin sudah menyediakan `castVoteBySig` dan `delegateBySig`. ERC-4337 (2023) dan EIP-7702 (2025) menggeneralisasi ide yang sama untuk transaksi apa pun.

## Proxy UUPS

```text
Pengguna --panggil setor()--> Proxy ERC-1967
                              (menyimpan: saldo, owner, alamat implementasi)
                                    | delegatecall: jalankan kode V1
                                    | DI ATAS storage proxy
                                    v
                            Implementation V1
                                    ^
Owner (timelock/multisig) --upgradeToAndCall(V2)--> ... Implementation V2
```

- **delegatecall** menjalankan kode implementation, tapi membaca dan menulis **storage milik proxy**. Karena itu data tetap ada setelah upgrade.
- Proxy tidak memakai constructor implementation. Inisialisasi lewat `initialize` yang hanya boleh dipanggil **sekali**.
- Constructor implementation memanggil `_disableInitializers()` agar implementation itu sendiri tidak bisa diinisialisasi orang lain, pelajaran langsung dari Parity.

**Aturan storage saat upgrade:** variabel lama tidak boleh dihapus, diubah tipenya, atau diubah urutannya. Variabel baru hanya boleh ditambahkan **di bawah**.

### Latihan 1: Kas yang bisa di-upgrade dan dihentikan

```solidity
/// @title Kas RT versi 1: bisa di-upgrade (UUPS) dan dihentikan sementara saat darurat
contract KasRTV1 is Initializable, UUPSUpgradeable, OwnableUpgradeable, PausableUpgradeable {
    mapping(address => uint256) public saldo;

    error SaldoKurang();
    error TransferGagal();

    event Setor(address indexed warga, uint256 jumlah);
    event Tarik(address indexed warga, uint256 jumlah);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers(); // implementation tidak boleh diinisialisasi siapa pun
    }

    /// @notice Pengganti constructor untuk proxy. Hanya bisa dipanggil sekali.
    function initialize(address pemilik) external initializer {
        __Ownable_init(pemilik);
        __Pausable_init();
    }

    function setor() external payable whenNotPaused {
        saldo[msg.sender] += msg.value;
        emit Setor(msg.sender, msg.value);
    }

    function tarik(uint256 jumlah) external whenNotPaused {
        if (saldo[msg.sender] < jumlah) revert SaldoKurang();
        saldo[msg.sender] -= jumlah;
        (bool ok, ) = msg.sender.call{value: jumlah}("");
        if (!ok) revert TransferGagal();
        emit Tarik(msg.sender, jumlah);
    }

    function hentikan() external onlyOwner { _pause(); }
    function lanjutkan() external onlyOwner { _unpause(); }

    function versi() external pure virtual returns (string memory) { return "1"; }

    /// @dev Hanya pemilik (idealnya timelock DAO) yang boleh meng-upgrade
    function _authorizeUpgrade(address) internal override onlyOwner {}
}

/// @title Versi 2: variabel BARU hanya ditambahkan DI BAWAH variabel lama
contract KasRTV2 is KasRTV1 {
    uint256 public batasHarian;                       // slot baru, setelah semua slot V1
    mapping(address => mapping(uint256 => uint256)) public ditarikPadaHari;

    error MelebihiBatasHarian();

    function aturBatasHarian(uint256 batas) external onlyOwner { batasHarian = batas; }

    function tarikDenganBatas(uint256 jumlah) external whenNotPaused {
        uint256 hari = block.timestamp / 1 days;
        if (batasHarian != 0 && ditarikPadaHari[msg.sender][hari] + jumlah > batasHarian) revert MelebihiBatasHarian();
        if (saldo[msg.sender] < jumlah) revert SaldoKurang();
        ditarikPadaHari[msg.sender][hari] += jumlah;
        saldo[msg.sender] -= jumlah;
        (bool ok, ) = msg.sender.call{value: jumlah}("");
        if (!ok) revert TransferGagal();
        emit Tarik(msg.sender, jumlah);
    }

    function versi() external pure override returns (string memory) { return "2"; }
}
```

Test yang paling penting:

```solidity
function test_UpgradeMempertahankanData() public {
    address alamatSebelum = address(kas);
    KasRTV2 v2 = new KasRTV2();
    vm.prank(pengurus);
    kas.upgradeToAndCall(address(v2), "");

    KasRTV2 kas2 = KasRTV2(address(kas));
    assertEq(address(kas2), alamatSebelum);   // alamat sama
    assertEq(kas2.versi(), "2");              // logika baru
    assertEq(kas2.saldo(budi), 3 ether);      // data lama tetap ada
    assertEq(kas2.owner(), pengurus);
}

function test_RevertImplementasiTidakBisaDiinisialisasi() public {
    KasRTV1 implementasi = new KasRTV1();
    vm.expectRevert(Initializable.InvalidInitialization.selector);
    implementasi.initialize(budi);
}

function test_PauseSaatDarurat() public {
    vm.prank(pengurus);
    kas.hentikan();
    vm.prank(budi);
    vm.expectRevert(PausableUpgradeable.EnforcedPause.selector);
    kas.tarik(1 ether);
}
```

Alamat sama, data lama tetap, logika baru aktif.

Tapi kemampuan upgrade juga berbahaya. Pada Agustus 2022, sebuah upgrade rutin di bridge **Nomad** menginisialisasi satu nilai penting dengan cara yang membuat pesan palsu dianggap sah. Begitu satu orang menemukan caranya, ratusan alamat lain menyalin transaksinya, dan sekitar 190 juta dolar terkuras dalam beberapa jam. **Setiap upgrade bisa memasukkan bug baru**, jadi perlakukan seperti deploy baru.

### Latihan 2: Satpam malam untuk kas

```javascript
import { createPublicClient, http, parseAbi, formatEther, parseEther } from 'viem'
import { foundry } from 'viem/chains'

const KAS = process.env.ALAMAT_KAS
const BATAS_WASPADA = parseEther(process.env.BATAS_WASPADA ?? '1')

const client = createPublicClient({ chain: foundry, transport: http(), pollingInterval: 500 })
const abi = parseAbi([
  'event Setor(address indexed warga, uint256 jumlah)',
  'event Tarik(address indexed warga, uint256 jumlah)',
  'event Paused(address account)',
  'event Upgraded(address indexed implementation)',
])

function kirimPeringatan(pesan) {
  // Di produksi: kirim ke Telegram, email, atau sistem on-call
  console.log(`🚨 PERINGATAN: ${pesan}`)
}

client.watchContractEvent({
  address: KAS,
  abi,
  onLogs: (logs) => {
    for (const log of logs) {
      const { eventName, args } = log
      if (eventName === 'Tarik' && args.jumlah >= BATAS_WASPADA) {
        kirimPeringatan(`penarikan besar ${formatEther(args.jumlah)} ETH oleh ${args.warga}`)
      } else if (eventName === 'Upgraded') {
        kirimPeringatan(`contract di-upgrade ke ${args.implementation}`)
      } else if (eventName === 'Paused') {
        kirimPeringatan(`kas DIHENTIKAN oleh ${args.account}`)
      } else {
        console.log(`ℹ️  ${eventName}`)
      }
    }
  },
})
```

```text
ℹ️  Setor: 3 ETH 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
ℹ️  Tarik: 0.1 ETH 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
🚨 PERINGATAN: penarikan besar 2 ETH oleh 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
🚨 PERINGATAN: kas DIHENTIKAN oleh 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

Yang layak dipantau: event bernilai besar, event administratif (`Upgraded`, `Paused`, `OwnershipTransferred`), perubahan saldo kas yang drastis, dan proposal DAO yang memindahkan dana besar.

### Latihan 3: Bu Siti memilih tanpa ETH

```solidity
/// @notice Bu Siti tidak punya ETH. Ia hanya MENANDATANGANI. Relayer yang membayar gas.
function test_DelegasiDanVotingTanpaGas() public {
    assertEq(siti.balance, 0); // Bu Siti tidak punya ETH sama sekali

    // 1. Bu Siti menandatangani delegasi (gratis); relayer yang mengirim transaksinya
    uint256 expiry = block.timestamp + 1 days;
    bytes32 sh = keccak256(abi.encode(DELEGATION_TYPEHASH, siti, token.nonces(siti), expiry));
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(kunciSiti, _digest(_domain("Suara Warga RT 05", address(token)), sh));
    vm.prank(relayer);
    token.delegateBySig(siti, 0, expiry, v, r, s);
    vm.roll(block.number + 1);
    assertEq(token.getVotes(siti), 600e18);

    // 2. Budi mengajukan proposal … (dipotong)

    // 3. Bu Siti menandatangani suaranya; relayer yang mengirim
    bytes32 ballot = keccak256(abi.encode(BALLOT_TYPEHASH, id, uint8(1), siti, dao.nonces(siti)));
    (v, r, s) = vm.sign(kunciSiti, _digest(_domain("DAO RT 05", address(dao)), ballot));
    vm.prank(relayer);
    dao.castVoteBySig(id, 1, siti, abi.encodePacked(r, s, v));

    (, uint256 setuju, ) = dao.proposalVotes(id);
    assertEq(setuju, 600e18);
    assertEq(siti.balance, 0); // tetap nol: gas dibayar relayer

    // 4. Tanda tangan yang sama tidak bisa dipakai ulang (nonce sudah naik)
    vm.prank(relayer);
    vm.expectRevert();
    dao.castVoteBySig(id, 1, siti, abi.encodePacked(r, s, v));
}
```

Digest EIP-712 dibentuk sebagai `keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash))`, dengan domain separator dari nama contract, versi `"1"`, chain ID, dan alamat contract.

Di frontend, tanda tangan ini dibuat dengan `useSignTypedData` dari wagmi, lalu dikirim ke server relayer panitia. Untuk transaksi umum di luar fungsi yang mendukung tanda tangan, gunakan smart wallet dengan paymaster.

## Setiap kekuatan admin adalah titik kepercayaan

| Fitur | Keunggulan | Sisi negatif |
| --- | --- | --- |
| Smart wallet | UX setara aplikasi biasa | Lebih rumit, gas sedikit lebih besar, bergantung infrastruktur tambahan |
| Relayer / paymaster | Pengguna tidak perlu ETH | Seseorang harus membayar, dan relayer tunggal bisa jadi titik sensor |
| Upgradeable proxy | Bug bisa diperbaiki | Pemegang hak upgrade bisa mengubah segalanya |
| Pausable | Menghentikan kerugian saat darurat | Pemegang tombol bisa membekukan dana pengguna |

Serahkan kekuatan itu ke **timelock DAO** atau **multisig**, bukan ke satu kunci pribadi. Banyak protokol akhirnya melepas hak upgrade sepenuhnya setelah stabil.

Dan jangan membuat contract upgradeable kalau pengguna mengandalkan janji bahwa aturannya tidak akan berubah, misalnya token dengan pasokan tetap. Immutable lebih bisa dipercaya.

## Runbook insiden

1. **Deteksi.** Peringatan otomatis masuk ke kanal tim.
2. **Hentikan kerugian.** Pemegang hak pause (multisig darurat) menghentikan contract.
3. **Komunikasi.** Umumkan lewat kanal resmi, jangan meminta pengguna mengklik tautan apa pun.
4. **Analisis.** Telusuri transaksi penyerang, reproduksi di fork lokal (`anvil --fork-url`).
5. **Perbaiki.** Siapkan implementation baru, uji, tinjau, lalu upgrade lewat proses yang disepakati.
6. **Pascainsiden.** Laporan terbuka tentang apa yang terjadi dan apa yang diubah.

## Aspek hukum di Indonesia

> Bagian ini bukan nasihat hukum. Regulasi terus berubah, jadi untuk proyek sungguhan konsultasikan dengan konsultan hukum dan pajak, dan cek aturan terbaru dari otoritas terkait.

| Topik | Yang perlu diketahui |
| --- | --- |
| Pengawasan aset kripto | Sejak Januari 2025 beralih dari Bappebti ke **OJK** |
| Alat pembayaran | Aset kripto **bukan** alat pembayaran yang sah. Pembayaran wajib rupiah |
| Data pribadi | UU PDP berlaku. Jangan simpan data pribadi di blockchain atau IPFS publik |
| Pajak | Ada ketentuan khusus untuk transaksi aset kripto; cek peraturan terbaru |
| Token yang menjanjikan imbal hasil | Berpotensi dianggap produk investasi yang butuh izin |

Untuk proyek komunitas seperti arisan RT, pertimbangkan serius apakah aset kripto sungguhan diperlukan, atau cukup poin internal yang tidak diperdagangkan.

## Checklist peluncuran

**Kode dan keamanan**

- [ ] Semua test lolos dan checklist keamanan terpenuhi.
- [ ] Audit independen untuk contract yang memegang dana bernilai.
- [ ] Kode diverifikasi di block explorer.

**Kekuasaan admin**

- [ ] Hak upgrade dan pause dipegang timelock DAO atau multisig, bukan satu kunci pribadi.
- [ ] Daftar semua peran admin dan pemegangnya dipublikasikan.
- [ ] Rencana kapan hak upgrade akan dilepas, kalau memang direncanakan.

**Operasional**

- [ ] Monitoring aktif untuk event bernilai besar dan event administratif.
- [ ] Runbook insiden tertulis, lengkap dengan siapa yang bisa menekan pause.
- [ ] Program bug bounty.
- [ ] Kanal komunikasi resmi yang diketahui pengguna.

**Pengalaman pengguna**

- [ ] Pengguna awam bisa memakai aplikasi tanpa memahami seed phrase dan gas.
- [ ] Pesan error ramah, status transaksi jelas.
- [ ] Panduan keamanan untuk pengguna.

**Hukum dan data**

- [ ] Tidak ada data pribadi di blockchain atau IPFS publik.
- [ ] Konsultasi hukum dan pajak untuk model bisnis dan token.
- [ ] Syarat penggunaan dan penjelasan risiko yang jujur.

## Rangkuman

- Jarak antara "berfungsi" dan "siap produksi" mencakup UX, kemampuan memperbaiki bug, pengawasan, dan hukum.
- **Account abstraction** dan **tanda tangan EIP-712** memungkinkan pengguna bertransaksi tanpa memegang ETH.
- **Proxy UUPS** memisahkan alamat dan data dari logika. Gunakan `initialize` dan `_disableInitializers`, dan hanya tambahkan variabel baru di bawah.
- **Pausable** menghentikan kerugian saat darurat. Setiap kekuatan admin adalah titik kepercayaan.
- **Monitoring** dan **runbook insiden** wajib untuk contract di mainnet.

## Penutup

Anda sudah menempuh perjalanan panjang: dari masalah Bu Bendahara, hash dan tanda tangan, konsensus, blockchain mini, Ethereum, smart contract, testing, token, frontend, IPFS dan oracle, keamanan, Layer 2, DeFi dan DAO, sampai kesiapan produksi.

Satu pertanyaan tersisa, dan inilah ujian sesungguhnya: bisakah Anda merancang dan membangun satu platform komunitas utuh, memutuskan sendiri bagian mana yang perlu di blockchain dan mana yang tidak, lalu **mempertanggungjawabkan setiap keputusan itu**?
