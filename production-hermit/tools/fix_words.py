"""Pin anchor words to measured pause ends and re-spread the words between anchors by their aligned lengths.
usage: python3 -I tools/fix_words.py voice/words.json voice/anchors.json"""
import json, sys
W = json.load(open(sys.argv[1])); A = {int(k): v for k, v in json.load(open(sys.argv[2])).items()}
ws = W["words"]; n = len(ws)
end_of = lambda i: ws[i]["e"]
keys = sorted(set(A) | {0}); A.setdefault(0, ws[0]["s"])
orig = [(w["s"], w["e"]) for w in ws]
for a, b in zip(keys, keys[1:] + [n]):
    t0 = A[a]; t1 = A[b] if b < n else orig[-1][1]
    # stop the segment at the original end of its last word if the next anchor follows a pause
    last_e = orig[b - 1][1] - orig[a][0] + t0 if b < n else t1
    t1e = min(t1 - 0.02, max(last_e, t0 + 0.1)) if b < n else t1
    span = orig[b - 1][1] - orig[a][0]; sc = (t1e - t0) / span if span > 0 else 1
    for i in range(a, b):
        ws[i]["s"] = round(t0 + (orig[i][0] - orig[a][0]) * sc, 3); ws[i]["e"] = round(t0 + (orig[i][1] - orig[a][0]) * sc, 3)
json.dump(W, open(sys.argv[1], "w"), indent=1)
