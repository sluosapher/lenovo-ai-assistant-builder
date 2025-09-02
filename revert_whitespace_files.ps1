# PowerShell script to revert files with only minor changes (likely whitespace only)
# Get all modified files and their change stats
$modifiedFiles = git diff --name-only

Write-Host "Analyzing $($modifiedFiles.Count) files for whitespace-only changes..."

foreach ($file in $modifiedFiles) {
    $stats = git diff --numstat $file
    if ($stats) {
        $parts = $stats.Split("`t")
        $additions = [int]$parts[0]
        $deletions = [int]$parts[1]
        
        # If both additions and deletions are low and roughly equal, likely whitespace only
        if ($additions -le 50 -and $deletions -le 50 -and [Math]::Abs($additions - $deletions) -le 20) {
            Write-Host "Reverting whitespace-only file: $file ($additions additions, $deletions deletions)"
            git checkout HEAD -- $file
        } else {
            Write-Host "Keeping real changes: $file ($additions additions, $deletions deletions)"
        }
    }
}

Write-Host "Done! Run 'git status' to see remaining changes."
