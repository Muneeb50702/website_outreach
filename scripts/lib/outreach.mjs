export function normalizeEmail(email) {return email.trim().toLowerCase();}
export function localDate(date=new Date()) {return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function outreachEligible(email,ledger,suppression,now=new Date(),cap=20) {
  const address=normalizeEmail(email);
  if(suppression.some(s=>normalizeEmail(typeof s==='string'?s:s.email)===address))return {eligible:false,reason:'suppressed'};
  if(ledger.some(r=>normalizeEmail(r.recipient)===address && ['sent','uncertain','bounced','reserved'].includes(r.status)))return {eligible:false,reason:'already contacted or unresolved send'};
  const date=localDate(now);
  const count=ledger.filter(r=>['sent','uncertain','reserved','bounced'].includes(r.status) && localDate(new Date(r.sent_at||r.reserved_at))===date).length;
  if(count>=cap)return {eligible:false,reason:'shared daily ceiling reached'};
  return {eligible:true,remaining:cap-count};
}
export function composeDraft(brief,url) {
  return {to:brief.contact.email,subject:`A website concept for ${brief.business_name}`,body:`Hi ${brief.business_name} team,\n\nI came across your business in ${brief.location} and built an independent website concept around your publicly listed services. It brings the service overview and phone contact into one mobile-friendly page.\n\nPreview: ${url}\n\nThis is a design proposal, not your live business website. If the direction is useful, I'd be happy to discuss adapting it for your business.\n\nMuhammad Muneeb\nPortfolio: https://muhammadmuneeb.tech/\nLinkedIn: https://www.linkedin.com/in/muhammad-muneeb-yaseen\nGitHub: https://github.com/Muneeb50702\n\nIf this isn't relevant, reply 'no thanks' and I won't follow up.`};
}
