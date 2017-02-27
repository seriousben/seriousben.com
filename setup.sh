#!/bin/bash

set -e

VERSION=0.18.1

PACKAGE="https://github.com/spf13/hugo/releases/download/v${VERSION}/hugo_${VERSION}_Linux-64bit.tar.gz"
TAR_NAME="hugo_${VERSION}_linux_amd64"

curl -L -0 $PACKAGE | tar -zx

mv $TAR_NAME/$TAR_NAME hugo

chmod u+x hugo
rm -rf $TAR_NAME
