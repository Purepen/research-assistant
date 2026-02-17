"""
Save Package Utility

Purpose: Package and save complete results to disk
"""

import json
import os
from datetime import datetime
from typing import Any


def save_complete_package(final_results: dict, output_dir: str = "output") -> str:
    """
    Save complete specification results to disk
    
    Args:
        final_results: Complete results dictionary
        output_dir: Output directory path
        
    Returns:
        Path to saved package
    """
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate timestamp-based filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    package_name = f"specification_{timestamp}"
    package_dir = os.path.join(output_dir, package_name)
    os.makedirs(package_dir, exist_ok=True)
    
    try:
        # Save JSON results (excluding non-serializable objects)
        json_safe_results = {}
        for key, value in final_results.items():
            try:
                # Test serializability
                json.dumps({key: value})
                json_safe_results[key] = value
            except (TypeError, ValueError):
                # Skip non-serializable
                print(f"   ⚠️ Skipping non-serializable: {key}")
                pass
        
        json_path = os.path.join(package_dir, "results.json")
        with open(json_path, 'w') as f:
            json.dump(json_safe_results, f, indent=2, default=str)
        
        print(f"   ✓ Saved JSON: {json_path}")
        
        # Save specification as text
        if "specification_results" in final_results:
            spec_results = final_results["specification_results"]
            if "final_specification" in spec_results:
                spec = spec_results["final_specification"]
                
                text_path = os.path.join(package_dir, "specification.txt")
                with open(text_path, 'w') as f:
                    f.write(f"PROJECT TITLE: {spec.project_title}\n\n")
                    f.write(f"ABSTRACT\n{'='*80}\n{spec.abstract.content}\n\n")
                    f.write(f"JUSTIFICATION\n{'='*80}\n{spec.justification_and_aim.content}\n\n")
                    f.write(f"OBJECTIVES\n{'='*80}\n{spec.objectives.content}\n\n")
                    f.write(f"LITERATURE REVIEW\n{'='*80}\n{spec.literature_review.content}\n\n")
                    f.write(f"METHODOLOGY\n{'='*80}\n{spec.methodology.content}\n\n")
                    f.write(f"WORK PLAN\n{'='*80}\n{spec.work_plan.content}\n\n")
                    f.write(f"REFERENCES\n{'='*80}\n")
                    for ref in spec.references:
                        f.write(f"{ref}\n")
                
                print(f"   ✓ Saved specification: {text_path}")
        
        print(f"\n✅ Package saved to: {package_dir}")
        return package_dir
        
    except Exception as e:
        print(f"❌ Error saving package: {e}")
        import traceback
        traceback.print_exc()
        return package_dir
