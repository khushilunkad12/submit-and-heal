import os
from dotenv import load_dotenv
from pydantic import BaseModel
import e2b_code_interpreter

# Load environment variables to ensure E2B SDK picks up E2B_API_KEY
load_dotenv()
class VerifyResult(BaseModel):
    success: bool
    output: str
    error: str
    verified: bool
    summary: str

async def verify_fix(fix_result: dict) -> VerifyResult:
    """
    Runs the patched code in an E2B secure sandbox to verify it works.
    """
    api_key = os.getenv("E2B_API_KEY")
    if not api_key:
        return VerifyResult(
            success=False,
            output="",
            error="",
            verified=False,
            summary="Verification failed: E2B_API_KEY not found in environment."
        )

    patched_files = fix_result.get("patched_files", [])
    if not patched_files:
        return VerifyResult(
            success=False,
            output="",
            error="",
            verified=False,
            summary="No patched files to verify."
        )

    # The target execution file is assumed to be the first one in the list for now
    target_file = patched_files[0]
    entry_file_path = target_file.get("file_path", "")
    extension = os.path.splitext(entry_file_path)[1].lower()

    try:
        if extension in [".py", ".js", ".ts"]:
            with e2b_code_interpreter.Sandbox.create() as sandbox:
                # Write all patched files to the sandbox so relative imports work
                for pf in patched_files:
                    fpath = pf.get("file_path", "")
                    fcontent = pf.get("patched_content", "")
                    if fpath and fcontent:
                        # Ensure directory exists in the sandbox
                        dir_name = os.path.dirname(fpath)
                        if dir_name:
                            sandbox.commands.run(f"mkdir -p {dir_name}")
                        # Write the file
                        sandbox.files.write(fpath, fcontent)

                # Run the entry file
                if extension == ".py":
                    patched_content = target_file.get("patched_content", "")
                    execution = sandbox.run_code(patched_content)

                    # Capture stdout correctly
                    output = ""
                    if execution.logs.stdout:
                        output = "\\n".join(execution.logs.stdout)
                    elif hasattr(execution, 'text') and execution.text:
                        output = execution.text
                        
                    # Capture stderr correctly  
                    error = ""
                    if execution.logs.stderr:
                        error = "\\n".join(execution.logs.stderr)
                    if execution.error:
                        if error:
                            error += "\\n"
                        error += f"{execution.error.name}: {execution.error.value}\\n{execution.error.traceback}"

                    if error:
                        return VerifyResult(
                            success=False,
                            output=output,
                            error=error,
                            verified=False,
                            summary="Code execution failed with errors."
                        )
                    else:
                        return VerifyResult(
                            success=True,
                            output=output or "Code executed successfully (no output).",
                            error="",
                            verified=True,
                            summary="Code verified successfully in Python sandbox."
                        )
                else:
                    result = sandbox.commands.run(f"node {entry_file_path}")

                    if result.exit_code != 0:
                        return VerifyResult(
                            success=False,
                            output=result.stdout,
                            error=result.stderr,
                            verified=False,
                            summary="Code execution failed with errors."
                        )
                    else:
                        return VerifyResult(
                            success=True,
                            output=result.stdout or "Code executed successfully (no output).",
                            error="",
                            verified=True,
                            summary="Code verified successfully in Node.js sandbox."
                        )
        elif extension == ".java":
            return VerifyResult(
                success=False,
                output="",
                error="",
                verified=False,
                summary="Java verification coming soon"
            )
        else:
            return VerifyResult(
                success=False,
                output="",
                error="",
                verified=False,
                summary=f"Auto-verification not available for {extension} files"
            )
    except Exception as e:
        print(f"Verify agent failed: {e}")
        return VerifyResult(
            success=False,
            output="",
            error="",
            verified=False,
            summary=f"Sandbox verification failed due to internal error: {str(e)}"
        )
