// types/index.ts — UPDATED v2
// Added: dataset fields, step-3 answer fields, track type

export type AcademicLevel     = 'BSc' | 'MSc' | 'PhD'
export type EffortLevel       = 'low' | 'medium' | 'high'
export type PastProjectsMode  = 'user_provided' | 'auto_discover' | 'hybrid'
export type DatasetSource     = 'uploaded' | 'public' | 'scout' | 'self_collected'
export type DataSensitivity   = 'public' | 'self_collected' | 'sensitive'
export type ProjectTrack      = 'A' | 'B'

export type ProjectStatus =
  | 'draft' | 'queued' | 'generating' | 'reviewing' | 'complete' | 'failed'

// ── User (mirrors backend UserResponse) ───────────────────────────────────────

export interface User {
  id:             number
  email:          string
  full_name:      string
  email_verified: boolean
  created_at?:    string
  auth_provider?: 'google' | 'email'
}

// ── Config sent to /research/generate ─────────────────────────────────────────

export interface GenerationConfig {
  // Step 1
  field_of_study:   string
  research_topic?:  string
  academic_level:   AcademicLevel
  effort_level:     EffortLevel

  // Step 2 — dataset
  dataset_source:       DatasetSource
  dataset_name?:        string
  dataset_url?:         string
  dataset_description?: string
  dataset_size?:        string

  // Step 3 — Track A
  data_sensitivity:          DataSensitivity
  student_success_statement?: string

  // Step 3 — Track B
  theoretical_framework?: string
  central_argument?:      string
  primary_source_focus?:  string

  // Configure
  past_projects_mode:          PastProjectsMode
  num_auto_projects_target?:   number
  min_auto_projects_required?: number
  max_auto_projects_accepted?: number
  deduplicate_auto_vs_user?:   boolean
  max_iterations?:             number
  num_web_searches?:           number
  notification_email?:         string
}

// ── Project (DB row) ──────────────────────────────────────────────────────────

export interface Project {
  id:                  number
  user_id:             number
  field_of_study:      string
  research_topic:      string
  academic_level:      AcademicLevel
  effort_level:        EffortLevel
  status:              ProjectStatus
  progress_percentage: number
  current_phase:       string
  created_at:          string
  updated_at:          string
  completed_at?:       string
  started_at?:         string
}

// ── Specification ─────────────────────────────────────────────────────────────

export interface SpecificationSection {
  section_name: string
  content:      string
  word_count:   number
}

export interface ProjectSpecification {
  project_title:          string
  abstract:               SpecificationSection
  justification_and_aim:  SpecificationSection
  objectives:             SpecificationSection
  literature_review:      SpecificationSection
  methodology:            SpecificationSection
  work_plan:              SpecificationSection
  references:             string[]
  total_word_count:       number
}

// ── Review ────────────────────────────────────────────────────────────────────

export interface SectionReview {
  section_name:    string
  marks:           number
  max_marks:       number
  strengths:       string[]
  weaknesses:      string[]
  recommendations: string[]
}

export interface OverallReview {
  total_marks:          number
  decision:             'APPROVED' | 'REVISIONS REQUIRED' | 'MAJOR REVISIONS' | 'REJECTED'
  section_reviews:      SectionReview[]
  overall_strengths:    string[]
  critical_issues:      string[]
  improvement_priorities: string[]
  supervisor_comments:  string
}

// ── API responses ─────────────────────────────────────────────────────────────

export interface GenerateResponse {
  success:    boolean
  project_id: number
  message:    string
  status:     string
}

export interface StatusResponse {
  project_id:          number
  status:              ProjectStatus
  progress_percentage: number
  current_phase:       string
  is_complete:         boolean
}

export interface ResultResponse {
  success:       boolean
  project_id:    number
  specification: ProjectSpecification
  review:        OverallReview
  word_count:    number
  marks:         number
  decision:      string
  track:         ProjectTrack
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface ProjectAnalytics {
  project_id:                  number
  num_iterations:              number
  num_web_searches:            number
  num_auto_projects_found:     number
  num_user_projects_analyzed:  number
  final_word_count:            number
  target_word_count:           number
  total_generation_time:       number
  completeness_score:          number
  novelty_score:               number
}

export interface UserStats {
  total_projects:                  number
  status_breakdown:                Record<ProjectStatus, number>
  completed_projects:              number
  average_marks:                   number
  total_generation_time_seconds:   number
  total_generation_time_hours:     number
  has_own_api_key:                 boolean
  free_topic_credit_used:          boolean
  free_spec_credit_used:           boolean
}

export interface ApiResponse<T = any> {
  success: boolean
  data?:   T
  error?:  string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  skip:  number
  limit: number
}
