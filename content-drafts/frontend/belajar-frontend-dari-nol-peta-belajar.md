---
title: 'Belajar Frontend dari Nol sampai Mahir: Peta Belajar 19 Modul'
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

**Tidak perlu pengalaman koding.** Cukup bisa memakai komputer dengan nyaman: membuat folder, menyimpan berkas, dan memasang program. Kemauan membaca bahasa Inggris pada dokumentasi diperlukan, karena dokumentasi yang bagus hampir semuanya berbahasa Inggris.

Dua hal yang perlu Anda ketahui sebelum memulai, supaya harapannya tepat:

**Terminal, editor, Node, dan Git tidak diasumsikan.** Modul 0 memasang dan menjelaskan semuanya dari nol, termasuk apa itu terminal dan kenapa ada. Git diajarkan di Modul 7, saat Anda sudah punya proyek yang pantas disimpan riwayatnya.

**Modul 4 adalah modul pemrograman pertama Anda, dan paling menentukan.** Kalau Anda belum pernah menulis kode sama sekali, modul itu (beserta Modul 3) yang paling pantas dikerjakan lambat. Keduanya dasar yang dipakai enam belas modul berikutnya, dan tidak ada gunanya mengejar React dengan dasar yang goyah.

Kalau Anda sudah bisa React dan ingin menambal bagian yang bolong, lewati Modul 0 sampai 6, lihat tabel peta modul di bawah, dan masuk dari modul yang masalahnya masih terasa asing.

Satu halaman pendamping yang berguna sejak awal: [glosarium](/blog/glosarium-frontend). Isinya 130 istilah yang dipakai seri ini, dengan penunjuk modulnya. Halaman itu untuk dibuka saat ada istilah yang belum jelas, bukan untuk dibaca atau dihafal.

## Rantai masalahnya

Ini inti dari cara seri ini disusun. Bacalah sebagai satu alur, bukan daftar:

0. Belum ada apa pun di komputer Anda. **Alat apa yang dibutuhkan, dan bagaimana bersikap saat ada yang merah di layar?**
1. Alat siap, dan browser hanya menerima teks dari jaringan. **Bagaimana memberi teks itu struktur dan makna?**
2. HTML menjawabnya. **Bagaimana mengatur tampilannya di layar 360px sampai 2560px?**
3. CSS menjawabnya. **Halaman jadi rapi tapi mati, dan HTML maupun CSS hanya bisa mendeskripsikan. Bagaimana memberi instruksi sama sekali?**
4. Dasar pemrograman menjawabnya. **Bagaimana mengolah data nyata yang berlubang, dan menunggu jaringan tanpa menghentikan semuanya?**
5. JavaScript untuk frontend menjawabnya, dan semuanya masih berhenti di console. **Bagaimana mengubah halaman tanpa kehilangan jejak data yang sedang aktif?**
6. DOM dan state manual menjawabnya, lalu runtuh saat aplikasi membesar. **Bagaimana satu proyek dengan ratusan file dirakit jadi satu aplikasi, dan riwayatnya disimpan?**
7. Tooling dan Git menjawabnya. **Bagaimana menangkap salah tipe sebelum pengguna yang menemukannya?**
8. TypeScript menjawabnya. **Bagaimana membuat UI selalu konsisten dengan datanya, tanpa menyentuh DOM satu per satu?**
9. React menjawabnya. **Bagaimana berbagi logika antar komponen, dan punya lebih dari satu halaman yang bisa dibagikan lewat tautan?**
10. Hook, Context, dan routing menjawabnya. **Bagaimana styling ratusan komponen tetap konsisten dan bisa bertema?**
11. Design token dan utility CSS menjawabnya. **Data datang dari server, lambat, dan bisa gagal. Bagaimana mengelolanya?**
12. Lapisan data dan cache menjawabnya. **Pengguna mengetik hal yang tidak kita duga. Bagaimana memvalidasi tanpa menyiksa?**
13. Form dan validasi berlapis menjawabnya. **Aplikasinya berat saat dibuka pertama kali dan tidak terbaca mesin pencari. Bagaimana?**
14. Next.js dan render di server menjawabnya. **Kalau ada server dan sesi, bagaimana mengamankannya?**
15. Autentikasi dan pengamanan frontend menjawabnya. **Aplikasinya jalan, tapi apakah semua orang bisa memakainya?**
16. Aksesibilitas menjawabnya. **Fitur bertambah dan perubahan kecil memecahkan yang lain. Bagaimana tahu lebih awal?**
17. Testing menjawabnya. **Benar tapi lambat di HP sejuta rupiah. Bagaimana mengukur dan memperbaikinya?**
18. Performance dan Core Web Vitals menjawabnya. **Satu aplikasi berubah jadi lima produk dan empat tim. Bagaimana supaya tidak saling menabrak?**
19. Design system, monorepo, dan jalur rilis menjawabnya.

## Peta modul

Kolom terakhir adalah perkiraan untuk orang yang benar-benar mulai dari nol, dengan ritme beberapa jam sehari. Kalau Anda sudah pernah koding, potong setengahnya.

| No | Modul | Masalah yang diselesaikan | Tingkat | Perkiraan |
| --- | --- | --- | --- | --- |
| 0 | Menyiapkan alat kerja | Belum ada editor, terminal, maupun Node, dan belum ada kebiasaan membaca pesan error. | Pemula | 1 hari |
| 1 | Cara kerja web dan peran frontend | Apa yang sebenarnya terjadi antara menekan Enter dan halaman muncul, dan di mana pekerjaan frontend dimulai? | Pemula | 2 hari |
| 2 | HTML semantik | Tumpukan `div` terlihat sama di layar, tapi tidak bisa dibaca pembaca layar, mesin pencari, maupun rekan satu tim. | Pemula | 3 hari |
| 3 | CSS modern dan layout responsif | Satu desain harus hidup di layar sempit, lebar, mode gelap, dan teks yang diperbesar pengguna. | Pemula | 5 hari |
| 4 | Dasar pemrograman dengan JavaScript | HTML dan CSS hanya bisa mendeskripsikan. Tidak ada syarat, tidak ada pengulangan, tidak ada hitungan. | Pemula | 5 hari |
| 5 | JavaScript untuk frontend | Data nyata berlubang, daftar perlu diolah dalam satu baris, dan permintaan jaringan butuh waktu. | Pemula | 4 hari |
| 6 | DOM, event, dan state manual | Begitu data berubah di tiga tempat sekaligus, UI dan data mulai berbohong satu sama lain. | Pemula | 4 hari |
| 7 | Tooling, build, dan Git | Satu file jadi dua ratus file, dan tidak ada cara kembali ke versi yang kemarin masih jalan. | Menengah | 3 hari |
| 8 | TypeScript untuk frontend | `undefined is not a function` di produksi, padahal lokal aman. | Menengah | 4 hari |
| 9 | React: komponen, state, model render | Menyinkronkan DOM secara manual tidak terkelola. Bagaimana mendeklarasikan UI sebagai hasil dari state? | Menengah | 4 hari |
| 10 | React lanjutan dan routing | Logika yang sama tersebar di banyak komponen, `useEffect` dipakai untuk hal yang bukan tugasnya, dan aplikasi masih satu layar. | Menengah | 6 hari |
| 11 | Styling skala aplikasi | Kelas CSS bertabrakan, nilai warna disalin di 40 tempat, dan tema gelap jadi pekerjaan dua minggu. | Menengah | 3 hari |
| 12 | Data dari server | Data bisa lambat, gagal, basi, atau datang dua kali. Loading spinner saja tidak menjawab itu. | Menengah | 4 hari |
| 13 | Form, validasi, dan input | Form adalah tempat pengguna paling sering gagal, dan tempat data kotor paling sering masuk. | Menengah | 3 hari |
| 14 | Next.js App Router | Aplikasi satu halaman lambat saat pertama dibuka, sulit diindeks, dan menaruh semua pekerjaan di HP pengguna. | Lanjut | 5 hari |
| 15 | Autentikasi dan keamanan frontend | Token di `localStorage`, XSS, CSRF, dan tombol yang disembunyikan tapi endpoint-nya masih terbuka. | Lanjut | 4 hari |
| 16 | Aksesibilitas | Keyboard tidak bisa menjangkau menu, kontras gagal di bawah sinar matahari, pembaca layar membacakan "tombol, tombol". | Lanjut | 3 hari |
| 17 | Testing frontend | Setiap rilis mempertaruhkan fitur yang sudah jalan, dan uji manual tidak pernah cukup waktu. | Lanjut | 3 hari |
| 18 | Performance dan Core Web Vitals | Halaman terasa cepat di laptop Anda dan menyiksa di HP kelas bawah dengan jaringan 4G yang penuh. | Lanjut | 3 hari |
| 19 | Design system, monorepo, dan rilis | Lima produk, empat tim, satu merek. Komponen bercabang, rilis saling menunggu, insiden tidak terlihat. | Lanjut | 2 hari |

Dua modul yang perkiraannya paling sering dilanggar: **Modul 3 dan Modul 4**, keduanya lima hari. Modul 3 padat karena CSS punya banyak bagian yang saling berkaitan, dan modul itu sendiri memberi pembagian bacaan pertama dan bacaan kedua supaya tidak dipaksakan sekali duduk. Modul 4 panjang karena di situlah Anda belajar memberi instruksi sama sekali, dan tidak ada jalan pintasnya.

**Modul 10 yang paling besar**, enam hari, karena berisi `useEffect`, `useRef`, `useReducer`, custom hook, Context, dan routing sekaligus. Kerjakan latihannya satu per hari.

## Proyek sebagai checkpoint

Teori tanpa praktik tidak bertahan. Setiap tiga sampai empat modul ada satu proyek yang menggabungkan semuanya:

- **Proyek 1: Dasbor cuaca tanpa framework.** HTML semantik, CSS grid, `fetch`, dan state yang dikelola tangan sendiri. Tujuannya merasakan masalah yang nanti dijawab React. *Sekitar satu minggu.*
- **Proyek 2: Katalog serial dan film dengan React dan TypeScript.** Komponen, custom hook, routing, pencarian yang tersimpan di URL, dan tipe yang dipisahkan dari bentuk respons API. *Satu sampai dua minggu.*
- **Proyek 3: Dasbor admin dengan tabel, filter, dan form.** Lapisan data dengan cache, form tervalidasi, status kosong dan gagal, plus tema terang dan gelap dari satu set token. *Satu sampai dua minggu.*
- **Proyek 4: Aplikasi catatan kolaboratif dengan Next.js.** Server Component, Server Action, sesi yang aman, optimistic update, lalu dideploy ke internet. *Sekitar dua minggu.*
- **Proyek Akhir: Platform kursus mini siap produksi.** Semuanya sekaligus, plus dokumen keputusan "kenapa bagian ini dirender di server dan bagian itu di klien", laporan Lighthouse, audit aksesibilitas, dan pipeline rilis. *Sekitar tiga minggu.*

Satu hal yang perlu diluruskan soal proyek, karena ini penyebab orang berhenti di tengah: **spesifikasinya panjang dengan sengaja, dan Anda tidak harus menyelesaikan semuanya.** Setiap proyek punya bagian "Garis finis" yang membagi syaratnya jadi tiga tingkat: Inti, Lengkap, dan Bonus. Kerjakan tingkat Inti sampai benar-benar beres, lalu lanjut. Kembali ke tingkat Lengkap nanti, saat Anda punya alat yang membuatnya jauh lebih cepat dikerjakan.

## Struktur tiap modul

Formatnya tetap, supaya Anda tahu apa yang diharapkan:

1. **Pengenalan.** Jembatan dari modul sebelumnya, masalah dulu, lalu analogi sehari-hari.
2. **Cara kerja.** Bagaimana komponennya bekerja, bukan hanya cara memakainya.
3. **Opsi tools.** Kategori, fungsi, contoh, dan kapan memilih yang mana.
4. **Latihan bertahap.** Terpandu, lalu berpetunjuk, lalu mandiri. Jawabannya tersembunyi sampai Anda membukanya, dan sebaiknya memang dibuka belakangan.
5. **Batasnya.** Apa yang tetap tidak bisa diselesaikan bagian ini.
6. **Rangkuman dan masalah terbuka.** Poin kunci, lalu pertanyaan yang dijawab modul berikutnya.

## Kalau tersangkut

Anda akan tersangkut. Sering. Itu cara kerja normal pekerjaan ini, bukan tanda Anda tidak berbakat.

Modul 0 punya satu bagian khusus tentang ini, dan isinya pantas dibaca sebelum Anda membutuhkannya: cara membaca pesan error sampai habis, cara mengecilkan masalah sampai penyebabnya terlihat, cara mencari dengan kata kunci yang tepat (dan kenapa menyertakan nama folder Anda sendiri membuat pencarian gagal), serta cara menyusun pertanyaan sebelum bertanya ke siapa pun.

Satu catatan soal alat bantu AI, karena pasti Anda pakai dan memang masuk akal dipakai. Alat itu sangat baik untuk menjelaskan pesan error dan konsep yang belum jelas, dan di situlah nilainya paling besar bagi pemula. Yang perlu dijaga: jangan memintanya menuliskan jawaban latihan. Setiap latihan di seri ini dirancang supaya Anda merasakan sebuah masalah, dan masalah yang tidak pernah Anda rasakan tidak akan menempel.

## Yang dicari industri sekarang

Isi seri ini dipilih dari apa yang benar-benar diminta pada pekerjaan frontend hari ini, bukan dari apa yang sedang ramai di media sosial. Empat pergeseran yang paling terasa:

**TypeScript sudah jadi bawaan, bukan nilai tambah.** Hampir semua tim yang merekrut hari ini memakainya. Modul 8 memperlakukannya sebagai bagian dari bahasa kerja, bukan materi opsional di akhir.

**Rendering pindah sebagian ke server.** React Server Component dan Next.js App Router mengubah pertanyaan "bagaimana mengambil data" menjadi "di mana sebaiknya kode ini berjalan". Modul 14 membahas keputusan itu, termasuk kapan jawabannya tetap di klien.

**Kualitas yang bisa diukur.** Core Web Vitals, aksesibilitas, dan cakupan test bukan lagi topik penutup wawancara, tapi angka yang muncul di pipeline. Modul 16 sampai 18 memperlakukannya sebagai pekerjaan sehari-hari.

**Menulis kode jadi murah, menilai kode jadi mahal.** Dengan bantuan AI, menghasilkan komponen butuh sepuluh detik. Yang membedakan engineer sekarang adalah bisa menjelaskan kenapa sebuah pendekatan dipilih, menemukan bug pada kode yang kelihatan benar, dan tahu apa yang akan rusak enam bulan lagi. Karena itu setiap latihan di seri ini meminta alasan, bukan hanya hasil.

## Satu hal yang perlu diluruskan di awal

Tujuan seri ini bukan membuat Anda jadi penganut satu framework. Tujuannya adalah membuat Anda mampu merancang, membangun, menguji, mengamankan, dan merilis antarmuka yang dipakai orang sungguhan, **sekaligus tahu kapan sebuah teknologi tidak perlu dipakai**.

Bagian terakhir itu sering hilang dari tutorial lain. Tidak semua halaman butuh React: halaman profil perusahaan dengan lima bagian statis lebih baik dikerjakan dengan HTML, CSS, dan sedikit JavaScript, lalu selesai. Tidak semua state butuh library: kebanyakan state hanya perlu tinggal di satu komponen. Memilih yang lebih kecil, kalau cukup, adalah keputusan senior.

## Berapa lama

Jumlahkan perkiraan di tabel modul dan durasi kelima proyek, dan hasilnya sekitar seratus tiga puluh hari kerja. Dengan ritme yang bisa dipertahankan tanpa membakar diri sendiri, itu berarti:

| Latar belakang Anda | Perkiraan jujur |
| --- | --- |
| Benar-benar dari nol, beberapa jam sehari | 5 sampai 6 bulan |
| Sudah pernah koding di bahasa lain | 3 sampai 4 bulan |
| Sudah bisa JavaScript, belum React | 2 sampai 3 bulan |
| Sudah bisa React, menambal yang bolong | 1 bulan, mulai dari Modul 7 |

Angka di baris pertama lebih panjang daripada yang dijanjikan kebanyakan roadmap, dan itu disengaja. Seri ini meminta Anda mengerjakan lima proyek dengan sungguh-sungguh, bukan menonton dua puluh video. Versi enam bulan yang proyeknya benar-benar jadi lebih berharga daripada versi tiga bulan yang seluruh isinya hanya dibaca.

Dua saran yang menentukan hasil:

**Kerjakan proyeknya dengan tema Anda sendiri.** Ganti katalog film jadi katalog resep, ganti dasbor admin jadi pencatat pengeluaran. Materi yang Anda ubah akan jauh lebih lekat daripada materi yang Anda ikuti baris demi baris, karena begitu temanya berbeda, Anda tidak bisa lagi menyalin tanpa memahami.

**Jangan melewati modul yang terasa membosankan.** Tooling, testing, dan jalur rilis adalah tiga modul yang paling sering dilewati, dan tiga hal yang paling sering membedakan engineer yang dipercaya mengerjakan hal penting dari yang tidak.

Mulai dari Modul 0: menyiapkan alat kerja, dan satu halaman yang benar-benar terbuka di browser Anda sendiri.
