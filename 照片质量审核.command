#!/bin/zsh
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "${0:A:h}/cs" || exit 1
if /usr/bin/curl -fsS --max-time 2 http://127.0.0.1:4180/api/state >/dev/null 2>&1; then
  /usr/bin/open http://127.0.0.1:4180/
  exit 0
fi
(sleep 2; /usr/bin/open http://127.0.0.1:4180/) &
node scripts/serve-photo-review.mjs
