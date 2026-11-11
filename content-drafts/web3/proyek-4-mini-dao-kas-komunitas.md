---
title: "Proyek 4: Mini DAO Pengelola Kas Komunitas di Layer 2"
description: Menghapus peran bendahara sepenuhnya, lewat kas yang hanya bisa dipakai setelah proposal lolos voting, dengan quorum dan timelock, tanpa pintu belakang untuk siapa pun.
date: 2026-10-23
slug: proyek-4-mini-dao-kas-komunitas
tags: tutorial web 3
series: Tutorial Web 3
status: draft
---

Seri ini dibuka dengan masalah Bu Bendahara. Proyek kedua menggantinya dengan contract, tapi contract itu masih punya aturan tetap yang ditulis pembuatnya. Sekarang semuanya disatukan: **kas yang dikendalikan warga**, dengan keamanan dan biaya murah di Layer 2.

## Aturan DAO RT 05

1. Setiap warga memegang **token suara** yang dibagikan saat DAO dibuat. **Tidak ada fungsi mencetak token baru.**
2. Warga harus **mendelegasikan** suaranya (boleh ke diri sendiri) agar bisa memilih.
3. Warga dengan minimal sejumlah token bisa **mengajukan proposal**.
4. Ada **jeda** sebelum voting dimulai, lalu **periode voting** dengan pilihan setuju, tolak, atau abstain.
5. Proposal lolos kalau **quorum 20%** tercapai dan suara setuju lebih banyak dari tolak.
6. Proposal yang lolos masuk **antrean timelock** dan baru bisa dieksekusi setelah jeda.
7. Setelah jeda, **siapa pun** boleh mengeksekusinya.
8. Kas disimpan di **timelock**, dan pembuat DAO **melepas** semua hak admin.

## Arsitektur

```text
TokenWarga (ERC20Votes)
     | bobot suara pada snapshot
     v
  DaoRT (OpenZeppelin Governor)  <--- Warga: delegate, propose, castVote
     | PROPOSER: jadwalkan proposal yang lolos
     v
TimelockController (= Kas RT)  <--- Siapa pun (EXECUTOR): eksekusi setelah jeda
     | transfer ETH / panggil contract
     v
Penerima / protokol lain
```

| Contract | Peran |
| --- | --- |
| `TokenWarga` | Token suara dengan checkpoint dan delegasi |
| `DaoRT` | Proposal, voting, quorum, penghitungan suara |
| `TimelockController` | Menyimpan kas dan menjalankan proposal setelah jeda |

Pengaturan perannya yang menentukan keamanan:

| Peran | Diberikan ke | Alasan |
| --- | --- | --- |
| `PROPOSER_ROLE` | Hanya `DaoRT` | Satu-satunya jalan menjadwalkan aksi adalah lewat proposal yang lolos |
| `CANCELLER_ROLE` | `DaoRT` | Proposal bisa dibatalkan lewat proses governance |
| `EXECUTOR_ROLE` | `address(0)` (siapa pun) | Tidak ada pihak yang bisa menahan eksekusi keputusan warga |
| `DEFAULT_ADMIN_ROLE` | **Dilepas** | Pembuat tidak bisa lagi mengubah peran |

## Siklus hidup proposal

```text
[*] --propose()--> Pending
                      | jeda voting lewat (snapshot diambil)
                      v
                   Active
                   /      \
       kalah suara /        \ setuju > tolak dan quorum tercapai
      atau quorum /          \
          gagal  v            v
            Defeated      Succeeded
                              | queue()
                              v
                           Queued
                              | execute() setelah jeda timelock
                              v
                          Executed
```

## Satu hal yang akan menghentikan Anda

Tambahkan ini ke `foundry.toml` sebelum mulai:

```toml
optimizer = true
optimizer_runs = 200
```

Tanpa optimizer, `DaoRT` berukuran sekitar 28 KB dan **gagal di-deploy** karena melebihi batas ukuran contract Ethereum (24 KB). Dengan optimizer, ukurannya sekitar 17 KB. Cek dengan `forge build --sizes`.

## Token suara

```solidity
/// @title Token suara warga RT 05. Seluruh pasokan dibagikan saat deploy, tidak ada fungsi cetak.
contract TokenWarga is ERC20, ERC20Permit, ERC20Votes {
    error PanjangTidakSama();

    constructor(address[] memory warga, uint256[] memory jumlah)
        ERC20("Suara Warga RT 05", "WARGA")
        ERC20Permit("Suara Warga RT 05")
    {
        if (warga.length != jumlah.length) revert PanjangTidakSama();
        for (uint256 i = 0; i < warga.length; i++) _mint(warga[i], jumlah[i]);
    }

    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
```

## Governor

```solidity
/// @title DAO RT 05: proposal, voting, quorum, dan eksekusi lewat timelock
contract DaoRT is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    constructor(IVotes _token, TimelockController _timelock, uint48 jedaVoting, uint32 lamaVoting, uint256 ambangProposal)
        Governor("DAO RT 05")
        GovernorSettings(jedaVoting, lamaVoting, ambangProposal)
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(20) // quorum: 20% dari total suara pada snapshot
        GovernorTimelockControl(_timelock)
    {}

    // ---- Override yang diwajibkan Solidity karena beberapa induk mendefinisikan function sama ----
    function votingDelay() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.votingDelay();
    }

    function quorum(uint256 blockNumber) public view override(Governor, GovernorVotesQuorumFraction) returns (uint256) {
        return super.quorum(blockNumber);
    }

    function state(uint256 proposalId) public view override(Governor, GovernorTimelockControl) returns (ProposalState) {
        return super.state(proposalId);
    }

    function _executeOperations(uint256 id, address[] memory t, uint256[] memory v, bytes[] memory c, bytes32 d)
        internal override(Governor, GovernorTimelockControl)
    {
        super._executeOperations(id, t, v, c, d);
    }

    function _executor() internal view override(Governor, GovernorTimelockControl) returns (address) {
        return super._executor();
    }

    // … beberapa override lain yang akan ditunjukkan compiler
}
```

Jangan menulis logika governance sendiri. Cara tercepat menghasilkan kerangka yang benar adalah OpenZeppelin Wizard (pilih Governor), lalu sesuaikan namanya. Compiler akan memberi tahu function mana saja yang wajib di-override, dan isinya cukup `return super.namaFunction(...)`.

## Setup peran

Ini bagian paling penting dari seluruh proyek:

```solidity
// Timelock: sementara admin = pembuat, untuk mengatur peran
address[] memory kosong = new address[](0);
kas = new TimelockController(JEDA_TIMELOCK, kosong, kosong, address(this));
dao = new DaoRT(token, kas, JEDA_VOTING, LAMA_VOTING, 50e18);

kas.grantRole(kas.PROPOSER_ROLE(), address(dao));   // hanya DAO yang bisa menjadwalkan
kas.grantRole(kas.CANCELLER_ROLE(), address(dao));
kas.grantRole(kas.EXECUTOR_ROLE(), address(0));     // siapa pun boleh mengeksekusi setelah jeda
kas.renounceRole(kas.DEFAULT_ADMIN_ROLE(), address(this)); // pembuat melepas kekuasaan
```

Baris terakhir itu yang membuat DAO ini benar-benar milik warga.

## Test

Clock ERC20Votes bawaan adalah **nomor blok**, jadi pakai `vm.roll` untuk melewati voting delay dan voting period, dan `vm.warp` untuk jeda timelock (yang memakai waktu). Pilihan suara: `0` = tolak, `1` = setuju, `2` = abstain.

```solidity
function test_SiklusLengkapProposal() public {
    uint256 id = _ajukan();
    assertEq(uint256(dao.state(id)), uint256(IGovernor.ProposalState.Active));

    vm.prank(budi); dao.castVote(id, 1);
    vm.prank(sari); dao.castVote(id, 1);
    vm.prank(joko); dao.castVote(id, 0);
    _selesaiVoting();
    assertEq(uint256(dao.state(id)), uint256(IGovernor.ProposalState.Succeeded));

    dao.queue(targets, values, calldatas, _hash());
    assertEq(uint256(dao.state(id)), uint256(IGovernor.ProposalState.Queued));

    vm.warp(block.timestamp + JEDA_TIMELOCK + 1);
    dao.execute(targets, values, calldatas, _hash()); // siapa pun boleh mengeksekusi

    assertEq(uint256(dao.state(id)), uint256(IGovernor.ProposalState.Executed));
    assertEq(panitiaLomba.balance, 1 ether);
    assertEq(address(kas).balance, 9 ether);
}

function test_QuorumTidakTercapai() public {
    uint256 id = _ajukan();
    vm.prank(tono); dao.castVote(id, 1); // 100 dari 1000 = 10% < quorum 20%
    _selesaiVoting();
    assertEq(dao.quorum(block.number - 1), 200e18);
    assertEq(uint256(dao.state(id)), uint256(IGovernor.ProposalState.Defeated));
}

function test_RevertEksekusiSebelumTimelock() public {
    uint256 id = _ajukan();
    vm.prank(budi); dao.castVote(id, 1);
    _selesaiVoting();
    dao.queue(targets, values, calldatas, _hash());
    vm.expectRevert(); // jeda 2 hari belum lewat
    dao.execute(targets, values, calldatas, _hash());
}
```

Dua test terakhir ini yang membuktikan DAO-nya benar-benar tanpa pintu belakang:

```solidity
function test_TidakAdaYangBisaMemindahkanKasLangsung() public {
    // Pembuat (test ini) sudah melepas admin, dan bukan proposer
    bytes32 salt = bytes32(0);
    vm.expectRevert();
    kas.schedule(panitiaLomba, 1 ether, "", bytes32(0), salt, JEDA_TIMELOCK);
    // Warga dengan suara terbanyak pun tidak bisa langsung
    vm.prank(budi);
    vm.expectRevert();
    kas.schedule(panitiaLomba, 1 ether, "", bytes32(0), salt, JEDA_TIMELOCK);
    assertEq(address(kas).balance, 10 ether);
}

function test_TokenYangDipindahSetelahSnapshotTidakMenambahSuara() public {
    uint256 id = _ajukan();
    vm.prank(budi); dao.castVote(id, 1);              // 400 suara

    // Budi memindahkan tokennya ke alamat baru lalu mencoba memilih lagi
    address alamatLain = makeAddr("alamatLainBudi");
    vm.prank(budi); token.transfer(alamatLain, 400e18);
    vm.prank(alamatLain); token.delegate(alamatLain);
    vm.prank(alamatLain); dao.castVote(id, 1);        // bobot pada snapshot = 0

    (, uint256 setuju, ) = dao.proposalVotes(id);
    assertEq(setuju, 400e18);                         // tetap 400, bukan 800
}
```

```text
Suite result: ok. 7 passed; 0 failed; 0 skipped
```

## Menjalankan proposal sungguhan

```bash
R=http://127.0.0.1:8545
TOKEN=0x5FbDB2315678afecb367f032d93F642f64180aa3
KAS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
DAO=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
PENERIMA=0x90F79bf6EB2c4f870365E51660fC0E88d8C4C2bF
DESK="Proposal #1: Hadiah lomba 1 ETH"

# 1. Isi kas dan delegasikan suara
cast send $KAS --value 5ether --private-key $PK0 --rpc-url $R
cast send $TOKEN "delegate(address)" 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --private-key $PK0 --rpc-url $R
cast send $TOKEN "delegate(address)" 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 --private-key $PK1 --rpc-url $R
cast rpc anvil_mine 1 --rpc-url $R

# 2. Ajukan proposal
cast send $DAO "propose(address[],uint256[],bytes[],string)" \
  "[$PENERIMA]" "[1000000000000000000]" "[0x]" "$DESK" --private-key $PK0 --rpc-url $R
ID=$(cast call $DAO "hashProposal(address[],uint256[],bytes[],bytes32)(uint256)" \
  "[$PENERIMA]" "[1000000000000000000]" "[0x]" $(cast keccak "$DESK") --rpc-url $R | awk '{print $1}')
cast rpc anvil_mine 2 --rpc-url $R          # lewati voting delay

# 3. Voting (1 = setuju)
cast send $DAO "castVote(uint256,uint8)" $ID 1 --private-key $PK0 --rpc-url $R
cast send $DAO "castVote(uint256,uint8)" $ID 1 --private-key $PK1 --rpc-url $R
cast rpc anvil_mine 301 --rpc-url $R        # lewati voting period

# 4. Queue, tunggu jeda timelock, lalu execute
cast send $DAO "queue(address[],uint256[],bytes[],bytes32)" \
  "[$PENERIMA]" "[1000000000000000000]" "[0x]" $(cast keccak "$DESK") --private-key $PK0 --rpc-url $R
cast rpc evm_increaseTime 601 --rpc-url $R && cast rpc anvil_mine 1 --rpc-url $R
cast send $DAO "execute(address[],uint256[],bytes[],bytes32)" \
  "[$PENERIMA]" "[1000000000000000000]" "[0x]" $(cast keccak "$DESK") --private-key $PK1 --rpc-url $R

cast call $DAO "state(uint256)(uint8)" $ID --rpc-url $R   # 7 = Executed
cast balance $KAS --ether --rpc-url $R                     # 4 ETH
```

Status bergerak dari 1 (Active) ke 4 (Succeeded) lalu 7 (Executed), kas berkurang dari 5 jadi 4 ETH.

Catatan penting untuk L2: `anvil_mine` dan `evm_increaseTime` **tidak tersedia** di testnet sungguhan. Anda harus menunggu blok dan waktu berjalan alami. Itulah sebabnya skrip deploy memakai lama voting 300 blok dan jeda timelock 10 menit, bukan 2 hari seperti di test.

## Tantangan bonus

1. **Proposal yang memanggil contract lain.** Buat proposal agar kas menukar token lewat `PasarMini`. Petunjuk: `calldatas` berisi hasil `abi.encodeCall`.
2. **Antarmuka web DAO.** Daftar proposal, tombol vote, dan status, memakai wagmi dan event `ProposalCreated`.
3. **Guardian darurat.** Berikan `CANCELLER_ROLE` juga ke multisig 3-dari-5 warga, agar proposal berbahaya bisa dibatalkan sebelum dieksekusi. Diskusikan trade-off-nya terhadap desentralisasi.

## Rangkuman

- DAO = token suara (ERC20Votes) + Governor (proposal dan voting) + Timelock (kas dan eksekusi tertunda).
- Keamanan DAO bergantung pada **pengaturan peran**: DAO sebagai satu-satunya proposer, siapa pun sebagai executor, admin dilepas.
- **Snapshot** mencegah suara ganda, **quorum** mencegah keputusan oleh segelintir orang, **timelock** memberi waktu bereaksi.
- Contract besar seperti Governor butuh **optimizer** agar di bawah batas 24 KB.

Tiga pertanyaan untuk direnungkan: Budi memegang 40% suara, jadi bisakah ia memaksakan proposal sendirian, dan dalam kondisi apa? Kalau warga ingin mengubah quorum dari 20% ke 30%, bisakah tanpa deploy ulang (siapa yang berhak memanggil fungsi pengaturan di Governor)? Dan apa trade-off antara jeda timelock yang pendek dan yang panjang?

## Masalah terbuka

DAO Anda berjalan di testnet. Sebelum diumumkan ke seluruh warga, bayangkan hari pertama penggunaannya:

- Bu Siti tidak punya wallet dan bingung dengan seed phrase. Ia juga tidak punya ETH untuk membayar gas saat voting.
- Seminggu setelah peluncuran, ditemukan bug kecil di salah satu contract. Contract itu tidak bisa diubah.
- Tidak ada yang tahu kalau ada transaksi mencurigakan di kas pada tengah malam.
- Seorang warga bertanya: "Apakah ini legal? Bagaimana pajaknya?"

Bagaimana membawa dApp dari "berfungsi di testnet" menjadi "siap dipakai orang sungguhan" secara bertanggung jawab?

Itulah modul terakhir.
