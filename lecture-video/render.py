"""Lecture video maker for Power Sector Academy.

Turns a slide deck (PDF; PowerPoint is converted to PDF first) plus a narration script into a lecture video:
  * the narration (made by tts.py, Indian English male voice) drives the timing,
  * bullet points build in as the narrator reaches them,
  * a pen draws underlines, circles, boxes, arrows and ticks, a highlighter marks key words,
  * the camera zooms into details, a spotlight dims everything else, callout notes pop in,
  * a pointer follows the pen, slides change with a soft cross-fade,
  * title and summary cards open and close the lecture,
  * subtitles (WebVTT and SRT) come from the narration's word timings.

Usage:  python lecture-video/render.py <lecture folder> [--preview]
The folder holds deck.pdf (or deck.pptx), script.json and audio/ (from tts.py).
Output goes to <lecture folder>/out/: master.mp4, subtitles.vtt, subtitles.srt.
--preview renders at 1280x720 for a quick look.
"""
from __future__ import annotations

import json, math, os, random, re, subprocess, sys, shutil
from dataclasses import dataclass, field
from multiprocessing import Pool
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

FPS = 30
LEAD, TAIL, FADE = 0.7, 0.9, 0.55  # seconds of silence before/after each segment, cross-fade length
NAVY, NAVY2, BLUE, VOLT = (11, 27, 63), (18, 42, 96), (29, 78, 216), (251, 191, 36)
PEN, INK, HILITE = (225, 45, 60), (29, 78, 216), (255, 222, 40)
FONT_DIR = "/usr/share/fonts/opentype/inter"


def font(weight: str, size: float) -> ImageFont.FreeTypeFont:
    names = {"x": "InterDisplay-ExtraBold.otf", "b": "Inter-Bold.otf", "s": "Inter-SemiBold.otf", "m": "Inter-Medium.otf", "r": "Inter-Regular.otf"}
    p = Path(os.environ.get("LECTURE_FONTS", FONT_DIR)) / names[weight]
    if not p.exists():
        p = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if weight in "xbs" else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    return ImageFont.truetype(str(p), max(8, int(size)))


def ease(p: float) -> float:  # ease-in-out cubic
    p = min(1.0, max(0.0, p))
    return 4 * p * p * p if p < 0.5 else 1 - (-2 * p + 2) ** 3 / 2


def ease_out(p: float) -> float:
    p = min(1.0, max(0.0, p))
    return 1 - (1 - p) ** 3


def norm(w: str) -> str:
    return re.sub(r"[^a-z0-9]", "", w.lower())


# ---------------------------------------------------------------- geometry helpers

def path_len(pts):
    return sum(math.dist(a, b) for a, b in zip(pts, pts[1:]))


def path_upto(pts, p):
    """First p (0..1) of a polyline by length; returns (points, tip)."""
    if p >= 1:
        return pts, pts[-1]
    total, goal, out = path_len(pts), path_len(pts) * max(p, 0), [pts[0]]
    run = 0.0
    for a, b in zip(pts, pts[1:]):
        d = math.dist(a, b)
        if run + d >= goal:
            f = (goal - run) / d if d else 0
            tip = (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f)
            out.append(tip)
            return out, tip
        out.append(b)
        run += d
    return out, out[-1]


def wobble(pts, rnd, amp):
    return [(x + rnd.uniform(-amp, amp), y + rnd.uniform(-amp, amp)) for x, y in pts]


# ---------------------------------------------------------------- lecture model

@dataclass
class Mark:
    kind: str
    rect: tuple  # frame pixels x0,y0,x1,y1
    t: float  # start (seconds into segment)
    dur: float
    until: float  # end of the effect (zoom/spotlight) in seconds
    spec: dict
    seed: int
    path: list = field(default_factory=list)


@dataclass
class Segment:
    idx: int
    spec: dict
    audio: Path
    words: list
    dur: float
    start: float = 0.0
    marks: list = field(default_factory=list)


class Lecture:
    def __init__(self, folder: Path, preview: bool):
        self.dir = folder
        self.W, self.H = (1280, 720) if preview else (3840, 2160)
        self.K = self.W / 1920
        self.spec = json.loads((folder / "script.json").read_text())
        self.deck = self._deck()
        self.pdf = None
        self.segments: list[Segment] = []
        t = 0.0
        for i, s in enumerate(self.spec["segments"]):
            a = folder / "audio" / f"{s['id']}.mp3"
            wj = json.loads((folder / "audio" / f"{s['id']}.words.json").read_text())["words"]
            ad = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(a)]).decode())
            seg = Segment(i, s, a, wj, LEAD + ad + s.get("hold", TAIL), t)
            self.segments.append(seg)
            t += seg.dur
        self.total = t
        self.stage = self._stage()
        for seg in self.segments:
            self._resolve_marks(seg)

    # deck ------------------------------------------------------------------
    def _deck(self):
        for name in ("deck.pdf", "deck.pptx", "deck.ppt"):
            p = self.dir / name
            if p.exists():
                break
        else:
            return None
        if p.suffix != ".pdf":
            pdf = self.dir / "deck.pdf"
            if not pdf.exists() or pdf.stat().st_mtime < p.stat().st_mtime:
                subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", str(self.dir), str(p)], check=True, capture_output=True)
            p = pdf
        return p

    def page(self, n):
        import pymupdf
        if self.pdf is None:
            self.pdf = pymupdf.open(str(self.deck))
        return self.pdf[n - 1]

    def _stage(self):
        """Where a slide sits in the frame: (x, y, w, h, points-to-pixels scale) per page size."""
        K = self.K
        box = (36 * K, 30 * K, self.W - 36 * K, self.H - 96 * K)
        return box

    def slide_place(self, n):
        pg = self.page(n)
        pw, ph = pg.rect.width, pg.rect.height
        x0, y0, x1, y1 = self.stage
        s = min((x1 - x0) / pw, (y1 - y0) / ph)
        w, h = pw * s, ph * s
        return (x0 + (x1 - x0 - w) / 2, y0 + (y1 - y0 - h) / 2, w, h, s)

    # marks -----------------------------------------------------------------
    def _word_time(self, seg: Segment, phrase: str, after: int):
        want = [norm(w) for w in phrase.split() if norm(w)]
        ws = [norm(w["w"]) for w in seg.words]
        for start in (after, 0):
            for i in range(start, len(ws) - len(want) + 1):
                if all(ws[i + j].startswith(want[j]) or want[j].startswith(ws[i + j]) and ws[i + j] for j in range(len(want))):
                    return seg.words[i]["s"], i + 1
        raise SystemExit(f"segment {seg.spec['id']}: narration never says {phrase!r}")

    def _rect(self, seg: Segment, m: dict):
        page = m.get("page", seg.spec.get("page"))
        if "rect" in m:  # fractions of the slide
            x, y, w, h, s = self.slide_place(page)
            a, b, c, d = m["rect"]
            return (x + a * w, y + b * h, x + c * w, y + d * h)
        if "pt" in m:  # slide points (the PDF page's own units), for pictures and charts
            x, y, w, h, s = self.slide_place(page)
            a, b, c, d = m["pt"]
            return (x + a * s, y + b * s, x + c * s, y + d * s)
        if "find" in m:
            pg = self.page(page)
            x, y, w, h, s = self.slide_place(page)
            finds = m["find"] if isinstance(m["find"], list) else [m["find"]]
            rs = []
            for f in finds:
                hits = pg.search_for(f)
                if not hits:
                    raise SystemExit(f"segment {seg.spec['id']}: {f!r} is not on slide {page}")
                hits = hits[m.get("nth", 0):] if m.get("all") else [hits[m.get("nth", 0)]]
                rs += hits
            r = (min(h.x0 for h in rs), min(h.y0 for h in rs), max(h.x1 for h in rs), max(h.y1 for h in rs))
            if m.get("line"):  # widen to the whole text line(s)
                blocks = [b for b in pg.get_text("blocks") if b[1] <= r[3] and b[3] >= r[1] and b[0] <= r[2] and b[2] >= r[0]]
                if blocks:
                    r = (min(b[0] for b in blocks + [r]), r[1], max(b[2] for b in blocks + [r]), r[3])
            return (x + r[0] * s, y + r[1] * s, x + r[2] * s, y + r[3] * s)
        if "box" in m:  # frame fractions (cards)
            a, b, c, d = m["box"]
            return (a * self.W, b * self.H, c * self.W, d * self.H)
        raise SystemExit(f"segment {seg.spec['id']}: mark needs find, rect or box")

    def _resolve_marks(self, seg: Segment):
        after, specs = 0, seg.spec.get("marks", [])
        timed = []
        for k, m in enumerate(specs):
            if "t" in m:
                t = float(m["t"])
            elif "at" in m:
                t, after = self._word_time(seg, m["at"], after)
            else:
                t = -LEAD  # already there when the slide appears
            timed.append((LEAD + t + m.get("delay", 0), m))
        for k, (t, m) in enumerate(timed):
            kind = m["type"]
            dur = m.get("dur", {"reveal": 0.55, "highlight": 0.5, "zoom": 1.0, "spotlight": 0.5, "note": 0.45}.get(kind, 0.75))
            if "until" in m:
                until = LEAD + self._word_time(seg, m["until"], 0)[0]
            elif "for" in m:
                until = t + m["for"]
            elif kind in ("zoom", "spotlight"):
                nxt = [tt for tt, mm in timed[k + 1:] if mm["type"] == kind]
                until = min(nxt[0] - 0.1 if nxt else seg.dur - 0.9, seg.dur - 0.9)
            else:
                until = 1e9
            mk = Mark(kind, self._rect(seg, m), t, dur, until, m, hash((seg.spec["id"], k)) & 0xFFFF)
            mk.path = self._path(mk)
            seg.marks.append(mk)

    def _path(self, mk: Mark):
        K, (x0, y0, x1, y1) = self.K, mk.rect
        rnd = random.Random(mk.seed)
        pad = mk.spec.get("pad", 10) * K
        if mk.kind == "underline":
            y = y1 + 5 * K
            n = 24
            return wobble([(x0 - 4 * K + (x1 - x0 + 8 * K) * i / n, y + math.sin(i / n * math.pi * 2 + rnd.random()) * 2.2 * K) for i in range(n + 1)], rnd, 0.6 * K)
        if mk.kind == "circle":
            cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 + pad * 1.6, (y1 - y0) / 2 + pad * 1.4
            a0 = math.radians(rnd.uniform(200, 240))
            return [(cx + rx * (1 + 0.04 * math.sin(i / 7)) * math.cos(a0 + i / 80 * math.pi * 2.12), cy + ry * (1 + 0.05 * math.cos(i / 9)) * math.sin(a0 + i / 80 * math.pi * 2.12)) for i in range(81)]
        if mk.kind == "box":
            a, b, c, d = x0 - pad, y0 - pad, x1 + pad, y1 + pad
            pts = [(a, b), (c, b), (c, d), (a, d), (a, b + 2 * K)]
            out = []
            for p, q in zip(pts, pts[1:]):
                out += [(p[0] + (q[0] - p[0]) * i / 12, p[1] + (q[1] - p[1]) * i / 12) for i in range(12)]
            return wobble(out + [pts[-1]], rnd, 1.0 * K)
        if mk.kind == "arrow":
            side = mk.spec.get("from", "left")
            L = mk.spec.get("len", 150) * K
            cy, cx = (y0 + y1) / 2, (x0 + x1) / 2
            end, start = {"left": ((x0 - pad, cy), (x0 - pad - L, cy + L * 0.45)), "right": ((x1 + pad, cy), (x1 + pad + L, cy + L * 0.45)),
                          "below": ((cx, y1 + pad), (cx - L * 0.4, y1 + pad + L)), "above": ((cx, y0 - pad), (cx - L * 0.4, y0 - pad - L))}[side]
            mid = ((start[0] + end[0]) / 2 + (end[1] - start[1]) * 0.18, (start[1] + end[1]) / 2 - (end[0] - start[0]) * 0.18)
            return [((1 - u) ** 2 * start[0] + 2 * (1 - u) * u * mid[0] + u * u * end[0], (1 - u) ** 2 * start[1] + 2 * (1 - u) * u * mid[1] + u * u * end[1]) for u in (i / 30 for i in range(31))]
        if mk.kind == "tick":
            h = max(y1 - y0, 24 * K)
            ax = x0 - pad - h * 1.1
            return [(ax, y0 + h * 0.55), (ax + h * 0.35, y0 + h * 0.9), (ax + h * 0.95, y0 + h * 0.05)]
        return []


# ---------------------------------------------------------------- drawing

class Painter:
    def __init__(self, L: Lecture):
        self.L, self.W, self.H, self.K = L, L.W, L.H, L.K
        self._bg = None
        self._slides = {}

    def background(self):
        if self._bg is None:
            g = Image.linear_gradient("L").resize((self.W, self.H))
            a, b = Image.new("RGB", (self.W, self.H), NAVY), Image.new("RGB", (self.W, self.H), NAVY2)
            self._bg = Image.composite(b, a, g)
        return self._bg

    def chrome(self, img: Image.Image, seg: Segment):
        """Bottom bar: brand, module and lecture title, slide counter."""
        K, W, H = self.K, self.W, self.H
        d = ImageDraw.Draw(img)
        y = H - 96 * K
        d.rectangle((0, y + 10 * K, W, H), fill=NAVY)
        d.rectangle((0, y + 10 * K, W, y + 13 * K), fill=VOLT)
        bx, by, s = 36 * K, y + 30 * K, 46 * K
        d.rounded_rectangle((bx, by, bx + s, by + s), radius=13 * K, fill=BLUE)
        bolt = [(18, 4), (8, 18), (15, 18), (13, 28), (24, 13), (17, 13), (18, 4)]
        d.polygon([(bx + px / 32 * s, by + py / 32 * s) for px, py in bolt], fill=VOLT)
        d.text((bx + s + 14 * K, by + s / 2), "Power Sector", font=font("b", 25 * K), fill="white", anchor="lm")
        tw = d.textlength("Power Sector ", font=font("b", 25 * K))
        d.text((bx + s + 14 * K + tw, by + s / 2), "Academy", font=font("b", 25 * K), fill=VOLT, anchor="lm")
        sp = self.L.spec
        label = f"{sp.get('module', '')}  ·  {sp.get('title', '')}".strip(" ·")
        d.text((W / 2, by + s / 2), label, font=font("m", 23 * K), fill=(203, 213, 225), anchor="mm")
        slides = [s for s in self.L.segments if "page" in s.spec]
        if "page" in seg.spec:
            n = sorted({s.spec["page"] for s in slides}).index(seg.spec["page"]) + 1
            d.text((W - 36 * K, by + s / 2), f"{n} / {len({s.spec['page'] for s in slides})}", font=font("s", 23 * K), fill=(148, 163, 184), anchor="rm")

    def slide(self, n):
        if n not in self._slides:
            x, y, w, h, s = self.L.slide_place(n)
            pg = self.L.page(n)
            import pymupdf
            pix = pg.get_pixmap(matrix=pymupdf.Matrix(s * 1.0, s * 1.0), alpha=False)
            im = Image.frombytes("RGB", (pix.width, pix.height), pix.samples).resize((round(w), round(h)), Image.LANCZOS)
            base = self.background().copy()
            shadow = Image.new("L", (self.W, self.H), 0)
            ImageDraw.Draw(shadow).rounded_rectangle((x + 4 * self.K, y + 10 * self.K, x + w + 4 * self.K, y + h + 14 * self.K), radius=14 * self.K, fill=150)
            base.paste((0, 0, 0), (0, 0), shadow.filter(ImageFilter.GaussianBlur(16 * self.K)))
            mask = Image.new("L", im.size, 0)
            ImageDraw.Draw(mask).rounded_rectangle((0, 0, im.width - 1, im.height - 1), radius=12 * self.K, fill=255)
            base.paste(im, (round(x), round(y)), mask)
            self._slides[n] = base
        return self._slides[n]

    # cards -----------------------------------------------------------------
    def card(self, seg: Segment, t: float):
        K, W, H = self.K, self.W, self.H
        c = seg.spec["card"]
        img = self.background().copy()
        d = ImageDraw.Draw(img, "RGBA")
        # soft energy lines
        for i in range(7):
            yy = H * (0.18 + i * 0.11)
            d.line([(W * 0.55 + j * W * 0.05, yy + math.sin(j * 0.9 + i + t * 0.4) * 22 * K) for j in range(11)], fill=(59, 130, 246, 26 + 6 * i), width=int(3 * K))

        def appear(at):
            return ease_out((t - at) / 0.6)

        sp, x = seg.spec, 150 * K
        textw = 0.56 if sp.get("illustration") else 0.72
        if sp.get("illustration") == "battery":
            self.battery(d, W * 0.80, H * 0.47, 330 * K, t)
        a = appear(0.15)
        if a > 0:
            d.rounded_rectangle((x, H * 0.24 - (1 - a) * 30 * K, x + 120 * K * a, H * 0.24 + 8 * K - (1 - a) * 30 * K), radius=4 * K, fill=VOLT + (int(255 * a),))
        rows = []
        if c == "intro":
            rows = [(0.3, sp.get("kicker", ""), font("s", 34 * K), (147, 197, 253), 0.31),
                    (0.5, sp.get("heading", ""), font("x", 92 * K), (255, 255, 255), 0.38),
                    (0.75, sp.get("sub", ""), font("m", 38 * K), (203, 213, 225), 0.0)]
            y = H * 0.30
            for at, text, f, col, _ in rows:
                a = appear(at)
                for line in wrap(d, text, f, W * textw):
                    if a > 0:
                        d.text((x, y + (1 - a) * 40 * K), line, font=f, fill=col + (int(255 * a),))
                    y += f.size * 1.18
                y += 22 * K
            a = appear(1.1)
            if a > 0:
                d.text((x, H * 0.80), sp.get("footer", "Power Sector Academy  ·  Making you ready for AI-enabled Power Sector"), font=font("m", 27 * K), fill=(148, 163, 184, int(255 * a)))
        else:  # summary / outro with bullets that appear on cue
            a = appear(0.15)
            if a > 0:
                d.text((x, H * 0.27 + (1 - a) * 30 * K), sp.get("heading", "Key takeaways"), font=font("x", 70 * K), fill=(255, 255, 255, int(255 * a)))
            y = H * 0.385
            for k, b in enumerate(sp.get("bullets", [])):
                at = LEAD + self.L._word_time(seg, b["at"], 0)[0] if "at" in b else 0.6 + k * 0.4
                a = appear(at)
                f = font("m", 37 * K)
                lines = wrap(d, b["text"], f, W * (textw - 0.08))
                if a > 0:
                    cx = x + 18 * K
                    d.ellipse((cx - 11 * K, y + 14 * K, cx + 11 * K, y + 36 * K), fill=VOLT + (int(255 * a),))
                    for i, line in enumerate(lines):
                        d.text((x + 56 * K + (1 - a) * 40 * K, y + i * f.size * 1.25), line, font=f, fill=(241, 245, 249, int(255 * a)))
                y += len(lines) * f.size * 1.25 + 20 * K
            if sp.get("footer"):
                fa = sp.get("footer_at", 1.2)
                a = appear(LEAD + self.L._word_time(seg, fa, 0)[0] if isinstance(fa, str) else fa)
                if a > 0:
                    d.text((x, H * 0.885), sp["footer"], font=font("s", 30 * K), fill=(147, 197, 253, int(255 * a)))
        return img

    def battery(self, d, cx, cy, size, t):
        """A battery that charges up on the title card, with a lightning bolt and a grid line feeding it."""
        K = self.K
        a = ease_out((t - 0.4) / 0.8)
        if a <= 0:
            return
        w, h = size * 0.62, size
        x0, y0 = cx - w / 2, cy - h / 2 + (1 - a) * 40 * K
        al = int(255 * a)
        # grid line and pylon dots feeding the battery
        for i in range(5):
            px = x0 - 260 * K + i * 52 * K
            d.ellipse((px - 5 * K, cy - 5 * K, px + 5 * K, cy + 5 * K), fill=(147, 197, 253, int(al * 0.6)))
        flow = (t * 1.2) % 1
        d.line([(x0 - 270 * K, cy), (x0 - 10 * K, cy)], fill=(59, 130, 246, int(al * 0.5)), width=int(4 * K))
        fx = x0 - 270 * K + flow * 260 * K
        d.ellipse((fx - 9 * K, cy - 9 * K, fx + 9 * K, cy + 9 * K), fill=VOLT + (al,))
        d.rounded_rectangle((cx - w * 0.18, y0 - 26 * K, cx + w * 0.18, y0 + 4 * K), radius=8 * K, fill=(203, 213, 225, al))
        d.rounded_rectangle((x0, y0, x0 + w, y0 + h), radius=34 * K, outline=(226, 232, 240, al), width=int(12 * K), fill=(15, 32, 74, al))
        level = min(0.85, max(0, (t - 0.8) / 3.5)) if t > 0.8 else 0
        cells = 5
        gap, inner = 12 * K, 24 * K
        ch = (h - 2 * inner - (cells - 1) * gap) / cells
        for i in range(cells):
            fill_from = i / cells
            if level > fill_from:
                yb = y0 + h - inner - (i + 1) * ch - i * gap
                col = (34, 197, 94) if i < 3 else VOLT
                d.rounded_rectangle((x0 + inner, yb, x0 + w - inner, yb + ch), radius=10 * K, fill=col + (al,))
        bolt = [(18, 4), (8, 18), (15, 18), (13, 28), (24, 13), (17, 13), (18, 4)]
        bs = h * 0.42
        d.polygon([(cx - bs / 2 + px / 32 * bs, cy - bs / 2 + py / 32 * bs + (1 - a) * 40 * K) for px, py in bolt], fill=(255, 255, 255, int(al * 0.92)))
        d.text((cx, y0 + h + 40 * K), f"{int(level / 0.85 * 100)}%", font=font("b", 34 * K), fill=(203, 213, 225, al), anchor="mm")

    # marks -----------------------------------------------------------------
    def stroke(self, img, pts, color, width, alpha=255):
        if len(pts) < 2:
            return
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        m = width * 2 + 4
        ox, oy = int(min(xs) - m), int(max(0, min(ys) - m))
        ox = max(0, ox)
        w, h = int(max(xs) + m) - ox, int(max(ys) + m) - oy
        S = 2  # draw at 2x, then shrink: smooth edges
        lay = Image.new("L", (w * S, h * S), 0)
        dd = ImageDraw.Draw(lay)
        sp = [((px - ox) * S, (py - oy) * S) for px, py in pts]
        dd.line(sp, fill=alpha, width=int(width * S), joint="curve")
        r = width * S / 2
        for px, py in (sp[0], sp[-1]):
            dd.ellipse((px - r, py - r, px + r, py + r), fill=alpha)
        lay = lay.resize((w, h), Image.LANCZOS)
        img.paste(color, (ox, oy), lay)

    def apply_marks(self, img: Image.Image, seg: Segment, t: float):
        """Draw every mark on the slide image; returns pen tip (or None) and spotlight state."""
        K = self.K
        tip, spot = None, None
        for mk in seg.marks:
            p = (t - mk.t) / mk.dur
            x0, y0, x1, y1 = mk.rect
            if mk.kind == "reveal":
                if p >= 1:
                    continue
                pad = mk.spec.get("pad", 6) * K
                box = (int(x0 - pad), int(y0 - pad), int(x1 + pad), int(y1 + pad))
                col = img.getpixel((max(0, box[0] - 3), max(0, box[1] - 3)))
                e = ease(max(p, 0))
                cover = (box[0] + (box[2] - box[0]) * e, box[1], box[2], box[3])
                if mk.spec.get("fade"):
                    region = img.crop(box)
                    img.paste(Image.blend(Image.new("RGB", region.size, col), region, e), box[:2])
                else:
                    ImageDraw.Draw(img).rectangle(cover, fill=col)
                continue
            if p <= 0 or t > mk.until + 0.6 and mk.kind in ("spotlight",):
                continue
            if mk.kind == "highlight":
                e = ease(p)
                pad = 4 * K
                box = (int(x0 - pad), int(y0 - pad * 0.6), int(x0 - pad + (x1 - x0 + 2 * pad) * e), int(y1 + pad * 0.6))
                if box[2] > box[0]:
                    region = img.crop(box)
                    img.paste(ImageChops.multiply(region, Image.new("RGB", region.size, tuple(mk.spec.get("color", HILITE)))), box[:2])
                if p < 1:
                    tip = (box[2], (box[1] + box[3]) / 2)
            elif mk.kind in ("underline", "circle", "box", "arrow", "tick"):
                pts, tp = path_upto(mk.path, ease(p) if mk.kind != "tick" else min(1, p))
                col = tuple(mk.spec.get("color", (22, 163, 74) if mk.kind == "tick" else PEN))
                wdt = mk.spec.get("width", 7 if mk.kind == "tick" else 5) * K
                self.stroke(img, pts, col, wdt)
                if mk.kind == "arrow" and p > 0.85:
                    a = min(1, (p - 0.85) / 0.15)
                    (ax, ay), (bx, by) = mk.path[-4], mk.path[-1]
                    ang, L = math.atan2(by - ay, bx - ax), 22 * K * a
                    for s in (-1, 1):
                        self.stroke(img, [(bx, by), (bx - L * math.cos(ang + s * 0.5), by - L * math.sin(ang + s * 0.5))], col, wdt)
                if p < 1:
                    tip = tp
            elif mk.kind == "note":
                self.note(img, mk, ease_out(p))
            elif mk.kind == "spotlight":
                a = ease(p) if t < mk.until else 1 - ease((t - mk.until) / 0.5)
                if a > 0:
                    spot = (mk.rect, a)
        if spot:
            (x0, y0, x1, y1), a = spot
            pad = 14 * K
            dim = Image.new("L", img.size, int(150 * a))
            ImageDraw.Draw(dim).rounded_rectangle((x0 - pad, y0 - pad, x1 + pad, y1 + pad), radius=12 * K, fill=0)
            img.paste((5, 12, 30), (0, 0), dim.filter(ImageFilter.GaussianBlur(6 * K)))
        return tip

    def note(self, img, mk, a):
        if a <= 0:
            return
        K = self.K
        x0, y0, x1, y1 = mk.rect
        text = mk.spec["text"]
        f = font("s", mk.spec.get("size", 26) * K)
        d = ImageDraw.Draw(img)
        lines = wrap(d, text, f, mk.spec.get("width_px", 420) * K)
        tw = max(d.textlength(l, font=f) for l in lines)
        bw, bh = tw + 40 * K, len(lines) * f.size * 1.3 + 28 * K
        side = mk.spec.get("side", "right")
        gap = 26 * K
        if side == "right":
            bx, by = x1 + gap, (y0 + y1) / 2 - bh / 2
        elif side == "left":
            bx, by = x0 - gap - bw, (y0 + y1) / 2 - bh / 2
        elif side == "below":
            bx, by = (x0 + x1) / 2 - bw / 2, y1 + gap
        else:
            bx, by = (x0 + x1) / 2 - bw / 2, y0 - gap - bh
        bx = min(max(bx, 40 * K), self.W - 40 * K - bw)
        by = min(max(by, 34 * K), self.H - 110 * K - bh)
        s = 0.85 + 0.15 * a
        cx, cy = bx + bw / 2, by + bh / 2
        layer = Image.new("RGBA", (int(bw + 40 * K), int(bh + 40 * K)), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        o = 20 * K
        ld.rounded_rectangle((o + 3 * K, o + 6 * K, o + bw + 3 * K, o + bh + 6 * K), radius=14 * K, fill=(0, 0, 0, 70))
        bg = tuple(mk.spec.get("bg", (255, 248, 200)))
        ld.rounded_rectangle((o, o, o + bw, o + bh), radius=14 * K, fill=bg + (255,), outline=(234, 179, 8, 255), width=int(3 * K))
        for i, l in enumerate(lines):
            ld.text((o + 20 * K, o + 14 * K + i * f.size * 1.3), l, font=f, fill=tuple(mk.spec.get("fg", (30, 41, 59))) + (255,))
        if s != 1:
            layer = layer.resize((max(1, int(layer.width * s)), max(1, int(layer.height * s))), Image.BILINEAR)
        alpha = layer.getchannel("A").point(lambda v: int(v * a))
        layer.putalpha(alpha)
        img.paste(layer, (int(cx - layer.width / 2), int(cy - layer.height / 2)), layer)

    # camera ----------------------------------------------------------------
    def camera(self, seg: Segment, t: float):
        """(zoom, cx, cy) at time t: zoom marks pull the camera in, then back out."""
        z, cx, cy = 1.0, self.W / 2, self.H / 2
        for mk in seg.marks:
            if mk.kind != "zoom" or t < mk.t:
                continue
            x0, y0, x1, y1 = mk.rect
            pad = mk.spec.get("pad", 60) * self.K
            tz = min(mk.spec.get("max", 2.2), self.W / (x1 - x0 + 2 * pad), (self.H - 96 * self.K) / (y1 - y0 + 2 * pad))
            tz = max(tz, 1.05)
            tx, ty = (x0 + x1) / 2, (y0 + y1) / 2
            nxt = [o for o in seg.marks if o is not mk and o.kind == "zoom" and 0 <= o.t - mk.until <= 1.2]
            if nxt:  # the next zoom follows straight on: pan across instead of zooming out and in again
                e = ease((t - mk.t) / mk.dur) if t < nxt[0].t + nxt[0].dur else 0
            elif t < mk.until:
                e = ease((t - mk.t) / mk.dur)
            else:
                e = 1 - ease((t - mk.until) / 0.8)
            if e <= 0:
                continue
            z, cx, cy = 1 + (tz - 1) * e, cx + (tx - cx) * e, cy + (ty - cy) * e
        # keep the view inside the frame
        hw, hh = self.W / z / 2, self.H / z / 2
        cx, cy = min(max(cx, hw), self.W - hw), min(max(cy, hh), self.H - hh)
        return z, cx, cy

    def pointer(self, img, pos, alpha):
        if not pos or alpha <= 0:
            return
        K = self.K
        x, y = pos
        r = 26 * K
        lay = Image.new("RGBA", (int(4 * r), int(4 * r)), (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        c = 2 * r
        d.ellipse((c - r, c - r, c + r, c + r), fill=(255, 60, 60, int(70 * alpha)))
        lay = lay.filter(ImageFilter.GaussianBlur(7 * K))
        d = ImageDraw.Draw(lay)
        rr = 8 * K
        d.ellipse((c - rr, c - rr, c + rr, c + rr), fill=(255, 40, 40, int(255 * alpha)), outline=(255, 255, 255, int(220 * alpha)), width=max(1, int(2 * K)))
        img.paste(lay, (int(x - c), int(y - c)), lay)


def wrap(d, text, f, maxw):
    out, cur = [], ""
    for w in text.split():
        t = f"{cur} {w}".strip()
        if d.textlength(t, font=f) <= maxw or not cur:
            cur = t
        else:
            out.append(cur)
            cur = w
    return out + ([cur] if cur else [])


# ---------------------------------------------------------------- frames

class Renderer:
    def __init__(self, L: Lecture):
        self.L, self.P = L, Painter(L)
        self._last = {}

    def pointer_state(self, seg: Segment, t: float, tip):
        """The pen tip while drawing; otherwise glide between marks, fade away when idle."""
        if tip:
            return tip, 1.0
        drawn = [m for m in seg.marks if m.kind in ("underline", "circle", "box", "arrow", "tick", "highlight")]
        if not drawn:
            return None, 0
        prev = [m for m in drawn if m.t + m.dur <= t]
        nxt = [m for m in drawn if m.t > t]
        end = lambda m: path_upto(m.path, 1)[1] if m.path else (m.rect[2], (m.rect[1] + m.rect[3]) / 2)
        begin = lambda m: m.path[0] if m.path else (m.rect[0] - 4 * self.L.K, (m.rect[1] + m.rect[3]) / 2)
        if prev and nxt and nxt[0].t - (prev[-1].t + prev[-1].dur) < 4:
            a, b = prev[-1], nxt[0]
            t0 = max(a.t + a.dur, b.t - 0.7)
            e = ease((t - t0) / (b.t - t0)) if t > t0 else 0
            (ax, ay), (bx, by) = end(a), begin(b)
            return (ax + (bx - ax) * e, ay + (by - ay) * e), 1.0
        if nxt and nxt[0].t - t < 0.7:
            return begin(nxt[0]), ease((0.7 - (nxt[0].t - t)) / 0.7)
        if prev:
            a = prev[-1]
            return end(a), 1 - ease((t - a.t - a.dur) / 0.6)
        return None, 0

    def frame(self, seg: Segment, t: float):
        """One frame plus a key that changes only when the picture changes."""
        P, L = self.P, self.L
        key = [seg.idx]
        if "card" in seg.spec:
            img = P.card(seg, t)
            key.append(round(t, 3))  # cards always move a little
        else:
            img = P.slide(seg.spec["page"]).copy()
            tip = P.apply_marks(img, seg, t)
            for mk in seg.marks:
                p = (t - mk.t) / mk.dur
                key.append(round(min(max(p, 0), 1), 3))
                if mk.kind in ("spotlight", "zoom"):
                    key.append(round(min(max((t - mk.until) / 0.8, 0), 1), 3))
            z, cx, cy = P.camera(seg, t)
            key += [round(z, 4), round(cx, 1), round(cy, 1)]
            pos, a = self.pointer_state(seg, t, tip)
            if pos and a > 0:
                P.pointer(img, pos, a)
                key += [round(pos[0], 1), round(pos[1], 1), round(a, 2)]
            if z > 1.0001:
                w, h = L.W / z, L.H / z
                img = img.crop((cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2)).resize((L.W, L.H), Image.BICUBIC)
            P.chrome(img, seg)
        if t < FADE and seg.idx > 0:
            prev = self.L.segments[seg.idx - 1]
            if prev.idx not in self._last:
                self._last[prev.idx] = self.frame(prev, prev.dur - 1 / FPS)[0]
            last = self._last[prev.idx]
            e = ease(t / FADE)
            if "card" not in seg.spec and "card" not in prev.spec:
                # slide change: the new slide settles in from a small zoom
                s = 1.025 - 0.025 * e
                w, h = L.W / s, L.H / s
                img = img.crop(((L.W - w) / 2, (L.H - h) / 2, (L.W + w) / 2, (L.H + h) / 2)).resize((L.W, L.H), Image.BICUBIC)
            img = Image.blend(last, img, e)
            key.append(("fade", round(t, 3)))
        return img, tuple(key)


def render_segment(args):
    folder, preview, idx, out = args
    L = Lecture(Path(folder), preview)
    R = Renderer(L)
    seg = L.segments[idx]
    n = round(seg.dur * FPS)
    enc = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{L.W}x{L.H}", "-r", str(FPS), "-i", "-",
                            "-c:v", "libx264", "-preset", "medium" if not preview else "veryfast", "-crf", "16", "-pix_fmt", "yuv420p", "-g", str(FPS * 2), out], stdin=subprocess.PIPE)
    last_key, last = None, None
    for i in range(n):
        t = i / FPS
        img, key = R.frame(seg, t)
        if key != last_key:
            last, last_key = img.tobytes(), key
        enc.stdin.write(last)
    enc.stdin.close()
    if enc.wait():
        raise SystemExit(f"encoding failed for segment {seg.spec['id']}")
    return out


# ---------------------------------------------------------------- subtitles

def subtitles(L: Lecture):
    cues = []
    for seg in L.segments:
        tokens = seg.spec.get("subs", seg.spec["say"]).split()
        ti, words = 0, []
        for w in seg.words:  # give each spoken word its written form (with punctuation)
            nw = norm(w["w"])
            text = w["w"]
            for j in range(ti, min(ti + 4, len(tokens))):
                if norm(tokens[j]) and (norm(tokens[j]).startswith(nw) or nw.startswith(norm(tokens[j]))):
                    text, ti = tokens[j], j + 1
                    break
            words.append((seg.start + LEAD + w["s"], seg.start + LEAD + w["e"], text))
        cur = []
        for k, (s, e, text) in enumerate(words):
            cur.append((s, e, text))
            line = " ".join(x[2] for x in cur)
            gap = words[k + 1][0] - e if k + 1 < len(words) else 9
            if len(line) >= 34 and (text[-1] in ",.;:?!" or gap > 0.3) or len(line) >= 46 or text[-1] in ".?!" and len(line) > 16 or k + 1 == len(words):
                cues.append([cur[0][0], cur[-1][1], line])
                cur = []
    for a, b in zip(cues, cues[1:]):  # stay on screen until the next line (but not through long pauses)
        a[1] = min(max(a[1] + 0.25, a[1]), b[0] - 0.02) if b[0] - a[1] < 1.2 else a[1] + 0.4
    cues[-1][1] += 0.5

    def ts(x, sep):
        h, m, s = int(x // 3600), int(x % 3600 // 60), x % 60
        return f"{h:02d}:{m:02d}:{int(s):02d}{sep}{int(round((s - int(s)) * 1000)):03d}"

    vtt = "WEBVTT\n\n" + "\n".join(f"{ts(a, '.')} --> {ts(b, '.')} line:85%\n{t}\n" for a, b, t in cues)
    srt = "\n".join(f"{i}\n{ts(a, ',')} --> {ts(b, ',')}\n{t}\n" for i, (a, b, t) in enumerate(cues, 1))
    return vtt, srt


# ---------------------------------------------------------------- main

def main():
    folder = Path(sys.argv[1]).resolve()
    preview = "--preview" in sys.argv
    only = [a.split("=", 1)[1] for a in sys.argv if a.startswith("--only=")]
    L = Lecture(folder, preview)
    out = folder / ("out-preview" if preview else "out")
    parts = out / "parts"
    parts.mkdir(parents=True, exist_ok=True)
    jobs = [(str(folder), preview, s.idx, str(parts / f"{s.idx:03d}.mp4")) for s in L.segments if not only or s.spec["id"] in only[0].split(",")]
    print(f"{len(L.segments)} segments, {L.total:.1f} s, {L.W}x{L.H}")
    with Pool(int(os.environ.get("JOBS", os.cpu_count() or 2))) as pool:
        for p in pool.imap_unordered(render_segment, jobs):
            print("done", Path(p).name, flush=True)
    if only:
        return
    # narration track: each clip placed after its lead-in, silence padded to the segment length
    lst = out / "parts.txt"
    lst.write_text("".join(f"file '{parts / f'{s.idx:03d}.mp4'}'\n" for s in L.segments))
    filt, ins = [], []
    for k, s in enumerate(L.segments):
        ins += ["-i", str(s.audio)]
        filt.append(f"[{k}:a]aresample=48000,aformat=channel_layouts=mono,adelay={int(LEAD * 1000)}:all=1,apad,atrim=0:{s.dur:.3f}[a{k}]")
    filt.append("".join(f"[a{k}]" for k in range(len(L.segments))) + f"concat=n={len(L.segments)}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11[aout]")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *ins, "-filter_complex", ";".join(filt), "-map", "[aout]", "-ar", "48000", "-c:a", "pcm_s16le", str(out / "narration.wav")], check=True)
    vtt, srt = subtitles(L)
    (out / "subtitles.vtt").write_text(vtt)
    (out / "subtitles.srt").write_text(srt)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-i", str(out / "narration.wav"), "-i", str(out / "subtitles.srt"),
                    "-map", "0:v", "-map", "1:a", "-map", "2:s", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-c:s", "mov_text", "-metadata:s:s:0", "language=eng",
                    "-metadata", f"title={L.spec.get('title', '')}", "-movflags", "+faststart", "-shortest", str(out / "master.mp4")], check=True)
    print("wrote", out / "master.mp4")


if __name__ == "__main__":
    main()
