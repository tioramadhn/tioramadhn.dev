---
title: 'Proyek 3: Layanan Autentikasi Multi-tenant'
description: Satu layanan yang dipakai beberapa aplikasi: undangan anggota, peran kustom per tenant, kunci API, jejak audit, isolasi yang dijamin Row Level Security, dan uji serangan yang semuanya harus ditolak.
date: 2026-12-18
slug: proyek-3-layanan-auth-multi-tenant
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Tiga modul terakhir membahas identitas, izin, dan pertahanan. Proyek ini menyatukannya jadi satu layanan yang bentuknya paling sering dibutuhkan di produk B2B: **satu akun bisa menjadi anggota beberapa organisasi dengan peran berbeda.**

| Dari modul | Yang dipakai |
| --- | --- |
| 11 | Argon2id, sesi tersimpan, rotasi refresh token dengan deteksi pemakaian ulang |
| 12 | Peran dan izin sebagai data, cakupan, Row Level Security, impersonasi |
| 13 | Skema ketat, batas sumber daya, pengelolaan rahasia, verifikasi tanda tangan |

Yang membedakannya dari tutorial autentikasi biasa: **proyek ini dinilai dari serangan yang berhasil ditolak, bukan dari fitur yang berhasil jalan.** Bagian checklist berisi dua belas percobaan serangan, dan semuanya harus gagal.

## Yang dibangun

Layanan identitas untuk platform yang melayani banyak organisasi. Satu orang bisa jadi pemilik di satu organisasi dan anggota biasa di organisasi lain, dan harus berganti konteks dengan jelas.

```text
pengguna       identitas global: email, sandi, status, MFA
tenant         organisasi: nama, slug, rencana langganan, status
keanggotaan    pengguna x tenant x peran, beserta cakupan
peran          bawaan sistem, plus peran kustom milik satu tenant
izin           daftar kemampuan yang bisa diberikan ke peran
sesi           perangkat yang login, dengan keluarga rotasi
undangan        email yang diundang beserta peran yang ditawarkan
kunci_api      kredensial untuk integrasi, dengan cakupan
audit          siapa melakukan apa, kapan, dari mana
```

Satu keputusan di awal menentukan seluruh bentuknya: **pengguna bersifat global, keanggotaan bersifat per tenant.** Model yang menyalin pengguna per tenant akan memaksa satu orang punya beberapa sandi untuk satu email, dan itu pengalaman yang buruk sekaligus masalah keamanan saat sandi diubah di satu tempat.

## Spesifikasi wajib

### A. Identitas dan sesi

1. Pendaftaran dengan email dan sandi, plus verifikasi email sebelum bisa membuat tenant.
2. Sandi dengan Argon2id, parameter disimpan bersama hash, pemeriksaan terhadap daftar sandi bocor.
3. Login yang mengembalikan access token 15 menit dan refresh token 30 hari.
4. Rotasi refresh token setiap penyegaran, dengan pencabutan seluruh keluarga saat ada pemakaian ulang.
5. Daftar sesi aktif beserta perangkat, IP, dan waktu terakhir dipakai, plus tombol cabut satu dan cabut semua.
6. Ganti sandi mencabut semua sesi kecuali yang sedang dipakai, dan mengirim email pemberitahuan.
7. Reset sandi dengan token sekali pakai berumur 30 menit yang di-hash di basis data.
8. MFA berbasis TOTP sebagai pilihan, dengan kode pemulihan sekali pakai.

### B. Tenant dan keanggotaan

9. Membuat tenant, dan pembuatnya otomatis jadi pemilik.
10. Mengundang anggota lewat email dengan peran yang ditawarkan, token undangan sekali pakai berumur 7 hari.
11. Menerima undangan, baik oleh akun yang sudah ada maupun yang mendaftar lewat tautan undangan.
12. Mengubah peran anggota, mencabut keanggotaan, dan memindahkan kepemilikan.
13. Berganti tenant aktif, dengan access token yang memuat tenant dan peran untuk tenant itu.
14. Satu tenant tidak boleh kehilangan pemilik terakhirnya.

### C. Peran dan izin

15. Empat peran bawaan: pemilik, admin, anggota, dan pembaca.
16. Peran kustom per tenant, dengan izin yang dipilih dari daftar yang sama.
17. Izin sebagai data, dan `pastikanBoleh` dipakai di semua jalur termasuk worker dan perintah terminal.
18. Endpoint yang menampilkan izin efektif pengguna untuk tenant tertentu, supaya frontend bisa menyesuaikan tampilannya.

### D. Kunci API dan integrasi

19. Membuat kunci API per tenant dengan cakupan yang lebih sempit daripada peran manusia.
20. Kunci ditampilkan sekali, hanya hash dan prefiksnya yang disimpan.
21. Kunci punya masa berlaku opsional, bisa dicabut, dan mencatat waktu terakhir dipakai.
22. Endpoint yang bisa dipanggil dengan kunci API menolak kunci yang cakupannya tidak memuat izin yang dibutuhkan.

### E. Audit dan pertahanan

23. Jejak audit untuk: login berhasil dan gagal, perubahan sandi, perubahan peran, pembuatan dan pencabutan kunci, penerimaan undangan, dan impersonasi.
24. Pembatasan laju: login per akun dan per IP, permintaan reset per email, pembuatan undangan per tenant.
25. Row Level Security pada semua tabel milik tenant, dengan `USING` dan `WITH CHECK`.
26. Impersonasi untuk staf platform: wajib alasan tertulis, berumur 30 menit, tercatat audit, dan tidak boleh mengubah sandi maupun menghapus tenant.
27. Semua skema masukan `.strict()`, dan `peran` tidak pernah bisa dikirim lewat endpoint pendaftaran atau pembaruan profil.
28. Pesan dan waktu respons login seragam untuk email terdaftar dan tidak.

## Langkah pengerjaan bertahap

Urutan di sini ditentukan satu hal: **isolasi tenant dipasang sebelum ada fitur yang bisa membocorkannya.** Menambahkan Row Level Security ke layanan yang sudah punya dua puluh endpoint berarti memeriksa dua puluh endpoint satu per satu.

**Hari 1: tenant dan isolasi.** Tabel tenant, kolom `tenant_id` di semua tabel miliknya, RLS dengan `USING` dan `WITH CHECK`, dan cara menyetel konteks tenant pada setiap sambungan. Belum ada satu pun endpoint. Selesai kalau Anda bisa membuktikan di `psql` bahwa sesi dengan tenant A tidak bisa membaca maupun menulis baris milik tenant B.

**Hari 2: identitas dan sesi.** Argon2id, sesi tersimpan yang bisa dicabut, rotasi refresh token beserta deteksi pemakaian ulang, dan pesan login yang seragam.

**Hari 3: peran dan izin.** Peran sebagai data bukan sebagai `enum` di kode, satu fungsi otorisasi terpusat, dan test matriks yang merah saat ada endpoint baru tanpa keputusan akses.

**Hari 4: undangan anggota dan kunci API.** Dua jalur masuk yang berbeda sifatnya, dan keduanya pintu yang sering lupa dijaga.

**Hari 5: jejak audit dan impersonasi.** Audit ditulis dalam transaksi yang sama dengan perubahannya, dan impersonasi dengan alasan wajib serta umur terbatas.

**Hari 6: dua belas serangan.** Checklist penilaian di bawah adalah daftar serangan, bukan daftar fitur. Jalankan semuanya, dan **setiap satu harus ditolak**. Satu saja yang lolos berarti proyek ini belum selesai.

**Hari 7: perbaiki temuan**, lalu tulis ulang satu kalimat untuk tiap serangan yang lolos tentang kenapa pertahanannya gagal.

Peringatan yang pantas diulang: **jangan membuat sendiri penyimpanan sandi, rotasi token, atau pembuatan JWT kalau ini untuk produksi.** Proyek ini membangunnya supaya Anda paham cara kerjanya dan tahu apa yang ditawarkan penyedia identitas saat Anda menilainya nanti.

## Skema inti

```sql
CREATE TABLE pengguna (
  id              uuid PRIMARY KEY,
  email           text NOT NULL UNIQUE,
  sandi_hash      text,                    -- NULL kalau hanya login lewat penyedia
  nama            text NOT NULL,
  email_terverifikasi_pada timestamptz,
  mfa_rahasia     bytea,                   -- terenkripsi
  status          text NOT NULL DEFAULT 'aktif'
                    CHECK (status IN ('aktif', 'ditangguhkan')),
  dibuat_pada     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT punya_cara_masuk CHECK (sandi_hash IS NOT NULL OR id IN (
    SELECT pengguna_id FROM identitas_penyedia
  )) NOT VALID   -- diperiksa di aplikasi, batasan ini hanya dokumentasi niat
);

CREATE TABLE tenant (
  id          uuid PRIMARY KEY,
  slug        text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  nama        text NOT NULL,
  rencana     text NOT NULL DEFAULT 'gratis',
  status      text NOT NULL DEFAULT 'aktif'
                CHECK (status IN ('aktif', 'ditangguhkan')),
  dibuat_pada timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE peran (
  id        text NOT NULL,
  tenant_id uuid REFERENCES tenant(id) ON DELETE CASCADE,   -- NULL = peran sistem
  nama      text NOT NULL,
  sistem    boolean NOT NULL DEFAULT false,

  PRIMARY KEY (id, tenant_id)
);

-- Peran sistem punya tenant_id NULL, dan keunikannya butuh indeks terpisah
CREATE UNIQUE INDEX peran_sistem_unik ON peran (id) WHERE tenant_id IS NULL;

CREATE TABLE keanggotaan (
  pengguna_id uuid NOT NULL REFERENCES pengguna(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  peran_id    text NOT NULL,
  cabang_id   uuid,
  dibuat_pada timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (pengguna_id, tenant_id)
);

CREATE TABLE undangan (
  id            uuid PRIMARY KEY,
  tenant_id     uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  email         text NOT NULL,
  peran_id      text NOT NULL,
  diundang_oleh uuid NOT NULL REFERENCES pengguna(id) ON DELETE RESTRICT,
  token_hash    bytea NOT NULL UNIQUE,
  kedaluwarsa_pada timestamptz NOT NULL,
  diterima_pada    timestamptz,
  dibatalkan_pada  timestamptz,

  -- Satu email tidak boleh punya dua undangan aktif untuk satu tenant
  CONSTRAINT masa_berlaku CHECK (kedaluwarsa_pada > dibuat_pada)
);

CREATE UNIQUE INDEX satu_undangan_aktif
  ON undangan (tenant_id, lower(email))
  WHERE diterima_pada IS NULL AND dibatalkan_pada IS NULL;

CREATE TABLE audit (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id   uuid REFERENCES tenant(id) ON DELETE SET NULL,
  pelaku_id   uuid REFERENCES pengguna(id) ON DELETE SET NULL,
  atas_nama_id uuid REFERENCES pengguna(id) ON DELETE SET NULL,  -- impersonasi
  jenis       text NOT NULL,
  target      text,
  rincian     jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip          inet,
  user_agent  text,
  pada        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON audit (tenant_id, pada DESC);
CREATE INDEX ON audit (pelaku_id, pada DESC);
```

Tiga keputusan yang pantas diperhatikan:

**Indeks unik sebagian pada undangan** menegakkan aturan "satu undangan aktif per email per tenant" secara mutlak, termasuk saat dua admin mengundang orang yang sama pada detik yang sama. Ini pelajaran modul 5 yang dipakai lagi.

**`lower(email)` di dalam indeks** memastikan `Budi@contoh.com` dan `budi@contoh.com` dianggap sama.

**Tabel audit memakai `bigint` berurutan, bukan UUID.** Tabel ini hanya ditulis dan dibaca berurutan waktu, tidak pernah dirujuk dari luar, dan id berurutan membuat indeksnya jauh lebih padat. Ini contoh keputusan yang berbeda dari aturan umum, dengan alasan yang jelas.

## Alur undangan, lengkap

Alur ini punya lebih banyak celah daripada yang terlihat, dan pantas dikerjakan dengan teliti.

```ts
// src/fitur/undangan/layanan.ts
export async function undangAnggota(
  pelaku: Pelaku,
  masukan: { email: string; peranId: string }
) {
  pastikanBoleh(pelaku, 'anggota:undang');

  const email = masukan.email.trim().toLowerCase();

  return dalamTransaksi(db, async (tx) => {
    // 1. Peran yang ditawarkan harus ada, dan milik tenant ini atau peran sistem
    const peran = await repoPeran(tx).ambilUntukTenant(masukan.peranId, pelaku.tenantId);
    if (!peran) throw new ErrorAturanBisnis('Peran tidak dikenal', 'PERAN_TIDAK_ADA');

    // 2. Tidak boleh mengundang dengan peran yang lebih tinggi daripada milik sendiri
    if (!bolehMemberiPeran(pelaku, peran)) {
      throw new ErrorTidakBerhak('Anda tidak dapat memberikan peran ini');
    }

    // 3. Sudah jadi anggota? Jawab dengan jelas, bukan buat undangan baru
    if (await repoKeanggotaan(tx).adaDenganEmail(pelaku.tenantId, email)) {
      throw new ErrorKonflik('Orang ini sudah jadi anggota');
    }

    const token = randomBytes(32).toString('base64url');

    // 4. Indeks unik sebagian yang menolak undangan ganda
    try {
      await repoUndangan(tx).simpan({
        tenantId: pelaku.tenantId,
        email,
        peranId: peran.id,
        diundangOleh: pelaku.penggunaId,
        tokenHash: sha256(token),
        kedaluwarsaPada: new Date(Date.now() + 7 * 24 * 3600_000),
      });
    } catch (error) {
      terjemahkanErrorDb(error);   // 23505 jadi 409 dengan pesan yang tepat
    }

    await repoAudit(tx).catat({
      tenantId: pelaku.tenantId,
      pelakuId: pelaku.penggunaId,
      jenis: 'undangan-dibuat',
      target: email,
      rincian: { peranId: peran.id },
    });

    // 5. Email lewat antrean, bukan di dalam transaksi
    await repoPekerjaan(tx).tambah({
      jenis: 'kirim-undangan',
      muatan: { email, token, tenantId: pelaku.tenantId },
    });

    // 6. Token tidak dikembalikan ke pengundang
    return { ok: true };
  });
}
```

Enam langkah, dan empat di antaranya menutup celah yang nyata:

**Langkah 2 mencegah eskalasi hak.** Tanpa itu, seorang admin bisa mengundang orang dengan peran pemilik, lalu masuk dengan akun itu. Aturannya: seseorang hanya boleh memberikan peran yang izinnya merupakan bagian dari izinnya sendiri.

**Langkah 5 memakai pola yang akan dibahas lengkap di modul 16.** Menyimpan pekerjaan email di dalam transaksi yang sama dengan undangannya memastikan tidak ada undangan tanpa email, dan tidak ada email untuk undangan yang gagal disimpan.

**Langkah 6 penting dan sering salah.** Mengembalikan token undangan ke pengundang berarti dia bisa menerima undangan itu sendiri dengan email berbeda, atau membagikannya ke orang lain. Token hanya ada di email penerima.

Dan sisi penerimaannya:

```ts
// src/fitur/undangan/layanan.ts, lanjutan
export async function terimaUndangan(token: string, penggunaId: string) {
  return dalamTransaksi(db, async (tx) => {
    // Sekali pakai, atomik
    const [undangan] = await tx.execute(sql`
      UPDATE undangan
      SET diterima_pada = now()
      WHERE token_hash = ${sha256(token)}
        AND diterima_pada IS NULL
        AND dibatalkan_pada IS NULL
        AND kedaluwarsa_pada > now()
      RETURNING tenant_id, email, peran_id
    `);

    if (!undangan) {
      throw new ErrorKredensial('Undangan tidak valid atau sudah kedaluwarsa');
    }

    const pengguna = await repoPengguna(tx).ambil(penggunaId);

    // Email yang menerima harus sama dengan email yang diundang.
    // Tanpa ini, siapa pun yang mendapat tautan bisa masuk ke organisasi.
    if (pengguna.email.toLowerCase() !== undangan.email) {
      throw new ErrorTidakBerhak('Undangan ini untuk alamat email lain');
    }

    await repoKeanggotaan(tx).simpan({
      penggunaId,
      tenantId: undangan.tenantId,
      peranId: undangan.peranId,
    });

    await repoAudit(tx).catat({
      tenantId: undangan.tenantId,
      pelakuId: penggunaId,
      jenis: 'undangan-diterima',
    });

    return { tenantId: undangan.tenantId };
  });
}
```

Pemeriksaan email di tengah itu yang paling sering terlewat. Tanpa itu, tautan undangan yang bocor (lewat email yang diteruskan, tangkapan layar di grup, atau riwayat peramban bersama) bisa dipakai siapa pun untuk masuk ke organisasi.

## Konteks tenant pada sesi

Satu pengguna, beberapa tenant, dan permintaan harus jelas konteksnya.

```ts
// Access token memuat tenant aktif dan peran untuk tenant itu
interface KlaimAccessToken {
  sub: string;        // pengguna
  sid: string;        // sesi
  tid: string;        // tenant aktif
  rol: string;        // peran di tenant itu
  imp?: string;       // pelaku asli kalau ini impersonasi
  exp: number;
}

app.decorate('autentikasi', async (req: FastifyRequest) => {
  const klaim = await verifikasiAccessToken(ambilBearer(req));

  if (await cacheSesi.sudahDicabut(klaim.sid)) {
    throw new ErrorKredensial('Sesi sudah tidak berlaku');
  }

  // Izin dibaca dari sumbernya, bukan dari token, supaya pencabutan langsung berlaku.
  // Di-cache 60 detik, lihat modul 14 untuk pertukarannya.
  const izin = await cacheIzin.ambil(klaim.sub, klaim.tid);

  req.pelaku = {
    penggunaId: klaim.sub,
    tenantId: klaim.tid,
    peran: klaim.rol,
    cabangId: null,
    izin,
    diimpersonasiOleh: klaim.imp,
  };
});
```

Keputusan di baris komentar itu adalah inti pertukaran dari modul 11: **peran ada di token untuk kecepatan, izin dibaca dari sumbernya untuk kebenaran.** Dengan cache 60 detik, pencabutan izin berlaku paling lama satu menit, dan itu bisa dipercepat dengan pembatalan cache saat peran diubah.

## Yang harus Anda kerjakan sendiri

1. **MFA dengan TOTP** beserta kode pemulihan. Perhatikan: rahasia TOTP harus terenkripsi di basis data, bukan hanya di-hash, karena perlu dibaca kembali untuk verifikasi.
2. **Pemindahan kepemilikan** yang tidak pernah meninggalkan tenant tanpa pemilik. Syarat nomor 14 lebih sulit daripada kelihatannya saat dua admin melakukannya bersamaan.
3. **Endpoint izin efektif** yang mengembalikan daftar izin pengguna untuk tenant aktif, supaya frontend bisa menyembunyikan tombol yang pasti ditolak.
4. **Halaman audit** dengan filter jenis dan rentang waktu, memakai pagination kursor dari modul 4.

## Checklist penilaian: dua belas serangan

Proyek ini dinilai dari sini. Setiap baris harus gagal untuk penyerang.

| # | Percobaan | Yang harus terjadi |
| --- | --- | --- |
| 1 | Daftar dengan body berisi `"peran":"pemilik"` | Ditolak skema `.strict()`, atau diabaikan |
| 2 | Baca anggota tenant lain dengan id yang ditebak | 404, bukan 403 |
| 3 | Kueri langsung tanpa penyaring tenant lewat endpoint pencarian | Nol baris, karena RLS |
| 4 | Admin mengundang orang dengan peran pemilik | Ditolak, peran lebih tinggi dari miliknya |
| 5 | Terima undangan dengan akun beremail berbeda | Ditolak |
| 6 | Pakai token undangan dua kali | Yang kedua ditolak |
| 7 | Pakai refresh token lama setelah dirotasi | Ditolak, dan seluruh keluarga sesi dicabut |
| 8 | Login 50 kali dengan sandi salah | Diperlambat, akun tidak terkunci permanen |
| 9 | Ukur waktu respons login untuk email ada dan tidak ada | Selisihnya di bawah 15% |
| 10 | Pakai kunci API tanpa cakupan yang dibutuhkan | 403 |
| 11 | Pakai kunci API tenant A untuk data tenant B | 404 |
| 12 | Impersonasi lalu coba ganti sandi pengguna | Ditolak, dan percobaannya tercatat audit |

Nomor 3 cara mengujinya:

```ts
// test/isolasi-tenant.test.ts
it('RLS menolak kebocoran meski kueri lupa menyaring', async () => {
  await denganTenant(TENANT_A, (tx) => buatAnggota(tx, { email: 'a@contoh.com' }));

  const hasil = await denganTenant(TENANT_B, (tx) =>
    // Sengaja tanpa WHERE tenant_id
    tx.execute(sql`SELECT * FROM keanggotaan`)
  );

  expect(hasil).toHaveLength(0);
});
```

Dan nomor 9:

```bash
for i in $(seq 30); do
  curl -s -o /dev/null -w "%{time_total}\n" -X POST localhost:3000/v1/masuk \
    -H 'content-type: application/json' -d '{"email":"ada@contoh.com","sandi":"salah"}'
done | awk '{s+=$1} END {printf "ada      : %.3f\n", s/NR}'

for i in $(seq 30); do
  curl -s -o /dev/null -w "%{time_total}\n" -X POST localhost:3000/v1/masuk \
    -H 'content-type: application/json' -d '{"email":"nihil@contoh.com","sandi":"salah"}'
done | awk '{s+=$1} END {printf "tidak ada: %.3f\n", s/NR}'
```

## Tantangan bonus

- **SSO dengan SAML atau OIDC per tenant**, karena ini permintaan pertama dari pelanggan besar. Perhatikan: pemetaan atribut penyedia ke peran Anda adalah bagian yang paling banyak detailnya.
- **Kebijakan sandi per tenant**, misalnya panjang minimum dan masa berlaku, dengan catatan bahwa memaksa pergantian berkala sudah tidak dianjurkan lagi.
- **Pembatasan domain email**, supaya hanya alamat dari domain tertentu bisa diundang ke tenant tertentu.
- **Passkey** sebagai cara masuk tanpa sandi.
- **Ekspor audit** sebagai aliran CSV untuk kebutuhan kepatuhan pelanggan.

## Rangkuman

- Pengguna bersifat global, keanggotaan bersifat per tenant. Menyalin pengguna per tenant menciptakan beberapa sandi untuk satu orang.
- Seseorang hanya boleh memberikan peran yang izinnya merupakan bagian dari izinnya sendiri. Tanpa aturan ini, undangan jadi jalur eskalasi hak.
- Token undangan hanya ada di email penerima, dan penerimaannya memeriksa bahwa email penerima sama dengan email yang diundang.
- Peran boleh ada di token untuk kecepatan, izin dibaca dari sumbernya untuk kebenaran.
- Row Level Security adalah lapisan yang membuat kelupaan tidak berakibat, dan diuji dengan kueri yang sengaja lupa menyaring.
- Impersonasi wajib punya alasan tertulis, masa berlaku pendek, audit, dan daftar aksi yang dilarang.
- Audit bukan fitur tambahan. Untuk layanan identitas, audit adalah bagian dari produk.
- Layanan autentikasi dinilai dari serangan yang ditolak, bukan dari fitur yang jalan. Tulis uji serangannya sebagai test otomatis.

## Masalah terbuka

Layanan Anda sekarang aman, dan ada satu angka yang mulai mengganggu.

Buka panel pemantauan basis data dan lihat kueri yang paling sering dijalankan. Yang teratas hampir pasti pembacaan izin: setiap permintaan ke setiap endpoint memanggilnya. Pada seribu permintaan per detik, itu seribu kueri per detik untuk data yang berubah mungkin sekali sebulan.

Masalah yang sama muncul di tempat lain: katalog produk yang sama dibaca sepuluh ribu kali per menit, laporan dasbor yang isinya identik dihitung ulang untuk setiap pengelola yang membukanya, dan konfigurasi tenant yang dimuat di awal setiap permintaan.

Semuanya pekerjaan yang jawabannya sudah diketahui, dan dikerjakan ulang terus-menerus.

Itu isi modul berikutnya: caching, dari header HTTP sampai Redis, beserta bagian yang paling sulit, yaitu memutuskan kapan data yang di-cache harus dianggap tidak berlaku lagi.
