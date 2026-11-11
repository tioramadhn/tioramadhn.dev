---
title: 'Proyek 1: API Perpustakaan tanpa Basis Data'
description: Routing, validasi skema, aturan bisnis, idempotency, pagination kursor, dan dokumentasi OpenAPI jadi satu layanan utuh. Penyimpanannya di memori, supaya Anda merasakan sendiri kenapa basis data dibutuhkan.
date: 2026-12-07
slug: proyek-1-api-perpustakaan
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Empat modul pertama memberi peta, mesin, lapisan HTTP, dan aturan desain. Proyek ini memakai keempatnya sekaligus:

| Dari modul | Yang dipakai |
| --- | --- |
| 1 | Tiga lapisan, urutan middleware, status code yang tepat, anggaran latensi |
| 2 | Tidak ada API sinkron di jalur permintaan, batas pada setiap masukan, validasi konfigurasi saat start |
| 3 | Fastify, skema Zod, penanganan error terpusat, log dengan id permintaan |
| 4 | Sumber daya sebagai benda, kursor, idempotency, ISO 8601, uang bilangan bulat |

Penyimpanannya di memori, dan itu keputusan yang disengaja. Tujuannya dua: Anda bisa fokus pada lapisan HTTP dan aturan bisnis tanpa terganggu SQL, dan Anda akan merasakan sendiri lima masalah yang muncul karena tidak ada basis data. Lima masalah itu yang jadi pembuka modul 5.

## Yang dibangun

API untuk perpustakaan komunitas dengan tiga sumber daya dan aturan yang sungguhan.

```text
Buku        katalog, jumlah salinan, status
Anggota     identitas, status keanggotaan
Peminjaman  catatan yang punya id, jatuh tempo, status, denda
```

Perhatikan bahwa **peminjaman adalah benda, bukan perbuatan**, persis seperti pelajaran di modul 4. Dari situ semua operasi lanjutannya punya tempat: pengembalian, perpanjangan, denda, dan riwayat.

## Aturan bisnis

Aturan inilah yang membuat proyek ini bukan sekadar CRUD. Semuanya ditegakkan di lapisan service, bukan di handler:

1. Satu anggota maksimal meminjam **3 buku** sekaligus.
2. Masa pinjam **14 hari**, dihitung dari tanggal peminjaman.
3. Perpanjangan **satu kali**, menambah 7 hari, dan hanya boleh kalau belum terlambat serta tidak ada yang memesan buku itu.
4. Anggota yang punya peminjaman terlambat **tidak boleh meminjam lagi**.
5. Anggota yang denda belum dibayarnya melebihi **Rp50.000** tidak boleh meminjam.
6. Buku hanya bisa dipinjam kalau ada salinan tersedia.
7. Satu anggota tidak boleh meminjam dua salinan buku yang sama.
8. Denda **Rp1.000 per hari** keterlambatan, dihitung saat pengembalian.
9. Anggota nonaktif tidak boleh meminjam, tapi tetap boleh mengembalikan.
10. Buku yang sedang dipinjam tidak bisa dihapus dari katalog.

Sepuluh aturan itu kelihatan sederhana dan akan memunculkan pertanyaan yang tidak terduga saat dikerjakan. Itu memang bagian dari latihannya: aturan bisnis di dunia nyata selalu punya celah yang baru terlihat saat ditulis jadi kode.

## Spesifikasi endpoint

```text
GET    /sehat
GET    /siap

GET    /v1/buku?q=&status=&limit=&kursor=&urut=
GET    /v1/buku/{id}
POST   /v1/buku
PATCH  /v1/buku/{id}
DELETE /v1/buku/{id}

GET    /v1/anggota?limit=&kursor=
GET    /v1/anggota/{id}
POST   /v1/anggota
PATCH  /v1/anggota/{id}

GET    /v1/peminjaman?anggotaId=&status=&limit=&kursor=
GET    /v1/peminjaman/{id}
POST   /v1/peminjaman                              Idempotency-Key wajib
POST   /v1/peminjaman/{id}/pengembalian
POST   /v1/peminjaman/{id}/perpanjangan

GET    /v1/anggota/{id}/ringkasan
GET    /dokumentasi
```

### A. Perilaku yang wajib benar

1. Semua masukan divalidasi dengan skema: params, query, body. Tidak ada satu pun `as any`.
2. Semua respons punya skema, sehingga field internal tidak mungkin bocor.
3. Satu bentuk error untuk seluruh API, dengan `kode` stabil, `pesan` untuk manusia, dan `requestId`.
4. Daftar memakai kursor, dengan `limit` bawaan 20 dan maksimum 100.
5. `POST /v1/peminjaman` idempoten: kunci wajib, percobaan ulang mengembalikan respons dan status yang sama.
6. Setiap pelanggaran aturan bisnis punya kode error sendiri yang bisa ditindaklanjuti klien.
7. Uang berupa bilangan bulat rupiah. Waktu berupa ISO 8601 UTC, jatuh tempo berupa tanggal kalender.
8. `GET /v1/anggota/{id}/ringkasan` mengembalikan jumlah pinjaman berjalan, total denda belum dibayar, dan apakah anggota sedang boleh meminjam, semuanya **dihitung**, tidak disimpan.

### B. Kualitas

9. TypeScript ketat, `pnpm check` menjalankan `tsc --noEmit` dan ESLint tanpa keluhan.
10. Konfigurasi divalidasi saat start, dan proses mati dengan pesan jelas kalau ada yang kurang.
11. Log terstruktur dengan id permintaan, dan header sensitif disaring.
12. Rate limit terpasang, dengan batas lebih ketat pada endpoint peminjaman.
13. Body dibatasi ukurannya, dan setiap array di masukan punya batas jumlah.
14. `GET /sehat` tidak pernah menyentuh ketergantungan apa pun, `GET /siap` boleh.
15. Penutupan rapi saat SIGTERM: berhenti menerima permintaan baru, selesaikan yang sedang jalan.
16. Dokumentasi OpenAPI dihasilkan dari skema, bisa dicoba di `/dokumentasi`.

### C. Yang sengaja belum ada

Keempat hal ini akan ditambahkan di modul-modul berikutnya, dan menyebutkannya sekarang penting supaya Anda tidak mengerjakan dua kali:

| Belum ada | Akan datang di |
| --- | --- |
| Autentikasi: untuk sekarang id anggota dikirim di header `X-Anggota-Id` | Modul 11 |
| Basis data | Modul 5 sampai 8 |
| Test otomatis | Modul 21, tapi silakan tulis beberapa sekarang |
| Pekerjaan latar untuk pengingat jatuh tempo | Modul 15 |

Soal `X-Anggota-Id`: cara ini **tidak aman** dan hanya untuk proyek latihan ini. Tulis komentar jelas di kodenya, karena pola seperti ini kadang tertinggal sampai produksi.

## Langkah pengerjaan bertahap

Spesifikasi di atas panjang, dan membacanya sekaligus membuat proyek ini terasa mustahil. Kerjakan berurutan. Setiap hari berakhir dengan sesuatu yang bisa Anda panggil dengan `curl`, dan itu disengaja: layanan yang jalan sejak hari pertama jauh lebih mudah diperbaiki daripada layanan yang baru dicoba di hari keenam.

**Hari 1: kerangka yang menyala.** Proyek TypeScript dari modul 2, `src/config.ts` tervalidasi, Fastify dengan logger dan id permintaan, penanganan error terpusat beserta kelima kelas error dari modul 3, dan `GET /sehat`. Selesai kalau `curl localhost:3000/sehat` menjawab `{"status":"ok"}` dan `curl localhost:3000/tidak-ada` menjawab 404 dengan bentuk error yang sama seperti error lain.

**Hari 2: aturan bisnis sebagai fungsi murni.** Hanya `src/fitur/peminjaman/aturan.ts` dan `src/lib/waktu.ts`. Tidak menyentuh HTTP sama sekali. Tulis beberapa test Vitest untuk sepuluh aturan itu sekarang, bukan nanti: fungsi murni adalah hal termurah yang pernah Anda uji, dan keputusan denda serta jatuh tempo akan jauh lebih jelas setelah ditulis sebagai test.

**Hari 3: buku dan anggota.** Repository memori beserta antarmukanya, skema Zod untuk params, query, body, dan respons, lalu CRUD keduanya dengan pagination kursor. Di akhir hari ini Anda sudah punya pola yang akan diulang untuk peminjaman.

**Hari 4: peminjaman.** Tiga endpoint yang menegakkan sepuluh aturan: `POST /v1/peminjaman`, `/pengembalian`, dan `/perpanjangan`. Aturannya dipanggil dari `layanan.ts`, bukan ditulis ulang di handler.

**Hari 5: yang membuatnya layak dipakai.** Idempotency pada pembuatan peminjaman, rate limit yang lebih ketat di jalur itu, `GET /v1/anggota/{id}/ringkasan` yang dihitung bukan disimpan, penutupan rapi pada SIGTERM, dan dokumentasi OpenAPI di `/dokumentasi`.

**Hari 6: checklist penilaian.** Enam belas butir di bawah, dikerjakan satu per satu dengan `curl`. Perlakukan setiap butir yang gagal sebagai temuan, bukan sebagai kegagalan: itu memang gunanya daftar itu dibuat.

**Hari 7: rapikan dan catat.** Perbaiki temuan hari keenam, lalu tulis satu paragraf tentang bagian yang paling sulit. Catatan itu akan berguna saat Proyek 2 meminta hal yang sama di atas Postgres.

Kalau waktu Anda terbatas, **hari 1, 2, 4, dan 6 adalah inti yang tidak boleh dilewati.** Hari 3 bisa dipersempit jadi buku saja, dan hari 5 bisa dipersempit jadi idempotency saja.

## Struktur folder

```text
src/
├── server.ts
├── app.ts
├── config.ts
├── http/
│   ├── error.ts              kelas error dan penangan terpusat
│   ├── kursor.ts             encode dan decode
│   └── konteks.ts            pembaca X-Anggota-Id sementara
├── fitur/
│   ├── buku/
│   │   ├── rute.ts
│   │   ├── skema.ts
│   │   ├── layanan.ts
│   │   └── repo.ts           antarmuka + implementasi memori
│   ├── anggota/
│   │   └── ...
│   └── peminjaman/
│       ├── rute.ts
│       ├── skema.ts
│       ├── layanan.ts        sepuluh aturan bisnis ada di sini
│       ├── aturan.ts         fungsi murni: denda, jatuh tempo, kelayakan
│       └── repo.ts
└── lib/
    ├── id.ts                 pembuat ULID
    ├── waktu.ts              jam yang bisa diganti saat test
    └── idempotency.ts
```

Satu hal yang menentukan nasib proyek ini di modul 8: **repository didefinisikan sebagai antarmuka, dan implementasi memori hanya salah satu isinya.** Dengan begitu, mengganti penyimpanan ke Postgres nanti tidak menyentuh satu baris pun di `layanan.ts`.

```ts
// src/fitur/peminjaman/repo.ts
export interface RepoPeminjaman {
  ambil(id: string): Promise<Peminjaman | null>;
  simpan(baru: PeminjamanBaru): Promise<Peminjaman>;
  perbarui(id: string, ubah: Partial<Peminjaman>): Promise<Peminjaman>;
  daftar(filter: FilterPeminjaman): Promise<{ data: Peminjaman[]; kursorBerikutnya: string | null }>;
  hitungBerjalanMilik(anggotaId: string): Promise<number>;
  adaTerlambatMilik(anggotaId: string): Promise<boolean>;
  totalDendaBelumDibayar(anggotaId: string): Promise<number>;
  adaPinjamanBukuIni(anggotaId: string, bukuId: string): Promise<boolean>;
}
```

Perhatikan empat method terakhir. Semuanya pertanyaan yang muncul dari aturan bisnis, dan menuliskannya sebagai method repository (bukan mengambil semua peminjaman lalu menyaring di aplikasi) adalah kebiasaan yang akan menyelamatkan Anda di modul 10. Pada implementasi memori semuanya sama cepat, pada Postgres dengan dua juta baris perbedaannya antara 3 ms dan 4 detik.

## Aturan sebagai fungsi murni

Bagian ini pantas dikerjakan lebih dulu, karena bisa diuji tanpa server dan tanpa penyimpanan apa pun.

```ts
// src/fitur/peminjaman/aturan.ts
export const MASA_PINJAM_HARI = 14;
export const PERPANJANGAN_HARI = 7;
export const MAKS_PINJAM = 3;
export const DENDA_PER_HARI = 1_000;
export const BATAS_DENDA = 50_000;

export function hitungJatuhTempo(mulai: Date, hari = MASA_PINJAM_HARI): string {
  const d = new Date(mulai);
  d.setUTCDate(d.getUTCDate() + hari);
  // Tanggal kalender, bukan momen. Modul 4.
  return d.toISOString().slice(0, 10);
}

export function hitungDenda(jatuhTempo: string, dikembalikanPada: Date): number {
  const tempo = Date.parse(`${jatuhTempo}T23:59:59Z`);
  const selisihMs = dikembalikanPada.getTime() - tempo;

  if (selisihMs <= 0) return 0;

  const hariTerlambat = Math.ceil(selisihMs / 86_400_000);
  return hariTerlambat * DENDA_PER_HARI;
}

export interface KeadaanAnggota {
  status: 'aktif' | 'nonaktif';
  jumlahBerjalan: number;
  adaTerlambat: boolean;
  dendaBelumDibayar: number;
}

export type HasilKelayakan =
  | { boleh: true }
  | { boleh: false; kode: string; pesan: string };

export function bolehMeminjam(keadaan: KeadaanAnggota): HasilKelayakan {
  if (keadaan.status === 'nonaktif') {
    return { boleh: false, kode: 'ANGGOTA_NONAKTIF', pesan: 'Keanggotaan sedang tidak aktif' };
  }
  if (keadaan.adaTerlambat) {
    return {
      boleh: false,
      kode: 'ADA_PINJAMAN_TERLAMBAT',
      pesan: 'Kembalikan dulu buku yang terlambat sebelum meminjam lagi',
    };
  }
  if (keadaan.dendaBelumDibayar > BATAS_DENDA) {
    return {
      boleh: false,
      kode: 'DENDA_MELEBIHI_BATAS',
      pesan: `Denda belum dibayar Rp${keadaan.dendaBelumDibayar.toLocaleString('id-ID')}, maksimal Rp50.000`,
    };
  }
  if (keadaan.jumlahBerjalan >= MAKS_PINJAM) {
    return {
      boleh: false,
      kode: 'BATAS_PINJAM_TERCAPAI',
      pesan: `Maksimal ${MAKS_PINJAM} buku per anggota`,
    };
  }

  return { boleh: true };
}
```

Tiga keputusan yang layak diperhatikan:

**Satu, kelayakan mengembalikan alasan, bukan boolean.** `bolehMeminjam` yang hanya mengembalikan `false` memaksa handler menebak alasannya, dan pesan "tidak boleh meminjam" adalah pesan error yang tidak bisa ditindaklanjuti.

**Dua, urutan pemeriksaan adalah keputusan produk.** Kalau seorang anggota melanggar tiga aturan sekaligus, yang mana yang disebut lebih dulu? Urutan di atas memilih yang paling bisa ditindaklanjuti. Alternatifnya mengembalikan semua alasan sekaligus.

**Tiga, waktu masuk sebagai parameter, bukan dibaca dari `Date.now()` di dalam fungsi.** Itu yang membuat fungsi ini bisa diuji untuk tanggal mana pun tanpa trik. Pola yang sama berlaku untuk seluruh layanan: sediakan `lib/waktu.ts` yang bisa diganti.

## Satu jalur yang lengkap

```ts
// src/fitur/peminjaman/layanan.ts
export function buatLayananPeminjaman(deps: {
  repoPeminjaman: RepoPeminjaman;
  repoBuku: RepoBuku;
  repoAnggota: RepoAnggota;
  sekarang: () => Date;
}) {
  return {
    async pinjam(anggotaId: string, masukan: { bukuId: string }) {
      const anggota = await deps.repoAnggota.ambil(anggotaId);
      if (!anggota) throw new ErrorTidakDitemukan('Anggota tidak ditemukan');

      const buku = await deps.repoBuku.ambil(masukan.bukuId);
      if (!buku) throw new ErrorTidakDitemukan('Buku tidak ditemukan');

      const keadaan: KeadaanAnggota = {
        status: anggota.status,
        jumlahBerjalan: await deps.repoPeminjaman.hitungBerjalanMilik(anggotaId),
        adaTerlambat: await deps.repoPeminjaman.adaTerlambatMilik(anggotaId),
        dendaBelumDibayar: await deps.repoPeminjaman.totalDendaBelumDibayar(anggotaId),
      };

      const kelayakan = bolehMeminjam(keadaan);
      if (!kelayakan.boleh) {
        throw new ErrorAturanBisnis(kelayakan.pesan, kelayakan.kode);
      }

      if (await deps.repoPeminjaman.adaPinjamanBukuIni(anggotaId, buku.id)) {
        throw new ErrorAturanBisnis(
          'Anda sudah meminjam buku ini',
          'SUDAH_MEMINJAM_BUKU_INI'
        );
      }

      if (buku.salinanTersedia < 1) {
        throw new ErrorAturanBisnis('Tidak ada salinan tersedia', 'SALINAN_HABIS');
      }

      const mulai = deps.sekarang();

      // Dua penulisan yang seharusnya terjadi bersama-sama.
      // Di memori ini aman, di basis data tidak. Lihat bagian "Masalah terbuka".
      await deps.repoBuku.kurangiSalinan(buku.id);

      return deps.repoPeminjaman.simpan({
        anggotaId,
        bukuId: buku.id,
        status: 'berjalan',
        dipinjamPada: mulai.toISOString(),
        jatuhTempo: hitungJatuhTempo(mulai),
        sudahDiperpanjang: false,
        denda: 0,
      });
    },
  };
}
```

Perhatikan bentuk `buatLayananPeminjaman` yang menerima ketergantungannya sebagai parameter. Itu dependency injection dalam bentuk paling sederhana, tanpa library apa pun, dan manfaatnya langsung terasa saat menulis test: kirim repository tiruan dan jam tetap, lalu uji sepuluh aturan bisnis tanpa menyalakan server.

## Kesalahan yang akan Anda temui

Empat hal yang hampir pasti terjadi saat mengerjakan proyek ini, beserta jawabannya:

**"Kenapa jumlah pinjaman saya salah setelah beberapa permintaan?"** Kemungkinan besar Anda menyimpan jumlah sebagai angka di objek anggota, lalu ada jalur yang lupa memperbaruinya. Hitung dari daftar peminjaman, jangan simpan. Ini aturan yang sama dengan state turunan di seri frontend.

**"Denda saya selisih satu hari."** Hampir selalu soal zona waktu dan pembulatan. Putuskan dengan tegas: jatuh tempo berakhir pada pukul 23.59.59 di zona waktu mana? Perpustakaan di Jakarta berarti WIB, dan menyimpan UTC berarti Anda harus mengubahnya saat menghitung. Tulis keputusan ini sebagai komentar di `aturan.ts`.

**"Kursor saya rusak setelah data berubah."** Periksa apakah pengurutnya unik. Kalau mengurutkan berdasarkan judul buku, dua judul yang sama akan membuat baris terlewat.

**"Dua permintaan peminjaman bersamaan sama-sama berhasil padahal salinan tinggal satu."** Ini bukan bug di kode Anda, melainkan sifat yang muncul karena pemeriksaan dan pengurangan dilakukan dalam dua langkah. Di penyimpanan memori dengan satu proses, Node melindungi Anda secara kebetulan. Catat kejadiannya, dan modul 9 membahasnya tuntas.

## Checklist penilaian

| # | Yang diperiksa |
| --- | --- |
| 1 | Kirim `POST /v1/peminjaman` dua kali dengan kunci sama. Respons kedua identik, termasuk status? |
| 2 | Kirim kunci sama dengan body berbeda. 409 dengan pesan yang jelas? |
| 3 | Pinjam buku keempat untuk satu anggota. Kode errornya `BATAS_PINJAM_TERCAPAI`? |
| 4 | Hapus buku yang sedang dipinjam. Ditolak dengan 409, bukan 500? |
| 5 | `GET /v1/buku?limit=1000`. Dibatasi 100, bukan error? |
| 6 | Kirim kursor sampah. 400 dengan `KURSOR_TIDAK_VALID`, bukan 500? |
| 7 | Kirim body 5 MB. Ditolak 413 sebelum di-parse? |
| 8 | `PATCH /v1/buku/{id}` dengan `{ "deskripsi": null }`. Dikosongkan, bukan diabaikan? |
| 9 | Kembalikan buku 3 hari setelah jatuh tempo. Denda Rp3.000? |
| 10 | Perpanjang dua kali. Yang kedua ditolak dengan kode sendiri? |
| 11 | Jalankan tanpa `PORT` di env. Mati saat start dengan pesan jelas? |
| 12 | Buka `/dokumentasi`. Semua endpoint ada, dan bisa dicoba? |
| 13 | Panggil endpoint tak dikenal. 404 dengan bentuk error yang sama seperti error lain? |
| 14 | Lempar error sengaja di satu handler. Klien dapat 500 tanpa jejak tumpukan, log punya jejak lengkap? |
| 15 | Kirim 200 permintaan dalam satu menit. Yang ke-101 dapat 429 dengan `Retry-After`? |
| 16 | Kirim SIGTERM saat ada permintaan berjalan. Permintaan itu selesai, lalu proses keluar? |

## Tantangan bonus

- **Pemesanan buku** yang sedang dipinjam, dengan antrean dan aturan "yang memesan lebih dulu dapat lebih dulu". Perhatikan interaksinya dengan aturan perpanjangan.
- **Riwayat perubahan** per peminjaman sebagai daftar peristiwa, bukan hanya status terakhir. Ini pengantar pola yang dibahas di modul 24.
- **Ekspor daftar peminjaman terlambat** sebagai CSV yang dialirkan, bukan ditampung di memori. Pakai pelajaran stream dari modul 2.
- **Beberapa test** untuk `aturan.ts` dengan Vitest. Sepuluh aturan bisnis, sepuluh test, dan semuanya berjalan dalam milidetik karena tidak menyentuh apa pun.

## Rangkuman

- Perbuatan yang punya riwayat sebaiknya dimodelkan sebagai benda. Peminjaman dengan id, status, dan jatuh tempo memberi tempat untuk semua operasi lanjutannya.
- Aturan bisnis ditulis sebagai fungsi murni yang menerima keadaan dan mengembalikan alasan, bukan boolean. Hasilnya bisa diuji tanpa server dan menghasilkan pesan error yang bisa ditindaklanjuti.
- Repository sebagai antarmuka membuat penyimpanan bisa diganti tanpa menyentuh aturan bisnis.
- Pertanyaan dari aturan bisnis jadi method repository sendiri, bukan "ambil semua lalu saring di aplikasi".
- Waktu masuk sebagai ketergantungan, supaya perhitungan tanggal bisa diuji untuk hari apa pun.
- Nilai yang bisa dihitung tidak disimpan. Jumlah pinjaman berjalan dihitung dari daftarnya.
- Satu bentuk error, kode yang stabil per pelanggaran aturan, dan `requestId` di semua respons error.

## Masalah terbuka

Layanan ini bekerja, dan punya lima masalah yang tidak bisa diselesaikan dengan kode yang lebih baik.

**Satu, semuanya hilang saat proses mati.** Setiap deploy, setiap restart, setiap kali container diganti, seluruh katalog dan riwayat peminjaman lenyap. Ini bukan ketidaknyamanan, ini berarti layanan Anda tidak bisa dipakai siapa pun.

**Dua, tidak bisa dijalankan lebih dari satu instance.** Dua proses berarti dua isi memori yang berbeda, dan pengguna mendapat jawaban berbeda tergantung instance mana yang melayaninya. Sifat stateless dari modul 1 sekarang jadi masalah nyata.

**Tiga, pertanyaan bisnis jadi mahal.** "Berapa buku terlambat per kategori bulan ini" di implementasi memori berarti menelusuri seluruh array di dalam proses, memblokir event loop seperti di modul 2.

**Empat, tidak ada yang menjaga kebenaran data.** Tidak ada yang mencegah peminjaman dengan `bukuId` yang tidak ada, atau denda bernilai negatif, kecuali kode Anda sendiri mengingatnya di setiap jalur.

**Lima, dua penulisan yang seharusnya menyatu bisa terpisah.** Di `pinjam`, salinan buku dikurangi lalu peminjaman disimpan. Kalau proses mati di antara keduanya, salinan berkurang tanpa ada catatan peminjamannya, dan tidak ada cara mengembalikannya.

Kelimanya bukan masalah yang diselesaikan dengan menulis kode lebih rapi. Kelimanya alasan basis data ada.

Itu isi modul berikutnya: pemodelan data relasional, dan kenapa membiarkan basis data yang menjaga kebenaran lebih murah daripada mengingatnya di setiap jalur kode.
