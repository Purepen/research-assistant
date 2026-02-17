"""
OpenAI Adapter

Purpose: Abstract OpenAI SDK (used by agents library)
Why: Can swap to different providers or mock for testing
"""

import os
from typing import Optional, Dict, Any
import openai


class OpenAIAdapter:
    """
    Adapter for OpenAI API
    Used by the agents library under the hood
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize OpenAI adapter
        
        Args:
            api_key: OpenAI API key (defaults to env var)
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key not provided")
        
        openai.api_key = self.api_key
        self._client = openai.OpenAI(api_key=self.api_key)
    
    def get_client(self):
        """Get OpenAI client instance"""
        return self._client
    
    def chat_completion(
        self,
        messages: list,
        model: str = "gpt-4o",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create chat completion
        
        Args:
            messages: List of message dicts
            model: Model name
            temperature: Temperature (0-2)
            max_tokens: Max tokens to generate
            **kwargs: Additional OpenAI params
            
        Returns:
            Completion response dict
        """
        try:
            response = self._client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )
            
            return {
                "success": True,
                "content": response.choices[0].message.content,
                "model": response.model,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                },
                "finish_reason": response.choices[0].finish_reason
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def create_embedding(
        self,
        text: str,
        model: str = "text-embedding-3-small"
    ) -> Dict[str, Any]:
        """
        Create text embedding
        
        Args:
            text: Text to embed
            model: Embedding model
            
        Returns:
            Embedding response dict
        """
        try:
            response = self._client.embeddings.create(
                input=text,
                model=model
            )
            
            return {
                "success": True,
                "embedding": response.data[0].embedding,
                "model": response.model,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "total_tokens": response.usage.total_tokens
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def moderate_content(self, text: str) -> Dict[str, Any]:
        """
        Check content with moderation API
        
        Args:
            text: Text to moderate
            
        Returns:
            Moderation result dict
        """
        try:
            response = self._client.moderations.create(input=text)
            result = response.results[0]
            
            return {
                "success": True,
                "flagged": result.flagged,
                "categories": result.categories.model_dump(),
                "category_scores": result.category_scores.model_dump()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def test_connection(self) -> bool:
        """
        Test if API connection works
        
        Returns:
            True if connection successful
        """
        try:
            response = self._client.models.list()
            return True
        except Exception as e:
            print(f"OpenAI connection test failed: {e}")
            return False
    
    def get_model_info(self, model: str = "gpt-4o") -> Dict[str, Any]:
        """
        Get model information
        
        Args:
            model: Model name
            
        Returns:
            Model info dict
        """
        try:
            response = self._client.models.retrieve(model)
            return {
                "success": True,
                "id": response.id,
                "created": response.created,
                "owned_by": response.owned_by
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


# Singleton instance
_openai_adapter: Optional[OpenAIAdapter] = None


def get_openai_adapter() -> OpenAIAdapter:
    """Get singleton OpenAI adapter instance"""
    global _openai_adapter
    if _openai_adapter is None:
        _openai_adapter = OpenAIAdapter()
    return _openai_adapter
