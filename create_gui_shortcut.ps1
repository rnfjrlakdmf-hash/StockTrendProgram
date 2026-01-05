$WshShell = New-Object -comObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopPath "StockTrend_App.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "c:\Users\rnfjr\StockTrendProgram\StockTrend_GUI.bat"
$Shortcut.WorkingDirectory = "c:\Users\rnfjr\StockTrendProgram"
$Shortcut.IconLocation = "shell32.dll,14" 
$Shortcut.WindowStyle = 7 # Minimized/Hidden launch of the batch file itself
$Shortcut.Save()
Write-Host "Shortcut created at $ShortcutPath"
