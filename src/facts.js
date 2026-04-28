// Trust Center — Brand Facts resolver (task A.2)
//
// Given a brand_id, walks the parent_brand_id chain and returns a single merged
// facts object. Child values override parent values; null/undefined child values
// fall through to the parent. Deep merge applies to object values; arrays are
// replaced wholesale (child array wins outright, consistent with user expectation).
//
// Cycle protection: tracks visited brand_ids; throws on cycle.
// Depth limit: 8 (a parent chain deeper than that is almost certainly a mistake).

const MAX_DEPTH = 8;

/**
 * Deep merge two objects. Child overrides parent at leaf level.
 * - Plain objects are merged recursively.
 * - Arrays are replaced (not concatenated). Null/undefined child values fall through to parent.
 * - Primitives: child wins if defined, else parent.
 */
function deepMerge(parent, child) {
  if (child === undefined || child === null) return parent;
  if (parent === undefined || parent === null) return child;
  if (Array.isArray(child) || Array.isArray(parent)) return child ?? parent;
  if (typeof child !== 'object' || typeof parent !== 'object') return child ?? parent;

  const out = { ...parent };
  for (const [k, v] of Object.entries(child)) {
    if (v === null || v === undefined) continue; // null/undefined child → keep parent
    out[k] = deepMerge(parent[k], v);
  }
  return out;
}

/**
 * Load a single brand row and normalise it into a facts-shaped object.
 * Columns like operational_jurisdictions / facts_json carry JSON strings; parse them.
 */
async function loadBrandRow(db, brand_id) {
  const row = await db.prepare(
    `SELECT brand_id, parent_brand_id, host, name, company_legal_name, address,
            company_reg, vat_number, jurisdiction, contact_email, dpo_email,
            primary_color, logo_url, favicon_url, civic_key, status,
            is_b2b, disclaimer_applicability, operational_jurisdictions,
            customer_geo, facts_json
     FROM brands WHERE brand_id = ?`
  ).bind(brand_id).first();

  if (!row) return null;

  // facts_json, if present, holds the rich Brand Facts object and takes precedence
  // over the legacy column values (which are kept for back-compat during v0.1.x).
  let facts = {};
  if (row.facts_json) {
    try { facts = JSON.parse(row.facts_json); } catch { facts = {}; }
  }

  // Derive a facts-shaped object from the legacy columns so brands that haven't
  // been migrated to facts_json still render correctly.
  // NOTE: entity.legal_name uses company_legal_name only (not row.name as fallback)
  // so that child brands with null company_legal_name correctly inherit the parent's
  // legal entity name rather than overriding it with their trading name. (A.3 gap fix)
  const fromColumns = {
    brand_id: row.brand_id,
    parent_brand_id: row.parent_brand_id || null,
    host: row.host,
    entity: {
      legal_name: row.company_legal_name || null,
      trading_name: row.name,
      company_reg: row.company_reg,
      vat_number: row.vat_number,
    },
    operational_jurisdictions: row.operational_jurisdictions
      ? safeJsonArray(row.operational_jurisdictions)
      : (row.jurisdiction ? [row.jurisdiction] : ['global']),
    customer_geo: row.customer_geo ? safeJsonArray(row.customer_geo) : ['global'],
    contacts: {
      general: row.contact_email,
      dpo: row.dpo_email ? { email: row.dpo_email } : null,
    },
    is_b2b: !!row.is_b2b,
    disclaimer_applicability: row.disclaimer_applicability || 'none',
    brand: {
      primary_color: row.primary_color,
      logo_url: row.logo_url,
      favicon_url: row.favicon_url,
    },
    civic_key: row.civic_key,
    status: row.status,
  };

  return {
    parent_brand_id: row.parent_brand_id || null,
    resolved: deepMerge(fromColumns, facts),
  };
}

function safeJsonArray(s) {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/**
 * Resolve the full Brand Facts for a brand, merging the parent chain.
 * Returns null if the brand_id is unknown.
 * @param {D1Database} db
 * @param {string} brand_id
 * @returns {Promise<object|null>}
 */
export async function getFacts(db, brand_id) {
  const visited = new Set();
  let depth = 0;

  async function resolve(id) {
    if (visited.has(id)) {
      throw new Error(`Brand facts cycle detected at ${id}`);
    }
    if (depth++ > MAX_DEPTH) {
      throw new Error(`Brand facts parent chain too deep (>${MAX_DEPTH}) starting at ${brand_id}`);
    }
    visited.add(id);

    const row = await loadBrandRow(db, id);
    if (!row) return null;

    if (row.parent_brand_id) {
      const parent = await resolve(row.parent_brand_id);
      return deepMerge(parent || {}, row.resolved);
    }
    return row.resolved;
  }

  const resolved = await resolve(brand_id);
  if (resolved) {
    const trust = await db.prepare(
      'SELECT overall_status, overall_color, last_review, dsar_response, encryption, open_incidents, cookie_count, regulatory_authority FROM trust_status WHERE brand_id = ?'
    ).bind(brand_id).first();
    if (trust) {
      const dsarRow = await db.prepare(
        'SELECT COUNT(*) as cnt FROM dsar_requests WHERE brand_id = ?'
      ).bind(brand_id).first();
      const dsarCount = dsarRow?.cnt ?? 0;
      resolved.compliance = {
        overall_status: trust.overall_status,
        overall_color: trust.overall_color,
        last_review: trust.last_review,
        dsar_response: trust.dsar_response,
        encryption: trust.encryption,
        open_incidents: dsarCount > 0 ? String(dsarCount) : 'None',
        cookie_count: trust.cookie_count,
        regulatory_authority: trust.regulatory_authority,
      };
    }
  }
  return resolved;
}

/**
 * Look up a brand by host header, then resolve its facts.
 */
export async function getFactsByHost(db, host) {
  if (!host) return null;
  const row = await db.prepare(
    `SELECT brand_id FROM brands WHERE host = ? AND status = 'active'`
  ).bind(host).first();
  if (!row) return null;
  return await getFacts(db, row.brand_id);
}
