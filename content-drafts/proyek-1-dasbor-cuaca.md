---
title: 'Proyek 1: Dasbor Cuaca Tanpa Framework'
description: Menggabungkan HTML semantik, CSS grid, fetch, dan state yang dikelola tangan jadi satu aplikasi yang benar-benar dipakai, lalu merasakan sendiri di mana pendekatan ini mulai sesak.
date: 2026-11-12
slug: proyek-1-dasbor-cuaca
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Lima modul pertama memberi lima hal yang sekarang dipakai sekaligus:

| Dari modul | Yang dipakai di proyek ini |
| --- | --- |
| 1 | Memeriksa permintaan di DevTools, dan sadar apa yang menunda tampilan pertama |
| 2 | Landmark, hierarki heading, form pencarian yang benar |
| 3 | Grid responsif, `clamp()`, custom property, mode gelap |
| 4 | `fetch` dengan penanganan error, `Promise.all`, pengolahan array |
| 5 | Satu sumber kebenaran, `render()`, event delegation, state di URL |

Hasil akhirnya satu halaman: dasbor cuaca untuk beberapa kota yang bisa ditambah dan dihapus, dengan prakiraan lima hari. Tanpa framework, tanpa build step, tanpa dependensi. Satu file HTML, satu CSS, satu JavaScript, dibuka langsung di browser.

Alasan proyek ini dikerjakan tanpa framework bukan nostalgia. Tujuannya supaya Anda punya pengalaman langsung dengan masalah yang nanti diselesaikan React, sehingga React terasa seperti jawaban, bukan seperti aturan yang harus dihafal.

## Data yang dipakai

[Open-Meteo](https://open-meteo.com) menyediakan data cuaca gratis tanpa kunci API dan tanpa pendaftaran, jadi tidak ada rahasia yang perlu disembunyikan dan proyek ini tetap aman dibuka publik.

Dua endpoint yang dibutuhkan:

```text
# Mencari kota berdasarkan nama
https://geocoding-api.open-meteo.com/v1/search?name=Bandung&count=5&language=id

# Cuaca sekarang dan prakiraan harian
https://api.open-meteo.com/v1/forecast
  ?latitude=-6.9&longitude=107.6
  &current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m
  &daily=weather_code,temperature_2m_max,temperature_2m_min
  &timezone=auto
```

Buka keduanya di tab browser sekarang, lihat bentuk JSON-nya, dan catat satu hal: `weather_code` berupa angka. Memetakan angka itu jadi teks berbahasa Indonesia adalah salah satu pekerjaan Anda.

## Spesifikasi wajib

### A. Fungsi

1. Mencari kota lewat form, menampilkan hasil pencarian, dan menambahkannya ke dasbor.
2. Menampilkan kartu per kota: nama, suhu sekarang, kondisi dalam bahasa Indonesia, kelembapan, kecepatan angin.
3. Menampilkan prakiraan lima hari pada setiap kartu: tanggal, suhu minimum, suhu maksimum, kondisi.
4. Menghapus kota dari dasbor.
5. Mengurutkan kartu berdasarkan suhu tertinggi atau nama kota.
6. Menyegarkan semua data dengan satu tombol, beserta waktu pembaruan terakhir.

### B. Keadaan yang wajib ditangani

Ini bagian yang paling sering dilewati pemula, dan yang paling sering ditanyakan dalam wawancara:

| Keadaan | Yang harus terlihat |
| --- | --- |
| Pertama dibuka, belum ada kota | Ajakan yang jelas, bukan halaman kosong |
| Sedang memuat | Penanda per kartu, bukan satu spinner yang menutup seluruh halaman |
| Pencarian tanpa hasil | "Kota tidak ditemukan", dengan saran mengecek ejaan |
| Permintaan gagal | Pesan yang menyebut apa yang gagal, plus tombol coba lagi |
| Sedang offline | Pemberitahuan, dan data terakhir tetap ditampilkan |
| Satu kota gagal, lainnya berhasil | Hanya kartu yang gagal yang menunjukkan error |

### C. Kualitas

7. State kota tersimpan di `localStorage`, jadi dasbor tetap utuh setelah tab ditutup.
8. Urutan dan satuan suhu tersimpan di URL, jadi tampilan bisa dibagikan.
9. Bisa dioperasikan sepenuhnya dengan keyboard, dengan indikator fokus yang jelas.
10. Hasil pencarian dan pembaruan data diumumkan lewat `aria-live`.
11. Mode gelap mengikuti pengaturan sistem.
12. Lulus tanpa error di [validator.w3.org](https://validator.w3.org) dan tanpa error di console.

## Struktur file

```text
dasbor-cuaca/
├── index.html
├── style.css
└── app.js
```

Tiga file, tanpa `node_modules`. Simpan di satu folder dan buka `index.html` di browser.

Satu catatan: karena `app.js` akan memakai `import`, halaman harus disajikan lewat HTTP, bukan dibuka sebagai `file://`. Cara tercepat tanpa memasang apa pun adalah ekstensi "Live Server" di VS Code. Kalau Node sudah terpasang, `npx serve` juga cukup.

## Markup

Mulai dari struktur, karena struktur yang benar membuat sisanya lebih mudah.

```html
<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dasbor Cuaca</title>
    <meta name="description" content="Pantau cuaca beberapa kota sekaligus." />
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <header>
      <h1>Dasbor Cuaca</h1>

      <form id="form-cari" role="search">
        <label for="kota">Cari kota</label>
        <input
          id="kota"
          name="kota"
          type="search"
          autocomplete="off"
          placeholder="Bandung"
          aria-describedby="bantuan-cari"
        />
        <button type="submit">Cari</button>
        <p id="bantuan-cari">Tekan Enter untuk mencari, lalu pilih dari hasil.</p>
      </form>

      <div>
        <label for="urut">Urutkan</label>
        <select id="urut">
          <option value="nama">Nama kota</option>
          <option value="suhu">Suhu tertinggi</option>
        </select>

        <button type="button" id="segarkan">Segarkan semua</button>
        <p id="pembaruan"></p>
      </div>
    </header>

    <main>
      <!-- Diumumkan pembaca layar saat isinya berubah -->
      <p id="status" role="status" aria-live="polite"></p>

      <section aria-labelledby="judul-hasil" id="wadah-hasil" hidden>
        <h2 id="judul-hasil">Hasil pencarian</h2>
        <ul id="hasil"></ul>
      </section>

      <section aria-labelledby="judul-dasbor">
        <h2 id="judul-dasbor">Kota yang dipantau</h2>
        <ul id="dasbor"></ul>
      </section>
    </main>

    <footer>
      <p>Data dari Open-Meteo. Dibuat tanpa framework.</p>
    </footer>

    <script type="module" src="app.js"></script>
  </body>
</html>
```

Empat keputusan yang layak diperhatikan:

1. **`role="search"` pada form** menjadikannya landmark, sehingga pengguna pembaca layar bisa melompat langsung ke pencarian.
2. **`aria-labelledby` pada setiap `section`** memberi nama pada bagian, supaya daftar landmark tidak berisi dua "section" tanpa keterangan.
3. **`<p id="status">`** adalah satu-satunya tempat pengumuman. Satu wilayah live sudah cukup, dan terlalu banyak justru membuat pembaca layar berisik.
4. **Daftar kartu memakai `ul` dan `li`**, bukan `div`. Pembaca layar akan menyebutkan "daftar, 4 item", dan itu informasi yang berguna.

## Bentuk state

Sebelum menulis logika, putuskan bentuk datanya. Keputusan ini menentukan kerumitan seluruh aplikasi.

```js
const state = {
  // Sumber kebenaran: kota yang dipantau
  kota: [
    // { id, nama, negara, lat, lon }
  ],

  // Data cuaca per kota, dipisahkan dari daftar kotanya
  cuaca: {
    // [idKota]: { status: 'memuat' | 'siap' | 'gagal', data, pesan }
  },

  hasilCari: [],
  statusCari: 'siaga', // 'siaga' | 'memuat' | 'kosong' | 'gagal'
  urut: 'nama',
  diperbaruiPada: null,
  offline: !navigator.onLine,
};
```

Tiga keputusan desain yang sengaja diambil, dan masing-masing punya alasan.

**Cuaca dipisahkan dari daftar kota.** Alternatifnya menyimpan cuaca di dalam objek kota. Kelihatan lebih rapi, tapi membuat dua hal dengan umur berbeda bercampur: daftar kota bertahan di `localStorage` selamanya, sedangkan data cuaca kedaluwarsa dalam hitungan menit. Memisahkannya membuat penyimpanan jadi sederhana, karena hanya `state.kota` yang perlu disimpan.

**Status disimpan per kota, bukan satu status global.** Dengan satu status global, satu kota yang gagal membuat seluruh dasbor terlihat gagal. Dengan status per kota, lima kartu bisa berada di lima keadaan berbeda secara bersamaan, dan itu memang yang terjadi di jaringan nyata.

**Urutan tidak disimpan sebagai array hasil.** `state.urut` hanya menyimpan pilihannya, dan pengurutan dilakukan saat render. Menyimpan array yang sudah terurut berarti punya dua sumber kebenaran, dan Latihan 2 di modul 5 sudah menunjukkan akibatnya.

## Lapisan data

Pisahkan kode yang bicara dengan jaringan dari kode yang menggambar halaman. Pemisahan ini yang nanti membuat migrasi ke React hampir tidak menyentuh bagian ini.

```js
// app.js
const KODE_CUACA = {
  0: 'Langit cerah',
  1: 'Sebagian besar cerah',
  2: 'Berawan sebagian',
  3: 'Berawan',
  45: 'Berkabut',
  51: 'Gerimis ringan',
  61: 'Hujan ringan',
  63: 'Hujan sedang',
  65: 'Hujan lebat',
  80: 'Hujan lokal',
  95: 'Badai petir',
};

function bacaKondisi(kode) {
  return KODE_CUACA[kode] ?? 'Kondisi tidak diketahui';
}

async function mintaJson(url, signal) {
  const respons = await fetch(url, { signal });

  if (!respons.ok) {
    throw new Error(
      respons.status >= 500
        ? 'Layanan cuaca sedang bermasalah'
        : `Permintaan tidak dapat diproses (${respons.status})`
    );
  }

  return respons.json();
}

async function cariKota(nama, signal) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', nama);
  url.searchParams.set('count', '5');
  url.searchParams.set('language', 'id');

  const data = await mintaJson(url, signal);

  return (data.results ?? []).map((item) => ({
    id: String(item.id),
    nama: item.name,
    negara: item.country ?? '',
    lat: item.latitude,
    lon: item.longitude,
  }));
}

async function ambilCuaca({ lat, lon }, signal) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m'
  );
  url.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min'
  );
  url.searchParams.set('timezone', 'auto');

  const data = await mintaJson(url, signal);

  // Bentuk respons API diubah jadi bentuk yang nyaman untuk tampilan.
  // Komponen tidak boleh dipaksa mengerti nama field milik pihak ketiga.
  return {
    suhu: Math.round(data.current.temperature_2m),
    kelembapan: data.current.relative_humidity_2m,
    angin: Math.round(data.current.wind_speed_10m),
    kondisi: bacaKondisi(data.current.weather_code),
    harian: data.daily.time.slice(0, 5).map((tanggal, i) => ({
      tanggal,
      min: Math.round(data.daily.temperature_2m_min[i]),
      max: Math.round(data.daily.temperature_2m_max[i]),
      kondisi: bacaKondisi(data.daily.weather_code[i]),
    })),
  };
}
```

Fungsi `ambilCuaca` melakukan satu hal yang sering dilewati: **mengubah bentuk respons API jadi bentuk yang cocok untuk tampilan**. Tanpa lapisan ini, nama field seperti `relative_humidity_2m` menyebar ke seluruh kode render, dan satu perubahan di API pihak ketiga memaksa Anda menyentuh sepuluh tempat.

## Render dan aksi

```js
let timerCari;
let kendaliCari;

function ubahState(perubahan) {
  Object.assign(state, perubahan);
  simpan();
  render();
}

function simpan() {
  try {
    localStorage.setItem('kota-dipantau', JSON.stringify(state.kota));
  } catch {
    // Mode privat atau penyimpanan penuh. Fitur simpan hilang, aplikasi jalan.
  }
}

function urutkan(daftar) {
  const salinan = [...daftar];

  if (state.urut === 'suhu') {
    return salinan.sort((a, b) => {
      const suhuA = state.cuaca[a.id]?.data?.suhu ?? -Infinity;
      const suhuB = state.cuaca[b.id]?.data?.suhu ?? -Infinity;
      return suhuB - suhuA;
    });
  }

  return salinan.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
}

function render() {
  renderHasilCari();
  renderDasbor();

  pembaruan.textContent = state.diperbaruiPada
    ? `Diperbarui ${new Intl.DateTimeFormat('id-ID', { timeStyle: 'short' }).format(state.diperbaruiPada)}`
    : '';
}

async function tambahKota(kota) {
  if (state.kota.some((k) => k.id === kota.id)) {
    ubahState({ statusCari: 'siaga', hasilCari: [] });
    status.textContent = `${kota.nama} sudah ada di dasbor`;
    return;
  }

  ubahState({
    kota: [...state.kota, kota],
    cuaca: { ...state.cuaca, [kota.id]: { status: 'memuat' } },
    hasilCari: [],
    statusCari: 'siaga',
  });

  await muatCuaca(kota);
  status.textContent = `${kota.nama} ditambahkan ke dasbor`;
}

async function muatCuaca(kota) {
  try {
    const data = await ambilCuaca(kota);
    ubahState({
      cuaca: { ...state.cuaca, [kota.id]: { status: 'siap', data } },
      diperbaruiPada: new Date(),
    });
  } catch (error) {
    ubahState({
      cuaca: {
        ...state.cuaca,
        // Data lama dipertahankan, supaya kartu tidak jadi kosong saat gagal
        [kota.id]: {
          status: 'gagal',
          pesan: error.message,
          data: state.cuaca[kota.id]?.data,
        },
      },
    });
  }
}

async function segarkanSemua() {
  ubahState({
    cuaca: Object.fromEntries(
      state.kota.map((k) => [
        k.id,
        { status: 'memuat', data: state.cuaca[k.id]?.data },
      ])
    ),
  });

  // Bersamaan, bukan berurutan. Lima kota tidak perlu lima kali lebih lama.
  await Promise.allSettled(state.kota.map((k) => muatCuaca(k)));
  status.textContent = 'Data cuaca diperbarui';
}
```

Perhatikan satu pola yang berulang: saat gagal, data lama tetap dipertahankan dan hanya statusnya yang berubah. Kartu yang menunjukkan "suhu 24 derajat, gagal diperbarui" jauh lebih berguna daripada kartu yang jadi kosong.

Event memakai delegation, seperti di modul 5:

```js
dasbor.addEventListener('click', (peristiwa) => {
  const hapus = peristiwa.target.closest('[data-hapus]');
  if (hapus) {
    const id = hapus.dataset.hapus;
    const nama = state.kota.find((k) => k.id === id)?.nama ?? 'Kota';
    const { [id]: dibuang, ...sisa } = state.cuaca;

    ubahState({ kota: state.kota.filter((k) => k.id !== id), cuaca: sisa });
    status.textContent = `${nama} dihapus dari dasbor`;
    return;
  }

  const coba = peristiwa.target.closest('[data-coba-lagi]');
  if (coba) {
    const kota = state.kota.find((k) => k.id === coba.dataset.cobaLagi);
    if (kota) muatCuaca(kota);
  }
});

window.addEventListener('online', () => ubahState({ offline: false }));
window.addEventListener('offline', () => ubahState({ offline: true }));
```

## Yang harus Anda kerjakan sendiri

Potongan di atas sengaja tidak lengkap. Empat bagian ini bagian Anda:

1. **`renderDasbor()` dan `renderHasilCari()`.** Gambar kartu dari `state`, tangani keenam keadaan di tabel spesifikasi B, dan jangan lupa kartu dengan status `gagal` yang masih punya `data` lama.
2. **Pencarian dengan debounce dan pembatalan**, memakai `timerCari` dan `kendaliCari` yang sudah disiapkan. Rujuk Latihan 3 modul 5.
3. **Urutan dan satuan suhu di URL**, dibaca saat halaman dimuat dan ditulis dengan `history.replaceState`. Tambahkan satuan Fahrenheit sebagai pilihan.
4. **CSS lengkap**: grid `auto-fit` untuk kartu, `clamp()` untuk judul, custom property untuk warna, mode gelap, `:focus-visible`, dan `prefers-reduced-motion`.

## Memasang di internet

Hasil kerja yang tidak bisa dibuka orang lain sulit dinilai, dan tautannya berguna untuk lamaran kerja. Karena proyek ini tanpa build step, hostingnya gratis dan cepat:

| Cara | Langkahnya |
| --- | --- |
| Cloudflare Pages | Hubungkan repositori GitHub, kosongkan build command, atur output directory ke root |
| GitHub Pages | Settings, Pages, pilih branch `main` dan folder root |
| Netlify Drop | Seret folder proyek ke app.netlify.com/drop |

Setelah online, jalankan Lighthouse pada URL publiknya. Catat empat angkanya, simpan tangkapan layarnya, dan bandingkan dengan hasil proyek-proyek berikutnya di seri ini.

## Checklist penilaian

Kerjakan sendiri sebelum menganggap proyek ini selesai:

| # | Yang diperiksa |
| --- | --- |
| 1 | Dari keyboard saja: cari kota, tambahkan, urutkan, hapus. Semua bisa? |
| 2 | Matikan jaringan di DevTools, lalu tekan "Segarkan semua". Pesannya jelas, data lama tetap ada? |
| 3 | Ubah satu URL API jadi salah, muat ulang. Satu kartu gagal, kartu lain tetap jalan? |
| 4 | Hapus semua kota. Tampilan kosongnya memberi ajakan, bukan halaman putih? |
| 5 | Tutup tab, buka lagi. Daftar kota kembali? |
| 6 | Salin URL setelah mengurutkan dan membuka di tab lain. Urutannya sama? |
| 7 | Validator W3C bersih, console tanpa error? |
| 8 | Zoom teks 200%. Masih terbaca dan tidak ada yang terpotong? |
| 9 | `prefers-color-scheme: dark` di DevTools. Kontras masih memenuhi 4.5:1? |
| 10 | Pencarian "bandung" mengirim berapa permintaan? Harus satu, bukan tujuh. |

## Tantangan bonus

Kalau sepuluh poin di atas sudah hijau:

- **Simpan cache cuaca** dengan waktu kedaluwarsa 10 menit, supaya memuat ulang halaman tidak selalu memanggil API.
- **Grafik suhu lima hari** memakai `<svg>` yang Anda susun sendiri dari data, tanpa library.
- **Deteksi lokasi pengguna** dengan `navigator.geolocation`, lengkap dengan penanganan penolakan izin.
- **Pengurutan drag and drop** memakai HTML Drag and Drop API, dengan alternatif tombol naik turun untuk pengguna keyboard.

Yang terakhir itu latihan yang jauh lebih berharga daripada kelihatannya: drag and drop tanpa alternatif keyboard adalah fitur yang menyingkirkan sebagian pengguna, dan itu keputusan yang akan Anda hadapi di pekerjaan nyata.

## Rangkuman

- Lapisan data dipisahkan dari lapisan tampilan, dan respons API diubah ke bentuk milik aplikasi Anda sendiri. Pemisahan itu yang membuat kode bertahan saat API pihak ketiga berubah.
- Status disimpan per item, bukan satu status global, supaya satu kegagalan tidak merobohkan seluruh tampilan.
- Data lama dipertahankan saat pembaruan gagal. Kartu usang lebih berguna daripada kartu kosong.
- State yang perlu dibagikan tempatnya di URL, state yang perlu bertahan di `localStorage`, sisanya di memori.
- Enam keadaan tampilan (kosong, memuat, tanpa hasil, gagal, offline, sebagian gagal) adalah bagian dari fitur, bukan pekerjaan tambahan.

## Masalah terbuka

Proyek ini jalan, dan kalau Anda mengerjakannya dengan sungguh-sungguh, dua keluhan muncul sendiri.

**Keluhan pertama: `render()` jadi fungsi terbesar di proyek.** Kartu cuaca, hasil pencarian, pesan status, waktu pembaruan, dan tampilan kosong semuanya digambar dari satu tempat. Menambah grafik suhu berarti menambahnya lagi ke fungsi yang sama.

**Keluhan kedua: menggambar ulang menghapus hal yang sedang dipakai pengguna.** Setiap `render()` membuat elemen baru, jadi kalau pengguna sedang menyeleksi teks di kartu atau fokus sedang berada di tombolnya, semuanya lepas. Anda bisa menambal dengan menyimpan dan memulihkan fokus, dan tambalan itu akan terus bertambah.

Tapi sebelum beranjak ke alat yang menjawab dua keluhan itu, ada hambatan yang lebih dasar. Proyek ini masih tiga file tanpa dependensi. Begitu Anda ingin memakai library orang lain, memecah kode jadi dua puluh modul, dan mengirim satu bundel kecil yang sudah dioptimalkan ke pengguna, cara kerja "buka index.html di browser" berhenti memadai.

Itu isi modul berikutnya: package manager, Vite, bundler, dan perkakas yang menjaga kualitas kode sebelum masuk ke repositori.
