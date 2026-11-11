---
title: 'Modul 20: Testing Backend'
description: Yang paling berbahaya bukan fitur yang jelas rusak, melainkan yang rusak hanya pada keadaan tertentu. Menguji konkurensi, otorisasi, idempotensi, dan migrasi terhadap Postgres sungguhan.
date: 2026-12-25
slug: modul-20-testing-backend
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Hitung yang sudah Anda bangun di sembilan belas modul:

| Yang harus tetap benar | Jumlah |
| --- | --- |
| Aturan bisnis perpustakaan | 10 |
| Jalur yang harus tahan konkurensi | 6 |
| Tempat yang butuh idempotensi | 8 |
| Kombinasi peran kali endpoint | 60 |
| Konsumen peristiwa yang harus idempoten | 6 |
| Jalan mundur di matriks degradasi | 7 |
| Migrasi yang harus bisa dijalankan dari nol | 30 |

Tidak ada manusia yang memeriksa 127 hal itu dengan tangan sebelum setiap rilis. Dan yang paling berbahaya bukan fitur yang jelas rusak, karena itu langsung terlihat. Yang berbahaya adalah yang rusak **hanya pada keadaan tertentu**: dua permintaan bersamaan, peristiwa yang tiba dua kali, atau peran yang kebetulan tidak pernah dicoba.

Backend punya satu keuntungan yang tidak dimiliki frontend dalam hal ini: **tidak ada tampilan yang berubah.** Yang diuji adalah masukan, keluaran, dan keadaan data. Itu membuat test backend jauh lebih stabil, dan karena itu jauh lebih pantas diinvestasikan.

## Analogi: tiga lapis pemeriksaan pabrik, dan satu alat ukur

Bayangkan pabrik yang membuat timbangan.

**Uji komponen.** Satu per pegas diuji kekuatannya. Cepat, murah, ribuan kali sehari.

**Uji rakitan.** Timbangan yang sudah dirakit diuji dengan beban standar. Lebih lambat, lebih meyakinkan.

**Uji pemakaian.** Timbangan dipakai sepuluh orang bergantian, dalam ruangan panas, selama delapan jam.

Dan satu hal yang khas untuk pabrik timbangan: **kalibrasi dengan beban yang sudah diketahui beratnya.** Tanpa alat ukur yang benar, semua uji di atas hanya menyatakan bahwa timbangannya konsisten, bukan bahwa angkanya benar.

| Dunia pabrik | Dunia backend |
| --- | --- |
| Uji satu pegas | Unit test untuk aturan bisnis murni |
| Uji timbangan yang sudah dirakit | Integration test terhadap Postgres sungguhan |
| Sepuluh orang memakai bergantian | Uji konkurensi dan uji beban |
| Kalibrasi dengan beban yang diketahui | Data uji yang Anda tahu jawabannya |
| Memeriksa warna cat setiap pegas | Test yang menguji detail implementasi |
| Alat uji yang sendirinya tidak akurat | Test yang kadang merah kadang hijau |

Batas analoginya: pabrik menguji produk yang sama berulang kali, sedangkan Anda menguji sistem yang berubah setiap minggu. Karena itu test yang terikat pada bentuk internal kode akan jadi beban, dan test yang terikat pada perilaku yang dijanjikan akan bertahan.

## Apa yang pantas diuji di backend

| Pantas diuji | Contoh dari seri ini | Lapisan |
| --- | --- | --- |
| Aturan bisnis murni | `bolehMeminjam`, `hitungDenda`, perhitungan diskon | Unit |
| Skema dan validasi | Zod: NPWP wajib untuk perusahaan | Unit |
| Fungsi otorisasi | Matriks peran kali izin kali cakupan | Unit |
| Kueri dan batasan basis data | Indeks unik sebagian, `CHECK`, `EXCLUDE` | Integrasi |
| Perilaku di bawah konkurensi | Stok tidak minus pada 100 permintaan bersamaan | Integrasi |
| Idempotensi | Pekerjaan dan peristiwa yang dijalankan dua kali | Integrasi |
| Isolasi tenant | RLS menolak kueri yang lupa menyaring | Integrasi |
| Kontrak API | Bentuk respons yang dipakai klien lain | Kontrak |
| Migrasi | Jalan dari nol, dan bisa dibalik | Integrasi |
| Degradasi | Jalan mundur saat ketergantungan mati | Integrasi |
| Kapasitas | Di mana sistemnya patah | Beban |

| Tidak pantas diuji | Alasan |
| --- | --- |
| Getter dan setter sepele | Tidak pernah rusak |
| Library pihak ketiga | Sudah diuji pemiliknya |
| Pemanggilan fungsi internal | Detail implementasi, bukan perilaku |
| Bentuk SQL yang dihasilkan | Terikat implementasi. Uji hasilnya, bukan perintahnya |
| Semua kombinasi masukan | Pilih yang jadi batas dan yang pernah jadi bug |

Satu hal yang membedakan backend dari frontend: **menguji terhadap basis data sungguhan hampir selalu lebih baik daripada menirukannya.** Alasannya ada di seluruh seri ini: batasan, transaksi, isolasi, dan perilaku indeks adalah bagian dari logika aplikasi Anda. Basis data tiruan akan melaporkan semuanya hijau sementara produksi melanggar batasan yang tidak pernah diuji.

## Penyiapan

```bash
pnpm add -D vitest @testcontainers/postgresql
pnpm add -D k6   # atau pasang binari k6 terpisah
```

```ts
// test/basis-data.ts
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let kontainer: StartedPostgreSqlContainer;

export async function siapkanBasisData() {
  kontainer = await new PostgreSqlContainer('postgres:17').start();

  process.env.DATABASE_URL = kontainer.getConnectionUri();

  // Migrasi dijalankan dari nol: sekaligus menguji migrasinya
  await jalankanMigrasi();

  return { url: kontainer.getConnectionUri() };
}

export async function hentikanBasisData() {
  await kontainer?.stop();
}
```

```ts
// test/setup.ts
import { beforeAll, afterAll, beforeEach } from 'vitest';

beforeAll(async () => {
  await siapkanBasisData();
  await siapkanBenihTetap();   // peran, izin, kategori: data yang tidak berubah
}, 60_000);

afterAll(async () => {
  await hentikanBasisData();
});

beforeEach(async () => {
  // Kosongkan tabel transaksional, sisakan benih tetap.
  // Jauh lebih cepat daripada menjalankan migrasi ulang.
  await db.execute(sql`
    TRUNCATE pesanan, pesanan_item, outbox, peristiwa_diproses,
             mutasi_poin, sesi, audit RESTART IDENTITY CASCADE
  `);
});
```

Tiga keputusan penting di penyiapan itu:

**Satu, migrasi dijalankan dari nol di setiap jalannya test.** Itu memberi dua hal gratis: skema test selalu sama dengan produksi, dan migrasi yang rusak langsung terlihat tanpa test khusus.

**Dua, `TRUNCATE` per test, bukan membuat basis data baru.** `TRUNCATE` dengan `RESTART IDENTITY CASCADE` butuh beberapa milidetik, sedangkan membuat kontainer baru butuh beberapa detik.

**Tiga, satu kontainer untuk seluruh berkas test.** Vitest menjalankan berkas secara paralel, jadi setiap pekerja butuh isolasinya sendiri. Dua pilihan: satu kontainer per pekerja, atau satu kontainer dengan skema terpisah per pekerja. Yang kedua lebih cepat:

```ts
// Isolasi antar pekerja paralel dengan skema terpisah
const skema = `uji_${process.env.VITEST_WORKER_ID ?? '1'}`;

await db.execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS ${skema}`));
await db.execute(sql.raw(`SET search_path TO ${skema}`));
```

Alternatif untuk test yang tidak perlu melihat efek lintas transaksi: **jalankan setiap test di dalam transaksi lalu `ROLLBACK`.** Cepat dan bersih, dengan satu batasan penting: Anda tidak bisa menguji perilaku konkurensi, karena dua transaksi yang berbeda memang harus benar-benar terpisah.

## Unit test untuk aturan bisnis

Paling murah, paling cepat, dan nilainya tinggi karena aturan bisnis adalah tempat kesalahan paling mahal.

```ts
import { describe, it, expect } from 'vitest';
import { bolehMeminjam, hitungDenda, hitungJatuhTempo } from '@/fitur/peminjaman/aturan';

describe('bolehMeminjam', () => {
  const dasar = { status: 'aktif' as const, jumlahBerjalan: 0, adaTerlambat: false, dendaBelumDibayar: 0 };

  it('mengizinkan anggota aktif tanpa tanggungan', () => {
    expect(bolehMeminjam(dasar)).toEqual({ boleh: true });
  });

  // Batas, bukan nilai tengah: 2 boleh, 3 tidak
  it.each([
    { jumlah: 2, boleh: true },
    { jumlah: 3, boleh: false },
    { jumlah: 4, boleh: false },
  ])('jumlah pinjaman $jumlah -> boleh: $boleh', ({ jumlah, boleh }) => {
    const hasil = bolehMeminjam({ ...dasar, jumlahBerjalan: jumlah });
    expect(hasil.boleh).toBe(boleh);
  });

  it('menyebutkan alasan yang bisa ditindaklanjuti, bukan hanya false', () => {
    const hasil = bolehMeminjam({ ...dasar, adaTerlambat: true });

    expect(hasil).toMatchObject({
      boleh: false,
      kode: 'ADA_PINJAMAN_TERLAMBAT',
    });
    expect(hasil.boleh === false && hasil.pesan).toMatch(/kembalikan/i);
  });

  // Urutan pemeriksaan adalah keputusan produk, jadi pantas diuji
  it('menyebut keterlambatan lebih dulu saat beberapa aturan dilanggar', () => {
    const hasil = bolehMeminjam({
      ...dasar, adaTerlambat: true, jumlahBerjalan: 5, dendaBelumDibayar: 80_000,
    });

    expect(hasil.boleh === false && hasil.kode).toBe('ADA_PINJAMAN_TERLAMBAT');
  });
});

describe('hitungDenda', () => {
  it('nol kalau dikembalikan sebelum jatuh tempo', () => {
    expect(hitungDenda('2026-12-25', new Date('2026-12-20T10:00:00Z'))).toBe(0);
  });

  // Batas hari adalah tempat bug paling sering bersembunyi
  it.each([
    { kembali: '2026-12-25T16:59:00Z', denda: 0, catatan: 'masih 25 Des di WIB' },
    { kembali: '2026-12-25T17:01:00Z', denda: 1_000, catatan: 'sudah 26 Des di WIB' },
    { kembali: '2026-12-28T17:01:00Z', denda: 4_000, catatan: 'empat hari' },
  ])('$catatan -> Rp$denda', ({ kembali, denda }) => {
    expect(hitungDenda('2026-12-25', new Date(kembali))).toBe(denda);
  });
});
```

Tiga hal yang membedakan test ini dari test yang hanya mengejar cakupan:

**Satu, mengujinya di batas.** Dua dan tiga pinjaman, bukan satu dan sepuluh. Bug hampir selalu ada di batas, bukan di tengah.

**Dua, mengujinya pada zona waktu yang benar.** Dua kasus pada pukul 16.59 dan 17.01 UTC menguji keputusan yang ditulis di modul 5: jatuh tempo berakhir pukul 23.59 WIB. Tanpa test ini, perubahan kecil di perhitungan tanggal akan menghasilkan denda yang salah satu hari untuk semua orang.

**Tiga, mengujinya pada urutan alasan.** Urutan pemeriksaan adalah keputusan produk, dan test ini mengabadikannya. Kalau suatu hari ada yang mengubah urutannya, test merah akan memaksa percakapan, bukan perubahan diam-diam.

## Uji konkurensi

Inilah keterampilan khas backend, dan hampir tidak pernah ada di rangkaian test yang dibuat tanpa sengaja.

```ts
describe('pengurangan stok', () => {
  it('tidak pernah minus pada 100 permintaan bersamaan', async () => {
    const varian = await buatVarian({ stok: 5, hargaRp: 20_000 });

    // Seratus pembelian bersamaan, masing-masing satu unit
    const hasil = await Promise.allSettled(
      Array.from({ length: 100 }, (_, i) =>
        layananPesanan.buat(pembeli.id, `kunci-${i}`, {
          item: [{ varianId: varian.id, jumlah: 1 }],
          alamatKirim: 'Jl. Uji 1',
        })
      )
    );

    const berhasil = hasil.filter((h) => h.status === 'fulfilled').length;
    const gagal = hasil.filter((h) => h.status === 'rejected').length;

    // Invarian, bukan hasil pemanggilan
    expect(berhasil).toBe(5);
    expect(gagal).toBe(95);

    const sesudah = await repoVarian.ambil(varian.id);
    expect(sesudah.stok).toBe(0);

    // Dan jumlah pesanan harus cocok dengan stok yang berkurang
    const [hitung] = await db.execute(sql`
      SELECT count(*)::int AS jumlah FROM pesanan_item WHERE varian_id = ${varian.id}
    `);
    expect(hitung.jumlah).toBe(5);
  });

  it('kupon dengan batas 10 tidak pernah terpakai 11 kali', async () => {
    const kupon = await buatKupon({ kode: 'UJI10', batasPakai: 10, nilai: 10 });

    await Promise.allSettled(
      Array.from({ length: 50 }, (_, i) =>
        layananPesanan.buat(pembeli.id, `kupon-${i}`, {
          item: [{ varianId: varian.id, jumlah: 1 }],
          kodeKupon: 'UJI10',
          alamatKirim: 'Jl. Uji 1',
        })
      )
    );

    const sesudah = await repoKupon.ambil(kupon.id);
    expect(sesudah.terpakai).toBe(10);
  });

  it('tidak deadlock pada transfer dua arah bersamaan', async () => {
    const [a, b] = await Promise.all([buatRekening(1_000_000), buatRekening(1_000_000)]);

    const hasil = await Promise.allSettled([
      ...Array.from({ length: 25 }, () => transfer(a.id, b.id, 1_000)),
      ...Array.from({ length: 25 }, () => transfer(b.id, a.id, 1_000)),
    ]);

    const deadlock = hasil.filter(
      (h) => h.status === 'rejected' && String(h.reason).includes('40P01')
    );

    expect(deadlock).toHaveLength(0);

    // Invarian terpenting: total uang tidak berubah
    const [total] = await db.execute(sql`SELECT sum(saldo)::bigint AS t FROM rekening`);
    expect(Number(total.t)).toBe(2_000_000);
  });
});
```

Empat prinsip uji konkurensi:

**Satu, uji invarian, bukan hasil per pemanggilan.** Yang penting bukan pemanggilan mana yang berhasil, melainkan bahwa stok akhirnya nol dan tidak minus, dan total uang tidak berubah. Invarian itu yang Anda pertahankan, bukan urutan keberhasilan.

**Dua, jalankan test ini berulang kali di CI.** Bug konkurensi bersifat probabilistik: ia mungkin lolos satu kali dari sepuluh. Jalankan 20 kali dengan `--repeat`, atau naikkan jumlah permintaan bersamaan sampai konsisten memicu masalah.

**Tiga, jangan percaya test yang hijau pada satu proses tanpa jeda.** Tambahkan jeda kecil antara pembacaan dan penulisan di jalur yang diuji saat mode pengujian aktif, supaya jendela balapannya lebar dan bugnya pasti muncul.

**Empat, ini satu-satunya kelas test yang butuh basis data sungguhan secara mutlak.** Tiruan tidak punya kunci baris, tidak punya tingkat isolasi, dan tidak punya deadlock.

## Uji otorisasi dan isolasi tenant

Enam puluh kombinasi dari modul 11 diuji sebagai tabel, bukan sebagai enam puluh fungsi test yang ditulis tangan.

```ts
const KASUS = [
  { peran: 'pembeli',    metode: 'GET',   jalur: '/v1/pesanan/{milik-sendiri}', harap: 200 },
  { peran: 'pembeli',    metode: 'GET',   jalur: '/v1/pesanan/{milik-orang-lain}', harap: 404 },
  { peran: 'pembeli',    metode: 'GET',   jalur: '/v1/laporan/harian', harap: 403 },
  { peran: 'kasir',      metode: 'GET',   jalur: '/v1/pesanan/{cabang-lain}', harap: 404 },
  { peran: 'supervisor', metode: 'PATCH', jalur: '/v1/produk/{id}', harap: 200 },
  { peran: 'supervisor', metode: 'GET',   jalur: '/v1/pengguna', harap: 403 },
  { peran: 'pemilik',    metode: 'GET',   jalur: '/v1/pengguna', harap: 200 },
  { peran: 'pemilik',    metode: 'GET',   jalur: '/v1/pesanan/{tenant-lain}', harap: 404 },
  // ... 60 baris
] as const;

describe('matriks otorisasi', () => {
  it.each(KASUS)('$peran $metode $jalur -> $harap', async (kasus) => {
    const token = await tokenUntuk(kasus.peran);
    const jalur = ganti(kasus.jalur, konteksUji);

    const res = await app.inject({
      method: kasus.metode,
      url: jalur,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(kasus.harap);
  });
});

describe('isolasi tenant', () => {
  it('RLS menolak kebocoran meski kueri lupa menyaring', async () => {
    await denganTenant(TENANT_A, (tx) => buatPesanan(tx, { totalRp: 50_000 }));

    const hasil = await denganTenant(TENANT_B, (tx) =>
      tx.execute(sql`SELECT * FROM pesanan`)   // sengaja tanpa WHERE tenant_id
    );

    expect(hasil).toHaveLength(0);
  });

  it('RLS menolak penulisan untuk tenant lain', async () => {
    await expect(
      denganTenant(TENANT_B, (tx) =>
        tx.execute(sql`
          INSERT INTO pesanan (id, tenant_id, pembeli_id, subtotal_rp, diskon_rp, total_rp, alamat_kirim)
          VALUES (${idBaru()}, ${TENANT_A}, ${PEMBELI_A}, 1000, 0, 1000, 'x')
        `)
      )
    ).rejects.toThrow();
  });
});
```

Dua catatan: `app.inject` dari Fastify menjalankan permintaan tanpa membuka port, sehingga test API cepat dan tidak bentrok antar pekerja paralel. Dan test isolasi tenant kedua adalah yang paling berharga di seluruh rangkaian, karena ia menguji bahwa **kesalahan pemrograman di masa depan tidak akan berakibat.**

## Uji idempotensi dengan perbandingan keadaan

Teknik yang menjawab pertanyaan "apakah konsumen saya benar-benar idempoten" tanpa memeriksa satu per satu.

```ts
async function fotoKeadaan() {
  const [hasil] = await db.execute(sql`
    SELECT
      (SELECT count(*) FROM pesanan)       AS pesanan,
      (SELECT count(*) FROM pesanan_item)  AS item,
      (SELECT coalesce(sum(jumlah),0) FROM mutasi_poin) AS poin,
      (SELECT count(*) FROM pengiriman)    AS pengiriman,
      (SELECT coalesce(sum(debit),0) FROM jurnal) AS debit,
      (SELECT count(*) FROM email_terkirim) AS email
  `);

  return hasil;
}

it('memproses ulang seluruh peristiwa tidak mengubah keadaan apa pun', async () => {
  // Jalankan alur lengkap satu pesanan sampai selesai
  await jalankanAlurPesananLengkap();
  await tungguSemuaKonsumenSelesai();

  const sebelum = await fotoKeadaan();

  // Paksa seluruh outbox dikirim ulang, seperti Latihan 2 modul 15
  await db.execute(sql`UPDATE outbox SET terkirim_pada = NULL`);
  await jalankanPengirimOutboxSekali();
  await tungguSemuaKonsumenSelesai();

  const sesudah = await fotoKeadaan();

  // Satu pernyataan yang menguji enam konsumen sekaligus
  expect(sesudah).toEqual(sebelum);
});
```

Satu `expect` itu menguji idempotensi enam konsumen sekaligus, dan akan merah begitu ada konsumen baru yang ditambahkan tanpa penjaga idempotensi. Pola ini jauh lebih kuat daripada menulis test terpisah per konsumen, karena ia menangkap konsumen yang **belum ada saat test ini ditulis**.

## Uji migrasi

```ts
describe('migrasi', () => {
  it('jalan dari basis data kosong tanpa langkah manual', async () => {
    const baru = await new PostgreSqlContainer('postgres:17').start();

    await expect(jalankanMigrasi(baru.getConnectionUri())).resolves.not.toThrow();
    await baru.stop();
  });

  it('kompatibel dengan versi aplikasi sebelumnya', async () => {
    // Jalankan migrasi terbaru, lalu jalankan kueri dari versi kode sebelumnya.
    // Ini menguji aturan expand lalu contract dari modul 5.
    await jalankanMigrasi();

    for (const kueri of KUERI_VERSI_SEBELUMNYA) {
      await expect(db.execute(sql.raw(kueri))).resolves.toBeDefined();
    }
  });

  it('semua indeks yang dijanjikan ada', async () => {
    const indeks = await db.execute(sql`
      SELECT indexname FROM pg_indexes WHERE schemaname = current_schema()
    `);

    const nama = new Set(indeks.map((i) => i.indexname));

    // Indeks yang keberadaannya menjadi syarat performa, dari modul 9
    for (const wajib of [
      'peminjaman_anggota_waktu_idx',
      'satu_pinjaman_aktif_per_salinan',
      'pesanan_pembeli_waktu_idx',
    ]) {
      expect(nama).toContain(wajib);
    }
  });
});
```

Test kedua itu yang paling sering tidak terpikir, dan menjaga aturan terpenting dari modul 5: saat migrasi berjalan di produksi, aplikasi versi lama masih melayani permintaan. Dengan test ini, migrasi yang merusak kompatibilitas tertangkap sebelum rilis.

## Uji beban dengan k6

```js
// beban/pesanan.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const durasiPesanan = new Trend('durasi_buat_pesanan');
const gagalStok = new Rate('gagal_stok');

export const options = {
  scenarios: {
    // Tangga beban: naik bertahap sampai patah
    tangga: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 500,
      stages: [
        { target: 50, duration: '2m' },
        { target: 150, duration: '2m' },
        { target: 400, duration: '2m' },
        { target: 400, duration: '3m' },
      ],
    },
  },
  thresholds: {
    'http_req_failed{jenis:pesanan}': ['rate<0.01'],
    'durasi_buat_pesanan': ['p(95)<500', 'p(99)<1500'],
  },
};

export default function () {
  const res = http.post(
    `${__ENV.DASAR}/v1/pesanan`,
    JSON.stringify({
      item: [{ varianId: __ENV.VARIAN, jumlah: 1 }],
      alamatKirim: 'Jl. Uji 1',
    }),
    {
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${__ENV.TOKEN}`,
        'idempotency-key': `beban-${__VU}-${__ITER}`,
      },
      tags: { jenis: 'pesanan' },
    }
  );

  durasiPesanan.add(res.timings.duration);
  gagalStok.add(res.status === 409);

  check(res, {
    'bukan 5xx': (r) => r.status < 500,
    'bukan batas waktu': (r) => r.status !== 0,
  });

  sleep(0.5);
}
```

Empat jenis uji beban, dan masing-masing menjawab pertanyaan berbeda:

| Jenis | Bentuk | Menjawab |
| --- | --- | --- |
| **Smoke** | Beban kecil, 1 menit | Apakah jalurnya berfungsi sama sekali |
| **Load** | Beban yang diharapkan, 10 menit | Apakah SLO terpenuhi pada beban normal |
| **Stress** | Naik bertahap sampai patah | **Di mana batasnya, dan apa yang patah lebih dulu** |
| **Soak** | Beban sedang, 2 sampai 8 jam | Kebocoran memori, sambungan, dan deskriptor berkas |

Yang paling berharga adalah stress, dan bukan karena angkanya. Yang berharga adalah **mengetahui apa yang patah lebih dulu**, karena hampir selalu bukan yang Anda duga. Pada layanan yang dibangun di seri ini, urutan yang khas:

```text
1. Pool sambungan basis data penuh        (modul 7)
2. Latensi kueri naik karena perebutan    (modul 9)
3. Lag event loop naik                    (modul 2)
4. Health check mulai gagal               (modul 19)
5. Permintaan ditolak 503                 (modul 19, dan ini perilaku yang benar)
```

Dan soak test adalah yang paling sering dilewati, padahal ia menemukan kelas bug yang tidak bisa ditemukan uji lain: jumlah sambungan SSE yang naik monoton dari modul 16, pekerjaan queue yang menumpuk pelan, dan memori yang bertambah 50 MB per jam.

## Test yang kadang merah kadang hijau

Lima penyebab khas di backend, dan semuanya bisa dihapus:

| Penyebab | Perbaikan |
| --- | --- |
| Jam sungguhan | Suntikkan sumber waktu, atau pakai jam palsu |
| Urutan test yang berpengaruh | Setiap test menyiapkan datanya sendiri |
| Data bersama antar test paralel | Skema atau tenant terpisah per pekerja |
| `sleep` untuk menunggu pekerjaan | Tunggu keadaan dengan polling berbatas waktu |
| Urutan baris tanpa `ORDER BY` | Selalu urutkan di test maupun di kode |

```ts
// Jangan: menunggu waktu
await tidur(2_000);
expect(await hitungPoin(pembeli.id)).toBe(100);

// Lakukan: menunggu keadaan
await tungguSampai(
  async () => (await hitungPoin(pembeli.id)) === 100,
  { batasMs: 5_000, jedaMs: 50 }
);
```

Fungsi `tungguSampai` yang kecil itu menghapus sebagian besar ketidakstabilan pada test yang melibatkan pekerjaan latar. `sleep` dengan angka tetap akan terlalu pendek di CI yang lambat dan terlalu panjang di laptop yang cepat.

## Pipeline

```yaml
# .github/workflows/periksa.yml
name: Periksa
on: [push, pull_request]

jobs:
  cepat:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm tsc --noEmit
      - run: pnpm eslint .
      - run: pnpm prettier --check .
      - run: pnpm vitest run test/unit      # detik, bukan menit

  integrasi:
    runs-on: ubuntu-latest
    needs: cepat
    steps:
      # Testcontainers butuh Docker, dan runner GitHub sudah menyediakannya
      - run: pnpm vitest run test/integrasi --reporter=verbose
      - run: pnpm vitest run test/konkurensi --repeat=5

  beban:
    runs-on: ubuntu-latest
    needs: integrasi
    if: github.ref == 'refs/heads/main'
    steps:
      - run: docker compose up -d
      - run: k6 run beban/pesanan.js --vus 50 --duration 2m
```

Dua keputusan di pipeline itu: **test cepat berjalan lebih dulu dan terpisah**, sehingga kesalahan tipe dan lint memberi umpan balik dalam satu menit, bukan setelah sepuluh menit uji integrasi. Dan **uji beban hanya di `main`**, karena ia butuh beberapa menit dan tidak perlu dijalankan di setiap commit.

Dua aturan yang membuat pipeline tetap berguna: **di bawah sepuluh menit untuk pull request**, dan **kegagalannya selalu berarti.** Pipeline yang lambat akan dilewati dengan `--no-verify`, dan pipeline yang sering merah tanpa sebab akan diabaikan.

## Latihan

### Latihan 1: Uji konkurensi untuk enam jalur

Tulis uji konkurensi untuk enam jalur di layanan Anda, masing-masing menguji invarian, bukan hasil pemanggilan.

| # | Jalur | Invarian |
| --- | --- | --- |
| 1 | Pengurangan stok | Stok tidak pernah negatif, jumlah item cocok |
| 2 | Pemakaian kupon | `terpakai` tidak melebihi `batas_pakai` |
| 3 | Batas 3 pinjaman per anggota | Tidak ada anggota dengan 4 pinjaman berjalan |
| 4 | Transfer saldo | Total saldo tetap, tidak ada deadlock |
| 5 | Kunci idempotensi | Satu kunci menghasilkan tepat satu pesanan |
| 6 | Pemesanan ruangan | Tidak ada dua pemesanan aktif yang tumpang tindih |

> [!petunjuk]
> Untuk nomor 3 dan 6, bugnya hanya muncul kalau jendela balapannya cukup lebar. Tambahkan jeda yang bisa dinyalakan lewat variabel lingkungan di antara pembacaan dan penulisan, lalu nyalakan hanya saat pengujian.

> [!jawaban]
>
> Teknik untuk melebarkan jendela balapan:
>
> ```ts
> // Di jalur yang diuji
> export async function pinjam(anggotaId: string, bukuId: string) {
>   return dalamTransaksi(db, async (tx) => {
>     const keadaan = await bacaKeadaanAnggota(tx, anggotaId);
>
>     // Hanya aktif saat pengujian: melebarkan jendela supaya bug pasti muncul
>     if (process.env.UJI_JEDA_KONKURENSI) {
>       await tidur(Number(process.env.UJI_JEDA_KONKURENSI));
>     }
>
>     const kelayakan = bolehMeminjam(keadaan);
>     // ...
>   });
> }
> ```
>
> ```ts
> it('tidak pernah melebihi 3 pinjaman meski 10 permintaan bersamaan', async () => {
>   process.env.UJI_JEDA_KONKURENSI = '50';
>
>   const anggota = await buatAnggota();
>   const buku = await buatSepuluhBuku();
>
>   await Promise.allSettled(buku.map((b) => layananPeminjaman.pinjam(anggota.id, b.id)));
>
>   const [hitung] = await db.execute(sql`
>     SELECT count(*)::int AS jumlah FROM peminjaman
>     WHERE anggota_id = ${anggota.id} AND status = 'berjalan'
>   `);
>
>   expect(hitung.jumlah).toBeLessThanOrEqual(3);
>
>   delete process.env.UJI_JEDA_KONKURENSI;
> });
> ```
>
> Empat hal yang akan Anda temukan:
>
> 1. **Nomor 3 akan merah pada implementasi tanpa kunci baris anggota.** Itu persis Latihan 4 modul 8, dan sekarang jadi test yang menjaganya selamanya.
> 2. **Nomor 6 akan hijau tanpa usaha apa pun**, karena `EXCLUDE` dari modul 5 sudah menjaminnya di basis data. Itu bukti bahwa batasan basis data lebih kuat daripada kode: Anda tidak perlu menulis logika apa pun, dan tidak ada urutan permintaan yang bisa melanggarnya.
> 3. **Nomor 5 menguji dua hal sekaligus**: tepat satu pesanan, dan respons yang identik untuk semua pemanggil. Yang kedua sering terlewat.
> 4. **Jalankan dengan `--repeat=10`.** Test konkurensi yang hijau satu kali belum membuktikan apa pun, karena balapan bersifat probabilistik.

### Latihan 2: Matriks otorisasi lengkap

Tulis seluruh matriks peran kali endpoint sebagai test tabel, dan pastikan tidak ada kombinasi yang terlewat.

> [!jawaban]
>
> Teknik yang memastikan tidak ada yang terlewat: **hasilkan daftar kombinasi dari daftar rute dan daftar peran, lalu wajibkan setiap kombinasi punya harapan yang tertulis.**
>
> ```ts
> const PERAN = ['pembeli', 'kasir', 'supervisor', 'pemilik'] as const;
>
> // Diambil dari aplikasi, bukan ditulis tangan: rute baru otomatis masuk
> const RUTE = app
>   .printRoutes({ includeMeta: true })
>   .filter((r) => r.url.startsWith('/v1/'));
>
> const HARAPAN: Record<string, Record<typeof PERAN[number], number>> = {
>   'GET /v1/pesanan': { pembeli: 200, kasir: 200, supervisor: 200, pemilik: 200 },
>   'GET /v1/laporan/harian': { pembeli: 403, kasir: 403, supervisor: 200, pemilik: 200 },
>   // ... satu baris per rute
> };
>
> describe('kelengkapan matriks', () => {
>   // Test yang menjaga agar matriksnya tidak pernah ketinggalan
>   it('setiap rute punya harapan untuk setiap peran', () => {
>     const hilang: string[] = [];
>
>     for (const rute of RUTE) {
>       const kunci = `${rute.method} ${rute.url}`;
>       if (!HARAPAN[kunci]) hilang.push(kunci);
>     }
>
>     expect(hilang, `rute tanpa harapan otorisasi: ${hilang.join(', ')}`).toEqual([]);
>   });
> });
> ```
>
> Test "kelengkapan matriks" itu yang paling berharga di seluruh latihan ini: **ia merah saat seseorang menambahkan endpoint baru tanpa memutuskan siapa yang boleh mengaksesnya.** Dengan itu, pertanyaan otorisasi jadi bagian wajib dari setiap fitur baru, bukan sesuatu yang bisa terlupakan.
>
> Tiga catatan tambahan:
>
> 1. **Kasus 404 versus 403 harus eksplisit di tabel**, karena itu keputusan desain dari modul 11 yang mudah dibatalkan tanpa sengaja.
> 2. **Tambahkan kasus tanpa token dan dengan token kedaluwarsa** untuk setiap rute, atau minimal untuk satu rute per kelompok.
> 3. **Jalankan juga dengan kunci API**, karena cakupannya berbeda dari peran manusia, dan itu jalur yang sering tidak diuji.

### Latihan 3: Buktikan idempotensi seluruh sistem

Pakai teknik perbandingan keadaan untuk membuktikan bahwa seluruh konsumen dan pekerjaan di layanan Anda idempoten.

> [!pembahasan]
>
> ```ts
> // Foto keadaan yang mencakup semua tabel yang bisa berubah
> async function fotoLengkap() {
>   const tabel = [
>     'pesanan', 'pesanan_item', 'pengiriman', 'mutasi_poin',
>     'jurnal', 'email_terkirim', 'varian',
>   ];
>
>   const hasil: Record<string, unknown> = {};
>
>   for (const t of tabel) {
>     // Hash seluruh isi tabel, urut, supaya perbandingannya tepat
>     const [baris] = await db.execute(
>       sql.raw(`
>         SELECT md5(string_agg(x::text, '' ORDER BY x::text)) AS sidik,
>                count(*)::int AS jumlah
>         FROM (SELECT * FROM ${t}) x
>       `)
>     );
>
>     hasil[t] = { sidik: baris.sidik, jumlah: baris.jumlah };
>   }
>
>   return hasil;
> }
>
> it('seluruh sistem idempoten terhadap pengiriman ulang peristiwa', async () => {
>   await jalankanTigaPuluhPesananLengkap();
>   await tungguSemuaKonsumenSelesai();
>
>   const sebelum = await fotoLengkap();
>
>   // Kirim ulang semuanya tiga kali
>   for (let i = 0; i < 3; i++) {
>     await db.execute(sql`UPDATE outbox SET terkirim_pada = NULL`);
>     await jalankanPengirimOutboxSekali();
>     await tungguSemuaKonsumenSelesai();
>   }
>
>   expect(await fotoLengkap()).toEqual(sebelum);
> });
> ```
>
> Lima hal yang membuat pendekatan ini kuat:
>
> 1. **Satu test untuk seluruh sistem.** Konsumen baru yang ditambahkan enam bulan kemudian tanpa penjaga idempotensi akan membuat test ini merah, tanpa ada yang perlu menulis test baru.
> 2. **Hash seluruh isi tabel, bukan hanya jumlah baris.** Jumlah baris yang sama bisa menyembunyikan nilai yang berubah, misalnya poin yang ditambahkan lalu dikurangi.
> 3. **Diulang tiga kali**, karena sebagian bug hanya muncul pada pengulangan kedua, misalnya penjaga yang dihapus setelah pemrosesan pertama.
> 4. **Kolom waktu perlu diperlakukan khusus.** Kolom seperti `diperbarui_pada` akan berubah pada pemrosesan ulang yang sah. Dua pilihan: kecualikan kolom itu dari hash, atau pastikan pembaruan yang idempoten tidak menyentuh kolom waktunya.
> 5. **Test ini juga menemukan sesuatu yang tidak diduga**: biasanya satu konsumen yang menulis baris audit setiap kali diproses. Itu memunculkan pertanyaan yang sah: apakah audit untuk pemrosesan ulang harus dicatat? Jawabannya bisa ya, dan kalau begitu kolom audit dikecualikan dari foto keadaan dengan alasan yang tertulis.

### Latihan 4: Cari titik patahnya

Jalankan uji beban bertangga pada Proyek 4 sampai patah, catat urutan patahnya, lalu perbaiki satu titik sempit dan ukur lagi.

> [!jawaban]
>
> Hasil khas pada layanan yang belum disetel, dengan basis data 2 vCPU:
>
> | Beban | Latensi p95 | Error | Yang terjadi |
> | --- | --- | --- | --- |
> | 50 per detik | 45 ms | 0% | Sehat |
> | 150 per detik | 180 ms | 0% | Pool mulai terpakai 70% |
> | 250 per detik | 1.400 ms | 2% | Pool penuh, permintaan menunggu sambungan |
> | 400 per detik | 8.000 ms | 34% | Batas waktu, health check gagal, 503 mulai muncul |
>
> **Diagnosis dengan metrik dari modul 18:**
>
> | Metrik | Nilai saat patah | Artinya |
> | --- | --- | --- |
> | `db_pool_sambungan{keadaan="menunggu"}` | 180 | Titik sempitnya pool, bukan CPU aplikasi |
> | Lag event loop p99 | 40 ms | Aplikasi tidak kekurangan CPU |
> | CPU basis data | 98% | Basis data yang jenuh |
> | Kueri termahal | `INSERT pesanan_item` dengan 30 baris | Satu kueri yang bisa diperbaiki |
>
> **Perbaikan dan hasilnya:**
>
> | Perbaikan | Titik patah baru |
> | --- | --- |
> | Sisipkan item massal dalam satu pernyataan, bukan per item | 250 jadi 380 per detik |
> | Pindahkan rekap keluar dari transaksi ke konsumen peristiwa | 380 jadi 520 per detik |
> | Tambahkan indeks yang kurang untuk kueri stok | 520 jadi 610 per detik |
> | Naikkan pool dari 8 jadi 16 | **Turun** jadi 540 per detik |
>
> Baris terakhir adalah temuan yang paling berharga dari seluruh latihan, dan membuktikan pelajaran modul 7: **menambah sambungan menurunkan kapasitas** saat basis datanya sudah jenuh. Enam belas sambungan memperebutkan dua inti prosesor menghasilkan perebutan yang membuat semua kueri melambat.
>
> Tiga pelajaran dari latihan ini:
>
> 1. **Titik sempit hampir selalu basis data, bukan Node.** Pada layanan yang ditulis dengan pola di seri ini, aplikasi jarang jadi batasnya.
> 2. **Perbaikan harus diukur, bukan diasumsikan.** Dua dari empat perbaikan di atas memberi hasil besar, satu memberi hasil kecil, dan satu memperburuk.
> 3. **Perilaku saat patah lebih penting daripada titik patahnya.** Pada 400 per detik, yang benar bukan "semua permintaan 8 detik dan 34% gagal", melainkan "sebagian ditolak 503 dengan cepat, sisanya tetap di bawah 200 ms". Kalau layanan Anda tidak berperilaku begitu, penolakan beban dari modul 19 belum terpasang benar.

## Batasnya

Rangkaian test yang baik memberi keyakinan untuk mengubah kode, dan tidak menjanjikan tiga hal.

**Test tidak menangkap yang tidak Anda pikirkan.** Semua test adalah hipotesis penulisnya. Jenis bug yang paling merepotkan justru yang tidak terbayang, dan di situlah observability dari modul 18 mengambil alih.

**Lingkungan uji bukan produksi.** Data produksi lebih besar, lebih aneh, dan lalu lintasnya lebih tidak merata. Uji beban memberi perkiraan, bukan kepastian.

**Test punya biaya pemeliharaan.** Setiap test adalah kode yang ikut berubah saat produk berubah. Memilih lebih penting daripada menambah.

## Rangkuman

- Backend lebih pantas diuji daripada frontend, karena yang diuji adalah masukan, keluaran, dan keadaan data, bukan tampilan yang berubah.
- Uji terhadap Postgres sungguhan dengan Testcontainers. Batasan, transaksi, isolasi, dan indeks adalah bagian dari logika aplikasi Anda.
- Migrasi dijalankan dari nol di setiap jalannya test, sehingga migrasi yang rusak terlihat tanpa test khusus.
- Uji aturan bisnis di batas nilainya, dan abadikan keputusan produk seperti urutan alasan penolakan.
- Uji konkurensi menguji invarian, bukan hasil per pemanggilan, dan dijalankan berulang kali karena bersifat probabilistik.
- Matriks otorisasi ditulis sebagai tabel, plus satu test yang memastikan setiap rute baru punya harapan yang tertulis.
- Idempotensi seluruh sistem dibuktikan dengan membandingkan hash keadaan sebelum dan sesudah pengiriman ulang peristiwa.
- Uji migrasi untuk kompatibilitas dengan versi aplikasi sebelumnya, karena itu aturan rilis dari modul 5.
- Uji beban bertangga menjawab pertanyaan yang paling berguna: apa yang patah lebih dulu. Dan jawabannya hampir selalu pool basis data.
- Perilaku saat kewalahan lebih penting daripada titik patahnya.
- Tunggu keadaan, bukan waktu. `sleep` dengan angka tetap adalah penyebab utama test yang tidak stabil.
- Pipeline di bawah sepuluh menit, test cepat berjalan lebih dulu, dan kegagalannya selalu berarti.

## Masalah terbuka

Layanan Anda sekarang teruji, terpantau, dan tahan terhadap ketergantungan yang rusak. Saatnya mengerjakan audit yang sungguhan pada apa yang sudah Anda bangun.

Bagian berikutnya adalah Proyek 5: ambil layanan dari proyek sebelumnya, ukur keadaannya sekarang dengan angka, uji beban sampai patah, perbaiki titik sempitnya, pasang pemantauan dan jalan mundur, lalu tulis dokumen yang menjelaskan berapa kapasitas layanan Anda, apa yang akan patah lebih dulu, dan apa yang terjadi saat setiap ketergantungan gagal.

Dokumen itu yang akan ditanyakan saat perusahaan Anda tumbuh, dan hampir tidak ada tim yang punya jawabannya.
