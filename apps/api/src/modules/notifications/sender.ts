/** Business senders replace the shared test domain in production. Domain verification
 * and the API key's domain scope are still required at the provider. */
export function emailSender(configured:string|undefined,kind:'contact'|'booking',production=process.env.NODE_ENV==='production') {
 const fallback=`ALMORAD AMC <${kind==='booking'?'bookings':'info'}@almorad-amc.com>`;
 const value=configured?.trim();
 return !value||(production&&/@resend\.dev(?:>|\s|$)/i.test(value))?fallback:value;
}
