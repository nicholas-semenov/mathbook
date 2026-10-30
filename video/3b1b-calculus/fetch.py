"""Download metadata and Russian transcripts for every video/stream/short of @shiz584.

Usage:
    .venv/bin/python fetch.py            # fetch everything (resumable)
    .venv/bin/python fetch.py --limit 3  # fetch only the first N missing videos
    .venv/bin/python fetch.py --index    # only apply labels.json and rebuild index.json
"""

import argparse
import json
import random
import re
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

import yt_dlp

PLAYLIST = "https://www.youtube.com/playlist?list=PLVjLpKXnAGLVbrcJdDb0a2RS6MmRCgxJz"
ROOT = Path(__file__).resolve().parent
OUT = ROOT / "videos"
INDEX = ROOT / "index.json"
ERRORS = ROOT / "errors.log"
# Hand-made classification: {video_id: {topic, subtopic, format, level, keywords, summary}}
LABELS = ROOT / "labels.json"

# Prefer human-made subs, then the original-language auto captions.
SUB_PRIORITY = [("subtitles", "ru"), ("automatic_captions", "ru-orig"), ("automatic_captions", "ru")]

YDL_OPTS = {
    "quiet": True,
    "no_warnings": True,
    "skip_download": True,
    # Without this YouTube returns machine-translated English titles.
    "extractor_args": {"youtube": {"lang": ["ru"]}},
}

TRANSLIT = dict(zip(
    "абвгдеёжзийклмнопрстуфхцчшщъыьэюя",
    ["a", "b", "v", "g", "d", "e", "e", "zh", "z", "i", "y", "k", "l", "m", "n", "o", "p",
     "r", "s", "t", "u", "f", "kh", "ts", "ch", "sh", "shch", "", "y", "", "e", "yu", "ya"],
))


def slugify(text, max_len=60):
    text = "".join(TRANSLIT.get(c, c) for c in text.lower())
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text[:max_len].rstrip("-") or "untitled"


def fmt_ts(ms):
    s = int(ms // 1000)
    return f"{s // 3600:02d}:{s % 3600 // 60:02d}:{s % 60:02d}"


def parse_json3(data):
    """Return a list of (start_ms, text) caption events."""
    events = []
    for ev in data.get("events", []):
        text = "".join(seg.get("utf8", "") for seg in ev.get("segs") or [])
        text = re.sub(r"\s+", " ", text).strip()
        if text:
            events.append((ev.get("tStartMs", 0), text))
    return events


def to_plain(events, para_words=120):
    """Join captions into paragraphs, breaking at a sentence end after ~para_words words."""
    paragraphs, current, count = [], [], 0
    for _, text in events:
        current.append(text)
        count += len(text.split())
        if count >= para_words and re.search(r"[.!?…]$", text):
            paragraphs.append(" ".join(current))
            current, count = [], 0
    if current:
        paragraphs.append(" ".join(current))
    return "\n\n".join(paragraphs) + "\n"


def to_timed(events, chunk_sec=30):
    """Group captions into ~chunk_sec blocks, each prefixed with its start time."""
    lines, current, start = [], [], None
    for ms, text in events:
        if start is None:
            start = ms
        current.append(text)
        if ms - start >= chunk_sec * 1000:
            lines.append(f"[{fmt_ts(start)}] {' '.join(current)}")
            current, start = [], None
    if current:
        lines.append(f"[{fmt_ts(start)}] {' '.join(current)}")
    return "\n".join(lines) + "\n"


def list_channel(ydl):
    """Return [(video_id, chapter)] in playlist order."""
    info = ydl.extract_info(PLAYLIST, download=False, process=False)
    return [(e["id"], n) for n, e in enumerate(info.get("entries") or [], 1) if e.get("id")]


def existing_dirs():
    """Map video id -> folder for videos already fetched completely."""
    done = {}
    for meta_path in OUT.glob("*/meta.json"):
        if (meta_path.parent / "transcript.txt").exists():
            done[json.loads(meta_path.read_text("utf-8"))["id"]] = meta_path.parent
    return done


def pick_subtitle(info):
    for field, lang in SUB_PRIORITY:
        for fmt in (info.get(field) or {}).get(lang, []):
            if fmt.get("ext") == "json3":
                return field, lang, fmt["url"]
    return None, None, None


def fetch_one(ydl, vid, chapter):
    info = ydl.extract_info(f"https://www.youtube.com/watch?v={vid}", download=False)
    field, lang, sub_url = pick_subtitle(info)

    date = info.get("upload_date") or "00000000"
    folder = OUT / f"{chapter:02d}_{slugify(info['title'])}_{vid}"
    folder.mkdir(parents=True, exist_ok=True)

    word_count = 0
    if sub_url:
        events = parse_json3(json.loads(ydl.urlopen(sub_url).read().decode("utf-8")))
        plain = to_plain(events)
        word_count = len(plain.split())
        (folder / "transcript.txt").write_text(plain, "utf-8")
        (folder / "transcript_timed.txt").write_text(to_timed(events), "utf-8")

    meta = {
        "id": vid,
        "url": f"https://www.youtube.com/watch?v={vid}",
        "title": info.get("title"),
        "chapter": chapter,
        "channel": info.get("channel"),
        "upload_date": f"{date[:4]}-{date[4:6]}-{date[6:]}",
        "duration_sec": info.get("duration"),
        "views": info.get("view_count"),
        "likes": info.get("like_count"),
        "description": info.get("description"),
        "tags": info.get("tags") or [],
        "chapters": [
            {"start": fmt_ts(c["start_time"] * 1000), "title": c["title"]}
            for c in info.get("chapters") or []
        ],
        "transcript_source": f"{field}:{lang}" if sub_url else None,
        "word_count": word_count,
        "subtopic": None,
        "level": None,
        "concepts": [],
        "summary": None,
        "outline": [],
    }
    (folder / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", "utf-8")
    if not sub_url:
        raise RuntimeError("no Russian transcript available (metadata saved)")
    return folder


_ydl = None


def worker_ydl():
    # One YoutubeDL instance per worker process, reused across its videos.
    global _ydl
    if _ydl is None:
        _ydl = yt_dlp.YoutubeDL(YDL_OPTS)
    return _ydl


def fetch_with_retry(vid, chapter):
    """Return (ok, message); retries transient errors with backoff."""
    try:
        for attempt in range(3):
            try:
                return True, fetch_one(worker_ydl(), vid, chapter).name
            except Exception as e:
                msg = str(e).splitlines()[0]
                if "no Russian transcript" in msg or attempt == 2:
                    return False, f"{vid}\t{msg}"
                wait = 30 * (attempt + 1)
                print(f"retry {vid} in {wait}s: {msg}", file=sys.stderr, flush=True)
                time.sleep(wait)
    finally:
        time.sleep(random.uniform(1, 3))


def apply_labels():
    """Merge labels.json into every meta.json."""
    labels = json.loads(LABELS.read_text("utf-8")) if LABELS.exists() else {}
    applied = 0
    for path in OUT.glob("*/meta.json"):
        meta = json.loads(path.read_text("utf-8"))
        if meta["id"] in labels:
            meta.update(labels[meta["id"]])
            path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", "utf-8")
            applied += 1
    print(f"labels applied: {applied}/{len(labels)}")


def build_index():
    keys = ["chapter", "id", "title", "upload_date", "duration_sec", "views", "word_count",
            "subtopic", "level", "concepts", "summary", "outline"]
    rows = []
    for meta_path in sorted(OUT.glob("*/meta.json")):
        meta = json.loads(meta_path.read_text("utf-8"))
        rows.append({k: meta.get(k) for k in keys} | {"folder": meta_path.parent.name})
    INDEX.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(f"index.json: {len(rows)} videos")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, help="fetch at most N missing videos")
    parser.add_argument("--index", action="store_true", help="only rebuild index.json")
    parser.add_argument("--workers", type=int, default=8, help="parallel worker processes")
    args = parser.parse_args()

    if args.index:
        apply_labels()
        build_index()
        return

    OUT.mkdir(exist_ok=True)
    with yt_dlp.YoutubeDL(YDL_OPTS) as ydl:
        items = list_channel(ydl)
    done = existing_dirs()
    todo = [(vid, ch) for vid, ch in items if vid not in done]
    if args.limit:
        todo = todo[: args.limit]
    print(f"playlist: {len(items)} items, already fetched: {len(done)}, "
          f"to fetch: {len(todo)}, workers: {args.workers}", flush=True)

    failed = 0
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(fetch_with_retry, vid, ch) for vid, ch in todo]
        for i, future in enumerate(as_completed(futures), 1):
            ok, msg = future.result()
            if not ok:
                failed += 1
                with ERRORS.open("a", encoding="utf-8") as log:
                    log.write(msg + "\n")
            print(f"[{i}/{len(todo)}] {'ok  ' if ok else 'FAIL'} {msg}",
                  file=sys.stdout if ok else sys.stderr, flush=True)

    print(f"done, failed: {failed}")
    apply_labels()
    build_index()


if __name__ == "__main__":
    main()
