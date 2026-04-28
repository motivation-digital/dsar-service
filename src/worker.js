// dsar-service — standalone DSAR contact form worker
// LCE-10000116: extracted from trust-center v0.4.0
import { getFactsByHost } from './facts.js';
import { renderDsarPage, handleDsarSubmit } from './dsar-form.js';

function html(body, status = 200) {
  return new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function getHost(request) {
  return (request.headers.get('host') || '').split(':')[0].toLowerCase();
}

function renderNotConfigured(host) {
  const h = String(host || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Not configured</title></head><body style="font-family:sans-serif;background:#0A0A0A;color:#E5E5E5;padding:60px;text-align:center"><p style="color:#F59F0A">Not configured: ${h}</p></body></html>`;
}

// Secrets Store bindings expose a .get() method; secret_text bindings are plain strings.
async function resolveSecret(binding) {
  if (!binding) return null;
  if (typeof binding.get === 'function') return await binding.get();
  return binding;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const host = getHost(request);

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', worker: 'dsar-service', version: '1.0.1' }), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    if (url.pathname === '/trust-center/contact') {
      try {
        const facts = await getFactsByHost(env.DB, host);
        if (!facts) return html(renderNotConfigured(host), 404);

        if (request.method === 'POST') {
          const turnstileSecret = await resolveSecret(env.TURNSTILE_SECRET);
          const result = await handleDsarSubmit(
            request, env.DB, facts, ctx,
            turnstileSecret,
            env.SEND_EMAIL || null
          );
          if (!result.success) return html(renderDsarPage(facts, result.errors, result.values));
          return new Response(null, { status: 303, headers: { Location: '/trust-center/contact?submitted=1' } });
        }

        const submitted = url.searchParams.get('submitted') === '1';
        return html(renderDsarPage(facts, {}, {}, submitted));
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
          status: 500,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Not found', path: url.pathname }), {
      status: 404,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  },
};
