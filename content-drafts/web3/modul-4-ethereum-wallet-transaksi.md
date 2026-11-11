---
title: "Modul 4: Ethereum, Wallet, dan Transaksi"
description: Dari blockchain di laptop ke jaringan publik sungguhan: seed phrase, gas, chain ID, dan transaksi pertama Anda di Anvil lalu Sepolia.
date: 2026-10-12
slug: modul-4-ethereum-wallet-transaksi
tags: tutorial web 3
series: Tutorial Web 3
status: draft
---

Blockchain mini dari proyek sebelumnya sudah menolak transaksi palsu, saldo kurang, dan replay attack. Tapi ia hanya hidup di satu laptop. Tiga pertanyaan tersisa: bagaimana masuk ke blockchain publik sungguhan, bagaimana wallet menyimpan kunci dengan aman dan praktis, dan siapa yang membayar kerja ribuan node.

Kabar baiknya, hampir semua yang Anda bangun sudah ada di Ethereum dengan nama berbeda. Account nonce, tanda tangan, mempool, blok, validasi: semuanya ada. Modul ini mengenalkan apa yang baru.

## Apa yang kurang dari blockchain mini

| Di proyek sebelumnya | Masalahnya di dunia nyata |
| --- | --- |
| Private key dibuat ulang tiap program dijalankan | Pengguna butuh cara memulihkan kunci, bahkan jika laptopnya rusak |
| Satu kunci = satu alamat | Pengguna butuh banyak alamat tanpa menyimpan banyak kunci |
| Transaksi gratis | Tanpa biaya, penyerang bisa membanjiri jaringan dengan transaksi sampah |
| Transaksi hanya mengirim koin | Nanti transaksi juga menjalankan program, dan program yang berputar tanpa henti bisa melumpuhkan semua node |
| Hanya satu jaringan | Ada mainnet dan banyak testnet; transaksi satu jaringan tidak boleh berlaku di jaringan lain |

Ethereum menjawab ini sejak diluncurkan pada 2015 lewat konsep **gas**: setiap operasi komputasi punya harga, sehingga spam dan program tanpa akhir sama-sama tercegah.

Dua perbaikan penting menyusul. Pada 2016, setelah Ethereum terpecah jadi Ethereum dan Ethereum Classic, transaksi untuk satu jaringan bisa "diputar ulang" di jaringan lain. Solusinya, **chain ID** ikut ditandatangani (EIP-155). Ini replay attack yang sama seperti di proyek sebelumnya, tapi antarjaringan. Lalu pada 2021, **EIP-1559** mengganti sistem lelang harga gas yang membuat orang sering bayar kemahalan dengan **base fee** yang diatur protokol dan dibakar, plus **priority fee** untuk validator.

> Gas bukan detail kecil. Pada September 2020, sebuah transaksi membayar biaya lebih dari 10.000 ETH, setara jutaan dolar, untuk mengirim nilai yang kecil, karena kesalahan perangkat lunak yang mengatur harga gas. Transaksinya sudah masuk blok dan tidak bisa dibatalkan.

## Empat analogi

**Seed phrase = kunci induk gedung.** Dari satu kunci induk, tukang kunci bisa membuat kunci kamar 1, 2, dan seterusnya dengan pola pasti. Simpan kunci induknya, semua kunci kamar bisa dibuat ulang. Tapi siapa pun yang mencurinya bisa membuka *semua* kamar.

**Gas = argo taksi plus tarif jam sibuk.** Tiap kilometer ada biayanya, tarifnya naik saat jalanan ramai, dan Anda bisa memberi tip agar didahulukan. Kalau uang di dompet tidak cukup, taksi tidak berangkat.

**Account nonce = nomor urut cek.** Bank hanya mencairkan cek nomor 5 setelah nomor 4 cair, dan cek bernomor sama tidak bisa dicairkan dua kali.

**RPC provider = loket layanan.** Anda tidak perlu membangun kantor cabang sendiri untuk mengirim surat ke kantor pusat.

| Analogi | Konsep teknis |
| --- | --- |
| Kunci induk gedung | **Seed phrase** (12–24 kata, standar BIP-39) |
| Pola membuat kunci tiap kamar | **Derivation path**, misalnya `m/44'/60'/0'/0/0` |
| Argo per kilometer | **Gas** |
| Tarif dasar jam sibuk | **Base fee**, dibakar protokol |
| Tip ke sopir | **Priority fee**, diterima validator |
| Nomor urut cek | **Account nonce** |
| Loket layanan | **RPC provider** |
| Kode kota di nomor telepon | **Chain ID** |

## Dari seed phrase ke banyak alamat

```text
Entropi acak 128–256 bit
        |
        v
Seed phrase 12–24 kata  (BIP-39)
        |
        v
   Seed biner 512 bit
        |
        v
    Master key  (BIP-32)
        |
        +-- m/44'/60'/0'/0/0 --> Private key 0 --> Address 0
        +-- m/44'/60'/0'/0/1 --> Private key 1 --> Address 1
        +-- m/44'/60'/0'/0/2 --> Private key 2 --> Address 2
```

- **BIP-39** mengubah angka acak jadi kata dari daftar 2.048 kata baku, karena manusia lebih mudah menulis kata daripada heksadesimal panjang.
- **BIP-32** menurunkan pohon kunci tak terbatas dari satu seed, secara deterministik.
- **BIP-44** menetapkan jalur standar. Angka `60` adalah kode Ethereum; angka terakhir adalah nomor alamat.

Karena deterministik, seed phrase yang sama di wallet mana pun menghasilkan alamat yang sama.

## Anatomi transaksi Ethereum

| Field | Di proyek sebelumnya | Di Ethereum | Fungsi |
| --- | --- | --- | --- |
| from | Ada | Tidak ditulis, dipulihkan dari tanda tangan | Pengirim |
| to | Ada | Ada | Penerima, bisa EOA atau contract |
| amount | Ada | `value` (dalam wei) | Jumlah ETH |
| nonce | Ada | Ada | Nomor urut, mencegah replay |
| — | — | `chainId` | Mencegah replay antarjaringan |
| — | — | `gas` | Batas maksimal gas |
| — | — | `maxFeePerGas`, `maxPriorityFeePerGas` | Harga gas maksimal dan tip |
| — | — | `data` | Perintah untuk smart contract |
| signature | Ada | Ada (v, r, s) | Bukti persetujuan |

Ada dua jenis akun. **EOA** (Externally Owned Account) dikendalikan private key dan bisa memulai transaksi. **Contract account** dikendalikan kode, punya kode, dan hanya bereaksi saat dipanggil.

Satuannya tiga tingkat: **wei** (10⁻¹⁸ ETH, dipakai di dalam kode), **gwei** (10⁻⁹ ETH, dipakai untuk harga gas), dan **ether** (yang dilihat pengguna).

## Menghitung biaya gas

```text
biaya = gas terpakai × (base fee + priority fee)
```

Transfer ETH biasa selalu memakai **21.000 gas**. Kalau base fee 1 gwei dan priority fee 1 gwei, biayanya 21.000 × 2 = 42.000 gwei = 0,000042 ETH.

Empat hal yang perlu diingat:

- **Gas limit** adalah batas atas yang Anda izinkan. Gas yang tidak terpakai tidak ditagih.
- **maxFeePerGas** adalah harga maksimal yang rela Anda bayar. Kalau base fee lebih rendah, selisihnya tidak dipungut.
- **Base fee dibakar**, sehingga validator tidak bisa sengaja menaikkannya demi keuntungan sendiri.
- Kalau gas habis di tengah eksekusi, transaksi gagal dan perubahannya dibatalkan, tapi gas yang sudah terpakai **tetap ditagih**.

## Tiga jaringan

| Jaringan | Chain ID | Kegunaan | ETH-nya |
| --- | --- | --- | --- |
| Anvil (lokal) | 31337 | Development di laptop, instan dan gratis | Palsu, 10.000 ETH per akun |
| Sepolia (testnet) | 11155111 | Uji coba di jaringan publik | Gratis dari faucet, tidak bernilai |
| Ethereum Mainnet | 1 | Produksi | Uang sungguhan |

Alur kerja yang sehat selalu: **lokal → testnet → mainnet**.

## Praktik

Instal Foundry (berisi Anvil) dari [getfoundry.sh](https://getfoundry.sh). Untuk Windows, pakai WSL. Lalu:

```bash
mkdir web3-modul-4 && cd web3-modul-4
npm init -y
npm pkg set type=module
npm install viem
```

Di terminal terpisah, jalankan `anvil`. Ia menampilkan 10 akun berisi 10.000 ETH palsu beserta seed phrase-nya.

> **Aturan keamanan:** seed phrase `test test ... junk` di latihan ini adalah seed phrase **publik** milik alat development. Semua orang di dunia tahu kuncinya. Jangan pernah kirim aset sungguhan ke alamat-alamat itu.

### Latihan 1: Satu seed phrase, banyak alamat

```javascript
import { english, generateMnemonic, mnemonicToAccount } from 'viem/accounts';

// Seed phrase contoh resmi milik Anvil/Hardhat. JANGAN dipakai untuk aset sungguhan.
const mnemonic = 'test test test test test test test test test test test junk';
for (let i = 0; i < 3; i++) {
  const akun = mnemonicToAccount(mnemonic, { addressIndex: i });
  console.log(`m/44'/60'/0'/0/${i} ->`, akun.address);
}
```

```text
m/44'/60'/0'/0/0 -> 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
m/44'/60'/0'/0/1 -> 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
m/44'/60'/0'/0/2 -> 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
```

Bandingkan dengan daftar akun yang ditampilkan Anvil. Sama persis, dan itulah bukti penurunan deterministik.

### Latihan 2: Mengirim ETH dan menghitung biaya

```javascript
import { createPublicClient, createWalletClient, http, parseEther, formatEther, formatGwei } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';

const mnemonic = 'test test test test test test test test test test test junk';
const budi = mnemonicToAccount(mnemonic, { addressIndex: 0 });
const sari = mnemonicToAccount(mnemonic, { addressIndex: 1 });

// publicClient untuk MEMBACA, walletClient untuk MENANDATANGANI dan MENGIRIM
const publicClient = createPublicClient({ chain: foundry, transport: http() });
const walletClient = createWalletClient({ account: budi, chain: foundry, transport: http() });

const saldo = async (a) => formatEther(await publicClient.getBalance({ address: a.address }));
console.log('Chain ID           :', await publicClient.getChainId());
console.log('Saldo awal  Budi   :', await saldo(budi), 'ETH | Sari:', await saldo(sari), 'ETH');
console.log('Nonce Budi         :', await publicClient.getTransactionCount({ address: budi.address }));

const hash = await walletClient.sendTransaction({ to: sari.address, value: parseEther('1.5') });
const r = await publicClient.waitForTransactionReceipt({ hash });
const biaya = r.gasUsed * r.effectiveGasPrice;

console.log('Status             :', r.status, '| blok', r.blockNumber);
console.log('Gas terpakai       :', r.gasUsed, 'unit x', formatGwei(r.effectiveGasPrice), 'gwei');
console.log('Biaya transaksi    :', formatEther(biaya), 'ETH');
console.log('Saldo akhir Budi   :', await saldo(budi), 'ETH | Sari:', await saldo(sari), 'ETH');
console.log('Nonce Budi         :', await publicClient.getTransactionCount({ address: budi.address }));
```

Nilai di viem bertipe `bigint`, ditandai huruf `n`, misalnya `21000n`. Pakai `formatEther` dan `formatGwei` untuk menampilkannya.

```text
Chain ID           : 31337
Saldo awal  Budi   : 10000 ETH | Sari: 10000 ETH
Nonce Budi         : 0
Status             : success | blok 1n
Gas terpakai       : 21000n unit x 2 gwei
Biaya transaksi    : 0.000042 ETH
Saldo akhir Budi   : 9998.499958 ETH | Sari: 10001.5 ETH
Nonce Budi         : 1
```

Perhatikan: Budi berkurang 1,500042 ETH sementara Sari hanya bertambah 1,5 ETH. Selisihnya biaya gas. Nonce Budi naik dari 0 ke 1, persis seperti di proyek sebelumnya.

Coba juga: buat akun baru bersaldo nol dengan `privateKeyToAccount(generatePrivateKey())`, lalu kirim 1 ETH. Anda akan melihat penolakan karena total biaya melebihi saldo.

### Latihan 3: Transaksi pertama di Sepolia

Sekarang ke jaringan publik:

1. Instal MetaMask dari situs resmi [metamask.io](https://metamask.io), dan pastikan alamat situsnya benar.
2. Buat wallet **baru khusus belajar**. Tulis seed phrase di kertas, bukan catatan digital.
3. Di pengaturan jaringan, tampilkan jaringan uji lalu pilih **Sepolia**.
4. Ambil ETH testnet dari faucet Sepolia (Alchemy atau Google Cloud; cari yang masih aktif).
5. Buat akun kedua dari seed phrase yang sama, lalu kirim 0,01 SepoliaETH dari akun 1 ke akun 2.
6. Buka transaksinya di [sepolia.etherscan.io](https://sepolia.etherscan.io) dan catat: transaction hash, nonce, gas limit dan gas used, base fee, max fee, priority fee, burnt fees, dan total biaya.

Yang akan Anda lihat: gas used transfer biasa selalu 21.000, meski gas limit yang diisi MetaMask bisa sedikit lebih besar. **Burnt fees** = gas used × base fee, hilang dari peredaran. **Priority fee** diterima validator pengusul blok.

Untuk membaca saldo Sepolia dari kode:

```javascript
import { createPublicClient, http, formatEther } from 'viem';
import { sepolia } from 'viem/chains';

const client = createPublicClient({ chain: sepolia, transport: http(process.env.SEPOLIA_RPC_URL) });
const saldo = await client.getBalance({ address: '0xALAMAT_METAMASK_ANDA' });
console.log(formatEther(saldo), 'SepoliaETH');
```

Simpan URL RPC di environment variable, karena URL itu berisi API key Anda.

## Yang perlu diwaspadai

1. **Seed phrase adalah titik kegagalan tunggal.** Hilang berarti semua alamat hilang; bocor berarti semua alamat dikuras.
2. **Gas bisa mahal saat ramai**, terutama di Layer 1.
3. **Transaksi gagal tetap bayar gas.**
4. **Salah jaringan atau salah alamat** bisa membuat aset tidak bisa diakses. Alamat Ethereum terlihat sama di banyak jaringan yang kompatibel.
5. **Ketergantungan pada RPC provider.** Sentralisasi tersembunyi yang sudah disinggung di modul pertama.

Modus penipuan paling umum di Web3 bukan meretas kriptografi, tapi menipu orang agar mengetik seed phrase-nya: situs palsu yang meniru wallet, akun "customer support" palsu, aplikasi palsu di toko aplikasi. **Tidak ada layanan resmi yang pernah meminta seed phrase Anda.**

Dan tiga aturan untuk development: jangan belajar di mainnet, jangan pakai wallet utama untuk development, dan jangan menaruh private key di kode atau repository Git.

## Rangkuman

- Konsep proyek sebelumnya ada semua di Ethereum. Yang baru: **chain ID**, **gas**, dan field **data**.
- **Seed phrase** menurunkan banyak kunci secara deterministik. Sangat praktis, sekaligus titik kegagalan tunggal.
- Dua jenis akun: **EOA** (private key) dan **contract account** (kode).
- **Biaya = gas terpakai × (base fee + priority fee)**. Base fee dibakar, priority fee untuk validator.
- Alur kerja sehat: Anvil → Sepolia → mainnet.

## Masalah terbuka

Sejauh ini transaksi hanya bisa memindahkan ETH. Bayangkan arisan RT 05: tiap bulan semua anggota setor, lalu satu anggota yang namanya keluar menerima seluruh uang. Saat ini aturan itu hanya bisa dijalankan bendahara manusia yang memegang uang semua orang. Kita kembali ke masalah Bu Bendahara.

Bagaimana kalau aturan arisan itu sendiri ditulis sebagai program yang hidup di blockchain, memegang uang, dan menjalankan aturannya otomatis tanpa bisa dicurangi siapa pun, termasuk pembuatnya?

Itulah modul berikutnya, dan di sanalah field `data` serta contract account dibahas tuntas.
