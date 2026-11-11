---
title: "Modul 6: Testing dan Deploy dengan Foundry"
description: Smart contract tidak bisa ditambal setelah deploy, jadi testing adalah satu-satunya kesempatan menemukan bug sebelum dunia menemukannya.
date: 2026-10-14
slug: modul-6-testing-deploy-foundry
tags: tutorial web 3
series: Tutorial Web 3
status: draft
---

Di modul sebelumnya, Anda menguji contract dengan mengklik tombol di Remix, mengganti akun, dan menunggu tenggat lewat secara nyata. Pertanyaan yang tersisa: bagaimana menguji secara **otomatis, lengkap, dan cepat**, termasuk memajukan waktu dan berpura-pura jadi akun lain, lalu men-deploy dengan cara yang bisa diulang?

Di Web 2, bug bisa ditambal dengan deploy ulang dalam hitungan menit. Di smart contract, kode yang sudah di-deploy tidak bisa diubah dan bug berarti dana hilang. Testing bukan pelengkap. Itulah **satu-satunya kesempatan** Anda.

## Kenapa uji manual tidak cukup

| Uji manual di Remix | Masalahnya |
| --- | --- |
| Klik tombol satu per satu | 20 skenario × setiap perubahan kode = ratusan klik |
| Bergantung ingatan | Mudah lupa kasus tepi: setoran 0, memanggil dua kali |
| Menunggu waktu nyata | Menguji tenggat 7 hari berarti menunggu 7 hari |
| Hanya nilai yang terpikirkan | Anda menguji 1 dan 2 ETH, bug muncul di angka sangat besar |
| Deploy lewat klik | Sulit diulang, mudah salah parameter, tidak terdokumentasi |
| Kunci di browser | Untuk deploy otomatis, banyak pemula menaruh private key di kode lalu mengunggahnya ke GitHub |

> **Parity, November 2017.** Banyak wallet multisig Parity bergantung pada satu contract "library" bersama. Library itu ternyata belum pernah diinisialisasi, sehingga seorang pengguna bisa menjadikan dirinya pemilik, lalu tanpa sengaja memanggil fungsi penghancur contract. Ratusan ribu ETH di ratusan wallet membeku selamanya.
>
> Bugnya bukan pada logika rumit, tapi pada **skenario yang tidak pernah diuji**: "apa yang terjadi kalau orang lain memanggil fungsi inisialisasi?" Test yang baik selalu menanyakan *siapa saja yang bisa memanggil fungsi ini, dan dalam keadaan apa*.

## Analogi: simulator penerbangan

Pilot tidak belajar mendarat darurat dengan pesawat berisi penumpang. Mereka berlatih di simulator: bisa mengatur kondisi sesuka hati, melompati waktu ke fase pendaratan, mengulang skenario ratusan kali, menerima kondisi acak dari instruktur, dan punya checklist wajib sebelum terbang sungguhan.

| Simulator penerbangan | Foundry |
| --- | --- |
| Kabin simulator | **EVM lokal** yang dijalankan `forge test` |
| Mengatur kondisi | **Cheatcodes**: `vm.deal`, `vm.prank` |
| Melompati waktu | `vm.warp` |
| Skenario terukur yang bisa diulang | **Unit test** dengan `assertEq` |
| Kondisi acak dari instruktur | **Fuzz test** |
| Bandara latihan | **Anvil** |
| Rute penerbangan resmi | **Deploy script** |
| Checklist sebelum terbang | Coverage, gas report, verifikasi kode |

Foundry sendiri lahir 2021, saat tim Paradigm menulis ulang ide dapptools dalam Rust. Hasilnya sangat cepat, test-nya ditulis langsung dalam Solidity, dan fuzz testing-nya bawaan. Hardhat (2020, berbasis JavaScript/TypeScript) tetap banyak dipakai dan keduanya bisa digunakan bersamaan.

## Struktur proyek

```text
patungan-foundry/
├── foundry.toml          # konfigurasi: versi compiler, folder, RPC
├── src/                  # contract utama
│   └── Patungan.sol
├── test/                 # test, nama file berakhiran .t.sol
│   └── Patungan.t.sol
├── script/               # skrip deploy, berakhiran .s.sol
│   └── DeployPatungan.s.sol
├── lib/                  # dependensi: forge-std, OpenZeppelin
└── out/                  # hasil kompilasi (bytecode + ABI)
```

Setiap test berjalan di atas **state yang bersih**, karena `setUp` dijalankan ulang sebelum setiap test. Satu test tidak bisa mengganggu test lain.

## Cheatcodes yang paling sering dipakai

| Cheatcode | Fungsi | Analogi |
| --- | --- | --- |
| `makeAddr("budi")` | Alamat dengan label yang mudah dibaca | Kartu nama |
| `vm.deal(alamat, jumlah)` | Mengatur saldo ETH | Memberi uang mainan |
| `vm.prank(alamat)` | Panggilan **berikutnya** seolah dari alamat itu | Memakai topeng sekali |
| `vm.startPrank` / `vm.stopPrank` | Semua panggilan di antaranya | Memakai topeng lama |
| `vm.warp(waktu)` | Mengatur `block.timestamp` | Mesin waktu |
| `vm.roll(nomor)` | Mengatur nomor blok | Lompat halaman |
| `vm.expectRevert(...)` | Panggilan berikutnya **harus** revert | "Saya yakin ini gagal" |
| `vm.expectEmit(...)` | Harus memancarkan event tertentu | Memeriksa struk |
| `vm.assume(kondisi)` | Membuang input fuzz yang tidak relevan | Saringan |

## Praktik

```bash
forge init patungan-foundry
cd patungan-foundry
rm src/Counter.sol test/Counter.t.sol script/Counter.s.sol
```

Salin `Celengan.sol` dan `Patungan.sol` dari modul sebelumnya ke `src/`, lalu `forge build`.

### Latihan 1: Test pertama

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Celengan} from "../src/Celengan.sol";

contract CelenganTest is Test {
    Celengan celengan;
    address budi = makeAddr("budi"); // alamat palsu yang konsisten, berlabel "budi"

    // Dijalankan sebelum SETIAP test
    function setUp() public {
        celengan = new Celengan(); // contract test ini menjadi pemilik
        vm.deal(budi, 10 ether);   // beri Budi 10 ETH palsu
    }

    // Contract test perlu bisa menerima ETH saat celengan dibongkar
    receive() external payable {}

    function test_PemilikAdalahPendeploy() public view {
        assertEq(celengan.pemilik(), address(this));
    }

    function test_NabungMencatatSetoran() public {
        vm.prank(budi); // panggilan berikutnya seolah dari Budi
        celengan.nabung{value: 1 ether}();

        assertEq(celengan.tabungan(budi), 1 ether);
        assertEq(celengan.saldo(), 1 ether);
        assertEq(budi.balance, 9 ether);
    }

    function test_RevertJikaSetoranNol() public {
        vm.prank(budi);
        vm.expectRevert("Setoran harus lebih dari 0");
        celengan.nabung{value: 0}();
    }

    function test_RevertJikaBukanPemilikMembongkar() public {
        vm.prank(budi);
        vm.expectRevert("Hanya pemilik");
        celengan.bongkar();
    }

    function test_PemilikBisaMembongkar() public {
        vm.prank(budi);
        celengan.nabung{value: 2 ether}();

        uint256 sebelum = address(this).balance;
        celengan.bongkar();

        assertEq(address(this).balance - sebelum, 2 ether);
        assertEq(celengan.saldo(), 0);
    }

    function test_EmitEventMenabung() public {
        vm.expectEmit(true, false, false, true);
        emit Celengan.Menabung(budi, 1 ether);
        vm.prank(budi);
        celengan.nabung{value: 1 ether}();
    }
}
```

```bash
forge test --match-contract CelenganTest -vv
```

```text
[PASS] test_EmitEventMenabung() (gas: 66267)
[PASS] test_NabungMencatatSetoran() (gas: 66792)
[PASS] test_PemilikAdalahPendeploy() (gas: 7990)
[PASS] test_PemilikBisaMembongkar() (gas: 76320)
[PASS] test_RevertJikaBukanPemilikMembongkar() (gas: 13638)
[PASS] test_RevertJikaSetoranNol() (gas: 11450)
Suite result: ok. 6 passed; 0 failed; 0 skipped
```

Coba ini: di `Celengan.sol`, hapus baris `require(msg.sender == pemilik, ...)` lalu jalankan test lagi. Test mana yang gagal? Itulah gunanya test: perubahan berbahaya langsung ketahuan. Kembalikan baris itu setelahnya.

Tambahkan `-vvvv` untuk melihat jejak eksekusi lengkap saat test gagal.

### Latihan 2: Menguji dengan mesin waktu

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Patungan} from "../src/Patungan.sol";

contract PatunganTest is Test {
    Patungan patungan;
    address penggalang = makeAddr("penggalang");
    address budi = makeAddr("budi");
    address sari = makeAddr("sari");
    uint256 constant TARGET = 3 ether;
    uint256 constant DURASI = 7 days;

    function setUp() public {
        vm.prank(penggalang);
        patungan = new Patungan(TARGET, DURASI);
        vm.deal(budi, 10 ether);
        vm.deal(sari, 10 ether);
    }

    function test_KontribusiTercatat() public {
        vm.prank(budi);
        patungan.kontribusikan{value: 1 ether}();
        assertEq(patungan.kontribusi(budi), 1 ether);
        assertEq(patungan.terkumpul(), 1 ether);
    }

    function test_RevertKontribusiSetelahTenggat() public {
        vm.warp(block.timestamp + DURASI); // majukan waktu 7 hari
        vm.prank(budi);
        vm.expectRevert(Patungan.TenggatLewat.selector);
        patungan.kontribusikan{value: 1 ether}();
    }

    function test_CairkanJikaTargetTercapai() public {
        vm.prank(budi);
        patungan.kontribusikan{value: 2 ether}();
        vm.prank(sari);
        patungan.kontribusikan{value: 1 ether}();

        vm.prank(penggalang);
        patungan.cairkan();

        assertEq(penggalang.balance, 3 ether);
        assertTrue(patungan.sudahDicairkan());
    }

    function test_RevertCairkanDuaKali() public {
        vm.prank(budi);
        patungan.kontribusikan{value: 3 ether}();
        vm.startPrank(penggalang); // semua panggilan berikutnya dari penggalang
        patungan.cairkan();
        vm.expectRevert(Patungan.SudahDicairkan.selector);
        patungan.cairkan();
        vm.stopPrank();
    }

    function test_RefundJikaGagal() public {
        vm.prank(budi);
        patungan.kontribusikan{value: 1 ether}();

        vm.prank(budi);
        vm.expectRevert(Patungan.BelumTenggat.selector);
        patungan.tarikKembali();

        vm.warp(block.timestamp + DURASI);
        vm.prank(budi);
        patungan.tarikKembali();
        assertEq(budi.balance, 10 ether);
        assertEq(patungan.kontribusi(budi), 0);
    }

    function test_RevertRefundJikaTargetTercapai() public {
        vm.prank(budi);
        patungan.kontribusikan{value: 3 ether}();
        vm.warp(block.timestamp + DURASI);
        vm.prank(budi);
        vm.expectRevert(Patungan.TargetTercapai.selector);
        patungan.tarikKembali();
    }
}
```

Dua catatan: custom error tanpa parameter diuji dengan `.selector`, dan `vm.expectRevert` hanya berlaku untuk **satu** panggilan tepat setelahnya.

Test yang menguji kejadian 7 hari ke depan kini selesai dalam milidetik.

### Latihan 3: Fuzz test

```solidity
    // Foundry mengisi a dan b dengan ratusan nilai acak
    function testFuzz_TotalSamaDenganJumlahKontribusi(uint96 a, uint96 b) public {
        vm.deal(budi, a);
        vm.deal(sari, b);
        vm.prank(budi);
        patungan.kontribusikan{value: a}();
        vm.prank(sari);
        patungan.kontribusikan{value: b}();
        assertEq(patungan.terkumpul(), uint256(a) + uint256(b));
        assertEq(address(patungan).balance, uint256(a) + uint256(b));
    }

    function testFuzz_RefundMengembalikanTepat(uint96 jumlah) public {
        vm.assume(jumlah > 0 && jumlah < TARGET);
        vm.deal(budi, jumlah);
        vm.prank(budi);
        patungan.kontribusikan{value: jumlah}();
        vm.warp(block.timestamp + DURASI);
        vm.prank(budi);
        patungan.tarikKembali();
        assertEq(budi.balance, jumlah);
    }
```

```text
[PASS] testFuzz_RefundMengembalikanTepat(uint96) (runs: 256, μ: 81834, ~: 81834)
[PASS] testFuzz_TotalSamaDenganJumlahKontribusi(uint96,uint96) (runs: 256, μ: 101047, ~: 102087)
```

`runs: 256` berarti setiap fuzz test dijalankan 256 kali dengan input acak berbeda.

Kenapa `uint96`, bukan `uint256`? Karena `uint256` acak bisa melebihi total ETH yang mungkin ada, sehingga `a + b` overflow dan test gagal karena alasan yang tidak realistis.

Ukur kualitasnya:

```bash
forge test --gas-report
forge coverage --report summary
```

> [!hasil]
> 100% baris untuk kedua contract, tapi coverage cabang Patungan masih di bawah 100%. Coba cari cabang mana yang belum diuji. Petunjuknya ada pada transfer ETH yang gagal.

### Latihan 4: Deploy dengan skrip

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Patungan} from "../src/Patungan.sol";

contract DeployPatungan is Script {
    function run() external returns (Patungan patungan) {
        uint256 target = vm.envOr("TARGET_WEI", uint256(0.01 ether));
        uint256 durasi = vm.envOr("DURASI_DETIK", uint256(7 days));

        vm.startBroadcast(); // transaksi di antara start dan stop dikirim ke jaringan
        patungan = new Patungan(target, durasi);
        vm.stopBroadcast();

        console.log("Patungan dideploy di:", address(patungan));
        console.log("Target (wei):", target);
        console.log("Tenggat (unix):", patungan.tenggat());
    }
}
```

Deploy ke Anvil (jalankan `anvil` di terminal lain). Private key di bawah adalah akun #0 Anvil yang **publik**, hanya untuk jaringan lokal:

```bash
forge script script/DeployPatungan.s.sol \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

Pada Anvil yang baru dijalankan, alamat contract pertama dari akun #0 selalu `0x5FbDB2315678afecb367f032d93F642f64180aa3`, karena alamat contract dihitung dari alamat pendeploy dan nonce-nya.

Lalu berinteraksi lewat terminal:

```bash
ADDR=0x5FbDB2315678afecb367f032d93F642f64180aa3
cast call $ADDR "target()(uint256)" --rpc-url http://127.0.0.1:8545
# 10000000000000000 [1e16]

cast send $ADDR "kontribusikan()" --value 0.004ether \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d \
  --rpc-url http://127.0.0.1:8545

cast call $ADDR "terkumpul()(uint256)" --rpc-url http://127.0.0.1:8545
# 4000000000000000 [4e15]
```

## Menyimpan kunci saat deploy

Ini bagian yang paling sering jadi bencana. Dari paling berisiko ke paling aman:

| Cara | Risiko |
| --- | --- |
| Private key ditulis di kode | Sangat berbahaya. Hampir pasti bocor saat di-commit |
| Private key di `.env` (masuk `.gitignore`) | Bisa diterima untuk testnet, tapi tetap tersimpan sebagai teks biasa |
| **Keystore terenkripsi** (`cast wallet import`) | Disarankan, karena terenkripsi dengan password |
| Hardware wallet (`--ledger`) | Paling aman untuk mainnet |

```bash
# 1. Simpan private key wallet BELAJAR Anda ke keystore terenkripsi (sekali saja)
cast wallet import dev-sepolia --interactive

# 2. Deploy dan verifikasi kode di Etherscan
forge script script/DeployPatungan.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --account dev-sepolia \
  --broadcast \
  --verify --etherscan-api-key $ETHERSCAN_API_KEY
```

Setelah berhasil, buka alamat contract di [sepolia.etherscan.io](https://sepolia.etherscan.io). Tab **Contract** menampilkan kode sumber dengan centang hijau, dan siapa pun bisa membaca serta memanggil function lewat tab **Read Contract** dan **Write Contract**.

## Batas dari testing

Test yang lolos semua tidak berarti contract aman. Test hanya membuktikan contract benar **untuk skenario yang Anda pikirkan**.

1. **Coverage 100% bukan jaminan.** Setiap baris dijalankan bukan berarti setiap kombinasi kondisi diuji.
2. **Test bisa salah** sama seperti kode. Test yang ditulis setelah kode cenderung hanya mengonfirmasi apa yang sudah dibuat.
3. **Cheatcodes hanya ada di simulasi.** Di jaringan sungguhan ada hal yang tidak bisa dikendalikan, seperti urutan transaksi dan perilaku penyerang.
4. **Manajemen kunci saat deploy** rawan kesalahan fatal.

Dan satu nasihat praktis: jangan menulis test hanya demi angka coverage. Fokus pada perilaku penting: siapa boleh melakukan apa, kapan, dan berapa.

## Rangkuman

- Smart contract tidak bisa ditambal setelah deploy, jadi testing adalah satu-satunya kesempatan menemukan bug lebih dulu.
- **Foundry**: `forge` untuk build/test/skrip, `cast` untuk interaksi, `anvil` untuk blockchain lokal.
- Setiap test berjalan di state bersih setelah `setUp`.
- Uji **jalur sukses dan jalur gagal**, terutama "siapa yang boleh memanggil fungsi ini, dan kapan".
- **Fuzz test** memeriksa sifat yang harus selalu benar untuk ratusan input acak.
- Alur deploy: test → Anvil → Sepolia → verifikasi. Kunci di **keystore terenkripsi**, jangan di kode.

## Masalah terbuka

Anda sekarang bisa menulis contract, mengujinya otomatis, dan men-deploy-nya ke jaringan publik. Saatnya kembali ke masalah yang membuka seluruh seri ini: **arisan RT 05 dan Bu Bendahara**.

Arisan jauh lebih rumit daripada patungan. Ada keanggotaan, setoran berulang tiap putaran, giliran penerima yang harus adil, anggota yang telat setor, dan aturan kapan arisan selesai.

Bisakah Anda membangun contract arisan lengkap yang menggantikan peran bendahara, teruji dengan baik, dan benar-benar berjalan di Sepolia?

Itulah proyek berikutnya.
