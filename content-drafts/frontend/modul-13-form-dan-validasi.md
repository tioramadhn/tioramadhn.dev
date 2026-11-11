---
title: 'Modul 13: Form, Validasi, dan Pengalaman Input'
description: Form adalah tempat pengguna paling sering gagal dan tempat data kotor paling sering masuk. Satu skema jadi sumber tipe dan validasi sekaligus, dan pesan errornya ditulis untuk manusia.
date: 2026-11-22
slug: modul-13-form-dan-validasi
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Form terlihat mudah sampai Anda menulis yang sungguhan. Bandingkan dua daftar kebutuhan:

| Form di tutorial | Form di tempat kerja |
| --- | --- |
| Nama dan email | Dua puluh kolom di empat bagian |
| Wajib diisi | Aturan yang bergantung kolom lain |
| Pesan "harus diisi" | Pesan yang menjelaskan cara memperbaiki |
| Validasi saat dikirim | Validasi pada waktu yang tepat per kolom |
| Satu tombol kirim | Pengiriman yang bisa gagal dengan error per kolom dari server |
| Kolomnya tetap | Kolom yang bisa ditambah dan dihapus pengguna |
| Data hilang kalau tab tertutup | Draf yang bertahan |

Dikerjakan dengan `useState` per kolom, daftar kanan jadi lima belas state dan satu fungsi validasi raksasa yang tidak ada yang mau menyentuhnya. Modul ini tentang cara yang bertahan, dan sekaligus menutup lubang yang ditinggalkan modul 8: siapa yang memastikan data benar-benar berbentuk seperti janji tipenya.

## Analogi: formulir di kantor kelurahan

Bayangkan mengurus dokumen di kantor kelurahan.

**Kantor pertama.** Anda mengisi formulir panjang, menyerahkannya, lalu menunggu empat puluh menit. Petugas kembali dan berkata "ada yang salah, tolong isi ulang", tanpa menyebut bagian mana. Anda mengulang dan ditolak lagi.

**Kantor kedua.** Ada petugas di meja depan yang memeriksa sambil Anda mengisi: "nomor telepon kurang satu digit", "kolom ini tidak perlu diisi karena Anda bukan badan usaha". Begitu masuk ke meja dalam, dokumen Anda hampir pasti lolos. Dan di meja dalam tetap ada pemeriksaan resmi, karena petugas depan bisa salah dan karena ada orang yang menyelundupkan berkas tanpa lewat meja depan.

Dua lapis pemeriksaan itu persis arsitektur validasi yang benar.

| Dunia kelurahan | Dunia frontend |
| --- | --- |
| Petugas meja depan | Validasi di klien, untuk kenyamanan |
| Petugas meja dalam | Validasi di server, untuk kebenaran |
| Daftar syarat resmi di dinding | Skema, satu sumber aturan |
| "Ada yang salah" tanpa keterangan | Pesan error yang tidak bisa ditindaklanjuti |
| Kolom yang muncul sesuai jenis pemohon | Validasi bersyarat |
| Orang yang menyelundupkan berkas | Permintaan langsung ke API tanpa lewat UI Anda |

Batas analoginya: petugas meja depan dan meja dalam adalah dua orang yang bisa punya pemahaman berbeda tentang syaratnya. Di kode, itu bug yang nyata. Karena itu tujuan modul ini bukan sekadar "validasi dua kali", tapi **dua kali dari satu daftar syarat yang sama**.

## Skema sebagai satu sumber kebenaran

Zod adalah cara paling umum menulis daftar syarat itu, dan nilainya ada pada satu hal: tipe TypeScript diturunkan dari skema, jadi tidak mungkin keduanya berselisih.

```bash
pnpm add zod
```

```ts
// lib/skema/pendaftaran.ts
import { z } from 'zod';

export const skemaPendaftaran = z
  .object({
    nama: z
      .string()
      .trim()
      .min(3, 'Nama minimal 3 huruf')
      .max(80, 'Nama terlalu panjang'),

    email: z.string().trim().toLowerCase().email('Format email belum benar'),

    telepon: z
      .string()
      .trim()
      .regex(/^0\d{8,13}$/, 'Nomor diawali 0, contoh: 081234567890'),

    jenisAkun: z.enum(['pribadi', 'perusahaan']),

    // Hanya wajib kalau jenisAkun perusahaan. Diperiksa di superRefine.
    npwp: z.string().trim().optional(),

    jumlahTiket: z.coerce
      .number()
      .int('Jumlah tiket harus bilangan bulat')
      .min(1, 'Minimal 1 tiket')
      .max(4, 'Maksimal 4 tiket per pendaftaran'),

    catatan: z.string().trim().max(300, 'Catatan maksimal 300 huruf').optional(),

    setuju: z
      .boolean()
      .refine((v) => v === true, 'Anda perlu menyetujui syarat dan ketentuan'),
  })
  .superRefine((nilai, konteks) => {
    if (nilai.jenisAkun === 'perusahaan' && !nilai.npwp) {
      konteks.addIssue({
        code: 'custom',
        path: ['npwp'],
        message: 'NPWP wajib untuk akun perusahaan',
      });
    }
  });

// Tipe diturunkan dari skema, bukan ditulis dua kali
export type Pendaftaran = z.infer<typeof skemaPendaftaran>;
```

Empat hal yang layak diperhatikan:

**`z.coerce.number()`** mengubah string dari input menjadi angka. Semua nilai dari form HTML berupa string, dan ini tempat yang benar untuk mengubahnya, bukan di komponen.

**`.trim()` dan `.toLowerCase()` adalah transformasi, bukan hanya validasi.** Hasil parse sudah bersih, jadi tidak ada lagi email dengan spasi di ujung yang masuk ke database.

**Pesan error ditulis di skema**, sehingga teks yang dilihat pengguna hidup di tempat aturannya berada, bukan tersebar di komponen.

**`superRefine` untuk aturan antar-kolom.** Inilah yang menjawab "NPWP wajib kalau jenis akun perusahaan" tanpa `if` bertumpuk di komponen.

> Satu catatan versi yang menghemat waktu Anda: Zod mengubah beberapa nama antar versi mayor. Pada versi terbaru, validator seperti email tersedia sebagai fungsi tingkat atas (`z.email()`) dan bentuk `z.string().email()` ditandai usang, sedangkan cara menyesuaikan pesan error juga berganti nama. Periksa dokumentasi versi yang benar-benar terpasang di `package.json` Anda, dan jangan menyalin konfigurasi dari artikel lama. Bentuk `.refine()` yang dipakai untuk `setuju` di atas sengaja dipilih karena berlaku di semua versi.

Skema yang sama lalu dipakai di tiga tempat: validasi form di klien, validasi permintaan di server, dan pemeriksaan respons API dari modul 12. Satu berkas, tiga pemakai, nol kemungkinan berselisih.

## Form dengan React Hook Form

```bash
pnpm add react-hook-form @hookform/resolvers
```

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export function FormPendaftaran() {
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Pendaftaran>({
    resolver: zodResolver(skemaPendaftaran),
    // Validasi muncul saat pengguna meninggalkan kolom, bukan di huruf pertama
    mode: 'onBlur',
    defaultValues: { jenisAkun: 'pribadi', jumlahTiket: 1 },
  });

  const jenisAkun = watch('jenisAkun');

  async function kirim(nilai: Pendaftaran) {
    try {
      await kirimPendaftaran(nilai);
    } catch (error) {
      // Error per kolom dari server dipetakan ke kolomnya
      if (error instanceof ErrorValidasiServer) {
        for (const [kolom, pesan] of Object.entries(error.perKolom)) {
          setError(kolom as keyof Pendaftaran, { message: pesan });
        }
        return;
      }

      setError('root', { message: 'Gagal mengirim. Periksa koneksi Anda.' });
    }
  }

  return (
    <form onSubmit={handleSubmit(kirim)} noValidate>
      <div>
        <label htmlFor="nama">Nama lengkap</label>
        <input
          id="nama"
          autoComplete="name"
          aria-invalid={errors.nama ? true : undefined}
          aria-describedby={errors.nama ? 'nama-error' : undefined}
          {...register('nama')}
        />
        {errors.nama && (
          <p id="nama-error" role="alert">
            {errors.nama.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="jenis">Jenis akun</label>
        <select id="jenis" {...register('jenisAkun')}>
          <option value="pribadi">Pribadi</option>
          <option value="perusahaan">Perusahaan</option>
        </select>
      </div>

      {jenisAkun === 'perusahaan' && (
        <div>
          <label htmlFor="npwp">NPWP</label>
          <input
            id="npwp"
            inputMode="numeric"
            aria-invalid={errors.npwp ? true : undefined}
            aria-describedby={errors.npwp ? 'npwp-error' : undefined}
            {...register('npwp')}
          />
          {errors.npwp && (
            <p id="npwp-error" role="alert">
              {errors.npwp.message}
            </p>
          )}
        </div>
      )}

      {errors.root && <p role="alert">{errors.root.message}</p>}

      <button type="submit" disabled={isSubmitting || !isDirty}>
        {isSubmitting ? 'Mengirim…' : 'Daftar'}
      </button>
    </form>
  );
}
```

Kenapa library, bukan `useState` per kolom? Tiga alasan yang terukur:

1. **Komponen tidak digambar ulang pada setiap ketikan.** React Hook Form menyimpan nilai di ref, jadi form dua puluh kolom tidak membuat seluruhnya digambar ulang per huruf.
2. **Validasi, pesan error, keadaan terkirim, dan keadaan tersentuh sudah tersedia.** Itu bukan kemudahan kecil, karena "tampilkan error hanya setelah pengguna meninggalkan kolom" adalah logika yang menjengkelkan kalau ditulis tangan.
3. **Satu tempat untuk memetakan error server.** `setError` menjadikan error dari backend terasa sama dengan error validasi lokal.

Dan satu hal yang harus Anda perhatikan: `noValidate` pada `form` mematikan pesan bawaan browser, supaya pesan Anda yang tampil. Itu boleh, dengan satu syarat: pesan Anda harus setara atau lebih baik, termasuk `aria-invalid` dan `aria-describedby` yang menghubungkan pesan ke kolomnya.

## Waktu yang tepat untuk memvalidasi

Ini bagian yang paling menentukan apakah form Anda terasa membantu atau mengganggu:

| Waktu | Pakai untuk | Jangan dipakai untuk |
| --- | --- | --- |
| Saat mengetik | Penghitung sisa karakter, kekuatan password, pratinjau format | Pesan error. "Email tidak valid" di huruf pertama itu menyalahkan pengguna sebelum selesai |
| Saat meninggalkan kolom (blur) | Hampir semua pesan error kolom | Kolom yang memang baru valid setelah kolom lain diisi |
| Saat dikirim | Aturan antar-kolom, dan seluruh skema | Satu-satunya titik validasi, karena pengguna sudah mengisi 20 kolom saat tahu yang salah |
| Setelah pernah gagal | Validasi ulang saat mengetik, supaya pesan hilang begitu diperbaiki | |

Baris terakhir pola yang sering terlupa: setelah kolom pernah dinyatakan salah, perbaikan pengguna sebaiknya langsung menghapus pesannya. Di React Hook Form, `mode: 'onBlur'` ditambah `reValidateMode: 'onChange'` menghasilkan perilaku itu.

## Pesan error untuk manusia

Pesan error adalah antarmuka, dan sering ditulis seolah catatan untuk programmer.

| Buruk | Baik | Kenapa |
| --- | --- | --- |
| "Invalid input" | "Nomor diawali 0, contoh: 081234567890" | Menyebut cara memperbaikinya |
| "Error 422" | "Email ini sudah terdaftar. Masuk atau pakai email lain." | Pengguna tidak tahu arti 422 |
| "Field required" | "Nama penerima perlu diisi untuk pengiriman" | Menyebut kolomnya dan alasannya |
| "Password harus kuat" | "Minimal 8 karakter, dan sertakan satu angka" | Syaratnya bisa diperiksa sendiri |
| "Terjadi kesalahan" | "Gagal menyimpan. Perubahan Anda tidak hilang, coba kirim lagi." | Menenangkan dan menyebut langkah berikutnya |

Tiga aturan tambahan yang berlaku umum: pesan ditulis dalam satu bahasa dengan antarmukanya, pesan tidak pernah menyalahkan pengguna, dan pesan untuk kegagalan sistem harus menyebut apakah data pengguna aman.

## Aksesibilitas form

Form adalah tempat aksesibilitas paling sering gagal, dan sekaligus paling murah diperbaiki:

```tsx
// Ringkasan error di atas form, untuk form panjang
{Object.keys(errors).length > 0 && (
  <div role="alert" tabIndex={-1} ref={ringkasanRef}>
    <h2>Ada {Object.keys(errors).length} hal yang perlu diperbaiki</h2>
    <ul>
      {Object.entries(errors).map(([kolom, galat]) => (
        <li key={kolom}>
          {/* Tautan yang memindahkan fokus langsung ke kolomnya */}
          <a href={`#${kolom}`}>{galat.message as string}</a>
        </li>
      ))}
    </ul>
  </div>
)}
```

Lima hal yang wajib ada, dan semuanya sudah disiapkan di modul 2:

1. **Setiap input punya `label` dengan `htmlFor`.** Placeholder bukan label.
2. **`aria-invalid` dan `aria-describedby`** menghubungkan pesan error ke kolomnya, sehingga pembaca layar membacakan pesannya saat fokus masuk.
3. **`role="alert"` pada pesan error** supaya pesan baru diumumkan.
4. **Fokus dipindahkan ke ringkasan error** setelah pengiriman gagal pada form panjang. Pengguna keyboard tidak tahu ada pesan di atas layar kalau fokusnya tetap di tombol kirim.
5. **Error tidak disampaikan hanya dengan warna.** Garis merah tanpa teks tidak terlihat oleh sebagian orang.

## Kolom dinamis dan draf

Dua kebutuhan yang selalu muncul pada form nyata:

```tsx
// Kolom yang bisa ditambah dan dihapus
const { fields, append, remove } = useFieldArray({ control, name: 'peserta' });

{fields.map((kolom, indeks) => (
  <fieldset key={kolom.id}>
    <legend>Peserta {indeks + 1}</legend>
    <input {...register(`peserta.${indeks}.nama`)} />
    <button type="button" onClick={() => remove(indeks)}>
      Hapus peserta {indeks + 1}
    </button>
  </fieldset>
))}
```

`key={kolom.id}` di situ penting, dan alasannya persis Latihan 2 di modul 9: memakai indeks membuat nilai berpindah baris saat satu peserta dihapus.

Untuk draf, jangan simpan setiap ketikan ke `localStorage`. Simpan dengan penundaan, dan jangan pernah menyimpan kolom sensitif:

```tsx
const nilai = watch();
const nilaiTertunda = useNilaiTertunda(nilai, 1000);

useEffect(() => {
  // Password, OTP, dan nomor kartu tidak pernah masuk penyimpanan lokal
  const { password, ...amanDisimpan } = nilaiTertunda;
  try {
    localStorage.setItem('draf-pendaftaran', JSON.stringify(amanDisimpan));
  } catch {}
}, [nilaiTertunda]);
```

## Opsi tools

| Kebutuhan | Pilihan | Catatan |
| --- | --- | --- |
| Skema dan validasi | Zod, Valibot, ArkType | Zod paling luas dukungannya. Valibot jauh lebih kecil ukurannya |
| Pengelola form | React Hook Form, TanStack Form | RHF standar de facto, TanStack Form lebih baru dengan tipe yang lebih ketat |
| Form sederhana | Tanpa library | Satu sampai tiga kolom tanpa aturan rumit cukup dengan state biasa atau `FormData` |
| Form di Next.js | Server Action dengan validasi skema | Lihat modul 14, bisa bekerja tanpa JavaScript di klien |

Baris ketiga perlu ditegaskan: form pencarian satu kolom tidak butuh React Hook Form. Memasang library untuk setiap form adalah kebiasaan yang membuat bundel membesar tanpa manfaat.

## Latihan

### Latihan 1: Form pendaftaran acara yang lengkap

Bangun form dengan syarat: nama, email, telepon, jenis akun (pribadi atau perusahaan), NPWP yang hanya muncul dan wajib untuk perusahaan, daftar peserta yang bisa ditambah sampai 4 orang, total biaya yang dihitung otomatis dari jumlah peserta, persetujuan syarat, dan draf yang bertahan setelah tab ditutup.

Validasi dengan Zod, pesan error dalam bahasa Indonesia yang bisa ditindaklanjuti, dan error per kolom dari server dipetakan ke kolomnya.

> [!petunjuk]
> Tulis skemanya lebih dulu, sebelum satu baris JSX. Kalau skemanya benar, komponennya hampir menulis dirinya sendiri. Untuk total biaya, ingat aturan modul 9: nilai yang bisa dihitung tidak disimpan.

> [!jawaban]
>
> ```ts
> const skemaPeserta = z.object({
>   nama: z.string().trim().min(3, 'Nama peserta minimal 3 huruf'),
>   usia: z.coerce.number().int().min(12, 'Peserta minimal berusia 12 tahun'),
> });
>
> export const skemaPendaftaran = z
>   .object({
>     nama: z.string().trim().min(3, 'Nama minimal 3 huruf'),
>     email: z.string().trim().toLowerCase().email('Format email belum benar'),
>     telepon: z.string().trim().regex(/^0\d{8,13}$/, 'Contoh: 081234567890'),
>     jenisAkun: z.enum(['pribadi', 'perusahaan']),
>     npwp: z.string().trim().optional(),
>     peserta: z
>       .array(skemaPeserta)
>       .min(1, 'Minimal satu peserta')
>       .max(4, 'Maksimal empat peserta per pendaftaran'),
>     setuju: z
>       .boolean()
>       .refine((v) => v === true, 'Anda perlu menyetujui syarat dan ketentuan'),
>   })
>   .superRefine((nilai, konteks) => {
>     if (nilai.jenisAkun === 'perusahaan') {
>       if (!nilai.npwp || nilai.npwp.replace(/\D/g, '').length !== 15) {
>         konteks.addIssue({
>           code: 'custom',
>           path: ['npwp'],
>           message: 'NPWP wajib untuk akun perusahaan, 15 angka',
>         });
>       }
>     }
>   });
> ```
>
> ```tsx
> const peserta = watch('peserta');
> // Dihitung, tidak disimpan di state
> const total = (peserta?.length ?? 0) * HARGA_PER_PESERTA;
> ```
>
> Lima hal yang biasanya jadi masalah di latihan ini:
>
> 1. **NPWP yang disembunyikan tapi masih divalidasi.** Kalau pengguna sempat mengisi NPWP lalu mengganti jenis akun jadi pribadi, nilai lamanya masih ada di form. Bersihkan dengan `resetField('npwp')` saat jenis akun berubah, atau pakai `.transform()` di skema untuk mengosongkannya.
> 2. **`z.coerce.number()` untuk usia**, karena nilai dari input selalu string. Tanpa itu, validasi minimum tidak pernah bekerja seperti yang diharapkan.
> 3. **Total biaya dihitung dari `watch('peserta')`**, bukan disimpan. Satu sumber kebenaran.
> 4. **Pesan "maksimal empat peserta" tidak cukup.** Tombol "Tambah peserta" juga harus dinonaktifkan di peserta keempat, dengan keterangan kenapa. Pesan error untuk hal yang bisa dicegah adalah desain yang kurang baik.
> 5. **Draf tidak menyimpan email dan telepon orang lain tanpa alasan.** Untuk form berisi data peserta lain, pertimbangkan menyimpan draf hanya bagian pemesan, atau beri pengguna pilihan.

### Latihan 2: Satu skema, tiga pemakai

Ambil skema dari Latihan 1 dan pakai di tiga tempat: validasi form di klien, validasi di sisi server, dan pemeriksaan respons API saat membaca daftar pendaftaran. Tulis kodenya untuk ketiganya.

> [!pembahasan]
>
> ```ts
> // 1. Klien: lewat resolver
> useForm({ resolver: zodResolver(skemaPendaftaran) });
>
> // 2. Server: parse dulu, baru percaya
> export async function POST(permintaan: Request) {
>   const mentah: unknown = await permintaan.json();
>   const hasil = skemaPendaftaran.safeParse(mentah);
>
>   if (!hasil.success) {
>     // Bentuk error yang cocok dengan setError di klien
>     const perKolom: Record<string, string> = {};
>     for (const isu of hasil.error.issues) {
>       const kolom = isu.path.join('.');
>       perKolom[kolom] ??= isu.message;
>     }
>     return Response.json({ perKolom }, { status: 422 });
>   }
>
>   await simpan(hasil.data); // data sudah bersih dan bertipe
>   return Response.json({ ok: true }, { status: 201 });
> }
>
> // 3. Membaca respons API: menutup lubang dari modul 8
> const skemaDaftar = z.object({
>   data: z.array(skemaPendaftaranTersimpan),
>   meta: z.object({ halaman: z.number(), total: z.number() }),
> });
>
> export async function ambilPendaftaran(signal?: AbortSignal) {
>   const respons = await fetch('/api/pendaftaran', { signal });
>   if (!respons.ok) throw new Error(`Gagal memuat (${respons.status})`);
>
>   // Tidak ada "as". Bentuknya benar-benar diperiksa.
>   return skemaDaftar.parse(await respons.json());
> }
> ```
>
> Empat hal yang didapat dari susunan ini:
>
> 1. **Aturan ditulis sekali.** Menambah syarat "nama tidak boleh berisi angka" cukup di skema, dan ketiga tempat ikut berubah.
> 2. **Bentuk error server cocok dengan klien.** Backend mengirim `{ perKolom: { npwp: "..." } }`, dan klien memetakannya dengan `setError`. Kesepakatan sederhana ini menghapus banyak kode penerjemah.
> 3. **Validasi respons API menangkap perubahan backend lebih awal.** Kalau backend mengganti nama field, Anda mendapat error yang menyebut field dan posisinya, bukan `undefined` yang muncul tiga komponen jauhnya.
> 4. **Soal biaya validasi respons.** Pada daftar sangat panjang, `parse` punya biaya nyata. Dua strategi: hanya validasi saat pengembangan dan di staging, atau validasi bentuk luarnya saja. Bagaimanapun, mengetahui lebih awal biasanya lebih murah daripada memburu `undefined` di produksi.

### Latihan 3: Perbaiki pengalaman yang menyiksa

Form ini bekerja secara teknis dan membuat pengguna frustrasi. Temukan sembilan masalahnya.

```tsx
<form onSubmit={kirim}>
  <input placeholder="Nama" onChange={(e) => validasiNama(e.target.value)} />
  {errorNama && <span style={{ color: 'red' }}>Invalid</span>}

  <input placeholder="Email" type="text" />
  <input placeholder="No HP" type="number" />
  <input placeholder="Tanggal lahir (dd/mm/yyyy)" type="text" />
  <input placeholder="Password" type="password" />

  <div className="btn" onClick={kirim}>
    Kirim
  </div>
</form>
```

> [!jawaban]
>
> | # | Masalah | Akibatnya |
> | --- | --- | --- |
> | 1 | Tidak ada satu pun `label` | Pembaca layar tidak tahu nama kolom, dan teksnya hilang saat diisi |
> | 2 | Validasi berjalan di setiap ketikan | "Invalid" muncul di huruf pertama, menyalahkan pengguna sebelum selesai |
> | 3 | Pesan error "Invalid" | Tidak memberi tahu apa yang harus diperbaiki |
> | 4 | Error hanya ditandai warna merah | Tidak terlihat oleh sebagian pengguna, dan tidak diumumkan pembaca layar |
> | 5 | Email memakai `type="text"` | Kehilangan papan tombol email di HP dan validasi dasar browser |
> | 6 | No HP memakai `type="number"` | Nol di depan hilang, dan muncul tombol naik turun yang tidak ada artinya |
> | 7 | Tanggal lahir sebagai teks dengan format di placeholder | Format jadi tebak-tebakan. Pakai `type="date"`, atau tiga kolom terpisah |
> | 8 | Tidak ada `autoComplete` di satu kolom pun | Pengelola password dan pengisian otomatis tidak bekerja |
> | 9 | Tombol kirim berupa `div` dengan `onClick` | Tidak bisa ditekan dengan Enter, tidak terjangkau Tab, tidak bisa dinonaktifkan saat mengirim |
>
> Masalah kesepuluh yang tidak terlihat dari kode: tidak ada keadaan "sedang mengirim", jadi pengguna yang menekan dua kali akan mengirim dua pendaftaran.
>
> ```tsx
> <form onSubmit={handleSubmit(kirim)} noValidate>
>   <label htmlFor="nama">Nama lengkap</label>
>   <input
>     id="nama"
>     autoComplete="name"
>     aria-invalid={errors.nama ? true : undefined}
>     aria-describedby={errors.nama ? 'nama-error' : undefined}
>     {...register('nama')}
>   />
>   {errors.nama && (
>     <p id="nama-error" role="alert">
>       {errors.nama.message}
>     </p>
>   )}
>
>   <label htmlFor="hp">Nomor HP</label>
>   <input id="hp" type="tel" inputMode="tel" autoComplete="tel" {...register('telepon')} />
>
>   <label htmlFor="lahir">Tanggal lahir</label>
>   <input id="lahir" type="date" autoComplete="bday" {...register('tanggalLahir')} />
>
>   <button type="submit" disabled={isSubmitting}>
>     {isSubmitting ? 'Mengirim…' : 'Kirim'}
>   </button>
> </form>
> ```
>
> Perhatikan bahwa tujuh dari sepuluh perbaikan adalah materi modul 2. Form yang buruk hampir selalu masalah HTML, bukan masalah React.

## Batasnya

Form dan validasi beres, dan tiga hal masih di luar jangkauan.

**Validasi di klien tidak pernah jadi pengamanan.** Siapa pun bisa mengirim permintaan langsung ke API Anda tanpa melewati form. Itu sebabnya skema yang sama dijalankan di server, dan modul 15 membahas lapisan pengamanan lainnya.

**Aturan bisnis yang butuh data server.** "Email ini sudah terdaftar" dan "kuota acara habis" tidak bisa dijawab di klien. Jawabannya datang sebagai error per kolom dari server, dan itu sebabnya pemetaan `setError` penting.

**Form yang bekerja tanpa JavaScript.** Semua yang dibangun di modul ini bergantung pada JavaScript di klien. Form HTML biasa bisa bekerja tanpanya, dan di modul 14 Anda akan melihat cara mendapatkan keduanya sekaligus dengan Server Action.

## Rangkuman

- Validasi dua lapis: di klien untuk kenyamanan, di server untuk kebenaran. Keduanya dari satu skema yang sama.
- Zod menjadikan skema sumber tipe sekaligus sumber validasi, jadi keduanya tidak mungkin berselisih.
- Aturan antar-kolom tempatnya di skema (`superRefine`), bukan sebagai `if` bertumpuk di komponen.
- Pesan error muncul saat pengguna meninggalkan kolom, bukan saat mengetik, lalu divalidasi ulang saat mengetik setelah pernah gagal.
- Pesan error adalah antarmuka: sebut cara memperbaikinya, jangan sebut kode status, jangan menyalahkan pengguna.
- `aria-invalid`, `aria-describedby`, `role="alert"`, dan pemindahan fokus ke ringkasan error adalah syarat, bukan tambahan.
- `type`, `inputMode`, dan `autoComplete` yang benar menghemat waktu pengguna lebih banyak daripada fitur apa pun yang Anda tambahkan di form.
- Form satu kolom tidak butuh library. Form dua puluh kolom jangan dikerjakan tanpa library.

## Masalah terbuka

Tiga modul terakhir menyelesaikan styling, data, dan form. Saatnya menggabungkan ketiganya pada aplikasi yang bentuknya paling sering Anda temui di pekerjaan nyata: sebuah dasbor admin dengan tabel besar, filter yang bertumpuk, dan form untuk menambah serta mengubah data.

Bagian berikutnya adalah Proyek 3, dan di sana tiga modul terakhir akan diuji sekaligus pada kebutuhan yang tidak bisa dihindari di aplikasi internal: tabel yang bisa diurutkan dan dicari, aksi massal, dan perubahan data yang harus langsung terlihat di seluruh halaman.
