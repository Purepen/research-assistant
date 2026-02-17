'use client'

import { Card } from '@/components/ui/Card'
import { FileText } from 'lucide-react'
import { Specification } from '@/types'

interface SpecificationViewProps {
  specification: Specification
}

export function SpecificationView({ specification }: SpecificationViewProps) {
  const sections = [
    { key: 'abstract', label: 'Abstract', data: specification.abstract },
    { key: 'justification', label: 'Justification and Overall Aim', data: specification.justification_and_aim },
    { key: 'objectives', label: 'Objectives', data: specification.objectives },
    { key: 'literature', label: 'Review of Literature', data: specification.literature_review },
    { key: 'methodology', label: 'Methodology', data: specification.methodology },
    { key: 'workplan', label: 'Work Plan', data: specification.work_plan },
  ]

  return (
    <div className="space-y-6">
      {/* Project Title */}
      <Card>
        <h2 className="text-3xl font-bold text-white mb-4">
          {specification.project_title}
        </h2>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>Total Word Count: {specification.total_word_count}</span>
          <span>•</span>
          <span>References: {specification.references.length}</span>
        </div>
      </Card>

      {/* Sections */}
      {sections.map((section) => (
        <Card key={section.key}>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <FileText className="w-5 h-5 text-purple-400" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">{section.label}</h3>
                <span className="text-sm text-gray-400">{section.data.word_count} words</span>
              </div>
              
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {section.data.content}
                </p>
              </div>

              {section.data.key_points.length > 0 && (
                <div className="mt-4 p-4 bg-slate-800/50 rounded-xl">
                  <p className="text-sm font-medium text-white mb-2">Key Points:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {section.data.key_points.map((point, index) => (
                      <li key={index} className="text-sm text-gray-400">{point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}

      {/* References */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-4">
              References ({specification.references.length})
            </h3>
            
            <ol className="space-y-2">
              {specification.references.map((ref, index) => (
                <li key={index} className="text-sm text-gray-300">
                  {index + 1}. {ref}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Card>
    </div>
  )
}
