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
