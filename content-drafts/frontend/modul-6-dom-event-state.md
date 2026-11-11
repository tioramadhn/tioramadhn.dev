---
title: 'Modul 6: DOM, Event, dan State yang Dikelola Tangan'
description: Satu data ditampilkan di tiga tempat, lalu datanya berubah. Modul ini membangun aplikasi kecil tanpa framework sampai masalah itu terasa, karena di situlah React mulai masuk akal.
date: 2026-11-13
slug: modul-6-dom-event-state
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Modul sebelumnya berhenti di `console.log`, dan pengguna tidak membuka console. Sekarang hasil olahan itu harus muncul di halaman, ikut berubah saat pengguna mengklik, dan tetap benar saat datanya diperbarui.

Pekerjaannya terbagi tiga, dan ketiganya akan Anda kerjakan dengan tangan di modul ini:

| Pekerjaan | Caranya |
| --- | --- |
| Membaca dan mengubah halaman | DOM API: `querySelector`, `createElement`, `textContent` |
| Menangkap perbuatan pengguna | Event: `addEventListener`, bubbling, delegation |
| Menjaga data dan tampilan tetap sejalan | State, dan di sinilah masalahnya dimulai |

Kolom ketiga itu inti modul ini. Dua yang pertama hanya API yang bisa dicari di dokumentasi kapan saja.

## Masalahnya dulu: satu data, tiga tempat

Bayangkan halaman kasir warung. Jumlah item di keranjang ditampilkan di tiga tempat sekaligus: lencana angka di ikon keranjang, judul tab browser, dan baris total di bawah daftar.

Pengguna menghapus satu item. Sekarang siapa yang bertanggung jawab memperbarui ketiga tempat itu?

Jawaban pertama yang selalu muncul: fungsi `hapusItem()` saja yang mengurus semuanya.

```js
function hapusItem(id) {
  const baris = document.querySelector(`[data-id="${id}"]`);
  baris.remove();

  const sisa = document.querySelectorAll('.baris-item').length;
  document.querySelector('.lencana').textContent = sisa;
  document.title = `Keranjang (${sisa})`;
  hitungUlangTotal();
}
```

Berhasil, dan terasa wajar. Lalu produk bertambah:

1. Ada tombol "Kosongkan keranjang". Fungsinya harus mengulang empat baris yang sama.
2. Ada perubahan jumlah lewat tombol plus dan minus. Empat baris lagi.
3. Ada kupon yang menghapus item gratis secara otomatis. Empat baris lagi.
4. Ada sinkronisasi dari tab lain. Empat baris lagi.

Perhatikan apa yang terjadi: **jumlah tempat yang harus diingat tumbuh mengikuti jumlah aksi dikali jumlah tampilan**. Dengan 8 aksi dan 5 tampilan, ada 40 pasangan yang harus benar. Satu yang terlewat jadi laporan bug "angka di ikon keranjang tidak cocok dengan isinya", dan laporan itu selalu datang.

Masalahnya juga bukan hanya jumlah. Perhatikan baris `document.querySelectorAll('.baris-item').length` di atas. Kode itu menjadikan **DOM sebagai sumber kebenaran**: jumlah item dihitung dari jumlah baris di halaman. Begitu ada baris yang disembunyikan dengan CSS, atau baris yang sedang dianimasikan keluar, angkanya salah tanpa ada yang tahu kenapa.

## Analogi: papan tulis kasir dan tampilan harga

Bayangkan warung dengan papan tulis di belakang kasir yang mencatat semua pesanan, dan tiga layar untuk pelanggan yang menampilkan ringkasannya.

**Cara pertama.** Setiap kali ada perubahan, kasir mengoreksi papan tulis, lalu mengoreksi layar satu, layar dua, dan layar tiga. Saat ramai, salah satu layar pasti terlewat, dan pelanggan melihat angka yang berbeda dari kasir.

**Cara kedua.** Ada aturan: tidak ada yang boleh menulis di layar. Semua perubahan hanya ditulis di papan tulis, dan ada satu petugas yang tugasnya menggambar ulang ketiga layar dari papan tulis setiap kali papannya berubah.

Cara kedua terlihat lebih banyak kerja, tapi hanya punya satu tempat yang bisa salah. Kalau angka di layar aneh, cukup lihat papan tulisnya.

| Dunia warung | Dunia frontend |
| --- | --- |
| Papan tulis kasir | State, satu sumber kebenaran |
| Tiga layar pelanggan | Tampilan, hasil render |
| Petugas yang menggambar ulang layar | Fungsi `render()` |
| Aturan "jangan menulis di layar" | Tampilan tidak boleh jadi sumber data |
| Catatan "meja 4 pesan dua kopi" | Event yang mengubah state |

Batas analoginya: menggambar ulang seluruh layar setiap kali ada perubahan kecil itu mahal kalau layarnya besar. Petugas manusia akan kelelahan, dan browser akan kehilangan posisi kursor serta posisi gulir. Masalah itu nanti yang diselesaikan React dengan membandingkan hasil gambar lama dan baru, lalu hanya mengubah bagian yang berbeda.

## DOM: bagian API yang benar-benar dipakai

```js
// Memilih
const tombol = document.querySelector('#kirim');
const semuaBaris = document.querySelectorAll('.baris-item');

// Membuat dan mengisi
const baris = document.createElement('li');
baris.textContent = 'Kopi susu';
baris.className = 'baris-item';
baris.dataset.id = '12'; // menjadi data-id="12"

// Memasukkan
daftar.append(baris);

// Mengubah kelas dan atribut
tombol.classList.toggle('aktif', true);
tombol.setAttribute('aria-expanded', 'true');
tombol.disabled = true;

// Membaca isian form
const nilai = document.querySelector('#email').value;
```

Satu perbedaan yang menyangkut keamanan, bukan selera:

```js
const namaDariPengguna = '<img src=x onerror="alert(document.cookie)">';

// Aman: diperlakukan sebagai teks apa pun isinya
elemen.textContent = namaDariPengguna;

// Berbahaya: dijalankan sebagai HTML
elemen.innerHTML = namaDariPengguna;
```

Itu celah **XSS**, dan pola "menyusun HTML dari data pengguna" adalah penyebab paling umumnya. Aturannya: `textContent` untuk teks, dan `innerHTML` hanya untuk HTML yang Anda sendiri yang susun, tanpa sisipan dari pengguna. Modul 15 membahasnya lebih jauh, termasuk kenapa React tetap punya celah serupa bernama `dangerouslySetInnerHTML`.

Untuk membangun banyak elemen sekaligus, `DocumentFragment` menghemat pekerjaan layout:

```js
const potongan = document.createDocumentFragment();

for (const item of daftar) {
  const li = document.createElement('li');
  li.textContent = item.nama;
  potongan.append(li);
}

// Satu kali sentuh halaman, bukan sekali per item
wadah.append(potongan);
```

## Event: bubbling dan delegation

Event yang terjadi pada sebuah elemen naik ke induknya, lalu ke induknya lagi, sampai ke `document`. Sifat itu disebut bubbling, dan sangat berguna.

Cara yang tidak bertahan:

```js
// Satu listener per tombol. Tombol yang dibuat setelah ini tidak punya listener.
document.querySelectorAll('.tombol-hapus').forEach((tombol) => {
  tombol.addEventListener('click', () => hapus(tombol.dataset.id));
});
```

Cara yang bertahan, disebut **event delegation**:

```js
// Satu listener untuk seluruh daftar, berapa pun jumlah isinya,
// termasuk baris yang baru dibuat sesudahnya.
daftar.addEventListener('click', (peristiwa) => {
  const tombol = peristiwa.target.closest('.tombol-hapus');
  if (!tombol) return;

  hapus(tombol.dataset.id);
});
```

Pola itu menyelesaikan dua hal sekaligus: listener tidak perlu dipasang ulang setiap kali daftarnya digambar ulang, dan jumlah listener tidak tumbuh mengikuti jumlah baris.

Empat hal lain yang sering dibutuhkan:

```js
// Mencegah perilaku bawaan, misalnya form yang memuat ulang halaman
form.addEventListener('submit', (peristiwa) => {
  peristiwa.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  kirim(data);
});

// Keyboard: tutup dengan Escape
dialog.addEventListener('keydown', (peristiwa) => {
  if (peristiwa.key === 'Escape') tutup();
});

// Satu kali saja
tombol.addEventListener('click', mulai, { once: true });

// Membersihkan listener saat tidak dibutuhkan lagi
const kendali = new AbortController();
window.addEventListener('resize', atur, { signal: kendali.signal });
kendali.abort(); // Semua listener dengan signal ini ikut dilepas
```

Baris terakhir itu jawaban modern untuk kebocoran memori akibat listener yang tidak pernah dilepas, dan konsepnya sama dengan cleanup di `useEffect` pada modul 10.

## Pola yang benar: state, lalu render

Daripada menyentuh halaman dari mana-mana, susun kode dengan tiga bagian yang tegas.

```js
// 1. State: satu-satunya sumber kebenaran
let state = {
  item: [],
  filter: 'semua',
  sedangMemuat: false,
};

// 2. Render: fungsi yang menggambar tampilan dari state, tanpa mengubah state
function render() {
  const terlihat =
    state.filter === 'semua'
      ? state.item
      : state.item.filter((i) => i.status === state.filter);

  daftar.replaceChildren(
    ...terlihat.map((item) => {
      const li = document.createElement('li');
      li.className = 'baris-item';
      li.dataset.id = item.id;
      li.textContent = `${item.nama} (${item.jumlah})`;
      return li;
    })
  );

  lencana.textContent = String(state.item.length);
  document.title = `Keranjang (${state.item.length})`;
  total.textContent = formatRupiah(
    state.item.reduce((n, i) => n + i.harga * i.jumlah, 0)
  );
}

// 3. Aksi: satu-satunya cara state berubah, dan selalu diikuti render
function ubahState(perubahan) {
  state = { ...state, ...perubahan };
  render();
}

function hapusItem(id) {
  ubahState({ item: state.item.filter((i) => i.id !== id) });
}
```

Bandingkan dengan `hapusItem` di awal modul. Sekarang fungsi aksi tidak tahu apa pun tentang lencana, judul tab, dan baris total. Menambah tampilan keempat berarti menambah satu baris di `render()`, bukan satu baris di delapan fungsi aksi.

Tiga aturan yang membuat pola ini bekerja:

1. **Hanya `ubahState` yang boleh mengubah state**, dan setiap perubahan otomatis memicu render.
2. **`render()` tidak boleh mengubah state.** Kalau boleh, Anda membuat lingkaran yang sulit dilacak.
3. **Nilai yang bisa dihitung tidak disimpan di state.** Total harga dan jumlah item dihitung saat render. Menyimpannya berarti punya dua sumber kebenaran yang bisa berselisih.

Aturan ketiga itu yang paling sering dilanggar, dan nanti akan muncul lagi di React sebagai "jangan simpan state turunan".

## State yang tidak tinggal di memori

Dua tempat lain yang menyimpan state, dan keduanya dipakai di proyek nyata:

```js
// URL: state yang bisa dibagikan, di-bookmark, dan dibuka di tab baru
const parameter = new URLSearchParams(location.search);
const kataKunci = parameter.get('q') ?? '';

function setKataKunci(nilai) {
  const baru = new URLSearchParams(location.search);
  if (nilai) baru.set('q', nilai);
  else baru.delete('q');

  history.replaceState(null, '', `?${baru}`);
  ubahState({ kataKunci: nilai });
}

// localStorage: state yang bertahan setelah tab ditutup
function simpanDraf(isi) {
  try {
    localStorage.setItem('draf-catatan', JSON.stringify(isi));
  } catch {
    // Mode privat dan penyimpanan penuh bisa melempar error.
    // Fitur draf hilang, aplikasi tetap jalan.
  }
}
```

Aturan memilihnya:

| Jenis state | Tempatnya | Contoh |
| --- | --- | --- |
| Perlu bisa dibagikan atau di-bookmark | URL | Kata kunci pencarian, filter, nomor halaman, tab aktif |
| Perlu bertahan antar kunjungan, per perangkat | `localStorage` | Draf yang belum terkirim, preferensi tema |
| Hanya berarti selama halaman terbuka | Memori | Dialog yang sedang terbuka, hasil validasi sementara |
| Sumbernya server | Server, dengan cache di klien | Daftar produk, profil pengguna |

Kesalahan yang paling sering: menaruh filter dan nomor halaman di memori saja. Pengguna memfilter, mengirim tautannya ke rekan, dan rekannya membuka halaman kosong tanpa filter. Modul 14 akan menjadikan URL sebagai state resmi dengan dukungan dari framework.

## Satu hal yang hilang saat halaman berubah sendiri

Saat Anda mengubah isi halaman dengan JavaScript, pembaca layar tidak otomatis memberi tahu penggunanya. Pengguna yang menekan "Cari" lalu mendapat 24 hasil tidak mendengar apa pun.

```html
<p id="status-cari" role="status" aria-live="polite"></p>
```

```js
document.querySelector('#status-cari').textContent =
  `${hasil.length} produk ditemukan`;
```

Dua baris itu membuat perubahan diumumkan. Pola ini berlaku untuk hasil pencarian, pesan error form, notifikasi "tersimpan", dan proses yang selesai. Modul 16 membahas pengelolaan fokus yang melengkapinya, misalnya memindahkan fokus ke dialog yang baru terbuka.

## Latihan

### Latihan 1: Daftar tugas dengan satu sumber kebenaran

Bangun daftar tugas tanpa framework dengan syarat: menambah tugas lewat form, menandai selesai dengan checkbox, menghapus tugas, filter semua, aktif, dan selesai, serta penghitung "3 dari 7 selesai". Tambahkan satu tombol "Tandai semua selesai".

Syarat teknisnya: hanya satu `render()`, event memakai delegation, dan tidak boleh ada satu pun nilai yang dihitung dari DOM.

> [!petunjuk]
> Mulai dari bentuk state, bukan dari HTML. Tanyakan: data apa yang kalau hilang membuat aplikasi tidak bisa digambar ulang? Penghitung "3 dari 7" bukan salah satunya, karena bisa dihitung dari daftar tugasnya.

> [!jawaban]
>
> ```js
> let state = { tugas: [], filter: 'semua' };
>
> const daftar = document.querySelector('#daftar');
> const form = document.querySelector('#form-tugas');
> const hitung = document.querySelector('#hitung');
>
> function ubahState(perubahan) {
>   state = { ...state, ...perubahan };
>   render();
> }
>
> function render() {
>   const terlihat = state.tugas.filter((t) =>
>     state.filter === 'semua'
>       ? true
>       : state.filter === 'selesai'
>         ? t.selesai
>         : !t.selesai
>   );
>
>   daftar.replaceChildren(
>     ...terlihat.map((t) => {
>       const li = document.createElement('li');
>       li.dataset.id = t.id;
>
>       const centang = document.createElement('input');
>       centang.type = 'checkbox';
>       centang.checked = t.selesai;
>       centang.id = `tugas-${t.id}`;
>
>       const label = document.createElement('label');
>       label.htmlFor = centang.id;
>       label.textContent = t.judul;
>
>       const hapus = document.createElement('button');
>       hapus.type = 'button';
>       hapus.className = 'hapus';
>       hapus.textContent = 'Hapus';
>       hapus.setAttribute('aria-label', `Hapus ${t.judul}`);
>
>       li.append(centang, label, hapus);
>       return li;
>     })
>   );
>
>   const selesai = state.tugas.filter((t) => t.selesai).length;
>   hitung.textContent = `${selesai} dari ${state.tugas.length} selesai`;
> }
>
> form.addEventListener('submit', (peristiwa) => {
>   peristiwa.preventDefault();
>   const judul = new FormData(form).get('judul').toString().trim();
>   if (!judul) return;
>
>   ubahState({
>     tugas: [...state.tugas, { id: crypto.randomUUID(), judul, selesai: false }],
>   });
>   form.reset();
> });
>
> // Satu listener untuk seluruh daftar
> daftar.addEventListener('click', (peristiwa) => {
>   const tombol = peristiwa.target.closest('.hapus');
>   if (!tombol) return;
>
>   const id = tombol.closest('li').dataset.id;
>   ubahState({ tugas: state.tugas.filter((t) => t.id !== id) });
> });
>
> daftar.addEventListener('change', (peristiwa) => {
>   if (peristiwa.target.type !== 'checkbox') return;
>
>   const id = peristiwa.target.closest('li').dataset.id;
>   ubahState({
>     tugas: state.tugas.map((t) =>
>       t.id === id ? { ...t, selesai: peristiwa.target.checked } : t
>     ),
>   });
> });
> ```
>
> Empat hal yang sengaja dikerjakan begitu:
>
> 1. **Penghitung tidak disimpan di state.** Dihitung di `render()`, jadi tidak mungkin berselisih dengan daftarnya.
> 2. **Checkbox punya `id` dan label punya `htmlFor`.** Tanpa itu, teks tugas tidak bisa diklik untuk mencentang, dan pembaca layar tidak tahu nama checkboxnya. Modul 2 masih berlaku meski elemennya dibuat JavaScript.
> 3. **Tombol hapus punya `aria-label` yang menyebut judulnya.** Sepuluh tombol bernama "Hapus" adalah daftar yang tidak berguna bagi pengguna pembaca layar.
> 4. **`change` dan `click` dipisah.** Checkbox menghasilkan `change`, bukan hanya `click`, dan memakai `change` membuatnya ikut bekerja saat diubah dengan spasi dari keyboard.

### Latihan 2: Dua sumber kebenaran

Kode ini punya bug yang hanya muncul pada urutan tertentu. Temukan dan jelaskan.

```js
let state = { item: [], jumlahItem: 0 };

function tambah(item) {
  state.item.push(item);
  state.jumlahItem = state.jumlahItem + 1;
  render();
}

function hapusTerakhir() {
  state.item.pop();
  state.jumlahItem = state.jumlahItem - 1;
  render();
}

function muatDariServer(daftar) {
  state.item = daftar;
  render();
}
```

> [!petunjuk]
> Jalankan di kepala Anda: tambah dua item, muat lima item dari server, lalu hapus satu. Berapa nilai `jumlahItem`, dan berapa panjang `item`?

> [!jawaban]
>
> Setelah urutan itu, `state.item` berisi 4 item sedangkan `state.jumlahItem` bernilai 1. Lencana di halaman akan menunjukkan 1 padahal daftarnya empat baris.
>
> Penyebabnya `jumlahItem` adalah **state turunan** yang disimpan terpisah. Setiap fungsi yang mengubah `item` wajib ingat memperbarui pasangannya, dan `muatDariServer` lupa. Ini persis masalah yang dibahas di awal modul, hanya pindah tempat: dari tiga tampilan jadi dua variabel.
>
> Perbaikannya menghapus data turunannya, bukan menambal fungsinya:
>
> ```js
> let state = { item: [] };
>
> function render() {
>   lencana.textContent = String(state.item.length); // dihitung, bukan disimpan
> }
> ```
>
> Patokan yang bisa dipakai seumur hidup: kalau sebuah nilai bisa dihitung dari nilai lain, jangan simpan. Kalau terpaksa disimpan karena perhitungannya mahal, perlakukan sebagai cache dan beri satu tempat yang bertanggung jawab memperbaruinya.

### Latihan 3: Pencarian yang tidak menghujani server

Tambahkan pencarian ke daftar tugas Anda dengan syarat: permintaan dikirim ke server paling cepat 300 milidetik setelah pengguna berhenti mengetik, hasil permintaan lama yang datang terlambat tidak boleh menimpa hasil yang lebih baru, kata kunci tersimpan di URL supaya bisa dibagikan, dan keadaan memuat serta kosong punya tampilan sendiri.

> [!pembahasan]
>
> ```js
> let timer;
> let kendaliTerakhir;
>
> function cariDitunda(kataKunci) {
>   clearTimeout(timer);
>   timer = setTimeout(() => cari(kataKunci), 300);
> }
>
> async function cari(kataKunci) {
>   // Batalkan permintaan sebelumnya yang sudah tidak relevan
>   kendaliTerakhir?.abort();
>   kendaliTerakhir = new AbortController();
>
>   ubahState({ sedangMemuat: true, pesanGagal: null });
>
>   try {
>     const respons = await fetch(`/api/tugas?q=${encodeURIComponent(kataKunci)}`, {
>       signal: kendaliTerakhir.signal,
>     });
>
>     if (!respons.ok) throw new Error(`Gagal mencari (${respons.status})`);
>
>     ubahState({ tugas: await respons.json(), sedangMemuat: false });
>   } catch (error) {
>     if (error.name === 'AbortError') return; // Dibatalkan, bukan kegagalan
>     ubahState({ sedangMemuat: false, pesanGagal: error.message });
>   }
> }
>
> input.addEventListener('input', (peristiwa) => {
>   const nilai = peristiwa.target.value;
>   setKataKunci(nilai); // menulis ke URL dan ke state
>   cariDitunda(nilai);
> });
> ```
>
> Empat hal yang dikerjakan di sini, dan semuanya akan Anda temukan lagi sebagai fitur bawaan library data di modul 12:
>
> 1. **Debounce 300ms.** Tanpa ini, mengetik "kopi susu" mengirim sepuluh permintaan.
> 2. **Membatalkan permintaan lama.** Ini jawaban untuk race condition: permintaan untuk "ko" bisa saja dijawab server lebih lambat daripada permintaan untuk "kopi", dan tanpa pembatalan hasilnya menimpa yang benar.
> 3. **`AbortError` tidak dianggap kegagalan.** Kalau ikut ditampilkan, pengguna melihat pesan error setiap kali mengetik.
> 4. **Keadaan memuat, kosong, dan gagal adalah bagian dari state**, bukan sesuatu yang ditempel ke DOM di tengah jalan. Jangan lupa tambahkan `aria-live` pada wadah hasil, supaya jumlah temuan ikut diumumkan.

### Latihan 4: Hitung biayanya

Ambil daftar tugas Anda, lalu tambahkan empat fitur berikut di atas kertas saja, tanpa menulis kode: pengurutan (terbaru, terlama, nama), pengeditan judul di tempat, pembatalan aksi terakhir (undo), dan sinkronisasi dengan server setiap kali ada perubahan.

Untuk setiap fitur, catat: baris mana saja di `render()` yang harus berubah, state apa yang bertambah, dan tempat mana yang berisiko lupa diperbarui.

**Pertanyaannya:** pada fitur keberapa `render()` Anda mulai terasa terlalu besar, dan pada fitur keberapa Anda mulai ingin menggambar ulang hanya sebagian halaman? Simpan catatan itu. Modul 9 akan membuka dengan masalah yang persis Anda tulis di sini.

## Batasnya

Pola state lalu render menyelesaikan masalah "satu data di banyak tempat" dengan sangat baik, dan runtuh pada tiga hal.

**Pertama, `render()` tumbuh tanpa batas.** Dua puluh elemen yang perlu diperbarui berarti dua puluh baris di satu fungsi, dan fungsi itu jadi tempat yang dirawat seluruh tim.

**Kedua, menggambar ulang semuanya mahal dan merusak.** `replaceChildren` membuat elemen baru, jadi fokus pengguna hilang, teks yang sedang diseleksi lepas, dan input yang sedang diisi bisa ter-reset. Pada daftar panjang, biayanya terasa sebagai jeda.

**Ketiga, tidak ada cara memakai ulang bagian UI.** Kartu produk yang dipakai di tiga halaman berarti tiga potong kode pembuat elemen yang mirip tapi tidak pernah persis sama.

Perbaikan yang terbayang pasti: pecah `render()` jadi fungsi-fungsi kecil per bagian, dan bandingkan hasil lama dengan hasil baru supaya hanya bagian yang berbeda yang disentuh. Begitu Anda benar-benar mengerjakan dua ide itu, Anda sedang membangun ulang React.

## Rangkuman

- DOM API yang dipakai sehari-hari pendek: memilih, membuat, mengisi, memasukkan, mengubah kelas dan atribut.
- `textContent` untuk teks dari pengguna, `innerHTML` hanya untuk HTML yang Anda susun sendiri. Pola "menyusun HTML dari data pengguna" adalah pintu masuk XSS.
- Event delegation dengan satu listener di induk mengalahkan satu listener per elemen, terutama untuk isi yang digambar ulang.
- Satu sumber kebenaran: semua perubahan lewat satu fungsi, lalu satu `render()` menggambar semua tampilan dari state.
- Nilai yang bisa dihitung tidak disimpan. State turunan adalah sumber angka yang berselisih.
- Filter, pencarian, dan nomor halaman tempatnya di URL, bukan hanya di memori.
- Perubahan isi yang dilakukan JavaScript perlu diumumkan dengan `aria-live`, karena pembaca layar tidak otomatis tahu.

## Masalah terbuka

Anda sekarang punya aplikasi kecil yang benar, dan daftar keluhan yang jelas: satu fungsi render yang terus membesar, tampilan yang digambar ulang seluruhnya, dan tidak ada cara memakai ulang satu potong UI.

Sebelum masuk ke alat yang menyelesaikannya, ada satu hal yang harus dikerjakan lebih dulu. Semua kode modul ini masih berupa satu file yang dipanggil dengan tag `script`. Begitu Anda ingin memecahnya jadi dua puluh file, memasang library orang lain, memakai fitur bahasa yang belum didukung semua browser, dan mengirim satu bundel kecil ke pengguna, Anda butuh perkakas.

Tapi sebelum itu, saatnya membuktikan bahwa lima modul pertama sudah menempel. Bagian berikutnya adalah proyek pertama: satu dasbor cuaca yang dibangun hanya dengan HTML, CSS, dan JavaScript, tanpa framework apa pun.
