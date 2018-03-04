FROM jojomi/hugo:0.36 AS builder

RUN apk add --no-cache --upgrade py-pygments

WORKDIR /site
COPY . /site

RUN hugo

FROM nginx:1.13-alpine

COPY nginx-conf/default.conf /etc/nginx/conf.d/.
COPY --from=builder /site/public/ /usr/share/nginx/html
