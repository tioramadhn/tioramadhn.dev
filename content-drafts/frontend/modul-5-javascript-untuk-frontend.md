---
title: 'Modul 5: JavaScript untuk Frontend'
description: Bagian JavaScript yang benar-benar dipakai setiap hari, plus satu hal yang paling sering salah dipahami: kenapa satu koki di dapur bisa melayani dua puluh pesanan tanpa menunggu.
date: 2026-11-12
slug: modul-5-javascript-untuk-frontend
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Modul sebelumnya ditutup dengan dua keluhan tentang kode Anda sendiri: pola "siapkan penampung, telusuri daftar, tambahkan" butuh lima baris setiap kali, dan belum ada cara menangani data yang berlubang maupun pekerjaan yang butuh waktu.

Modul ini menutup ketiganya. Isinya bukan bahasa dari awal lagi, melainkan bagian JavaScript yang benar-benar dipakai frontend setiap hari: cara menulis lima baris itu jadi satu, cara membaca data yang tidak lengkap tanpa meledak, dan cara meminta sesuatu dari server tanpa membuat halaman berhenti bekerja.

Posisi JavaScript sendiri istimewa: sampai hari ini, hanya JavaScript yang dijalankan browser secara bawaan. Bahasa lain, termasuk TypeScript yang Anda pelajari di modul 8, ujungnya diterjemahkan jadi JavaScript.

Empat pekerjaan yang akan Anda minta darinya, hampir setiap hari:

| Pekerjaan | Contoh nyata |
| --- | --- |
| Menanggapi perbuatan pengguna | Klik, ketikan, gulir, kirim form |
| Mengambil dan mengirim data | Memuat daftar produk, menyimpan pesanan |
| Mengolah data jadi bentuk yang siap tampil | Menyaring, mengurutkan, menjumlahkan, memformat rupiah |
| Mengurus waktu | Menunda pencarian sampai pengguna berhenti mengetik, membatalkan permintaan yang sudah tidak relevan |

Modul ini hanya membahas bagian bahasanya. Cara mengubah halaman dengan hasil olahan itu ada di modul 6.

## Masalahnya dulu: bahasa besar, yang dipakai sedikit

JavaScript punya tiga puluh tahun tumpukan sejarah. Di dalamnya ada cara lama dan cara baru untuk hal yang sama, plus beberapa bagian yang sebaiknya dilewati sampai Anda benar-benar membutuhkannya.

Masalah pemula bukan kekurangan materi, tapi kebanjiran. Tutorial membahas `prototype`, `class`, generator, dan tujuh cara mendeklarasikan fungsi, padahal pekerjaan sehari-hari di frontend modern berputar di sekitar daftar yang jauh lebih pendek.

Yang dipakai hampir setiap hari, dengan empat baris pertama sudah dibereskan di Modul 4:

- `const` dan `let`, tidak pernah `var`
- Fungsi, dan di modul ini bentuk singkatnya: arrow function
- Objek dan array, beserta destructuring dan spread
- `map`, `filter`, `reduce`, `find`, `some`, `sort`
- Template literal
- `async`/`await` dan `fetch`
- Modul: `import` dan `export`
- Optional chaining `?.` dan nullish coalescing `??`

Yang bisa menunggu sampai Anda benar-benar butuh: `class` dan pewarisan, `prototype`, `this` dengan segala keanehannya, generator, `Proxy`, dan decorator. Daftar itu bukan tidak penting, hanya tidak mendesak. Banyak engineer frontend produktif bertahun-tahun tanpa menulis satu `class` pun.

## Analogi: dapur dengan satu koki

Bagian JavaScript yang paling sering salah dipahami adalah sifatnya yang **single-threaded**: hanya ada satu jalur eksekusi, tapi tetap bisa melayani banyak pekerjaan sekaligus. Analoginya warung dengan satu koki.

Koki itu mengerjakan satu hal pada satu waktu. Begitu ada pesanan nasi goreng, dia memasaknya sampai selesai. Selama itu, pesanan lain menunggu. Ini **call stack**, dan di sinilah sumber halaman yang terasa macet: kalau Anda menyuruh koki mengupas sepuluh kilo kentang, dua puluh pelanggan berikutnya menunggu, termasuk yang hanya ingin memesan air putih.

Tapi ada pekerjaan yang tidak dikerjakan koki sendiri. Kalau es habis, dia menitipkan pesanan ke anak warung yang pergi ke pasar, lalu lanjut memasak pesanan berikutnya. Saat anak warung kembali, catatannya ditaruh di nampan, dan koki mengambilnya begitu tangannya kosong. Pergi ke pasar adalah pekerjaan asinkron, yaitu permintaan jaringan, timer, dan pembacaan file.

Satu aturan lagi yang membedakan nampan. Catatan "pesanan sudah siap" dari promise ditaruh di nampan prioritas yang selalu diperiksa lebih dulu (microtask), sementara catatan dari `setTimeout` ditaruh di nampan biasa (macrotask).

| Dunia warung | Dunia JavaScript |
| --- | --- |
| Koki tunggal | Main thread |
| Pekerjaan yang sedang dipegang | Call stack |
| Anak warung yang ke pasar | Pekerjaan asinkron: `fetch`, timer |
| Nampan prioritas | Microtask queue, tempat promise |
| Nampan biasa | Macrotask queue, tempat `setTimeout` |
| Aturan "ambil pekerjaan berikutnya saat tangan kosong" | Event loop |
| Mengupas sepuluh kilo kentang | Perhitungan berat yang memblokir UI |

Batas analoginya: anak warung di dunia nyata bisa dua orang, sedangkan `fetch` di browser memang paralel tetapi penanganan hasilnya tetap satu per satu oleh koki yang sama. Jadi paralel di jaringan, serial di pemrosesan.

## Nilai, salinan, dan rujukan

Satu kesalahpahaman yang menghasilkan bug paling membingungkan: primitif disalin, objek dirujuk.

```js
let a = 5;
let b = a;
b = 10;
console.log(a); // 5, karena angka disalin

const user = { nama: 'Tio' };
const salinan = user;
salinan.nama = 'Anggi';
console.log(user.nama); // 'Anggi', karena objek hanya dirujuk
```

`const` tidak membuat objeknya tidak bisa diubah. Yang tidak bisa diubah hanya rujukannya:

```js
const konfigurasi = { tema: 'gelap' };
konfigurasi.tema = 'terang'; // Boleh
konfigurasi = {}; // TypeError
```

Cara membuat salinan baru, yang akan jadi kebiasaan wajib begitu Anda masuk React:

```js
const user = { nama: 'Tio', kota: 'Jakarta' };

// Objek baru dengan satu field diubah
const diperbarui = { ...user, kota: 'Bandung' };

// Array baru, tanpa mengubah yang asli
const angka = [3, 1, 2];
const terurut = [...angka].sort((x, y) => x - y);
```

Baris terakhir itu penting: `sort`, `reverse`, `push`, dan `splice` mengubah array aslinya. Dalam React, mengubah data aslinya adalah penyebab umum tampilan yang tidak ikut berubah.

## Fungsi, scope, dan closure

```js
// Deklarasi fungsi
function hitungTotal(harga, pajak) {
  return harga + harga * pajak;
}

// Arrow function, yang paling sering dipakai
const hitungTotalPajak = (harga, pajak = 0.11) => harga + harga * pajak;

// Nilai bawaan, destructuring parameter, dan rest
const buatLabel = ({ nama, kota = 'Jakarta' }, ...tag) =>
  `${nama} dari ${kota} ${tag.join(', ')}`;
```

**Closure** adalah kemampuan fungsi mengingat variabel di tempat dia dibuat, dan ini bukan trik akademis. Setiap kali Anda menulis event handler atau `setTimeout`, Anda memakainya.

```js
function pembuatPenghitung() {
  let jumlah = 0;
  return () => {
    jumlah += 1;
    return jumlah;
  };
}

const naikkan = pembuatPenghitung();
naikkan(); // 1
naikkan(); // 2
```

Variabel `jumlah` tidak bisa disentuh dari luar, tapi tetap hidup selama fungsi yang mengingatnya masih ada. Pola yang sama muncul di custom hook pada modul 10.

## Mengolah data: lima method yang menutup sebagian besar kebutuhan

Data dari server hampir selalu array objek, dan pekerjaan Anda adalah mengubahnya jadi bentuk yang siap tampil.

```js
const pesanan = [
  { id: 1, menu: 'Kopi susu', jumlah: 2, harga: 22000, status: 'selesai' },
  { id: 2, menu: 'Americano', jumlah: 1, harga: 18000, status: 'diproses' },
  { id: 3, menu: 'Kopi susu', jumlah: 3, harga: 22000, status: 'selesai' },
];

// map: ubah setiap item, panjang array tetap
const ringkas = pesanan.map((p) => ({ ...p, total: p.jumlah * p.harga }));

// filter: ambil sebagian
const selesai = pesanan.filter((p) => p.status === 'selesai');

// find: ambil satu, atau undefined
const satu = pesanan.find((p) => p.id === 2);

// reduce: ringkas jadi satu nilai
const pendapatan = pesanan.reduce((jumlah, p) => jumlah + p.jumlah * p.harga, 0);

// some dan every: pertanyaan ya atau tidak
const adaYangTertunda = pesanan.some((p) => p.status === 'diproses');
```

Dua hal yang membedakan kode rapi dan kode yang sulit dibaca:

Pertama, rantaikan dengan sadar. `filter` lalu `map` lebih mudah dibaca daripada satu `reduce` yang mengerjakan tiga hal.

Kedua, format angka memakai API bawaan, jangan ditulis tangan:

```js
const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(66000); // "Rp66.000"

const tanggal = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'long',
}).format(new Date('2026-11-10')); // "10 November 2026"
```

## Mengakses data yang mungkin tidak ada

Respons API nyata penuh lubang. Dua operator ini menghemat banyak baris pemeriksaan:

```js
const data = { user: { profil: { kota: null } } };

// Tanpa optional chaining: error kalau profil tidak ada
const kota1 = data.user.profil.kota;

// Dengan optional chaining: undefined, tanpa error
const kota2 = data.user?.profil?.kota;

// Nilai pengganti hanya saat null atau undefined
const kota3 = data.user?.profil?.kota ?? 'Tidak diisi';

// Beda penting: || juga mengganti nilai yang "falsy"
const jumlah = 0;
console.log(jumlah || 10); // 10, biasanya bukan yang Anda maksud
console.log(jumlah ?? 10); // 0, ini yang benar
```

Perbedaan `||` dan `??` itu sumber bug yang nyata: harga nol, jumlah nol, dan string kosong adalah nilai sah yang tidak boleh diganti nilai bawaan.

## Asinkron: dari janji ke `await`

Permintaan jaringan butuh waktu, dan kode Anda tidak boleh berhenti menunggunya. Cara modern menulisnya:

```js
async function ambilPesanan(idToko) {
  const respons = await fetch(`/api/toko/${idToko}/pesanan`);

  // Penting: fetch tidak melempar error untuk 404 atau 500
  if (!respons.ok) {
    throw new Error(`Gagal memuat pesanan: ${respons.status}`);
  }

  return respons.json();
}

async function tampilkan() {
  try {
    const pesanan = await ambilPesanan('toko-01');
    console.log(pesanan.length);
  } catch (error) {
    console.error('Tidak bisa memuat data', error);
  }
}
```

Baris `if (!respons.ok)` adalah kesalahan nomor satu pemula dalam memakai `fetch`. Tanpa baris itu, respons "404 halaman tidak ditemukan" masuk ke blok sukses, lalu meledak beberapa baris kemudian di tempat yang menyesatkan.

Tiga pola yang akan sering Anda butuhkan:

```js
// Jalan bersamaan, bukan berurutan. Dua kali lebih cepat.
const [profil, pesanan] = await Promise.all([
  ambilProfil(id),
  ambilPesanan(id),
]);

// Tidak gagal semuanya hanya karena satu gagal
const hasil = await Promise.allSettled([ambilProfil(id), ambilPesanan(id)]);

// Membatalkan permintaan yang sudah tidak relevan
const kendali = new AbortController();
const data = fetch('/api/cari?q=kopi', { signal: kendali.signal });
kendali.abort(); // Misalnya karena pengguna mengetik lagi
```

`AbortController` akan kembali di modul 12 sebagai jawaban untuk masalah pencarian yang hasilnya datang tidak berurutan.

## Modul: satu file satu tanggung jawab

```js
// src/lib/format.js
export function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(angka);
}

export const PAJAK = 0.11;
```

```js
// src/main.js
import { formatRupiah, PAJAK } from './lib/format.js';

console.log(formatRupiah(100000 * (1 + PAJAK)));
```

Modul punya dua sifat yang membedakannya dari script biasa: nama di dalamnya tidak bocor ke lingkup global, dan setiap file hanya dievaluasi sekali meski diimpor dari sepuluh tempat. Sifat kedua itu yang memungkinkan tooling di modul 7 membuang kode yang tidak dipakai.

## Latihan

### Latihan 1: Ringkasan penjualan

Dari data berikut, hasilkan satu objek ringkasan: total pendapatan dari pesanan berstatus `selesai`, jumlah item terjual per menu, dan menu terlaris. Hasilnya diformat rupiah.

```js
const pesanan = [
  { id: 1, menu: 'Kopi susu', jumlah: 2, harga: 22000, status: 'selesai' },
  { id: 2, menu: 'Americano', jumlah: 1, harga: 18000, status: 'diproses' },
  { id: 3, menu: 'Kopi susu', jumlah: 3, harga: 22000, status: 'selesai' },
  { id: 4, menu: 'Matcha', jumlah: 2, harga: 25000, status: 'selesai' },
  { id: 5, menu: 'Americano', jumlah: 4, harga: 18000, status: 'batal' },
];

// Target:
// {
//   pendapatan: 'Rp160.000',
//   perMenu: { 'Kopi susu': 5, Matcha: 2 },
//   terlaris: 'Kopi susu',
// }
```

> [!petunjuk]
> Saring dulu, baru hitung. Untuk `perMenu`, `reduce` dengan objek sebagai nilai awal lebih jelas daripada `forEach` yang mengubah variabel di luar. Untuk menu terlaris, `Object.entries` mengubah objek jadi array yang bisa diurutkan.

> [!jawaban]
>
> ```js
> const selesai = pesanan.filter((p) => p.status === 'selesai');
>
> const pendapatan = selesai.reduce((total, p) => total + p.jumlah * p.harga, 0);
>
> const perMenu = selesai.reduce((akumulasi, p) => {
>   return { ...akumulasi, [p.menu]: (akumulasi[p.menu] ?? 0) + p.jumlah };
> }, {});
>
> const [terlaris] = Object.entries(perMenu).sort((a, b) => b[1] - a[1])[0];
>
> const ringkasan = {
>   pendapatan: formatRupiah(pendapatan),
>   perMenu,
>   terlaris,
> };
> ```
>
> Tiga keputusan di dalamnya:
>
> 1. `filter` lebih dulu, supaya tiga perhitungan berikutnya tidak perlu mengulang pemeriksaan status.
> 2. `(akumulasi[p.menu] ?? 0)` memakai `??`, bukan `||`. Di sini keduanya kebetulan sama, tapi kebiasaan memakai `??` menyelamatkan Anda saat nilainya memang bisa nol.
> 3. `sort` dipanggil pada array baru hasil `Object.entries`, jadi tidak ada data asli yang berubah. Kalau Anda memanggil `selesai.sort(...)`, urutan `selesai` berubah secara diam-diam dan perhitungan setelahnya bisa ikut bergeser.

### Latihan 2: Tebak urutannya

Tulis dugaan urutan keluaran kode ini sebelum menjalankannya.

```js
console.log('1');

setTimeout(() => console.log('2'), 0);

Promise.resolve().then(() => console.log('3'));

(async () => {
  console.log('4');
  await null;
  console.log('5');
})();

console.log('6');
```

> [!petunjuk]
> Ingat dua nampan di analogi warung. Semua kode yang tidak menunggu dikerjakan lebih dulu sampai habis. Setelah itu nampan prioritas (promise dan `await`) diperiksa, baru nampan biasa (`setTimeout`).

> [!jawaban]
>
> Urutannya: **1, 4, 6, 3, 5, 2**.
>
> Penjelasannya langkah demi langkah:
>
> 1. `console.log('1')` langsung jalan.
> 2. `setTimeout` menitipkan pekerjaan ke nampan biasa, lalu kode lanjut.
> 3. `Promise.resolve().then(...)` menitipkan pekerjaan ke nampan prioritas.
> 4. Fungsi async dipanggil dan isinya jalan langsung sampai `await`. Jadi `4` keluar di sini, bukan nanti.
> 5. `await null` menunda sisa fungsinya ke nampan prioritas, di belakang `3` yang sudah mengantre.
> 6. `console.log('6')` masih bagian dari kode utama, jadi keluar sebelum nampan mana pun diperiksa.
> 7. Nampan prioritas dikosongkan dulu: `3` lalu `5`.
> 8. Terakhir nampan biasa: `2`.
>
> Pelajaran yang terpakai di pekerjaan nyata: `setTimeout(fn, 0)` tidak berarti "jalankan sekarang", melainkan "jalankan setelah semua pekerjaan dan semua promise selesai". Dan `await` tidak membuat kode di atasnya tertunda, hanya kode di bawahnya.

### Latihan 3: Pengambil data yang tahan banting

Tulis fungsi `ambilData(url, { timeoutMs = 8000, percobaan = 2 })` dengan syarat: melempar error yang jelas untuk status bukan 2xx, membatalkan permintaan yang lebih lama dari `timeoutMs`, mencoba ulang hanya untuk kegagalan jaringan dan status 5xx (bukan 4xx), serta selalu membersihkan timer-nya.

> [!pembahasan]
>
> ```js
> async function ambilData(url, { timeoutMs = 8000, percobaan = 2 } = {}) {
>   let kesalahanTerakhir;
>
>   for (let ke = 0; ke <= percobaan; ke += 1) {
>     const kendali = new AbortController();
>     const timer = setTimeout(() => kendali.abort(), timeoutMs);
>
>     try {
>       const respons = await fetch(url, { signal: kendali.signal });
>
>       if (respons.status >= 400 && respons.status < 500) {
>         // Salah permintaan, mengulang tidak akan mengubah hasilnya
>         throw new Error(`Permintaan ditolak (${respons.status})`);
>       }
>
>       if (!respons.ok) {
>         throw new Error(`Server bermasalah (${respons.status})`);
>       }
>
>       return await respons.json();
>     } catch (error) {
>       kesalahanTerakhir = error;
>
>       const tidakPerluUlang =
>         error instanceof Error && error.message.startsWith('Permintaan ditolak');
>
>       if (tidakPerluUlang || ke === percobaan) throw error;
>
>       // Jeda yang bertambah, supaya tidak menghujani server yang sedang pulih
>       await new Promise((selesai) => setTimeout(selesai, 300 * 2 ** ke));
>     } finally {
>       clearTimeout(timer);
>     }
>   }
>
>   throw kesalahanTerakhir;
> }
> ```
>
> Empat keputusan yang penting:
>
> 1. **4xx tidak diulang.** Mengulang permintaan yang salah hanya menambah beban tanpa mengubah hasil. 5xx dan kegagalan jaringan layak diulang, karena bisa jadi gangguan sementara.
> 2. **`finally` untuk `clearTimeout`.** Tanpa itu, timer tetap hidup setelah permintaan berhasil, dan pada aplikasi besar kebocoran kecil seperti ini menumpuk.
> 3. **Jeda yang bertambah** (300ms, 600ms, 1200ms) adalah pola yang dipakai hampir semua klien HTTP serius.
> 4. **Satu `AbortController` per percobaan.** Controller yang sudah dibatalkan tidak bisa dipakai lagi, jadi membuatnya di luar loop adalah bug yang sering terjadi.
>
> Modul 12 akan menunjukkan bahwa semua ini sudah disediakan library data seperti TanStack Query. Tetap penting menulisnya sekali dengan tangan, supaya Anda tahu apa yang dikerjakan library itu dan apa yang perlu dibaca di konfigurasinya.

### Latihan 4: Temukan bugnya

Kode ini memformat daftar harga menu dan menampilkan urutannya dari termurah. Pelapor mengatakan daftar aslinya berubah urutan di bagian lain aplikasi, dan diskon kadang hilang.

```js
const menu = [
  { nama: 'Kopi susu', harga: 22000, diskon: 0 },
  { nama: 'Matcha', harga: 25000 },
  { nama: 'Americano', harga: 18000, diskon: 2000 },
];

function tampilkanTermurah(daftar) {
  const terurut = daftar.sort((a, b) => a.harga - b.harga);

  return terurut.map((item) => {
    item.hargaAkhir = item.harga - (item.diskon || 0);
    return `${item.nama}: ${item.hargaAkhir}`;
  });
}
```

Temukan tiga masalah di dalamnya, lalu tulis versi perbaikannya.

> [!jawaban]
>
> **Masalah 1: `sort` mengubah array aslinya.** `daftar.sort(...)` tidak menghasilkan array baru, tapi mengurutkan ulang array yang dikirim pemanggilnya. Itu penjelasan laporan "daftar aslinya berubah urutan di bagian lain".
>
> **Masalah 2: `map` dipakai untuk mengubah isi item.** Baris `item.hargaAkhir = ...` mengubah objek asli, bukan membuat objek baru. Fungsi yang dipakai untuk menampilkan sesuatu tidak boleh mengubah data, karena efek sampingnya muncul di tempat yang jauh dan sulit dilacak.
>
> **Masalah 3: `||` untuk diskon.** Diskon bernilai nol itu sah, dan dengan `||` memang hasilnya kebetulan sama. Bahayanya ada pada pola yang sama di tempat lain: `harga || 50000` akan menyembunyikan menu gratis, dan `jumlah || 1` akan membuat stok nol dianggap satu. Pakai `??` sebagai kebiasaan.
>
> ```js
> function tampilkanTermurah(daftar) {
>   return [...daftar]
>     .sort((a, b) => a.harga - b.harga)
>     .map((item) => {
>       const hargaAkhir = item.harga - (item.diskon ?? 0);
>       return `${item.nama}: ${formatRupiah(hargaAkhir)}`;
>     });
> }
> ```
>
> Fungsi ini sekarang tidak mengubah apa pun di luar dirinya. Sifat itu disebut murni, dan akan jadi syarat kerja saat Anda masuk React di modul 9.

## Batasnya

JavaScript yang Anda tulis di modul ini bisa mengolah data, tapi belum menyentuh halaman sama sekali. Semua contohnya berhenti di `console.log`.

Bahasanya juga tidak memberi tahu apa pun tentang bentuk data Anda. `pesanan.jumlh` (salah tulis) tidak akan diprotes siapa pun sampai nilainya jadi `undefined` di tangan pengguna. Itu masalah yang dijawab TypeScript di modul 8.

Dan satu lagi yang akan terasa dalam dua modul ke depan: begitu kode Anda lebih dari satu file, Anda butuh cara memasang dependensi, menggabungkan file, dan menjalankannya di browser lama. Itu pekerjaan tooling di modul 7.

## Rangkuman

- JavaScript satu-satunya bahasa yang dijalankan browser secara bawaan, dan yang dipakai sehari-hari jauh lebih sedikit daripada isi bahasanya.
- Primitif disalin, objek dirujuk. `const` hanya mengunci rujukannya, bukan isinya.
- `map`, `filter`, `reduce`, `find`, dan `some` menutup sebagian besar pengolahan data dari server. `sort` dan `push` mengubah array asli, jadi salin dulu.
- `??` dan `?.` menyelamatkan Anda dari data yang berlubang, dan `??` lebih tepat daripada `||` saat nol atau string kosong adalah nilai yang sah.
- `fetch` tidak melempar error untuk 404 dan 500. Periksa `respons.ok` sendiri.
- Hanya ada satu jalur eksekusi. Pekerjaan berat membuat halaman macet, dan promise selalu diperiksa sebelum `setTimeout`.
- `Promise.all` untuk pekerjaan yang bisa bersamaan, `AbortController` untuk pekerjaan yang sudah tidak relevan.

## Masalah terbuka

Sekarang Anda bisa mengambil data pesanan dan menghitung pendapatannya. Tapi hasilnya masih di console, dan pengguna tidak membuka console.

Untuk menampilkannya, Anda harus memilih elemen di halaman, membuat elemen baru, memasukkannya ke tempat yang benar, dan memperbaruinya setiap kali datanya berubah. Di situ muncul masalah yang jauh lebih besar daripada kelihatannya: kalau jumlah pesanan ditampilkan di tiga tempat (lencana di header, judul tab, dan baris total), lalu satu pesanan dibatalkan, siapa yang bertanggung jawab memastikan ketiganya ikut berubah?

Itu isi modul berikutnya: DOM, event, dan state yang dikelola dengan tangan, termasuk kenapa pengelolaan manual itu runtuh pada aplikasi yang membesar.
