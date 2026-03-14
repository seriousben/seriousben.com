#!/bin/bash
set -eo pipefail

mdspell -n -a -x --en-us -r "content/**/*.md"
