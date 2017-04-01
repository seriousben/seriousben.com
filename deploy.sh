#!/bin/bash

set -e

echo "Build static docker image"
docker build -f Dockerfile.build -t hugo-builder .

echo "Build static files"
docker run --rm -v "$PWD:/site" hugo-builder

echo "Build serve docker image"
docker build -f Dockerfile.serve -t seriousben-com .

docker push seriousben/seriousben-com
