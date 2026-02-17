'use client'

import { Card } from '@/components/ui/Card'
import { Database, Book, Wrench, FileText } from 'lucide-react'
import { useProjectAnalytics } from '@/hooks/useProjects'

interface SourcesViewProps {
  projectId: number
}

export function SourcesView({ projectId }: SourcesViewProps) {
  const { data: analytics, isLoading } = useProjectAnalytics(projectId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    )
  }

  if (!analytics) {
    return (
      <Card>
        <p className="text-gray-400 text-center py-8">No analytics available</p>
      </Card>
    )
  }

  const sources = [
    {
      icon: Database,
      label: 'Auto-Discovered Projects',
      value: analytics.num_auto_projects_found,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    {
      icon: FileText,
      label: 'User-Provided Projects',
      value: analytics.num_user_projects_analyzed,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
    },
    {
      icon: Book,
      label: 'Web Searches Performed',
      value: analytics.num_web_searches,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
    },
    {
      icon: Wrench,
      label: 'Review Iterations',
      value: analytics.num_iterations,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Sources Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {sources.map((source) => (
          <Card key={source.label} hover>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${source.bgColor}`}>
                <source.icon className={`w-6 h-6 ${source.color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{source.value}</div>
                <div className="text-xs text-gray-400">{source.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Word Count */}
      <Card>
        <h3 className="text-xl font-bold text-white mb-4">Word Count Analysis</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Target Word Count:</span>
            <span className="text-white font-bold">{analytics.target_word_count}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Final Word Count:</span>
            <span className="text-white font-bold">{analytics.final_word_count}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400">Accuracy:</span>
            <span className="text-green-400 font-bold">
              {Math.abs(((analytics.final_word_count - analytics.target_word_count) / analytics.target_word_count) * 100).toFixed(1)}% off target
            </span>
          </div>

          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
              style={{
                width: `${Math.min((analytics.final_word_count / analytics.target_word_count) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      </Card>

      {/* Quality Scores */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h4 className="text-lg font-bold text-white mb-4">Completeness Score</h4>
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24">
              <svg className="transform -rotate-90 w-24 h-24">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-slate-700"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - analytics.completeness_score / 100)}`}
                  className="text-green-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {analytics.completeness_score}%
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              All required sections present and properly formatted
            </p>
          </div>
        </Card>

        <Card>
          <h4 className="text-lg font-bold text-white mb-4">Novelty Score</h4>
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24">
              <svg className="transform -rotate-90 w-24 h-24">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-slate-700"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - analytics.novelty_score / 100)}`}
                  className="text-purple-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {analytics.novelty_score}%
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              Unique contributions and differentiation from existing work
            </p>
          </div>
        </Card>
      </div>

      {/* Generation Time */}
      <Card>
        <h3 className="text-xl font-bold text-white mb-4">Generation Statistics</h3>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-400 mb-2">Total Generation Time</p>
            <p className="text-3xl font-bold text-white">
              {Math.floor(analytics.total_generation_time / 60)}m {analytics.total_generation_time % 60}s
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-400 mb-2">Time per Iteration</p>
            <p className="text-3xl font-bold text-white">
              {Math.floor(analytics.total_generation_time / analytics.num_iterations / 60)}m
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
