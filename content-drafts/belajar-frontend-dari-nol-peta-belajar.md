---
title: 'Belajar Frontend dari Nol sampai Mahir: Peta Belajar 18 Modul'
description: Rute belajar frontend yang disusun dari masalah ke solusi, bukan dari daftar logo. Setiap modul menjawab pertanyaan yang ditinggalkan modul sebelumnya, sampai ke standar yang dipakai di tempat kerja.
date: 2026-11-06
slug: belajar-frontend-dari-nol-peta-belajar
tags: tutorial frontend
series: Tutorial Frontend
status: draft
---

Kebanyakan roadmap frontend berbentuk kumpulan logo: HTML, CSS, JavaScript, React, Next.js, Tailwind, TypeScript, dan dua puluh logo lain di bawahnya. Masalahnya, logo tanpa konteks membuat Anda sibuk mengejar tools baru tanpa pernah tahu masalah apa yang sebenarnya dipecahkan tools itu.

Padahal setiap potong teknologi frontend lahir karena ada yang menyakitkan sebelumnya. React tidak muncul karena orang bosan dengan jQuery, tapi karena menjaga DOM tetap sinkron dengan data secara manual gagal bertahan saat aplikasi membesar. TypeScript tidak muncul karena JavaScript jelek, tapi karena bug tipe baru ketahuan di tangan pengguna.

Seri ini disusun dari masalah ke solusi. Setiap modul dimulai dari satu masalah konkret, teknologinya muncul sebagai jawaban, lalu modul ditutup dengan masalah baru yang jadi pintu masuk modul berikutnya.

## Prasyarat

Tidak perlu pengalaman koding. Cukup bisa memakai komputer dengan nyaman, mau membaca bahasa Inggris pada dokumentasi, dan siap mengetik ulang contoh daripada menyalin-tempel. Terminal dan Git diajarkan saat dibutuhkan, bukan di awal sebagai hafalan.

Kalau Anda sudah bisa React dan ingin menambal bagian yang bolong, lihat tabel peta modul di bawah dan masuk dari modul yang masalahnya masih terasa asing.

## Rantai masalahnya

Ini inti dari cara seri ini disusun. Bacalah sebagai satu alur, bukan daftar:

1. Browser hanya menerima teks dari jaringan. **Bagaimana memberi teks itu struktur dan makna?**
2. HTML menjawabnya. **Bagaimana mengatur tampilannya di layar 360px sampai 2560px?**
3. CSS menjawabnya. **Halaman jadi rapi tapi mati. Bagaimana membuatnya bereaksi?**
4. JavaScript menjawabnya. **Bagaimana mengubah halaman tanpa kehilangan jejak data yang sedang aktif?**
5. DOM dan state manual menjawabnya, lalu runtuh saat aplikasi membesar. **Bagaimana satu proyek dengan ratusan file dirakit jadi satu aplikasi?**
6. Tooling menjawabnya. **Bagaimana menangkap salah tipe sebelum pengguna yang menemukannya?**
7. TypeScript menjawabnya. **Bagaimana membuat UI selalu konsisten dengan datanya, tanpa menyentuh DOM satu per satu?**
8. React menjawabnya. **Bagaimana berbagi logika antar komponen tanpa saling mengunci?**
9. Hook dan komposisi menjawabnya. **Bagaimana styling ratusan komponen tetap konsisten dan bisa bertema?**
10. Design token dan utility CSS menjawabnya. **Data datang dari server, lambat, dan bisa gagal. Bagaimana mengelolanya?**
11. Lapisan data dan cache menjawabnya. **Pengguna mengetik hal yang tidak kita duga. Bagaimana memvalidasi tanpa menyiksa?**
12. Form dan validasi berlapis menjawabnya. **Aplikasinya berat saat dibuka pertama kali dan tidak terbaca mesin pencari. Bagaimana?**
13. Next.js dan render di server menjawabnya. **Kalau ada server dan sesi, bagaimana mengamankannya?**
14. Autentikasi dan pengamanan frontend menjawabnya. **Aplikasinya jalan, tapi apakah semua orang bisa memakainya?**
15. Aksesibilitas menjawabnya. **Fitur bertambah dan perubahan kecil memecahkan yang lain. Bagaimana tahu lebih awal?**
16. Testing menjawabnya. **Benar tapi lambat di HP sejuta rupiah. Bagaimana mengukur dan memperbaikinya?**
17. Performance dan Core Web Vitals menjawabnya. **Satu aplikasi berubah jadi lima produk dan empat tim. Bagaimana supaya tidak saling menabrak?**
18. Design system, monorepo, dan jalur rilis menjawabnya.

## Peta modul

| No | Modul | Masalah yang diselesaikan | Tingkat |
| --- | --- | --- | --- |
| 1 | Cara kerja web dan peran frontend | Apa yang sebenarnya terjadi antara menekan Enter dan halaman muncul, dan di mana pekerjaan frontend dimulai? | Pemula |
| 2 | HTML semantik | Tumpukan `div` terlihat sama di layar, tapi tidak bisa dibaca pembaca layar, mesin pencari, maupun rekan satu tim. | Pemula |
| 3 | CSS modern dan layout responsif | Satu desain harus hidup di layar sempit, lebar, mode gelap, dan teks yang diperbesar pengguna. | Pemula |
| 4 | JavaScript untuk frontend | Halaman statis tidak bisa menjawab klik, mengambil data, atau menunggu jaringan. | Pemula |
| 5 | DOM, event, dan state manual | Begitu data berubah di tiga tempat sekaligus, UI dan data mulai berbohong satu sama lain. | Pemula |
| 6 | Tooling dan build modern | Satu file jadi dua ratus file, dengan dependensi, versi, dan kode yang harus diterjemahkan untuk browser. | Menengah |
| 7 | TypeScript untuk frontend | `undefined is not a function` di produksi, padahal lokal aman. | Menengah |
| 8 | React: komponen, state, model render | Menyinkronkan DOM secara manual tidak terkelola. Bagaimana mendeklarasikan UI sebagai hasil dari state? | Menengah |
| 9 | React lanjutan | Logika yang sama tersebar di banyak komponen, dan `useEffect` dipakai untuk hal yang bukan tugasnya. | Menengah |
| 10 | Styling skala aplikasi | Kelas CSS bertabrakan, nilai warna disalin di 40 tempat, dan tema gelap jadi pekerjaan dua minggu. | Menengah |
| 11 | Data dari server | Data bisa lambat, gagal, basi, atau datang dua kali. Loading spinner saja tidak menjawab itu. | Menengah |
| 12 | Form, validasi, dan input | Form adalah tempat pengguna paling sering gagal, dan tempat data kotor paling sering masuk. | Menengah |
| 13 | Next.js App Router | Aplikasi satu halaman lambat saat pertama dibuka, sulit diindeks, dan menaruh semua pekerjaan di HP pengguna. | Lanjut |
| 14 | Autentikasi dan keamanan frontend | Token di `localStorage`, XSS, CSRF, dan tombol yang disembunyikan tapi endpoint-nya masih terbuka. | Lanjut |
| 15 | Aksesibilitas | Keyboard tidak bisa menjangkau menu, kontras gagal di bawah sinar matahari, pembaca layar membacakan "tombol, tombol". | Lanjut |
| 16 | Testing frontend | Setiap rilis mempertaruhkan fitur yang sudah jalan, dan uji manual tidak pernah cukup waktu. | Lanjut |
| 17 | Performance dan Core Web Vitals | Halaman terasa cepat di laptop Anda dan menyiksa di HP kelas bawah dengan jaringan 4G yang penuh. | Lanjut |
| 18 | Design system, monorepo, dan rilis | Lima produk, empat tim, satu merek. Komponen bercabang, rilis saling menunggu, insiden tidak terlihat. | Lanjut |

## Proyek sebagai checkpoint

Teori tanpa praktik tidak bertahan. Setiap tiga sampai empat modul ada satu proyek yang menggabungkan semuanya:

- **Proyek 1: Dasbor cuaca tanpa framework.** HTML semantik, CSS grid, `fetch`, dan state yang dikelola tangan sendiri. Tujuannya merasakan masalah yang nanti dijawab React.
- **Proyek 2: Katalog serial dan film dengan React dan TypeScript.** Komponen, custom hook, routing, pencarian yang tersimpan di URL, dan tipe yang dipisahkan dari bentuk respons API.
- **Proyek 3: Dasbor admin dengan tabel, filter, dan form.** Lapisan data dengan cache, form tervalidasi, status kosong dan gagal, plus tema terang dan gelap dari satu set token.
- **Proyek 4: Aplikasi catatan kolaboratif dengan Next.js.** Server Component, Server Action, sesi yang aman, optimistic update, lalu dideploy ke internet.
- **Proyek Akhir: Platform kursus mini siap produksi.** Semuanya sekaligus, plus dokumen keputusan "kenapa bagian ini dirender di server dan bagian itu di klien", laporan Lighthouse, audit aksesibilitas, dan pipeline rilis.

## Struktur tiap modul

Formatnya tetap, supaya Anda tahu apa yang diharapkan:

1. **Pengenalan.** Jembatan dari modul sebelumnya, masalah dulu, lalu analogi sehari-hari.
2. **Cara kerja.** Bagaimana komponennya bekerja, bukan hanya cara memakainya.
3. **Opsi tools.** Kategori, fungsi, contoh, dan kapan memilih yang mana.
4. **Latihan bertahap.** Terpandu, lalu berpetunjuk, lalu mandiri.
5. **Batasnya.** Apa yang tetap tidak bisa diselesaikan bagian ini.
6. **Rangkuman dan masalah terbuka.** Poin kunci, lalu pertanyaan yang dijawab modul berikutnya.

## Yang dicari industri sekarang

Isi seri ini dipilih dari apa yang benar-benar diminta pada pekerjaan frontend hari ini, bukan dari apa yang sedang ramai di media sosial. Empat pergeseran yang paling terasa:

**TypeScript sudah jadi bawaan, bukan nilai tambah.** Hampir semua tim yang merekrut hari ini memakainya. Modul 7 memperlakukannya sebagai bagian dari bahasa kerja, bukan materi opsional di akhir.

**Rendering pindah sebagian ke server.** React Server Component dan Next.js App Router mengubah pertanyaan "bagaimana mengambil data" menjadi "di mana sebaiknya kode ini berjalan". Modul 13 membahas keputusan itu, termasuk kapan jawabannya tetap di klien.

**Kualitas yang bisa diukur.** Core Web Vitals, aksesibilitas, dan cakupan test bukan lagi topik penutup wawancara, tapi angka yang muncul di pipeline. Modul 15 sampai 17 memperlakukannya sebagai pekerjaan sehari-hari.

**Menulis kode jadi murah, menilai kode jadi mahal.** Dengan bantuan AI, menghasilkan komponen butuh sepuluh detik. Yang membedakan engineer sekarang adalah bisa menjelaskan kenapa sebuah pendekatan dipilih, menemukan bug pada kode yang kelihatan benar, dan tahu apa yang akan rusak enam bulan lagi. Karena itu setiap latihan di seri ini meminta alasan, bukan hanya hasil.

## Satu hal yang perlu diluruskan di awal

Tujuan seri ini bukan membuat Anda jadi penganut satu framework. Tujuannya adalah membuat Anda mampu merancang, membangun, menguji, mengamankan, dan merilis antarmuka yang dipakai orang sungguhan, **sekaligus tahu kapan sebuah teknologi tidak perlu dipakai**.

Bagian terakhir itu sering hilang dari tutorial lain. Tidak semua halaman butuh React: halaman profil perusahaan dengan lima bagian statis lebih baik dikerjakan dengan HTML, CSS, dan sedikit JavaScript, lalu selesai. Tidak semua state butuh library: kebanyakan state hanya perlu tinggal di satu komponen. Memilih yang lebih kecil, kalau cukup, adalah keputusan senior.

## Berapa lama

Dengan ritme satu modul tiga sampai empat hari dan proyek seminggu, seri ini habis dalam tiga sampai empat bulan. Lebih cepat kalau Anda sudah pernah koding, lebih lambat kalau Anda mengerjakan proyeknya dengan sungguh-sungguh, dan itu versi yang lebih baik.

Satu saran yang menentukan hasil: kerjakan proyeknya dengan tema Anda sendiri. Ganti katalog film jadi katalog resep, ganti dasbor admin jadi pencatat pengeluaran. Materi yang Anda ubah akan lebih lekat daripada materi yang Anda ikuti baris demi baris.

Mulai dari Modul 1: apa yang terjadi antara Enter dan halaman muncul.
