'use client'

import { useRef, useState } from 'react'
import { Upload, FileText, X, Database, Search, FlaskConical, HardDrive } from 'lucide-react'

interface DatasetState {
  mode: 'uploaded' | 'public' | 'scout' | 'self_collected' | null
  file?: File
  name?: string
  url?: string
  description?: string
}

interface Step2Props {
  files: {
    guidelines?: File
    pastProjects: File[]
    datasetFile?: File
  }
  updateFiles: (files: any) => void
  datasetState: DatasetState
  updateDatasetState: (s: DatasetState) => void
  track: 'A' | 'B'
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function Step2FileUploads({
  files, updateFiles, datasetState, updateDatasetState, track
}: Step2Props) {
  const guidelinesRef  = useRef<HTMLInputElement>(null)
  const pastProjRef    = useRef<HTMLInputElement>(null)
  const datasetFileRef = useRef<HTMLInputElement>(null)

  // ── Guidelines ──────────────────────────────────────────────────────────────
  const handleGuidelinesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) updateFiles({ guidelines: file })
    e.target.value = ''
  }
  const removeGuidelines = () => {
    updateFiles({ guidelines: undefined })
    if (guidelinesRef.current) guidelinesRef.current.value = ''
  }

  // ── Past projects ────────────────────────────────────────────────────────────
  const handlePastProjectsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files || [])
    if (!incoming.length) return
    const existingKeys = new Set(files.pastProjects.map(f => `${f.name}-${f.size}`))
    const unique = incoming.filter(f => !existingKeys.has(`${f.name}-${f.size}`))
    updateFiles({ pastProjects: [...files.pastProjects, ...unique] })
    e.target.value = ''
  }
  const removePastProject = (i: number) =>
    updateFiles({ pastProjects: files.pastProjects.filter((_, idx) => idx !== i) })

  // ── Dataset CSV ──────────────────────────────────────────────────────────────
  const handleDatasetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      updateDatasetState({ ...datasetState, mode: 'uploaded', file })
      updateFiles({ datasetFile: file })
    }
    e.target.value = ''
  }
  const removeDataset = () => {
    updateDatasetState({ mode: null })
    updateFiles({ datasetFile: undefined })
    if (datasetFileRef.current) datasetFileRef.current.value = ''
  }

  const s: React.CSSProperties = {
    sectionCard: { background: 'white', border: '1.5px solid #e8ede8', borderRadius: 14, padding: '20px 22px', marginBottom: 16 } as any
  }

  const DATASET_MODES = [
    {
      id: 'uploaded',
      icon: HardDrive,
      label: 'I have a dataset',
      sub: 'Upload a CSV file',
      color: '#16a34a',
      bg: '#f0fdf4',
    },
    {
      id: 'public',
      icon: Database,
      label: "I'll use a public dataset",
      sub: 'e.g. UCI, Kaggle, HuggingFace',
      color: '#2563eb',
      bg: '#eff6ff',
    },
    {
      id: 'scout',
      icon: Search,
      label: 'Help me find a dataset',
      sub: 'AI will scout one for you',
      color: '#7c3aed',
      bg: '#faf5ff',
    },
    {
      id: 'self_collected',
      icon: FlaskConical,
      label: "I'll collect my own data",
      sub: 'Surveys, experiments, primary data',
      color: '#d97706',
      bg: '#fffbeb',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: '0 0 4px', fontWeight: 800, color: '#0f1f0f', fontSize: '1.15rem' }}>
          Documents & Data
        </h2>
        <p style={{ margin: 0, fontSize: '.84rem', color: '#9ca3af' }}>
          Upload what you have. Nothing here is required to get started.
        </p>
      </div>

      {/* ── Guidelines ──────────────────────────────────────────────────────── */}
      <div style={{ background: 'white', border: '1.5px solid #e8ede8', borderRadius: 14, padding: '20px 22px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <FileText size={16} color="#374151" />
          <span style={{ fontWeight: 700, fontSize: '.87rem', color: '#0f1f0f' }}>
            Project Guidelines
          </span>
          <span style={{ fontSize: '.73rem', color: '#9ca3af', background: '#f3f4f6', borderRadius: 6, padding: '2px 7px' }}>
            Optional
          </span>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: '.78rem', color: '#6b7280', lineHeight: 1.5 }}>
          Upload your university's spec guidelines document. If you don't have one, the system uses standard academic defaults.
        </p>

        {!files.guidelines ? (
          <div
            onClick={() => guidelinesRef.current?.click()}
            style={{ border: '1.5px dashed #e8ede8', borderRadius: 10, padding: '18px', textAlign: 'center', cursor: 'pointer', transition: 'border-color .15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#16a34a')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#e8ede8')}
          >
            <Upload size={22} color="#9ca3af" style={{ margin: '0 auto 8px', display: 'block' }} />
            <p style={{ margin: '0 0 3px', fontWeight: 600, fontSize: '.84rem', color: '#374151' }}>
              Click to upload guidelines
            </p>
            <p style={{ margin: 0, fontSize: '.74rem', color: '#9ca3af' }}>DOCX or PDF</p>
            <input ref={guidelinesRef} type="file" accept=".docx,.pdf" onChange={handleGuidelinesUpload} onClick={e => e.stopPropagation()} className="hidden" style={{ display: 'none' }} />
          </div>
        ) : (
          <div style={{ background: '#f9fafb', border: '1px solid #e8ede8', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={15} color="#16a34a" />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '.84rem', color: '#0f1f0f' }}>{files.guidelines.name}</p>
                <p style={{ margin: 0, fontSize: '.73rem', color: '#9ca3af' }}>{formatFileSize(files.guidelines.size)}</p>
              </div>
            </div>
            <button onClick={removeGuidelines} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ── Dataset (Track A only) ───────────────────────────────────────────── */}
      {track === 'A' && (
        <div style={{ background: 'white', border: '1.5px solid #e8ede8', borderRadius: 14, padding: '20px 22px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Database size={16} color="#374151" />
            <span style={{ fontWeight: 700, fontSize: '.87rem', color: '#0f1f0f' }}>Dataset</span>
            <span style={{ fontSize: '.73rem', color: 'white', background: '#dc2626', borderRadius: 6, padding: '2px 7px', fontWeight: 700 }}>Required</span>
          </div>
          <p style={{ margin: '0 0 14px', fontSize: '.78rem', color: '#6b7280', lineHeight: 1.5 }}>
            Your spec needs real dataset facts — not invented ones. Upload your CSV, name a public dataset, or let AI scout one if you don't have it yet.
          </p>

          {/* Mode selection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {DATASET_MODES.map(mode => {
              const Icon = mode.icon
              const selected = datasetState.mode === mode.id
              return (
                <button
                  key={mode.id}
                  onClick={() => updateDatasetState({ mode: mode.id as any })}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '12px 13px', borderRadius: 10, cursor: 'pointer',
                    border: `1.5px solid ${selected ? mode.color : '#e8ede8'}`,
                    background: selected ? mode.bg : 'white',
                    transition: 'all .15s', textAlign: 'left',
                  }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: selected ? mode.bg : '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${selected ? mode.color + '40' : '#e8ede8'}` }}>
                    <Icon size={13} color={selected ? mode.color : '#9ca3af'} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '.8rem', color: selected ? '#0f1f0f' : '#374151', lineHeight: 1.2 }}>{mode.label}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '.71rem', color: '#9ca3af', lineHeight: 1.3 }}>{mode.sub}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Conditional inputs per mode */}
          {datasetState.mode === 'uploaded' && (
            <div>
              {!files.datasetFile ? (
                <div
                  onClick={() => datasetFileRef.current?.click()}
                  style={{ border: '1.5px dashed #16a34a40', borderRadius: 10, padding: '14px', textAlign: 'center', cursor: 'pointer', background: '#f0fdf4' }}
                >
                  <HardDrive size={18} color="#16a34a" style={{ margin: '0 auto 6px', display: 'block' }} />
                  <p style={{ margin: 0, fontSize: '.8rem', color: '#16a34a', fontWeight: 600 }}>Click to upload CSV</p>
                  <input ref={datasetFileRef} type="file" accept=".csv,.xlsx,.tsv" onChange={handleDatasetUpload} onClick={e => e.stopPropagation()} style={{ display: 'none' }} />
                </div>
              ) : (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <HardDrive size={14} color="#16a34a" />
                    <span style={{ fontWeight: 600, fontSize: '.82rem', color: '#0f1f0f' }}>{files.datasetFile.name}</span>
                    <span style={{ fontSize: '.72rem', color: '#9ca3af' }}>{formatFileSize(files.datasetFile.size)}</span>
                  </div>
                  <button onClick={removeDataset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={14} /></button>
                </div>
              )}
            </div>
          )}

          {datasetState.mode === 'public' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                className="g-input"
                placeholder="Dataset name — e.g. UCI Heart Disease Dataset"
                value={datasetState.name || ''}
                onChange={e => updateDatasetState({ ...datasetState, name: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e8ede8', borderRadius: 9, fontSize: '.84rem', outline: 'none', boxSizing: 'border-box' }}
              />
              <input
                className="g-input"
                placeholder="URL (optional) — e.g. https://archive.ics.uci.edu/..."
                value={datasetState.url || ''}
                onChange={e => updateDatasetState({ ...datasetState, url: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e8ede8', borderRadius: 9, fontSize: '.84rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )}

          {datasetState.mode === 'self_collected' && (
            <textarea
              placeholder="Briefly describe what data you'll collect — e.g. 'Survey responses from 200 university students about...'"
              value={datasetState.description || ''}
              onChange={e => updateDatasetState({ ...datasetState, description: e.target.value })}
              rows={3}
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e8ede8', borderRadius: 9, fontSize: '.84rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
          )}

          {datasetState.mode === 'scout' && (
            <div style={{ padding: '11px 13px', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 9 }}>
              <p style={{ margin: '0 0 6px', fontSize: '.8rem', color: '#7c3aed', lineHeight: 1.5, fontWeight: 600 }}>
                ✨ AI will search for a dataset during generation.
              </p>
              <p style={{ margin: 0, fontSize: '.75rem', color: '#9ca3af', lineHeight: 1.5 }}>
                Tip: Using Topic Lab to find and identify a dataset first — then uploading it here — gives better results and costs less.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Past projects ────────────────────────────────────────────────────── */}
      <div style={{ background: 'white', border: '1.5px solid #e8ede8', borderRadius: 14, padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <FileText size={16} color="#374151" />
          <span style={{ fontWeight: 700, fontSize: '.87rem', color: '#0f1f0f' }}>Past Projects</span>
          <span style={{ fontSize: '.73rem', color: '#9ca3af', background: '#f3f4f6', borderRadius: 6, padding: '2px 7px' }}>Optional</span>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: '.78rem', color: '#6b7280', lineHeight: 1.5 }}>
          Upload similar dissertations or projects. The AI will use them to differentiate your work. If you skip this, the system finds similar projects online automatically.
        </p>

        <div
          onClick={() => pastProjRef.current?.click()}
          style={{ border: '1.5px dashed #e8ede8', borderRadius: 10, padding: '14px', textAlign: 'center', cursor: 'pointer', transition: 'border-color .15s', marginBottom: files.pastProjects.length ? 10 : 0 }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#7c3aed')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#e8ede8')}
        >
          <Upload size={18} color="#9ca3af" style={{ margin: '0 auto 6px', display: 'block' }} />
          <p style={{ margin: 0, fontSize: '.8rem', color: '#374151', fontWeight: 600 }}>Upload past project files</p>
          <p style={{ margin: '2px 0 0', fontSize: '.72rem', color: '#9ca3af' }}>DOCX, PDF or TXT — multiple allowed</p>
          <input ref={pastProjRef} type="file" accept=".docx,.pdf,.txt" multiple onChange={handlePastProjectsUpload} onClick={e => e.stopPropagation()} style={{ display: 'none' }} />
        </div>

        {files.pastProjects.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {files.pastProjects.map((file, i) => (
              <div key={`${file.name}-${i}`} style={{ background: '#f9fafb', border: '1px solid #e8ede8', borderRadius: 9, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={14} color="#7c3aed" />
                  <div>
                    <p style={{ margin: 0, fontSize: '.82rem', fontWeight: 600, color: '#0f1f0f' }}>{file.name}</p>
                    <p style={{ margin: 0, fontSize: '.71rem', color: '#9ca3af' }}>{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button onClick={() => removePastProject(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
