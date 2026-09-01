import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useAppData } from '../../context/AppDataContext'
import { api, ApiError } from '../../services/api'
import { triggerDownload } from '../../services/download'
import type { SubTopikOut, UploadPdfResultOut, MateriOut } from '../../services/types'

interface RiwayatUploadSesi {
  namaFile: string
  waktu: string
  hasil: UploadPdfResultOut
}

export default function PanelAnalisis() {
  const { dark } = useTheme()
  const { kelasList, kelasId, setKelasId } = useAppData()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const materiInputRef = useRef<HTMLInputElement>(null)

  const [subtopikList, setSubtopikList] = useState<SubTopikOut[]>([])
  const [selectedSubtopikId, setSelectedSubtopikId] = useState<number | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [hasilTerakhir, setHasilTerakhir] = useState<UploadPdfResultOut | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [riwayatSesi, setRiwayatSesi] = useState<RiwayatUploadSesi[]>([])

  // ---- State untuk Upload Materi ----
  const [materiSubtopikId, setMateriSubtopikId] = useState<number | null>(null)
  const [dragOverMateri, setDragOverMateri] = useState(false)
  const [uploadingMateri, setUploadingMateri] = useState(false)
  const [materiError, setMateriError] = useState<string | null>(null)
  const [materiList, setMateriList] = useState<MateriOut[]>([])
  const [loadingMateriList, setLoadingMateriList] = useState(true)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const surf = dark ? '#1E293B' : '#FFFFFF'
  const border = dark ? '#334155' : '#E2E8F0'
  const text = dark ? '#F1F5F9' : '#0F172A'
  const muted = dark ? '#94A3B8' : '#64748B'
  const bg = dark ? '#0F172A' : '#F8FAFC'

  const muatMateriList = () => {
    setLoadingMateriList(true)
    api.getMateriList()
      .then(setMateriList)
      .catch(() => { /* diamkan - list kosong aja kalau gagal */ })
      .finally(() => setLoadingMateriList(false))
  }

  useEffect(() => {
    api.getSubTopikList()
      .then(list => {
        setSubtopikList(list)
        if (list.length > 0) {
          setSelectedSubtopikId(prev => prev ?? list[0].id)
          setMateriSubtopikId(prev => prev ?? list[0].id)
        }
      })
      .catch(() => { /* diamkan - halaman tetap bisa dipakai, dropdown cuma kosong */ })
    muatMateriList()
  }, [])

  const handleFilePicked = (file: File | null) => {
    setError(null)
    setHasilTerakhir(null)
    if (file && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('File harus berformat PDF')
      return
    }
    setSelectedFile(file)
  }

  const handleProcess = async () => {
    if (!selectedFile || !kelasId || !selectedSubtopikId) return

    setProcessing(true)
    setProgress(0)
    setError(null)
    setHasilTerakhir(null)

    // Progress simulatif - kita nggak punya angka % asli dari server selama parsing PDF,
    // jadi ini cuma indikator visual "lagi proses", bukan progres nyata per-baris.
    const interval = setInterval(() => {
      setProgress(p => (p < 85 ? p + Math.random() * 12 : p))
    }, 300)

    try {
      const hasil = await api.uploadAsesmenPdf(kelasId, selectedSubtopikId, selectedFile)
      setProgress(100)
      setHasilTerakhir(hasil)
      setRiwayatSesi(prev => [{ namaFile: selectedFile.name, waktu: new Date().toLocaleTimeString('id-ID'), hasil }, ...prev])
      setSelectedFile(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload gagal, coba lagi')
      setProgress(0)
    } finally {
      clearInterval(interval)
      setProcessing(false)
    }
  }

  const handleUploadMateri = async (file: File | null) => {
    if (!file || !materiSubtopikId) return
    setUploadingMateri(true)
    setMateriError(null)
    try {
      await api.uploadMateri(materiSubtopikId, file)
      muatMateriList()
    } catch (err) {
      setMateriError(err instanceof ApiError ? err.message : 'Upload materi gagal')
    } finally {
      setUploadingMateri(false)
    }
  }

  const handleDownloadMateri = async (materi: MateriOut) => {
    setDownloadingId(materi.id)
    try {
      const { blob, filename } = await api.downloadMateri(materi.id)
      triggerDownload(blob, filename)
    } catch (err) {
      setMateriError(err instanceof ApiError ? err.message : 'Gagal download materi')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleHapusMateri = async (materi: MateriOut) => {
    setDeletingId(materi.id)
    try {
      await api.hapusMateri(materi.id)
      setMateriList(prev => prev.filter(m => m.id !== materi.id))
    } catch (err) {
      setMateriError(err instanceof ApiError ? err.message : 'Gagal hapus materi')
    } finally {
      setDeletingId(null)
    }
  }

  const formatUkuran = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const iconUntukFile = (nama: string) => {
    const ext = nama.split('.').pop()?.toLowerCase()
    if (ext === 'mp4') return '🎬'
    if (ext === 'pptx' || ext === 'ppt') return '📊'
    if (ext === 'docx' || ext === 'doc') return '📝'
    return '📖'
  }

  const dropzoneStyle = (over: boolean): React.CSSProperties => ({
    border: `2px dashed ${over ? '#1E3A8A' : border}`,
    borderRadius: 10,
    padding: '32px 20px',
    textAlign: 'center',
    backgroundColor: over ? (dark ? 'rgba(30,58,138,0.1)' : 'rgba(30,58,138,0.04)') : bg,
    cursor: 'pointer',
    transition: 'all 0.2s',
  })

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: text, margin: '0 0 6px' }}>Panel Analisis</h1>
      <p style={{ color: muted, margin: '0 0 28px', fontSize: 14 }}>Upload nilai siswa dan materi pembelajaran untuk dianalisis AI</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* ============ Upload Nilai ============ */}
        <div style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 10, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(30,58,138,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
            </div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: text }}>Upload Nilai Siswa (PDF)</h2>
          </div>

          <p style={{ margin: '0 0 14px', fontSize: 11, color: muted, lineHeight: 1.5 }}>
            Format PDF: tabel dengan kolom <strong>Nama, NIS, Nilai</strong>. 1 file = nilai 1 sub-topik untuk 1 kelas.
            PDF hasil scan juga didukung (fallback OCR otomatis) — tapi selalu cek ulang hasilnya secara manual.
          </p>

          <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }}
            onChange={e => handleFilePicked(e.target.files?.[0] || null)} />

          <div
            style={dropzoneStyle(dragOver)}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault()
              setDragOver(false)
              handleFilePicked(e.dataTransfer.files?.[0] || null)
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            {selectedFile ? (
              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#1E3A8A' }}>{selectedFile.name}</p>
            ) : (
              <>
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: text }}>Drag & drop file PDF di sini</p>
                <p style={{ margin: 0, fontSize: 11, color: muted }}>atau klik untuk memilih file</p>
              </>
            )}
            <button
              onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
              style={{ marginTop: 14, padding: '7px 18px', borderRadius: 7, border: `1px solid #1E3A8A`, backgroundColor: 'transparent', color: '#1E3A8A', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >{selectedFile ? 'Ganti File' : 'Pilih File'}</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: muted, marginBottom: 6 }}>Kelas</label>
              <select value={kelasId ?? ''} onChange={e => setKelasId(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${border}`, backgroundColor: bg, color: text, fontFamily: 'inherit', fontSize: 12, outline: 'none' }}>
                {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: muted, marginBottom: 6 }}>Sub-topik</label>
              <select value={selectedSubtopikId ?? ''} onChange={e => setSelectedSubtopikId(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${border}`, backgroundColor: bg, color: text, fontFamily: 'inherit', fontSize: 12, outline: 'none' }}>
                {subtopikList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, fontSize: 12, backgroundColor: dark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626' }}>
              {error}
            </div>
          )}

          {riwayatSesi.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Upload Sesi Ini
              </p>
              {riwayatSesi.map((r, i) => (
                <div key={i} style={{ padding: '9px 12px', backgroundColor: bg, borderRadius: 8, marginBottom: 6, border: `1px solid ${border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>📃</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{r.namaFile}</p>
                      <p style={{ margin: 0, fontSize: 10, color: muted }}>{r.waktu}</p>
                    </div>
                    <span style={{ color: r.hasil.jumlah_gagal === 0 ? '#10B981' : '#F59E0B', fontSize: 11, fontWeight: 700 }}>
                      {r.hasil.jumlah_berhasil} berhasil{r.hasil.jumlah_gagal > 0 ? `, ${r.hasil.jumlah_gagal} gagal` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleProcess}
            disabled={processing || !selectedFile || !kelasId || !selectedSubtopikId}
            style={{
              width: '100%', marginTop: 16, padding: '10px 0', borderRadius: 9, border: 'none',
              backgroundColor: processing || !selectedFile ? '#94A3B8' : '#1E3A8A', color: '#FFFFFF',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: processing || !selectedFile ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1010 10"/><path d="M22 2L11 13M22 2h-6M22 2v6"/>
            </svg>
            {processing ? 'Memproses...' : 'Proses dengan AI'}
          </button>
        </div>

        {/* ============ Upload Materi - TERSAMBUNG ke backend ============ */}
        <div style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 10, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
              </svg>
            </div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: text }}>Upload Materi Pembelajaran</h2>
          </div>

          <input ref={materiInputRef} type="file" accept=".pdf,.docx,.doc,.pptx,.ppt,.mp4" style={{ display: 'none' }}
            onChange={e => { handleUploadMateri(e.target.files?.[0] || null); e.target.value = '' }} />

          <div
            style={{ ...dropzoneStyle(dragOverMateri), opacity: uploadingMateri ? 0.6 : 1, pointerEvents: uploadingMateri ? 'none' : 'auto' }}
            onClick={() => materiInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOverMateri(true) }}
            onDragLeave={() => setDragOverMateri(false)}
            onDrop={e => {
              e.preventDefault()
              setDragOverMateri(false)
              handleUploadMateri(e.dataTransfer.files?.[0] || null)
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📚</div>
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: text }}>
              {uploadingMateri ? 'Mengupload...' : 'Upload modul, soal, atau video'}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: muted }}>PDF, DOCX, PPTX, MP4 (maks. 100 MB)</p>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: muted, marginBottom: 6 }}>Sub-topik Materi</label>
            <select value={materiSubtopikId ?? ''} onChange={e => setMateriSubtopikId(Number(e.target.value))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${border}`, backgroundColor: bg, color: text, fontFamily: 'inherit', fontSize: 12, outline: 'none' }}>
              {subtopikList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
            </select>
          </div>

          {materiError && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, fontSize: 12, backgroundColor: dark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626' }}>
              {materiError}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Materi Existing</p>
            {loadingMateriList ? (
              <p style={{ fontSize: 12, color: muted }}>Memuat...</p>
            ) : materiList.length === 0 ? (
              <p style={{ fontSize: 12, color: muted }}>Belum ada materi yang diupload.</p>
            ) : (
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {materiList.map((f) => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', backgroundColor: bg, borderRadius: 8, marginBottom: 6, border: `1px solid ${border}` }}>
                    <span style={{ fontSize: 16 }}>{iconUntukFile(f.nama_file_asli)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nama_file_asli}</p>
                      <p style={{ margin: 0, fontSize: 10, color: muted }}>{f.subtopik_nama} · {formatUkuran(f.ukuran_bytes)}</p>
                    </div>
                    <button onClick={() => handleDownloadMateri(f)} disabled={downloadingId === f.id}
                      style={{ padding: '3px 8px', border: `1px solid ${border}`, backgroundColor: 'transparent', borderRadius: 5, cursor: downloadingId === f.id ? 'wait' : 'pointer', color: '#1E3A8A', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                      {downloadingId === f.id ? '...' : 'Unduh'}
                    </button>
                    <button onClick={() => handleHapusMateri(f)} disabled={deletingId === f.id}
                      style={{ padding: '3px 8px', border: `1px solid ${border}`, backgroundColor: 'transparent', borderRadius: 5, cursor: deletingId === f.id ? 'wait' : 'pointer', color: muted, fontSize: 10, flexShrink: 0 }}>
                      {deletingId === f.id ? '...' : 'Hapus'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {(processing || hasilTerakhir) && (
        <div style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🤖</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: text }}>
                {processing ? 'Mengekstrak data dari PDF...' : 'Selesai diproses'}
              </span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: progress >= 100 ? '#10B981' : '#1E3A8A' }}>{Math.min(100, Math.round(progress))}%</span>
          </div>
          <div style={{ height: 6, backgroundColor: dark ? '#334155' : '#E2E8F0', borderRadius: 3, overflow: 'hidden', marginBottom: hasilTerakhir ? 16 : 0 }}>
            <div style={{ height: '100%', width: `${Math.min(100, progress)}%`, backgroundColor: progress >= 100 ? '#10B981' : '#1E3A8A', borderRadius: 3, transition: 'width 0.3s ease' }} />
          </div>

          {hasilTerakhir && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#10B981' }}>✓ Berhasil ({hasilTerakhir.jumlah_berhasil})</p>
                {hasilTerakhir.detail_berhasil.map((d, i) => (
                  <p key={i} style={{ margin: '0 0 4px', fontSize: 11, color: muted }}>{d}</p>
                ))}
              </div>
              {hasilTerakhir.jumlah_gagal > 0 && (
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#DC2626' }}>✗ Gagal ({hasilTerakhir.jumlah_gagal})</p>
                  {hasilTerakhir.detail_gagal.map((d, i) => (
                    <p key={i} style={{ margin: '0 0 4px', fontSize: 11, color: muted }}>{d}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
