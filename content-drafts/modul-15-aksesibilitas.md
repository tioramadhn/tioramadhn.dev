---
title: 'Modul 15: Aksesibilitas yang Benar-benar Dipakai'
description: Bukan daftar atribut ARIA yang dihafal, tapi cara menguji dengan keyboard dan pembaca layar, pola komponen yang benar, dan alasan kenapa sebagian besar perbaikannya justru menghapus kode.
date: 2026-11-25
slug: modul-15-aksesibilitas
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Proyek 4 ditutup dengan satu pertanyaan: siapa saja yang sebenarnya bisa memakai aplikasi Anda? Jawabannya tidak bisa ditebak dari layar laptop Anda sendiri.

Aksesibilitas sering dibayangkan sebagai urusan segelintir pengguna tunanetra. Kenyataannya jauh lebih luas:

| Kelompok | Kebutuhannya | Yang rusak kalau diabaikan |
| --- | --- | --- |
| Tunanetra dan low vision | Pembaca layar, pembesaran, kontras | Tombol tanpa nama, teks di dalam gambar |
| Keterbatasan motorik | Navigasi keyboard, target sentuh besar | Menu yang hanya muncul saat hover |
| Tuli dan sulit mendengar | Teks dan takarir | Video tanpa takarir |
| Disleksia dan kesulitan kognitif | Bahasa jelas, tata letak konsisten | Kalimat panjang, animasi mengganggu |
| Keadaan sementara | Tangan terluka, mata lelah, cedera | Target kecil, kontras rendah |
| Keadaan situasional | Layar di bawah matahari, satu tangan memegang anak, koneksi lambat | Kontras rendah, target kecil, ketergantungan JavaScript |

Dua baris terakhir yang membuat ini bukan topik khusus. Semua orang pernah berada di sana, dan semua orang akan berada di sana lagi.

## Analogi: trotoar landai

Trotoar yang dilandaikan di persimpangan dibangun untuk pengguna kursi roda. Hari ini yang memakainya jauh lebih banyak: pendorong troli belanja, orang tua dengan kereta bayi, kurir dengan barang beroda, pelancong dengan koper, dan siapa pun yang sedang terburu-buru.

Pola yang sama berulang di web:

| Dibuat untuk | Dipakai semua orang |
| --- | --- |
| Takarir video untuk pengguna tuli | Menonton tanpa suara di kereta |
| Kontras tinggi untuk low vision | Membaca layar di bawah sinar matahari |
| Navigasi keyboard untuk keterbatasan motorik | Pengguna mahir yang jarang menyentuh mouse |
| Markup semantik untuk pembaca layar | Mesin pencari dan pratinjau tautan |
| Bahasa sederhana untuk kesulitan kognitif | Semua orang yang sedang lelah |

Batas analoginya: trotoar landai dipasang sekali dan selesai, sedangkan aksesibilitas perangkat lunak bisa rusak lagi pada rilis berikutnya. Karena itu bagian terpenting modul ini bukan daftar perbaikannya, melainkan cara mengujinya berulang kali.

## Empat prinsip, dalam bahasa sehari-hari

WCAG, standar yang jadi acuan hampir semua aturan di dunia, berdiri di atas empat prinsip:

1. **Dapat dilihat atau didengar.** Semua informasi punya bentuk yang bisa diterima, termasuk teks alternatif untuk gambar dan kontras yang memadai.
2. **Dapat dioperasikan.** Semua yang bisa dilakukan dengan mouse bisa dilakukan dengan keyboard, dan tidak ada yang memaksa pengguna bergerak cepat.
3. **Dapat dipahami.** Bahasa jelas, perilaku bisa diduga, dan kesalahan dijelaskan cara memperbaikinya.
4. **Kokoh.** Markup yang benar, sehingga teknologi bantu apa pun bisa membacanya.

Tingkat yang jadi patokan praktis adalah **WCAG 2.2 level AA**. Di Indonesia, Undang-Undang Nomor 8 Tahun 2016 menjamin hak penyandang disabilitas atas akses informasi, dan untuk produk yang melayani pasar Eropa, aturan aksesibilitas di sana sudah berlaku mengikat sejak 2025. Jadi ini bukan lagi sekadar niat baik, melainkan syarat yang muncul di dokumen pengadaan dan kontrak.

## Keyboard: uji yang paling murah dan paling tajam

Satu pengujian yang menemukan lebih banyak masalah daripada alat otomatis mana pun: **tutup mouse Anda, lalu pakai aplikasi Anda sendiri selama lima menit.**

| Tombol | Fungsinya | Yang wajib bekerja |
| --- | --- | --- |
| Tab | Kontrol berikutnya | Semua kontrol terjangkau, urutannya masuk akal |
| Shift+Tab | Kontrol sebelumnya | Bisa kembali |
| Enter | Mengaktifkan tautan dan tombol | Form terkirim dengan Enter |
| Spasi | Tombol, checkbox, menggulir | Checkbox berubah dengan spasi |
| Escape | Menutup | Dialog, menu, dan panel tertutup |
| Panah | Berpindah di dalam kelompok | Tab, radio, menu, select |

Empat hal yang wajib ada, dan tiga di antaranya satu baris CSS:

```css
/* 1. Indikator fokus yang jelas, jangan pernah dihapus */
:focus-visible {
  outline: 3px solid var(--warna-fokus);
  outline-offset: 2px;
}

/* 2. Target sentuh minimal 24px, lebih baik 44px untuk aksi utama */
.tombol-ikon {
  min-block-size: 2.75rem;
  min-inline-size: 2.75rem;
}

/* 3. Hormati pengaturan pengurangan gerak */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Yang keempat butuh markup, dan ini sering dilupakan: **tautan lewati**, supaya pengguna keyboard tidak perlu menekan Tab tiga puluh kali melewati navigasi di setiap halaman.

```tsx
<a href="#konten" className="lewati">
  Lewati ke konten utama
</a>
...
<main id="konten" tabIndex={-1}>
```

```css
/* Tersembunyi sampai difokus */
.lewati {
  position: absolute;
  inset-inline-start: -9999px;
}
.lewati:focus {
  inset-inline-start: var(--jarak-4);
  inset-block-start: var(--jarak-4);
  z-index: var(--tumpukan-notifikasi);
}
```

Satu hal yang tidak boleh dilakukan: mengatur ulang urutan fokus dengan `tabindex` bernilai positif. Urutan fokus mengikuti urutan markup, jadi kalau urutannya salah, yang perlu diperbaiki markup-nya, bukan ditambal dengan angka.

## ARIA: lima aturan, dan satu yang paling penting

Aturan pertama ARIA berbunyi: **jangan pakai ARIA kalau elemen HTML bawaan bisa melakukannya.** `<button>` sudah punya role, fokus, dan penanganan tombol. `<div role="button" tabindex="0">` hanya meniru tampilan luarnya, dan Anda harus menulis sendiri sisanya.

Empat aturan berikutnya: jangan mengubah makna bawaan sebuah elemen, semua kontrol interaktif harus bisa dioperasikan keyboard, jangan menyembunyikan elemen yang bisa difokus dengan `aria-hidden`, dan semua kontrol harus punya nama yang bisa diakses.

Yang paling sering dibutuhkan, dan cukup untuk sebagian besar aplikasi:

```tsx
// Nama untuk kontrol yang isinya hanya ikon
<button aria-label="Tutup dialog"><IkonX aria-hidden="true" /></button>

// Nama dari elemen lain yang sudah ada teksnya
<section aria-labelledby="judul-bagian">
  <h2 id="judul-bagian">Catatan terbaru</h2>
</section>

// Penjelasan tambahan dan pesan error
<input aria-describedby="bantuan-npwp" aria-invalid={adaError} />

// Keadaan
<button aria-expanded={terbuka} aria-controls="panel-filter">Filter</button>
<li aria-current="page"><a href="/catatan">Catatan</a></li>

// Pengumuman perubahan yang terjadi tanpa pindah halaman
<p role="status" aria-live="polite">{pesanStatus}</p>
```

Satu patokan yang menyelamatkan: **ARIA yang salah lebih buruk daripada tidak ada ARIA.** `role="button"` pada elemen yang tidak bisa difokus membuat pembaca layar mengumumkan tombol yang tidak bisa dipakai. Kalau ragu, pakai elemen bawaan dan jangan tambahkan apa pun.

## Pola komponen yang sering salah

**Dialog.** Harus mengunci fokus di dalamnya, memindahkan fokus ke dalam saat dibuka, mengembalikan fokus ke pemicunya saat ditutup, menutup dengan Escape, dan mencegah halaman di belakangnya digulir. Elemen `<dialog>` bawaan dengan `showModal()` sudah mengurus empat dari lima hal itu.

**Menu dan dropdown.** Navigasi panah, Home dan End, Escape untuk menutup, dan `aria-expanded` pada pemicunya. Kalau isinya hanya tautan navigasi, `<nav>` berisi daftar tautan lebih tepat daripada meniru menu aplikasi desktop.

**Tab.** Panah kiri dan kanan berpindah tab, Tab keluar dari kelompok ke panelnya. Hanya satu tab yang berada di urutan fokus, pola yang disebut roving tabindex.

**Notifikasi sementara.** Butuh wilayah live, tidak boleh hilang terlalu cepat, dan tombol tutupnya harus terjangkau keyboard. Pesan kegagalan sebaiknya tidak hilang sendiri sama sekali.

**Combobox dengan pencarian.** Pola paling rumit di daftar ini. Kalau Anda berpikir untuk membuatnya sendiri, hitung dulu: ada belasan aturan keyboard dan pengumuman yang harus benar. Ini kasus paling jelas untuk memakai library headless.

Perbandingan singkat waktu dan risiko:

| Pendekatan | Waktu | Risiko |
| --- | --- | --- |
| Elemen bawaan (`dialog`, `details`, `select`) | Menit | Paling rendah, tampilan kurang bebas |
| Library headless (Radix, React Aria, Base UI) | Jam | Rendah, tampilan bebas |
| Membuat sendiri | Hari sampai minggu | Tinggi, dan rusak lagi saat ada yang mengubahnya |

## Kontras, pembesaran, dan tata letak

Empat angka yang perlu Anda hafal:

| Hal | Syarat AA |
| --- | --- |
| Teks biasa terhadap latar | 4.5:1 |
| Teks besar (24px, atau 19px tebal) | 3:1 |
| Komponen UI dan batas kontrol | 3:1 |
| Target sentuh | Minimal 24 piksel, dan tidak berimpitan |

Dua pengujian tata letak yang sering gagal pada aplikasi yang terlihat bagus:

**Perbesar teks ke 200%.** Tekan Ctrl atau Cmd dengan plus beberapa kali. Yang biasanya rusak: teks terpotong di tombol berukuran tetap, tata letak yang memakai tinggi tetap, dan teks yang tumpang tindih. Penyebabnya hampir selalu satuan `px` yang seharusnya `rem`.

**Lebarkan sampai setara 320 piksel.** Isi harus tetap terbaca dalam satu kolom tanpa gulir horizontal. Tabel adalah pelanggar nomor satu, dan jawabannya tampilan kartu seperti di Proyek 3.

Satu hal lagi: **jangan menyampaikan informasi hanya dengan warna.** Status "aktif" yang hanya ditandai titik hijau tidak terbaca oleh yang buta warna. Tambahkan teks atau bentuk.

## Cara mengujinya

Urutan yang efektif, dari yang paling murah:

**1. Linter saat menulis.** `eslint-plugin-jsx-a11y` menangkap kesalahan umum sebelum kode disimpan: gambar tanpa alt, `onClick` pada elemen non-interaktif, `href` kosong.

**2. Alat otomatis di halaman.** Ekstensi axe DevTools atau Lighthouse. Cepat, dan temuannya pasti benar. Tapi ingat angka ini: **alat otomatis hanya menangkap sekitar sepertiga masalah nyata.** Nol temuan bukan berarti aplikasi Anda bisa dipakai.

**3. Uji keyboard sendiri.** Lima menit, menemukan jauh lebih banyak daripada langkah kedua.

**4. Uji dengan pembaca layar.** Ini yang paling jarang dilakukan dan paling membuka mata. Anda tidak perlu mahir, cukup menjalankan satu alur utama.

| Sistem | Pembaca layar | Cara menyalakan |
| --- | --- | --- |
| macOS | VoiceOver | Cmd + F5 |
| Windows | NVDA | Gratis, unduh dan pasang |
| Android | TalkBack | Pengaturan, Aksesibilitas |
| iOS | VoiceOver | Pengaturan, Aksesibilitas |

Mulailah dengan satu kalimat pertanyaan: "kalau saya tidak melihat layar, apakah saya tahu sedang berada di mana dan apa yang baru saja terjadi?"

**5. Uji dengan pengguna sungguhan.** Yang paling berharga, dan paling jarang dianggarkan. Satu sesi dengan satu pengguna pembaca layar biasanya menghasilkan temuan yang tidak pernah muncul di empat langkah sebelumnya.

## Latihan

### Latihan 1: Lima menit tanpa mouse

Buka Proyek 4, letakkan mouse di luar jangkauan, lalu kerjakan satu alur utuh dengan keyboard saja: masuk, buat catatan, ketik isinya, bagikan ke pengguna lain, tutup dialog, lalu hapus catatan itu.

Catat setiap kali Anda tersangkut, memakai tabel ini:

| Langkah | Tersangkut di | Jenis masalah |
| --- | --- | --- |

> [!petunjuk]
> Perhatikan empat hal: apakah fokus selalu terlihat, apakah ada kontrol yang terlewat, apakah fokus pernah terjebak atau hilang sama sekali, dan apakah urutannya cocok dengan urutan visual.

> [!jawaban]
>
> Temuan yang hampir selalu muncul pada aplikasi yang belum pernah diuji:
>
> | Temuan | Penyebab umum | Perbaikan |
> | --- | --- | --- |
> | Fokus tidak terlihat di beberapa tempat | `outline: none` di reset CSS | Ganti dengan `:focus-visible`, jangan dihapus |
> | Fokus hilang setelah dialog ditutup | Fokus tidak dikembalikan ke pemicu | Simpan elemen pemicu, panggil `.focus()` saat menutup |
> | Fokus keluar dari dialog saat Tab | Tidak ada pengunci fokus | Pakai `<dialog>` dengan `showModal()` atau library headless |
> | Harus menekan Tab 20 kali di setiap halaman | Tidak ada tautan lewati | Tambahkan tautan lewati |
> | Menu tidak bisa dibuka | Hanya merespons hover | Tambahkan penanganan klik dan fokus |
> | Kartu bisa diklik tapi tidak bisa difokus | `div` dengan `onClick` | Jadikan judulnya tautan, kartu diperluas dengan `::after` |
> | Fokus melompat ke tempat aneh setelah menghapus | Elemen yang difokus terhapus | Pindahkan fokus ke tempat yang masuk akal, misalnya judul daftar |
>
> Baris terakhir sering terlewat dan penting: **saat elemen yang sedang difokus dihapus, fokus kembali ke `body`**, dan pengguna keyboard tiba-tiba berada di awal halaman. Setelah menghapus item, pindahkan fokus ke item berikutnya, atau ke judul daftar, lalu umumkan hasilnya lewat wilayah live.

### Latihan 2: Perbaiki dialog

Dialog ini terlihat benar dan punya enam masalah aksesibilitas.

```tsx
export function DialogBagikan({ terbuka, onTutup, catatan }) {
  if (!terbuka) return null;

  return (
    <div className="lapisan" onClick={onTutup}>
      <div className="dialog">
        <div className="judul">Bagikan {catatan.judul}</div>
        <input placeholder="Email" />
        <div className="btn" onClick={kirim}>
          Kirim undangan
        </div>
        <span className="tutup" onClick={onTutup}>
          ×
        </span>
      </div>
    </div>
  );
}
```

> [!jawaban]
>
> | # | Masalah | Akibat |
> | --- | --- | --- |
> | 1 | Bukan elemen `dialog`, tanpa `role="dialog"` dan `aria-modal` | Pembaca layar tidak tahu ini dialog |
> | 2 | Fokus tidak dipindahkan ke dalam saat dibuka | Pengguna keyboard tetap berada di halaman belakang |
> | 3 | Fokus tidak terkunci, dan tidak dikembalikan saat ditutup | Tab keluar ke halaman di belakang dialog |
> | 4 | Tidak bisa ditutup dengan Escape | Satu-satunya jalan keluar adalah mengklik |
> | 5 | Judul berupa `div`, dan dialog tidak punya nama | Dialog diumumkan tanpa keterangan apa pun |
> | 6 | Tombol kirim dan tutup berupa `div` dan `span` | Tidak terjangkau Tab, tidak merespons Enter |
>
> Masalah ketujuh di luar aksesibilitas: `onClick` pada lapisan latar akan ikut terpicu saat pengguna menyeret pilihan teks dari dalam dialog ke luar, sehingga dialog tertutup dan isian hilang.
>
> ```tsx
> export function DialogBagikan({ terbuka, onTutup, catatan }) {
>   const ref = useRef<HTMLDialogElement>(null);
>
>   useEffect(() => {
>     const dialog = ref.current;
>     if (!dialog) return;
>
>     if (terbuka && !dialog.open) dialog.showModal();
>     if (!terbuka && dialog.open) dialog.close();
>   }, [terbuka]);
>
>   return (
>     <dialog ref={ref} onClose={onTutup} aria-labelledby="judul-bagikan">
>       <form method="dialog">
>         <h2 id="judul-bagikan">Bagikan {catatan.judul}</h2>
>
>         <label htmlFor="email-undangan">Email yang diundang</label>
>         <input id="email-undangan" name="email" type="email" autoComplete="email" required />
>
>         <button type="submit" formMethod="post" formAction={kirimUndangan}>
>           Kirim undangan
>         </button>
>         <button type="submit" value="batal">
>           Tutup
>         </button>
>       </form>
>     </dialog>
>   );
> }
> ```
>
> Yang Anda dapat gratis dari elemen `<dialog>` dengan `showModal()`: fokus berpindah ke dalam, fokus terkunci di dalamnya, Escape menutup, halaman di belakang jadi inert, dan fokus kembali ke pemicu saat ditutup. Lima masalah selesai dengan mengganti satu elemen.
>
> Pelajaran yang lebih besar: **sebagian besar perbaikan aksesibilitas justru menghapus kode, bukan menambahkannya.** Yang ditambahkan biasanya hanya nama dan keadaan.

### Latihan 3: Putuskan, lalu kerjakan

Produk Anda butuh pemilih penerima dengan pencarian: pengguna mengetik nama, muncul saran, bisa memilih beberapa orang, dan yang terpilih tampil sebagai chip yang bisa dihapus.

Putuskan: pakai `<select multiple>` bawaan, library headless, atau buat sendiri. Tulis alasannya, lalu kerjakan pilihan Anda dan ujilah dengan keyboard serta pembaca layar.

> [!pembahasan]
>
> **Jawaban yang benar untuk hampir semua tim: library headless.** Inilah perhitungannya.
>
> Kalau dibuat sendiri, berikut yang harus benar:
>
> | Perilaku | Detail |
> | --- | --- |
> | Panah bawah dan atas | Berpindah antar saran tanpa memindahkan fokus dari input |
> | Enter | Memilih yang sedang disorot |
> | Escape | Menutup daftar saran, tanpa menghapus ketikan |
> | Backspace di kolom kosong | Menghapus chip terakhir |
> | `aria-expanded`, `aria-controls`, `aria-activedescendant` | Supaya pembaca layar tahu keadaan dan pilihan aktif |
> | Pengumuman jumlah saran | "5 saran tersedia" saat daftar berubah |
> | Pengumuman penambahan dan penghapusan | "Ani ditambahkan", "Budi dihapus" |
> | Chip yang bisa dihapus dengan keyboard | Tombol hapus per chip dengan nama yang menyebut orangnya |
> | Perilaku di layar sentuh | Daftar saran tidak tertutup papan tombol |
>
> Sembilan baris itu adalah beberapa hari kerja, dan setiap orang yang mengubah komponen ini nanti berisiko merusak salah satunya tanpa sadar.
>
> `<select multiple>` bawaan punya aksesibilitas yang benar dan tidak bisa menampilkan chip maupun pencarian, jadi tidak memenuhi kebutuhan.
>
> Dengan library headless, kesembilan perilaku itu sudah benar, dan pekerjaan Anda tinggal tampilan serta pengambilan data saran. Yang tetap jadi tanggung jawab Anda: memberi nama yang benar pada kontrolnya, memastikan kontras chip memadai, dan tetap mengujinya dengan keyboard, karena library hanya menjamin bagiannya sendiri.

### Latihan 4: Umumkan yang terjadi

Pada Proyek 4, empat hal berubah tanpa pindah halaman: penanda penyimpanan otomatis, notifikasi berhasil dan gagal, jumlah hasil pencarian, dan hilangnya catatan yang dihapus.

Rancang pengumumannya supaya pengguna pembaca layar tahu apa yang terjadi, tanpa membuat aplikasi jadi berisik.

> [!jawaban]
>
> | Perubahan | Cara | Alasan |
> | --- | --- | --- |
> | Penyimpanan otomatis | `role="status"`, dan hanya umumkan hasil akhir | Mengumumkan "Menyimpan" setiap dua detik membuat pengguna tidak bisa berpikir |
> | Notifikasi berhasil | `role="status"` (`aria-live="polite"`) | Menunggu jeda bicara, tidak memotong |
> | Notifikasi gagal | `role="alert"` (`aria-live="assertive"`) | Memotong, karena pengguna perlu tahu segera |
> | Jumlah hasil pencarian | `role="status"`, dengan penundaan | Tanpa penundaan, setiap huruf diumumkan |
> | Catatan dihapus | `role="status"` **dan** pemindahan fokus | Pengumuman saja tidak cukup kalau fokus pengguna ikut hilang |
>
> ```tsx
> // Satu wilayah live untuk seluruh aplikasi, diisi dari mana saja
> export function WilayahPengumuman() {
>   const { sopan, mendesak } = usePengumuman();
>
>   return (
>     <>
>       <p role="status" aria-live="polite" className="sr-only">
>         {sopan}
>       </p>
>       <p role="alert" aria-live="assertive" className="sr-only">
>         {mendesak}
>       </p>
>     </>
>   );
> }
> ```
>
> Empat aturan wilayah live yang membedakan pengumuman yang membantu dari yang menyiksa:
>
> 1. **Wilayahnya harus sudah ada di halaman sebelum diisi.** Elemen live yang baru ditambahkan bersama isinya sering tidak terbaca sama sekali.
> 2. **Dua wilayah saja untuk seluruh aplikasi**, satu sopan dan satu mendesak. Sepuluh wilayah live menghasilkan kekacauan.
> 3. **Pakai `assertive` sehemat mungkin.** Hanya untuk hal yang benar-benar perlu memotong, seperti kegagalan dan peringatan sesi akan berakhir.
> 4. **Pengumuman bukan pengganti pengelolaan fokus.** Setelah menghapus item, fokus harus dipindahkan ke tempat yang masuk akal. Pengumuman menjelaskan apa yang terjadi, fokus menjelaskan Anda sekarang di mana.

## Batasnya

Aksesibilitas yang dikerjakan dengan baik tetap punya tiga batas.

**Alat otomatis tidak bisa menilai kualitas.** Teks alternatif "gambar1.jpg" lolos pemeriksaan "ada alt atau tidak", dan sama sekali tidak membantu. Yang menilai hanya manusia.

**Perbaikan hari ini bisa rusak besok.** Tanpa pemeriksaan yang berjalan otomatis di setiap perubahan, aplikasi Anda akan mundur pelan-pelan. Itu sebabnya modul berikutnya penting.

**Sebagian masalah ada di desain, bukan di kode.** Kontras yang gagal, alur yang membingungkan, dan ikon tanpa label berasal dari rancangan. Memperbaikinya di kode berarti menyimpang dari desain, dan itu percakapan dengan desainer, bukan pekerjaan diam-diam.

## Rangkuman

- Aksesibilitas bukan untuk kelompok kecil. Keterbatasan sementara dan situasional membuat semua orang jadi penggunanya.
- Aturan pertama ARIA: jangan pakai ARIA kalau elemen bawaan bisa. Sebagian besar perbaikan menghapus kode, bukan menambahkannya.
- Uji keyboard lima menit menemukan lebih banyak daripada alat otomatis mana pun, dan alat otomatis hanya menangkap sekitar sepertiga masalah.
- Indikator fokus tidak pernah dihapus, hanya diganti tampilannya. Tautan lewati wajib ada.
- Dialog, menu, tab, dan combobox punya aturan perilaku yang banyak. Pakai elemen bawaan atau library headless.
- Kontras 4.5:1 untuk teks, target sentuh minimal 24 piksel, dan informasi tidak pernah hanya lewat warna.
- Perubahan yang terjadi tanpa pindah halaman diumumkan lewat wilayah live, dan fokus dipindahkan saat elemen yang difokus hilang.
- WCAG 2.2 AA adalah patokan praktis, dan di banyak pasar sudah jadi syarat hukum.

## Masalah terbuka

Anda sudah memperbaiki daftar panjang. Pertanyaannya sekarang: berapa lama perbaikan itu bertahan?

Rilis berikutnya akan menyentuh komponen yang sama. Seseorang akan menambahkan `outline: none` karena mengganggu desainnya. Dialog akan diganti dengan versi buatan sendiri karena library-nya terasa berat. Dan tidak ada yang tahu sampai ada yang melapor, kalau ada yang melapor.

Masalah yang sama berlaku untuk semua yang Anda bangun sepanjang seri ini. Otorisasi yang benar di Proyek 4 bisa rusak karena satu perubahan kecil. Pembatalan permintaan yang rapi bisa hilang saat seseorang merapikan kode.

Pertanyaannya: bagaimana mengetahui sesuatu rusak sebelum pengguna yang memberi tahu?

Itu isi modul berikutnya: testing frontend, mulai dari apa yang pantas diuji sampai apa yang justru membuang waktu.
