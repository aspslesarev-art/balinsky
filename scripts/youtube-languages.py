"""Which language is spoken in each YouTube video the site links to.

Russian videos are shown only on the Russian site (owner's rule, 2026-10-14);
the editors' `languages` tag on a video is not reliable for that (English
walkthroughs tagged 'ru', untagged Russian construction reports with Latin
titles). The spoken language comes from YouTube itself: the auto-generated
caption track (kind "asr") carries the language of the audio. A video with no
such track has no speech (music walkthroughs) and is stored as "none".
Auto-dubbed videos: the audio track marked "original" wins.

Collects video ids from the videos, news and events manifests and writes
lib/youtube-lang.json ({id: "ru" | "en" | … | "none"}). Ids already in the
file are kept unless --force; free, no key.

  python3 scripts/youtube-languages.py
"""
import json
import os
import re
import sys
import time
import urllib.request

OUT = 'lib/youtube-lang.json'
FORCE = '--force' in sys.argv
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36'
ID_RE = re.compile(r'(?:youtu\.be/|youtube\.com/(?:watch\?v=|shorts/|embed/|live/))([a-zA-Z0-9_-]{11})')

env = {}
for line in open('.env.local', encoding='utf8'):
    if '=' in line and not line.startswith('#'):
        k, v = line.rstrip('\n').split('=', 1)
        env[k] = v.strip().strip('"\'')
STORAGE = env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/') + '/storage/v1/object/public'
MANIFESTS = ['feeds/_videos.json', 'news/_news.json', 'events/_events.json']


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'en'})
    return urllib.request.urlopen(req, timeout=30).read().decode('utf8', 'ignore')


def spoken_language(vid):
    html = fetch(f'https://www.youtube.com/watch?v={vid}')
    if 'captionTracks' not in html and 'playabilityStatus' not in html:
        raise RuntimeError('no player data (consent page?)')
    # Auto-dubbed videos carry several audio tracks; the one marked "original"
    # is what was actually said, and its asr track is not always listed first.
    orig = re.search(r'"displayName":"[^"]*original","id":"([a-zA-Z]+)', html)
    if orig:
        return orig.group(1).lower()
    m = (re.search(r'"languageCode":"([a-zA-Z-]+)","kind":"asr"', html)
         or re.search(r'"kind":"asr","languageCode":"([a-zA-Z-]+)"', html))
    return m.group(1).split('-')[0] if m else 'none'


def main():
    known = json.load(open(OUT)) if os.path.exists(OUT) else {}
    ids = set()
    for path in MANIFESTS:
        ids |= set(ID_RE.findall(fetch(f'{STORAGE}/{path}')))
    todo = sorted(i for i in ids if FORCE or i not in known)
    print(f'video ids: {len(ids)}, to check: {len(todo)}')
    for n, vid in enumerate(todo, 1):
        try:
            known[vid] = spoken_language(vid)
        except Exception as e:  # keep going; the id stays unknown and falls back to tags
            print(f'  {vid}: {str(e)[:80]}')
        if n % 20 == 0:
            print(f'  {n}/{len(todo)}')
        time.sleep(1)
    json.dump(dict(sorted(known.items())), open(OUT, 'w'), indent=0)
    counts = {}
    for v in known.values():
        counts[v] = counts.get(v, 0) + 1
    print('languages:', counts)


if __name__ == '__main__':
    main()
