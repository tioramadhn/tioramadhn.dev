---
title: 'Modul 15: Arsitektur Berbasis Peristiwa'
description: Lima bagian sistem perlu bereaksi terhadap satu kejadian, tanpa kode kejadian itu mengenal kelimanya. Peristiwa, pola outbox yang lengkap, dan konsumen yang aman menerima pesan dua kali.
date: 2026-12-19
slug: modul-15-arsitektur-berbasis-peristiwa
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Modul sebelumnya menutup dengan dua masalah. Yang pertama soal penggandengan:

```ts
// Fungsi pembayaran yang tahu tentang lima bagian lain
async function tandaiDibayar(pesananId: string) {
  await repoPesanan.tandaiDibayar(pesananId);

  await queueGudang.add('siapkan-barang', { pesananId });
  await queueAkuntansi.add('catat-pendapatan', { pesananId });
  await queueLoyalitas.add('tambah-poin', { pesananId });
  await queueNotifikasi.add('beri-tahu-pembeli', { pesananId });
  await queueAnalitik.add('perbarui-laporan', { pesananId });
}
```

Menambah bagian keenam berarti mengubah fungsi ini. Dan kalau pendaftaran ketiga gagal, dua yang pertama sudah terdaftar sementara tiga sisanya tidak.

Yang kedua soal jaminan: pesanan tersimpan di Postgres, pekerjaan masuk ke Redis. Kalau proses mati tepat di antara keduanya, pesanan tersimpan tanpa satu pun pekerjaan berjalan, dan tidak ada yang tahu.

Modul ini menyelesaikan keduanya dengan satu pergeseran cara berpikir: **berhenti memberi tahu siapa harus mengerjakan apa, dan mulai menyatakan apa yang telah terjadi.**

```ts
// Yang tahu hanya satu hal: pesanan sudah dibayar
async function tandaiDibayar(pesananId: string) {
  await dalamTransaksi(db, async (tx) => {
    await repoPesanan(tx).tandaiDibayar(pesananId);

    await repoOutbox(tx).terbitkan({
      jenis: 'pesanan.dibayar',
      kunciAgregat: pesananId,
      muatan: { pesananId, total: pesanan.totalRp, pembeliId: pesanan.pembeliId },
    });
  });
}
```

Siapa yang bereaksi bukan urusan fungsi ini. Bagian keenam bisa ditambahkan tanpa menyentuh satu baris pun di sini.

## Perintah dan peristiwa

Pembedaan ini menentukan seluruh desain, dan mudah dicampur.

|  | Perintah | Peristiwa |
| --- | --- | --- |
| Arti | "Kerjakan ini" | "Ini sudah terjadi" |
| Nama | Kata kerja perintah: `kirim-email` | Kata kerja selesai: `pesanan.dibayar` |
| Penerima | Satu, dan pengirim tahu siapa | Banyak, dan penerbit tidak tahu siapa |
| Bisa ditolak | Ya | Tidak. Sudah terjadi |
| Siapa yang menentukan isinya | Pengirim | Penerbit, dari kejadian nyata |
| Alat | Queue pekerjaan (modul 14) | Topik peristiwa, broker |

Keduanya dipakai bersama, dan pembagiannya biasanya begini: **peristiwa diterbitkan oleh yang mengetahui kejadiannya, lalu konsumen peristiwa mendaftarkan perintah untuk pekerjaannya sendiri.**

```text
pesanan.dibayar  (peristiwa)
   |
   +--> konsumen notifikasi --> queue: kirim-email        (perintah)
   +--> konsumen loyalitas  --> queue: tambah-poin        (perintah)
   +--> konsumen gudang     --> queue: cetak-label        (perintah)
   +--> konsumen analitik   --> perbarui tabel rekap
```

Kesalahan yang paling sering: **peristiwa yang sebenarnya perintah.** Nama seperti `pesanan.kirim-email` adalah perintah yang menyamar, dan tandanya satu: kalau tidak ada yang mengonsumsinya, penerbitnya bermasalah. Peristiwa yang benar tetap sah diterbitkan meski tidak ada satu pun pendengar.

## Analogi: papan pengumuman, bukan surat tugas

Modul 14 memakai tiket pesanan yang ditancapkan untuk koki. Peristiwa bekerja berbeda.

Bayangkan kantor yang punya **papan pengumuman**. Saat sebuah pembayaran diterima, bagian kasir menempel pengumuman: "pembayaran untuk nomor 1042 sudah diterima, jumlahnya segini, pukul segini". Kasir tidak tahu siapa yang akan membacanya, dan tidak peduli.

Bagian gudang membaca papan setiap pagi dan mencatat sampai mana dia sudah membaca. Bagian akuntansi juga. Bagian baru yang dibentuk bulan depan bisa mulai membaca dari pengumuman hari ini, atau dari awal kalau dia butuh riwayat.

| Dunia papan pengumuman | Dunia backend |
| --- | --- |
| Pengumuman yang ditempel | Peristiwa |
| Papan itu sendiri | Topik atau aliran |
| "Sampai mana saya sudah membaca" | Offset konsumen |
| Beberapa bagian membaca papan yang sama | Beberapa consumer group |
| Pengumuman disusun urut waktu per nomor pesanan | Urutan per kunci partisi |
| Bagian baru membaca dari awal | Pemutaran ulang |
| Pengumuman yang tertempel dua kali | Pengiriman ganda |
| Buku catatan "nomor ini sudah saya kerjakan" | Tabel deduplikasi |

Batas analoginya yang penting: pengumuman kertas bisa dibaca orang yang kebetulan lewat, sedangkan konsumen peristiwa harus mendaftar dan mencatat posisinya sendiri. Dan papan kertas punya batas ukuran fisik, sementara aliran peristiwa punya masa simpan yang Anda tentukan, dan itu menentukan apakah pemutaran ulang mungkin dilakukan.

## Pola outbox, lengkap

Inilah jawaban untuk masalah kedua: satu transaksi tidak bisa mencakup Postgres dan broker.

```sql
CREATE TABLE outbox (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  jenis         text NOT NULL,
  kunci_agregat text NOT NULL,     -- menentukan urutan, biasanya id entitas
  muatan        jsonb NOT NULL,
  versi         smallint NOT NULL DEFAULT 1,
  tenant_id     uuid,
  jejak_id      text,              -- id penelusuran dari permintaan asal
  dibuat_pada   timestamptz NOT NULL DEFAULT now(),
  terkirim_pada timestamptz,
  percobaan     smallint NOT NULL DEFAULT 0,
  kesalahan     text
);

-- Indeks hanya untuk yang belum terkirim: kecil dan tetap kecil
CREATE INDEX outbox_menunggu ON outbox (id) WHERE terkirim_pada IS NULL;
```

```ts
// Penerbitan: satu transaksi dengan perubahan datanya
export function repoOutbox(tx: Database) {
  return {
    async terbitkan(peristiwa: PeristiwaBaru | PeristiwaBaru[]) {
      const daftar = Array.isArray(peristiwa) ? peristiwa : [peristiwa];

      await tx.insert(outbox).values(
        daftar.map((p) => ({
          jenis: p.jenis,
          kunciAgregat: p.kunciAgregat,
          muatan: p.muatan,
          versi: p.versi ?? 1,
          tenantId: p.tenantId,
          jejakId: konteksJejak.ambil()?.jejakId,
        }))
      );
    },
  };
}
```

```ts
// Pengirim: proses terpisah yang membaca outbox lalu meneruskan ke broker
export async function jalankanPengirimOutbox() {
  while (berjalan) {
    const batch = await db.transaction(async (tx) => {
      // SKIP LOCKED dari modul 8: beberapa pengirim bisa jalan bersamaan
      return tx.execute(sql`
        SELECT * FROM outbox
        WHERE terkirim_pada IS NULL
        ORDER BY id
        LIMIT 200
        FOR UPDATE SKIP LOCKED
      `);
    });

    if (batch.length === 0) {
      await tidur(500);
      continue;
    }

    for (const baris of batch) {
      try {
        await broker.terbitkan({
          topik: baris.jenis,
          // Kunci partisi menjamin urutan untuk satu entitas
          kunci: baris.kunci_agregat,
          // Id peristiwa dari id baris: stabil, dan jadi dasar deduplikasi
          id: `outbox-${baris.id}`,
          muatan: baris.muatan,
          header: { versi: String(baris.versi), jejakId: baris.jejak_id },
        });

        await db.execute(sql`
          UPDATE outbox SET terkirim_pada = now() WHERE id = ${baris.id}
        `);
      } catch (error) {
        await db.execute(sql`
          UPDATE outbox
          SET percobaan = percobaan + 1, kesalahan = ${String(error)}
          WHERE id = ${baris.id}
        `);

        // Jangan lanjut ke baris berikutnya untuk kunci yang sama,
        // karena urutannya akan rusak
        break;
      }
    }
  }
}
```

Lima hal yang membuat pola ini bekerja:

**Satu, penerbitan dan perubahan data dalam satu transaksi.** Tidak mungkin ada pesanan dibayar tanpa peristiwanya, dan tidak mungkin ada peristiwa untuk transaksi yang di-rollback. Inilah satu-satunya cara mendapat jaminan itu tanpa transaksi terdistribusi.

**Dua, id peristiwa berasal dari id baris outbox.** Stabil, berurutan, dan jadi dasar deduplikasi di sisi konsumen. Membuat UUID baru setiap kali mengirim akan membuat pengiriman ulang terlihat sebagai peristiwa berbeda.

**Tiga, `kunci_agregat` jadi kunci partisi.** Semua peristiwa untuk satu pesanan masuk ke partisi yang sama, sehingga urutannya terjaga. Urutan global tidak dijamin, dan hampir selalu tidak dibutuhkan.

**Empat, `break` saat gagal, bukan `continue`.** Melanjutkan ke baris berikutnya saat satu baris gagal akan membuat peristiwa nomor 5 terkirim sebelum nomor 4, dan konsumen menerima "pesanan dikirim" sebelum "pesanan dibayar".

**Lima, jaminannya at-least-once.** Kalau proses mati setelah broker menerima tapi sebelum `terkirim_pada` disimpan, peristiwa itu akan dikirim ulang. Itu disengaja: lebih baik dua kali daripada hilang, dan konsumen yang menanganinya.

Alternatif yang perlu Anda tahu: **CDC**, yaitu membaca log replikasi Postgres langsung dengan alat seperti Debezium. Keuntungannya tidak perlu tabel outbox dan tidak ada jeda polling. Harganya: satu komponen infrastruktur baru yang perlu dirawat, dan peristiwanya berbentuk perubahan baris, bukan peristiwa domain yang Anda rancang. Untuk sebagian besar tim, outbox lebih sederhana dan cukup.

## Merancang peristiwa

```ts
// src/peristiwa/kontrak.ts
export const pesananDibayarV1 = z.object({
  versi: z.literal(1),
  pesananId: z.string().uuid(),
  pembeliId: z.string().uuid(),
  tenantId: z.string().uuid(),
  totalRp: z.number().int().nonnegative(),
  dibayarPada: z.string().datetime(),
  metodePembayaran: z.enum(['transfer', 'kartu', 'ewallet']),
});

export type PesananDibayarV1 = z.infer<typeof pesananDibayarV1>;
```

Tujuh aturan merancang peristiwa:

| Aturan | Alasan |
| --- | --- |
| Nama memakai bentuk lampau: `pesanan.dibayar` | Peristiwa adalah fakta, bukan permintaan |
| Punya nomor versi di dalam muatan | Konsumen lama harus tetap bisa membacanya |
| Memuat id entitas dan tenant | Konsumen butuh keduanya untuk otorisasi dan penyaringan |
| Memuat waktu kejadian, bukan waktu pengiriman | Peristiwa bisa tiba terlambat, dan waktunya tetap waktu kejadian |
| Tidak memuat data pribadi yang tidak perlu | Peristiwa tersimpan lebih lama dan dibaca lebih banyak sistem |
| Perubahan hanya aditif | Menambah field aman, menghapus dan mengganti tipe merusak |
| Punya skema yang diperiksa saat diterbitkan | Supaya peristiwa rusak tidak masuk aliran |

Satu keputusan yang selalu muncul: **berapa banyak data yang dimuat?**

| Bentuk | Isi | Kelebihan | Kekurangan |
| --- | --- | --- | --- |
| Tipis | Hanya id dan jenis | Kecil, tidak pernah basi, tidak bocor data | Setiap konsumen harus memanggil kembali pemiliknya |
| **Sedang** | Id plus field yang hampir pasti dibutuhkan | Sebagian besar konsumen tidak perlu memanggil balik | Butuh pertimbangan field mana |
| Tebal | Seluruh entitas | Konsumen mandiri sepenuhnya | Besar, mudah basi, dan membocorkan data ke sistem yang tidak membutuhkannya |

Rekomendasi: **sedang.** Muat id, tenant, waktu, dan beberapa field yang hampir pasti dibutuhkan semua konsumen, misalnya total pesanan. Jangan muat seluruh daftar item beserta alamat pembeli, karena hanya satu konsumen yang membutuhkannya dan dia bisa memanggil balik.

Dan satu peringatan tentang peristiwa tebal: isinya adalah **foto saat kejadian**, bukan keadaan sekarang. Konsumen yang memakai alamat dari peristiwa yang tiba lima menit kemudian akan memakai alamat yang mungkin sudah diubah. Untuk hal yang harus mutakhir, panggil balik pemiliknya.

## Konsumen yang aman menerima dua kali

Jaminan at-least-once berarti setiap konsumen **harus** idempoten. Berbeda dari modul 14 yang kuncinya dibuat penerbit, di sini kuncinya adalah id peristiwa.

```sql
CREATE TABLE peristiwa_diproses (
  konsumen    text NOT NULL,
  peristiwa_id text NOT NULL,
  diproses_pada timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (konsumen, peristiwa_id)
);

-- Dibersihkan berkala, misalnya menyimpan 30 hari terakhir
CREATE INDEX ON peristiwa_diproses (diproses_pada);
```

```ts
export async function konsumsiSekali(
  konsumen: string,
  peristiwaId: string,
  kerjakan: (tx: Database) => Promise<void>
): Promise<{ diproses: boolean }> {
  return dalamTransaksi(db, async (tx) => {
    // Penanda dan pekerjaannya dalam satu transaksi.
    // Kalau pekerjaannya gagal, penandanya ikut di-rollback.
    const [baru] = await tx.execute(sql`
      INSERT INTO peristiwa_diproses (konsumen, peristiwa_id)
      VALUES (${konsumen}, ${peristiwaId})
      ON CONFLICT DO NOTHING
      RETURNING peristiwa_id
    `);

    if (!baru) return { diproses: false };

    await kerjakan(tx);

    return { diproses: true };
  });
}
```

```ts
// Satu konsumen yang lengkap
export async function konsumenLoyalitas(pesan: PesanMasuk) {
  const muatan = pesananDibayarV1.parse(pesan.muatan);

  const hasil = await konsumsiSekali('loyalitas', pesan.id, async (tx) => {
    const poin = Math.floor(muatan.totalRp / 100_000) * 10;
    if (poin <= 0) return;

    // Tabel mutasi dengan batasan unik: lapisan kedua dari modul 14
    await tx.execute(sql`
      INSERT INTO mutasi_poin (id, pengguna_id, sumber, jumlah)
      VALUES (${idBaru()}, ${muatan.pembeliId}, ${'pesanan:' + muatan.pesananId}, ${poin})
      ON CONFLICT (sumber) DO NOTHING
    `);
  });

  if (!hasil.diproses) {
    log.debug({ peristiwaId: pesan.id }, 'peristiwa sudah diproses, dilewati');
  }
}
```

Perhatikan **dua lapisan** pertahanan: tabel `peristiwa_diproses` mencegah peristiwa yang sama diproses dua kali, dan batasan unik pada `mutasi_poin` mencegah poin ganda meski penanda gagal karena alasan apa pun. Untuk hal yang melibatkan uang atau poin, dua lapisan itu pantas.

## Memilih broker

| Pilihan | Model | Cocok untuk |
| --- | --- | --- |
| **Tabel Postgres plus polling** | Queue sederhana | Satu layanan, beberapa konsumen, volume sedang. Paling sederhana |
| **Redis Streams** | Aliran dengan consumer group | Sudah punya Redis, butuh fanout, masa simpan pendek |
| **NATS dengan JetStream** | Pub/sub plus persistensi | Ringan, mudah dioperasikan, cocok untuk layanan internal |
| **Kafka atau Redpanda** | Log yang bertahan lama | Volume besar, pemutaran ulang, banyak konsumen independen |
| **RabbitMQ** | Broker dengan routing kaya | Pola routing rumit, pengakuan per pesan |
| **SNS plus SQS**, Pub/Sub | Terkelola | Tidak ingin mengoperasikan apa pun |

Patokan yang jujur: **kalau sistem Anda masih satu layanan, tabel Postgres sudah cukup**, dan outbox-nya sekaligus jadi alirannya. Pindah ke broker sungguhan saat ada layanan kedua yang perlu mengonsumsi, atau saat Anda butuh pemutaran ulang.

Kemampuan pemutaran ulang itu yang membedakan Kafka dari queue biasa: peristiwa tersimpan selama masa simpan yang Anda tentukan, jadi konsumen baru bisa membaca dari awal untuk membangun tabelnya sendiri. Itu kemampuan yang sangat berguna, dan harganya satu komponen infrastruktur yang perlu dirawat dengan serius.

## Urutan, dan apa yang bisa salah

Tiga masalah urutan yang nyata:

**Satu, urutan hanya dijamin per kunci partisi.** `pesanan.dibayar` untuk pesanan A dan pesanan B bisa tiba dalam urutan apa pun, dan itu tidak masalah. `pesanan.dibayar` dan `pesanan.dikirim` untuk pesanan yang sama harus urut, dan itu dijamin karena keduanya memakai kunci agregat yang sama.

**Dua, konsumen dengan konkurensi tinggi bisa merusak urutan sendiri.** Sepuluh pekerja yang mengambil dari satu partisi akan memproses pesan 4 dan 5 bersamaan. Kalau urutannya penting, konkurensi harus satu per kunci, bukan satu untuk seluruh konsumen.

**Tiga, peristiwa bisa tiba sebelum data yang dirujuknya terlihat.** Ini jebakan yang sering mengejutkan: konsumen menerima `pesanan.dibayar` lalu memanggil `GET /pesanan/{id}` ke layanan pemilik, dan mendapat 404 karena replika baca yang dibacanya belum menyusul. Tiga jalan keluar: muat data yang dibutuhkan ke dalam peristiwa, baca dari primary bukan replika, atau coba ulang dengan jeda.

Pertahanan praktis untuk peristiwa yang tiba tidak urut:

```ts
// Konsumen yang menyimpan nomor urut terakhir per entitas
await tx.execute(sql`
  UPDATE proyeksi_pesanan
  SET status = ${muatan.status}, versi = ${muatan.versi}
  WHERE pesanan_id = ${muatan.pesananId}
    AND versi < ${muatan.versi}   -- peristiwa lama diabaikan
`);
```

Satu baris `AND versi < ...` itu membuat konsumen tahan terhadap peristiwa yang datang terlambat, dan menghapus satu kelas bug yang sangat sulit direproduksi.

## Pemakaian untuk invalidasi cache

Satu penerapan yang langsung menyelesaikan masalah modul 13: invalidasi cache yang tersebar.

```ts
// Konsumen tunggal yang mengurus seluruh invalidasi cache
export async function konsumenCache(pesan: PesanMasuk) {
  switch (pesan.topik) {
    case 'produk.diubah':
    case 'produk.dihapus':
      await naikkanVersiKatalog(pesan.muatan.tenantId);
      await redis.del(kunciCache.produk(pesan.muatan.produkId));
      break;

    case 'peran.diubah':
    case 'keanggotaan.dicabut':
      await redis.del(kunciCache.izin(pesan.muatan.penggunaId, pesan.muatan.tenantId));
      break;

    case 'pesanan.dibayar':
      await redis.del(kunciCache.rekapHarian(pesan.muatan.tenantId, hariIni()));
      break;
  }
}
```

Keuntungannya: pengetahuan "apa yang perlu dibatalkan saat X berubah" terkumpul di satu berkas, bukan tersebar di tiga puluh tempat yang menulis data. Dan menambah cache baru berarti menambah satu `case`, bukan mencari semua jalur tulis yang memengaruhinya.

Satu catatan: invalidasi lewat peristiwa punya jeda beberapa ratus milidetik sampai beberapa detik. Untuk cache dengan TTL menit, itu tidak masalah. Untuk hal yang harus berlaku seketika, batalkan langsung setelah commit seperti di modul 13, **dan** terbitkan peristiwanya untuk konsumen lain.

## Jebakan yang mahal

Lima pola yang pantas dikenali:

**Satu, peristiwa yang sebenarnya perintah.** `pengguna.kirim-email-selamat-datang` adalah perintah. Yang benar: `pengguna.terdaftar`, lalu konsumen notifikasi memutuskan mengirim email.

**Dua, peristiwa yang menunggu jawaban.** Begitu penerbit menunggu hasil dari konsumen, itu bukan lagi peristiwa, melainkan panggilan jarak jauh yang dibungkus broker. Kalau butuh jawaban, pakai panggilan langsung.

**Tiga, peristiwa yang terlalu banyak.** Menerbitkan `keranjang.item-ditambahkan` untuk setiap klik menghasilkan aliran yang jauh lebih besar daripada manfaatnya. Terbitkan peristiwa yang punya makna bisnis, bukan setiap perubahan baris.

**Empat, kontrak yang tidak ditulis.** Peristiwa adalah API publik untuk sistem internal Anda. Tanpa skema dan versi, satu perubahan di penerbit akan memecahkan empat konsumen pada hari yang tidak terduga.

**Lima, tidak ada yang memantau keterlambatan konsumen.** Konsumen yang tertinggal lima jam akan terlihat normal dari luar: semua API 200, dan poin loyalitas tidak masuk sejak sore. Pantau lag per konsumen, dan beri peringatan.

## Latihan

### Latihan 1: Rancang peristiwa untuk toko

Dari Proyek 2, daftar sepuluh kejadian yang pantas jadi peristiwa, lalu untuk masing-masing tentukan nama, kunci agregat, isi muatan, dan siapa saja konsumennya.

> [!petunjuk]
> Mulai dari pertanyaan "kejadian apa yang membuat lebih dari satu bagian sistem perlu bertindak". Perubahan yang hanya berarti bagi satu bagian lebih baik tetap jadi panggilan langsung atau pekerjaan queue.

> [!jawaban]
>
> | Peristiwa | Kunci agregat | Muatan | Konsumen |
> | --- | --- | --- | --- |
> | `pesanan.dibuat` | pesananId | id, pembeli, total, jumlah item | analitik, notifikasi |
> | `pesanan.dibayar` | pesananId | id, pembeli, total, metode, waktu | gudang, akuntansi, loyalitas, notifikasi, cache |
> | `pesanan.dibatalkan` | pesananId | id, alasan, oleh siapa | gudang, akuntansi, loyalitas (pembatalan poin), cache |
> | `pesanan.dikirim` | pesananId | id, kurir, nomor resi | notifikasi, analitik |
> | `pembayaran.gagal` | pesananId | id, alasan, percobaan ke berapa | notifikasi, analitik |
> | `stok.menipis` | varianId | varian, stok sisa, ambang | notifikasi admin, pengadaan |
> | `produk.diubah` | produkId | id, field yang berubah | cache, indeks pencarian |
> | `pembeli.terdaftar` | pembeliId | id, waktu, sumber pendaftaran | notifikasi, analitik, pemasaran |
> | `kupon.terpakai` | kuponId | kupon, pesanan, nilai diskon | analitik, pembatasan penyalahgunaan |
> | `pengembalian.disetujui` | pesananId | pesanan, item, nilai | gudang, akuntansi, loyalitas, notifikasi |
>
> Lima keputusan yang pantas dijelaskan:
>
> 1. **`pesanan.dibuat` dan `pesanan.dibayar` dipisah**, karena keduanya memicu reaksi yang berbeda. Menggabungkannya jadi `pesanan.berubah` dengan field status memaksa setiap konsumen memeriksa status dan mengabaikan yang bukan urusannya, dan itu membuat kontraknya kabur.
> 2. **`stok.menipis` adalah peristiwa yang baik meski terasa aneh.** Ia fakta tentang keadaan yang pantas diketahui beberapa bagian, dan bukan perintah "pesan barang lagi".
> 3. **Kunci agregat `pengembalian.disetujui` adalah pesananId, bukan pengembalianId.** Alasannya urutan: pembatalan pengembalian dan pengiriman untuk pesanan yang sama harus diproses urut, dan itu hanya terjamin kalau kuncinya sama.
> 4. **Muatan tidak memuat daftar item lengkap.** Hanya gudang yang membutuhkannya, dan gudang bisa memanggil balik. Memuatnya berarti alamat dan daftar barang setiap pesanan tersebar ke lima sistem.
> 5. **Yang tidak masuk daftar juga keputusan.** `keranjang.diubah`, `halaman.dilihat`, dan `pengguna.login` adalah kejadian yang lebih cocok sebagai data analitik lewat jalur terpisah, bukan peristiwa domain yang memicu logika bisnis.

### Latihan 2: Bangun outbox lengkap dan buktikan jaminannya

Terapkan pola outbox di Proyek 2, lalu buktikan dengan tiga percobaan kegagalan.

| # | Percobaan | Yang harus terjadi |
| --- | --- | --- |
| 1 | Matikan broker, lalu buat 10 pesanan | 10 pesanan berhasil, 10 baris outbox menunggu |
| 2 | Nyalakan broker kembali | 10 peristiwa terkirim, konsumen memprosesnya |
| 3 | Matikan proses pengirim tepat setelah broker menerima | Peristiwa terkirim dua kali, konsumen tetap benar |

> [!pembahasan]
>
> Percobaan ketiga yang paling berharga, dan cara mengujinya:
>
> ```ts
> // Sisipkan kegagalan yang disengaja untuk pengujian
> await broker.terbitkan(peristiwa);
>
> if (process.env.UJI_GAGAL_SETELAH_TERBIT === '1') {
>   throw new Error('kegagalan yang disengaja sebelum menandai terkirim');
> }
>
> await db.execute(sql`UPDATE outbox SET terkirim_pada = now() WHERE id = ${baris.id}`);
> ```
>
> Dengan itu, baris outbox tetap bertanda menunggu, dan pengiriman berikutnya mengirimnya lagi. Konsumen menerima peristiwa dengan id yang sama dua kali, dan `konsumsiSekali` memastikan pekerjaannya hanya terjadi sekali.
>
> Empat hal yang akan Anda temukan:
>
> 1. **Jaminannya memang at-least-once, dan Anda membuktikannya sendiri.** Ini bagian paling penting dari latihan: bukan percaya pada tulisan di dokumentasi, tapi melihat peristiwa yang sama tiba dua kali.
> 2. **Percobaan pertama menunjukkan nilai sesungguhnya dari outbox.** Broker yang mati tidak menggagalkan satu pun pesanan. Bandingkan dengan pendaftaran langsung ke broker, di mana sepuluh pesanan akan gagal.
> 3. **Anda akan menemukan satu bug yang tidak terpikir**, biasanya di penanganan urutan: setelah broker pulih, sepuluh peristiwa terkirim dalam urutan id, dan kalau Anda memakai `continue` alih-alih `break` saat gagal, urutannya bisa kacau.
> 4. **Tabel outbox tumbuh dan perlu dibersihkan.** Baris yang sudah terkirim lebih dari tujuh hari bisa dihapus, dan tanpa itu tabel ini akan jadi yang terbesar di basis data Anda. Perhatikan juga bahwa tabel yang sering di-`UPDATE` cepat membengkak, jadi setel autovacuum lebih agresif seperti di modul 9.

### Latihan 3: Konsumen yang menerima peristiwa dua kali dan tidak urut

Bangun konsumen proyeksi yang membangun tabel ringkasan status pesanan dari peristiwa, lalu uji dengan empat skenario.

| # | Skenario |
| --- | --- |
| 1 | Peristiwa diterima urut, satu kali |
| 2 | Peristiwa yang sama diterima dua kali |
| 3 | `pesanan.dikirim` tiba sebelum `pesanan.dibayar` |
| 4 | Peristiwa untuk pesanan yang belum pernah terlihat |

> [!jawaban]
>
> ```sql
> CREATE TABLE proyeksi_pesanan (
>   pesanan_id   uuid PRIMARY KEY,
>   tenant_id    uuid NOT NULL,
>   status       text NOT NULL,
>   total_rp     bigint NOT NULL DEFAULT 0,
>   urutan       bigint NOT NULL,          -- nomor peristiwa terakhir yang diterapkan
>   diperbarui   timestamptz NOT NULL DEFAULT now()
> );
> ```
>
> ```ts
> export async function konsumenProyeksi(pesan: PesanMasuk) {
>   const muatan = skemaPeristiwaPesanan.parse(pesan.muatan);
>   const urutan = pesan.urutan;   // dari id outbox, monoton per kunci agregat
>
>   await konsumsiSekali('proyeksi-pesanan', pesan.id, async (tx) => {
>     await tx.execute(sql`
>       INSERT INTO proyeksi_pesanan (pesanan_id, tenant_id, status, total_rp, urutan)
>       VALUES (${muatan.pesananId}, ${muatan.tenantId},
>               ${statusDari(pesan.topik)}, ${muatan.totalRp ?? 0}, ${urutan})
>       ON CONFLICT (pesanan_id) DO UPDATE
>         SET status = excluded.status,
>             total_rp = GREATEST(proyeksi_pesanan.total_rp, excluded.total_rp),
>             urutan = excluded.urutan,
>             diperbarui = now()
>         -- Peristiwa yang lebih lama diabaikan sepenuhnya
>         WHERE proyeksi_pesanan.urutan < excluded.urutan
>     `);
>   });
> }
> ```
>
> | Skenario | Hasil | Yang menjaganya |
> | --- | --- | --- |
> | 1 | Status benar | Pemrosesan normal |
> | 2 | Tidak ada perubahan pada yang kedua | `konsumsiSekali` |
> | 3 | Status tetap "dikirim", peristiwa lama diabaikan | `WHERE urutan < excluded.urutan` |
> | 4 | Baris baru dibuat dengan data yang ada | `INSERT ... ON CONFLICT` |
>
> Empat catatan:
>
> 1. **`INSERT ... ON CONFLICT DO UPDATE ... WHERE`** adalah satu pernyataan yang menangani pembuatan, pembaruan, dan penolakan peristiwa lama sekaligus. Tanpa bentuk ini, Anda akan menulis pembacaan dulu lalu pemeriksaan, dan kembali ke masalah konkurensi modul 8.
> 2. **Skenario 4 wajib ditangani dan sering terlupakan.** Peristiwa pertama yang diterima konsumen baru belum tentu `pesanan.dibuat`. Konsumen harus bisa mulai dari tengah, terutama kalau nanti ada pemutaran ulang sebagian.
> 3. **Nomor urutan harus monoton per kunci agregat.** Id baris outbox memenuhi syarat itu karena `IDENTITY` selalu naik. Memakai waktu sebagai nomor urut berbahaya: dua peristiwa dalam milidetik yang sama akan bernilai sama.
> 4. **Proyeksi boleh dihitung ulang dari nol.** Itu sifat yang pantas dijaga: kalau suatu hari proyeksinya salah karena bug, Anda bisa mengosongkan tabelnya dan memutar ulang peristiwanya, dengan syarat broker Anda menyimpan riwayatnya.

### Latihan 4: Diagnosis tiga masalah produksi

Tiga laporan dari sistem berbasis peristiwa. Sebutkan penyebab yang paling mungkin dan perbaikannya.

|  | Laporan |
| --- | --- |
| **A** | "Poin loyalitas pembeli kadang dobel, kira-kira satu dari lima ratus pesanan." |
| **B** | "Status pesanan di halaman riwayat kadang mundur: sudah dikirim, lalu berubah jadi dibayar lagi." |
| **C** | "Email struk kadang terkirim untuk pesanan yang dibatalkan beberapa detik setelah dibayar." |

> [!jawaban]
>
> **A: konsumen tidak idempoten, atau penandanya di luar transaksi.** Satu dari lima ratus adalah tanda khas pengiriman ganda yang jarang: terjadi hanya saat proses pengirim mati pada jendela yang sangat sempit.
>
> Dua kemungkinan penyebab, dan keduanya perlu diperiksa: penanda `peristiwa_diproses` disimpan di transaksi terpisah dari penambahan poin, sehingga ada jendela di mana poin masuk tapi penandanya belum. Atau penandanya dibuat berdasarkan id yang tidak stabil, misalnya UUID baru di setiap pengiriman, sehingga pengiriman ulang terlihat sebagai peristiwa berbeda.
>
> Perbaikan: penanda dan pekerjaan dalam satu transaksi, plus batasan `UNIQUE (sumber)` pada tabel mutasi poin sebagai lapisan kedua. Dan untuk data yang sudah dobel, siapkan skrip rekonsiliasi: hitung ulang poin dari mutasi yang sah, bukan menambal selisihnya dengan tangan.
>
> **B: urutan rusak di sisi konsumen.** Peristiwa `dibayar` yang tiba terlambat diterapkan setelah `dikirim`, dan proyeksinya menimpa status yang lebih baru.
>
> Dua penyebab yang mungkin: konsumen berjalan dengan konkurensi lebih dari satu untuk kunci yang sama, atau proyeksinya tidak memeriksa nomor urut. Perbaikan: tambahkan `WHERE urutan < excluded.urutan` seperti di Latihan 3, dan pastikan konkurensi konsumen dibatasi per kunci partisi.
>
> **C: inilah sifat sistem berbasis peristiwa yang harus diterima, lalu dirancang.** Peristiwa `pesanan.dibayar` diterbitkan dan benar, lalu pesanan dibatalkan dua detik kemudian. Konsumen email baru memproses peristiwa pertama lima detik kemudian. Tidak ada bug: hanya jeda.
>
> Tiga jalan keluar, dan pilihannya tergantung produk:
>
> 1. **Periksa keadaan terkini sebelum bertindak.** Konsumen email membaca status pesanan saat akan mengirim, dan melewati kalau sudah dibatalkan. Sederhana, dan menyelesaikan sebagian besar kasus.
> 2. **Beri jeda sengaja.** Email struk didaftarkan dengan penundaan 60 detik, sehingga pembatalan cepat sudah terlihat. Dipakai banyak layanan, dan pengguna tidak merasakannya.
> 3. **Terima dan perbaiki.** Email struk terkirim, lalu email pembatalan menyusul. Ini pilihan yang sah, dan kadang yang paling jujur.
>
> Yang tidak boleh: menyimpulkan bahwa arsitekturnya salah. Sistem yang bagian-bagiannya bereaksi dengan jeda punya sifat ini secara bawaan, dan keterampilan yang dibutuhkan adalah **merancang untuk jeda**, bukan berpura-pura jedanya tidak ada.

## Batasnya

Arsitektur berbasis peristiwa menyelesaikan penggandengan dan jaminan penerbitan, dan membawa tiga hal yang harus Anda tanggung.

**Konsistensi jadi tertunda, dan itu harus dirancang.** Setelah pesanan dibayar, poin belum masuk, laporan belum berubah, dan gudang belum tahu. Semuanya akan beres dalam hitungan detik, dan antarmuka harus jujur tentang itu.

**Pemecahan masalah jadi lebih sulit.** Satu kejadian melahirkan lima reaksi di lima tempat, dan menelusurinya butuh id penelusuran yang ikut di setiap peristiwa. Itu modul 18.

**Transaksi lintas layanan tetap tidak ada.** Kalau pembayaran berhasil dan pengurangan stok gagal di layanan lain, tidak ada `ROLLBACK` yang bisa membatalkan keduanya. Pola yang menanganinya adalah saga, dan itu modul 23.

## Rangkuman

- Perintah berarti "kerjakan ini" dan ditujukan ke satu penerima. Peristiwa berarti "ini sudah terjadi" dan penerbitnya tidak tahu siapa yang mendengar.
- Peristiwa yang benar tetap sah diterbitkan meski tidak ada satu pun konsumen. Kalau tidak, itu perintah yang menyamar.
- Pola outbox adalah satu-satunya cara sederhana menjamin bahwa perubahan data dan penerbitan peristiwanya tidak bisa terpisah.
- Id peristiwa harus stabil antar pengiriman ulang, dan id baris outbox memenuhi syarat itu.
- Kunci agregat jadi kunci partisi, dan urutan hanya dijamin per kunci itu. Urutan global hampir selalu tidak dibutuhkan.
- Saat satu peristiwa gagal dikirim, berhenti untuk kunci itu. Melanjutkan akan merusak urutan.
- Muatan peristiwa berukuran sedang: id, tenant, waktu, dan field yang hampir pasti dibutuhkan semua konsumen.
- Setiap konsumen harus idempoten, dengan penanda yang disimpan dalam transaksi yang sama dengan pekerjaannya, plus batasan basis data sebagai lapisan kedua untuk hal yang bernilai uang.
- Proyeksi memeriksa nomor urut, sehingga peristiwa yang tiba terlambat diabaikan.
- Kalau sistem masih satu layanan, tabel Postgres sudah cukup sebagai aliran. Broker sungguhan dibutuhkan saat ada konsumen lintas layanan atau kebutuhan pemutaran ulang.
- Pantau keterlambatan konsumen. Konsumen yang tertinggal lima jam tidak terlihat dari luar.
- Jeda antar bagian adalah sifat, bukan bug. Rancang antarmuka dan alurnya untuk jeda itu.

## Masalah terbuka

Tiga modul terakhir membahas cache, queue, dan peristiwa. Saatnya menyatukannya pada satu sistem yang jalurnya panjang dan melibatkan banyak bagian.

Bagian berikutnya adalah Proyek 4: sistem pemesanan berbasis peristiwa, dari pesanan dibuat sampai barang dikirim, dengan outbox yang menjamin tidak ada peristiwa hilang, konsumen yang aman menerima pesan dua kali, dead letter queue yang bisa diputar ulang, dan serangkaian uji kekacauan yang mematikan komponen di tengah jalan untuk membuktikan sistemnya pulih sendiri.
