---
title: 'Proyek 2: Katalog Serial dan Film dengan React dan TypeScript'
description: Pencarian yang bisa dibagikan lewat tautan, halaman detail dengan routing, daftar favorit yang bertahan, dan tipe yang diturunkan dari respons API. Empat modul terakhir dipakai sekaligus.
date: 2026-11-19
slug: proyek-2-katalog-film-react
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Empat modul terakhir memberi perkakas, bahasa, dan cara berpikir. Proyek ini memakai keempatnya pada aplikasi yang lebih besar daripada dasbor cuaca:

| Dari modul | Yang dipakai di proyek ini |
| --- | --- |
| 7 | Vite, pnpm, ESLint, Prettier, Git, `pnpm check` yang jalan di CI |
| 8 | Tipe respons API dipisah dari tipe aplikasi, discriminated union untuk keadaan |
| 9 | Komponen, komposisi, `key` yang benar, nilai turunan yang dihitung bukan disimpan |
| 10 | Custom hook, `useEffect` dengan pembatalan, Context untuk tema, `useReducer` untuk filter, dan routing dengan URL sebagai sumber kebenaran |

Hasil akhirnya aplikasi dengan tiga halaman: daftar hasil pencarian, halaman detail, dan halaman favorit. Yang membedakannya dari tutorial katalog biasa ada di tiga syarat: pencarian harus bisa dibagikan lewat tautan, halaman detail harus bisa dibuka langsung tanpa melewati halaman daftar, dan semua keadaan gagal harus punya tampilan sendiri.

## Data yang dipakai

[TVmaze](https://www.tvmaze.com/api) menyediakan data serial dan film secara gratis, tanpa kunci API, tanpa pendaftaran, dan sudah mengizinkan permintaan dari browser.

```text
# Mencari judul
https://api.tvmaze.com/search/shows?q=breaking+bad

# Detail satu judul, beserta pemain dan episode
https://api.tvmaze.com/shows/169?embed[]=cast&embed[]=episodes

# Daftar untuk halaman awal
https://api.tvmaze.com/shows?page=0
```

Buka ketiganya sekarang dan perhatikan tiga hal yang akan jadi pekerjaan Anda: `summary` berisi HTML (bukan teks biasa), `image` bisa bernilai `null`, dan `rating.average` juga bisa `null`. Data nyata selalu berlubang, dan menangani lubangnya adalah bagian dari pekerjaan.

Soal kunci API, karena ini pertanyaan yang pasti muncul: layanan populer seperti TMDB butuh kunci, dan kunci itu akan terlihat siapa pun yang membuka DevTools kalau ditaruh di kode frontend. Modul 7 sudah menegaskannya. Untuk proyek ini kunci dihindari sama sekali, dan Proyek 4 nanti menunjukkan tempat yang benar untuk kunci rahasia, yaitu di server.

## Spesifikasi wajib

### A. Halaman dan routing

1. `/` menampilkan daftar pilihan populer, dan hasil pencarian kalau ada parameter `?q=`.
2. `/judul/:id` menampilkan detail: poster, sinopsis, genre, rating, jadwal tayang, dan daftar pemain.
3. `/favorit` menampilkan daftar favorit pengguna.
4. Alamat yang tidak dikenal menampilkan halaman 404 dengan tautan kembali.
5. Setiap halaman mengubah `document.title` sesuai isinya.

### B. Pencarian

6. Kata kunci tersimpan di URL sebagai `?q=`, jadi tautannya bisa dibagikan dan tombol kembali bekerja.
7. Permintaan ditunda 300 milidetik setelah pengguna berhenti mengetik.
8. Permintaan lama dibatalkan saat kata kunci berubah.
9. Filter genre dan pengurutan (nama, rating) juga tersimpan di URL.

### C. Favorit

10. Menambah dan menghapus favorit dari halaman daftar maupun halaman detail.
11. Favorit bertahan setelah tab ditutup.
12. Jumlah favorit tampil di navigasi, dan angkanya tidak pernah berselisih dengan daftarnya.

### D. Keadaan yang wajib ditangani

| Keadaan | Yang harus terlihat |
| --- | --- |
| Belum mencari apa pun | Daftar pilihan populer, bukan halaman kosong |
| Sedang memuat | Kerangka kartu (skeleton) seukuran kartu aslinya, bukan tulisan "Loading" |
| Tidak ada hasil | Pesan yang menyebut kata kuncinya, plus saran |
| Gagal memuat | Pesan beserta tombol coba lagi yang benar-benar mencoba lagi |
| Detail tidak ditemukan | Halaman 404, bukan layar kosong atau error di console |
| Favorit kosong | Ajakan mencari, bukan daftar kosong tanpa keterangan |
| Gambar tidak ada | Penampung dengan ukuran yang sama, bukan ikon gambar rusak |

Poin terakhir itu yang paling sering dilewati, dan penyebab CLS yang Anda temui di modul 1.

### E. Kualitas

13. Tanpa satu pun `any`, dan `pnpm tsc --noEmit` bersih.
14. Bisa dioperasikan penuh dengan keyboard, termasuk hasil pencarian dan tombol favorit.
15. Perubahan jumlah hasil diumumkan lewat `aria-live`.
16. Mode gelap mengikuti pengaturan sistem, dan bisa diubah manual lewat Context.
17. Responsif dari 360px tanpa gulir horizontal.

### Garis finis

| Tingkat | Syarat | Artinya |
| --- | --- | --- |
| **Inti** | 1 sampai 8, plus keadaan memuat, kosong, dan gagal | Tiga halaman jalan, pencarian bisa dibagikan, kegagalan ditangani |
| **Lengkap** | Seluruh 1 sampai 17, plus ketujuh keadaan | Pekerjaan yang pantas ditaruh di portofolio |
| **Bonus** | Bagian "Tantangan bonus" | Opsional sepenuhnya |

Syarat 13 (`tsc --noEmit` bersih tanpa `any`) termasuk Inti meski nomornya di belakang. Membiarkan `any` menumpuk di proyek ini membuat Proyek 3 jauh lebih menyakitkan.

## Struktur folder

Pakai pembagian berdasarkan fitur, bukan berdasarkan jenis berkas. Pembagian ini bertahan jauh lebih lama saat aplikasi membesar.

```text
src/
├── main.tsx
├── router.tsx
├── app/
│   ├── Layout.tsx          (header, nav, footer, Outlet)
│   └── TemaProvider.tsx
├── fitur/
│   ├── pencarian/
│   │   ├── HalamanDaftar.tsx
│   │   ├── FormCari.tsx
│   │   ├── FilterGenre.tsx
│   │   └── useHasilCari.ts
│   ├── detail/
│   │   ├── HalamanDetail.tsx
│   │   ├── DaftarPemain.tsx
│   │   └── useDetail.ts
│   └── favorit/
│       ├── HalamanFavorit.tsx
│       ├── TombolFavorit.tsx
│       └── useFavorit.ts
├── komponen/
│   ├── KartuJudul.tsx
│   ├── Kerangka.tsx
│   ├── KeadaanKosong.tsx
│   └── KeadaanGagal.tsx
└── lib/
    ├── tvmaze.ts           (lapisan data, satu-satunya yang tahu bentuk API)
    ├── tipe.ts
    └── format.ts
```

Satu aturan yang membuat struktur ini bekerja: **`komponen/` hanya boleh berisi komponen yang tidak tahu apa pun tentang domain aplikasi.** `KartuJudul` menerima data lewat props dan tidak pernah memanggil `fetch`. Begitu sebuah komponen butuh tahu soal pencarian, tempatnya pindah ke `fitur/pencarian/`.

## Lapisan data dan tipe

```ts
// lib/tipe.ts

// Bentuk mentah dari TVmaze, hanya field yang dipakai
interface ResponsShow {
  id: number;
  name: string;
  genres: string[];
  status: string;
  premiered: string | null;
  summary: string | null;
  rating: { average: number | null };
  image: { medium: string; original: string } | null;
  schedule: { time: string; days: string[] };
}

// Bentuk milik aplikasi: tidak ada null yang menyebar ke komponen
export interface Judul {
  id: string;
  nama: string;
  genre: string[];
  status: string;
  tahun: number | null;
  sinopsis: string; // HTML sudah dibersihkan jadi teks
  rating: number | null;
  poster: { kecil: string; besar: string } | null;
  jadwal: string; // sudah dirangkai jadi teks siap tampil
}

export type Keadaan<T> =
  | { status: 'siaga' }
  | { status: 'memuat' }
  | { status: 'kosong' }
  | { status: 'siap'; data: T }
  | { status: 'gagal'; pesan: string };
```

```ts
// lib/tvmaze.ts
const DASAR = 'https://api.tvmaze.com';

function bersihkanHtml(html: string | null): string {
  if (!html) return 'Sinopsis belum tersedia.';

  // summary dari API berisi tag HTML. Diubah jadi teks biasa,
  // supaya tidak pernah ada kebutuhan memakai dangerouslySetInnerHTML.
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent?.trim() ?? '';
}

function keJudul(mentah: ResponsShow): Judul {
  return {
    id: String(mentah.id),
    nama: mentah.name,
    genre: mentah.genres,
    status: mentah.status,
    tahun: mentah.premiered ? Number(mentah.premiered.slice(0, 4)) : null,
    sinopsis: bersihkanHtml(mentah.summary),
    rating: mentah.rating.average,
    poster: mentah.image
      ? { kecil: mentah.image.medium, besar: mentah.image.original }
      : null,
    jadwal:
      mentah.schedule.days.length > 0
        ? `${mentah.schedule.days.join(', ')} pukul ${mentah.schedule.time || 'tidak tetap'}`
        : 'Jadwal tidak tetap',
  };
}

async function minta<T>(path: string, signal?: AbortSignal): Promise<T> {
  const respons = await fetch(`${DASAR}${path}`, { signal });

  if (respons.status === 404) throw new TidakDitemukan();
  if (!respons.ok) {
    throw new Error(
      respons.status >= 500
        ? 'Layanan sedang bermasalah, coba beberapa saat lagi'
        : `Permintaan tidak dapat diproses (${respons.status})`
    );
  }

  return respons.json() as Promise<T>;
}

export class TidakDitemukan extends Error {
  constructor() {
    super('Judul tidak ditemukan');
    this.name = 'TidakDitemukan';
  }
}

export async function cariJudul(q: string, signal?: AbortSignal): Promise<Judul[]> {
  const hasil = await minta<Array<{ show: ResponsShow }>>(
    `/search/shows?q=${encodeURIComponent(q)}`,
    signal
  );

  return hasil.map((item) => keJudul(item.show));
}

export async function ambilDetail(id: string, signal?: AbortSignal): Promise<Judul> {
  return keJudul(await minta<ResponsShow>(`/shows/${id}`, signal));
}
```

Tiga keputusan yang layak diperhatikan, karena ketiganya pertanyaan wawancara yang sering muncul:

**Kelas error sendiri untuk 404.** Dengan `TidakDitemukan` sebagai tipe error tersendiri, komponen detail bisa membedakan "judul ini tidak ada" (tampilkan 404) dari "jaringan bermasalah" (tampilkan tombol coba lagi). Membedakannya dengan memeriksa teks pesan error adalah cara yang rapuh.

**HTML dari API diubah jadi teks di lapisan data.** Alternatifnya menampilkannya dengan `dangerouslySetInnerHTML`, dan itu membuka pintu XSS untuk HTML yang bukan Anda yang kendalikan. Menguranginya jadi teks biasa di satu tempat menutup pintu itu sekali untuk seluruh aplikasi.

**`null` tidak dibiarkan menyebar.** `summary` yang kosong jadi teks bawaan, `schedule` yang kosong jadi "Jadwal tidak tetap". `rating` dan `poster` memang dibiarkan `null` karena tampilannya memang berbeda, dan tipenya menyatakan itu dengan jujur sehingga komponen dipaksa menanganinya.

## Routing dan state di URL

Routing-nya sudah Anda pasang di Latihan 5 Modul 10, termasuk daftar rute, `Layout` dengan `Outlet`, dan halaman 404. Pakai kerangka itu apa adanya dengan tiga rute proyek ini: `/`, `/judul/:id`, dan `/favorit`.

Yang jadi pekerjaan baru di sini satu hal, dan ini bagian yang paling sering dikerjakan setengah jalan: **tiga keadaan sekaligus** (kata kunci, genre, dan urutan) tinggal di URL, bukan di `useState`, dan ketiganya harus bisa berubah tanpa saling menghapus.

```tsx
// fitur/pencarian/HalamanDaftar.tsx
import { useSearchParams } from 'react-router';

export function HalamanDaftar() {
  const [parameter, setParameter] = useSearchParams();

  const q = parameter.get('q') ?? '';
  const genre = parameter.get('genre') ?? 'semua';
  const urut = parameter.get('urut') ?? 'relevan';

  // URL adalah sumber kebenaran. Tidak ada salinan di useState.
  function ubah(kunci: string, nilai: string) {
    const baru = new URLSearchParams(parameter);
    if (nilai && nilai !== 'semua' && nilai !== 'relevan') baru.set(kunci, nilai);
    else baru.delete(kunci);

    // replace: true supaya setiap ketikan tidak menumpuk riwayat
    setParameter(baru, { replace: true });
  }

  const hasil = useHasilCari(q);
  const terlihat = saringDanUrutkan(hasil, genre, urut); // dihitung, tidak disimpan

  return (
    <>
      <FormCari nilai={q} onUbah={(nilai) => ubah('q', nilai)} />
      <FilterGenre nilai={genre} onUbah={(nilai) => ubah('genre', nilai)} />
      <p role="status" aria-live="polite">
        {hasil.status === 'siap' ? `${terlihat.length} judul ditemukan` : ''}
      </p>
      <HasilPencarian keadaan={hasil} judul={terlihat} />
    </>
  );
}
```

`replace: true` adalah detail kecil dengan dampak besar: tanpanya, mengetik "breaking bad" menambah sebelas entri ke riwayat browser, dan tombol kembali jadi tidak berguna.

## Yang harus Anda kerjakan sendiri

1. **`useHasilCari` dan `useDetail`.** Pakai `useNilaiTertunda` dan pola pembatalan dari modul 10. `useDetail` harus membedakan `TidakDitemukan` dari kegagalan lain.
2. **`useFavorit`.** Satu hook yang menyimpan ke `localStorage`, dengan Context supaya jumlah di navigasi dan tombol di kartu melihat data yang sama. Jumlahnya dihitung, tidak disimpan.
3. **Komponen keadaan.** `Kerangka`, `KeadaanKosong`, `KeadaanGagal`. Satu pola yang dipakai ketiga halaman.
4. **`KartuJudul` yang tangguh.** Tangani poster `null` dan rating `null`, pesan ruang gambar dengan `aspect-ratio`, dan pastikan seluruh kartu bisa dijangkau keyboard tanpa membuat tombol favorit terjebak di dalam tautan.

Poin keempat itu latihan desain yang nyata: kartu yang seluruhnya bisa diklik sekaligus punya tombol favorit di dalamnya adalah tautan di dalam tautan, yang tidak sah dalam HTML. Pola yang benar: judulnya saja yang jadi tautan, lalu seluruh kartu dibuat terasa bisa diklik dengan `::after` yang menutupi kartu, dan tombol favorit diberi `position: relative` supaya tetap berada di atasnya.

> [!petunjuk]
> Urutan pengerjaan yang paling sedikit menyakitkan, dan alasan tiap langkahnya.
>
> **Mulai dari nomor 3, bukan nomor 1.** `Kerangka`, `KeadaanKosong`, dan `KeadaanGagal` adalah komponen tanpa logika yang bisa Anda lihat langsung di layar. Membuatnya lebih dulu berarti saat `useHasilCari` selesai, Anda sudah punya tempat untuk menampilkan setiap keadaannya.
>
> **Nomor 1 dikerjakan satu hook pada satu waktu.** `useDetail` lebih dulu karena tidak punya penundaan maupun kata kunci yang berubah. Setelah itu `useHasilCari`, yang hanya menambahkan `useNilaiTertunda` di depannya.
>
> **Untuk membedakan `TidakDitemukan`**, periksa dengan `instanceof`, jangan dengan membaca teks pesan errornya. Pesan error adalah antarmuka yang suatu hari akan diubah seseorang, dan kode yang bergantung pada isinya akan rusak tanpa ada yang menyadari.
>
> **Nomor 2 punya satu jebakan.** Jumlah favorit di navigasi dan keadaan tombol di kartu harus membaca satu sumber yang sama. Kalau navigasi menyimpan angkanya sendiri, Anda membuat ulang Latihan 2 Modul 6 dengan tangan sendiri.
>
> **Nomor 4 diuji dengan keyboard, bukan dengan mata.** Tekan Tab sampai masuk ke kartu dan perhatikan ada berapa perhentian. Kalau satu kartu butuh tiga kali Tab padahal hanya ada dua hal yang bisa diklik, ada elemen yang tidak seharusnya bisa difokus.

## Checklist penilaian

| # | Yang diperiksa |
| --- | --- |
| 1 | Cari "office", salin URL, buka di tab baru. Hasil dan filternya sama? |
| 2 | Tekan tombol kembali setelah mencari tiga kali. Jumlah langkahnya wajar? |
| 3 | Buka `/judul/169` langsung tanpa melewati halaman daftar. Jalan? |
| 4 | Buka `/judul/99999999`. Halaman 404, bukan error di console? |
| 5 | Matikan jaringan, muat ulang. Pesannya jelas dan tombol coba lagi bekerja? |
| 6 | Tambahkan favorit, tutup tab, buka lagi. Masih ada, dan angka di navigasi cocok? |
| 7 | Dari keyboard: cari, pilih hasil, tambahkan favorit, kembali. Semua bisa? |
| 8 | Jaringan "Slow 4G": apakah kerangka kartu muncul, dan tata letak tidak melompat saat gambar datang? |
| 9 | Ketik "breaking bad" perlahan. Berapa permintaan terkirim? Harus satu, bukan dua belas. |
| 10 | `pnpm check` bersih: lint, format, dan `tsc --noEmit`? |

## Tantangan bonus

- **Muat bertahap** saat digulir pada daftar populer, dengan `IntersectionObserver`, lengkap dengan tombol "Muat lebih banyak" sebagai alternatif untuk keyboard.
- **Riwayat pencarian terakhir** lima kata kunci, tersimpan lokal, bisa dihapus.
- **Perbandingan dua judul** berdampingan, dengan kedua id tersimpan di URL.
- **Pratinjau saat mengarahkan kursor** ke kartu, yang memuat detail lebih awal. Perhatikan: jangan memuat lebih awal untuk setiap kartu yang kebetulan terlewati kursor, karena itu memanggil API puluhan kali.

## Rangkuman

- State yang perlu bisa dibagikan tempatnya di URL. Pada aplikasi dengan pencarian dan filter, URL adalah sumber kebenaran, bukan salinan dari `useState`.
- Bentuk respons API diubah ke bentuk milik aplikasi di satu lapisan. Nama field pihak ketiga dan `null`-nya berhenti di situ.
- Error yang berbeda jenis butuh tipe yang berbeda. Membedakan 404 dari gangguan jaringan menentukan tampilan yang benar.
- HTML dari sumber luar diubah jadi teks di lapisan data, bukan ditampilkan dengan `dangerouslySetInnerHTML`.
- Struktur folder berdasarkan fitur bertahan lebih lama daripada berdasarkan jenis berkas. Komponen umum tidak boleh tahu soal domain.
- Kerangka pemuatan seukuran isi aslinya mencegah tata letak melompat, dan itu bagian dari fitur.

## Masalah terbuka

Aplikasi ini jalan, dan dua hal mulai terasa sesak.

**Pertama, soal styling.** Anda punya belasan komponen dan `className` yang namanya mulai bertabrakan. Warna disalin ke banyak berkas, dan menambah mode gelap berarti menyentuh setiap berkas CSS. Jarak antar elemen ditulis dengan angka yang berbeda-beda di tiap komponen, dan hasilnya terlihat sedikit tidak rapi tanpa ada yang bisa menunjuk penyebabnya.

**Kedua, soal data.** `useHasilCari` dan `useDetail` punya kode yang hampir sama, dan keduanya memulai dari nol setiap kali. Pengguna yang membuka detail lalu menekan kembali akan menunggu pencarian yang sama dimuat ulang. Dua komponen yang butuh data sama memanggilnya dua kali. Dan tidak ada satu pun cara menyegarkan data di latar belakang tanpa membuat tampilan berkedip.

Yang pertama dijawab modul berikutnya: styling untuk skala aplikasi, design token, dan kenapa pilihan antara utility class dan CSS Modules bukan soal selera. Yang kedua dijawab modul 12.
