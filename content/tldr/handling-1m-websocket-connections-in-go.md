+++
date = "2019-02-14 00:59:35.96 +0000 UTC"
publishDate = "2019-02-14 00:59:35.96 +0000 UTC"
title = "Handling 1M websocket connections in Go"
originalUrl = "https://github.com/eranyanay/1m-go-websockets"
comment = "The epoll tweak is pretty amazing <a href=\"https://github.com/eranyanay/1m-go-websockets/blob/master/3_optimize_ws_goroutines/epoll.go\">https://github.com/eranyanay/1m-go-websockets/blob/master/3_optimize_ws_goroutines/epoll.go</a> \nI also like the reflection done to get fd of the private net.Conn of gorillas websocket.Conn."
+++

### TLDR

The epoll tweak is pretty amazing <a href="https://github.com/eranyanay/1m-go-websockets/blob/master/3_optimize_ws_goroutines/epoll.go">https://github.com/eranyanay/1m-go-websockets/blob/master/3_optimize_ws_goroutines/epoll.go</a> 
I also like the reflection done to get fd of the private net.Conn of gorillas websocket.Conn.

[Read more](https://github.com/eranyanay/1m-go-websockets)
