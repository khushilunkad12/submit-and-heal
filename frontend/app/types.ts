export interface SubmitPayload {
  repo_url: string;
  error_description: string;
}

export interface DiagnosisResult {
  root_cause: string;
  affected_files: string[];
  confidence: string;
  confidence_percentage: number;
  fix_direction: string;
  error_category: string;
  why_it_happened: string;
}

export interface PatchedFile {
  file_path: string;
  original_content: string;
  patched_content: string;
  explanation: string;
}

export interface FixResult {
  patched_files: PatchedFile[];
  patch_summary: string;
  confidence: string;
}

export interface VerifyResult {
  success: boolean;
  output: string;
  error: string;
  verified: boolean;
  summary: string;
}

export interface SubmitResponse {
  status: string;
  repo_url?: string;
  error_description?: string;
  message: string;
  detected_stack?: string;
  file_list?: string[];
  readme_preview?: string;
  diagnosis?: DiagnosisResult;
  fix?: FixResult;
  verify?: VerifyResult;
}
