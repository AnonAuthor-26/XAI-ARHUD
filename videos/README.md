# Videos

Put the study clips here (MP4, H.264 + AAC plays in every browser).

File names expected by `config.js` (case-sensitive on GitHub Pages):

| Condition     | File(s)                |
|---------------|------------------------|
| No interface  | `XAI_none.mp4`       |
| AR HUD        | `XAI_ARHD.mp4`          |
| Textual       | `XAI_text.mp4`        |

To use several clips per condition (e.g. `XAI_ARHD.mp4`, `arhud_2.mp4`), list them in
`config.js` → `CONDITIONS.<condition>.clips`; they play in that order.

## Export settings

| Parameter | Value | Why |
|---|---|---|
| Container / codec | MP4, H.264 (High), `yuv420p` | Plays in every browser |
| Resolution | 1920×1080 (the native capture size if smaller; never upscale) | Text sentence and box labels must be legible |
| Frame rate | Constant 30 fps (CFR), or 60 if captured at 60 | Constant frames keep the take-over timestamps exact |
| Quality | CRF 23, capped at 4 Mbit/s | About 75 MB for 2.5 min, under GitHub's 100 MB per-file limit |
| Audio | None needed: the site mutes every clip. Drop it with `-an` to save space | Audio cues must not differ between conditions |
| Start | `+faststart` | Playback begins before the file has fully downloaded |
| Cut | Re-encode, don't stream-copy | Frame-exact in/out points |
| Overlays | None (no titles, no condition names, no fades) | Protocol §9 neutrality |

    ffmpeg -ss <in> -to <out> -i drive.mp4 \
      -c:v libx264 -preset veryfast -profile:v high -pix_fmt yuv420p \
      -crf 23 -maxrate 4M -bufsize 8M -r 30 -vf "scale=-2:'min(1080,ih)'" \
      -an -movflags +faststart XAI_ARHD.mp4

Videos are stored with Git LFS (see `.gitattributes`), so a single file may be over 100 MB.
The whole published site must stay under 1 GB: check the total with `du -ch videos/*.mp4`.
