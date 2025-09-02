# Simple PowerShell script to remove trailing whitespace
$modifiedFiles = git diff --name-only

Write-Host "Processing $($modifiedFiles.Count) files..."

foreach ($file in $modifiedFiles) {
    if (Test-Path $file) {
        Write-Host "Processing: $file"
        $content = Get-Content $file
        if ($content) {
            $content | ForEach-Object { $_.TrimEnd() } | Set-Content $file -Encoding UTF8
            Write-Host "  Cleaned trailing whitespace"
        }
    }
}

Write-Host "Done!"
