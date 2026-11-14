# Feeloy shorts (apple repo): guide for a new session

This repo holds the Feeloy shorts **"No Goats Required"** (Alexander Selkirk, the real Robinson Crusoe, 1704-1709) and
**"Three Days Late"** (Michel Siffre, two months alone in a cave without clocks, 1962) and **"Lonely for Hire"** (Georgian
ornamental hermits, Painshill + Hawkstone), all ending on Feeloy. It was split out of `PineappleForest/eliza` (which holds the ten earlier shorts and is worked on by another
session): **push only to `PineappleForest/apple`**; read `eliza` for reference code, never push to it.

## What exists
| Composition | Story | Code | Production files | Output |
|---|---|---|---|---|
| `SelkirkShort` | Selkirk marooned 4 y 4 m; cats vs rats, dancing with goats, forgot how to talk: 59.5 s | `src/videos/selkirk/` | `production-selkirk/` | `out/selkirk_final.mp4` |
| `SiffreShort` | Siffre in an ice cave, no clocks: thought it was Aug 20 on Sep 14; welcomed 2000 three days late: 65 s | `src/videos/siffre/` | `production-siffre/` | `out/siffre_final.mp4` |
| `HermitShort` | Hired hermits: Painshill's quit for the pub after 3 weeks; Hawkstone's got a pub + a dummy; today, gnomes: 60.7 s | `src/videos/hermit/` | `production-hermit/` | `out/hermit_final.mp4` |

1080x1920 at 30 fps, registered in `src/Root.tsx`; the final render is 1440x2560 (`--scale 1.3333`).
Stack, post chain, file roles and pitfalls are the same as in `eliza/CLAUDE.md` (Remotion 4.0.290, three.js 0.169, flat
`Pen` character cards on the `NOINK` layer, ink -> lens -> bloom -> NEUTRAL -> grade). Method: skill `anthropic-skills:cartoon-3d-short`.

## The Selkirk set (src/videos/selkirk/)
- `story.ts`: one round island at `IC` (flat top, beach falling `DROP` m from `RF` to `RB`, sea at `WY`); `gy(x, z)` is the
  ground height and `G(x, y, z)` a ground-relative point. Camp: hut `HUT`, fire `FIRE`, notch palm `TALLY_PALM`. Land lies
  toward -z, open sea toward +z (a camera looking +z has +x on screen LEFT). The ship is one group moved per shot by
  `shipAt(id, f)` (deck at `DY`, `S(x, y, z)` = deck point); the rowboat shows only in shot 12. Rooms (`homeN`) as before.
- `build.ts`: `buildIsland` (sand/grass rings, hills under jungle, palms, rocks, hut, fire ring), `makeShip` (braced sails so
  they read from the side), `buildRowboat`. The river town code is still in the file but not built.
- `toon.ts` additions: `beard` outfit field, `"tricorn"` hat, `fxCat` (sit/sleep/dance/eat/hiss), `fxGoat`, `fxRat`,
  `fxFlame` (glow card), `fxTally`, `fxBulldog`, `fxMeat`, `fxZzz`, `fxHalfWord`.
- `cast.ts`: 14 shots; `onGround()` stands an animal card on the island; `sleepers` = the cat pile around a sleeper.

## The Siffre set (src/videos/siffre/, copied from selkirk)
- `story.ts`: rooms `hq` (the surface team's pine hut), `homeN`, `cave`. The cave is a dome (radius `CR`, height `CH`) with a
  hole under a vertical shaft (`HOLE`, up to `SHAFT_TOP`); the rope ladder hangs at `LADDER_X`; camp `TABLE` (lantern + field
  phone cards) and `TENT`. `C(x, y, z)` = cave point. The exterior (alpine meadow, peaks, the pit at `MOUTH`) is at the origin.
  Shot 12b repeats one camera move three times (`SAME`) with the cast timed from each repeat's start, so they match exactly.
- `build.ts`: `buildCave` (shell + shaft do not cast shadows, so the key light reaches the camp), `buildAlps`, the `hq` room.
- `lights.ts`: the golden preset is retuned as warm lamplight with deep blue shade (cave shots); day fog 90-1500 m for the peaks.
- `toon.ts`: hats `"helmet"` (caver's helmet + lamp) and `"party"`; `fxFieldPhone`, `fxHandset`, `fxStopwatch`, `fxDate`,
  `fxLantern`, `fxBottle`. No sun disc, no white flash (see Pitfalls).
- Take: 63.2 s as delivered (no pauses added); words pinned via `voice/anchors.json`; captions merge 1962 and 2000.

## The Hermit set (src/videos/hermit/, copied from siffre)
- `story.ts`: a Georgian park at the origin: Painshill's hermitage `HUT1` (door toward +z) with `STOOL1` and the advert post
  `POST1`; Hawkstone's stone hermitage `HUT2`, `STOOL2`, the visitors' bell `BELL2`; the Hawkstone Arms `PUB`. Rooms: `pub`
  (interior, lit with the lamplight preset), `homeN`. The cave/island code is still in the files but not built.
- `build.ts`: `buildPark` (meadow, low hills, lake, rotunda temple, trees kept off the lens lines, two `hermitage()` huts,
  the pub building), the `pub` room. `toon.ts`: `fxAdvert`, `fxThing`, `fxMoneyBag`, `fxDummy`, `fxGnome`, `fxPubSign`, `fxBell`.
- Take: 58.6 s as delivered; captions merge "1700s" and "£700" (Montserrat latin has £).

## Voice, captions, sound (production-selkirk/)
- Take: ElevenLabs "Mark" s50 (fast) ran 55.2 s; four beat pauses were inserted (after the hook +0.45 s, after "He was also
  alone" +0.6, before the Jenny turn +0.75, after "silence" +0.45) -> `voice/voice.wav` 57.4 s.
- Alignment: `tools/align_take.py`, then `tools/fix_words.py voice/words.json voice/anchors.json` pins hand-measured word
  starts (pause ends + syllable onsets) and re-spreads the rest. `voice/words_auto.json` is the raw aligner output.
- Captions: `voice/phrases.json` -> `tools/caption_pages.py` (merges "seventeen oh four" into "1704").
- Sound: `python3 -I audio/make_audio.py production-selkirk` (from the repo root) writes `audio/mix.wav`, stems, `cues.md`.
  Any change to shot timing means re-running it.

## Rendering (RunPod GPU pod; the workspace has no GPU)
```
git clone https://github.com/PineappleForest/apple && cd apple     # first time; later: git pull
./render.sh preview                                  # 720x1280 quick check -> out/selkirk_preview.mp4
./render.sh final --props='{"logo":true}'            # 1440x2560 -> out/selkirk_final.mp4
./render.sh remux                                    # new mix.wav only, no re-render
COMP=SiffreShort ./render.sh preview                 # the Siffre short (same modes)
COMP=HermitShort ./render.sh preview                 # the Hermit short (same modes)
```
Still checks in the workspace: `REMOTION_TMP=/home/claude/rtmp COMP=SelkirkShort PROPS='{"post":{"dpr":0.5}}' node scripts/stills.mjs out/x_ 60,400 0.5`

## Pitfalls hit on this short
- The first hook (a low backlit golden sun in frame: HDR sun disc + additive halo over the grazing sea) flickered half the
  frame white on the pod GPU. The sun disc/halo are now off for the whole film (`showSun = false` in world.ts), the hook
  is a daylight glide in from the sea, and the 4-frame white flash after the hook is gone (crossfade to the deck).
- Small ground animals 6-7 m from a 1.5 m-high lens land on the caption line (y ~67 %): put them at or behind the main
  character's depth, or lower the lens.
- A push-in (`pushK`) dollies toward the LOOK point: aiming at the horizon makes a "slow push" travel metres. Aim at a
  point near the subject.
- `rng()` with a negative seed returns negative numbers (NaN geometry from `sqrt`): seed with `Math.abs(...) + k`.
- Golden shots looking toward land are backlit (all shade, reads as night): give them `sunAz` ~165.
- Square sails across the hull are edge-on from the side: brace the yards (~0.75 rad).
