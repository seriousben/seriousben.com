
+++
date = "2020-05-15 22:52:34.759 +0000 UTC"
publishDate = "2020-05-15 22:52:34.759 +0000 UTC"
title = "Jepsen: MongoDB 4.2.6"
originalUrl = "http://jepsen.io/analyses/mongodb-4.2.6"
comment = "Oof\n\n> Jepsen evaluated MongoDB version 4.2.6, and found that even at the strongest levels of read and write concern, it failed to preserve snapshot isolation. Instead, Jepsen observed read skew, cyclic information flow, duplicate writes, and internal consistency violations. Weak defaults meant that transactions could lose writes and allow dirty reads, even downgrading requested safety levels at the database and collection level."
+++

### Comment

Oof

> Jepsen evaluated MongoDB version 4.2.6, and found that even at the strongest levels of read and write concern, it failed to preserve snapshot isolation. Instead, Jepsen observed read skew, cyclic information flow, duplicate writes, and internal consistency violations. Weak defaults meant that transactions could lose writes and allow dirty reads, even downgrading requested safety levels at the database and collection level.

[Read more](http://jepsen.io/analyses/mongodb-4.2.6)
