import type { Request } from 'express';

/**
 * Azure App Service does something most reverse proxies do not: it puts the
 * client's source port into X-Forwarded-For, so the header arrives as
 * `223.235.28.15:56907` rather than `223.235.28.15`. Express trusts that header
 * (see `trust proxy` in app.ts) and hands the whole value back as `req.ip`.
 *
 * Two things break because of it, and both fail quietly:
 *
 *   - express-rate-limit rejects the value as not an address
 *     (ERR_ERL_INVALID_IP_ADDRESS). Worse, the port is different on every
 *     connection, so each request would land in a bucket of its own and the
 *     login limiter would count to ten without ever arriving. Brute force
 *     protection was effectively switched off in production.
 *   - the login audit stored the port alongside the address, so two visits from
 *     the same person never grouped together.
 *
 * Everything that reads the client address goes through here, so the limiter
 * and the audit always agree on what a visitor is.
 */

/** Four dot separated octets, each within range. */
const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

/** Hex groups and colons only. Deliberately loose: this is a sanity check, not a parser. */
const IPV6 = /^[0-9a-f:]+$/i;

/** How a dual stack socket reports an IPv4 client: `::ffff:223.235.28.15`. */
const IPV4_MAPPED = /^::ffff:((?:\d{1,3}\.){3}\d{1,3})$/i;

/**
 * Removes a trailing port, which is the whole reason this file exists.
 *
 * The rules are driven by what a colon can mean:
 *   `[2409:40e4::1]:56907`  brackets, so everything inside them is the address
 *   `223.235.28.15:56907`   exactly one colon, so it separates an IPv4 port
 *   `2409:40e4::1`          several colons, so it is a bare IPv6 address, which
 *                           never carries a port unless it is bracketed
 */
function stripPort(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('[')) {
    const close = trimmed.indexOf(']');
    return close === -1 ? trimmed.slice(1) : trimmed.slice(1, close);
  }

  const first = trimmed.indexOf(':');
  if (first !== -1 && first === trimmed.lastIndexOf(':')) {
    return trimmed.slice(0, first);
  }

  return trimmed;
}

/**
 * The client address with any port and any IPv4 mapping removed, or null when
 * there is nothing usable. Null rather than a placeholder string, so a missing
 * address is stored as SQL NULL and never mistaken for a real one.
 */
export function clientIp(req: Request): string | null {
  const raw = req.ip;
  if (!raw) return null;

  const address = stripPort(raw);
  if (!address) return null;

  const mapped = IPV4_MAPPED.exec(address);
  const normalised = mapped ? mapped[1] : address;

  if (IPV4.test(normalised)) return normalised;
  // Zone identifiers (`fe80::1%eth0`) are a local concept and never identify a
  // remote client, so they are dropped before the shape is checked.
  const zoneless = normalised.split('%')[0];
  if (zoneless.includes(':') && IPV6.test(zoneless)) return zoneless.toLowerCase();

  return null;
}

/**
 * Expands `::` so an address can be compared group by group. Returns null for
 * anything that does not parse, which the caller treats as "use the address
 * whole" rather than guessing.
 */
function expandIpv6(address: string): string[] | null {
  const halves = address.split('::');
  if (halves.length > 2) return null;

  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  if (head.some((group) => group === '') || tail.some((group) => group === '')) return null;

  const groups =
    halves.length === 2
      ? [...head, ...Array(8 - head.length - tail.length).fill('0'), ...tail]
      : head;

  if (groups.length !== 8) return null;
  return groups.map((group) => group.padStart(4, '0'));
}

/**
 * The key the rate limiter counts against.
 *
 * IPv4 counts per address. IPv6 counts per /64, because a single subscriber is
 * routinely handed a whole /64 and can pick a fresh address inside it for every
 * request - keying on the full address would hand out a fresh budget each time,
 * which is the same hole the port created.
 *
 * Falls back to a fixed key when there is no address at all. That shares one
 * budget between such callers, which is the safe direction: no address means no
 * way to tell them apart, so they must not each get their own allowance.
 */
export function rateLimitKey(req: Request): string {
  const address = clientIp(req);
  if (!address) return 'unknown';
  if (!address.includes(':')) return address;

  const groups = expandIpv6(address);
  return groups ? groups.slice(0, 4).join(':') : address;
}
