---
title: "Proyek 1: Membangun Blockchain Mini dari Nol"
description: Menggabungkan tanda tangan digital, saldo, dan Proof of Work jadi satu blockchain yang benar-benar menolak transaksi palsu, saldo kurang, replay, dan rantai yang dipalsukan.
date: 2026-10-11
slug: proyek-1-blockchain-mini
tags: tutorial web 3
series: Tutorial Web 3
status: draft
---

Tiga modul pertama meninggalkan satu celah. Isi blok masih berupa teks biasa seperti `"Budi kirim Rp100000 ke Joko"`, sehingga siapa pun bisa menulisnya tanpa tanda tangan Budi, dan rantainya tidak tahu berapa saldo Budi sebenarnya.

Proyek ini menutup celah itu. Hasilnya blockchain mini yang bekerja dengan prinsip yang sama seperti Bitcoin dan Ethereum awal, meski hanya berjalan di satu laptop.

## Ceritanya

RT 05 ingin memakai "Koin Arisan" digital. Ketua RT tidak mau jadi bendahara tunggal. Sistemnya harus memastikan:

- Setiap warga punya wallet sendiri.
- Hanya pemilik wallet yang bisa mengirim koin dari wallet-nya.
- Tidak ada yang bisa membelanjakan koin yang tidak ia miliki.
- Tidak ada yang bisa mengulang transaksi lama atau mengubah sejarah.
- Warga yang membantu menambang mendapat imbalan koin baru.

Satu konsep baru muncul di sini: **account nonce**, nomor urut transaksi per akun. Ini berbeda dari nonce penambangan. Anda akan menemukan sendiri kenapa ia dibutuhkan saat menghadapi **replay attack**. Konsep ini dipakai persis di Ethereum.

## Arsitektur

```text
Wallet warga (private key)
      |  tanda tangani
      v
Transaksi { from, to, amount, nonce, signature }
      |
      v
  Periksa: tanda tangan -> nonce -> saldo
      |                         |
   ditolak                  diterima
  (alasan)                      v
                            Mempool
                                |
                                v
            Penambang: imbalan + isi mempool + Proof of Work
                                |
                                v
                           Rantai blok
                                |
                                v
              State: saldo & nonce dihitung dengan memutar ulang rantai
```

| Komponen | Tanggung jawab | File |
| --- | --- | --- |
| Transaksi | Membentuk, menandatangani, memverifikasi | `src/transaction.js` |
| Blok | Menghitung hash, menambang | `src/block.js` |
| Blockchain | Mempool, saldo, menambang, validasi, fork choice | `src/blockchain.js` |
| Skenario | Menjalankan semua skenario uji | `src/main.js` |

Dua keputusan desain yang perlu dipahami:

**Model akun.** Kita memakai model akun seperti Ethereum: setiap alamat punya saldo dan nonce. Bitcoin memakai model berbeda bernama UTXO, yang tidak dibahas di sini.

**Saldo tidak disimpan, tapi dihitung.** Saldo setiap akun didapat dengan memutar ulang semua transaksi dari genesis. Ini membuktikan blockchain sebenarnya hanya menyimpan *riwayat*. *State* bisa dihitung ulang siapa saja dan hasilnya pasti sama.

## Spesifikasi wajib

- **S1 Genesis.** Blok pertama memberi saldo awal ke alamat tertentu.
- **S2 Transaksi bertanda tangan.** Berisi `from`, `to`, `amount`, `nonce`, `signature`.
- **S3 Tolak tanda tangan tidak sah.** Termasuk jumlah yang diubah setelah ditandatangani, atau transaksi atas nama orang lain.
- **S4 Tolak saldo tidak cukup.** Termasuk saat saldo sudah dipakai transaksi lain yang masih antre di mempool.
- **S5 Tolak replay.** Transaksi yang sudah tercatat tidak boleh diterima lagi.
- **S6 Penambangan.** Blok berisi imbalan penambang di posisi pertama, lalu isi mempool, dan memenuhi difficulty.
- **S7 Validasi penuh.** Memeriksa hash, PoW, prevHash, imbalan, tanda tangan, nonce, dan saldo di setiap blok.
- **S8 Fork choice.** Hanya ganti rantai jika lebih panjang **dan** valid.

## Persiapan

```bash
mkdir blockchain-mini && cd blockchain-mini
npm init -y
npm pkg set type=module
npm install viem
mkdir src
```

## Tahap 1: Transaksi bertanda tangan

`src/transaction.js`:

```javascript
import { verifyMessage } from 'viem';

// Isi transaksi yang ditandatangani. Urutan field harus selalu sama,
// karena urutan JSON berbeda = hash berbeda = tanda tangan tidak cocok.
export function payload(tx) {
  return JSON.stringify({ from: tx.from, to: tx.to, amount: tx.amount, nonce: tx.nonce });
}

export async function buatTransaksi(akun, to, amount, nonce) {
  const tx = { from: akun.address, to, amount, nonce };
  tx.signature = await akun.signMessage({ message: payload(tx) });
  return tx;
}

export async function tandaTanganSah(tx) {
  if (tx.from === 'SISTEM') return true; // imbalan penambang tidak butuh tanda tangan
  try {
    return await verifyMessage({ address: tx.from, message: payload(tx), signature: tx.signature });
  } catch {
    return false; // signature rusak atau format alamat salah
  }
}
```

Pertanyaan untuk dipikirkan: kenapa field `signature` tidak ikut dimasukkan ke `payload`?

## Tahap 2: Blok dan Proof of Work

`src/block.js` adalah perluasan langsung dari latihan modul sebelumnya, ditambah timestamp dan daftar transaksi:

```javascript
import { createHash } from 'node:crypto';

export const sha256 = (t) => createHash('sha256').update(t).digest('hex');

export function hitungHash(b) {
  return sha256(b.index + b.timestamp + b.prevHash + JSON.stringify(b.transactions) + b.nonce);
}

export function tambang(b, difficulty) {
  const target = '0'.repeat(difficulty);
  b.nonce = 0;
  do {
    b.nonce++;
    b.hash = hitungHash(b);
  } while (!b.hash.startsWith(target));
  return b;
}
```

## Tahap 3: Kelas Blockchain

Beberapa petunjuk sebelum Anda menulisnya sendiri:

- **Saldo awal** jadi transaksi dari `SISTEM`: `Object.entries(saldoAwal).map(([to, amount]) => ({ from: 'SISTEM', to, amount, nonce: 0 }))`.
- **Genesis harus deterministik.** Pakai `timestamp: 0`, supaya semua node menghasilkan genesis yang sama persis.
- **Urutan pemeriksaan**: pengirim bukan `SISTEM` → jumlah bilangan bulat positif → tanda tangan → nonce → saldo.
- **Nonce yang diharapkan** = jumlah transaksi yang sudah pernah dikirim akun itu. Akun baru mulai dari 0.
- **Imbalan penambang** diberi `nonce: this.chain.length` agar setiap imbalan unik.

Solusinya:

```javascript
import { hitungHash, tambang } from './block.js';
import { tandaTanganSah } from './transaction.js';

export class Blockchain {
  constructor({ difficulty = 3, reward = 50, saldoAwal = {} } = {}) {
    this.difficulty = difficulty;
    this.reward = reward;
    const genesisTx = Object.entries(saldoAwal).map(([to, amount]) => ({ from: 'SISTEM', to, amount, nonce: 0 }));
    const genesis = { index: 0, timestamp: 0, prevHash: '0'.repeat(64), transactions: genesisTx, nonce: 0 };
    this.chain = [tambang(genesis, difficulty)];
    this.mempool = [];
  }

  get ujung() { return this.chain[this.chain.length - 1]; }

  // Hitung saldo dan nonce semua akun dengan memutar ulang seluruh rantai
  static hitungState(chain) {
    const saldo = {}, nonce = {};
    for (const b of chain) for (const tx of b.transactions) {
      if (tx.from !== 'SISTEM') {
        saldo[tx.from] = (saldo[tx.from] ?? 0) - tx.amount;
        nonce[tx.from] = (nonce[tx.from] ?? 0) + 1;
      }
      saldo[tx.to] = (saldo[tx.to] ?? 0) + tx.amount;
    }
    return { saldo, nonce };
  }

  saldo(alamat) { return Blockchain.hitungState(this.chain).saldo[alamat] ?? 0; }

  // Mengembalikan alasan penolakan, atau null jika sah
  static async periksaTx(tx, state) {
    if (tx.from === 'SISTEM') return 'transaksi SISTEM hanya boleh dibuat penambang';
    if (!Number.isInteger(tx.amount) || tx.amount <= 0) return 'jumlah tidak valid';
    if (!(await tandaTanganSah(tx))) return 'tanda tangan tidak sah';
    if ((state.nonce[tx.from] ?? 0) !== tx.nonce) return `nonce salah (diharapkan ${state.nonce[tx.from] ?? 0})`;
    if ((state.saldo[tx.from] ?? 0) < tx.amount) return 'saldo tidak cukup';
    return null;
  }

  static terapkan(tx, state) {
    state.saldo[tx.from] -= tx.amount;
    state.nonce[tx.from] = (state.nonce[tx.from] ?? 0) + 1;
    state.saldo[tx.to] = (state.saldo[tx.to] ?? 0) + tx.amount;
  }

  async tambahTransaksi(tx) {
    // Periksa terhadap state rantai + transaksi yang sudah antre di mempool
    const state = Blockchain.hitungState(this.chain);
    for (const t of this.mempool) Blockchain.terapkan(t, state);
    const alasan = await Blockchain.periksaTx(tx, state);
    if (alasan) return { diterima: false, alasan };
    this.mempool.push(tx);
    return { diterima: true };
  }

  tambangBlok(alamatPenambang) {
    const imbalan = { from: 'SISTEM', to: alamatPenambang, amount: this.reward, nonce: this.chain.length };
    const blok = {
      index: this.chain.length,
      timestamp: Date.now(),
      prevHash: this.ujung.hash,
      transactions: [imbalan, ...this.mempool],
      nonce: 0,
    };
    this.chain.push(tambang(blok, this.difficulty));
    this.mempool = [];
    return blok;
  }

  // Validasi penuh sebuah rantai dari genesis
  async validasi(chain = this.chain) {
    const target = '0'.repeat(this.difficulty);
    if (JSON.stringify(chain[0]) !== JSON.stringify(this.chain[0])) return 'genesis berbeda';
    const state = Blockchain.hitungState([chain[0]]);
    for (let i = 1; i < chain.length; i++) {
      const b = chain[i];
      if (b.hash !== hitungHash(b)) return `blok ${i}: hash tidak cocok`;
      if (!b.hash.startsWith(target)) return `blok ${i}: Proof of Work tidak memenuhi difficulty`;
      if (b.prevHash !== chain[i - 1].hash) return `blok ${i}: prevHash tidak cocok`;
      const [imbalan, ...txs] = b.transactions;
      if (imbalan?.from !== 'SISTEM' || imbalan.amount !== this.reward) return `blok ${i}: imbalan penambang tidak valid`;
      state.saldo[imbalan.to] = (state.saldo[imbalan.to] ?? 0) + imbalan.amount;
      for (const tx of txs) {
        const alasan = await Blockchain.periksaTx(tx, state);
        if (alasan) return `blok ${i}: ${alasan}`;
        Blockchain.terapkan(tx, state);
      }
    }
    return null; // null = valid
  }

  // Fork choice rule sederhana: ganti ke rantai valid yang lebih panjang
  async gantiRantai(rantaiBaru) {
    if (rantaiBaru.length <= this.chain.length) return 'ditolak: tidak lebih panjang';
    const alasan = await this.validasi(rantaiBaru);
    if (alasan) return `ditolak: ${alasan}`;
    this.chain = rantaiBaru;
    this.mempool = [];
    return 'diganti';
  }
}
```

## Tahap 4: Skenario uji

| No | Skenario | Hasil yang diharapkan |
| --- | --- | --- |
| 1 | Genesis memberi Budi 100 | Budi=100, Sari=0, Joko=0 |
| 2 | Budi kirim 30 ke Sari (nonce 0) | Diterima |
| 3 | Budi kirim 80 ke Joko, padahal sisa 70 | Ditolak: saldo tidak cukup |
| 4 | Jumlah diubah setelah ditandatangani | Ditolak: tanda tangan tidak sah |
| 5 | Joko menandatangani tapi mengaku Budi | Ditolak: tanda tangan tidak sah |
| 6 | Joko menambang blok 1 | Budi=70, Sari=30, Joko=50 |
| 7 | Transaksi nomor 2 dikirim ulang | Ditolak: nonce salah |
| 8 | Jumlah di blok 1 diubah pada salinan rantai | Validasi gagal: hash tidak cocok |
| 9 | Node lain punya rantai lebih panjang yang sah | Rantai diganti |
| 10 | Saldo setelah pindah rantai | Budi=50, Sari=130, Joko=70 |
| 11 | Validasi rantai akhir | Valid |

```javascript
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { Blockchain } from './blockchain.js';
import { buatTransaksi } from './transaction.js';

const budi = privateKeyToAccount(generatePrivateKey());
const sari = privateKeyToAccount(generatePrivateKey());
const joko = privateKeyToAccount(generatePrivateKey());
const nama = { [budi.address]: 'Budi', [sari.address]: 'Sari', [joko.address]: 'Joko' };
const tampilSaldo = (bc) => Object.entries(nama).map(([a, n]) => `${n}=${bc.saldo(a)}`).join(', ');

const bc = new Blockchain({ difficulty: 3, reward: 50, saldoAwal: { [budi.address]: 100 } });
console.log('1. Genesis         :', tampilSaldo(bc));

// Transaksi sah
const tx1 = await buatTransaksi(budi, sari.address, 30, 0);
console.log('2. Budi→Sari 30    :', await bc.tambahTransaksi(tx1));

// Double spending di mempool (saldo Budi tinggal 70)
const tx2 = await buatTransaksi(budi, joko.address, 80, 1);
console.log('3. Budi→Joko 80    :', await bc.tambahTransaksi(tx2));

// Pemalsuan jumlah setelah ditandatangani
const tx3 = await buatTransaksi(budi, joko.address, 10, 1);
tx3.amount = 60;
console.log('4. Jumlah dipalsu  :', await bc.tambahTransaksi(tx3));

// Joko mencoba mengirim atas nama Budi
const tx4 = await buatTransaksi(joko, joko.address, 20, 1);
tx4.from = budi.address;
console.log('5. Atas nama Budi  :', await bc.tambahTransaksi(tx4));

bc.tambangBlok(joko.address);
console.log('6. Blok 1 ditambang:', tampilSaldo(bc));

// Replay attack: mengirim ulang tx1 yang sudah tercatat
console.log('7. Replay tx1      :', await bc.tambahTransaksi(tx1));

// Mengubah sejarah di blok 1
const salinan = structuredClone(bc.chain);
salinan[1].transactions[1].amount = 1;
console.log('8. Sejarah diubah  :', (await bc.validasi(salinan)) ?? 'valid');

// Fork: node lain punya rantai lebih panjang yang sah
const nodeLain = new Blockchain({ difficulty: 3, reward: 50, saldoAwal: { [budi.address]: 100 } });
nodeLain.chain = structuredClone(bc.chain);
await nodeLain.tambahTransaksi(await buatTransaksi(budi, joko.address, 20, 1));
nodeLain.tambangBlok(sari.address);
nodeLain.tambangBlok(sari.address);
console.log('9. Terima rantai lain:', await bc.gantiRantai(nodeLain.chain));
console.log('10. Saldo akhir    :', tampilSaldo(bc), '| panjang rantai:', bc.chain.length);
console.log('11. Rantai valid?  :', (await bc.validasi()) ?? 'valid');
```

Keluaran yang benar:

```text
1. Genesis         : Budi=100, Sari=0, Joko=0
2. Budi→Sari 30    : { diterima: true }
3. Budi→Joko 80    : { diterima: false, alasan: 'saldo tidak cukup' }
4. Jumlah dipalsu  : { diterima: false, alasan: 'tanda tangan tidak sah' }
5. Atas nama Budi  : { diterima: false, alasan: 'tanda tangan tidak sah' }
6. Blok 1 ditambang: Budi=70, Sari=30, Joko=50
7. Replay tx1      : { diterima: false, alasan: 'nonce salah (diharapkan 1)' }
8. Sejarah diubah  : blok 1: hash tidak cocok
9. Terima rantai lain: diganti
10. Saldo akhir    : Budi=50, Sari=130, Joko=70 | panjang rantai: 4
11. Rantai valid?  : valid
```

## Tantangan bonus

1. **Biaya transaksi.** Tambahkan field `fee` yang dibayar pengirim dan diterima penambang, lalu buat penambang mendahulukan fee tertinggi. Ini konsep yang di Ethereum disebut *gas*.
2. **Penyesuaian difficulty.** Naikkan difficulty jika blok rata-rata ditambang terlalu cepat.
3. **Dua node lewat HTTP.** Jalankan dua proses Node.js yang saling bertukar rantai.
4. **Total kerja.** Ganti aturan "terpanjang" jadi "total kerja terbesar".

## Rangkuman

- Transaksi aman karena **ditandatangani**. Mengubah satu field atau mengaku sebagai orang lain langsung ketahuan.
- **Saldo bukan data yang disimpan**, melainkan hasil memutar ulang seluruh riwayat. Siapa pun bisa menghitungnya ulang dan dapat hasil sama.
- **Account nonce** mencegah replay attack. Tanpanya, transaksi sah bisa dikirim ulang berkali-kali.
- Pemeriksaan saldo harus memperhitungkan **mempool**, bukan hanya rantai, agar double spending sebelum blok ditambang juga tertolak.
- Node jujur **tidak memercayai** rantai dari node lain. Ia memvalidasi semuanya dari genesis, baru memutuskan.

Tiga pertanyaan untuk direnungkan: kenapa tanda tangan Budi tidak bisa dipakai ulang oleh Sari? Apa yang terjadi pada transaksi di mempool ketika node berpindah rantai? Dan kalau Anda bisa menambang 10 kali lebih cepat dari semua warga digabung, apa yang bisa Anda lakukan?

## Masalah terbuka

Blockchain mini ini bekerja, tapi hanya hidup di satu laptop. Warga lain tidak bisa ikut jadi node, saldo awal dibuat sesuka hati, dan penambang mau menyertakan transaksi siapa saja tanpa imbalan khusus.

Bagaimana masuk ke blockchain publik sungguhan yang dijalankan ribuan node di seluruh dunia? Bagaimana wallet sungguhan menyimpan kunci, dan siapa yang membayar kerja ribuan node yang memproses transaksi Anda?

Itulah modul berikutnya: Ethereum, wallet, dan transaksi.
