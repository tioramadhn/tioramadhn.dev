---
title: "Modul 2: Hash, Pasangan Kunci, dan Tanda Tangan Digital"
description: Bagaimana membuktikan sebuah transaksi benar-benar Anda yang menyetujui, tanpa pernah membocorkan rahasia Anda, dan tanpa satu pun admin yang memeriksanya.
date: 2026-10-09
slug: modul-2-kriptografi-dasar
tags: tutorial web 3
series: Tutorial Web 3
status: draft
---

Modul sebelumnya berhenti di satu masalah: di Web3 tidak ada admin, tidak ada email verifikasi, tidak ada tombol "lupa password". Jadi ada dua hal yang harus dibuktikan tanpa bantuan siapa pun:

1. **Bukti identitas.** Bagaimana membuktikan bahwa *Anda* yang menyetujui sebuah transaksi, tanpa memperlihatkan rahasia Anda?
2. **Bukti keutuhan.** Bagaimana semua orang tahu isi transaksi tidak diubah di tengah jalan?

Jawabannya tiga alat: **hash**, **pasangan kunci publik/privat**, dan **tanda tangan digital**. Ketiganya adalah fondasi semua yang dibangun di modul-modul berikutnya.

## Kenapa password tidak bisa dipakai

Di Web 2, identitas dibuktikan dengan *shared secret*: password. Anda membuatnya, server menyimpannya, dan setiap login Anda mengirimkannya untuk dicocokkan. Kelemahannya:

1. **Rahasia harus dikirim.** Untuk membuktikan Anda tahu password, Anda harus menyerahkannya.
2. **Rahasia harus disimpan pihak lain.** Satu server menyimpan rahasia jutaan orang. Satu kebocoran, jutaan akun terancam.
3. **Hanya satu pemeriksa.** Orang lain tidak bisa ikut memverifikasi tanpa ikut tahu rahasianya.
4. **Tidak ada bukti keutuhan pesan.** Password membuktikan siapa yang login, bukan bahwa isi permintaannya tidak diubah.

Untuk blockchain, nomor 3 fatal. Ada **ribuan node** yang harus memeriksa transaksi Anda. Kalau caranya password, rahasia Anda harus dibagikan ke ribuan komputer asing.

> Yang dibutuhkan: cara membuktikan "saya tahu rahasianya" **tanpa pernah membocorkan rahasia itu**, dan cara itu harus bisa dicek **siapa saja**.

Pelajaran konkretnya ada pada kebocoran LinkedIn 2012: jutaan hash password bocor, di-hash dengan SHA-1 tanpa *salt*, sehingga penyerang bisa menebak banyak password umum dengan cepat. Dua pelajarannya: hash itu alat kuat tapi harus dipakai benar, dan model "server menyimpan rahasia semua orang" selalu jadi target empuk. Web3 menghindari model itu sepenuhnya.

## Tiga analogi

**Hash = sidik jari.** Dari sidik jari Anda bisa mengecek "apakah ini orang yang sama?", tapi tidak bisa merekonstruksi wajahnya. Ada perubahan sedikit, sidik jarinya berubah.

**Kunci publik/privat = kotak surat bergembok.** Alamat kotak surat boleh diketahui semua orang; siapa pun bisa memasukkan surat. Hanya Anda yang memegang anak kuncinya.

**Tanda tangan digital = stempel ajaib.** Stempel pribadi yang tidak bisa ditiru, dan hasil capnya *berbeda untuk setiap isi surat*. Siapa pun yang punya "kaca pembesar" Anda bisa mengecek: apakah cap ini dari stempel Anda, *dan* untuk isi surat ini? Ubah satu huruf, cap lama langsung tidak cocok.

| Analogi | Konsep teknis | Dipakai untuk |
| --- | --- | --- |
| Sidik jari | **Hash** | Mengecek keutuhan data, mengidentifikasi transaksi dan blok |
| Anak kunci kotak surat | **Private key** | Membuat tanda tangan. Tidak pernah dibagikan. |
| Kotak surat yang terlihat publik | **Public key** dan **address** | Diberikan ke orang lain, dipakai memverifikasi |
| Cap stempel di sebuah surat | **Digital signature** | Bukti pemilik kunci menyetujui pesan tertentu |
| Kaca pembesar pemeriksa | **Verifikasi** | Dilakukan siapa saja, termasuk ribuan node |

Analogi stempel punya batas penting: stempel fisik yang dicuri masih bisa dilaporkan ke polisi. Kunci privat yang dicuri berarti pencuri **sepenuhnya menjadi Anda** di mata blockchain, dan tidak ada yang bisa membatalkannya.

## Lima sifat fungsi hash

| Sifat | Artinya |
| --- | --- |
| Deterministic | Input sama selalu menghasilkan hash sama, di komputer mana pun |
| Fixed size | Panjang keluaran selalu sama: hash satu huruf dan hash satu film sama-sama 256 bit |
| One-way | Tidak bisa dikembalikan menjadi data asli |
| Avalanche effect | Perubahan kecil pada input mengubah hash secara total |
| Collision resistant | Praktis mustahil menemukan dua input berbeda dengan hash sama |

Ethereum memakai **Keccak-256**, Bitcoin banyak memakai **SHA-256**. Keduanya menghasilkan 256 bit. Keccak-256 adalah versi awal dari algoritma yang kemudian distandardisasi jadi SHA-3, dengan sedikit perbedaan teknis, jadi hasilnya tidak sama persis dengan SHA3-256 standar.

## Dari kunci privat ke alamat wallet

```text
Angka acak 256 bit
        |
        v
   Private key
        |  perkalian kurva eliptik (satu arah)
        v
   Public key
        |  Keccak-256, ambil 20 byte terakhir
        v
   Address  0x6e4d...c480
```

1. **Private key** adalah angka acak 256 bit. Itu satu-satunya rahasia Anda.
2. **Public key** dihitung darinya lewat operasi pada kurva eliptik secp256k1. Arahnya satu: mudah dari privat ke publik, praktis mustahil sebaliknya.
3. **Address** adalah 20 byte terakhir dari hash Keccak-256 kunci publik, ditulis berawalan `0x`.

Jadi alamat wallet bukan "nama akun" yang didaftarkan ke server mana pun, melainkan *dihitung* dari kunci Anda. Siapa pun bisa membuat alamat baru kapan saja, tanpa izin, bahkan tanpa internet.

Berapa sulit menebaknya? Kunci privat Ethereum adalah angka 256 bit, sekitar 10⁷⁷ kemungkinan, mendekati perkiraan jumlah atom di alam semesta teramati.

## Alur tanda tangan digital

**Menandatangani** (oleh pemilik kunci):

1. Pesan di-hash dulu, supaya pesan sepanjang apa pun jadi ukuran tetap.
2. Hash itu "dicap" dengan private key memakai ECDSA, menghasilkan *signature*.

**Memverifikasi** (oleh siapa saja):

1. Pemeriksa menghitung ulang hash dari pesan yang diterima.
2. Dari signature dan hash, pemeriksa memulihkan address penandatangan.
3. Kalau address hasil pemulihan sama dengan address yang mengaku mengirim, tanda tangan **sah**.

Karena langkah 1 memakai hash, mengubah satu karakter pesan mengubah hash, sehingga address yang dipulihkan berbeda dan verifikasi gagal. Dua masalah di awal terjawab sekaligus: identitas terbukti, dan keutuhan terbukti.

## Praktik

Siapkan proyeknya:

```bash
mkdir web3-modul-2 && cd web3-modul-2
npm init -y
npm pkg set type=module
npm install viem
```

> **Aturan keamanan:** kunci privat di latihan ini hanya untuk belajar. Jangan kirim aset sungguhan ke alamatnya, dan jangan pernah menempelkan kunci privat wallet asli ke kode atau situs mana pun.

### Latihan 1: Membuktikan sifat hash

Buat `hash.js`:

```javascript
import { createHash } from 'node:crypto';

const sha256 = (teks) => createHash('sha256').update(teks).digest('hex');

const daftar = ['halo', 'Halo', 'halo!', 'Arisan RT 05: Pak Budi setor Rp100.000'];
for (const teks of daftar) {
  console.log(JSON.stringify(teks).padEnd(42), sha256(teks));
}
```

Jalankan `node hash.js`. Hasilnya harus sama persis dengan ini, dan itulah bukti sifat deterministik:

```text
"halo"    a4e63bcacf6c172ad84f9f4523c8f1acaf33676fa76d3258c67b7e7bbf16d777
"Halo"    4e86512d9a0af8a743d42a1a0f3eaee0945790ddb79c8db14309337c1235b2e4
"halo!"   4e97e674b7166de709fa8a59026cfb6d7ca882789ce5b9a551f2bd398f86e774
```

Perhatikan: panjang semua hash sama meski panjang inputnya berbeda (*fixed size*), dan `halo` versus `Halo` tidak mirip sama sekali (*avalanche effect*). Coba ubah `Rp100.000` jadi `Rp100.001` dan lihat hasilnya.

### Latihan 2: Membuat kunci dan tanda tangan

Buat `sign.js`:

```javascript
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { verifyMessage, recoverMessageAddress } from 'viem';

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);
console.log('Address     :', account.address);

const message = 'Saya, pemilik alamat ini, menyetor Rp100.000 ke arisan';
const signature = await account.signMessage({ message });

// Verifikasi pesan asli
console.log('Valid?      :', await verifyMessage({ address: account.address, message, signature }));

// Verifikasi pesan yang diubah
const palsu = message.replace('100.000', '900.000');
console.log('Pesan diubah:', await verifyMessage({ address: account.address, message: palsu, signature }));

// Pulihkan address dari pesan + signature saja
console.log('Recovered   :', await recoverMessageAddress({ message, signature }));
```

Keluarannya (address dan signature Anda pasti berbeda karena dibuat acak):

```text
Address     : 0x6e4d33405cb0ff25AF9FF171E9a2909DA45Ec480
Valid?      : true
Pesan diubah: false
Recovered   : 0x6e4d33405cb0ff25AF9FF171E9a2909DA45Ec480
```

Perhatikan baris terakhir: dari pesan dan signature saja, siapa pun bisa mengetahui address penandatangan, tanpa pernah melihat private key.

### Latihan 3: Bendahara arisan anti-curang

Sekarang Anda jadi "node" yang memeriksa daftar setoran. Buat tiga anggota, minta masing-masing menandatangani setorannya, lalu simulasikan dua serangan: **A**, seseorang mengubah pesan Sari tanpa tanda tangan baru; **B**, Joko membuat setoran atas nama Budi tapi ditandatangani kuncinya sendiri.

```javascript
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { verifyMessage } from 'viem';

const budi = privateKeyToAccount(generatePrivateKey());
const sari = privateKeyToAccount(generatePrivateKey());
const joko = privateKeyToAccount(generatePrivateKey());

const setoran = [];
for (const [nama, akun, jumlah] of [['Budi', budi, 100000], ['Sari', sari, 100000], ['Joko', joko, 100000]]) {
  const pesan = `${nama} setor Rp${jumlah}`;
  setoran.push({ nama, alamat: akun.address, pesan, signature: await akun.signMessage({ message: pesan }) });
}

// Serangan A: mengubah jumlah setoran Sari tanpa tanda tangan baru
setoran[1].pesan = 'Sari setor Rp500000';

// Serangan B: Joko mengaku setoran atas nama Budi, memakai tanda tangannya sendiri
setoran.push({
  nama: 'Budi',
  alamat: budi.address,
  pesan: 'Budi setor Rp1000000',
  signature: await joko.signMessage({ message: 'Budi setor Rp1000000' }),
});

for (const s of setoran) {
  const sah = await verifyMessage({ address: s.alamat, message: s.pesan, signature: s.signature });
  console.log(`${sah ? '✅ SAH  ' : '❌ PALSU'} | ${s.pesan}`);
}
```

Hasilnya:

```text
✅ SAH   | Budi setor Rp100000
❌ PALSU | Sari setor Rp500000
✅ SAH   | Joko setor Rp100000
❌ PALSU | Budi setor Rp1000000
```

Serangan A gagal karena hash pesan berubah sehingga tanda tangan lama tidak cocok. Serangan B gagal karena address yang dipulihkan dari signature adalah milik Joko, bukan Budi.

## Yang sering gagal bukan matematikanya

Matematikanya nyaris sempurna. Yang gagal biasanya manusianya:

1. **Kunci hilang = aset hilang selamanya.** Tidak ada pemulihan.
2. **Kunci dicuri = identitas dicuri sepenuhnya.** Blockchain tidak bisa membedakan Anda dari pencurinya.
3. **Menandatangani tanpa membaca.** Banyak penipuan Web3 terjadi karena korban menyetujui tanda tangan yang isinya tidak ia pahami. Kriptografi menjamin tanda tangan sah, bukan menjamin keputusan Anda bijak.
4. **Salah pakai algoritma.** Jangan pakai SHA-256 biasa untuk menyimpan password. Pakai bcrypt atau Argon2 yang sengaja lambat dan memakai salt. Dan jangan membuat kriptografi sendiri.
5. **Angka acak yang lemah.** Generator yang bisa ditebak membuat kunci bisa ditebak.
6. **Ancaman masa depan.** Komputer kuantum skala besar secara teori bisa memecahkan ECDSA. Belum jadi ancaman praktis, tapi algoritma post-quantum sudah disiapkan.

Satu hal yang sering disalahpahami: hash dan tanda tangan **tidak menyembunyikan** isi pesan. Untuk kerahasiaan, yang dibutuhkan adalah enkripsi, dan itu hal yang berbeda.

## Rangkuman

- **Hash** adalah sidik jari data: ukuran tetap, satu arah, deterministik, berubah total walau input berubah sedikit.
- **Private key** adalah angka acak 256 bit, satu-satunya rahasia Anda. **Public key** dihitung darinya satu arah, dan **address** diturunkan dari hash public key.
- **Tanda tangan digital** membuktikan dua hal sekaligus: siapa yang menyetujui, dan bahwa pesannya tidak diubah. Verifikasi bisa dilakukan siapa saja tanpa tahu private key.
- Dengan ini, masalah "membuktikan kepemilikan tanpa admin dan tanpa password" terjawab.

## Masalah terbuka

Sekarang setiap node bisa memastikan sebuah transaksi benar-benar ditandatangani pemiliknya dan tidak diubah. Tapi bayangkan ini:

Budi hanya punya Rp100.000. Pada detik yang sama, ia menandatangani **dua** transaksi yang sama-sama sah: "kirim Rp100.000 ke Sari" dan "kirim Rp100.000 ke Joko". Kedua tanda tangan itu *asli*. Sebagian node menerima transaksi ke Sari lebih dulu, sebagian menerima yang ke Joko lebih dulu.

Transaksi mana yang berlaku? Siapa yang memutuskan urutannya kalau tidak ada pemimpin? Dan bagaimana mencegah seseorang menulis ulang catatan lama setelah semua sepakat?

Masalah ini namanya **double spending**. Jawabannya ada di modul berikutnya: blockchain dan mekanisme konsensus.
