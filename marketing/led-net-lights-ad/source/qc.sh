#!/usr/bin/env bash
# QC for the rendered ad: specs, cut timing vs plan, audio hit timing, contact sheet.
set -euo pipefail
V="$1"; OUT="$2"; mkdir -p "$OUT"
echo "== specs"
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,pix_fmt,sample_rate,channels,bit_rate:format=duration,size,bit_rate -of default=nw=1 "$V"
echo "== loudness"
ffmpeg -hide_banner -nostats -i "$V" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak):"
echo "== visual cuts (scdet > 12)"
ffmpeg -hide_banner -nostats -i "$V" -vf "scdet=threshold=12" -an -f null - 2>&1 | grep -oE "lavfi.scd.time: [0-9.]+" | awk '{printf "%s ", $2} END {print ""}'
echo "== audio hits (strong onsets)"
ffmpeg -hide_banner -loglevel error -i "$V" -ac 1 -ar 8000 -f s16le - | python3 -c "
import sys, numpy as np
a = np.frombuffer(sys.stdin.buffer.read(), np.int16).astype(np.float32) / 32768
h = 80  # 10 ms
e = np.sqrt(np.convolve(a * a, np.ones(h) / h, 'same'))[::h]
d = np.diff(np.log(e + 1e-4))
idx = [i for i in range(5, len(d) - 5) if d[i] > 1.2 and d[i] == d[i-5:i+5].max()]
print(' '.join(f'{i/100:.2f}' for i in idx))
"
echo "== contact sheet"
ffmpeg -hide_banner -loglevel error -y -i "$V" -vf "fps=2,scale=216:384" "$OUT/cs_%03d.png"
montage "$OUT"/cs_*.png -tile 12x4 -geometry +2+2 -background '#111' "$OUT/contact.png"
rm -f "$OUT"/cs_*.png
echo "sheet: $OUT/contact.png"
