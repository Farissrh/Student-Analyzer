import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useAppData } from '../../context/AppDataContext'
import { api, ApiError } from '../../services/api'
import { toStatusKey } from '../../services/mappers'
import type { SubTopikOut, PetaKompetensiOut, SesiKuisOut, HasilKuisOut } from '../../services/types'

export default function KuisAdaptif() {
  const { dark } = useTheme()
  const { currentSiswaId } = useAppData()

  const [state, setState] = useState<'pilih' | 'generating' | 'soal' | 'hasil'>('pilih')
  const [subtopikList, setSubtopikList] = useState<SubTopikOut[]>([])
  const [peta, setPeta] = useState<PetaKompetensiOut[]>([])
  const [selectedSubtopik, setSelectedSubtopik] = useState<SubTopikOut | null>(null)
  const [sesiKuis, setSesiKuis] = useState<SesiKuisOut | null>(null)
  const [soalIdx, setSoalIdx] = useState(0)
  const [pilihan, setPilihan] = useState<number | null>(null)
  const [jawaban, setJawaban] = useState<number[]>([])
  const [hasil, setHasil] = useState<HasilKuisOut | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const surf = dark ? '#1E293B' : '#FFFFFF'
  const border = dark ? '#334155' : '#E2E8F0'
  const text = dark ? '#F1F5F9' : '#0F172A'
  const muted = dark ? '#94A3B8' : '#64748B'
  const bg = dark ? '#0F172A' : '#F8FAFC'

  useEffect(() => {
    if (currentSiswaId === null) return
    Promise.all([api.getSubTopikList(), api.getPetaKompetensiSiswa(currentSiswaId)])
      .then(([subtopikData, petaData]) => {
        setSubtopikList(subtopikData)
        setPeta(petaData)
      })
      .catch(err => setError(err instanceof ApiError ? err.message : 'Gagal memuat data'))
      .finally(() => setLoading(false))
  }, [currentSiswaId])

  const statusUntuk = (subtopikNama: string) => {
    const p = peta.find(x => x.subtopik_nama === subtopikNama)
    return p ? toStatusKey(p.tingkat_penguasaan) : 'kosong'
  }

  const handleMulaiKuis = async () => {
    if (!selectedSubtopik || currentSiswaId === null) return
    setState('generating')
    setError(null)
    try {
      const sesi = await api.generateKuis(currentSiswaId, selectedSubtopik.id, 5)
      setSesiKuis(sesi)
      setJawaban([])
      setSoalIdx(0)
      setPilihan(null)
      setState('soal')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal generate soal dari AI')
      setState('pilih')
    }
  }

  const handleNext = async () => {
    if (!sesiKuis || pilihan === null) return
    const newJawaban = [...jawaban, pilihan]
    setJawaban(newJawaban)

    if (soalIdx < sesiKuis.soal.length - 1) {
      setSoalIdx(soalIdx + 1)
      setPilihan(null)
      return
    }

    // Soal terakhir - submit semua jawaban ke server buat digrading
    try {
      const hasilKuis = await api.submitKuis(sesiKuis.sesi_kuis_id, newJawaban)
      setHasil(hasilKuis)
      setState('hasil')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal submit jawaban')
    }
  }

  if (currentSiswaId === null || loading) {
    return <p style={{ color: muted, fontSize: 14 }}>Memuat...</p>
  }

  if (error && state === 'pilih') {
    return (
      <div style={{ padding: 20, backgroundColor: dark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, color: '#DC2626', fontSize: 13 }}>
        {error}
      </div>
    )
  }

  if (state === 'pilih') {
    return (
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: text, margin: '0 0 6px' }}>Kuis Adaptif</h1>
        <p style={{ color: muted, margin: '0 0 8px', fontSize: 14 }}>Pilih sub-topik yang ingin kamu latih</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', backgroundColor: dark ? 'rgba(37,99,235,0.1)' : '#EFF6FF', border: `1px solid ${dark ? 'rgba(37,99,235,0.3)' : '#BFDBFE'}`, borderRadius: 9, marginBottom: 28, fontSize: 13, color: dark ? '#93C5FD' : '#1D4ED8' }}>
          <span>✨</span>
          <span>Soal di-generate AI secara real-time, disesuaikan level kompetensimu saat ini</span>
        </div>

        {error && (
          <div style={{ marginBottom: 20, padding: '10px 16px', backgroundColor: dark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 9, fontSize: 13, color: '#DC2626' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {subtopikList.map((s) => {
            const statusKey = statusUntuk(s.nama)
            const selected = selectedSubtopik?.id === s.id
            return (
              <div key={s.id} onClick={() => setSelectedSubtopik(s)}
                style={{ backgroundColor: surf, border: `2px solid ${selected ? '#1E3A8A' : border}`, borderRadius: 12, padding: 20, cursor: 'pointer', transition: 'all 0.15s', boxShadow: selected ? '0 0 0 3px rgba(30,58,138,0.15)' : '0 1px 3px rgba(0,0,0,0.06)' }}>
                <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: text }}>{s.nama}</h3>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, backgroundColor: statusKey === 'tuntas' ? '#ECFDF5' : statusKey === 'berkembang' ? '#FFFBEB' : statusKey === 'belum' ? '#FEF2F2' : '#F8FAFC', color: statusKey === 'tuntas' ? '#059669' : statusKey === 'berkembang' ? '#D97706' : statusKey === 'belum' ? '#DC2626' : '#94A3B8' }}>
                  {statusKey === 'tuntas' ? 'Sudah Tuntas' : statusKey === 'berkembang' ? 'Sedang Berkembang' : statusKey === 'belum' ? 'Belum Dikuasai' : 'Belum ada data'}
                </span>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center' }}>
          <button disabled={!selectedSubtopik} onClick={handleMulaiKuis}
            style={{ padding: '12px 36px', borderRadius: 10, border: 'none', backgroundColor: selectedSubtopik ? '#1E3A8A' : (dark ? '#334155' : '#CBD5E1'), color: selectedSubtopik ? '#FFFFFF' : muted, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: selectedSubtopik ? 'pointer' : 'not-allowed', boxShadow: selectedSubtopik ? '0 4px 12px rgba(30,58,138,0.3)' : 'none' }}>
            Mulai Kuis {selectedSubtopik ? `— ${selectedSubtopik.nama}` : ''}
          </button>
        </div>
      </div>
    )
  }

  if (state === 'generating') {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>✨</div>
        <p style={{ fontSize: 15, fontWeight: 600, color: text }}>AI sedang menyusun soal untukmu...</p>
        <p style={{ fontSize: 13, color: muted, marginTop: 4 }}>Biasanya cuma beberapa detik</p>
      </div>
    )
  }

  if (state === 'soal' && sesiKuis) {
    const soal = sesiKuis.soal[soalIdx]
    const totalSoal = sesiKuis.soal.length
    return (
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: muted }}>Soal {soalIdx + 1} dari {totalSoal}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: dark ? '#93C5FD' : '#2563EB', fontWeight: 600 }}>✨ {sesiKuis.subtopik_nama}</span>
          </div>
          <div style={{ height: 6, backgroundColor: dark ? '#334155' : '#E2E8F0', borderRadius: 3 }}>
            <div style={{ height: '100%', width: `${((soalIdx + 1) / totalSoal) * 100}%`, backgroundColor: '#1E3A8A', borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
        </div>

        <div style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 14, padding: 32, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 600, color: text, lineHeight: 1.6 }}>{soal.pertanyaan}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {soal.pilihan.map((p, i) => (
            <button key={i} onClick={() => setPilihan(i)}
              style={{ padding: '14px 20px', borderRadius: 10, textAlign: 'left', border: `2px solid ${pilihan === i ? '#1E3A8A' : border}`, backgroundColor: pilihan === i ? (dark ? 'rgba(30,58,138,0.15)' : '#EFF6FF') : surf, color: pilihan === i ? '#1E3A8A' : text, fontFamily: 'inherit', fontSize: 14, fontWeight: pilihan === i ? 700 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, border: `2px solid ${pilihan === i ? '#1E3A8A' : border}`, backgroundColor: pilihan === i ? '#1E3A8A' : 'transparent', color: pilihan === i ? '#FFFFFF' : muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                {String.fromCharCode(65 + i)}
              </span>
              {p}
            </button>
          ))}
        </div>

        {error && <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <button disabled={pilihan === null} onClick={handleNext}
          style={{ width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', backgroundColor: pilihan !== null ? '#1E3A8A' : (dark ? '#334155' : '#CBD5E1'), color: pilihan !== null ? '#FFFFFF' : muted, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: pilihan !== null ? 'pointer' : 'not-allowed' }}>
          {soalIdx < totalSoal - 1 ? 'Selanjutnya →' : 'Selesai & Lihat Hasil'}
        </button>
      </div>
    )
  }

  // Hasil state
  if (state === 'hasil' && hasil) {
    const skala = Math.round(hasil.nilai)
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', paddingTop: 20 }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>{skala >= 70 ? '🎉' : skala >= 50 ? '👍' : '💪'}</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: text, margin: '0 0 6px' }}>Kuis Selesai!</h2>
        <p style={{ color: muted, margin: '0 0 32px', fontSize: 14 }}>Sub-topik: {selectedSubtopik?.nama}</p>

        <div style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 16, padding: 32, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ margin: '0 0 4px', fontSize: 14, color: muted }}>Skor kamu</p>
          <p style={{ margin: '0 0 16px', fontSize: 72, fontWeight: 900, color: skala >= 70 ? '#10B981' : skala >= 50 ? '#F59E0B' : '#EF4444', lineHeight: 1 }}>{skala}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#10B981' }}>{hasil.jumlah_benar}</p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: muted }}>Benar</p>
            </div>
            <div style={{ width: 1, backgroundColor: border }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#EF4444' }}>{hasil.jumlah_soal - hasil.jumlah_benar}</p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: muted }}>Salah</p>
            </div>
          </div>
          <div style={{ padding: '12px 16px', borderRadius: 10, backgroundColor: skala >= 70 ? (dark ? 'rgba(16,185,129,0.1)' : '#ECFDF5') : (dark ? 'rgba(245,158,11,0.1)' : '#FFFBEB'), border: `1px solid ${skala >= 70 ? '#6EE7B7' : '#FCD34D'}` }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: skala >= 70 ? '#059669' : '#D97706' }}>
              Status kompetensi {selectedSubtopik?.nama} diperbarui: <strong>{hasil.tingkat_penguasaan}</strong>
            </p>
          </div>

          {/* Review jawaban */}
          <div style={{ marginTop: 20, textAlign: 'left' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Review Jawaban</p>
            {hasil.detail_jawaban.map((d, i) => (
              <div key={i} style={{ padding: '10px 12px', backgroundColor: bg, borderRadius: 8, marginBottom: 6, border: `1px solid ${d.benar ? '#6EE7B7' : '#FCA5A5'}` }}>
                <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: text }}>{i + 1}. {d.pertanyaan}</p>
                <p style={{ margin: 0, fontSize: 11, color: d.benar ? '#059669' : '#DC2626' }}>
                  {d.benar ? '✓ Benar' : `✗ Jawabanmu: ${d.jawaban_siswa} — Benar: ${d.jawaban_benar}`}
                </p>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => { setState('pilih'); setSelectedSubtopik(null); setSesiKuis(null); setHasil(null); setError(null) }}
          style={{ padding: '12px 28px', borderRadius: 10, border: 'none', backgroundColor: '#1E3A8A', color: '#FFFFFF', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(30,58,138,0.3)' }}>
          Coba Sub-topik Lain
        </button>
      </div>
    )
  }

  return null
}
