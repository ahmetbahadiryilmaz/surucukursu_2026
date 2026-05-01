# MEBBIS Service — Request/Response Logging System

## Overview

The mebbis-service automatically logs **every outgoing HTTP request and response** to the MEBBIS platform (mebbisyd.meb.gov.tr). Logs are written to disk so that AI/Copilot agents can read them to understand request flows, debug issues, and analyse MEBBIS API behaviour.

## Directory Structure

```
backend/services/mebbis-service/logs/requests/
├── requests.log                                          ← Master log (append-only, all requests)
└── YYYY-MM-DD/                                           ← Date folder
    ├── request-details-00001-2026-02-21-14-30-05.log     ← Full metadata for one request
    ├── request-response-00001-2026-02-21-14-30-05.html   ← Raw HTML response body
    ├── request-details-00002-2026-02-21-14-31-12.log
    ├── request-response-00002-2026-02-21-14-31-12.html
    └── ...
```

## File Descriptions

### `requests.log` — Master Request Summary

A single append-only file containing one line per request. Each line has pipe-delimited metadata:

```
[ISO-timestamp] | ID:00001 | POST | https://mebbisyd.meb.gov.tr/SKT/... | STATUS:200 | 1234ms | DETAIL:2026-02-21/request-details-00001-2026-02-21-14-30-05.log | HTML:2026-02-21/request-response-00001-2026-02-21-14-30-05.html | SCHOOL:1337
```

Fields:
| Field | Description |
|-------|-------------|
| Timestamp | ISO 8601 timestamp of the request |
| ID | Auto-incrementing request counter (per process lifetime) |
| Method | HTTP method (GET, POST, etc.) |
| URL | Full request URL |
| STATUS | HTTP response status code, or `ERR` on failure |
| Duration | Round-trip time in milliseconds |
| REDIRECT | (optional) Redirect Location URL if 3xx response |
| ERROR | (optional) Error message if request failed |
| DETAIL | Relative path to the detail log file |
| HTML | Relative path to the response HTML file |
| SCHOOL | (optional) `tbMebbisId` — the driving school identifier |

### `request-details-{id}-{timestamp}.log` — Request Detail File

Contains full structured information about a single request/response cycle:

- **Request**: method, URL, timestamp, driving school ID
- **Request Headers**: all headers sent (Cookie value shown as `[PRESENT]`/`[NONE]`)
- **Request Body / Payload**: POST data or body payload
- **Response**: status code, duration, redirect URL, error
- **Response Headers**: all response headers
- **Structured JSON**: the complete `MebbisRequestLog` object for programmatic parsing

### `request-response-{id}-{timestamp}.html` — Response HTML Body

The raw HTML content returned by the MEBBIS server. This is the full response body saved as a standalone `.html` file so it can be:
- Opened in a browser to visually inspect what MEBBIS returned
- Parsed by AI to extract data, detect login pages, or debug scraping logic

## How It Works

### Integration Points

The logger is integrated into both HTTP client libraries used by mebbis-service:

1. **`AxiosService`** (`src/lib/axios.service.ts`)
   - The `request()` method wraps every call in a `try/catch/finally` block
   - In the `finally` block, `MebbisRequestLogger.log()` is called with full context

2. **`FetchService`** (`src/lib/fetch.service.ts`)
   - The static `request()` method similarly wraps calls
   - Captures redirect info via `response.redirected` and `Location` header
   - Logs via `MebbisRequestLogger.log()` in the `finally` block

### Logger Implementation

File: `src/utils/mebbis-request-logger.ts`

The `MebbisRequestLogger` static class:
- Creates `logs/requests/` directory automatically on first use
- Creates date-based subdirectories (`YYYY-MM-DD/`) for daily organization
- Generates unique IDs per request (5-digit zero-padded counter)
- Writes three outputs per request: summary line, detail file, HTML file
- Catches and logs its own errors so logging never breaks the main request flow

## Reading Logs (AI/Copilot Guide)

### Quick Overview of All Requests
```
Read: backend/services/mebbis-service/logs/requests/requests.log
```
This gives you a one-line summary per request. Look at STATUS codes and URLs to find the request you're interested in.

### Inspect a Specific Request
From the summary line, extract the `DETAIL:` path and read that file:
```
Read: backend/services/mebbis-service/logs/requests/2026-02-21/request-details-00001-2026-02-21-14-30-05.log
```
This shows request headers, POST payload, response headers, status code, redirect URL, and a structured JSON block.

### View the Response HTML
From the summary line, extract the `HTML:` path:
```
Read: backend/services/mebbis-service/logs/requests/2026-02-21/request-response-00001-2026-02-21-14-30-05.html
```
This is the raw MEBBIS HTML response — useful for understanding what page was returned, detecting login redirects, or extracting data.

### Common Analysis Patterns

**Find failed requests:**
```
grep "STATUS:ERR" requests.log
grep "STATUS:4" requests.log
grep "STATUS:5" requests.log
```

**Find redirect responses:**
```
grep "REDIRECT:" requests.log
```

**Find requests for a specific school:**
```
grep "SCHOOL:1337" requests.log
```

**Find requests to a specific endpoint:**
```
grep "SKT/skt01" requests.log
```

## Data Captured Per Request

| Field | Source | Description |
|-------|--------|-------------|
| `requestId` | Auto-generated | Unique ID for this log entry |
| `timestamp` | `new Date()` | ISO timestamp |
| `method` | Axios/Fetch config | HTTP method (GET, POST, etc.) |
| `url` | Axios/Fetch config | Full request URL |
| `requestHeaders` | Axios/Fetch config | All request headers |
| `requestBody` | Axios/Fetch data | POST payload / form data |
| `responseStatusCode` | Response | HTTP status code |
| `responseHeaders` | Response | All response headers |
| `redirectUrl` | Response `Location` header | Redirect target if 3xx |
| `durationMs` | Timer | Round-trip time |
| `error` | Catch block | Error message if failed |
| `tbMebbisId` | Service context | Driving school identifier |
| `detailFile` | Generated | Path to detail log |
| `responseFile` | Generated | Path to HTML response |

## Notes

- Logs are **never deleted automatically** — manual cleanup is needed for disk space
- Cookie values are logged as `[PRESENT]` or `[NONE]` for security (full cookie not written)
- The counter resets when the service restarts (files are still unique due to timestamps)
- Both successful and failed requests are logged
- The logger is wrapped in try/catch so logging failures never affect request processing
