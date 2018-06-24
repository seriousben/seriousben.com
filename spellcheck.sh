#!/bin/bash 
set -eo pipefail

set -x

mdspell -n -a -x --en-us -r  "content/**/*.md"
