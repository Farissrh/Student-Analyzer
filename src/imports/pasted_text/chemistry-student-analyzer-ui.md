Buatkan desain UI lengkap untuk aplikasi desktop edukasi bernama "Chemistry
Student Analyzer" — aplikasi yang membantu guru kimia SMA memetakan kompetensi
siswa per sub-topik dan mendapat rekomendasi model pembelajaran berbasis AI,
sementara siswa mendapat kuis adaptif dan jalur belajar personal. Target device:
desktop app, desain untuk viewport 1440x900.

=====================================================
GAYA VISUAL & DESIGN SYSTEM (berlaku di SEMUA halaman)
=====================================================
Gabungan clean minimalist SaaS modern dengan scientific/lab theme yang subtle.
Layout bersih, banyak white space, card-based, shadow lembut, sudut membulat
(8-12px). Sentuhan tema sains: pola heksagonal tipis (motif struktur molekul)
sebagai aksen dekoratif di background/header — subtle, jangan childish atau
ramai, tetap profesional.

Palet warna:
- Primary: deep blue #1E3A8A (header, tombol utama, navigasi aktif)
- Secondary/accent: emerald green #10B981 (elemen positif, growth, sains)
- Status kompetensi (WAJIB konsisten di semua badge/heatmap/chart di semua halaman):
  Belum Dikuasai = merah #EF4444, Sedang Berkembang = amber #F59E0B,
  Sudah Tuntas = hijau #10B981
- Netral light mode: putih #FFFFFF & abu terang #F8FAFC, teks slate-900
- Netral dark mode: slate #0F172A & #1E293B, teks slate-100
- Sediakan Light Mode & Dark Mode dengan toggle switch di topbar tiap halaman

Tipografi: sans-serif modern geometris (Inter / Plus Jakarta Sans).
H1 32px bold, H2 24px semibold, H3 18px semibold, Body 14-16px regular, Caption 12px.

Komponen reusable yang dipakai berulang di semua halaman: button (primary/
secondary/outline/danger), input field, dropdown, search bar, badge status
3-tingkat, card container, modal/dialog, sidebar nav item (normal & active),
notification bell dengan badge counter merah, avatar inisial nama, table row
dengan hover state, tab switcher, line/donut chart style.

=====================================================
NAVIGATION SHELL
=====================================================
Dua varian sidebar kiri fixed (~240px), logo di atas, dipakai di semua halaman
sesuai role:

Shell GURU — menu: Dashboard, Panel Analisis (upload nilai PDF & materi),
Pantau Progres, Peta Kompetensi Kelas/Heatmap, Rekomendasi Model Pembelajaran,
Profil di bawah. Topbar: search bar, notification bell, avatar+nama guru,
toggle dark/light.

Shell SISWA — menu: Dashboard, Kuis Adaptif, Learning Path, Hasil Diagnosis
Saya, Profil. Topbar sama tapi lebih sederhana, tanpa bell (atau versi kecil).

=====================================================
HALAMAN 1 — Login (Unified Guru & Siswa)
=====================================================
Split screen. Kiri (60%): branding — nama app besar, tagline "Analisis
Kompetensi Kimia Berbasis AI", background deep blue gradient dengan aksen
heksagonal molekul transparan. Kanan (40%): card form putih berisi tab switch
"Guru" vs "Siswa" (Guru = Username+Password, Siswa = NIS+Password), checkbox
"Ingat saya", tombol "Masuk" full width, link "Lupa password?". Toggle
dark/light di pojok kanan atas. Tampilkan 2 state tab.

=====================================================
HALAMAN 2 — Dashboard Guru
=====================================================
Header "Selamat datang, [Nama Guru]" + tanggal. Row 4 card statistik: Total
Siswa, Rata-rata Kompetensi Kelas, Sub-topik Perlu Perhatian, Siswa Perlu
Perhatian. Tabel "Daftar Siswa": avatar+nama, NIS, kelas, rata-rata nilai,
badge status, tombol lihat detail — dengan search bar & filter kelas/status
di atasnya, baris bisa diklik. Panel kecil "Notifikasi Terbaru" (3-4 item
siswa bermasalah). Tombol "Export Laporan PDF" di pojok kanan atas. Pakai
data dummy nama siswa Indonesia.

=====================================================
HALAMAN 3 — Modal Detail Siswa
=====================================================
Overlay modal (lebar ~600px, backdrop gelap transparan) muncul saat klik baris
siswa di Dashboard. Header: avatar besar, nama, NIS, kelas, tombol close.
Tab: "Ringkasan" (rata-rata nilai + donut chart 3 warna status), "Peta
Kompetensi" (list sub-topik dengan badge status + pola kesalahan dominan per
baris), "Riwayat Nilai" (line chart progres nilai dari waktu ke waktu, garis
emerald).

=====================================================
HALAMAN 4 — Panel Analisis (Upload Nilai & Materi)
=====================================================
2 kolom sejajar. Kiri: card "Upload Nilai Siswa (PDF)" — dropzone drag-drop,
dropdown pilih Kelas & Sub-topik, list file terupload dengan status "Selesai
diproses" (icon centang hijau), tombol "Proses dengan AI". Kanan: card
"Upload Materi Pembelajaran" — dropzone serupa, dropdown Sub-topik, list
materi existing. Di bawah: progress bar status "Mengekstrak data dari PDF...".

=====================================================
HALAMAN 5 — Pantau Progres
=====================================================
Filter atas: dropdown Kelas, rentang waktu, Sub-topik (opsional). Card besar
line chart utama: progres rata-rata nilai kelas dari waktu ke waktu, beberapa
garis warna mewakili beberapa sub-topik + legend. Grid 2x2 mini line chart per
sub-topik di bawahnya. Highlight box kecil warna warning: "Sub-topik dengan
tren menurun".

=====================================================
HALAMAN 6 — Heatmap Kompetensi Kelas (fitur baru)
=====================================================
Filter dropdown Kelas di atas. Heatmap utama: matriks tabel, baris = nama
siswa (avatar kecil), kolom = sub-topik, sel berwarna sesuai status (merah/
amber/hijau/abu-abu untuk kosong), hover menampilkan tooltip nilai persis,
header kolom bisa diklik untuk sort. Legend warna di atas heatmap. Di bawah:
stacked bar chart horizontal persentase distribusi kompetensi kelas per
sub-topik. Sidebar kanan kecil: ringkasan "X% siswa Belum Dikuasai di
Sub-topik Y" untuk yang paling bermasalah. Data dummy: minimal 10 siswa x
6 sub-topik.

=====================================================
HALAMAN 7 — Panel Rekomendasi Model Pembelajaran (fitur baru, khusus guru)
=====================================================
List card vertikal, satu card per sub-topik, berisi: judul sub-topik, badge
besar model rekomendasi (Discovery Learning/Problem Based Learning/Project
Based Learning, tiap model beda warna & icon: lampu/puzzle/roket), mini
stacked bar distribusi kelas yang mendasari rekomendasi, teks singkat alasan
(contoh: "80% siswa Belum Dikuasai, pola kesalahan Konseptual dominan"),
tombol "Lihat Detail Kelas". Sertakan 1 card edge case "Kelas Heterogen" tanpa
badge model, icon info abu-abu, teks "Belum ada mayoritas jelas, disarankan
tinjau manual". Minimal 5 card dengan variasi model berbeda.

=====================================================
HALAMAN 8 — Dashboard Siswa
=====================================================
Header ramah "Halo, [Nama Siswa]! Semangat belajar hari ini". Card besar donut
chart status kompetensi keseluruhan (3 warna standar). Row card kecil: Sub-
topik Berikutnya Direkomendasikan, Streak Belajar, Kuis Selesai Minggu Ini.
Section "Progres per Sub-topik" — list horizontal card kecil dengan progress
bar & badge status. Tombol CTA besar "Mulai Kuis Adaptif". Nuansa lebih ringan
dan memotivasi, lebih banyak emerald green.

=====================================================
HALAMAN 9 — Kuis Adaptif
=====================================================
State 1 (mulai): grid card pilihan sub-topik (nama + badge status saat ini),
info "Soal disesuaikan AI dengan levelmu", tombol "Mulai Kuis". State 2
(mengerjakan): progress bar soal ke-berapa (3/10), card soal besar di tengah
dengan 4 pilihan jawaban, tombol "Selanjutnya", indikator kecil sparkle "Soal
disesuaikan AI". State 3 (hasil): skor besar di tengah, breakdown benar/salah,
update status kompetensi baru untuk sub-topik itu.

=====================================================
HALAMAN 10 — Learning Path
=====================================================
Jalur visual roadmap (vertikal atau zig-zag horizontal), node bulat per
sub-topik terhubung garis putus-putus. Node selesai = hijau solid + centang.
Node berjalan = biru dengan ring glow, label "Kamu di sini". Node belum mulai
= abu-abu outline. Klik node untuk expand info singkat + tombol Mulai/
Lanjutkan. Progress bar keseluruhan di atas ("5 dari 10 sub-topik selesai").
Catatan kecil: "Jalur ini disusun AI berdasarkan hasil diagnosis kompetensimu".

=====================================================
HALAMAN 11 — Hasil Diagnosis Individual (fitur baru, khusus siswa)
=====================================================
PENTING: hanya peta kompetensi individual, TANPA rekomendasi model
pembelajaran apapun. Header "Peta Kompetensi Kamu" + tanggal diagnosis
terakhir. Grid card per sub-topik: nama sub-topik, badge status besar, nilai
dalam circular progress ring, teks ramah "area yang perlu diperbaiki" (bahasa
non-teknis, contoh: "Kamu masih perlu perkuat pemahaman konsep dasar" untuk
pola Konseptual). Section bawah "Rekomendasi belajar untukmu" — saran
aktivitas sederhana, TIDAK menyebut nama model pembelajaran, link ke Learning
Path. Gaya suportif, hindari merah alarm — pakai oranye lembut untuk Belum
Dikuasai.

=====================================================
HALAMAN 12 — Profil Siswa
=====================================================
Layout 1 kolom. Card header: avatar besar, nama, NIS, kelas. Section
"Informasi Akun": form edit nama, email, tombol "Ubah Password". Section
"Preferensi": toggle dark/light mode, toggle notifikasi. Section "Ringkasan
Belajar": total kuis diselesaikan, rata-rata skor, sub-topik favorit.

=====================================================
CATATAN AKHIR
=====================================================
Pastikan warna status kompetensi (merah/amber/hijau) IDENTIK di semua halaman
di atas — ini elemen visual paling penting untuk konsistensi aplikasi. Susun
semua 12 halaman + shell navigasi dalam satu file Figma yang terorganisir
per frame/section dengan nama yang jelas.