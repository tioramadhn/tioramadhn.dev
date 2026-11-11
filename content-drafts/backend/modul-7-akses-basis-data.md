---
title: 'Modul 7: Akses Basis Data dari Node'
description: Pool sambungan dan kenapa menambahnya justru memperlambat, pilihan antara SQL langsung dan ORM, pemetaan error Postgres jadi error domain, dan masalah N+1 yang paling sering menjatuhkan performa.
date: 2026-12-09
slug: modul-7-akses-basis-data
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Kueri Anda sudah benar dan masih dijalankan dari terminal. Memanggilnya dari Node memunculkan empat pertanyaan yang punya jawaban salah yang populer:

| Pertanyaan | Jawaban yang terasa benar | Akibatnya |
| --- | --- | --- |
| Bagaimana menyambung ke basis data? | Buka sambungan per permintaan | Batas sambungan Postgres habis pada lalu lintas sedang |
| Bagaimana menyisipkan nilai ke SQL? | Sambung string | Injeksi SQL |
| Pakai ORM atau SQL langsung? | ORM, biar tidak perlu SQL | Satu daftar memicu 101 kueri |
| Berapa sambungan yang dibuka? | Sebanyak mungkin | Lebih lambat daripada sepuluh sambungan |

Keempatnya dibahas di modul ini, dan yang terakhir adalah yang paling berlawanan dengan dugaan.

## Pool sambungan

Membuka sambungan ke Postgres mahal: ada perjalanan jaringan, autentikasi, dan di sisi server satu **proses** baru dibuat untuk setiap sambungan. Karena itu sambungan dibuat sekali lalu dipakai ulang.

```ts
// src/db/pool.ts
import { Pool } from 'pg';
import { config } from '../config.js';

export const pool = new Pool({
  connectionString: config.DATABASE_URL,

  max: config.DB_POOL_MAX,          // jumlah sambungan maksimum
  idleTimeoutMillis: 30_000,        // tutup sambungan yang menganggur
  connectionTimeoutMillis: 5_000,   // jangan menunggu pool selamanya

  // Batas waktu di sisi server: kueri yang terlalu lama dibatalkan
  statement_timeout: 10_000,
  // Jangan menunggu kunci baris terlalu lama
  lock_timeout: 3_000,
  // Transaksi yang menggantung tidak boleh menahan sambungan selamanya
  idle_in_transaction_session_timeout: 10_000,
});

pool.on('error', (error) => {
  // Sambungan menganggur yang mati tidak boleh menjatuhkan proses
  console.error({ err: error }, 'kesalahan pada sambungan menganggur');
});
```

Empat batas waktu di potongan itu pantas dipasang di hari pertama. Tanpa `statement_timeout`, satu kueri yang salah tulis bisa berjalan dua puluh menit sambil menahan satu sambungan. Tanpa `idle_in_transaction_session_timeout`, satu transaksi yang lupa ditutup karena ada error akan menahan kunci baris sampai seseorang menyadarinya.

**Berapa `max` yang benar?** Ini bagian yang berlawanan dengan dugaan. Menambah sambungan tidak menambah kapasitas, karena yang mengerjakan kueri adalah prosesor dan disk di mesin basis data, dan jumlah keduanya tetap. Setelah melewati titik tertentu, sambungan tambahan hanya menambah perebutan sumber daya, sehingga **semua** kueri melambat.

Titik awal yang masuk akal:

```text
max per instance = (jumlah inti basis data x 2) / jumlah instance aplikasi
```

Untuk basis data 4 inti dengan 3 instance aplikasi: sekitar 2 sampai 3 sambungan per instance. Angka itu terasa terlalu kecil bagi hampir semua orang, dan hampir selalu benar. Kalau pool Anda sering penuh, yang perlu diperbaiki biasanya kueri yang lambat atau transaksi yang terlalu panjang, bukan ukuran pool.

Dua keadaan yang butuh penanganan khusus:

**Serverless.** Setiap instance fungsi punya pool sendiri, dan jumlah instance bisa melonjak dari 2 jadi 200 saat ramai. Dua ratus pool dengan `max: 5` berarti seribu sambungan, dan Postgres akan menolak. Jawabannya pooler di tengah, misalnya PgBouncer dalam mode transaksi, atau layanan seperti Neon dan Supabase yang sudah menyediakannya.

**Mode transaksi pada pooler.** Dengan PgBouncer mode transaksi, sambungan dikembalikan ke kumpulan setelah setiap transaksi, sehingga pernyataan yang disiapkan dan `LISTEN` tidak bekerja seperti biasa. Sebutkan ini di konfigurasi Anda, karena gejalanya membingungkan.

## Parameter, bukan penyambungan string

```ts
// Berbahaya: injeksi SQL. Masukan "'; DROP TABLE buku; --" menghancurkan data.
const hasil = await pool.query(`SELECT * FROM buku WHERE judul = '${judul}'`);

// Benar: nilai dikirim terpisah dari pernyataannya
const hasil = await pool.query('SELECT * FROM buku WHERE judul = $1', [judul]);
```

Yang perlu dipahami: parameter **bukan** sekadar pelolosan tanda kutip. Pernyataan dan datanya dikirim terpisah ke server, sehingga isi parameter tidak pernah ditafsirkan sebagai bagian dari perintah. Itu sebabnya ia aman secara mutlak, bukan aman karena kebetulan.

Satu hal yang **tidak** bisa diparameterkan: nama tabel, nama kolom, dan arah pengurutan. Jadi pengurutan dinamis dari masukan pengguna harus lewat daftar putih:

```ts
// Pengurutan dinamis yang aman
const KOLOM_URUT = {
  judul: 'b.judul',
  tahun: 'b.tahun',
  terbaru: 'b.dibuat_pada',
} as const;

function sqlUrut(urut: keyof typeof KOLOM_URUT, arah: 'asc' | 'desc') {
  // Kedua nilai berasal dari enum yang divalidasi skema, bukan dari string bebas
  return `ORDER BY ${KOLOM_URUT[urut]} ${arah === 'asc' ? 'ASC' : 'DESC'}, b.id DESC`;
}
```

## SQL langsung, query builder, atau ORM

| Pendekatan | Contoh | Kelebihan | Kekurangan |
| --- | --- | --- | --- |
| **Driver langsung** | `pg` | Kendali penuh, nol abstraksi | Pemetaan hasil manual, tidak bertipe |
| **Query builder bertipe** | Kysely, Drizzle | Tipe dari skema, SQL tetap terlihat | Perlu menjaga definisi skema |
| **ORM penuh** | Prisma, TypeORM, Sequelize | Cepat untuk CRUD, migrasi bawaan | Menyembunyikan kueri, sumber N+1, sulit untuk kueri rumit |

Rekomendasi untuk seri ini: **Drizzle untuk kueri sehari-hari, SQL langsung untuk yang rumit.** Alasannya satu: SQL tetap terlihat. Pada abstraksi yang menyembunyikan kueri, pertanyaan "kenapa endpoint ini lambat" jadi sulit dijawab, dan Anda baru menemukan masalahnya saat produksi melambat.

```ts
// src/db/skema.ts
import { pgTable, uuid, text, bigint, date, timestamp, smallint } from 'drizzle-orm/pg-core';

export const buku = pgTable('buku', {
  id: uuid('id').primaryKey(),
  isbn: text('isbn').unique(),
  judul: text('judul').notNull(),
  penulis: text('penulis').notNull(),
  tahun: smallint('tahun'),
  dibuatPada: timestamp('dibuat_pada', { withTimezone: true }).notNull().defaultNow(),
});

export const peminjaman = pgTable('peminjaman', {
  id: uuid('id').primaryKey(),
  anggotaId: uuid('anggota_id').notNull(),
  salinanId: uuid('salinan_id').notNull(),
  bukuId: uuid('buku_id').notNull(),
  status: text('status').notNull(),
  jatuhTempo: date('jatuh_tempo').notNull(),
  dendaRp: bigint('denda_rp', { mode: 'number' }).notNull().default(0),
});
```

Perhatikan bahwa nama kolom di basis data memakai `snake_case` dan nama field di TypeScript memakai `camelCase`. Pemetaan itu ditulis satu kali di sini, dan sisa aplikasi tidak pernah melihat `snake_case` lagi.

```ts
// Kueri bertipe, dan SQL yang dihasilkan masih bisa dibaca
const hasil = await db
  .select({ id: buku.id, judul: buku.judul, penulis: buku.penulis })
  .from(buku)
  .where(and(gte(buku.tahun, 2020), ilike(buku.penulis, `%${q}%`)))
  .orderBy(desc(buku.tahun), desc(buku.id))
  .limit(20);

// Untuk kueri rumit, SQL langsung lebih jelas daripada dipaksakan ke builder
const rekap = await db.execute(sql`
  SELECT k.nama AS kategori, count(*) AS jumlah
  FROM peminjaman p
  JOIN salinan s ON s.id = p.salinan_id
  JOIN buku_kategori bk ON bk.buku_id = s.buku_id
  JOIN kategori k ON k.id = bk.kategori_id
  WHERE p.dipinjam_pada >= ${awalBulan}
  GROUP BY k.nama
  ORDER BY jumlah DESC
`);
```

Patokan memilih di antara keduanya: **builder untuk kueri yang bentuknya berubah-ubah** (filter opsional, pengurutan dinamis), **SQL langsung untuk kueri yang bentuknya tetap tapi isinya rumit** (laporan, window function, CTE). Memaksa laporan dengan window function ke dalam builder menghasilkan kode yang lebih sulit dibaca daripada SQL-nya sendiri.

## Repository: satu tempat yang tahu soal SQL

Antarmuka dari Proyek 1 sekarang diisi implementasi Postgres, dan `layanan.ts` tidak berubah satu baris pun.

```ts
// src/fitur/peminjaman/repo-pg.ts
export function buatRepoPeminjamanPg(db: Database): RepoPeminjaman {
  return {
    async hitungBerjalanMilik(anggotaId) {
      const [baris] = await db
        .select({ jumlah: count() })
        .from(peminjaman)
        .where(and(eq(peminjaman.anggotaId, anggotaId), eq(peminjaman.status, 'berjalan')));

      return baris?.jumlah ?? 0;
    },

    async adaTerlambatMilik(anggotaId) {
      // EXISTS berhenti di baris pertama yang cocok, jauh lebih murah daripada count
      const [baris] = await db.execute(sql`
        SELECT EXISTS (
          SELECT 1 FROM peminjaman
          WHERE anggota_id = ${anggotaId}
            AND status = 'berjalan'
            AND jatuh_tempo < current_date
        ) AS ada
      `);

      return Boolean(baris?.ada);
    },

    async totalDendaBelumDibayar(anggotaId) {
      const [baris] = await db.execute(sql`
        SELECT coalesce(sum(denda_rp), 0)::bigint AS total
        FROM peminjaman
        WHERE anggota_id = ${anggotaId} AND denda_dibayar = false
      `);

      return Number(baris?.total ?? 0);
    },
  };
}
```

Tiga catatan praktis yang akan menghemat waktu Anda:

**`EXISTS` bukan `count` untuk pertanyaan ya atau tidak.** `count` harus memeriksa semua baris yang cocok, `EXISTS` berhenti di yang pertama. Pada anggota dengan dua ratus peminjaman, bedanya terasa.

**`bigint` dari Postgres datang sebagai string di driver `pg`.** Alasannya `bigint` bisa melebihi batas bilangan yang aman di JavaScript. Untuk kolom uang rupiah, konversi ke `number` aman sampai sekitar sembilan kuadriliun, dan itu cukup. Untuk nilai yang benar-benar bisa melampauinya, pakai `BigInt` dan jangan lupa cara men-serialisasinya ke JSON.

**Hasil kueri mentah tidak bertipe.** Validasi dengan Zod pada batas ini layak dilakukan untuk kueri SQL langsung, dan modul 12 seri frontend menjelaskan pola yang sama.

## N+1: pembunuh performa yang tidak terlihat

Kode ini terbaca wajar dan merupakan penyebab performa buruk nomor satu di aplikasi yang memakai basis data:

```ts
// 1 kueri untuk daftar
const daftar = await repoPeminjaman.daftar({ limit: 50 });

// + 50 kueri untuk anggota, + 50 untuk buku. Total 101 perjalanan.
for (const p of daftar) {
  p.anggota = await repoAnggota.ambil(p.anggotaId);
  p.buku = await repoBuku.ambil(p.bukuId);
}
```

Pada basis data lokal, 101 kueri yang masing-masing 1 ms terasa cepat. Pada produksi dengan latensi jaringan 2 ms per kueri, itu 200 ms tambahan yang tidak perlu, dan seluruh anggaran latensi dari modul 1 habis di satu loop.

Tiga cara memperbaikinya:

```ts
// A. Satu join, kalau bentuk hasilnya memang datar
const daftar = await db
  .select({
    id: peminjaman.id,
    jatuhTempo: peminjaman.jatuhTempo,
    namaAnggota: anggota.nama,
    judulBuku: buku.judul,
  })
  .from(peminjaman)
  .innerJoin(anggota, eq(anggota.id, peminjaman.anggotaId))
  .innerJoin(buku, eq(buku.id, peminjaman.bukuId))
  .limit(50);

// B. Dua kueri tambahan dengan IN, kalau Anda butuh objek bersarang
const daftar = await repoPeminjaman.daftar({ limit: 50 });

const idAnggota = [...new Set(daftar.map((p) => p.anggotaId))];
const idBuku = [...new Set(daftar.map((p) => p.bukuId))];

const [semuaAnggota, semuaBuku] = await Promise.all([
  repoAnggota.ambilBanyak(idAnggota),
  repoBuku.ambilBanyak(idBuku),
]);

const petaAnggota = new Map(semuaAnggota.map((a) => [a.id, a]));
const petaBuku = new Map(semuaBuku.map((b) => [b.id, b]));

const hasil = daftar.map((p) => ({
  ...p,
  anggota: petaAnggota.get(p.anggotaId),
  buku: petaBuku.get(p.bukuId),
}));

// C. Biarkan basis data menyusun bentuk bersarangnya
const hasil = await db.execute(sql`
  SELECT p.id, p.jatuh_tempo,
         jsonb_build_object('id', a.id, 'nama', a.nama) AS anggota,
         jsonb_build_object('id', b.id, 'judul', b.judul) AS buku
  FROM peminjaman p
  JOIN anggota a ON a.id = p.anggota_id
  JOIN buku b ON b.id = p.buku_id
  ORDER BY p.dipinjam_pada DESC
  LIMIT 50
`);
```

Mana yang dipilih: **A kalau hasilnya datar, B kalau butuh bersarang dan datanya banyak dipakai ulang, C kalau bentuk bersarangnya rumit dan Anda nyaman dengan SQL.** Yang penting: jumlah kueri tidak boleh bertambah mengikuti jumlah baris.

Cara mendeteksinya sebelum produksi:

```ts
// Hitung kueri per permintaan, dan peringatkan kalau melewati batas wajar
export function pasangPenghitungKueri(app: FastifyInstance) {
  app.addHook('onRequest', async (req) => {
    req.jumlahKueri = 0;
  });

  app.addHook('onResponse', async (req) => {
    if (req.jumlahKueri > 15) {
      req.log.warn(
        { jumlahKueri: req.jumlahKueri, rute: req.routeOptions.url },
        'kemungkinan N+1'
      );
    }
  });
}
```

Lima belas baris itu menemukan lebih banyak masalah performa daripada alat apa pun, karena ia memberi tahu Anda saat masalahnya **baru dibuat**, bukan enam bulan kemudian.

## Error Postgres jadi error domain

Pelajaran modul 5 tentang "coba tulis, tangkap pelanggaran" butuh satu lapisan penerjemah.

```ts
// src/db/error.ts
const KODE = {
  UNIQUE: '23505',
  FOREIGN_KEY: '23503',
  NOT_NULL: '23502',
  CHECK: '23514',
  EXCLUSION: '23P01',
  SERIALIZATION: '40001',
  DEADLOCK: '40P01',
  STATEMENT_TIMEOUT: '57014',
  LOCK_TIMEOUT: '55P03',
} as const;

export function terjemahkanErrorDb(error: unknown): never {
  if (!isPgError(error)) throw error;

  switch (error.code) {
    case KODE.UNIQUE:
      // Nama batasan dipetakan ke pesan domain yang bisa dipahami pengguna
      throw new ErrorKonflik(pesanUnik(error.constraint), { batasan: error.constraint });

    case KODE.FOREIGN_KEY:
      throw new ErrorAturanBisnis(
        'Data yang dirujuk tidak ada atau masih dipakai',
        'RUJUKAN_TIDAK_VALID'
      );

    case KODE.CHECK:
      throw new ErrorAturanBisnis('Nilai tidak memenuhi aturan', 'NILAI_TIDAK_VALID');

    case KODE.EXCLUSION:
      throw new ErrorKonflik('Jadwal bertabrakan dengan yang sudah ada');

    case KODE.SERIALIZATION:
    case KODE.DEADLOCK:
      // Layak dicoba ulang, dan itu dikerjakan pemanggil. Modul 8.
      throw new ErrorDapatDiulang('Terjadi bentrok, permintaan dapat diulang');

    case KODE.STATEMENT_TIMEOUT:
    case KODE.LOCK_TIMEOUT:
      throw new ErrorAplikasi('Permintaan terlalu lama diproses', 503, 'TERLALU_LAMA');

    default:
      throw error;
  }
}

const PESAN_UNIK: Record<string, string> = {
  anggota_email_key: 'Email sudah terdaftar',
  satu_pinjaman_aktif_per_salinan: 'Salinan ini sedang dipinjam',
  satu_buku_per_anggota: 'Anda sudah meminjam buku ini',
  idempotency_pkey: 'Permintaan dengan kunci ini sudah pernah diproses',
};

const pesanUnik = (batasan?: string) =>
  (batasan && PESAN_UNIK[batasan]) ?? 'Data sudah ada';
```

Tabel `PESAN_UNIK` itu teknik yang pantas ditiru: **nama batasan di basis data jadi kunci untuk pesan yang dibaca pengguna.** Dengan begitu aturan dan pesannya tinggal berdekatan, dan menambah batasan baru berarti menambah satu baris di satu tempat.

Satu peringatan: jangan pernah mengirim pesan error Postgres mentah ke klien. Pesan seperti `duplicate key value violates unique constraint "anggota_email_key"` membocorkan nama tabel dan kolom Anda.

## Menjalankan dan menguji

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "tsx src/db/seed.ts",
    "db:studio": "drizzle-kit studio"
  }
}
```

Dua hal yang pantas disiapkan sekarang, meski test dibahas lengkap di modul 20:

**Basis data terpisah untuk test**, dengan skema yang dimigrasikan dari nol di setiap jalannya. Menguji terhadap Postgres sungguhan dengan Testcontainers memberi keyakinan yang tidak bisa diberikan basis data tiruan, karena yang Anda uji termasuk batasan, tipe, dan perilaku transaksinya.

**Data benih yang masuk akal.** Seed yang berisi tiga baris tidak akan pernah memunculkan masalah N+1 maupun kueri yang lambat. Buat seed yang menghasilkan puluhan ribu baris, dan modul 9 akan memakainya untuk membuktikan dampak indeks.

Terakhir, nyalakan pencatatan kueri lambat sejak sekarang:

```sql
-- Catat kueri yang lebih dari 200 ms
ALTER DATABASE perpustakaan SET log_min_duration_statement = 200;

-- Statistik kueri agregat, alat terbaik untuk menemukan yang perlu diperbaiki
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

## Latihan

### Latihan 1: Pindahkan Proyek 1 ke Postgres

Ganti penyimpanan memori dengan Postgres, dengan satu syarat keras: **tidak satu baris pun di `layanan.ts` dan `aturan.ts` boleh berubah.**

> [!petunjuk]
> Kalau ada yang harus berubah di `layanan.ts`, itu tanda antarmuka repository Anda terlalu bocor, misalnya mengembalikan baris mentah atau menerima objek filter yang berbau SQL. Perbaiki antarmukanya, bukan layanannya.

> [!jawaban]
>
> Lima hal yang biasanya jadi hambatan:
>
> 1. **Nama field.** Baris Postgres datang sebagai `snake_case`. Pemetaan ke `camelCase` tempatnya di repository, dan Drizzle melakukannya otomatis kalau skemanya didefinisikan seperti di atas.
> 2. **Tipe yang berubah bentuk.** `date` datang sebagai string `'2026-12-20'`, `timestamptz` sebagai objek `Date`, dan `bigint` sebagai string. Tetapkan bentuk kanonis di tipe domain Anda, lalu konversi di repository. Untuk seri ini: tanggal kalender sebagai string, momen sebagai `Date`, uang sebagai `number`.
> 3. **Pembuat id.** Di memori Anda mungkin memakai penghitung. Ganti ke UUIDv7 yang dibuat di aplikasi, supaya `RETURNING` tidak wajib dan id bisa dipakai sebelum penyimpanan.
> 4. **Kueri daftar dengan kursor.** Inilah tempat pelajaran modul 4 dan 6 bertemu: perbandingan pasangan `(nilai, id)` dengan indeks komposit yang cocok.
> 5. **`adaPinjamanBukuIni` sekarang boleh dihapus.** Aturan itu sudah dijamin indeks unik sebagian dari modul 5, jadi yang perlu dilakukan hanya menangkap `23505` dan menerjemahkannya. Kurang satu kueri per peminjaman, dan jaminannya lebih kuat.
>
> Nomor 5 adalah hasil yang paling memuaskan dari latihan ini: pemeriksaan di aplikasi yang digantikan jaminan basis data membuat kode **lebih pendek** sekaligus **lebih benar**.

### Latihan 2: Hitung ukuran pool

Sebuah layanan punya keadaan berikut. Hitung `max` pool per instance, lalu jelaskan apa yang terjadi kalau dipasang 10 kali lebih besar.

| Hal | Nilai |
| --- | --- |
| Basis data | 4 vCPU, `max_connections` 100 |
| Instance aplikasi | 4, bisa naik jadi 10 saat ramai |
| Rata-rata waktu kueri | 8 ms |
| Target throughput | 600 permintaan per detik |
| Kueri per permintaan | 3 |

> [!jawaban]
>
> **Perhitungan kapasitas yang sebenarnya:**
>
> Kebutuhan: 600 permintaan/detik x 3 kueri = 1.800 kueri per detik. Satu sambungan yang sibuk terus bisa menjalankan 1 detik / 8 ms = 125 kueri per detik. Jadi dibutuhkan sekitar 1.800 / 125 = **14 sambungan yang sibuk**, secara total.
>
> Dengan 10 instance pada beban puncak: `max` sekitar 3 per instance, dengan sedikit kelonggaran jadi 4. Total 40 sambungan, masih jauh di bawah `max_connections` 100 dan menyisakan ruang untuk migrasi, `psql`, serta alat pemantauan.
>
> **Kalau dipasang `max: 40` per instance:**
>
> | Akibat | Penjelasan |
> | --- | --- |
> | 400 sambungan diminta | Melebihi `max_connections` 100. Sebagian permintaan gagal dengan "too many connections" |
> | Semua kueri melambat | 100 proses memperebutkan 4 inti. Kueri 8 ms bisa jadi 80 ms |
> | Memori basis data membengkak | Setiap sambungan punya alokasi kerja sendiri, dan `work_mem` dikalikan jumlah sambungan |
> | Gejalanya menyesatkan | Terlihat seperti basis data kurang kuat, padahal masalahnya terlalu banyak sambungan |
>
> Tiga pelajaran yang terpakai seumur karier:
>
> 1. **Pool yang besar menyembunyikan masalah, tidak menyelesaikannya.** Pool yang penuh adalah sinyal berguna bahwa ada kueri lambat atau transaksi panjang. Memperbesarnya hanya memindahkan antrean dari aplikasi ke basis data, tempat antrean itu merugikan semua orang.
> 2. **Hitung dari throughput dan durasi kueri**, bukan dari jumlah pengguna. Rumusnya: sambungan dibutuhkan = kueri per detik dikali durasi kueri dalam detik.
> 3. **Sisakan ruang.** Migrasi, `psql` untuk diagnosis, dan replika untuk cadangan semuanya butuh sambungan, dan biasanya dibutuhkan tepat saat keadaan sedang buruk.

### Latihan 3: Temukan dan perbaiki N+1

Endpoint ini butuh 1,2 detik untuk 50 baris. Temukan semua kueri yang terjadi, hitung jumlahnya, lalu perbaiki agar jumlah kueri tidak bergantung pada jumlah baris.

```ts
app.get('/v1/peminjaman', async (req) => {
  const daftar = await repoPeminjaman.daftar({ limit: 50 });

  return Promise.all(
    daftar.map(async (p) => ({
      ...p,
      anggota: await repoAnggota.ambil(p.anggotaId),
      buku: await repoBuku.ambil(p.bukuId),
      kategori: await repoKategori.milikBuku(p.bukuId),
      riwayatDenda: await repoDenda.milikPeminjaman(p.id),
      terlambat: (await repoPeminjaman.ambil(p.id))!.jatuhTempo < hariIni(),
    }))
  );
});
```

> [!pembahasan]
>
> **Jumlah kueri: 1 + 50 x 5 = 251.** Dan kueri terakhir yang paling menyakitkan: `repoPeminjaman.ambil(p.id)` mengambil ulang baris yang **sudah ada di tangan**, hanya untuk membaca satu kolom.
>
> Satu hal yang membuat ini lebih berbahaya daripada loop biasa: `Promise.all` atas 50 item membuat 250 kueri dikirim **bersamaan**, dan itu langsung menghabiskan pool sambungan. Endpoint lain yang sama sekali tidak terkait akan ikut gagal karena menunggu sambungan. Ini laporan nomor 4 dari modul 1, sekarang dengan penyebab yang berbeda.
>
> ```ts
> app.get('/v1/peminjaman', async (req) => {
>   const daftar = await repoPeminjaman.daftarDenganRelasi({ limit: 50 });
>   return daftar;
> });
> ```
>
> ```sql
> -- Satu kueri, dengan relasi banyak-ke-banyak dikumpulkan di basis data
> SELECT p.id,
>        p.jatuh_tempo,
>        p.jatuh_tempo < current_date AS terlambat,   -- dihitung di sini
>        jsonb_build_object('id', a.id, 'nama', a.nama) AS anggota,
>        jsonb_build_object('id', b.id, 'judul', b.judul) AS buku,
>        coalesce(k.kategori, '[]'::jsonb) AS kategori,
>        coalesce(d.riwayat, '[]'::jsonb) AS riwayat_denda
> FROM peminjaman p
> JOIN anggota a ON a.id = p.anggota_id
> JOIN buku b ON b.id = p.buku_id
> LEFT JOIN LATERAL (
>   SELECT jsonb_agg(jsonb_build_object('id', kt.id, 'nama', kt.nama)) AS kategori
>   FROM buku_kategori bk JOIN kategori kt ON kt.id = bk.kategori_id
>   WHERE bk.buku_id = b.id
> ) k ON true
> LEFT JOIN LATERAL (
>   SELECT jsonb_agg(jsonb_build_object('tanggal', dn.dibuat_pada, 'jumlah', dn.jumlah_rp)
>                    ORDER BY dn.dibuat_pada) AS riwayat
>   FROM denda dn WHERE dn.peminjaman_id = p.id
> ) d ON true
> ORDER BY p.dipinjam_pada DESC, p.id DESC
> LIMIT 50;
> ```
>
> Dari 251 kueri jadi 1, dan dari 1,2 detik biasanya jadi di bawah 30 ms.
>
> Empat catatan penting:
>
> 1. **`LEFT JOIN LATERAL` dengan `jsonb_agg`** adalah cara mengambil relasi satu-ke-banyak tanpa menggandakan baris induk. Alternatif yang lebih sederhana dan tetap baik: pendekatan B dari bagian sebelumnya, yaitu dua kueri tambahan dengan `IN`.
> 2. **`terlambat` dihitung di SQL**, menghapus 50 kueri sia-sia sekaligus menghilangkan risiko zona waktu yang berbeda antara aplikasi dan basis data.
> 3. **Jangan berhenti di satu kueri kalau jadi tidak terbaca.** Dua atau tiga kueri dengan `IN` seringkali pilihan yang lebih sehat daripada satu kueri raksasa. Yang dilarang adalah jumlah kueri yang bertambah mengikuti jumlah baris.
> 4. **Pasang penghitung kueri per permintaan.** Dengan peringatan di atas 15 kueri, kode seperti ini tidak akan pernah sampai ke produksi.

### Latihan 4: Terjemahkan kegagalan basis data

Untuk tujuh kegagalan Postgres berikut, tentukan status HTTP, pesan untuk pengguna, level log, dan apakah layak dicoba ulang otomatis.

| # | Kegagalan |
| --- | --- |
| 1 | `23505` pada `anggota_email_key` saat pendaftaran |
| 2 | `23505` pada `satu_pinjaman_aktif_per_salinan` |
| 3 | `23503` karena `buku_id` tidak ada |
| 4 | `23514` karena `denda_rp` negatif |
| 5 | `40P01` deadlock |
| 6 | `57014` kueri melewati `statement_timeout` |
| 7 | `ECONNREFUSED` saat menyambung |

> [!jawaban]
>
> | # | Status | Pesan | Log | Coba ulang? |
> | --- | --- | --- | --- | --- |
> | 1 | 409 | "Email sudah terdaftar" | info | Tidak |
> | 2 | 409 | "Salinan ini sedang dipinjam" | info | Tidak, tapi klien boleh meminta salinan lain |
> | 3 | 422 | "Buku yang dipilih tidak tersedia" | info | Tidak |
> | 4 | **500** | "Terjadi kesalahan di sisi kami" | **error** | Tidak |
> | 5 | 409 setelah gagal diulang | "Terjadi bentrok, coba lagi" | warn | **Ya, 2 sampai 3 kali** |
> | 6 | 503 dengan `Retry-After` | "Permintaan terlalu lama diproses" | error | Tidak otomatis |
> | 7 | 503 dengan `Retry-After` | "Layanan sedang terganggu" | error | Ya, di tingkat sambungan |
>
> Empat penjelasan yang jadi inti latihan ini:
>
> **Nomor 4 adalah 500, bukan 422, dan ini yang paling sering salah.** Pelanggaran `CHECK` berarti kode Anda mengirim nilai yang tidak mungkin sah. Itu bug di aplikasi, bukan kesalahan pengguna. Validasi skema di modul 3 seharusnya sudah menolaknya lebih dulu, jadi batasan basis data di sini berperan sebagai jaring terakhir. Mencatatnya sebagai `error` memastikan Anda mengetahuinya dan memperbaikinya.
>
> **Nomor 5 layak dicoba ulang otomatis, dan hanya itu bersama `40001`.** Deadlock dan kegagalan serialisasi adalah kegagalan sementara yang hampir selalu berhasil pada percobaan kedua. Tapi ada satu syarat mutlak: **operasinya harus idempoten**, atau percobaan ulang justru mengerjakannya dua kali. Modul 8 membangun pola percobaan ulangnya.
>
> **Nomor 1 dan 2 memakai kode 409 yang sama dengan pesan berbeda**, dan itu alasan tabel `PESAN_UNIK` ada. Tanpa pemetaan nama batasan, Anda akan tergoda mengirim pesan generik "data sudah ada", yang tidak membantu pengguna sama sekali.
>
> **Nomor 6 jangan dicoba ulang otomatis.** Kueri yang melewati batas waktu biasanya akan melewatinya lagi, dan mengulanginya hanya menambah beban saat basis data sudah kesulitan. Yang perlu dilakukan: catat kuerinya, lalu perbaiki dengan indeks di modul 9.

## Batasnya

Lapisan akses data yang rapi menyelesaikan sambungan, pemetaan, dan penerjemahan error. Tiga hal tetap terbuka.

**Dua penulisan masih bisa terpisah.** Masalah kelima dari Proyek 1 belum selesai: mengurangi stok lalu menyimpan pesanan adalah dua pernyataan, dan kalau proses mati di antaranya, data jadi tidak konsisten.

**Pemeriksaan lalu penulisan masih punya celah.** Aturan "maksimal 3 pinjaman" dibaca lalu diputuskan, dan dua permintaan bersamaan sama-sama melihat angka 2 lalu sama-sama lolos.

**Kueri yang benar belum tentu cepat.** Semua yang Anda tulis di modul ini akan tetap melambat pada dua juta baris tanpa indeks yang tepat.

## Rangkuman

- Pool dibuat sekali dan dipakai ulang. Empat batas waktu (`statement`, `lock`, `idle_in_transaction`, `connection`) dipasang di hari pertama.
- Menambah sambungan tidak menambah kapasitas. Hitung dari throughput dikali durasi kueri, dan angkanya akan terasa jauh lebih kecil daripada dugaan.
- Serverless butuh pooler di tengah, karena jumlah instance bisa melonjak ratusan kali.
- Nilai selalu lewat parameter. Nama kolom dan arah pengurutan tidak bisa diparameterkan, jadi pakai daftar putih.
- SQL tetap terlihat: builder bertipe untuk kueri yang bentuknya berubah, SQL langsung untuk laporan yang rumit.
- Repository satu-satunya tempat yang tahu soal SQL dan `snake_case`. Kalau mengganti penyimpanan menyentuh lapisan service, antarmukanya bocor.
- N+1 adalah penyebab performa buruk nomor satu, dan `Promise.all` membuatnya lebih berbahaya karena menghabiskan pool. Pasang penghitung kueri per permintaan.
- `EXISTS` bukan `count` untuk pertanyaan ya atau tidak.
- Petakan kode error Postgres ke error domain, dengan nama batasan sebagai kunci pesan. Jangan pernah mengirim pesan Postgres mentah ke klien.
- `23514` adalah bug aplikasi, bukan kesalahan pengguna. `40001` dan `40P01` layak dicoba ulang, sisanya tidak.

## Masalah terbuka

Dua masalah yang Anda catat di Proyek 1 masih berdiri, dan sekarang bisa dirumuskan dengan tepat.

Buka dua terminal, dan jalankan permintaan peminjaman untuk buku yang salinannya tinggal satu, pada saat yang sama. Dengan indeks unik sebagian dari modul 5, salah satu akan ditolak, dan itu kabar baik. Sekarang coba hal lain: anggota yang sudah punya 2 pinjaman mengirim dua permintaan peminjaman bersamaan. Kedua permintaan membaca jumlah pinjaman dan sama-sama melihat angka 2. Keduanya menyimpulkan masih boleh. Dan anggota itu berakhir dengan 4 pinjaman, melanggar aturan yang sudah Anda tulis dengan benar.

Tidak ada bug di kode Anda. Yang terjadi adalah dua hal yang Anda anggap satu kesatuan ternyata bisa diselingi oleh orang lain.

Pertanyaan yang sama berlaku untuk hal yang lebih mahal: mengurangi saldo di satu tabel dan menambahkannya di tabel lain, saat proses bisa mati di antara keduanya.

Itu isi modul berikutnya: transaksi, tingkat isolasi, penguncian baris, deadlock, dan cara menjamin bahwa beberapa penulisan benar-benar menyatu.
