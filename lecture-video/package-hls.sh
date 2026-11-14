#!/usr/bin/env bash
# Packs a finished lecture (master.mp4 + subtitles.vtt) into adaptive streaming (HLS) with four qualities:
#   UHD 2160p, HD 1080p, Medium 720p, Low 480p, plus an English subtitle track and a poster image.
# Usage: lecture-video/package-hls.sh <lecture out folder> <destination folder>
set -euo pipefail
src="$1"; dst="$2"
rm -rf "$dst"; mkdir -p "$dst"
# Slides are mostly still pictures, so even 4K needs little data; caps keep phones on mobile data happy.
ffmpeg -loglevel error -y -i "$src/master.mp4" \
  -filter_complex "[0:v]split=4[a][b][c][d];[a]scale=3840:2160:flags=lanczos[v0];[b]scale=1920:1080:flags=lanczos[v1];[c]scale=1280:720:flags=lanczos[v2];[d]scale=854:480:flags=lanczos[v3]" \
  -map "[v0]" -map "[v1]" -map "[v2]" -map "[v3]" -map 0:a -map 0:a -map 0:a -map 0:a \
  -c:v libx264 -preset slow -profile:v high -pix_fmt yuv420p -g 60 -keyint_min 60 -sc_threshold 0 \
  -crf:v:0 22 -maxrate:v:0 6000k -bufsize:v:0 12000k \
  -crf:v:1 22 -maxrate:v:1 3000k -bufsize:v:1 6000k \
  -crf:v:2 23 -maxrate:v:2 1500k -bufsize:v:2 3000k \
  -crf:v:3 24 -maxrate:v:3 700k  -bufsize:v:3 1400k \
  -c:a aac -ac 2 -b:a:0 128k -b:a:1 128k -b:a:2 96k -b:a:3 64k \
  -f hls -hls_time 6 -hls_playlist_type vod -hls_segment_type fmp4 \
  -hls_segment_filename "$dst/%v/seg_%03d.m4s" -hls_fmp4_init_filename "init.mp4" \
  -master_pl_name master.m3u8 \
  -var_stream_map "v:0,a:0,name:2160p v:1,a:1,name:1080p v:2,a:2,name:720p v:3,a:3,name:480p" \
  "$dst/%v/index.m3u8"
# Subtitles: one WebVTT file, announced in the master playlist so the player shows a CC choice.
mkdir -p "$dst/subs"
cp "$src/subtitles.vtt" "$dst/subs/en.vtt"
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$src/master.mp4")
cat > "$dst/subs/en.m3u8" <<M3U
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:$(printf '%.0f' "$(echo "$dur + 1" | bc)")
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:${dur},
en.vtt
#EXT-X-ENDLIST
M3U
python3 - "$dst/master.m3u8" <<'PY'
import sys, re
p = sys.argv[1]
lines = open(p).read().splitlines()
out = []
for l in lines:
    if l.startswith("#EXT-X-STREAM-INF"):
        if not out or not any(x.startswith("#EXT-X-MEDIA:TYPE=SUBTITLES") for x in out):
            out.append('#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English",LANGUAGE="en",DEFAULT=YES,AUTOSELECT=YES,URI="subs/en.m3u8"')
        l += ',SUBTITLES="subs"'
    out.append(l)
open(p, "w").write("\n".join(out) + "\n")
PY
ffmpeg -loglevel error -y -ss 3 -i "$src/master.mp4" -frames:v 1 -vf scale=1280:-2 -q:v 3 "$dst/poster.jpg"
cp "$src/subtitles.vtt" "$dst/subtitles.vtt"
du -sh "$dst"
