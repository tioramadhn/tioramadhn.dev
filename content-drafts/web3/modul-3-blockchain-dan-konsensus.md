---
title: "Modul 3: Blockchain dan Mekanisme Konsensus"
description: Tanda tangan digital membuktikan siapa, tapi tidak menentukan urutan. Bagaimana ribuan komputer yang tidak saling kenal menyepakati satu catatan, tanpa pemimpin.
date: 2026-10-10
slug: modul-3-blockchain-dan-konsensus
tags: tutorial web 3
series: Tutorial Web 3
status: draft
---

Modul sebelumnya membuat setiap transaksi bisa dibuktikan: siapa yang menandatangani, dan bahwa isinya tidak diubah. Lalu muncul skenario yang membuat tanda tangan digital tidak berdaya:

> Budi hanya punya Rp100.000. Pada detik yang sama ia menandatangani **dua transaksi sah**: kirim Rp100.000 ke Sari, dan kirim Rp100.000 ke Joko.

Kedua tanda tangan itu *asli*. Node mana pun akan bilang "sah". Masalahnya bukan lagi siapa yang menandatangani, melainkan **mana yang terjadi lebih dulu**. Namanya **double spending**.

Modul ini menjawab tiga pertanyaan: bagaimana menyusun transaksi ke dalam urutan yang disepakati semua orang, bagaimana memastikan urutan itu tidak bisa ditulis ulang, dan bagaimana memilih siapa yang berhak menambahkan halaman baru tanpa pemimpin.

## Kenapa cara lama tidak bisa dipakai

Di dunia terpusat, double spending selesai dengan mudah: ada satu pencatat resmi. Transaksi pertama yang tiba diproses, saldo berkurang, transaksi kedua ditolak. Selesai. Tapi itu mengembalikan semua masalah sentralisasi.

Kalau pencatatnya ribuan node yang setara, muncul masalah baru:

- **Pesan tiba di waktu berbeda.** Node di Jakarta menerima transaksi ke Sari lebih dulu, node di Berlin menerima yang ke Joko lebih dulu.
- **Sebagian node mungkin curang.** Ada yang berbohong, ada yang mati di tengah jalan.
- **Identitas murah.** Satu orang bisa membuat 10.000 node palsu. Kalau keputusan diambil "satu node satu suara", ia menang voting sendirian. Namanya **Sybil attack**.

Masalah ini sudah dirumuskan jauh sebelum blockchain. Pada 1982, Lamport, Shostak, dan Pease merumuskan **Masalah Jenderal Bizantium**: beberapa jenderal harus sepakat menyerang atau mundur bersamaan, hanya lewat kurir, sementara sebagian jenderal mungkin pengkhianat. Sistem yang tetap benar meski ada peserta curang disebut *Byzantine Fault Tolerant*.

Algoritma 1990-an seperti PBFT bisa menyelesaikannya, tapi hanya untuk peserta yang sedikit dan identitasnya diketahui, jadi tidak cocok untuk internet terbuka.

Terobosannya datang dari arah tak terduga: pada 1997 Adam Back membuat **Hashcash**, sistem anti-spam yang mewajibkan pengirim melakukan sedikit kerja komputasi. Satu email terasa ringan, sejuta email jadi mahal. Pada 2008, Satoshi Nakamoto menggabungkan ide itu dengan hash, tanda tangan digital, dan rantai blok. Kuncinya: hak menambah blok tidak ditentukan jumlah identitas, tapi **sumber daya nyata yang mahal**. Membuat 10.000 node palsu jadi tidak berguna.

## Analogi: buku kas arisan, versi lanjutan

Arisan yang sama seperti modul pertama, tapi anggotanya kini ribuan orang yang tidak saling kenal.

**Halaman yang dijahit dengan sidik jari.** Setiap halaman ditutup dengan hash seluruh isinya, dan halaman berikutnya wajib mencantumkan hash halaman sebelumnya di bagian atas. Ubah satu angka di halaman 10, hash-nya berubah, catatan di halaman 11 tidak cocok lagi, lalu 12, dan seterusnya. Memalsukan satu halaman berarti menulis ulang *semua* halaman sesudahnya.

**Hak menulis lewat lomba teka-teki.** Siapa pun yang ingin menulis halaman baru harus memecahkan teka-teki yang sangat sulit dicari tapi sangat mudah dicek. Pemenang pertama berhak menulis dan mendapat hadiah.

**Atau lewat uang jaminan.** Versi lain: penulis harus menitipkan jaminan. Ia dipilih acak dengan peluang sebanding jaminannya, dan kalau ketahuan curang jaminannya disita.

**Aturan buku paling tebal.** Kadang dua penulis selesai hampir bersamaan sehingga ada dua versi buku. Semua orang mengikuti versi dengan "kerja" terbanyak di dalamnya. Versi yang kalah ditinggalkan, transaksinya kembali ke antrean.

| Dunia arisan | Konsep teknis |
| --- | --- |
| Halaman buku kas | **Block** |
| Sidik jari halaman sebelumnya | **prevHash** |
| Halaman pertama | **Genesis block** |
| Lomba teka-teki | **Proof of Work** dan **mining** |
| Angka yang dicoba-coba | **Nonce** |
| Tingkat kesulitan teka-teki | **Difficulty** |
| Uang jaminan penulis | **Stake** |
| Penulis berjaminan | **Validator** |
| Penyitaan jaminan | **Slashing** |
| Dua versi buku sementara | **Fork** |
| Aturan buku paling tebal | **Fork choice rule** |

## Anatomi blok

```text
Blok 0 (Genesis)     Blok 1              Blok 2              Blok 3
prevHash: 000...0 -> prevHash: bc15... -> prevHash: 583e... -> prevHash: 43d3...
data: ...            data: Budi setor    data: Sari setor    data: Joko setor
hash: bc15...        hash: 583e...       hash: 43d3...       hash: 5cba...
```

| Bagian | Fungsi |
| --- | --- |
| Index | Posisi dalam rantai |
| Timestamp | Membantu urutan dan penyesuaian kesulitan |
| Data | Daftar transaksi bertanda tangan |
| prevHash | **Pengikat rantai** |
| Nonce | Angka yang dicoba-coba (khusus PoW) |
| Hash | Identitas sekaligus segel blok |

Blockchain sungguhan tidak menghash daftar transaksi secara langsung, tapi merangkumnya dalam **Merkle tree** sehingga satu transaksi bisa dibuktikan ada di dalam blok tanpa mengunduh seluruh blok. Untuk sekarang, cukup tahu konsepnya ada.

Kalau penyerang mengubah data di Blok 1: hash Blok 1 berubah, prevHash Blok 2 tidak cocok, rantai putus. Kalau penyerang menghitung ulang hash Blok 1, Blok 2 tetap tidak cocok, sehingga ia harus menghitung ulang semuanya sampai ujung. Tanpa konsensus, menghitung ulang itu murah. **Konsensuslah yang membuatnya mahal.**

## Proof of Work

Teka-tekinya: temukan nonce yang membuat hash blok diawali sejumlah angka nol. Karena hash tidak bisa ditebak, satu-satunya cara adalah mencoba jutaan nonce.

Asimetri inilah yang penting: mencari nonce sangat mahal, mengeceknya hanya butuh satu kali hash. Ribuan node bisa memverifikasi kerja penambang dalam sekejap.

Difficulty diatur otomatis. Bitcoin menyesuaikannya tiap 2.016 blok agar rata-rata satu blok tetap sekitar 10 menit, berapa pun jumlah penambangnya.

Kenapa ini mencegah Sybil attack? Yang dihitung adalah jumlah hash yang dicoba, bukan jumlah node. Sepuluh ribu node palsu di satu laptop tetap hanya punya daya hash satu laptop.

## Proof of Stake

Untuk jadi validator Ethereum, Anda mengunci minimal **32 ETH**. Setiap slot 12 detik, protokol memilih satu *proposer* secara acak dengan peluang sebanding stake-nya. Validator lain memberi **attestation**, yaitu pernyataan setuju yang ditandatangani kunci privat mereka. Ini penerapan langsung dari modul sebelumnya.

Validator yang ketahuan curang, misalnya menandatangani dua blok berbeda di posisi sama, terkena **slashing**. Setelah cukup banyak validator setuju (sekitar 13 menit), blok mencapai **finality**: membatalkannya berarti sebagian besar stake seluruh jaringan harus disita.

| Aspek | Proof of Work | Proof of Stake |
| --- | --- | --- |
| Yang dikorbankan | Listrik dan perangkat keras | Aset yang dikunci |
| Pemilihan penambah blok | Pertama memecahkan teka-teki | Acak, sebanding stake |
| Hukuman bagi yang curang | Kehilangan biaya listrik | Slashing |
| Konsumsi energi | Sangat tinggi | Sangat rendah |
| Waktu blok | Bitcoin ±10 menit | Ethereum 12 detik |
| Kritik utama | Boros energi, pool terpusat | "Yang kaya makin kaya" |

## Fork dan fork choice rule

Kembali ke masalah Budi:

1. Dua penambang menemukan blok hampir bersamaan: satu berisi "Budi → Sari", satu "Budi → Joko". Terjadi **fork**.
2. Sebagian node membangun di atas cabang A, sebagian di cabang B.
3. Penambang berikutnya kebetulan menemukan blok di atas cabang B. Kini cabang B lebih panjang.
4. Semua node pindah ke cabang B. Transaksi ke Sari dibatalkan, kembali ke antrean, lalu ditolak karena saldo Budi sudah habis.

Double spending terselesaikan. Bitcoin sebenarnya memilih rantai dengan **total kerja terbanyak**, bukan sekadar blok terbanyak; Ethereum PoS memakai aturan berbasis bobot suara validator. Untuk latihan kita sederhanakan jadi "rantai valid terpanjang".

Inilah kenapa penjual bijak menunggu beberapa **konfirmasi**. Makin banyak blok di atasnya, makin kecil peluang cabang lain menyalip.

## Praktik

```bash
mkdir web3-modul-3 && cd web3-modul-3
npm init -y
npm pkg set type=module
```

Modul ini hanya memakai `node:crypto` bawaan Node.js.

### Pemanasan: mengamati blockchain nyata

Buka [mempool.space](https://mempool.space), lihat blok Bitcoin terbaru, dan perhatikan jarak waktu antarblok. Klik salah satu blok dan cari nilai hash-nya, yang selalu diawali deretan panjang angka nol. Itulah jejak Proof of Work. Lalu bandingkan dengan [etherscan.io/blocks](https://etherscan.io/blocks). Kenapa jarak antarblok Bitcoin jauh lebih lama dan tidak teratur?

### Latihan 1: Merangkai blok dengan hash

```javascript
import { createHash } from 'node:crypto';
const sha256 = (t) => createHash('sha256').update(t).digest('hex');

function hitungHash(blok) {
  return sha256(blok.index + blok.prevHash + JSON.stringify(blok.data));
}

function buatBlok(index, data, prevHash) {
  const blok = { index, data, prevHash };
  blok.hash = hitungHash(blok);
  return blok;
}

const chain = [buatBlok(0, 'Genesis: arisan RT 05 dimulai', '0'.repeat(64))];
for (const data of ['Budi setor Rp100000', 'Sari setor Rp100000', 'Joko setor Rp100000']) {
  const prev = chain[chain.length - 1];
  chain.push(buatBlok(prev.index + 1, data, prev.hash));
}

function periksa(chain) {
  for (let i = 1; i < chain.length; i++) {
    const b = chain[i];
    if (b.hash !== hitungHash(b)) return `❌ Blok ${i}: isi diubah (hash tidak cocok)`;
    if (b.prevHash !== chain[i - 1].hash) return `❌ Blok ${i}: rantai putus (prevHash tidak cocok)`;
  }
  return '✅ Rantai valid';
}

console.log('Sebelum diubah :', periksa(chain));

// Serangan 1: ubah data blok 1
chain[1].data = 'Budi setor Rp900000';
console.log('Ubah data saja :', periksa(chain));

// Serangan 2: penyerang menghitung ulang hash blok 1
chain[1].hash = hitungHash(chain[1]);
console.log('Hitung ulang hash blok 1:', periksa(chain));
```

Keluarannya:

```text
Sebelum diubah : ✅ Rantai valid
Ubah data saja : ❌ Blok 1: isi diubah (hash tidak cocok)
Hitung ulang hash blok 1: ❌ Blok 2: rantai putus (prevHash tidak cocok)
```

Perhatikan: setelah penyerang menghitung ulang hash Blok 1, kesalahannya *pindah* ke Blok 2. Dan kalau ia terus menghitung ulang semua blok sampai ujung, rantainya jadi valid lagi. Itulah kenapa kita butuh latihan berikutnya.

### Latihan 2: Menambang dengan Proof of Work

Sekarang kita buat menambah blok menjadi **mahal**:

```javascript
import { createHash } from 'node:crypto';
const sha256 = (t) => createHash('sha256').update(t).digest('hex');

function tambang(data, prevHash, difficulty) {
  const target = '0'.repeat(difficulty);
  let nonce = 0, hash;
  const mulai = Date.now();
  do {
    nonce++;
    hash = sha256(prevHash + data + nonce);
  } while (!hash.startsWith(target));
  return { nonce, hash, ms: Date.now() - mulai };
}

for (let d = 1; d <= 5; d++) {
  const r = tambang('Budi setor Rp100000', 'abc123', d);
  console.log(`difficulty ${d} | nonce ${String(r.nonce).padStart(8)} | ${String(r.ms).padStart(5)} ms | ${r.hash.slice(0, 20)}...`);
}
```

```text
difficulty 1 | nonce        2 |     1 ms | 043cdcad0948403d9166...
difficulty 2 | nonce      677 |     4 ms | 0035964d20200e226188...
difficulty 3 | nonce    12801 |    64 ms | 000ec27a31798e193334...
difficulty 4 | nonce   381411 |   488 ms | 0000763cc2279bee3fb1...
difficulty 5 | nonce   997909 |  1124 ms | 000009c18dbdc71dcdb9...
```

Setiap tambahan satu angka nol, rata-rata jumlah percobaan naik sekitar 16 kali lipat, karena heksadesimal punya 16 kemungkinan per karakter. Karena prosesnya acak, sesekali hasilnya lebih cepat atau lebih lambat dari rata-rata. Sementara mengeceknya tetap hanya butuh satu kali hash.

Bayangkan difficulty 19 atau lebih seperti Bitcoin sekarang: dibutuhkan jaringan penambang global untuk menemukan satu blok setiap sekitar 10 menit.

### Latihan 3: Menyelesaikan double spending

Sekarang gabungkan semuanya:

```javascript
import { createHash } from 'node:crypto';
const sha256 = (t) => createHash('sha256').update(t).digest('hex');
const DIFFICULTY = 3;

function tambangBlok(prev, data) {
  const index = prev ? prev.index + 1 : 0;
  const prevHash = prev ? prev.hash : '0'.repeat(64);
  let nonce = 0, hash;
  do {
    nonce++;
    hash = sha256(index + prevHash + data + nonce);
  } while (!hash.startsWith('0'.repeat(DIFFICULTY)));
  return { index, prevHash, data, nonce, hash };
}

function valid(chain) {
  return chain.every((b, i) =>
    b.hash === sha256(b.index + b.prevHash + b.data + b.nonce) &&
    b.hash.startsWith('0'.repeat(DIFFICULTY)) &&
    (i === 0 || b.prevHash === chain[i - 1].hash));
}

function pilihRantai(...kandidat) {
  return kandidat.filter(valid).sort((a, b) => b.length - a.length)[0];
}

const genesis = tambangBlok(null, 'Genesis: Budi punya Rp100000');

// Fork: node A menerima transaksi ke Sari, node B ke Joko
const rantaiA = [genesis, tambangBlok(genesis, 'Budi kirim Rp100000 ke Sari')];
const rantaiB = [genesis, tambangBlok(genesis, 'Budi kirim Rp100000 ke Joko')];

// Penambang berikutnya kebetulan membangun di atas rantai B
rantaiB.push(tambangBlok(rantaiB.at(-1), 'Sari setor Rp100000'));

const menang = pilihRantai(rantaiA, rantaiB);
menang.forEach((b) => console.log(' ', b.index, b.hash.slice(0, 12) + '...', b.data));

// Penyerang memalsukan rantai panjang tanpa menambang ulang
const palsu = [
  ...rantaiA,
  { ...rantaiA[1], index: 2, data: 'blok palsu', prevHash: rantaiA[1].hash },
  { ...rantaiA[1], index: 3, data: 'blok palsu 2' },
];
console.log('Rantai palsu (4 blok) valid?', valid(palsu));
console.log('Terpilih setelah ada rantai palsu:', pilihRantai(rantaiA, rantaiB, palsu).length, 'blok');
```

```text
  0 0005c23f976a... Genesis: Budi punya Rp100000
  1 0007ff7381c9... Budi kirim Rp100000 ke Joko
  2 000422bb261c... Sari setor Rp100000
Rantai palsu (4 blok) valid? false
Terpilih setelah ada rantai palsu: 3 blok
```

Transaksi ke Joko menang karena berada di rantai yang lebih panjang; transaksi ke Sari gugur, dan double spending gagal. Rantai palsu ditolak karena penyerang tidak benar-benar melakukan kerja Proof of Work. Untuk menang, ia harus menambang lebih cepat daripada seluruh jaringan jujur. Itulah serangan 51%.

Dan serangan itu bukan teori. Ethereum Classic adalah blockchain PoW yang jauh lebih kecil dari Bitcoin; karena total daya komputasinya kecil, penyerang bisa menyewa daya yang lebih besar dari seluruh jaringan jujur. Pada 2019 dan beberapa kali pada 2020, penyerang berhasil menulis ulang ribuan blok dan melakukan double spending di bursa. Keamanan PoW sebanding dengan **biaya menyerangnya**. Konsensus bukan sihir, melainkan soal ekonomi.

## Harga yang dibayar

Konsensus terdesentralisasi menukar kecepatan dan efisiensi dengan keamanan tanpa pihak tepercaya. Pertukaran ini nyata:

1. **Lambat.** Setiap blok harus disebar dan diverifikasi ribuan node. Database bank memproses puluhan ribu transaksi per detik; Ethereum Layer 1 jauh di bawah itu.
2. **Butuh menunggu konfirmasi.** Di Bitcoin, kebiasaan umum adalah menunggu sekitar 6 blok untuk nilai besar.
3. **Serangan 51%.** Blockchain kecil sangat rentan.
4. **Sentralisasi diam-diam.** Di PoW, penambangan terkonsentrasi di beberapa mining pool. Di PoS, banyak stake terkumpul di beberapa penyedia besar.
5. **Energi.** Konsumsi listrik Bitcoin setara negara berukuran menengah.
6. **Trilema blockchain.** Sulit mendapat desentralisasi, keamanan, dan skalabilitas sekaligus. Biasanya salah satu dikorbankan.

Dan seperti biasa, ada keadaan yang tidak memerlukan ini: konsorsium lima bank yang saling kenal cukup memakai konsensus klasik di jaringan *permissioned* yang jauh lebih cepat. Kalau yang dibutuhkan sekadar bukti data tidak diubah, bukan urutan yang disepakati banyak pihak, cukup simpan hash berantai di server sendiri, seperti cara Git menyimpan riwayat commit.

## Rangkuman

- Tanda tangan digital membuktikan *siapa*, tapi tidak menentukan *urutan*. Tanpa urutan yang disepakati, terjadi double spending.
- Blockchain merangkai blok dengan hash, sehingga mengubah satu blok merusak semua blok sesudahnya.
- Menghitung ulang hash itu murah. Konsensus membuat hak menambah blok jadi mahal, sehingga menulis ulang sejarah tidak menguntungkan.
- Proof of Work memakai teka-teki yang mahal dicari tapi murah dicek. Proof of Stake memakai jaminan aset yang bisa disita.
- Saat terjadi fork, node mengikuti fork choice rule sehingga hanya satu versi transaksi bertahan.

## Masalah terbuka

Semua bagiannya sudah ada, tapi masih terpisah. Transaksi bisa ditandatangani dan diverifikasi; blok bisa dirangkai, ditambang, dan dipilih saat fork.

Tapi di latihan tadi, isi blok hanyalah teks biasa seperti `"Budi kirim Rp100000 ke Joko"`. Siapa pun bisa menulis teks itu tanpa tanda tangan Budi. Rantainya juga belum tahu berapa saldo Budi sebenarnya.

Bagaimana menggabungkan tanda tangan digital, saldo, dan Proof of Work menjadi satu blockchain mini yang menolak transaksi palsu, menolak saldo yang tidak cukup, dan menolak rantai yang dipalsukan?

Itulah proyek pertama.
