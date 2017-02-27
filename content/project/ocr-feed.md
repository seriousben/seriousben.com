+++
title = "ocr feed"
date = "2017-01-31T14:44:39-05:00"

+++

This is a simple project made to play around with kubernetes with some fun extra stuff.

This project is [available on github](https://github.com/seriousben/ocr-feed).

## Overview

* Server rendering of Single-Page javascript application
* Hosted with Kubernetes on AWS
* Basic OCR features
* Feed of messages
* Native node modules used

### The server

The server is implemented as a very simple

Nodejs native modules

### The client

## Local Development/Deployment

### `docker-compose.yml` overview

The compose file consists of 3 services:

* The client

  Which serves the [Ember Fastboot](https://ember-fastboot.com/) server allowing server rendering of our Emberjs single-page application.

  Two environment variables are required for the client.

  ```yaml
    - API_HOST=http://localhost:3000
    - FASTBOOT_API_HOST=http://server:3000
  ```

  The `API_HOST` variable is the api url the javascript running on browser will use. It needs to point to an hostname to a server instance available from outside the AWS VPC. In other words, it is the public address of our server service.

  The `FASTBOOT_API_HOST` variables is the api url that will be used by fastboot when doing server rendering. For faster rendering, it should point to a server instance without leaving the amazon network and going through public routes. To put it simply, it is the private address to our server service.

* `server`

  Which serves the express server running our API.

  It only requires one environment variable. `PG_CONNECTION_STRING` is the connection string pointing to the postgres instance.

* `postgres`

  This is just a simple postgres instance without persistent volumes or state. Whenever it restarts, we lose all data.

## Deploying it

## CircleCI Setup

## References
 * Kubernete ([https://github.com/kubernetes/kubernetes](https://github.com/kubernetes/kubernetes))
 * Kubernete Operations ([https://github.com/kubernetes/kops](https://github.com/kubernetes/kops))
