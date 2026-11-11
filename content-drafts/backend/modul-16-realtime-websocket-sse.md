---
title: 'Modul 16: Realtime dengan WebSocket dan SSE'
description: Data berubah di server, dan pengguna baru tahu setelah menekan muat ulang. Memilih antara polling, SSE, dan WebSocket, lalu membuatnya bekerja pada beberapa instance.
date: 2026-12-21
slug: modul-16-realtime-websocket-sse
tags: tutorial backend
series: Tutorial Backend
status: draft
---

Pembeli membuka halaman lacak pesanan setelah membayar. Dalam sepuluh menit berikutnya statusnya berubah tiga kali, dan dia tidak melihat satu pun perubahan itu tanpa menekan muat ulang.

Jalan keluar yang paling mudah ditulis adalah memeriksa ke server setiap tiga detik, dan itu punya harga yang bisa dihitung:

| Jumlah pengguna aktif | Polling 3 detik | Permintaan per hari (8 jam) |
| --- | --- | --- |
| 100 | 33 per detik | 960.000 |
| 1.000 | 333 per detik | 9,6 juta |
| 10.000 | 3.333 per detik | 96 juta |

Dan sebagian besar jawabannya "belum ada perubahan". Modul ini tentang cara server memberi tahu klien saat ada yang berubah, bukan klien yang terus bertanya.

Satu hal yang perlu diluruskan di awal: **polling bukan selalu salah.** Untuk data yang berubah sekali sejam dan dibuka sepuluh orang, polling dengan ETag dari modul 13 adalah jawaban yang benar, dan jauh lebih sederhana daripada apa pun di modul ini.

## Analogi: menunggu kabar dari kantor pos

Tiga cara mengetahui paket Anda sudah sampai mana.

**Menelepon kantor pos setiap lima menit.** Selalu dapat jawaban terkini, dan sembilan dari sepuluh panggilan dijawab "belum ada perubahan". Operator kantor pos kelelahan melayani panggilan yang sebagian besar tidak perlu. Itu polling.

**Menelepon, lalu diminta menunggu di sambungan sampai ada kabar.** Satu panggilan, dan jawabannya datang begitu ada perubahan. Operator harus mengingat siapa saja yang sedang menunggu. Itu long polling dan SSE.

**Memasang saluran radio dua arah.** Kedua pihak bisa bicara kapan saja tanpa memanggil ulang. Lebih mahal dipasang, dan satu-satunya cara kalau Anda juga perlu mengirim pesan ke kantor pos. Itu WebSocket.

| Dunia kantor pos | Dunia backend |
| --- | --- |
| Menelepon berulang | Polling |
| Ditahan di sambungan sampai ada kabar | SSE |
| Radio dua arah | WebSocket |
| Operator mengingat siapa yang menunggu | Daftar sambungan aktif di memori proses |
| Operator berganti shift dan lupa siapa yang menunggu | Instance dimatikan, sambungan hilang |
| Beberapa operator di cabang berbeda | Beberapa instance, dan masalah utama modul ini |
| Papan pengumuman internal yang dibaca semua operator | Pub/sub lewat Redis atau NATS |
| "Kabar terakhir yang Anda terima nomor berapa?" | `Last-Event-ID` |

Batas analoginya menunjuk langsung ke bagian tersulit: sambungan hidup di **satu** proses, sedangkan peristiwanya bisa terjadi di proses lain. Dengan tiga instance, pembeli yang tersambung ke instance A tidak akan pernah tahu tentang peristiwa yang diproses instance C, kecuali ada papan pengumuman yang dibaca ketiganya.

## Memilih

| Cara | Arah | Kerumitan | Cocok untuk |
| --- | --- | --- | --- |
| **Polling dengan ETag** | Klien bertanya | Hampir nol | Data yang jarang berubah, pengguna sedikit |
| **SSE** | Server mengirim | Rendah | Pemberitahuan, status, dasbor, notifikasi. **Pilihan pertama** |
| **WebSocket** | Dua arah | Menengah | Obrolan, kolaborasi, permainan, apa pun yang klien kirim sering |
| **WebTransport** | Dua arah di atas HTTP/3 | Tinggi | Kebutuhan khusus latensi sangat rendah |

Rekomendasi yang jujur: **mulai dari SSE.** Ia hanya HTTP biasa, melewati proxy tanpa masalah konfigurasi, menyambung ulang sendiri saat terputus, dan 90% kebutuhan realtime di aplikasi bisnis adalah satu arah dari server ke klien.

Pakai WebSocket kalau klien benar-benar perlu mengirim pesan sering, misalnya obrolan atau penanda "sedang mengetik". Untuk tombol yang diklik sekali, `POST` biasa lebih tepat daripada mengirimnya lewat soket.

## SSE

```ts
// src/realtime/sse.ts
export async function alirkanPeristiwa(
  req: FastifyRequest,
  res: FastifyReply,
  langganan: { topik: string[]; sejak?: string }
) {
  res.raw.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    // Penting untuk nginx: tanpa ini, respons ditahan sampai buffer penuh
    'x-accel-buffering': 'no',
  });

  // Kirim apa pun yang terlewat sejak id yang disebut klien
  if (langganan.sejak) {
    for (const p of await repoPeristiwa.sejak(langganan.sejak, langganan.topik)) {
      tulisPeristiwa(res, p);
    }
  }

  const berhenti = pubsub.langgan(langganan.topik, (p) => tulisPeristiwa(res, p));

  // Denyut: menahan proxy agar tidak menutup sambungan yang sepi,
  // dan memberi tahu kita saat klien sudah hilang
  const denyut = setInterval(() => {
    res.raw.write(': denyut\n\n');
  }, 15_000);

  // Pembersihan wajib, atau sambungan menumpuk sampai memori habis
  req.raw.on('close', () => {
    clearInterval(denyut);
    berhenti();
    metrik.sambunganSse.dec();
  });

  metrik.sambunganSse.inc();
}

function tulisPeristiwa(res: FastifyReply, p: PeristiwaSiapKirim) {
  // id dipakai klien sebagai Last-Event-ID saat menyambung ulang
  res.raw.write(`id: ${p.id}\n`);
  res.raw.write(`event: ${p.jenis}\n`);
  res.raw.write(`data: ${JSON.stringify(p.muatan)}\n\n`);
}
```

```ts
// Endpoint lacak pesanan
app.get('/v1/pesanan/:id/aliran', { onRequest: [app.autentikasi] }, async (req, res) => {
  const pesanan = await repoPesanan.ambil(req.params.id);
  if (!pesanan) throw new ErrorTidakDitemukan();

  // Otorisasi diperiksa sebelum membuka aliran, seperti endpoint lain
  pastikanBoleh(req.pelaku, 'pesanan:baca', {
    tenantId: pesanan.tenantId,
    pemilikId: pesanan.pembeliId,
  });

  // Keadaan sekarang dikirim lebih dulu, lalu perubahan menyusul
  res.raw.write(`event: snapshot\ndata: ${JSON.stringify(pesanan)}\n\n`);

  await alirkanPeristiwa(req, res, {
    topik: [`pesanan:${pesanan.id}`],
    sejak: req.headers['last-event-id'] as string | undefined,
  });
});
```

Lima hal di potongan itu yang sering jadi sumber masalah:

**Satu, `x-accel-buffering: no`.** Tanpa header ini, nginx menahan respons sampai buffernya penuh, dan peristiwa Anda tiba berkelompok beberapa detik kemudian. Gejalanya: bekerja di laptop, tidak bekerja di produksi.

**Dua, denyut setiap 15 detik.** Proxy dan load balancer menutup sambungan yang sepi, biasanya setelah 30 sampai 60 detik. Denyut berupa komentar menahannya, dan sekaligus memberi tahu Anda saat klien sudah hilang karena penulisan ke sambungan mati akan gagal.

**Tiga, pembersihan pada `close`.** Sambungan yang listener-nya tidak dilepas adalah kebocoran memori yang akan menumbangkan proses setelah beberapa jam. Ini pelajaran modul 2 pada bentuk yang paling nyata.

**Empat, foto keadaan lalu perubahan.** Klien yang baru tersambung butuh keadaan sekarang, bukan hanya perubahan berikutnya. Pola "snapshot lalu delta" ini menghapus satu kelas bug di sisi klien.

**Lima, `Last-Event-ID`.** Peramban mengirimnya otomatis saat menyambung ulang, dan dengan itu peristiwa yang terlewat selama jeda bisa dikirim ulang. Tanpa itu, pengguna yang sinyalnya hilang sepuluh detik akan melewatkan perubahan status selamanya.

Satu batas SSE yang perlu diketahui: di HTTP/1.1, peramban membatasi sekitar enam sambungan per domain, dan satu aliran SSE memakai salah satunya. Dengan HTTP/2 batas itu hilang, dan karena hampir semua produksi sudah HTTP/2, ini jarang jadi masalah. Tapi kalau aplikasi Anda membuka satu aliran per komponen, pertimbangkan satu aliran untuk seluruh halaman dengan beberapa jenis peristiwa.

## Masalah utama: beberapa instance

Dengan tiga instance di belakang load balancer, sambungan SSE pembeli berada di satu instance saja. Peristiwa `pesanan.dibayar` diproses konsumen yang mungkin berjalan di instance lain, atau di proses worker terpisah.

```text
Pembeli A ---- SSE ----> Instance 1     (sambungan ada di sini)
Pembeli B ---- SSE ----> Instance 2
Pembeli C ---- SSE ----> Instance 3

Worker memproses pesanan.dibayar        (di proses yang berbeda lagi)
   |
   v
Bagaimana Instance 1 tahu?
```

Jawabannya: **papan pengumuman yang dibaca semua instance.**

```ts
// src/realtime/pubsub.ts
import { Redis } from 'ioredis';

const penerbit = new Redis(config.REDIS_URL);
const pelanggan = new Redis(config.REDIS_URL);   // sambungan terpisah, wajib

type Pendengar = (p: PeristiwaSiapKirim) => void;
const pendengarPerTopik = new Map<string, Set<Pendengar>>();

// Satu sambungan Redis untuk seluruh proses, bukan satu per klien
await pelanggan.psubscribe('rt:*');

pelanggan.on('pmessage', (_pola, saluran, isi) => {
  const topik = saluran.slice(3);
  const peristiwa = JSON.parse(isi) as PeristiwaSiapKirim;

  for (const dengar of pendengarPerTopik.get(topik) ?? []) {
    dengar(peristiwa);
  }
});

export const pubsub = {
  langgan(topik: string[], dengar: Pendengar) {
    for (const t of topik) {
      if (!pendengarPerTopik.has(t)) pendengarPerTopik.set(t, new Set());
      pendengarPerTopik.get(t)!.add(dengar);
    }

    return () => {
      for (const t of topik) {
        const set = pendengarPerTopik.get(t);
        set?.delete(dengar);
        if (set?.size === 0) pendengarPerTopik.delete(t);
      }
    };
  },

  async terbitkan(topik: string, peristiwa: PeristiwaSiapKirim) {
    await penerbit.publish(`rt:${topik}`, JSON.stringify(peristiwa));
  },
};
```

Lalu konsumen peristiwa dari modul 15 menerbitkannya ke papan ini:

```ts
export async function konsumenRealtime(pesan: PesanMasuk) {
  // Konsumen ini tidak menulis apa pun ke basis data, hanya meneruskan.
  // Karena itu tidak perlu idempotensi: pengiriman dua kali ke klien
  // hanya berarti klien menerima pembaruan yang sama dua kali.
  await pubsub.terbitkan(`pesanan:${pesan.muatan.pesananId}`, {
    id: pesan.id,
    jenis: pesan.topik,
    muatan: ringkasUntukKlien(pesan.muatan),
  });
}
```

Empat hal yang penting di pola ini:

**Satu, satu sambungan Redis untuk seluruh proses.** Membuat sambungan Redis per klien SSE akan menghabiskan batas sambungan Redis pada seratus pengguna. Satu `psubscribe` di tingkat proses, lalu penyebaran ke pendengar di memori.

**Dua, sambungan penerbit dan pelanggan harus terpisah.** Sambungan Redis yang sedang dalam mode berlangganan tidak bisa dipakai menjalankan perintah lain.

**Tiga, `ringkasUntukKlien` wajib ada.** Muatan peristiwa internal bisa memuat field yang tidak boleh dilihat pembeli. Jangan pernah meneruskan muatan peristiwa internal langsung ke klien.

**Empat, pub/sub Redis tidak menjamin pengiriman.** Pesan yang diterbitkan saat tidak ada pelanggan akan hilang. Itu dapat diterima untuk pembaruan antarmuka, dan **tidak** dapat diterima sebagai jalur satu-satunya untuk hal yang penting. Kebenarannya tetap di basis data, dan realtime hanya mempercepat kabarnya.

## WebSocket, kalau memang perlu dua arah

```ts
import websocket from '@fastify/websocket';

await app.register(websocket, {
  options: { maxPayload: 64 * 1024 },   // batas ukuran pesan
});

app.get('/v1/ws', { websocket: true, onRequest: [app.autentikasi] }, (sambungan, req) => {
  const pelaku = req.pelaku;
  const ruang = new Set<string>();

  // Batas sambungan per pengguna, supaya satu akun tidak membuka seribu soket
  if (!pencatatSambungan.boleh(pelaku.penggunaId)) {
    sambungan.close(1008, 'terlalu banyak sambungan');
    return;
  }

  sambungan.on('message', async (mentah) => {
    // Setiap pesan divalidasi, bukan hanya saat menyambung
    const hasil = skemaPesanMasuk.safeParse(JSON.parse(mentah.toString()));
    if (!hasil.success) {
      sambungan.send(JSON.stringify({ jenis: 'galat', kode: 'PESAN_TIDAK_VALID' }));
      return;
    }

    const pesan = hasil.data;

    switch (pesan.jenis) {
      case 'gabung': {
        // Otorisasi diperiksa per pesan, bukan hanya saat menyambung.
        // Izin bisa dicabut saat sambungan masih hidup.
        const boleh = await bolehkanRuang(pelaku, pesan.ruang);
        if (!boleh) {
          sambungan.send(JSON.stringify({ jenis: 'galat', kode: 'TIDAK_BERHAK' }));
          return;
        }

        ruang.add(pesan.ruang);
        break;
      }

      case 'kirim': {
        if (!ruang.has(pesan.ruang)) return;

        // Pesan disimpan dulu, lalu disiarkan. Urutannya penting:
        // menyiarkan sebelum menyimpan berarti pesan yang terlihat bisa hilang.
        const disimpan = await layananPesan.simpan(pelaku, pesan);
        await pubsub.terbitkan(`ruang:${pesan.ruang}`, {
          id: disimpan.id,
          jenis: 'pesan-baru',
          muatan: disimpan,
        });
        break;
      }

      case 'ping':
        sambungan.send(JSON.stringify({ jenis: 'pong' }));
        break;
    }
  });

  sambungan.on('close', () => {
    pencatatSambungan.lepas(pelaku.penggunaId);
    // lepas semua langganan pubsub
  });
});
```

Empat hal yang khas WebSocket dan sering salah:

**Satu, autentikasi tidak bisa memakai header kustom di peramban.** `WebSocket` API di peramban tidak mengizinkan header `Authorization`. Tiga jalan keluar: cookie sesi (paling sederhana kalau domainnya sama), token sekali pakai yang diminta lewat HTTP lalu dikirim sebagai parameter kueri, atau pesan autentikasi pertama setelah sambungan terbuka. Jangan mengirim token berumur panjang di parameter kueri, karena URL tercatat di log proxy.

**Dua, otorisasi diperiksa per pesan.** Sambungan yang dibuka pukul 09.00 dan masih hidup pukul 17.00 mungkin dimiliki orang yang izinnya sudah dicabut pukul 11.00. Periksa ulang, dan pakai cache dari modul 13 supaya murah.

**Tiga, token kedaluwarsa saat sambungan masih hidup.** Access token 15 menit dari modul 10 akan kedaluwarsa jauh sebelum sambungan ditutup. Putuskan dengan sengaja: tutup sambungan dan minta klien menyambung ulang dengan token baru, atau terima pesan pembaruan token lewat soket.

**Empat, batas ukuran pesan dan jumlah sambungan.** Tanpa `maxPayload`, satu klien bisa mengirim pesan 100 MB. Tanpa batas sambungan per pengguna, satu skrip bisa membuka sepuluh ribu soket dan menghabiskan memori instance Anda.

## Ukuran dan batas

Angka yang perlu Anda ketahui sebelum merancang:

| Hal | Angka khas |
| --- | --- |
| Memori per sambungan WebSocket di Node | 10 sampai 50 kB, tergantung buffer |
| Sambungan nyaman per instance | 10.000 sampai 20.000, dengan memori cukup |
| Batas berkas terbuka sistem | Sering 1.024 bawaan, **wajib dinaikkan** |
| Batas waktu sepi load balancer | 30 sampai 350 detik, tergantung penyedia |
| Denyut yang aman | Setiap 15 sampai 30 detik |

Baris ketiga adalah penyebab kegagalan yang membingungkan: pada 1.024 sambungan, proses Anda mulai menolak sambungan baru dengan error yang tidak jelas, dan angkanya terlihat terlalu rapi untuk jadi kebetulan. Naikkan `ulimit -n` di container Anda.

Dan satu hal operasional yang penting: **sambungan panjang mempersulit penutupan yang rapi.** Saat instance dimatikan untuk deploy, seribu sambungan harus ditutup. Lakukan dengan sopan:

```ts
process.on('SIGTERM', async () => {
  // Beri tahu klien supaya menyambung ulang ke instance lain,
  // dengan jeda acak supaya tidak semuanya menyambung bersamaan
  for (const s of semuaSambungan) {
    s.send(JSON.stringify({ jenis: 'tutup', sambungUlangDalamMs: 1000 + Math.random() * 4000 }));
  }

  await tidur(1_000);
  for (const s of semuaSambungan) s.close(1001, 'server dimatikan');

  await app.close();
  process.exit(0);
});
```

Tanpa jeda acak, seribu klien akan menyambung ulang pada detik yang sama ke instance yang tersisa, dan Anda membuat lonjakan sendiri. Pola yang sama dengan jitter di modul 13 dan 14.

## Kapan tidak memakai realtime

Tiga keadaan di mana polling lebih baik, dan menyadarinya menghemat banyak pekerjaan:

**Satu, perubahan jarang dan pengguna sedikit.** Dasbor internal yang dibuka lima orang dan datanya berubah tiap jam: polling dengan ETag, selesai. Setiap sambungan panjang adalah sumber daya yang dipegang dan satu hal lagi yang bisa rusak.

**Dua, aplikasi ponsel yang berjalan di latar belakang.** Sambungan panjang menguras baterai dan diputus sistem operasi. Yang tepat: push notification dari layanan platform, dan muat data saat aplikasi dibuka.

**Tiga, data yang harus akurat saat dibaca.** Realtime mempercepat kabar, dan tidak menggantikan pembacaan. Saldo yang ditampilkan dari pesan realtime tanpa pembacaan ulang bisa salah kalau ada pesan yang hilang. Tampilkan dari pembacaan, perbarui dengan realtime, dan baca ulang saat pengguna melakukan aksi penting.

## Latihan

### Latihan 1: Lacak pesanan dengan SSE

Tambahkan aliran SSE ke Proyek 4 untuk halaman lacak pesanan. Syaratnya: keadaan sekarang dikirim lebih dulu, perubahan menyusul, bekerja pada tiga instance, dan pengguna yang terputus 30 detik tidak melewatkan perubahan apa pun.

> [!petunjuk]
> Syarat terakhir butuh dua hal: `Last-Event-ID` dari klien, dan riwayat peristiwa yang bisa dibaca kembali. Riwayatnya sudah ada di tabel outbox dari modul 15, dan itu bisa dipakai langsung.

> [!jawaban]
>
> ```ts
> app.get('/v1/pesanan/:id/aliran', { onRequest: [app.autentikasi] }, async (req, res) => {
>   const pesanan = await ambilPesananDenganOtorisasi(req.pelaku, req.params.id);
>
>   siapkanSse(res);
>
>   // 1. Foto keadaan sekarang, selalu
>   kirim(res, { id: `snap-${pesanan.versi}`, jenis: 'snapshot', muatan: ringkas(pesanan) });
>
>   // 2. Peristiwa yang terlewat selama terputus
>   const sejak = req.headers['last-event-id'] as string | undefined;
>
>   if (sejak && !sejak.startsWith('snap-')) {
>     const terlewat = await db.execute(sql`
>       SELECT id, jenis, muatan FROM outbox
>       WHERE kunci_agregat = ${pesanan.id}
>         AND id > ${Number(sejak.replace('outbox-', ''))}
>       ORDER BY id
>       LIMIT 100
>     `);
>
>     for (const p of terlewat) {
>       kirim(res, { id: `outbox-${p.id}`, jenis: p.jenis, muatan: ringkasUntukKlien(p.muatan) });
>     }
>   }
>
>   // 3. Perubahan berikutnya, lewat pub/sub supaya lintas instance
>   await alirkanPeristiwa(req, res, { topik: [`pesanan:${pesanan.id}`] });
> });
> ```
>
> Lima hal yang akan Anda temukan saat mengerjakannya:
>
> 1. **Tabel outbox sudah jadi riwayat peristiwa yang Anda butuhkan.** Ini manfaat tambahan dari pola di modul 15 yang tidak terlihat saat membangunnya. Satu-satunya syarat: jangan hapus baris outbox terlalu cepat, dan tujuh hari sudah lebih dari cukup.
> 2. **Id peristiwa harus bisa dibandingkan.** Dengan id berupa `outbox-{nomor}`, pertanyaan "apa yang terlewat sejak id ini" jadi satu kueri. Dengan UUID acak, pertanyaan itu tidak bisa dijawab.
> 3. **Ada jendela kecil antara snapshot dan langganan.** Peristiwa yang terjadi tepat di antaranya bisa terlewat. Jalan keluarnya: berlangganan **dulu**, kumpulkan di buffer, lalu kirim snapshot, lalu kuras buffer sambil membuang yang versinya lebih lama daripada snapshot.
> 4. **Uji dengan tiga instance, bukan satu.** Tanpa pub/sub, kodenya tetap bekerja sempurna di laptop dengan satu proses, dan gagal total di produksi. Jalankan tiga proses di port berbeda lalu kirim permintaan ke salah satunya.
> 5. **Hitung sambungan Anda sebagai metrik.** Angka yang naik terus tanpa pernah turun berarti pembersihan pada `close` tidak bekerja, dan itu kebocoran yang akan menumbangkan proses dalam beberapa jam.

### Latihan 2: Rancang autentikasi dan penskalaan

Rancang realtime untuk tiga kebutuhan berikut, dan untuk masing-masing tentukan: SSE atau WebSocket, cara autentikasi, cara penskalaan, dan apa yang terjadi saat instance dimatikan.

|  | Kebutuhan |
| --- | --- |
| **A** | Halaman lacak pesanan untuk pembeli, 5.000 pembeli aktif bersamaan |
| **B** | Panel gudang yang menampilkan pesanan baru, 30 petugas, perlu menandai "saya ambil ini" |
| **C** | Dasbor admin dengan angka penjualan yang bergerak, 10 pengelola |

> [!pembahasan]
>
> | | A: lacak pesanan | B: panel gudang | C: dasbor admin |
> | --- | --- | --- | --- |
> | Cara | SSE | WebSocket | **Polling 10 detik** |
> | Autentikasi | Cookie sesi, atau token di parameter sekali pakai | Cookie sesi, dan periksa izin per pesan | Biasa, lewat header |
> | Topik | `pesanan:{id}`, satu per pembeli | `gudang:{tenantId}`, satu ruang bersama | Tidak ada |
> | Penskalaan | Pub/sub Redis, 5.000 sambungan dibagi 3 instance | Pub/sub Redis, jumlah kecil | Cache dengan TTL 10 detik |
> | Saat instance mati | Klien menyambung ulang dengan `Last-Event-ID` | Klien menyambung ulang, lalu minta snapshot ruang | Tidak terpengaruh |
>
> Tiga penjelasan yang paling penting:
>
> **A memakai SSE karena satu arah.** Pembeli tidak mengirim apa pun lewat aliran itu. Dan 5.000 sambungan bukan masalah: dibagi tiga instance berarti sekitar 1.700 per instance, jauh di bawah batas nyaman.
>
> **B memakai WebSocket karena ada "saya ambil ini".** Tapi perhatikan: klaim pesanan **tidak boleh** diselesaikan lewat pesan soket saja. Yang benar: klaim dikirim sebagai `POST` biasa yang memakai `UPDATE ... WHERE diambil_oleh IS NULL` dari modul 8, lalu hasilnya disiarkan lewat soket supaya petugas lain melihat pesanan itu hilang dari daftar. Soket untuk kabar, HTTP untuk keputusan.
>
> **C memakai polling, dan ini jawaban yang paling sering salah.** Sepuluh pengelola yang memuat ulang setiap sepuluh detik menghasilkan satu permintaan per detik. Dengan cache 10 detik dari modul 13, beban ke basis data mendekati nol. Membangun realtime untuk ini berarti menambahkan pub/sub, sambungan panjang, penanganan sambung ulang, dan metrik baru, untuk menghemat satu permintaan per detik.
>
> Patokan yang bisa dipakai: **hitung dulu beban polling-nya.** Kalau angkanya di bawah beberapa puluh permintaan per detik dan datanya bisa di-cache, polling adalah keputusan teknik yang lebih baik, bukan jalan pintas.

### Latihan 3: Obrolan dengan ruang

Bangun obrolan sederhana dengan WebSocket: beberapa ruang, riwayat pesan, penanda "sedang mengetik", dan daftar siapa yang sedang online di ruang.

> [!jawaban]
>
> Empat bagian, dan masing-masing punya jebakan.
>
> **Satu, pesan: simpan dulu, lalu siarkan.**
>
> ```ts
> case 'kirim': {
>   const disimpan = await layananPesan.simpan({
>     ruangId: pesan.ruang,
>     pengirimId: pelaku.penggunaId,
>     isi: pesan.isi,
>     // Id dari klien, supaya klien bisa mencocokkan pesan optimistisnya
>     klienId: pesan.klienId,
>   });
>
>   await pubsub.terbitkan(`ruang:${pesan.ruang}`, {
>     id: disimpan.id, jenis: 'pesan-baru', muatan: disimpan,
>   });
>   break;
> }
> ```
>
> Urutan ini wajib: menyiarkan sebelum menyimpan berarti pesan terlihat di semua layar lalu hilang saat ada yang memuat ulang. Dan `klienId` membuat pengirim bisa mencocokkan pesan yang muncul dengan pesan optimistis yang sudah ditampilkannya.
>
> **Dua, "sedang mengetik": jangan disimpan, dan jangan lewat pub/sub penuh.**
>
> ```ts
> case 'mengetik': {
>   // Tidak disimpan ke basis data: ini informasi sesaat.
>   // Dibatasi lajunya di sisi server, karena klien mengirimnya tiap ketikan.
>   if (!pembatasMengetik.boleh(pelaku.penggunaId)) return;
>
>   await pubsub.terbitkan(`ruang:${pesan.ruang}`, {
>     id: `mengetik-${Date.now()}`,
>     jenis: 'sedang-mengetik',
>     muatan: { penggunaId: pelaku.penggunaId, nama: pelaku.nama },
>   });
>   break;
> }
> ```
>
> **Tiga, kehadiran: butuh penyimpanan bersama dengan masa berlaku.**
>
> ```ts
> // Kehadiran tidak boleh disimpan di memori proses: tiga instance berarti
> // tiga daftar berbeda. Redis dengan TTL menyelesaikannya.
> async function tandaiHadir(ruangId: string, penggunaId: string) {
>   const kunci = `hadir:${ruangId}`;
>   await redis.zadd(kunci, Date.now(), penggunaId);
>   await redis.expire(kunci, 120);
> }
>
> async function daftarHadir(ruangId: string): Promise<string[]> {
>   const batas = Date.now() - 45_000;
>   await redis.zremrangebyscore(`hadir:${ruangId}`, 0, batas);
>   return redis.zrange(`hadir:${ruangId}`, 0, -1);
> }
> ```
>
> Pakai sorted set dengan waktu sebagai skor, bukan set biasa. Alasannya: pengguna yang sambungannya terputus mendadak tidak pernah mengirim pesan "keluar", dan tanpa masa berlaku per anggota, daftar online akan berisi orang yang sudah pulang tiga jam lalu.
>
> **Empat, riwayat saat bergabung.** Kirim 50 pesan terakhir dengan kursor dari modul 4, bukan seluruh riwayat.
>
> Satu jebakan terakhir yang pantas disebut: **jangan menyiarkan ke semua ruang dan menyaring di klien.** Dengan seratus ruang, setiap pesan dikirim ke semua sambungan dan membuang sembilan puluh sembilan persen bandwidth, sekaligus mengirim pesan ruang lain ke klien yang tidak berhak melihatnya. Itu kebocoran data, bukan hanya pemborosan.

### Latihan 4: Diagnosis empat masalah realtime

|  | Laporan |
| --- | --- |
| **A** | "Pembaruan status datang berkelompok setiap 30 detik, bukan langsung." |
| **B** | "Setelah beberapa jam, server kehabisan memori dan dimatikan sendiri." |
| **C** | "Pengguna di satu kantor tidak pernah menerima pembaruan, yang lain normal." |
| **D** | "Setiap deploy, semua pengguna kehilangan sambungan selama satu menit." |

> [!jawaban]
>
> **A: buffering di proxy.** Nginx atau CDN di jalur menahan respons sampai buffernya penuh. Perbaikan: header `X-Accel-Buffering: no`, `Cache-Control: no-transform`, dan matikan buffering di konfigurasi proxy untuk rute aliran. Kalau memakai CDN, pastikan rute aliran dikecualikan dari penyimpanan.
>
> Penyebab kedua yang mungkin: kompresi. Gzip yang menunggu cukup data sebelum mengirim akan menghasilkan gejala yang sama. Matikan kompresi untuk `text/event-stream`.
>
> **B: kebocoran sambungan.** Pendengar pub/sub tidak dilepas saat klien menutup aliran, jadi setiap sambungan meninggalkan sisa. Perbaikan: pembersihan pada `req.raw.on('close')`, dan pasang metrik jumlah sambungan aktif. Grafik yang naik monoton tanpa pernah turun adalah bukti yang tidak terbantahkan.
>
> Penyebab kedua yang sering bersamaan: buffer pengiriman yang menumpuk. Klien yang membaca lebih lambat daripada Anda mengirim akan membuat buffer tumbuh di memori server. Periksa `res.raw.writableLength`, dan putuskan sambungan yang buffernya melebihi ambang. Ini backpressure dari modul 2 pada bentuk yang berbeda.
>
> **C: proxy perusahaan yang memutus sambungan panjang.** Satu kantor dengan proxy yang menutup sambungan sepi setelah 20 detik, dan denyut Anda setiap 30 detik. Perbaikan: denyut setiap 15 detik. Dan sediakan jalur mundur: kalau aliran gagal tiga kali berturut-turut, klien beralih ke polling.
>
> Jalur mundur itu pekerjaan sisi klien, dan pantas diminta sejak awal. Realtime adalah peningkatan, dan aplikasi harus tetap berguna tanpanya.
>
> **D: penutupan yang tidak sopan ditambah lonjakan sambung ulang.** Saat instance dimatikan, sambungan terputus mendadak, lalu semua klien menyambung ulang pada detik yang sama ke instance yang tersisa, membuatnya kewalahan.
>
> Perbaikan berlapis: kirim pesan "tutup" dengan jeda sambung ulang acak sebelum menutup, pakai deploy bergulir sehingga tidak semua instance dimatikan bersamaan, dan di sisi klien pakai jeda bertambah dengan jitter. Satu menit kehilangan sambungan untuk setiap deploy adalah harga yang tidak perlu dibayar.

## Batasnya

Realtime mempercepat kabar, dan tiga hal tetap di luarnya.

**Realtime bukan jaminan pengiriman.** Pub/sub bisa kehilangan pesan, sambungan bisa terputus, dan klien bisa menutup tab. Kebenaran tetap di basis data, dan klien harus bisa membaca keadaan terkini kapan saja.

**Sambungan panjang menambah pekerjaan operasional.** Batas berkas terbuka, batas waktu proxy, penutupan saat deploy, dan metrik baru yang perlu dipantau. Itu biaya yang pantas dihitung sebelum memilihnya.

**Pengguna di jaringan buruk tetap melihat jeda.** Aplikasi harus jujur: tampilkan kapan data terakhir diperbarui, dan sediakan tombol muat ulang.

## Rangkuman

- Hitung dulu beban polling. Kalau di bawah beberapa puluh permintaan per detik dan datanya bisa di-cache, polling adalah keputusan yang lebih baik.
- Mulai dari SSE: hanya HTTP, menyambung ulang sendiri, dan cukup untuk 90% kebutuhan aplikasi bisnis. WebSocket kalau klien benar-benar perlu mengirim pesan sering.
- Soket untuk kabar, HTTP untuk keputusan. Klaim, pembelian, dan perubahan data lewat endpoint biasa yang punya transaksi dan idempotensi.
- Kirim foto keadaan lebih dulu, lalu perubahan. Dan sediakan `Last-Event-ID` supaya yang terlewat bisa dikirim ulang.
- Sambungan hidup di satu proses. Dengan beberapa instance, pub/sub adalah syarat, bukan pilihan.
- Satu sambungan Redis untuk seluruh proses, dengan penyebaran ke pendengar di memori. Penerbit dan pelanggan memakai sambungan terpisah.
- Jangan pernah meneruskan muatan peristiwa internal langsung ke klien. Ringkas dulu sesuai hak pembacanya.
- Otorisasi diperiksa per pesan, bukan hanya saat menyambung. Sambungan bisa hidup lebih lama daripada izinnya.
- Denyut setiap 15 detik, pembersihan pada penutupan, batas ukuran pesan, batas sambungan per pengguna, dan `ulimit` yang dinaikkan.
- Saat instance dimatikan, beri tahu klien dengan jeda sambung ulang acak. Tanpa itu, Anda membuat lonjakan sendiri.
- Realtime adalah peningkatan. Aplikasi harus tetap berguna saat alirannya gagal.

## Masalah terbuka

Pembeli sekarang melihat statusnya berubah seketika. Permintaan berikutnya dari pemilik toko: pembeli ingin mengunggah bukti transfer, dan penjual ingin mengunggah foto produk.

Lalu masalahnya terlihat. Seorang penjual mengunggah foto 12 MB, dua puluh sekaligus. Permintaan itu melewati aplikasi Anda, yang berarti 240 MB mengalir lewat proses Node, ditampung di memori, lalu diteruskan ke penyimpanan. Dan dari modul 2 Anda sudah tahu apa yang terjadi: memori melonjak, event loop tertahan saat payload diproses, dan satu pengguna dengan koneksi lambat menahan satu sambungan selama tiga menit.

Pertanyaan lainnya menyusul. Berkas disimpan di mana supaya tidak hilang saat container diganti? Bagaimana memastikan berkas yang diunggah benar-benar gambar, bukan skrip yang diberi nama `.jpg`? Siapa yang boleh mengunduh bukti transfer orang lain? Dan siapa yang membersihkan berkas yang terunggah untuk pesanan yang akhirnya dibatalkan?

Itu isi modul berikutnya: unggahan langsung ke penyimpanan objek, validasi berkas yang sungguhan, penyajian berkas privat, dan pemrosesan media di latar belakang.
