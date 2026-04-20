Add-Type -AssemblyName System.Drawing
$iconPath = "d:\proj 2\lpu-app\assets\icon.png"
$splashPath = "d:\proj 2\lpu-app\assets\splash.png"
$adaptivePath = "d:\proj 2\lpu-app\assets\adaptive-icon.png"

function ConvertTo-Png {
    param($path)
    $img = [System.Drawing.Image]::FromFile($path)
    $newPath = $path + ".temp.png"
    $img.Save($newPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $img.Dispose()
    Move-Item $newPath $path -Force
}

ConvertTo-Png $iconPath
ConvertTo-Png $splashPath
ConvertTo-Png $adaptivePath
