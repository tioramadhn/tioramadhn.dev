---
title: 'Modul 16: Testing Frontend: Unit, Komponen, dan End-to-End'
description: Bukan mengejar angka cakupan, tapi menulis sedikit test yang benar-benar menangkap kerusakan. Vitest, Testing Library, Playwright, dan cara memutuskan apa yang tidak perlu diuji.
date: 2026-11-26
slug: modul-16-testing-frontend
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Modul sebelumnya ditutup dengan pertanyaan yang berlaku untuk seluruh seri ini: bagaimana mengetahui sesuatu rusak sebelum pengguna yang memberi tahu?

Jawaban yang biasa diberikan, "ya ditest", sering berhenti sebagai niat karena dua alasan yang sama-sama masuk akal:

1. **Test yang salah lebih merepotkan daripada tidak ada test.** Test yang pecah setiap kali tampilan diubah sedikit akan dimatikan dalam sebulan.
2. **Tidak jelas apa yang pantas diuji.** Menguji semuanya tidak mungkin, dan menguji hal yang salah membuang waktu tanpa menambah keyakinan.

Modul ini tentang memilih, bukan tentang menulis sebanyak-banyaknya.

## Analogi: tiga lapis pemeriksaan pabrik

Bayangkan pabrik yang memproduksi sepeda.

**Pemeriksaan komponen.** Satu baut diuji kekuatannya. Cepat, murah, bisa dilakukan ribuan kali sehari. Tapi baut yang lolos tidak menjamin sepedanya bisa dikayuh.

**Pemeriksaan rakitan.** Sistem rem dirakit lalu diuji. Lebih lambat, lebih mahal, dan jauh lebih meyakinkan.

**Uji jalan.** Satu sepeda utuh dikendarai keliling pabrik. Paling lambat, paling mahal, dan satu-satunya yang membuktikan sepedanya benar-benar bisa dipakai.

| Dunia pabrik | Dunia frontend |
| --- | --- |
| Uji satu baut | Unit test untuk fungsi murni |
| Uji sistem rem | Component test untuk satu komponen beserta interaksinya |
| Uji jalan | End-to-end test pada aplikasi sungguhan di browser |
| Memeriksa warna cat setiap baut | Test yang menguji detail implementasi |
| Daftar periksa sebelum kirim | Test yang jalan otomatis di CI |

Batas analoginya: pabrik menguji sepeda yang sama berulang kali, sedangkan Anda menguji produk yang berubah setiap minggu. Karena itu test yang terikat pada bentuk kode akan jadi beban, dan test yang terikat pada perilaku akan bertahan.

## Apa yang pantas diuji

Urutan berdasarkan nilai per waktu yang dikeluarkan:

| Pantas diuji | Contoh dari seri ini |
| --- | --- |
| Logika yang punya aturan | Perhitungan total dan pajak, `kelompokkan`, skema Zod, fungsi otorisasi |
| Alur yang kalau rusak berarti kehilangan uang atau kepercayaan | Login, checkout, simpan catatan, pengaturan hak akses |
| Bug yang pernah terjadi | Setiap perbaikan bug layak ditemani satu test |
| Perilaku komponen yang punya keadaan | Form dengan validasi, tabel dengan filter, dialog |
| Kontrak dengan pihak lain | Bentuk respons API yang Anda andalkan |

| Tidak pantas diuji | Alasan |
| --- | --- |
| Tampilan statis | Lebih baik dengan uji visual, atau tidak sama sekali |
| Library pihak ketiga | Sudah diuji pemiliknya |
| Detail implementasi | Nama state, urutan pemanggilan hook, struktur HTML internal |
| Hal yang tidak pernah rusak | Komponen pembungkus yang hanya meneruskan props |

Satu patokan dari Kent C. Dodds yang pantas ditempel di dinding: **semakin test Anda menyerupai cara pengguna memakai aplikasi, semakin besar keyakinan yang diberikannya.** Dari situ semua keputusan lain mengalir.

Soal angka cakupan: berguna sebagai penunjuk area yang belum tersentuh, berbahaya sebagai target. Cakupan 100% bisa dicapai dengan test yang tidak memeriksa apa pun, dan tim yang mengejar angka akan menghasilkannya.

## Penyiapan

```bash
pnpm add -D vitest @vitest/coverage-v8 jsdom
pnpm add -D @testing-library/react @testing-library/user-event @testing-library/jest-dom
pnpm add -D msw
pnpm create playwright
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
```

```json
{
  "scripts": {
    "test": "vitest",
    "test:ci": "vitest run",
    "test:e2e": "playwright test",
    "check": "tsc --noEmit && eslint . && prettier --check . && vitest run"
  }
}
```

## Lapis satu: unit test

Untuk logika murni, test-nya pendek dan nilainya tinggi.

```ts
// lib/format.test.ts
import { describe, it, expect } from 'vitest';
import { hitungTotal } from './keranjang';

describe('hitungTotal', () => {
  it('menjumlahkan harga dikali jumlah', () => {
    expect(hitungTotal([{ harga: 22000, jumlah: 2 }])).toBe(44000);
  });

  it('mengabaikan diskon yang tidak diisi', () => {
    expect(hitungTotal([{ harga: 22000, jumlah: 1 }])).toBe(22000);
  });

  // Nilai nol adalah nilai yang sah, dan ini pernah jadi bug nyata di modul 4
  it('memperlakukan diskon nol sebagai nol, bukan sebagai tidak ada', () => {
    expect(hitungTotal([{ harga: 22000, jumlah: 1, diskon: 0 }])).toBe(22000);
  });

  it('mengembalikan nol untuk keranjang kosong', () => {
    expect(hitungTotal([])).toBe(0);
  });
});
```

Skema Zod dari modul 12 juga layak diuji, dan test-nya menjelaskan aturan bisnis lebih jelas daripada dokumentasi mana pun:

```ts
describe('skemaPendaftaran', () => {
  it('mewajibkan NPWP untuk akun perusahaan', () => {
    const hasil = skemaPendaftaran.safeParse({ ...dasar, jenisAkun: 'perusahaan' });

    expect(hasil.success).toBe(false);
    expect(hasil.error?.issues[0]?.path).toEqual(['npwp']);
  });

  it('membersihkan spasi dan huruf besar pada email', () => {
    const hasil = skemaPendaftaran.parse({ ...dasar, email: '  Tio@Contoh.COM ' });
    expect(hasil.email).toBe('tio@contoh.com');
  });
});
```

## Lapis dua: component test

Di sinilah sebagian besar nilai berada untuk aplikasi frontend, dan di sinilah paling banyak orang salah jalan.

```tsx
// FormPendaftaran.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('menampilkan error saat email tidak valid, lalu menghapusnya setelah diperbaiki', async () => {
  const pengguna = userEvent.setup();
  render(<FormPendaftaran onKirim={vi.fn()} />);

  // Dicari seperti pengguna mencarinya: lewat label, bukan lewat kelas CSS
  const email = screen.getByLabelText(/email/i);

  await pengguna.type(email, 'bukan-email');
  await pengguna.tab(); // memicu validasi saat meninggalkan kolom

  expect(await screen.findByText(/format email belum benar/i)).toBeVisible();

  await pengguna.clear(email);
  await pengguna.type(email, 'tio@contoh.com');

  expect(screen.queryByText(/format email belum benar/i)).not.toBeInTheDocument();
});

it('tidak mengirim form yang belum lengkap', async () => {
  const pengguna = userEvent.setup();
  const kirim = vi.fn();
  render(<FormPendaftaran onKirim={kirim} />);

  await pengguna.click(screen.getByRole('button', { name: /daftar/i }));

  expect(kirim).not.toHaveBeenCalled();
  expect(await screen.findByRole('alert')).toBeVisible();
});
```

Perhatikan cara elemen dicari. Urutan yang disarankan, dari yang paling baik:

| Cara | Contoh | Catatan |
| --- | --- | --- |
| `getByRole` dengan nama | `getByRole('button', { name: /simpan/i })` | Paling mirip cara pengguna, sekaligus menguji aksesibilitas |
| `getByLabelText` | `getByLabelText(/email/i)` | Untuk isian form |
| `getByText` | `getByText(/tidak ada hasil/i)` | Untuk teks yang dibaca pengguna |
| `getByTestId` | `getByTestId('baris-produk')` | Pilihan terakhir, saat tidak ada cara lain |
| Selektor kelas CSS | `container.querySelector('.btn')` | Jangan. Pecah setiap kali gaya diubah |

Ada efek samping yang menyenangkan dari aturan ini: **test yang ditulis dengan `getByRole` otomatis menguji aksesibilitas.** Tombol tanpa nama yang bisa diakses tidak akan ditemukan, dan test-nya gagal. Modul 15 ikut dijaga tanpa usaha tambahan.

Dan satu hal yang tidak boleh diuji:

```tsx
// Salah: menguji detail implementasi
expect(komponen.state.sedangMemuat).toBe(true);
expect(mockUseQuery).toHaveBeenCalledWith({ queryKey: ['produk'] });

// Benar: menguji yang dilihat pengguna
expect(screen.getByText(/memuat/i)).toBeVisible();
```

Test pertama pecah saat Anda mengganti nama state, meski aplikasinya tetap bekerja sempurna. Test kedua tetap hijau selama perilakunya benar, dan merah saat benar-benar rusak.

## Memalsukan jaringan dengan MSW

Jangan menambal `fetch` dengan tiruan. Jalankan server palsu yang menjawab permintaan sungguhan, supaya yang diuji benar-benar seluruh jalur.

```ts
// test/server.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const server = setupServer(
  http.get('*/api/produk', () =>
    HttpResponse.json({ data: [{ id: '1', nama: 'Kopi susu', harga: 22000 }] })
  )
);
```

```tsx
it('menampilkan pesan yang bisa dipahami saat server bermasalah', async () => {
  server.use(
    http.get('*/api/produk', () => new HttpResponse(null, { status: 500 }))
  );

  render(<HalamanProduk />, { wrapper: Pembungkus });

  expect(await screen.findByText(/layanan sedang bermasalah/i)).toBeVisible();
  expect(screen.getByRole('button', { name: /coba lagi/i })).toBeVisible();
});
```

Keadaan gagal adalah yang paling jarang diuji secara manual dan paling sering rusak. Dengan MSW, menguji 500, 404, jaringan putus, dan respons lambat jadi beberapa baris.

## Lapis tiga: end-to-end dengan Playwright

```ts
// e2e/catatan.spec.ts
import { test, expect } from '@playwright/test';

test('pengguna bisa masuk, membuat catatan, lalu membagikannya', async ({ page }) => {
  await page.goto('/masuk');

  await page.getByLabel('Email').fill('tio@contoh.com');
  await page.getByLabel('Password').fill('rahasia-uji');
  await page.getByRole('button', { name: 'Masuk' }).click();

  await expect(page.getByRole('heading', { name: 'Catatan saya' })).toBeVisible();

  await page.getByRole('button', { name: 'Catatan baru' }).click();
  await page.getByLabel('Judul').fill('Rencana rilis');
  await expect(page.getByText('Tersimpan')).toBeVisible();

  await page.getByRole('button', { name: 'Bagikan' }).click();
  await page.getByLabel('Email yang diundang').fill('anggi@contoh.com');
  await page.getByRole('button', { name: 'Kirim undangan' }).click();

  await expect(page.getByRole('status')).toContainText('Undangan terkirim');
});
```

Playwright sekaligus membuka dua pengujian yang sulit dilakukan di lapis lain:

```ts
// Pemeriksaan aksesibilitas otomatis pada halaman sungguhan
import AxeBuilder from '@axe-core/playwright';

test('halaman catatan tidak punya pelanggaran aksesibilitas serius', async ({ page }) => {
  await page.goto('/catatan');
  const hasil = await new AxeBuilder({ page }).analyze();

  expect(hasil.violations.filter((v) => v.impact === 'critical')).toEqual([]);
});

// Pengujian keamanan: otorisasi, bukan hanya tombol yang hilang
test('pembaca tidak bisa mengubah catatan meski memanggil langsung', async ({ request }) => {
  const respons = await request.post('/catatan/abc/simpan', {
    data: { isi: 'disusupi' },
    headers: { cookie: kukiAkunPembaca },
  });

  expect(respons.status()).toBe(403);
});
```

Test kedua itu persis checklist nomor 2 di Proyek 4, sekarang dijalankan otomatis di setiap rilis.

Berapa banyak test E2E yang pantas? Sedikit, dan pilih yang paling berharga. Patokan praktis: **satu test per alur yang kalau rusak berarti aplikasi Anda tidak bisa dipakai.** Untuk aplikasi catatan, itu sekitar lima: masuk, buat, ubah dan simpan, bagikan, hapus. Lima puluh test E2E akan membuat pipeline lambat dan rapuh, dan tim akan mulai mengabaikan kegagalannya.

## Test yang kadang merah kadang hijau

Test yang hasilnya tidak konsisten lebih berbahaya daripada tidak ada test, karena melatih tim mengabaikan warna merah. Empat penyebab terbesarnya:

| Penyebab | Perbaikan |
| --- | --- |
| `waitForTimeout` atau `sleep` | Tunggu keadaan, bukan waktu: `await expect(...).toBeVisible()` |
| Test saling bergantung | Setiap test menyiapkan datanya sendiri dan bisa jalan sendirian |
| Data bersama antar test | Buat data unik per test, misalnya dengan awalan acak |
| Bergantung waktu, zona waktu, atau urutan | Kunci waktu dengan jam palsu, dan jangan bergantung pada urutan data |

Playwright punya penantian otomatis bawaan, jadi `waitForTimeout` hampir selalu tanda ada yang salah dalam cara test ditulis.

## Di mana test dijalankan

Test yang hanya jalan di komputer Anda akan terlupa. Jadikan bagian dari pipeline:

```yaml
# .github/workflows/periksa.yml
name: Periksa
on: [push, pull_request]

jobs:
  periksa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm check # tsc, eslint, prettier, vitest
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
```

Dua aturan yang membuat pipeline tetap berguna: **waktunya di bawah sepuluh menit**, dan **kegagalannya selalu berarti**. Pipeline yang lambat akan dilewati, dan pipeline yang sering merah tanpa sebab akan diabaikan.

## Latihan

### Latihan 1: Lima test untuk Proyek 4

Tulis lima test untuk aplikasi catatan, satu per lapis kebutuhan:

1. Unit: fungsi otorisasi `pastikanBolehAkses` menolak pembaca yang mencoba mengubah.
2. Unit: skema catatan menolak judul kosong dan memotong spasi.
3. Komponen: penanda penyimpanan otomatis menampilkan empat keadaannya dengan benar.
4. Komponen: dialog berbagi menampilkan error saat email tidak valid.
5. E2E: alur masuk, buat catatan, lalu catatan itu muncul di daftar.

> [!petunjuk]
> Untuk nomor 3, jangan memeriksa state di dalam komponen. Periksa teks yang dilihat pengguna, dan pakai MSW untuk mengatur jawaban server supaya keadaan gagal bisa dipicu.

> [!jawaban]
>
> ```ts
> // 1. Unit: otorisasi
> it('menolak pembaca yang mencoba mengubah', async () => {
>   siapkanSesi({ penggunaId: 'u-2' });
>   siapkanCatatan({ id: 'c-1', pemilikId: 'u-1', akses: [{ penggunaId: 'u-2', peran: 'pembaca' }] });
>
>   await expect(pastikanBolehAkses('c-1', 'ubah')).rejects.toThrow(TidakBerwenang);
> });
>
> it('menyamarkan catatan milik orang lain sebagai tidak ditemukan', async () => {
>   siapkanSesi({ penggunaId: 'u-3' });
>   siapkanCatatan({ id: 'c-1', pemilikId: 'u-1', akses: [] });
>
>   // Penting: bukan TidakBerwenang, supaya id tidak bisa ditebak
>   await expect(pastikanBolehAkses('c-1', 'baca')).rejects.toThrow(TidakDitemukan);
> });
> ```
>
> ```tsx
> // 3. Komponen: penanda penyimpanan
> it('menampilkan keadaan gagal dan mempertahankan isi yang diketik', async () => {
>   server.use(http.post('*/catatan/*', () => new HttpResponse(null, { status: 500 })));
>
>   const pengguna = userEvent.setup();
>   render(<EditorCatatan catatan={catatanContoh} />, { wrapper: Pembungkus });
>
>   await pengguna.type(screen.getByLabelText(/isi catatan/i), ' tambahan');
>
>   expect(await screen.findByText(/gagal menyimpan/i)).toBeVisible();
>   // Yang paling penting: pekerjaan pengguna tidak hilang
>   expect(screen.getByLabelText(/isi catatan/i)).toHaveValue(
>     expect.stringContaining('tambahan')
>   );
> });
> ```
>
> Tiga hal yang membedakan rangkaian test ini dari yang asal:
>
> 1. **Test nomor 2 pada bagian otorisasi menguji keputusan keamanan, bukan hanya fungsi.** Kalau suatu hari seseorang "memperbaiki" pesan error supaya lebih informatif, test ini merah dan mengingatkan alasan aslinya.
> 2. **Test komponen memeriksa bahwa isi pengguna tidak hilang saat gagal.** Itu janji produk, dan janji produk pantas diuji.
> 3. **Hanya satu test E2E di antara lima.** Empat lainnya berjalan dalam milidetik, dan memberi umpan balik saat Anda masih menulis kodenya.

### Latihan 2: Perbaiki test yang buruk

Empat test ini bermasalah. Jelaskan dan tulis ulang.

```tsx
// A
it('bekerja', () => {
  const { container } = render(<KartuProduk produk={contoh} />);
  expect(container.querySelector('.kartu-produk__judul')?.textContent).toBe('Kopi susu');
});

// B
it('memanggil useQuery dengan kunci yang benar', () => {
  render(<HalamanProduk />);
  expect(mockUseQuery).toHaveBeenCalledWith(
    expect.objectContaining({ queryKey: ['produk', 'daftar'] })
  );
});

// C
it('menampilkan hasil', async () => {
  render(<Pencarian />);
  await new Promise((r) => setTimeout(r, 2000));
  expect(screen.getByText('Kopi susu')).toBeVisible();
});

// D
it('alur lengkap', async () => {
  // 140 baris: login, cari, filter, urutkan, tambah, ubah, hapus, logout
});
```

> [!jawaban]
>
> **A: terikat pada kelas CSS, dan namanya tidak menjelaskan apa pun.** Mengganti nama kelas saat merapikan styling akan memecahkannya, padahal tidak ada yang rusak bagi pengguna.
>
> ```tsx
> it('menampilkan nama dan harga produk', () => {
>   render(<KartuProduk produk={contoh} />);
>   expect(screen.getByRole('heading', { name: 'Kopi susu' })).toBeVisible();
>   expect(screen.getByText('Rp22.000')).toBeVisible();
> });
> ```
>
> **B: menguji detail implementasi.** Test ini hijau meski halamannya menampilkan layar kosong, dan merah kalau Anda mengganti library data tanpa mengubah perilaku apa pun. Yang pantas diuji: produk benar-benar tampil, dan mengganti filter mengubah yang tampil.
>
> **C: menunggu waktu, bukan menunggu keadaan.** Di mesin CI yang lambat, dua detik bisa kurang, jadi test kadang merah tanpa sebab. Di mesin cepat, dua detik itu pemborosan yang dikalikan jumlah test.
>
> ```tsx
> expect(await screen.findByText('Kopi susu')).toBeVisible();
> ```
>
> **D: satu test untuk segalanya.** Kalau merah, Anda tidak tahu apa yang rusak, dan satu kegagalan di langkah ketiga menyembunyikan semua langkah setelahnya. Pecah jadi beberapa test yang masing-masing punya satu tujuan, dan pakai persiapan bersama untuk login sehingga tidak diulang-ulang.

### Latihan 3: Satu bug, satu test

Ambil tiga bug yang pernah Anda temui di proyek-proyek seri ini, lalu tulis satu test untuk masing-masing yang akan merah sebelum perbaikan dan hijau sesudahnya.

Saran bug yang bisa dipakai: indeks sebagai `key` yang membuat isian berpindah (modul 8), `||` yang menyembunyikan nilai nol (modul 4), dan filter yang tidak mengembalikan halaman ke 1 (Proyek 3).

> [!pembahasan]
>
> ```tsx
> // Bug key: isian tidak boleh berpindah setelah item dihapus
> it('mempertahankan isian pada item yang benar setelah item lain dihapus', async () => {
>   const pengguna = userEvent.setup();
>   render(<DaftarCatatan catatan={[a, b, c]} />);
>
>   const isian = screen.getAllByRole('textbox');
>   await pengguna.type(isian[1]!, ' diubah');
>   await pengguna.click(screen.getByRole('button', { name: `Hapus ${a.judul}` }));
>
>   expect(screen.getAllByRole('textbox')[0]).toHaveValue(`${b.judul} diubah`);
> });
>
> // Bug halaman: filter mengembalikan ke halaman 1
> it('kembali ke halaman 1 saat filter diubah', async () => {
>   const pengguna = userEvent.setup();
>   render(<HalamanProduk />, { rute: '/produk?halaman=3&kategori=semua' });
>
>   await pengguna.selectOptions(screen.getByLabelText(/kategori/i), 'minuman');
>
>   expect(lokasiSekarang().search).toContain('kategori=minuman');
>   expect(lokasiSekarang().search).not.toContain('halaman=3');
> });
> ```
>
> Kebiasaan "satu bug, satu test" adalah cara paling murah membangun rangkaian test yang berguna, dan alasannya ada tiga:
>
> 1. **Bug yang pernah terjadi punya peluang besar terjadi lagi**, karena biasanya berasal dari bagian yang memang rumit.
> 2. **Test-nya pasti menguji hal yang nyata**, bukan hal yang Anda bayangkan mungkin rusak.
> 3. **Menulisnya paling mudah justru saat bug itu masih segar**, karena Anda sudah tahu cara memicunya.
>
> Jadikan ini bagian dari alur kerja: setiap perbaikan bug datang dengan satu test, dan test itu ditulis sebelum perbaikannya supaya Anda melihatnya merah dulu. Test yang tidak pernah terlihat merah belum terbukti menguji apa pun.

## Batasnya

Rangkaian test yang baik memberi keyakinan untuk mengubah kode, dan tidak menjanjikan tiga hal.

**Test tidak menangkap yang tidak Anda pikirkan.** Semua test adalah hal yang terpikir oleh penulisnya. Jenis bug yang paling merepotkan justru yang tidak terbayang.

**Test tidak mengukur kualitas pengalaman.** Aplikasi bisa hijau sepenuhnya dan tetap lambat, membingungkan, dan menyebalkan dipakai. Dua hal pertama itu modul berikutnya.

**Test punya biaya pemeliharaan.** Setiap test adalah kode yang harus ikut diubah saat produk berubah. Itu sebabnya memilih lebih penting daripada menambah.

## Rangkuman

- Semakin test menyerupai cara pengguna memakai aplikasi, semakin besar keyakinan yang diberikannya.
- Prioritaskan logika yang punya aturan, alur yang berharga, dan bug yang pernah terjadi. Jangan uji detail implementasi dan library orang lain.
- Cari elemen lewat peran dan nama, bukan lewat kelas CSS. Efek sampingnya: aksesibilitas ikut teruji.
- MSW memalsukan jaringan di tingkat permintaan, sehingga keadaan gagal mudah diuji dan jalur yang diuji tetap utuh.
- E2E sedikit dan terpilih: satu per alur yang kalau rusak berarti aplikasi tidak bisa dipakai. Playwright sekaligus bisa memeriksa aksesibilitas dan otorisasi.
- Test yang kadang merah kadang hijau melatih tim mengabaikan kegagalan. Tunggu keadaan, bukan waktu, dan jaga setiap test agar berdiri sendiri.
- Angka cakupan berguna sebagai penunjuk, berbahaya sebagai target.
- Test berjalan di CI, di bawah sepuluh menit, dan kegagalannya selalu berarti.

## Masalah terbuka

Aplikasi Anda sekarang benar dan terjaga. Pertanyaan berikutnya datang dari tempat yang tidak bisa dijawab oleh satu pun test yang Anda tulis.

Buka aplikasi itu di HP dua jutaan, dengan jaringan 4G yang penuh di jam pulang kantor. Hitung berapa detik sampai tulisan pertama muncul, berapa detik sampai tombol bisa ditekan, dan apakah tata letaknya melompat saat gambar datang.

Angka-angka itu tidak muncul di test, tidak muncul di telaah kode, dan tidak muncul di laptop Anda. Tapi angka itu yang menentukan berapa banyak pengguna yang menutup halaman sebelum melihat apa pun.

Itu isi modul berikutnya: performance dan Core Web Vitals, mulai dari cara mengukurnya dengan jujur sampai urutan perbaikan yang benar-benar berdampak.
