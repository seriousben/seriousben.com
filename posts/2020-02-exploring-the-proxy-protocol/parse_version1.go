package version1

import (
	"bufio"
	"bytes"
	"fmt"
)

// ProxyInfo represents the PROXY protocol information.
type ProxyInfo struct {
	Version    string
	AddrFamily string
	SrcAddr    string
	SrcPort    string
	DstAddr    string
	DstPort    string
}

// MaybeParseVersion1 returns information about the proxy header if contained in
// the buffered reader of an incoming request.
//
// No bytes are read from the buffered reader if there is no PROXY protocol header
// prepended to the request.
//
// If a PROXY protocol header is found, only the bytes of the PROXY protocol
// are consumed from the reader to allow the rest of the bytes to be used for
// a layer 7 protocol for example HTTP.
func MaybeParseVersion1(bufReader *bufio.Reader) (*ProxyInfo, error) {
	// Only peek at 5 bytes to check if it starts with PROXY
	sigBytes, err := bufReader.Peek(5)
	if err != nil {
		return nil, fmt.Errorf("peek error: %w", err)
	}

	// Is the request data starting with `PROXY`?
	isV1 := len(sigBytes) >= 5 && bytes.Equal(sigBytes[:5], []byte("PROXY"))

	if !isV1 {
		return nil, nil
	}

	// read until CRLF \r\n
	line, isPrefix, err := bufReader.ReadLine()
	if err != nil {
		return nil, fmt.Errorf("version 1 readLine error: %w", err)
	}
	if isPrefix {
		return nil, fmt.Errorf("version 1 line too long")
	}

	// split fields by space
	sections := bytes.Split(line, []byte("\x20"))
	if len(sections) != 6 {
		return nil, fmt.Errorf("version 1 header corrupted, not enough sections (got: %d, want: %d)", len(sections), 6)
	}

	return &ProxyInfo{
		Version:  "1",
		AddrType: string(sections[1]),
		SrcAddr:  string(sections[2]),
		DstAddr:  string(sections[3]),
		SrcPort:  string(sections[4]),
		DstPort:  string(sections[5]),
	}, nil
}
