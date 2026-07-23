#!/bin/bash
# Deploy only if everything passes. No && chains, no masked exit codes — those have let a
# broken build through three times now.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "— syntax —"
python3 - <<'PY'
import re
s=open('index.html').read()
m=re.search(r'const workletSrc = `(.*?)`;', s, re.S)
open('/tmp/w.js','w').write(m.group(1).replace('${VELAR}','0.568'))
b=re.findall(r'<script>(.*?)</script>', s, re.S)
open('/tmp/m.js','w').write(b[-1])
PY
node --check /tmp/w.js
node --check /tmp/m.js
echo "  ok"

echo "— checks —"
node lab/check.js

echo "— deploy —"
cp index.html /mnt/user-data/outputs/vocal-tract-lab.html
git add -A
git -c user.email=claude@anthropic.com -c user.name=Claude commit -qm "$1"
git push -q origin main
sleep 5
curl -s -H "Authorization: Bearer $VTL_TOKEN" -H "Accept: application/vnd.github.raw" \
  "https://api.github.com/repos/JohnHenryBurns/vocal-tract-lab/contents/index.html?ref=main" > /tmp/remote.html
diff -q /tmp/remote.html index.html
echo "  REMOTE == LOCAL"
