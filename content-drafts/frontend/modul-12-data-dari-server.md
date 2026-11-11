---
title: 'Modul 12: Data dari Server: Fetching, Cache, dan Status UI'
description: Data server bukan state biasa. Ia dimiliki orang lain, bisa basi tanpa memberi kabar, dan dibutuhkan banyak komponen sekaligus. Itu sebabnya useState dan useEffect tidak cukup.
date: 2026-11-21
slug: modul-12-data-dari-server
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Lima keluhan dari Proyek 2 dan modul 11:

1. Hook pengambil data punya kode yang hampir sama di setiap fitur.
2. Menekan tombol kembali memuat ulang data yang baru saja dilihat.
3. Dua komponen yang butuh data sama memanggil API dua kali.
4. Tidak ada cara menyegarkan data di latar belakang tanpa tampilan berkedip.
5. Setelah menambah favorit, halaman lain masih menampilkan data lama.

Kelimanya berasal dari satu kesalahan kategori: **data server diperlakukan sebagai state komponen.** Padahal keduanya berbeda jenis.

| | State klien | Data server |
| --- | --- | --- |
| Pemiliknya | Komponen Anda | Server, atau pengguna lain |
| Kebenarannya | Selalu benar | Hanya salinan, bisa sudah basi |
| Cara berubah | Langsung | Lewat jaringan, bisa gagal, butuh waktu |
| Jumlah pemakai | Biasanya satu | Banyak komponen, banyak halaman |
| Umurnya | Selama komponen hidup | Perlu bertahan lebih lama dari komponennya |

Baris terakhir yang paling menentukan. `useState` hidup dan mati bersama komponennya, sedangkan daftar produk yang baru diambil sebaiknya masih ada saat pengguna menekan tombol kembali. Itu bukan state, itu **cache**.

## Analogi: kulkas dan warung

Bayangkan Anda masak setiap hari dengan bahan dari warung ujung jalan.

**Cara pertama, tanpa kulkas.** Setiap kali butuh telur, Anda jalan ke warung. Sepuluh kali masak berarti sepuluh kali jalan. Pasti segar, dan melelahkan.

**Cara kedua, dengan kulkas.** Anda simpan bahan di rumah. Masalah barunya muncul: berapa lama bahan di kulkas masih layak? Kalau sudah agak lama, apa yang Anda lakukan?

Jawaban yang dipakai orang: **masak dengan yang ada di kulkas sekarang, sambil menyuruh seseorang membeli yang baru.** Makanan tetap terhidang tanpa menunggu, dan isi kulkas diperbarui di belakang. Itu persis strategi yang dipakai library data modern, dan namanya stale-while-revalidate.

| Dunia dapur | Dunia frontend |
| --- | --- |
| Warung | Server |
| Kulkas | Cache |
| Label tanggal di bahan | Waktu kedaluwarsa, `staleTime` |
| "Masak dulu, beli belakangan" | stale-while-revalidate |
| Satu orang belanja untuk seluruh keluarga | Deduplikasi permintaan |
| Membuang bahan yang tidak dipakai berminggu-minggu | Pengumpulan sampah cache, `gcTime` |
| "Bahan ini sudah tidak dipercaya, beli baru" | Invalidasi setelah perubahan data |
| Mencatat di buku belanja sebelum barang datang | Pembaruan optimistis |

Batas analoginya: bahan di kulkas tidak berubah sendiri, sedangkan data di server bisa berubah karena orang lain. Itu sebabnya ada mekanisme tambahan yang tidak punya padanan di dapur: memeriksa ulang saat tab kembali aktif, dan setelah sambungan internet pulih.

## Tujuh pekerjaan yang selalu muncul

Kalau Anda menulis lapisan data sendiri, tujuh hal ini akan Anda tulis berulang kali untuk setiap endpoint:

1. **Empat keadaan**: siaga, memuat, siap, gagal. Plus keadaan kelima yang sering dilupakan: punya data lama sekaligus sedang memuat yang baru.
2. **Pembatalan** permintaan yang sudah tidak relevan.
3. **Deduplikasi**: tiga komponen meminta data sama, satu permintaan terkirim.
4. **Cache** beserta aturan kapan isinya dianggap basi.
5. **Percobaan ulang** untuk kegagalan sementara, dan tidak untuk 404.
6. **Invalidasi**: setelah mengubah data, daftar mana saja yang harus diambil ulang.
7. **Pembaruan optimistis** beserta pembatalannya saat gagal.

Pada aplikasi dengan dua puluh endpoint, itu dua puluh kali tujuh pekerjaan. Tidak ada tim yang mengerjakannya lengkap dengan tangan, dan itu sebabnya library data jadi bawaan, bukan kemewahan.

## TanStack Query

```bash
pnpm add @tanstack/react-query
```

```tsx
// main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const klien = new QueryClient({
  defaultOptions: {
    queries: {
      // Selama 30 detik, data dianggap masih segar: tidak ada permintaan ulang
      staleTime: 30_000,
      // Data yang tidak dipakai komponen mana pun dibuang setelah 5 menit
      gcTime: 5 * 60_000,
      retry: (jumlahGagal, error) => {
        if (error instanceof TidakDitemukan) return false; // 404 tidak diulang
        return jumlahGagal < 2;
      },
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={klien}>
    <RouterProvider router={router} />
  </QueryClientProvider>
);
```

Pengambilan data jadi sependek ini:

```tsx
import { useQuery } from '@tanstack/react-query';

function useHasilCari(kataKunci: string) {
  const tertunda = useNilaiTertunda(kataKunci.trim(), 300);

  return useQuery({
    // Kunci cache: dua pencarian berbeda adalah dua entri berbeda
    queryKey: ['cari', tertunda],
    queryFn: ({ signal }) => cariJudul(tertunda, signal),
    enabled: tertunda.length >= 2,
    // Saat kata kunci berubah, tampilkan hasil sebelumnya sambil memuat yang baru
    placeholderData: (sebelumnya) => sebelumnya,
  });
}
```

Bandingkan dengan versi tulisan tangan di modul 10. Tujuh pekerjaan di atas sudah tertangani, termasuk `signal` untuk pembatalan yang diberikan langsung oleh library.

Pemakaiannya di komponen:

```tsx
function HalamanDaftar() {
  const [parameter] = useSearchParams();
  const q = parameter.get('q') ?? '';

  const { data, isPending, isError, error, isFetching, refetch } = useHasilCari(q);

  if (q.length < 2) return <KeadaanAwal />;
  if (isPending) return <KerangkaDaftar jumlah={8} />;
  if (isError) return <KeadaanGagal pesan={pesanDari(error)} onCobaLagi={refetch} />;
  if (data.length === 0) return <KeadaanKosong kataKunci={q} />;

  return (
    <>
      {/* Penanda halus: ada data, dan versi barunya sedang diambil */}
      {isFetching && <PenandaMenyegarkan />}
      <DaftarJudul judul={data} />
    </>
  );
}
```

Pembedaan `isPending` dan `isFetching` layak dihafal, karena di situ keluhan nomor 4 selesai:

| Penanda | Artinya | Tampilannya |
| --- | --- | --- |
| `isPending` | Belum ada data sama sekali | Kerangka pemuatan |
| `isFetching` | Sedang mengambil, data lama bisa saja sudah ada | Penanda halus, daftar tetap tampil |
| `isError` dengan `data` ada | Gagal menyegarkan, data lama masih ada | Tampilkan data dengan catatan "gagal diperbarui" |

## Merancang `queryKey`

Ini satu-satunya bagian yang benar-benar perlu Anda pikirkan, dan salah merancangnya adalah penyebab hampir semua bug cache.

Aturannya: **kunci harus memuat semua yang mengubah hasil.**

```ts
// Salah: dua filter berbeda berbagi satu entri cache
useQuery({ queryKey: ['produk'], queryFn: () => ambilProduk(filter) });

// Benar: setiap kombinasi punya entrinya sendiri
useQuery({
  queryKey: ['produk', { kategori, urut, halaman }],
  queryFn: ({ signal }) => ambilProduk({ kategori, urut, halaman }, signal),
});
```

Susun kunci dari umum ke khusus, supaya invalidasi bisa dilakukan per kelompok:

```ts
['produk']                                   // semua hal tentang produk
['produk', 'daftar', { kategori: 'kopi' }]   // satu daftar
['produk', 'detail', '12']                   // satu produk

// Membatalkan seluruh kelompok produk sekaligus
klien.invalidateQueries({ queryKey: ['produk'] });

// Atau hanya daftarnya, detail yang sudah dimuat tetap dipakai
klien.invalidateQueries({ queryKey: ['produk', 'daftar'] });
```

Kebiasaan yang layak diadopsi sejak proyek pertama: kumpulkan kunci di satu berkas, jangan ditulis sebagai string lepas di komponen.

```ts
// lib/kunci.ts
export const kunci = {
  produk: {
    semua: ['produk'] as const,
    daftar: (filter: Filter) => ['produk', 'daftar', filter] as const,
    detail: (id: string) => ['produk', 'detail', id] as const,
  },
};
```

Dengan begitu, salah tulis kunci ditangkap TypeScript, dan mencari semua tempat yang terpengaruh sebuah perubahan cukup satu pencarian.

## Mengubah data: mutation dan invalidasi

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function useTambahFavorit() {
  const klien = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => kirimFavorit(id),
    onSuccess: () => {
      // Keluhan nomor 5 selesai di sini: daftar favorit di halaman mana pun
      // ditandai basi, dan akan diambil ulang saat dibutuhkan.
      klien.invalidateQueries({ queryKey: kunci.favorit.semua });
    },
  });
}
```

Untuk aksi yang hampir selalu berhasil dan perlu terasa instan, pakai pembaruan optimistis:

```tsx
function useUbahFavorit() {
  const klien = useQueryClient();

  return useMutation({
    mutationFn: ({ id, jadi }: { id: string; jadi: boolean }) =>
      jadi ? kirimFavorit(id) : hapusFavorit(id),

    onMutate: async ({ id, jadi }) => {
      // Hentikan pengambilan yang sedang jalan, supaya tidak menimpa perubahan kita
      await klien.cancelQueries({ queryKey: kunci.favorit.semua });

      const sebelumnya = klien.getQueryData<string[]>(kunci.favorit.semua) ?? [];

      // Ubah cache sekarang, tanpa menunggu server
      klien.setQueryData<string[]>(kunci.favorit.semua, (lama = []) =>
        jadi ? [...lama, id] : lama.filter((x) => x !== id)
      );

      // Nilai ini dikirim ke onError sebagai bahan pembatalan
      return { sebelumnya };
    },

    onError: (_error, _variabel, konteks) => {
      // Gagal: kembalikan seperti semula, dan beri tahu pengguna
      if (konteks) klien.setQueryData(kunci.favorit.semua, konteks.sebelumnya);
      tampilkanNotifikasi('Gagal menyimpan favorit, perubahan dibatalkan');
    },

    onSettled: () => {
      // Berhasil atau gagal, akhirnya samakan dengan server
      klien.invalidateQueries({ queryKey: kunci.favorit.semua });
    },
  });
}
```

Empat tahap itu (`onMutate`, `onError`, `onSettled`, dan nilai konteks sebagai bahan pembatalan) adalah pola baku pembaruan optimistis. Yang membedakan implementasi serius dari yang asal: **pengguna harus diberi tahu saat pembatalan terjadi.** Tampilan yang diam-diam kembali ke keadaan sebelumnya terasa seperti aplikasi rusak.

Satu aturan memilih: pakai optimistis untuk aksi kecil yang hampir selalu berhasil (suka, favorit, centang tugas). Jangan untuk aksi yang punya konsekuensi, misalnya pembayaran atau penghapusan permanen. Pada aksi seperti itu, pengguna lebih baik menunggu satu detik dengan kepastian.

## Daftar panjang: halaman atau gulir tanpa akhir

```tsx
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: kunci.produk.daftar(filter),
  queryFn: ({ pageParam, signal }) => ambilProduk({ ...filter, kursor: pageParam }, signal),
  initialPageParam: null as string | null,
  getNextPageParam: (halamanTerakhir) => halamanTerakhir.kursorBerikutnya ?? null,
});

const semua = data?.pages.flatMap((h) => h.item) ?? [];
```

Dua catatan yang sering jadi masalah nyata:

**Gulir tanpa akhir butuh tombol juga.** `IntersectionObserver` yang memuat otomatis tidak bisa dipicu pengguna keyboard, dan bermasalah bagi yang memakai pembaca layar. Sediakan tombol "Muat lebih banyak" yang terlihat, lalu biarkan pemuatan otomatis sebagai tambahan.

**Pagination berbasis nomor halaman tidak aman untuk data yang berubah.** Kalau ada item baru masuk di atas saat pengguna di halaman 2, satu item akan terlewat dan satu lagi tampil dua kali. Pagination berbasis kursor tidak punya masalah itu. Ini pertanyaan untuk tim backend Anda, dan sebaiknya ditanyakan sebelum fiturnya dibangun.

## Opsi tools

| Pilihan | Cocok untuk | Catatan |
| --- | --- | --- |
| **TanStack Query** | Hampir semua aplikasi React | Standar de facto, tidak terikat cara pengambilan data |
| **SWR** | Kebutuhan sederhana | Lebih kecil, fiturnya lebih sedikit |
| **RTK Query** | Proyek yang sudah memakai Redux Toolkit | Masuk akal kalau Redux memang sudah ada |
| **Apollo Client** | Backend GraphQL | Cache berbasis normalisasi entitas |
| **Bawaan framework** | Next.js App Router | Pengambilan data di server dengan cache sendiri, lihat modul 14 |

Catatan penting untuk baris terakhir: di Next.js App Router, sebagian pekerjaan modul ini pindah ke server, dan tidak semua aplikasi masih butuh library data di klien. Tetap butuh untuk data yang sering berubah, polling, pembaruan optimistis, dan gulir tanpa akhir. Modul 14 membahas pembagiannya.

## Latihan

### Latihan 1: Ganti seluruh lapisan data Proyek 2

Pasang TanStack Query di katalog Anda, lalu ganti `useHasilCari`, `useDetail`, dan `useFavorit`. Target: tidak ada satu pun `useEffect` yang memanggil `fetch`, kembali dari halaman detail tidak memuat ulang hasil pencarian, dan dua komponen yang membutuhkan detail judul yang sama hanya memicu satu permintaan.

> [!petunjuk]
> Kerjakan satu hook per commit, dan jangan ubah komponennya sekaligus. Mulai dari `useDetail` karena paling sederhana, lalu `useHasilCari` yang punya penundaan, terakhir favorit yang melibatkan perubahan data.

> [!jawaban]
>
> ```tsx
> export function useDetail(id: string) {
>   return useQuery({
>     queryKey: kunci.judul.detail(id),
>     queryFn: ({ signal }) => ambilDetail(id, signal),
>     // Detail judul hampir tidak berubah, jadi anggap segar lima menit
>     staleTime: 5 * 60_000,
>   });
> }
>
> export function useFavorit() {
>   return useQuery({
>     queryKey: kunci.favorit.semua,
>     queryFn: bacaFavorit,
>     staleTime: Infinity, // sumbernya localStorage, tidak pernah basi sendiri
>   });
> }
> ```
>
> Empat hal yang akan Anda sadari saat mengerjakannya:
>
> 1. **`staleTime` adalah keputusan per data, bukan satu angka global.** Detail judul boleh lima menit, daftar notifikasi mungkin nol, saldo rekening mungkin juga nol. Angka ini menyatakan seberapa lama data lama masih boleh dipercaya, dan itu pertanyaan produk, bukan pertanyaan teknis.
> 2. **Favorit yang sumbernya `localStorage` tetap pantas masuk Query.** Dengan begitu, jumlah di navigasi dan tombol di kartu membaca satu sumber yang sama, dan keluhan "angka berselisih dengan daftar" tidak bisa terjadi lagi.
> 3. **Hook jadi pendek sekali**, dan semua pekerjaan berpindah ke konfigurasi. Itu tanda Anda sudah berhenti menulis ulang hal yang sudah diselesaikan orang lain.
> 4. **Komponen hampir tidak berubah**, karena bentuk keadaannya tetap. Itu buah dari discriminated union di modul 8: Anda cukup memetakan `isPending`, `isError`, dan `data` ke tampilan yang sudah ada.

### Latihan 2: Rancang kunci cache

Sebuah aplikasi kasir punya tujuh pengambilan data. Rancang `queryKey` untuk masing-masing, lalu tentukan kunci apa yang harus diinvalidasi setelah kasir membuat satu pesanan baru.

| # | Data |
| --- | --- |
| 1 | Daftar menu per kategori |
| 2 | Detail satu menu |
| 3 | Pesanan hari ini, dengan filter status dan nomor halaman |
| 4 | Detail satu pesanan |
| 5 | Ringkasan penjualan hari ini |
| 6 | Stok bahan |
| 7 | Profil kasir yang sedang login |

> [!petunjuk]
> Untuk pertanyaan invalidasi, tanyakan satu per satu: setelah pesanan dibuat, apakah data ini mungkin berubah? Yang mungkin berubah harus ditandai basi, yang pasti tidak berubah jangan disentuh supaya tidak ada permintaan sia-sia.

> [!jawaban]
>
> | # | `queryKey` | Invalidasi setelah pesanan baru? |
> | --- | --- | --- |
> | 1 | `['menu', 'daftar', { kategori }]` | Tidak |
> | 2 | `['menu', 'detail', id]` | Tidak |
> | 3 | `['pesanan', 'daftar', { status, halaman }]` | **Ya**, seluruh kelompok daftar |
> | 4 | `['pesanan', 'detail', id]` | Tidak perlu, pesanan baru belum punya entri |
> | 5 | `['penjualan', 'ringkasan', tanggal]` | **Ya** |
> | 6 | `['stok']` | **Ya**, karena bahan terpakai |
> | 7 | `['profil', 'saya']` | Tidak |
>
> ```ts
> onSuccess: () => {
>   klien.invalidateQueries({ queryKey: ['pesanan', 'daftar'] });
>   klien.invalidateQueries({ queryKey: ['penjualan'] });
>   klien.invalidateQueries({ queryKey: ['stok'] });
> };
> ```
>
> Tiga pelajarannya:
>
> 1. **Invalidasi yang terlalu luas membuang bandwidth.** `invalidateQueries({ queryKey: [] })` tanpa argumen membatalkan semuanya, termasuk menu dan profil yang jelas tidak berubah. Pada koneksi lemah, itu terasa.
> 2. **Invalidasi yang terlalu sempit meninggalkan data basi**, dan itu laporan bug "angka penjualan tidak naik sampai saya refresh".
> 3. **Pertanyaan "data apa yang berubah karena aksi ini" adalah pertanyaan domain.** Jawabannya ada pada orang yang paham prosesnya, bukan pada dokumentasi library. Tanyakan ke tim backend atau ke pemilik produk, dan tulis jawabannya di dekat kode mutasinya.

### Latihan 3: Centang tugas yang terasa instan

Pada aplikasi daftar tugas, mencentang tugas harus terasa langsung, padahal server butuh 400 milidetik. Terapkan pembaruan optimistis lengkap: tampilan berubah seketika, dibatalkan kalau gagal, pengguna diberi tahu, dan dua centang cepat berurutan tidak membuat data berselisih.

> [!pembahasan]
>
> ```tsx
> function useCentangTugas(filter: FilterTugas) {
>   const klien = useQueryClient();
>   const kunciDaftar = kunci.tugas.daftar(filter);
>
>   return useMutation({
>     mutationFn: ({ id, selesai }: { id: string; selesai: boolean }) =>
>       simpanStatusTugas(id, selesai),
>
>     onMutate: async ({ id, selesai }) => {
>       await klien.cancelQueries({ queryKey: kunciDaftar });
>       const sebelumnya = klien.getQueryData<Tugas[]>(kunciDaftar);
>
>       klien.setQueryData<Tugas[]>(kunciDaftar, (lama = []) =>
>         lama.map((t) => (t.id === id ? { ...t, selesai } : t))
>       );
>
>       return { sebelumnya };
>     },
>
>     onError: (_e, variabel, konteks) => {
>       if (konteks?.sebelumnya) {
>         klien.setQueryData(kunciDaftar, konteks.sebelumnya);
>       }
>       tampilkanNotifikasi(
>         `Gagal menyimpan "${variabel.id}". Perubahan dibatalkan, coba lagi.`
>       );
>     },
>
>     onSettled: () => {
>       klien.invalidateQueries({ queryKey: kunciDaftar });
>     },
>   });
> }
> ```
>
> Lima hal yang membedakan ini dari contoh dokumentasi:
>
> 1. **`cancelQueries` sebelum mengubah cache.** Tanpa itu, pengambilan yang sudah jalan bisa selesai setelah perubahan optimistis Anda, lalu menimpanya dengan data lama dari server. Centang pengguna seolah batal sendiri.
> 2. **Pembatalan memakai salinan utuh**, bukan dengan membalik nilainya. Membalik nilai salah saat ada dua mutasi berdekatan.
> 3. **`onSettled` tetap melakukan invalidasi meski berhasil.** Server bisa punya kebenaran lain, misalnya tugas itu sudah dihapus pengguna lain.
> 4. **Pengguna diberi tahu saat gagal.** Ini yang membedakan "terasa cepat" dari "terasa tidak bisa dipercaya".
> 5. **Kunci daftar dihitung dari filter yang aktif.** Kalau Anda memakai kunci tanpa filter, perubahan hanya terlihat di satu daftar dan daftar lain tetap basi.
>
> Satu catatan untuk aksi yang berisiko: kalau tugas ini punya nilai uang, misalnya "tandai pembayaran diterima", jangan optimistis. Tunjukkan tombol dalam keadaan memuat dan tunggu jawaban server.

### Latihan 4: Cari penyebabnya

Tiga laporan bug dari aplikasi yang sudah memakai TanStack Query. Untuk masing-masing, sebutkan penyebab yang paling mungkin dan perbaikannya.

| | Laporan |
| --- | --- |
| **A** | "Saya ganti filter kategori, tapi daftar produknya tidak berubah." |
| **B** | "Setiap kali saya pindah tab lalu kembali, halaman berkedip memuat ulang." |
| **C** | "Saya edit nama produk, tersimpan, tapi di halaman daftar masih nama lama. Kalau saya refresh browser baru benar." |

> [!jawaban]
>
> **A: `queryKey` tidak memuat filternya.** Kuncinya kemungkinan `['produk']` saja, jadi semua kombinasi filter berbagi satu entri cache. Perbaikannya memasukkan filter ke kunci: `['produk', 'daftar', { kategori, urut }]`. Ini bug paling umum nomor satu pada pemakaian library data.
>
> **B: `staleTime` bernilai nol, dan pemeriksaan ulang saat tab kembali aktif menyalakan pengambilan baru.** Perilakunya sebenarnya benar, yang salah tampilannya: komponen menampilkan kerangka pemuatan untuk `isFetching`, padahal seharusnya hanya untuk `isPending`. Dua perbaikannya: pakai `isPending` untuk kerangka, dan setel `staleTime` yang wajar sesuai seberapa cepat data itu benar-benar berubah.
>
> **C: tidak ada invalidasi setelah mutasi berhasil.** Cache daftar masih memegang versi lama, dan refresh browser menghapus cache sehingga datanya terlihat benar. Perbaikannya `invalidateQueries` pada kunci daftar di `onSuccess`. Alternatif yang lebih mulus kalau respons mutasi mengembalikan produk yang sudah diperbarui: tulis langsung ke cache dengan `setQueryData`, sehingga tidak perlu satu permintaan tambahan.
>
> Ketiga laporan ini punya satu pola bersama: **gejalanya di tampilan, penyebabnya di rancangan cache.** Begitu Anda memakai library data, pemecahan masalah bergeser dari "kenapa komponen ini tidak menggambar ulang" ke "entri cache mana yang terbaca, dan kapan dianggap basi". React Query Devtools, yang bisa dipasang sebagai komponen terpisah, memperlihatkan seluruh isi cache beserta statusnya, dan sebaiknya dipasang sejak hari pertama.

## Batasnya

Lapisan data menyelesaikan pembacaan dan perubahan data server. Tiga hal tetap di luar jangkauannya.

**Validasi bentuk data.** TanStack Query mengembalikan apa pun yang dikirim server tanpa memeriksanya. Tipe yang Anda tulis untuk respons itu masih janji sepihak, persis seperti catatan di akhir modul 8.

**Form yang serius.** Mutation mengurus pengiriman, bukan pengisian. Form dengan dua puluh isian, validasi bersyarat, dan pesan error per kolom tetap pekerjaan terpisah.

**Pengambilan pertama yang cepat.** Semua yang dibahas di modul ini berjalan di browser, jadi urutannya tetap: unduh HTML, unduh JavaScript, jalankan, baru minta data. Pengguna menunggu tiga langkah sebelum melihat isi. Itu masalah yang dijawab render di server pada modul 14.

## Rangkuman

- Data server bukan state komponen. Ia dimiliki pihak lain, bisa basi, dibutuhkan banyak komponen, dan perlu bertahan lebih lama daripada komponennya. Yang Anda butuhkan adalah cache.
- Tujuh pekerjaan (keadaan, pembatalan, deduplikasi, cache, percobaan ulang, invalidasi, optimistis) muncul di setiap endpoint. Jangan menulisnya dua puluh kali.
- `isPending` berarti belum ada data, `isFetching` berarti sedang mengambil meski data lama sudah ada. Membedakannya menghapus kedipan tampilan.
- `queryKey` harus memuat semua yang mengubah hasil, disusun dari umum ke khusus, dan dikumpulkan di satu berkas.
- `staleTime` adalah pertanyaan produk: seberapa lama data lama masih boleh dipercaya.
- Setelah mutasi, invalidasi tepat sasaran. Terlalu luas membuang bandwidth, terlalu sempit meninggalkan data basi.
- Pembaruan optimistis butuh pembatalan dengan salinan utuh, `cancelQueries` lebih dulu, dan pemberitahuan ke pengguna saat gagal. Jangan dipakai untuk aksi yang berkonsekuensi.
- Gulir tanpa akhir harus punya tombol sebagai alternatif, dan pagination berbasis kursor lebih aman daripada nomor halaman.

## Masalah terbuka

Pembacaan dan perubahan data sudah beres. Sekarang buka form pendaftaran di aplikasi Anda, dan hitung berapa `useState` di dalamnya.

Form nyata punya tuntutan yang tidak terbayang dari contoh "input nama dan email": validasi yang berbeda per kolom, aturan yang bergantung pada kolom lain ("nomor NPWP wajib kalau jenis akun perusahaan"), pesan error yang hanya muncul setelah pengguna selesai mengisi, kolom yang bertambah dan berkurang, pengiriman yang bisa gagal dengan error per kolom dari server, dan draf yang tidak boleh hilang saat tab tertutup.

Dikerjakan dengan `useState` per kolom, itu lima belas state dan satu fungsi validasi raksasa. Dan di balik semuanya ada pertanyaan dari modul 8 yang belum dijawab: siapa yang memastikan data yang masuk benar-benar berbentuk seperti yang dijanjikan tipenya?

Itu isi modul berikutnya: form, validasi berlapis dengan skema, dan pengalaman input yang tidak menyiksa.
