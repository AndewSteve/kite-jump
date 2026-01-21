# ????
$limitSizeMB = 1                # ???? (MB)
$limitPixel = 1024              # ??????
$targetExtensions = @(".png", ".jpg", ".jpeg") # ????

# ?? ffmpeg ????
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Write-Host "??: ??? ffmpeg??????????????? Path ??" -ForegroundColor Red
    exit
}

# ????????
$files = Get-ChildItem -Path . -Recurse | Where-Object { $_.Extension -in $targetExtensions }

$countProcessed = 0
$countSkipped = 0

foreach ($file in $files) {
    # 1. ?????? (?? 1MB)
    if ($file.Length -gt ($limitSizeMB * 1024 * 1024)) {
        
        # ?? ffprobe ?????
        # -v error: ????
        # -show_entries: ????
        # -of csv: ????? csv?????
        $dimString = ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$($file.FullName)"
        
        # ???? (?? "1920x1080")
        if ($dimString -match '(\d+)x(\d+)') {
            $width = [int]$matches[1]
            $height = [int]$matches[2]

            # 2. ????? (????? 1024)
            if ($width -gt $limitPixel -or $height -gt $limitPixel) {
                Write-Host "????: $($file.Name) [??: $([math]::Round($file.Length / 1MB, 2))MB | ???: ${width}x${height}]" -ForegroundColor Cyan
                
                # ?????????
                $tempOutput = "$($file.DirectoryName)\temp_$($file.Name)"

                # 3. ?? ffmpeg ????
                # ???????? ${limitPixel} ????????
                $argList = "-i `"$($file.FullName)`" -vf `"scale=${limitPixel}:${limitPixel}:force_original_aspect_ratio=decrease`" -y `"$tempOutput`""
                
                $process = Start-Process -FilePath "ffmpeg" -ArgumentList $argList -Wait -NoNewWindow -PassThru

                if ($process.ExitCode -eq 0) {
                    # ?????
                    Move-Item -Path $tempOutput -Destination $file.FullName -Force
                    Write-Host "  -> ??" -ForegroundColor Green
                    $countProcessed++
                } else {
                    Write-Host "  -> ?? (FFmpeg ??)" -ForegroundColor Red
                    if (Test-Path $tempOutput) { Remove-Item $tempOutput }
                }
            } else {
                # ?????????????
                $countSkipped++
            }
        }
    } else {
        # ???????
        $countSkipped++
    }
}

Write-Host "--------------------------------"
Write-Host "????!"
Write-Host "?????: $countProcessed"
Write-Host "?????: $countSkipped"