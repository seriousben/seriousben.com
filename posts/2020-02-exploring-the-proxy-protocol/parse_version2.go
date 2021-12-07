package version2

import (
	"bufio"
	"bytes"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"net"
	"strconv"
)

// protocolV2HeaderLen represents the number of bytes needed
// to start parsing the protocol v2 header.
const protocolV2HeaderLen = 16

// protocolV2SignatureBytes represents the 12 constant bytes of the v2 signature.
var protocolV2SignatureBytes = []byte("\x0D\x0A\x0D\x0A\x00\x0D\x0A\x51\x55\x49\x54\x0A")

// ProxyInfo represents the PROXY protocol information.
type ProxyInfo struct {
	Version           string
	Command           string
	AddrFamily        string
	TransportProtocol string
	SrcAddr           string
	SrcPort           string
	DstAddr           string
	DstPort           string
}

// MaybeParseVersion2 returns information about the proxy header if contained into
// the buffered reader of an incoming request.
//
// No bytes are read from the buffered reader if there is no PROXY protocol header
// prepended to the request.
//
// If a PROXY protocol header is found, only the bytes of the PROXY protocol
// are consumed from the reader to allow the rest of the bytes to be used for
// a layer 7 protocol for example HTTP.
func MaybeParseVersion2(bufReader *bufio.Reader) (*ProxyInfo, error) {
	// Peek at enough bytes to be able to know if the protocol is a version 2
	// and to get the length of the PROXY protocol header.
	sigBytes, err := bufReader.Peek(protocolV2HeaderLen)
	if err != nil {
		return nil, fmt.Errorf("peek error: %w", err)
	}

	// Check if the peeked bytes start with a version 2 signature.
	isV2 := len(sigBytes) >= protocolV2HeaderLen && bytes.Equal(sigBytes[:len(protocolV2SignatureBytes)], protocolV2SignatureBytes)

	if !isV2 {
		return nil, nil
	}

	// sigBytes[12] contains the version
	// Check if the version == 2
	if sigBytes[12]>>4 != 0x2 {
		return nil, errors.New("unknown version of protocol")
	}

	// sigBytes[14:16] contains the length of the addresses
	// Integer are sent over the wire using network byte order.
	// To use them as integer we need to translate them into
	// a go primitive.
	lenInt := binary.BigEndian.Uint16(sigBytes[14:16])

	// The total header length is the length of the address plus the
	// constant length of 16 (signature + version + bytes for length)
	hdrLenInt := 16 + lenInt

	// Consume bytes from the request since we now know the request contains a
	// version 2 header and we have the length of the header.
	line := make([]byte, hdrLenInt)
	_, err = io.ReadFull(bufReader, line)
	if err != nil {
		return nil, err
	}

	p := &ProxyInfo{
		Version: "2",
	}

	// line[12] contains the command
	// Parse lower bits of 13th byte
	// AND 4 higher bits with zero (making them zero)
	c := line[12] & 0x01

	switch c {
	case 0x0:
		p.Command = "LOCAL"
	case 0x1:
		p.Command = "PROXY"
	default:
		return nil, errors.New("unknown version 2 command")
	}

	// line[13] contains the address family and the transport protocol.

	// Parse higher bits of 14th byte for the address family.
	// From 11110000 to 00001111 where the 4 first bits
	// are shifted to the right.
	af := line[13] >> 4

	switch af {
	case 0x0:
		p.AddrFamily = "AF_UNSPEC"
	case 0x1:
		p.AddrFamily = "AF_INET"
	case 0x2:
		p.AddrFamily = "AF_INET6"
	case 0x3:
		p.AddrFamily = "AF_UNIX"
	default:
		return nil, errors.New("unknown version 2 Address Family")
	}

	// Parse lower bits of 14th byte for the transport protocol.
	// AND 4 higher bits with zero (making them zero)
	tp := line[13] & 0x01

	switch tp {
	case 0x0:
		p.TransportProtocol = "UNSPEC"
	case 0x1:
		p.TransportProtocol = "STREAM"
	case 0x2:
		p.TransportProtocol = "DGRAM"
	default:
		return nil, errors.New("unknown version 2 Transport Protocol")
	}

	// Infer the Address and Port types by using the combination of
	// Address Family and Transport Protocol.
	switch line[13] {
	case 0x00:
		p.SrcAddr = "UNSPEC"
		p.SrcPort = "UNSPEC"
		p.DstAddr = "UNSPEC"
		p.DstPort = "UNSPEC"
	case 0x11: // TCP + IPv4
		p.SrcAddr = net.IP(line[16:20]).String()
		p.DstAddr = net.IP(line[20:24]).String()
		// Translate network byte order integer into a go primitive.
		p.SrcPort = strconv.FormatUint(uint64(binary.BigEndian.Uint16(line[24:26])), 10)
		p.DstPort = strconv.FormatUint(uint64(binary.BigEndian.Uint16(line[26:28])), 10)
	case 0x21: // TCP + IPv6
		p.SrcAddr = net.IP(line[16:32]).String()
		p.DstAddr = net.IP(line[32:48]).String()
		// Translate network byte order integer into a go primitive.
		p.SrcPort = strconv.FormatUint(uint64(binary.BigEndian.Uint16(line[48:50])), 10)
		p.DstPort = strconv.FormatUint(uint64(binary.BigEndian.Uint16(line[50:52])), 10)
	default:
		return nil, errors.New("unknown version 2 Address Type and Transport Protocol combination")
	}

	return p, nil
}
