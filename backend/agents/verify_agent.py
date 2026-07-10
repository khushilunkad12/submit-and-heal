import os
from dotenv import load_dotenv
import re
from pydantic import BaseModel
import e2b_code_interpreter

def strip_ansi(text: str) -> str:
    if not text:
        return ""
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    return ansi_escape.sub('', text)

# Load environment variables to ensure E2B SDK picks up E2B_API_KEY
load_dotenv()
class VerifyResult(BaseModel):
    success: bool
    output: str
    error: str
    verified: bool
    summary: str

async def verify_fix(fix_result: dict, files_content: dict = None) -> VerifyResult:
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

    target_file = None
    for pf in patched_files:
        ext = os.path.splitext(pf.get("file_path", ""))[1].lower()
        if ext in [".py", ".js", ".ts", ".java"]:
            target_file = pf
            break
            
    if not target_file:
        return VerifyResult(
            success=False,
            output="",
            error="",
            verified=False,
            summary="Auto-verification skipped: No executable code files (.py, .js, .ts, .java) were patched."
        )

    entry_file_path = target_file.get("file_path", "")
    extension = os.path.splitext(entry_file_path)[1].lower()

    try:
        if extension in [".py", ".js", ".ts", ".java"]:
            with e2b_code_interpreter.Sandbox.create() as sandbox:
                # 1. Write all original files to the sandbox so cross-file imports work
                if files_content:
                    for fpath, fcontent in files_content.items():
                        dir_name = os.path.dirname(fpath)
                        if dir_name:
                            sandbox.commands.run(f"mkdir -p {dir_name}")
                        sandbox.files.write(fpath, fcontent)

                # 2. Overwrite with patched files
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
                    # Determine the Python entry point
                    all_files = {}
                    if files_content:
                        all_files.update(files_content)
                    for pf in patched_files:
                        fpath = pf.get("file_path", "")
                        if fpath:
                            all_files[fpath] = True

                    python_files = [f for f in all_files.keys() if f.endswith(".py")]
                    
                    py_entry = entry_file_path
                    for candidate in ["main.py", "app.py", "run.py"]:
                        matches = [f for f in python_files if os.path.basename(f) == candidate]
                        if matches:
                            py_entry = matches[0]
                            break

                    execution = sandbox.run_code(f"!python {py_entry}")

                    # Capture stdout correctly
                    output = ""
                    if execution.logs.stdout:
                        output = "\\n".join(execution.logs.stdout)
                        
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
                            output=strip_ansi(output),
                            error=strip_ansi(error),
                            verified=False,
                            summary="Code execution failed with errors."
                        )
                    else:
                        return VerifyResult(
                            success=True,
                            output=strip_ansi(output) or "Code executed successfully (no output).",
                            error="",
                            verified=True,
                            summary="Code verified successfully in Python sandbox."
                        )
                elif extension in [".js", ".ts"]:
                    # Determine the JS/TS entry point
                    all_files = {}
                    if files_content:
                        all_files.update(files_content)
                    for pf in patched_files:
                        fpath = pf.get("file_path", "")
                        if fpath:
                            all_files[fpath] = True

                    js_files = [f for f in all_files.keys() if f.endswith(".js") or f.endswith(".ts")]
                    
                    js_entry = entry_file_path
                    for candidate in ["main.js", "index.js", "app.js", "main.ts", "index.ts", "app.ts"]:
                        matches = [f for f in js_files if os.path.basename(f) == candidate]
                        if matches:
                            js_entry = matches[0]
                            break

                    execution = sandbox.run_code(f"!node {js_entry}")

                    # Capture stdout correctly
                    output = ""
                    if execution.logs.stdout:
                        output = "\\n".join(execution.logs.stdout)
                        
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
                            output=strip_ansi(output),
                            error=strip_ansi(error),
                            verified=False,
                            summary="Code execution failed with errors."
                        )
                    else:
                        return VerifyResult(
                            success=True,
                            output=strip_ansi(output) or "Code executed successfully (no output).",
                            error="",
                            verified=True,
                            summary="Code verified successfully in Node.js sandbox."
                        )
                elif extension == ".java":
                    # Build unified view of all files to find the entry point
                    all_files = {}
                    if files_content:
                        all_files.update(files_content)
                    for pf in patched_files:
                        fpath = pf.get("file_path", "")
                        fcontent = pf.get("patched_content", "")
                        if fpath and fcontent:
                            all_files[fpath] = fcontent

                    # Find candidates
                    main_candidates = []
                    for fpath, fcontent in all_files.items():
                        if fpath.endswith(".java") and "public static void main(" in fcontent:
                            main_candidates.append(fpath)
                            
                    if not main_candidates:
                        # Fallback to the target file if no main method found
                        main_candidates.append(entry_file_path)
                        
                    # Sort candidates: Main.java first, App.java second, alphabetical third
                    def sort_key(path):
                        basename = os.path.basename(path)
                        if basename == "Main.java":
                            return (0, basename)
                        if basename == "App.java":
                            return (1, basename)
                        return (2, basename)
                        
                    main_candidates.sort(key=sort_key)
                    main_file = main_candidates[0]
                    classname = os.path.splitext(os.path.basename(main_file))[0]
                    dir_name = os.path.dirname(main_file)
                    
                    # 1. Compile ALL java files
                    compile_script = f"import subprocess; r = subprocess.run('javac *.java', shell=True, cwd='{dir_name or '.'}', capture_output=True, text=True); print(r.stdout); print(r.stderr)"
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
                            output=strip_ansi(output),
                            error=strip_ansi(error),
                            verified=False,
                            summary="Code execution failed with errors."
                        )
                    else:
                        return VerifyResult(
                            success=True,
                            output=strip_ansi(output) or "Code executed successfully (no output).",
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
