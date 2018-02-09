FROM jojomi/hugo:0.36 AS build

RUN apk add --no-cache --upgrade py-pygments

VOLUME /site
WORKDIR /site

COPY . /site

ENTRYPOINT hugo

FROM nginx:1.13-alpine

COPY --from=build /site/public /usr/share/nginx/html
