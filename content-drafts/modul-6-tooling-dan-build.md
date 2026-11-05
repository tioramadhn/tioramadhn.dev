---
title: 'Modul 6: Tooling dan Build Modern'
description: Dari tiga file tanpa dependensi jadi proyek sungguhan: package manager, Vite, bundler, linter, dan formatter. Perkakas yang membuat kode Anda bisa dirawat banyak orang.
date: 2026-11-13
slug: modul-6-tooling-dan-build
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Proyek 1 selesai dengan tiga file dan nol dependensi. Itu keadaan yang menyenangkan, dan tidak bertahan lama. Lima permintaan berikut cukup untuk merobohkannya:

| Permintaan | Yang dibutuhkan |
| --- | --- |
| "Pakai library grafik, jangan gambar SVG sendiri" | Cara memasang dan memperbarui kode orang lain |
| "Pecah jadi file per komponen" | Dua puluh file yang harus digabung sebelum dikirim |
| "Jangan kirim komentar dan spasi ke pengguna" | Minifikasi |
| "Halaman tidak boleh di-refresh tiap kali saya simpan file" | Dev server dengan pembaruan langsung |
| "Format kodenya disamakan di semua anggota tim" | Formatter dan linter yang jalan otomatis |

Modul ini tentang perkakas yang menjawab lima permintaan itu. Topiknya terasa membosankan dibanding React, dan tetap dikerjakan lebih dulu karena React, TypeScript, dan hampir semua yang menyusul hidup di atasnya.

## Masalahnya dulu: kenapa browser tidak cukup

Browser sudah bisa `import` sejak beberapa tahun lalu, jadi pertanyaannya wajar: kenapa masih butuh build?

```js
// Ini jalan di browser modern
import { formatRupiah } from './lib/format.js';

// Ini tidak. Browser tidak tahu harus mencari di mana.
import { format } from 'date-fns';
```

Baris kedua itu inti masalahnya. Penulisan `import` tanpa path, yang disebut bare specifier, adalah kesepakatan ekosistem Node, bukan aturan browser. Browser butuh alamat yang jelas, dan tidak punya daftar paket yang terpasang.

Empat masalah lain yang menyusul:

**Jumlah permintaan.** Dua ratus modul berarti dua ratus permintaan HTTP saat halaman dibuka. Jaringan dengan latensi tinggi, yang umum di Indonesia saat jam sibuk, membuatnya terasa jauh lebih lambat daripada satu file besar.

**Kode yang tidak dipakai.** Anda memakai satu fungsi dari sebuah library berisi dua ratus fungsi. Tanpa alat yang memangkas, pengguna mengunduh semuanya.

**Fitur yang belum didukung semua browser.** Sebagian pengguna Anda memakai HP berumur empat tahun yang tidak pernah diperbarui.

**Format yang beragam.** Sebagian paket di npm masih memakai format modul lama milik Node (CommonJS) yang tidak dikenal browser.

## Analogi: dari manuskrip ke buku cetak

Bayangkan Anda menulis buku. Yang Anda kerjakan adalah manuskrip: file terpisah per bab, catatan di pinggir halaman, dan beberapa bagian yang masih ditandai untuk diperiksa.

Yang dibeli pembaca bukan manuskrip itu. Yang dibeli adalah buku cetak: satu benda, tanpa catatan pinggir, halaman diberi nomor, bab yang tidak dipakai dibuang, dan ukurannya ditekan supaya ongkos kirimnya murah.

| Dunia penerbitan | Dunia frontend |
| --- | --- |
| Manuskrip per bab | File sumber Anda di `src/` |
| Penyunting bahasa | Linter dan formatter |
| Penata letak yang menyatukan bab | Bundler |
| Membuang bab yang tidak dipakai | Tree shaking |
| Memperkecil ukuran cetak | Minifikasi |
| Menerjemahkan ke bahasa lain | Transpilasi ke sintaks yang didukung browser lama |
| Daftar pustaka dengan nomor edisi | `package.json` dan lockfile |
| Satu cetakan percobaan untuk penulis | Dev server |

Batas analoginya: buku dicetak sekali lalu selesai, sedangkan proyek Anda dibangun ulang puluhan kali sehari. Karena itu kecepatan build jadi hal yang serius, dan jadi alasan Vite menggeser Webpack.

## Package manager dan dependensi

```bash
# Membuat proyek baru dengan Vite
pnpm create vite dasbor-cuaca --template vanilla
cd dasbor-cuaca
pnpm install
pnpm dev
```

Isi `package.json` yang perlu Anda pahami:

```json
{
  "name": "dasbor-cuaca",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "dependencies": {
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "vite": "^7.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.4.0"
  }
}
```

Lima hal yang menentukan:

**`dependencies` dan `devDependencies`.** Yang pertama ikut terkirim ke pengguna, yang kedua hanya dipakai saat mengembangkan. Memasang library ke tempat yang salah tidak langsung terasa, tapi membuat audit ukuran bundel membingungkan.

**Penanda versi.** `^4.1.0` berarti "4.1.0 sampai sebelum 5.0.0", `~4.1.0` berarti "4.1.x saja", dan `4.1.0` berarti tepat versi itu. Nomornya mengikuti semver: perubahan pertama berarti ada yang rusak, kedua berarti ada fitur baru, ketiga berarti perbaikan.

**Lockfile.** `pnpm-lock.yaml` mencatat versi persis setiap paket, termasuk dependensi dari dependensi. File ini **harus** masuk repositori. Tanpa lockfile, dua anggota tim bisa memasang versi berbeda dari penanda `^` yang sama, dan "jalan di komputer saya" jadi kalimat harian.

**Pilihan package manager.** npm sudah terpasang bersama Node. pnpm lebih cepat dan jauh lebih hemat ruang karena paket disimpan sekali lalu dihubungkan, serta lebih ketat: paket yang tidak Anda tulis di `package.json` tidak bisa diimpor diam-diam. Untuk proyek baru, pnpm pilihan yang wajar.

**Jumlah dependensi adalah keputusan, bukan detail.** Setiap paket adalah kode yang Anda kirim ke pengguna, permukaan keamanan yang bertambah, dan pekerjaan pemeliharaan di masa depan. Pertanyaan yang sehat sebelum memasang: ini menghemat berapa baris kode saya, dan menambah berapa kilobyte bagi pengguna?

## Dev server dan build: dua mode yang berbeda

Vite memakai dua mesin berbeda, dan memahami ini menjelaskan banyak hal:

**Saat `pnpm dev`**, Vite menyajikan file Anda sebagai modul ESM asli ke browser, tanpa menggabungkannya. Hanya file yang benar-benar diminta yang diproses, dan itu sebabnya dev server-nya hidup dalam sepersekian detik, berapa pun besar proyeknya. Saat Anda menyimpan file, hanya modul itu yang dikirim ulang, dan state halaman sebagian besar tetap bertahan. Fitur itu disebut HMR.

**Saat `pnpm build`**, Vite menggabungkan semuanya memakai Rollup, memangkas kode yang tidak dipakai, meminifikasi, memecah jadi beberapa potong berdasarkan rute, dan menambahkan hash pada nama file untuk keperluan cache.

```bash
pnpm build
# dist/index.html                  0.46 kB │ gzip:  0.30 kB
# dist/assets/index-DiwrgTda.css   1.21 kB │ gzip:  0.63 kB
# dist/assets/index-C8n7xkKt.js   18.40 kB │ gzip:  7.12 kB
```

Angka gzip itu yang sebenarnya diunduh pengguna, dan angka itu yang perlu Anda jaga. Modul 17 membahas batas yang wajar dan cara mengukurnya dengan serius.

Konfigurasinya singkat:

```js
// vite.config.js
import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      // Supaya import tidak jadi '../../../lib/format'
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  build: {
    sourcemap: true,
  },
});
```

Satu hal tentang variabel lingkungan yang wajib dipahami sejak sekarang:

```bash
# .env
VITE_API_URL=https://api.contoh.com
RAHASIA_DATABASE=jangan-pernah-begini
```

Hanya variabel berawalan `VITE_` yang dimasukkan ke kode browser, dan isinya **terlihat siapa pun** yang membuka DevTools. Build step tidak menyembunyikan apa pun. Kunci API yang bersifat rahasia tidak boleh ada di kode frontend, titik. Modul 13 dan 14 membahas tempatnya yang benar.

## Linter dan formatter

Dua alat ini sering dicampur, padahal tugasnya berbeda:

| | Formatter | Linter |
| --- | --- | --- |
| Contoh | Prettier | ESLint |
| Mengurus | Tampilan kode: kutip, koma, panjang baris, indentasi | Isi kode: variabel tidak terpakai, hook yang salah, `await` yang hilang |
| Pertanyaannya | "Apakah tampilannya seragam?" | "Apakah ini akan jadi bug?" |
| Perdebatannya | Tidak ada, karena diputuskan satu kali di config | Ada, dan memang perlu dibicarakan tim |

```js
// eslint.config.mjs
import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];
```

```json
// .prettierrc
{
  "singleQuote": true,
  "trailingComma": "es5"
}
```

Lalu pasang agar jalan otomatis sebelum commit, supaya pemeriksaannya tidak bergantung pada ingatan:

```bash
pnpm add -D husky lint-staged
pnpm exec husky init
echo "pnpm exec lint-staged" > .husky/pre-commit
```

```json
// package.json
{
  "lint-staged": {
    "*.{js,ts,css,md,json}": "prettier --write",
    "*.{js,ts}": "eslint --fix"
  }
}
```

Satu aturan yang menghemat banyak perdebatan tim: **biarkan formatter menang**. Jangan atur ulang baris dengan tangan, jangan berdebat soal panjang baris, dan jangan pernah memasukkan perubahan format bersama perubahan logika dalam satu commit. Diff yang bercampur format dan logika hampir tidak bisa ditelaah.

## Opsi tools

| Kategori | Pilihan | Catatan |
| --- | --- | --- |
| Build tool | Vite, Parcel, Webpack, Rspack | Vite jadi pilihan bawaan untuk proyek baru. Webpack masih banyak di proyek lama |
| Framework dengan build bawaan | Next.js, Astro, Remix | Build dikonfigurasi framework, bukan oleh Anda |
| Bundler di dalamnya | Rollup, esbuild, SWC, Rolldown | Jarang dipilih langsung kecuali Anda membuat library |
| Package manager | pnpm, npm, Bun, Yarn | pnpm untuk hemat ruang dan ketat soal dependensi |
| Linter | ESLint, Biome, oxlint | ESLint paling lengkap ekosistemnya. Biome dan oxlint jauh lebih cepat |
| Formatter | Prettier, Biome | Prettier untuk kompatibilitas, Biome kalau kecepatan jadi prioritas |

Aturan memilihnya: untuk aplikasi React biasa, pakai Vite atau langsung Next.js. Jangan menyusun konfigurasi bundler dari nol kecuali Anda punya kebutuhan yang benar-benar tidak terlayani, karena konfigurasi itu akan jadi pekerjaan pemeliharaan yang tidak ada ujungnya.

## Latihan

### Latihan 1: Pindahkan Proyek 1 ke Vite

Ubah dasbor cuaca Anda jadi proyek Vite dengan struktur berikut, lalu pastikan `pnpm build` menghasilkan `dist/` yang berjalan.

```text
dasbor-cuaca/
├── index.html
├── package.json
├── vite.config.js
├── eslint.config.mjs
├── .prettierrc
└── src/
    ├── main.js
    ├── style.css
    └── lib/
        ├── cuaca.js      (lapisan data)
        ├── format.js     (Intl)
        └── render.js     (penggambar tampilan)
```

Syaratnya: `index.html` berada di root proyek (bukan di `src/`), CSS diimpor dari JavaScript, alias `@` menunjuk ke `src`, `pnpm lint` bersih, dan `date-fns` dipakai untuk memformat tanggal prakiraan.

> [!petunjuk]
> Di Vite, `index.html` adalah titik masuk, bukan hasil build. Di dalamnya tag script menunjuk langsung ke file sumber: `<script type="module" src="/src/main.js"></script>`. CSS tidak lagi dipanggil lewat `<link>`, tapi lewat `import './style.css'` di JavaScript.

> [!jawaban]
>
> ```html
> <!-- index.html -->
> <script type="module" src="/src/main.js"></script>
> ```
>
> ```js
> // src/main.js
> import './style.css';
> import { ambilCuaca, cariKota } from '@/lib/cuaca.js';
> import { renderDasbor } from '@/lib/render.js';
> ```
>
> Empat hal yang biasanya jadi hambatan:
>
> 1. **`date-fns` masuk `dependencies`, bukan `devDependencies`**, karena kodenya ikut terkirim ke pengguna.
> 2. **Impor yang tepat menentukan ukuran.** `import { format } from 'date-fns'` hanya membawa fungsi yang dipakai karena library-nya mendukung tree shaking. `import * as dateFns from 'date-fns'` membawa semuanya. Buktikan dengan membandingkan keluaran `pnpm build` pada kedua versi.
> 3. **`dist/` masuk `.gitignore`.** Hasil build tidak disimpan di repositori, karena bisa dihasilkan ulang dan hanya membuat riwayat berisik.
> 4. **Variabel lingkungan dibaca lewat `import.meta.env.VITE_...`**, bukan `process.env`, karena `process` tidak ada di browser.
>
> Setelah ini, bandingkan ukuran `dist/assets/*.js` dengan ukuran `app.js` lama Anda. Pada proyek sekecil ini bundel bisa saja lebih besar karena ada `date-fns`, dan itu pelajaran yang sehat: build step bukan sihir pengecil, melainkan alat yang memberi Anda kendali dan ukuran yang bisa diukur.

### Latihan 2: Baca lockfile

Sebuah proyek punya `package.json` dengan `"date-fns": "^4.1.0"`. Tim merilis aplikasi pada Januari, dan pada Maret seorang anggota baru menjalankan `pnpm install` lalu melaporkan tampilan tanggal berubah.

Jawab empat pertanyaan:

1. Versi apa saja yang mungkin terpasang dari penanda `^4.1.0`?
2. Kalau lockfile ada di repositori dan tidak diubah, mungkinkah versinya berbeda?
3. Apa bedanya `pnpm install` dan `pnpm update` di sini?
4. Perubahan versi dari 4.1.0 ke 5.0.0 memberi tahu Anda apa, menurut semver?

> [!jawaban]
>
> 1. **4.1.0 sampai di bawah 5.0.0.** Jadi 4.2.0, 4.9.3, dan seterusnya, tapi tidak 5.0.0.
> 2. **Tidak, dan itu tujuan lockfile.** `pnpm install` menghormati lockfile dan memasang versi persis yang tercatat. Kalau anggota baru itu mendapat versi berbeda, kemungkinannya lockfile tidak ikut di-commit, atau dia menjalankan perintah yang memperbaruinya.
> 3. **`install` mengikuti lockfile, `update` sengaja menaikkan versi** sejauh yang diizinkan penanda, lalu menulis ulang lockfile. Perintah kedua wajib dijalankan dengan sengaja dan ditelaah, bukan dijalankan karena merasa "biar segar".
> 4. **Ada yang rusak.** Perubahan angka pertama berarti perubahan yang tidak kompatibel, jadi membaca catatan rilisnya wajib. Ini sekaligus alasan menyematkan versi persis untuk paket yang kritis, dan memakai alat seperti Renovate atau Dependabot supaya kenaikan versi datang sebagai pull request yang bisa ditelaah, bukan sebagai kejutan di hari rilis.

### Latihan 3: Lihat apa yang Anda kirim

Jalankan tiga percobaan pada proyek Vite Anda, dan catat ukuran gzip di setiap langkah:

1. Build apa adanya.
2. Tambahkan `import moment from 'moment'` lalu pakai satu fungsinya. Build lagi.
3. Ganti `moment` dengan `date-fns` atau `Intl.DateTimeFormat` bawaan. Build lagi.

Lalu pasang penganalisis bundel dan lihat isinya:

```bash
pnpm add -D rollup-plugin-visualizer
```

```js
// vite.config.js
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [visualizer({ filename: 'dist/stats.html' })],
});
```

> [!pembahasan]
>
> Hasil yang akan Anda lihat, kurang lebih:
>
> | Percobaan | Ukuran gzip | Catatan |
> | --- | --- | --- |
> | Apa adanya | sekitar 7 kB | Hanya kode Anda |
> | Dengan `moment` | bertambah sekitar 20 kB atau lebih | Library lama yang tidak bisa dipangkas, dan membawa semua locale |
> | Dengan `date-fns` | bertambah beberapa kB | Hanya fungsi yang dipakai yang ikut |
> | Dengan `Intl` bawaan | nol tambahan | Sudah ada di browser |
>
> Tiga pelajaran yang terpakai seumur karier:
>
> 1. **Tree shaking hanya bekerja pada library yang ditulis sebagai modul ESM** dan tanpa efek samping saat diimpor. Library gaya lama ikut semuanya, berapa pun yang Anda pakai.
> 2. **Pertanyaan pertama sebelum memasang paket**: apakah platform sudah menyediakannya? `Intl`, `fetch`, `URLSearchParams`, `crypto.randomUUID`, dan `structuredClone` menggantikan banyak library yang dulu wajib.
> 3. **Angka adalah alat argumen.** "Library ini berat" adalah pendapat. "Library ini menambah 23 kB gzip, 11% dari bundel kita" adalah fakta yang bisa dibawa ke diskusi tim.

### Latihan 4: Pagar kualitas sebelum commit

Pasang rangkaian berikut di proyek Anda, lalu buktikan bekerja dengan sengaja melakukan pelanggaran:

1. Prettier dengan konfigurasi tim, plus `.editorconfig`.
2. ESLint dengan aturan `no-unused-vars`, `eqeqeq`, dan `no-console` sebagai peringatan.
3. `husky` dan `lint-staged` yang memformat dan memeriksa file yang akan di-commit.
4. Satu skrip `pnpm check` yang menjalankan lint dan pemeriksaan format sekaligus.

> [!pembahasan]
>
> ```json
> {
>   "scripts": {
>     "check": "eslint . && prettier --check ."
>   }
> }
> ```
>
> Tiga catatan yang membedakan penyiapan yang bertahan dan yang ditinggalkan dua minggu kemudian:
>
> 1. **`pnpm check` harus ada, terpisah dari hook commit.** Hook bisa dilewati dengan `--no-verify`, dan memang perlu bisa dilewati saat keadaan darurat. Pemeriksaan yang mengikat adalah yang dijalankan di CI.
> 2. **Hook jangan dibuat lambat.** `lint-staged` hanya memeriksa file yang berubah, bukan seluruh proyek. Hook yang butuh tiga puluh detik akan dimatikan diam-diam oleh anggota tim.
> 3. **Aturan linter dinaikkan bertahap.** Memasang konfigurasi paling ketat pada proyek yang sudah berjalan menghasilkan dua ribu error dan satu tim yang menyerah. Mulai dari `recommended`, tambahkan aturan yang benar-benar pernah menyebabkan bug di tim Anda.
>
> Satu bagian terakhir yang pantas dikerjakan sekarang: jalankan `pnpm check` di GitHub Actions untuk setiap pull request. Delapan baris berkas YAML, dan sejak itu tidak ada lagi perdebatan format di kolom review.

## Batasnya

Perkakas di modul ini menjaga tampilan kode, menangkap variabel yang tidak dipakai, dan mengirim bundel yang kecil. Yang tidak bisa dilakukannya: mengerti bentuk data Anda.

Tidak satu pun alat di modul ini akan memprotes kode berikut:

```js
const pesanan = await ambilPesanan();
console.log(pesanan.jumlh); // salah tulis, undefined
total(pesanan.harga, 'dua'); // string di tempat angka
cuaca.data.suhu; // meledak kalau data masih kosong
```

Ketiganya baru terasa saat dijalankan, dan pada jalur yang jarang dilalui, bisa jadi baru terasa di tangan pengguna. ESLint tidak tahu `ambilPesanan` mengembalikan apa, dan tidak bisa tahu, karena JavaScript tidak pernah menuliskannya.

## Rangkuman

- Browser tidak mengerti `import 'nama-paket'`, dan dua ratus modul berarti dua ratus permintaan. Dua hal itu alasan dasar adanya build step.
- `package.json` menyatakan maksud, lockfile mencatat kenyataan. Lockfile wajib masuk repositori.
- Vite memakai ESM asli saat pengembangan untuk kecepatan, dan Rollup saat build untuk hasil yang kecil.
- Hanya variabel berawalan `VITE_` yang masuk ke kode browser, dan semuanya terlihat pengguna. Build step tidak menyembunyikan rahasia.
- Formatter mengurus tampilan, linter mengurus isi. Biarkan formatter menang, dan jangan campur commit format dengan commit logika.
- Setiap dependensi adalah kode yang dikirim ke pengguna. Periksa dulu apakah platform sudah menyediakannya.
- Angka ukuran bundel adalah alat argumen. Ukur, jangan berpendapat.

## Masalah terbuka

Proyek Anda sekarang punya perkakas yang layak. Tapi contoh di bagian "Batasnya" masih berlaku, dan masalahnya membesar persis saat tim membesar.

Bayangkan Anda mengganti nama field `suhu` jadi `suhuCelsius` di lapisan data. Siapa yang memberi tahu Anda ada enam tempat lain yang masih memakai nama lama? Pada proyek lima file, pencarian teks cukup. Pada proyek dua ratus file dengan empat orang yang mengerjakannya bersamaan, pencarian teks adalah doa.

Bagaimana cara menuliskan bentuk data, lalu meminta mesin memeriksa seluruh proyek sebelum kode itu sampai ke pengguna?

Itu isi modul berikutnya: TypeScript, mulai dari yang benar-benar dipakai sehari-hari sampai cara memberi tipe pada data yang datang dari server.
