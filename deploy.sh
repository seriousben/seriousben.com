#!/usr/bin/env bash

set -e
shopt -s globstar

for f in public/**; do
  [ -f "$f" ] || continue
  remoteFileName=${f:6}
  echo "Uploading $f"
  curl -F "$remoteFileName=@$f" "https://$NEOCITIES_USER:$NEOCITIES_PASS@neocities.org/api/upload"
  echo "Uploaded $f"
done;
