#!/bin/bash

set -eo pipefail

onStop() {
  docker rm -f -v seriousben-blog-run
}

trap onStop SIGINT SIGTERM EXIT

docker build --no-cache -t seriousben-blog-run .

echo "running: http://localhost:8080/"
docker run -d -p "8080:80" --name seriousben-blog-run --rm seriousben-blog-run

sleep 15s

curl -L http://127.0.0.1:8080
curl -L http://127.0.0.1:8080 | grep '<h1 id="home-title">Benjamin Boudreau</h1>'
