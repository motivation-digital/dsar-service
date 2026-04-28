// Trust Center — DSAR Contact Form
import { EmailMessage } from 'cloudflare:email';
// LCE-10000108 v7

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(245,159,10,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

function val(values, field) {
  return esc(values[field] || '');
}

function fieldError(errors, field) {
  if (!errors[field]) return '';
  return `<span class="field-error">${esc(errors[field])}</span>`;
}

function jurisdictionLawText(facts) {
  const j = facts.operational_jurisdictions || [];
  if (j.includes('UK') && j.includes('EU')) return 'UK GDPR and EU GDPR';
  if (j.includes('UK')) return 'UK GDPR';
  if (j.includes('EU')) return 'EU GDPR';
  if (j.includes('AU')) return 'the Australian Privacy Act';
  return 'applicable data protection law';
}

// 5 types — legally required minimum under GDPR Art. 15 and equivalent
const REQUEST_TYPES = [
  { value: 'access',           label: 'Data Subject Access Request (DSAR) — receive a copy of my personal data', emailLabel: 'Data Subject Access Request (DSAR)' },
  { value: 'correction',       label: 'Correction — update inaccurate or incomplete information',                 emailLabel: 'Correction Request' },
  { value: 'deletion',         label: 'Deletion / Erasure — right to be forgotten',                              emailLabel: 'Erasure Request' },
  { value: 'withdraw_consent', label: 'Withdraw Consent',                                                        emailLabel: 'Consent Withdrawal' },
  { value: 'other',            label: 'Other privacy enquiry',                                                   emailLabel: 'Privacy Enquiry' },
];

const VALID_TYPES = new Set(REQUEST_TYPES.map(t => t.value));
const REQUEST_TYPE_LABELS = Object.fromEntries(REQUEST_TYPES.map(t => [t.value, t.label]));
const REQUEST_TYPE_EMAIL_LABELS = Object.fromEntries(REQUEST_TYPES.map(t => [t.value, t.emailLabel]));

const JURISDICTION_OPTS = [
  { value: 'uk_ico', label: 'UK — ICO (UK GDPR)',      law: 'UK GDPR',                        days: '1 calendar month' },
  { value: 'gdpr',   label: 'Europe — GDPR',           law: 'EU GDPR',                        days: '1 month (extendable to 3 months for complex requests)' },
  { value: 'ccpa',   label: 'USA — California (CCPA)', law: 'CCPA',                           days: '45 days (extendable to 90 days)' },
  { value: 'pipeda', label: 'Canada — PIPEDA',         law: 'PIPEDA',                         days: '30 days' },
  { value: 'other',  label: 'Other jurisdiction',      law: 'applicable data protection law', days: '30 days' },
];
const VALID_JURISDICTIONS = new Set(JURISDICTION_OPTS.map(j => j.value));
const JURISDICTION_MAP = Object.fromEntries(JURISDICTION_OPTS.map(j => [j.value, j]));

// Exact copy of render-hub.js trust card — no "Verified" row, sub-processors row included.
// Keep this in sync with render-hub.js renderHub() trust-card block.
function renderTrustCard(facts, accent) {
  const compliance = facts.compliance || {};
  const dsarResponse = esc(compliance.dsar_response || 'Within 30 days');
  const openIncidents = esc(compliance.open_incidents || 'None');
  const lastReview = esc(compliance.last_review || '');
  const cookieCount = compliance.cookie_count != null ? compliance.cookie_count : null;
  const incidentDot = openIncidents === 'None' ? 'trust-dot-green' : 'trust-dot-amber';
  const regulatoryAuthority = esc(compliance.regulatory_authority || '');
  const processorCount = Array.isArray(facts.sub_processors) ? facts.sub_processors.length : 0;

  return `<div class="trust-card">
  <div class="trust-row">
    <span class="trust-compliance-label">Compliance Status</span>
    <div class="trust-badge">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
    </div>
  </div>
  ${lastReview ? `<div class="trust-row">
    <span class="trust-row-label">Last policy review</span>
    <span class="trust-row-value">${lastReview}</span>
  </div>` : ''}
  ${cookieCount != null ? `<div class="trust-row">
    <span class="trust-row-label">Cookies in use</span>
    <span class="trust-row-value">${cookieCount} cookies</span>
  </div>` : ''}
  ${processorCount > 0 ? `<div class="trust-row">
    <span class="trust-row-label">Sub-processors</span>
    <span class="trust-row-value"><span class="trust-dot-green"></span>${processorCount} disclosed</span>
  </div>` : ''}
  ${regulatoryAuthority ? `<div class="trust-row">
    <span class="trust-row-label">Regulatory authority</span>
    <span class="trust-row-value">${regulatoryAuthority}</span>
  </div>` : ''}
  <div class="trust-row">
    <span class="trust-row-label">DSAR response time</span>
    <span class="trust-row-value"><span class="trust-dot-green"></span>${dsarResponse}</span>
  </div>
  <div class="trust-row">
    <span class="trust-row-label">Open incidents</span>
    <span class="trust-row-value"><span class="${incidentDot}"></span>${openIncidents}</span>
  </div>
</div>`;
}

// Exact copy of render-hub.js renderFooter()
function renderFooter(facts) {
  const year    = new Date().getFullYear();
  const company = esc(facts.entity?.legal_name || facts.entity?.trading_name || '');
  const reg     = esc(facts.entity?.company_reg || '');
  const vat     = esc(facts.entity?.vat_number || '');
  const a       = facts.entity?.registered_address;
  const addr    = a
    ? esc([a.line1, a.line2, a.city, a.postcode, a.country].filter(Boolean).join(', '))
    : '';
  return `<footer class="site-footer">
  <div class="footer-left">
    <div>${company} a member of the Motivation Group Ltd. Reg No. ${reg}.</div>
    ${addr ? `<div>${addr}</div>` : ''}
  </div>
  <div class="footer-right">
    <div>Group VAT Registration: ${vat}</div>
    <div>Copyright &copy; 2008&nbsp;&ndash;&nbsp;${year} | Motivation Group Ltd. All Rights Reserved.</div>
  </div>
</footer>`;
}

async function sendEmail(binding, toEmail, fromEmail, fromName, subject, htmlBody, replyTo = null) {
  if (!binding) { console.error('Email send error: no SEND_EMAIL binding'); return; }
  try {
      const raw = [
      'MIME-Version: 1.0',
      `From: ${fromName} <${fromEmail}>`,
      `To: ${toEmail}`,
      `Subject: ${subject}`,
      ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      htmlBody,
    ].join('\r\n');
    const stream = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(raw)); c.close(); } });
    await binding.send(new EmailMessage(fromEmail, toEmail, stream));
  } catch (e) {
    console.error('Email send error', e?.message);
  }
}

export function renderDsarPage(facts, errors = {}, values = {}, submitted = false) {
  const accent = facts.brand?.primary_color || '#F59F0A';
  const name = esc(facts.entity?.trading_name || facts.brand_id || '');
  const domain = facts.host || '';
  const logoUrl = facts.brand?.logo_url ? esc(facts.brand.logo_url) : '';
  const faviconUrl = facts.brand?.favicon_url ? esc(facts.brand.favicon_url) : '';
  const hubUrl = `https://${esc(domain)}/trust-center`;
  const hasErrors = Object.keys(errors).length > 0;
  const lawText = jurisdictionLawText(facts);

  const selectOptions = REQUEST_TYPES.map(t =>
    `<option value="${esc(t.value)}"${values.request_type === t.value ? ' selected' : ''}>${esc(t.label)}</option>`
  ).join('\n            ');

  const jurisdictionOpts = JURISDICTION_OPTS.map(j =>
    `<option value="${esc(j.value)}"${values.jurisdiction === j.value ? ' selected' : ''}>${esc(j.label)}</option>`
  ).join('\n            ');

  const postalAddress = (() => {
    const a = facts.entity?.registered_address;
    if (!a) return '';
    return [a.line1, a.line2, a.city, a.postcode, a.country].filter(Boolean).join(', ');
  })();

  const heroLeft = submitted
    ? `<div class="hero-pill">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
        <span class="hero-pill-text">Request received</span>
      </div>
      <h1 class="hero-h1">Your request<br>is with us</h1>
      <p class="hero-desc">We&rsquo;ve received and logged your request. A member of our team will review it and be in touch at the email address you provided.</p>
      <a href="${hubUrl}" class="btn-primary" style="text-decoration:none">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
        Back to Trust Center
      </a>
      <div style="margin-top:24px;padding:18px 20px;background:rgba(245,159,10,0.06);border:1px solid rgba(245,159,10,0.2);border-radius:10px">
        <p style="font-size:13.5px;color:#FAFAFA;margin:0 0 6px;font-weight:600">Check your email</p>
        <p style="font-size:13px;color:#94A3B8;margin:0 0 10px;line-height:1.6">We&rsquo;ve sent a verification email from <strong style="color:#FAFAFA">dpo@trustcenter.pro</strong>. If you don&rsquo;t see it in a few minutes, please check your spam or junk folder.</p>
        <a href="https://trustcenter.pro/articles/what-is-a-dsar" style="font-size:12.5px;color:${accent};text-decoration:none;font-weight:500">What is a DSAR? &rarr;</a>
      </div>`
    : `<div class="hero-pill">
        <a href="${hubUrl}" style="display:flex;align-items:center;gap:5px;text-decoration:none">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          <span class="hero-pill-text">Trust Center</span>
        </a>
      </div>
      <h1 class="hero-h1">Make a Request</h1>
      <p class="hero-desc">Exercise your data protection rights under ${lawText}. Use this form to submit a formal request — access, correction, deletion, withdrawal of consent, or a general privacy enquiry.</p>
      <div class="hero-ctas">
        ${facts.civic_key ? `<button class="btn-secondary" data-action="openconsent">Cookie Consent</button>` : ''}
      </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${submitted ? 'Request Received' : 'Make a Request'} — ${name}</title>
${faviconUrl ? `<link rel="icon" href="${faviconUrl}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
${facts.civic_key ? `<script src="https://cc.cdn.civiccomputing.com/9/cookieControl-9.x.min.js" type="text/javascript"></script>
<script>
CookieControl.load({
  apiKey:'${esc(facts.civic_key)}',product:'PRO_MULTISITE',
  statement:{description:'For more detailed information on the cookies we use, please check our',name:'Cookie Policy',url:'https://${esc(domain)}/trust-center/cookies'},
  optionalCookies:[
    {name:'function',label:'Functionality Cookies',description:'These cookies allow a website to remember choices you have made in the past.',recommendedState:true,cookies:[]},
    {name:'performance',label:'Performance Cookies',description:'These cookies collect information about how you use a website.',recommendedState:true,cookies:[]},
    {name:'marketing',label:'Marketing Cookies',description:'These cookies track your online activity to help advertisers deliver more relevant advertising.',recommendedState:true,cookies:[]}
  ],
  branding:{
    fontColor:'#FAFAFA',fontSizeTitle:'16px',fontSizeIntro:'14px',fontSizeHeaders:'14px',fontSize:'13px',
    acceptBackground:'${accent}',acceptText:'#0A0A0A',
    rejectBackground:'#1a1a1a',rejectText:'#FAFAFA',
    backgroundColor:'#111111',
    toggleText:'#FAFAFA',toggleColor:'#FAFAFA',toggleBackground:'${accent}',
    removeAbout:true,removeIcon:true
  }
});
</script>` : ''}
<style>
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0;background:#0A0A0A;color:#FAFAFA;font-family:'Roboto',system-ui,sans-serif}
h1,h2,h3,p{margin:0}a{text-decoration:none;color:inherit}
.topbar{padding:20px 56px;display:flex;justify-content:space-between;align-items:center;position:relative;z-index:2}
.topbar-brand{display:flex;align-items:center;gap:9px}
.topbar-dot{width:20px;height:20px;border-radius:50%;background:${accent};flex-shrink:0}
.topbar-name{color:#FAFAFA;font-weight:500;font-size:13.5px;letter-spacing:-0.005em}
.topbar-logo{height:28px;width:auto;display:block}
.topbar-link{background:#111111;color:#FAFAFA;border:1px solid rgba(255,255,255,0.08);padding:10px 16px;border-radius:8px;font-size:12.5px;font-weight:500;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.topbar-link:hover{border-color:rgba(255,255,255,0.2)}
.hero{position:relative;padding:40px 56px 50px;overflow:hidden}
.hero-glow{position:absolute;top:-200px;left:15%;width:1000px;height:700px;background:radial-gradient(ellipse at center,${hexToRgba(accent, 0.35)} 0%,${hexToRgba(accent, 0.12)} 30%,transparent 65%);pointer-events:none;filter:blur(20px)}
.hero-inner{max-width:1240px;margin:0 auto;position:relative;display:grid;grid-template-columns:1.3fr 1fr;gap:60px;align-items:start}
.hero-pill{display:inline-flex;align-items:center;gap:7px;padding:6px 14px;background:rgba(10,10,10,0.6);border:1px solid ${hexToRgba(accent, 0.3)};border-radius:100px;margin-bottom:32px;white-space:nowrap}
.hero-pill-text{font-size:11.5px;color:${accent};letter-spacing:0.04em;font-weight:500}
.hero-h1{font-size:clamp(32px,4.5vw,62px);font-weight:300;letter-spacing:-0.025em;line-height:1.03;margin:0 0 26px;color:#FAFAFA}
.hero-desc{font-size:15.5px;line-height:1.65;color:#b8b8b8;margin:0 0 32px;max-width:540px}
.hero-ctas{display:flex;gap:10px;flex-wrap:wrap}
.btn-primary{background:${accent};color:#0A0A0A;padding:13px 22px;border-radius:8px;font-weight:600;font-size:13.5px;display:inline-flex;align-items:center;gap:8px;white-space:nowrap;cursor:pointer;border:none;font-family:inherit}
.btn-secondary{background:#111111;color:#FAFAFA;border:1px solid rgba(255,255,255,0.1);padding:13px 22px;border-radius:8px;font-weight:500;font-size:13.5px;white-space:nowrap;display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-family:inherit}
.btn-primary:hover{background:#FBBF24}.btn-secondary:hover{border-color:rgba(255,255,255,0.25)}
.trust-card{background:linear-gradient(165deg,rgba(21,21,23,0.95) 0%,rgba(10,10,10,0.95) 100%);border:1px solid ${hexToRgba(accent, 0.25)};border-radius:14px;padding:20px 22px;backdrop-filter:blur(12px);box-shadow:0 20px 60px rgba(0,0,0,0.4)}
.trust-compliance-label{color:${accent};font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase}
.trust-badge{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.3)}
.trust-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px}
.trust-row:first-child{padding-top:0}.trust-row:last-child{border-bottom:none;padding-bottom:0}
.trust-row-label{color:rgba(255,255,255,0.45)}
.trust-row-value{display:flex;align-items:center;gap:7px;color:#FAFAFA;font-weight:500}
.trust-dot-green{width:7px;height:7px;border-radius:50%;background:#22C55E;flex-shrink:0}
.trust-dot-amber{width:7px;height:7px;border-radius:50%;background:#F59F0A;flex-shrink:0}
.section-divider{height:1px;background:rgba(255,255,255,0.06);border:none;margin:0 56px}
.form-section{padding:60px 56px 80px}
.form-section-inner{max-width:1240px;margin:0 auto;display:grid;grid-template-columns:1.4fr 1fr;gap:60px;align-items:start}
.overline{font-size:11px;letter-spacing:0.18em;color:${accent};text-transform:uppercase;font-weight:600;margin-bottom:10px}
.form-card{background:#111111;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:36px 36px 32px}
.form-h2{font-size:20px;font-weight:600;letter-spacing:-0.01em;margin:0 0 8px}
.form-sub{font-size:13.5px;color:#94A3B8;line-height:1.6;margin:0 0 28px}
.error-banner{background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:12px 16px;margin-bottom:24px;font-size:13px;color:#fca5a5}
.field{margin-bottom:20px}
.field label{display:block;font-size:13px;font-weight:500;color:#FAFAFA;margin-bottom:6px}
.field input,.field select,.field textarea{width:100%;background:#0A0A0A;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#FAFAFA;font-family:'Roboto',sans-serif;font-size:14px;padding:11px 14px;transition:border-color 0.15s;outline:none}
.field input::placeholder,.field textarea::placeholder{color:#4f4f4f}
.field input:focus,.field select:focus,.field textarea:focus{border-color:${hexToRgba(accent, 0.5)};box-shadow:0 0 0 3px ${hexToRgba(accent, 0.08)}}
.field select{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;padding-right:36px}
.field select option{background:#111111}
.field textarea{min-height:110px;resize:vertical;line-height:1.55}
.field-error{display:block;font-size:12px;color:#f87171;margin-top:5px}
.field.has-error input,.field.has-error select,.field.has-error textarea{border-color:rgba(248,113,113,0.5)}
.field-hint{font-size:12px;color:#94A3B8;margin-top:5px;line-height:1.5}
.submit-btn{width:100%;background:${accent};color:#0A0A0A;border:none;padding:14px 20px;border-radius:8px;font-weight:700;font-size:14px;font-family:'Roboto',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px}
.submit-btn:hover{background:#FBBF24}


.sidebar-cards{display:flex;flex-direction:column;gap:16px;position:sticky;top:24px}
.info-card{background:#111111;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:22px 24px}
.info-card-label{font-size:10.5px;letter-spacing:0.15em;text-transform:uppercase;font-weight:600;color:${accent};margin-bottom:12px}
.info-card-body{font-size:13px;color:#b8b8b8;line-height:1.6;margin:0}
.rights-list{list-style:none;padding:0;margin:12px 0 0;display:flex;flex-direction:column;gap:6px}
.rights-list li{font-size:12.5px;color:#94A3B8;display:flex;align-items:flex-start;gap:8px;line-height:1.45}
.rights-list li::before{content:'';width:6px;height:6px;border-radius:50%;background:${accent};flex-shrink:0;margin-top:5px}
.postal-icon-wrap{width:36px;height:36px;border-radius:8px;background:${hexToRgba(accent, 0.1)};border:1px solid ${hexToRgba(accent, 0.2)};display:flex;align-items:center;justify-content:center;margin-bottom:14px}
.postal-address{font-size:13px;font-style:normal;color:#FAFAFA;line-height:1.7;border-left:2px solid ${hexToRgba(accent, 0.3)};padding-left:12px;margin-top:10px}
.site-footer{border-top:1px solid rgba(255,255,255,0.06);background:#111111;padding:20px 56px;color:rgba(255,255,255,0.3);font-size:11px;display:flex;justify-content:space-between;align-items:flex-start;gap:24px;line-height:1.6}
.footer-left,.footer-right{display:flex;flex-direction:column;gap:2px}
.footer-right{text-align:right}
@media(max-width:1024px){
  .topbar,.hero,.form-section{padding-left:32px;padding-right:32px}
  .section-divider{margin:0 32px}
  .hero-inner,.form-section-inner{grid-template-columns:1fr;gap:32px}
  .site-footer{padding-left:32px;padding-right:32px}
}
@media(max-width:640px){
  .topbar,.hero,.form-section{padding-left:20px;padding-right:20px}
  .section-divider{margin:0 20px}
  .form-card{padding:24px 20px}
  .site-footer{flex-direction:column;gap:10px;padding-left:20px;padding-right:20px}
  .footer-right{text-align:left}
}
</style>
<script>document.addEventListener("DOMContentLoaded",function(){var done=false;function chk(){var n=document.getElementById("dsar-name"),e=document.getElementById("dsar-email"),j=document.getElementById("dsar-jurisdiction"),t=document.getElementById("dsar-type"),b=document.getElementById("dsar-submit");if(!b)return;var ok=done&&n&&n.value.trim()&&e&&e.value.trim()&&j&&j.value&&t&&t.value;b.disabled=!ok;b.style.opacity=ok?"":"0.5";b.style.cursor=ok?"":"not-allowed";}window.onTurnstileSuccess=function(){done=true;chk();};["dsar-name","dsar-email","dsar-jurisdiction","dsar-type"].forEach(function(id){var el=document.getElementById(id);if(el){el.addEventListener("input",chk);el.addEventListener("change",chk);}});});</script>
</head>
<body>
<nav class="topbar">
  <div class="topbar-brand">
    ${logoUrl
      ? `<img src="${logoUrl}" alt="${name}" class="topbar-logo">`
      : `<div class="topbar-dot"></div><span class="topbar-name">${name}</span>`}
  </div>
  <a href="${hubUrl}" class="topbar-link">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
    Trust Center
  </a>
</nav>

<section class="hero">
  <div class="hero-glow"></div>
  <div class="hero-inner">
    <div>
      ${heroLeft}
    </div>
    ${renderTrustCard(facts, accent)}
  </div>
</section>

${submitted ? '' : `<hr class="section-divider">

<section class="form-section">
  <div class="form-section-inner">
    <div class="form-card">
      <div class="overline">Data Subject Request</div>
      <h2 class="form-h2">Submit your request</h2>
      <p class="form-sub">Complete the form below. We respond to all requests personally within the timeframe required by your jurisdiction&rsquo;s data protection law.</p>

      ${hasErrors ? '<div class="error-banner">' + (errors._form || 'Please correct the highlighted fields below.') + '</div>' : ''}

      <form method="POST" action="/trust-center/contact" novalidate>
        <div class="field${errors.name ? ' has-error' : ''}">
          <label for="dsar-name">Full name <span style="color:#f87171">*</span></label>
          <input type="text" id="dsar-name" name="name" value="${val(values, 'name')}" placeholder="Your full name" autocomplete="name" required>
          ${fieldError(errors, 'name')}
        </div>

        <div class="field${errors.email ? ' has-error' : ''}">
          <label for="dsar-email">Email address <span style="color:#f87171">*</span></label>
          <input type="email" id="dsar-email" name="email" value="${val(values, 'email')}" placeholder="you@example.com" autocomplete="email" required>
          <span class="field-hint">Use the email address you signed up with or regularly communicate with us. Requests from unrecognised addresses cannot be verified and will not be processed.</span>
          ${fieldError(errors, 'email')}
        </div>

        <div class="field${errors.jurisdiction ? ' has-error' : ''}">
          <label for="dsar-jurisdiction">Your jurisdiction <span style="color:#f87171">*</span></label>
          <select id="dsar-jurisdiction" name="jurisdiction" required>
            <option value="" disabled${!values.jurisdiction ? ' selected' : ''}>Select your jurisdiction&hellip;</option>
            ${jurisdictionOpts}
          </select>
          ${fieldError(errors, 'jurisdiction')}
        </div>

        <div class="field${errors.request_type ? ' has-error' : ''}">
          <label for="dsar-type">Request type <span style="color:#f87171">*</span></label>
          <select id="dsar-type" name="request_type" required>
            <option value="" disabled${!values.request_type ? ' selected' : ''}>Select request type&hellip;</option>
            ${selectOptions}
          </select>
          ${fieldError(errors, 'request_type')}
        </div>

        <div class="field">
          <label for="dsar-message">Additional details</label>
          <textarea id="dsar-message" name="message" placeholder="Optional: any additional context that will help us process your request faster">${val(values, 'message')}</textarea>
        </div>

        <div class="cf-turnstile" data-sitekey="0x4AAAAAADD48HKN-TZKACHD" data-theme="dark" data-callback="onTurnstileSuccess" style="margin-bottom:14px"></div>
        <button type="submit" id="dsar-submit" class="submit-btn" disabled style="opacity:0.5;cursor:not-allowed">
          Submit request
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>

      </form>
    </div>

    <div class="sidebar-cards">
      <div class="info-card">
        <div class="info-card-label">What to expect</div>
        <p class="info-card-body">Once submitted, you&rsquo;ll receive a verification email from our data protection team asking you to confirm your identity by replying from your registered email address.</p>
        <p class="info-card-body" style="margin-top:8px">After verification, we review your request and respond within the timeframe set by your jurisdiction&rsquo;s data protection law.</p>
        <p style="margin-top:14px"><a href="https://trustcenter.pro/articles/what-is-a-dsar" style="font-size:12.5px;color:${accent};text-decoration:none;font-weight:500">What is a DSAR? &rarr;</a></p>
      </div>
      <div class="info-card">
        <div class="info-card-label">Your rights</div>
        <p class="info-card-body">Under <span id="rights-law-text">${lawText}</span> you may exercise the following rights:</p>
        <ul class="rights-list">
          <li>Access a copy of all personal data we hold about you</li>
          <li>Correct inaccurate or incomplete information</li>
          <li>Request deletion of your personal data</li>
          <li>Obtain your data in a portable format</li>
          <li>Withdraw previously given consent at any time</li>
        </ul>
      </div>
      ${postalAddress ? `<div class="info-card">
        <div class="postal-icon-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <div class="info-card-label">Prefer to write?</div>
        <p class="info-card-body">You may also submit your request by post. We will respond within 30 days of receipt.</p>
        <address class="postal-address">Data Processing Officer<br>Motivation Group Ltd<br>${esc(postalAddress)}</address>
      </div>` : ''}
    </div>
  </div>
</section>`}

${renderFooter(facts)}

<script>
document.addEventListener('click', function(e) {
  var c = e.target.closest('[data-action="openconsent"]');
  if (c) { e.preventDefault(); if (typeof CookieControl !== 'undefined') CookieControl.open(); }
});

// Update "Your rights" law label when jurisdiction changes
(function() {
  var jurisEl = document.getElementById('dsar-jurisdiction');
  var lawEl   = document.getElementById('rights-law-text');
  if (!jurisEl || !lawEl) return;
  var laws = { uk_ico: 'UK GDPR', gdpr: 'EU GDPR', ccpa: 'CCPA', pipeda: 'PIPEDA', other: 'applicable data protection law' };
  jurisEl.addEventListener('change', function() {
    lawEl.textContent = laws[jurisEl.value] || 'applicable data protection law';
  });
})();

// Auto-populate message textarea based on request type
(function() {
  var typeEl = document.getElementById('dsar-type');
  var nameEl = document.getElementById('dsar-name');
  var msgEl  = document.getElementById('dsar-message');
  if (!typeEl || !nameEl || !msgEl) return;
  var nl = String.fromCharCode(10);
  var templates = {
    access: function(n) { return 'I am writing to exercise my right of access under applicable data protection law.' + nl + nl + 'I request a copy of all personal data you hold about me, including the categories of data held, the purposes for which it is processed, any third parties with whom it has been shared, and the retention period.' + nl + nl + '— ' + n; },
    correction: function(n) { return 'I am writing to request correction of my personal data held by you.' + nl + nl + 'The information that needs to be corrected: [please describe]' + nl + 'The correct information: [please provide]' + nl + nl + '— ' + n; },
    deletion: function(n) { return 'I am writing to request the deletion of all personal data you hold about me.' + nl + nl + 'I wish to exercise my right to erasure. Please confirm in writing once this has been completed.' + nl + nl + '— ' + n; },
    withdraw_consent: function(n) { return 'I am writing to withdraw my consent for the processing of my personal data.' + nl + nl + 'I withdraw consent for: [please specify, e.g. marketing emails, profiling]' + nl + nl + 'Please confirm receipt of this withdrawal.' + nl + nl + '— ' + n; },
    other: function() { return ''; }
  };
  var lastGenerated = '';
  function populate() {
    var type = typeEl.value;
    var n = (nameEl.value || '').trim() || 'your account holder';
    if (!templates[type]) return;
    var current = msgEl.value;
    if (current === '' || current === lastGenerated) {
      var generated = templates[type](n);
      msgEl.value = generated;
      lastGenerated = generated;
    }
  }
  typeEl.addEventListener('change', populate);
  nameEl.addEventListener('blur', function() {
    if (typeEl.value && msgEl.value === lastGenerated) populate();
  });
})();</script>
</body>
</html>`;
}

export async function handleDsarSubmit(request, db, facts, ctx, turnstileSecret = null, sendEmailBinding = null) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return { success: false, errors: { _form: 'Could not parse form data' }, values: {} };
  }

  const name         = String(formData.get('name')         || '').trim();
  const email        = String(formData.get('email')        || '').trim();
  const reqType      = String(formData.get('request_type') || '').trim();
  const jurisdiction = String(formData.get('jurisdiction') || '').trim();
  const message      = String(formData.get('message')      || '').trim().slice(0, 2000);
  const ip           = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Real-IP') || null;
  const userAgent    = (request.headers.get('User-Agent') || '').slice(0, 500) || null;

  if (turnstileSecret) {
    const token = String(formData.get('cf-turnstile-response') || '');
    const ip = request.headers.get('CF-Connecting-IP') || '';
    try {
      const tv = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: turnstileSecret, response: token, remoteip: ip }) });
      const td = await tv.json();
      if (!td.success) return { success: false, errors: { _form: 'Security verification failed. Please refresh the page and try again.' }, values: { name, email, request_type: reqType, jurisdiction, message } };
    } catch { return { success: false, errors: { _form: 'Security check unavailable. Please try again.' }, values: { name, email, request_type: reqType, jurisdiction, message } }; }
  }

  const errors = {};
  if (!name) errors.name = 'Full name is required';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'A valid email address is required';
  if (!jurisdiction || !VALID_JURISDICTIONS.has(jurisdiction)) errors.jurisdiction = 'Please select your jurisdiction';
  if (!reqType || !VALID_TYPES.has(reqType)) errors.request_type = 'Please select a request type';

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, values: { name, email, request_type: reqType, jurisdiction, message } };
  }

  const jurisdictionInfo = JURISDICTION_MAP[jurisdiction] || JURISDICTION_MAP['other'];
  const responseTime = jurisdictionInfo.days;
  const jurisdLaw = jurisdictionInfo.law;

  await db.prepare(
    'INSERT INTO dsar_requests (brand_id, request_type, name, email, message, jurisdiction, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(facts.brand_id, reqType, name, email, message || null, jurisdiction, ip, userAgent).run();

  const brandName  = facts.entity?.trading_name || facts.brand_id || '';
  const domain     = facts.host || '';
  const fromEmail  = 'dpo@trustcenter.pro';
  const dpoEmail   = facts.contacts?.dpo?.email || facts.contacts?.general || null;
  const reqLabel      = REQUEST_TYPE_EMAIL_LABELS[reqType] || reqType;
  const reqLabelFull  = REQUEST_TYPE_LABELS[reqType] || reqType;
  const receivedAt = new Date().toUTCString();

  const emailWork = Promise.all([
    dpoEmail ? sendEmail(
      sendEmailBinding, dpoEmail, fromEmail, `${brandName} Trust Center`,
      `New DSAR — ${esc(domain)}: ${reqLabel} from ${name}`,
      `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0A0A0A;color:#FAFAFA;padding:32px">
<div style="max-width:560px;margin:0 auto;background:#111111;border:1px solid rgba(245,159,10,0.2);border-radius:12px;padding:28px">
<p style="color:#F59F0A;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;margin:0 0 16px">New Request — ${esc(brandName)}</p>
<table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px">
  <tr><td style="color:rgba(255,255,255,0.5);padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.07);width:40%">Request type</td><td style="padding:8px 0 8px 12px;border-bottom:1px solid rgba(255,255,255,0.07);font-weight:500">${esc(reqLabel)}</td></tr>
  <tr><td style="color:rgba(255,255,255,0.5);padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.07)">Jurisdiction</td><td style="padding:8px 0 8px 12px;border-bottom:1px solid rgba(255,255,255,0.07);font-weight:500">${esc(jurisdictionInfo.label)}</td></tr>
  <tr><td style="color:rgba(255,255,255,0.5);padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.07)">Name</td><td style="padding:8px 0 8px 12px;border-bottom:1px solid rgba(255,255,255,0.07);font-weight:500">${esc(name)}</td></tr>
  <tr><td style="color:rgba(255,255,255,0.5);padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.07)">Email</td><td style="padding:8px 0 8px 12px;border-bottom:1px solid rgba(255,255,255,0.07)"><a href="mailto:${esc(email)}" style="color:#F59F0A">${esc(email)}</a></td></tr>
  <tr><td style="color:rgba(255,255,255,0.5);padding:8px 0">Received</td><td style="padding:8px 0 8px 12px">${receivedAt}</td></tr>
</table>
${message ? `<div style="background:#0A0A0A;border-radius:8px;padding:14px;font-size:13px;color:#b8b8b8;line-height:1.6"><strong style="display:block;margin-bottom:6px;color:#FAFAFA">Details</strong>${esc(message)}</div>` : ''}
<p style="font-size:12px;color:rgba(255,255,255,0.3);margin-top:20px;border-top:1px solid rgba(255,255,255,0.07);padding-top:14px">Respond within ${esc(responseTime)} under ${esc(jurisdLaw)} — ${esc(domain)}</p>
</div></body></html>`
    ) : Promise.resolve(),

    sendEmail(
      sendEmailBinding, email, fromEmail, domain,
      `Action required — your ${domain} request`,
      `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0A0A0A">
<tr><td align="center" style="padding:40px 20px">
<table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%">
<tr><td style="padding-bottom:24px">
  <span style="font-size:12px;font-weight:700;letter-spacing:0.08em;color:#F59F0A">TRUSTCENTER.PRO</span>
  <span style="font-size:12px;color:rgba(255,255,255,0.3);margin:0 8px">&middot;</span>
  <span style="font-size:12px;color:rgba(255,255,255,0.4)">${esc(brandName)}</span>
</td></tr>
<tr><td style="background:#111111;border:1px solid rgba(245,159,10,0.22);border-radius:14px;padding:36px 36px 28px">
  <div style="display:inline-block;background:rgba(245,159,10,0.1);border:1px solid rgba(245,159,10,0.3);border-radius:100px;padding:5px 14px;margin-bottom:24px">
    <span style="font-size:11px;font-weight:700;letter-spacing:0.12em;color:#F59F0A;text-transform:uppercase">Action required</span>
  </div>
  <h1 style="font-size:26px;font-weight:600;color:#FAFAFA;margin:0 0 12px;letter-spacing:-0.02em;line-height:1.2">One step before<br>we can begin</h1>
  <p style="font-size:14px;color:#94A3B8;line-height:1.65;margin:0 0 28px">Hi ${esc(name)}, we&rsquo;ve received your <strong style="color:#FAFAFA">${esc(reqLabel)}</strong> request. Before we can process it, we need to verify your identity.</p>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0A0A0A;border:1px solid rgba(245,159,10,0.4);border-radius:10px;margin-bottom:28px">
    <tr><td style="padding:20px 22px">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#F59F0A;margin:0 0 10px">Verify your identity</p>
      <p style="font-size:14px;color:#FAFAFA;line-height:1.6;margin:0 0 10px"><strong>Reply to this email</strong> from the address you used when you signed up with ${esc(brandName)}.</p>
      <p style="font-size:13px;color:#94A3B8;line-height:1.55;margin:0">If you registered with a different address, please reply from that address and include your full name. We cannot begin processing until we have confirmed you are the account holder.</p>
    </td></tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0A0A0A;border-radius:8px;margin-bottom:28px">
    <tr><td style="padding:16px 18px">
      <p style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.3);margin:0 0 12px">Your request</p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr><td style="font-size:13px;color:rgba(255,255,255,0.45);padding-bottom:8px;width:38%">Request type</td><td style="font-size:13px;color:#FAFAFA;font-weight:500;padding-bottom:8px">${esc(reqLabel)}</td></tr>
        <tr><td style="font-size:13px;color:rgba(255,255,255,0.45);padding-bottom:8px">Jurisdiction</td><td style="font-size:13px;color:#FAFAFA;font-weight:500;padding-bottom:8px">${esc(jurisdictionInfo.label)}</td></tr>
        <tr><td style="font-size:13px;color:rgba(255,255,255,0.45);padding-bottom:8px">Submitted by</td><td style="font-size:13px;color:#FAFAFA;font-weight:500;padding-bottom:8px">${esc(name)}</td></tr>
        <tr><td style="font-size:13px;color:rgba(255,255,255,0.45)">Received</td><td style="font-size:13px;color:#FAFAFA;font-weight:500">${receivedAt}</td></tr>
      </table>
    </td></tr>
  </table>
  <p style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.3);margin:0 0 16px">What happens next</p>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px">
    <tr><td style="padding-bottom:14px"><table cellpadding="0" cellspacing="0" role="presentation"><tr>
      <td style="vertical-align:top;padding-right:14px"><div style="width:24px;height:24px;background:rgba(245,159,10,0.12);border:1px solid rgba(245,159,10,0.3);border-radius:50%;text-align:center;line-height:24px;font-size:11px;font-weight:700;color:#F59F0A">1</div></td>
      <td style="vertical-align:top"><p style="font-size:13px;color:#FAFAFA;font-weight:600;margin:2px 0 3px">Reply to verify your identity</p><p style="font-size:12px;color:#94A3B8;margin:0;line-height:1.5">Reply from the email address you registered with ${esc(brandName)}</p></td>
    </tr></table></td></tr>
    <tr><td style="padding-bottom:14px"><table cellpadding="0" cellspacing="0" role="presentation"><tr>
      <td style="vertical-align:top;padding-right:14px"><div style="width:24px;height:24px;background:rgba(245,159,10,0.12);border:1px solid rgba(245,159,10,0.3);border-radius:50%;text-align:center;line-height:24px;font-size:11px;font-weight:700;color:#F59F0A">2</div></td>
      <td style="vertical-align:top"><p style="font-size:13px;color:#FAFAFA;font-weight:600;margin:2px 0 3px">We review your request</p><p style="font-size:12px;color:#94A3B8;margin:0;line-height:1.5">Our team processes your request in line with ${esc(jurisdLaw)}</p></td>
    </tr></table></td></tr>
    <tr><td><table cellpadding="0" cellspacing="0" role="presentation"><tr>
      <td style="vertical-align:top;padding-right:14px"><div style="width:24px;height:24px;background:rgba(245,159,10,0.12);border:1px solid rgba(245,159,10,0.3);border-radius:50%;text-align:center;line-height:24px;font-size:11px;font-weight:700;color:#F59F0A">3</div></td>
      <td style="vertical-align:top"><p style="font-size:13px;color:#FAFAFA;font-weight:600;margin:2px 0 3px">Full response within ${esc(responseTime)}</p><p style="font-size:12px;color:#94A3B8;margin:0;line-height:1.5">We respond personally &mdash; your data stays with ${esc(brandName)}, never shared with third parties</p></td>
    </tr></table></td></tr>
  </table>
  <div style="border-top:1px solid rgba(255,255,255,0.07);margin-top:4px;padding-top:24px">
    <p style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.3);margin:0 0 14px">What to expect</p>
    <p style="font-size:13px;color:#94A3B8;line-height:1.65;margin:0 0 10px">Once your identity is confirmed, we will gather all personal data held about you across our systems. You will receive a structured response directly to this email address.</p>
    <p style="font-size:13px;color:#94A3B8;line-height:1.65;margin:0 0 16px">If your request requires clarification or additional time (permitted under ${esc(jurisdLaw)} for complex cases), we will contact you to explain before the deadline.</p>
    <a href="https://trustcenter.pro/articles/what-is-a-dsar" style="display:inline-block;font-size:12.5px;font-weight:600;color:#F59F0A;text-decoration:none">Read: How a DSAR works &rarr;</a>
  </div>
</td></tr>
<tr><td style="padding-top:20px;text-align:center">
  <p style="font-size:11px;color:rgba(255,255,255,0.25);margin:0 0 6px;line-height:1.7">This request is managed by <a href="https://trustcenter.pro" style="color:rgba(245,159,10,0.5);text-decoration:none">trustcenter.pro</a> on behalf of ${esc(brandName)}.</p>
  <p style="font-size:11px;color:rgba(255,255,255,0.2);margin:0 0 6px"><a href="https://${esc(domain)}/trust-center" style="color:rgba(255,255,255,0.25);text-decoration:none">Trust Center</a>&nbsp;&middot;&nbsp;<a href="https://${esc(domain)}/trust-center/privacy" style="color:rgba(255,255,255,0.25);text-decoration:none">Privacy Policy</a>&nbsp;&middot;&nbsp;<a href="https://trustcenter.pro/articles/what-is-a-dsar" style="color:rgba(255,255,255,0.25);text-decoration:none">What is a DSAR?</a></p>
</td></tr>
</table></td></tr></table>
</body></html>`,
      'dpo@trustcenter.pro'
        ),
  ]).catch(() => {});

  if (ctx) ctx.waitUntil(emailWork);

  return { success: true };
}
