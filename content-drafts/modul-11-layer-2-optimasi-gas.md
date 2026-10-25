---
title: "Modul 11: Skalabilitas, Layer 2, dan Optimasi Gas"
description: Aman tapi mahal tidak ada gunanya. Di mana transaksi sebaiknya dijalankan, dan bagaimana menulis contract yang hemat.
date: 2026-10-21
slug: modul-11-layer-2-optimasi-gas
tags: tutorial web 3
series: Tutorial Web 3
status: draft
---

Warga RT 05 protes soal biaya: saat Ethereum ramai, satu transaksi setor bisa memakan biaya yang tidak sebanding dengan iuran arisannya. Masalah ini sudah muncul sejak awal seri: CryptoKitties yang membuat Ethereum macet, trilema blockchain, dan base fee yang naik saat padat.

Modul ini menjawab dua pertanyaan: **di mana** transaksi sebaiknya dijalankan agar murah, dan **bagaimana** menulis contract agar hemat.

Untuk aplikasi seperti arisan, tiket, atau pembayaran kecil, biaya transaksi menentukan apakah aplikasi Anda bisa dipakai orang sungguhan atau tidak.

## Kenapa Layer 1 mahal

**Setiap node** menjalankan **setiap transaksi** dan menyimpan **setiap data**. Itu yang membuatnya aman dan terdesentralisasi, sekaligus yang membuatnya terbatas.

| Faktor | Dampak |
| --- | --- |
| Ruang blok terbatas | Hanya sejumlah gas tertentu muat dalam satu blok |
| Permintaan naik | Base fee naik otomatis |
| Semua node mengerjakan semuanya | Menambah kapasitas berarti menaikkan syarat perangkat keras node, sehingga lebih sedikit orang mampu menjalankannya dan jaringan jadi lebih terpusat |

Cara lama mengatasinya: membuat blockchain baru yang lebih cepat dengan validator lebih sedikit. Hasilnya cepat dan murah, tapi mengorbankan desentralisasi atau keamanan.

## Analogi: loket kolektif di kantor kelurahan

Kantor kelurahan punya satu loket resmi dengan antrean selalu panjang. Setiap warga harus mengantre sendiri untuk setiap urusan.

Solusinya: Ketua RT membuka **loket kolektif** di balai RT. Warga mengurus semuanya di sana dengan cepat. Setiap sore, Ketua RT membawa **satu map berisi ringkasan semua urusan hari itu** ke loket kelurahan, lengkap dengan salinan dokumennya. Satu kali antre untuk ratusan urusan.

Tapi bagaimana kelurahan tahu Ketua RT jujur? Ada dua cara:

- **Optimistic.** Kelurahan menerima map itu, tapi memberi **masa sanggah** (misalnya 7 hari). Siapa pun yang menemukan kecurangan bisa membuktikannya, dan map dibatalkan.
- **ZK.** Ketua RT melampirkan **sertifikat matematis** yang membuktikan semua perhitungan benar, tanpa kelurahan harus memeriksa satu per satu.

| Kantor kelurahan | Rollup |
| --- | --- |
| Loket resmi kelurahan | **Layer 1** |
| Loket kolektif di balai RT | **Layer 2** (rollup) |
| Ketua RT yang menyusun urutan | **Sequencer** |
| Map ringkasan + salinan dokumen | **Batch** transaksi + data ke L1 (sebagai blob) |
| Masa sanggah | **Challenge period** dan **fraud proof** |
| Sertifikat matematis | **Validity proof** (ZK rollup) |
| Mengambil dokumen dari kelurahan | **Bridge** dan penarikan ke L1 |

## Cara kerja rollup

```text
Pengguna --transaksi murah--> Sequencer L2 --eksekusi cepat--> State L2
                                   |
                                   +--batch data terkompresi (blob)--> Ethereum L1
                                   +--komitmen state + bukti--------> Contract rollup di L1
                                                                            ^
                                   Verifikator / siapa pun --cek data------+
```

1. Pengguna mengirim transaksi ke sequencer L2, konfirmasi hampir instan.
2. Sequencer menjalankan transaksi dan memperbarui state L2.
3. Secara berkala, sequencer mengirim **data** ratusan sampai ribuan transaksi dalam bentuk terkompresi ke L1, kini umumnya sebagai blob.
4. Contract rollup di L1 menerima komitmen state dan, tergantung jenisnya, menunggu masa sanggah atau memverifikasi bukti ZK.
5. Karena datanya ada di L1, siapa pun bisa merekonstruksi state L2. Itulah yang membuat L2 "mewarisi" keamanan L1.

Kenapa murah? Biaya L1 dibagi ke banyak transaksi dalam satu batch, data dikompresi, dan blob jauh lebih murah daripada calldata biasa. Upgrade Dencun pada Maret 2024 memperkenalkan blob, dan biaya di banyak L2 turun drastis setelahnya.

| Aspek | Optimistic rollup | ZK rollup |
| --- | --- | --- |
| Asumsi | Batch dianggap benar kecuali dibuktikan curang | Setiap batch disertai bukti matematis |
| Penarikan ke L1 (jalur resmi) | Lama, umumnya ±7 hari masa sanggah | Lebih cepat |
| Kompatibilitas EVM | Sangat tinggi | Makin tinggi, kadang ada perbedaan kecil |
| Contoh | Arbitrum, Optimism, Base | zkSync, Starknet, Scroll, Linea |

Biaya di L2 terdiri dari dua bagian: **biaya eksekusi L2** (gas L2 × harga gas L2, biasanya sangat rendah) dan **biaya data L1** (bagian Anda dari biaya mengirim batch). Karena itu di L2, **ukuran data transaksi** ikut berpengaruh, bukan hanya komputasinya.

## Dari mana biaya gas berasal

Urutan kasar dari yang paling mahal:

| Operasi | Kira-kira biaya |
| --- | --- |
| Menulis storage dari nol ke bukan nol | Sangat mahal (puluhan ribu gas) |
| Menulis storage bukan nol ke bukan nol | Mahal (beberapa ribu gas) |
| Membaca storage pertama kali (cold) | Sedang |
| Event | Murah |
| Operasi memory dan aritmetika | Sangat murah |

### Latihan 1: Mengukur sendiri

```solidity
contract Gudang {
    uint256 public a;
    uint256 public b;
    uint256[] public riwayat;
    event Dicatat(uint256 nilai);

    function tulisA(uint256 x) external { a = x; }
    function tulisB(uint256 x) external { b = x; }
    function simpanRiwayat(uint256 x) external { riwayat.push(x); }
    function catatEvent(uint256 x) external { emit Dicatat(x); }
}

contract BiayaStorageTest is Test {
    Gudang g;

    function setUp() public {
        g = new Gudang();
        g.tulisB(1); // b sudah berisi (bukan nol) sejak awal
    }

    function _ukur(string memory label, function(uint256) external f, uint256 x) internal {
        uint256 awal = gasleft();
        f(x);
        console.log(label, awal - gasleft());
    }

    function test_BandingkanBiaya() public {
        _ukur("1. Nol -> bukan nol (slot a baru)   :", g.tulisA, 7);
        _ukur("2. Bukan nol -> bukan nol (slot b)  :", g.tulisB, 8);
        _ukur("3. Menulis nilai yang sama (slot b) :", g.tulisB, 8);
        _ukur("4. Menambah ke array (storage)      :", g.simpanRiwayat, 9);
        _ukur("5. Mencatat lewat event             :", g.catatEvent, 9);
    }
}
```

```text
1. Nol -> bukan nol (slot a baru)   : 25507
2. Bukan nol -> bukan nol (slot b)  : 5952
3. Menulis nilai yang sama (slot b) : 1052
4. Menambah ke array (storage)      : 45215
5. Mencatat lewat event             : 2148
```

Empat kesimpulan: membuat data baru di storage sekitar **4 kali** lebih mahal daripada mengubah data yang ada. Menambah ke array sangat mahal karena menulis dua slot baru (panjang array dan elemennya). Event sekitar **20 kali** lebih murah daripada menyimpan riwayat di array, dan itulah alasan menyimpan riwayat di event. Dan nomor 3 murah karena slotnya sudah "hangat" dan nilainya tidak berubah.

## Teknik optimasi yang paling berdampak

| Teknik | Kenapa hemat |
| --- | --- |
| `constant` dan `immutable` | Nilai disimpan di bytecode, bukan storage |
| **Storage packing** | Beberapa variabel muat dalam satu slot 32 byte |
| Custom error | Lebih kecil daripada string pesan panjang |
| `calldata` untuk parameter array | Tidak disalin ke memory |
| Cache panjang array dan nilai storage | Mengurangi pembacaan storage berulang |
| Event untuk riwayat | Jauh lebih murah daripada array storage |
| `external` untuk function yang dipanggil dari luar | Sedikit lebih efisien untuk calldata |

### Latihan 2: Mengoptimasi contract pendaftaran

Versi boros:

```solidity
/// @title Pendaftaran lomba - versi BOROS gas (untuk dibandingkan)
contract DaftarBoros {
    struct Peserta {
        uint256 umur;       // slot sendiri
        address alamat;     // slot sendiri
        uint256 nomor;      // slot sendiri
        bool hadir;         // slot sendiri
    }

    address public panitia;              // bisa immutable, tapi tidak
    uint256 public biaya = 0.001 ether;  // bisa constant, tapi tidak
    Peserta[] public peserta;
    mapping(address => bool) public terdaftar;

    function daftar(uint256 umur) public payable {
        require(msg.value == biaya, "Biaya pendaftaran salah, mohon kirim jumlah yang tepat");
        require(!terdaftar[msg.sender], "Alamat ini sudah terdaftar sebagai peserta lomba");
        terdaftar[msg.sender] = true;
        peserta.push(Peserta(umur, msg.sender, peserta.length + 1, false));
    }

    function tandaiHadir(uint256[] memory nomor) public {
        require(msg.sender == panitia, "Hanya panitia yang boleh menandai kehadiran");
        for (uint256 i = 0; i < nomor.length; i++) {
            peserta[nomor[i] - 1].hadir = true;
        }
    }
}
```

Versi hemat. Perhatikan susunan struct-nya:

```solidity
contract DaftarHemat {
    struct Peserta {
        address alamat;   // 20 byte \
        uint32 nomor;     //  4 byte  |-- dikemas dalam SATU slot (32 byte)
        uint8 umur;       //  1 byte  |
        bool hadir;       //  1 byte /
    }

    address public immutable panitia;            // disimpan di bytecode, bukan storage
    uint256 public constant BIAYA = 0.001 ether; // konstanta compile-time
    Peserta[] public peserta;
    mapping(address => bool) public terdaftar;

    error BiayaSalah();
    error SudahTerdaftar();
    error BukanPanitia();

    constructor() { panitia = msg.sender; }

    function daftar(uint8 umur) external payable {
        if (msg.value != BIAYA) revert BiayaSalah();
        if (terdaftar[msg.sender]) revert SudahTerdaftar();
        terdaftar[msg.sender] = true;
        peserta.push(Peserta(msg.sender, uint32(peserta.length + 1), umur, false));
    }

    function tandaiHadir(uint256[] calldata nomor) external { // calldata: tidak disalin ke memory
        if (msg.sender != panitia) revert BukanPanitia();
        uint256 n = nomor.length;
        for (uint256 i; i < n; ++i) {
            peserta[nomor[i] - 1].hadir = true;
        }
    }

    function jumlahHadir() external view returns (uint256 total) {
        uint256 n = peserta.length;  // baca panjang array sekali saja
        for (uint256 i; i < n; ++i) {
            if (peserta[i].hadir) ++total;
        }
    }
}
```

Hasil `forge test --gas-report` (median, dengan 20 peserta):

| Function | Boros | Hemat | Penghematan |
| --- | --- | --- | --- |
| `daftar` | 120.452 | 72.850 | ±40% |
| `tandaiHadir` (20 peserta) | 486.840 | 138.380 | ±72% |
| `jumlahHadir` (20 peserta) | 55.491 | 53.895 | ±3% |

**Kenapa `tandaiHadir` hemat sangat besar?** Di versi boros, `hadir` ada di slot sendiri yang masih nol, sehingga setiap penanda kehadiran adalah penulisan "nol ke bukan nol" yang paling mahal. Di versi hemat, `hadir` berbagi slot dengan `alamat` yang sudah terisi, sehingga penulisannya "bukan nol ke bukan nol". Itulah dampak storage packing.

**Kenapa `jumlahHadir` hampir tidak berubah?** Function `view` dibaca gratis lewat RPC, dan perulangannya tetap membaca satu slot per peserta. Pelajarannya: ukur dulu, lalu optimalkan bagian yang benar-benar berdampak.

### Latihan 3: Pindahkan arisan ke Layer 2

Contract-nya tidak perlu diubah sama sekali, cukup ganti RPC URL:

```bash
forge script script/DeployArisan.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL --account dev-sepolia --broadcast
```

Lalu jalankan satu putaran penuh di L2 dan di Sepolia L1, dan bandingkan dari explorer masing-masing: gas used, biaya, untuk deploy, gabung, setor, dan tetapkanPemenang.

Yang akan Anda lihat: **gas used hampir sama** di L1 dan L2, karena contract dan EVM-nya sama. Yang berbeda adalah harga per gas dan komponen biaya data L1. Di explorer L2 Anda akan melihat rincian yang memisahkan keduanya.

Menambahkan L2 ke frontend juga hanya beberapa baris:

```ts
import { baseSepolia, foundry, sepolia } from 'wagmi/chains'

export const config = createConfig({
  chains: [foundry, sepolia, baseSepolia],
  connectors: [injected()],
  transports: {
    [foundry.id]: http(),
    [sepolia.id]: http(import.meta.env.VITE_SEPOLIA_RPC_URL),
    [baseSepolia.id]: http(import.meta.env.VITE_BASE_SEPOLIA_RPC_URL),
  },
})
```

## Harga yang dibayar

Layer 2 bukan "Ethereum yang lebih murah tanpa kekurangan".

1. **Sequencer terpusat.** Satu pihak menentukan urutan transaksi, bisa berhenti, atau menunda transaksi tertentu. Beberapa L2 besar pernah mengalami gangguan saat sequencer-nya berhenti. Dana pengguna tidak hilang karena state dan data tetap di L1, tapi aplikasi berhenti melayani. L2 mewarisi **keamanan** L1, tapi belum tentu mewarisi **ketahanan** dan **desentralisasinya**.
2. **Upgrade oleh tim.** Banyak L2 masih bisa di-upgrade oleh dewan atau tim kecil. L2BEAT mengelompokkan L2 berdasarkan tingkat kematangan desentralisasinya.
3. **Fragmentasi.** Aset dan pengguna tersebar di banyak L2.
4. **Risiko bridge.** Bridge pihak ketiga adalah salah satu target peretasan terbesar.
5. **Penarikan lambat** di optimistic rollup lewat jalur resmi.
6. **Optimasi gas berlebihan** membuat kode sulit dibaca dan rawan bug.

Urutan prioritas yang sehat: **benar → aman → mudah dibaca → hemat**. Optimasi gas datang paling akhir dan harus diukur, bukan ditebak. Dan jangan pernah menghapus pemeriksaan keamanan demi menghemat gas.

## Rangkuman

- Layer 1 mahal karena setiap node menjalankan dan menyimpan semuanya. Itu harga dari keamanan dan desentralisasi.
- **Rollup** menjalankan transaksi di luar L1, lalu mengirim data dan komitmen state ke L1.
- **Optimistic rollup** memakai masa sanggah dan fraud proof. **ZK rollup** memakai bukti matematis.
- Di dalam contract, **storage adalah biaya terbesar**.
- Selalu ukur sebelum dan sesudah mengoptimalkan.

Satu pertanyaan yang layak masuk dokumen arsitektur Anda: siapa yang menjalankan sequencer L2 pilihan Anda, dan apa tahap kematangannya menurut L2BEAT? Itu keputusan arsitektur, bukan sekadar soal biaya.

## Masalah terbuka

Arisan dan tiket RT 05 kini aman dan murah. Kas RT mulai terkumpul dalam bentuk token. Muncul dua kebutuhan baru:

1. Bendahara ingin **menukar** sebagian kas ke token lain, atau membuat kas "berbunga" saat menganggur, tanpa lewat bursa terpusat. Bisakah contract kas RT memanggil contract pertukaran milik orang lain secara langsung?
2. Warga bertanya: **siapa yang memutuskan** uang kas dipakai untuk apa? Saat ini satu alamat "pemilik" yang berkuasa, persis seperti Bu Bendahara.

Bagaimana contract dirakit seperti balok LEGO untuk membangun layanan keuangan terbuka, dan bagaimana sebuah kas dikelola bersama lewat pemungutan suara, tanpa satu pemilik?

Itulah modul berikutnya: DeFi dan DAO.
