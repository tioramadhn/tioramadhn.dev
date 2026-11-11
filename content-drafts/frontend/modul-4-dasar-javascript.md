---
title: 'Modul 4: Dasar Pemrograman dengan JavaScript'
description: Sebelum bisa membuat halaman bereaksi, Anda perlu bisa memberi instruksi. Nilai, tipe, variabel, kondisi, perulangan, dan fungsi, dilatih seluruhnya di console browser tanpa memasang apa pun.
date: 2026-11-11
slug: modul-4-dasar-javascript
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Dua modul terakhir memberi Anda halaman yang bermakna dan tampil benar di layar mana pun. Keduanya punya satu kesamaan: Anda **mendeskripsikan** sesuatu. HTML mendeskripsikan struktur, CSS mendeskripsikan tampilan. Tidak ada satu pun keputusan di dalamnya.

Mulai modul ini, pekerjaannya berubah jenis. Anda akan **memerintahkan**, dan perintah punya hal yang tidak dimiliki deskripsi: urutan, syarat, pengulangan, dan hasil yang berbeda tergantung masukannya.

Bandingkan dua kebutuhan ini:

| Kebutuhan | Bisa dengan HTML dan CSS? |
| --- | --- |
| "Judul ini berukuran dua kali teks biasa" | Bisa |
| "Kartu disusun tiga kolom saat layar lebar" | Bisa |
| "Tampilkan 'Gratis' kalau harganya nol, dan harganya kalau tidak" | Tidak |
| "Jumlahkan harga semua barang di keranjang" | Tidak |
| "Ulangi kartu ini untuk setiap produk yang ada di server" | Tidak |

Tiga baris terakhir butuh bahasa yang bisa menyimpan nilai, membandingkan, mengulang, dan memutuskan. Itu yang dipelajari di modul ini.

Satu hal yang perlu diluruskan sejak awal, karena ini modul pertama Anda tentang pemrograman: **modul ini tidak menyentuh halaman sama sekali.** Tidak ada tombol, tidak ada warna, tidak ada yang berubah di layar. Seluruh latihan dikerjakan di console browser, dan hasilnya berupa teks. Itu disengaja. Mencampur "belajar memberi instruksi" dengan "belajar mengubah halaman" membuat keduanya lebih sulit, dan mengubah halaman adalah isi Modul 6.

## Analogi: asisten yang sangat patuh dan sangat tidak kreatif

Bayangkan Anda punya asisten dengan dua sifat yang selalu bersamaan.

Sifat pertama: **dia mengerjakan apa pun yang Anda minta, tanpa membantah, berapa kali pun.** Minta dia menjumlahkan sepuluh ribu angka, dia selesai sebelum Anda menyelesaikan kalimat.

Sifat kedua: **dia tidak pernah menyimpulkan apa pun.** Kalau Anda bilang "ambilkan gelas di meja" dan ada tiga meja, dia berhenti. Kalau Anda bilang "tambahkan dua ke umur" dan yang tersimpan di kotak umur ternyata tulisan `"tiga puluh"`, dia tidak bertanya. Dia menyambung keduanya jadi `"tiga puluh2"` dan menyerahkannya kepada Anda dengan wajah puas.

Hampir semua bug pemula lahir dari sifat kedua. Kodenya berjalan, tidak ada yang merah, dan hasilnya salah. Komputer tidak melakukan apa yang Anda maksud, melainkan apa yang Anda tulis.

| Dunia asisten | Dunia JavaScript |
| --- | --- |
| Kotak berlabel di rak | Variabel |
| Jenis isi kotak (angka, tulisan, daftar) | Tipe data |
| "Kalau hujan, bawa payung" | `if` dan `else` |
| "Ulangi untuk setiap nama di daftar ini" | `for...of` |
| Resep yang diberi nama, bisa dipanggil kapan saja | Fungsi |
| Bahan yang Anda serahkan saat memanggil resep | Parameter |
| Masakan yang dia kembalikan | `return` |
| Formulir berisi kolom berlabel | Objek |
| Daftar bernomor | Array |

Batas analoginya, dan ini yang paling penting: asisten manusia akan bertanya kalau instruksinya aneh. JavaScript tidak. Itu sebabnya sebagian besar pekerjaan belajar di modul ini bukan menghafal sintaks, tapi membangun kebiasaan membaca kode Anda sendiri dengan curiga.

## Tempat berlatih: console

Anda tidak perlu berkas, tidak perlu editor, tidak perlu memasang apa pun. Buka browser, tekan **F12**, pilih tab **Console**, dan Anda punya tempat menulis JavaScript yang langsung menjawab.

Coba ketik ini satu per satu, tekan Enter setiap kali:

```js
2 + 3;
'kopi' + ' susu';
10 > 3;
```

Tiga hal yang perlu Anda tahu tentang console sebelum lanjut:

**`console.log()` adalah cara menampilkan sesuatu dengan sengaja.** Console memang menampilkan hasil baris terakhir secara otomatis, dan itu hanya berlaku di console. Begitu kode Anda hidup di dalam berkas nanti, satu-satunya cara melihat isi sebuah nilai adalah memintanya ditampilkan.

```js
console.log('Halo');
console.log(2 + 3);
console.log('Totalnya', 15000, 'rupiah');
```

**Shift + Enter membuat baris baru tanpa menjalankan.** Berguna saat menulis beberapa baris sekaligus.

**Panah atas mengulang perintah sebelumnya.** Anda akan memakainya terus untuk memperbaiki satu huruf yang salah.

Mulai sekarang, setiap potongan kode di modul ini bisa Anda tempel ke console dan buktikan sendiri. Jangan hanya membacanya. Perbedaan antara membaca dan mengetik ulang pada tahap ini sangat besar.

## Nilai dan tipe

Semua yang diolah program adalah **nilai**, dan setiap nilai punya **tipe**. Tipenya menentukan apa yang boleh dilakukan terhadap nilai itu.

Enam tipe yang akan Anda pakai, dan tiga pertama menutup sembilan puluh persen pekerjaan:

| Tipe | Contoh | Untuk apa |
| --- | --- | --- |
| **string** | `'kopi susu'`, `"Bandung"` | Teks, apa pun yang dibaca manusia |
| **number** | `22000`, `-3`, `4.5` | Angka, tanpa pembedaan bulat dan desimal |
| **boolean** | `true`, `false` | Jawaban ya atau tidak |
| **undefined** | `undefined` | Belum diberi nilai |
| **null** | `null` | Sengaja dikosongkan |
| **object** | `{ nama: 'Tio' }`, `[1, 2, 3]` | Wadah berisi nilai lain |

```js
typeof 'kopi'; // 'string'
typeof 22000; // 'number'
typeof true; // 'boolean'
typeof undefined; // 'undefined'
```

Tiga hal yang perlu dibereskan sekarang, karena ketiganya sumber bug yang akan Anda temui minggu depan.

**Angka dalam tanda kutip bukan angka.**

```js
22000 + 1; // 22001
'22000' + 1; // '220001'
```

Baris kedua itu bukan error. JavaScript melihat ada string, lalu menyimpulkan Anda ingin menyambung teks. Ini penting karena **semua isian form HTML selalu berupa string**, termasuk kolom `type="number"`. Mengubahnya jadi angka adalah pekerjaan Anda:

```js
Number('22000') + 1; // 22001
```

**`undefined` dan `null` berbeda maksudnya.** `undefined` berarti belum pernah diisi, biasanya karena Anda lupa atau karena nilainya tidak ada. `null` berarti seseorang sengaja menuliskan "kosong". Perbedaan ini terasa berlebihan sekarang, dan akan sangat berguna di Modul 5 saat Anda mengolah data dari server yang penuh lubang.

**Nilai yang dianggap "salah" ada tujuh, dan hanya tujuh.** JavaScript bisa memperlakukan nilai apa pun sebagai benar atau salah. Yang dianggap salah, sering disebut *falsy*:

```js
false, 0, -0, 0n, '', null, undefined, NaN
```

Semua yang lain dianggap benar, termasuk hal yang mengejutkan:

```js
Boolean('0'); // true, karena ini string berisi karakter
Boolean([]); // true, array kosong tetap sebuah wadah
Boolean({}); // true
```

Perhatikan `0` dan `''` di daftar falsy. Keduanya adalah nilai yang sah dalam pekerjaan nyata: harga nol, stok nol, catatan kosong. Memperlakukannya sebagai "tidak ada" adalah kesalahan yang akan dibahas tuntas di Modul 5.

## Variabel: kotak berlabel

Variabel adalah nama yang Anda berikan kepada sebuah nilai, supaya bisa dipakai lagi nanti.

```js
const namaToko = 'Warung Kopi Tio';
let jumlahPesanan = 0;

jumlahPesanan = 1; // boleh, karena let
namaToko = 'Lain'; // TypeError: Assignment to constant variable
```

Aturannya pendek dan tidak ada pengecualian yang perlu Anda hafal sekarang:

**Pakai `const` sebagai kebiasaan.** Artinya nama itu tidak akan diarahkan ke nilai lain. Sebagian besar variabel dalam kode nyata memang begitu.

**Pakai `let` hanya kalau nilainya memang berganti.** Penghitung, penampung sementara, nilai yang berubah karena perbuatan pengguna.

**Jangan pernah pakai `var`.** Anda akan menemukannya di kode lama dan di tutorial tua. Perilakunya berbeda dengan cara yang membingungkan, dan tidak ada satu pun alasan memakainya di kode baru.

Soal nama variabel, tiga kebiasaan yang membedakan kode yang bisa dibaca enam bulan kemudian:

```js
// Buruk: tidak ada yang tahu ini apa
const d = 22000;
const x = true;

// Baik: namanya menjelaskan isinya
const hargaKopiSusu = 22000;
const sudahDibayar = true;

// Boolean sebaiknya terbaca seperti pertanyaan ya atau tidak
const adaStok = jumlahStok > 0;
```

Konvensi JavaScript: nama ditulis `camelCase`, yaitu huruf kecil di awal lalu setiap kata berikutnya diawali huruf besar. Nama boleh panjang. `hargaSetelahDiskon` jauh lebih baik daripada `hsd`.

## Operator dan perbandingan

```js
// Hitungan
10 + 3; // 13
10 - 3; // 7
10 * 3; // 30
10 / 3; // 3.333...
10 % 3; // 1, sisa pembagian
```

Operator `%` terlihat tidak berguna sampai Anda membutuhkannya. Kegunaan paling umum: memeriksa kelipatan, misalnya `indeks % 2 === 0` untuk mewarnai baris tabel bergantian.

Menyambung teks paling enak dibaca dengan **template literal**, yang memakai tanda petik miring dan `${}`:

```js
const nama = 'Tio';
const jumlah = 2;

// Cara lama, sulit dibaca
'Pesanan ' + nama + ' sebanyak ' + jumlah + ' gelas';

// Template literal, dan ini yang dipakai sehari-hari
`Pesanan ${nama} sebanyak ${jumlah} gelas`;
```

Perbandingan menghasilkan boolean:

```js
10 > 3; // true
10 >= 10; // true
'kopi' === 'kopi'; // true
'kopi' !== 'teh'; // true
```

Satu aturan yang tidak bisa ditawar, dan selalu masuk daftar aturan linter di Modul 7: **selalu pakai `===`, jangan pernah `==`.**

```js
'22000' == 22000; // true, karena tipenya disamakan dulu secara diam-diam
'22000' === 22000; // false, dan ini yang Anda inginkan

0 == ''; // true
null == undefined; // true
```

`==` mencoba menebak maksud Anda dengan menyamakan tipe lebih dulu, dan tebakannya kadang salah dengan cara yang sulit dilacak. `===` membandingkan nilai beserta tipenya, tanpa menebak apa pun.

Untuk menggabungkan beberapa syarat:

```js
const umur = 20;
const punyaKtp = true;

umur >= 17 && punyaKtp; // true, dua-duanya harus benar
umur >= 17 || punyaKtp; // true, salah satu cukup
!punyaKtp; // false, membalik nilainya
```

## Kondisi: memilih jalan

```js
const stok = 0;

if (stok > 10) {
  console.log('Stok aman');
} else if (stok > 0) {
  console.log('Stok menipis');
} else {
  console.log('Stok habis');
}
```

Tiga hal yang perlu diperhatikan pada bentuk ini:

**Syaratnya diperiksa dari atas ke bawah, dan berhenti di yang pertama benar.** Jadi urutannya berpengaruh. Kalau `stok > 0` ditaruh paling atas, cabang `stok > 10` tidak akan pernah tercapai.

**Kurung kurawal menandai blok.** Semua baris di dalamnya ikut dijalankan bersama. Boleh ditulis tanpa kurawal untuk satu baris, dan sebaiknya tidak, karena menambah baris kedua nanti jadi sumber bug yang halus.

**`else` tidak wajib.** Banyak pemeriksaan hanya butuh "kalau begini, lakukan ini", tanpa cabang lain.

Untuk pilihan dua arah yang hasilnya sebuah nilai, ada bentuk singkat bernama operator ternary:

```js
const label = stok > 0 ? 'Tersedia' : 'Habis';
```

Bacanya: periksa `stok > 0`, kalau benar ambil yang sebelum titik dua, kalau salah ambil yang sesudahnya. Bentuk ini akan muncul terus begitu Anda masuk React di Modul 9, jadi biasakan membacanya sekarang. Satu aturan pemakaian: ternary bagus untuk memilih satu nilai, dan buruk kalau ditumpuk. Ternary di dalam ternary di dalam ternary adalah tanda Anda membutuhkan `if`.

Untuk membandingkan satu nilai terhadap banyak kemungkinan, `switch` lebih rapi:

```js
const status = 'diproses';

switch (status) {
  case 'selesai':
    console.log('Pesanan sudah diambil');
    break;
  case 'diproses':
    console.log('Sedang dibuat');
    break;
  default:
    console.log('Status tidak dikenal');
}
```

`break` wajib. Tanpanya, eksekusi lanjut ke cabang berikutnya, dan itu hampir selalu bukan yang Anda maksud.

## Perulangan: mengerjakan hal yang sama berkali-kali

Kebutuhan paling umum: mengerjakan sesuatu untuk setiap item dalam sebuah daftar.

```js
const menu = ['Kopi susu', 'Americano', 'Matcha'];

for (const item of menu) {
  console.log(item);
}
```

`for...of` adalah bentuk yang akan Anda pakai hampir setiap kali. Bacanya persis seperti tulisannya: untuk setiap `item` di dalam `menu`, kerjakan blok ini.

Kalau Anda butuh nomor urutnya:

```js
for (const [indeks, item] of menu.entries()) {
  console.log(`${indeks + 1}. ${item}`);
}
```

Perhatikan `indeks + 1`. Penomoran dalam pemrograman dimulai dari nol, bukan satu. Item pertama ada di indeks 0. Ini sumber kesalahan hitung yang begitu sering terjadi sampai punya nama sendiri, *off-by-one error*, dan satu-satunya obatnya adalah kebiasaan.

Untuk mengulang sampai sebuah syarat berubah, bukan sepanjang sebuah daftar:

```js
let sisaPercobaan = 3;

while (sisaPercobaan > 0) {
  console.log(`Sisa ${sisaPercobaan} percobaan`);
  sisaPercobaan = sisaPercobaan - 1;
}
```

Satu peringatan nyata: kalau baris terakhir itu lupa ditulis, `sisaPercobaan` tidak pernah berubah, syaratnya selalu benar, dan tab browser Anda membeku. Itu disebut perulangan tak berujung, dan cara keluarnya adalah menutup tabnya. Setiap kali menulis `while`, periksa dulu apa yang membuatnya berhenti.

Anda juga akan menemukan bentuk `for` klasik di kode lama:

```js
for (let i = 0; i < menu.length; i++) {
  console.log(menu[i]);
}
```

Bentuk ini tidak salah, hanya lebih banyak tempat untuk membuat kesalahan: tiga bagian yang harus benar, dan `i` yang bisa dipakai keliru. Pakai `for...of` kecuali Anda benar-benar butuh mengendalikan indeksnya. Di Modul 5 Anda akan belajar bentuk yang bahkan lebih ringkas dan lebih sering dipakai daripada keduanya.

## Fungsi: resep yang diberi nama

Fungsi adalah sepotong instruksi yang diberi nama, supaya bisa dipanggil berkali-kali dengan bahan yang berbeda.

```js
function hitungTotal(harga, jumlah) {
  const total = harga * jumlah;
  return total;
}

hitungTotal(22000, 2); // 44000
hitungTotal(18000, 3); // 54000
```

Empat istilah yang perlu menempel, karena akan dipakai di setiap modul setelah ini:

| Istilah | Pada contoh di atas |
| --- | --- |
| **Deklarasi** | Seluruh blok `function hitungTotal(...) { ... }` |
| **Parameter** | `harga` dan `jumlah`, nama bahan yang diharapkan |
| **Argumen** | `22000` dan `2`, bahan yang benar-benar diserahkan |
| **Nilai kembali** | Yang keluar lewat `return` |

**`return` adalah bagian yang paling sering dilupakan pemula**, dan akibatnya khas: fungsinya berjalan, tidak ada error, dan hasilnya `undefined`.

```js
function hitungSalah(harga, jumlah) {
  harga * jumlah; // dihitung, lalu dibuang
}

hitungSalah(22000, 2); // undefined
```

Hitungannya benar-benar terjadi. Hasilnya hanya tidak pernah diserahkan kembali ke pemanggil. Setiap kali sebuah fungsi mengembalikan `undefined` padahal Anda yakin isinya benar, periksa `return` lebih dulu.

Dua hal lain yang berguna sejak awal:

```js
// Nilai bawaan, dipakai kalau argumennya tidak diserahkan
function hitungPajak(harga, persen = 0.11) {
  return harga * persen;
}

hitungPajak(100000); // 11000
hitungPajak(100000, 0.05); // 5000

// return juga menghentikan fungsi lebih awal
function labelStok(jumlah) {
  if (jumlah === 0) return 'Habis';
  if (jumlah < 5) return 'Menipis';
  return 'Tersedia';
}
```

Pola di fungsi kedua itu disebut *early return*, dan layak jadi kebiasaan. Bandingkan dengan versi `if` bersarang yang mengerjakan hal sama: yang ini lebih pendek, tidak ada indentasi menumpuk, dan setiap syaratnya bisa dibaca sendirian.

Satu patokan tentang kapan membuat fungsi: **saat sepotong logika punya nama yang jelas, atau saat Anda menulis hal yang sama untuk kedua kalinya.** Fungsi yang baik mengerjakan satu hal dan namanya menjelaskan hal itu.

## Objek dan array: dua cara menyimpan banyak nilai

Sampai sini setiap variabel memegang satu nilai. Data nyata tidak seperti itu.

**Objek** menyimpan nilai yang punya nama, seperti formulir berisi kolom berlabel:

```js
const pesanan = {
  id: 12,
  menu: 'Kopi susu',
  harga: 22000,
  jumlah: 2,
  selesai: false,
};

pesanan.menu; // 'Kopi susu'
pesanan.harga * pesanan.jumlah; // 44000

pesanan.selesai = true; // mengubah
pesanan.catatan = 'Less sugar'; // menambah yang belum ada
```

Nama di dalam objek disebut **properti**. Dibaca dengan titik, dan kalau namanya tersimpan di sebuah variabel, dengan kurung siku:

```js
const properti = 'harga';
pesanan[properti]; // 22000
```

**Array** menyimpan nilai berurutan, diakses dengan nomor:

```js
const menu = ['Kopi susu', 'Americano', 'Matcha'];

menu[0]; // 'Kopi susu', ingat: mulai dari nol
menu.length; // 3
menu[menu.length - 1]; // 'Matcha', item terakhir

menu.push('Teh tarik'); // menambah di akhir
```

Dalam pekerjaan nyata, bentuk yang paling sering Anda temui adalah keduanya sekaligus: **array berisi objek**. Semua data yang datang dari server berbentuk seperti ini.

```js
const semuaPesanan = [
  { id: 1, menu: 'Kopi susu', harga: 22000, jumlah: 2 },
  { id: 2, menu: 'Americano', harga: 18000, jumlah: 1 },
  { id: 3, menu: 'Matcha', harga: 25000, jumlah: 3 },
];

semuaPesanan[1].menu; // 'Americano'

let pendapatan = 0;
for (const p of semuaPesanan) {
  pendapatan = pendapatan + p.harga * p.jumlah;
}
console.log(pendapatan); // 128000
```

Potongan terakhir itu pantas Anda tulis ulang di console sampai terasa biasa. Pola "siapkan penampung, telusuri daftar, tambahkan ke penampung" adalah pola pengolahan data yang paling dasar, dan Modul 5 akan menunjukkan cara menuliskannya dalam satu baris.

Satu kesalahan yang hampir pasti Anda alami, jadi kenali bentuknya sekarang:

```js
const kosong = {};
kosong.profil.kota; // TypeError: Cannot read properties of undefined
```

Bacanya: `kosong.profil` bernilai `undefined`, dan `undefined` tidak punya properti apa pun untuk dibaca. Pesan error ini adalah yang paling sering muncul dalam pekerjaan frontend, karena data dari server sering tidak selengkap yang Anda duga. Modul 5 memberi alat khusus untuk itu.

## Latihan

### Latihan 1: Baca di kepala dulu

Tulis dugaan keluaran setiap baris di kertas atau di catatan, baru jalankan di console. Tujuannya bukan benar semua, tapi mengetahui bagian mana yang model mental Anda masih keliru.

```js
console.log(1);
console.log('2' + 3);
console.log('2' - 3);
console.log(10 / 3);
console.log(7 % 3);
console.log('kopi' === 'Kopi');
console.log(0 === -0);
console.log(Boolean(''));
console.log(Boolean('0'));
console.log(undefined === null);
console.log(typeof null);
console.log([1, 2, 3].length);
```

> [!petunjuk]
> Untuk baris kedua dan ketiga, tanyakan: apakah operatornya punya arti lain untuk teks? `+` punya, operator lain tidak.

> [!jawaban]
>
> | Baris | Hasil | Kenapa |
> | --- | --- | --- |
> | `1` | `1` | |
> | `'2' + 3` | `'23'` | Ada string, jadi `+` menyambung teks |
> | `'2' - 3` | `-1` | `-` tidak punya arti untuk teks, jadi `'2'` diubah jadi angka |
> | `10 / 3` | `3.3333333333333335` | Tidak ada pembagian bulat. Angka desimal juga tidak persis |
> | `7 % 3` | `1` | Sisa pembagian |
> | `'kopi' === 'Kopi'` | `false` | Perbandingan teks peka huruf besar kecil |
> | `0 === -0` | `true` | |
> | `Boolean('')` | `false` | String kosong termasuk falsy |
> | `Boolean('0')` | `true` | String berisi satu karakter, bukan angka nol |
> | `undefined === null` | `false` | Maksudnya berbeda, jadi tidak sama |
> | `typeof null` | `'object'` | |
> | `[1, 2, 3].length` | `3` | |
>
> Tiga baris yang paling layak diingat:
>
> 1. **`'2' + 3` dan `'2' - 3` berbeda hasil.** Ini bukan keanehan akademis. Setiap isian form adalah string, jadi menjumlahkan dua kolom angka tanpa mengubahnya dulu akan menyambung teks, dan "total"-nya jadi `'1500020000'`.
> 2. **`10 / 3` tidak bulat, dan bahkan tidak persis.** Angka desimal di komputer adalah pendekatan. Untuk uang, simpan dalam satuan terkecil (rupiah, bukan ribuan rupiah) dan bulatkan hanya saat ditampilkan.
> 3. **`typeof null` adalah `'object'`.** Ini keputusan keliru dari tiga puluh tahun lalu yang tidak bisa diperbaiki tanpa merusak internet. Tidak ada yang perlu Anda pahami di baliknya, cukup tahu bahwa untuk memeriksa `null`, pakai `=== null`.

### Latihan 2: Harga setelah aturan

Tulis fungsi `hitungHargaAkhir(harga, jumlah, kodePromo)` dengan aturan berikut:

- Total dasar adalah harga dikali jumlah.
- Kalau `jumlah` 10 atau lebih, ada diskon grosir 5 persen.
- Kode promo `'HEMAT10'` memberi diskon tambahan 10 persen dari total setelah diskon grosir.
- Kode promo yang tidak dikenal diabaikan tanpa error.
- `kodePromo` boleh tidak diserahkan sama sekali.
- Hasil akhirnya dibulatkan ke rupiah terdekat.

Uji dengan empat pemanggilan: tanpa promo dan jumlah kecil, tanpa promo dan jumlah besar, dengan promo valid, dan dengan promo ngawur.

> [!petunjuk]
> Kerjakan berurutan sesuai aturannya, satu langkah satu baris, dengan `let` untuk nilai yang berubah. Jangan mencoba menulis satu baris raksasa. Untuk pembulatan, cari `Math.round` di MDN.

> [!jawaban]
>
> ```js
> function hitungHargaAkhir(harga, jumlah, kodePromo = '') {
>   let total = harga * jumlah;
>
>   if (jumlah >= 10) {
>     total = total - total * 0.05;
>   }
>
>   if (kodePromo === 'HEMAT10') {
>     total = total - total * 0.1;
>   }
>
>   return Math.round(total);
> }
>
> hitungHargaAkhir(22000, 2); // 44000
> hitungHargaAkhir(22000, 10); // 209000
> hitungHargaAkhir(22000, 10, 'HEMAT10'); // 188100
> hitungHargaAkhir(22000, 2, 'NGAWUR'); // 44000
> ```
>
> Empat keputusan di dalamnya, dan semuanya akan terbawa ke kode sungguhan:
>
> 1. **`kodePromo = ''` sebagai nilai bawaan.** Tanpa itu, memanggil fungsinya dengan dua argumen membuat `kodePromo` bernilai `undefined`. Kebetulan di sini tetap aman karena `undefined === 'HEMAT10'` bernilai `false`, tapi menyatakan nilai bawaan membuat maksudnya jelas bagi pembaca.
> 2. **Promo yang tidak dikenal tidak perlu ditangani khusus.** Tidak ada `else` yang melempar error. Aturannya "diabaikan", dan `if` yang syaratnya tidak terpenuhi memang tidak melakukan apa-apa. Menambah `else` di sini hanya menambah kode tanpa menambah perilaku.
> 3. **Diskon dihitung bertahap, bukan dijumlahkan.** 5 persen lalu 10 persen tidak sama dengan 15 persen. Urutan dan cara penerapan diskon adalah aturan bisnis, dan salah menafsirkannya adalah bug yang berakhir di laporan keuangan.
> 4. **Pembulatan dilakukan sekali di akhir.** Membulatkan di setiap langkah menumpuk selisih. Aturan umumnya: simpan dan hitung dengan ketelitian penuh, bulatkan hanya saat menyerahkan hasil.

### Latihan 3: Ringkasan dari array objek

Dari data berikut, hasilkan tiga nilai dengan `for...of`: total pendapatan dari pesanan berstatus `'selesai'`, jumlah pesanan yang batal, dan nama menu termahal dari seluruh data.

```js
const pesanan = [
  { id: 1, menu: 'Kopi susu', harga: 22000, jumlah: 2, status: 'selesai' },
  { id: 2, menu: 'Americano', harga: 18000, jumlah: 1, status: 'diproses' },
  { id: 3, menu: 'Kopi susu', harga: 22000, jumlah: 3, status: 'selesai' },
  { id: 4, menu: 'Matcha', harga: 25000, jumlah: 2, status: 'batal' },
  { id: 5, menu: 'Teh tarik', harga: 15000, jumlah: 4, status: 'selesai' },
];
```

> [!petunjuk]
> Untuk mencari yang termahal, siapkan penampung dengan nilai yang pasti kalah oleh apa pun, lalu bandingkan satu per satu. Jangan mulai dengan nol kalau harganya bisa negatif, dan jangan mulai dengan item pertama kalau datanya bisa kosong.

> [!pembahasan]
>
> ```js
> let pendapatan = 0;
> let jumlahBatal = 0;
> let menuTermahal = null;
> let hargaTertinggi = -Infinity;
>
> for (const p of pesanan) {
>   if (p.status === 'selesai') {
>     pendapatan = pendapatan + p.harga * p.jumlah;
>   }
>
>   if (p.status === 'batal') {
>     jumlahBatal = jumlahBatal + 1;
>   }
>
>   if (p.harga > hargaTertinggi) {
>     hargaTertinggi = p.harga;
>     menuTermahal = p.menu;
>   }
> }
>
> console.log(pendapatan); // 170000
> console.log(jumlahBatal); // 1
> console.log(menuTermahal); // 'Matcha'
> ```
>
> Empat hal yang dikerjakan dengan sengaja begitu:
>
> 1. **Satu kali telusur untuk tiga hasil.** Anda bisa menulis tiga perulangan terpisah dan hasilnya sama. Satu telusur lebih baik di sini bukan karena kecepatan (pada lima item tidak ada bedanya), tapi karena setiap perulangan tambahan adalah tempat baru untuk lupa menyesuaikan saat datanya berubah bentuk.
> 2. **`hargaTertinggi` dimulai dari `-Infinity`, bukan `0`.** Nilai apa pun pasti lebih besar darinya, jadi item pertama selalu menang dan perbandingannya benar bahkan untuk harga negatif. Memulai dari `0` bekerja untuk data ini dan diam-diam salah untuk data lain.
> 3. **`menuTermahal` dimulai dari `null`, bukan string kosong.** Kalau `pesanan` ternyata kosong, hasilnya `null`, yang jujur berarti "tidak ada". String kosong akan terbaca seperti nama menu yang kebetulan kosong.
> 4. **Harga tertinggi dicari dari seluruh data, bukan hanya yang selesai.** Baca ulang soalnya: dua perhitungan pertama disaring status, yang ketiga tidak. Membaca spesifikasi dengan teliti adalah bagian dari pekerjaan, dan salah menafsirkannya menghasilkan kode yang benar secara teknis dan salah secara hasil.

### Latihan 4: Temukan tiga bugnya

Kode ini dimaksudkan untuk menghitung berapa peserta yang lulus dan berapa rata-rata nilainya. Pelapor mengatakan hasilnya selalu `undefined`, dan jumlah yang lulus terasa aneh.

```js
const peserta = [
  { nama: 'Ani', nilai: 80 },
  { nama: 'Budi', nilai: 55 },
  { nama: 'Cici', nilai: 60 },
  { nama: 'Dedi', nilai: 0 },
];

function ringkas(daftar) {
  let lulus = 0;
  let totalNilai = 0;

  for (let i = 0; i <= daftar.length; i++) {
    const orang = daftar[i];

    if (orang.nilai >= 60) {
      lulus = lulus + 1;
    }

    if (orang.nilai) {
      totalNilai = totalNilai + orang.nilai;
    }
  }

  const rata = totalNilai / daftar.length;
}

console.log(ringkas(peserta));
```

> [!petunjuk]
> Tiga jenis masalah yang berbeda: satu soal batas perulangan, satu soal nilai falsy, dan satu soal yang membuat seluruh fungsi tidak berguna. Jalankan di console dan baca pesan errornya sampai habis.

> [!jawaban]
>
> **Bug 1: `i <= daftar.length` seharusnya `i < daftar.length`.**
> Array berisi 4 item punya indeks 0 sampai 3, dan `length` bernilai 4. Dengan `<=`, perulangan mencapai `i = 4`, sehingga `daftar[4]` bernilai `undefined`, lalu `orang.nilai` melempar `TypeError: Cannot read properties of undefined`. Ini off-by-one error yang disebut di bagian perulangan, dan alasan utama `for...of` lebih disukai: batasnya diurus bahasa, bukan oleh Anda.
>
> **Bug 2: `if (orang.nilai)` memperlakukan nilai 0 sebagai tidak ada.**
> Dedi punya nilai `0`, yang termasuk falsy, jadi nilainya tidak ikut dijumlahkan. Tapi pembaginya tetap `daftar.length`, yaitu 4. Jadi rata-ratanya salah: dihitung dari tiga nilai lalu dibagi empat. Ini contoh paling murni dari peringatan di bagian tipe, yaitu nol adalah nilai yang sah. Yang dimaksud penulis kemungkinan "kalau nilainya ada", dan cara menuliskannya adalah memeriksa keberadaannya, bukan kebenarannya.
>
> **Bug 3: tidak ada `return`.**
> `rata` dihitung lalu dibuang bersama seluruh isi fungsi, jadi `ringkas()` mengembalikan `undefined`. Ini yang membuat laporan "hasilnya selalu undefined", dan sekaligus membuat dua bug sebelumnya tidak terlihat.
>
> Versi yang benar:
>
> ```js
> function ringkas(daftar) {
>   let lulus = 0;
>   let totalNilai = 0;
>
>   for (const orang of daftar) {
>     if (orang.nilai >= 60) {
>       lulus = lulus + 1;
>     }
>
>     if (typeof orang.nilai === 'number') {
>       totalNilai = totalNilai + orang.nilai;
>     }
>   }
>
>   return {
>     lulus,
>     rata: daftar.length > 0 ? totalNilai / daftar.length : 0,
>   };
> }
>
> console.log(ringkas(peserta)); // { lulus: 2, rata: 48.75 }
> ```
>
> Tiga perbaikan tambahan yang ikut dikerjakan, dan masing-masing punya alasan:
>
> 1. **`for...of` menggantikan `for` klasik**, sehingga tidak ada batas yang bisa salah.
> 2. **`typeof orang.nilai === 'number'` menggantikan `if (orang.nilai)`.** Sekarang `0` ikut terhitung, dan peserta yang nilainya belum masuk tetap dilewati.
> 3. **Pembagian dijaga terhadap daftar kosong.** `0 / 0` menghasilkan `NaN`, dan `NaN` menyebar ke setiap hitungan setelahnya tanpa pernah melempar error. Memeriksanya satu kali di sini lebih murah daripada memburu `NaN` di tampilan nanti.
>
> Perhatikan juga `{ lulus, rata: ... }` di dalam `return`. Menulis `lulus` saja adalah bentuk singkat dari `lulus: lulus`, dan dipakai di mana-mana dalam kode nyata.

## Batasnya

Anda sekarang bisa menyimpan nilai, membandingkan, memilih jalan, mengulang, dan membungkus logika jadi fungsi. Itu fondasi yang cukup untuk seluruh seri ini, dan tiga hal masih kosong.

**Kode Anda belum menyentuh halaman sama sekali.** Semua latihan di modul ini berakhir di console, dan pengguna tidak membuka console. Menghubungkan nilai hasil hitungan ke sesuatu yang terlihat di layar adalah isi Modul 6.

**Cara menulisnya masih panjang.** Pola "siapkan penampung, telusuri daftar, tambahkan" yang Anda tulis di Latihan 3 bisa ditulis dalam satu baris, dan begitulah cara kode frontend sungguhan ditulis. Itu isi modul berikutnya.

**Belum ada cara menangani pekerjaan yang butuh waktu.** Mengambil data dari server tidak selesai seketika, dan semua yang Anda tulis di modul ini mengasumsikan setiap baris selesai sebelum baris berikutnya dimulai. Asumsi itu akan dicabut di modul berikutnya juga.

Satu hal yang perlu diluruskan sebelum lanjut: tidak ada yang mengharapkan Anda menghafal modul ini. Sintaks dicari di MDN kapan saja. Yang perlu menempel adalah empat kebiasaan: curiga terhadap tipe, selalu `===`, selalu periksa `return`, dan ingat bahwa `0` dan string kosong adalah nilai yang sah.

## Rangkuman

- HTML dan CSS mendeskripsikan, JavaScript memerintahkan. Perintah punya urutan, syarat, pengulangan, dan hasil yang bergantung masukan.
- Console browser adalah tempat berlatih yang tidak butuh berkas maupun pemasangan apa pun.
- Setiap nilai punya tipe, dan tipenya menentukan apa yang terjadi. `'2' + 3` menghasilkan `'23'`, dan semua isian form adalah string.
- `const` sebagai kebiasaan, `let` kalau nilainya memang berganti, `var` tidak pernah.
- Selalu `===`, jangan pernah `==`. Yang kedua menyamakan tipe dengan tebakan yang kadang salah.
- Tujuh nilai falsy, dan dua di antaranya (`0` dan `''`) adalah nilai sah dalam pekerjaan nyata. Memeriksa keberadaan berbeda dari memeriksa kebenaran.
- `for...of` untuk menelusuri daftar, `while` untuk mengulang sampai syarat berubah, dan selalu periksa apa yang membuat `while` berhenti.
- Penomoran dimulai dari nol. Batas perulangan memakai `<`, bukan `<=`.
- Fungsi tanpa `return` mengembalikan `undefined`. Ini penyebab nomor satu "kodenya jalan tapi hasilnya kosong".
- Objek menyimpan nilai bernama, array menyimpan nilai berurutan, dan data dari server hampir selalu berbentuk array berisi objek.

## Masalah terbuka

Kembali ke Latihan 3 dan perhatikan bentuk kodenya. Untuk menjumlahkan pendapatan, Anda menulis lima baris: siapkan penampung, buka perulangan, periksa syarat, tambahkan, tutup perulangan. Pola itu akan muncul puluhan kali per hari dalam pekerjaan nyata, dan menulisnya lima baris setiap kali bukan cara frontend modern ditulis.

Lebih dari itu, ada dua hal yang belum punya jawaban sama sekali.

Pertama, data yang Anda olah di modul ini selalu lengkap dan selalu ada. Data sungguhan tidak begitu: sebuah pesanan bisa tidak punya catatan, seorang pengguna bisa tidak punya alamat, dan membaca `pengguna.alamat.kota` pada data seperti itu meledak dengan pesan yang sudah Anda lihat di akhir bagian objek.

Kedua, setiap baris di modul ini selesai sebelum baris berikutnya dimulai. Begitu Anda meminta data dari server, baris itu butuh waktu, dan selama menunggu halaman tidak boleh berhenti bekerja. Bagaimana menulis kode yang menunggu sesuatu tanpa membuat semuanya ikut berhenti?

Itu isi modul berikutnya: bagian JavaScript yang benar-benar dipakai frontend setiap hari, cara mengolah daftar dalam satu baris, cara membaca data yang berlubang, dan cara menangani pekerjaan yang butuh waktu.
