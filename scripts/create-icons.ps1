Add-Type -AssemblyName System.Drawing

function Create-Icon {
    param([int]$size, [string]$path)

    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    # Dark purple background circle
    $bgColor = [System.Drawing.Color]::FromArgb(255, 26, 26, 46)
    $bgBrush = New-Object System.Drawing.SolidBrush($bgColor)
    $g.FillEllipse($bgBrush, 0, 0, ($size - 1), ($size - 1))

    # Purple accent ring
    $ringColor = [System.Drawing.Color]::FromArgb(255, 124, 92, 191)
    $ringPen = New-Object System.Drawing.Pen($ringColor, [float]([Math]::Max(1, $size / 16)))
    $margin = [int]($size * 0.04)
    $g.DrawEllipse($ringPen, $margin, $margin, ($size - 1 - $margin * 2), ($size - 1 - $margin * 2))

    # Globe character
    $fontSize = [float]($size * 0.50)
    $font = New-Object System.Drawing.Font("Segoe UI Emoji", $fontSize, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
    $g.DrawString([char]::ConvertFromUtf32(0x1F310), $font, $whiteBrush, $rect, $sf)

    $g.Dispose()
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created $path"
}

New-Item -ItemType Directory -Force -Path "icons" | Out-Null
New-Item -ItemType Directory -Force -Path "dist\icons" | Out-Null

Create-Icon -size 16  -path "icons\icon16.png"
Create-Icon -size 48  -path "icons\icon48.png"
Create-Icon -size 128 -path "icons\icon128.png"

Copy-Item "icons\icon16.png"  "dist\icons\icon16.png"  -Force
Copy-Item "icons\icon48.png"  "dist\icons\icon48.png"  -Force
Copy-Item "icons\icon128.png" "dist\icons\icon128.png" -Force

Write-Host "All icons created!"
