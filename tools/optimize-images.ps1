# Пережимает JPEG в site/assets/img до веба: длинная сторона не больше
# $MaxSide, качество $Quality. Работает на System.Drawing, чтобы не тянуть
# внешние зависимости — на Windows этого достаточно.
#
#   powershell -ExecutionPolicy Bypass -File tools/optimize-images.ps1
#   powershell -ExecutionPolicy Bypass -File tools/optimize-images.ps1 -MaxSide 2000 -Quality 78

param(
  [int]$MaxSide = 1920,
  [int]$Quality = 80,
  [string]$Dir = "site/assets/img",
  [int]$SkipUnderKb = 500   # уже лёгкие файлы не трогаем
)

Add-Type -AssemblyName System.Drawing

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
         Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
  [System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)

$totalBefore = 0
$totalAfter = 0
$touched = 0

Get-ChildItem -Path $Dir -Filter *.jpg | ForEach-Object {
  $file = $_
  $kb = [math]::Round($file.Length / 1KB)
  if ($kb -lt $SkipUnderKb) {
    Write-Host ("  {0,-16} {1,5} КБ — пропуск, уже лёгкий" -f $file.BaseName, $kb)
    return
  }

  $img = [System.Drawing.Image]::FromFile($file.FullName)
  $w = $img.Width; $h = $img.Height
  $scale = [math]::Min(1.0, $MaxSide / [math]::Max($w, $h))
  $nw = [int][math]::Round($w * $scale)
  $nh = [int][math]::Round($h * $scale)

  $bmp = New-Object System.Drawing.Bitmap $nw, $nh
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img, 0, 0, $nw, $nh)
  $g.Dispose()
  $img.Dispose()

  $tmp = "$($file.FullName).tmp"
  $bmp.Save($tmp, $codec, $params)
  $bmp.Dispose()

  $newKb = [math]::Round((Get-Item $tmp).Length / 1KB)
  Move-Item -Path $tmp -Destination $file.FullName -Force

  $totalBefore += $kb
  $totalAfter += $newKb
  $touched++
  Write-Host ("  {0,-16} {1}x{2} {3,5} КБ  ->  {4}x{5} {6,4} КБ" -f `
    $file.BaseName, $w, $h, $kb, $nw, $nh, $newKb)
}

if ($touched -gt 0) {
  Write-Host ""
  Write-Host ("Пережато файлов: {0}. Суммарно {1} КБ -> {2} КБ (в {3} раза легче)." -f `
    $touched, $totalBefore, $totalAfter, [math]::Round($totalBefore / [math]::Max($totalAfter,1), 1))
} else {
  Write-Host "Нечего пережимать."
}
