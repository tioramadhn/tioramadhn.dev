---
title: 'Proyek 4: Sistem Pemesanan Berbasis Peristiwa'
description: Dari pesanan dibuat sampai barang dikirim, dengan outbox yang menjamin tidak ada peristiwa hilang, konsumen yang aman menerima pesan dua kali, dan uji kekacauan yang mematikan komponen di tengah jalan.
date: 2026-12-20
slug: proyek-4-pemesanan-berbasis-peristiwa
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Tiga modul terakhir membahas cache, queue, dan peristiwa. Proyek ini memakai ketiganya pada jalur yang paling panjang di sebuah toko: dari pesanan dibuat sampai barang sampai di tangan pembeli.

| Dari modul | Yang dipakai |
| --- | --- |
| 13 | Cache katalog dan izin, invalidasi lewat peristiwa, pencegahan stampede |
| 14 | Worker terpisah, percobaan ulang bertingkat, dead letter queue, penjadwalan |
| 15 | Outbox, peristiwa domain dengan versi, konsumen idempoten, proyeksi |

Yang membedakannya dari tiga proyek sebelumnya: **penilaiannya berupa uji kekacauan.** Anda akan mematikan broker, mematikan worker di tengah pekerjaan, mengirim peristiwa dua kali, dan mengacak urutannya. Sistem harus pulih sendiri tanpa data yang salah.

## Yang dibangun

Jalur pesanan lengkap dengan enam bagian yang bereaksi terhadap peristiwa, tanpa satu pun di antaranya mengenal yang lain.

```text
                    POST /v1/pesanan
                           |
                           v
                   [ Layanan Pesanan ]
                   simpan + outbox dalam satu transaksi
                           |
                    pesanan.dibuat
                           |
          +----------------+----------------+
          v                v                v
   [ Pembayaran ]   [ Notifikasi ]    [ Analitik ]
   buat tagihan     email konfirmasi  proyeksi harian
          |
   pembayaran.berhasil / pembayaran.gagal
          |
          v
   [ Layanan Pesanan ]  -> pesanan.dibayar
          |
   +------+------+-------------+------------+
   v             v             v            v
[ Gudang ]  [ Loyalitas ]  [ Akuntansi ]  [ Cache ]
siapkan      tambah poin    catat jurnal   batalkan rekap
   |
pengiriman.dibuat -> pengiriman.dikirim -> pengiriman.diterima
```

Semuanya berjalan dalam satu basis kode sebagai modul terpisah, bukan sebagai layanan terpisah. Itu keputusan yang disengaja: **batas modul yang jelas memberi hampir semua manfaat pemisahan tanpa biaya jaringannya**, dan modul 22 membahas kapan memecahnya jadi layanan sungguhan.

## Spesifikasi wajib

### A. Peristiwa dan penerbitan

1. Minimal sepuluh jenis peristiwa, masing-masing dengan skema Zod bernomor versi.
2. Semua penerbitan lewat tabel outbox, dalam transaksi yang sama dengan perubahan datanya.
3. Pengirim outbox berjalan sebagai proses terpisah, memakai `FOR UPDATE SKIP LOCKED`.
4. Id peristiwa berasal dari id baris outbox, stabil antar pengiriman ulang.
5. Kunci agregat jadi kunci partisi, dan pengiriman berhenti untuk satu kunci saat ada yang gagal.
6. Baris outbox yang sudah terkirim lebih dari 7 hari dibersihkan pekerjaan harian.

### B. Konsumen

7. Enam konsumen: pembayaran, notifikasi, gudang, loyalitas, akuntansi, dan cache.
8. Setiap konsumen idempoten lewat tabel `peristiwa_diproses`, dalam transaksi yang sama dengan pekerjaannya.
9. Konsumen yang menyentuh nilai uang atau poin punya batasan unik di basis data sebagai lapisan kedua.
10. Proyeksi status pesanan memeriksa nomor urut, sehingga peristiwa yang tiba terlambat diabaikan.
11. Konsumen yang gagal permanen memasukkan pekerjaannya ke dead letter queue beserta muatannya.
12. Ada endpoint admin untuk memutar ulang pekerjaan dari dead letter queue.

### C. Jalur pembayaran

13. Pembayaran disimulasikan dengan layanan tiruan yang bisa dibuat gagal, lambat, dan menggantung.
14. Pemberitahuan dari penyedia pembayaran masuk lewat webhook dengan verifikasi tanda tangan, pemeriksaan umur, dan idempotensi.
15. Pesanan yang tidak dibayar dalam 1 jam dibatalkan pekerjaan terjadwal, dan stoknya kembali.
16. Pembayaran yang tiba setelah pesanan dibatalkan dicatat sebagai selisih untuk ditangani manusia, bukan diabaikan.

### D. Cache dan laporan

17. Katalog di-cache dengan invalidasi lewat peristiwa `produk.diubah`.
18. Rekap harian dibangun dari peristiwa oleh konsumen analitik, bukan dari agregasi langsung.
19. Rekap bisa dihitung ulang dari nol dengan memutar ulang peristiwa.
20. Dasbor memakai proyeksi, dan latensinya di bawah 50 ms pada 500 ribu pesanan.

### E. Operasional

21. Tiga angka dipantau per queue: kedalaman, umur pekerjaan tertua, dan jumlah gagal permanen.
22. Keterlambatan setiap konsumen dipantau, dengan peringatan di atas 5 menit.
23. Setiap peristiwa dan pekerjaan membawa id penelusuran dari permintaan HTTP asalnya.
24. Worker menutup dengan rapi pada SIGTERM, menyelesaikan pekerjaan yang sedang jalan.

## Skema peristiwa

```ts
// src/peristiwa/kontrak.ts
const dasar = {
  versi: z.literal(1),
  tenantId: z.string().uuid(),
  terjadiPada: z.string().datetime(),
};

export const KONTRAK = {
  'pesanan.dibuat': z.object({
    ...dasar,
    pesananId: z.string().uuid(),
    pembeliId: z.string().uuid(),
    totalRp: z.number().int().nonnegative(),
    jumlahItem: z.number().int().positive(),
  }),

  'pesanan.dibayar': z.object({
    ...dasar,
    pesananId: z.string().uuid(),
    pembeliId: z.string().uuid(),
    totalRp: z.number().int().nonnegative(),
    metode: z.enum(['transfer', 'kartu', 'ewallet']),
    referensiPembayaran: z.string(),
  }),

  'pesanan.dibatalkan': z.object({
    ...dasar,
    pesananId: z.string().uuid(),
    alasan: z.enum(['tidak-dibayar', 'diminta-pembeli', 'stok-habis', 'ditolak-admin']),
    olehSistem: z.boolean(),
  }),

  'pembayaran.gagal': z.object({
    ...dasar,
    pesananId: z.string().uuid(),
    alasan: z.string(),
    percobaanKe: z.number().int().positive(),
  }),

  'pengiriman.dibuat': z.object({
    ...dasar,
    pesananId: z.string().uuid(),
    pengirimanId: z.string().uuid(),
    kurir: z.string(),
  }),

  'pengiriman.dikirim': z.object({
    ...dasar,
    pesananId: z.string().uuid(),
    nomorResi: z.string(),
  }),

  'pengiriman.diterima': z.object({
    ...dasar,
    pesananId: z.string().uuid(),
    diterimaOleh: z.string(),
  }),

  'stok.menipis': z.object({
    ...dasar,
    varianId: z.string().uuid(),
    stokSisa: z.number().int().nonnegative(),
    ambang: z.number().int().positive(),
  }),

  'produk.diubah': z.object({
    ...dasar,
    produkId: z.string().uuid(),
    fieldBerubah: z.array(z.string()),
  }),

  'pengembalian.disetujui': z.object({
    ...dasar,
    pesananId: z.string().uuid(),
    pengembalianId: z.string().uuid(),
    nilaiRp: z.number().int().nonnegative(),
  }),
} as const;

export type JenisPeristiwa = keyof typeof KONTRAK;
export type MuatanPeristiwa<T extends JenisPeristiwa> = z.infer<(typeof KONTRAK)[T]>;
```

```ts
// Penerbitan bertipe: jenis dan muatan tidak mungkin tidak cocok
export async function terbitkan<T extends JenisPeristiwa>(
  tx: Database,
  jenis: T,
  kunciAgregat: string,
  muatan: MuatanPeristiwa<T>
) {
  // Diperiksa saat diterbitkan, supaya peristiwa rusak tidak masuk aliran
  const diperiksa = KONTRAK[jenis].parse(muatan);

  await tx.insert(outbox).values({
    jenis,
    kunciAgregat,
    muatan: diperiksa,
    versi: diperiksa.versi,
    tenantId: diperiksa.tenantId,
    jejakId: konteksJejak.ambil()?.jejakId,
  });
}
```

Objek `KONTRAK` itu teknik yang pantas ditiru: nama peristiwa dan bentuk muatannya terikat di satu tempat, sehingga `terbitkan('pesanan.dibayar', ...)` dengan muatan yang salah ditolak TypeScript, bukan ditemukan saat konsumen gagal mem-parse.

## Jalur pembayaran dengan selisih

Bagian paling berharga di proyek ini, karena di sini uang terlibat dan jedanya nyata.

```ts
// Konsumen pembayaran: membuat tagihan setelah pesanan dibuat
export async function konsumenPembayaran(pesan: PesanMasuk) {
  const muatan = KONTRAK['pesanan.dibuat'].parse(pesan.muatan);

  await konsumsiSekali('pembayaran', pesan.id, async (tx) => {
    // Referensi deterministik: penyedia menolak duplikat dengan referensi sama,
    // jadi percobaan ulang tidak membuat dua tagihan
    const referensi = `pesanan-${muatan.pesananId}`;

    const [tagihan] = await tx.execute(sql`
      INSERT INTO tagihan (id, pesanan_id, referensi, jumlah_rp, status)
      VALUES (${idBaru()}, ${muatan.pesananId}, ${referensi}, ${muatan.totalRp}, 'dibuat')
      ON CONFLICT (referensi) DO NOTHING
      RETURNING id
    `);

    if (!tagihan) return;   // sudah ada, tidak perlu apa-apa

    // Panggilan ke penyedia dilakukan lewat queue, bukan di dalam transaksi.
    // Pelajaran modul 8: jangan pernah memanggil layanan luar di dalam transaksi.
    await repoPekerjaan(tx).tambah({
      jenis: 'buat-tagihan-penyedia',
      muatan: { tagihanId: tagihan.id, referensi, idempotensi: referensi },
    });
  });
}
```

```ts
// Webhook dari penyedia: titik masuk yang tidak bisa dipercaya
app.post('/v1/webhook/pembayaran', { config: { rawBody: true } }, async (req) => {
  verifikasiTandaTangan(req);   // modul 12: tanda tangan, umur, perbandingan aman

  const peristiwa = skemaWebhookPembayaran.parse(JSON.parse(req.rawBody));

  return dalamTransaksi(db, async (tx) => {
    // Idempotensi di tingkat peristiwa penyedia
    const [baru] = await tx.execute(sql`
      INSERT INTO peristiwa_penyedia (id, penyedia, muatan)
      VALUES (${peristiwa.id}, 'pembayaran', ${JSON.stringify(peristiwa)})
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `);

    if (!baru) return { ok: true, catatan: 'sudah diproses' };

    const pesanan = await repoPesanan(tx).ambilUntukPembaruan(peristiwa.pesananId);
    if (!pesanan) {
      // Pesanan tidak dikenal: catat sebagai selisih, jangan error
      await repoSelisih(tx).catat({ jenis: 'pembayaran-tanpa-pesanan', muatan: peristiwa });
      return { ok: true };
    }

    if (peristiwa.status === 'berhasil') {
      // Pembayaran untuk pesanan yang sudah dibatalkan: syarat nomor 16
      if (pesanan.status === 'batal') {
        await repoSelisih(tx).catat({
          jenis: 'pembayaran-untuk-pesanan-batal',
          pesananId: pesanan.id,
          nilaiRp: peristiwa.jumlahRp,
          muatan: peristiwa,
        });

        await terbitkan(tx, 'pembayaran.gagal', pesanan.id, {
          versi: 1, tenantId: pesanan.tenantId, terjadiPada: new Date().toISOString(),
          pesananId: pesanan.id, alasan: 'pesanan sudah dibatalkan', percobaanKe: 1,
        });

        return { ok: true };
      }

      // Perubahan bersyarat: aman meski webhook datang dua kali
      const [berubah] = await tx.execute(sql`
        UPDATE pesanan
        SET status = 'dibayar', dibayar_pada = now(), versi = versi + 1
        WHERE id = ${pesanan.id} AND status = 'menunggu'
        RETURNING id
      `);

      if (berubah) {
        await terbitkan(tx, 'pesanan.dibayar', pesanan.id, {
          versi: 1, tenantId: pesanan.tenantId, terjadiPada: new Date().toISOString(),
          pesananId: pesanan.id, pembeliId: pesanan.pembeliId,
          totalRp: pesanan.totalRp, metode: peristiwa.metode,
          referensiPembayaran: peristiwa.referensi,
        });
      }
    }

    return { ok: true };
  });
});
```

Tabel `selisih` di situ adalah fitur yang membedakan sistem yang serius dari yang asal jadi. Pada sistem yang melibatkan uang, keadaan yang tidak sesuai harapan **pasti** terjadi: pembayaran untuk pesanan yang sudah dibatalkan, pembayaran dengan nilai yang tidak cocok, dan pembayaran untuk pesanan yang tidak dikenal. Mengabaikannya berarti kehilangan uang tanpa jejak. Mencatatnya untuk ditangani manusia adalah satu-satunya jawaban yang jujur.

## Konsumen gudang dan pengiriman

```ts
export async function konsumenGudang(pesan: PesanMasuk) {
  const muatan = KONTRAK['pesanan.dibayar'].parse(pesan.muatan);

  await konsumsiSekali('gudang', pesan.id, async (tx) => {
    // Pengiriman dibuat dengan id deterministik dari pesanan,
    // sehingga pemrosesan ganda tidak membuat dua pengiriman
    const pengirimanId = idDeterministik('pengiriman', muatan.pesananId);

    const [baru] = await tx.execute(sql`
      INSERT INTO pengiriman (id, pesanan_id, status, dibuat_pada)
      VALUES (${pengirimanId}, ${muatan.pesananId}, 'disiapkan', now())
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `);

    if (!baru) return;

    // Item diambil dari pemiliknya, bukan dari muatan peristiwa.
    // Pelajaran modul 15: peristiwa berukuran sedang, data rinci dipanggil balik.
    const item = await repoPesanan(tx).itemMilik(muatan.pesananId);
    await repoPengambilan(tx).buatDaftar(pengirimanId, item);

    await terbitkan(tx, 'pengiriman.dibuat', muatan.pesananId, {
      versi: 1, tenantId: muatan.tenantId, terjadiPada: new Date().toISOString(),
      pesananId: muatan.pesananId, pengirimanId, kurir: 'belum-dipilih',
    });
  });
}
```

Fungsi `idDeterministik` layak dijelaskan: ia menghasilkan UUID versi 5 dari gabungan nama ruang dan kunci, sehingga pemanggilan dengan masukan sama selalu menghasilkan id yang sama. Dengan begitu, `ON CONFLICT (id) DO NOTHING` jadi penjaga idempotensi tanpa tabel tambahan.

## Yang harus Anda kerjakan sendiri

1. **Konsumen akuntansi** yang membuat jurnal berpasangan, dengan batasan basis data yang memastikan debit sama dengan kredit. Ini latihan pemodelan yang bagus, dan jauh lebih sulit daripada kelihatannya.
2. **Pembatalan otomatis** untuk pesanan yang tidak dibayar dalam 1 jam, beserta pengembalian stok dan penanganan kalau pembayarannya tiba bersamaan.
3. **Pengembalian barang** dengan jalur peristiwanya sendiri, termasuk pembatalan poin loyalitas yang sudah diberikan.
4. **Dasbor selisih** untuk operasional: daftar kejadian yang perlu ditangani manusia, dengan tombol untuk menandainya selesai.

Poin keempat sering dianggap pekerjaan tambahan, dan sebenarnya bagian paling penting dari sistem yang menangani uang. Selisih yang tercatat tapi tidak pernah dilihat siapa pun sama saja dengan tidak dicatat.

## Checklist penilaian: enam uji kekacauan

| # | Uji | Yang harus terjadi |
| --- | --- | --- |
| 1 | Matikan broker, buat 20 pesanan, nyalakan broker | 20 pesanan berhasil, semua peristiwa terkirim dan diproses |
| 2 | Matikan worker loyalitas 10 menit, buat 50 pesanan dibayar, nyalakan | 50 poin masuk, tepat satu kali masing-masing |
| 3 | Kirim ulang 100 peristiwa dari outbox dengan paksa | Tidak ada perubahan ganda di mana pun |
| 4 | Matikan worker gudang tepat setelah pengiriman dibuat, sebelum commit | Pekerjaan diulang, tidak ada pengiriman ganda |
| 5 | Kirim webhook pembayaran dua kali untuk satu pesanan | Pesanan dibayar sekali, peristiwa `pesanan.dibayar` terbit sekali |
| 6 | Kirim webhook pembayaran untuk pesanan yang sudah dibatalkan | Tercatat di tabel selisih, bukan diabaikan |

Ditambah enam pemeriksaan biasa:

| # | Pemeriksaan |
| --- | --- |
| 7 | Hapus seluruh tabel rekap, lalu putar ulang peristiwa. Angkanya kembali sama? |
| 8 | Ubah satu produk. Katalog yang di-cache ikut berubah dalam waktu di bawah 5 detik? |
| 9 | Dasbor pada 500 ribu pesanan. Latensi di bawah 50 ms? |
| 10 | Satu permintaan HTTP, lacak id penelusurannya. Muncul di semua peristiwa dan pekerjaan turunannya? |
| 11 | Kirim SIGTERM ke worker saat memproses 10 pekerjaan. Semuanya selesai sebelum proses keluar? |
| 12 | Matikan konsumen notifikasi 1 jam. Peringatan keterlambatan menyala? |

Cara menjalankan uji nomor 3:

```sql
-- Paksa pengiriman ulang: tandai 100 peristiwa terakhir sebagai belum terkirim
UPDATE outbox SET terkirim_pada = NULL
WHERE id IN (SELECT id FROM outbox ORDER BY id DESC LIMIT 100);
```

Lalu bandingkan isi tabel poin, jurnal, dan pengiriman sebelum dan sesudah. Keduanya harus identik. Kalau ada yang berubah, ada konsumen yang belum idempoten, dan itu temuan yang paling berharga dari seluruh proyek ini.

## Tantangan bonus

- **Pemutaran ulang sebagian** dengan penyaringan jenis dan rentang waktu, supaya satu konsumen bisa dibangun ulang tanpa mengganggu yang lain.
- **Uji beban dengan k6** pada jalur pesanan sampai patah, lalu catat di mana patahnya: pool sambungan, worker, atau broker.
- **Pindahkan satu konsumen jadi proses terpisah** yang berkomunikasi lewat broker sungguhan, sebagai persiapan modul 22.
- **Penyimpanan peristiwa sebagai sumber kebenaran** untuk pesanan, dan status pesanan dihitung sepenuhnya dari peristiwa. Ini pengantar event sourcing di modul 23.

## Rangkuman

- Batas modul yang jelas di dalam satu basis kode memberi hampir semua manfaat pemisahan tanpa biaya jaringan.
- Kontrak peristiwa dikumpulkan di satu objek bertipe, sehingga jenis dan muatan tidak mungkin tidak cocok.
- Id deterministik dari kunci bisnis membuat operasi idempoten tanpa tabel tambahan.
- Peristiwa membawa field yang hampir pasti dibutuhkan, dan data rinci dipanggil balik dari pemiliknya.
- Pada sistem yang melibatkan uang, keadaan di luar harapan pasti terjadi. Catat sebagai selisih untuk ditangani manusia, dan sediakan tempat untuk melihatnya.
- Pemutaran ulang peristiwa adalah uji idempotensi paling tajam. Jalankan dengan sengaja, dan bandingkan isi tabel sebelum dan sesudah.
- Sistem yang pulih sendiri dari komponen yang mati bukan hasil kebetulan, melainkan hasil dari outbox, idempotensi, dan percobaan ulang yang dirancang bersamaan.

## Masalah terbuka

Sistem Anda sekarang tahan terhadap komponen yang mati, dan ada satu keluhan yang tidak bisa diselesaikan arsitektur ini.

Pembeli membuka halaman "lacak pesanan" setelah membayar. Status pesanannya berubah beberapa kali dalam sepuluh menit berikutnya: dibayar, disiapkan, dikirim. Dan pembeli tidak melihat satu pun perubahan itu, kecuali dia menekan muat ulang.

Pola yang dipakai banyak aplikasi untuk mengatasinya adalah memeriksa ke server setiap beberapa detik. Dengan seribu pembeli yang membuka halaman lacak, itu seribu permintaan setiap tiga detik untuk data yang mungkin tidak berubah sama sekali. Beban yang dibuat besar, dan sebagian besar jawabannya "belum ada perubahan".

Dan masalah yang sama muncul di sisi internal: panel gudang perlu menampilkan pesanan baru begitu masuk, dan dasbor admin perlu menunjukkan angka penjualan yang bergerak.

Itu isi modul berikutnya: komunikasi waktu nyata dengan WebSocket dan Server-Sent Events, beserta satu hal yang membuatnya sulit pada beberapa instance: sambungan yang hidup di satu proses, sementara peristiwanya datang di proses lain.
