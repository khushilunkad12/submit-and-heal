import os
import json
from pydantic import BaseModel
from google import genai
from google.genai import types

class PatchedFile(BaseModel):
    file_path: str
    original_content: str
    patched_content: str
    explanation: str

class FixResult(BaseModel):
    patched_files: list[PatchedFile]
    patch_summary: str
    confidence: str

async def generate_fix(repo_path: str, diagnosis: dict) -> FixResult:
    """
    Calls the Gemini API to generate a fix based on the diagnosis and actual file contents.
    """
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return FixResult(
                patched_files=[],
                patch_summary="Fix generation failed: GEMINI_API_KEY not found.",
                confidence="low"
            )

        client = genai.Client(api_key=api_key)

        root_cause = diagnosis.get("root_cause", "")
        fix_direction = diagnosis.get("fix_direction", "")
        affected_files = diagnosis.get("affected_files", [])

        # Read actual file contents
        files_content_str = ""
        for file_rel_path in affected_files:
            file_abs_path = os.path.join(repo_path, file_rel_path)
            if os.path.isfile(file_abs_path):
                try:
                    with open(file_abs_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        files_content_str += f"\n--- {file_rel_path} ---\n{content}\n"
                except Exception as e:
                    files_content_str += f"\n--- {file_rel_path} ---\nCould not read file: {e}\n"

        prompt = f"""You are an expert AI software engineer.
Analyze the following diagnosis and the provided code to generate a complete fixed version of the affected files.

Diagnosis Root Cause:
{root_cause}

Recommended Fix Direction:
{fix_direction}

Affected Files Original Content:
{files_content_str}

Instruction:
Analyze the code carefully and generate a complete fixed version.
Return the COMPLETE fixed file content in patched_content, not just the changed lines.
Your response MUST be ONLY valid JSON matching this exact structure:
{{
  "patched_files": [
    {{
      "file_path": "path/to/file",
      "original_content": "exact original file content as provided to you",
      "patched_content": "the COMPLETE fixed file content, not just the diff",
      "explanation": "plain English explanation of what was changed in this file"
    }}
  ],
  "patch_summary": "overall summary of all changes made",
  "confidence": "high" // or "medium" or "low"
}}
Do not include any preamble, markdown formatting (like ```json), or trailing text. Return ONLY the raw JSON object.
"""

        response = await client.aio.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
                max_output_tokens=4096,
            )
        )

        response_text = response.text.strip()
        
        # Fallback cleanup just in case the LLM outputs markdown
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]

        parsed_json = json.loads(response_text)
        
        return FixResult(**parsed_json)
        
    except Exception as e:
        print(f"Fix agent failed: {e}")
        return FixResult(
            patched_files=[],
            patch_summary=f"Fix generation failed due to an internal error: {str(e)}",
            confidence="low"
        )
