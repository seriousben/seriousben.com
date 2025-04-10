+++
date = "2025-04-10T15:50:28.953311552Z"
publishDate = "2025-04-10T15:50:28.953311552Z"
title = "go sync.Map"
originalUrl = "https://victoriametrics.com/blog/go-sync-map/"
comment = "Amazing deep dive into go's sync.Map\n\nI was expecting a similar approach to https://github.com/xacrimon/dashmap / https://docs.rs/dashmap/latest/dashmap/ which does sharding to reduce lock contention.\n\nsync.Map is pretty interesting, it offers CAS-like functions and has a whole state machine for entries in order to reduce lock contention.\n\nI wonder which are the tradeoffs in the two approaches."
+++

### My thoughts

Amazing deep dive into go's sync.Map

I was expecting a similar approach to https://github.com/xacrimon/dashmap / https://docs.rs/dashmap/latest/dashmap/ which does sharding to reduce lock contention.

sync.Map is pretty interesting, it offers CAS-like functions and has a whole state machine for entries in order to reduce lock contention.

I wonder which are the tradeoffs in the two approaches.

Read the article: [go sync.Map](https://victoriametrics.com/blog/go-sync-map/)
