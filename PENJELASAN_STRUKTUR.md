# Penjelasan Struktur Proyek myIOT

Penjelasan file dari depan (tampilan) hingga ke belakang (server).

**LAPISAN TAMPILAN (HTML)**
`index.html` : Halaman pendaratan awal yang ringan.
`auth.html` : Antarmuka khusus untuk login dan registrasi.
`dashboard.html` : Menampilkan grafik pergerakan sensor dan sisa token.
`config.html` : Wadah pengaturan ambang batas sensor dan API key.
`admin.html` : Panel eksklusif untuk admin memanajemen data pengguna lain.

**LAPISAN PENGGERAK KLIEN (JAVASCRIPT FRONTEND)**
`utils.js` : Alat bantu serbaguna untuk menarik data (fetch) dari backend.
`app.js` : Mengendalikan navigasi klik dan menjaga status sesi akun tetap hidup.
`auth.js` : Menangani proses pengiriman formulir saat user login.
`config.js` : Mengirim pembaruan pengaturan peringatan sensor.
`dashboard.js` : Otak utama yang sangat sibuk menarik data ThingSpeak tiap beberapa detik dan mengurangi saldo token.

**LAPISAN SERVER (BACKEND NODE.JS)**
`server.js` : Gerbang pusat yang menghidupkan server dan mengatur rute awal.
`middleware/auth.js` : Satpam pemeriksa yang memastikan user memang sudah login sebelum lanjut.
`middleware/rateLimiter.js` : Penjaga dari serangan spam klik yang terlalu brutal.
`routes/auth.js` : Menangani logika cek kata sandi saat login.
`routes/config.js` : Tempat menyimpan pembaruan API key dan konfigurasi sensor ke database.
`routes/admin.js` : Jalur akses khusus admin untuk mengambil seluruh data user.

<br>

# Penjelasan Alur Sistem (Proses Kerja)

**ALUR PENDAFTARAN (REGISTRASI)**
Pengguna baru membuka halaman pendaftaran lalu memasukkan nama, email, dan kata sandi. Skrip `auth.js` menangkap data tersebut dan mengirimkannya ke `routes/auth.js` di ujung server. Di sana, kata sandi diacak sedemikian rupa demi keamanan sebelum akhirnya ditanamkan ke dalam database. Begitu proses registrasi dinyatakan sukses, pengguna langsung ditarik ke halaman konfigurasi untuk memasukkan Channel ID ThingSpeak mereka. Namun jika pengguna memilih untuk menekan tombol *SKIP*, sistem akan melempar mereka langsung ke halaman Dashboard dengan layar sensor yang masih kosong.

**ALUR LOGIN (MASUK AKUN)**
Pengguna yang sudah mendaftar cukup memasukkan email dan kata sandi di halaman login. Permintaan ini meluncur kencang ke server untuk dicocokkan dengan brankas database. Jika semuanya cocok, server memberikan tiket sesi khusus sebagai tanda pengenal resmi. Berbekal tiket ajaib ini, skrip `app.js` langsung membukakan pintu dan memindahkan pengguna ke halaman Dashboard.

**ALUR PEMBARUAN KONFIGURASI SENSOR**
Saat sedang berada di halaman konfigurasi, pengguna sangat dibebaskan untuk mengubah batas peringatan sensor suhu, kelembapan, udara, hingga jarak. Begitu tombol simpan ditekan, skrip `config.js` langsung membungkus angka-angka baru tersebut dan melemparnya ke jalur `routes/config.js`. Server akan mengunci perubahan ini di dalam profil pengguna, lalu mengarahkan mereka kembali ke Dashboard agar perubahannya langsung terasa.

**ALUR PENARIKAN DATA SENSOR & PEMOTONGAN TOKEN**
Ini adalah jantung utama dari aplikasi kita. Begitu halaman Dashboard selesai dimuat, skrip `dashboard.js` akan otomatis terbangun dan mulai mengintip data terbaru dari server ThingSpeak setiap 20 detik tanpa henti. Setiap kali data segar masuk, sistem akan menimbang apakah suhu ruangannya terlalu panas atau udaranya terlalu kotor. Jika sistem mendeteksi adanya bahaya, saldo token pengguna akan dipotong secara perlahan untuk mensimulasikan biaya listrik dari menyalakan AC atau alat pembersih udara. Saldo akhir token ini kemudian dilaporkan kembali ke database server setiap lima kali putaran agar angkanya tidak menguap begitu saja saat peramban ditutup.
