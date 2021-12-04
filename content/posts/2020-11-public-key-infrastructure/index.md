---
title: "Exploring Public Key Infrastructures"
date: 2020-11-15T18:50:07-05:00
draft: false
tags: ["general"]
description: ""
toc: true
---

__TODO:__

- Make https://github.com/seriousben/experiment-certificates public
- Plugin SSH

---

Public Key Infrastructures (PKIs) are everywhere. They are the security backbone of the internet. They are used to make HTTPS work, to sign emails and files, in cloud networks and applications to build zero-trust networking solutions, in internet-of-things applicances when connecting home, and in so many other use cases.

With the rise of microservices and public clouds, PKIs are now more than ever more approachable. Most applications requiring secure communications are supporting it. Often, in more ways than one. Setting up a Kubernetes cluster, for example, requires some dambling with PKIs and certificate. It is required to setup [client certificate authentication](https://kubernetes.io/docs/concepts/cluster-administration/certificates/). It is also required for its core functionality with [3 required Certificate Authorities and 7 certificates](https://kubernetes.io/docs/setup/best-practices/certificates/). 

In this post, we will explore this world one step at a time. We will do some experimentations and some deep-diving to help test my assumptions. I will attempt to de-mystify Public Key Infrastructures as much as possible. We will create a mental model to help ourselves understanding and taking advantages of PKIs.

Hopefully, you'll learn and have as much fun as I did diving into this world.

A note of caution. This post is about experimenting. Do not take any code, examples or explanations as fact. The goal of this post is to simplify and demystify Certificate Authorities / Public Key Infrastructures. Keep in mind that the most secure systems are the ones where we do not roll the cryptography/security ourselves (https://www.schneier.com/blog/archives/2011/04/schneiers_law.html). Consider building on the shoulders of giants especially in a security situation. If you are creating your own PKI right now. Consider looking into tools like: [CloudFlare's PKI tool](https://github.com/cloudflare/cfssl) or [HashiCorp Vault's PKI Secret Engine](https://www.vaultproject.io/docs/secrets/pki).

Now, let's get into it.

## Mental Model

In this section, we will look at the theory behind PKIs. Consider coming back to this section when trying to understand the later sections if you prefer experiementing first.

### It starts with trust

The most important concept behind PKI is trust.

Without trust, there is no PKI nor any security. A client needs to trust a server. A browser needs to be able to trust that the website being naviagated to is really there right website and not a malicious website or actor.

Between humans, the concept of trust is more implicit and transparent. Paying for my groceries at the supermarket is a simple operation. I give money to the cashier. The cashier gives me a receipt. I am free to leave the store with my purchases. In my mind, I have automatically analyzed the cashier and decided to truth them. They are behind the cash register. They have employee uniform. Other people went before me through that cashier without any issues. Therefore, without me spending much thoughts on it, I trust that I can give them money. I trust that they will give me a receipt. I trust that the exchange between money and goods has been completed in a legal manner. I trust that the receipt I was given is an official proof of the exchange.

Another interesting element that comes into play when humans decide to trust is reputation. This hairdresser was recommended by people I trust, therefore I trust this hairdresser to do an amazing job. This company is very popular, therefore it must be good.

Now. How do we represent the concept of trust and reputation with code and computer systems?

### Codifying trust between machines

"Programatic" trust is a very complex problem. How do we make computer A trust computer B but not other computers. And how do prevent Computer C from posting a Computer B. 

```
[Computer A] trusts [Computer B]
[Computer A] does not trust [Computer C]
```

TODO: Figure good name.

There are various principles/axioms/... to the limit of computers:
- A computer can only use data available to it.
- A computer can, by default, only trust the data it has locally.
- A computer is limited by the various communication protocol it uses 
- A computer can


PKI is all about trust. The browser being able to trust a website requires a whole system.

A system needs to be able to verify the identity of a website/server without having to communicate with another system that would also require some form of trust. To do that, your system has multiple Certificate Authorities that form the root of the trust chain.

You trust some certificate authority. These CA are used to signed the Certificates used by 

TODO: Diagram
```
// A user can trust that the communication is secure.
[You] <-> [Website] = SUCCESS

// A malicious website cannot masquerade as another Website.
[You] <-> [MaliciousWebsite as Website] = ERROR

// A malicious actor cannot intercept/listen to communication between a user and a website. 
[You] <-> [Website] = SUCCESS
       ^
       |
 [MaliciousActor] = ERROR
```



```
[You]                                                    [Website]
With Certificate Authorities data          With Certificate (certifying the identity of the website) validated/signed by a Certificate Authority.

[You]                     ->   [Website]                 ->  [Intermediate Organization]        ->        
Root                            Certificate signed             Certificate signed by a Root CA
                             by Intermediate Organization


Root CA1                Root CA2
       |                              |
CA  CA  CA  CA            CA  CA
IA IA IA IA IA IA
```



### Defining (Portraying, Describing, ...) the nomenclature 

NOTE/IDEA: Instead of defining these terms in a section, let's define them the first time they appear. Possibly on the side as side notes.

Signing

Encrypting

HTTPS

TLS

SSL

Private Key

Public Key

Certificate

Certificate Authority

Public Key Infrastructure

### Certificate Authorities in the Real World

For the internet to be secure, these Certificate Authorities have to be known to users accross the world. These are various mechanism to do this at the Browser level and at the system level.

For example, one of the most popular Certificate Authority program consists in the Firefox/Mozilla one. TODO It consisits in.

- All CA in Firefox: https://hg.mozilla.org/releases/mozilla-beta/file/tip/security/nss/lib/ckfw/builtins/certdata.txt
- Required Root CA for Wndows to work: https://docs.microsoft.com/en-us/troubleshoot/windows-server/identity/trusted-root-certificates-are-required
- Trusted root certificate in MacOSx: https://support.apple.com/en-us/HT210770
- Android trusted root certs: https://android.googlesource.com/platform/system/ca-certificates/+/master
- Google Chrome New Root Program: https://www.chromium.org/Home/chromium-security/root-ca-policy
- Syncing trust between OpenSSL and macosx: Syncing macOS Keychain certificates with Homebrew's OpenSSL https://akrabat.com/syncing-macos-keychain-certificates-with-homebrews-openssl/

## [Experimentation] HTTPS Server with a Self-Signed Certificate

This first experimentation section will serve as the basis for all other experiementations.

You can find full source code in TODO GitHub repository.

### Create cert

### OpenSSL Cert Out

```console
$ openssl x509 -in ./out/self-signed-cert.pem -text

Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number:
            10:6f:2f:1c:2b:c9:0f:31:6d:39:e3:b3:f5:0a:bd:9a
    Signature Algorithm: sha256WithRSAEncryption
        Issuer: O=acme, CN=self-signed cert
        Validity
            Not Before: Nov 15 21:55:54 2020 GMT
            Not After : Nov 15 21:55:54 2021 GMT
        Subject: O=acme, CN=self-signed cert
        Subject Public Key Info:
            Public Key Algorithm: rsaEncryption
                Public-Key: (2048 bit)
                Modulus:
                    00:a5:5e:76:71:44:0f:21:a5:ec:34:f2:ac:19:41:
                    bc:37:30:10:c5:5f:67:bd:dd:da:aa:3b:6c:35:dc:
                    de:69:68:3a:48:ab:07:14:80:e2:92:34:83:62:66:
                    9c:af:68:9e:f1:59:25:5f:ba:1d:40:b3:1e:5a:8f:
                    fc:ea:d7:f2:37:d0:07:b4:ff:9c:ad:01:c0:76:eb:
                    1c:70:c6:72:e8:2d:08:b4:75:61:35:11:a5:8a:59:
                    69:cf:34:5d:a7:1a:1b:cc:7a:e1:12:0c:69:20:b3:
                    d3:7d:ee:e5:a1:46:13:77:c1:8d:6e:b3:c1:0d:61:
                    b2:ba:09:60:46:d5:27:b1:ff:b1:18:2b:82:77:75:
                    36:99:a3:ff:1b:bd:de:cf:f9:f0:24:b6:dc:8e:24:
                    86:f8:c7:ff:01:1d:fe:10:cc:74:fd:d1:c0:cf:09:
                    2a:6a:78:61:6e:f6:ab:54:7d:be:27:3d:89:a9:6b:
                    0e:d3:29:6e:4d:d6:b4:35:19:df:0e:45:02:a6:75:
                    3a:c4:e3:5a:41:64:1b:67:f0:fb:5c:ce:c3:71:4b:
                    b2:4e:f2:95:dd:76:8e:e3:08:99:f3:2d:56:95:06:
                    54:a8:63:64:08:ef:93:c0:2c:58:d7:76:dc:ed:81:
                    78:87:b2:d9:08:dc:63:7b:75:db:f4:6b:8a:d1:cb:
                    ef:25
                Exponent: 65537 (0x10001)
        X509v3 extensions:
            X509v3 Key Usage: critical
                Digital Signature, Key Encipherment
            X509v3 Extended Key Usage:
                TLS Web Server Authentication
            X509v3 Basic Constraints: critical
                CA:FALSE
            X509v3 Subject Alternative Name:
                DNS:localhost, IP Address:127.0.0.1
    Signature Algorithm: sha256WithRSAEncryption
         2a:c3:b0:a5:26:3e:b5:6e:22:0e:97:56:61:62:ca:04:1d:45:
         cb:8e:72:5f:5f:09:df:c7:7e:0b:63:16:47:e3:44:97:2e:23:
         f2:04:92:f3:c4:69:93:43:2e:e8:f3:dd:37:1c:27:b0:39:65:
         46:1f:6a:d1:86:27:3d:a0:14:64:59:48:d7:d0:12:22:e6:71:
         53:8a:c6:e7:15:4c:59:33:72:88:3a:a3:b9:2b:bc:c6:9d:59:
         29:9c:1b:e1:d2:53:3b:54:3d:27:25:e8:6f:be:59:85:b6:28:
         6c:f3:01:ae:31:0d:b4:26:5e:56:0c:d5:c0:c0:a5:46:1a:13:
         58:50:50:c3:1e:90:42:ba:e7:c3:72:e1:e5:fe:fa:c3:53:71:
         90:ce:8e:76:00:6e:6a:f4:3b:8b:73:2a:59:31:bb:07:4e:5d:
         1e:12:8a:c0:ae:a5:53:76:e6:53:17:d3:4e:39:a0:ae:84:81:
         54:19:00:02:1c:be:13:5a:e7:59:28:43:6d:e7:bd:c0:07:9a:
         55:ce:1d:46:cb:df:e4:bb:19:8b:64:86:ab:35:b6:ce:1a:52:
         5d:75:b9:ff:33:07:d6:82:7d:61:39:59:70:6e:46:42:08:7d:
         fb:76:5a:ba:e3:c9:19:2a:06:3c:01:c3:53:87:ef:8b:c3:ef:
         1f:49:63:14
-----BEGIN CERTIFICATE-----
MIIDLzCCAhegAwIBAgIQEG8vHCvJDzFtOeOz9Qq9mjANBgkqhkiG9w0BAQsFADAq
MQ0wCwYDVQQKEwRhY21lMRkwFwYDVQQDExBzZWxmLXNpZ25lZCBjZXJ0MB4XDTIw
MTExNTIxNTU1NFoXDTIxMTExNTIxNTU1NFowKjENMAsGA1UEChMEYWNtZTEZMBcG
A1UEAxMQc2VsZi1zaWduZWQgY2VydDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCC
AQoCggEBAKVednFEDyGl7DTyrBlBvDcwEMVfZ73d2qo7bDXc3mloOkirBxSA4pI0
g2JmnK9onvFZJV+6HUCzHlqP/OrX8jfQB7T/nK0BwHbrHHDGcugtCLR1YTURpYpZ
ac80XacaG8x64RIMaSCz033u5aFGE3fBjW6zwQ1hsroJYEbVJ7H/sRgrgnd1Npmj
/xu93s/58CS23I4khvjH/wEd/hDMdP3RwM8JKmp4YW72q1R9vic9ialrDtMpbk3W
tDUZ3w5FAqZ1OsTjWkFkG2fw+1zOw3FLsk7yld12juMImfMtVpUGVKhjZAjvk8As
WNd23O2BeIey2QjcY3t12/RritHL7yUCAwEAAaNRME8wDgYDVR0PAQH/BAQDAgWg
MBMGA1UdJQQMMAoGCCsGAQUFBwMBMAwGA1UdEwEB/wQCMAAwGgYDVR0RBBMwEYIJ
bG9jYWxob3N0hwR/AAABMA0GCSqGSIb3DQEBCwUAA4IBAQAqw7ClJj61biIOl1Zh
YsoEHUXLjnJfXwnfx34LYxZH40SXLiPyBJLzxGmTQy7o8903HCewOWVGH2rRhic9
oBRkWUjX0BIi5nFTisbnFUxZM3KIOqO5K7zGnVkpnBvh0lM7VD0nJehvvlmFtihs
8wGuMQ20Jl5WDNXAwKVGGhNYUFDDHpBCuufDcuHl/vrDU3GQzo52AG5q9DuLcypZ
MbsHTl0eEorArqVTduZTF9NOOaCuhIFUGQACHL4TWudZKENt573AB5pVzh1Gy9/k
uxmLZIarNbbOGlJddbn/MwfWgn1hOVlwbkZCCH37dlq648kZKgY8AcNTh++Lw+8f
SWMU
-----END CERTIFICATE-----
```

### Openssl key out

```
openssl rsa -in ./out/self-signed-key.pem -pubout -text
Private-Key: (2048 bit)
modulus:
    00:a5:5e:76:71:44:0f:21:a5:ec:34:f2:ac:19:41:
    bc:37:30:10:c5:5f:67:bd:dd:da:aa:3b:6c:35:dc:
    de:69:68:3a:48:ab:07:14:80:e2:92:34:83:62:66:
    9c:af:68:9e:f1:59:25:5f:ba:1d:40:b3:1e:5a:8f:
    fc:ea:d7:f2:37:d0:07:b4:ff:9c:ad:01:c0:76:eb:
    1c:70:c6:72:e8:2d:08:b4:75:61:35:11:a5:8a:59:
    69:cf:34:5d:a7:1a:1b:cc:7a:e1:12:0c:69:20:b3:
    d3:7d:ee:e5:a1:46:13:77:c1:8d:6e:b3:c1:0d:61:
    b2:ba:09:60:46:d5:27:b1:ff:b1:18:2b:82:77:75:
    36:99:a3:ff:1b:bd:de:cf:f9:f0:24:b6:dc:8e:24:
    86:f8:c7:ff:01:1d:fe:10:cc:74:fd:d1:c0:cf:09:
    2a:6a:78:61:6e:f6:ab:54:7d:be:27:3d:89:a9:6b:
    0e:d3:29:6e:4d:d6:b4:35:19:df:0e:45:02:a6:75:
    3a:c4:e3:5a:41:64:1b:67:f0:fb:5c:ce:c3:71:4b:
    b2:4e:f2:95:dd:76:8e:e3:08:99:f3:2d:56:95:06:
    54:a8:63:64:08:ef:93:c0:2c:58:d7:76:dc:ed:81:
    78:87:b2:d9:08:dc:63:7b:75:db:f4:6b:8a:d1:cb:
    ef:25
publicExponent: 65537 (0x10001)
privateExponent:
    02:ba:ee:85:ac:33:fb:c0:3b:88:1c:41:8f:21:30:
    b4:50:8c:d6:55:5e:e7:19:94:94:9e:ea:88:71:1f:
    12:ea:6f:9b:e7:86:f4:65:b4:57:e9:9a:09:b3:db:
    fe:61:61:ce:66:44:61:b2:36:ed:6c:87:a1:c3:22:
    cf:d5:c4:df:fb:05:45:8d:ba:ce:78:6a:ef:0b:ae:
    aa:85:fc:3b:ad:12:a9:b8:0e:64:cb:e7:c9:c2:f4:
    26:41:9d:12:37:32:22:4c:1d:0f:29:39:4b:1a:ec:
    f0:f5:52:c1:38:e0:f5:67:32:a8:93:3b:2a:b7:64:
    36:02:15:9e:d5:c2:14:04:37:e1:d9:0a:19:51:33:
    9c:16:08:16:ba:5c:23:d2:e3:1e:1b:9a:8f:0a:cd:
    3d:e8:26:62:49:25:9f:8c:75:a4:75:5e:17:47:32:
    43:ad:45:82:89:52:15:72:6b:fe:a5:07:b4:47:df:
    a7:1b:bf:2c:06:cc:b5:77:6d:14:f6:10:ca:e1:4c:
    25:31:a9:a7:ff:00:03:72:d0:d6:40:5a:74:a0:b8:
    ef:f8:21:df:f8:11:70:c6:0b:b4:f7:8d:a4:5b:4f:
    98:87:73:d4:63:9a:30:da:7a:94:64:b8:b9:41:89:
    98:b2:ee:93:e3:9d:14:0e:b6:f9:b5:cc:53:50:c8:
    79
prime1:
    00:c6:53:c2:61:6d:0f:5d:6f:37:2d:6f:70:97:3e:
    82:98:ec:18:14:d4:bb:90:97:cc:fa:12:dc:4a:9b:
    52:c0:4f:65:bc:0e:aa:ca:32:a5:a5:de:3c:f1:9d:
    a4:3a:b9:63:07:63:e9:50:2f:78:98:a2:08:54:38:
    49:2d:80:d0:1a:29:a0:c4:1a:60:e5:16:8b:2b:7c:
    b2:72:1c:8a:b1:8e:19:e6:87:69:57:7d:04:cb:29:
    df:ce:a2:c2:40:c7:2a:8e:df:4a:09:88:09:cf:12:
    4e:c2:fd:6d:d8:9d:cd:a8:a9:23:48:93:aa:b3:04:
    86:2b:6c:2a:70:e9:50:16:f7
prime2:
    00:d5:75:2b:27:1b:99:35:22:77:30:22:05:9f:10:
    fc:8f:4b:d9:c5:ad:bb:3b:4c:4d:c2:94:75:c6:38:
    e2:f2:73:fa:cb:57:7c:c4:cd:76:a6:ca:42:55:36:
    f7:74:fb:18:e3:70:aa:ed:ba:12:b8:62:f0:be:90:
    6b:c5:ce:f5:ad:1d:39:03:16:ea:d5:4e:a7:b8:eb:
    fe:96:3f:82:d6:81:6f:e3:46:92:be:96:e0:28:c9:
    d7:c3:80:dc:09:0c:91:7d:e5:b7:51:13:b9:26:85:
    f5:61:1e:d0:71:26:f2:12:88:c9:77:2f:1d:96:0b:
    18:9d:07:d5:ad:48:47:d7:c3
exponent1:
    75:f5:2d:60:8a:e0:1f:9f:5d:3f:0d:cf:f6:74:bc:
    72:3d:c1:d8:e9:ea:21:06:d8:68:48:3d:73:b6:4c:
    12:8b:66:a3:e2:49:5c:77:a1:24:35:39:24:2f:b1:
    95:27:dc:29:72:18:3b:93:f0:73:3f:b4:1a:7b:5b:
    b2:cf:b1:76:4e:1a:0b:68:f1:06:70:51:17:ed:53:
    a9:21:26:b0:92:26:ff:80:bc:7b:c7:a4:c9:3d:3f:
    9b:04:1c:eb:30:4a:34:ad:c3:b8:45:8c:27:f7:e8:
    96:7a:eb:11:72:51:f6:a5:9a:91:b9:1a:46:dd:42:
    fb:a2:9a:df:8b:35:12:63
exponent2:
    41:70:d6:75:fa:e4:11:82:2b:80:3a:2d:f7:02:42:
    2b:bc:59:5b:5d:53:d5:6e:23:38:d0:42:fb:2e:5d:
    85:6f:41:28:2d:fe:36:67:b7:44:93:25:9a:f2:6b:
    13:16:18:1f:42:5f:64:da:72:fa:cc:7a:7a:31:d4:
    98:a4:46:75:78:4c:0e:42:6c:64:50:e4:e2:b0:97:
    30:80:f0:1f:cb:36:fe:3a:98:aa:8d:9e:d3:62:6e:
    1f:a5:d5:cf:80:66:ea:6e:0e:b1:70:96:86:d4:f2:
    d1:7f:9c:ef:d3:bc:cb:29:dc:7a:09:9b:cc:70:42:
    6f:82:03:64:48:90:9d:f9
coefficient:
    77:5f:c3:39:bb:cf:80:18:bd:01:fc:13:49:0f:62:
    4f:07:f0:61:81:58:2f:a0:3c:37:44:90:3e:79:15:
    71:bc:a8:a7:2f:02:ab:e0:4b:a2:6f:77:ab:c2:cb:
    b0:44:30:23:bf:5a:ea:de:71:9f:95:dd:9c:83:98:
    7c:4a:53:7a:8d:86:82:61:1a:1b:d2:f1:84:d4:88:
    23:71:c7:f2:f4:8c:f2:aa:02:0f:ae:b8:de:d8:7b:
    29:38:d2:f5:9a:28:5f:d1:53:a0:f3:46:24:ee:90:
    6e:ac:07:1f:08:cf:04:e4:02:7c:74:e2:91:e4:31:
    4e:51:e6:63:fd:79:13:0d
writing RSA key
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApV52cUQPIaXsNPKsGUG8
NzAQxV9nvd3aqjtsNdzeaWg6SKsHFIDikjSDYmacr2ie8VklX7odQLMeWo/86tfy
N9AHtP+crQHAdusccMZy6C0ItHVhNRGlillpzzRdpxobzHrhEgxpILPTfe7loUYT
d8GNbrPBDWGyuglgRtUnsf+xGCuCd3U2maP/G73ez/nwJLbcjiSG+Mf/AR3+EMx0
/dHAzwkqanhhbvarVH2+Jz2JqWsO0yluTda0NRnfDkUCpnU6xONaQWQbZ/D7XM7D
cUuyTvKV3XaO4wiZ8y1WlQZUqGNkCO+TwCxY13bc7YF4h7LZCNxje3Xb9GuK0cvv
JQIDAQAB
-----END PUBLIC KEY-----
```

### Create Server
### Openssl s_client
### Curl with insecure
### Go Client
### Conslusion

- How to make curl be more secure? Why isn't it secure?
- How to make a browser trust a cert?
- How to make the Go Client trust the cert?

## Anatomy of a X.509 certificate

IETF RFC 5280: Internet X.509 Public Key Infrastructure Certificate and Certificate Revocation List (CRL) Profile.
Understanding the RFC
ASN.1: Data types, Sequence, ObjectIdentifier, ... 

DER Encoding

PEM Encoding - ASCII armor

The go 1.15.2 representation of a X.509 Certificate:
```
// A Certificate represents an X.509 certificate.
type Certificate struct {
    Raw                     []byte // Complete ASN.1 DER content (certificate, signature algorithm and signature).
    RawTBSCertificate       []byte // Certificate part of raw ASN.1 DER content.
    RawSubjectPublicKeyInfo []byte // DER encoded SubjectPublicKeyInfo.
    RawSubject              []byte // DER encoded Subject
    RawIssuer               []byte // DER encoded Issuer

    Signature          []byte
    SignatureAlgorithm SignatureAlgorithm

    PublicKeyAlgorithm PublicKeyAlgorithm
    PublicKey          interface{}

    Version             int
    SerialNumber        *big.Int
    Issuer              pkix.Name
    Subject             pkix.Name
    NotBefore, NotAfter time.Time // Validity bounds.
    KeyUsage            KeyUsage

    // Extensions contains raw X.509 extensions. When parsing certificates,
    // this can be used to extract non-critical extensions that are not
    // parsed by this package. When marshaling certificates, the Extensions
    // field is ignored, see ExtraExtensions.
    Extensions []pkix.Extension

    // ExtraExtensions contains extensions to be copied, raw, into any
    // marshaled certificates. Values override any extensions that would
    // otherwise be produced based on the other fields. The ExtraExtensions
    // field is not populated when parsing certificates, see Extensions.
    ExtraExtensions []pkix.Extension

    // UnhandledCriticalExtensions contains a list of extension IDs that
    // were not (fully) processed when parsing. Verify will fail if this
    // slice is non-empty, unless verification is delegated to an OS
    // library which understands all the critical extensions.
    //
    // Users can access these extensions using Extensions and can remove
    // elements from this slice if they believe that they have been
    // handled.
    UnhandledCriticalExtensions []asn1.ObjectIdentifier

    ExtKeyUsage        []ExtKeyUsage           // Sequence of extended key usages.
    UnknownExtKeyUsage []asn1.ObjectIdentifier // Encountered extended key usages unknown to this package.

    // BasicConstraintsValid indicates whether IsCA, MaxPathLen,
    // and MaxPathLenZero are valid.
    BasicConstraintsValid bool
    IsCA                  bool

    // MaxPathLen and MaxPathLenZero indicate the presence and
    // value of the BasicConstraints' "pathLenConstraint".
    //
    // When parsing a certificate, a positive non-zero MaxPathLen
    // means that the field was specified, -1 means it was unset,
    // and MaxPathLenZero being true mean that the field was
    // explicitly set to zero. The case of MaxPathLen==0 with MaxPathLenZero==false
    // should be treated equivalent to -1 (unset).
    //
    // When generating a certificate, an unset pathLenConstraint
    // can be requested with either MaxPathLen == -1 or using the
    // zero value for both MaxPathLen and MaxPathLenZero.
    MaxPathLen int
    // MaxPathLenZero indicates that BasicConstraintsValid==true
    // and MaxPathLen==0 should be interpreted as an actual
    // maximum path length of zero. Otherwise, that combination is
    // interpreted as MaxPathLen not being set.
    MaxPathLenZero bool

    SubjectKeyId   []byte
    AuthorityKeyId []byte

    // RFC 5280, 4.2.2.1 (Authority Information Access)
    OCSPServer            []string
    IssuingCertificateURL []string

    // Subject Alternate Name values. (Note that these values may not be valid
    // if invalid values were contained within a parsed certificate. For
    // example, an element of DNSNames may not be a valid DNS domain name.)
    DNSNames       []string
    EmailAddresses []string
    IPAddresses    []net.IP
    URIs           []*url.URL

    // Name constraints
    PermittedDNSDomainsCritical bool // if true then the name constraints are marked critical.
    PermittedDNSDomains         []string
    ExcludedDNSDomains          []string
    PermittedIPRanges           []*net.IPNet
    ExcludedIPRanges            []*net.IPNet
    PermittedEmailAddresses     []string
    ExcludedEmailAddresses      []string
    PermittedURIDomains         []string
    ExcludedURIDomains          []string

    // CRL Distribution Points
    CRLDistributionPoints []string

    PolicyIdentifiers []asn1.ObjectIdentifier
}
```

TODO: Explain each types

## [Experimentation] HTTPS Server with a CA Signed Certificate
### Create CA cert
### Openssl ca key out
### Openssl ca cert out -> Highlight CA attribute
### Create Cert signed with CA
### Openssl key out
### Openssl cert out -> Highlight Issuer attribute - Compare issuer of Self-Sign
### Create Server
### Openssl s_client
### Curl with ca attribute
### Go Client
### Raise Question: Root CA. Is there a way to have that Root be completely offline so that it does not have to be used to create cert trusted by it?

## [Experimentation] HTTPS Server with an Intermediate Certificate Authority

Same as CA Signed, but with another layer.

Raise Question: What to do when the Root Certificate expires?

This is a x509 certificate:

```
The cert
```

Here is its Public Key:

```
The public key
```

Here is an Intermediate Authority of that Certificate:

```
Certificate authority
```

Create a Root certificate and its Root public key - Root Certificate Authority
Create an Intermediate Authority certificate from the Root certificate (we should not need to use its public key)
Use TLS HTTP server + client with the Root


## [Experimentation] HTTPS Server with cross-signed certificate
Certificate Rotation
Of server cert
Of Intermediate Certificate Authority
Of Root certificate -> BOOM

## Revoking an Intermediate Authority from Root certificate (or maybe from a second IA)
TODO: Explain: Revocation lists are not checked and are not secured.

Revoking an Intermediate Authority from Root certificate
Revoking 
Certificate transparency lists

### References:
- Leveraging no enforcement enforcement of expiry: https://letsencrypt.org/2020/12/21/extending-android-compatibility.html
- https://en.wikipedia.org/wiki/Certificate_revocation_list
- https://en.wikipedia.org/wiki/Online_Certificate_Status_Protocol
- https://en.wikipedia.org/wiki/OCSP_stapling
- https://github.com/hashicorp/vault/issues/2631 - Implement OCSP responder
- CloudFlare has links to how it is broken, except when not used for browsers: https://blog.cloudflare.com/cloudflare-ca-encryption-origin/

## Rotating Certificate Authorities

- https://kubernetes.io/docs/tasks/tls/manual-rotation-of-ca-certificates/

## Reviewing letsencrypt chain of trust

https://letsencrypt.org/certificates/

Cross signed certs

## More Reading / Out of scope / Future / Continuing to learn

- https://github.com/google/easypki
- https://golang.org/src/crypto/tls/generate_cert.go
- https://scriptcrunch.com/create-ca-tls-ssl-certificates-keys/
- https://github.com/denji/golang-tls
- https://itnext.io/practical-guide-to-securing-grpc-connections-with-go-and-tls-part-2-994ef93b8ea9
- https://fale.io/blog/2017/06/05/create-a-pki-in-golang/
- https://www.namecoin.org/2018/03/25/cross-signing-name-constraints-go.html
- https://security.stackexchange.com/questions/199380/how-can-i-use-x-509-cross-signing-to-replace-a-ca
- https://scotthelme.co.uk/cross-signing-alternate-trust-paths-how-they-work/
- https://www.ssltrust.ca/blog/understanding-certificate-cross-signing
- https://www.feistyduck.com/library/openssl-cookbook/online/ch-testing-with-openssl.html
- https://medium.com/@superseb/get-your-certificate-chain-right-4b117a9c0fce
- HashiCorp Vault PKI
- CloudFlare PKI tool: https://github.com/cloudflare/cfssl
- https://geekflare.com/tls-101/
- Nice diagram of trust and mtls: https://medium.com/sitewards/the-magic-of-tls-x509-and-mutual-authentication-explained-b2162dec4401
- Easy to understand TLS handshake: https://www.cloudflare.com/learning/ssl/what-happens-in-a-tls-handshake/
- Super good post with go details with mtls and cfssl: https://regeda.me/posts/2020-10-29-service-to-service-authorization-in-go-using-x509-certificates/
- Apple CA pki https://lapcatsoftware.com/articles/revocation.html
- CloudFlare Original CA to secure connection between CloudFlare and your origin servers. https://blog.cloudflare.com/cloudflare-ca-encryption-origin/
- Google Chrome rolling out their own root program: https://www.chromium.org/Home/chromium-security/root-ca-policy

## Brainstorm

Overview
Simple use case
If someone gives you a file and you want to make sure it comes from the company
IA -> The person
Root -> Company
Certificate
Example
SAN
Common name
Serial ID
Root Certificate
Intermediate Authority
Why
Revocation lists
Why
CRL
Crlsets
https://github.com/hashicorp/vault/issues/2631
Rotations
of Root Certificate
of Certificate
of private keys
Must cover:
Cert bundles
mTLS
Authn AND AUTHZ
TLS Passthrough proxy
PKI -> Public Key Infrastructure
Server cert vs CA
OpenSSL Debug problems
openssl x509 -in cert.pem -text -noout
openssl s_client -connect example.com:443
https://www.freecodecamp.org/news/openssl-command-cheatsheet-b441be1e8c4a/




