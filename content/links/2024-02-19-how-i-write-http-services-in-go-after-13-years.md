+++
date = "2024-02-19T20:51:31.806802251Z"
publishDate = "2024-02-19T20:51:31.806802251Z"
title = "How I write HTTP services in Go after 13 years"
originalUrl = "https://grafana.com/blog/2024/02/09/how-i-write-http-services-in-go-after-13-years/"
comment = "Interesting take on setting up an HTTP service. They mention that using grpc or different protocols might require to adjust the structure. I would be curious to get their take on a service supporting grpc and HTTP to help me revisit older decisions.\n\nThe `signal.NotifyContext(ctx, os.Interrupt)` approach to cancel context on interrupt is really an improvement over starting a goroutine and using `Notify` with a channel.\n\nBest advice is to not use global scope to allow parallel testing without sporadic failures. Usinh `os.GetEnv` by passing a `func(string)` makes so much since."
+++

### My thoughts

Interesting take on setting up an HTTP service. They mention that using grpc or different protocols might require to adjust the structure. I would be curious to get their take on a service supporting grpc and HTTP to help me revisit older decisions.

The `signal.NotifyContext(ctx, os.Interrupt)` approach to cancel context on interrupt is really an improvement over starting a goroutine and using `Notify` with a channel.

Best advice is to not use global scope to allow parallel testing without sporadic failures. Usinh `os.GetEnv` by passing a `func(string)` makes so much since.

Read the article: [How I write HTTP services in Go after 13 years](https://grafana.com/blog/2024/02/09/how-i-write-http-services-in-go-after-13-years/)
