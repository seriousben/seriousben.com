#!/bin/bash

set -eo pipefail

docker build -t seriousben-blog-run .

echo "running: http://localhost:8080/"
docker run -p "8080:80" --rm seriousben-blog-run
