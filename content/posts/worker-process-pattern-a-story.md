+++
date = "2019-04-14T08:27:51-04:00"
publishedDate = "2019-04-14T08:27:51-04:00"
title = "Worker process pattern, a story" 

categories = ["stories"]
+++

This post is just a little funny story to explain why you might need a worker process in your architecture. It roughly follows the Pixar storytelling formula.

There are more technical details at the end.

<!--more-->

# The story

Once upon a time there was an API. It was a popular API. With popularity came responsibilities which meant that it had to do a lot of different things. For example, sending emails, looking at Reddit and other important API work.

Every day, it was serving so many requests and for each of those it had to do so much work. To complete these requests, it had to go through different types of tasks. But the more it did, the longer it started to take for requests to be fully complete.

One day, one of the many things the API worked on broke. It did not know what to do and just left most of its operations in an incomplete state. It may have sent some or all emails, it may have posted some or all cat pictures on Reddit, it may have saved that piece of data in the database or not.

Because of that, it's developers were not very happy. They were seeing how slow the API was at doing its job and how most of the time the jobs were half done. The API started to think about a way to become better and faster. The API realized that to do so it had to handle more requests and also do less work.

Because of that, the API decided to reach out for help in it's professional network. The API was so lucky. A good hard-working friend was looking for work. That friend was the perfect fit since he liked doing stuff asynchronously and working very hard.

A friend that would allow the API to take it easy at last.

Until finally, the API asks its friend for help. The API started handling requests and its friend worked through all the queued jobs one by one.

They gave scalability, observability, reliability and most importantly peace of mind to their dear developers.

Never again would the API make its developers sad.

# Application in real life

The worker pattern or background job pattern or work queue pattern is not new. It is implemented in so many languages and platforms.

Heroku has a [good description on it](https://devcenter.heroku.com/articles/background-jobs-queueing).

Slack has a good [real world example overview of how they use that pattern](https://slack.engineering/scaling-slacks-job-queue-687222e9d100)

The first thing to ask yourself when implementing this pattern is what backing store to use for your work queue.

Normally, people have these choices:

* **No backing store**, doing everything in-process / in-memory. Depending on your type of work this might be the cheapest approach to take. But be sure to know the limits of such an approach. By not using a backing store you risk losing all worked queued up when the process restarts. You also cannot scale differently the workers and the APIs servers. And you cannot have specialized workers for different types of jobs.
* **Their database.** For example leveraging their existing Mongo or PostgreSQL infrastructure to store the queue of work. This approach is the pragmatic one. It gives you reliability and scalability advantages over the in-memory options. But it can become too slow for high throughput operations.
* **A dedicated data source** to store the queue of work. This is definitely a popular choice. This allows you to scale to lots of workers and lots of jobs while giving you advanced capabilities like priorities and some quality of service like at-least-once or exactly-once processing of a message. In most cases it also makes it easy to have a polyglot architecture where multiple frameworks and languages might consume and do work from queue. Kafka, Rabbitmq, Redis are examples of backing stores that can be used for this.

In go, you can leverage some existing libraries to tackle this problem:

* https://github.com/gocraft/work leverages Redis.
* https://github.com/RichardKnop/machinery supports multiple backing stores like Redis, AWS Simple Queue Service (SQS) and AMQP.
* https://github.com/Shopify/sarama can be leveraged to use kafka as a work queue.
* https://github.com/bgentry/que-go leverages PostgreSQL as a backing store for your work queue.

This list is not exhaustive.  There are tons of other good libraries to implement this pattern.  [Awesome Go](https://github.com/avelino/awesome-go) can be a good start to find similar libraries.



