---
title: 'Modul 14: Pekerjaan Latar dan Queue'
description: Pengguna menunggu 3,2 detik untuk pesanan yang sudah tersimpan dalam 32 milidetik. Memindahkan pekerjaan keluar dari permintaan, percobaan ulang yang benar, dan pekerjaan yang aman dijalankan dua kali.
date: 2026-12-18
slug: modul-14-queue-dan-pekerjaan-latar
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Rincian satu permintaan pembuatan pesanan dari akhir modul 13:

| Langkah | Waktu | Perlu ditunggu pengguna? |
| --- | --- | --- |
| Validasi | 5 ms | Ya |
| Kurangi stok | 12 ms | Ya |
| Simpan pesanan | 15 ms | Ya |
| Kirim email struk | 1.400 ms | **Tidak** |
| Buat PDF struk | 900 ms | **Tidak** |
| Kirim notifikasi | 600 ms | **Tidak** |
| Perbarui rekap penjualan | 300 ms | **Tidak** |

Tiga puluh dua milidetik yang perlu ditunggu, tiga ribu dua ratus milidetik yang tidak. Dan ada masalah yang lebih serius daripada lambat: **kalau layanan email gangguan, pesanan ikut gagal**, padahal stok sudah dikurangi dan pesanan sudah tersimpan. Pengguna melihat error, mencoba lagi, dan stok berkurang dua kali.

Modul ini memindahkan empat langkah terakhir keluar dari jalur permintaan, dan membereskan empat pertanyaan yang muncul karenanya:

| Pertanyaan | Jawaban |
| --- | --- |
| Siapa yang mengerjakannya kalau bukan permintaan? | Worker yang mengambil dari queue |
| Apa yang terjadi kalau pekerjaannya gagal? | Percobaan ulang dengan jeda bertambah, lalu dead letter queue |
| Apa yang terjadi kalau dijalankan dua kali? | Harus tidak berakibat apa-apa, dan itu syarat wajib |
| Bagaimana kalau pesanan tersimpan tapi pekerjaannya tidak masuk queue? | Pola outbox, dibahas lengkap di modul 15 |

## Analogi: tiket pesanan di dapur

Bayangkan restoran yang pelayannya ikut memasak. Satu pesanan nasi goreng berarti pelayan itu masuk dapur, memasak sepuluh menit, lalu kembali ke meja. Selama itu, sepuluh meja lain menunggu dipesankan.

Restoran yang bekerja memakai **tiket pesanan**. Pelayan mencatat pesanan, menancapkan tiketnya di jepitan dapur, lalu langsung melayani meja berikutnya. Di dapur ada beberapa koki yang mengambil tiket satu per satu. Tiket yang gagal, misalnya bahannya habis, dikembalikan dengan catatan. Dan ada satu jepitan khusus untuk tiket yang sudah tiga kali gagal, supaya kepala dapur memeriksanya sendiri.

| Dunia restoran | Dunia backend |
| --- | --- |
| Tiket pesanan | Pekerjaan di queue |
| Jepitan tiket | Queue |
| Koki yang mengambil tiket | Worker |
| Beberapa koki bekerja bersamaan | Konkurensi worker |
| Tiket yang dikembalikan dengan catatan | Percobaan ulang |
| Jepitan khusus tiket bermasalah | Dead letter queue |
| Tiket yang sama tertancap dua kali | Pengiriman ganda |
| Nomor meja di tiket, bukan seluruh pesanan tertulis ulang | Muatan berisi id, bukan objek |
| Tiket untuk jam 7 malam | Pekerjaan terjadwal |
| Jepitan yang penuh sampai meluber | Kedalaman queue yang perlu dipantau |

Batas analoginya: koki bisa melihat jepitannya penuh dan berteriak minta bantuan, sedangkan queue tidak memberi tahu siapa pun. Kedalaman queue dan umur pekerjaan tertua adalah dua angka yang **wajib** dipantau, dan bagian akhir modul ini membahasnya.

## Memilih queue

| Pilihan | Penyimpanan | Cocok untuk |
| --- | --- | --- |
| **pg-boss** atau tabel sendiri | Postgres | Sudah punya Postgres, volume sampai puluhan ribu pekerjaan per menit. **Satu transaksi dengan data Anda** |
| **BullMQ** | Redis | Volume tinggi, butuh prioritas, penjadwalan, dan pembatasan laju bawaan |
| **SQS**, Pub/Sub, Service Bus | Layanan cloud | Tidak ingin mengelola apa pun, dan volume sangat besar |
| **Kafka**, NATS | Log peristiwa | Bukan queue pekerjaan, melainkan aliran peristiwa. Modul 15 |

Keputusannya lebih sederhana daripada yang terlihat. **Kalau Anda sudah punya Postgres dan belum punya Redis, pakai Postgres.** Alasannya satu dan menentukan: pekerjaan bisa dimasukkan ke queue **dalam transaksi yang sama** dengan perubahan datanya, sehingga tidak mungkin ada pesanan tanpa pekerjaan email, atau email untuk pesanan yang gagal disimpan.

Dengan Redis, dua penyimpanan berbeda berarti dua hal yang bisa gagal terpisah, dan jalan keluarnya adalah pola outbox di modul 15.

Seri ini memakai **BullMQ** karena fiturnya lengkap dan banyak dipakai, dengan pola outbox sebagai pelengkapnya. Dasar `SKIP LOCKED` dari modul 8 sudah cukup untuk membangun queue Postgres sendiri kalau Anda memilih jalan itu.

## Menyusun pekerjaan

```ts
// src/pekerjaan/jenis.ts
export const JENIS = {
  kirimEmail: 'kirim-email',
  buatStruk: 'buat-struk',
  kirimNotifikasi: 'kirim-notifikasi',
  segarkanRekap: 'segarkan-rekap',
} as const;

// Muatan punya skema, divalidasi saat masuk dan saat diproses
export const muatanKirimEmail = z.object({
  versi: z.literal(1),
  templat: z.enum(['struk-pesanan', 'undangan', 'reset-sandi']),
  // Id, bukan objek. Lihat alasannya di bawah.
  pesananId: z.string().uuid().optional(),
  penggunaId: z.string().uuid(),
  idempotensi: z.string().min(8),
});

export type MuatanKirimEmail = z.infer<typeof muatanKirimEmail>;
```

Empat aturan merancang muatan pekerjaan, dan masing-masing mencegah satu masalah nyata:

**Satu, kirim id, bukan objek.** Muatan berisi seluruh objek pesanan akan basi: saat worker mengambilnya tiga puluh detik kemudian, alamat pengirimannya mungkin sudah diubah pengguna. Dengan id, worker membaca keadaan terkini. Muatan juga jadi kecil, dan itu penting karena queue menyimpan ribuan pekerjaan.

**Dua, muatan punya nomor versi.** Saat Anda merilis versi baru dengan bentuk muatan berbeda, queue masih berisi pekerjaan bentuk lama. Tanpa versi, worker baru akan gagal memprosesnya, dan Anda akan kehilangan pekerjaan.

**Tiga, ada kunci idempotensi.** Queue memberi jaminan **at-least-once**, bukan exactly-once. Jadi setiap penangan harus aman dijalankan dua kali, dan kunci itu alatnya.

**Empat, jangan pernah menaruh rahasia atau data pribadi di muatan.** Muatan tersimpan di Redis atau Postgres, muncul di dasbor pemantauan, dan ikut tercatat saat pekerjaan gagal. Simpan id, baca datanya saat diproses.

## Mendaftarkan dan memproses

```ts
// src/pekerjaan/queue.ts
import { Queue, Worker, type JobsOptions } from 'bullmq';

const sambungan = { connection: { url: config.REDIS_URL } };

export const queueEmail = new Queue(JENIS.kirimEmail, sambungan);

const OPSI_BAWAAN: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 2_000 },  // 2s, 4s, 8s, 16s, 32s
  removeOnComplete: { age: 3600, count: 1_000 },
  removeOnFail: { age: 7 * 24 * 3600 },            // simpan yang gagal seminggu
};

export async function antreanEmail(muatan: MuatanKirimEmail) {
  // Id pekerjaan yang stabil: pendaftaran ganda tidak membuat dua pekerjaan
  return queueEmail.add(JENIS.kirimEmail, muatan, {
    ...OPSI_BAWAAN,
    jobId: `email:${muatan.idempotensi}`,
  });
}
```

```ts
// src/pekerjaan/worker-email.ts
const worker = new Worker<MuatanKirimEmail>(
  JENIS.kirimEmail,
  async (pekerjaan) => {
    // Validasi ulang: muatan bisa dari versi kode sebelumnya
    const muatan = muatanKirimEmail.parse(pekerjaan.data);

    // Penangan harus idempoten: dicatat dulu, dikerjakan kalau belum
    const [baru] = await db.execute(sql`
      INSERT INTO email_terkirim (kunci, templat, pengguna_id)
      VALUES (${muatan.idempotensi}, ${muatan.templat}, ${muatan.penggunaId})
      ON CONFLICT (kunci) DO NOTHING
      RETURNING kunci
    `);

    if (!baru) {
      log.info({ kunci: muatan.idempotensi }, 'email sudah pernah dikirim, dilewati');
      return { dilewati: true };
    }

    const pengguna = await repoPengguna.ambil(muatan.penggunaId);
    if (!pengguna) return { dilewati: true, alasan: 'pengguna sudah dihapus' };

    try {
      await penyediaEmail.kirim({
        ke: pengguna.email,
        templat: muatan.templat,
        data: await susunDataTemplat(muatan),
      });
    } catch (error) {
      // Kegagalan permanen tidak perlu diulang
      if (adalahKegagalanPermanen(error)) {
        await db.execute(sql`
          UPDATE email_terkirim SET status = 'gagal-permanen' WHERE kunci = ${muatan.idempotensi}
        `);
        return { gagal: true, permanen: true };
      }

      // Hapus catatan supaya percobaan ulang benar-benar mengirim
      await db.execute(sql`DELETE FROM email_terkirim WHERE kunci = ${muatan.idempotensi}`);
      throw error;   // BullMQ yang mengatur percobaan ulangnya
    }

    return { terkirim: true };
  },
  {
    ...sambungan,
    concurrency: 10,
    // Hormati batas laju penyedia email
    limiter: { max: 100, duration: 1_000 },
  }
);

worker.on('failed', (pekerjaan, error) => {
  log.error(
    { pekerjaanId: pekerjaan?.id, percobaan: pekerjaan?.attemptsMade, err: error },
    'pekerjaan email gagal'
  );
});

// Penutupan rapi: selesaikan pekerjaan yang sedang jalan, jangan ambil yang baru
for (const sinyal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(sinyal, async () => {
    await worker.close();
    process.exit(0);
  });
}
```

Bagian yang paling menentukan adalah penanganan kegagalan di tengah. Perhatikan tiga cabangnya: kegagalan permanen (alamat email tidak valid) ditandai dan tidak diulang, kegagalan sementara (penyedia gangguan) melepas catatan idempotensi lalu melempar error supaya diulang, dan keberhasilan menyisakan catatan sebagai penjaga.

Membedakan permanen dan sementara adalah pekerjaan yang pantas dikerjakan dengan teliti:

| Jenis kegagalan | Contoh | Diulang? |
| --- | --- | --- |
| Permanen | Alamat email tidak valid, pengguna dihapus, berkas tidak ada | Tidak |
| Sementara | 503 dari penyedia, batas waktu, jaringan terputus | Ya |
| Batas laju | 429 dari penyedia | Ya, dengan jeda sesuai `Retry-After` |
| Bug di kode Anda | `TypeError`, kolom tidak ada | Tidak, dan harus terlihat di peringatan |

Mengulang kegagalan permanen membuang sumber daya dan menunda pekerjaan lain. Tidak mengulang kegagalan sementara berarti kehilangan email karena penyedia sempat gangguan dua detik.

## Jalur pesanan setelah dirapikan

```ts
export async function buatPesanan(/* ... */) {
  const pesanan = await dalamTransaksi(db, async (tx) => {
    // ... validasi, stok, simpan: 32 ms seperti sebelumnya

    // Pekerjaan dicatat di tabel outbox, dalam transaksi yang sama.
    // Pesanan tersimpan tanpa pekerjaan jadi mustahil.
    await repoOutbox(tx).tambah([
      { jenis: JENIS.kirimEmail, muatan: { versi: 1, templat: 'struk-pesanan', pesananId, penggunaId, idempotensi: `struk:${pesananId}` } },
      { jenis: JENIS.buatStruk, muatan: { versi: 1, pesananId, idempotensi: `pdf:${pesananId}` } },
      { jenis: JENIS.kirimNotifikasi, muatan: { versi: 1, pesananId, idempotensi: `notif:${pesananId}` } },
    ]);

    return pesananTersimpan;
  });

  return pesanan;   // dikembalikan dalam 32 ms
}
```

Satu pengirim outbox berjalan terpisah, membaca tabel itu, dan memasukkan pekerjaannya ke queue:

```ts
// Dijalankan setiap detik. Pola lengkapnya di modul 15.
async function kirimOutbox() {
  const batch = await db.execute(sql`
    UPDATE outbox SET status = 'diproses', diambil_pada = now()
    WHERE id IN (
      SELECT id FROM outbox
      WHERE status = 'menunggu'
      ORDER BY dibuat_pada
      LIMIT 100
      FOR UPDATE SKIP LOCKED      -- pelajaran modul 8
    )
    RETURNING *
  `);

  for (const baris of batch) {
    await queueUntuk(baris.jenis).add(baris.jenis, baris.muatan, {
      jobId: `${baris.jenis}:${baris.muatan.idempotensi}`,
    });
    await db.execute(sql`UPDATE outbox SET status = 'terkirim' WHERE id = ${baris.id}`);
  }
}
```

Hasilnya: pengguna mendapat respons dalam 32 ms, dan empat pekerjaan berjalan di belakang. Kalau layanan email gangguan, pesanan tetap berhasil dan emailnya terkirim saat penyedia pulih.

## Penjadwalan

Tiga kebutuhan yang selalu muncul:

```ts
// 1. Tertunda: batalkan pesanan yang tidak dibayar dalam 1 jam
await queuePesanan.add(
  'batalkan-jika-belum-dibayar',
  { versi: 1, pesananId, idempotensi: `batal:${pesananId}` },
  { delay: 60 * 60 * 1000, jobId: `batal:${pesananId}` }
);

// 2. Berulang: segarkan rekap tiap 10 menit
await queueRekap.upsertJobScheduler(
  'rekap-berkala',
  { pattern: '*/10 * * * *' },
  { name: JENIS.segarkanRekap, data: { versi: 1 } }
);

// 3. Ditunda dengan penggabungan: banyak perubahan, satu penyegaran
await queueIndeks.add(
  'segarkan-indeks-pencarian',
  { versi: 1, produkId },
  {
    jobId: `indeks:${produkId}`,   // id sama: pendaftaran berikutnya diabaikan
    delay: 5_000,
  }
);
```

Nomor tiga pola yang sangat berguna: saat seorang admin mengubah satu produk lima kali dalam sepuluh detik, yang dibutuhkan satu penyegaran indeks, bukan lima. Dengan `jobId` yang sama dan penundaan, pendaftaran berikutnya tidak membuat pekerjaan baru.

Untuk pekerjaan berulang, satu hal yang wajib diperhatikan: **pekerjaan terjadwal harus tetap benar kalau terlewat.** Server yang mati selama dua jam akan melewatkan dua belas penyegaran rekap. Penangan yang menghitung ulang seluruh rekap akan pulih sendiri, sedangkan penangan yang hanya menambahkan selisih dari sepuluh menit terakhir akan kehilangan data secara permanen. Rancang penangan berulang agar **menghitung dari keadaan**, bukan dari selisih.

## Operasional worker

Enam hal yang membedakan worker yang bisa dirawat dari yang jadi sumber insiden:

**Satu, worker berjalan sebagai proses terpisah dari API.** Alasannya: beban keduanya berbeda, dan Anda ingin bisa menambah worker tanpa menambah instance API. Satu proses yang melayani HTTP sekaligus memproses pekerjaan berat akan membuat permintaan HTTP melambat setiap kali ada pekerjaan besar, persis masalah modul 2.

**Dua, konkurensi dibatasi dan dihitung.** `concurrency: 10` pada worker yang setiap pekerjaannya memakai satu sambungan basis data berarti sepuluh sambungan dari pool. Dengan tiga worker, tiga puluh sambungan, dan itu harus masuk perhitungan dari modul 7.

**Tiga, penutupan yang rapi.** Saat container dimatikan, worker harus berhenti mengambil pekerjaan baru dan menyelesaikan yang sedang jalan. Tanpa itu, pekerjaan terputus di tengah dan diulang dari awal, dan kalau tidak idempoten, akibatnya ganda.

**Empat, pekerjaan yang menggantung harus kembali.** Kalau worker mati mendadak, pekerjaan yang dipegangnya harus bisa diambil worker lain. BullMQ melakukannya lewat mekanisme stalled job, dan nilainya perlu disesuaikan dengan pekerjaan terlama Anda. Terlalu pendek berarti pekerjaan panjang diambil dua kali.

**Lima, batas waktu per pekerjaan.** Pekerjaan tanpa batas waktu bisa menggantung selamanya dan menahan slot konkurensi.

**Enam, pantau tiga angka ini**, dan beri peringatan pada ketiganya:

| Angka | Artinya | Peringatan saat |
| --- | --- | --- |
| Kedalaman queue | Pekerjaan menunggu | Naik terus selama 10 menit |
| Umur pekerjaan tertua | Berapa lama pekerjaan menunggu | Melebihi batas yang dijanjikan ke pengguna |
| Jumlah di dead letter queue | Pekerjaan yang gagal permanen | Lebih dari nol |

Angka kedua yang paling berguna dan paling sering tidak dipantau. Kedalaman 10.000 pekerjaan tidak selalu masalah kalau worker Anda menyelesaikan 5.000 per menit. Umur tertua 40 menit pada queue email adalah masalah, berapa pun kedalamannya.

## Dead letter queue

Pekerjaan yang gagal setelah semua percobaan tidak boleh hilang tanpa jejak.

```ts
worker.on('failed', async (pekerjaan, error) => {
  if (!pekerjaan || pekerjaan.attemptsMade < (pekerjaan.opts.attempts ?? 1)) return;

  // Percobaan terakhir sudah gagal: simpan untuk ditangani manusia
  await db.execute(sql`
    INSERT INTO pekerjaan_gagal (jenis, muatan, kesalahan, percobaan, gagal_pada)
    VALUES (${pekerjaan.name}, ${JSON.stringify(pekerjaan.data)},
            ${error.message}, ${pekerjaan.attemptsMade}, now())
  `);

  metrik.pekerjaanGagalPermanen.inc({ jenis: pekerjaan.name });
});
```

Dan satu endpoint admin untuk memasukkannya kembali setelah penyebabnya diperbaiki:

```ts
app.post('/v1/admin/pekerjaan-gagal/:id/ulang', async (req) => {
  pastikanBoleh(req.pelaku, 'pekerjaan:kelola');

  const gagal = await repoPekerjaanGagal.ambil(req.params.id);
  if (!gagal) throw new ErrorTidakDitemukan();

  // Muatan asli dipakai ulang, termasuk kunci idempotensinya,
  // sehingga pekerjaan yang ternyata sudah berhasil sebagian tidak dobel
  await queueUntuk(gagal.jenis).add(gagal.jenis, gagal.muatan);
  await repoPekerjaanGagal.tandaiDiulang(gagal.id);

  return { ok: true };
});
```

Kemampuan memasukkan kembali pekerjaan yang gagal adalah fitur operasional yang akan Anda syukuri saat penyedia email gangguan enam jam dan tiga ribu email tertahan.

## Latihan

### Latihan 1: Pindahkan empat pekerjaan keluar dari permintaan

Ambil jalur pembuatan pesanan dari Proyek 2, pindahkan email, PDF, notifikasi, dan penyegaran rekap ke queue. Ukur latensi p95 sebelum dan sesudah, lalu uji satu hal: matikan penyedia email dan pastikan pesanan tetap berhasil.

> [!petunjuk]
> Jangan masukkan pekerjaan ke queue langsung dari dalam transaksi basis data. Pakai tabel outbox seperti di contoh, dan buat satu proses pengirim sederhana yang jalan setiap detik. Alasan lengkapnya ada di modul 15, dan Anda akan merasakannya sendiri saat menguji kegagalan.

> [!jawaban]
>
> Hasil khas:
>
> | | Sebelum | Sesudah |
> | --- | --- | --- |
> | Latensi p95 | 3.400 ms | 48 ms |
> | Pesanan gagal saat penyedia email mati | **100%** | 0% |
> | Email terkirim saat penyedia pulih | Tidak pernah | Semua |
> | Beban CPU saat ramai | Tinggi, PDF memblokir event loop | Pindah ke proses worker |
>
> Empat hal yang akan Anda temukan saat mengerjakannya:
>
> 1. **Latensi turun 70 kali, dan itu bukan bagian paling berharga.** Yang lebih berharga: pesanan tidak lagi gagal karena layanan pihak ketiga. Ini pelajaran modul 19 yang muncul lebih awal.
> 2. **Pembuatan PDF di worker menyelesaikan masalah modul 2 sekaligus.** Pekerjaan yang memblokir event loop sekarang berada di proses yang memang untuk itu, dan API tetap responsif.
> 3. **Anda akan menemukan pekerjaan kelima yang tidak terpikir**, biasanya pembaruan indeks pencarian atau sinkronisasi ke sistem akuntansi. Begitu polanya ada, memindahkan yang berikutnya jadi mudah.
> 4. **Satu hal baru harus diputuskan: apa yang dilihat pengguna.** Pesanan kembali dalam 48 ms dengan status "menunggu", dan struk PDF belum ada. Antarmuka perlu menyatakan itu dengan jujur, misalnya "struk akan dikirim ke email Anda dalam beberapa menit", bukan menampilkan tautan unduh yang belum ada isinya.
>
> Poin keempat itu pekerjaan desain, bukan pekerjaan teknis, dan selalu muncul saat sesuatu dipindahkan ke latar belakang.

### Latihan 2: Buat lima penangan idempoten

Lima pekerjaan ini akan dijalankan dua kali pada suatu hari, karena queue memberi jaminan at-least-once. Untuk masing-masing, rancang cara membuatnya aman.

| # | Pekerjaan |
| --- | --- |
| 1 | Kirim email struk pesanan |
| 2 | Kurangi stok setelah pembayaran dikonfirmasi |
| 3 | Buat PDF struk dan simpan ke penyimpanan objek |
| 4 | Tambahkan poin loyalitas 1% dari nilai pesanan |
| 5 | Segarkan rekap penjualan harian |

> [!pembahasan]
>
> | # | Cara | Kuncinya |
> | --- | --- | --- |
> | 1 | Catatan `email_terkirim` dengan kunci unik, `ON CONFLICT DO NOTHING` | `struk:{pesananId}` |
> | 2 | **Jangan di pekerjaan latar.** Kurangi di dalam transaksi pesanan | Tidak berlaku |
> | 3 | Nama objek yang deterministik, lalu timpa | `struk/{pesananId}.pdf` |
> | 4 | Tabel mutasi poin dengan kunci unik per sumber | `pesanan:{pesananId}` |
> | 5 | Hitung ulang dari keadaan, bukan menambahkan selisih | Tidak perlu kunci |
>
> Lima penjelasan, dan masing-masing mewakili satu pola yang berbeda:
>
> **Nomor 1: catatan sebelum mengerjakan.** Pola paling umum. Yang perlu diperhatikan adalah urutan dan penanganan kegagalan, seperti di contoh worker email: catatan dihapus kalau pengirimannya gagal sementara, supaya percobaan ulang benar-benar mengirim.
>
> **Nomor 2 adalah jebakan.** Pengurangan stok **tidak boleh** jadi pekerjaan latar, karena pengguna perlu tahu seketika apakah barangnya tersedia. Kalau dipindahkan ke latar, Anda baru menolak pesanan beberapa detik setelah pengguna menerima konfirmasi. Tidak semua pekerjaan pantas dipindahkan, dan menyadarinya adalah bagian dari keterampilan ini.
>
> **Nomor 3: operasi yang idempoten secara alami.** Menulis ke `struk/{pesananId}.pdf` dua kali menghasilkan satu berkas dengan isi yang sama. Tidak perlu kunci, tidak perlu catatan. Inilah bentuk terbaik: **rancang operasinya agar pengulangan tidak berakibat**, daripada menambahkan penjaga.
>
> **Nomor 4: yang paling berbahaya kalau salah.** Poin yang ditambahkan dua kali adalah uang yang hilang. `UPDATE pengguna SET poin = poin + 100` tidak idempoten. Yang benar: tabel mutasi dengan batasan unik pada sumbernya, lalu saldo poin dihitung dari mutasi atau diperbarui dalam transaksi yang sama.
>
> ```sql
> CREATE TABLE mutasi_poin (
>   id         uuid PRIMARY KEY,
>   pengguna_id uuid NOT NULL REFERENCES pengguna(id),
>   sumber     text NOT NULL,          -- 'pesanan:0192...'
>   jumlah     integer NOT NULL,
>   dibuat_pada timestamptz NOT NULL DEFAULT now(),
>
>   UNIQUE (sumber)                     -- pengulangan ditolak basis data
> );
> ```
>
> **Nomor 5: menghitung dari keadaan.** Penangan yang menjalankan `REFRESH MATERIALIZED VIEW` aman dijalankan berapa kali pun, dan sekaligus memulihkan diri kalau beberapa jadwal terlewat. Bandingkan dengan penangan yang menambahkan penjualan sepuluh menit terakhir ke rekap: dijalankan dua kali berarti angka ganda, dan terlewat sekali berarti data hilang permanen.

### Latihan 3: Rancang percobaan ulang untuk enam kegagalan

Untuk enam kegagalan berikut, tentukan: diulang atau tidak, berapa kali, jeda seperti apa, dan apa yang terjadi setelah percobaan terakhir.

| # | Kegagalan |
| --- | --- |
| 1 | Penyedia email menjawab 503 |
| 2 | Penyedia email menjawab 429 dengan `Retry-After: 60` |
| 3 | Alamat email tidak valid |
| 4 | Pengguna sudah dihapus saat pekerjaan diproses |
| 5 | Basis data menolak sambungan |
| 6 | `TypeError: cannot read properties of undefined` |

> [!jawaban]
>
> | # | Diulang | Jeda | Setelah gagal total |
> | --- | --- | --- | --- |
> | 1 | Ya, 5 kali | Eksponensial dengan jitter: 2s, 4s, 8s, 16s, 32s | Dead letter queue, peringatan kalau banyak |
> | 2 | Ya, tak dihitung sebagai percobaan | **Sesuai `Retry-After`** | Jarang terjadi |
> | 3 | **Tidak** | | Tandai, catat, dan beri tahu pemilik data |
> | 4 | **Tidak** | | Selesai dengan status dilewati, bukan gagal |
> | 5 | Ya, 3 kali | Eksponensial | Dead letter queue, **dan peringatan segera** |
> | 6 | **Tidak** | | Dead letter queue, **peringatan ke pengembang** |
>
> Lima penjelasan yang paling penting:
>
> **Nomor 2 butuh perlakuan khusus.** 429 berarti "Anda mengirim terlalu cepat", dan mengulanginya dengan jeda eksponensial biasa akan tetap terlalu cepat. Pakai `Retry-After` dari respons, dan jangan hitung sebagai percobaan karena ini bukan kegagalan.
>
> ```ts
> if (error.status === 429) {
>   const jeda = Number(error.headers?.['retry-after'] ?? 60) * 1000;
>   await pekerjaan.moveToDelayed(Date.now() + jeda, pekerjaan.token);
>   return;   // tidak menambah hitungan percobaan
> }
> ```
>
> **Nomor 4 adalah keberhasilan, bukan kegagalan.** Pengguna yang sudah dihapus berarti pekerjaan ini tidak perlu dikerjakan lagi. Mencatatnya sebagai gagal akan mengisi dasbor dengan kebisingan dan menyembunyikan kegagalan yang nyata.
>
> **Nomor 6 harus terlihat segera.** `TypeError` adalah bug di kode Anda, dan mengulanginya lima kali hanya menunda penemuannya. Yang perlu: langsung ke dead letter queue dengan peringatan ke pengembang, bukan percobaan ulang yang pasti gagal.
>
> **Jitter wajib ada pada jeda eksponensial.** Tanpa itu, seribu pekerjaan yang gagal bersamaan akan mencoba ulang bersamaan pada detik yang sama, dan memukul penyedia yang baru pulih sampai tumbang lagi. Pola ini punya nama: thundering herd, dan sama dengan cache stampede di modul 13.
>
> ```ts
> backoff: {
>   type: 'custom',
> },
> settings: {
>   backoffStrategy: (percobaan: number) =>
>     Math.min(60_000, 2 ** percobaan * 1_000) * (0.5 + Math.random()),
> },
> ```
>
> **Dan satu aturan yang menaungi semuanya: percobaan ulang hanya aman kalau penangannya idempoten.** Mengulang pekerjaan yang menambahkan poin tanpa penjaga berarti poin ganda. Urutan yang benar: buat penangan idempoten dulu, baru nyalakan percobaan ulang.

### Latihan 4: Hitung kapasitas dan pasang peringatan

Queue email Anda menerima 50 pekerjaan per detik pada jam sibuk. Satu email butuh 400 ms, dan penyedia membatasi 100 per detik. Hitung konfigurasi worker yang dibutuhkan, lalu rancang peringatannya.

> [!jawaban]
>
> **Perhitungan kapasitas:**
>
> Satu slot konkurensi menyelesaikan 1 / 0,4 = 2,5 pekerjaan per detik. Untuk 50 per detik dibutuhkan 50 / 2,5 = **20 slot konkurensi**.
>
> Batas penyedia 100 per detik berarti kapasitas maksimum Anda 100 per detik, jadi 20 slot (yang menghasilkan 50 per detik) masih aman. Dengan kelonggaran untuk lonjakan: 30 slot, menghasilkan 75 per detik, masih di bawah batas.
>
> ```ts
> // 3 proses worker, masing-masing konkurensi 10
> new Worker(JENIS.kirimEmail, penangan, {
>   concurrency: 10,
>   // Limiter dibagi antar worker lewat Redis, jadi nilainya untuk seluruh grup
>   limiter: { max: 90, duration: 1_000 },
> });
> ```
>
> Dan pengaruhnya ke tempat lain, yang sering terlupakan: 30 slot yang masing-masing memakai satu sambungan basis data berarti **30 sambungan tambahan**. Itu harus masuk perhitungan pool dari modul 7, dan pada basis data 4 inti, 30 sambungan dari worker saja sudah terlalu banyak. Jalan keluarnya: kurangi pekerjaan basis data per pekerjaan email, atau turunkan konkurensi dan terima queue yang lebih panjang.
>
> **Peringatan yang dipasang:**
>
> | Peringatan | Ambang | Tingkat |
> | --- | --- | --- |
> | Umur pekerjaan tertua | Di atas 5 menit selama 5 menit | Peringatan |
> | Umur pekerjaan tertua | Di atas 30 menit | Mendesak |
> | Kedalaman queue | Naik terus 15 menit tanpa turun | Peringatan |
> | Pekerjaan gagal permanen | Lebih dari 10 dalam 1 jam | Peringatan |
> | Worker aktif | Nol selama 2 menit | **Mendesak** |
> | Tingkat kegagalan | Di atas 5% dalam 10 menit | Peringatan |
>
> Tiga catatan tentang daftar ini:
>
> 1. **Baris kelima yang paling sering menyelamatkan.** Worker yang mati tanpa ada yang tahu adalah kegagalan paling tenang di seluruh sistem: API tetap sehat, semua permintaan 200, dan tidak ada satu pun email terkirim selama enam jam. Pantau bahwa worker **ada**, bukan hanya bahwa queue-nya pendek.
> 2. **Umur pekerjaan tertua lebih berguna daripada kedalaman.** Kedalaman 50.000 pada queue yang menyelesaikan 10.000 per menit adalah keadaan normal selama lonjakan. Umur tertua 40 menit selalu berarti masalah.
> 3. **Ambangnya diturunkan dari janji ke pengguna.** Kalau antarmuka Anda mengatakan "struk dikirim dalam beberapa menit", maka 30 menit adalah pelanggaran janji, dan itu yang pantas jadi peringatan mendesak. Angka ambang tanpa janji yang mendasarinya hanyalah tebakan.

## Batasnya

Queue menyelesaikan pekerjaan yang tidak perlu ditunggu, dan tiga hal tetap terbuka.

**Satu transaksi tidak bisa mencakup basis data dan queue.** Memasukkan pekerjaan ke Redis dari dalam transaksi Postgres bisa berakhir dengan pekerjaan yang masuk padahal transaksinya gagal, atau sebaliknya. Pola outbox yang dipakai di modul ini baru dijelaskan sebagian, dan lengkapnya di modul 15.

**Queue adalah penyampaian satu arah ke satu penerima.** Kalau lima bagian sistem perlu bereaksi terhadap satu kejadian, mendaftarkan lima pekerjaan dari satu tempat berarti tempat itu harus tahu kelima penerimanya. Itu masalah penggandengan yang dijawab arsitektur berbasis peristiwa.

**Pekerjaan latar tidak menjawab kebutuhan waktu nyata.** Pengguna yang menunggu status pesanannya berubah masih harus memuat ulang halaman, dan itu modul 16.

## Rangkuman

- Apa pun yang pengguna tidak perlu menunggunya dipindahkan keluar dari jalur permintaan. Dan yang lebih penting: kegagalan layanan pihak ketiga tidak boleh menggagalkan operasi inti.
- Kalau sudah punya Postgres dan belum punya Redis, queue di Postgres memberi satu keuntungan besar: pendaftaran pekerjaan bisa satu transaksi dengan datanya.
- Muatan pekerjaan berisi id, bukan objek, punya nomor versi, punya kunci idempotensi, dan tidak pernah berisi rahasia.
- Queue memberi jaminan at-least-once. Setiap penangan **harus** aman dijalankan dua kali, dan bentuk terbaiknya adalah operasi yang idempoten secara alami.
- Bedakan kegagalan permanen dari sementara. Mengulang yang permanen membuang sumber daya, dan tidak mengulang yang sementara menghilangkan pekerjaan.
- Jeda eksponensial wajib punya jitter, atau seribu pekerjaan yang gagal bersamaan akan mencoba ulang bersamaan.
- Tidak semua pekerjaan pantas dipindahkan. Pengurangan stok tetap di dalam permintaan, karena pengguna perlu tahu seketika.
- Pekerjaan berulang dirancang menghitung dari keadaan, bukan dari selisih, supaya jadwal yang terlewat pulih sendiri.
- Worker berjalan sebagai proses terpisah, dengan konkurensi yang ikut dihitung dalam ukuran pool basis data.
- Pantau umur pekerjaan tertua, bukan hanya kedalaman queue, dan pantau bahwa worker-nya masih hidup.
- Pekerjaan yang gagal permanen disimpan beserta muatannya, dan ada cara memasukkannya kembali setelah penyebabnya diperbaiki.

## Masalah terbuka

Queue Anda bekerja, dan satu masalah baru muncul begitu sistemnya bertumbuh.

Sekarang ada lima bagian yang perlu bereaksi saat sebuah pesanan dibayar: gudang menyiapkan barang, akuntansi mencatat pendapatan, layanan loyalitas menambahkan poin, layanan notifikasi memberi tahu pembeli, dan layanan analitik memperbarui laporan.

Dikerjakan dengan queue seperti modul ini, fungsi `tandaiDibayar` harus mendaftarkan lima pekerjaan. Artinya kode pembayaran **tahu tentang kelima bagian itu**. Menambah bagian keenam berarti mengubah kode pembayaran. Dan kalau pendaftaran pekerjaan ketiga gagal, dua yang pertama sudah terdaftar sementara tiga sisanya tidak.

Lebih jauh lagi: ada satu pertanyaan yang belum pernah dijawab sejak modul ini. Pekerjaan dimasukkan ke Redis, sedangkan pesanan tersimpan di Postgres. Kalau proses mati tepat di antara keduanya, apa yang terjadi?

Itu isi modul berikutnya: arsitektur berbasis peristiwa, pola outbox yang lengkap, dan cara banyak bagian sistem bereaksi terhadap satu kejadian tanpa saling mengenal.
