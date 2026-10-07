# Incorpora i modelli 3D (.glb / .obj) di Assets\3D in Assets\3D\models.js
# In questo modo la vista 3D li carica anche da file:/// senza server
# (il browser blocca la lettura diretta di file .glb/.obj da disco).
# Da rieseguire ogni volta che si cambia un modello.

$dir = Join-Path $PSScriptRoot "..\Assets\3D"
$out = Join-Path $dir "models.js"
$files = Get-ChildItem -Path (Join-Path $dir "*") -Include *.glb, *.obj -File

if (-not $files) {
    Write-Host "Nessun file .glb/.obj trovato in $dir"
    exit 1
}

$sb = New-Object System.Text.StringBuilder
[void]$sb.Append("// Generato da tools\embed-models.ps1 - non modificare a mano`r`nwindow.PALCOMPOSE_MODELS = {`r`n")
foreach ($f in $files) {
    $b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($f.FullName))
    [void]$sb.Append("  `"" + $f.Name + "`": `"" + $b64 + "`",`r`n")
    Write-Host ("Incorporato " + $f.Name + " (" + [math]::Round($f.Length / 1MB, 1) + " MB)")
}
[void]$sb.Append("};`r`n")
[IO.File]::WriteAllText($out, $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Creato $out"
