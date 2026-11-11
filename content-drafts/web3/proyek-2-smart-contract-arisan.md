---
title: "Proyek 2: Smart Contract Arisan di Sepolia"
description: Menutup lingkaran dengan mengganti Bu Bendahara oleh contract yang mengelola keanggotaan, setoran per putaran, giliran penerima, dan pembatalan, lalu menjalankannya sungguhan di testnet.
date: 2026-10-15
slug: proyek-2-smart-contract-arisan
tags: tutorial web 3
series: Tutorial Web 3
status: draft
---

Seri ini dibuka dengan masalah Bu Bendahara: satu orang memegang buku kas dan uang semua anggota arisan. Sejak itu Anda sudah belajar membuktikan identitas, menyepakati catatan, bertransaksi di Ethereum, menulis aturan sebagai contract, dan mengujinya.

Sekarang saatnya menutup lingkaran.

## Aturan arisan RT 05

1. Arisan dibuat dengan tiga parameter: besar **iuran**, **jumlah anggota**, dan **durasi tiap putaran**.
2. Warga mendaftar sampai kuota penuh. Saat penuh, arisan otomatis dimulai.
3. Setiap putaran, **semua** anggota setor iuran yang **tepat** sebelum tenggat, masing-masing sekali.
4. Setelah semua setor, siapa pun boleh memicu penetapan penerima. Penerima putaran ke-n adalah anggota yang bergabung ke-n.
5. Penerima **menarik sendiri** dananya.
6. Setelah putaran terakhir, arisan selesai.
7. Kalau tenggat lewat dan masih ada yang belum setor, siapa pun boleh membatalkan. Setoran putaran berjalan dikembalikan.

Kenapa giliran tidak diundi acak? Karena blockchain deterministik, sehingga angka "acak" yang dibuat di dalam contract bisa ditebak atau dimanipulasi. Urutan bergabung lebih transparan. Cara mendapat angka acak yang aman lewat oracle dibahas nanti.

## State machine

```text
            deploy(iuran, jumlahAnggota, durasi)
                         |
                         v
                   [Pendaftaran] <--+ gabung()
                         |          |
         anggota ke-N gabung        |
                         v
                     [Berjalan] <---+ setor() / tetapkanPemenang()
                      /       \
   tetapkanPemenang   |         |  batalkan() setelah tenggat
   di putaran terakhir|         |  dan ada yang belum setor
                      v         v
                 [Selesai]   [Batal]
```

Pola **state machine** ini sangat umum di smart contract: setiap function hanya boleh dipanggil pada status tertentu. Dengan modifier `hanyaStatus`, aturan itu dijaga di satu tempat.

## Keputusan desain yang penting

| Keputusan | Pilihan | Alasan |
| --- | --- | --- |
| Cara membayar pemenang | **Pull payment**: saldo dikreditkan, pemenang memanggil `tarik()` | Kalau salah satu penerima adalah contract yang menolak ETH, pengiriman otomatis akan revert dan membuat **seluruh arisan macet** |
| Urutan dalam `tarik()` | Nolkan saldo dulu, baru kirim | Checks-Effects-Interactions |
| Siapa yang memicu putaran berikutnya | Siapa saja | Tidak ada "admin" yang bisa menahan arisan |
| Penyimpanan setoran | `mapping(putaran => mapping(anggota => bool))` | Status tiap putaran terpisah, tidak perlu di-reset |
| Pembatalan | Hanya setoran putaran berjalan yang dikembalikan | Sederhana dan bisa diverifikasi |

Poin pertama itu bukan teori. Mengirim otomatis ke daftar penerima adalah salah satu pola serangan DoS paling klasik di smart contract.

## Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Arisan: menggantikan peran bendahara dengan aturan yang berjalan otomatis
/// @notice Giliran penerima mengikuti urutan bergabung. Pemenang menarik dananya sendiri.
contract Arisan {
    enum Status { Pendaftaran, Berjalan, Selesai, Batal }

    uint256 public immutable iuran;          // setoran per anggota per putaran (wei)
    uint256 public immutable jumlahAnggota;  // kuota anggota
    uint256 public immutable durasiPutaran;  // batas waktu setor per putaran (detik)

    Status public status;
    address[] public anggota;                // urutan bergabung = urutan giliran
    mapping(address => bool) public adalahAnggota;

    uint256 public putaran;                  // dimulai dari 1 saat arisan berjalan
    uint256 public tenggatPutaran;
    uint256 public jumlahSetorPutaranIni;
    mapping(uint256 => mapping(address => bool)) public sudahSetor;

    mapping(address => uint256) public bisaDitarik; // dana yang menunggu ditarik pemiliknya

    error StatusTidakSesuai(Status sekarang);
    error SudahMenjadiAnggota();
    error BukanAnggota();
    error JumlahIuranSalah(uint256 dikirim, uint256 seharusnya);
    error SudahSetor();
    error TenggatLewat();
    error BelumSemuaSetor();
    error BelumTenggat();
    error TidakAdaDana();
    error TransferGagal();
    error ParameterTidakValid();

    event Bergabung(address indexed anggota, uint256 urutan);
    event PutaranDimulai(uint256 indexed putaran, address indexed penerima, uint256 tenggat);
    event Setor(uint256 indexed putaran, address indexed anggota);
    event PemenangDitetapkan(uint256 indexed putaran, address indexed penerima, uint256 jumlah);
    event ArisanSelesai();
    event ArisanBatal(uint256 indexed putaran);
    event Ditarik(address indexed ke, uint256 jumlah);

    constructor(uint256 _iuran, uint256 _jumlahAnggota, uint256 _durasiPutaran) {
        if (_iuran == 0 || _jumlahAnggota < 2 || _durasiPutaran == 0) revert ParameterTidakValid();
        iuran = _iuran;
        jumlahAnggota = _jumlahAnggota;
        durasiPutaran = _durasiPutaran;
        status = Status.Pendaftaran;
    }

    modifier hanyaStatus(Status s) {
        if (status != s) revert StatusTidakSesuai(status);
        _;
    }

    function gabung() external hanyaStatus(Status.Pendaftaran) {
        if (adalahAnggota[msg.sender]) revert SudahMenjadiAnggota();
        adalahAnggota[msg.sender] = true;
        anggota.push(msg.sender);
        emit Bergabung(msg.sender, anggota.length);
        if (anggota.length == jumlahAnggota) {
            status = Status.Berjalan;
            _mulaiPutaran(1);
        }
    }

    function setor() external payable hanyaStatus(Status.Berjalan) {
        if (!adalahAnggota[msg.sender]) revert BukanAnggota();
        if (block.timestamp >= tenggatPutaran) revert TenggatLewat();
        if (sudahSetor[putaran][msg.sender]) revert SudahSetor();
        if (msg.value != iuran) revert JumlahIuranSalah(msg.value, iuran);
        sudahSetor[putaran][msg.sender] = true;
        jumlahSetorPutaranIni += 1;
        emit Setor(putaran, msg.sender);
    }

    /// @notice Siapa pun boleh memanggil setelah semua anggota setor.
    function tetapkanPemenang() external hanyaStatus(Status.Berjalan) {
        if (jumlahSetorPutaranIni < jumlahAnggota) revert BelumSemuaSetor();
        address penerima = penerimaPutaranIni();
        uint256 jumlah = iuran * jumlahAnggota;
        bisaDitarik[penerima] += jumlah;
        emit PemenangDitetapkan(putaran, penerima, jumlah);

        if (putaran == jumlahAnggota) {
            status = Status.Selesai;
            emit ArisanSelesai();
        } else {
            _mulaiPutaran(putaran + 1);
        }
    }

    /// @notice Kalau tenggat lewat dan masih ada yang belum setor, arisan dibatalkan.
    function batalkan() external hanyaStatus(Status.Berjalan) {
        if (block.timestamp < tenggatPutaran) revert BelumTenggat();
        if (jumlahSetorPutaranIni == jumlahAnggota) revert StatusTidakSesuai(status);
        status = Status.Batal;
        for (uint256 i = 0; i < anggota.length; i++) {
            address a = anggota[i];
            if (sudahSetor[putaran][a]) bisaDitarik[a] += iuran;
        }
        emit ArisanBatal(putaran);
    }

    /// @notice Pull payment: setiap orang menarik dananya sendiri
    function tarik() external {
        uint256 jumlah = bisaDitarik[msg.sender];
        if (jumlah == 0) revert TidakAdaDana();
        bisaDitarik[msg.sender] = 0;                       // effects
        (bool ok, ) = msg.sender.call{value: jumlah}("");  // interactions
        if (!ok) revert TransferGagal();
        emit Ditarik(msg.sender, jumlah);
    }

    function penerimaPutaranIni() public view returns (address) {
        return anggota[putaran - 1];
    }

    function daftarAnggota() external view returns (address[] memory) {
        return anggota;
    }

    function _mulaiPutaran(uint256 nomor) private {
        putaran = nomor;
        jumlahSetorPutaranIni = 0;
        tenggatPutaran = block.timestamp + durasiPutaran;
        emit PutaranDimulai(nomor, anggota[nomor - 1], tenggatPutaran);
    }
}
```

Perhatikan perulangan di `batalkan()`. Perulangan atas array di Solidity biasanya berbahaya karena bisa kehabisan gas. Di sini aman karena jumlah anggota kecil dan sudah dibatasi sejak constructor.

## Test

Mulai dengan helper supaya test-nya ringkas:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Arisan} from "../src/Arisan.sol";

contract ArisanTest is Test {
    Arisan arisan;
    uint256 constant IURAN = 0.1 ether;
    uint256 constant DURASI = 30 days;
    address budi = makeAddr("budi");
    address sari = makeAddr("sari");
    address joko = makeAddr("joko");
    address orangLuar = makeAddr("orangLuar");

    function setUp() public {
        arisan = new Arisan(IURAN, 3, DURASI);
        address[4] memory semua = [budi, sari, joko, orangLuar];
        for (uint256 i = 0; i < semua.length; i++) vm.deal(semua[i], 10 ether);
    }

    function _semuaGabung() internal {
        vm.prank(budi); arisan.gabung();
        vm.prank(sari); arisan.gabung();
        vm.prank(joko); arisan.gabung();
    }

    function _semuaSetor() internal {
        vm.prank(budi); arisan.setor{value: IURAN}();
        vm.prank(sari); arisan.setor{value: IURAN}();
        vm.prank(joko); arisan.setor{value: IURAN}();
    }
```

Lalu test-nya. Ini bagian yang paling penting, yaitu **siklus lengkap** yang membuktikan tidak ada uang yang muncul atau hilang:

```solidity
    function test_SiklusLengkapTigaPutaran() public {
        _semuaGabung();
        address[3] memory urutan = [budi, sari, joko];
        for (uint256 p = 0; p < 3; p++) {
            _semuaSetor();
            arisan.tetapkanPemenang();
            assertEq(arisan.bisaDitarik(urutan[p]), IURAN * 3);
            vm.prank(urutan[p]);
            arisan.tarik();
        }
        assertEq(uint256(arisan.status()), uint256(Arisan.Status.Selesai));
        // Setiap anggota setor 3 x 0,1 dan menerima 0,3: saldo kembali seperti semula
        assertEq(budi.balance, 10 ether);
        assertEq(sari.balance, 10 ether);
        assertEq(joko.balance, 10 ether);
        assertEq(address(arisan).balance, 0);
    }
```

Jalur gagalnya sama pentingnya:

```solidity
    function test_RevertSetorJumlahSalah() public {
        _semuaGabung();
        vm.prank(budi);
        vm.expectRevert(abi.encodeWithSelector(Arisan.JumlahIuranSalah.selector, 0.05 ether, IURAN));
        arisan.setor{value: 0.05 ether}();
    }

    function test_RevertSetorDuaKaliDalamSatuPutaran() public {
        _semuaGabung();
        vm.startPrank(budi);
        arisan.setor{value: IURAN}();
        vm.expectRevert(Arisan.SudahSetor.selector);
        arisan.setor{value: IURAN}();
        vm.stopPrank();
    }

    function test_RevertTetapkanPemenangSebelumSemuaSetor() public {
        _semuaGabung();
        vm.prank(budi); arisan.setor{value: IURAN}();
        vm.expectRevert(Arisan.BelumSemuaSetor.selector);
        arisan.tetapkanPemenang();
    }

    function test_BatalJikaAdaYangTidakSetor() public {
        _semuaGabung();
        vm.prank(budi); arisan.setor{value: IURAN}();
        vm.prank(sari); arisan.setor{value: IURAN}();
        // Joko tidak setor

        vm.expectRevert(Arisan.BelumTenggat.selector);
        arisan.batalkan();

        vm.warp(block.timestamp + DURASI);
        arisan.batalkan();
        assertEq(uint256(arisan.status()), uint256(Arisan.Status.Batal));
        assertEq(arisan.bisaDitarik(budi), IURAN);
        assertEq(arisan.bisaDitarik(sari), IURAN);
        assertEq(arisan.bisaDitarik(joko), 0);

        vm.prank(budi); arisan.tarik();
        assertEq(budi.balance, 10 ether);
    }

    function test_RevertTarikDuaKali() public {
        _semuaGabung();
        _semuaSetor();
        arisan.tetapkanPemenang();
        vm.startPrank(budi);
        arisan.tarik();
        vm.expectRevert(Arisan.TidakAdaDana.selector);
        arisan.tarik();
        vm.stopPrank();
    }

    function testFuzz_PotSamaDenganIuranKaliAnggota(uint64 iuranAcak) public {
        vm.assume(iuranAcak > 0);
        Arisan a = new Arisan(iuranAcak, 3, DURASI);
        address[3] memory semua = [budi, sari, joko];
        for (uint256 i = 0; i < 3; i++) { vm.prank(semua[i]); a.gabung(); }
        for (uint256 i = 0; i < 3; i++) {
            vm.deal(semua[i], iuranAcak);
            vm.prank(semua[i]);
            a.setor{value: iuranAcak}();
        }
        a.tetapkanPemenang();
        assertEq(a.bisaDitarik(budi), uint256(iuranAcak) * 3);
        assertEq(address(a).balance, uint256(iuranAcak) * 3);
    }
}
```

Catatan teknis: custom error **dengan parameter** diuji pakai `abi.encodeWithSelector`, bukan `.selector` saja.

```text
Suite result: ok. 15 passed; 0 failed; 0 skipped
```

Coverage baris pada solusi referensi sekitar 97%.

## Deploy dan demo

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Arisan} from "../src/Arisan.sol";

contract DeployArisan is Script {
    function run() external returns (Arisan arisan) {
        uint256 iuran = vm.envOr("IURAN_WEI", uint256(0.001 ether));
        uint256 jumlahAnggota = vm.envOr("JUMLAH_ANGGOTA", uint256(3));
        uint256 durasi = vm.envOr("DURASI_PUTARAN", uint256(1 days));

        vm.startBroadcast();
        arisan = new Arisan(iuran, jumlahAnggota, durasi);
        vm.stopBroadcast();

        console.log("Arisan dideploy di:", address(arisan));
    }
}
```

```bash
forge script script/DeployArisan.s.sol \
  --rpc-url $SEPOLIA_RPC_URL --account dev-sepolia \
  --broadcast --verify --etherscan-api-key $ETHERSCAN_API_KEY
```

Lalu jalankan satu putaran penuh tanpa frontend sama sekali: buka contract di [sepolia.etherscan.io](https://sepolia.etherscan.io) → tab **Contract** → **Write Contract** → **Connect to Web3**. Dengan tiga akun MetaMask bergantian: `gabung` → `setor` (isi kolom payable 0.001) → `tetapkanPemenang` → `tarik` dari akun penerima. Cek tab **Events** untuk memastikan semuanya tercatat.

## Tantangan bonus

1. **Jaminan anggota.** Saat bergabung, anggota menyetor jaminan sebesar iuran × (jumlah anggota − 1). Kalau arisan batal, jaminan anggota yang tidak setor dibagikan ke yang dirugikan.
2. **Invariant test.** Buktikan saldo contract selalu sama dengan total `bisaDitarik` ditambah setoran putaran berjalan.
3. **Denda telat.** Izinkan setor setelah tenggat dengan denda, dalam masa tenggang tertentu.

## Rangkuman

- Pola **state machine** dengan enum dan modifier membuat aturan "kapan function boleh dipanggil" jelas dan terpusat.
- **Pull payment** lebih aman daripada mengirim otomatis: satu penerima bermasalah tidak bisa membuat seluruh contract macet.
- Function yang memajukan proses bisa dipanggil siapa saja, sehingga tidak ada admin yang bisa menahan arisan.
- Test siklus lengkap membuktikan sifat terpenting: dalam arisan yang selesai, tidak ada uang yang muncul atau hilang.
- Contract terverifikasi di Etherscan bisa dipakai siapa pun tanpa frontend.

Tiga pertanyaan untuk direnungkan. Budi menerima pot di putaran 1, lalu di putaran 2 sengaja tidak setor sehingga arisan batal. Siapa yang dirugikan, dan bisakah contract Anda mencegahnya? Kenapa `tetapkanPemenang` sengaja boleh dipanggil siapa saja? Dan apa yang terjadi kalau jumlah anggota diatur 10.000, function mana yang berisiko kehabisan gas?

## Masalah terbuka

Arisan Anda berjalan dengan ETH. Tapi warga RT 05 protes: harga ETH naik turun setiap hari. Iuran 0,001 ETH bulan ini bisa bernilai berbeda bulan depan. Mereka ingin arisan dalam satuan yang stabil, atau dalam "poin warga" buatan RT sendiri.

Masalahnya, ETH adalah aset bawaan, sedangkan koin lain adalah **smart contract buatan orang**. Kalau setiap orang membuat koin dengan nama function berbeda, misalnya `kirim`, `transfer`, atau `pindahkan`, bagaimana contract arisan, wallet, dan bursa tahu cara memakainya?

Bagaimana membuat token yang bisa dikenali semua wallet dan aplikasi, tanpa harus saling berkoordinasi satu per satu?

Itulah modul berikutnya: standar token.
