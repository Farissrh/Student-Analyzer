type Status = 'belum' | 'berkembang' | 'tuntas' | 'kosong'

const statusConfig: Record<Status, { label: string; bg: string; text: string; dot: string }> = {
  belum: { label: 'Belum Dikuasai', bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
  berkembang: { label: 'Sedang Berkembang', bg: '#FFFBEB', text: '#D97706', dot: '#F59E0B' },
  tuntas: { label: 'Sudah Tuntas', bg: '#ECFDF5', text: '#059669', dot: '#10B981' },
  kosong: { label: '-', bg: '#F8FAFC', text: '#94A3B8', dot: '#CBD5E1' },
}

const darkStatusConfig: Record<Status, { bg: string; text: string }> = {
  belum: { bg: 'rgba(239,68,68,0.15)', text: '#F87171' },
  berkembang: { bg: 'rgba(245,158,11,0.15)', text: '#FCD34D' },
  tuntas: { bg: 'rgba(16,185,129,0.15)', text: '#34D399' },
  kosong: { bg: 'rgba(148,163,184,0.1)', text: '#64748B' },
}

interface BadgeProps {
  status: Status
  size?: 'sm' | 'md' | 'lg'
  dark?: boolean
  dotOnly?: boolean
}

export default function Badge({ status, size = 'md', dark = false, dotOnly = false }: BadgeProps) {
  const cfg = statusConfig[status]
  const darkCfg = darkStatusConfig[status]

  const bg = dark ? darkCfg.bg : cfg.bg
  const text = dark ? darkCfg.text : cfg.text

  const padding = size === 'sm' ? '2px 7px' : size === 'lg' ? '5px 12px' : '3px 10px'
  const fontSize = size === 'sm' ? '11px' : size === 'lg' ? '13px' : '12px'
  const dotSize = size === 'sm' ? 5 : size === 'lg' ? 7 : 6

  if (dotOnly) {
    return (
      <span
        style={{
          display: 'inline-block',
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          backgroundColor: cfg.dot,
          flexShrink: 0,
        }}
      />
    )
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding,
        borderRadius: 20,
        backgroundColor: bg,
        color: text,
        fontSize,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          backgroundColor: cfg.dot,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  )
}

export type { Status }
