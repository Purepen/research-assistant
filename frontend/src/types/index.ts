/**
 * TypeScript Type Definitions
 * 
 * Shared types across the application
 */

// User types
export interface User {
  id: number
  email: string
  full_name: string
  created_at: string
  picture?: string
}

// Project types
export type ProjectStatus = 
  | 'draft' 
  | 'queued' 
  | 'generating' 
  | 'reviewing' 
  | 'complete' 
  | 'failed'

export type AcademicLevel = 'BSc' | 'MSc' | 'PhD'
export type EffortLevel = 'low' | 'medium' | 'high'
export type PastProjectsMode = 'user_provided' | 'auto_discover' | 'hybrid'

export interface Project {
  id: number
  field_of_study: string
  research_topic?: string
  academic_level: AcademicLevel
  effort_level: EffortLevel
  past_projects_mode: PastProjectsMode
  status: ProjectStatus
  progress_percentage: number
  current_phase?: string
  created_at: string
  started_at?: string
  completed_at?: string
  has_results: boolean
  total_marks?: number
  decision?: string
}

export interface ProjectListItem {
  id: number
  field_of_study: string
  research_topic?: string
  academic_level: AcademicLevel
  status: ProjectStatus
  progress_percentage: number
  created_at: string
  completed_at?: string
  total_marks?: number
  decision?: string
}

// Specification types
export interface SpecificationSection {
  section_name: string
  content: string
  word_count: number
  key_points: string[]
}

export interface Specification {
  project_title: string
  abstract: SpecificationSection
  justification_and_aim: SpecificationSection
  objectives: SpecificationSection
  literature_review: SpecificationSection
  methodology: SpecificationSection
  work_plan: SpecificationSection
  references: string[]
  total_word_count: number
}

// Review types
export interface SectionReview {
  section_name: string
  marks_awarded: number
  marks_possible: number
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
}

export interface Review {
  decision: 'APPROVED' | 'REVISIONS REQUIRED' | 'MAJOR REVISIONS'
  total_marks: number
  section_reviews: SectionReview[]
  overall_strengths: string[]
  critical_issues: string[]
  improvement_priorities: string[]
  supervisor_comments: string
}

// Generation config types
export interface GenerationConfig {
  field_of_study: string
  research_topic?: string
  academic_level: AcademicLevel
  effort_level: EffortLevel
  past_projects_mode: PastProjectsMode
  num_auto_projects_target?: number
  min_auto_projects_required?: number
  max_auto_projects_accepted?: number
  deduplicate_auto_vs_user?: boolean
  max_iterations?: number
  num_web_searches?: number
  notification_email?: string
}

// Analytics types
export interface ProjectAnalytics {
  project_id: number
  num_iterations: number
  num_web_searches: number
  num_auto_projects_found: number
  num_user_projects_analyzed: number
  final_word_count: number
  target_word_count: number
  total_generation_time: number
  completeness_score: number
  novelty_score: number
}

// User stats types
export interface UserStats {
  total_projects: number
  status_breakdown: Record<ProjectStatus, number>
  completed_projects: number
  average_marks: number
  total_generation_time_seconds: number
  total_generation_time_hours: number
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  skip: number
  limit: number
}

// Form types
export interface SignInFormData {
  id_token: string
}

export interface GenerationFormData {
  config: GenerationConfig
  guidelines_file: File
  past_project_files?: File[]
}
