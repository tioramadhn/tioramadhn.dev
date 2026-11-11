---
title: 'Modul 17: Berkas dan Media'
description: Unggahan 240 MB yang melewati proses Node adalah masalah yang tidak perlu ada. Unggahan langsung ke penyimpanan objek, validasi berkas yang sungguhan, penyajian berkas privat, dan pembersihan yang terlupakan.
date: 2026-12-22
slug: modul-17-berkas-dan-media
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Seorang penjual mengunggah dua puluh foto produk, masing-masing 12 MB. Kalau unggahan itu melewati aplikasi Anda, inilah yang terjadi:

| Masalah | Akibat |
| --- | --- |
| 240 MB mengalir lewat proses Node | Memori melonjak, dan dengan beberapa pengunggah bersamaan proses mati |
| Payload diproses di event loop | Semua permintaan lain melambat, seperti di modul 2 |
| Satu sambungan tertahan tiga menit | Slot sambungan dan sumber daya terpakai sepanjang itu |
| Disimpan ke disk container | Hilang saat container diganti |
| Diteruskan ke penyimpanan setelah diterima penuh | Bandwidth dibayar dua kali, dan waktunya berlipat |

Jalan keluarnya satu kalimat: **berkas tidak melewati aplikasi Anda.** Klien mengunggah langsung ke penyimpanan objek dengan izin sementara yang Anda terbitkan, dan aplikasi Anda hanya mengurus metadata dan izin.

Lima pertanyaan yang muncul karenanya, dan semuanya dibahas di modul ini:

| Pertanyaan | Jawaban |
| --- | --- |
| Bagaimana klien mengunggah tanpa punya kredensial penyimpanan? | URL bertanda tangan berumur pendek |
| Bagaimana memastikan yang diunggah benar-benar gambar? | Pemeriksaan di server setelah unggahan, bukan sebelum |
| Siapa yang boleh mengunduh bukti transfer orang lain? | Penyajian lewat URL bertanda tangan setelah otorisasi |
| Siapa membersihkan berkas untuk pesanan yang dibatalkan? | Pekerjaan pembersihan berkala |
| Siapa membuat gambar kecilnya? | Worker, dengan kunci objek yang deterministik |

## Analogi: loket penitipan barang

Kantor dari modul 1 punya gudang penitipan barang di sisi lain bangunan.

**Cara yang buruk.** Semua barang dititipkan lewat meja petugas loket. Pengunjung menyerahkan koper 30 kilogram, petugas mengangkatnya ke gudang, lalu kembali ke meja. Selama itu, antrean di loket berhenti.

**Cara yang benar.** Petugas memberi pengunjung **surat izin masuk gudang** yang berlaku lima belas menit untuk satu rak tertentu. Pengunjung membawa sendiri barangnya ke gudang. Petugas hanya mencatat bahwa rak itu dipesan untuk pengunjung tersebut, dan memeriksa isinya setelah penitipan selesai.

| Dunia penitipan | Dunia backend |
| --- | --- |
| Gudang di sisi lain bangunan | Penyimpanan objek: S3, R2, GCS |
| Surat izin masuk gudang | URL bertanda tangan untuk unggah |
| Nomor rak yang ditentukan petugas | Kunci objek yang ditentukan server |
| Masa berlaku surat | Masa berlaku tanda tangan |
| Petugas memeriksa isi setelah dititipkan | Validasi setelah unggahan |
| Catatan "rak 42 milik pengunjung X" | Baris metadata di basis data |
| Surat pengambilan untuk orang lain | URL bertanda tangan untuk unduh |
| Rak yang dipesan tapi tidak pernah diisi | Berkas yatim, dan perlu dibersihkan |

Batas analoginya yang penting: petugas bisa melihat koper dan tahu itu koper, sedangkan server hanya menerima deretan byte beserta keterangan dari pengirimnya. Keterangan itu tidak bisa dipercaya, dan bagian validasi di modul ini membahasnya.

## Alur unggahan langsung

```ts
// 1. Klien meminta izin unggah
app.post('/v1/unggahan/izin', { onRequest: [app.autentikasi] }, async (req) => {
  const { tujuan, namaAsli, tipe, ukuran } = skemaIzinUnggah.parse(req.body);

  pastikanBoleh(req.pelaku, izinUntukTujuan(tujuan));

  // Batas ukuran dan tipe diperiksa di sini, dan ditegakkan lagi oleh penyimpanan
  if (ukuran > BATAS[tujuan].ukuranMaks) {
    throw new ErrorAturanBisnis(
      `Ukuran maksimal ${BATAS[tujuan].ukuranMaks / 1024 / 1024} MB`,
      'TERLALU_BESAR'
    );
  }

  if (!BATAS[tujuan].tipeDiizinkan.includes(tipe)) {
    throw new ErrorAturanBisnis('Jenis berkas tidak diizinkan', 'TIPE_TIDAK_VALID');
  }

  // Kunci objek ditentukan server, tidak pernah dari nama asli berkas.
  // Pelajaran modul 12: nama dari pengguna hanya metadata untuk ditampilkan.
  const berkasId = idBaru();
  const ekstensi = EKSTENSI_AMAN[tipe] ?? 'bin';
  const kunci = `${req.pelaku.tenantId}/${tujuan}/${tahunBulan()}/${berkasId}.${ekstensi}`;

  // Catatan metadata dibuat lebih dulu dengan status menunggu
  await repoBerkas.simpan({
    id: berkasId,
    tenantId: req.pelaku.tenantId,
    diunggahOleh: req.pelaku.penggunaId,
    tujuan,
    kunci,
    namaAsli: namaAsli.slice(0, 255),
    tipeDiklaim: tipe,
    ukuranDiklaim: ukuran,
    status: 'menunggu',
  });

  const url = await penyimpanan.urlUnggah({
    kunci,
    tipe,
    // Penyimpanan menolak unggahan yang melebihi ini, jadi batasnya ditegakkan
    ukuranMaks: BATAS[tujuan].ukuranMaks,
    kedaluwarsaDetik: 900,
  });

  return { berkasId, url, kunci, kedaluwarsaDalam: 900 };
});
```

```ts
// 2. Klien mengunggah langsung ke penyimpanan dengan URL itu
// 3. Klien memberi tahu bahwa unggahannya selesai
app.post('/v1/unggahan/:id/selesai', { onRequest: [app.autentikasi] }, async (req) => {
  const berkas = await repoBerkas.ambil(req.params.id);
  if (!berkas) throw new ErrorTidakDitemukan();

  pastikanBoleh(req.pelaku, 'berkas:unggah', { tenantId: berkas.tenantId });

  if (berkas.status !== 'menunggu') return { berkasId: berkas.id, status: berkas.status };

  // Jangan percaya klien: periksa sendiri ke penyimpanan
  const nyata = await penyimpanan.periksa(berkas.kunci);

  if (!nyata) throw new ErrorAturanBisnis('Berkas belum terunggah', 'BELUM_ADA');

  if (nyata.ukuran > BATAS[berkas.tujuan].ukuranMaks) {
    await penyimpanan.hapus(berkas.kunci);
    await repoBerkas.tandaiDitolak(berkas.id, 'ukuran melebihi batas');
    throw new ErrorAturanBisnis('Berkas terlalu besar', 'TERLALU_BESAR');
  }

  // Validasi isi sungguhan, bukan keterangan dari klien
  const pemeriksaan = await periksaIsiBerkas(berkas, nyata);

  if (!pemeriksaan.lolos) {
    await penyimpanan.hapus(berkas.kunci);
    await repoBerkas.tandaiDitolak(berkas.id, pemeriksaan.alasan);
    throw new ErrorAturanBisnis(pemeriksaan.alasan, 'BERKAS_TIDAK_VALID');
  }

  await repoBerkas.tandaiSiap(berkas.id, {
    ukuran: nyata.ukuran,
    tipeNyata: pemeriksaan.tipe,
    etag: nyata.etag,
  });

  // Turunan dibuat di latar belakang, dengan kunci deterministik
  if (pemeriksaan.tipe.startsWith('image/')) {
    await antreanMedia.tambah({
      jenis: 'buat-turunan-gambar',
      muatan: { berkasId: berkas.id, idempotensi: `turunan:${berkas.id}` },
    });
  }

  return { berkasId: berkas.id, status: 'siap' };
});
```

Lima keputusan di alur itu:

**Satu, metadata dibuat sebelum unggahan.** Dengan begitu Anda punya catatan tentang rak yang dipesan, dan berkas yang tidak pernah diisi bisa ditemukan dan dibersihkan.

**Dua, kunci objek ditentukan server.** Memakai nama asli berkas sebagai kunci membuka dua celah: path traversal dari modul 12, dan penimpaan berkas orang lain dengan nama yang sama.

**Tiga, tenant ada di awal kunci.** Itu membuat penghapusan per tenant, perhitungan kuota, dan aturan masa simpan jadi mudah, dan membuat kebocoran lintas tenant lebih sulit terjadi.

**Empat, langkah "selesai" tidak percaya klien.** Klien bisa mengaku selesai tanpa mengunggah apa pun, atau mengunggah berkas yang berbeda dari yang dijanjikan. Periksa sendiri ke penyimpanan.

**Lima, batas ukuran ditegakkan dua kali.** Di aplikasi saat menerbitkan izin, dan di penyimpanan lewat syarat pada tanda tangan. Tanpa yang kedua, klien bisa mengunggah 5 GB dengan URL yang diterbitkan untuk 5 MB.

## Validasi isi, bukan keterangan

Ini bagian yang paling sering dikerjakan setengah.

```ts
import { fileTypeFromBuffer } from 'file-type';

const TIPE_AMAN = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf',
]);

export async function periksaIsiBerkas(berkas: Berkas, nyata: ObjekPenyimpanan) {
  // Baca hanya awal berkas, cukup untuk mengenali jenisnya
  const kepala = await penyimpanan.bacaSebagian(berkas.kunci, 0, 4_100);

  const terdeteksi = await fileTypeFromBuffer(kepala);

  // 1. Jenis sungguhan dari byte penanda, bukan dari ekstensi atau content-type
  if (!terdeteksi || !TIPE_AMAN.has(terdeteksi.mime)) {
    return { lolos: false, alasan: 'Jenis berkas tidak dikenal atau tidak diizinkan' };
  }

  // 2. Harus cocok dengan yang dijanjikan saat meminta izin
  if (terdeteksi.mime !== berkas.tipeDiklaim) {
    return { lolos: false, alasan: 'Jenis berkas tidak sesuai yang dilaporkan' };
  }

  // 3. Untuk gambar: periksa dimensinya sebelum diproses
  if (terdeteksi.mime.startsWith('image/')) {
    const dimensi = await bacaDimensi(kepala);

    if (!dimensi) return { lolos: false, alasan: 'Gambar tidak dapat dibaca' };

    // Gambar 50.000 x 50.000 piksel berukuran kecil terkompresi
    // dan butuh 10 GB memori saat dibuka. Namanya decompression bomb.
    if (dimensi.lebar * dimensi.tinggi > 50_000_000) {
      return { lolos: false, alasan: 'Resolusi gambar terlalu besar' };
    }
  }

  return { lolos: true, tipe: terdeteksi.mime };
}
```

Tujuh jenis berkas berbahaya yang pantas dikenali:

| Bentuk | Bahayanya | Pencegahan |
| --- | --- | --- |
| Skrip bernama `.jpg` | Dijalankan kalau disajikan dengan tipe yang salah | Deteksi dari byte penanda, sajikan dengan tipe hasil deteksi |
| SVG dengan `<script>` | XSS saat dibuka di peramban dari domain Anda | Jangan izinkan SVG, atau bersihkan, atau sajikan dari domain terpisah |
| HTML yang diunggah | XSS dari domain Anda | Jangan sajikan `text/html` dari penyimpanan pengguna |
| Gambar resolusi raksasa | Memori habis saat diproses | Batasi jumlah piksel |
| Zip dengan path `../` | Menulis berkas di luar folder tujuan | Jangan pernah mengekstrak dengan path dari arsip |
| Zip yang mengembang ribuan kali | Disk penuh | Batasi ukuran hasil ekstraksi |
| PDF dengan JavaScript | Eksekusi di pembaca PDF pengguna | Sajikan sebagai unduhan, bukan tampilan inline |

Dua pertahanan tambahan yang berlaku umum:

**Sajikan dengan tipe hasil deteksi, bukan tipe dari klien.** Dan untuk berkas yang tidak perlu ditampilkan di peramban, kirim `Content-Disposition: attachment` sehingga diunduh, bukan dirender.

**Sajikan berkas pengguna dari domain terpisah.** Dengan begitu, satu berkas berbahaya yang lolos tidak berjalan pada domain yang memegang cookie sesi Anda. Ini pertahanan berlapis yang murah, dan dipakai semua layanan besar.

## Menyajikan berkas privat

Bukti transfer dan dokumen internal tidak boleh bisa diunduh dengan menebak URL.

```ts
app.get('/v1/berkas/:id/unduh', { onRequest: [app.autentikasi] }, async (req, res) => {
  const berkas = await repoBerkas.ambil(req.params.id);
  if (!berkas || berkas.status !== 'siap') throw new ErrorTidakDitemukan();

  // Otorisasi penuh, termasuk tenant dan kepemilikan
  pastikanBoleh(req.pelaku, izinUntukTujuan(berkas.tujuan), {
    tenantId: berkas.tenantId,
    pemilikId: berkas.diunggahOleh,
  });

  await repoAudit.catat({
    jenis: 'berkas-diunduh',
    pelakuId: req.pelaku.penggunaId,
    target: berkas.id,
  });

  // Alihkan ke URL bertanda tangan berumur sangat pendek.
  // Isi berkas tidak melewati aplikasi Anda, sama seperti saat unggah.
  const url = await penyimpanan.urlUnduh({
    kunci: berkas.kunci,
    kedaluwarsaDetik: 60,
    namaUnduhan: berkas.namaAsli,
    tipe: berkas.tipeNyata,
    paksaUnduh: berkas.tujuan === 'bukti-transfer',
  });

  return res.redirect(url, 302);
});
```

Empat catatan:

**Satu, pengalihan dengan URL berumur 60 detik.** Cukup untuk pengguna mengklik dan mengunduh, dan terlalu pendek untuk dibagikan ulang dengan berguna. URL bertanda tangan 7 hari yang terkirim di grup pesan adalah kebocoran yang bertahan seminggu.

**Dua, jejak audit untuk berkas sensitif.** Siapa mengunduh dokumen apa dan kapan adalah pertanyaan yang pasti muncul saat ada insiden.

**Tiga, berkas publik tidak perlu lewat jalur ini.** Foto produk disajikan langsung dari CDN dengan URL permanen, dan itu jauh lebih murah serta lebih cepat. Bedakan dengan sadar: publik langsung ke CDN, privat lewat pemeriksaan.

**Empat, kalau URL bertanda tangan tidak memadai**, misalnya karena Anda perlu memberi watermark atau mencatat setiap byte yang dibaca, barulah alirkan lewat aplikasi. Pakai `pipeline` dari modul 2 supaya memori tetap kecil, dan sadari bahwa Anda membayar bandwidth dua kali.

## Turunan dan pemrosesan

Membuat gambar kecil dikerjakan worker, dengan kunci yang deterministik supaya aman diulang.

```ts
export async function buatTurunanGambar(muatan: { berkasId: string }) {
  const berkas = await repoBerkas.ambil(muatan.berkasId);
  if (!berkas || berkas.status !== 'siap') return { dilewati: true };

  const UKURAN = [
    { nama: 'kecil', lebar: 200 },
    { nama: 'sedang', lebar: 800 },
    { nama: 'besar', lebar: 1600 },
  ];

  for (const u of UKURAN) {
    const kunciTurunan = `${berkas.kunci}.${u.nama}.webp`;

    // Idempoten secara alami: ada berarti sudah dikerjakan
    if (await penyimpanan.ada(kunciTurunan)) continue;

    // Alirkan, jangan tampung seluruh gambar di memori
    await pipeline(
      await penyimpanan.alirkanBaca(berkas.kunci),
      sharp().resize({ width: u.lebar, withoutEnlargement: true }).webp({ quality: 82 }),
      await penyimpanan.alirkanTulis(kunciTurunan, { tipe: 'image/webp' })
    );
  }

  await repoBerkas.tandaiTurunanSiap(berkas.id, UKURAN.map((u) => u.nama));

  return { selesai: true };
}
```

Empat hal yang penting:

**Satu, kunci turunan diturunkan dari kunci aslinya.** Dijalankan dua kali menghasilkan berkas yang sama, dan tidak perlu tabel idempotensi. Ini bentuk terbaik dari pelajaran modul 14.

**Dua, pemrosesan gambar berada di worker, bukan di API.** `sharp` memakai thread pool libuv, dan pada beberapa pemrosesan bersamaan itu langsung terasa, sesuai pelajaran modul 2.

**Tiga, dialirkan, tidak ditampung.** Gambar 12 MB yang ditampung penuh dikali sepuluh pekerjaan bersamaan berarti 120 MB, dan itu sebelum memori kerja pemrosesannya.

**Empat, untuk video, jangan dikerjakan sendiri.** Transkode video memakan CPU besar dan berjalan menit sampai jam. Pakai layanan khusus, atau worker terpisah dengan mesin yang memang untuk itu, dan jangan pernah di proses yang sama dengan API.

Satu keputusan desain yang memengaruhi biaya: **buat turunan saat diunggah, atau saat pertama diminta?** Membuat saat diunggah berarti semua ukuran dibayar untuk setiap gambar meski tidak pernah dilihat. Membuat saat diminta berarti pengguna pertama menunggu, dan itu bisa diselesaikan dengan CDN yang melakukan pengubahan ukuran di tepi. Untuk katalog dengan banyak gambar yang jarang dilihat, pendekatan kedua jauh lebih murah.

## Berkas yatim dan kuota

Dua pekerjaan operasional yang hampir selalu terlupakan sampai tagihan datang.

```ts
// Pembersihan harian: izin unggah yang tidak pernah dipakai
export async function bersihkanBerkasYatim() {
  // 1. Metadata menunggu lebih dari 24 jam: izinnya sudah kedaluwarsa
  const menunggu = await db.execute(sql`
    DELETE FROM berkas
    WHERE status = 'menunggu' AND dibuat_pada < now() - interval '24 hours'
    RETURNING kunci
  `);

  for (const b of menunggu) {
    // Mungkin ada, mungkin tidak. Hapus tanpa error kalau tidak ada.
    await penyimpanan.hapusKalauAda(b.kunci);
  }

  // 2. Berkas yang tidak lagi dirujuk entitas mana pun
  const takDirujuk = await db.execute(sql`
    SELECT b.id, b.kunci FROM berkas b
    WHERE b.status = 'siap'
      AND b.tujuan = 'foto-produk'
      AND NOT EXISTS (SELECT 1 FROM produk_gambar pg WHERE pg.berkas_id = b.id)
      AND b.dibuat_pada < now() - interval '7 days'
    LIMIT 1000
  `);

  for (const b of takDirujuk) {
    await penyimpanan.hapus(b.kunci);
    await penyimpanan.hapusKalauAda(`${b.kunci}.kecil.webp`);
    await penyimpanan.hapusKalauAda(`${b.kunci}.sedang.webp`);
    await penyimpanan.hapusKalauAda(`${b.kunci}.besar.webp`);
    await repoBerkas.hapus(b.id);
  }

  return { dibersihkan: menunggu.length + takDirujuk.length };
}
```

Dua catatan tentang pembersihan ini:

**Jeda tujuh hari itu disengaja.** Berkas yang baru diunggah dan belum dirujuk mungkin sedang dalam proses: pengguna mengunggah foto, lalu menutup tab sebelum menyimpan produknya, lalu kembali besok. Menghapus terlalu cepat berarti menghapus pekerjaan yang masih berjalan.

**Arah pemeriksaan penting.** Memeriksa "berkas yang tidak dirujuk" aman. Memeriksa "rujukan yang berkasnya tidak ada" juga perlu, dan itu menemukan masalah yang berbeda: entitas yang menunjuk ke berkas yang sudah hilang. Jalankan keduanya sebagai pemeriksaan kesehatan data.

Untuk kuota per tenant:

```sql
-- Kolom yang diperbarui dalam transaksi yang sama saat berkas ditandai siap
ALTER TABLE tenant ADD COLUMN penyimpanan_terpakai_bytes bigint NOT NULL DEFAULT 0;

-- Dan pemeriksaan sebelum menerbitkan izin unggah
SELECT penyimpanan_terpakai_bytes + $2 <= rencana_batas_bytes AS boleh
FROM tenant t JOIN rencana r ON r.id = t.rencana WHERE t.id = $1;
```

Perhatikan bahwa penghitung ini adalah data turunan yang disimpan, dan dari modul 5 Anda tahu syaratnya: diperbarui dalam transaksi yang sama, dan harus bisa dihitung ulang dari nol kalau menyimpang. Sediakan pekerjaan rekonsiliasi yang menjumlahkan ukuran berkas per tenant lalu memperbaiki penghitungnya.

Dan satu hal tentang biaya yang sering mengejutkan: **egress jauh lebih mahal daripada penyimpanan** di sebagian besar penyedia. Menyimpan 1 TB mungkin beberapa dolar per bulan, sedangkan mengirimkan 1 TB ke pengguna bisa puluhan kali lipat. Dua akibat praktisnya: pasang CDN di depan berkas publik supaya satu berkas populer tidak diambil ribuan kali dari penyimpanan, dan pilih penyedia yang egress-nya murah atau nol kalau produk Anda banyak melayani unduhan.

## Latihan

### Latihan 1: Bangun alur unggahan lengkap

Tambahkan unggahan foto produk dan bukti transfer ke Proyek 4. Syaratnya: isi berkas tidak pernah melewati aplikasi, batas ukuran ditegakkan penyimpanan, jenis diverifikasi dari byte penanda, foto produk publik lewat CDN, dan bukti transfer privat dengan audit.

> [!petunjuk]
> Jalankan penyimpanan objek secara lokal dengan MinIO atau Cloudflare R2 lewat Wrangler, supaya alurnya sama dengan produksi. Jangan menguji dengan menulis ke disk lokal, karena perbedaan perilakunya justru di bagian yang penting: URL bertanda tangan dan syarat pada tanda tangan.

> [!jawaban]
>
> Lima hal yang biasanya jadi hambatan:
>
> 1. **CORS di penyimpanan, bukan di aplikasi.** Klien mengunggah langsung ke domain penyimpanan, jadi aturan CORS harus disetel di bucket. Gejala kalau terlewat: unggahan gagal di peramban dengan error CORS, dan berhasil dengan `curl`.
> 2. **Syarat ukuran pada tanda tangan.** Pada S3 ini memakai kebijakan POST dengan `content-length-range`, dan pada R2 lewat parameter yang setara. Tanpa itu, batas ukuran Anda hanya saran.
> 3. **Dua tujuan, dua kebijakan.** Foto produk: publik, CDN, URL permanen, turunan dibuat. Bukti transfer: privat, tanpa CDN, URL 60 detik, audit, dan `Content-Disposition: attachment`. Pisahkan prefiks kuncinya juga, supaya aturan bucket bisa berbeda.
> 4. **Langkah "selesai" harus tahan terhadap klien yang tidak memanggilnya.** Pengguna bisa menutup tab setelah unggahan berhasil tapi sebelum memanggil endpoint selesai. Dua jalan keluar: pekerjaan yang memeriksa berkas berstatus menunggu yang ternyata sudah ada di penyimpanan, atau notifikasi peristiwa dari penyimpanan kalau penyedia Anda menyediakannya.
> 5. **Hitung ulang nama berkas untuk ditampilkan.** `namaAsli` dari pengguna dipakai hanya di `Content-Disposition` dan di antarmuka, dan harus dibersihkan dari karakter kutip serta baris baru sebelum masuk header. Tanpa itu, nama berkas yang dibuat khusus bisa menyuntik header.

### Latihan 2: Uji tujuh berkas berbahaya

Siapkan tujuh berkas uji, lalu pastikan semuanya ditolak atau ditangani dengan aman.

| # | Berkas |
| --- | --- |
| 1 | Skrip shell yang dinamai `foto.jpg` |
| 2 | SVG berisi `<script>alert(document.cookie)</script>` |
| 3 | Berkas HTML dinamai `katalog.pdf` |
| 4 | PNG 30.000 x 30.000 piksel, berukuran 200 kB terkompresi |
| 5 | JPEG sah berukuran 60 MB saat batasnya 5 MB |
| 6 | Berkas kosong 0 byte |
| 7 | JPEG sah dengan nama `"; rm -rf /; ".jpg` |

> [!jawaban]
>
> | # | Yang harus terjadi | Yang menjaganya |
> | --- | --- | --- |
> | 1 | Ditolak | Deteksi byte penanda tidak menemukan jenis gambar |
> | 2 | Ditolak | SVG tidak ada di daftar tipe yang diizinkan |
> | 3 | Ditolak | Jenis terdeteksi `text/html`, tidak cocok klaim dan tidak diizinkan |
> | 4 | Ditolak | Pemeriksaan jumlah piksel, sebelum berkas dibuka pemroses |
> | 5 | Ditolak **oleh penyimpanan**, sebelum sampai ke Anda | Syarat ukuran pada tanda tangan |
> | 6 | Ditolak | Deteksi jenis gagal pada berkas kosong |
> | 7 | **Diterima**, dan namanya aman | Kunci objek dari server, nama asli hanya metadata |
>
> Empat pelajaran dari daftar ini:
>
> **Nomor 2 adalah yang paling sering lolos.** SVG adalah gambar sekaligus dokumen yang bisa memuat skrip, dan deteksi jenis akan mengenalinya sebagai gambar yang sah. Tiga pilihan: tolak SVG sama sekali (paling aman, dan cukup untuk hampir semua produk), bersihkan dengan pustaka khusus lalu simpan hasil bersihnya, atau sajikan dari domain terpisah dengan `Content-Security-Policy` ketat.
>
> **Nomor 4 adalah serangan terhadap worker Anda, bukan terhadap pengguna.** Berkasnya kecil sehingga lolos batas ukuran, dan membukanya butuh sekitar 3,6 GB memori. Pemeriksaan jumlah piksel harus dilakukan dari header gambar, **sebelum** gambarnya dibuka pemroses.
>
> **Nomor 5 membuktikan nilai syarat pada tanda tangan.** Kalau unggahannya berhasil dan baru ditolak di langkah "selesai", Anda sudah membayar bandwidth dan penyimpanan untuk 60 MB, dan penyerang bisa mengulanginya ribuan kali.
>
> **Nomor 7 diterima, dan itu jawaban yang benar.** Nama berkas yang aneh bukan alasan menolak, selama nama itu tidak pernah dipakai sebagai path, kunci, atau argumen perintah. Kalau berkas ini ditolak sistem Anda, kemungkinan Anda masih memakai nama asli untuk sesuatu yang berbahaya.

### Latihan 3: Temukan dan bersihkan berkas yatim

Jalankan pemeriksaan kesehatan data pada Proyek 4, dan temukan empat jenis ketidaksesuaian antara basis data dan penyimpanan.

> [!pembahasan]
>
> | Jenis | Cara menemukan | Tindakan |
> | --- | --- | --- |
> | Metadata menunggu yang objeknya tidak ada | `WHERE status='menunggu' AND dibuat_pada < now()-'24h'` | Hapus barisnya |
> | Metadata menunggu yang objeknya **ada** | Periksa penyimpanan untuk baris menunggu | Jalankan langkah "selesai" |
> | Objek tanpa metadata | Daftar isi bucket, bandingkan dengan tabel | Hapus setelah jeda, dan cari penyebabnya |
> | Metadata siap tanpa rujukan entitas | `NOT EXISTS` ke tabel yang merujuk | Hapus setelah 7 hari |
>
> Baris kedua yang paling berharga dan paling sering tidak terpikir: berkas yang **sudah terunggah dengan benar** tapi klien tidak pernah memanggil endpoint selesai. Pengguna sudah membayar waktu dan kuota internetnya, dan berkasnya ada di penyimpanan. Menghapusnya berarti membuang pekerjaan yang sudah berhasil. Yang benar: jalankan langkah selesai dari sisi server.
>
> ```ts
> // Pekerjaan pemulihan yang jalan tiap 10 menit
> export async function pulihkanUnggahanTerputus() {
>   const menunggu = await db.execute(sql`
>     SELECT * FROM berkas
>     WHERE status = 'menunggu'
>       AND dibuat_pada BETWEEN now() - interval '24 hours' AND now() - interval '2 minutes'
>     LIMIT 200
>   `);
>
>   for (const berkas of menunggu) {
>     const nyata = await penyimpanan.periksa(berkas.kunci);
>     if (!nyata) continue;   // belum atau tidak pernah diunggah
>
>     // Jalur yang sama dengan endpoint selesai, dipakai ulang
>     await selesaikanUnggahan(berkas, nyata);
>   }
> }
> ```
>
> Dan tiga catatan tentang baris ketiga di tabel, yaitu objek tanpa metadata:
>
> 1. **Jangan hapus langsung.** Objek tanpa metadata bisa berarti bug yang sedang berjalan, dan menghapusnya menghilangkan bukti.
> 2. **Cari penyebabnya.** Dua penyebab yang umum: transaksi yang gagal setelah objek terunggah, dan penghapusan metadata tanpa penghapusan objek.
> 3. **Pakai aturan masa simpan penyimpanan sebagai jaring.** Hampir semua penyedia bisa diatur untuk menghapus objek di prefiks tertentu setelah beberapa hari. Untuk prefiks sementara, itu pembersihan yang berjalan tanpa kode.

### Latihan 4: Sajikan berkas privat dengan benar

Rancang penyajian untuk empat jenis berkas, dan untuk masing-masing tentukan: lewat CDN atau tidak, URL permanen atau bertanda tangan, masa berlaku, audit, dan header yang dipasang.

| # | Berkas |
| --- | --- |
| 1 | Foto produk di katalog publik |
| 2 | Bukti transfer pembeli |
| 3 | Laporan penjualan PDF untuk pemilik toko |
| 4 | Lampiran pada percakapan dukungan pelanggan |

> [!jawaban]
>
> | # | CDN | URL | Masa berlaku | Audit | Header |
> | --- | --- | --- | --- | --- | --- |
> | 1 | Ya | Permanen, publik | Cache 1 tahun | Tidak | `cache-control: public, max-age=31536000, immutable` |
> | 2 | Tidak | Bertanda tangan | 60 detik | **Ya** | `attachment`, `no-store` |
> | 3 | Tidak | Bertanda tangan | 300 detik | Ya | `attachment`, `no-store` |
> | 4 | Tidak | Bertanda tangan | 300 detik | Ya | `attachment`, `no-store` |
>
> Lima penjelasan:
>
> **Nomor 1 memakai `immutable` dan masa cache satu tahun**, dan itu aman karena kuncinya memuat id yang tidak pernah berubah. Kalau gambarnya diganti, kuncinya berganti juga, jadi tidak ada cache yang perlu dibatalkan. Pola ini membuat gambar Anda praktis gratis setelah pengguna pertama, dan satu-satunya syarat: **jangan pernah menimpa objek di kunci yang sama.**
>
> **Nomor 2 paling ketat karena isinya data keuangan orang lain.** 60 detik cukup untuk satu klik, dan `attachment` memastikan berkas tidak dirender di peramban.
>
> **Nomor 3 punya pertanyaan tambahan yang mudah terlewat**: siapa yang membuat PDF-nya, dan apakah PDF itu disimpan selamanya? Laporan yang dibuat ulang setiap kali diminta tidak perlu disimpan, dan itu menghilangkan satu tempat data sensitif menumpuk. Kalau disimpan, pasang aturan masa simpan, misalnya 90 hari.
>
> **Nomor 4 punya jebakan otorisasi yang berbeda.** Lampiran pada percakapan dukungan bisa diakses pembeli, staf dukungan, dan pemilik toko, dengan aturan yang berbeda per peran. Jangan menurunkan izinnya dari "siapa yang mengunggah", tapi dari "siapa yang boleh membaca percakapan ini". Dan saat staf dukungan mengunduh, catat di audit, karena itu akses ke data pelanggan.
>
> Satu hal terakhir yang berlaku untuk nomor 2 sampai 4: **URL bertanda tangan yang sudah diterbitkan tidak bisa dicabut.** Kalau akses perlu dicabut seketika, URL bertanda tangan bukan jawabannya, dan Anda harus mengalirkan lewat aplikasi dengan pemeriksaan per permintaan. Masa berlaku yang pendek adalah kompromi yang hampir selalu cukup, dan menyadari batasnya penting.

## Batasnya

Pengelolaan berkas yang benar tetap punya tiga batas.

**Pemeriksaan jenis tidak mendeteksi malware.** Berkas PDF yang sah bisa berisi muatan berbahaya untuk pembaca PDF penggunanya. Kalau produk Anda berbagi berkas antar pengguna, pemindaian malware adalah kebutuhan nyata, dan itu layanan terpisah.

**Biaya egress bisa jadi komponen tagihan terbesar.** Dan itu bukan masalah yang diselesaikan kode, melainkan pilihan penyedia dan strategi CDN.

**Berkas besar tetap sulit.** Unggahan 5 GB butuh unggahan bertahap dengan kemampuan melanjutkan, dan itu alur yang jauh lebih rumit daripada yang dibahas di modul ini.

## Rangkuman

- Isi berkas tidak melewati aplikasi Anda. Klien mengunggah langsung ke penyimpanan objek dengan URL bertanda tangan berumur pendek.
- Metadata dibuat sebelum unggahan, supaya berkas yang tidak pernah selesai bisa ditemukan dan dibersihkan.
- Kunci objek ditentukan server dan memuat tenant. Nama asli dari pengguna hanya metadata untuk ditampilkan.
- Batas ukuran ditegakkan dua kali: di aplikasi, dan sebagai syarat pada tanda tangan.
- Jenis berkas diverifikasi dari byte penanda, bukan dari ekstensi maupun `content-type`, lalu harus cocok dengan yang diklaim.
- SVG, HTML, gambar resolusi raksasa, dan arsip adalah empat bentuk yang paling sering jadi celah. Sajikan berkas pengguna dari domain terpisah.
- Berkas publik lewat CDN dengan URL permanen dan cache panjang, syaratnya kunci tidak pernah ditimpa. Berkas privat lewat pengalihan ke URL 60 detik, setelah otorisasi dan audit.
- URL bertanda tangan yang sudah diterbitkan tidak bisa dicabut. Masa berlaku pendek adalah kompromi, dan batasnya perlu disadari.
- Turunan dibuat worker dengan kunci deterministik, dialirkan bukan ditampung, dan video diserahkan ke layanan khusus.
- Berkas yatim muncul dalam empat bentuk, dan yang paling berharga ditemukan adalah unggahan yang berhasil tapi langkah selesainya tidak pernah dipanggil.
- Egress biasanya lebih mahal daripada penyimpanan. Pasang CDN, dan ketahui angka tagihan Anda.

## Masalah terbuka

Layanan Anda sekarang lengkap: API, basis data, autentikasi, cache, queue, peristiwa, realtime, dan berkas. Semuanya berjalan, dan ada satu pertanyaan yang belum bisa Anda jawab.

Pukul dua pagi, seorang pelanggan mengirim pesan: "pesanan saya tidak bisa dibuat sejak satu jam lalu". Anda membuka log dan menemukan ratusan ribu baris dari tujuh proses berbeda. Anda tidak tahu permintaan mana yang miliknya, tidak tahu apakah masalahnya di API, worker, atau penyedia pembayaran, dan tidak tahu apakah ini terjadi pada satu pelanggan atau seribu.

Anda juga tidak tahu sejak kapan tepatnya, karena tidak ada grafik yang bisa dilihat. Yang ada hanya kesaksian satu pelanggan.

Itu isi modul berikutnya: observability, yaitu logging terstruktur, metrik, dan tracing yang membuat pertanyaan "apa yang terjadi" bisa dijawab dalam hitungan menit, bukan hitungan jam.
