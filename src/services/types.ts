// Tipe data ini SENGAJA dibuat identik dengan backend/schemas.py
// Kalau backend berubah, ini yang perlu di-update duluan.

export type TingkatPenguasaan = 'Belum Dikuasai' | 'Sedang Berkembang' | 'Sudah Tuntas'
export type PolaKesalahan = 'Konseptual' | 'Prosedural' | 'Matematis' | 'Campuran' | 'Minimal'
export type ModelPembelajaran = 'Discovery Learning' | 'Problem Based Learning' | 'Project Based Learning'

export interface KelasOut {
  id: number
  nama: string
}

export interface SiswaOut {
  id: number
  nama: string
  nis: string
  kelas_id: number
}

export interface SubTopikOut {
  id: number
  nama: string
  bab: string | null
}

export interface AsesmenInput {
  siswa_id: number
  subtopik_id: number
  jumlah_soal: number
  jumlah_benar: number
  kesalahan_konseptual?: number
  kesalahan_prosedural?: number
  kesalahan_matematis?: number
}

export interface PetaKompetensiOut {
  siswa_id: number
  siswa_nama: string
  subtopik_id: number
  subtopik_nama: string
  nilai: number
  tingkat_penguasaan: TingkatPenguasaan
  pola_kesalahan_dominan: PolaKesalahan
  diperbarui_pada: string
}

export interface HeatmapCellOut {
  siswa_id: number
  siswa_nama: string
  subtopik_id: number
  subtopik_nama: string
  tingkat_penguasaan: TingkatPenguasaan | null
  nilai: number | null
}

export interface HeatmapKelasOut {
  kelas_id: number
  kelas_nama: string
  subtopik: SubTopikOut[]
  siswa: SiswaOut[]
  cells: HeatmapCellOut[]
}

export interface RiwayatNilaiPoin {
  tanggal: string
  rata_rata_nilai: number
  jumlah_asesmen: number
}

export interface UploadPdfResultOut {
  jumlah_berhasil: number
  jumlah_gagal: number
  detail_berhasil: string[]
  detail_gagal: string[]
}

export interface SoalKuisOut {
  index: number
  pertanyaan: string
  pilihan: string[]
}

export interface SesiKuisOut {
  sesi_kuis_id: number
  subtopik_nama: string
  soal: SoalKuisOut[]
}

export interface DetailJawabanOut {
  pertanyaan: string
  jawaban_siswa: string
  jawaban_benar: string
  benar: boolean
}

export interface HasilKuisOut {
  jumlah_soal: number
  jumlah_benar: number
  nilai: number
  tingkat_penguasaan: TingkatPenguasaan
  pola_kesalahan_dominan: PolaKesalahan
  detail_jawaban: DetailJawabanOut[]
}

export interface LangkahLearningPathOut {
  subtopik_id: number | null
  subtopik_nama: string
  alasan: string
  prioritas: number
  status: string | null
}

export interface LearningPathOut {
  siswa_id: number
  langkah: LangkahLearningPathOut[]
  dibuat_pada: string
}

export interface SiswaProfilOut {
  id: number
  nama: string
  nis: string
  kelas_id: number
  kelas_nama: string
}

export interface RingkasanBelajarOut {
  total_kuis_selesai: number
  rata_rata_skor_kuis: number | null
  subtopik_favorit: string | null
  kuis_minggu_ini: number
}

export interface MateriOut {
  id: number
  nama_file_asli: string
  subtopik_id: number
  subtopik_nama: string
  ukuran_bytes: number
  diupload_pada: string
}

export interface UploadSiswaResultOut {
  jumlah_berhasil: number
  jumlah_gagal: number
  detail_berhasil: string[]
  detail_gagal: string[]
  password_default: string
}

export interface TokenOut {
  access_token: string
  token_type: string
  role: 'guru' | 'siswa'
  user_id: number
  nama: string
}

export interface RekomendasiOut {
  kelas_id: number
  subtopik_id: number
  subtopik_nama: string
  jumlah_siswa_dihitung: number
  persen_belum_dikuasai: number
  persen_sedang_berkembang: number
  persen_sudah_tuntas: number
  kondisi_dominan: string | null
  pola_kesalahan_dominan_kelas: PolaKesalahan | null
  model_rekomendasi: ModelPembelajaran | null
  catatan: string | null
  dihitung_pada: string
}
