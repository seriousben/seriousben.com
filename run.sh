#!/bin/bash

set -eo pipefail

docker build -t seriousben-blog-run .
docker run -p "8080:80" --rm seriousben-blog-run
