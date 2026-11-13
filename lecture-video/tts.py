"""Turns lecture narration (script.json) into voice clips with word timings.

Runs on GitHub Actions (the build machine needs internet for the voice service).
For every segment in a script.json it writes, next to it:
  audio/<id>.mp3          the narration
  audio/<id>.words.json   start/end of every spoken word (for subtitles and synced annotations)
Segments whose text and voice did not change are skipped.
"""
import asyncio, hashlib, json, sys
from pathlib import Path
import edge_tts

DEFAULT_VOICE = "en-IN-PrabhatNeural"  # Indian English, male


async def speak(text, voice, rate, pitch, mp3: Path, words: Path):
    com = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
    out, marks = bytearray(), []
    async for chunk in com.stream():
        if chunk["type"] == "audio":
            out += chunk["data"]
        elif chunk["type"] == "WordBoundary":
            s = chunk["offset"] / 1e7
            marks.append({"w": chunk["text"], "s": round(s, 3), "e": round(s + chunk["duration"] / 1e7, 3)})
    mp3.write_bytes(bytes(out))
    return marks


async def run(script_path: Path):
    spec = json.loads(script_path.read_text())
    voice = spec.get("voice", DEFAULT_VOICE)
    rate, pitch = spec.get("rate", "+0%"), spec.get("pitch", "+0Hz")
    outdir = script_path.parent / "audio"
    outdir.mkdir(exist_ok=True)
    for seg in spec["segments"]:
        text = seg["say"]
        key = hashlib.sha1(f"{voice}|{rate}|{pitch}|{text}".encode()).hexdigest()
        mp3, words = outdir / f"{seg['id']}.mp3", outdir / f"{seg['id']}.words.json"
        if words.exists() and json.loads(words.read_text()).get("key") == key and mp3.exists():
            continue
        for attempt in range(4):
            try:
                marks = await speak(text, voice, rate, pitch, mp3, words)
                break
            except Exception as e:  # the service sometimes drops a connection
                print(f"retry {seg['id']}: {e}")
                await asyncio.sleep(3 * (attempt + 1))
        else:
            sys.exit(f"voice failed for {seg['id']}")
        words.write_text(json.dumps({"key": key, "voice": voice, "words": marks}, indent=0))
        print(f"spoke {script_path.parent.name}/{seg['id']} ({len(marks)} words)")


if __name__ == "__main__":
    for p in sys.argv[1:]:
        asyncio.run(run(Path(p)))
