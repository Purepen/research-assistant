'use client'

import { Card } from '@/components/ui/Card'
import { CheckCircle, AlertTriangle, Star, TrendingUp } from 'lucide-react'
import { Review } from '@/types'
import { getMarksColor } from '@/lib/utils'

interface ReviewViewProps {
  review: Review
}

export function ReviewView({ review }: ReviewViewProps) {
  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              Professor Review
            </h2>
            <p className="text-gray-400">{review.decision}</p>
          </div>
          
          <div className="text-center">
            <div className={`text-5xl font-bold ${getMarksColor(review.total_marks)}`}>
              {review.total_marks}
            </div>
            <div className="text-gray-400 text-sm">out of 100</div>
          </div>
        </div>

        {/* Supervisor Comments */}
        <div className="p-4 bg-slate-800/50 rounded-xl">
          <p className="text-gray-300 leading-relaxed">
            {review.supervisor_comments}
          </p>
        </div>
      </Card>

      {/* Strengths */}
      {review.overall_strengths.length > 0 && (
        <Card>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-500/10 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-4">Overall Strengths</h3>
              <ul className="space-y-2">
                {review.overall_strengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Star className="w-4 h-4 text-green-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-300">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Critical Issues */}
      {review.critical_issues.length > 0 && (
        <Card>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/10 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-4">Critical Issues</h3>
              <ul className="space-y-2">
                {review.critical_issues.map((issue, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-1" />
                    <span className="text-gray-300">{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Improvement Priorities */}
      {review.improvement_priorities.length > 0 && (
        <Card>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-yellow-500/10 rounded-xl">
              <TrendingUp className="w-5 h-5 text-yellow-400" />
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-4">Improvement Priorities</h3>
              <ol className="space-y-3">
                {review.improvement_priorities.map((priority, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400 text-sm font-bold">
                      {index + 1}
                    </span>
                    <span className="text-gray-300 flex-1">{priority}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Card>
      )}

      {/* Section Breakdown */}
      <Card>
        <h3 className="text-xl font-bold text-white mb-4">Section Breakdown</h3>
        
        <div className="space-y-4">
          {review.section_reviews.map((section) => {
            const percentage = (section.marks_awarded / section.marks_possible) * 100
            
            return (
              <div key={section.section_name} className="p-4 bg-slate-800/50 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-white">{section.section_name}</h4>
                  <span className={`font-bold ${getMarksColor(percentage)}`}>
                    {section.marks_awarded}/{section.marks_possible}
                  </span>
                </div>

                <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full ${
                      percentage >= 80
                        ? 'bg-green-500'
                        : percentage >= 60
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {section.strengths.length > 0 && (
                  <div className="mb-2">
                    <p className="text-sm text-green-400 font-medium mb-1">Strengths:</p>
                    <ul className="text-sm text-gray-400 space-y-1">
                      {section.strengths.map((s, i) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {section.weaknesses.length > 0 && (
                  <div className="mb-2">
                    <p className="text-sm text-red-400 font-medium mb-1">Weaknesses:</p>
                    <ul className="text-sm text-gray-400 space-y-1">
                      {section.weaknesses.map((w, i) => (
                        <li key={i}>• {w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {section.recommendations.length > 0 && (
                  <div>
                    <p className="text-sm text-purple-400 font-medium mb-1">Recommendations:</p>
                    <ul className="text-sm text-gray-400 space-y-1">
                      {section.recommendations.map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
