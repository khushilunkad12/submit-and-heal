import os
import json
from pydantic import BaseModel
from google import genai
from google.genai import types

class DiagnosisResult(BaseModel):
    root_cause: str
    affected_files: list[str]
    confidence: str
    fix_direction: str
    error_category: str

async def diagnose(repo_info: dict, error_description: str) -> DiagnosisResult:
    """
    Calls the Gemini API to diagnose the error based on repo info and user description.
    """
    try:
        # Check API key
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return DiagnosisResult(
                root_cause="Diagnosis failed: GEMINI_API_KEY not found in environment.",
                affected_files=[],
                confidence="low",
                fix_direction="Check the backend .env file and ensure the API key is set.",
                error_category="config_error"
            )

        client = genai.Client(api_key=api_key)
        
        # Build prompt context
        detected_stack = repo_info.get("detected_stack", "Unknown")
        file_list = repo_info.get("file_list", [])
        readme_preview = repo_info.get("readme_preview") or "No README provided."
        
        # Truncate file list to first 50 files
        truncated_files = file_list[:50]
        files_str = "\n".join(truncated_files)
        
        prompt = f"""You are an expert AI software diagnostician.
Analyze the following repository information and the user's error description to provide a diagnosis.

IMPORTANT: Always analyze the actual code content first. 
The user's error description may be inaccurate or incomplete. 
Your diagnosis must be based primarily on what you see in the code, 
not just what the user described.

Follow this reasoning order:
1. FIRST: Analyze the actual code files and file structure provided to identify what bugs genuinely exist in the code.
2. SECOND: Check if the user's error description matches what you found in the code.
3. If they MATCH: Diagnose normally with high confidence.
4. If they DON'T MATCH: Trust the code analysis, not the user's description. Set confidence to "medium" and mention in root_cause that the described error doesn't match the actual code issue found (e.g. "The described error does not match the actual bug found in the code: [real bug explanation here]").
5. If the code files are too vague to analyze: Then fall back to the user's error description with low confidence.

Detected Stack: {detected_stack}

User Error Description:
{error_description}

First 50 Files in Repository:
{files_str}

README Preview:
{readme_preview}

IMPORTANT: Always analyze the actual code content first. 
The user's error description may be inaccurate or incomplete. 
Your diagnosis must be based primarily on what you see in the code, 
not just what the user described.

Follow this reasoning order:
1. FIRST: Analyze the actual code files and file structure provided to identify what bugs genuinely exist in the code
2. SECOND: Check if the user's error description matches what you found in the code
3. If they MATCH: Diagnose normally with high confidence
4. If they DON'T MATCH: Trust the code analysis, not the user's description. Set confidence to "medium" and mention in root_cause that the described error doesn't match the actual code issue found.
5. If the code files are too vague to analyze: Then fall back to the user's error description with low confidence

Based on this limited information, provide a diagnosis.
Your response MUST be ONLY valid JSON matching this exact structure:
{{
  "root_cause": "plain English explanation of what's broken",
  "affected_files": ["file1.js", "file2.py"],
  "confidence": "high", // or "medium" or "low"
  "fix_direction": "what kind of fix is needed, in plain English",
  "error_category": "runtime_error" // e.g. "runtime_error", "config_error", "dependency_error", "logic_error", "network_error"
}}
Do not include any preamble, markdown formatting (like ```json), or trailing text. Return ONLY the raw JSON object.
"""

        # Using gemini-3.1-flash-lite
        response = await client.aio.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
                max_output_tokens=1024,
            )
        )
        
        # Parse the JSON response
        response_text = response.text.strip()
        
        # Fallback cleanup just in case the LLM outputs markdown
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
            
        parsed_json = json.loads(response_text)
        
        return DiagnosisResult(**parsed_json)
        
    except Exception as e:
        # Fallback if API fails or parsing fails
        print(f"Diagnosis agent failed: {e}")
        return DiagnosisResult(
            root_cause=f"AI Diagnosis failed due to an internal error: {str(e)}",
            affected_files=[],
            confidence="low",
            fix_direction="Check the backend logs for detailed error trace.",
            error_category="config_error"
        )
