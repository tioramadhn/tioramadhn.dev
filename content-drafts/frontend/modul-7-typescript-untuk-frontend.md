---
title: 'Modul 7: TypeScript untuk Frontend'
description: Menuliskan bentuk data supaya mesin yang memeriksanya, bukan pengguna Anda. Dari tipe dasar sampai discriminated union, generics yang benar-benar dipakai, dan batas yang tidak bisa dijaga TypeScript.
date: 2026-11-14
slug: modul-7-typescript-untuk-frontend
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Modul sebelumnya ditutup dengan tiga baris yang tidak diprotes alat apa pun:

```js
console.log(pesanan.jumlh); // salah tulis
total(pesanan.harga, 'dua'); // string di tempat angka
cuaca.data.suhu; // meledak kalau data masih kosong
```

TypeScript menolak ketiganya sebelum kode dijalankan. Itu seluruh nilai jualnya, dan ternyata cukup untuk membuatnya jadi bawaan di hampir semua tim frontend hari ini.

Tiga hal yang sebenarnya Anda beli dengan memakainya, dan urutannya sering mengejutkan:

| Yang didapat | Seberapa terasa |
| --- | --- |
| Autocomplete yang tahu isi data Anda | Terasa setiap menit, dan ini manfaat terbesar yang paling jarang disebut |
| Refactor tanpa takut | Terasa setiap kali mengganti nama field atau mengubah bentuk data |
| Bug tipe tertangkap sebelum rilis | Terasa beberapa kali sebulan, dan menyelamatkan |

Baris pertama itu alasan sesungguhnya. Dengan tipe yang benar, editor Anda berubah dari penyunting teks jadi alat yang tahu `pesanan` punya field apa saja, dan apa yang dikembalikan `ambilCuaca`.

## Masalahnya dulu: bentuk data tidak pernah dituliskan

Pada JavaScript, bentuk data hanya hidup di tiga tempat yang sama-sama tidak bisa diandalkan: di kepala Anda, di komentar yang kedaluwarsa, dan di dokumentasi API yang terakhir diperbarui tahun lalu.

Akibatnya terasa paling keras saat perubahan. Anda mengganti nama `suhu` jadi `suhuCelsius` di lapisan data, lalu menjalankan pencarian teks di seluruh proyek. Yang ketemu: `suhu`, `suhuMax`, `suhuTerasa`, dan satu `data["suhu"]` di baris yang tidak ikut ketemu karena ditulis dinamis. Dua minggu kemudian, satu kartu menampilkan "undefined derajat" di halaman yang jarang dibuka.

TypeScript mengubah pencarian teks jadi pertanyaan ke mesin. Anda ganti nama di satu tempat, lalu `tsc` menyebutkan semua tempat yang ikut salah, termasuk yang tidak terpikir.

## Analogi: label dan daftar isi kardus pindahan

Bayangkan pindah rumah dengan seratus kardus.

**Cara pertama.** Semua kardus kosong labelnya. Anda tahu isinya karena Anda yang mengemas. Saat mencari charger, Anda membuka tujuh kardus. Saat ada orang lain membantu, dia harus bertanya setiap kali.

**Cara kedua.** Setiap kardus punya label isi dan daftar barang di dalamnya. Lebih dari itu, ada aturan di pintu: kardus bertuliskan "pecah belah" tidak boleh ditumpuk di bawah, dan tukang angkut akan menolaknya sebelum masuk truk.

TypeScript adalah kedua hal itu sekaligus: labelnya (dokumentasi yang tidak bisa kedaluwarsa karena ikut diperiksa) dan penjaga pintunya (pemeriksaan sebelum kode dijalankan).

| Dunia pindahan | Dunia TypeScript |
| --- | --- |
| Label isi kardus | Tipe dan interface |
| Daftar barang per kardus | Field beserta tipenya |
| Tukang angkut yang menolak susunan salah | `tsc`, pemeriksa tipe |
| "Isinya campur, pokoknya masuk saja" | `any` |
| "Isinya belum diperiksa, jangan dibuka dulu" | `unknown` |
| Stiker "pecah belah" yang ditempel sembarangan | `as`, penegasan tipe yang bisa berbohong |
| Kardus yang dibuka dan isinya tidak sesuai label | Data runtime yang tidak cocok dengan tipenya |

Batas analoginya ada pada baris terakhir, dan ini yang paling penting dari seluruh modul: label tidak pernah memeriksa isi kardus saat sampai di rumah baru. TypeScript hilang sepenuhnya saat kode dijalankan. Yang dijalankan browser adalah JavaScript tanpa satu pun tipe.

## Yang dipakai sehari-hari

```ts
// Tipe dasar, biasanya tidak perlu ditulis karena bisa disimpulkan
const nama = 'Tio'; // string
const suhu = 29; // number
const aktif = true; // boolean

// Array dan objek
const kota: string[] = ['Jakarta', 'Bandung'];

interface Kota {
  id: string;
  nama: string;
  lat: number;
  lon: number;
  negara?: string; // opsional
}

// Fungsi: parameter wajib ditulis, kembalian biasanya disimpulkan
function jarakKe({ lat, lon }: Kota, tujuan: Kota): number {
  return Math.hypot(lat - tujuan.lat, lon - tujuan.lon);
}

// Union: salah satu dari beberapa kemungkinan
type Satuan = 'celsius' | 'fahrenheit';
type IdPesanan = string | number;

// Nilai literal sebagai tipe, jauh lebih berguna daripada string biasa
function ubahSatuan(nilai: number, ke: Satuan): number {
  return ke === 'fahrenheit' ? nilai * 1.8 + 32 : nilai;
}

ubahSatuan(29, 'kelvin'); // Error, dan ini yang Anda inginkan
```

Aturan praktis yang membuat kode tetap enak dibaca: **tulis tipe di batas, biarkan sisanya disimpulkan**. Batas itu artinya parameter fungsi, kembalian fungsi yang diekspor, bentuk data dari server, dan props komponen. Menulis `const suhu: number = 29` hanya menambah kebisingan.

Dua hal yang perlu diputuskan sekali lalu dipakai konsisten:

**`interface` atau `type`?** Keduanya hampir sama. `interface` bisa digabung kalau dideklarasikan dua kali dan terasa lebih alami untuk bentuk objek. `type` bisa menampung union, tuple, dan tipe yang dihitung. Pilihan yang wajar: `interface` untuk bentuk objek dan props, `type` untuk sisanya. Yang penting satu tim satu kebiasaan.

**`any` atau `unknown`?** `any` mematikan pemeriksaan, dan satu `any` bisa menyebar jauh membawa lubang bersamanya. `unknown` berarti "belum diketahui", dan TypeScript memaksa Anda memeriksanya sebelum dipakai. Untuk data dari luar, selalu `unknown`.

## Penyempitan tipe

Ini bagian yang membuat TypeScript terasa cerdas: pemeriksaan biasa yang Anda tulis juga menyempitkan tipenya.

```ts
function tampilkan(nilai: string | number | null) {
  if (nilai === null) return 'Tidak ada data';

  // Di sini tipenya sudah string | number
  if (typeof nilai === 'number') {
    return nilai.toFixed(1); // aman, karena pasti number
  }

  return nilai.trim(); // pasti string
}
```

Pola yang paling berharga di aplikasi nyata adalah **discriminated union**: beberapa bentuk yang dibedakan satu field penanda. Ingat state cuaca di Proyek 1?

```ts
interface Cuaca {
  suhu: number;
  kelembapan: number;
  kondisi: string;
}

type StatusCuaca =
  | { status: 'memuat' }
  | { status: 'siap'; data: Cuaca }
  | { status: 'gagal'; pesan: string; data?: Cuaca };

function renderKartu(keadaan: StatusCuaca): string {
  switch (keadaan.status) {
    case 'memuat':
      return 'Memuat…';
    case 'siap':
      return `${keadaan.data.suhu} derajat`; // data pasti ada
    case 'gagal':
      return keadaan.data
        ? `${keadaan.data.suhu} derajat (gagal diperbarui)`
        : keadaan.pesan;
  }
}
```

Perhatikan apa yang dilakukan bentuk ini: **keadaan yang mustahil jadi tidak bisa ditulis**. Tidak ada cara membuat objek dengan `status: 'memuat'` yang punya `data` lengkap, dan tidak ada cara membaca `keadaan.data.suhu` saat statusnya masih `memuat`. Kalau Anda membentuknya sebagai satu objek berisi `sedangMemuat`, `data`, dan `pesanGagal` yang semuanya opsional, Anda punya delapan kombinasi yang separuhnya tidak masuk akal, dan separuh itulah sumber bug.

Modul 11 akan memakai pola ini lagi, karena itu bentuk yang dipakai library data modern.

## Generics yang benar-benar dipakai

Generics terkesan rumit, padahal sehari-hari hanya dipakai untuk satu hal: fungsi atau wadah yang bekerja untuk tipe apa pun, tanpa kehilangan informasi tipenya.

```ts
// Tanpa generics: tipe kembaliannya hilang
function ambilPertamaBuruk(daftar: unknown[]): unknown {
  return daftar[0];
}

// Dengan generics: tipe masuk, tipe keluar
function ambilPertama<T>(daftar: T[]): T | undefined {
  return daftar[0];
}

const kota = ambilPertama(['Jakarta', 'Bandung']); // string | undefined

// Dibatasi: T harus punya field id
function keMap<T extends { id: string }>(daftar: T[]): Record<string, T> {
  return Object.fromEntries(daftar.map((item) => [item.id, item]));
}
```

Dua pola yang muncul di hampir semua proyek:

```ts
// Respons API yang selalu berbentuk sama, isinya berbeda
interface ResponsApi<T> {
  data: T;
  meta: { halaman: number; total: number };
}

async function minta<T>(url: string): Promise<ResponsApi<T>> {
  const respons = await fetch(url);
  if (!respons.ok) throw new Error(`Gagal: ${respons.status}`);
  return respons.json() as Promise<ResponsApi<T>>;
}

const hasil = await minta<Kota[]>('/api/kota');
hasil.data[0].nama; // editor sudah tahu isinya
```

Perhatikan `as Promise<ResponsApi<T>>` di situ. Itu janji yang Anda berikan kepada TypeScript tanpa bukti, dan di bagian "Batasnya" akan dibahas kenapa janji seperti itu adalah lubang yang harus ditutup di satu tempat.

Utility type yang paling sering menghemat pekerjaan:

```ts
interface Pengguna {
  id: string;
  nama: string;
  email: string;
  peran: 'admin' | 'editor' | 'pembaca';
}

type PenggunaBaru = Omit<Pengguna, 'id'>; // tanpa id
type RingkasanPengguna = Pick<Pengguna, 'id' | 'nama'>;
type TambalanPengguna = Partial<Pengguna>; // semua opsional
type PeranPengguna = Pengguna['peran']; // 'admin' | 'editor' | 'pembaca'
type DaftarPerPeran = Record<PeranPengguna, Pengguna[]>;
```

`Pengguna['peran']` layak jadi kebiasaan: tipe diturunkan dari satu sumber, jadi menambah peran baru cukup diubah di satu tempat.

## `as const` dan `satisfies`

Dua fitur yang terlihat kecil tapi sering memperbaiki kualitas tipe secara nyata:

```ts
// Tanpa as const: tipenya string[], informasi nilainya hilang
const SATUAN_LONGGAR = ['celsius', 'fahrenheit'];

// Dengan as const: tipenya readonly ['celsius', 'fahrenheit']
const SATUAN = ['celsius', 'fahrenheit'] as const;
type Satuan = (typeof SATUAN)[number]; // 'celsius' | 'fahrenheit'

// satisfies: diperiksa cocok dengan sebuah bentuk,
// tanpa kehilangan tipe sempitnya
const KODE_CUACA = {
  0: 'Langit cerah',
  61: 'Hujan ringan',
  95: 'Badai petir',
} satisfies Record<number, string>;
```

Pola `as const` lalu `(typeof X)[number]` adalah cara menjaga daftar pilihan dan tipenya tetap satu sumber. Tanpa itu, Anda menulis daftar dua kali, dan suatu hari dua daftar itu berbeda.

## Menyiapkan proyek

```bash
pnpm add -D typescript
pnpm tsc --init
```

```json
// tsconfig.json, bagian yang penting
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "skipLibCheck": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

Dua opsi yang paling berdampak:

**`strict: true` tidak bisa ditawar.** Tanpanya, `null` dan `undefined` bisa masuk ke mana saja, dan Anda kehilangan separuh manfaat yang jadi alasan memakai TypeScript. Pada proyek lama yang dimigrasikan, nyalakan bertahap per berkas, tapi pada proyek baru nyalakan sejak menit pertama.

**`noUncheckedIndexedAccess`** membuat `daftar[0]` bertipe `T | undefined`, bukan `T`. Awalnya menjengkelkan, lalu Anda sadar betapa sering kode mengakses indeks tanpa memeriksa apakah ada isinya.

Catatan penting: Vite tidak memeriksa tipe saat build. Vite hanya membuang anotasi tipe dan membiarkannya lewat, supaya cepat. Jadi `pnpm tsc --noEmit` harus jadi bagian dari `pnpm check` dan jalan di CI. Kalau tidak, proyek Anda bisa dirilis dengan error tipe yang tidak pernah dilihat siapa pun.

## Latihan

### Latihan 1: Beri tipe lapisan data Proyek 1

Ubah `src/lib/cuaca.js` jadi `cuaca.ts` dengan syarat: ada tipe untuk respons mentah Open-Meteo, ada tipe untuk bentuk data aplikasi Anda sendiri, dan keduanya dipisah. Fungsi `cariKota` dan `ambilCuaca` harus punya tipe kembalian yang jelas, dan tidak boleh ada satu pun `any`.

> [!petunjuk]
> Dua kelompok tipe, dua nama yang jelas. Awali tipe milik pihak ketiga dengan `Respons`, dan biarkan tipe aplikasi Anda bernama pendek. Pemisahan itu yang membuat pergantian penyedia API nanti hanya menyentuh satu berkas.

> [!jawaban]
>
> ```ts
> // Bentuk mentah dari pihak ketiga, hanya field yang kita minta
> interface ResponsGeocoding {
>   results?: Array<{
>     id: number;
>     name: string;
>     country?: string;
>     latitude: number;
>     longitude: number;
>   }>;
> }
>
> interface ResponsForecast {
>   current: {
>     temperature_2m: number;
>     relative_humidity_2m: number;
>     weather_code: number;
>     wind_speed_10m: number;
>   };
>   daily: {
>     time: string[];
>     weather_code: number[];
>     temperature_2m_max: number[];
>     temperature_2m_min: number[];
>   };
> }
>
> // Bentuk milik aplikasi kita
> export interface Kota {
>   id: string;
>   nama: string;
>   negara: string;
>   lat: number;
>   lon: number;
> }
>
> export interface Prakiraan {
>   tanggal: string;
>   min: number;
>   max: number;
>   kondisi: string;
> }
>
> export interface Cuaca {
>   suhu: number;
>   kelembapan: number;
>   angin: number;
>   kondisi: string;
>   harian: Prakiraan[];
> }
>
> export async function cariKota(nama: string, signal?: AbortSignal): Promise<Kota[]> {
>   const data = await mintaJson<ResponsGeocoding>(url, signal);
>
>   return (data.results ?? []).map((item) => ({
>     id: String(item.id),
>     nama: item.name,
>     negara: item.country ?? '',
>     lat: item.latitude,
>     lon: item.longitude,
>   }));
> }
> ```
>
> Tiga hal yang didapat dari pemisahan ini:
>
> 1. **Nama field pihak ketiga berhenti di satu berkas.** `relative_humidity_2m` tidak pernah muncul di kode tampilan, jadi mengganti penyedia API tidak menyentuh komponen.
> 2. **`results?` ditandai opsional**, karena API ini memang tidak mengirim field itu saat tidak ada hasil. Tipe yang jujur memaksa Anda menangani keadaan kosong.
> 3. **`signal?: AbortSignal`** memakai tipe DOM bawaan. Semua API browser sudah punya tipenya, jadi tidak perlu dibuat sendiri.

### Latihan 2: Keadaan yang mustahil dilarang

Seorang rekan menulis tipe state berikut, dan melaporkan bug "kartu kadang menampilkan spinner bersamaan dengan pesan error".

```ts
interface KeadaanKartu {
  sedangMemuat: boolean;
  data?: Cuaca;
  pesanGagal?: string;
}
```

Jelaskan kenapa bentuk ini mengundang bug, hitung jumlah kombinasi yang mungkin, lalu tulis ulang supaya keadaan yang tidak masuk akal tidak bisa dibuat.

> [!petunjuk]
> Hitung kombinasinya: dua nilai untuk boolean, ada atau tidak untuk dua field opsional. Lalu tandai mana saja kombinasi yang seharusnya tidak pernah terjadi.

> [!jawaban]
>
> Ada **delapan kombinasi**, dan hanya empat yang masuk akal. Yang bermasalah misalnya: sedang memuat sekaligus punya pesan gagal, atau tidak sedang memuat tanpa data dan tanpa pesan gagal (keadaan yang tidak bisa digambar sama sekali).
>
> Tipe seperti ini memindahkan tanggung jawab ke kedisiplinan manusia: setiap orang yang menulis `setState` harus ingat mengosongkan `pesanGagal` saat mulai memuat. Satu orang lupa, dan laporan bug itu muncul.
>
> ```ts
> type KeadaanKartu =
>   | { status: 'kosong' }
>   | { status: 'memuat'; dataLama?: Cuaca }
>   | { status: 'siap'; data: Cuaca; diperbaruiPada: Date }
>   | { status: 'gagal'; pesan: string; dataLama?: Cuaca };
> ```
>
> Sekarang empat keadaan, tidak satu pun bisa bercampur, dan pembaca kode langsung tahu seluruh kemungkinannya hanya dengan membaca tipenya.
>
> Bonus yang didapat gratis: kalau Anda memakai `switch` tanpa `default` pada tipe seperti ini dan suatu hari menambahkan status kelima, TypeScript akan menandai setiap `switch` yang belum menanganinya. Itu refactor yang dipandu mesin, bukan ditebak.

### Latihan 3: Satu fungsi pengelompokan untuk seluruh proyek

Tulis fungsi `kelompokkan` yang mengubah array jadi objek berisi kelompok, dengan kunci yang ditentukan pemanggil. Syaratnya: bekerja untuk tipe apa pun, kunci bisa berupa nama field atau fungsi, dan hasilnya punya tipe yang benar tanpa `as`.

```ts
// Target pemakaian
const perNegara = kelompokkan(daftarKota, 'negara');
// Record<string, Kota[]>

const perRentang = kelompokkan(daftarCuaca, (c) => (c.suhu > 30 ? 'panas' : 'sejuk'));
// Record<string, Cuaca[]>
```

> [!pembahasan]
>
> ```ts
> type PengambilKunci<T> = keyof T | ((item: T) => string);
>
> export function kelompokkan<T extends Record<string, unknown>>(
>   daftar: readonly T[],
>   kunci: PengambilKunci<T>
> ): Record<string, T[]> {
>   const hasil: Record<string, T[]> = {};
>
>   for (const item of daftar) {
>     const nilai =
>       typeof kunci === 'function' ? kunci(item) : String(item[kunci]);
>
>     // Dengan noUncheckedIndexedAccess, baris ini wajib
>     hasil[nilai] = hasil[nilai] ?? [];
>     hasil[nilai].push(item);
>   }
>
>   return hasil;
> }
> ```
>
> Empat keputusan yang membuatnya layak dipakai di proyek nyata:
>
> 1. **`keyof T` bukan `string`.** Dengan `keyof T`, salah tulis nama field ditolak saat menulis kode, dan editor menyarankan nama field yang benar.
> 2. **`readonly T[]` sebagai parameter.** Menyatakan bahwa fungsi ini tidak akan mengubah array yang dikirim, dan membuat array `readonly` tetap bisa dikirim ke dalamnya.
> 3. **`typeof kunci === 'function'` menyempitkan union**, jadi tidak perlu `as` sama sekali. Setiap `as` yang bisa dihindari sebaiknya dihindari.
> 4. **Tidak dibuat terlalu pintar.** Versi yang lebih canggih bisa menyimpulkan kunci literal, dan harganya tipe yang sulit dibaca orang lain. Tipe yang rumit punya biaya pemeliharaan sama seperti kode yang rumit.

### Latihan 4: Temukan kebohongannya

Kode ini lolos pemeriksaan tipe dan tetap meledak di tangan pengguna. Temukan tiga tempat yang berbohong kepada TypeScript, lalu perbaiki.

```ts
interface Pengguna {
  id: string;
  nama: string;
  peran: 'admin' | 'editor';
}

async function muatPengguna(id: string): Promise<Pengguna> {
  const respons = await fetch(`/api/pengguna/${id}`);
  return respons.json() as Pengguna;
}

function tampilkanPeran(pengguna: Pengguna) {
  const label = {
    admin: 'Administrator',
    editor: 'Penyunting',
  }[pengguna.peran];

  return label.toUpperCase();
}

const elemen = document.querySelector('#nama') as HTMLInputElement;
elemen.value = 'Tio';
```

> [!jawaban]
>
> **Kebohongan 1: `respons.json() as Pengguna`.** `json()` mengembalikan `any` yang diubah paksa jadi `Pengguna`. Tidak ada satu pun pemeriksaan bahwa server benar-benar mengirim bentuk itu. Kalau API mengganti `peran` jadi `role`, TypeScript tetap diam dan aplikasi meledak di `tampilkanPeran`. Baris ini juga tidak memeriksa `respons.ok`, jadi halaman error 500 ikut diperlakukan sebagai pengguna.
>
> **Kebohongan 2: `document.querySelector(...) as HTMLInputElement`.** Dua penegasan sekaligus: bahwa elemennya ada, dan bahwa jenisnya input. Kalau markup berubah, hasilnya `null` dan baris berikutnya melempar error.
>
> **Kebohongan 3 yang paling halus: pencarian label.** Tipenya tampak aman sekarang, tapi begitu seseorang menambahkan `'pembaca'` ke union `peran`, objek label tidak lagi lengkap dan `label` jadi `undefined`. Tanpa penanda, TypeScript tidak akan memprotes.
>
> Versi yang jujur:
>
> ```ts
> async function muatPengguna(id: string): Promise<Pengguna> {
>   const respons = await fetch(`/api/pengguna/${id}`);
>   if (!respons.ok) throw new Error(`Gagal memuat pengguna (${respons.status})`);
>
>   const mentah: unknown = await respons.json();
>   return bacaPengguna(mentah); // memeriksa isi, lalu mengembalikan Pengguna
> }
>
> const LABEL_PERAN = {
>   admin: 'Administrator',
>   editor: 'Penyunting',
> } satisfies Record<Pengguna['peran'], string>;
>
> function tampilkanPeran(pengguna: Pengguna) {
>   return LABEL_PERAN[pengguna.peran].toUpperCase();
> }
>
> const elemen = document.querySelector<HTMLInputElement>('#nama');
> if (elemen) elemen.value = 'Tio';
> ```
>
> Perhatikan apa yang dikerjakan `satisfies` di situ: begitu ada peran baru ditambahkan ke union, `LABEL_PERAN` langsung ditandai tidak lengkap. Daftar yang wajib mencakup semua kemungkinan dijaga mesin, bukan ingatan.
>
> Fungsi `bacaPengguna` sengaja belum ditulis isinya. Membuatnya dengan tangan untuk setiap bentuk data melelahkan, dan modul 12 akan memperkenalkan cara yang jauh lebih ringkas memakai Zod, satu skema yang sekaligus menghasilkan tipenya.

## Batasnya

TypeScript hilang saat kode dijalankan, dan itu bukan kekurangan kecil. Tiga akibatnya:

**Data dari luar tidak pernah dijamin.** Respons API, isi `localStorage`, parameter URL, dan pesan dari iframe semuanya `unknown` pada kenyataannya. Tipe yang Anda tulis untuk mereka adalah harapan, bukan jaminan. Satu-satunya cara mendapat jaminan adalah memeriksa isinya saat runtime, dan tempat yang benar untuk itu adalah satu lapisan di batas aplikasi.

**`as` dan `any` adalah pintu belakang yang selalu tersedia.** Pemeriksaan tipe hanya sekuat kejujuran kode Anda. Satu `as` yang ditulis karena sedang dikejar waktu akan tetap di sana setahun kemudian.

**Tipe tidak menangkap kesalahan logika.** Fungsi yang menghitung diskon dengan rumus salah punya tipe yang sempurna. Untuk yang itu, Anda butuh test, dan itu modul 16.

Satu lagi yang jarang disebut: tipe yang terlalu pintar bisa jadi beban. Tipe yang butuh lima menit untuk dipahami rekan tim, atau yang membuat pesan errornya tiga puluh baris, biasanya tanda bahwa Anda sedang memaksakan sesuatu. Kode yang lebih sederhana dengan tipe yang lebih sederhana hampir selalu pilihan yang lebih baik.

## Rangkuman

- Manfaat terbesar TypeScript yang paling jarang disebut: editor yang tahu bentuk data Anda, setiap menit.
- Tulis tipe di batas (parameter, kembalian yang diekspor, data server, props), biarkan sisanya disimpulkan.
- `unknown` untuk data dari luar, `any` sebaiknya tidak pernah. `strict: true` sejak menit pertama.
- Discriminated union membuat keadaan yang mustahil tidak bisa ditulis, dan itu cara paling murah menghapus sekelompok bug.
- Generics dipakai supaya tipe yang masuk tidak hilang saat keluar. Jangan dibuat lebih pintar daripada yang dibutuhkan.
- `as const` dan `satisfies` menjaga daftar pilihan dan tipenya tetap satu sumber kebenaran.
- Vite tidak memeriksa tipe. `tsc --noEmit` wajib ada di `pnpm check` dan di CI.
- Tipe hilang saat runtime. Data dari luar tetap harus diperiksa isinya.

## Masalah terbuka

Sekarang Anda punya bahasa yang menjaga bentuk data, perkakas yang menjaga kualitas, dan pengalaman langsung membangun aplikasi tanpa framework.

Yang belum terselesaikan justru keluhan dari Proyek 1, dan sekarang bisa dirumuskan dengan tepat:

1. Fungsi `render()` tunggal yang menggambar seluruh halaman tumbuh tanpa batas.
2. Menggambar ulang semuanya menghapus fokus, seleksi teks, dan posisi kursor pengguna.
3. Tidak ada cara memakai ulang satu potong UI beserta logikanya.
4. Hubungan "kalau state ini berubah, bagian itu harus ikut berubah" ditulis dengan tangan, dan itu pekerjaan yang paling mudah terlupa.

Keempatnya satu masalah yang sama: Anda memerintahkan perubahan satu per satu, padahal yang sebenarnya ingin Anda katakan adalah "tampilan itu adalah hasil dari data ini".

Itu isi modul berikutnya: React, model render-nya, dan kenapa mendeklarasikan tampilan sebagai fungsi dari state mengubah cara Anda menulis frontend.
