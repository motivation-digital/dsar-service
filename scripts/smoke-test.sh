#!/usr/bin/env bash
set -euo pipefail

URL="https://dsar-service.launchpad.workers.dev/health"
echo "Smoke testing: $URL"

for i in 1 2 3 4 5; do
  HTTP_CODE=$(curl -s -o /tmp/health.json -w "%{http_code}" "$URL" || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "OK ($HTTP_CODE):"
    cat /tmp/health.json
    echo
    exit 0
  fi
  echo "Attempt $i: HTTP $HTTP_CODE — waiting 5s..."
  sleep 5
done

echo "FAILED — last response:"
cat /tmp/health.json 2>/dev/null || echo "(no body)"
exit 1
