# Penjelasan Struktur File HTML dan Javascript

# Penjelasan Struktur Proyek (Dari Frontend ke Backend)

Kalau kita mau menderetkan semuanya dari ujung ke ujung, daftarnya bisa dibagi mulai dari sisi antarmuka, penggerak logika, sampai ke server di belakang layar.

Di lapisan paling depan atau kerangka tampilan, terdapat `index.html` yang berfungsi murni sebagai halaman promosi awal tanpa beban berat. Menemani itu ada `auth.html` sebagai wadah form masuk akun, `dashboard.html` untuk memantau pergerakan grafik sensor IoT secara langsung, `config.html` tempat menyimpan kunci rahasia API, serta `admin.html` khusus untuk panel manajemen pengguna.

Masuk ke lapisan penggeraknya di sisi klien, `utils.js` hadir sebagai alat serbaguna untuk mengatur komunikasi jaringan ke server. Navigasi global dan urusan sesi dijaga penuh oleh `app.js` supaya lebih aman dari blokir browser. Logika spesifik form ditangani `auth.js` saat masuk akun dan `config.js` saat menyimpan pengaturan. Terakhir ada `dashboard.js` yang paling sibuk karena harus menarik data sensor secara berkala langsung dari ThingSpeak sekaligus memotong saldo token pengguna.

Bergeser jauh ke belakang di sisi server, pondasi utamanya berdiri di file `server.js` yang mengatur jalan masuk semua permintaan. Sebelum permintaan diproses, sistem keamanannya dijaga oleh middleware `auth.js` untuk memastikan siapa yang login, dibantu `rateLimiter.js` untuk menendang akses yang terlalu brutal atau spam. Setelah lolos, permintaan baru diserahkan ke rute spesifik yaitu `routes/auth.js` untuk urusan validasi akun, `routes/config.js` untuk mengamankan data rahasia IoT, dan `routes/admin.js` yang khusus melayani hapus atau ubah data pengguna dari panel admin.
