import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useAppData } from '../../context/AppDataContext'
import { api, ApiError } from '../../services/api'
import type { SubTopikOut, SiswaOut, UploadSiswaResultOut } from '../../services/types'

type Tab = 'kelas' | 'subtopik' | 'siswa'

export default function ManajemenData() {
  const { dark } = useTheme()
  const [tab, setTab] = useState<Tab>('kelas')

  const surf = dark ? '#1E293B' : '#FFFFFF'
  const border = dark ? '#334155' : '#E2E8F0'
  const text = dark ? '#F1F5F9' : '#0F172A'
  const muted = dark ? '#94A3B8' : '#64748B'

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: text, margin: '0 0 6px' }}>Manajemen Data</h1>
      <p style={{ color: muted, margin: '0 0 24px', fontSize: 14 }}>Kelola kelas, sub-topik, dan siswa</p>

      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${border}`, marginBottom: 24 }}>
        {([['kelas', 'Kelas'], ['subtopik', 'Sub-topik'], ['siswa', 'Siswa']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{
              padding: '10px 20px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, fontWeight: tab === id ? 700 : 500,
              color: tab === id ? '#1E3A8A' : muted,
              borderBottom: tab === id ? '2px solid #1E3A8A' : '2px solid transparent',
            }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'kelas' && <TabKelas dark={dark} surf={surf} border={border} text={text} muted={muted} />}
      {tab === 'subtopik' && <TabSubTopik dark={dark} surf={surf} border={border} text={text} muted={muted} />}
      {tab === 'siswa' && <TabSiswa dark={dark} surf={surf} border={border} text={text} muted={muted} />}
    </div>
  )
}

interface TabProps { dark: boolean; surf: string; border: string; text: string; muted: string }

// ==================== TAB KELAS ====================
function TabKelas({ surf, border, text, muted }: TabProps) {
  const { kelasList, reloadKelas, loadingKelas } = useAppData()
  const [namaBaru, setNamaBaru] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTambah = async () => {
    if (!namaBaru.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await api.createKelas(namaBaru.trim())
      setNamaBaru('')
      reloadKelas()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menambah kelas')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
      <div style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', alignSelf: 'start' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: text }}>Tambah Kelas Baru</h3>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: muted, marginBottom: 6 }}>Nama Kelas</label>
        <input value={namaBaru} onChange={e => setNamaBaru(e.target.value)} placeholder="contoh: XI IPA 3"
          onKeyDown={e => e.key === 'Enter' && handleTambah()}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: `1px solid ${border}`, backgroundColor: 'transparent', color: text, fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
        {error && <p style={{ margin: '0 0 12px', fontSize: 12, color: '#DC2626' }}>{error}</p>}
        <button onClick={handleTambah} disabled={submitting || !namaBaru.trim()}
          style={{ width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', backgroundColor: !namaBaru.trim() ? '#94A3B8' : '#1E3A8A', color: '#FFFFFF', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: !namaBaru.trim() ? 'not-allowed' : 'pointer' }}>
          {submitting ? 'Menambah...' : '+ Tambah Kelas'}
        </button>
      </div>

      <div style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}` }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: text }}>Daftar Kelas ({kelasList.length})</h3>
        </div>
        {loadingKelas ? (
          <p style={{ padding: 20, fontSize: 13, color: muted }}>Memuat...</p>
        ) : kelasList.length === 0 ? (
          <p style={{ padding: 20, fontSize: 13, color: muted }}>Belum ada kelas. Tambah dulu di form kiri.</p>
        ) : (
          kelasList.map((k, i) => (
            <div key={k.id} style={{ padding: '12px 20px', borderBottom: i < kelasList.length - 1 ? `1px solid ${border}` : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: 'rgba(30,58,138,0.1)', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>🏫</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: text }}>{k.nama}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ==================== TAB SUB-TOPIK ====================
function TabSubTopik({ surf, border, text, muted }: TabProps) {
  const [subtopikList, setSubtopikList] = useState<SubTopikOut[]>([])
  const [loading, setLoading] = useState(true)
  const [nama, setNama] = useState('')
  const [bab, setBab] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const muat = () => {
    setLoading(true)
    api.getSubTopikList().then(setSubtopikList).finally(() => setLoading(false))
  }
  useEffect(muat, [])

  const handleTambah = async () => {
    if (!nama.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await api.createSubTopik(nama.trim(), bab.trim() || undefined)
      setNama('')
      setBab('')
      muat()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menambah sub-topik')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
      <div style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', alignSelf: 'start' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: text }}>Tambah Sub-topik Baru</h3>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: muted, marginBottom: 6 }}>Nama Sub-topik</label>
        <input value={nama} onChange={e => setNama(e.target.value)} placeholder="contoh: Laju Reaksi"
          style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: `1px solid ${border}`, backgroundColor: 'transparent', color: text, fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: muted, marginBottom: 6 }}>Bab (opsional)</label>
        <input value={bab} onChange={e => setBab(e.target.value)} placeholder="contoh: Bab 6"
          onKeyDown={e => e.key === 'Enter' && handleTambah()}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: `1px solid ${border}`, backgroundColor: 'transparent', color: text, fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
        {error && <p style={{ margin: '0 0 12px', fontSize: 12, color: '#DC2626' }}>{error}</p>}
        <button onClick={handleTambah} disabled={submitting || !nama.trim()}
          style={{ width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', backgroundColor: !nama.trim() ? '#94A3B8' : '#1E3A8A', color: '#FFFFFF', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: !nama.trim() ? 'not-allowed' : 'pointer' }}>
          {submitting ? 'Menambah...' : '+ Tambah Sub-topik'}
        </button>
      </div>

      <div style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}` }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: text }}>Daftar Sub-topik ({subtopikList.length})</h3>
        </div>
        {loading ? (
          <p style={{ padding: 20, fontSize: 13, color: muted }}>Memuat...</p>
        ) : subtopikList.length === 0 ? (
          <p style={{ padding: 20, fontSize: 13, color: muted }}>Belum ada sub-topik. Tambah dulu di form kiri.</p>
        ) : (
          subtopikList.map((s, i) => (
            <div key={s.id} style={{ padding: '12px 20px', borderBottom: i < subtopikList.length - 1 ? `1px solid ${border}` : 'none' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: text }}>{s.nama}</p>
              {s.bab && <p style={{ margin: '2px 0 0', fontSize: 11, color: muted }}>{s.bab}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ==================== TAB SISWA ====================
function TabSiswa({ dark, surf, border, text, muted }: TabProps) {
  const { kelasList, kelasId, setKelasId } = useAppData()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [siswaList, setSiswaList] = useState<SiswaOut[]>([])
  const [loadingSiswa, setLoadingSiswa] = useState(true)

  // Form manual
  const [nama, setNama] = useState('')
  const [nis, setNis] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Bulk import
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<UploadSiswaResultOut | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const bg = dark ? '#0F172A' : '#F8FAFC'

  const muatSiswa = () => {
    if (kelasId === null) return
    setLoadingSiswa(true)
    api.getSiswaByKelas(kelasId).then(setSiswaList).finally(() => setLoadingSiswa(false))
  }
  useEffect(muatSiswa, [kelasId])

  const handleTambahManual = async () => {
    if (!nama.trim() || !nis.trim() || !password.trim() || kelasId === null) return
    setSubmitting(true)
    setFormError(null)
    try {
      await api.createSiswa(nama.trim(), nis.trim(), password.trim(), kelasId)
      setNama(''); setNis(''); setPassword('')
      muatSiswa()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Gagal menambah siswa')
    } finally {
      setSubmitting(false)
    }
  }

  const handleImport = async () => {
    if (!selectedFile || kelasId === null) return
    setImporting(true)
    setImportError(null)
    setImportResult(null)
    try {
      const hasil = await api.uploadSiswaPdf(kelasId, selectedFile)
      setImportResult(hasil)
      setSelectedFile(null)
      muatSiswa()
    } catch (err) {
      setImportError(err instanceof ApiError ? err.message : 'Import gagal')
    } finally {
      setImporting(false)
    }
  }

  if (kelasList.length === 0) {
    return (
      <div style={{ padding: 24, backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 10, color: muted, fontSize: 13, textAlign: 'center' }}>
        Belum ada kelas. Buat kelas dulu di tab "Kelas" sebelum menambah siswa.
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: muted, marginBottom: 6 }}>Pilih Kelas</label>
        <select value={kelasId ?? ''} onChange={e => setKelasId(Number(e.target.value))}
          style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${border}`, backgroundColor: surf, color: text, fontFamily: 'inherit', fontSize: 13, outline: 'none', minWidth: 200 }}>
          {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Form manual */}
        <div style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: text }}>Tambah Siswa Manual</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input value={nama} onChange={e => setNama(e.target.value)} placeholder="Nama lengkap"
              style={{ padding: '9px 12px', borderRadius: 7, border: `1px solid ${border}`, backgroundColor: 'transparent', color: text, fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
            <input value={nis} onChange={e => setNis(e.target.value)} placeholder="NIS"
              style={{ padding: '9px 12px', borderRadius: 7, border: `1px solid ${border}`, backgroundColor: 'transparent', color: text, fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password awal" type="text"
              onKeyDown={e => e.key === 'Enter' && handleTambahManual()}
              style={{ padding: '9px 12px', borderRadius: 7, border: `1px solid ${border}`, backgroundColor: 'transparent', color: text, fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
          </div>
          {formError && <p style={{ margin: '10px 0 0', fontSize: 12, color: '#DC2626' }}>{formError}</p>}
          <button onClick={handleTambahManual} disabled={submitting || !nama.trim() || !nis.trim() || !password.trim()}
            style={{ width: '100%', marginTop: 14, padding: '10px 0', borderRadius: 8, border: 'none', backgroundColor: (!nama.trim() || !nis.trim() || !password.trim()) ? '#94A3B8' : '#1E3A8A', color: '#FFFFFF', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: (!nama.trim() || !nis.trim() || !password.trim()) ? 'not-allowed' : 'pointer' }}>
            {submitting ? 'Menambah...' : '+ Tambah Siswa'}
          </button>
        </div>

        {/* Bulk import */}
        <div style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: text }}>Import dari PDF</h3>
          <p style={{ margin: '0 0 14px', fontSize: 11, color: muted, lineHeight: 1.5 }}>
            Tabel PDF dengan kolom <strong>Nama, NIS</strong>. Semua siswa baru dapat password default yang sama.
          </p>

          <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }}
            onChange={e => setSelectedFile(e.target.files?.[0] || null)} />

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); setSelectedFile(e.dataTransfer.files?.[0] || null) }}
            style={{ border: `2px dashed ${dragOver ? '#1E3A8A' : border}`, borderRadius: 9, padding: '20px', textAlign: 'center', cursor: 'pointer', backgroundColor: dragOver ? (dark ? 'rgba(30,58,138,0.1)' : 'rgba(30,58,138,0.04)') : bg }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>📄</div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: selectedFile ? '#1E3A8A' : text }}>
              {selectedFile ? selectedFile.name : 'Drag & drop atau klik pilih file'}
            </p>
          </div>

          {importError && <p style={{ margin: '10px 0 0', fontSize: 12, color: '#DC2626' }}>{importError}</p>}

          <button onClick={handleImport} disabled={importing || !selectedFile}
            style={{ width: '100%', marginTop: 14, padding: '10px 0', borderRadius: 8, border: 'none', backgroundColor: (!selectedFile || importing) ? '#94A3B8' : '#10B981', color: '#FFFFFF', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: (!selectedFile || importing) ? 'not-allowed' : 'pointer' }}>
            {importing ? 'Mengimpor...' : 'Import Siswa'}
          </button>

          {importResult && (
            <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 8, backgroundColor: bg, border: `1px solid ${border}` }}>
              <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: text }}>
                ✅ {importResult.jumlah_berhasil} berhasil, {importResult.jumlah_gagal > 0 ? `⚠️ ${importResult.jumlah_gagal} gagal` : 'semua lancar'}
              </p>
              {importResult.jumlah_berhasil > 0 && (
                <p style={{ margin: '0 0 6px', fontSize: 11, color: '#10B981' }}>
                  Password default siswa baru: <strong>{importResult.password_default}</strong> (infokan ke siswa)
                </p>
              )}
              {importResult.detail_gagal.map((d, i) => (
                <p key={i} style={{ margin: '2px 0', fontSize: 10, color: muted }}>⚠️ {d}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}` }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: text }}>Daftar Siswa di Kelas Ini ({siswaList.length})</h3>
        </div>
        {loadingSiswa ? (
          <p style={{ padding: 20, fontSize: 13, color: muted }}>Memuat...</p>
        ) : siswaList.length === 0 ? (
          <p style={{ padding: 20, fontSize: 13, color: muted }}>Belum ada siswa di kelas ini.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: dark ? '#273449' : '#F8FAFC' }}>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase' }}>Nama</th>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase' }}>NIS</th>
              </tr>
            </thead>
            <tbody>
              {siswaList.map((s, i) => (
                <tr key={s.id} style={{ borderTop: i > 0 ? `1px solid ${border}` : 'none' }}>
                  <td style={{ padding: '10px 20px', fontSize: 13, color: text, fontWeight: 600 }}>{s.nama}</td>
                  <td style={{ padding: '10px 20px', fontSize: 13, color: muted }}>{s.nis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
