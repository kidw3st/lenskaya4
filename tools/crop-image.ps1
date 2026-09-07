# Кадрирует изображение под заданные пропорции и сохраняет как JPEG.
# Нужен, когда горизонтальный кадр надо поставить в вертикальный слот:
# object-fit обрежет по центру, а нам важно выбрать, что попадёт в кадр.
#
#   powershell -ExecutionPolicy Bypass -File tools/crop-image.ps1 `
#     -In site/assets/img/ARCH-10.jpg -Out site/assets/img/MANIFEST-01.jpg `
#     -Ratio 0.75 -Anchor 0.62 -Width 1080 -Quality 78
#
# Ratio  — ширина/высота результата (0.75 = 3:4)
# Anchor — центр кадрирования по горизонтали, 0 левый край, 1 правый

param(
  [Parameter(Mandatory=$true)][string]$In,
  [Parameter(Mandatory=$true)][string]$Out,
  [double]$Ratio = 0.75,
  [double]$Anchor = 0.5,
  [double]$AnchorY = 0.5,
  [int]$Width = 1080,
  [int]$Quality = 80
)

Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Image]::FromFile((Resolve-Path $In))
$sw = $img.Width; $sh = $img.Height

# Наибольший прямоугольник заданных пропорций, влезающий в исходник
$cw = [math]::Min($sw, [int]($sh * $Ratio))
$ch = [int]($cw / $Ratio)
if ($ch -gt $sh) { $ch = $sh; $cw = [int]($ch * $Ratio) }

$cx = [int](($sw - $cw) * $Anchor)
$cy = [int](($sh - $ch) * $AnchorY)

$nh = [int]($Width / $Ratio)
$bmp = New-Object System.Drawing.Bitmap $Width, $nh
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($img,
  (New-Object System.Drawing.Rectangle 0, 0, $Width, $nh),
  (New-Object System.Drawing.Rectangle $cx, $cy, $cw, $ch),
  [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose(); $img.Dispose()

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
         Where-Object { $_.MimeType -eq 'image/jpeg' }
$p = New-Object System.Drawing.Imaging.EncoderParameters 1
$p.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
  [System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)

$full = Join-Path (Get-Location) $Out
$bmp.Save($full, $codec, $p)
$bmp.Dispose()

$kb = [math]::Round((Get-Item $full).Length / 1KB)
Write-Host ("{0}: {1}x{2} -> {3}x{4}, {5} KB (crop {6}x{7} at {8},{9})" -f `
  (Split-Path $Out -Leaf), $sw, $sh, $Width, $nh, $kb, $cw, $ch, $cx, $cy)
