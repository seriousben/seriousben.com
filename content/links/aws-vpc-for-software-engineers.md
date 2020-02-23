
+++
date = "2020-02-08 01:42:25.781 +0000 UTC"
publishDate = "2020-02-08 01:42:25.781 +0000 UTC"
title = "AWS VPC for Software Engineers"
originalUrl = "https://blog.deleu.dev//aws-vpc-for-software-engineers/"
comment = "Approachable mental model of main cloud networking concepts (uses AWS terms).\n\nA summary from the article:\n\nVPC: Internet Cafe for LAN parties with computer connected together.\n\nSubnets: They are how we would separate a big Internet Cafe into multiple independent LANs that can't communicate with each other. It defines the boundaries of a local network.\n\nRoute table: Rules and patterns allowing to configure how to dispatch network traffic of a subnet.\n\nNAT / Network Address Translation: Allows to translate LAN IP addresses into publicly routable addresses.\n\nAvailability Zones: A VPC exists in an AWS Region and is available on several availability zones (AZs). With the local construct of the route table, AWS handles communication between 2 subnets in different AZs."
+++

### Comment

Approachable mental model of main cloud networking concepts (uses AWS terms).

A summary from the article:

VPC: Internet Cafe for LAN parties with computer connected together.

Subnets: They are how we would separate a big Internet Cafe into multiple independent LANs that can't communicate with each other. It defines the boundaries of a local network.

Route table: Rules and patterns allowing to configure how to dispatch network traffic of a subnet.

NAT / Network Address Translation: Allows to translate LAN IP addresses into publicly routable addresses.

Availability Zones: A VPC exists in an AWS Region and is available on several availability zones (AZs). With the local construct of the route table, AWS handles communication between 2 subnets in different AZs.

[Read more](https://blog.deleu.dev//aws-vpc-for-software-engineers/)
