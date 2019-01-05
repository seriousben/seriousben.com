+++
date = "2018-04-01"
publishDate = "2018-04-01 2:00:00.000 +0000 UTC"
title = "Some golang gotchas"
author = "Me"
+++

Go is such a simple and elegant language. There is no magic happening and reading go code is so straightforward. But like any language there are some gotchas.

This post is about some general Golang gotchas (and neat tricks I have used or seen people use).

## Range and iterators

This gotcha is a pretty important one that I see people do all the time. It is a very tricky one to track down as well.

In one sentence: **iterations reuses addresses**.


### Simple example

```go
package main

import "fmt"

type someStruct struct {
	str string
}

func main() {
	vals := []someStruct{someStruct{"1"}, someStruct{"2"}, someStruct{"3"}, someStruct{"4"}, someStruct{"5"}}

	var myVal *someStruct
	for _, val := range vals {
		if val.str == "1" {
			myVal = &val
		}
	}
	fmt.Println("myVal of value 1 ==", myVal.str)
}
```
[Go Playground](https://play.golang.org/p/XPY9tiPe__A)

**myVal will equal 5 and not 1.**

This is because val is always the same address in the iteration. There every iteration uses the same address resulting the address of val to contain different data.

A way to fix this would be to copy values.

```go
package main

import "fmt"

type someStruct struct {
	str string
}

func main() {
	vals := []someStruct{someStruct{"1"}, someStruct{"2"}, someStruct{"3"}, someStruct{"4"}, someStruct{"5"}}

	var myVal *someStruct
	for _, val := range vals {
		if val.str == "1" {
			tmp := val
			myVal = &tmp
		}
	}
	fmt.Println("myVal of value 1 ==", myVal.str)
}
```
[Go Playground](https://play.golang.org/p/xFG-NTfJpmq)

Here `val` is copied within `tmp` resulting in a new address.

### Goroutine example

When using goroutines within a loop, you can end up in the same situation as well.

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	for i := 0; i != 10; i++ {
		go func() {
			fmt.Println(i)
		}()
	}
	time.Sleep(5) // Waiting for goroutine to end
}
```

[Go Playground](https://play.golang.org/p/SUedHfgDbCU)

In this example, we see that simple `for i` iterations (even without using a `range` operator) also reuses the same address for `i`.

This will print:
```
10
10
10
10
10
10
10
10
10
10
```

To fix this problem, **only rely on the address of an iteration when doing work within the loop**. Both using the variable outside the loop or in a goroutine will result in unexpected behavior.

You could do this instead:
```go
package main

import (
	"fmt"
	"time"
)

func main() {
	for i := 0; i != 10; i++ {
		go func(num int) {
			fmt.Println(num)
		}(i)
	}
	time.Sleep(5) // Waiting for goroutine to end
}
```

[Go Playground](https://play.golang.org/p/D1nvmNrFxSP)

## Fun with golang nils

Pointers in go are typed. That is they are a pointer to a value of a specific type.
This means that `nil` for a pointer of a specific type is NOT `nil` for a pointer of another type.

This example shows that pretty clearly:

```go
package main

import (
	"fmt"
)

type customError struct{}

func (ce *customError) Error() string {
	return "customError string"
}

type customStuff struct {
	error *customError
}

func main() {
	var err error = customStuff{}.error
	if err == nil {
		fmt.Println("err IS nil ->", err)
	} else {
		fmt.Println("err IS NOT nil ->", err)
	}
	if err == (*customError)(nil) {
		fmt.Println("err IS (A*customError)(nil) ->", err)
	} else {
		fmt.Println("err IS NOT nil ->", err)
	}

	err2 := customStuff{}.error
	if err2 == nil {
		fmt.Println("err2 IS nil ->", err2)
	} else {
		fmt.Println("err2 IS NOT nil ->", err2)
	}

}
```

[Go Playground](https://play.golang.org/p/Gp3ep0FGexV)

The output of this example will be:
```
err IS NOT nil -> customError string
err IS (*customError)(nil) -> customError string
err2 IS nil -> customError string
```

You can see that even though my `customError` implements the `Error` interface it is not equal to `Error(nil)`.

This gotchas is the reason why you should always return a nil of type `error` and never of you custom type.

## Fun with golang scopes and := assignment operator

Guess what this little program will print.

```go
package main

import (
	"errors"
	"fmt"
)

func main() {
	err1 := errors.New("err1")
	err2 := errors.New("err2")
	a, err := "a", err1

	for {
		a, err := "b", err2
		_, _ = a, err // Bypassing "not used" error
		break
	}

	fmt.Println("Is err == err2? \n> ", err == err2)
	fmt.Println("Is a == \"b\"? \n> ", a == "b")
}
```

[Go Playground](https://play.golang.org/p/qjO7kBurYJX)

Now guess what this little program will print.

```go
package main

import (
	"errors"
	"fmt"
)

func main() {
	err1 := errors.New("err1")
	err2 := errors.New("err2")
	a, err := "a", err1

	for {
		a, err = "b", err2
		_, _ = a, err // Bypassing "not used" error
		break
	}

	fmt.Println("Is err == err2? \n> ", err == err2)
	fmt.Println("Is a == \"b\"? \n> ", a == "b")
}
```

[Go Playground](https://play.golang.org/p/ZaPDVtzqmR8)


### Spoilers

Program 1 will print:
```
Is err == err2?
>  false
Is a == "b"?
>  false
```

Program 2 will print:
```
Is err == err2?
>  true
Is a == "b"?
>  true
```

The difference is the assignment done at line 14.

I often see this when dealing with errors. Just be aware that might be creating a brand new variable within a scope OR that you might be overwriting the value of a parent scope.


## Functions can implement interfaces too

```go
// A Handler responds to an HTTP request.
type Handler interface {
	ServeHTTP(ResponseWriter, *Request)
}
...
// The HandlerFunc type is an adapter to allow the use of
// ordinary functions as HTTP handlers. If f is a function
// with the appropriate signature, HandlerFunc(f) is a
// Handler that calls f.
type HandlerFunc func(ResponseWriter, *Request)

// ServeHTTP calls f(w, r).
func (f HandlerFunc) ServeHTTP(w ResponseWriter, r *Request) {
    f(w, r)
}
```

This snippet is how [functions can be handlers](https://github.com/golang/go/blob/4468b0bac156b76b2a591b3aa3a0aa4dd60a0fce/src/net/http/server.go#L1940) in the core library of go.

## Extra reading

- [50 Shades of Go: Traps, Gotchas, and Common Mistakes for New Golang Devs](http://devs.cloudimmunity.com/gotchas-and-common-mistakes-in-go-golang/) by Kyle Quest
    - While only covering Go 1.5 and below this post is invaluable and will continue to be for a long time. I really recommend going through it and using it as a reference.
