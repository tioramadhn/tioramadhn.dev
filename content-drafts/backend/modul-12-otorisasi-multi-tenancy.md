---
title: 'Modul 12: Otorisasi dan Multi-tenancy'
description: Satu pemeriksaan yang terlewat membuat data satu pelanggan terlihat pelanggan lain. Model peran dan izin, fungsi otorisasi terpusat, dan isolasi tenant yang dijamin basis data.
date: 2026-12-16
slug: modul-12-otorisasi-multi-tenancy
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Modul sebelumnya menjawab "siapa Anda". Modul ini menjawab "Anda boleh apa", dan di situ ada perbedaan penting: autentikasi dikerjakan satu kali di satu tempat, sedangkan **otorisasi harus benar di setiap jalur, setiap kali.**

Satu jalur yang terlewat sudah cukup:

| Jalur | Pemeriksaan yang terlewat | Akibat |
| --- | --- | --- |
| `GET /v1/pesanan/{id}` | Apakah pesanan ini milik pemanggil | Riwayat pembelian orang lain terbaca |
| `GET /v1/pesanan?pembeliId=...` | Parameter diambil dari permintaan, bukan sesi | Semua riwayat semua orang |
| Laporan penjualan | Penyaringan tenant | Angka penjualan pesaing terlihat |
| Pencarian global | Penyaringan tenant | Nama pelanggan tenant lain muncul di hasil |
| Pesan error | Membedakan "tidak ada" dari "bukan milik Anda" | Id milik orang lain bisa dipetakan |
| Endpoint ekspor | Peran | Kasir mengunduh seluruh basis data pelanggan |

Baris keempat dan kelima yang paling sering terlewat, karena keduanya tidak terlihat seperti jalur akses data. Dan baris mana pun yang bocor pada aplikasi multi-tenant punya akibat yang sama: kontrak berakhir.

## Analogi: kunci induk dan kunci per lantai

Bayangkan gedung kantor yang disewa lima perusahaan.

**Satu kunci induk untuk semua.** Resepsionis memberi setiap karyawan kunci yang bisa membuka semua pintu, lalu menempel pengumuman "mohon hanya masuk ke lantai sendiri". Berjalan baik sampai ada satu orang yang penasaran, atau satu orang yang salah lantai.

**Kunci yang hanya cocok untuk lantainya.** Kartu karyawan perusahaan A secara fisik tidak bisa membuka pintu lantai B. Tidak ada imbauan, tidak ada kedisiplinan yang perlu dijaga, dan kesalahan manusia tidak berakibat apa-apa.

Perbedaan keduanya adalah perbedaan antara otorisasi yang ditulis di setiap handler dan otorisasi yang ditegakkan satu lapisan yang tidak bisa dilewati.

| Dunia gedung | Dunia backend |
| --- | --- |
| Kartu karyawan | Sesi dengan identitas dan tenant |
| Lantai perusahaan | Tenant |
| Pintu ruangan tertentu | Sumber daya |
| Daftar pintu yang boleh dibuka tiap jabatan | Matriks peran dan izin |
| Pembaca kartu di setiap pintu | Fungsi otorisasi terpusat |
| Pintu yang secara fisik menolak kartu lantai lain | Row Level Security |
| Buku tamu untuk akses khusus | Jejak audit untuk impersonasi |
| "Ruangan ini tidak ada" untuk tamu yang tidak berhak | 404 alih-alih 403 |

Batas analoginya: gedung punya pintu yang bisa dipasangi pembaca kartu, sedangkan laporan, pencarian, dan ekspor tidak punya pintu yang jelas. Di situlah kebocoran multi-tenant biasanya terjadi, dan karena itu isolasinya perlu ditegakkan di lapisan data, bukan di lapisan rute.

## Tiga model, dan kapan masing-masing

| Model | Pertanyaannya | Cocok untuk |
| --- | --- | --- |
| **Kepemilikan** | Apakah sumber daya ini milik pemanggil? | Aplikasi konsumen: pesanan, catatan, profil |
| **RBAC**, berbasis peran | Apakah peran pemanggil punya izin ini? | Aplikasi internal dan B2B dengan jabatan yang jelas |
| **ABAC**, berbasis atribut | Apakah aturan ini terpenuhi untuk pemanggil, sumber daya, dan konteksnya? | Aturan yang bergantung data: cabang, nilai transaksi, jam kerja |

Hampir semua aplikasi nyata memakai gabungan ketiganya, dan bentuknya biasanya begini: **RBAC menentukan kemampuan, kepemilikan atau atribut menentukan cakupannya.**

```text
Peran "supervisor" punya izin "pesanan:ubah"       <- RBAC
...tetapi hanya untuk pesanan di cabangnya         <- ABAC
Peran "pembeli" punya izin "pesanan:baca"
...tetapi hanya pesanan miliknya sendiri           <- kepemilikan
```

Memisahkan dua pertanyaan itu adalah keputusan desain yang paling menentukan. Mencampurnya menghasilkan kode seperti `if (user.role === 'supervisor' && order.branchId === user.branchId) || user.id === order.buyerId` yang berserakan di tiga puluh handler.

## Satu fungsi otorisasi untuk seluruh layanan

```sql
CREATE TABLE peran (
  id   text PRIMARY KEY,        -- 'pembeli', 'kasir', 'supervisor', 'pemilik'
  nama text NOT NULL
);

CREATE TABLE izin (
  id        text PRIMARY KEY,   -- 'pesanan:baca', 'pesanan:ubah', 'laporan:baca'
  deskripsi text NOT NULL
);

CREATE TABLE peran_izin (
  peran_id text NOT NULL REFERENCES peran(id) ON DELETE CASCADE,
  izin_id  text NOT NULL REFERENCES izin(id) ON DELETE CASCADE,
  PRIMARY KEY (peran_id, izin_id)
);

-- Peran diberikan per tenant, karena satu orang bisa jadi pemilik di satu
-- toko dan kasir di toko lain
CREATE TABLE keanggotaan (
  pengguna_id uuid NOT NULL REFERENCES pengguna(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  peran_id    text NOT NULL REFERENCES peran(id) ON DELETE RESTRICT,
  cabang_id   uuid REFERENCES cabang(id) ON DELETE RESTRICT,  -- cakupan, opsional
  dibuat_pada timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (pengguna_id, tenant_id)
);
```

```ts
// src/otorisasi/kebijakan.ts
import 'server-only-ish'; // tandai berkas ini hanya untuk sisi server

export type Izin =
  | 'pesanan:baca'
  | 'pesanan:buat'
  | 'pesanan:ubah'
  | 'pesanan:batalkan'
  | 'produk:kelola'
  | 'laporan:baca'
  | 'pengguna:kelola';

export interface Pelaku {
  penggunaId: string;
  tenantId: string;
  peran: string;
  cabangId: string | null;
  izin: ReadonlySet<Izin>;
}

type HasilIzin = { boleh: true } | { boleh: false; alasan: string; kode: string };

export function bolehkan(
  pelaku: Pelaku,
  izin: Izin,
  sumberDaya?: { tenantId: string; pemilikId?: string; cabangId?: string | null }
): HasilIzin {
  // 1. Tolak secara bawaan
  if (!pelaku.izin.has(izin)) {
    return { boleh: false, alasan: 'Tidak punya izin', kode: 'TIDAK_BERHAK' };
  }

  if (!sumberDaya) return { boleh: true };

  // 2. Tenant adalah batas mutlak, sebelum aturan lain diperiksa
  if (sumberDaya.tenantId !== pelaku.tenantId) {
    return { boleh: false, alasan: 'Tidak ditemukan', kode: 'TIDAK_DITEMUKAN' };
  }

  // 3. Cakupan: kepemilikan, lalu cabang
  const miliknyaSendiri = sumberDaya.pemilikId === pelaku.penggunaId;
  const cabangCocok =
    pelaku.cabangId === null || sumberDaya.cabangId === pelaku.cabangId;

  if (pelaku.peran === 'pembeli' && !miliknyaSendiri) {
    return { boleh: false, alasan: 'Tidak ditemukan', kode: 'TIDAK_DITEMUKAN' };
  }

  if (!cabangCocok) {
    return { boleh: false, alasan: 'Di luar cabang Anda', kode: 'DI_LUAR_CAKUPAN' };
  }

  return { boleh: true };
}

export function pastikanBoleh(
  pelaku: Pelaku,
  izin: Izin,
  sumberDaya?: Parameters<typeof bolehkan>[2]
): void {
  const hasil = bolehkan(pelaku, izin, sumberDaya);

  if (!hasil.boleh) {
    // Kode 'TIDAK_DITEMUKAN' sengaja dipetakan ke 404, bukan 403
    if (hasil.kode === 'TIDAK_DITEMUKAN') throw new ErrorTidakDitemukan();
    throw new ErrorTidakBerhak(hasil.alasan);
  }
}
```

Lima keputusan di dalamnya, dan masing-masing mencegah satu kelas bug:

**Satu, tolak secara bawaan.** Izin yang tidak ada di daftar berarti tidak boleh. Kebalikannya, yaitu memeriksa daftar larangan, membuat setiap fitur baru terbuka sampai ada yang ingat menutupnya.

**Dua, tenant diperiksa sebelum apa pun.** Pelanggaran tenant bukan "tidak berhak", melainkan "tidak ada", dan membedakan keduanya adalah kebocoran informasi.

**Tiga, satu fungsi untuk seluruh layanan.** Handler, worker queue, perintah terminal, dan panel admin semuanya memanggil fungsi yang sama. Satu jalur yang memeriksa dengan caranya sendiri adalah jalur yang akan salah.

**Empat, izin berupa daftar yang bisa dibaca mesin.** `'pesanan:ubah'` sebagai string literal berarti salah tulis ditangkap TypeScript, dan menambah peran baru tidak menyentuh satu pun handler.

**Lima, hasilnya menyebut alasan.** Dari situ pesan error yang bisa ditindaklanjuti bisa dibuat, dan jejak audit punya isi yang berguna.

Pemakaiannya di handler jadi dua baris:

```ts
// src/fitur/pesanan/rute.ts, otorisasi lewat satu fungsi terpusat
app.get('/v1/pesanan/:id', { onRequest: [app.autentikasi] }, async (req) => {
  const pesanan = await repoPesanan.ambil(req.params.id);

  // Pesanan yang tidak ada dan pesanan orang lain menghasilkan jawaban sama
  if (!pesanan) throw new ErrorTidakDitemukan();

  pastikanBoleh(req.pelaku, 'pesanan:baca', {
    tenantId: pesanan.tenantId,
    pemilikId: pesanan.pembeliId,
    cabangId: pesanan.cabangId,
  });

  return pesanan;
});
```

## Dua kesalahan yang paling sering: parameter dan daftar

Dua jalur yang hampir selalu terlewat, dan keduanya lebih berbahaya daripada endpoint detail.

**Kesalahan pertama: identitas diambil dari permintaan.**

```ts
// Jangan disalin: dua kesalahan otorisasi yang paling sering
// Berbahaya: pemanggil menentukan sendiri data siapa yang dibaca
app.get('/v1/pesanan', async (req) => {
  return repoPesanan.daftar({ pembeliId: req.query.pembeliId });
});

// Benar: identitas selalu dari sesi
app.get('/v1/pesanan', async (req) => {
  const cakupan =
    req.pelaku.peran === 'pembeli'
      ? { pembeliId: req.pelaku.penggunaId }
      : { cabangId: req.pelaku.cabangId };

  return repoPesanan.daftar({ tenantId: req.pelaku.tenantId, ...cakupan });
});
```

**Kesalahan kedua: endpoint daftar tidak diperiksa seperti endpoint detail.** Fungsi `bolehkan` di atas bekerja untuk satu sumber daya, dan pada endpoint daftar tidak ada satu sumber daya untuk diperiksa. Jawabannya bukan memeriksa setiap baris setelah diambil, melainkan **memasukkan cakupan ke dalam kueri sebagai syarat**:

```ts
// src/fitur/pesanan/repo.ts
// Repository tidak menerima filter bebas, melainkan pelaku,
// dan menurunkan sendiri penyaringan yang wajib.
async function daftarPesanan(pelaku: Pelaku, filter: FilterPesanan) {
  return db
    .select()
    .from(pesanan)
    .where(
      and(
        eq(pesanan.tenantId, pelaku.tenantId),               // selalu
        pelaku.peran === 'pembeli'
          ? eq(pesanan.pembeliId, pelaku.penggunaId)         // cakupan kepemilikan
          : pelaku.cabangId
            ? eq(pesanan.cabangId, pelaku.cabangId)          // cakupan cabang
            : undefined,
        filter.status ? eq(pesanan.status, filter.status) : undefined
      )
    );
}
```

Pola ini layak jadi aturan tim: **fungsi repository untuk data milik tenant wajib menerima `pelaku` sebagai parameter pertama.** Dengan begitu, lupa menyaring jadi kesalahan tipe, bukan kebocoran yang baru ketahuan dari laporan pelanggan.

## Multi-tenancy: tiga pilihan

| Pendekatan | Cara | Kelebihan | Kekurangan |
| --- | --- | --- | --- |
| **Satu skema, kolom `tenant_id`** | Semua tenant dalam tabel yang sama | Paling sederhana, paling murah, migrasi sekali | Satu kueri yang lupa menyaring membocorkan semuanya |
| **Skema per tenant** | Satu skema Postgres per tenant | Isolasi lebih kuat, mudah mencadangkan per tenant | Migrasi dikali jumlah tenant, ribuan skema jadi masalah |
| **Basis data per tenant** | Satu basis data per tenant | Isolasi terkuat, bisa beda wilayah | Operasional berat, pool sambungan jadi rumit |

Untuk hampir semua produk SaaS: **satu skema dengan `tenant_id`.** Dua pendekatan lain masuk akal pada dua keadaan khusus: pelanggan besar yang mensyaratkan isolasi fisik dalam kontrak, dan kewajiban menyimpan data di wilayah tertentu.

Kelemahan pendekatan pertama nyata, dan Postgres punya jawabannya:

```sql
-- Nyalakan Row Level Security pada setiap tabel milik tenant
ALTER TABLE pesanan ENABLE ROW LEVEL SECURITY;
ALTER TABLE pesanan FORCE ROW LEVEL SECURITY;

-- Kebijakan: baris hanya terlihat kalau tenant_id cocok dengan
-- variabel sesi yang disetel aplikasi
CREATE POLICY isolasi_tenant ON pesanan
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

```ts
// src/db/konteks-tenant.ts
// Setel variabel sesi di awal setiap transaksi
export async function denganTenant<T>(
  tenantId: string,
  kerjakan: (tx: Database) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    // set_config dengan parameter, bukan penyambungan string
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
    return kerjakan(tx);
  });
}
```

Dengan ini, **kueri yang lupa menyaring tenant tidak membocorkan apa pun**: Postgres sendiri yang menyaringnya. Itu perbedaan antara imbauan dan pintu yang menolak kartu lantai lain.

Empat hal yang wajib diperhatikan saat memakai RLS:

1. **`FORCE ROW LEVEL SECURITY`** diperlukan supaya pemilik tabel ikut terkena kebijakan. Tanpa itu, pengguna basis data pemilik skema bisa melihat semuanya.
2. **Aplikasi harus memakai peran basis data yang bukan pemilik tabel**, dan bukan superuser.
3. **Parameter ketiga `true` pada `set_config`** membuat nilainya berlaku hanya dalam transaksi itu, sehingga tidak bocor ke permintaan berikutnya yang memakai sambungan sama dari pool.
4. **Dengan PgBouncer mode transaksi, pengaturan per transaksi aman**, tapi variabel per sesi tidak. Inilah alasan parameter ketiga itu penting.

RLS bukan pengganti pemeriksaan di aplikasi, melainkan lapisan kedua. Aplikasi tetap menyaring supaya kuerinya bisa memakai indeks dengan baik, dan RLS memastikan kesalahan tidak berakibat.

## Peran yang tumbuh, dan impersonasi

Dua kebutuhan yang selalu muncul begitu produk dipakai perusahaan.

**Peran kustom per tenant.** Pelanggan besar akan meminta "peran yang bisa melihat laporan tapi tidak bisa mengubah harga". Dengan tabel `peran_izin`, itu jadi data, bukan kode:

```sql
-- Peran bawaan sistem berlaku untuk semua tenant, peran kustom milik satu tenant
ALTER TABLE peran ADD COLUMN tenant_id uuid REFERENCES tenant(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX ON peran (tenant_id, id);
```

**Impersonasi untuk dukungan pelanggan.** Staf dukungan perlu melihat apa yang dilihat pengguna untuk membantunya. Ini fitur berbahaya yang pantas dibuat dengan hati-hati:

```ts
// src/fitur/admin/impersonasi.ts
export async function mulaiImpersonasi(staf: Pelaku, targetId: string, alasan: string) {
  pastikanBoleh(staf, 'pengguna:impersonasi');

  if (!alasan || alasan.length < 10) {
    throw new ErrorAturanBisnis('Alasan impersonasi wajib ditulis', 'ALASAN_WAJIB');
  }

  const sesi = await repoSesi.simpan({
    penggunaId: targetId,
    diimpersonasiOleh: staf.penggunaId,   // kolom ini wajib ada
    kedaluwarsaPada: new Date(Date.now() + 30 * 60_000),   // 30 menit, tidak lebih
  });

  await repoAudit.catat({
    jenis: 'impersonasi-dimulai',
    oleh: staf.penggunaId,
    target: targetId,
    alasan,
  });

  return sesi;
}
```

Empat aturan untuk impersonasi: selalu tercatat di audit dengan alasan tertulis, berumur sangat pendek, **tidak boleh melakukan aksi yang tidak bisa dibatalkan** (hapus akun, ubah sandi, transfer dana), dan pengguna yang diimpersonasi sebaiknya diberi tahu. Tanpa keempatnya, Anda memasang pintu belakang di produk Anda sendiri.

## Izin di tingkat kolom

Kadang pertanyaannya bukan "boleh melihat baris ini" tapi "boleh melihat kolom ini". Kasir boleh melihat pesanan, dan tidak boleh melihat nomor kartu atau margin keuntungan.

Dua cara, dan yang pertama lebih baik:

```ts
// src/fitur/pengguna/skema.ts
// A. Skema respons per peran. Field yang tidak didaftarkan tidak akan terkirim.
const pesananUntukPembeli = z.object({
  id: z.string(), total: z.number(), status: z.string(),
});

const pesananUntukPemilik = pesananUntukPembeli.extend({
  marginRp: z.number(), biayaModalRp: z.number(),
});

app.get('/v1/pesanan/:id', {
  schema: { response: { 200: z.union([pesananUntukPembeli, pesananUntukPemilik]) } },
}, async (req) => {
  const pesanan = await ambilPesanan(req.pelaku, req.params.id);

  return req.pelaku.izin.has('laporan:baca')
    ? pesananUntukPemilik.parse(pesanan)
    : pesananUntukPembeli.parse(pesanan);
});
```

Pendekatan ini memakai pelajaran modul 3: skema respons menyaring, sehingga kolom sensitif tidak bisa bocor meski repository mengembalikan seluruh baris. Pendekatan kedua, yaitu memilih kolom di kueri sesuai peran, juga benar dan lebih hemat, dengan harga kode kueri yang bercabang.

## Kunci API dan layanan ke layanan

Tidak semua pemanggil adalah manusia. Untuk integrasi mitra dan layanan internal:

```sql
CREATE TABLE kunci_api (
  id          uuid PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  nama        text NOT NULL,
  prefiks     text NOT NULL,          -- 8 karakter awal, untuk ditampilkan
  kunci_hash  bytea NOT NULL UNIQUE,  -- sisanya di-hash
  cakupan     text[] NOT NULL,        -- izin yang diberikan
  kedaluwarsa_pada timestamptz,
  dicabut_pada     timestamptz,
  dipakai_pada     timestamptz
);
```

Empat aturan: kunci ditampilkan sekali saat dibuat lalu hanya hash-nya yang disimpan, prefiks disimpan terpisah supaya pengguna bisa mengenali kuncinya di daftar, cakupan selalu lebih sempit daripada peran manusia, dan ada masa berlaku beserta cara mencabut.

Untuk layanan internal, pertimbangkan mTLS atau token berumur sangat pendek yang diterbitkan penyedia identitas, bukan kunci statis yang hidup selamanya di variabel lingkungan. Modul 23 kembali ke topik ini.

## Buktikan jalan

Kebocoran antar tenant tidak pernah muncul sebagai error. Satu-satunya cara mengetahuinya adalah mencoba membocorkannya sendiri.

Siapkan dua tenant dengan masing-masing satu pesanan, lalu:

```bash
# 1. Pemilik membaca pesanannya sendiri
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/v1/pesanan/<pesanan-A> \
  -H 'authorization: Bearer <token-tenant-A>'

# 2. Tenant lain membaca pesanan yang sama
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/v1/pesanan/<pesanan-A> \
  -H 'authorization: Bearer <token-tenant-B>'

# 3. Tanpa token sama sekali
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/v1/pesanan/<pesanan-A>
```

```text
200
404
401
```

**Nomor 2 harus 404, bukan 403.** Membalas 403 memberi tahu tenant B bahwa pesanan itu ada, dan dari sana seluruh rentang id bisa dipetakan. Kalau yang muncul 403, perbaikannya ada di bagian "Dua kesalahan yang paling sering".

Lalu buktikan penjaga lapis keduanya, dan ini yang paling meyakinkan. Isolasi yang hanya dijaga kode aplikasi akan bocor pada hari seseorang menulis kueri yang lupa menyaring. RLS membuat kueri seperti itu tetap aman:

```bash
docker compose exec -it db psql -U postgres -d toko
```

```sql
-- Masuk sebagai peran aplikasi, bukan superuser
SET ROLE aplikasi;

-- Setel konteks ke tenant A
SELECT set_config('app.tenant_id', '<id-tenant-A>', false);

-- Kueri yang SENGAJA lupa menyaring tenant_id
SELECT count(*) FROM pesanan;
```

```text
 count
-------
     1
```

Satu, bukan dua. **Kueri yang lupa menyaring tetap tidak bisa melihat data tenant lain**, karena basis data yang menegakkannya. Ganti `app.tenant_id` ke tenant B lalu ulangi, dan angkanya tetap satu dengan isi yang berbeda.

Satu peringatan yang pantas dicoba sekarang juga: ulangi percobaan di atas **tanpa** `SET ROLE aplikasi`. Sebagai superuser, RLS dilewati sepenuhnya dan Anda akan melihat kedua baris. Itu sebabnya aplikasi Anda tidak boleh menyambung sebagai superuser, dan itu kesalahan konfigurasi yang membuat seluruh RLS jadi hiasan.

## Latihan

### Latihan 1: Bangun lapisan otorisasi

Tambahkan otorisasi penuh ke Proyek 2: empat peran (pembeli, kasir, supervisor, pemilik), izin sebagai data, cakupan cabang untuk supervisor, dan `pastikanBoleh` yang dipakai di semua jalur.

Lalu buktikan: tulis test yang mencoba setiap peran terhadap setiap endpoint, dan pastikan yang seharusnya ditolak benar-benar ditolak.

> [!petunjuk]
> Buat matriks peran kali endpoint di spreadsheet lebih dulu, isi dengan boleh atau tidak, baru tulis kodenya. Matriks itu sekaligus jadi daftar test Anda, dan jumlah selnya akan mengejutkan: 4 peran kali 15 endpoint berarti 60 kombinasi yang semuanya punya jawaban benar.

> [!jawaban]
>
> Contoh potongan matriksnya:
>
> | Endpoint | pembeli | kasir | supervisor | pemilik |
> | --- | --- | --- | --- | --- |
> | `GET /pesanan` | miliknya | cabangnya | cabangnya | semua |
> | `GET /pesanan/{id}` | miliknya | cabangnya | cabangnya | semua |
> | `POST /pesanan` | ya | ya, untuk pembeli | tidak | tidak |
> | `POST /pesanan/{id}/pembatalan` | miliknya, sebelum dibayar | cabangnya | cabangnya | semua |
> | `PATCH /produk/{id}` | tidak | tidak | ya, harga saja | ya |
> | `GET /laporan/harian` | tidak | tidak | cabangnya | semua |
> | `GET /pengguna` | tidak | tidak | tidak | ya |
>
> Dan test yang membuktikannya, ditulis sebagai tabel supaya tidak ada kombinasi yang terlewat:
>
> ```ts
> const KASUS = [
>   { peran: 'pembeli',    metode: 'GET',  jalur: '/v1/laporan/harian', harap: 403 },
>   { peran: 'kasir',      metode: 'GET',  jalur: '/v1/laporan/harian', harap: 403 },
>   { peran: 'supervisor', metode: 'GET',  jalur: '/v1/laporan/harian', harap: 200 },
>   { peran: 'pembeli',    metode: 'GET',  jalur: '/v1/pesanan/{lain}', harap: 404 },
>   { peran: 'kasir',      metode: 'GET',  jalur: '/v1/pesanan/{lain-cabang}', harap: 404 },
>   // ... 60 baris
> ] as const;
>
> for (const kasus of KASUS) {
>   it(`${kasus.peran} ${kasus.metode} ${kasus.jalur} -> ${kasus.harap}`, async () => {
>     const res = await panggil(kasus);
>     expect(res.status).toBe(kasus.harap);
>   });
> }
> ```
>
> Empat hal yang akan Anda temukan saat mengerjakannya:
>
> 1. **Beberapa sel matriks tidak punya jawaban yang jelas**, misalnya "bolehkah kasir membatalkan pesanan yang sudah dibayar". Itu temuan, bukan hambatan: pertanyaan seperti ini harus ditanyakan ke pemilik produk, bukan ditebak oleh engineer.
> 2. **Jawaban 404 untuk pesanan milik orang lain akan terasa salah** saat Anda menulis test-nya, dan itu memang disengaja.
> 3. **Pola cakupan "miliknya, cabangnya, semua" berulang di banyak endpoint**, dan pantas diangkat jadi satu fungsi yang menurunkan syarat kueri dari pelaku.
> 4. **Test tabel seperti ini adalah test yang paling berharga di seluruh layanan.** Test itu tidak akan pecah karena perubahan tampilan respons, dan akan langsung merah saat seseorang menambahkan izin ke peran yang salah.

### Latihan 2: Temukan enam kebocoran

Lima endpoint ini dari layanan yang sudah punya autentikasi dan `pastikanBoleh`. Temukan enam kebocoran otorisasi.

```ts
// Empat potongan untuk Anda telaah di latihan ini
// A
app.get('/v1/pesanan', async (req) => {
  return repoPesanan.daftar({ pembeliId: req.query.pembeliId, status: req.query.status });
});

// B
app.get('/v1/pesanan/:id/struk.pdf', async (req) => {
  const pesanan = await repoPesanan.ambil(req.params.id);
  return buatPdf(pesanan);
});

// C
app.get('/v1/cari', async (req) => {
  const [produk, pembeli] = await Promise.all([
    repoProduk.cari(req.query.q),
    repoPembeli.cari(req.query.q),
  ]);
  return { produk, pembeli };
});

// D
app.post('/v1/pesanan/:id/pembatalan', async (req) => {
  const pesanan = await repoPesanan.ambil(req.params.id);
  pastikanBoleh(req.pelaku, 'pesanan:batalkan', { tenantId: pesanan.tenantId });
  return layananPesanan.batalkan(pesanan.id);
});

// E
app.get('/v1/laporan/ekspor.csv', async (req) => {
  pastikanBoleh(req.pelaku, 'laporan:baca');
  return streamCsv(await repoPesanan.semuaUntukEkspor(req.query.dari, req.query.sampai));
});
```

> [!petunjuk]
> Dua pola yang menjelaskan lima dari enam kebocoran. Pertama: cari tempat pemanggil yang menentukan sendiri data siapa yang dibaca, lewat parameter kueri atau id di path. Kedua: cari jalur yang mengambil data **sebelum** memeriksa hak, karena urutan itu menentukan apakah 404 atau 403 yang bocor. Dan satu khusus untuk D: pemeriksaannya ada dan tetap tidak cukup. Tanyakan dari mana nilai yang diperiksa itu berasal.

> [!jawaban]
>
> | # | Kebocoran | Akibat |
> | --- | --- | --- |
> | 1 | **A**: `pembeliId` dari query | Siapa pun bisa membaca riwayat siapa pun. Kebocoran paling parah di daftar ini |
> | 2 | **A**: tidak ada penyaringan tenant | Pesanan tenant lain ikut terbaca |
> | 3 | **B**: tidak ada pemeriksaan sama sekali | Struk pesanan orang lain bisa diunduh dengan menebak id. Endpoint berkas sering terlewat karena tidak terlihat seperti endpoint data |
> | 4 | **C**: pencarian tanpa cakupan tenant | Nama dan email pelanggan tenant lain muncul di hasil pencarian |
> | 5 | **D**: `pemilikId` dan `cabangId` tidak dikirim ke `pastikanBoleh` | Pemeriksaan tenant lolos, tapi pembeli bisa membatalkan pesanan pembeli lain di tenant yang sama |
> | 6 | **E**: izin diperiksa, cakupan tidak | Supervisor cabang Bandung mengunduh seluruh data semua cabang |
>
> Kebocoran ketujuh yang lebih halus pada **D**: `repoPesanan.ambil` dipanggil sebelum pemeriksaan, dan kalau pesanannya tidak ada, baris `pesanan.tenantId` akan melempar `TypeError` yang jadi 500. Pemanggil bisa membedakan 500 dari 404, dan itu cara memetakan id yang ada.
>
> Dua pola pencegahan yang menyelesaikan keenamnya sekaligus:
>
> **Pertama, repository untuk data tenant wajib menerima `pelaku`.** Dengan tanda tangan `daftar(pelaku: Pelaku, filter: Filter)`, endpoint A tidak akan bisa dikompilasi tanpa mengirim pelaku, dan penyaringan tenant ikut otomatis.
>
> **Kedua, nyalakan RLS.** Dengan kebijakan tenant di basis data, kebocoran nomor 2, 4, dan 6 jadi mustahil meski kodenya lupa menyaring. Ini contoh paling jelas dari prinsip modul 5: aturan yang dinyatakan di basis data dijaga mesin, aturan yang ada di kode dijaga ingatan.

### Latihan 3: Pasang Row Level Security

Nyalakan RLS pada seluruh tabel milik tenant di Proyek 2, lalu buktikan isolasinya dengan test yang gagal sebelum RLS dan lulus sesudahnya.

> [!pembahasan]
>
> ```sql
> -- 1. Peran aplikasi yang bukan pemilik tabel dan bukan superuser
> CREATE ROLE aplikasi LOGIN PASSWORD 'rahasia';
> GRANT USAGE ON SCHEMA public TO aplikasi;
> GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aplikasi;
>
> -- 2. Nyalakan RLS pada setiap tabel milik tenant
> DO $$
> DECLARE t text;
> BEGIN
>   FOREACH t IN ARRAY ARRAY['pesanan','pesanan_item','produk','varian','kupon','pembeli']
>   LOOP
>     EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
>     EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
>     EXECUTE format($f$
>       CREATE POLICY isolasi_tenant ON %I
>         USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
>         WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid)
>     $f$, t);
>   END LOOP;
> END $$;
> ```
>
> ```ts
> // Test yang membuktikan isolasinya
> it('tidak bisa membaca pesanan tenant lain meski kuerinya lupa menyaring', async () => {
>   await denganTenant(TENANT_A, async (tx) => {
>     await buatPesanan(tx, { tenantId: TENANT_A, total: 50_000 });
>   });
>
>   const hasil = await denganTenant(TENANT_B, async (tx) => {
>     // Sengaja tanpa WHERE tenant_id. Sebelum RLS, ini mengembalikan pesanan tenant A.
>     return tx.execute(sql`SELECT * FROM pesanan`);
>   });
>
>   expect(hasil).toHaveLength(0);
> });
>
> it('tidak bisa menyisipkan baris untuk tenant lain', async () => {
>   await expect(
>     denganTenant(TENANT_B, async (tx) =>
>       tx.execute(sql`
>         INSERT INTO pesanan (id, tenant_id, pembeli_id, subtotal_rp, diskon_rp, total_rp, alamat_kirim)
>         VALUES (${idBaru()}, ${TENANT_A}, ${PEMBELI_A}, 1000, 0, 1000, 'x')
>       `)
>     )
>   ).rejects.toThrow();
> });
> ```
>
> Lima hal yang pantas diperhatikan:
>
> 1. **`WITH CHECK` mencegah penulisan lintas tenant**, bukan hanya pembacaan. Tanpa itu, tenant B bisa menyisipkan baris atas nama tenant A, dan itu bentuk kebocoran yang lebih merusak.
> 2. **Test kedua adalah yang paling berharga.** Yang diuji adalah bahwa kesalahan pemrograman di masa depan tidak akan berakibat, dan itu nilai sesungguhnya dari RLS.
> 3. **RLS punya biaya performa kecil**, karena kebijakannya jadi syarat tambahan di setiap kueri. Pastikan `tenant_id` ada di indeks komposit Anda, biasanya sebagai kolom pertama.
> 4. **Migrasi dan pekerjaan latar butuh peran berbeda** yang bisa melewati RLS, misalnya untuk menghitung ringkasan lintas tenant. Buat peran terpisah dengan `BYPASSRLS`, dan pakai hanya di jalur yang memang perlu.
> 5. **RLS bukan pengganti `pastikanBoleh`.** RLS menjaga batas tenant, dan tidak tahu apa pun tentang peran, cabang, maupun kepemilikan di dalam satu tenant. Keduanya dipakai bersamaan.

### Latihan 4: Rancang izin untuk permintaan yang datang belakangan

Setahun setelah rilis, datang enam permintaan baru. Untuk masing-masing, tentukan apakah cukup data (menambah baris di tabel izin) atau butuh kode baru, dan jelaskan.

| # | Permintaan |
| --- | --- |
| 1 | Peran baru "auditor" yang bisa membaca semuanya tapi tidak mengubah apa pun |
| 2 | Supervisor boleh mengubah harga, tapi maksimal 10% dari harga sekarang |
| 3 | Satu pelanggan ingin peran kustom bernama "admin gudang" |
| 4 | Kasir tidak boleh melihat nomor telepon pembeli |
| 5 | Pemilik boleh mengekspor data, tapi maksimal sekali per hari |
| 6 | Staf dukungan kami boleh melihat data semua tenant untuk membantu pelanggan |

> [!jawaban]
>
> | # | Cukup data? | Alasan |
> | --- | --- | --- |
> | 1 | **Ya** | Satu baris di `peran`, lalu izin yang berakhiran `:baca` dipasangkan. Tidak ada kode baru |
> | 2 | **Tidak** | Aturan bergantung nilai sumber daya. Perlu kode di lapisan service, dan izinnya tetap `produk:ubah-harga` |
> | 3 | **Ya**, kalau tabel peran punya `tenant_id` | Inilah yang dibeli oleh desain berbasis data sejak awal |
> | 4 | **Tidak** | Izin tingkat kolom. Perlu skema respons per peran, seperti di bagian sebelumnya |
> | 5 | **Tidak** | Ini pembatasan laju, bukan izin. Tempatnya di lapisan rate limit dengan kunci per pengguna |
> | 6 | **Tidak, dan hati-hati** | Ini bukan peran, melainkan impersonasi atau peran platform di luar model tenant |
>
> Tiga penjelasan yang paling penting:
>
> **Nomor 2 adalah contoh ABAC yang khas.** Godaannya membuat izin bernama `produk:ubah-harga-maksimal-10-persen`, dan itu jalan menuju seratus izin yang tidak bisa dibaca siapa pun. Yang benar: izin menentukan **kemampuan**, dan batas nilainya diperiksa di aturan bisnis.
>
> ```ts
> // Di lapisan service, bukan di lapisan izin
> if (pelaku.peran === 'supervisor') {
>   const perubahan = Math.abs(hargaBaru - produk.hargaRp) / produk.hargaRp;
>   if (perubahan > 0.1) {
>     throw new ErrorTidakBerhak('Perubahan harga di atas 10% butuh persetujuan pemilik');
>   }
> }
> ```
>
> **Nomor 5 sering salah tempat.** "Maksimal sekali per hari" bukan pertanyaan boleh atau tidak, melainkan pertanyaan berapa sering. Mencampurnya ke dalam sistem izin membuat kedua sistem jadi lebih rumit tanpa manfaat.
>
> **Nomor 6 adalah permintaan yang paling berbahaya di daftar ini.** Membuat peran "super admin" yang bisa melihat semua tenant berarti satu akun yang bocor membocorkan seluruh basis pelanggan Anda. Yang lebih aman: impersonasi dengan masa berlaku 30 menit, alasan tertulis, jejak audit, dan larangan melakukan aksi yang tidak bisa dibatalkan. Dan pelanggan Anda pantas tahu bahwa fitur itu ada, beserta catatan kapan dipakai pada akun mereka.

## Batasnya

Otorisasi yang dikerjakan dengan baik tetap punya tiga batas.

**Keputusan izin butuh data, dan data itu perlu cepat.** Memeriksa peran dan izin di setiap permintaan berarti satu pencarian tambahan. Pada layanan dengan lalu lintas tinggi, itu perlu di-cache, dan cache yang basi berarti pencabutan izin tidak langsung berlaku. Pertukaran itu dibahas di modul 14.

**Aturan yang sangat rumit melampaui RBAC sederhana.** Kalau Anda mulai menulis aturan seperti "boleh kalau atasannya menyetujui dan nilainya di bawah batas cabang", pertimbangkan mesin kebijakan terpisah. Untuk sebagian besar aplikasi, itu tidak diperlukan.

**Otorisasi tidak melindungi dari serangan.** Pemanggil yang sudah berhak tetap bisa mengirim payload yang dirancang merusak, membanjiri endpoint Anda, atau mengeksploitasi kelemahan di tempat lain.

## Rangkuman

- Autentikasi dikerjakan sekali, otorisasi harus benar di setiap jalur. Satu yang terlewat sudah cukup.
- RBAC menentukan kemampuan, kepemilikan dan atribut menentukan cakupan. Pisahkan dua pertanyaan itu.
- Satu fungsi otorisasi untuk seluruh layanan, dipakai handler, worker, dan perintah terminal. Tolak secara bawaan.
- Identitas dan tenant selalu dari sesi, tidak pernah dari parameter permintaan.
- Endpoint daftar diamankan dengan memasukkan cakupan ke dalam kueri, bukan dengan menyaring hasil setelah diambil. Repository data tenant wajib menerima `pelaku`.
- Pelanggaran tenant dijawab 404, bukan 403. Membedakan keduanya adalah kebocoran informasi.
- Satu skema dengan `tenant_id` untuk hampir semua SaaS, dan RLS sebagai lapisan yang membuat kelupaan tidak berakibat. `WITH CHECK` sama pentingnya dengan `USING`.
- Izin sebagai data membuat peran baru dan peran kustom per tenant jadi perubahan konfigurasi, bukan perubahan kode.
- Batas nilai dan pembatasan laju bukan izin. Jangan dicampur ke sistem izin.
- Impersonasi wajib punya masa berlaku pendek, alasan tertulis, audit, dan larangan aksi yang tidak bisa dibatalkan.
- Endpoint berkas, pencarian, laporan, dan ekspor adalah tempat kebocoran paling sering terjadi, karena tidak terlihat seperti jalur akses data.

## Masalah terbuka

Layanan Anda sekarang tahu siapa pemanggilnya dan apa yang boleh dilakukannya. Yang belum dibahas: apa yang terjadi kalau pemanggilnya **tidak berniat baik**.

API Anda terbuka di internet, dan dalam beberapa hari setelah tayang, log Anda akan berisi percobaan yang tidak pernah datang dari aplikasi Anda sendiri. Permintaan dengan payload berisi potongan SQL. Pengiriman JSON bersarang seratus tingkat. Permintaan ke `/v1/pesanan` dengan field tambahan bernama `isAdmin: true`. Unggahan berkas bernama `../../etc/passwd`. Dan ribuan percobaan login dari ratusan alamat IP berbeda.

Sebagian sudah tertangkap oleh hal-hal yang Anda bangun sejauh ini: parameter kueri menutup injeksi SQL, skema validasi menolak field yang tidak dikenal, dan pembatasan laju meredam percobaan login. Sebagian belum.

Itu isi modul berikutnya: keamanan backend, dari OWASP API Top 10 sampai pengelolaan rahasia, dan daftar periksa yang pantas dijalankan sebelum layanan Anda dibuka ke publik.
