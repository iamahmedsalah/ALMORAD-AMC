/** Business senders replace the shared test domain in production. Domain verification
 * and the API key's domain scope are still required at the provider. */
export function emailSender(configured:string|undefined,kind:'contact'|'booking',production=process.env.NODE_ENV==='production') {
 const fallback=`ALMORAD AMC <${kind==='booking'?'bookings':'info'}@almorad-amc.com>`;
 const raw=configured?.trim();
 const value=raw&&((raw.startsWith('"')&&raw.endsWith('"'))||(raw.startsWith("'")&&raw.endsWith("'")))?raw.slice(1,-1).trim():raw;
 const mailbox=value?.match(/^[^<>\r\n]+ <([^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)>$/)?.[1]||value?.match(/^([^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)$/)?.[1];
 return !value||!mailbox||/[\r\n]/.test(value)||(production&&/@resend\.dev$/i.test(mailbox))?fallback:value;
}
