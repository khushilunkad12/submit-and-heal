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
        if extension in [".py", ".js", ".ts", ".java"]:
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
                elif extension in [".js", ".ts"]:
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
                    filename_full = os.path.basename(entry_file_path)
                    classname = os.path.splitext(filename_full)[0]
                    dir_name = os.path.dirname(entry_file_path)
                    
                    # 1. Compile
                    compile_script = f"import subprocess; r = subprocess.run(['javac', '{filename_full}'], cwd='{dir_name or '.'}', capture_output=True, text=True); print(r.stdout); print(r.stderr)"
                    compile_result = sandbox.run_code(compile_script)
                    
                    compile_error = ""
                    if compile_result.logs.stderr:
                        compile_error = "\\n".join(compile_result.logs.stderr)
                    if compile_result.error:
                        compile_error += f"\\n{compile_result.error.name}: {compile_result.error.value}"
                        
                    if compile_error.strip():
                        return VerifyResult(
                            success=False,
                            output="",
                            error="Compilation failed:\\n" + compile_error,
                            verified=False,
                            summary="Fixed code failed to compile"
                        )
                        
                    # 2. Run
                    run_script = f"import subprocess; r = subprocess.run(['java', '{classname}'], cwd='{dir_name or '.'}', capture_output=True, text=True); print(r.stdout); print(r.stderr)"
                    run_result = sandbox.run_code(run_script)
                    
                    output = "\\n".join(run_result.logs.stdout) if run_result.logs.stdout else ""
                    error = "\\n".join(run_result.logs.stderr) if run_result.logs.stderr else ""
                    
                    if run_result.error:
                        if error:
                            error += "\\n"
                        error += f"{run_result.error.name}: {run_result.error.value}\\n{run_result.error.traceback}"
                        
                    if error.strip():
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
                            summary="Code verified successfully in Java sandbox."
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
