# 🚀 Panduan Pemasangan & Migrasi Otomatis SIPOPT ke CasaOS

Aplikasi **SIPOPT (Sistem Informasi Pengendalian OPT Tanggamus)** telah dirancang dengan arsitektur **Zero-Configuration**. Anda dapat langsung memasang dan menjalankannya di **CasaOS** Anda tanpa perlu konfigurasi manual, tanpa membuat tabel database sendiri, dan tanpa menyetel port jaringan.

---

## 🌟 4 Keunggulan Otomatisasi SIPOPT di CasaOS:
1. **Port Statis 7580 (Anti-Reset Alamat IP & Mati Lampu):**  
   Alamat web dikunci permanen di port `7580` (`http://ip-casaos:7580`). Ketika router reboot atau membagikan IP dinamis baru setelah listrik padam, aplikasi tetap stabil dan dapat dibuka di alamat yang sama.
2. **Auto-DDL & Auto-Migrasi PostgreSQL 16:**  
   Container PostgreSQL 16 langsung terhubung via jaringan internal Docker. Sistem otomatis membuat 6 tabel relasional (`app_users`, `opt_reports`, `master_subdistricts`, `master_commodities`, `whatsapp_contacts`, `app_settings`) dan langsung menyalin seluruh data laporan & pengguna lama dari `data/db.json` ke PostgreSQL tanpa perintah SQL manual.
3. **Sesi WhatsApp Anti-Hilang (Persistent Storage):**  
   Seluruh token bot WhatsApp dan konfigurasi disimpan di volume persisten `/DATA/AppData/sipopt/data`, sehingga Bot WhatsApp tetap terhubung selamanya meskipun container di-restart atau di-update.
4. **Auto-Restart (unless-stopped):**  
   Saat server fisik CasaOS hidup kembali setelah mati lampu, aplikasi dan database otomatis menyala kembali dalam 10 detik.

---

## 📋 Metode 1: Pasang 1-Klik via Dashboard Web CasaOS (Paling Mudah / Tanpa Terminal)

1. **Buka Dashboard CasaOS** di browser Anda (contoh: `http://casaos.local` atau `http://192.168.1.xxx`).
2. Klik tombol **`+`** di pojok kanan atas, lalu pilih **"Install a customized application"**.
3. Di pojok kanan atas jendela popup, klik tombol **"Import"** (ikon dokumen dengan tanda panah).
4. **Salin seluruh isi file `docker-compose.yml`** (atau salin langsung dari menu **"Migrasi CasaOS"** di aplikasi web), lalu paste ke dalam kotak teks tersebut dan klik **"Submit"**.
5. CasaOS akan otomatis mengenali:
   - Nama Aplikasi: **SIGAP-OPT Tanggamus**
   - Icon dan deskripsi dinas pertanian
   - Port Web: **http://localhost:7580**
   - Container PostgreSQL 16 terintegrasi
   - Volume penyimpanan data persisten
6. Klik tombol **"Install"**. Tunggu 1–2 menit hingga container selesai dibangun dan dinyalakan.
7. Ikon **SIGAP-OPT Tanggamus** akan muncul di dashboard CasaOS dan langsung dapat dibuka!

---

## 🖥️ Metode 2: Pasang 1 Baris Perintah via Terminal / SSH (Paling Cepat)

Jika Anda memiliki akses terminal atau SSH ke server CasaOS:

```bash
curl -fsSL https://raw.githubusercontent.com/bidangpme-ux/opt/main/install-casaos.sh | bash
```

*Skrip ini secara otomatis membuat folder `/DATA/AppData/sipopt`, mengunduh berkas, menyiapkan PostgreSQL 16, menjalankan `docker compose up -d`, dan menampilkan alamat URL dashboard Anda.*

---

## 🔑 Kredensial Login Default

Setelah aplikasi aktif di `http://ip-casaos-anda:7580`:
- **Username:** `admin`
- **Password:** `admin123`

*(Kata sandi dapat diubah kapan saja di menu **Manajemen Pengguna**).*

---

## 🗄️ Rincian Konfigurasi Database PostgreSQL Bawaan

- **Host Internal:** `sipopt-postgres`
- **Port Internal:** `5432`
- **Nama Database:** `sipopt_db`
- **User / Password:** `sipopt` / `sipopt_secret_pass_2026`
- **Port Host (Opsional untuk pgAdmin/DBeaver):** `5432`
- **Volume Data:** `postgres_data` (tersimpan permanen di penyimpanan CasaOS)
