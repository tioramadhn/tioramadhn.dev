---
title: 'Proyek 3: Dasbor Admin dengan Tabel, Filter, dan Form'
description: Bentuk aplikasi yang paling sering Anda temui di pekerjaan nyata. Tabel besar, filter bertumpuk di URL, form di dalam dialog, aksi massal, dan perubahan yang langsung terlihat di seluruh halaman.
date: 2026-11-23
slug: proyek-3-dasbor-admin
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Kalau Anda bekerja sebagai frontend engineer, kemungkinan besar sebagian besar waktu Anda dihabiskan untuk aplikasi berbentuk ini: tabel, filter, form, dan aksi. Bukan landing page, bukan game, bukan animasi.

Proyek ini memakai tiga modul terakhir sekaligus:

| Dari modul | Yang dipakai |
| --- | --- |
| 11 | Design token, tema gelap, komponen tombol dan masukan yang konsisten |
| 12 | Cache, kunci query yang memuat filter, invalidasi setelah mutasi, pembaruan optimistis |
| 13 | Skema Zod yang dipakai form dan pemeriksaan respons, pesan error untuk manusia |

Ditambah satu hal yang baru: **seluruh keadaan tabel tinggal di URL.** Filter, pencarian, pengurutan, dan halaman. Alasannya bukan kerapian, tapi kebutuhan kerja nyata: seorang admin menemukan 12 pesanan bermasalah, lalu mengirim tautannya ke rekan. Kalau keadaan tabel hanya ada di memori, tautan itu membuka tabel kosong.

## Data yang dipakai

Pakai `json-server`, karena proyek ini butuh perubahan data yang benar-benar tersimpan:

```bash
pnpm dlx json-server db.json --port 4000 --delay 400
```

```json
// db.json
{
  "produk": [
    {
      "id": "1",
      "nama": "Kopi susu gula aren",
      "kategori": "minuman",
      "harga": 22000,
      "stok": 48,
      "status": "aktif",
      "diperbaruiPada": "2026-11-18T03:12:00.000Z"
    }
  ],
  "kategori": [{ "id": "minuman", "nama": "Minuman" }]
}
```

`--delay 400` sengaja dipasang. Jaringan nyata tidak instan, dan keadaan memuat baru bisa dirancang dengan benar kalau Anda bisa melihatnya.

`json-server` mendukung yang Anda butuhkan untuk tabel: `?_page=2&_per_page=20`, `?_sort=harga`, `?kategori=minuman`, dan `?nama_like=kopi`. Kalau tidak ingin menjalankan server lokal, [DummyJSON](https://dummyjson.com) bisa dipakai sebagai gantinya, dengan catatan perubahannya hanya disimulasikan dan tidak benar-benar tersimpan.

## Spesifikasi wajib

### A. Tabel

1. Kolom: nama, kategori, harga, stok, status, terakhir diperbarui, dan kolom aksi.
2. Pengurutan dengan klik judul kolom, naik lalu turun, dan penandanya terlihat.
3. Halaman dikerjakan di server (`_page` dan `_per_page`), bukan dengan memuat semua lalu memotong di klien.
4. Jumlah baris per halaman bisa diubah: 10, 25, 50.
5. Baris bisa dipilih, termasuk "pilih semua di halaman ini", dengan jumlah terpilih yang terlihat.

### B. Filter dan pencarian

6. Pencarian nama dengan penundaan 300 milidetik.
7. Filter kategori, status, dan rentang harga.
8. Semua keadaan tabel (`q`, `kategori`, `status`, `urut`, `arah`, `halaman`, `perHalaman`) tersimpan di URL.
9. Tombol "Bersihkan filter" yang muncul hanya saat ada filter aktif, dan menyebutkan jumlah filter yang sedang dipakai.
10. Mengubah filter mengembalikan halaman ke 1. Mengubah urutan tidak.

### C. Perubahan data

11. Tambah produk lewat dialog dengan form tervalidasi.
12. Ubah produk lewat dialog yang sama, terisi data yang ada.
13. Hapus dengan konfirmasi yang menyebut nama produknya, bukan "Yakin?".
14. Ubah status aktif dan nonaktif langsung dari tabel, dengan pembaruan optimistis.
15. Aksi massal: nonaktifkan atau hapus beberapa produk terpilih sekaligus.
16. Setiap perubahan memunculkan notifikasi, dan kegagalan menyebutkan apa yang terjadi pada data.

### D. Keadaan

| Keadaan | Yang harus terlihat |
| --- | --- |
| Memuat pertama kali | Baris kerangka sebanyak jumlah baris per halaman |
| Menyegarkan | Tabel lama tetap tampil, dengan penanda halus |
| Tanpa data sama sekali | Ajakan menambah produk pertama |
| Filter tidak menghasilkan apa pun | Pesan yang menyebut filternya, plus tombol bersihkan |
| Gagal memuat | Pesan beserta tombol coba lagi |
| Mutasi gagal | Data kembali seperti semula, plus notifikasi yang jelas |

### E. Kualitas

17. Tabel memakai `table`, `thead`, `th` dengan `scope`, dan `caption`. Bukan `div` bergaya tabel.
18. Dialog mengunci fokus di dalamnya, menutup dengan Escape, dan mengembalikan fokus ke tombol pemicunya.
19. Perubahan jumlah hasil dan hasil aksi diumumkan lewat wilayah `aria-live`.
20. Di bawah 48rem, tabel berubah jadi daftar kartu yang tetap memuat semua informasi.
21. `pnpm check` bersih, tanpa `any`.

### Garis finis

| Tingkat | Syarat | Artinya |
| --- | --- | --- |
| **Inti** | 1, 3, 6, 7, 8, 11, 12, 14, 17, plus keadaan memuat dan gagal | Tabel dengan filter di URL, satu form yang bekerja, satu mutasi optimistis, tabel HTML yang benar |
| **Lengkap** | Seluruh 1 sampai 21, plus keenam keadaan | Setara aplikasi internal yang benar-benar dipakai |
| **Bonus** | Bagian "Tantangan bonus" | Opsional sepenuhnya |

Syarat 17 sampai 19 (tabel semantik, dialog yang mengelola fokus, wilayah `aria-live`) sengaja masuk Inti. Ketiganya jauh lebih murah dikerjakan sekarang daripada ditambal di Modul 16, dan itu persis pelajaran yang akan ditagih modul itu.

## Struktur folder

```text
src/
├── app/
│   ├── Layout.tsx
│   └── Penyedia.tsx          (QueryClient, tema, notifikasi)
├── fitur/produk/
│   ├── HalamanProduk.tsx
│   ├── TabelProduk.tsx
│   ├── BarisProduk.tsx
│   ├── BilahFilter.tsx
│   ├── DialogProduk.tsx
│   ├── AksiMassal.tsx
│   ├── skema.ts              (Zod: sumber tipe dan validasi)
│   ├── api.ts                (lapisan data)
│   ├── kunci.ts              (queryKey)
│   └── useFilterProduk.ts    (keadaan tabel dari URL)
├── komponen/
│   ├── Tombol.tsx
│   ├── Dialog.tsx
│   ├── Notifikasi.tsx
│   ├── KerangkaTabel.tsx
│   └── KeadaanKosong.tsx
└── lib/
    └── url.ts
```

## Keadaan tabel dari URL

Hook ini jadi tulang punggung proyek. Semua komponen membacanya, dan tidak ada satu pun salinan di `useState`.

```ts
// fitur/produk/useFilterProduk.ts
import { useSearchParams } from 'react-router';
import { z } from 'zod';

const skemaFilter = z.object({
  q: z.string().default(''),
  kategori: z.string().default('semua'),
  status: z.enum(['semua', 'aktif', 'nonaktif']).default('semua'),
  urut: z.enum(['nama', 'harga', 'stok', 'diperbaruiPada']).default('diperbaruiPada'),
  arah: z.enum(['asc', 'desc']).default('desc'),
  halaman: z.coerce.number().int().min(1).default(1),
  perHalaman: z.coerce.number().int().pipe(z.union([
    z.literal(10), z.literal(25), z.literal(50),
  ])).default(25),
});

export type FilterProduk = z.infer<typeof skemaFilter>;

export function useFilterProduk() {
  const [parameter, setParameter] = useSearchParams();

  // URL bisa berisi apa saja, termasuk ?halaman=abc dari tautan yang rusak.
  // Skema memberi nilai bawaan, bukan error.
  const filter = skemaFilter.parse(Object.fromEntries(parameter));

  function ubah(perubahan: Partial<FilterProduk>) {
    const baru = new URLSearchParams(parameter);

    for (const [kunci, nilai] of Object.entries(perubahan)) {
      const bawaan = skemaFilter.shape[kunci as keyof FilterProduk]._def.defaultValue();
      // Nilai bawaan tidak ditulis ke URL, supaya tautannya tetap pendek
      if (String(nilai) === String(bawaan)) baru.delete(kunci);
      else baru.set(kunci, String(nilai));
    }

    // Spesifikasi nomor 10: filter mengembalikan halaman ke 1, urutan tidak
    const mengubahFilter = ['q', 'kategori', 'status', 'perHalaman'].some(
      (k) => k in perubahan
    );
    if (mengubahFilter) baru.delete('halaman');

    setParameter(baru, { replace: true });
  }

  const jumlahFilterAktif = [
    filter.q !== '',
    filter.kategori !== 'semua',
    filter.status !== 'semua',
  ].filter(Boolean).length;

  return { filter, ubah, jumlahFilterAktif, bersihkan: () => setParameter({}) };
}
```

Tiga keputusan yang layak ditiru di proyek kerja Anda:

**Skema dipakai untuk membaca URL, bukan hanya untuk form.** Pengguna bisa mengetik apa saja di bilah alamat, dan tautan lama bisa berisi nilai yang sudah tidak berlaku. Dengan skema, URL yang rusak menghasilkan tampilan bawaan, bukan layar putih.

**Nilai bawaan tidak ditulis ke URL.** Tanpa aturan ini, tautan jadi penuh parameter yang tidak berarti, dan sulit dibaca manusia.

**Aturan "filter mengembalikan halaman ke 1" ditulis sekali di sini.** Kalau ditulis di setiap pemanggil, satu tempat akan terlupa, dan pengguna melihat "tidak ada hasil" padahal datanya ada di halaman 1.

## Lapisan data dan mutasi

```ts
// fitur/produk/api.ts
export async function ambilProduk(filter: FilterProduk, signal?: AbortSignal) {
  const url = new URL('/produk', DASAR);
  url.searchParams.set('_page', String(filter.halaman));
  url.searchParams.set('_per_page', String(filter.perHalaman));
  url.searchParams.set('_sort', (filter.arah === 'desc' ? '-' : '') + filter.urut);
  if (filter.q) url.searchParams.set('nama_like', filter.q);
  if (filter.kategori !== 'semua') url.searchParams.set('kategori', filter.kategori);
  if (filter.status !== 'semua') url.searchParams.set('status', filter.status);

  const respons = await fetch(url, { signal });
  if (!respons.ok) throw new Error(`Gagal memuat produk (${respons.status})`);

  // Bentuk respons diperiksa, bukan dipercaya
  return skemaHalamanProduk.parse(await respons.json());
}
```

```tsx
// Pembaruan optimistis untuk tombol status di tabel
function useUbahStatus(filter: FilterProduk) {
  const klien = useQueryClient();
  const kunciDaftar = kunci.produk.daftar(filter);

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Status }) =>
      simpanStatus(id, status),

    onMutate: async ({ id, status }) => {
      await klien.cancelQueries({ queryKey: kunciDaftar });
      const sebelumnya = klien.getQueryData<HalamanProduk>(kunciDaftar);

      klien.setQueryData<HalamanProduk>(kunciDaftar, (lama) =>
        lama
          ? { ...lama, data: lama.data.map((p) => (p.id === id ? { ...p, status } : p)) }
          : lama
      );

      return { sebelumnya };
    },

    onError: (_e, variabel, konteks) => {
      if (konteks?.sebelumnya) klien.setQueryData(kunciDaftar, konteks.sebelumnya);
      notifikasi.gagal(`Gagal mengubah status "${variabel.id}". Perubahan dibatalkan.`);
    },

    onSettled: () => klien.invalidateQueries({ queryKey: kunci.produk.semua }),
  });
}
```

## Tabel yang benar

Bagian yang paling sering dikerjakan asal, dan paling sering jadi temuan audit aksesibilitas:

```tsx
<table>
  <caption className="sr-only">
    Daftar produk, {total} item, halaman {filter.halaman} dari {totalHalaman}
  </caption>
  <thead>
    <tr>
      <th scope="col">
        <input
          type="checkbox"
          checked={semuaTerpilih}
          onChange={pilihSemuaHalamanIni}
          aria-label="Pilih semua produk di halaman ini"
        />
      </th>
      <th scope="col" aria-sort={filter.urut === 'nama' ? arahAria : 'none'}>
        <button type="button" onClick={() => urutkanDengan('nama')}>
          Nama
          <IkonUrut aktif={filter.urut === 'nama'} arah={filter.arah} />
        </button>
      </th>
      <th scope="col">Harga</th>
      <th scope="col">
        <span className="sr-only">Aksi</span>
      </th>
    </tr>
  </thead>
  <tbody>
    {produk.map((p) => (
      <tr key={p.id}>
        <td>
          <input
            type="checkbox"
            checked={terpilih.has(p.id)}
            onChange={() => alihkanPilihan(p.id)}
            aria-label={`Pilih ${p.nama}`}
          />
        </td>
        <th scope="row">{p.nama}</th>
        <td>{formatRupiah(p.harga)}</td>
        <td>
          <Tombol varian="kedua" ukuran="kecil" onClick={() => buka(p)}>
            Ubah<span className="sr-only"> {p.nama}</span>
          </Tombol>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

Lima hal yang membedakannya dari tabel yang asal jadi:

1. **`caption`** menyebutkan isi tabel beserta jumlah dan halaman. Disembunyikan secara visual, dibacakan pembaca layar.
2. **`aria-sort` pada kolom yang sedang diurutkan.** Tanpa ini, pengguna pembaca layar tidak tahu tabelnya sedang diurutkan berdasarkan apa.
3. **Judul kolom yang bisa diurutkan berisi `button`,** bukan `th` dengan `onClick`. Modul 2 masih berlaku.
4. **Setiap checkbox dan tombol aksi punya nama yang menyebut barisnya.** Dua puluh lima tombol bernama "Ubah" adalah daftar yang tidak berguna.
5. **`th scope="row"` untuk kolom nama.** Pembaca layar akan menyebutkan nama produk saat pengguna berpindah antar sel di baris itu, jadi konteksnya tidak hilang.

## Yang harus Anda kerjakan sendiri

1. **`DialogProduk`.** Satu dialog untuk tambah dan ubah. Pakai elemen `dialog` bawaan atau library headless, dan jangan lupa mengembalikan fokus ke tombol pemicu saat ditutup.
2. **Aksi massal** beserta konfirmasinya. Perhatikan: setelah aksi massal berhasil, pilihan harus dikosongkan, dan jumlah yang berhasil serta gagal perlu dilaporkan terpisah.
3. **Tampilan kartu untuk layar sempit.** Jangan menggulir tabel ke samping, dan jangan menyembunyikan kolom penting.
4. **Komponen notifikasi** dengan wilayah `aria-live`, antrean, dan penutupan otomatis yang tidak berlaku untuk pesan kegagalan.

Poin keempat punya alasan: notifikasi kegagalan yang hilang sendiri dalam tiga detik akan terlewat oleh pengguna yang sedang melihat ke tempat lain, dan mereka akan mengira perubahannya berhasil.

> [!petunjuk]
> **Kerjakan `useFilterProduk` dan tabelnya sampai benar sebelum menyentuh dialog maupun aksi massal.** Keadaan tabel adalah tulang punggung proyek ini, dan semua fitur lain membacanya. Memperbaikinya setelah ada enam komponen yang bergantung padanya jauh lebih mahal.
>
> **Untuk nomor 1**, pakai elemen `dialog` bawaan dengan `showModal()`. Empat dari lima perilaku yang diminta syarat 18 (fokus masuk, fokus terkunci, Escape menutup, fokus kembali ke pemicu) sudah Anda dapat tanpa menulis kode. Membuat dialog sendiri dari `div` berarti menulis keempatnya dengan tangan, dan Modul 16 akan menunjukkan betapa mudahnya salah.
>
> **Satu dialog untuk tambah dan ubah, bukan dua.** Bedanya hanya nilai awal form: kosong untuk tambah, terisi untuk ubah. Kalau Anda butuh mereset isi form saat produk yang diubah berganti, ingat teknik `key` dari Latihan 1 Modul 10.
>
> **Untuk nomor 2**, aksi massal yang mengirim sepuluh permintaan akan punya sebagian berhasil dan sebagian gagal. Itu bukan keadaan luar biasa, melainkan keadaan normal. `Promise.allSettled` dari Modul 5 memberi Anda kedua kelompoknya sekaligus, dan laporkan jumlahnya terpisah.
>
> **Untuk nomor 3**, jangan membuat komponen tabel kedua untuk layar sempit. Satu sumber data, dua tata letak, dengan pilihan yang ditentukan CSS. Menduplikasi komponennya berarti setiap perubahan kolom dikerjakan dua kali, dan suatu hari salah satunya akan terlupa.

## Checklist penilaian

| # | Yang diperiksa |
| --- | --- |
| 1 | Setel filter, salin URL, buka di jendela penyamaran. Tampilannya sama persis? |
| 2 | Di halaman 3, ubah filter. Kembali ke halaman 1 atau menampilkan "kosong"? |
| 3 | Matikan jaringan, lalu ubah status produk. Kembali seperti semula dan ada notifikasi? |
| 4 | Tambah produk. Tabel, jumlah total, dan filter kategori ikut diperbarui? |
| 5 | Tab dari awal halaman sampai tombol aksi di baris ketiga. Urutannya masuk akal? |
| 6 | Buka dialog, tekan Tab berulang kali. Fokus terkunci di dalam dialog? |
| 7 | Tutup dialog dengan Escape. Fokus kembali ke tombol yang membukanya? |
| 8 | Pakai pembaca layar atau panel Accessibility: tabelnya menyebut jumlah baris dan kolom urut? |
| 9 | Lebar 360px: semua informasi masih terbaca tanpa gulir horizontal? |
| 10 | Ketik di pencarian 10 huruf. Berapa permintaan terkirim? |
| 11 | Pilih 5 produk, nonaktifkan massal, lalu lihat apakah pilihan dikosongkan |
| 12 | Buka `?halaman=abc&perHalaman=999`. Aplikasi tetap jalan dengan nilai bawaan? |

## Tantangan bonus

- **Simpan pengaturan tampilan tabel** (kolom yang terlihat, lebar kolom) ke `localStorage`, terpisah dari filter yang ada di URL. Perhatikan pembagiannya: yang perlu dibagikan ke URL, yang pribadi ke penyimpanan lokal.
- **Ekspor hasil filter ke CSV**, dengan jumlah baris yang jelas dan penanganan untuk data yang sangat banyak.
- **Pembatalan aksi** selama lima detik setelah penghapusan, dengan notifikasi "Dibatalkan" yang benar-benar membatalkan.
- **Tabel virtual** dengan TanStack Virtual untuk daftar 10.000 baris, lalu bandingkan waktu render sebelum dan sesudah.

## Rangkuman

- Keadaan tabel (filter, urutan, halaman) tempatnya di URL. Itu bukan kerapian, melainkan fitur: tampilan yang bisa dibagikan dan tombol kembali yang bekerja.
- URL adalah masukan dari luar, jadi bacalah dengan skema. Tautan rusak harus menghasilkan tampilan bawaan, bukan layar putih.
- Aturan antar-keadaan ("filter mengembalikan halaman ke 1") ditulis sekali di satu tempat.
- Pagination dikerjakan server. Memuat semua data lalu memotong di klien terlihat bekerja sampai datanya sepuluh ribu baris.
- Pembaruan optimistis untuk aksi ringan, konfirmasi dan tunggu untuk aksi yang berkonsekuensi.
- Tabel HTML yang benar (`caption`, `scope`, `aria-sort`, nama aksi yang spesifik) adalah pekerjaan satu jam yang menentukan apakah aplikasi bisa dipakai sebagian orang.
- Notifikasi kegagalan tidak boleh hilang sendiri.

## Masalah terbuka

Dasbor ini bekerja dengan baik, dan tiga hal mulai terasa sebagai batas.

**Pertama, memuat pertama kali lambat.** Urutannya: unduh HTML kosong, unduh JavaScript, jalankan React, baru minta data. Pengguna menunggu empat langkah sebelum melihat satu baris pun. Pada jaringan kantor yang lambat, itu terasa.

**Kedua, air terjun permintaan.** Halaman butuh data produk dan daftar kategori. Keduanya baru dimulai setelah JavaScript jalan, dan kalau kategori diminta oleh komponen yang baru muncul setelah produk datang, keduanya jadi berurutan padahal bisa bersamaan.

**Ketiga, dan paling serius: tidak ada tempat yang aman.** Dasbor admin pasti butuh kunci API atau token yang tidak boleh dilihat pengguna, dan pembatasan "hanya admin yang boleh menghapus". Dalam aplikasi yang seluruhnya berjalan di browser, tidak ada satu pun baris kode Anda yang tersembunyi.

Ketiganya mengarah ke pertanyaan yang sama: **bagian mana dari aplikasi ini yang sebaiknya berjalan di server?**

Itu isi modul berikutnya: Next.js App Router, Server Component, dan cara memutuskan kode mana yang berjalan di mana.
