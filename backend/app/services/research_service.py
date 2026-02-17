"""
Research Service

Purpose: Orchestrates specification generation workflow
Why: Main business logic that coordinates pipelines, adapters, and state
"""

from typing import Optional, Dict, List
from docx import Document
from datetime import datetime

from app.models.config import SpecificationConfig
# from app.models.database import Project, ProjectResult, ProjectAnalytics
# from app.core.domain.project import ProjectLifecycle, ProjectStatus
from app.models.database import Project, ProjectResult, ProjectAnalytics, ProjectStatus
from app.core.domain.project import ProjectLifecycle, ProjectStatus as DomainProjectStatus
from app.core.pipelines.main_pipeline import run_complete_specification_system
from app.adapters.storage_adapter import get_storage_adapter
from app.adapters.email_adapter import get_email_adapter


class ResearchService:
    """
    Service for research specification generation
    Coordinates entire generation workflow
    """
    
    def __init__(self):
        self.storage = get_storage_adapter()
        self.email = get_email_adapter()
    
    async def create_project(
        self,
        user_id: int,
        config: SpecificationConfig,
        guidelines_file_path: str,
        past_project_files: Optional[List[str]] = None,
        db_session = None
    ) -> Project:
        """
        Create new research project
        
        Args:
            user_id: User ID
            config: Specification config
            guidelines_file_path: Path to guidelines .docx
            past_project_files: Optional past project files
            db_session: Database session
            
        Returns:
            Created Project instance
        """
        
        # Create project in database
        project = Project(
            user_id=user_id,
            field_of_study=config.field_of_study,
            research_topic=config.research_topic,
            academic_level=config.academic_level,
            effort_level=config.effort_level,
            past_projects_mode=config.past_projects_mode,
            status=ProjectStatus.DRAFT,
            guidelines_file_path=guidelines_file_path,
            user_dumps_paths=past_project_files or []
        )
        
        if db_session:
            db_session.add(project)
            db_session.commit()
            db_session.refresh(project)
        
        return project
    
    async def start_generation(
        self,
        project: Project,
        config: SpecificationConfig,
        db_session = None
    ) -> Dict:
        """
        Start specification generation
        
        Args:
            project: Project instance
            config: Specification config
            db_session: Database session
            
        Returns:
            Generation result dict
        """
        
        # Initialize lifecycle
        # lifecycle = ProjectLifecycle(ProjectStatus.DRAFT)
        # lifecycle.transition_to(ProjectStatus.QUEUED, "User initiated generation")
        lifecycle = ProjectLifecycle(DomainProjectStatus.DRAFT)
        lifecycle.transition_to(DomainProjectStatus.QUEUED, "User initiated generation")
        
        # Update project status
        project.status = ProjectStatus.QUEUED
        project.started_at = datetime.utcnow()
        if db_session:
            db_session.commit()
        
        try:
            # Transition to generating
            # lifecycle.transition_to(ProjectStatus.GENERATING, "Starting main pipeline")
            lifecycle.transition_to(DomainProjectStatus.GENERATING, "Starting main pipeline")
            project.status = ProjectStatus.GENERATING
            project.progress_percentage = 10
            if db_session:
                db_session.commit()
            
            # Load guidelines document
            guidelines_doc = Document(project.guidelines_file_path)
            
            # Run main pipeline
            start_time = datetime.utcnow()
            
            results = await run_complete_specification_system(
                config=config,
                guidelines_file=guidelines_doc,
                past_project_files=project.user_dumps_paths
            )
            
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            # Transition to complete
            # lifecycle.transition_to(ProjectStatus.COMPLETE, "Generation successful")
            lifecycle.transition_to(DomainProjectStatus.COMPLETE, "Generation successful")
            project.status = ProjectStatus.COMPLETE
            project.progress_percentage = 100
            project.completed_at = datetime.utcnow()
            
            # Save results
            result = await self._save_results(
                project=project,
                results=results,
                db_session=db_session
            )
            
            # Save analytics
            await self._save_analytics(
                project=project,
                results=results,
                duration=duration,
                config=config,
                db_session=db_session
            )
            
            # Send email if configured
            if config.notification_email:
                await self.email.send_specification_email(
                    to=config.notification_email,
                    project_title=results['topic'],
                    specification_html=self._format_specification_html(
                        results['specification_results']['final_specification']
                    ),
                    marks=results['specification_results']['final_review'].total_marks,
                    decision=results['specification_results']['final_review'].decision
                )
            
            if db_session:
                db_session.commit()
            
            return {
                "success": True,
                "project_id": project.id,
                "result_id": result.id if result else None,
                "duration_seconds": duration,
                "status": "complete"
            }
        
        except Exception as e:
            # Transition to failed
            # lifecycle.transition_to(ProjectStatus.FAILED, f"Error: {str(e)}")
            lifecycle.transition_to(DomainProjectStatus.FAILED, f"Error: {str(e)}")
            project.status = ProjectStatus.FAILED
            if db_session:
                db_session.commit()
            
            return {
                "success": False,
                "error": str(e),
                "project_id": project.id,
                "status": "failed"
            }
    
    async def _save_results(
        self,
        project: Project,
        results: Dict,
        db_session = None
    ) -> Optional[ProjectResult]:
        """Save generation results to database"""
        
        try:
            spec_results = results['specification_results']
            
            result = ProjectResult(
                specification_json=spec_results['final_specification'].model_dump(),
                synthesis_json=results.get('strategic_synthesis', {}).model_dump() if results.get('strategic_synthesis') else None,
                final_review_json=spec_results['final_review'].model_dump(),
                total_marks=spec_results['final_review'].total_marks,
                decision=spec_results['final_review'].decision,
                discovered_resources_json=results.get('discovered_resources', {}).model_dump() if results.get('discovered_resources') else None,
                generated_at=datetime.utcnow()
            )
            
            if db_session:
                db_session.add(result)
                db_session.commit()
                db_session.refresh(result)
                
                # Link to project
                project.result_id = result.id
                db_session.commit()
            
            return result
        
        except Exception as e:
            print(f"Error saving results: {e}")
            return None
    
    async def _save_analytics(
        self,
        project: Project,
        results: Dict,
        duration: float,
        config: SpecificationConfig,
        db_session = None
    ):
        """Save analytics data"""
        
        try:
            spec_results = results['specification_results']
            spec = spec_results['final_specification']
            
            analytics = ProjectAnalytics(
                project_id=project.id,
                num_iterations=spec_results['iterations_completed'],
                num_web_searches=config.num_web_searches,
                num_auto_projects_found=results['input_sources']['stream_stats']['auto_discovered_count'],
                num_user_projects_analyzed=results['input_sources']['stream_stats']['user_provided_count'],
                final_word_count=spec.total_word_count,
                target_word_count=results.get('guidelines').target_word_count if results.get('guidelines') else None,
                total_generation_time=int(duration),
                completeness_score=100,  # Calculate properly
                novelty_score=85  # Calculate properly
            )
            
            if db_session:
                db_session.add(analytics)
                db_session.commit()
        
        except Exception as e:
            print(f"Error saving analytics: {e}")
    
    def _format_specification_html(self, spec) -> str:
        """Format specification as HTML for email"""
        
        html = f"""
<div style="font-family: sans-serif;">
    <h1>{spec.project_title}</h1>
    
    <h2>Abstract</h2>
    <p>{spec.abstract.content}</p>
    
    <h2>Justification and Overall Aim</h2>
    <p>{spec.justification_and_aim.content}</p>
    
    <h2>Objectives</h2>
    <p>{spec.objectives.content}</p>
    
    <h2>Review of Literature</h2>
    <p>{spec.literature_review.content}</p>
    
    <h2>Methodology</h2>
    <p>{spec.methodology.content}</p>
    
    <h2>Work Plan</h2>
    <p>{spec.work_plan.content}</p>
    
    <h2>References</h2>
    <ol>
        {''.join(f'<li>{ref}</li>' for ref in spec.references)}
    </ol>
</div>
"""
        return html
    
    async def get_project_status(
        self,
        project_id: int,
        db_session = None
    ) -> Dict:
        """
        Get project status
        
        Args:
            project_id: Project ID
            db_session: Database session
            
        Returns:
            Status dict
        """
        
        if db_session:
            project = db_session.query(Project).filter(Project.id == project_id).first()
            if not project:
                return {"error": "Project not found"}
            
            lifecycle = ProjectLifecycle(project.status)
            
            return {
                "project_id": project.id,
                "status": project.status.value,
                "progress_percentage": project.progress_percentage,
                "current_phase": lifecycle.get_phase_description(),
                "is_complete": lifecycle.is_terminal(),
                "created_at": project.created_at.isoformat(),
                "started_at": project.started_at.isoformat() if project.started_at else None,
                "completed_at": project.completed_at.isoformat() if project.completed_at else None
            }
        
        return {"error": "Database session required"}
    
    async def get_project_results(
        self,
        project_id: int,
        db_session = None
    ) -> Optional[Dict]:
        """
        Get project results
        
        Args:
            project_id: Project ID
            db_session: Database session
            
        Returns:
            Results dict or None
        """
        
        if db_session:
            project = db_session.query(Project).filter(Project.id == project_id).first()
            if not project or not project.result:
                return None
            
            return {
                "specification": project.result.specification_json,
                "synthesis": project.result.synthesis_json,
                "review": project.result.final_review_json,
                "total_marks": project.result.total_marks,
                "decision": project.result.decision
            }
        
        return None
