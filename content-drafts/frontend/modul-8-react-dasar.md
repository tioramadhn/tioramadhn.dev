---
title: 'Modul 8: React: Komponen, State, dan Model Render'
description: Berhenti memerintahkan perubahan satu per satu, mulai mendeklarasikan tampilan sebagai hasil dari data. Satu pergeseran cara berpikir yang menjawab empat keluhan dari proyek pertama.
date: 2026-11-15
slug: modul-8-react-dasar
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Empat keluhan yang Anda kumpulkan sendiri di Proyek 1:

1. Fungsi `render()` tunggal yang menggambar seluruh halaman tumbuh tanpa batas.
2. Menggambar ulang semuanya menghapus fokus, seleksi teks, dan posisi kursor.
3. Tidak ada cara memakai ulang satu potong UI beserta logikanya.
4. Hubungan "kalau state ini berubah, bagian itu harus ikut berubah" ditulis dengan tangan.

React menjawab keempatnya dengan satu kalimat yang pantas ditulis di dinding:

```text
tampilan = fungsi(state)
```

Anda tidak lagi menulis "hapus baris ini, ubah angka itu, nonaktifkan tombol sana". Anda menulis "dengan data seperti ini, tampilannya begini", lalu React mencari sendiri perubahan paling kecil yang perlu dilakukan pada halaman.

## Cara kerjanya: tiga tahap setiap pembaruan

Pola di modul 5 menggambar ulang seluruh daftar dengan `replaceChildren`, dan karenanya fokus serta seleksi teks hilang. React tidak begitu. Setiap kali state berubah, tiga hal terjadi:

**1. Render.** React menjalankan fungsi komponen Anda dan mendapat deskripsi tampilan yang diinginkan. Deskripsi ini objek JavaScript biasa, bukan elemen DOM.

**2. Rekonsiliasi.** React membandingkan deskripsi baru dengan yang sebelumnya, dan menyusun daftar perbedaannya.

**3. Commit.** Hanya perbedaan itu yang diterapkan ke DOM nyata. Elemen yang tidak berubah tidak disentuh, jadi fokus, posisi kursor, dan seleksi teks tetap utuh.

Tahap pertama yang paling sering disalahpahami: **fungsi komponen Anda dijalankan ulang berkali-kali**, dan itu normal. Karena itu komponen tidak boleh mengerjakan hal di luar menggambar, misalnya mengirim permintaan atau mengubah variabel di luar dirinya. Fungsi yang murni dapat dijalankan ulang tanpa akibat, dan kemurnian itu syarat kerja React, bukan saran gaya.

Analogi petugas papan tulis dari modul 5 masih berlaku, dengan satu tambahan: petugas sekarang menggambar versi barunya di kertas kalkir, menumpuknya di atas gambar lama, lalu hanya menebalkan bagian yang berbeda. Itu rekonsiliasi.

## Komponen dan JSX

```tsx
interface KartuCuacaProps {
  nama: string;
  suhu: number;
  kondisi: string;
  onHapus: () => void;
}

export function KartuCuaca({ nama, suhu, kondisi, onHapus }: KartuCuacaProps) {
  return (
    <li className="kartu">
      <h3>{nama}</h3>
      <p className="suhu">{suhu} derajat</p>
      <p>{kondisi}</p>
      <button type="button" onClick={onHapus} aria-label={`Hapus ${nama}`}>
        Hapus
      </button>
    </li>
  );
}
```

Empat hal yang perlu diluruskan sejak awal:

**JSX bukan HTML.** `class` jadi `className`, `for` jadi `htmlFor`, dan nama event memakai gaya camelCase. Isi dalam kurung kurawal adalah ekspresi JavaScript, jadi `{suhu}` menampilkan nilainya dan `{suhu > 30 && <p>Panas</p>}` menampilkan elemen secara bersyarat.

**Props mengalir satu arah, dari induk ke anak.** Anak tidak boleh mengubah props-nya. Kalau anak perlu memberi kabar ke induk, induk mengirim fungsi, seperti `onHapus` di atas.

**Komponen hanya fungsi yang mengembalikan deskripsi tampilan.** Namanya dimulai huruf besar, dan itu bukan konvensi gaya: huruf kecil ditafsirkan React sebagai tag HTML biasa.

**Semantik modul 2 tetap berlaku sepenuhnya.** Perhatikan `li`, `button type="button"`, dan `aria-label` di contoh. React tidak menghapus satu pun aturan HTML, dan mudahnya menulis `<div onClick>` di React membuat pelanggaran justru lebih sering terjadi.

## State: ingatan sebuah komponen

```tsx
import { useState } from 'react';

export function Penghitung() {
  const [jumlah, setJumlah] = useState(0);

  return (
    <div>
      <p>Jumlah: {jumlah}</p>
      <button type="button" onClick={() => setJumlah(jumlah + 1)}>
        Tambah
      </button>
    </div>
  );
}
```

Tiga aturan state yang menjelaskan hampir semua kebingungan pemula.

**Pertama, memanggil setter tidak langsung mengubah nilainya.**

```tsx
function tambahTiga() {
  setJumlah(jumlah + 1);
  setJumlah(jumlah + 1);
  setJumlah(jumlah + 1);
  // Hasilnya naik satu, bukan tiga
}

function tambahTigaBenar() {
  setJumlah((n) => n + 1);
  setJumlah((n) => n + 1);
  setJumlah((n) => n + 1);
  // Hasilnya naik tiga
}
```

Pada satu kali penanganan event, `jumlah` adalah nilai tetap seperti foto. Kalau nilai baru dihitung dari nilai lama, pakai bentuk fungsi.

**Kedua, state harus diganti, bukan diubah.** Kebiasaan dari modul 4 terpakai di sini:

```tsx
// Salah: React tidak tahu ada yang berubah
tugas.push(baru);
setTugas(tugas);

// Benar: array baru
setTugas([...tugas, baru]);

// Benar: objek baru dengan satu field diubah
setFilter({ ...filter, status: 'selesai' });
```

**Ketiga, state tinggal di tempat terendah yang masih bisa melayani semua yang membutuhkannya.** Kalau hanya satu komponen yang perlu, taruh di sana. Kalau dua komponen bersaudara perlu, naikkan ke induk bersamanya. Menaikkan semua state ke komponen teratas adalah penyebab aplikasi React yang terasa lambat dan sulit dibaca.

## Daftar dan `key`

```tsx
export function DaftarKota({ kota, onHapus }: Props) {
  return (
    <ul>
      {kota.map((k) => (
        <KartuCuaca key={k.id} nama={k.nama} suhu={k.suhu} kondisi={k.kondisi}
          onHapus={() => onHapus(k.id)} />
      ))}
    </ul>
  );
}
```

`key` adalah cara React mengenali item yang sama di antara dua kali render. Dua aturan tegasnya: harus unik di antara saudaranya, dan harus stabil, yaitu tidak berubah untuk item yang sama.

Memakai indeks array sebagai `key` adalah bug yang menunggu waktu, dan Latihan 2 akan menunjukkan akibatnya dengan jelas.

## Form dan input terkendali

```tsx
export function FormCari({ onCari }: { onCari: (q: string) => void }) {
  const [kataKunci, setKataKunci] = useState('');

  return (
    <form
      role="search"
      onSubmit={(peristiwa) => {
        peristiwa.preventDefault();
        onCari(kataKunci.trim());
      }}
    >
      <label htmlFor="q">Cari kota</label>
      <input
        id="q"
        name="q"
        type="search"
        value={kataKunci}
        onChange={(peristiwa) => setKataKunci(peristiwa.target.value)}
      />
      <button type="submit" disabled={!kataKunci.trim()}>
        Cari
      </button>
    </form>
  );
}
```

Pola `value` ditambah `onChange` ini disebut input terkendali: nilai yang terlihat selalu berasal dari state, bukan dari DOM. Keuntungannya langsung terasa, misalnya tombol yang otomatis nonaktif saat isian kosong, dan itu satu baris.

## Komposisi: cara memakai ulang tampilan

Masalah "tidak ada cara memakai ulang satu potong UI" dijawab dengan komposisi, bukan dengan menambah props tanpa akhir.

```tsx
// Wadah yang tidak tahu apa pun tentang isinya
interface PanelProps {
  judul: string;
  aksi?: React.ReactNode;
  children: React.ReactNode;
}

export function Panel({ judul, aksi, children }: PanelProps) {
  return (
    <section className="panel">
      <header>
        <h2>{judul}</h2>
        {aksi}
      </header>
      {children}
    </section>
  );
}

// Dipakai dengan isi yang berbeda-beda
<Panel judul="Kota dipantau" aksi={<button type="button">Segarkan</button>}>
  <DaftarKota kota={kota} onHapus={hapus} />
</Panel>;
```

Patokan yang menyelamatkan banyak proyek: **kalau sebuah komponen sudah punya delapan props boolean, yang Anda butuhkan hampir selalu komposisi, bukan props kesembilan.** Komponen `Panel` dengan `punyaHeader`, `punyaFooter`, `bisaDitutup`, `varian`, dan seterusnya akan jadi sarang `if` yang tidak ada ujungnya.

## Apa yang layak jadi state

Ini keputusan yang paling menentukan kualitas kode React Anda, dan aturannya sama dengan modul 5:

| Jenis nilai | Tempatnya | Contoh |
| --- | --- | --- |
| Bisa dihitung dari state lain | Jangan jadi state, hitung saat render | Total harga, jumlah item, hasil filter |
| Bisa dihitung dari props | Jangan jadi state | Nama lengkap dari nama depan dan belakang |
| Perlu dibagikan lewat tautan | URL | Kata kunci, filter, nomor halaman |
| Berasal dari server | Lapisan data dengan cache | Daftar produk, profil |
| Hanya untuk komponen ini | `useState` di komponen itu | Dialog terbuka, tab aktif |
| Rujukan ke DOM atau nilai yang tidak memicu gambar ulang | `useRef` | Elemen input, id timer |

Baris pertama yang paling sering dilanggar:

```tsx
// Salah: dua sumber kebenaran yang bisa berselisih
const [tugas, setTugas] = useState<Tugas[]>([]);
const [jumlahSelesai, setJumlahSelesai] = useState(0);

// Benar: dihitung dari satu sumber
const [tugas, setTugas] = useState<Tugas[]>([]);
const jumlahSelesai = tugas.filter((t) => t.selesai).length;
```

Versi kedua tidak mungkin berselisih, dan tidak ada satu pun fungsi yang perlu ingat memperbarui dua tempat. Ini persis Latihan 2 di modul 5, sekarang dengan alat yang membuat jawaban benarnya lebih singkat daripada jawaban salahnya.

## Soal memo dan performa

Dulu kode React penuh `useMemo` dan `useCallback` untuk mencegah gambar ulang yang tidak perlu. React Compiler, yang sekarang menjadi bagian dari alur kerja React modern, melakukan sebagian besar pekerjaan itu secara otomatis saat build.

Dua hal yang perlu Anda lakukan, dan keduanya bukan menghafal API:

1. **Tulis komponen yang murni.** Jangan mengubah props, jangan mengubah variabel di luar komponen, jangan memanggil hook secara bersyarat. Pengoptimalan otomatis hanya bisa bekerja pada kode yang bisa diprediksi.
2. **Jangan mengoptimalkan sebelum mengukur.** Pasang React DevTools, nyalakan "Highlight updates", dan lihat apa yang benar-benar digambar ulang. Modul 17 membahas cara mengukurnya dengan serius.

Yang masih perlu ditangani tangan: perhitungan yang benar-benar berat (misalnya mengolah sepuluh ribu baris), dan itu kasus yang jarang. Kalau Anda sedang menambahkan `useMemo` karena merasa "biar lebih cepat", hampir pasti Anda sedang menambah kerumitan tanpa hasil.

## Latihan

### Latihan 1: Pindahkan dasbor cuaca ke React

Buat proyek baru dengan `pnpm create vite dasbor-react --template react-ts`, lalu pindahkan Proyek 1 ke dalamnya dengan pembagian komponen berikut:

```text
src/
├── App.tsx
├── components/
│   ├── FormCari.tsx
│   ├── HasilCari.tsx
│   ├── DaftarKota.tsx
│   ├── KartuCuaca.tsx
│   └── Prakiraan.tsx
└── lib/
    ├── cuaca.ts    (dipakai apa adanya dari modul 7)
    └── format.ts
```

Syaratnya: `lib/cuaca.ts` tidak diubah sama sekali, tidak ada satu pun pemanggilan `document.querySelector`, keenam keadaan tampilan dari Proyek 1 tetap tertangani, dan `KartuCuaca` tidak tahu apa pun tentang cara data diambil.

> [!petunjuk]
> Mulai dari gambar pohon komponennya di kertas, beserta tanda di mana setiap state tinggal. Kata kunci pencarian hanya dibutuhkan `FormCari` dan `App`, sedangkan daftar kota dibutuhkan `App` dan turunannya. Jangan pindahkan semuanya ke `App` tanpa alasan.

> [!jawaban]
>
> ```tsx
> // App.tsx
> export default function App() {
>   const [kota, setKota] = useState<Kota[]>(() => bacaDariPenyimpanan());
>   const [cuaca, setCuaca] = useState<Record<string, StatusCuaca>>({});
>   const [hasilCari, setHasilCari] = useState<Kota[]>([]);
>   const [urut, setUrut] = useState<'nama' | 'suhu'>('nama');
>
>   // Dihitung, bukan disimpan
>   const kotaTerurut = urutkan(kota, cuaca, urut);
>
>   async function tambahKota(baru: Kota) {
>     if (kota.some((k) => k.id === baru.id)) return;
>
>     setKota((sebelumnya) => [...sebelumnya, baru]);
>     setCuaca((sebelumnya) => ({ ...sebelumnya, [baru.id]: { status: 'memuat' } }));
>     setHasilCari([]);
>
>     try {
>       const data = await ambilCuaca(baru);
>       setCuaca((s) => ({ ...s, [baru.id]: { status: 'siap', data } }));
>     } catch (error) {
>       setCuaca((s) => ({
>         ...s,
>         [baru.id]: {
>           status: 'gagal',
>           pesan: error instanceof Error ? error.message : 'Gagal memuat',
>           data: s[baru.id]?.data,
>         },
>       }));
>     }
>   }
>
>   return (
>     <>
>       <header>
>         <h1>Dasbor Cuaca</h1>
>         <FormCari onHasil={setHasilCari} />
>       </header>
>       <main>
>         {hasilCari.length > 0 && (
>           <HasilCari hasil={hasilCari} onPilih={tambahKota} />
>         )}
>         <DaftarKota
>           kota={kotaTerurut}
>           cuaca={cuaca}
>           onHapus={hapusKota}
>           onCobaLagi={muatUlang}
>         />
>       </main>
>     </>
>   );
> }
> ```
>
> Empat hal yang layak diperhatikan:
>
> 1. **`lib/cuaca.ts` tidak disentuh.** Itu buah dari pemisahan lapisan data di Proyek 1. Kalau dulu kode `fetch` bercampur dengan kode DOM, langkah ini akan jadi penulisan ulang total.
> 2. **`kotaTerurut` dihitung di dalam render**, bukan disimpan di state. Mengubah pilihan urutan otomatis mengubah tampilan, tanpa satu pun kode yang perlu "ikut memperbarui".
> 3. **`useState(() => bacaDariPenyimpanan())`** memakai bentuk fungsi, supaya `localStorage` hanya dibaca satu kali, bukan setiap render.
> 4. **`setCuaca((s) => ...)`** memakai bentuk fungsi karena nilai barunya dihitung dari nilai lama, dan beberapa pembaruan bisa terjadi berdekatan saat banyak kota dimuat bersamaan.
>
> Satu hal yang sengaja belum rapi: pemanggilan `ambilCuaca` di dalam handler masih terasa canggung, terutama saat Anda perlu membatalkannya. Itu bahan modul 9 dan modul 11.

### Latihan 2: Bug `key`

Komponen ini menampilkan daftar catatan yang bisa diubah dan dihapus. Pelapor mengatakan: setelah menghapus catatan pertama, teks yang sedang ia ketik di catatan kedua berpindah ke tempat yang salah.

```tsx
export function DaftarCatatan({ catatan, onHapus }: Props) {
  return (
    <ul>
      {catatan.map((c, indeks) => (
        <li key={indeks}>
          <input defaultValue={c.judul} />
          <button type="button" onClick={() => onHapus(c.id)}>
            Hapus
          </button>
        </li>
      ))}
    </ul>
  );
}
```

Jelaskan penyebabnya, lalu perbaiki.

> [!petunjuk]
> `key` adalah identitas, bukan nomor urut. Bayangkan daftar berisi A, B, C dengan key 0, 1, 2. Setelah A dihapus, daftarnya jadi B, C dengan key 0, 1. Menurut React, item berkey 0 tadinya A dan sekarang B. Apa yang disimpulkannya?

> [!jawaban]
>
> React menyimpulkan bahwa item berkey 0 masih item yang sama, hanya isinya berubah. Jadi elemen DOM-nya dipakai ulang, termasuk `input` beserta nilai yang sedang diketik pengguna. Teks ketikan untuk B tetap berada di baris pertama, yang sekarang menampilkan B, dan terasa seperti teks berpindah.
>
> Dua kesalahan sekaligus di kode itu:
>
> 1. **`key={indeks}`** membuat identitas bergantung pada posisi. Perbaikannya `key={c.id}`, yaitu identitas yang mengikuti datanya.
> 2. **`defaultValue`** membuat input tidak terkendali, jadi nilai sebenarnya hidup di DOM dan tidak terhubung dengan state. Dua sumber kebenaran lagi, dan React tidak bisa membantu menjaganya.
>
> ```tsx
> {catatan.map((c) => (
>   <li key={c.id}>
>     <label htmlFor={`judul-${c.id}`}>Judul catatan</label>
>     <input
>       id={`judul-${c.id}`}
>       value={c.judul}
>       onChange={(e) => onUbahJudul(c.id, e.target.value)}
>     />
>     <button type="button" onClick={() => onHapus(c.id)}>
>       Hapus
>     </button>
>   </li>
> ))}
> ```
>
> Indeks sebagai `key` hanya aman pada satu keadaan: daftar yang tidak pernah berubah urutan, tidak pernah disisipi, dan isinya tidak punya state sendiri. Karena ketiga syarat itu jarang dijamin selamanya, kebiasaan yang lebih baik adalah selalu memakai id dari datanya.

### Latihan 3: Filter yang dipakai dua komponen

Tambahkan penyaringan ke dasbor Anda: pengguna bisa menyaring kota berdasarkan kondisi ("semua", "hujan", "cerah"), dan jumlah hasil ditampilkan di dua tempat, yaitu di dekat tombol filter dan di judul bagian daftar.

Kerjakan tanpa menambah satu pun state baru selain pilihan filternya.

> [!pembahasan]
>
> ```tsx
> // App.tsx
> const [filter, setFilter] = useState<'semua' | 'hujan' | 'cerah'>('semua');
>
> // Satu-satunya state baru. Dua angka di bawah ini dihitung.
> const kotaTerlihat = kota.filter((k) => {
>   if (filter === 'semua') return true;
>   const kondisi = cuaca[k.id]?.data?.kondisi?.toLowerCase() ?? '';
>   return filter === 'hujan'
>     ? kondisi.includes('hujan')
>     : kondisi.includes('cerah');
> });
>
> return (
>   <>
>     <FilterKondisi nilai={filter} onUbah={setFilter} jumlah={kotaTerlihat.length} />
>     <DaftarKota judul={`Kota yang dipantau (${kotaTerlihat.length})`} kota={kotaTerlihat} />
>   </>
> );
> ```
>
> Tiga hal yang jadi inti latihan ini:
>
> 1. **Satu nilai, dua tampilan, nol kemungkinan berselisih.** Bandingkan dengan Proyek 1 yang harus memperbarui dua tempat secara manual. Inilah keluhan nomor 4 yang hilang.
> 2. **State filter tinggal di `App`** karena dua komponen bersaudara membutuhkannya. Ini "menaikkan state", dan dinaikkan hanya sampai induk terdekat yang melayani keduanya, tidak lebih tinggi.
> 3. **Hasil filter tidak disimpan.** Begitu Anda menyimpan `kotaTerlihat` di state, Anda harus mengingat memperbaruinya setiap kali `kota`, `cuaca`, atau `filter` berubah. Tiga kewajiban mengingat yang bisa dihapus hanya dengan menghitungnya.
>
> Bonus yang pantas dicoba: pindahkan nilai filter ke URL dengan `useSearchParams` saat Anda masuk ke routing, supaya tampilan yang disaring bisa dibagikan. Modul 13 mengerjakan ini dengan dukungan framework.

### Latihan 4: Temukan state yang tidak seharusnya ada

Komponen ini punya tiga masalah. Temukan semuanya, lalu tulis ulang.

```tsx
export function RingkasanKeranjang({ item }: { item: Item[] }) {
  const [total, setTotal] = useState(0);
  const [kosong, setKosong] = useState(true);
  const [formatRupiah, setFormatRupiah] = useState('Rp0');

  useEffect(() => {
    const t = item.reduce((n, i) => n + i.harga * i.jumlah, 0);
    setTotal(t);
    setKosong(item.length === 0);
    setFormatRupiah(
      new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(t)
    );
  }, [item]);

  if (kosong) return <p>Keranjang kosong</p>;
  return <p>Total: {formatRupiah}</p>;
}
```

> [!jawaban]
>
> **Masalah 1: ketiga state adalah nilai turunan.** `total`, `kosong`, dan `formatRupiah` semuanya bisa dihitung dari `item`. Menyimpannya berarti punya empat sumber kebenaran untuk satu kenyataan.
>
> **Masalah 2: `useEffect` dipakai untuk menghitung.** Ini pola yang paling sering salah di React. Akibatnya nyata, bukan sekadar soal gaya: komponen digambar sekali dengan nilai lama, effect jalan, state diubah, lalu digambar lagi. Dua kali render untuk hasil yang bisa didapat dalam satu kali, dan di antaranya ada satu momen ketika pengguna melihat angka yang belum diperbarui.
>
> **Masalah 3: render pertama selalu menampilkan "Keranjang kosong"**, bahkan saat `item` sudah berisi, karena `kosong` bernilai awal `true` dan baru dikoreksi effect. Itu kedipan tampilan yang akan dilaporkan sebagai bug.
>
> ```tsx
> const formatter = new Intl.NumberFormat('id-ID', {
>   style: 'currency',
>   currency: 'IDR',
>   maximumFractionDigits: 0,
> });
>
> export function RingkasanKeranjang({ item }: { item: Item[] }) {
>   if (item.length === 0) return <p>Keranjang kosong</p>;
>
>   const total = item.reduce((n, i) => n + i.harga * i.jumlah, 0);
>   return <p>Total: {formatter.format(total)}</p>;
> }
> ```
>
> Nol state, nol effect, satu kali render, dan tidak ada kedipan. Formatter dibuat sekali di luar komponen, karena membuatnya ulang setiap render adalah pekerjaan yang tidak perlu.
>
> Patokan yang bisa dipakai selamanya: **kalau Anda menulis `useEffect` yang isinya hanya memanggil `setState` berdasarkan props atau state lain, hampir pasti yang Anda butuhkan adalah perhitungan biasa.** Modul berikutnya membahas kapan `useEffect` benar-benar tepat, dan ternyata jauh lebih jarang daripada dugaan umum.

## Batasnya

React menjawab empat keluhan Proyek 1, dan dengan sengaja tidak mengurus hal lain. Lima pekerjaan yang masih kosong:

**Berbicara dengan dunia luar.** Mengambil data, memasang listener di `window`, mengatur judul dokumen, dan menghubungkan diri ke WebSocket adalah hal di luar menggambar. Itu wilayah `useEffect`, dan modul 9 membahas aturan pemakaiannya.

**Berbagi nilai ke seluruh pohon komponen.** Tema dan data pengguna yang login dibutuhkan hampir semua komponen. Mengirimnya lewat props berlapis tujuh tidak masuk akal.

**Berbagi logika antar komponen.** Debounce, pembacaan `localStorage`, dan deteksi ukuran layar akan dipakai di banyak tempat. Itu tugas custom hook.

**Cache data server.** React tidak punya pendapat soal ini. Dua komponen yang memanggil data yang sama akan memanggilnya dua kali, dan data yang sudah diambil hilang begitu komponen dilepas. Modul 11 menjawabnya.

**Styling.** `className` di contoh-contoh modul ini masih menunjuk ke CSS yang belum disusun. Modul 10 membahas penataannya untuk skala aplikasi.

## Rangkuman

- `tampilan = fungsi(state)`. Anda mendeklarasikan hasil, React mencari perubahan terkecil untuk mencapainya.
- Setiap pembaruan melewati render, rekonsiliasi, lalu commit. Hanya perbedaannya yang menyentuh DOM, jadi fokus dan seleksi teks pengguna tidak hilang.
- Fungsi komponen dijalankan berulang kali, jadi harus murni: tidak mengubah apa pun di luar dirinya.
- State diganti, tidak diubah. Nilai baru yang dihitung dari nilai lama memakai bentuk fungsi pada setter.
- State tinggal di tempat terendah yang masih melayani semua yang membutuhkannya.
- Nilai yang bisa dihitung tidak disimpan di state, dan `useEffect` bukan alat untuk menghitung.
- `key` adalah identitas, bukan nomor urut. Pakai id dari data.
- Delapan props boolean adalah tanda bahwa yang dibutuhkan adalah komposisi.
- Semantik HTML dan aksesibilitas dari modul 2 berlaku penuh di JSX.

## Masalah terbuka

Dasbor Anda sekarang jalan dengan komponen yang rapi, dan satu bagian masih terasa janggal: pemanggilan `ambilCuaca` di dalam penanganan event. Bagaimana kalau data harus dimuat begitu komponen muncul, bukan setelah ada klik? Bagaimana membatalkan permintaan saat pengguna berpindah halaman sebelum data datang? Dan di mana menaruh kode yang memasang listener `online` dan `offline`?

Ketiganya tentang hal yang sama: menghubungkan komponen Anda dengan dunia di luar React. Alatnya `useEffect`, dan reputasinya buruk karena sering dipakai untuk hal yang bukan tugasnya.

Itu isi modul berikutnya: `useEffect` beserta aturan pemakaiannya, `useRef`, `useReducer`, Context, dan cara membungkus logika jadi custom hook yang bisa dipakai di mana-mana.
