'use client'

import { useRef } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { formatFileSize } from '@/lib/utils'

interface Step2Props {
  files: {
    guidelines?: File
    pastProjects: File[]
  }
  updateFiles: (files: any) => void
}

export function Step2FileUploads({ files, updateFiles }: Step2Props) {
  const guidelinesRef = useRef<HTMLInputElement>(null)
  const pastProjectsRef = useRef<HTMLInputElement>(null)

  const handleGuidelinesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      updateFiles({ guidelines: file })
    }
    
    // Allow selecting the same file again on subsequent uploads
    e.target.value = ''
  }
  

  const handlePastProjectsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || [])
    updateFiles({ pastProjects: [...files.pastProjects, ...newFiles] })
    const existingKeys = new Set(
      files.pastProjects.map(file => `${file.name}-${file.size}-${file.lastModified}`)
    )

    const uniqueNewFiles = newFiles.filter(
      file => !existingKeys.has(`${file.name}-${file.size}-${file.lastModified}`)
    )

    updateFiles({ pastProjects: [...files.pastProjects, ...uniqueNewFiles] })

    // Allow selecting the same files again after removal
    e.target.value = ''
  }


  const removeGuidelines = () => {
    updateFiles({ guidelines: undefined })
    if (guidelinesRef.current) {
      guidelinesRef.current.value = ''
    }
  }

  const removePastProject = (index: number) => {
    const newFiles = files.pastProjects.filter((_, i) => i !== index)
    updateFiles({ pastProjects: newFiles })
    
    if (pastProjectsRef.current) {
      pastProjectsRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Upload Documents
        </h2>
        <p className="text-gray-400">
          Upload your university guidelines and optional past projects
        </p>
      </div>

      {/* Guidelines Upload */}
      <div>
        <label className="block text-sm font-medium text-white mb-3">
          University Guidelines * <span className="text-gray-500">(.docx, .pdf)</span>
        </label>
        
        {!files.guidelines ? (
          <div
            onClick={() => guidelinesRef.current?.click()}
            className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500 transition-colors"
          >
            <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-white font-medium mb-2">
              Click to upload or drag and drop
            </p>
            <p className="text-sm text-gray-500">
              DOCX or PDF (Max 10MB)
            </p>
            <input
              ref={guidelinesRef}
              type="file"
              accept=".docx,.pdf"
              onChange={handleGuidelinesUpload}
              className="hidden"
            />
          </div>
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <FileText className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-white font-medium">{files.guidelines.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(files.guidelines.size)}</p>
              </div>
            </div>
            <button
              onClick={removeGuidelines}
              className="p-2 text-gray-400 hover:text-red-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Past Projects Upload */}
      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Past Projects <span className="text-gray-500">(Optional)</span>
        </label>
        <p className="text-sm text-gray-500 mb-3">
          Upload similar past projects to help AI understand expectations
        </p>

        <div
          onClick={() => pastProjectsRef.current?.click()}
          className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center cursor-pointer hover:border-purple-500 transition-colors mb-4"
        >
          <Upload className="w-10 h-10 text-gray-500 mx-auto mb-3" />
          <p className="text-white font-medium mb-1">
            Upload past project files
          </p>
          <p className="text-sm text-gray-500">
            DOCX, PDF, or TXT
          </p>
          <input
            ref={pastProjectsRef}
            type="file"
            accept=".docx,.pdf,.txt"
            multiple
            onChange={handlePastProjectsUpload}
            className="hidden"
          />
        </div>

        {files.pastProjects.length > 0 && (
          <div className="space-y-2">
            {files.pastProjects.map((file, index) => (
              <div
                key={index}
                className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => removePastProject(index)}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
