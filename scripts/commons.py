#!/usr/bin/env python3
# Fetch a composition's source plates from Wikimedia Commons and write its
# assets/CREDITS.txt. Plates are gitignored; the list of what to fetch is
# not. A composition that uses Commons plates has a `plates.txt`:
#
#   # file          width   Commons title
#   stairwell.jpg   2400    File:Bregenz-Cluttered interiors (compulsive hoarding)-stairwell-01ASD.jpg
#
# width is the scaled download width in px, or 0 for the original.
#
#   python3 scripts/commons.py fetch compositions/xp-digicam
#   python3 scripts/commons.py search "white plastic chair"
import json, re, sys, time, urllib.error, urllib.parse, urllib.request
from pathlib import Path

UA = {"User-Agent": "kino/0.1 (https://github.com/berker-z/kino)"}


def fetch(url, timeout=180):
    for k in range(6):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout).read()
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            time.sleep(5 * (k + 1))
    raise RuntimeError("rate limited: " + url)


def api(params):
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({**params, "format": "json"})
    return json.loads(fetch(url, 60))


def info(title, width=0):
    params = {"action": "query", "titles": title, "prop": "imageinfo", "iiprop": "url|extmetadata|size"}
    if width:
        params["iiurlwidth"] = width
    page = next(iter(api(params)["query"]["pages"].values()))
    if "imageinfo" not in page:
        raise SystemExit(f"not found on Commons: {title}")
    ii = page["imageinfo"][0]
    meta = ii["extmetadata"]
    artist = re.sub(r"<[^>]+>", "", meta.get("Artist", {}).get("value", "unknown")).strip().replace("\n", " ")
    license = meta.get("LicenseShortName", {}).get("value", "?")
    return (ii.get("thumburl") if width else ii["url"]), artist, license


def cmd_fetch(comp):
    comp = Path(comp)
    assets = comp / "assets"
    assets.mkdir(exist_ok=True)
    credits = []
    for line in (comp / "plates.txt").read_text().splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        name, width, title = re.split(r"\s+", line.strip(), maxsplit=2)
        url, artist, license = info(title, int(width))
        dest = assets / name
        if not dest.exists():
            dest.write_bytes(fetch(url))
            time.sleep(2)
        page = "https://commons.wikimedia.org/wiki/" + urllib.parse.quote(title.replace(" ", "_"))
        credits.append(f"{name}  {title} | {artist} | {license} | {page}")
        print(credits[-1])
    extra = comp / "credits-extra.txt"
    if extra.exists():
        credits += [l for l in extra.read_text().splitlines() if l.strip()]
    (assets / "CREDITS.txt").write_text("\n".join(credits) + "\n")


def cmd_search(query, n=15):
    r = api({"action": "query", "generator": "search", "gsrsearch": query + " filetype:bitmap", "gsrnamespace": 6,
             "gsrlimit": n, "prop": "imageinfo", "iiprop": "size|extmetadata"})
    for p in (r.get("query", {}).get("pages", {}) or {}).values():
        ii = p["imageinfo"][0]
        print(f'{p["title"]} | {ii["width"]}x{ii["height"]} | {ii["extmetadata"].get("LicenseShortName", {}).get("value", "?")}')


if __name__ == "__main__":
    if len(sys.argv) < 3:
        raise SystemExit(__doc__ if False else "usage: commons.py fetch <composition> | search <query>")
    {"fetch": lambda: cmd_fetch(sys.argv[2]), "search": lambda: cmd_search(" ".join(sys.argv[2:]))}[sys.argv[1]]()
