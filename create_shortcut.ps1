$WshShell = New-Object -comObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopPath "StockTrend_Start.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "c:\Users\rnfjr\StockTrendProgram\StockTrend_Start.bat"
$Shortcut.WorkingDirectory = "c:\Users\rnfjr\StockTrendProgram"
$Shortcut.IconLocation = "shell32.dll,14" # Globe icon
$Shortcut.Save()
Write-Host "Shortcut created at $ShortcutPath"
