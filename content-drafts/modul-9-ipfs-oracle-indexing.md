---
title: "Modul 9: Data di Luar Blockchain lewat IPFS, Oracle, dan Indexing"
description: Blockchain sengaja dibuat terbatas. Tiga jembatan untuk data di luar batas itu, dan asumsi kepercayaan yang dibawa masing-masing.
date: 2026-10-18
slug: modul-9-ipfs-oracle-indexing
tags: tutorial web 3
series: Tutorial Web 3
status: draft
---

RT 05 ingin menerbitkan tiket NFT untuk acara 17 Agustus, dan langsung menemukan tiga masalah:

1. **Data besar.** Gambar dan detail tiket terlalu mahal disimpan di contract, tapi di server biasa bisa hilang.
2. **Data dunia nyata.** Harga tiket ingin dipatok dalam mata uang biasa, padahal contract tidak tahu kurs dan tidak bisa mengakses internet.
3. **Data historis.** Halaman "Riwayat Tiket Saya" butuh ribuan event, dan membacanya satu per satu dari RPC sangat lambat.

Ketiganya punya akar yang sama: **blockchain sengaja dibuat terbatas** agar ribuan node bisa sepakat.

| Kebutuhan | Kenapa blockchain kesulitan |
| --- | --- |
| Menyimpan gambar 1 MB | Setiap byte disalin ke ribuan node dan dibayar gas |
| Mengetahui kurs ETH ke dolar | Contract harus deterministik. Kalau tiap node mengambil kurs pada detik berbeda, konsensus gagal |
| Angka acak untuk undian | Semua di blockchain bisa dilihat dan dihitung lebih dulu |
| Daftar semua transfer satu alamat | Blockchain dioptimalkan untuk mencatat, bukan mencari. Tidak ada `SELECT ... WHERE` |

Cara lama mengatasinya adalah kembali ke server terpusat, dan aplikasi pun kembali bergantung pada satu pihak.

## Tiga analogi

**IPFS = perpustakaan yang mencari buku berdasarkan ISBN, bukan nomor rak.** Di perpustakaan biasa Anda mencari "rak 3, baris 5" (seperti URL); kalau buku dipindah, Anda tersesat. Bayangkan perpustakaan di mana Anda cukup menyebut sidik jari isi buku, lalu siapa pun yang punya salinan persis itu bisa memberikannya. Isinya diubah satu huruf, sidik jarinya berbeda.

**Oracle = papan kurs resmi yang ditandatangani banyak saksi.** Contract seperti hakim yang dikurung dan tidak boleh keluar ruangan, sehingga hanya bisa memutuskan berdasarkan dokumen yang dimasukkan. Oracle yang baik adalah dokumen kurs bertanda tangan banyak saksi independen, bukan secarik kertas dari satu orang.

**Indexing = indeks di belakang buku.** Buku kas mencatat semua transaksi berurutan. Untuk mencari "semua setoran Budi", Anda bisa membalik setiap halaman (lambat), atau membuat indeks. Indexer membaca seluruh buku sekali, lalu menjawab dengan cepat.

| Analogi | Konsep teknis |
| --- | --- |
| Sidik jari isi buku | **CID** (Content Identifier) di IPFS |
| Pembaca yang menyimpan salinan | **Pinning** |
| Hakim dalam ruangan tertutup | Smart contract yang deterministik |
| Dokumen kurs bertanda tangan banyak saksi | **Decentralized oracle network** |
| Tanggal pada dokumen kurs | **updatedAt**, untuk menolak harga basi |
| Indeks di belakang buku | **Indexer** |
| Kata kunci bercetak tebal | Parameter event yang **indexed** |

## Di mana data sebaiknya disimpan

| Data | Tempat yang tepat | Alasan |
| --- | --- | --- |
| Kepemilikan, saldo, aturan | **On-chain** (storage) | Harus disepakati semua node |
| Riwayat aksi | **Event** (log) | Jauh lebih murah, bisa dibaca aplikasi luar, tapi tidak bisa dibaca contract lain |
| Gambar, metadata NFT | **IPFS / Arweave**, CID-nya di contract | Murah, isinya bisa diverifikasi |
| Harga, cuaca, hasil pertandingan | **Oracle** | Dari dunia luar |
| Angka acak yang adil | **Oracle VRF** | Acak dan bisa dibuktikan tidak dimanipulasi |
| Data pribadi, rahasia | **Database biasa** | Harus bisa dihapus dan dirahasiakan |

## Content addressing

**URL biasa** (`https://server-rt05.id/tiket/1.json`) menyatakan *di mana* file berada. Isinya bisa diganti kapan saja oleh pemilik server.

**CID** (`ipfs://bafkrei...`) menyatakan *apa* isi file itu. CID dihitung dari hash isi file, sehingga isi sama menghasilkan CID sama di komputer mana pun, dan isi berubah satu karakter mengubah CID total.

Format metadata NFT yang dipahami wallet dan marketplace:

```json
{
  "name": "Tiket 17 Agustus RT 05 #1",
  "description": "Tiket masuk lomba dan malam tirakatan RT 05",
  "image": "ipfs://CID_GAMBAR",
  "attributes": [
    { "trait_type": "Kategori", "value": "Dewasa" },
    { "trait_type": "Tanggal", "value": "2026-08-17" }
  ]
}
```

Alurnya: unggah gambar ke IPFS → dapat CID gambar → masukkan ke metadata → unggah metadata → dapat CID metadata → contract mengembalikan `ipfs://CID_METADATA` dari `tokenURI`.

### Latihan 1: Membuktikan content addressing

```bash
mkdir web3-modul-9 && cd web3-modul-9
npm init -y && npm pkg set type=module
npm install viem multiformats
```

```javascript
import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'

// CID = "alamat" yang dihitung dari ISI data, bukan dari lokasi server
async function hitungCID(teks) {
  const bytes = new TextEncoder().encode(teks)
  const hash = await sha256.digest(bytes)
  return CID.create(1, raw.code, hash).toString()
}

const metadata = {
  name: 'Tiket 17 Agustus RT 05 #1',
  description: 'Tiket masuk lomba dan malam tirakatan RT 05',
  image: 'ipfs://GANTI_DENGAN_CID_GAMBAR',
  attributes: [
    { trait_type: 'Kategori', value: 'Dewasa' },
    { trait_type: 'Tanggal', value: '2026-08-17' },
  ],
}

const asli = JSON.stringify(metadata)
const diubah = JSON.stringify({ ...metadata,
  attributes: [{ trait_type: 'Kategori', value: 'VIP' }, metadata.attributes[1]] })

console.log('CID metadata asli   :', await hitungCID(asli))
console.log('CID dihitung ulang  :', await hitungCID(asli))
console.log('CID setelah diubah  :', await hitungCID(diubah))
```

```text
CID metadata asli   : bafkreihkllebpybgnq4uso3w52nrp5sa44dzkt6soqzaeaevrhr6iyopz4
CID dihitung ulang  : bafkreihkllebpybgnq4uso3w52nrp5sa44dzkt6soqzaeaevrhr6iyopz4
CID setelah diubah  : bafkreicbe3vpgyvl7n43lid4eaupjn2ks6uvp7xcfghuun2nc6neu4bk3i
```

Mengubah "Dewasa" jadi "VIP" menghasilkan CID yang sama sekali berbeda. Jadi kalau contract menyimpan CID asli, tidak ada yang bisa diam-diam menaikkan kelas tiket dengan mengedit file.

CID di atas dihitung dengan format "raw" untuk data kecil. Saat Anda mengunggah file lewat layanan IPFS, CID-nya bisa berbeda karena layanan itu mungkin memakai format pembungkus atau versi CID lain. Prinsipnya tetap sama: CID ditentukan oleh isi.

## Oracle

```text
Banyak sumber data (bursa, agregator)
            |
            v
Banyak node oracle independen
            | laporan bertanda tangan, digabung (median)
            v
   Contract feed ETH/USD  <-- diperbarui saat harga bergerak melewati
            ^                 ambang, atau setelah selang waktu tertentu
            | latestRoundData()
            |
   Contract HargaTiket --> tolak jika answer <= 0 atau terlalu lama
```

Poin pentingnya: contract Anda **membaca** feed yang sudah ada di blockchain, tanpa satu pun panggilan ke internet. Feed USD Chainlink umumnya memakai 8 desimal, tapi selalu baca `decimals()` daripada menebak. Dan selalu periksa `updatedAt`.

### Latihan 2: Harga tiket dari oracle

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Interface standar price feed Chainlink (cukup function yang dipakai)
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function latestRoundData()
        external view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}

/// @title Harga tiket dipatok dalam dolar AS, dibayar dalam ETH sesuai kurs oracle
contract HargaTiket {
    AggregatorV3Interface public immutable feed;   // ETH/USD
    uint256 public immutable hargaUsdSen;          // contoh: 500 = 5,00 USD
    uint256 public constant BATAS_BASI = 1 hours;  // harga lebih tua dari ini ditolak

    error HargaTidakValid();
    error HargaBasi(uint256 updatedAt);

    constructor(address _feed, uint256 _hargaUsdSen) {
        feed = AggregatorV3Interface(_feed);
        hargaUsdSen = _hargaUsdSen;
    }

    /// @notice Harga 1 ETH dalam USD dengan 18 desimal
    function hargaEthUsd() public view returns (uint256) {
        (, int256 answer, , uint256 updatedAt, ) = feed.latestRoundData();
        if (answer <= 0) revert HargaTidakValid();
        if (block.timestamp - updatedAt > BATAS_BASI) revert HargaBasi(updatedAt);
        return uint256(answer) * 10 ** (18 - feed.decimals());
    }

    /// @notice Berapa wei yang harus dibayar untuk satu tiket
    function hargaTiketWei() public view returns (uint256) {
        uint256 hargaUsd18 = hargaUsdSen * 1e16;
        return (hargaUsd18 * 1e18) / hargaEthUsd();
    }
}
```

Untuk mengujinya, Anda butuh **mock**: oracle sungguhan tidak ada di jaringan test lokal. Ini teknik penting.

```solidity
/// @notice Oracle palsu untuk test: kita yang menentukan harga dan waktunya
contract MockFeed is AggregatorV3Interface {
    int256 public answer;
    uint256 public updatedAt;

    function set(int256 _answer, uint256 _updatedAt) external {
        answer = _answer;
        updatedAt = _updatedAt;
    }

    function decimals() external pure returns (uint8) { return 8; }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (1, answer, updatedAt, updatedAt, 1);
    }
}

contract HargaTiketTest is Test {
    MockFeed feed;
    HargaTiket tiket;

    function setUp() public {
        vm.warp(1_700_000_000); // waktu awal test Foundry sangat kecil; tanpa ini, timestamp - 2 hours underflow
        feed = new MockFeed();
        tiket = new HargaTiket(address(feed), 500); // 5 USD
    }

    function test_KonversiHarga() public {
        feed.set(2_500 * 1e8, block.timestamp);        // 1 ETH = 2.500 USD
        assertEq(tiket.hargaEthUsd(), 2_500 ether);
        assertEq(tiket.hargaTiketWei(), 0.002 ether);  // 5 / 2500 = 0,002 ETH
    }

    function test_HargaIkutBerubah() public {
        feed.set(5_000 * 1e8, block.timestamp);        // ETH naik dua kali lipat
        assertEq(tiket.hargaTiketWei(), 0.001 ether);  // ETH yang dibutuhkan turun setengah
    }

    function test_RevertHargaNol() public {
        feed.set(0, block.timestamp);
        vm.expectRevert(HargaTiket.HargaTidakValid.selector);
        tiket.hargaTiketWei();
    }

    function test_RevertHargaBasi() public {
        uint256 lama = block.timestamp - 2 hours;
        feed.set(2_500 * 1e8, lama);
        vm.expectRevert(abi.encodeWithSelector(HargaTiket.HargaBasi.selector, lama));
        tiket.hargaTiketWei();
    }
}
```

Dua test terakhir itu yang menyelamatkan Anda dari bencana. Pada Oktober 2022, seorang pedagang menaikkan harga token MNGO secara drastis dalam waktu singkat di pasar yang sepi. Oracle Mango Markets melaporkan harga yang sudah dimanipulasi itu, jaminannya tampak sangat bernilai, dan ia menarik dana lebih dari 100 juta dolar. **Contract-nya bekerja persis sesuai kode**. Masalahnya ada pada data yang dipercaya contract.

## Indexing

Setiap `emit` menulis **log** ke receipt transaksi. Parameter yang diberi `indexed` menjadi **topik** yang bisa difilter langsung oleh node.

| Pendekatan | Cocok untuk |
| --- | --- |
| Membaca log langsung (`getLogs` dari viem) | Data sedikit, prototipe |
| Indexer sendiri (misalnya Ponder) | Aplikasi menengah, butuh kendali penuh |
| Indexer terdesentralisasi (The Graph) | Aplikasi besar, banyak pengguna |

Banyak RPC membatasi rentang blok per permintaan `getLogs`, jadi untuk riwayat panjang Anda perlu membaca bertahap atau memakai indexer.

### Latihan 3: Riwayat dari event

```javascript
import { createPublicClient, http, parseAbiItem } from 'viem'
import { foundry } from 'viem/chains'

const client = createPublicClient({ chain: foundry, transport: http() })
const POIN = '0x5FbDB2315678afecb367f032d93F642f64180aa3'
const transferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)')

// 1. Semua transfer PWR sejak blok 0
const semua = await client.getLogs({ address: POIN, event: transferEvent, fromBlock: 0n })
console.log(`Total event Transfer: ${semua.length}`)
for (const log of semua) {
  const { from, to, value } = log.args
  console.log(`  blok ${log.blockNumber}: ${from.slice(0, 8)}… → ${to.slice(0, 8)}… : ${value} PWR`)
}

// 2. Hanya transfer yang MASUK ke satu alamat, difilter node lewat topik indexed
const sari = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
const masuk = await client.getLogs({ address: POIN, event: transferEvent, args: { to: sari }, fromBlock: 0n })
console.log(`Transfer masuk ke Sari: ${masuk.length}`)

// 3. Membangun "state" dari event: saldo semua alamat TANPA memanggil balanceOf
const saldo = {}
for (const { args: { from, to, value } } of semua) {
  saldo[from] = (saldo[from] ?? 0n) - value
  saldo[to] = (saldo[to] ?? 0n) + value
}
delete saldo['0x0000000000000000000000000000000000000000']
console.log('Saldo hasil indexing:', saldo)
```

```text
Total event Transfer: 4
  blok 2: 0x000000… → 0xf39Fd6… : 150000 PWR
  blok 3: 0x000000… → 0x709979… : 150000 PWR
  blok 4: 0x000000… → 0x3C44Cd… : 150000 PWR
  blok 9: 0x709979… → 0xe7f172… : 50000 PWR
Transfer masuk ke Sari: 1
Saldo hasil indexing: { '0xf39Fd6…': 150000n, '0x709979…': 100000n, '0x3C44Cd…': 150000n, '0xe7f172…': 50000n }
```

Dua hal yang perlu diperhatikan: pencetakan token terlihat sebagai transfer *dari alamat nol*, dan saldo hasil indexing sama persis dengan `balanceOf`. Ini prinsip yang sama dengan proyek pertama: state bisa dihitung ulang dari riwayat. Indexer seperti The Graph melakukan ini terus-menerus untuk jutaan event.

## Harga dari setiap jembatan

Setiap jembatan ke luar blockchain menambah **asumsi kepercayaan**. Aplikasi Anda hanya seaman bagian terlemahnya.

1. **IPFS bukan penyimpanan permanen otomatis.** File hanya tersedia selama ada node yang mem-pin-nya. Banyak proyek NFT awal menyimpan `tokenURI` berupa URL server biasa; ketika perusahaannya tutup, gambar dan metadata tidak bisa diakses lagi. Kepemilikan ID tetap tercatat, tapi yang dimiliki jadi "tiket tanpa gambar".
2. **Gateway IPFS terpusat.** Kebanyakan browser membuka IPFS lewat gateway HTTP milik perusahaan tertentu.
3. **Oracle adalah titik kepercayaan.**
4. **Harga basi.** Contract harus menolak harga yang terlalu lama.
5. **Ketersediaan feed terbatas.** Tidak semua pasangan mata uang punya feed di setiap jaringan.
6. **Indexer bisa salah atau tertinggal.** Untuk keputusan penting, verifikasi ulang langsung ke contract.
7. **Data di IPFS bersifat publik.** Jangan unggah data pribadi.

## Rangkuman

- Blockchain sengaja terbatas: mahal untuk data besar, tidak bisa mengakses dunia luar, lambat untuk pencarian.
- **IPFS** menyimpan file berdasarkan isi (CID). Isi berubah, CID berubah.
- **Oracle** membawa data luar ke contract. Baca `decimals()`, tolak harga tidak valid atau basi.
- Untuk test, gunakan **mock** oracle yang Anda kendalikan.
- **Event** adalah tempat riwayat. Parameter `indexed` bisa difilter node.
- Ketahui di mana titik kepercayaan dalam aplikasi Anda.

## Masalah terbuka

Anda sekarang punya semua bahan: standar NFT, frontend dApp, serta IPFS, oracle, dan event. Tapi semuanya masih latihan terpisah.

Panitia 17 Agustus ingin sistem tiket sungguhan: warga membeli tiket NFT lewat website, tiket punya gambar dan detail yang tidak bisa dipalsukan, jumlahnya terbatas, dan panitia bisa memeriksa keaslian tiket di pintu masuk.

Bisakah Anda menggabungkan semuanya jadi satu dApp tiket yang utuh?

Itulah proyek berikutnya.
