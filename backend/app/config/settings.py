"""
Configuration Management System
Loads config from YAML files and environment variables
"""
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
from typing import Optional, Literal, Dict, Any
from pathlib import Path
import yaml
import os


class LLMProviderConfig(BaseModel):
    """LLM provider configuration"""
    provider: Literal["anthropic", "openai"] = "anthropic"
    model: str = "claude-sonnet-4-20250514"
    api_key_env: str = "ANTHROPIC_API_KEY"
    temperature: float = 0.7
    max_tokens: int = 4000


class WebSearchConfig(BaseModel):
    """Web search configuration"""
    enabled: bool = True
    max_queries: int = 5
    timeout_seconds: int = 30


class AutoDiscoveryConfig(BaseModel):
    """Auto-discovery configuration"""
    enabled: bool = True
    target_projects: int = 3
    min_required: int = 1
    max_accepted: int = 3
    quality_threshold: float = 0.7


class ReviewConfig(BaseModel):
    """Review and iteration configuration"""
    max_iterations: int = 3
    auto_approve_threshold: int = 85
    min_passing_score: int = 70


class FeatureFlagsConfig(BaseModel):
    """Feature flags for gradual rollout"""
    email_notifications: bool = True
    deep_research: bool = True
    parallel_agents: bool = False
    user_dumps_analysis: bool = True
    deduplication: bool = True


class ResearchConfig(BaseModel):
    """Research pipeline configuration"""
    web_search: WebSearchConfig = Field(default_factory=WebSearchConfig)
    auto_discovery: AutoDiscoveryConfig = Field(default_factory=AutoDiscoveryConfig)
    review: ReviewConfig = Field(default_factory=ReviewConfig)
    features: FeatureFlagsConfig = Field(default_factory=FeatureFlagsConfig)


class DatabaseConfig(BaseModel):
    """Database configuration"""
    url: str = "postgresql://localhost/research_assistant"
    pool_size: int = 5
    echo: bool = False


class StorageConfig(BaseModel):
    """File storage configuration"""
    provider: Literal["local", "s3", "vercel_blob"] = "local"
    local_path: str = "./output"
    bucket_name: Optional[str] = None


class EmailConfig(BaseModel):
    """Email provider configuration"""
    provider: Literal["resend", "sendgrid"] = "resend"
    api_key_env: str = "RESEND_API_KEY"
    from_email: str = "Research Assistant <onboarding@resend.dev>"


class Settings(BaseSettings):
    """
    Main application settings
    Loads from environment variables and YAML config
    """
    # Environment
    env: Literal["dev", "prod", "test"] = "dev"
    debug: bool = True
    
    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_prefix: str = "/api/v1"
    
    # Security
    secret_key: str = "your-secret-key-change-in-production"
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    
    # Providers
    llm: LLMProviderConfig = Field(default_factory=LLMProviderConfig)
    database: DatabaseConfig = Field(default_factory=DatabaseConfig)
    storage: StorageConfig = Field(default_factory=StorageConfig)
    email: EmailConfig = Field(default_factory=EmailConfig)
    
    # Research configuration
    research: ResearchConfig = Field(default_factory=ResearchConfig)
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "json"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields from .env


def load_yaml_config(env: str = "dev") -> Dict[str, Any]:
    """
    Load configuration from YAML file
    
    Args:
        env: Environment name (dev, prod, test)
        
    Returns:
        Configuration dictionary
    """
    config_dir = Path(__file__).parent.parent.parent.parent / "config"
    
    # Load default config
    default_file = config_dir / "default.yaml"
    config = {}
    
    if default_file.exists():
        with open(default_file, 'r') as f:
            config = yaml.safe_load(f) or {}
    
    # Override with environment-specific config
    env_file = config_dir / f"{env}.yaml"
    if env_file.exists():
        with open(env_file, 'r') as f:
            env_config = yaml.safe_load(f) or {}
            # Deep merge
            config = deep_merge(config, env_config)
    
    return config


def deep_merge(base: Dict, override: Dict) -> Dict:
    """
    Deep merge two dictionaries
    
    Args:
        base: Base dictionary
        override: Dictionary to merge into base
        
    Returns:
        Merged dictionary
    """
    result = base.copy()
    
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    
    return result


def get_settings(env: Optional[str] = None) -> Settings:
    """
    Get application settings
    
    Args:
        env: Environment name (dev, prod, test). If None, uses ENV environment variable.
        
    Returns:
        Settings instance
    """
    if env is None:
        env = os.getenv("ENV", "dev")
    
    # Load YAML config
    yaml_config = load_yaml_config(env)
    
    # Merge with environment variables
    settings = Settings(env=env, **yaml_config)
    
    return settings


# Global settings instance
settings = get_settings()