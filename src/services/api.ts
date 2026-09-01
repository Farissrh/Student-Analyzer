import type {
  KelasOut, SiswaOut, SubTopikOut, AsesmenInput,
  PetaKompetensiOut, HeatmapKelasOut, RekomendasiOut, TokenOut, RiwayatNilaiPoin,
  UploadPdfResultOut, SesiKuisOut, HasilKuisOut, LearningPathOut,
  SiswaProfilOut, RingkasanBelajarOut, MateriOut, UploadSiswaResultOut,
} from './types'

// Ambil dari .env (VITE_API_BASE_URL), fallback ke localhost:8000 buat development.
const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

// Token JWT disimpan di sini (bukan di komponen), supaya semua request lewat
// request() otomatis nempelin header Authorization. Di-set oleh AuthContext.
let currentToken: string | null = null
export function setAuthToken(token: string | null) {
  currentToken = token
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
      },
      ...options,
    })
  } catch (err) {
    throw new ApiError(0, `Tidak bisa menghubungi server di ${BASE_URL}. Pastikan backend jalan (uvicorn main:app).`)
  }

  if (!res.ok) {
    let message = `Request gagal dengan status ${res.status}`
    try {
      const body = await res.json()
      if (body?.detail) message = body.detail
    } catch { /* body bukan JSON, pakai pesan default */ }
    throw new ApiError(res.status, message)
  }
  return res.json()
}

export const api = {
  // ---- Auth ----
  loginGuru: (username: string, password: string) =>
    request<TokenOut>('/auth/login/guru', { method: 'POST', body: JSON.stringify({ username, password }) }),

  loginSiswa: (nis: string, password: string) =>
    request<TokenOut>('/auth/login/siswa', { method: 'POST', body: JSON.stringify({ nis, password }) }),

  // ---- Data master ----
  getKelasList: () => request<KelasOut[]>('/kelas'),
  getSiswaByKelas: (kelasId: number) => request<SiswaOut[]>(`/kelas/${kelasId}/siswa`),
  getSubTopikList: () => request<SubTopikOut[]>('/subtopik'),

  createKelas: (nama: string) =>
    request<KelasOut>('/kelas', { method: 'POST', body: JSON.stringify({ nama }) }),

  createSubTopik: (nama: string, bab?: string) =>
    request<SubTopikOut>('/subtopik', { method: 'POST', body: JSON.stringify({ nama, bab: bab || null }) }),

  createSiswa: (nama: string, nis: string, password: string, kelasId: number) =>
    request<SiswaOut>('/siswa', {
      method: 'POST',
      body: JSON.stringify({ nama, nis, password, kelas_id: kelasId }),
    }),

  // Bulk import siswa dari PDF (tabel Nama, NIS) - beda dari fungsi lain, pakai
  // FormData bukan JSON, jadi nggak lewat helper request().
  uploadSiswaPdf: async (kelasId: number, file: File): Promise<UploadSiswaResultOut> => {
    const formData = new FormData()
    formData.append('kelas_id', String(kelasId))
    formData.append('file', file)

    let res: Response
    try {
      res = await fetch(`${BASE_URL}/siswa/upload-pdf`, {
        method: 'POST',
        headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {},
        body: formData,
      })
    } catch {
      throw new ApiError(0, `Tidak bisa menghubungi server di ${BASE_URL}.`)
    }
    if (!res.ok) {
      let message = `Upload gagal dengan status ${res.status}`
      try {
        const body = await res.json()
        if (body?.detail) message = body.detail
      } catch { /* bukan JSON */ }
      throw new ApiError(res.status, message)
    }
    return res.json()
  },

  // ---- Competency Mapping Engine ----
  getPetaKompetensiSiswa: (siswaId: number) =>
    request<PetaKompetensiOut[]>(`/siswa/${siswaId}/peta-kompetensi`),

  postAsesmen: (data: AsesmenInput) =>
    request<PetaKompetensiOut>('/asesmen', { method: 'POST', body: JSON.stringify(data) }),

  // ---- Heatmap kelas ----
  getHeatmap: (kelasId: number) =>
    request<HeatmapKelasOut>(`/kelas/${kelasId}/heatmap`),

  // ---- Learning Model Recommendation Engine ----
  getRekomendasiSemua: (kelasId: number) =>
    request<RekomendasiOut[]>(`/kelas/${kelasId}/rekomendasi`),

  getRekomendasiSubtopik: (kelasId: number, subtopikId: number) =>
    request<RekomendasiOut>(`/kelas/${kelasId}/subtopik/${subtopikId}/rekomendasi`),

  // ---- Histori nilai ----
  getRiwayatSiswa: (siswaId: number) =>
    request<RiwayatNilaiPoin[]>(`/siswa/${siswaId}/riwayat`),

  getRiwayatKelasSubtopik: (kelasId: number, subtopikId: number) =>
    request<RiwayatNilaiPoin[]>(`/kelas/${kelasId}/subtopik/${subtopikId}/riwayat`),

  // ---- Upload PDF nilai ----
  // Beda dari fungsi lain: pakai FormData (multipart), bukan JSON, jadi TIDAK lewat
  // helper request() - Content-Type biar di-set otomatis oleh browser (dengan boundary-nya).
  uploadAsesmenPdf: async (kelasId: number, subtopikId: number, file: File): Promise<UploadPdfResultOut> => {
    const formData = new FormData()
    formData.append('kelas_id', String(kelasId))
    formData.append('subtopik_id', String(subtopikId))
    formData.append('file', file)

    let res: Response
    try {
      res = await fetch(`${BASE_URL}/asesmen/upload-pdf`, {
        method: 'POST',
        headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {},
        body: formData,
      })
    } catch {
      throw new ApiError(0, `Tidak bisa menghubungi server di ${BASE_URL}. Pastikan backend jalan.`)
    }

    if (!res.ok) {
      let message = `Upload gagal dengan status ${res.status}`
      try {
        const body = await res.json()
        if (body?.detail) message = body.detail
      } catch { /* bukan JSON */ }
      throw new ApiError(res.status, message)
    }
    return res.json()
  },

  // ---- Kuis Adaptif (Groq AI) ----
  generateKuis: (siswaId: number, subtopikId: number, jumlahSoal: number = 5) =>
    request<SesiKuisOut>('/kuis/generate', {
      method: 'POST',
      body: JSON.stringify({ siswa_id: siswaId, subtopik_id: subtopikId, jumlah_soal: jumlahSoal }),
    }),

  submitKuis: (sesiKuisId: number, jawaban: number[]) =>
    request<HasilKuisOut>('/kuis/submit', {
      method: 'POST',
      body: JSON.stringify({ sesi_kuis_id: sesiKuisId, jawaban }),
    }),

  // ---- Learning Path (Groq AI) ----
  getLearningPath: (siswaId: number, regenerate: boolean = false) =>
    request<LearningPathOut>(`/siswa/${siswaId}/learning-path${regenerate ? '?regenerate=true' : ''}`),

  // ---- Profil Siswa ----
  getProfilSiswa: (siswaId: number) =>
    request<SiswaProfilOut>(`/siswa/${siswaId}`),

  getRingkasanBelajar: (siswaId: number) =>
    request<RingkasanBelajarOut>(`/siswa/${siswaId}/ringkasan-belajar`),

  // ---- Export Laporan PDF ----
  // Sama seperti upload PDF: bukan JSON, jadi nggak lewat helper request().
  // Return Blob biar bisa langsung dipicu jadi file download di browser.
  exportLaporanKelas: async (kelasId: number): Promise<Blob> => {
    const res = await fetch(`${BASE_URL}/kelas/${kelasId}/export-laporan`, {
      headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {},
    })
    if (!res.ok) {
      let message = `Export gagal dengan status ${res.status}`
      try {
        const body = await res.json()
        if (body?.detail) message = body.detail
      } catch { /* bukan JSON */ }
      throw new ApiError(res.status, message)
    }
    return res.blob()
  },

  // ---- Materi Pembelajaran ----
  getMateriList: (subtopikId?: number) =>
    request<MateriOut[]>(`/materi${subtopikId ? `?subtopik_id=${subtopikId}` : ''}`),

  uploadMateri: async (subtopikId: number, file: File): Promise<MateriOut> => {
    const formData = new FormData()
    formData.append('subtopik_id', String(subtopikId))
    formData.append('file', file)

    let res: Response
    try {
      res = await fetch(`${BASE_URL}/materi`, {
        method: 'POST',
        headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {},
        body: formData,
      })
    } catch {
      throw new ApiError(0, `Tidak bisa menghubungi server di ${BASE_URL}.`)
    }
    if (!res.ok) {
      let message = `Upload gagal dengan status ${res.status}`
      try {
        const body = await res.json()
        if (body?.detail) message = body.detail
      } catch { /* bukan JSON */ }
      throw new ApiError(res.status, message)
    }
    return res.json()
  },

  downloadMateri: async (materiId: number): Promise<{ blob: Blob; filename: string }> => {
    const res = await fetch(`${BASE_URL}/materi/${materiId}/download`, {
      headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {},
    })
    if (!res.ok) {
      let message = `Download gagal dengan status ${res.status}`
      try {
        const body = await res.json()
        if (body?.detail) message = body.detail
      } catch { /* bukan JSON */ }
      throw new ApiError(res.status, message)
    }
    const disposition = res.headers.get('Content-Disposition') || ''
    // FastAPI/Starlette pakai format "filename=..." biasa ATAU "filename*=utf-8''..."
    // (RFC 5987, dipakai otomatis kalau nama file ada spasi/karakter non-ASCII) - coba dua-duanya.
    const matchExtended = disposition.match(/filename\*=UTF-8''([^;]+)/i)
    const matchSimple = disposition.match(/filename="?([^";]+)"?/i)
    const filename = matchExtended ? decodeURIComponent(matchExtended[1]) : (matchSimple ? matchSimple[1] : `materi-${materiId}`)
    return { blob: await res.blob(), filename }
  },

  hapusMateri: (materiId: number) =>
    request<{ status: string; message: string }>(`/materi/${materiId}`, { method: 'DELETE' }),
}

export { ApiError }
