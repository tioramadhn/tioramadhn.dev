---
title: "Modul 12: DeFi, DAO, dan Governance"
description: Contract yang dirakit seperti balok LEGO, AMM dengan rumus x·y=k, dan kenapa voting on-chain butuh snapshot, dibuktikan dengan serangan yang berhasil.
date: 2026-10-22
slug: modul-12-defi-dan-dao
tags: tutorial web 3
series: Tutorial Web 3
status: draft
---

Kas RT 05 sudah terkumpul dalam bentuk token, aman, dan murah. Muncul dua kebutuhan:

1. Bendahara ingin **menukar** sebagian kas ke token lain, langsung dari contract kas, tanpa bursa terpusat.
2. Warga bertanya: **siapa yang memutuskan** uang kas dipakai untuk apa? Saat ini satu alamat pemilik yang berkuasa, persis seperti Bu Bendahara di modul pertama.

Modul ini menjawab keduanya dengan dua konsep paling khas dari Web3: **DeFi** yang dibangun dari **composability**, dan **DAO**.

Ini juga tempat semua yang Anda pelajari bertemu: token, oracle, keamanan, dan biaya.

## Tiga analogi

**Composability = balok LEGO.** Setiap protokol adalah balok dengan bentuk sambungan standar (interface ERC-20, function publik). Siapa pun bisa menyusun balok itu jadi bangunan baru tanpa meminta izin pembuatnya.

**AMM = timbangan di warung tukar beras.** Warung menyimpan beras dan uang di dua sisi timbangan, dengan aturan "jumlah beras dikali jumlah uang harus tetap". Kalau Anda menambah uang, warung mengeluarkan beras secukupnya agar hasil kalinya tetap. Makin banyak yang dibeli sekaligus, makin mahal harga per kilonya, karena berasnya makin langka di timbangan.

**DAO = rapat RT yang keputusannya dieksekusi mesin.** Warga memilih lewat suara yang tercatat. Kalau proposal lolos, mesin otomatis menjalankannya. Tidak ada pengurus yang bisa menolak hasil voting. Tapi agar adil, daftar pemilih dikunci sebelum rapat (**snapshot**), dan ada jeda sebelum keputusan dijalankan (**timelock**).

| Analogi | Konsep teknis |
| --- | --- |
| Balok LEGO | **Composability** |
| Isi timbangan warung | **Liquidity pool** dan **reserve** |
| Aturan "hasil kali tetap" | Rumus **constant product** x · y = k |
| Harga naik saat beli banyak | **Price impact** |
| Batas harga yang bisa diterima | **Slippage tolerance** |
| Daftar pemilih dikunci sebelum rapat | **Snapshot** (ERC20Votes) |
| Jeda sebelum keputusan dijalankan | **Timelock** |
| Surat kuasa memilih | **Delegasi** suara |

## Cara kerja AMM

Kolam berisi dua token dengan cadangan x dan y, dengan aturan `x · y = k`. Kalau Anda memasukkan Δx token A, Anda menerima Δy token B sehingga hasil kalinya tetap:

```text
(x + Δx)(y - Δy) = x · y     →     Δy = (y · Δx) / (x + Δx)
```

Dengan biaya 0,3%, Δx dikurangi 0,3% sebelum dihitung. Biaya itu tetap di kolam sebagai imbalan penyedia likuiditas, sehingga k perlahan naik.

Contoh dengan kolam 1.000.000 IDRU dan 1.000 BRS (harga awal 1 BRS = 1.000 IDRU):

| Tukar | BRS diterima | Harga rata-rata per BRS |
| --- | --- | --- |
| 1.000 IDRU | ±0,996 BRS | ±1.004 IDRU |
| 500.000 IDRU | ±332 BRS | ±1.505 IDRU |

Transaksi besar relatif terhadap kolam mendapat harga jauh lebih buruk.

### Latihan 1: AMM mini

> `PasarMini` ini AMM **versi belajar**: tanpa token LP, tanpa penarikan likuiditas, tanpa banyak pengaman yang ada di AMM sungguhan. Jangan dipakai untuk dana nyata.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title AMM mini dengan rumus x * y = k (versi belajar)
contract PasarMini is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable tokenA;
    IERC20 public immutable tokenB;
    uint256 public cadanganA;
    uint256 public cadanganB;
    uint256 public constant BIAYA_BPS = 30; // 0,30% untuk penyedia likuiditas

    error JumlahNol();
    error TokenTidakDikenal();
    error SlippageTerlalu(uint256 didapat, uint256 minimal);
    error LewatTenggat();

    constructor(IERC20 _a, IERC20 _b) { tokenA = _a; tokenB = _b; }

    function tambahLikuiditas(uint256 jumlahA, uint256 jumlahB) external nonReentrant {
        if (jumlahA == 0 || jumlahB == 0) revert JumlahNol();
        cadanganA += jumlahA;
        cadanganB += jumlahB;
        tokenA.safeTransferFrom(msg.sender, address(this), jumlahA);
        tokenB.safeTransferFrom(msg.sender, address(this), jumlahB);
    }

    /// @notice (x + dx') * (y - dy) = x * y, dengan dx' = dx dikurangi biaya
    function hitungKeluar(uint256 masuk, uint256 cadMasuk, uint256 cadKeluar) public pure returns (uint256) {
        uint256 masukSetelahBiaya = masuk * (10_000 - BIAYA_BPS);
        return (masukSetelahBiaya * cadKeluar) / (cadMasuk * 10_000 + masukSetelahBiaya);
    }

    function kutipan(address tokenMasuk, uint256 masuk) external view returns (uint256) {
        return tokenMasuk == address(tokenA)
            ? hitungKeluar(masuk, cadanganA, cadanganB)
            : hitungKeluar(masuk, cadanganB, cadanganA);
    }

    /// @param minimalKeluar perlindungan slippage: batal jika hasil di bawah angka ini
    /// @param tenggat batal jika transaksi baru diproses setelah waktu ini
    function tukar(address tokenMasuk, uint256 masuk, uint256 minimalKeluar, uint256 tenggat)
        external nonReentrant returns (uint256 keluar)
    {
        if (block.timestamp > tenggat) revert LewatTenggat();
        if (masuk == 0) revert JumlahNol();
        bool aKeB = tokenMasuk == address(tokenA);
        if (!aKeB && tokenMasuk != address(tokenB)) revert TokenTidakDikenal();

        (IERC20 tIn, IERC20 tOut) = aKeB ? (tokenA, tokenB) : (tokenB, tokenA);
        keluar = aKeB ? hitungKeluar(masuk, cadanganA, cadanganB) : hitungKeluar(masuk, cadanganB, cadanganA);
        if (keluar < minimalKeluar) revert SlippageTerlalu(keluar, minimalKeluar);

        if (aKeB) { cadanganA += masuk; cadanganB -= keluar; }  // effects dulu
        else      { cadanganB += masuk; cadanganA -= keluar; }

        tIn.safeTransferFrom(msg.sender, address(this), masuk); // baru interactions
        tOut.safeTransfer(msg.sender, keluar);
    }
}
```

Test yang paling menarik adalah yang membuktikan slippage benar-benar melindungi:

```solidity
function test_PriceImpact() public {
    uint256 kecil = _tukar(budi, 1_000e18, 0);               // ~0,1% dari kolam
    uint256 besar = _tukar(makeAddr("sari"), 500_000e18, 0); // 50% dari kolam
    // Harga rata-rata per BRS jauh lebih mahal untuk transaksi besar
    assertLt(besar * 1_000 / 500_000, kecil * 1_000 / 1_000);
}

function test_SlippageMelindungiDariSandwich() public {
    uint256 perkiraan = pasar.kutipan(address(rupiah), 10_000e18);
    uint256 minimal = perkiraan * 99 / 100; // toleransi 1%

    _tukar(bot, 100_000e18, 0); // bot membeli lebih dulu, harga BRS naik

    rupiah.cetak(budi, 10_000e18);
    vm.startPrank(budi);
    rupiah.approve(address(pasar), 10_000e18);
    vm.expectRevert(); // SlippageTerlalu: Budi tidak jadi rugi besar
    pasar.tukar(address(rupiah), 10_000e18, minimal, block.timestamp);
    vm.stopPrank();
}
```

```text
Tukar 1.000 IDRU   -> BRS (x1000): 996
Tukar 500.000 IDRU -> BRS (x1000): 332113
```

1.000 IDRU mendapat sekitar 0,996 BRS, tapi 500.000 IDRU hanya mendapat sekitar 332 BRS, bukan 500.

### Latihan 2: Kas RT yang memakai pasar orang lain

```solidity
interface IPasar {
    function kutipan(address tokenMasuk, uint256 masuk) external view returns (uint256);
    function tukar(address tokenMasuk, uint256 masuk, uint256 minimalKeluar, uint256 tenggat) external returns (uint256);
}

/// @title Kas RT yang bisa menukar token lewat AMM milik pihak lain (composability)
contract KasKomunitas is Ownable {
    using SafeERC20 for IERC20;

    IPasar public immutable pasar;

    constructor(IPasar _pasar) Ownable(msg.sender) { pasar = _pasar; }

    /// @param minimalKeluar dihitung DI LUAR blockchain sebelum transaksi dikirim
    function tukarKas(IERC20 tokenMasuk, uint256 masuk, uint256 minimalKeluar, uint256 tenggat)
        external onlyOwner returns (uint256 keluar)
    {
        tokenMasuk.forceApprove(address(pasar), masuk);  // izin tepat sejumlah yang ditukar
        keluar = pasar.tukar(address(tokenMasuk), masuk, minimalKeluar, tenggat);
    }
}
```

Perhatikan: contract kas tidak perlu meng-import kode `PasarMini` sama sekali. Ia cukup tahu "bentuk sambungannya" lewat interface. Itulah composability.

Dan ada satu kesalahan yang sangat umum di sini:

> **Jangan** menghitung batas slippage di dalam contract dengan memanggil `kutipan()` pada transaksi yang sama. Kalau bot sudah memanipulasi harga lebih dulu, kutipan itu sudah ikut buruk, sehingga "perlindungan" tidak melindungi apa pun. Batas minimal harus dihitung **sebelum** transaksi dikirim (di frontend atau skrip), lalu dikirim sebagai parameter.

```solidity
function test_RevertKasJikaHargaDimanipulasi() public {
    KasKomunitas kas = new KasKomunitas(IPasar(address(pasar)));
    rupiah.cetak(address(kas), 50_000e18);
    uint256 minimal = pasar.kutipan(address(rupiah), 50_000e18) * 99 / 100; // dihitung SEBELUM dikirim

    _tukar(bot, 200_000e18, 0); // bot menyusup lebih dulu

    vm.expectRevert(); // SlippageTerlalu: kas RT terlindungi
    kas.tukarKas(rupiah, 50_000e18, minimal, block.timestamp + 10 minutes);
}
```

## Kenapa DAO butuh snapshot

### Bagian A: Buktikan celahnya

```solidity
/// @title CONTOH RENTAN: bobot suara = saldo SAAT memilih
contract VotingSaldoSekarang {
    ERC20 public immutable token;
    mapping(address => bool) public sudahMemilih;
    uint256 public setuju;

    function pilihSetuju() external {
        require(!sudahMemilih[msg.sender], "Sudah memilih");
        sudahMemilih[msg.sender] = true;
        setuju += token.balanceOf(msg.sender);
    }
}
```

```solidity
function test_SuaraGandaLewatPindahToken() public {
    VotingSaldoSekarang v = new VotingSaldoSekarang(token);
    vm.prank(budi); v.pilihSetuju();                    // 100
    vm.prank(budi); token.transfer(alamat2, 100e18);
    vm.prank(alamat2); v.pilihSetuju();                 // 100 lagi
    vm.prank(alamat2); token.transfer(alamat3, 100e18);
    vm.prank(alamat3); v.pilihSetuju();                 // 100 lagi
    assertEq(v.setuju(), 300e18);                       // 100 token menghasilkan 300 suara!
}
```

Dan kalau token bisa dipinjam lewat **flash loan**, yaitu pinjaman tanpa jaminan yang harus dikembalikan dalam transaksi yang sama, penyerang tidak perlu memilikinya sama sekali.

Itulah yang terjadi pada **Beanstalk** (April 2022). Penyerang meminjam token dalam jumlah sangat besar lewat flash loan, langsung mendapat mayoritas suara, mengesahkan proposal yang memindahkan dana protokol ke dirinya, lalu mengembalikan pinjaman. Semuanya dalam satu transaksi. Kerugiannya lebih dari 180 juta dolar.

Celahnya: bobot suara dihitung dari saldo **saat ini**, dan proposal bisa dieksekusi **seketika**.

### Bagian B: Perbaiki

```solidity
/// @title Token suara warga: mencatat riwayat bobot suara (checkpoint) di setiap blok
contract TokenSuara is ERC20, ERC20Permit, ERC20Votes {
    constructor() ERC20("Suara Warga RT 05", "SUARA") ERC20Permit("Suara Warga RT 05") {}

    function cetak(address ke, uint256 jumlah) external { _mint(ke, jumlah); } // HANYA untuk latihan

    // Override yang diwajibkan karena dua induk sama-sama mendefinisikan function ini
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}

/// @title Versi aman: bobot suara = saldo pada SNAPSHOT (waktu proposal dibuat)
contract VotingSnapshot {
    ERC20Votes public immutable token;
    uint256 public immutable snapshot;   // nomor blok saat proposal dibuat
    mapping(address => bool) public sudahMemilih;
    uint256 public setuju;

    error SudahMemilih();
    error TidakPunyaSuara();

    constructor(ERC20Votes _token) {
        token = _token;
        snapshot = block.number - 1;     // blok yang sudah final
    }

    function pilihSetuju() external {
        if (sudahMemilih[msg.sender]) revert SudahMemilih();
        uint256 bobot = token.getPastVotes(msg.sender, snapshot);
        if (bobot == 0) revert TidakPunyaSuara();
        sudahMemilih[msg.sender] = true;
        setuju += bobot;
    }
}
```

```solidity
function test_SnapshotMencegahSuaraGanda() public {
    vm.roll(block.number + 1);
    VotingSnapshot v = new VotingSnapshot(token);   // snapshot = blok sebelumnya

    vm.prank(budi); v.pilihSetuju();                // 100
    vm.prank(budi); token.transfer(alamat2, 100e18);
    vm.prank(alamat2);
    vm.expectRevert(VotingSnapshot.TidakPunyaSuara.selector); // saat snapshot, alamat2 belum punya suara
    v.pilihSetuju();
    assertEq(v.setuju(), 100e18);
}

function test_TokenTanpaDelegasiTidakPunyaSuara() public {
    token.cetak(alamat2, 50e18);   // punya token, tapi belum delegate
    vm.roll(block.number + 2);
    assertEq(token.getVotes(alamat2), 0);
    assertEq(token.balanceOf(alamat2), 50e18);
}
```

Kenapa perlu delegasi? Menyimpan riwayat bobot suara di setiap transfer itu mahal. ERC20Votes hanya menghitung suara untuk alamat yang sudah melakukan `delegate`, boleh ke diri sendiri. Token yang belum didelegasikan tidak punya suara.

Dan kenapa timelock? Memberi waktu bagi warga yang tidak setuju untuk menarik dananya sebelum keputusan dijalankan, dan waktu untuk mendeteksi proposal berbahaya.

Perhatikan rantai trade-off-nya: voting "satu alamat satu suara" rentan Sybil attack karena membuat alamat itu gratis. Bobot berdasarkan token menutup celah itu, tapi membuka celah baru (memindahkan atau meminjam token), yang ditutup snapshot. Setiap desain voting adalah serangkaian trade-off.

## Alur governance lengkap

```text
Pemegang token delegate suara
        |
        v
Ajukan proposal (aksi on-chain)
        | voting delay
        v
Snapshot bobot suara diambil
        v
Voting period: setuju / tolak / abstain
        v
Quorum tercapai DAN setuju > tolak?
   |                    |
  Tidak                Ya
   v                    v
 Gagal           Antrean timelock
                        | jeda, misalnya 2 hari
                        v
            Eksekusi otomatis: transfer dana / ubah aturan
```

## Risikonya

DeFi adalah area dengan kerugian peretasan terbesar di Web3. Composability berarti Anda juga **mewarisi risiko setiap contract yang Anda panggil**.

1. **Risiko berantai.** Kalau satu protokol yang Anda pakai diretas atau oracle-nya salah, protokol Anda ikut terdampak. Pada awal 2020, protokol bZx diserang berulang kali: penyerang meminjam dana besar lewat flash loan, menggerakkan harga di DEX yang dipakai bZx sebagai sumber harga, lalu mengambil untung dari harga yang sudah dimanipulasi.
2. **Price impact dan MEV.** Transaksi besar mendapat harga buruk, dan bot bisa menyusup sebelum dan sesudah transaksi Anda.
3. **Likuidasi.** Peminjam yang jaminannya turun nilai bisa kehilangan jaminan otomatis.
4. **Impermanent loss.** Penyedia likuiditas bisa berakhir dengan nilai lebih rendah daripada kalau hanya menyimpan tokennya.
5. **Stablecoin bisa kehilangan patokan**, terutama yang mekanismenya rapuh.
6. **Plutokrasi.** Yang punya token paling banyak punya suara paling besar, dan partisipasi voting sering rendah.
7. **Serangan tata kelola** seperti Beanstalk.
8. **Aspek hukum dan pajak** belum jelas di banyak negara, termasuk status hukum anggota DAO.

Dan satu nasihat praktis: kalau Anda tidak tahu dari mana imbal hasil sebuah protokol berasal, kemungkinan besar Andalah sumbernya.

Untuk komunitas kecil yang saling percaya, dompet multisig jauh lebih sederhana daripada DAO lengkap. Jangan memakai alat yang lebih rumit dari kebutuhan.

## Rangkuman

- **Composability**: contract memanggil contract lain lewat interface, tanpa izin. Kekuatan terbesar DeFi, sekaligus sumber risiko berantai.
- **AMM** menentukan harga dengan x·y=k. Transaksi besar terkena price impact, dan selalu butuh batas slippage serta tenggat.
- Batas slippage harus dihitung **sebelum** transaksi dikirim.
- **DAO**: proposal → voting → quorum → timelock → eksekusi otomatis.
- Voting on-chain butuh **snapshot** dan **delegasi** untuk mencegah suara ganda dan serangan flash loan.

## Masalah terbuka

Semua bagiannya sudah Anda lihat terpisah: token suara dengan snapshot, kas yang memanggil protokol lain, keamanan, dan Layer 2.

Sekarang RT 05 ingin **menghapus peran bendahara sepenuhnya**. Kas warga hanya boleh dipakai kalau warga memilihnya lewat proposal, dengan quorum yang jelas dan jeda sebelum dieksekusi. Tidak ada satu alamat pun, termasuk Anda sebagai pembuatnya, yang bisa memindahkan dana di luar proses itu.

Itulah proyek berikutnya.
