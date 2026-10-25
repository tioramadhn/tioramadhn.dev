---
title: "Modul 7: Standar Token ERC-20 dan ERC-721"
description: Kenapa token butuh standar, apa bedanya fungible dan non-fungible, dan kenapa aplikasi Web3 sering meminta Anda menandatangani dua transaksi.
date: 2026-10-16
slug: modul-7-standar-token
tags: tutorial web 3
series: Tutorial Web 3
status: draft
---

Warga RT 05 protes: harga ETH naik turun, jadi nilai iuran arisan tidak stabil. Mereka ingin arisan dalam satuan stabil, atau dalam "poin warga" buatan RT sendiri.

Masalahnya, ETH adalah aset **bawaan** Ethereum, sedangkan koin lain adalah **smart contract buatan orang**. Bayangkan tiga orang membuat koin sebelum ada standar:

| Koin | Function kirim | Function cek saldo |
| --- | --- | --- |
| Koin A | `kirim(tujuan, jumlah)` | `saldoDari(alamat)` |
| Koin B | `transfer(jumlah, tujuan)` | `getBalance(alamat)` |
| Koin C | `pindahkan(tujuan, jumlah, catatan)` | `cekSaldo()` |

Wallet harus menulis kode khusus untuk setiap koin. Bursa harus mengintegrasikan satu per satu. Contract arisan hanya bisa menerima koin yang sudah dikenalnya. Ekosistem tidak bisa tumbuh.

Pada 2015, Fabian Vogelsteller dan Vitalik Buterin mengusulkan **ERC-20**: satu set function standar. ERC sendiri singkatan dari Ethereum Request for Comments, yaitu proposal standar yang dibahas terbuka oleh komunitas.

Dua tahun kemudian, CryptoKitties (yang sempat membuat Ethereum macet) butuh token yang setiap unitnya **unik**. Dari kebutuhan itu lahir **ERC-721** untuk NFT. Lalu pada 2019, **ERC-1155** menggabungkan keduanya dalam satu contract, dan banyak dipakai game.

## Empat analogi

**Fungible = uang kertas.** Rp50.000 milik Anda dan milik teman nilainya sama persis. Ditukar pun tidak masalah.

**Non-fungible = tiket konser bernomor kursi.** Kursi A1 di baris depan tidak sama dengan Z99 di belakang, walau sama-sama tiket konser yang sama.

**Standar token = colokan listrik.** Karena semua colokan memakai standar sama, alat merek apa pun bisa dicolokkan di rumah mana pun. Pabrik tidak perlu berkoordinasi dengan setiap pemilik rumah.

**Approve + transferFrom = autodebet.** Anda mengizinkan PLN menarik tagihan dari rekening, maksimal sekian rupiah. PLN tidak memegang rekening Anda, tapi boleh menarik sesuai izin. Kalau izinnya "tanpa batas" dan sistem penagihnya dibobol, rekening Anda bisa dikuras.

## Token hanyalah mapping di dalam contract

Ini yang sering mengejutkan pemula: token **tidak berpindah** ke wallet Anda.

```solidity
// Inti dari ERC-20 (disederhanakan)
mapping(address => uint256) balanceOf;                       // siapa punya berapa
mapping(address => mapping(address => uint256)) allowance;   // siapa mengizinkan siapa, berapa

// Inti dari ERC-721 (disederhanakan)
mapping(uint256 => address) ownerOf;                         // ID mana milik siapa
```

Ketika Anda "mengirim" 30 PWR ke Sari, yang terjadi hanya `balanceOf[Anda] -= 30` dan `balanceOf[Sari] += 30` di dalam contract PWR. Wallet Anda hanya **membaca** mapping itu dan menampilkannya.

Persis seperti blockchain mini di proyek pertama: saldo adalah catatan, bukan benda.

## Kenapa 1 token = 1000000000000000000?

Solidity tidak punya angka desimal. Jadi token menyimpan jumlah dalam satuan terkecil, lalu `decimals` memberi tahu wallet di mana meletakkan koma.

| Token | decimals | Disimpan di contract | Ditampilkan wallet |
| --- | --- | --- | --- |
| Kebanyakan token | 18 | `1500000000000000000` | 1,5 |
| Banyak stablecoin dolar | 6 | `1500000` | 1,5 |
| Poin Warga (latihan ini) | 0 | `50000` | 50.000 |

## Approve dan transferFrom

Contract arisan tidak punya private key Anda, jadi tidak bisa "mengambil" token begitu saja. Solusinya dua langkah:

```text
Budi                 Contract token PWR          Contract Arisan
 |                          |                          |
 |-- 1. approve(Arisan, 50.000) -->                    |
 |                          | allowance[Budi][Arisan] = 50.000
 |                          |                          |
 |------------------ 2. setor() --------------------->|
 |                          |<-- transferFrom(Budi, Arisan, 50.000)
 |                          | cek allowance, kurangi
 |                          | balanceOf[Budi] -= 50.000
 |                          | balanceOf[Arisan] += 50.000
 |                          |                          | catat Budi sudah setor
```

Inilah sebabnya banyak aplikasi Web3 meminta Anda menandatangani **dua** transaksi: "Approve" lalu aksi utamanya.

## Interface-nya

**ERC-20:** `name()`, `symbol()`, `decimals()`, `totalSupply()`, `balanceOf(alamat)`, `transfer(tujuan, jumlah)`, `approve(spender, jumlah)`, `allowance(pemilik, spender)`, `transferFrom(pemilik, tujuan, jumlah)`, plus event `Transfer` dan `Approval` yang dipakai wallet dan explorer untuk melacak riwayat.

**ERC-721:** `ownerOf(tokenId)`, `balanceOf(alamat)`, `transferFrom` / `safeTransferFrom`, `approve(to, tokenId)` / `setApprovalForAll(operator, bool)`, dan `tokenURI(tokenId)` untuk alamat metadata.

Perbedaan `safeTransferFrom` penting dan lahir dari kesalahan nyata. ERC-20 versi awal tidak punya cara bagi contract penerima untuk menolak token, sehingga banyak orang tanpa sengaja mengirim token ke alamat contract yang tidak punya function untuk mengeluarkannya. Token itu terkunci selamanya, totalnya diperkirakan jutaan dolar. ERC-721 belajar dari itu: `safeTransferFrom` memeriksa apakah contract penerima menyatakan sanggup menerima NFT.

## Praktik

```bash
forge init token-rt05
cd token-rt05
rm src/Counter.sol test/Counter.t.sol script/Counter.s.sol
forge install OpenZeppelin/openzeppelin-contracts
echo '@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/' >> remappings.txt
```

Anda *bisa* menulis ERC-20 dari nol, dan itu latihan bagus. Tapi untuk contract yang akan dipakai, gunakan **OpenZeppelin Contracts**, implementasi yang sudah diaudit dan dipakai ribuan proyek.

### Latihan 1: Token ERC-20 "Poin Warga"

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Poin Warga RT 05: token ERC-20 yang hanya bisa dicetak pengurus RT
contract PoinWarga is ERC20, Ownable {
    constructor() ERC20("Poin Warga RT 05", "PWR") Ownable(msg.sender) {}

    /// @notice 1 PWR = 1 rupiah, tanpa pecahan
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    function cetak(address ke, uint256 jumlah) external onlyOwner {
        _mint(ke, jumlah);
    }
}
```

Kata kunci `is` adalah **pewarisan**: contract Anda mendapat semua function ERC20 dan Ownable, lalu cukup menambahkan aturan khusus.

Test-nya. Perhatikan terutama yang terakhir, karena itu inti pola approve:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {PoinWarga} from "../src/PoinWarga.sol";

contract PoinWargaTest is Test {
    PoinWarga poin;
    address budi = makeAddr("budi");
    address sari = makeAddr("sari");
    address joko = makeAddr("joko");

    function setUp() public {
        poin = new PoinWarga();
    }

    function test_CetakDanTransfer() public {
        poin.cetak(budi, 100_000);
        assertEq(poin.totalSupply(), 100_000);
        vm.prank(budi);
        poin.transfer(sari, 30_000);
        assertEq(poin.balanceOf(budi), 70_000);
        assertEq(poin.balanceOf(sari), 30_000);
    }

    function test_RevertCetakOlehBukanPemilik() public {
        vm.prank(budi);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, budi));
        poin.cetak(budi, 1);
    }

    function test_ApproveDanTransferFrom() public {
        poin.cetak(budi, 100);
        vm.prank(budi);
        poin.approve(sari, 40);            // Budi mengizinkan Sari memakai 40 PWR miliknya
        assertEq(poin.allowance(budi, sari), 40);

        vm.prank(sari);
        poin.transferFrom(budi, joko, 25); // Sari memindahkan 25 PWR milik Budi ke Joko
        assertEq(poin.balanceOf(joko), 25);
        assertEq(poin.allowance(budi, sari), 15);

        vm.prank(sari);
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, sari, 15, 20));
        poin.transferFrom(budi, joko, 20);
    }
}
```

Dua hal untuk dipikirkan: setelah Sari memakai 25 dari izin 40, kenapa percobaan menarik 20 berikutnya gagal? Dan siapa satu-satunya yang bisa mencetak PWR? Apakah itu masalah kepercayaan?

### Latihan 2: NFT kartu anggota

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Kartu Anggota Koperasi RT 05: setiap kartu unik (NFT ERC-721)
contract KartuAnggota is ERC721, Ownable {
    uint256 public berikutnya = 1;  // nomor kartu berikutnya
    string private baseURI;

    constructor(string memory _baseURI) ERC721("Kartu Anggota RT 05", "KART") Ownable(msg.sender) {
        baseURI = _baseURI;
    }

    function terbitkan(address ke) external onlyOwner returns (uint256 id) {
        id = berikutnya++;
        _safeMint(ke, id);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }
}
```

```solidity
function test_TerbitkanKartu() public {
    uint256 id = kartu.terbitkan(budi);
    assertEq(id, 1);
    assertEq(kartu.ownerOf(1), budi);
    assertEq(kartu.tokenURI(1), "https://contoh.id/kartu/1");
}

function test_RevertPindahkanKartuOrangLain() public {
    kartu.terbitkan(budi);
    vm.prank(joko);
    vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721InsufficientApproval.selector, joko, 1));
    kartu.transferFrom(budi, joko, 1);
}
```

Satu pertanyaan yang pantas mengganggu: URL `https://contoh.id/kartu/1` mengarah ke server biasa. Apa yang terjadi pada "kepemilikan" kartu kalau server itu mati? Itu dibahas di modul tentang penyimpanan data.

### Latihan 3: Arisan dengan token

Ini menjawab masalah warga RT 05:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Arisan dengan token ERC-20 (versi ringkas, tanpa pembatalan)
contract ArisanToken {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    uint256 public immutable iuran;
    uint256 public immutable jumlahAnggota;

    address[] public anggota;
    mapping(address => bool) public adalahAnggota;
    uint256 public putaran;
    uint256 public jumlahSetorPutaranIni;
    mapping(uint256 => mapping(address => bool)) public sudahSetor;
    mapping(address => uint256) public bisaDitarik;

    error BukanAnggota();
    error SudahSetor();
    error BelumSemuaSetor();
    error BelumBerjalan();
    error TidakAdaDana();

    constructor(IERC20 _token, uint256 _iuran, uint256 _jumlahAnggota) {
        token = _token;
        iuran = _iuran;
        jumlahAnggota = _jumlahAnggota;
    }

    function gabung() external {
        if (adalahAnggota[msg.sender]) revert BukanAnggota();
        adalahAnggota[msg.sender] = true;
        anggota.push(msg.sender);
        if (anggota.length == jumlahAnggota) putaran = 1;
    }

    /// @notice Anggota harus lebih dulu memanggil token.approve(alamatArisan, iuran)
    function setor() external {
        if (putaran == 0 || putaran > jumlahAnggota) revert BelumBerjalan();
        if (!adalahAnggota[msg.sender]) revert BukanAnggota();
        if (sudahSetor[putaran][msg.sender]) revert SudahSetor();
        sudahSetor[putaran][msg.sender] = true;   // effects dulu
        jumlahSetorPutaranIni += 1;
        token.safeTransferFrom(msg.sender, address(this), iuran); // baru interaction
    }

    function tetapkanPemenang() external {
        if (jumlahSetorPutaranIni < jumlahAnggota) revert BelumSemuaSetor();
        bisaDitarik[anggota[putaran - 1]] += iuran * jumlahAnggota;
        putaran += 1;
        jumlahSetorPutaranIni = 0;
    }

    function tarik() external {
        uint256 jumlah = bisaDitarik[msg.sender];
        if (jumlah == 0) revert TidakAdaDana();
        bisaDitarik[msg.sender] = 0;
        token.safeTransfer(msg.sender, jumlah);
    }
}
```

Perhatikan di `setor`: state diubah **dulu** sebelum memanggil `safeTransferFrom`. Memanggil contract token juga termasuk "interaction", jadi pola Checks-Effects-Interactions tetap berlaku.

Kenapa `SafeERC20`? Karena beberapa token populer tidak mengikuti ERC-20 secara persis, misalnya tidak mengembalikan nilai `bool`. `SafeERC20` menangani penyimpangan itu.

```solidity
function test_ArisanToken() public {
    ArisanToken arisan = new ArisanToken(poin, 50_000, 3);
    address[3] memory semua = [budi, sari, joko];
    for (uint256 i = 0; i < 3; i++) {
        poin.cetak(semua[i], 150_000);
        vm.prank(semua[i]); arisan.gabung();
    }
    for (uint256 p = 0; p < 3; p++) {
        for (uint256 i = 0; i < 3; i++) {
            vm.startPrank(semua[i]);
            poin.approve(address(arisan), 50_000);   // langkah 1: izin
            arisan.setor();                          // langkah 2: aksi
            vm.stopPrank();
        }
        arisan.tetapkanPemenang();
        vm.prank(semua[p]); arisan.tarik();
    }
    for (uint256 i = 0; i < 3; i++) assertEq(poin.balanceOf(semua[i]), 150_000);
    assertEq(poin.balanceOf(address(arisan)), 0);
}
```

**Bonus:** deploy PoinWarga ke Sepolia, cetak PWR ke akun MetaMask Anda, lalu impor token itu di MetaMask lewat menu **Import tokens** dengan alamat contract-nya. Token Anda tampil di wallet tanpa pembaruan aplikasi apa pun. Itulah kekuatan standar.

## Yang harus diwaspadai

Membuat token itu mudah. Membuat token yang bermanfaat, aman, dan legal itu sulit.

1. **Approve adalah pedang bermata dua.** Banyak aplikasi meminta izin tak terbatas agar tidak perlu minta lagi. Kalau aplikasi itu kemudian diretas, atau ternyata situs palsu, penyerang bisa menarik *semua* token yang pernah diizinkan, bahkan bertahun-tahun kemudian. Wallet modern menampilkan peringatan, dan ada layanan untuk mencabut izin lama.
2. **Token tidak otomatis bernilai.** Nama dan simbol tidak dijamin unik, jadi penipu sering membuat token palsu bernama sama dengan token terkenal.
3. **NFT biasanya tidak menyimpan gambarnya di blockchain.** Yang tersimpan hanya ID dan URL metadata.
4. **Pemilik contract bisa sangat berkuasa.** Fungsi seperti `cetak` atau `blacklist` membuat token bergantung pada kepercayaan kepada pemiliknya. Selalu periksa siapa yang bisa mencetak.
5. **Aspek hukum.** Token yang menjanjikan keuntungan bisa dianggap efek atau instrumen investasi oleh regulator.

Sejarah sudah memberi contoh: ledakan ICO 2017 terjadi justru karena membuat token ERC-20 sangat mudah. Ribuan proyek menjual token untuk menggalang dana; sebagian jadi proyek besar, sangat banyak yang gagal atau penipuan. Kemudahan teknis tidak sama dengan nilai.

Dan ada keadaan yang sama sekali tidak memerlukan token: poin loyalitas yang hanya berlaku di satu toko dan tidak perlu dipindahkan cukup pakai database biasa.

## Rangkuman

- Tanpa standar, setiap token butuh integrasi khusus. ERC-20 dan ERC-721 membuat semua token "satu colokan".
- Token adalah **mapping di dalam contract**. Wallet hanya membaca dan menampilkannya.
- `decimals` hanya mengatur tampilan. Contract selalu menyimpan bilangan bulat.
- Contract lain menarik token lewat **approve + transferFrom**. Hati-hati dengan izin tanpa batas.
- Gunakan **OpenZeppelin** untuk implementasi standar dan **SafeERC20** saat menerima token.
- Periksa selalu siapa yang bisa mencetak token, karena di situlah titik kepercayaannya.

## Masalah terbuka

Arisan dengan token Anda berjalan sempurna. Tapi lihat dari sisi Bu Siti, warga RT 05 berusia 55 tahun. Untuk ikut arisan, ia harus membuka Etherscan, mencari tab Write Contract, menghubungkan wallet, memanggil `approve` pada contract token dengan jumlah dalam satuan terkecil, lalu memanggil `setor` pada contract lain.

Tidak ada warga yang akan melakukan itu.

Bagaimana membuat tampilan web yang ramah, di mana warga cukup menekan "Hubungkan Wallet" dan "Setor Iuran", sementara aplikasi mengurus approve, menampilkan saldo, dan memberi tahu status transaksi?

Itulah modul berikutnya: membangun frontend dApp.
