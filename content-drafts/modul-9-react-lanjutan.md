---
title: 'Modul 9: React Lanjutan: Hook, Context, dan Komposisi'
description: useEffect punya reputasi buruk karena dipakai untuk hal yang bukan tugasnya. Modul ini membereskan itu, lalu membangun custom hook, Context, dan useReducer yang benar-benar dipakai di aplikasi nyata.
date: 2026-11-16
slug: modul-9-react-lanjutan
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Modul sebelumnya menutup dengan tiga pertanyaan praktis: bagaimana memuat data begitu komponen muncul, bagaimana membatalkan permintaan saat pengguna berpindah halaman, dan di mana menaruh listener `online` dan `offline`.

Ketiganya tentang satu hal: menghubungkan komponen dengan dunia di luar React. Alatnya `useEffect`, dan modul ini dimulai dengan membatasi pemakaiannya, bukan memperluasnya.

## `useEffect` adalah untuk sinkronisasi, bukan untuk reaksi

Satu kalimat yang mengubah cara banyak orang menulis React: `useEffect` dipakai untuk **menyinkronkan komponen Anda dengan sistem di luar React**. Bukan untuk "menjalankan sesuatu saat state berubah".

| Kebutuhan | Pakai `useEffect`? | Yang benar |
| --- | --- | --- |
| Menghitung total dari daftar | Tidak | Hitung saat render |
| Menyaring daftar saat kata kunci berubah | Tidak | Hitung saat render |
| Mengubah state lain saat props berubah | Tidak | Hitung saat render, atau `key` untuk mereset |
| Mengirim data saat tombol diklik | Tidak | Di dalam penanganan event |
| Memberi tahu induk bahwa sesuatu terjadi | Tidak | Panggil callback di penanganan event |
| Memasang listener di `window` | Ya | `useEffect` dengan cleanup |
| Menghubungkan ke WebSocket | Ya | `useEffect` dengan cleanup |
| Memuat data saat komponen muncul | Ya, dengan catatan | `useEffect`, atau library data di modul 11 |
| Mengatur `document.title` | Ya | `useEffect` |
| Mengukur elemen DOM setelah tampil | Ya | `useEffect` atau `useLayoutEffect` |

Baris keempat dan kelima yang paling sering dilanggar, dan akibatnya nyata. Effect berjalan **setelah** render selesai, jadi setiap effect yang memanggil `setState` menghasilkan render kedua. Pengguna sempat melihat keadaan sebelum koreksi, dan pada daftar besar kedipan itu terlihat.

Bentuk lengkapnya:

```tsx
useEffect(() => {
  function tangani() {
    setLebar(window.innerWidth);
  }

  window.addEventListener('resize', tangani);

  // Pembersihan: dijalankan sebelum effect berikutnya dan saat komponen dilepas
  return () => window.removeEventListener('resize', tangani);
}, []); // Daftar dependensi: kosong berarti hanya saat muncul dan hilang
```

Tiga aturan yang membuat effect tidak jadi sumber bug:

**Satu, selalu bersihkan apa yang Anda pasang.** Listener, timer, langganan, dan permintaan jaringan. Tanpa itu, komponen yang dibuka tutup sepuluh kali meninggalkan sepuluh listener yang masih hidup.

**Dua, jujur soal dependensi.** Semua nilai dari luar yang dipakai di dalam effect harus masuk daftar. Membohongi daftar dependensi untuk "supaya tidak jalan terus" selalu berakhir pada effect yang memakai nilai lama. Kalau effect-nya terlalu sering jalan, yang salah hampir selalu bentuk kodenya, bukan daftarnya.

**Tiga, effect jalan dua kali saat pengembangan, dan itu disengaja.** React Strict Mode memasang lalu melepas komponen sekali tambahan untuk membuktikan pembersihan Anda benar. Effect yang bermasalah saat dijalankan dua kali adalah effect yang akan bermasalah di produksi, misalnya menambah satu item dua kali.

## Memuat data dengan `useEffect`

Ini kasus "ya, dengan catatan" dari tabel di atas. Bentuk yang benar:

```tsx
function useCuaca(kota: Kota | null) {
  const [keadaan, setKeadaan] = useState<StatusCuaca>({ status: 'kosong' });

  useEffect(() => {
    if (!kota) return;

    const kendali = new AbortController();
    setKeadaan({ status: 'memuat' });

    ambilCuaca(kota, kendali.signal)
      .then((data) => setKeadaan({ status: 'siap', data }))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setKeadaan({ status: 'gagal', pesan: error.message });
      });

    return () => kendali.abort();
  }, [kota]);

  return keadaan;
}
```

`return () => kendali.abort()` itu jawaban untuk pertanyaan "bagaimana membatalkan permintaan saat pengguna berpindah halaman". Tanpanya, permintaan untuk kota lama bisa datang setelah pengguna memilih kota baru, lalu menimpa data yang benar.

Tetap ada lima hal yang belum tertangani: data tidak dibagikan antar komponen, hilang saat komponen dilepas, tidak ada cache, tidak ada pembaruan latar, dan tidak ada pencegahan permintaan ganda. Modul 11 menyelesaikan kelimanya, dan sampai ke sana penting dulu memahami bentuk manualnya.

## `useRef`: nilai yang tidak memicu gambar ulang

```tsx
function FormCari() {
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);

  // Dipakai untuk memegang elemen DOM
  function fokuskan() {
    inputRef.current?.focus();
  }

  // Dipakai untuk memegang nilai yang tidak perlu menggambar ulang
  function ketik(nilai: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => cari(nilai), 300);
  }

  return <input ref={inputRef} onChange={(e) => ketik(e.target.value)} />;
}
```

Bedanya dengan state, dan ini pembedaan yang menentukan: mengubah `ref.current` tidak menggambar ulang apa pun. Jadi gunakan ref untuk hal yang tidak perlu dilihat pengguna (id timer, nilai sebelumnya, rujukan DOM), dan gunakan state untuk hal yang muncul di tampilan.

## `useReducer` untuk state yang punya aturan

Begitu satu state punya banyak cara berubah yang saling terkait, `useReducer` lebih jelas daripada lima `useState`. Dan di sini discriminated union dari modul 7 membayar dirinya sendiri.

```tsx
type AksiFilter =
  | { tipe: 'ubah-kata-kunci'; nilai: string }
  | { tipe: 'ubah-kondisi'; nilai: 'semua' | 'hujan' | 'cerah' }
  | { tipe: 'ubah-urutan'; nilai: 'nama' | 'suhu' }
  | { tipe: 'reset' };

interface Filter {
  kataKunci: string;
  kondisi: 'semua' | 'hujan' | 'cerah';
  urut: 'nama' | 'suhu';
  halaman: number;
}

const AWAL: Filter = { kataKunci: '', kondisi: 'semua', urut: 'nama', halaman: 1 };

function reducer(keadaan: Filter, aksi: AksiFilter): Filter {
  switch (aksi.tipe) {
    // Setiap perubahan filter mengembalikan halaman ke 1.
    // Aturan itu ditulis sekali di sini, bukan di setiap pemanggil.
    case 'ubah-kata-kunci':
      return { ...keadaan, kataKunci: aksi.nilai, halaman: 1 };
    case 'ubah-kondisi':
      return { ...keadaan, kondisi: aksi.nilai, halaman: 1 };
    case 'ubah-urutan':
      return { ...keadaan, urut: aksi.nilai };
    case 'reset':
      return AWAL;
  }
}

function Dasbor() {
  const [filter, kirim] = useReducer(reducer, AWAL);

  return (
    <input
      value={filter.kataKunci}
      onChange={(e) => kirim({ tipe: 'ubah-kata-kunci', nilai: e.target.value })}
    />
  );
}
```

Tiga keuntungan yang nyata: aturan "setiap perubahan filter mengembalikan halaman ke 1" ditulis satu kali, seluruh kemungkinan perubahan bisa dibaca dalam satu fungsi, dan `switch` tanpa `default` membuat TypeScript menandai setiap aksi baru yang belum ditangani.

Patokan memilih: `useState` untuk nilai yang berdiri sendiri, `useReducer` begitu ada aturan antar-field, atau begitu Anda menulis tiga setter yang selalu dipanggil bersama.

## Custom hook: cara memakai ulang logika

Custom hook hanyalah fungsi yang namanya dimulai dengan `use` dan boleh memanggil hook lain. Tidak ada keajaiban lain di dalamnya.

```tsx
// Menunda nilai sampai pengguna berhenti mengetik
export function useNilaiTertunda<T>(nilai: T, jeda = 300): T {
  const [tertunda, setTertunda] = useState(nilai);

  useEffect(() => {
    const timer = setTimeout(() => setTertunda(nilai), jeda);
    return () => clearTimeout(timer);
  }, [nilai, jeda]);

  return tertunda;
}

// Menyimpan state ke localStorage, aman di mode privat
export function usePenyimpanan<T>(kunci: string, awal: T) {
  const [nilai, setNilai] = useState<T>(() => {
    try {
      const tersimpan = localStorage.getItem(kunci);
      return tersimpan ? (JSON.parse(tersimpan) as T) : awal;
    } catch {
      return awal;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(kunci, JSON.stringify(nilai));
    } catch {
      // Penyimpanan penuh atau mode privat. Fitur simpan hilang, aplikasi jalan.
    }
  }, [kunci, nilai]);

  return [nilai, setNilai] as const;
}
```

Pemakaiannya jadi ringkas, dan komponen kembali berisi hal yang jadi urusannya:

```tsx
function Pencarian() {
  const [kataKunci, setKataKunci] = useState('');
  const kataKunciTertunda = useNilaiTertunda(kataKunci, 300);
  const hasil = useHasilCari(kataKunciTertunda);

  return (
    <>
      <input value={kataKunci} onChange={(e) => setKataKunci(e.target.value)} />
      <HasilCari hasil={hasil} />
    </>
  );
}
```

Dua aturan hook yang tidak bisa dilanggar: hook hanya dipanggil di tingkat teratas komponen atau hook lain (tidak di dalam `if`, loop, atau fungsi bersarang), dan hanya dari komponen atau hook lain. ESLint dengan aturan React akan menegakkannya, dan itu satu alasan lagi memasang linter di modul 6.

Satu patokan tentang kapan membuat custom hook: buat saat logika yang sama muncul di tempat kedua, atau saat satu komponen jadi sulit dibaca karena mencampur dua urusan. Membuat hook untuk logika yang hanya dipakai satu kali dan hanya satu baris biasanya menambah lapisan tanpa manfaat.

## Context: nilai untuk seluruh pohon

Context menyelesaikan masalah props yang harus diteruskan lewat tujuh lapis komponen yang tidak memakainya.

```tsx
// konteks-tema.tsx
type Tema = 'terang' | 'gelap';

interface IsiTema {
  tema: Tema;
  ubahTema: (tema: Tema) => void;
}

const KonteksTema = createContext<IsiTema | null>(null);

export function PenyediaTema({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = usePenyimpanan<Tema>('tema', 'terang');

  useEffect(() => {
    // Sinkronisasi dengan sistem di luar React: atribut pada <html>
    document.documentElement.dataset.tema = tema;
  }, [tema]);

  return (
    <KonteksTema.Provider value={{ tema, ubahTema: setTema }}>
      {children}
    </KonteksTema.Provider>
  );
}

// Hook pendamping: satu tempat untuk memeriksa provider
export function useTema() {
  const isi = useContext(KonteksTema);
  if (!isi) throw new Error('useTema harus dipakai di dalam PenyediaTema');
  return isi;
}
```

Pola "satu context, satu hook pendamping" layak dijadikan kebiasaan. Hook itu memberi pesan error yang jelas saat seseorang memakainya di luar provider, dan menyembunyikan `useContext` dari pemakai.

Tiga hal yang perlu diketahui sebelum memakai Context terlalu banyak:

**Context bukan alat manajemen state, hanya alat pengiriman.** State-nya tetap `useState` atau `useReducer` di dalam provider.

**Setiap perubahan nilai context menggambar ulang semua yang memakainya.** Jadi jangan menaruh nilai yang sering berubah bersama nilai yang hampir tidak pernah berubah dalam satu context. Pisahkan: tema di satu context, data pengguna di context lain, isi keranjang di context lain lagi.

**Data dari server sebaiknya tidak lewat Context.** Itu pekerjaan library data di modul 11, yang sudah menangani cache, pembaruan latar, dan deduplikasi permintaan.

## Latihan

### Latihan 1: Buang effect yang tidak perlu

Komponen ini punya empat `useEffect`, dan tiga di antaranya salah tempat. Temukan yang mana, jelaskan akibatnya, lalu tulis ulang.

```tsx
function HalamanProduk({ produkId, kataKunci }: Props) {
  const [produk, setProduk] = useState<Produk[]>([]);
  const [terfilter, setTerfilter] = useState<Produk[]>([]);
  const [jumlah, setJumlah] = useState(0);
  const [terpilih, setTerpilih] = useState<string | null>(null);

  useEffect(() => {
    muatProduk(produkId).then(setProduk);
  }, [produkId]);

  useEffect(() => {
    setTerfilter(produk.filter((p) => p.nama.includes(kataKunci)));
  }, [produk, kataKunci]);

  useEffect(() => {
    setJumlah(terfilter.length);
  }, [terfilter]);

  useEffect(() => {
    setTerpilih(null);
  }, [produkId]);

  return <Daftar produk={terfilter} jumlah={jumlah} terpilih={terpilih} />;
}
```

> [!petunjuk]
> Periksa setiap effect dengan satu pertanyaan: apakah ini berbicara dengan sesuatu di luar React? Kalau isinya hanya `setState` berdasarkan state atau props lain, tempatnya bukan di effect.

> [!jawaban]
>
> **Effect 1 benar.** Memuat data adalah berbicara dengan dunia luar. Tapi masih kurang satu hal: pembatalan. Kalau `produkId` berubah cepat, respons lama bisa datang terakhir dan menimpa data baru.
>
> **Effect 2 salah.** Hasil filter adalah perhitungan. Akibatnya: setiap ketikan menghasilkan dua kali render, dan pada satu momen di antaranya daftar yang tampil masih hasil filter kata kunci sebelumnya.
>
> **Effect 3 salah, dan lebih buruk.** `jumlah` turunan dari turunan, jadi ada tiga kali render berantai untuk satu ketikan.
>
> **Effect 4 salah, dan ini yang paling halus.** Mereset state saat props berubah bisa dikerjakan React sendiri lewat `key`. Dengan effect, komponen sempat digambar sekali dengan `terpilih` milik produk sebelumnya.
>
> ```tsx
> function HalamanProduk({ produkId, kataKunci }: Props) {
>   const [produk, setProduk] = useState<Produk[]>([]);
>   const [terpilih, setTerpilih] = useState<string | null>(null);
>
>   useEffect(() => {
>     const kendali = new AbortController();
>     muatProduk(produkId, kendali.signal)
>       .then(setProduk)
>       .catch((e) => {
>         if (e.name !== 'AbortError') throw e;
>       });
>     return () => kendali.abort();
>   }, [produkId]);
>
>   // Dihitung, bukan disimpan. Satu kali render.
>   const terfilter = produk.filter((p) => p.nama.includes(kataKunci));
>
>   return <Daftar produk={terfilter} jumlah={terfilter.length} terpilih={terpilih} />;
> }
>
> // Di induknya: reset otomatis saat produkId berubah
> <HalamanProduk key={produkId} produkId={produkId} kataKunci={kataKunci} />;
> ```
>
> Baris terakhir itu teknik yang layak dihafal: **mengubah `key` membuat React melepas komponen lama dan memasang yang baru**, jadi semua state di dalamnya kembali ke nilai awal. Satu baris menggantikan satu effect, dan tanpa render perantara yang salah.

### Latihan 2: Hook pencarian yang lengkap

Buat `useHasilCari(kataKunci: string)` yang menggabungkan apa yang sudah Anda pelajari: menunda 300 milidetik, membatalkan permintaan lama, mengembalikan discriminated union, dan tidak mengirim permintaan untuk kata kunci kosong.

> [!pembahasan]
>
> ```tsx
> type HasilCari =
>   | { status: 'siaga' }
>   | { status: 'memuat' }
>   | { status: 'kosong' }
>   | { status: 'siap'; data: Kota[] }
>   | { status: 'gagal'; pesan: string };
>
> export function useHasilCari(kataKunci: string): HasilCari {
>   const tertunda = useNilaiTertunda(kataKunci.trim(), 300);
>   const [hasil, setHasil] = useState<HasilCari>({ status: 'siaga' });
>
>   useEffect(() => {
>     if (tertunda.length < 2) {
>       setHasil({ status: 'siaga' });
>       return;
>     }
>
>     const kendali = new AbortController();
>     setHasil({ status: 'memuat' });
>
>     cariKota(tertunda, kendali.signal)
>       .then((data) =>
>         setHasil(data.length === 0 ? { status: 'kosong' } : { status: 'siap', data })
>       )
>       .catch((error: unknown) => {
>         if (error instanceof Error && error.name === 'AbortError') return;
>         setHasil({
>           status: 'gagal',
>           pesan: error instanceof Error ? error.message : 'Pencarian gagal',
>         });
>       });
>
>     return () => kendali.abort();
>   }, [tertunda]);
>
>   return hasil;
> }
> ```
>
> Empat keputusan yang membedakannya dari versi naif:
>
> 1. **Penundaan dikerjakan hook lain.** `useNilaiTertunda` tidak tahu apa pun soal pencarian, jadi bisa dipakai untuk filter harga dan penggeser kuantitas juga.
> 2. **`status: 'kosong'` dipisah dari `'siap'` dengan array kosong.** Tampilan "tidak ditemukan" dan tampilan daftar adalah dua hal berbeda, dan memisahkannya di tipe membuat komponen tidak perlu memeriksa `data.length` di mana-mana.
> 3. **Kata kunci minimal dua huruf.** Mengirim permintaan untuk satu huruf menghasilkan beban besar dengan hasil tidak berguna.
> 4. **`AbortError` tidak pernah jadi pesan error.** Pengguna yang mengetik cepat akan melihat kedipan error di setiap huruf kalau ini dilewatkan.
>
> Sekarang bandingkan dengan Latihan 3 modul 5. Logikanya sama, tapi sekarang bisa dipakai di komponen mana pun dengan satu baris, dan pembersihannya dijamin React.

### Latihan 3: Rancang Context untuk aplikasi nyata

Sebuah aplikasi butuh empat nilai global: tema (hampir tidak pernah berubah), data pengguna yang login (berubah saat masuk dan keluar), isi keranjang (berubah beberapa kali per menit), dan posisi gulir halaman (berubah puluhan kali per detik).

Rancang pembagian context-nya, lalu jelaskan keputusan untuk masing-masing.

> [!petunjuk]
> Untuk setiap nilai, tanyakan dua hal: seberapa sering berubah, dan berapa banyak komponen yang benar-benar membutuhkannya. Nilai yang sering berubah dan dibutuhkan sedikit komponen adalah kandidat terburuk untuk Context.

> [!pembahasan]
>
> | Nilai | Tempatnya | Alasan |
> | --- | --- | --- |
> | Tema | Context sendiri | Jarang berubah, dibutuhkan hampir semua komponen. Kasus ideal |
> | Pengguna login | Context sendiri, dipisah dari tema | Berubah jarang, tapi pada saat berubah semuanya memang perlu ikut berubah |
> | Isi keranjang | Context sendiri, dan nilainya dipecah | Sering berubah. Komponen yang hanya butuh jumlah item tidak boleh digambar ulang karena catatan pesanan berubah |
> | Posisi gulir | Bukan Context | Terlalu sering berubah. Pakai hook lokal di komponen yang butuh, atau CSS |
>
> Tiga penjelasan yang penting:
>
> **Kenapa tema dan pengguna dipisah.** Kalau disatukan jadi satu objek `{ tema, pengguna }`, setiap pergantian tema menggambar ulang semua komponen yang hanya membutuhkan data pengguna, dan sebaliknya.
>
> **Kenapa keranjang dipecah lebih jauh.** Pola yang umum: satu context untuk nilainya, satu context untuk fungsi pengubahnya. Komponen tombol "Tambah ke keranjang" hanya butuh fungsinya, bukan isinya, jadi tidak perlu digambar ulang setiap kali isi keranjang berubah.
>
> **Kenapa posisi gulir tidak lewat Context.** Nilai yang berubah puluhan kali per detik akan menggambar ulang seluruh pohon di bawah provider. Untuk header yang menyusut saat digulir, jawabannya CSS dengan `position: sticky`, atau satu hook lokal di komponen header itu saja.
>
> Satu catatan terakhir: pada aplikasi yang lebih besar, keranjang biasanya tidak tinggal di Context sama sekali, melainkan di library state seperti Zustand, atau jadi data server dengan cache dari modul 11. Context cocok untuk nilai yang benar-benar global dan jarang berubah, dan mulai terasa sesak di luar itu.

### Latihan 4: Satu komponen, tiga urusan

Komponen ini bekerja, dan sulit dirawat. Pecah jadi satu komponen tampilan dan dua custom hook, tanpa mengubah perilakunya.

```tsx
function PanelNotifikasi() {
  const [pesan, setPesan] = useState<Pesan[]>([]);
  const [terhubung, setTerhubung] = useState(false);
  const [lebar, setLebar] = useState(window.innerWidth);
  const [terbuka, setTerbuka] = useState(false);

  useEffect(() => {
    const soket = new WebSocket('wss://contoh.com/notifikasi');
    soket.onopen = () => setTerhubung(true);
    soket.onclose = () => setTerhubung(false);
    soket.onmessage = (e) => setPesan((p) => [JSON.parse(e.data), ...p].slice(0, 20));
    return () => soket.close();
  }, []);

  useEffect(() => {
    const tangani = () => setLebar(window.innerWidth);
    window.addEventListener('resize', tangani);
    return () => window.removeEventListener('resize', tangani);
  }, []);

  return (
    <div>
      <button type="button" onClick={() => setTerbuka(!terbuka)}>
        Notifikasi ({pesan.length}) {terhubung ? 'aktif' : 'terputus'}
      </button>
      {terbuka && lebar > 640 && <DaftarPesan pesan={pesan} />}
    </div>
  );
}
```

> [!jawaban]
>
> ```tsx
> // Hook 1: satu urusan, berbicara dengan WebSocket
> function useNotifikasi(url: string, batas = 20) {
>   const [pesan, setPesan] = useState<Pesan[]>([]);
>   const [terhubung, setTerhubung] = useState(false);
>
>   useEffect(() => {
>     const soket = new WebSocket(url);
>     soket.onopen = () => setTerhubung(true);
>     soket.onclose = () => setTerhubung(false);
>     soket.onmessage = (peristiwa) =>
>       setPesan((p) => [JSON.parse(peristiwa.data) as Pesan, ...p].slice(0, batas));
>
>     return () => soket.close();
>   }, [url, batas]);
>
>   return { pesan, terhubung };
> }
>
> // Hook 2: satu urusan, membaca media query
> function useMediaQuery(kueri: string) {
>   const [cocok, setCocok] = useState(() => window.matchMedia(kueri).matches);
>
>   useEffect(() => {
>     const daftar = window.matchMedia(kueri);
>     const tangani = (e: MediaQueryListEvent) => setCocok(e.matches);
>
>     setCocok(daftar.matches);
>     daftar.addEventListener('change', tangani);
>     return () => daftar.removeEventListener('change', tangani);
>   }, [kueri]);
>
>   return cocok;
> }
>
> // Komponen: tinggal mengurus tampilan
> function PanelNotifikasi() {
>   const { pesan, terhubung } = useNotifikasi('wss://contoh.com/notifikasi');
>   const layarLebar = useMediaQuery('(min-width: 40rem)');
>   const [terbuka, setTerbuka] = useState(false);
>
>   return (
>     <div>
>       <button type="button" onClick={() => setTerbuka((t) => !t)} aria-expanded={terbuka}>
>         Notifikasi ({pesan.length}) {terhubung ? 'aktif' : 'terputus'}
>       </button>
>       {terbuka && layarLebar && <DaftarPesan pesan={pesan} />}
>     </div>
>   );
> }
> ```
>
> Lima perbaikan yang terbawa sekalian:
>
> 1. **`useMediaQuery` menggantikan pembacaan `window.innerWidth`.** Mendengarkan `resize` berarti state diperbarui pada setiap piksel pergeseran. `matchMedia` hanya memberi kabar saat jawabannya berubah.
> 2. **`setTerbuka((t) => !t)`** memakai bentuk fungsi, karena nilai baru dihitung dari nilai lama.
> 3. **`aria-expanded`** ditambahkan, karena tombol ini membuka panel. Modul 2 masih berlaku.
> 4. **`window.matchMedia` pada nilai awal `useState`** mencegah kedipan pada render pertama.
> 5. **Dua urusan jadi dua hook yang bisa diuji sendiri**, dan keduanya langsung bisa dipakai di komponen lain.
>
> Satu catatan yang menghemat waktu nanti: `useMediaQuery` membaca ukuran layar lewat JavaScript, dan itu tidak bekerja saat halaman dirender di server karena `window` tidak ada di sana. Untuk menyembunyikan dan menampilkan berdasarkan ukuran layar, CSS adalah jawaban yang lebih baik. Modul 13 akan kembali ke titik ini.

## Batasnya

Dengan hook, Context, dan komposisi, Anda bisa membangun aplikasi React yang serius. Tiga hal masih kosong, dan masing-masing jadi satu modul.

**Cache data server.** Semua yang Anda bangun di modul ini memuat ulang data dari nol setiap kali komponen dipasang. Dua komponen yang butuh data sama akan mengambilnya dua kali. Tidak ada pembaruan latar, tidak ada penanganan data basi, dan tidak ada cara membagikan satu permintaan ke banyak pemakai.

**Styling pada skala aplikasi.** Semua `className` di modul ini masih menunjuk ke CSS yang belum disusun rapi.

**Form yang serius.** Form dengan dua puluh isian, validasi bersyarat, dan pesan error per kolom akan jadi lima belas `useState` kalau dikerjakan dengan cara modul ini.

## Rangkuman

- `useEffect` untuk menyinkronkan dengan sistem di luar React. Bukan untuk menghitung, bukan untuk bereaksi terhadap perubahan state.
- Effect yang isinya hanya `setState` berdasarkan props atau state lain hampir selalu bisa diganti perhitungan biasa, dan menghilangkan render berantai.
- Selalu bersihkan apa yang dipasang, dan jujur soal daftar dependensi. Effect yang bermasalah saat dijalankan dua kali adalah effect yang bermasalah.
- Mengubah `key` adalah cara mereset seluruh state sebuah komponen dalam satu baris.
- `useRef` untuk nilai yang tidak muncul di tampilan: elemen DOM, id timer, nilai sebelumnya.
- `useReducer` begitu ada aturan antar-field, atau tiga setter yang selalu dipanggil bersamaan.
- Custom hook adalah fungsi biasa yang bisa memanggil hook. Buat saat logika muncul di tempat kedua.
- Context adalah alat pengiriman, bukan manajemen state. Pisahkan per laju perubahan, dan jangan taruh data server di dalamnya.

## Masalah terbuka

Anda sekarang punya React dengan pondasi yang benar: komponen murni, state di tempat yang tepat, effect yang hanya dipakai untuk urusannya, dan logika yang bisa dipakai ulang.

Saatnya membuktikan itu pada aplikasi yang lebih besar daripada dasbor cuaca, dengan routing, pencarian yang tersimpan di URL, halaman detail, dan data yang jumlahnya tidak bisa dimuat sekaligus.

Bagian berikutnya adalah Proyek 2: katalog film dengan React dan TypeScript, lengkap dengan pencarian yang bisa dibagikan lewat tautan, dan daftar favorit yang bertahan setelah tab ditutup.
