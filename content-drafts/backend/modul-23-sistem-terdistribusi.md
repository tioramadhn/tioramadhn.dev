---
title: 'Modul 23: Sistem Terdistribusi'
description: Tiga penulisan di tiga basis data, lalu yang ketiga gagal, dan tidak ada ROLLBACK. Saga, konsistensi tertunda, keterlambatan replikasi, sharding, dan tangga keputusan sebelum mendistribusikan apa pun.
date: 2026-12-29
slug: modul-23-sistem-terdistribusi
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Pembeli membuat pesanan. Tiga penulisan terjadi di tiga tempat berbeda: stok dipesan di layanan katalog, pesanan disimpan di layanan pesanan, dan tagihan dibuat di layanan pembayaran.

Lalu yang ketiga gagal.

Di monolit, satu `ROLLBACK` membatalkan semuanya. Di tiga layanan, **tidak ada `ROLLBACK`**:

```text
Stok sudah dipesan      <- harus dilepas, tapi oleh siapa?
Pesanan sudah tersimpan <- harus dibatalkan
Tagihan tidak ada       <- tidak perlu apa-apa
```

Dan kalau proses yang mengoordinasikan ketiganya mati tepat setelah langkah pertama, **tidak ada satu pun pihak yang tahu bahwa alurnya belum selesai.** Stok itu akan tertahan selamanya, dan satu-satunya yang akan menemukannya adalah pelanggan yang mengeluh barangnya habis padahal ada.

Modul terakhir ini tentang lima kenyataan yang muncul begitu satu operasi melintasi beberapa sistem:

| Kenyataan | Akibatnya |
| --- | --- |
| Tidak ada transaksi lintas layanan | Butuh saga dan tindakan pengimbang |
| Jaringan bisa gagal setelah pekerjaan terjadi | Pengirim tidak tahu apakah berhasil. Idempotensi jadi syarat |
| Salinan data punya jeda | "Baca setelah tulis" bisa mengembalikan data lama |
| Jam di dua mesin tidak sama | Urutan tidak bisa ditentukan dari waktu |
| Pengiriman tepat satu kali tidak ada | Yang ada: minimal sekali, ditambah penerima yang idempoten |

Dan satu hal yang perlu disampaikan di awal: **tangga keputusan di akhir modul ini mungkin bagian paling berharga dari seluruh seri.** Sebagian besar sistem tidak perlu satu pun pola di modul ini, dan mengetahui kapan belum perlu adalah keterampilan yang lebih jarang daripada mengetahui caranya.

## Analogi: mengurus dokumen di tiga kantor

Bayangkan mengurus izin usaha yang butuh tiga kantor: kelurahan, dinas pajak, dan dinas perizinan. Ketiganya berdiri sendiri, punya arsip sendiri, dan tidak saling terhubung.

**Tidak ada yang bisa membatalkan semuanya sekaligus.** Kalau dinas perizinan menolak di langkah ketiga, surat dari kelurahan tidak otomatis hilang. Anda harus datang ke kelurahan membawa surat pembatalan. Itu tindakan pengimbang, dan bentuknya bukan "menghapus", melainkan "mencatat pembatalan".

**Ada satu lembar yang mengikuti seluruh proses.** Berisi nomor permohonan, tahap yang sudah selesai, dan tahap berikutnya. Kalau Anda sakit di tengah proses, petugas bisa melihat lembar itu dan tahu di mana berhentinya. Itu keadaan saga yang disimpan.

**Ada batas waktu.** Permohonan yang tidak dilanjutkan dalam tiga puluh hari dibatalkan otomatis, dan surat kelurahannya dicabut. Tanpa itu, arsip akan penuh permohonan menggantung selamanya.

| Dunia kantor | Dunia backend |
| --- | --- |
| Tiga kantor dengan arsip sendiri | Tiga layanan dengan basis data sendiri |
| Lembar yang mengikuti proses | Keadaan saga yang disimpan |
| Surat pembatalan ke kelurahan | Tindakan pengimbang |
| Batas waktu 30 hari | Batas waktu saga |
| Petugas yang memeriksa permohonan menggantung | Pekerjaan yang memulihkan saga yang mandek |
| Nomor permohonan di setiap surat | Kunci idempotensi di setiap batas |
| Salinan arsip di kantor cabang | Replika baca |
| Cabang yang salinannya belum diperbarui | Keterlambatan replikasi |

Batas analoginya: kantor punya manusia yang bisa menelepon dan bertanya "sudah sampai mana". Layanan tidak. Setiap kemungkinan harus ditulis sebagai kode, termasuk kemungkinan yang Anda anggap tidak akan terjadi.

## Saga

Saga adalah rangkaian langkah lokal, masing-masing dalam transaksinya sendiri, dengan tindakan pengimbang kalau salah satu gagal.

Dua bentuknya:

| Bentuk | Cara | Kapan |
| --- | --- | --- |
| **Koreografi** | Setiap layanan bereaksi terhadap peristiwa, tanpa koordinator | Alur sederhana, dua sampai tiga langkah |
| **Orkestrasi** | Satu koordinator yang menyimpan keadaan dan memerintahkan langkah | Alur dengan empat langkah atau lebih, dan yang perlu dipantau |

Untuk alur pesanan dengan tiga layanan, orkestrasi hampir selalu pilihan yang benar, karena satu alasan praktis: **Anda butuh tahu di mana setiap alur berhenti.** Pada koreografi, keadaan alur tersebar di beberapa layanan dan tidak ada satu pun tempat yang bisa menjawab "ada berapa pesanan yang mandek di langkah dua".

```sql
CREATE TABLE saga_pesanan (
  id              uuid PRIMARY KEY,
  pesanan_id      uuid NOT NULL UNIQUE,
  tahap           text NOT NULL
                    CHECK (tahap IN (
                      'mulai', 'stok-dipesan', 'tagihan-dibuat',
                      'selesai', 'mengimbangi', 'gagal'
                    )),
  langkah_selesai text[] NOT NULL DEFAULT '{}',
  muatan          jsonb NOT NULL,
  percobaan       smallint NOT NULL DEFAULT 0,
  kesalahan       text,
  batas_waktu     timestamptz NOT NULL,
  dibuat_pada     timestamptz NOT NULL DEFAULT now(),
  diperbarui_pada timestamptz NOT NULL DEFAULT now()
);

-- Untuk menemukan saga yang mandek
CREATE INDEX ON saga_pesanan (tahap, batas_waktu)
  WHERE tahap NOT IN ('selesai', 'gagal');
```

```ts
// Definisi langkah, masing-masing dengan pengimbangnya
const LANGKAH = [
  {
    nama: 'pesan-stok',
    jalankan: (m: Muatan) =>
      klienKatalog.minta('/internal/reservasi', {
        method: 'POST',
        idempoten: true,
        body: { pesananId: m.pesananId, item: m.item },
      }),
    imbangi: (m: Muatan) =>
      klienKatalog.minta('/internal/reservasi/lepas', {
        method: 'POST',
        idempoten: true,
        body: { pesananId: m.pesananId },
      }),
  },
  {
    nama: 'buat-tagihan',
    jalankan: (m: Muatan) =>
      klienPembayaran.minta('/internal/tagihan', {
        method: 'POST',
        idempoten: true,
        body: { pesananId: m.pesananId, jumlahRp: m.totalRp },
      }),
    imbangi: (m: Muatan) =>
      klienPembayaran.minta(`/internal/tagihan/${m.pesananId}/batal`, {
        method: 'POST',
        idempoten: true,
      }),
  },
  {
    nama: 'aktifkan-pesanan',
    jalankan: (m: Muatan) => repoPesanan.aktifkan(m.pesananId),
    imbangi: (m: Muatan) => repoPesanan.batalkan(m.pesananId, 'saga-gagal'),
  },
] as const;

export async function jalankanSaga(sagaId: string) {
  const saga = await repoSaga.ambilUntukDiproses(sagaId);
  if (!saga || ['selesai', 'gagal'].includes(saga.tahap)) return;

  // Sudah lewat batas waktu: mulai mengimbangi, jangan lanjutkan
  if (saga.batasWaktu < new Date() && saga.tahap !== 'mengimbangi') {
    await repoSaga.tandaiMengimbangi(sagaId, 'batas waktu saga terlewati');
    return imbangiSaga(sagaId);
  }

  for (const langkah of LANGKAH) {
    // Langkah yang sudah selesai dilewati: saga harus aman dijalankan ulang
    if (saga.langkahSelesai.includes(langkah.nama)) continue;

    try {
      await langkah.jalankan(saga.muatan);

      // Dicatat setelah berhasil, sebelum langkah berikutnya
      await repoSaga.tandaiLangkahSelesai(sagaId, langkah.nama);
    } catch (error) {
      if (layakDiulang(error) && saga.percobaan < 5) {
        await repoSaga.naikkanPercobaan(sagaId, String(error));
        await antreanSaga.tambah({ sagaId }, { delay: jedaBertambah(saga.percobaan) });
        return;
      }

      await repoSaga.tandaiMengimbangi(sagaId, String(error));
      return imbangiSaga(sagaId);
    }
  }

  await repoSaga.tandaiSelesai(sagaId);
}

async function imbangiSaga(sagaId: string) {
  const saga = await repoSaga.ambil(sagaId);

  // Diimbangi dalam urutan terbalik
  for (const langkah of [...LANGKAH].reverse()) {
    if (!saga.langkahSelesai.includes(langkah.nama)) continue;
    if (saga.langkahDiimbangi.includes(langkah.nama)) continue;

    try {
      await langkah.imbangi(saga.muatan);
      await repoSaga.tandaiDiimbangi(sagaId, langkah.nama);
    } catch (error) {
      // Pengimbang yang gagal tidak boleh diabaikan: ini butuh manusia
      await repoSaga.tandaiButuhPerhatian(sagaId, langkah.nama, String(error));
      await metrik.sagaPengimbangGagal.inc({ langkah: langkah.nama });
      return;
    }
  }

  await repoSaga.tandaiGagal(sagaId);
}
```

Enam keputusan yang membuat saga ini layak produksi:

**Satu, keadaan disimpan setelah setiap langkah.** Itu yang membuat saga bisa dilanjutkan setelah proses mati, dan membuat pertanyaan "ada berapa yang mandek di langkah dua" bisa dijawab satu kueri.

**Dua, setiap langkah idempoten.** Saga bisa dijalankan ulang kapan saja, dan langkah yang sudah selesai dilewati. Tapi itu tidak cukup: langkah yang **mungkin sudah berhasil tanpa tercatat** harus aman dijalankan lagi, dan itu sebabnya setiap panggilan memakai kunci idempotensi.

**Tiga, pengimbang juga idempoten.** Melepas reservasi yang sudah dilepas harus berhasil tanpa error.

**Empat, pengimbang bukan penghapusan.** Melepas reservasi mencatat pelepasan, membatalkan tagihan mencatat pembatalan. Jejaknya tetap ada, dan itu yang dibutuhkan saat ada perselisihan.

**Lima, batas waktu saga.** Tanpa itu, saga yang mandek karena satu layanan tidak pernah menjawab akan menahan reservasi selamanya.

**Enam, pengimbang yang gagal butuh manusia.** Kalau pelepasan stok gagal lima kali, tidak ada otomasi yang bisa menyelesaikannya. Yang benar: tandai, beri peringatan, dan sediakan antarmuka untuk petugas menyelesaikannya. Ini tabel selisih dari Proyek 4, dalam bentuk yang lebih serius.

Dan satu pekerjaan yang wajib ada:

```ts
// Dijalankan tiap menit: menemukan saga yang mandek
export async function pulihkanSagaMandek() {
  const mandek = await db.execute(sql`
    SELECT id FROM saga_pesanan
    WHERE tahap NOT IN ('selesai', 'gagal')
      AND diperbarui_pada < now() - interval '2 minutes'
    ORDER BY dibuat_pada
    LIMIT 100
    FOR UPDATE SKIP LOCKED
  `);

  for (const s of mandek) {
    await antreanSaga.tambah({ sagaId: s.id });
  }

  metrik.sagaMandek.set(mandek.length);
}
```

Tanpa pekerjaan ini, saga yang berhenti karena worker-nya mati tidak akan pernah dilanjutkan. Dan metrik `sagaMandek` adalah salah satu peringatan terpenting di sistem terdistribusi: angkanya yang naik berarti ada alur yang berhenti di tengah, dan setiap alur yang berhenti biasanya berarti uang atau stok yang tertahan.

## Reservasi, bukan pengurangan

Satu pergeseran pemodelan yang membuat saga jauh lebih sederhana: pada sistem terdistribusi, operasi dipecah jadi **pesan dulu, pastikan kemudian.**

```sql
CREATE TABLE reservasi_stok (
  id          uuid PRIMARY KEY,
  varian_id   uuid NOT NULL REFERENCES varian(id),
  pesanan_id  uuid NOT NULL,
  jumlah      integer NOT NULL CHECK (jumlah > 0),
  status      text NOT NULL DEFAULT 'aktif'
                CHECK (status IN ('aktif', 'dipakai', 'dilepas')),
  kedaluwarsa timestamptz NOT NULL,
  dibuat_pada timestamptz NOT NULL DEFAULT now(),

  UNIQUE (pesanan_id, varian_id)   -- idempotensi dari skema
);

CREATE INDEX ON reservasi_stok (kedaluwarsa) WHERE status = 'aktif';
```

```sql
-- Stok tersedia = stok fisik dikurangi reservasi yang masih aktif
SELECT v.stok - coalesce(sum(r.jumlah), 0) AS tersedia
FROM varian v
LEFT JOIN reservasi_stok r
  ON r.varian_id = v.id AND r.status = 'aktif' AND r.kedaluwarsa > now()
WHERE v.id = $1
GROUP BY v.stok;
```

Tiga keuntungan dari bentuk ini:

**Satu, reservasi yang kedaluwarsa melepas dirinya sendiri.** Saga yang mandek dan tidak pernah diimbangi tetap tidak menahan stok selamanya, karena reservasinya kedaluwarsa. Itu jaring pengaman yang bekerja tanpa koordinasi apa pun.

**Dua, `UNIQUE (pesanan_id, varian_id)` memberi idempotensi dari skema.** Panggilan reservasi yang diulang karena jaringan terputus tidak membuat reservasi kedua.

**Tiga, pembatalan jadi perubahan status, bukan penghapusan.** Jejaknya ada, dan laporan "berapa reservasi yang gagal jadi pesanan" bisa dibuat.

Harganya: **"stok tersedia" jadi perhitungan, bukan satu kolom.** Pada tabel reservasi yang besar, itu butuh indeks dan mungkin kolom ringkasan yang diperbarui dalam transaksi yang sama. Dan di situ pelajaran modul 5 tentang nilai turunan berlaku lagi.

## Konsistensi tertunda, dan masalah baca setelah tulis

Begitu ada replika baca atau salinan data antar layanan, satu masalah muncul yang terasa seperti bug padahal perilaku yang diharapkan:

```text
1. Pengguna menyimpan perubahan nama produk  -> ditulis ke primary
2. Halaman dimuat ulang                       -> dibaca dari replika
3. Replika belum menerima perubahan (jeda 200 ms)
4. Pengguna melihat nama lama
5. Pengguna menyimpan lagi, dan mengira aplikasinya rusak
```

Empat pola penyelesaiannya, dari yang paling sederhana:

| Pola | Cara | Harganya |
| --- | --- | --- |
| **Baca dari primary setelah menulis** | Dalam N detik setelah penulisan, arahkan pembacaan pengguna itu ke primary | Beban primary naik sedikit |
| **Kembalikan hasilnya dari penulisan** | Respons `POST` memuat keadaan terbaru, klien memakainya | Perlu kerjasama klien |
| **Penanda versi** | Klien mengirim versi terakhir yang dilihatnya, server menunggu replika menyusul | Lebih rumit, dan paling tepat |
| **Jangan pakai replika untuk jalur itu** | Jalur yang sensitif selalu dari primary | Paling sederhana, dan sering benar |

```ts
// Pola pertama, dan paling praktis: tandai penulisan di sesi
export async function bacaDenganKonsistensi<T>(
  pelaku: Pelaku,
  baca: (db: Database) => Promise<T>
): Promise<T> {
  const baruMenulis = await redis.get(`tulis:${pelaku.penggunaId}`);

  // Lima detik setelah menulis, pengguna ini membaca dari primary
  return baca(baruMenulis ? dbPrimary : dbReplika);
}

export async function tandaiMenulis(penggunaId: string) {
  await redis.set(`tulis:${penggunaId}`, '1', 'EX', 5);
}
```

Dan satu hal yang harus diputuskan bersama produk, bukan diselesaikan teknis: **mana yang boleh tertunda dan mana yang tidak.**

| Data | Boleh tertunda? |
| --- | --- |
| Daftar produk di katalog | Ya, beberapa detik |
| Laporan dan dasbor | Ya, beberapa menit |
| Pesanan yang baru dibuat, dilihat pembuatnya | **Tidak** |
| Saldo dan stok untuk keputusan | **Tidak** |
| Poin loyalitas yang baru bertambah | Ya, dengan pemberitahuan yang jujur |

## Replikasi dan keterlambatan

```sql
-- Keterlambatan replika, dalam detik. Pantau ini.
SELECT extract(epoch FROM (now() - pg_last_xact_replay_timestamp())) AS lag_detik;
```

Tiga hal yang perlu diketahui tentang replika baca:

**Satu, keterlambatannya tidak tetap.** Pada beban normal beberapa puluh milidetik, dan saat ada penulisan besar atau `VACUUM` berat bisa melonjak jadi puluhan detik. Pantau, dan beri peringatan di atas 5 detik.

**Dua, replika yang terlambat jauh lebih buruk daripada replika yang mati.** Replika mati akan ditolak dan lalu lintas pindah ke primary. Replika yang terlambat 60 detik tetap menjawab, dengan data yang salah. Jalan keluarnya: periksa keterlambatan dan keluarkan replika dari rotasi kalau melewati ambang.

```ts
// Periksa berkala, dan jangan pakai replika yang terlalu tertinggal
setInterval(async () => {
  const [baris] = await dbReplika.execute(sql`
    SELECT extract(epoch FROM (now() - pg_last_xact_replay_timestamp())) AS lag
  `);

  const lag = Number(baris?.lag ?? 999);
  metrik.replikaLag.set(lag);
  replikaLayakDipakai = lag < 5;
}, 5_000).unref();
```

**Tiga, failover bukan ajaib.** Saat primary mati dan replika dipromosikan, ada jendela beberapa detik sampai beberapa menit tanpa penulisan, dan ada kemungkinan kehilangan transaksi terakhir kalau replikasinya asinkron. Yang bisa dilakukan aplikasi: mode baca saja dari modul 19, dan pesan yang jujur.

## Sharding, dan tiga hal yang harus dicoba lebih dulu

Sharding adalah membagi satu tabel ke beberapa basis data berdasarkan sebuah kunci. Ia menyelesaikan masalah nyata, dan harganya paling besar di antara semua pola di seri ini.

**Tiga hal yang harus dicoba lebih dulu, dan hampir selalu cukup:**

| Langkah | Memberi | Biaya |
| --- | --- | --- |
| Indeks dan kueri yang benar | Sering 10 sampai 100 kali | Hari |
| Mesin yang lebih besar | 2 sampai 10 kali | Uang, dan hampir nol kerumitan |
| Partisi tabel per waktu atau tenant | Kueri dan perawatan jauh lebih ringan | Hari sampai minggu |
| Arsipkan data lama ke penyimpanan terpisah | Sering memangkas 80% ukuran tabel | Minggu |
| Replika baca untuk beban laporan | Memisahkan beban analitik | Hari |
| **Sharding** | Kapasitas penulisan tanpa batas teoretis | **Bulan, dan permanen** |

Satu mesin Postgres modern dengan konfigurasi yang benar sanggup menangani puluhan ribu transaksi per detik dan basis data beberapa terabyte. Sebelum sampai ke angka itu, sharding hampir selalu keputusan yang terlalu dini.

Kalau memang perlu, pilihan kunci shard menentukan segalanya:

| Kunci | Kelebihan | Kekurangan |
| --- | --- | --- |
| `tenant_id` | Hampir semua kueri dalam satu shard | Satu tenant besar bisa melebihi satu shard |
| `pengguna_id` | Sebaran merata | Kueri lintas pengguna jadi mahal |
| Hash dari id | Paling merata | Kueri rentang tidak mungkin |
| Waktu | Mudah diarsipkan | Shard terbaru menerima semua penulisan |

Untuk SaaS multi-tenant, `tenant_id` hampir selalu pilihan yang benar, karena ia sejalan dengan batas yang sudah ada di seluruh aplikasi Anda sejak modul 11.

Empat kenyataan sharding yang pantas diketahui sebelum memutuskan:

**Satu, kueri lintas shard sangat mahal.** "Sepuluh produk terlaris di seluruh platform" berarti memanggil semua shard lalu menggabungkan hasilnya di aplikasi. Jawabannya biasanya tabel ringkasan terpisah yang tidak di-shard.

**Dua, transaksi lintas shard tidak ada.** Dan itu berarti saga lagi, bahkan untuk hal yang dulu satu transaksi.

**Tiga, mengubah jumlah shard menyakitkan.** Dari 4 jadi 8 shard berarti memindahkan separuh data sambil layanan berjalan. Pakai lebih banyak shard logis daripada fisik sejak awal, misalnya 1.024 shard logis yang dipetakan ke 4 basis data, sehingga penambahan hanya memindahkan pemetaan.

**Empat, keunikan global jadi masalah.** `UNIQUE (email)` tidak bisa ditegakkan satu basis data lagi. Jalan keluarnya: tabel pemetaan global yang tidak di-shard, atau menerima bahwa keunikan hanya per shard.

## Event sourcing: kapan sepadan

Alih-alih menyimpan keadaan terkini, simpan seluruh peristiwa yang membentuknya, dan hitung keadaan dengan memutarnya.

```sql
CREATE TABLE peristiwa_rekening (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rekening_id uuid NOT NULL,
  urutan     integer NOT NULL,
  jenis      text NOT NULL,
  muatan     jsonb NOT NULL,
  dibuat_pada timestamptz NOT NULL DEFAULT now(),

  -- Penguncian optimistis: dua penulisan bersamaan, satu gagal
  UNIQUE (rekening_id, urutan)
);
```

Yang didapat: riwayat lengkap yang tidak bisa diubah, kemampuan menjawab "bagaimana keadaannya pada tanggal tertentu", dan proyeksi baru bisa dibangun dari data lama.

Yang dibayar: setiap pembacaan butuh proyeksi yang dirawat, skema peristiwa tidak bisa diubah setelah tersimpan, kueri sederhana jadi tidak sederhana, dan tim baru butuh waktu memahaminya.

Patokan yang jujur: **pakai event sourcing untuk bagian yang riwayatnya memang bagian dari produk.** Buku besar akuntansi, riwayat perubahan dokumen, dan jejak audit keuangan sangat cocok. Katalog produk dan profil pengguna tidak. Dan tidak ada kewajiban memakainya untuk seluruh sistem: satu agregat dengan event sourcing di tengah aplikasi biasa adalah pilihan yang sah dan sering yang terbaik.

## Kunci terdistribusi, dan kenapa sebaiknya dihindari

Kebutuhan "hanya satu proses yang boleh mengerjakan ini" muncul berulang, dan jawabannya sering salah.

```ts
// Pola yang beredar luas, dan punya lubang
const dapat = await redis.set('kunci:laporan', idProses, 'EX', 30, 'NX');
if (!dapat) return;

await kerjakanLaporan();   // kalau ini butuh 35 detik, kuncinya sudah kedaluwarsa
                           // dan proses lain sudah mulai mengerjakan hal yang sama

await redis.del('kunci:laporan');   // dan ini menghapus kunci milik proses lain
```

Dua lubangnya nyata: pekerjaan yang lebih lama daripada masa berlaku kunci, dan penghapusan kunci yang sudah dimiliki orang lain. Perbaikan minimumnya memakai nilai unik dan penghapusan bersyarat, dan tetap tidak menyelesaikan masalah pertama.

Tiga jalan yang lebih baik, berurutan:

**Satu, jangan butuh kunci.** Rancang pekerjaannya agar aman dijalankan beberapa kali, atau pakai `FOR UPDATE SKIP LOCKED` dari modul 8 sehingga basis data yang membagi pekerjaan.

**Dua, pakai kunci basis data.** `pg_advisory_lock` terikat pada sesi, jadi ia otomatis dilepas kalau prosesnya mati, dan tidak punya masalah masa berlaku.

```ts
// Hanya satu proses yang menjalankan ini, dan kuncinya lepas sendiri
// kalau prosesnya mati. Jauh lebih aman daripada kunci berbasis masa berlaku.
await db.transaction(async (tx) => {
  const [hasil] = await tx.execute(sql`SELECT pg_try_advisory_xact_lock(${kunciNumerik}) AS dapat`);
  if (!hasil.dapat) return;

  await kerjakanLaporan(tx);
});
```

**Tiga, kalau benar-benar butuh kunci terdistribusi**, pahami bahwa jaminannya terbatas, dan pastikan operasi yang dilindunginya tetap aman kalau kuncinya gagal. Kunci terdistribusi adalah pengoptimalan untuk menghindari pekerjaan ganda, bukan jaminan kebenaran.

## Jam tidak bisa dipercaya

Dua mesin tidak punya jam yang sama, dan selisihnya bisa puluhan milidetik sampai beberapa detik. Tiga akibat praktisnya:

**Satu, jangan menentukan urutan dari waktu.** "Peristiwa mana yang terjadi lebih dulu" tidak bisa dijawab dengan membandingkan `timestamp` dari dua mesin. Pakai nomor urut dari satu sumber, seperti id outbox di modul 15.

**Dua, jangan memakai waktu sebagai kunci unik.** Dua peristiwa dalam milidetik yang sama akan bentrok, dan jam yang diputar balik oleh NTP bisa menghasilkan waktu yang sama dua kali.

**Tiga, waktu kedaluwarsa butuh kelonggaran.** Token yang kedaluwarsa pada detik tertentu akan ditolak layanan yang jamnya lebih cepat beberapa detik. Beri toleransi beberapa detik saat memverifikasi.

## Pengiriman tepat satu kali tidak ada

Satu kalimat yang pantas ditutup di akhir seri: **dalam sistem terdistribusi, "tepat satu kali" tidak bisa dijamin pada tingkat pengiriman.**

Alasannya sederhana. Pengirim mengirim pesan, lalu jaringan terputus sebelum pengakuan sampai. Pengirim punya dua pilihan, dan keduanya punya risiko: kirim lagi (mungkin dua kali diproses), atau tidak kirim lagi (mungkin tidak pernah diproses).

Yang bisa dicapai, dan yang dipakai semua sistem serius: **pengiriman minimal sekali, ditambah penerima yang idempoten.** Hasil akhirnya setara dengan tepat satu kali, dan dicapai dengan cara yang berbeda.

Itu sebabnya idempotensi muncul di hampir setiap modul di separuh kedua seri ini: modul 4 untuk API, modul 8 untuk transaksi, modul 14 untuk pekerjaan, modul 15 untuk peristiwa, dan sekarang di setiap batas saga. Bukan karena kebetulan, melainkan karena **idempotensi adalah harga masuk untuk sistem yang bagian-bagiannya bisa gagal sendiri-sendiri.**

## Tangga keputusan

Mungkin bagian paling berharga dari seluruh seri. Sebelum mendistribusikan apa pun, naiki tangga ini dari bawah:

| Tingkat | Langkah | Biaya | Memberi |
| --- | --- | --- | --- |
| 1 | Perbaiki kueri dan indeks | Hari | Sering 10 sampai 100 kali |
| 2 | Cache yang tepat sasaran | Hari | 2 sampai 10 kali pada pembacaan |
| 3 | Pindahkan pekerjaan ke queue | Hari | Latensi dan ketahanan |
| 4 | Mesin yang lebih besar | Uang | 2 sampai 10 kali, tanpa kerumitan |
| 5 | Replika baca | Hari | Memisahkan beban laporan |
| 6 | Partisi dan arsip data lama | Minggu | Tabel dan perawatan lebih ringan |
| 7 | Monolit modular dengan batas tegas | Minggu | Kejelasan kepemilikan, pipeline lebih cepat |
| 8 | Pecah satu layanan | Bulan | Kemandirian rilis satu tim |
| 9 | Beberapa layanan dengan saga | Bulan, permanen | Kemandirian beberapa tim |
| 10 | Sharding | Bulan, permanen | Kapasitas penulisan tanpa batas teoretis |

Dua hal tentang tangga ini:

**Sebagian besar sistem berhenti di tingkat 6 atau 7, dan itu keberhasilan.** Perusahaan dengan ratusan ribu pengguna aktif berjalan dengan satu Postgres dan satu monolit yang dikelola baik, dan itu bukan kebetulan.

**Setiap tingkat di atas 7 menambah kerumitan permanen.** Bukan kerumitan yang bisa dibereskan nanti, melainkan yang akan dirawat selama produknya hidup. Karena itu pertanyaan sebelum menaiki tangga selalu sama: **masalah terukur apa yang sedang kita selesaikan, dan apakah tingkat di bawahnya sudah dicoba?**

## Latihan

### Latihan 1: Bangun saga lengkap

Terapkan saga tiga langkah untuk pembuatan pesanan: reservasi stok, pembuatan tagihan, pengaktifan pesanan. Lalu buktikan dengan lima uji kegagalan.

| # | Uji | Yang harus terjadi |
| --- | --- | --- |
| 1 | Langkah 2 gagal permanen | Langkah 1 diimbangi, pesanan dibatalkan |
| 2 | Proses mati setelah langkah 1 | Saga dilanjutkan pekerjaan pemulihan |
| 3 | Langkah 1 berhasil tapi responsnya hilang | Pengulangan tidak membuat reservasi kedua |
| 4 | Saga tidak pernah selesai | Reservasi kedaluwarsa, stok kembali |
| 5 | Pengimbang gagal 5 kali | Ditandai butuh perhatian, peringatan menyala |

> [!petunjuk]
> Uji nomor 3 adalah yang paling penting dan paling sering dilewatkan. Simulasikan dengan layanan tiruan yang mengerjakan permintaan lalu menutup sambungan tanpa menjawab.

> [!jawaban]
>
> Lima hal yang akan Anda temukan:
>
> 1. **Uji nomor 3 akan gagal pada implementasi pertama.** Kunci idempotensi harus dikirim oleh saga dan sama di setiap pengulangan, dan nilainya diturunkan dari id pesanan, bukan dibuat baru. Ini kesalahan yang sama seperti di modul 19.
>
> ```ts
> // Kunci idempotensi dari data, bukan acak
> const kunci = `reservasi:${muatan.pesananId}`;
> ```
>
> 2. **Uji nomor 2 membuktikan nilai menyimpan keadaan.** Tanpa tabel saga, proses yang mati di tengah berarti alurnya hilang tanpa jejak. Dengan tabel saga dan pekerjaan pemulihan, alurnya lanjut dalam waktu di bawah dua menit.
> 3. **Uji nomor 4 membuktikan nilai reservasi berbatas waktu.** Ini jaring pengaman yang bekerja meski seluruh mekanisme saga gagal, dan itu sebabnya ia pantas ada.
> 4. **Uji nomor 5 memunculkan pertanyaan produk.** Saat pelepasan reservasi gagal berulang, apa yang harus dilihat petugas, dan tindakan apa yang tersedia untuknya? Antarmuka untuk itu adalah bagian dari fitur, bukan tambahan.
> 5. **Anda akan menambahkan satu langkah yang tidak terpikir**: pemeriksaan selisih harian yang membandingkan jumlah reservasi aktif dengan pesanan yang berjalan. Pada sistem terdistribusi, rekonsiliasi berkala adalah lapisan terakhir yang menangkap apa pun yang lolos dari semua lapisan sebelumnya.

### Latihan 2: Perbaiki bug keterlambatan replikasi

Pasang replika baca pada layanan Anda, arahkan semua pembacaan ke sana, lalu temukan dan perbaiki empat gejala yang muncul.

> [!jawaban]
>
> | Gejala | Penyebab | Perbaikan |
> | --- | --- | --- |
> | Pesanan yang baru dibuat tidak muncul di daftar | Baca setelah tulis dari replika | Baca dari primary selama 5 detik setelah penulisan pengguna itu |
> | Status pesanan mundur setelah diperbarui | Dua pembacaan berurutan, satu dari primary satu dari replika | Satu permintaan hanya memakai satu sumber, dipilih di awal |
> | Pembayaran diproses dua kali | Pemeriksaan "sudah dibayar" dari replika yang tertinggal | **Keputusan tulis selalu dari primary**, tanpa pengecualian |
> | Laporan kadang kosong | Replika sedang dipromosikan atau tertinggal jauh | Periksa keterlambatan, dan jatuhkan ke primary di atas ambang |
>
> Gejala ketiga adalah yang paling berbahaya, dan aturannya sama dengan pelajaran cache di modul 13: **jangan pernah mendasarkan keputusan penulisan pada data dari sumber yang bisa tertinggal.** Replika untuk menampilkan, primary untuk memutuskan.
>
> Dan gejala kedua memunculkan aturan yang pantas ditiru:
>
> ```ts
> // Sumber dipilih sekali di awal permintaan, lalu dipakai konsisten
> app.addHook('onRequest', async (req) => {
>   const baruMenulis = await redis.exists(`tulis:${req.pelaku?.penggunaId}`);
>   const mengubah = !['GET', 'HEAD'].includes(req.method);
>
>   req.db = mengubah || baruMenulis || !replikaLayakDipakai ? dbPrimary : dbReplika;
> });
> ```
>
> Dengan itu, satu permintaan tidak mungkin mencampur dua sumber, dan gejala "status mundur" hilang sepenuhnya.

### Latihan 3: Rancang kunci shard, lalu putuskan untuk tidak sharding

Sebuah SaaS punya 2.000 tenant, tabel `peristiwa` berisi 800 juta baris dan bertambah 4 juta per hari, dan basis data 8 vCPU sudah 85% CPU pada jam sibuk. Rancang strategi sharding, lalu nilai apakah sharding memang jawabannya.

> [!pembahasan]
>
> **Rancangan sharding, kalau memang dilakukan:**
>
> Kunci shard `tenant_id`, dengan 1.024 shard logis yang dipetakan ke 4 basis data fisik. Pemetaan disimpan di tabel yang tidak di-shard, sehingga penambahan basis data hanya memindahkan sebagian pemetaan.
>
> ```ts
> function shardUntuk(tenantId: string): number {
>   // Shard logis dari hash, lalu dipetakan ke fisik lewat tabel
>   return Number(BigInt('0x' + sha256(tenantId).slice(0, 8)) % 1024n);
> }
> ```
>
> Masalah yang harus diselesaikan bersamaan: keunikan email global, laporan lintas tenant, dan tenant terbesar yang mungkin melebihi satu shard.
>
> **Dan penilaiannya: sharding bukan jawaban untuk kasus ini.**
>
> Naiki tangga dari bawah, dan hitung:
>
> | Langkah | Perkiraan dampak | Biaya |
> | --- | --- | --- |
> | Periksa 10 kueri termahal | Tabel 800 juta baris hampir selalu punya kueri tanpa indeks yang tepat | 2 hari |
> | Partisi `peristiwa` per bulan | Kueri yang menyaring waktu hanya menyentuh beberapa partisi | 1 minggu |
> | Arsipkan peristiwa di atas 6 bulan | 800 juta jadi sekitar 220 juta. **Ini saja sering cukup** | 2 minggu |
> | Pindahkan laporan ke replika | CPU primary turun jauh, karena laporan biasanya penyumbang terbesar | 3 hari |
> | Naikkan ke 16 vCPU | CPU 85% jadi sekitar 45% | Uang, satu jam kerja |
>
> Empat dari lima langkah itu menyelesaikan masalah 85% CPU, dan totalnya sekitar satu bulan kerja tanpa kerumitan permanen. Sharding adalah pekerjaan beberapa bulan yang mengubah setiap kueri di aplikasi, menghapus transaksi lintas tenant, dan dirawat selamanya.
>
> Pertanyaan yang pantas diajukan: **apa yang akan terjadi 18 bulan lagi?** Dengan 4 juta baris per hari dan pertumbuhan tenant yang tetap, partisi dan arsip akan tetap cukup. Kalau pertumbuhannya 10 kali, perhitungannya berubah, dan saat itulah sharding masuk pembicaraan dengan dasar yang jelas.
>
> Dan satu catatan: menulis analisis ini, lengkap dengan angka dan rekomendasi untuk **tidak** melakukan pekerjaan besar, adalah salah satu kontribusi paling bernilai yang bisa diberikan seorang engineer. Jauh lebih bernilai daripada mengerjakan sharding yang tidak dibutuhkan dengan rapi.

### Latihan 4: Audit kunci dan idempotensi

Periksa seluruh layanan Anda terhadap delapan pertanyaan berikut.

| # | Pertanyaan |
| --- | --- |
| 1 | Ada berapa tempat yang memakai kunci berbasis masa berlaku? |
| 2 | Apa yang terjadi kalau pekerjaan berjalan lebih lama daripada masa berlaku kuncinya? |
| 3 | Apakah ada tempat yang menentukan urutan dari `timestamp` dua mesin? |
| 4 | Apakah setiap batas layanan punya kunci idempotensi? |
| 5 | Apakah kunci idempotensi diturunkan dari data, bukan dibuat acak per percobaan? |
| 6 | Apakah ada rekonsiliasi berkala yang membandingkan dua sumber? |
| 7 | Apakah ada peringatan untuk saga yang mandek? |
| 8 | Apakah setiap pekerjaan terjadwal aman kalau terlewat beberapa kali? |

> [!jawaban]
>
> Lima temuan khas pada audit pertama:
>
> **Nomor 2 tidak punya jawaban.** Kunci Redis 30 detik melindungi pekerjaan yang biasanya 20 detik, dan kadang 45 detik saat data banyak. Pada hari itu, dua proses mengerjakan hal yang sama. Perbaikan: ganti ke `pg_advisory_xact_lock` yang terikat sesi, atau pastikan pekerjaannya idempoten sehingga kuncinya hanya pengoptimalan.
>
> **Nomor 5 ditemukan dua pelanggaran.** Klien HTTP yang membuat `randomUUID()` sebagai kunci idempotensi di dalam fungsi percobaan ulang, sehingga setiap percobaan punya kunci berbeda dan seluruh manfaatnya hilang. Gejalanya: transaksi ganda yang jarang dan sulit direproduksi.
>
> **Nomor 6 tidak ada sama sekali.** Dan ini temuan paling berharga. Pada sistem terdistribusi, rekonsiliasi berkala adalah lapisan yang menangkap apa pun yang lolos:
>
> ```ts
> // Dijalankan tiap jam: bandingkan dua sumber yang seharusnya cocok
> export async function rekonsiliasi() {
>   const [selisih] = await db.execute(sql`
>     SELECT count(*)::int AS jumlah
>     FROM pesanan p
>     WHERE p.status = 'dibayar'
>       AND NOT EXISTS (
>         SELECT 1 FROM tagihan t
>         WHERE t.pesanan_id = p.id AND t.status = 'lunas'
>       )
>   `);
>
>   metrik.selisihPesananTagihan.set(selisih.jumlah);
>
>   if (selisih.jumlah > 0) {
>     log.error({ jumlah: selisih.jumlah }, 'selisih pesanan dan tagihan ditemukan');
>   }
> }
> ```
>
> Angka itu harus nol. Angka yang tidak nol berarti ada alur yang tidak selesai dengan benar, dan menemukannya dalam satu jam jauh lebih baik daripada menemukannya dari laporan keuangan bulanan.
>
> **Nomor 8 menemukan satu pekerjaan yang berbahaya**: penyegaran rekap yang menambahkan penjualan sepuluh menit terakhir ke angka yang ada. Terlewat sekali berarti data hilang permanen, dan berjalan dua kali berarti angka ganda. Perbaikannya menghitung ulang dari keadaan, seperti di modul 14.
>
> **Nomor 3 menemukan satu tempat**: penggabungan dua aliran log dari dua layanan yang diurutkan berdasarkan `timestamp`. Selisih jam beberapa ratus milidetik membuat urutannya kadang salah, dan itu cukup untuk membuat analisis insiden menyesatkan. Perbaikannya memakai id penelusuran dan urutan dari satu sumber.

## Batasnya

Pola di modul ini menyelesaikan koordinasi antar sistem, dan tiga hal tetap berlaku selamanya.

**Konsistensi penuh dan ketersediaan penuh tidak bisa dimiliki bersamaan saat jaringan terputus.** Yang bisa dilakukan: memilih mana yang lebih penting untuk setiap jalur, dan menyatakan pilihannya dengan sadar.

**Setiap pola di sini menambah kerumitan permanen.** Saga, sharding, dan event sourcing akan dirawat selama produknya hidup, dan dibaca oleh orang yang belum bergabung saat keputusannya diambil.

**Rekonsiliasi tidak bisa dihindari.** Pada sistem terdistribusi, selisih akan terjadi. Yang membedakan sistem yang serius bukan ketiadaan selisih, melainkan adanya mekanisme yang menemukannya dalam hitungan jam dan antarmuka untuk menyelesaikannya.

## Rangkuman

- Tidak ada transaksi lintas layanan. Yang menggantikannya adalah saga dengan tindakan pengimbang, keadaan yang disimpan, batas waktu, dan pekerjaan pemulihan.
- Pengimbang bukan penghapusan, melainkan pencatatan pembatalan. Dan pengimbang yang gagal butuh manusia, bukan percobaan ulang tanpa akhir.
- Reservasi berbatas waktu lebih baik daripada pengurangan langsung, karena ia melepas dirinya sendiri saat alurnya mandek.
- Keputusan penulisan selalu dari primary. Replika untuk menampilkan, bukan untuk memutuskan.
- Replika yang terlambat lebih buruk daripada replika yang mati. Pantau keterlambatannya, dan keluarkan dari rotasi di atas ambang.
- Satu permintaan memakai satu sumber data, dipilih di awal, supaya pembacaan tidak pernah mundur.
- Sebelum sharding, naiki tangga dari bawah: indeks, cache, queue, mesin lebih besar, replika, partisi, arsip. Hampir selalu cukup.
- Kalau sharding, pakai `tenant_id` untuk SaaS, banyak shard logis di atas sedikit shard fisik, dan siapkan jawaban untuk keunikan global serta kueri lintas shard.
- Event sourcing untuk bagian yang riwayatnya memang produk, bukan untuk seluruh sistem.
- Hindari kunci terdistribusi berbasis masa berlaku. Pakai `FOR UPDATE SKIP LOCKED`, advisory lock, atau rancang agar tidak butuh kunci.
- Jangan menentukan urutan dari jam dua mesin. Pakai nomor urut dari satu sumber.
- "Tepat satu kali" tidak ada. Yang ada: minimal sekali, ditambah penerima yang idempoten. Itu sebabnya idempotensi muncul di separuh seri ini.
- Rekonsiliasi berkala adalah lapisan terakhir yang menangkap apa pun yang lolos. Angkanya harus nol, dan harus dipantau.
- Sebagian besar sistem berhenti di tingkat 6 atau 7 pada tangga keputusan, dan itu keberhasilan.

## Masalah terbuka

Dua puluh tiga modul dan lima proyek. Anda sudah membangun API, memodelkan data, menjaga kebenaran di bawah konkurensi, mengamankannya, memindahkan pekerjaan ke latar belakang, menyusun arsitektur berbasis peristiwa, mengukur dan mengeraskannya, mengujinya, merilisnya, dan sekarang mengoordinasikannya melintasi beberapa layanan.

Satu hal yang belum pernah diminta sepanjang seri ini: **mempertanggungjawabkan setiap keputusannya.**

Di setiap modul, pilihannya sudah disediakan beserta alasannya. Postgres, bukan yang lain. Sesi tersimpan, bukan JWT mandiri. Outbox, bukan penerbitan langsung. Monolit modular lebih dulu, bukan microservice.

Di pekerjaan nyata, tidak ada yang menyediakan itu. Anda yang memutuskan di mana batas layanan ditarik, data apa yang boleh tertunda, aturan mana yang dijaga basis data dan mana yang dijaga kode, berapa kapasitas yang perlu disiapkan, dan apa yang sengaja tidak dikerjakan karena waktunya lebih baik dipakai untuk hal lain.

Bagian terakhir seri ini meminta hal itu: satu platform utuh, dibangun dari nol sampai tayang, dengan dokumen yang menjelaskan kenapa setiap keputusan besarnya diambil, lengkap dengan angka yang membuktikannya.
