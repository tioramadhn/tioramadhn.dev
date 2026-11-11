---
title: "Proyek 3: dApp Tiket Acara berbasis NFT"
description: Menggabungkan ERC-721, IPFS, event, dan tanda tangan digital jadi satu sistem tiket utuh, termasuk verifikasi di pintu masuk tanpa transaksi dari pengunjung.
date: 2026-10-19
slug: proyek-3-dapp-tiket-nft
tags: tutorial web 3
series: Tutorial Web 3
status: draft
---

Panitia 17 Agustus RT 05 ingin sistem tiket sungguhan. Semua bahannya sudah ada secara terpisah: standar NFT, frontend dApp, IPFS, dan event. Bahkan tanda tangan digital dari modul kedua akan kembali dipakai, kali ini di pintu masuk.

## Kebutuhan panitia

1. Ada **100 tiket** dengan harga tetap, maksimal **4 tiket per warga** agar tidak diborong calo.
2. Tiket punya **gambar dan detail** yang tidak bisa dipalsukan.
3. Warga bisa melihat **daftar tiket miliknya** beserta statusnya.
4. Tiket yang belum dipakai boleh **diberikan atau dijual** ke warga lain.
5. Di pintu masuk, warga membuktikan kepemilikan **tanpa memperlihatkan seed phrase** dan tanpa harus mengirim transaksi.
6. Panitia melakukan **check-in**. Tiket terpakai tidak bisa dipakai lagi dan tidak bisa dipindahkan.
7. Hasil penjualan bisa ditarik bendahara panitia.

## Alur pintu masuk

Ini bagian paling menarik, dan penerapan langsung dari modul kriptografi:

```text
Warga (wallet)        Halaman Tiket Saya       Pintu Masuk (panitia)     Contract
     |                        |                         |                    |
     |-- klik "Tunjukkan" --->|                         |                    |
     |<-- minta tanda tangan -|                         |                    |
     |-- signature (gratis) ->|                         |                    |
     |                        |-- kode bukti ---------->|                    |
     |                        |  {tokenId, pesan, sig}  |                    |
     |                        |                         |-- recoverMessageAddress
     |                        |                         |      -> alamat penanda tangan
     |                        |                         |-- tiketValid(1, alamat)? -->|
     |                        |                         |<---------- true ------------|
     |                        |                         |-- checkIn(1) -------------->|
```

Warga membuktikan "saya pemilik alamat ini" tanpa membocorkan kunci privatnya, **dan tanpa membayar gas**. Panitia yang membayar transaksi check-in.

## Keputusan desain

| Keputusan | Pilihan | Alasan |
| --- | --- | --- |
| Standar | ERC-721 dari OpenZeppelin | Tiket bernomor unik, langsung tampil di wallet |
| Metadata | Satu `ipfs://CID` untuk semua tiket | Semua tiket sedesain. Isi tidak bisa diubah diam-diam |
| Pembayaran | Harus pas (`msg.value == harga × jumlah`) | Menghindari logika pengembalian kelebihan |
| Mint | `_mint`, bukan `_safeMint` | Pembeli adalah pemanggil sendiri; mengurangi risiko callback ke contract lain |
| Tiket terpakai | Diblokir lewat hook `_update` | Satu titik pemeriksaan untuk semua jalur transfer |
| Daftar "Tiket Saya" | Dari event `Transfer` lalu dicek ulang `ownerOf` | Tidak butuh ERC721Enumerable yang menambah gas tiap transfer |

## Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Tiket acara 17 Agustus RT 05 sebagai NFT
/// @notice Jumlah terbatas, batas per wallet, check-in panitia, tiket terpakai tidak bisa dipindahkan
contract TiketAcara is ERC721, Ownable {
    uint256 public immutable hargaWei;
    uint256 public immutable maksTiket;
    uint256 public immutable maksPerAlamat;
    uint256 public totalTerjual;
    string private metadataURI; // ipfs://CID (satu desain untuk semua tiket)

    mapping(uint256 => bool) public sudahDipakai;
    mapping(address => uint256) public jumlahDibeli;
    mapping(address => bool) public adalahPanitia;

    error PembayaranSalah(uint256 dikirim, uint256 seharusnya);
    error TiketHabis();
    error MelebihiBatasPerAlamat();
    error JumlahNol();
    error BukanPanitia();
    error TiketSudahDipakai(uint256 tokenId);
    error TiketTerpakaiTidakBisaDipindah(uint256 tokenId);
    error TransferGagal();

    event TiketDibeli(address indexed pembeli, uint256 indexed tokenIdPertama, uint256 jumlah);
    event CheckIn(uint256 indexed tokenId, address indexed pemilik, address indexed panitia);
    event PanitiaDiatur(address indexed akun, bool aktif);

    constructor(uint256 _hargaWei, uint256 _maksTiket, uint256 _maksPerAlamat, string memory _metadataURI)
        ERC721("Tiket 17 Agustus RT 05", "TIKET17")
        Ownable(msg.sender)
    {
        hargaWei = _hargaWei;
        maksTiket = _maksTiket;
        maksPerAlamat = _maksPerAlamat;
        metadataURI = _metadataURI;
    }

    function beli(uint256 jumlah) external payable {
        if (jumlah == 0) revert JumlahNol();
        if (totalTerjual + jumlah > maksTiket) revert TiketHabis();
        if (jumlahDibeli[msg.sender] + jumlah > maksPerAlamat) revert MelebihiBatasPerAlamat();
        uint256 total = hargaWei * jumlah;
        if (msg.value != total) revert PembayaranSalah(msg.value, total);

        uint256 idPertama = totalTerjual + 1;
        jumlahDibeli[msg.sender] += jumlah;
        totalTerjual += jumlah;
        for (uint256 i = 0; i < jumlah; i++) {
            _mint(msg.sender, idPertama + i);
        }
        emit TiketDibeli(msg.sender, idPertama, jumlah);
    }

    function aturPanitia(address akun, bool aktif) external onlyOwner {
        adalahPanitia[akun] = aktif;
        emit PanitiaDiatur(akun, aktif);
    }

    function checkIn(uint256 tokenId) external {
        if (!adalahPanitia[msg.sender]) revert BukanPanitia();
        address pemilik = ownerOf(tokenId); // revert jika tiket tidak ada
        if (sudahDipakai[tokenId]) revert TiketSudahDipakai(tokenId);
        sudahDipakai[tokenId] = true;
        emit CheckIn(tokenId, pemilik, msg.sender);
    }

    /// @notice Untuk pintu masuk: apakah `pemegang` memiliki tiket ini dan belum dipakai?
    function tiketValid(uint256 tokenId, address pemegang) external view returns (bool) {
        return _ownerOf(tokenId) == pemegang && pemegang != address(0) && !sudahDipakai[tokenId];
    }

    function tarikDana() external onlyOwner {
        (bool ok, ) = owner().call{value: address(this).balance}("");
        if (!ok) revert TransferGagal();
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return metadataURI;
    }

    /// @dev Hook OpenZeppelin v5, dipanggil di SETIAP mint, transfer, dan burn
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address dari = _ownerOf(tokenId);
        if (dari != address(0) && sudahDipakai[tokenId]) revert TiketTerpakaiTidakBisaDipindah(tokenId);
        return super._update(to, tokenId, auth);
    }
}
```

Hook `_update` itu trik yang berguna: ia satu-satunya titik yang dilewati semua jalur perpindahan token, jadi aturan transfer apa pun cukup ditulis sekali di sana.

## Test

```solidity
contract TiketAcaraTest is Test {
    TiketAcara tiket;
    uint256 constant HARGA = 0.01 ether;
    string constant URI = "ipfs://bafkreihkllebpybgnq4uso3w52nrp5sa44dzkt6soqzaeaevrhr6iyopz4";
    address panitia = makeAddr("panitia");
    address budi = makeAddr("budi");
    address sari = makeAddr("sari");

    function setUp() public {
        tiket = new TiketAcara(HARGA, 5, 2, URI);
        tiket.aturPanitia(panitia, true);
        vm.deal(budi, 1 ether);
        vm.deal(sari, 1 ether);
    }

    receive() external payable {}

    function test_BeliTiket() public {
        vm.prank(budi);
        tiket.beli{value: 2 * HARGA}(2);
        assertEq(tiket.ownerOf(1), budi);
        assertEq(tiket.ownerOf(2), budi);
        assertEq(tiket.totalTerjual(), 2);
        assertEq(tiket.tokenURI(1), URI);
    }

    function test_RevertMelebihiBatasPerAlamat() public {
        vm.startPrank(budi);
        tiket.beli{value: 2 * HARGA}(2);
        vm.expectRevert(TiketAcara.MelebihiBatasPerAlamat.selector);
        tiket.beli{value: HARGA}(1);
        vm.stopPrank();
    }

    function test_CheckInDanValidasi() public {
        vm.prank(budi);
        tiket.beli{value: HARGA}(1);
        assertTrue(tiket.tiketValid(1, budi));
        assertFalse(tiket.tiketValid(1, sari));

        vm.prank(panitia);
        tiket.checkIn(1);
        assertTrue(tiket.sudahDipakai(1));
        assertFalse(tiket.tiketValid(1, budi));

        vm.prank(panitia);
        vm.expectRevert(abi.encodeWithSelector(TiketAcara.TiketSudahDipakai.selector, 1));
        tiket.checkIn(1);
    }

    function test_TiketBelumDipakaiBisaDipindah() public {
        vm.prank(budi);
        tiket.beli{value: HARGA}(1);
        vm.prank(budi);
        tiket.transferFrom(budi, sari, 1);
        assertEq(tiket.ownerOf(1), sari);
        assertTrue(tiket.tiketValid(1, sari));
    }

    function test_RevertTiketTerpakaiTidakBisaDipindah() public {
        vm.prank(budi);
        tiket.beli{value: HARGA}(1);
        vm.prank(panitia);
        tiket.checkIn(1);
        vm.prank(budi);
        vm.expectRevert(abi.encodeWithSelector(TiketAcara.TiketTerpakaiTidakBisaDipindah.selector, 1));
        tiket.transferFrom(budi, sari, 1);
    }

    function testFuzz_TotalTerjualTidakPernahMelebihiMaks(uint8 a, uint8 b) public {
        a = uint8(bound(a, 1, 2));   // bound menjaga input acak tetap masuk akal
        b = uint8(bound(b, 1, 2));
        vm.prank(budi); tiket.beli{value: a * HARGA}(a);
        vm.prank(sari); tiket.beli{value: b * HARGA}(b);
        assertLe(tiket.totalTerjual(), tiket.maksTiket());
        assertEq(address(tiket).balance, (uint256(a) + b) * HARGA);
    }
}
```

Solusi referensi: 13 test lolos, coverage baris 100%.

## Metadata di IPFS

Buat gambar tiket (misalnya 1000×1000), unggah ke IPFS, catat CID-nya. Lalu:

```json
{
  "name": "Tiket 17 Agustus RT 05",
  "description": "Tiket masuk lomba dan malam tirakatan RT 05. Berlaku untuk satu orang.",
  "image": "ipfs://CID_GAMBAR_ANDA",
  "attributes": [
    { "trait_type": "Acara", "value": "HUT RI 2026" },
    { "trait_type": "Tanggal", "value": "2026-08-17" },
    { "trait_type": "Lokasi", "value": "Lapangan RT 05" }
  ]
}
```

Unggah `metadata.json`, catat CID-nya, dan masukkan sebagai `METADATA_URI` saat deploy.

## Frontend

Satu hook kecil menghemat banyak pengulangan:

```ts
// src/useTx.ts
/** Menggabungkan kirim transaksi + tunggu receipt + muat ulang data */
export function useTx() {
  const queryClient = useQueryClient()
  const tulis = useWriteContract()
  const struk = useWaitForTransactionReceipt({ hash: tulis.data })

  useEffect(() => {
    if (struk.isSuccess) queryClient.invalidateQueries()
  }, [struk.isSuccess, queryClient])

  const galat = tulis.error ?? struk.error
  return {
    kirim: tulis.mutate,
    sibuk: tulis.isPending || struk.isLoading,
    status: tulis.isPending
      ? '✍️ Menunggu tanda tangan di wallet…'
      : struk.isLoading
        ? '⏳ Menunggu transaksi masuk blok…'
        : struk.isSuccess
          ? '✅ Transaksi berhasil.'
          : '',
    pesanGalat: galat ? ((galat as BaseError).shortMessage ?? galat.message) : '',
  }
}
```

Dan pesan buktinya didefinisikan di satu tempat agar penulis dan pemeriksa sepakat:

```ts
// Pesan yang ditandatangani pemilik tiket di pintu masuk
export const pesanBukti = (tokenId: bigint, waktu: string) =>
  `Saya pemilik Tiket 17 Agustus RT 05 #${tokenId}. Waktu: ${waktu}`
```

### Tiket Saya: indexing sederhana

```ts
// Cari semua tiket yang pernah MASUK ke alamat ini, lalu pastikan masih dimiliki
const { data: tiket } = useQuery({
  queryKey: ['tiket-saya', address],
  enabled: !!address && !!client,
  queryFn: async () => {
    const logs = await client!.getLogs({
      address: ALAMAT_TIKET, event: eventTransfer, args: { to: address }, fromBlock: 0n,
    })
    const ids = [...new Set(logs.map((l) => l.args.tokenId!))]
    const hasil = []
    for (const id of ids) {
      const [pemilik, dipakai] = await Promise.all([
        client!.readContract({ address: ALAMAT_TIKET, abi: abiTiket, functionName: 'ownerOf', args: [id] }),
        client!.readContract({ address: ALAMAT_TIKET, abi: abiTiket, functionName: 'sudahDipakai', args: [id] }),
      ])
      if (pemilik === address) hasil.push({ id, dipakai })
    }
    return hasil
  },
})

const buatBukti = async (id: bigint) => {
  const pesan = pesanBukti(id, new Date().toISOString())
  const signature = await tandaTangan.mutateAsync({ message: pesan })
  setBukti(JSON.stringify({ tokenId: id.toString(), pesan, signature }))
}
```

Kenapa perlu dicek ulang dengan `ownerOf`? Karena tiket yang pernah masuk bisa saja sudah dipindahkan lagi. Event hanya mencatat riwayat, bukan keadaan sekarang.

### Pintu Masuk: verifikasi tiga langkah

```ts
const periksa = async () => {
  try {
    const { tokenId, pesan, signature } = JSON.parse(kode)
    // 1. Siapa yang menandatangani pesan ini?
    const pemegang = await recoverMessageAddress({ message: pesan, signature })
    // 2. Apakah pesan memang tentang tiket ini?
    if (!pesan.includes(`#${tokenId}.`)) throw new Error('Pesan tidak cocok dengan nomor tiket')
    // 3. Apakah penanda tangan pemilik tiket, dan tiketnya belum dipakai?
    const valid = await client!.readContract({
      address: ALAMAT_TIKET, abi: abiTiket, functionName: 'tiketValid',
      args: [BigInt(tokenId), pemegang],
    })
    setHasil({ tokenId: BigInt(tokenId), pemegang, valid })
  } catch (e) {
    setHasil({ galat: (e as Error).message })
  }
}
```

Langkah 2 itu penting dan mudah terlewat: tanpa memeriksa bahwa pesan menyebut nomor tiket yang sama, seseorang bisa memakai tanda tangan untuk tiket #1 lalu mengklaim tiket #2.

Panitia tidak perlu memercayai layar ponsel warga sama sekali, karena alamat dipulihkan dari tanda tangan dan status tiket dibaca langsung dari contract.

## Hasil uji

| Langkah | Hasil |
| --- | --- |
| Sisa tiket awal | 100 |
| Beli 2 tiket | Berhasil, sisa jadi 98 |
| Tiket Saya | Tiket #1 dan #2, belum dipakai |
| Tunjukkan di pintu masuk (#1) | Kode bukti berisi tokenId, pesan, signature |
| Periksa di Pintu Masuk | Penanda tangan = akun pembeli, "sah dan belum dipakai" |
| Check-in #1, lalu periksa ulang | "Tiket tidak sah atau sudah dipakai" |
| Kode bukti diubah ke tiket #2 | Ditolak: pesan tidak cocok dengan nomor tiket |

## Tantangan bonus

1. **QR code.** Tampilkan kode bukti sebagai QR, tambahkan pemindai kamera di Pintu Masuk.
2. **Bukti kedaluwarsa.** Tolak kode bukti yang waktunya lebih dari 2 menit, agar tangkapan layar yang dicuri tidak bisa dipakai.
3. **Harga dalam dolar.** Gabungkan `HargaTiket` dari modul sebelumnya.
4. **Tampilkan gambar.** Ambil `tokenURI`, ubah ke URL gateway, ambil JSON-nya, tampilkan gambar tiketnya.

## Rangkuman

- Satu dApp utuh menggabungkan banyak konsep: **ERC-721** untuk kepemilikan, **IPFS** untuk metadata, **event** untuk daftar tiket, dan **tanda tangan digital** untuk bukti tanpa transaksi.
- Hook `_update` adalah satu titik untuk menambahkan aturan transfer apa pun.
- Verifikasi di pintu masuk tidak perlu memercayai layar ponsel warga.
- Hook kecil seperti `useTx` membuat kode frontend rapi dan konsisten.

Tiga pertanyaan untuk direnungkan: seorang calo membeli tiket dari 25 alamat berbeda, apakah batas per alamat masih efektif? Seseorang memotret kode bukti di layar Budi lalu datang lebih dulu, apa yang terjadi? Dan bagian mana dari sistem ini yang masih terpusat?

## Masalah terbuka

Sistem tiket Anda berjalan dan lolos semua test. Tapi ada pertanyaan yang belum pernah diuji serius: **bagaimana kalau penggunanya berniat jahat?**

Selama ini test Anda bertanya "apakah fitur ini berjalan?". Penyerang bertanya hal yang berbeda: "apa yang terjadi kalau saya memanggil function ini dari contract buatan saya sendiri, di tengah eksekusi function lain?", "apa yang terjadi kalau saya mengirim transaksi tepat sebelum transaksi orang lain?", "function mana yang lupa dibatasi aksesnya?".

Ingat juga: contract yang sudah di-deploy tidak bisa diubah, dan dana di dalamnya bisa dikuras dalam hitungan detik.

Itulah modul berikutnya: keamanan smart contract.
