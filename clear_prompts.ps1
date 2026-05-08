$base = Join-Path $PSScriptRoot "code\backend\src\llm"
Write-Host "Base path: $base"
Write-Host "Exists: $(Test-Path $base)"

# 1. Delete prompts_backup
$backup = "$base\prompts_backup"
if (Test-Path $backup) {
    Remove-Item $backup -Recurse -Force
    Write-Host "Deleted: prompts_backup"
}

# 2. Process each prompt file
$files = @(
    'ai_reporter_prompts.rs','continue_planning_prompts.rs','decision_analysis_prompts.rs',
    'evaluation_prompts.rs','message_formatter_prompts.rs','message_templates.rs',
    'parameter_inference_prompts.rs','planning_prompts.rs','post_task_evaluation_prompts.rs',
    'reflection_prompts.rs','replanning_prompts.rs','scene_guidance.rs',
    'single_step_repair_prompts.rs','step_decision_prompts.rs','task_analysis_prompts.rs'
)

foreach ($f in $files) {
    $fp = "$base\$f"
    if (-not (Test-Path $fp)) { Write-Host "NOT FOUND: $f"; continue }

    $content = [System.IO.File]::ReadAllText($fp, [System.Text.Encoding]::UTF8)
    $original = $content

    # Replace: pub const NAME: &str = r#"..."#; -> pub const NAME: &str = "";
    $content = [System.Text.RegularExpressions.Regex]::Replace(
        $content,
        '(pub const \w+: &str\s*=\s*)r#"[\s\S]*?"#(\s*;)',
        '${1}""${2}',
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    )

    # Remove #[cfg(test)] mod tests { ... } blocks at end of file
    $content = [System.Text.RegularExpressions.Regex]::Replace(
        $content,
        '(\r?\n)#\[cfg\(test\)\](\r?\n)mod tests \{[\s\S]*\}\s*$',
        '',
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    )

    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($fp, $content, [System.Text.Encoding]::UTF8)
        Write-Host "UPDATED: $f"
    } else {
        Write-Host "no change: $f"
    }
}
Write-Host "Done."
