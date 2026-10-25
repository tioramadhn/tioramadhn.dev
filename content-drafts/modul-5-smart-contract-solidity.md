---
title: "Modul 5: Smart Contract dengan Solidity"
description: Saat blockchain berubah dari buku kas jadi komputer dunia: menulis program yang hidup di blockchain, memegang uang, dan menjalankan aturannya sendiri.
date: 2026-10-13
slug: modul-5-smart-contract-solidity
tags: tutorial web 3
series: Tutorial Web 3
status: draft
---

Sampai modul sebelumnya, transaksi Anda hanya bisa memindahkan ETH. Arisan RT 05 masih butuh bendahara manusia yang memegang uang semua anggota.

Modul ini menjawab: bagaimana kalau **aturan itu sendiri** jadi program yang hidup di blockchain, memegang uang, dan berjalan otomatis tanpa bisa dicurangi siapa pun, termasuk pembuatnya?

Dua hal yang sempat ditunda di modul sebelumnya, **contract account** dan field **data**, adalah pintu masuknya.

## Kesepakatan selalu butuh penjamin

| Kesepakatan | Penjamin | Kelemahan |
| --- | --- | --- |
| Arisan | Bendahara | Bisa kabur, salah catat, pilih kasih |
| Jual beli online | Marketplace | Memotong biaya, bisa menahan dana, aturan berubah sepihak |
| Patungan | Platform penggalangan | Biaya platform, dana bisa dibekukan |
| Kontrak kerja | Pengadilan | Mahal dan lama |

Polanya sama: kesepakatan ditulis dalam bahasa manusia, lalu dijalankan manusia atau lembaga. Perantara itu harus dipercaya, dibayar, dan bisa gagal.

Istilah **smart contract** sendiri lahir pada 1994 dari Nick Szabo, ilmuwan komputer sekaligus ahli hukum. Contoh favoritnya: mesin penjual otomatis. Bitcoin punya bahasa skrip tapi sengaja dibatasi; Vitalik Buterin mengusulkan blockchain dengan bahasa pemrograman lengkap, dijalankan mesin virtual bernama **EVM**. Pada 2014, Gavin Wood membuat **Solidity** dengan sintaks mirip JavaScript dan C++, agar developer web mudah beralih.

## Analogi: mesin penjual otomatis

Mesin minuman di stasiun:

- **Aturannya tertulis dan tidak bisa ditawar:** masukkan Rp10.000, tekan A1, keluar teh botol.
- **Tidak ada penjaga.** Mesin menjalankan aturan sendiri, 24 jam.
- **Mesin menyimpan uang** di dalam dirinya.
- **Ada tombol yang hanya bisa dipakai pemilik** untuk mengambil uang.
- **Semua orang bisa melihat daftar harga** sebelum membeli.
- **Kalau uangnya kurang, mesin menolak** dan mengembalikan uang Anda.
- Tapi kalau **mesinnya dirakit salah**, misalnya ada tombol yang mengeluarkan seluruh isi, siapa pun yang tahu bisa mengurasnya.

| Mesin penjual | Smart contract |
| --- | --- |
| Mesin yang dipasang di stasiun | Contract yang **deploy** ke blockchain, punya alamat sendiri |
| Daftar harga dan tombol | **Function** |
| Stok dan catatan di dalam mesin | **State variable** |
| Uang di dalam mesin | Saldo ETH milik contract |
| Memasukkan uang sambil menekan tombol | Transaksi dengan **value** ke function **payable** |
| Uang ditolak dan dikembalikan | **revert** |
| Kunci khusus pemilik | Pengecekan **msg.sender** atau **modifier** |
| Struk pembelian | **Event** |
| Rancangan mesin dari pabrik | Kode Solidity, dikompilasi jadi **bytecode** |
| Petunjuk tombol untuk pembeli | **ABI** |

Batasnya: mesin penjual bisa dibongkar teknisi. Smart contract yang sudah di-deploy umumnya **tidak bisa diubah**.

## Dari kode ke contract

```text
Kode Solidity (.sol)
        |
        v
   Compiler solc
      /      \
     v        v
 Bytecode    ABI (daftar function + parameternya)
     |         |
     v         v
Transaksi    Frontend / viem
deploy            |
     |            | transaksi: to = alamat contract,
     v            | data = function + argumen
Contract account <+
(alamat baru)
```

1. Compiler menghasilkan **bytecode** (instruksi EVM) dan **ABI** (deskripsi function dalam JSON).
2. **Deploy** adalah transaksi tanpa penerima yang field `data`-nya berisi bytecode. Hasilnya contract account dengan alamat baru.
3. **Memanggil function** adalah transaksi ke alamat contract, dengan `data` berisi "function apa" dan "argumennya apa".

Ada dua jenis panggilan:

| Jenis | Contoh | Mengubah state? | Butuh gas? |
| --- | --- | --- | --- |
| **Call** (membaca) | Melihat saldo, melihat jumlah suara | Tidak | Tidak, karena dijalankan satu node dan gratis |
| **Transaction** (menulis) | Menabung, memilih, mencairkan | Ya | Ya |

Function yang hanya membaca diberi label `view` (membaca state) atau `pure` (tidak menyentuh state sama sekali).

## Anatomi contract

```solidity
// SPDX-License-Identifier: MIT          // lisensi kode
pragma solidity ^0.8.24;                 // versi compiler

contract Contoh {
    // 1. State variable: tersimpan permanen, mahal untuk ditulis
    address public pemilik;
    mapping(address => uint256) public saldo;

    // 2. Event: log untuk aplikasi luar
    event Disetor(address indexed dari, uint256 jumlah);

    // 3. Custom error: pesan gagal yang hemat gas
    error BukanPemilik();

    // 4. Modifier: syarat yang bisa dipakai ulang
    modifier hanyaPemilik() {
        if (msg.sender != pemilik) revert BukanPemilik();
        _;                                // lanjutkan isi function
    }

    // 5. Constructor: dijalankan SEKALI saat deploy
    constructor() { pemilik = msg.sender; }

    // 6. Function
    function setor() external payable { /* ... */ }
}
```

Empat variabel global yang selalu tersedia: `msg.sender` (alamat pemanggil, identitas yang dibuktikan tanda tangan), `msg.value` (wei yang dikirim bersama panggilan), `block.timestamp` (waktu blok), dan `address(this).balance` (saldo contract ini).

Tipe data yang sering dipakai:

| Tipe | Catatan |
| --- | --- |
| `uint256` | Bilangan bulat tanpa tanda. **Tidak ada desimal**, karena ETH selalu dalam wei |
| `bool` | true/false |
| `address` | `address payable` untuk yang bisa menerima ETH |
| `string` | Mahal disimpan, gunakan seperlunya |
| `mapping(K => V)` | Seperti kamus. Tidak bisa di-iterate dan tidak tahu panjangnya |
| `struct` | Mengelompokkan data |
| Array `T[]` | Hati-hati: perulangan atas array besar bisa kehabisan gas |

Dan empat tingkat visibilitas function: `public` (mana saja), `external` (hanya dari luar), `internal` (contract ini dan turunannya), `private` (hanya contract ini, tapi datanya **tetap terlihat publik** di blockchain).

## Revert: semua atau tidak sama sekali

Kalau di tengah function ada `require` yang gagal atau `revert`, **semua perubahan dalam transaksi itu dibatalkan**, ETH yang dikirim dikembalikan, tapi gas yang terpakai tetap dibayar.

- `require(kondisi, "pesan")` adalah cara klasik yang mudah dibaca.
- `if (!kondisi) revert NamaError();` memakai custom error: lebih hemat gas dan bisa membawa data.

## Mengirim ETH dengan aman

Contract tidak punya private key, tapi bisa mengirim ETH karena **kodenya sendiri yang memerintahkan** saat dipanggil:

```solidity
// 1. Ubah state DULU
kontribusi[msg.sender] = 0;
// 2. Baru kirim ETH
(bool ok, ) = msg.sender.call{value: jumlah}("");
require(ok, "Transfer gagal");
```

Urutan "ubah state dulu, baru kirim" disebut pola **Checks-Effects-Interactions**. Kenapa urutannya sangat penting akan dibahas tuntas di modul keamanan. Untuk sekarang, jadikan kebiasaan.

## Praktik di Remix

Semua latihan dikerjakan di [Remix IDE](https://remix.ethereum.org), diuji dengan compiler Solidity 0.8.28.

Alurnya: buat file di **File Explorer** → pilih versi compiler 0.8.24+ di panel **Solidity Compiler** → klik **Compile** → di panel **Deploy & Run**, pilih Environment **Remix VM** (blockchain simulasi berisi akun 100 ETH palsu) → **Deploy**. Tombol biru = baca (gratis), oranye = tulis, merah = payable.

### Latihan 1: Celengan bersama

Siapa pun boleh menabung, hanya pemilik yang boleh membongkar.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Celengan {
    address public pemilik;
    mapping(address => uint256) public tabungan;
    uint256 public totalSetoran;

    event Menabung(address indexed penabung, uint256 jumlah);
    event Dibongkar(uint256 jumlah);

    constructor() {
        pemilik = msg.sender; // yang men-deploy jadi pemilik
    }

    function nabung() external payable {
        require(msg.value > 0, "Setoran harus lebih dari 0");
        tabungan[msg.sender] += msg.value;
        totalSetoran += msg.value;
        emit Menabung(msg.sender, msg.value);
    }

    function saldo() external view returns (uint256) {
        return address(this).balance;
    }

    function bongkar() external {
        require(msg.sender == pemilik, "Hanya pemilik");
        uint256 jumlah = address(this).balance;
        (bool ok, ) = pemilik.call{value: jumlah}("");
        require(ok, "Transfer gagal");
        emit Dibongkar(jumlah);
    }
}
```

Langkah ujinya: deploy dengan akun pertama, lalu ganti ke akun kedua, isi **Value** 1 **Ether**, klik `nabung`. Cek `saldo` dan `totalSetoran`; keduanya harus `1000000000000000000` (1 ETH dalam wei). Masih dengan akun kedua, klik `bongkar`: gagal dengan pesan "Hanya pemilik", dan perhatikan saldo akun kedua **tetap berkurang** sedikit karena gas. Ganti ke akun pertama, `bongkar` berhasil.

Tiga hal untuk dipikirkan: kenapa `nabung` harus `payable` (coba hapus kata itu dan kirim ETH)? Kenapa `saldo` tidak memakan gas? Dan apakah masuk akal bahwa `tabungan` akun kedua tidak berubah setelah celengan dibongkar?

### Latihan 2: Pemilihan ketua RT

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Voting {
    struct Kandidat {
        string nama;
        uint256 suara;
    }

    Kandidat[] public kandidat;
    mapping(address => bool) public sudahMemilih;
    address public immutable panitia;
    bool public ditutup;

    error SudahMemilih();
    error KandidatTidakAda(uint256 indeks);
    error BukanPanitia();
    error PemilihanDitutup();

    event Memilih(address indexed pemilih, uint256 indexed indeksKandidat);

    modifier hanyaPanitia() {
        if (msg.sender != panitia) revert BukanPanitia();
        _;
    }

    constructor(string[] memory namaKandidat) {
        panitia = msg.sender;
        for (uint256 i = 0; i < namaKandidat.length; i++) {
            kandidat.push(Kandidat({nama: namaKandidat[i], suara: 0}));
        }
    }

    function pilih(uint256 indeks) external {
        if (ditutup) revert PemilihanDitutup();
        if (sudahMemilih[msg.sender]) revert SudahMemilih();
        if (indeks >= kandidat.length) revert KandidatTidakAda(indeks);
        sudahMemilih[msg.sender] = true;   // cek dulu, ubah state kemudian
        kandidat[indeks].suara += 1;
        emit Memilih(msg.sender, indeks);
    }

    function tutup() external hanyaPanitia {
        ditutup = true;
    }

    function pemenang() external view returns (string memory nama, uint256 suara) {
        uint256 terbanyak;
        for (uint256 i = 1; i < kandidat.length; i++) {
            if (kandidat[i].suara > kandidat[terbanyak].suara) terbanyak = i;
        }
        return (kandidat[terbanyak].nama, kandidat[terbanyak].suara);
    }
}
```

Saat deploy di Remix, isi parameter constructor dengan format JSON: `["Pak Andi","Bu Rina"]`.

Yang harus terjadi: dua akun memilih indeks 1, lalu `pemenang` menghasilkan "Bu Rina" dengan 2 suara. Memilih dua kali ditolak `SudahMemilih`. Indeks 5 ditolak `KandidatTidakAda(5)`. Akun selain panitia yang memanggil `tutup` ditolak `BukanPanitia`.

Satu pertanyaan yang pantas mengganggu: apakah "satu alamat satu suara" benar-benar adil, mengingat membuat alamat baru itu gratis? Itu Sybil attack yang sama, dan solusinya dibahas di modul DAO.

### Latihan 3: Patungan dengan target dan tenggat

Aturannya: constructor menerima target (wei) dan durasi; siapa pun bisa berkontribusi sebelum tenggat; penggalang bisa mencairkan hanya jika target tercapai dan hanya sekali; setelah tenggat lewat **dan** target tidak tercapai, tiap kontributor bisa menarik kembali dananya sendiri.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Patungan {
    address public immutable penggalang;
    uint256 public immutable target;
    uint256 public immutable tenggat;
    uint256 public terkumpul;
    bool public sudahDicairkan;
    mapping(address => uint256) public kontribusi;

    error TenggatLewat();
    error BelumTenggat();
    error TargetBelumTercapai();
    error TargetTercapai();
    error BukanPenggalang();
    error TidakAdaKontribusi();
    error SudahDicairkan();
    error TransferGagal();

    event Berkontribusi(address indexed dari, uint256 jumlah);
    event Dicairkan(uint256 jumlah);
    event Refund(address indexed ke, uint256 jumlah);

    constructor(uint256 _target, uint256 durasiDetik) {
        penggalang = msg.sender;
        target = _target;
        tenggat = block.timestamp + durasiDetik;
    }

    function kontribusikan() external payable {
        if (block.timestamp >= tenggat) revert TenggatLewat();
        kontribusi[msg.sender] += msg.value;
        terkumpul += msg.value;
        emit Berkontribusi(msg.sender, msg.value);
    }

    function cairkan() external {
        if (msg.sender != penggalang) revert BukanPenggalang();
        if (terkumpul < target) revert TargetBelumTercapai();
        if (sudahDicairkan) revert SudahDicairkan();
        sudahDicairkan = true; // ubah state dulu, baru kirim ETH
        uint256 jumlah = address(this).balance;
        (bool ok, ) = penggalang.call{value: jumlah}("");
        if (!ok) revert TransferGagal();
        emit Dicairkan(jumlah);
    }

    function tarikKembali() external {
        if (block.timestamp < tenggat) revert BelumTenggat();
        if (terkumpul >= target) revert TargetTercapai();
        uint256 jumlah = kontribusi[msg.sender];
        if (jumlah == 0) revert TidakAdaKontribusi();
        kontribusi[msg.sender] = 0; // nolkan dulu, baru kirim ETH
        (bool ok, ) = msg.sender.call{value: jumlah}("");
        if (!ok) revert TransferGagal();
        emit Refund(msg.sender, jumlah);
    }
}
```

Saat menguji, deploy dengan durasi pendek (60 detik) agar Anda bisa menguji skenario setelah tenggat, karena Remix VM memakai waktu nyata komputer Anda.

**Bonus:** deploy ke Sepolia. Di panel Deploy, pilih Environment **Injected Provider – MetaMask**, pastikan MetaMask di jaringan Sepolia, lalu deploy dengan target kecil (0,001 ETH = `1000000000000000` wei). Cari alamat contract Anda di [sepolia.etherscan.io](https://sepolia.etherscan.io). Contract pertama Anda kini hidup di jaringan publik.

## Yang harus Anda waspadai

Menulis smart contract lebih mirip membuat perangkat lunak untuk satelit daripada membuat website: sekali diluncurkan, sulit diperbaiki, dan kesalahan berarti kerugian nyata.

1. **Bug tidak bisa ditambal.** Kode yang salah tetap salah selamanya.
2. **Semua data publik.** Variabel `private` tetap bisa dibaca siapa pun dari blockchain. Kata `private` hanya berarti contract lain tidak bisa mengaksesnya.
3. **Penyimpanan sangat mahal.** File dan gambar tidak disimpan di contract.
4. **Tidak bisa mengakses dunia luar.** Contract tidak tahu harga rupiah atau cuaca tanpa oracle.
5. **Kode yang benar secara teknis belum tentu adil.** Contract bisa menyembunyikan fungsi yang memungkinkan pembuatnya menarik semua dana. Baca kodenya sebelum ikut.
6. **Status hukumnya belum jelas** di banyak negara.

Semboyan awal komunitas adalah "code is law": apa pun yang diizinkan kode, itulah yang berlaku. Masalahnya, kode bisa salah. Pada 2016, contract investasi bernama The DAO kehilangan dana besar karena celah di kodenya, dan komunitas Ethereum sampai memutuskan mengubah sejarah blockchain. Smart contract hanya sepintar dan seaman kode yang Anda tulis.

## Rangkuman

- **Smart contract** adalah program dengan alamat dan saldo sendiri yang dijalankan deterministik oleh semua node.
- Kode Solidity dikompilasi jadi **bytecode** (untuk EVM) dan **ABI** (petunjuk memanggil function).
- **Membaca** gratis, **menulis** butuh transaksi dan gas.
- `msg.sender` adalah identitas pemanggil; `msg.value` adalah ETH yang dikirim.
- **Revert** membatalkan seluruh perubahan dalam transaksi, tapi gas tetap dibayar.
- Biasakan pola **ubah state dulu, baru kirim ETH**.

## Masalah terbuka

Sejauh ini cara Anda memastikan contract benar adalah mengklik tombol di Remix satu per satu, ganti akun, amati hasilnya. Untuk contract Patungan saja, Anda harus menunggu tenggat lewat secara nyata untuk menguji refund.

Sekarang bayangkan contract itu memegang dana ratusan warga, tidak bisa diubah setelah deploy, dan setiap perubahan kecil pada kode berarti mengulang semua klik itu dari awal.

Bagaimana menguji contract secara otomatis, lengkap, dan cepat, termasuk "memajukan waktu" dan berpura-pura jadi akun lain, lalu men-deploy-nya dengan skrip yang bisa diulang?

Itulah modul berikutnya: alur kerja developer dengan Foundry.
