+++
date = "2017-09-20 03:16:22.135 +0000 UTC"
publishDate = "2017-09-20 03:16:22.135 +0000 UTC"
title = "Allocation Efficiency in High-Performance Go Services"
originalUrl = "https://segment.com/blog/allocation-efficiency-in-high-performance-go-services/"
comment = "This will change the way I think for such a long time:\n\nA common hypothesis derived from intuition goes something like this:\u00a0“copying values is expensive, so instead I’ll use a pointer.”\u00a0However, in many cases copying a value is much less expensive than the overhead of using a pointer."
+++

### TLDR

This will change the way I think for such a long time:

A common hypothesis derived from intuition goes something like this: “copying values is expensive, so instead I’ll use a pointer.” However, in many cases copying a value is much less expensive than the overhead of using a pointer.

[Read more](https://segment.com/blog/allocation-efficiency-in-high-performance-go-services/)
