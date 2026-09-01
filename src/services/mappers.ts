import type { TingkatPenguasaan, ModelPembelajaran } from './types'

export type StatusKey = 'belum' | 'berkembang' | 'tuntas' | 'kosong'
export type ModelKey = 'discovery' | 'pbl' | 'project'

/** Konversi enum TingkatPenguasaan dari backend -> key pendek dipakai Badge/heatmap UI. */
export function toStatusKey(t: TingkatPenguasaan | null | undefined): StatusKey {
  switch (t) {
    case 'Sudah Tuntas': return 'tuntas'
    case 'Sedang Berkembang': return 'berkembang'
    case 'Belum Dikuasai': return 'belum'
    default: return 'kosong'
  }
}

/** Konversi enum ModelPembelajaran dari backend -> key pendek dipakai RekomendasiModel UI. */
export function toModelKey(m: ModelPembelajaran | null | undefined): ModelKey | null {
  switch (m) {
    case 'Discovery Learning': return 'discovery'
    case 'Problem Based Learning': return 'pbl'
    case 'Project Based Learning': return 'project'
    default: return null
  }
}

/** Pesan ramah siswa untuk pola kesalahan dominan (dipakai di halaman Hasil Diagnosis). */
export function pesanPolaKesalahan(pola: string, status: StatusKey): string {
  if (status === 'tuntas') return 'Kamu sudah sangat memahami topik ini. Pertahankan!'
  const saran: Record<string, string> = {
    Konseptual: 'Kamu masih perlu perkuat pemahaman konsep dasarnya.',
    Prosedural: 'Fokus pada latihan langkah-langkah pengerjaan soal, urutannya masih perlu diperkuat.',
    Matematis: 'Latih lagi perhitungan matematisnya, konsepnya sudah cukup baik.',
    Campuran: 'Ada beberapa area yang perlu diperkuat, coba pelajari ulang materinya secara menyeluruh.',
    Minimal: 'Sudah cukup baik, tinggal sedikit lagi menuju penguasaan penuh.',
  }
  return saran[pola] || 'Terus berlatih untuk memperkuat pemahamanmu di topik ini.'
}
