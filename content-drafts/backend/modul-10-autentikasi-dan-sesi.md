---
title: 'Modul 10: Autentikasi dan Sesi'
description: Menyimpan sandi supaya tetap aman meski basis data bocor, sesi yang benar-benar bisa dicabut, rotasi refresh token, dan kenapa pesan error login harus sengaja dibuat tidak informatif.
date: 2026-12-13
slug: modul-10-autentikasi-dan-sesi
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Proyek 2 ditutup dengan satu perintah yang membaca seluruh riwayat pembelian orang lain, hanya dengan menulis header sendiri. Modul ini menutup lubang itu, dan pertanyaannya ternyata lebih dari satu:

| Pertanyaan | Dijawab di bagian |
| --- | --- |
| Bagaimana membuktikan seseorang benar-benar pemilik akun? | Penyimpanan dan pemeriksaan sandi |
| Bagaimana dia tidak perlu mengirim sandi di setiap permintaan? | Sesi dan token |
| Bagaimana mencabut akses seseorang seketika? | Sesi yang tersimpan di server |
| Apa yang terjadi kalau tokennya dicuri? | Rotasi refresh token dan deteksi pemakaian ulang |
| Bagaimana dia memulihkan akun tanpa membuka celah? | Alur reset sandi |
| Bagaimana penyerang tidak bisa menebak email mana yang terdaftar? | Pesan seragam dan waktu respons yang rata |

Satu aturan menaungi semuanya: **autentikasi adalah tempat kesalahan kecil berakibat besar.** Karena itu modul ini lebih banyak berisi "jangan" daripada modul lain, dan hampir semua "jangan" berasal dari insiden yang pernah terjadi di perusahaan nyata.

## Analogi: kartu hotel, bukan kunci rumah

Bayangkan dua cara masuk ke kamar.

**Kunci rumah.** Satu benda yang membuka pintu, dipakai selamanya. Kalau hilang, siapa pun yang memegangnya bisa masuk, dan satu-satunya jalan keluar adalah mengganti seluruh kuncinya. Tidak ada catatan siapa masuk kapan.

**Kartu hotel.** Diberikan resepsionis setelah identitas Anda diperiksa sekali di depan. Berlaku untuk kamar tertentu, kedaluwarsa pada tanggal keluar, bisa dinonaktifkan dari meja depan kapan saja, dan setiap penggunaan tercatat. Kartunya sendiri tidak menyebutkan nama Anda, hanya sebuah nomor yang berarti sesuatu bagi sistem hotel.

Sandi adalah kunci rumah, dan sesi adalah kartu hotel. Seluruh desain autentikasi modern berangkat dari satu gagasan: **sandi dipakai sejarang mungkin, dan yang dipakai sehari-hari adalah kartu yang bisa dicabut.**

| Dunia hotel | Dunia backend |
| --- | --- |
| Pemeriksaan identitas di meja depan | Login dengan sandi |
| Kartu kamar | Token sesi atau access token |
| Daftar kartu yang dinonaktifkan | Tabel sesi di server |
| Tanggal keluar di kartu | Masa berlaku token |
| Mengganti kartu saat diperpanjang | Rotasi refresh token |
| Kartu yang jatuh di lobi lalu dipakai orang | Token dicuri |
| Dua orang memakai kartu yang sama di dua pintu | Deteksi pemakaian ulang token |
| Buku tamu | Jejak audit |

Batas analoginya: kartu hotel adalah benda fisik yang hilang dari tangan Anda saat dicuri, sedangkan token bisa **disalin** tanpa pemiliknya kehilangan apa pun. Dari situ muncul kebutuhan yang tidak ada di hotel: mendeteksi bahwa satu kartu sedang dipakai dua pihak.

## Menyimpan sandi

Asumsikan basis data Anda akan bocor suatu hari. Seluruh desain penyimpanan sandi berangkat dari asumsi itu.

| Cara | Nilai | Alasan |
| --- | --- | --- |
| Teks apa adanya | Tidak boleh, pernah | Satu kebocoran berarti semua akun di semua situs milik pengguna itu |
| MD5 atau SHA-256 | Tidak boleh | Terlalu cepat dihitung. Miliaran percobaan per detik dengan GPU |
| SHA-256 dengan salt | Masih tidak boleh | Salt mencegah tabel pelangi, tidak mencegah pencarian paksa |
| bcrypt | Dapat diterima | Lambat secara sengaja, matang, batas 72 byte |
| **Argon2id** | **Pilihan utama** | Lambat secara sengaja, dan mahal di memori sehingga GPU tidak banyak menolong |

```ts
import { hash, verify } from '@node-rs/argon2';

// Parameter ini menentukan biaya serangan. Sesuaikan supaya satu kali
// hashing butuh sekitar 100 ms di mesin produksi Anda.
const PARAM = {
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export async function simpanSandi(sandi: string): Promise<string> {
  return hash(sandi, PARAM);
}

export async function periksaSandi(sandiHash: string, sandi: string): Promise<boolean> {
  try {
    return await verify(sandiHash, sandi, PARAM);
  } catch {
    // Hash rusak atau format tidak dikenal: perlakukan sebagai gagal
    return false;
  }
}
```

Empat hal yang sering salah di sekitar ini:

**Hashing memakan CPU, dan itu memang tujuannya.** Dari modul 2: `argon2` versi sinkron akan memblokir event loop selama 100 ms. Pakai versi asinkron, dan ingat bahwa thread pool libuv bawaannya empat utas, sehingga lonjakan login bersamaan bisa jadi titik sempit. Naikkan `UV_THREADPOOL_SIZE` dan batasi laju endpoint login.

**Jangan batasi panjang sandi maksimum terlalu pendek.** Minimal 8 karakter, maksimal 64 atau lebih. Larangan memakai spasi atau simbol tertentu hanya memperkecil ruang sandi tanpa manfaat.

**Periksa terhadap daftar sandi yang pernah bocor.** Layanan seperti Pwned Passwords bisa dipanggil dengan protokol yang tidak mengirim sandi lengkap. Ini jauh lebih berguna daripada memaksa "satu huruf besar dan satu simbol", yang hanya menghasilkan `Password1!`.

**Simpan parameter hashing bersama hasilnya.** Format Argon2 sudah memuatnya, sehingga saat Anda menaikkan biaya nanti, sandi lama tetap bisa diperiksa, dan bisa di-hash ulang saat pengguna login berikutnya.

## Sesi: token yang bisa dicabut

Dua pendekatan besar, dan pilihannya menentukan banyak hal.

|  | Sesi tersimpan di server | JWT mandiri |
| --- | --- | --- |
| Isi token | Pengenal acak tanpa makna | Data pengguna beserta tanda tangan |
| Memeriksa | Satu pencarian ke basis data atau Redis | Verifikasi tanda tangan, tanpa pencarian |
| Mencabut | **Seketika**, hapus barisnya | Tidak bisa, sampai kedaluwarsa |
| Perubahan peran berlaku | Seketika | Setelah token kedaluwarsa |
| Biaya per permintaan | Satu pencarian, sangat murah dengan Redis | Hampir nol |
| Cocok untuk | Hampir semua aplikasi | Antar layanan, token berumur sangat pendek |

Rekomendasi yang jujur: **sesi tersimpan di server sebagai bawaan.** Alasannya satu kolom di tabel itu: kemampuan mencabut. Saat pengguna melapor "akun saya diambil alih", yang Anda butuhkan adalah tombol yang bekerja sekarang, bukan dalam satu jam.

JWT tetap masuk akal untuk dua hal: komunikasi antar layanan internal, dan access token berumur sangat pendek yang dipasangkan dengan refresh token tersimpan. Pola kedua itu yang dipakai sebagian besar aplikasi ponsel.

```sql
CREATE TABLE sesi (
  id              uuid PRIMARY KEY,
  pengguna_id     uuid NOT NULL REFERENCES pengguna(id) ON DELETE CASCADE,

  -- Token di-hash. Kebocoran tabel ini tidak memberi token yang bisa dipakai.
  token_hash      bytea NOT NULL UNIQUE,

  keluarga_id     uuid NOT NULL,   -- rantai rotasi dari satu kali login
  digantikan_oleh uuid REFERENCES sesi(id),

  user_agent      text,
  ip              inet,

  dibuat_pada     timestamptz NOT NULL DEFAULT now(),
  dipakai_pada    timestamptz NOT NULL DEFAULT now(),
  kedaluwarsa_pada timestamptz NOT NULL,
  dicabut_pada    timestamptz
);

CREATE INDEX ON sesi (pengguna_id) WHERE dicabut_pada IS NULL;
CREATE INDEX ON sesi (kedaluwarsa_pada) WHERE dicabut_pada IS NULL;
```

Tiga keputusan di skema itu:

**`token_hash`, bukan tokennya.** Perlakukan token sesi seperti sandi: yang disimpan hanya hasil hash. Untuk token acak 256 bit, SHA-256 cukup dan jauh lebih cepat daripada Argon2, karena tidak ada yang perlu dilindungi dari pencarian paksa pada nilai yang memang acak.

**`keluarga_id`** menandai satu rantai login. Semua token hasil rotasi dari satu kali login berbagi keluarga yang sama, dan itu yang memungkinkan deteksi pencurian.

**`user_agent` dan `ip`** supaya pengguna bisa melihat daftar perangkat yang login, dan mencabut yang tidak dikenalnya.

## Alur login dan rotasi

```ts
export async function masuk(email: string, sandi: string, ctx: KonteksPermintaan) {
  const pengguna = await repoPengguna.ambilDenganEmail(email.toLowerCase().trim());

  // Hash tiruan dijalankan untuk email yang tidak ada, supaya waktu respons
  // tidak membocorkan email mana yang terdaftar. Lihat Latihan 4.
  const hashUntukDiperiksa = pengguna?.sandiHash ?? HASH_TIRUAN;
  const cocok = await periksaSandi(hashUntukDiperiksa, sandi);

  if (!pengguna || !cocok || pengguna.status !== 'aktif') {
    // Satu pesan untuk semua kemungkinan kegagalan
    throw new ErrorKredensial('Email atau sandi salah');
  }

  if (pengguna.mfaAktif) {
    return { perluMfa: true, tokenSementara: await buatTokenMfa(pengguna.id) };
  }

  return buatSesiBaru(pengguna.id, ctx);
}

async function buatSesiBaru(penggunaId: string, ctx: KonteksPermintaan) {
  const refreshToken = randomBytes(32).toString('base64url');

  const sesi = await repoSesi.simpan({
    id: idBaru(),
    penggunaId,
    tokenHash: sha256(refreshToken),
    keluargaId: idBaru(),
    userAgent: ctx.userAgent,
    ip: ctx.ip,
    kedaluwarsaPada: new Date(Date.now() + 30 * 24 * 3600_000),
  });

  return {
    // Access token berumur pendek, boleh mandiri karena cepat kedaluwarsa
    accessToken: await tandaTanganAccessToken({ sub: penggunaId, sid: sesi.id }, '15m'),
    refreshToken,
    kedaluwarsaDalam: 900,
  };
}
```

Bagian yang paling menentukan keamanan adalah penyegaran token, dengan **rotasi dan deteksi pemakaian ulang**:

```ts
export async function segarkan(refreshToken: string, ctx: KonteksPermintaan) {
  const hash = sha256(refreshToken);

  return dalamTransaksi(db, async (tx) => {
    const sesi = await repoSesi(tx).ambilDenganHash(hash);

    if (!sesi) throw new ErrorKredensial('Sesi tidak valid');

    // Token ini sudah pernah dipakai dan sudah dirotasi.
    // Satu-satunya penjelasan: ada yang memegang salinan token lama.
    if (sesi.digantikanOleh || sesi.dicabutPada) {
      await repoSesi(tx).cabutSeluruhKeluarga(sesi.keluargaId);

      await repoAudit(tx).catat({
        jenis: 'pemakaian-ulang-refresh-token',
        penggunaId: sesi.penggunaId,
        ip: ctx.ip,
      });

      throw new ErrorKredensial('Sesi tidak valid, silakan masuk lagi');
    }

    if (sesi.kedaluwarsaPada < new Date()) {
      throw new ErrorKredensial('Sesi berakhir, silakan masuk lagi');
    }

    // Rotasi: token lama ditandai digantikan, token baru dibuat di keluarga yang sama
    const tokenBaru = randomBytes(32).toString('base64url');

    const sesiBaru = await repoSesi(tx).simpan({
      id: idBaru(),
      penggunaId: sesi.penggunaId,
      tokenHash: sha256(tokenBaru),
      keluargaId: sesi.keluargaId,
      userAgent: ctx.userAgent,
      ip: ctx.ip,
      kedaluwarsaPada: new Date(Date.now() + 30 * 24 * 3600_000),
    });

    await repoSesi(tx).tandaiDigantikan(sesi.id, sesiBaru.id);

    return {
      accessToken: await tandaTanganAccessToken(
        { sub: sesi.penggunaId, sid: sesiBaru.id },
        '15m'
      ),
      refreshToken: tokenBaru,
    };
  });
}
```

Inilah bagian terpenting di seluruh modul: **kalau sebuah refresh token dipakai dua kali, itu bukti ada salinan di tangan pihak lain.** Yang benar bukan menolak permintaan kedua saja, melainkan **mencabut seluruh keluarga sesi itu** dan memaksa login ulang. Dengan begitu, pencuri token paling lama bisa memakainya sampai pengguna sah menyegarkan tokennya, lalu kedua pihak kehilangan akses dan pemiliknya tahu ada sesuatu.

## Di mana token disimpan klien

| Jenis klien | Tempat | Alasan |
| --- | --- | --- |
| Web di peramban | Cookie `httpOnly`, `secure`, `sameSite=lax` | Tidak terbaca JavaScript, jadi satu celah XSS tidak membocorkannya |
| Aplikasi ponsel | Penyimpanan aman sistem (Keychain, Keystore) | Tidak ada JavaScript, dan OS menyediakan tempat terenkripsi |
| Layanan ke layanan | Variabel lingkungan atau pengelola rahasia | Bukan sesi manusia, pakai kredensial layanan |
| CLI | Berkas konfigurasi dengan izin 600 | Setara dengan kunci SSH |

Untuk klien web, cookie mengundang CSRF, jadi pasangkan dengan `sameSite=lax` dan pemeriksaan `Origin` pada permintaan yang mengubah data. Untuk klien ponsel dan pihak ketiga, header `Authorization: Bearer` lebih tepat karena tidak dikirim otomatis peramban.

```ts
// Satu endpoint bisa melayani keduanya
function ambilRefreshToken(req: FastifyRequest): string | null {
  return req.cookies.refresh_token ?? ambilDariBody(req) ?? null;
}
```

## Masuk dengan penyedia lain

OAuth2 dengan OIDC adalah cara "masuk dengan Google" bekerja. Alur yang benar untuk aplikasi web dan ponsel adalah **authorization code dengan PKCE**:

```text
1. Klien membuat code_verifier acak, lalu mengirim hash-nya (code_challenge)
2. Pengguna dialihkan ke penyedia, masuk di sana
3. Penyedia mengalihkan balik dengan satu kode sekali pakai
4. Backend menukar kode itu beserta code_verifier menjadi token
5. Backend memverifikasi id_token, lalu membuat sesinya sendiri
```

Langkah kelima yang paling sering dilewati: **buat sesi Anda sendiri, jangan pakai token penyedia sebagai sesi aplikasi Anda.** Dengan sesi sendiri, Anda tetap bisa mencabut akses, menambahkan peran, dan tidak bergantung pada masa berlaku yang ditentukan pihak lain.

Dua hal yang wajib diperiksa saat menerima `id_token`: tanda tangannya terhadap kunci publik penyedia, dan bahwa `aud` benar-benar aplikasi Anda. Melewatkan pemeriksaan kedua berarti token yang diterbitkan untuk aplikasi lain bisa dipakai di aplikasi Anda.

Dan satu keputusan produk yang punya akibat teknis: **apa yang terjadi kalau email dari Google sama dengan email akun yang sudah ada dengan sandi?** Menggabungkannya otomatis membuka celah pengambilalihan kalau penyedia tidak memverifikasi email. Periksa klaim `email_verified`, dan kalau perlu minta pengguna masuk dengan sandinya dulu untuk menautkan.

## Passkey

Passkey adalah login tanpa sandi dengan kunci kriptografi yang disimpan di perangkat, dan sudah didukung semua peramban besar. Dua keunggulannya nyata: **tahan phishing**, karena kuncinya terikat ke domain Anda, dan tidak ada sandi untuk dicuri dari basis data Anda.

Untuk produk baru, menyediakannya sebagai pilihan bukan lagi hal eksotis. Dari sisi backend yang perlu Anda simpan: pengenal kredensial, kunci publik, dan penghitung yang dipakai untuk mendeteksi kloning. Pakai library yang matang, karena alurnya penuh detail yang mudah salah.

## Reset sandi dan verifikasi email

Alur yang terlihat sepele dan jadi sumber celah berulang:

```ts
export async function mintaResetSandi(email: string) {
  const pengguna = await repoPengguna.ambilDenganEmail(email.toLowerCase().trim());

  // Selalu kembalikan jawaban yang sama, ada atau tidak akunnya
  if (pengguna) {
    const token = randomBytes(32).toString('base64url');

    await repoReset.simpan({
      penggunaId: pengguna.id,
      tokenHash: sha256(token),               // hanya hash yang disimpan
      kedaluwarsaPada: new Date(Date.now() + 30 * 60_000),  // 30 menit
    });

    await antreanEmail.tambah({ jenis: 'reset-sandi', ke: pengguna.email, token });
  }

  return { pesan: 'Kalau email terdaftar, tautan reset sudah dikirim' };
}

export async function gantiSandiDenganToken(token: string, sandiBaru: string) {
  return dalamTransaksi(db, async (tx) => {
    // Sekali pakai: tandai terpakai dalam transaksi yang sama
    const [catatan] = await tx.execute(sql`
      UPDATE reset_sandi
      SET dipakai_pada = now()
      WHERE token_hash = ${sha256(token)}
        AND dipakai_pada IS NULL
        AND kedaluwarsa_pada > now()
      RETURNING pengguna_id
    `);

    if (!catatan) throw new ErrorKredensial('Tautan tidak valid atau sudah kedaluwarsa');

    await repoPengguna(tx).gantiSandi(catatan.penggunaId, await simpanSandi(sandiBaru));

    // Wajib: semua sesi dicabut, karena sandi berganti biasanya berarti
    // pemiliknya menduga ada yang mengakses akunnya
    await repoSesi(tx).cabutSemuaMilik(catatan.penggunaId);

    return { ok: true };
  });
}
```

Enam aturan yang terkandung di dalamnya:

1. **Jawaban seragam** meski email tidak terdaftar, supaya endpoint ini tidak jadi alat memetakan pengguna.
2. **Token acak panjang**, bukan angka berurutan atau kode enam digit tanpa pembatasan laju.
3. **Hanya hash yang disimpan**, sehingga kebocoran tabel tidak memberi tautan yang bisa dipakai.
4. **Masa berlaku pendek**, 15 sampai 60 menit.
5. **Sekali pakai**, ditandai secara atomik dalam satu pernyataan.
6. **Semua sesi dicabut** setelah sandi berganti, dan pengguna diberi tahu lewat email bahwa sandinya diubah.

Aturan keenam itu yang paling sering dilewati, dan paling penting: tanpa itu, penyerang yang sudah punya sesi tetap bisa masuk meski pemiliknya sudah mengganti sandi.

## Melindungi endpoint login

| Serangan | Pertahanan |
| --- | --- |
| Pencarian paksa pada satu akun | Jeda yang bertambah per akun, plus pembatasan laju per IP |
| Credential stuffing dari ribuan IP | Pembatasan per akun, pemeriksaan sandi bocor, CAPTCHA saat mencurigakan |
| Pemetaan email terdaftar | Pesan dan waktu respons yang seragam |
| Pencurian sesi | Token di-hash, rotasi dengan deteksi pemakaian ulang, masa berlaku |
| Penguncian akun sebagai gangguan | Jangan kunci permanen. Pakai jeda bertambah, bukan blokir |

Baris terakhir keputusan yang sering salah: mengunci akun setelah lima kali gagal membuat penyerang bisa **mengunci akun orang lain** hanya dengan mencoba sandi yang salah. Yang lebih baik: perlambat secara bertahap, dan minta verifikasi tambahan untuk percobaan dari perangkat yang belum dikenal.

Satu fitur yang murah dan sangat dihargai pengguna: **daftar sesi aktif** dengan perangkat, lokasi perkiraan, waktu terakhir dipakai, dan tombol cabut. Semua datanya sudah ada di tabel sesi.

## Jangan membuatnya sendiri, kecuali perlu

| Pilihan | Cocok untuk | Catatan |
| --- | --- | --- |
| Buat sendiri seperti modul ini | Belajar, dan aplikasi yang kebutuhannya sederhana | Anda menanggung semua detailnya |
| Lucia, Auth.js, better-auth | Aplikasi Node yang ingin menyimpan data sendiri | Pola sesi sudah benar, Anda tetap memegang basis data |
| Clerk, WorkOS, Auth0 | Ingin cepat, termasuk UI, organisasi, dan SSO | Berbayar, dan sangat menghemat waktu |
| Keycloak, Zitadel | Perusahaan yang butuh dikelola sendiri | Operasionalnya pekerjaan tersendiri |

Menulisnya sendiri di modul ini bukan rekomendasi untuk produksi, melainkan cara memahami apa yang dikerjakan pustaka itu. Saat Anda memakai Auth.js nanti dan membaca konfigurasi `rotateRefreshToken`, Anda akan tahu persis apa yang dijaganya.

## Latihan

### Latihan 1: Bangun autentikasi penuh

Tambahkan ke Proyek 2: pendaftaran dengan verifikasi email, login, penyegaran dengan rotasi, logout satu perangkat, logout semua perangkat, daftar sesi aktif, dan ganti sandi yang mencabut semua sesi lain.

Syaratnya: sandi dengan Argon2id, token sesi di-hash sebelum disimpan, dan pemakaian ulang refresh token mencabut seluruh keluarga.

> [!petunjuk]
> Kerjakan dalam urutan ini: tabel sesi dulu, lalu login dan penyegaran, baru pendaftaran dan verifikasi email. Alur penyegaran adalah bagian yang paling banyak detailnya, dan paling baik dikerjakan saat Anda masih segar.

> [!jawaban]
>
> Lima hal yang biasanya jadi hambatan:
>
> 1. **Access token perlu memuat `sid`.** Tanpa pengenal sesi di dalamnya, logout satu perangkat tidak bisa membatalkan access token yang masih berumur 15 menit. Dengan `sid`, middleware bisa memeriksa apakah sesinya masih hidup, dan pemeriksaan itu murah kalau disimpan di Redis.
>
> ```ts
> app.decorate('autentikasi', async (req: FastifyRequest) => {
>   const token = req.headers.authorization?.replace(/^Bearer /, '');
>   if (!token) throw new ErrorKredensial('Token tidak ada');
>
>   const klaim = await verifikasiAccessToken(token);
>
>   // Pemeriksaan pencabutan: satu lookup Redis, di bawah 1 ms
>   if (await cacheSesi.sudahDicabut(klaim.sid)) {
>     throw new ErrorKredensial('Sesi sudah tidak berlaku');
>   }
>
>   req.pengguna = { id: klaim.sub, sid: klaim.sid };
> });
> ```
>
> 2. **Ganti sandi harus menyisakan sesi yang sedang dipakai.** Mencabut semua sesi termasuk milik sendiri membuat pengguna langsung keluar setelah mengganti sandi, dan itu terasa seperti kesalahan. Cabut semua kecuali `sid` yang sedang aktif.
> 3. **Verifikasi email jangan memblokir seluruh aplikasi.** Putuskan dengan sadar: pengguna yang belum verifikasi boleh masuk dan melihat katalog, tapi tidak boleh membuat pesanan. Memblokir total membuat pendaftaran terasa putus.
> 4. **Email dikirim lewat antrean, bukan di dalam permintaan.** Pelajaran modul 2: pengiriman email bisa 3 detik dan bisa gagal. Untuk sekarang simpan ke tabel pekerjaan, dan modul 14 memprosesnya.
> 5. **Hapus sesi kedaluwarsa secara berkala.** Tabel sesi yang tidak pernah dibersihkan akan tumbuh terus. Satu pekerjaan harian yang menghapus baris kedaluwarsa lebih dari 30 hari sudah cukup.

### Latihan 2: Audit desain yang hanya memakai JWT

Sebuah tim merancang autentikasi seperti ini. Temukan enam masalahnya, lalu usulkan perbaikan yang tidak harus mengubah segalanya.

```ts
// Login
const token = jwt.sign(
  { userId: user.id, email: user.email, role: user.role, isAdmin: user.isAdmin },
  process.env.JWT_SECRET!,
  { expiresIn: '30d' }
);

return { token };

// Middleware
const klaim = jwt.verify(req.headers.authorization!.split(' ')[1]!, process.env.JWT_SECRET!);
req.user = klaim;

// Otorisasi di handler
if (!req.user.isAdmin) throw new Error('forbidden');
```

> [!pembahasan]
>
> | # | Masalah | Akibat |
> | --- | --- | --- |
> | 1 | Berlaku 30 hari tanpa cara mencabut | Token yang dicuri berlaku sebulan. Logout hanya menghapus token di klien |
> | 2 | Peran disimpan di dalam token | Menurunkan peran seseorang tidak berlaku sampai tokennya kedaluwarsa |
> | 3 | Tidak ada refresh token | Satu-satunya pilihan: umur panjang (berbahaya) atau pengguna login setiap 15 menit |
> | 4 | `split(' ')[1]!` tanpa penanganan | Permintaan tanpa header membuat `undefined` masuk ke `verify`, dan 500 alih-alih 401 |
> | 5 | `JWT_SECRET` tanpa rotasi dan tanpa `aud`/`iss` | Satu rahasia dipakai selamanya, dan token dari lingkungan lain bisa dipakai lintas aplikasi |
> | 6 | Otorisasi dengan `isAdmin` boolean | Tidak bisa tumbuh. Peran kedua berarti kolom kedua, lalu `if` bertumpuk |
>
> Masalah ketujuh yang lebih halus: email dimasukkan ke token, jadi pengguna yang mengganti emailnya tetap membawa email lama selama sebulan, dan setiap fitur yang membaca email dari token akan salah.
>
> **Perbaikan bertahap, tanpa mengubah semuanya sekaligus:**
>
> | Tahap | Perubahan | Dampak |
> | --- | --- | --- |
> | 1 | Pendekkan access token jadi 15 menit, tambahkan refresh token tersimpan | Masalah 1 dan 3 selesai |
> | 2 | Keluarkan peran dari token, baca dari basis data atau cache saat memeriksa | Masalah 2 dan 7 selesai |
> | 3 | Tambahkan `sid` dan pemeriksaan pencabutan di Redis | Logout jadi nyata |
> | 4 | Tambahkan `aud`, `iss`, dan `kid` untuk rotasi kunci | Masalah 5 selesai |
> | 5 | Ganti `isAdmin` dengan tabel peran dan izin | Masalah 6, dan ini modul 11 |
>
> Perhatikan bahwa tahap 1 dan 2 bisa dikerjakan dalam satu rilis, dan selebihnya bisa menyusul. Pertanyaan "apakah kami harus menulis ulang autentikasi" hampir selalu dijawab tidak: yang perlu dilakukan adalah memperpendek umur token dan memindahkan keputusan otorisasi keluar dari token.

### Latihan 3: Rancang alur reset sandi yang tahan serangan

Rancang alur reset sandi lengkap, lalu untuk setiap langkah sebutkan serangan yang mungkin dan pertahanannya.

> [!jawaban]
>
> | Langkah | Serangan | Pertahanan |
> | --- | --- | --- |
> | Meminta reset | Memetakan email terdaftar | Jawaban seragam, waktu respons rata |
> | Meminta reset | Membanjiri email korban | Batas per email dan per IP: 3 per jam |
> | Membuat token | Token bisa ditebak | 32 byte acak dari `randomBytes`, bukan `Math.random` |
> | Menyimpan token | Basis data bocor | Simpan hash-nya, bukan tokennya |
> | Mengirim email | Tautan tersebar lewat header `Referer` | Jangan taruh token di query pada halaman yang memuat sumber daya pihak ketiga |
> | Memakai token | Dipakai berulang | Sekali pakai, ditandai atomik |
> | Memakai token | Token lama masih berlaku | Masa berlaku 30 menit, dan token lama dibatalkan saat yang baru dibuat |
> | Mengganti sandi | Sesi penyerang tetap hidup | Cabut semua sesi |
> | Setelah berhasil | Pemilik tidak tahu | Kirim email pemberitahuan, dengan tautan "bukan saya" |
>
> Dua detail yang sering jadi celah nyata:
>
> **Token di dalam query URL bisa bocor lewat `Referer`.** Kalau halaman reset Anda memuat skrip analitik atau font dari domain lain, peramban bisa mengirim URL lengkapnya ke domain itu. Dua pencegahan: pasang `Referrer-Policy: no-referrer` pada halaman tersebut, dan segera setelah halaman terbuka, tukar token di URL dengan token sesi sementara.
>
> **Pembatalan token lama saat yang baru diminta.** Kalau pengguna meminta reset tiga kali, tiga token hidup bersamaan selama 30 menit. Lebih aman: setiap permintaan baru membatalkan yang sebelumnya, sehingga hanya ada satu token aktif per akun.

### Latihan 4: Ukur kebocoran lewat waktu respons

Buktikan bahwa endpoint login Anda tidak membocorkan email yang terdaftar.

```bash
# Email terdaftar, sandi salah
for i in $(seq 20); do
  curl -s -o /dev/null -w "%{time_total}\n" -X POST localhost:3000/v1/masuk \
    -H 'content-type: application/json' \
    -d '{"email":"ada@contoh.com","sandi":"salah"}'
done | awk '{s+=$1} END {print "terdaftar  :", s/NR}'

# Email tidak terdaftar
for i in $(seq 20); do
  curl -s -o /dev/null -w "%{time_total}\n" -X POST localhost:3000/v1/masuk \
    -H 'content-type: application/json' \
    -d '{"email":"tidakada@contoh.com","sandi":"salah"}'
done | awk '{s+=$1} END {print "tidak ada  :", s/NR}'
```

Jalankan pada implementasi naif, lalu pada implementasi yang memakai hash tiruan, dan bandingkan.

> [!jawaban]
>
> **Implementasi naif:**
>
> ```ts
> const pengguna = await repo.ambilDenganEmail(email);
> if (!pengguna) throw new ErrorKredensial('Email tidak ditemukan');  // ~5 ms
> if (!(await periksaSandi(pengguna.sandiHash, sandi))) {             // ~105 ms
>   throw new ErrorKredensial('Sandi salah');
> }
> ```
>
> | Keadaan | Waktu khas |
> | --- | --- |
> | Email terdaftar, sandi salah | 110 ms |
> | Email tidak terdaftar | 8 ms |
>
> Selisih belasan kali itu bisa diukur dari jarak jauh, dan dengan itu penyerang bisa menyaring satu juta email bocor menjadi daftar yang benar-benar terdaftar di layanan Anda. Daftar itu lalu dipakai untuk phishing yang jauh lebih meyakinkan.
>
> **Dengan hash tiruan:**
>
> ```ts
> // Dibuat sekali saat start, dari sandi acak yang tidak pernah dipakai
> const HASH_TIRUAN = await simpanSandi(randomBytes(32).toString('hex'));
>
> const pengguna = await repo.ambilDenganEmail(email);
> const cocok = await periksaSandi(pengguna?.sandiHash ?? HASH_TIRUAN, sandi);
>
> if (!pengguna || !cocok) throw new ErrorKredensial('Email atau sandi salah');
> ```
>
> | Keadaan | Waktu khas |
> | --- | --- |
> | Email terdaftar, sandi salah | 110 ms |
> | Email tidak terdaftar | 108 ms |
>
> Empat catatan yang melengkapi:
>
> 1. **Pesannya juga harus seragam.** "Email tidak ditemukan" versus "Sandi salah" membocorkan hal yang sama tanpa perlu mengukur waktu.
> 2. **Endpoint lain ikut membocorkan.** Pendaftaran yang menjawab "email sudah dipakai" adalah alat pemetaan yang sempurna. Pilihan yang lebih baik: terima pendaftarannya, lalu kirim email yang sesuai keadaan ("akun Anda sudah ada, ini tautan masuk").
> 3. **Pemulihan sandi dan pengecekan ketersediaan nama juga.** Pikirkan setiap endpoint yang jawabannya bergantung pada keberadaan akun.
> 4. **Sempurna tidak selalu perlu.** Untuk sebagian besar aplikasi, menyeragamkan pesan dan memakai hash tiruan sudah memadai. Yang tidak boleh adalah selisih belasan kali seperti pada implementasi naif.

## Batasnya

Autentikasi menjawab "siapa Anda", dan berhenti di situ. Tiga hal tetap terbuka.

**Siapa boleh melihat apa belum dijawab sama sekali.** Pembeli yang sudah terautentikasi dengan benar tetap bisa membaca pesanan pembeli lain kalau tidak ada pemeriksaan kepemilikan. Lubang dari Proyek 2 baru setengah tertutup.

**Peran dan izin belum punya bentuk.** `isAdmin` boolean akan jadi `isAdmin`, `isStaff`, `isSupervisor`, lalu `if` bertumpuk yang tidak ada yang berani mengubah.

**Multi-tenant belum dibahas.** Kalau layanan Anda melayani beberapa perusahaan, satu kesalahan kecil membuat data satu pelanggan terlihat pelanggan lain, dan itu jenis insiden yang mengakhiri kontrak.

## Rangkuman

- Asumsikan basis data akan bocor. Dari asumsi itu: Argon2id untuk sandi, dan hash untuk token sesi.
- Sandi dipakai sejarang mungkin. Yang dipakai sehari-hari adalah sesi yang bisa dicabut.
- Sesi tersimpan di server sebagai bawaan, karena kemampuan mencabut lebih berharga daripada menghemat satu pencarian.
- Access token pendek dengan `sid`, refresh token panjang yang dirotasi. Pemakaian ulang refresh token berarti mencabut seluruh keluarga sesi.
- Cookie `httpOnly` untuk web, penyimpanan aman sistem untuk ponsel.
- Dengan login pihak ketiga, tetap buat sesi Anda sendiri, dan periksa `aud` serta `email_verified`.
- Reset sandi: jawaban seragam, token acak yang di-hash, berumur pendek, sekali pakai, dan mencabut semua sesi setelah berhasil.
- Pesan dan waktu respons login dibuat seragam, supaya endpoint Anda tidak jadi alat memetakan pengguna.
- Jangan mengunci akun permanen setelah beberapa percobaan gagal. Pakai jeda yang bertambah.
- Hashing memakan CPU dan thread pool. Batasi laju login, dan jangan pakai versi sinkron.

## Masalah terbuka

Sekarang Anda tahu siapa pemanggilnya. Pertanyaan berikutnya langsung muncul dari Proyek 2 yang sudah diperbaiki setengah.

Pembeli A sudah login dengan benar, lalu memanggil `GET /v1/pesanan/{id}` dengan id pesanan milik pembeli B. Apa yang terjadi? Kalau jawabannya "datanya tampil", autentikasi yang baru Anda bangun tidak melindungi apa pun.

Dan pertanyaannya bertambah rumit begitu produknya bertumbuh. Staf gudang boleh melihat semua pesanan tapi tidak boleh melihat data kartu. Supervisor boleh mengubah harga tapi hanya di cabangnya. Pemilik toko boleh melihat laporan keuangan, dan kasir tidak. Dan kalau layanan Anda dipakai lima perusahaan sekaligus, tidak satu baris pun data perusahaan A boleh terlihat perusahaan B, termasuk lewat laporan, pencarian, dan pesan error.

Itu isi modul berikutnya: otorisasi, model peran dan izin, serta isolasi antar tenant yang dijamin basis data.
