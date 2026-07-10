import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = 'C:\\Users\\NaifAlmatari\\OneDrive - Trustangle\\trustangle\\Salesforce\\Transformation';
const OUT_DIR = join(__dirname, '..', 'public', 'data');
const REFERENCE_DATE = new Date('2026-07-10');

function readCSV(filename) {
  const raw = readFileSync(join(DATA_DIR, filename), 'utf-8');
  return parse(raw, { columns: true, skip_empty_lines: true, trim: true });
}

function normalizeEmail(e) {
  return e ? e.trim().toLowerCase() : null;
}

function normalizePhone(p) {
  if (!p) return null;
  let cleaned = p.replace(/[\s\-\+\(\)]/g, '');
  if (cleaned.startsWith('966')) return cleaned;
  if (cleaned.startsWith('0')) return '966' + cleaned.slice(1);
  if (cleaned.startsWith('5')) return '966' + cleaned;
  return cleaned;
}

function daysBetween(d1, d2) {
  return Math.floor(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
}

function ntile(arr, n) {
  const sorted = [...arr].sort((a, b) => a.value - b.value);
  const len = sorted.length;
  const result = new Map();
  sorted.forEach((item, i) => {
    const tile = Math.min(Math.floor(i * n / len) + 1, n);
    result.set(item.id, tile);
  });
  return result;
}

// ── 1. Load all CSV files ──
console.log('Loading CSV files...');
const lsgolfCustomers = readCSV('lsgolf_customers.csv');
const lsgolfSubscriptions = readCSV('lsgolf_subscriptions.csv');
const lsgolfReservations = readCSV('lsgolf_reservations.csv');
const lsgolfRounds = readCSV('lsgolf_rounds.csv');
const lsretailCustomers = readCSV('lsretail_customers.csv');
const lsretailSales = readCSV('lsretail_sales.csv');
const lsretailSaleLines = readCSV('lsretail_sale_lines.csv');
const lsretailItems = readCSV('lsretail_items.csv');
const infrasysGuests = readCSV('infrasys_guests.csv');
const infrasysCheckItems = readCSV('infrasys_check_items.csv');
const jigsawUsers = readCSV('jigsaw_app_users.csv');

console.log(`Loaded: ${lsgolfCustomers.length} golf customers, ${lsgolfRounds.length} rounds, ${lsretailCustomers.length} retail customers, ${lsretailSales.length} sales, ${infrasysGuests.length} F&B guests, ${infrasysCheckItems.length} check items, ${jigsawUsers.length} app users`);

// ── 2. Build lookup maps ──
const subMap = new Map();
lsgolfSubscriptions.forEach(s => subMap.set(s.ID, s));

const guestPhoneMap = new Map();
infrasysGuests.forEach(g => {
  const phone = normalizePhone(g.MOBILE_NUMBER);
  if (phone) guestPhoneMap.set(g.GUEST_ID, phone);
});

const retailItemMap = new Map();
lsretailItems.forEach(i => retailItemMap.set(i.ITEMID, i));

// ── 3. Identity resolution ──
const membersByEmail = new Map();
const phoneToEmail = new Map();

function getOrCreateMember(email) {
  if (!email) return null;
  const key = normalizeEmail(email);
  if (!key) return null;
  if (!membersByEmail.has(key)) {
    membersByEmail.set(key, {
      email: key,
      sources: new Set(),
      lsgolfId: null,
      lsretailId: null,
      infrasysGuestIds: [],
      jigsawId: null,
      firstName: null,
      lastName: null,
      phone: null,
      gender: null,
      dateOfBirth: null,
      nationality: null,
      city: null,
      membershipNo: null,
      subscriptionId: null,
      handicap: null,
      platformType: null,
      isActive: false,
      isMember: false,
    });
  }
  return membersByEmail.get(key);
}

// LSGolf customers
lsgolfCustomers.forEach(c => {
  const email = normalizeEmail(c.EMAIL);
  if (!email) return;
  const m = getOrCreateMember(email);
  m.sources.add('LSGolf');
  m.lsgolfId = c.ID;
  m.firstName = m.firstName || c.FIRST_NAME;
  m.lastName = m.lastName || c.LAST_NAME;
  m.phone = m.phone || normalizePhone(c.PHONE);
  m.gender = c.GENDER === '1' ? 'Male' : c.GENDER === '0' ? 'Female' : m.gender;
  m.dateOfBirth = m.dateOfBirth || c.DATE_OF_BIRTH || null;
  m.membershipNo = m.membershipNo || c.MEMBER_NO || null;
  m.subscriptionId = c.SUBSCRIPTION_ID || null;
  if (m.phone) phoneToEmail.set(m.phone, email);
});

// LSRetail customers
lsretailCustomers.forEach(c => {
  const email = normalizeEmail(c.EMAIL_ADDRESS);
  if (!email) return;
  const m = getOrCreateMember(email);
  m.sources.add('LSRetail');
  m.lsretailId = c.CUSTOMERID;
  m.firstName = m.firstName || c.FIRSTNAME;
  m.lastName = m.lastName || c.LASTNAME;
  const phone = normalizePhone(c.PHONE_NUMBER);
  if (phone) {
    m.phone = m.phone || phone;
    phoneToEmail.set(phone, email);
  }
});

// Jigsaw app users
jigsawUsers.forEach(u => {
  const email = normalizeEmail(u.EMAIL);
  if (!email) return;
  const m = getOrCreateMember(email);
  m.sources.add('Jigsaw');
  m.jigsawId = u.ID || true;
  m.firstName = m.firstName || u.FIRST_NAME;
  m.lastName = m.lastName || u.LAST_NAME;
  m.nationality = m.nationality || u.NATIONALITY || null;
  m.city = m.city || u.CITY_NAME || null;
  m.dateOfBirth = m.dateOfBirth || u.BIRTH_DATE || null;
  m.handicap = u.HANDICAP ? parseFloat(u.HANDICAP) : m.handicap;
  m.platformType = m.platformType || u.PLATFORM_TYPE || null;
  m.isActive = u.IS_ACTIVE === 'TRUE' || m.isActive;
  m.isMember = u.IS_MEMBER === 'TRUE' || m.isMember;
  m.membershipNo = m.membershipNo || u.MEMBERSHIP_ID || null;
  const phone = normalizePhone(u.PHONE_NUMBER);
  if (phone) {
    m.phone = m.phone || phone;
    phoneToEmail.set(phone, email);
  }
});

// Infrasys guests - match by phone
infrasysGuests.forEach(g => {
  const phone = normalizePhone(g.MOBILE_NUMBER);
  if (!phone) return;
  const email = phoneToEmail.get(phone);
  if (email) {
    const m = membersByEmail.get(email);
    if (m) {
      m.sources.add('Infrasys');
      m.infrasysGuestIds.push(g.GUEST_ID);
    }
  }
});

console.log(`Identity resolution: ${membersByEmail.size} unified members`);

// ── 4. Compute Golf RFM raw metrics ──
const golfMetrics = new Map();
lsgolfRounds.forEach(r => {
  if (!r.CUSTOMER_ID) return;
  const price = parseFloat(r.PRICE) || 0;
  const paid = r.PAID === 'TRUE';
  if (!paid || price <= 0) return;

  const custId = r.CUSTOMER_ID;
  if (!golfMetrics.has(custId)) {
    golfMetrics.set(custId, { dates: [], totalSpend: 0, transactions: [] });
  }
  const gm = golfMetrics.get(custId);
  const date = r.CREATED_AT.split(' ')[0];
  gm.dates.push(new Date(date));
  gm.totalSpend += price;
  gm.transactions.push({
    date,
    amount: price,
    type: 'Round',
    greenFee: parseFloat(r.GREEN_FEE) || 0,
    cartFee: parseFloat(r.CART_FEE) || 0,
    state: r.STATE,
  });
});

// Map golf customer IDs to emails
const golfCustToEmail = new Map();
lsgolfCustomers.forEach(c => {
  const email = normalizeEmail(c.EMAIL);
  if (email) golfCustToEmail.set(c.ID, email);
});

// ── 5. Compute Retail RFM raw metrics ──
const retailMetrics = new Map();

// Use sale headers for totals (includes tax)
lsretailSales.forEach(s => {
  if (s.COMPLETED !== 'TRUE') return;
  const custId = s.CUSTOMERID;
  if (!custId) return;
  if (!retailMetrics.has(custId)) {
    retailMetrics.set(custId, { saleIds: new Set(), dates: [], totalSpend: 0, transactions: [] });
  }
  const rm = retailMetrics.get(custId);
  const amount = parseFloat(s.CALCTOTAL) || 0;
  const date = s.CREATETIME ? s.CREATETIME.split(' ')[0].split('T')[0] : null;
  rm.saleIds.add(s.SALEID);
  if (date) rm.dates.push(new Date(date));
  rm.totalSpend += amount;
  rm.transactions.push({ date, amount, saleId: s.SALEID });
});

// Enrich retail transactions with line item details
const saleLinesBySale = new Map();
lsretailSaleLines.forEach(l => {
  if (!saleLinesBySale.has(l.SALEID)) saleLinesBySale.set(l.SALEID, []);
  const item = retailItemMap.get(l.ITEMID);
  saleLinesBySale.get(l.SALEID).push({
    item: item ? item.DESCRIPTION : l.ITEMID,
    qty: parseFloat(l.UNITQUANTITY) || 1,
    unitPrice: parseFloat(l.UNITPRICE) || 0,
    total: parseFloat(l.CALCTOTAL) || 0,
  });
});
for (const [, rm] of retailMetrics) {
  rm.transactions = rm.transactions.map(t => ({
    ...t,
    items: saleLinesBySale.get(t.saleId) || [],
  }));
}

const retailCustToEmail = new Map();
lsretailCustomers.forEach(c => {
  const email = normalizeEmail(c.EMAIL_ADDRESS);
  if (email) retailCustToEmail.set(c.CUSTOMERID, email);
});

// ── 6. Compute Food RFM raw metrics ──
const foodMetricsByGuest = new Map();
infrasysCheckItems.forEach(item => {
  const guestId = item.GUEST_ID;
  if (!guestId) return;
  if (!foodMetricsByGuest.has(guestId)) {
    foodMetricsByGuest.set(guestId, { checkIds: new Set(), dates: [], totalSpend: 0, transactions: [] });
  }
  const fm = foodMetricsByGuest.get(guestId);
  const amount = parseFloat(item.FTOTAL) || 0;
  const date = item.FDATE || null;
  if (!fm.checkIds.has(item.FCHECK)) {
    fm.checkIds.add(item.FCHECK);
    if (date) fm.dates.push(new Date(date));
  }
  fm.totalSpend += amount;
  fm.transactions.push({
    date,
    amount,
    check: item.FCHECK,
    outlet: item.SOURCE_TAG,
    item: item.FDESC1 || item.FITEM,
    qty: parseFloat(item.FQTY) || 1,
  });
});

// Map guest IDs to emails via phone
const guestToEmail = new Map();
infrasysGuests.forEach(g => {
  const phone = normalizePhone(g.MOBILE_NUMBER);
  if (phone && phoneToEmail.has(phone)) {
    guestToEmail.set(g.GUEST_ID, phoneToEmail.get(phone));
  }
});

// ── 7. Assign channel metrics to unified members ──
function computeChannelRaw(email, channel) {
  let metrics = null;

  if (channel === 'golf') {
    for (const [custId, gm] of golfMetrics) {
      if (golfCustToEmail.get(custId) === email) {
        metrics = gm;
        break;
      }
    }
  } else if (channel === 'retail') {
    for (const [custId, rm] of retailMetrics) {
      if (retailCustToEmail.get(custId) === email) {
        metrics = rm;
        break;
      }
    }
  } else if (channel === 'food') {
    for (const [guestId, fm] of foodMetricsByGuest) {
      if (guestToEmail.get(guestId) === email) {
        if (!metrics) {
          metrics = { dates: [...fm.dates], totalSpend: fm.totalSpend, transactions: [...fm.transactions], checkIds: new Set(fm.checkIds) };
        } else {
          metrics.dates.push(...fm.dates);
          metrics.totalSpend += fm.totalSpend;
          metrics.transactions.push(...fm.transactions);
          fm.checkIds.forEach(c => metrics.checkIds.add(c));
        }
      }
    }
  }

  if (!metrics || metrics.dates.length === 0) return null;

  const lastDate = new Date(Math.max(...metrics.dates.map(d => d.getTime())));
  const recencyDays = daysBetween(lastDate, REFERENCE_DATE);
  const frequency = channel === 'golf' ? metrics.dates.length :
    channel === 'retail' ? (metrics.saleIds ? metrics.saleIds.size : metrics.dates.length) :
    (metrics.checkIds ? metrics.checkIds.size : metrics.dates.length);

  return {
    recencyDays,
    frequency,
    monetary: Math.round(metrics.totalSpend * 100) / 100,
    lastActivity: lastDate.toISOString().split('T')[0],
    transactions: metrics.transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20),
  };
}

// Build per-member channel data
const memberChannelData = new Map();
for (const [email, member] of membersByEmail) {
  const golf = computeChannelRaw(email, 'golf');
  const retail = computeChannelRaw(email, 'retail');
  const food = computeChannelRaw(email, 'food');
  memberChannelData.set(email, { golf, retail, food });
}

// ── 8. NTILE(4) scoring per channel ──
function computeNtileScores(channel) {
  const recencyItems = [];
  const frequencyItems = [];
  const monetaryItems = [];

  for (const [email, channels] of memberChannelData) {
    const ch = channels[channel];
    if (!ch) continue;
    recencyItems.push({ id: email, value: ch.recencyDays });
    frequencyItems.push({ id: email, value: ch.frequency });
    monetaryItems.push({ id: email, value: ch.monetary });
  }

  const rTiles = ntile(recencyItems, 4);
  const fTiles = ntile(frequencyItems, 4);
  const mTiles = ntile(monetaryItems, 4);

  const scores = new Map();
  for (const [email] of memberChannelData) {
    const ch = memberChannelData.get(email)[channel];
    if (!ch) continue;
    const rRaw = rTiles.get(email);
    scores.set(email, {
      r: 5 - rRaw, // invert: low days = high recency score
      f: fTiles.get(email),
      m: mTiles.get(email),
    });
  }
  return scores;
}

const golfScores = computeNtileScores('golf');
const retailScores = computeNtileScores('retail');
const foodScores = computeNtileScores('food');

// ── 9. Verify Ahmad Al-Rashid ──
const ahmadEmail = 'ahmad.alrashid@gmail.com';
const ahmadGolf = memberChannelData.get(ahmadEmail)?.golf;
const ahmadRetail = memberChannelData.get(ahmadEmail)?.retail;
const ahmadFood = memberChannelData.get(ahmadEmail)?.food;
const ahmadGolfScore = golfScores.get(ahmadEmail);
const ahmadRetailScore = retailScores.get(ahmadEmail);
const ahmadFoodScore = foodScores.get(ahmadEmail);

console.log('\n=== Ahmad Al-Rashid Verification ===');
console.log(`Golf: R${ahmadGolfScore?.r} F${ahmadGolfScore?.f} M${ahmadGolfScore?.m} | SAR ${ahmadGolf?.monetary} | Last: ${ahmadGolf?.lastActivity} | Freq: ${ahmadGolf?.frequency}`);
console.log(`  Target: R1 F4 M4 | SAR 1705`);
console.log(`Retail: R${ahmadRetailScore?.r} F${ahmadRetailScore?.f} M${ahmadRetailScore?.m} | SAR ${ahmadRetail?.monetary} | Last: ${ahmadRetail?.lastActivity} | Freq: ${ahmadRetail?.frequency}`);
console.log(`  Target: R4 F4 M4 | SAR 15588`);
console.log(`Food: R${ahmadFoodScore?.r} F${ahmadFoodScore?.f} M${ahmadFoodScore?.m} | SAR ${ahmadFood?.monetary} | Last: ${ahmadFood?.lastActivity} | Freq: ${ahmadFood?.frequency}`);
console.log(`  Target: R4 F4 M4 | SAR 7066`);

const genR = Math.round(((ahmadGolfScore?.r || 0) + (ahmadRetailScore?.r || 0) + (ahmadFoodScore?.r || 0)) / 3);
const genF = Math.round(((ahmadGolfScore?.f || 0) + (ahmadRetailScore?.f || 0) + (ahmadFoodScore?.f || 0)) / 3);
const genM = Math.round(((ahmadGolfScore?.m || 0) + (ahmadRetailScore?.m || 0) + (ahmadFoodScore?.m || 0)) / 3);
const genTotal = (ahmadGolf?.monetary || 0) + (ahmadRetail?.monetary || 0) + (ahmadFood?.monetary || 0);
console.log(`General: R${genR} F${genF} M${genM} | SAR ${genTotal}`);
console.log(`  Target: R3 F4 M4 | SAR 24359`);

// ── 10. Segment classification ──
function classifySegment(r, f, m) {
  if (r >= 3 && f >= 3 && m >= 3) return 'Champions';
  if (f >= 3 && r >= 3) return 'Loyal';
  if (m >= 3 && r >= 3 && f < 3) return 'Big Spenders';
  if (r >= 2 && f >= 2) return 'Almost Loyal';
  if (r >= 2 && f < 2) return 'Occasional';
  if (r <= 1 && f >= 2) return 'Almost Lost';
  if (r <= 1 && f <= 1) return 'Lost';
  return 'Occasional';
}

// ── 11. Build final members array ──
const members = [];
let idCounter = 1;

for (const [email, member] of membersByEmail) {
  const channels = memberChannelData.get(email);
  const gScore = golfScores.get(email);
  const rScore = retailScores.get(email);
  const fScore = foodScores.get(email);

  const golfChannel = channels.golf ? {
    ...channels.golf,
    r: gScore?.r || 0, f: gScore?.f || 0, m: gScore?.m || 0,
    rfmScore: `${gScore?.r || 0}${gScore?.f || 0}${gScore?.m || 0}`,
  } : null;

  const retailChannel = channels.retail ? {
    ...channels.retail,
    r: rScore?.r || 0, f: rScore?.f || 0, m: rScore?.m || 0,
    rfmScore: `${rScore?.r || 0}${rScore?.f || 0}${rScore?.m || 0}`,
  } : null;

  const foodChannel = channels.food ? {
    ...channels.food,
    r: fScore?.r || 0, f: fScore?.f || 0, m: fScore?.m || 0,
    rfmScore: `${fScore?.r || 0}${fScore?.f || 0}${fScore?.m || 0}`,
  } : null;

  const generalR = Math.round(((gScore?.r || 0) + (rScore?.r || 0) + (fScore?.r || 0)) / 3);
  const generalF = Math.round(((gScore?.f || 0) + (rScore?.f || 0) + (fScore?.f || 0)) / 3);
  const generalM = Math.round(((gScore?.m || 0) + (rScore?.m || 0) + (fScore?.m || 0)) / 3);
  const totalMonetary = (channels.golf?.monetary || 0) + (channels.retail?.monetary || 0) + (channels.food?.monetary || 0);

  const segment = classifySegment(generalR, generalF, generalM);

  // At-risk: any channel with R<=2 AND M>=3
  const atRiskChannels = [];
  if (gScore && gScore.r <= 2 && gScore.m >= 3) atRiskChannels.push('golf');
  if (rScore && rScore.r <= 2 && rScore.m >= 3) atRiskChannels.push('retail');
  if (fScore && fScore.r <= 2 && fScore.m >= 3) atRiskChannels.push('food');

  // Subscription info
  let subscriptionStatus = 'None';
  let subscriptionStart = null;
  let subscriptionEnd = null;
  let autoRenew = false;
  if (member.subscriptionId && subMap.has(member.subscriptionId)) {
    const sub = subMap.get(member.subscriptionId);
    subscriptionStart = sub.START_DATE ? sub.START_DATE.split(' ')[0] : null;
    subscriptionEnd = sub.END_DATE ? sub.END_DATE.split(' ')[0] : null;
    autoRenew = sub.AUTO_RENEW === 'TRUE';
    const endDate = subscriptionEnd ? new Date(subscriptionEnd) : null;
    subscriptionStatus = endDate && endDate >= REFERENCE_DATE ? 'Active' : 'Expired';
  }

  members.push({
    id: `MBR-${String(idCounter++).padStart(4, '0')}`,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phone: member.phone,
    gender: member.gender,
    dateOfBirth: member.dateOfBirth,
    nationality: member.nationality,
    city: member.city,
    membershipNo: member.membershipNo,
    subscriptionStatus,
    subscriptionStart,
    subscriptionEnd,
    autoRenew,
    isActive: member.isActive,
    isMember: !!member.membershipNo,
    handicap: member.handicap,
    platformType: member.platformType,
    channels: {
      golf: golfChannel,
      retail: retailChannel,
      food: foodChannel,
    },
    general: {
      r: generalR,
      f: generalF,
      m: generalM,
      rfmScore: `${generalR}${generalF}${generalM}`,
      totalMonetary: Math.round(totalMonetary * 100) / 100,
    },
    segment,
    atRisk: atRiskChannels.length > 0,
    atRiskChannels,
    systems: [...member.sources],
  });
}

// Sort so Ahmad is easy to find
members.sort((a, b) => b.general.totalMonetary - a.general.totalMonetary);
members.forEach((m, i) => m.id = `MBR-${String(i + 1).padStart(4, '0')}`);

// ── 12. Summary stats ──
const segmentCounts = {};
members.forEach(m => { segmentCounts[m.segment] = (segmentCounts[m.segment] || 0) + 1; });
const atRiskCount = members.filter(m => m.atRisk).length;
const activeCount = members.filter(m => m.subscriptionStatus === 'Active').length;
const totalMembers = members.length;
const avgMonetary = Math.round(members.reduce((s, m) => s + m.general.totalMonetary, 0) / totalMembers);

const summary = {
  totalMembers,
  activeSubscriptions: activeCount,
  atRiskMembers: atRiskCount,
  avgLifetimeValue: avgMonetary,
  segmentDistribution: segmentCounts,
  channelCoverage: {
    golf: members.filter(m => m.channels.golf).length,
    retail: members.filter(m => m.channels.retail).length,
    food: members.filter(m => m.channels.food).length,
  },
  systemsCoverage: {
    LSGolf: members.filter(m => m.systems.includes('LSGolf')).length,
    LSRetail: members.filter(m => m.systems.includes('LSRetail')).length,
    Infrasys: members.filter(m => m.systems.includes('Infrasys')).length,
    Jigsaw: members.filter(m => m.systems.includes('Jigsaw')).length,
  },
};

console.log('\n=== Summary ===');
console.log(JSON.stringify(summary, null, 2));

// ── 13. Write output ──
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'members.json'), JSON.stringify({ members, summary }, null, 2));
console.log(`\nWrote ${members.length} members to public/data/members.json`);

// Find Ahmad in output
const ahmad = members.find(m => m.email === ahmadEmail);
if (ahmad) {
  console.log(`\nAhmad Al-Rashid: ${ahmad.id}, Segment: ${ahmad.segment}, At-Risk: ${ahmad.atRisk} [${ahmad.atRiskChannels}]`);
}
