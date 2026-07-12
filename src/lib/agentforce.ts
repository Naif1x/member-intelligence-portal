import type { Member, ChannelName } from '@/types';
import { SEGMENT_ACTIONS } from '@/types';
import { formatCurrency } from './data';

const CHANNEL_SHORT_LABEL: Record<ChannelName, string> = { golf: 'Golf', retail: 'Retail', food: 'F&B' };

function labelChannels(channels: ChannelName[]): string {
  return channels.map((c) => CHANNEL_SHORT_LABEL[c]).join(', ');
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

const GENERAL_RESPONSES = [
  "Based on our D360 Data Graph, I can see patterns across Golf, Retail, and F&B channels. What specific area would you like me to explore?",
  "I've analyzed the complete customer portfolio. Our Champion segment drives a large share of total revenue. Would you like me to identify growth opportunities?",
  "Looking at cross-channel engagement data, I notice several customers with a 'Big Spender at Risk' segment. Should I generate a retention campaign brief?",
];

function getAtRiskChannels(m: Member): ChannelName[] {
  const channels: ChannelName[] = [];
  if (m.golf_segment === 'Big Spender at Risk') channels.push('golf');
  if (m.retail_segment === 'Big Spender at Risk') channels.push('retail');
  if (m.food_segment === 'Big Spender at Risk') channels.push('food');
  return channels;
}

// Shared with both the canned "recommend next actions" chat reply and the
// per-recommendation buttons on the Customer 360 page, so the two surfaces
// never drift apart.
export function getNextBestActions(member: Member): string[] {
  const atRiskChannels = getAtRiskChannels(member);
  const actions: string[] = [];
  if (member.flagged) actions.push(`Re-engage in ${labelChannels(atRiskChannels) || 'their core channel'} with a personalized offer`);
  if (member.golf.score > 0 && member.retail.score === 0) actions.push('Cross-sell retail products during next golf visit');
  if (member.retail.score > 0 && member.food.score === 0) actions.push('Introduce F&B experience with a complimentary appetizer');
  if (actions.length === 0) actions.push('Send loyalty milestone recognition', 'Invite to exclusive customer event');
  return actions;
}

// Invisible-to-the-user context prefix injected into the first message of a
// chat session opened while a customer's profile is in view, so "tell me
// about this customer" actually resolves to someone instead of nothing —
// Agentforce only ever sees what's in the message text, not the page you're on.
export function buildMemberContext(member: Member): string {
  const atRiskChannels = getAtRiskChannels(member);
  const channelParts: string[] = [];
  if (member.golf.score > 0) channelParts.push(`Golf: ${member.golf_segment} (${formatCurrency(member.golf.spend)})`);
  if (member.retail.score > 0) channelParts.push(`Retail: ${member.retail_segment} (${formatCurrency(member.retail.spend)})`);
  if (member.food.score > 0) channelParts.push(`F&B: ${member.food_segment} (${formatCurrency(member.food.spend)})`);

  return `[Context: the user is viewing this customer's profile in the portal — ${member.name}, overall segment "${member.general_segment}", total spend ${formatCurrency(member.total_spend)}${member.flagged ? `, flagged Big Spender at Risk in ${labelChannels(atRiskChannels) || 'a channel'}` : ''}.${channelParts.length ? ` Channel detail — ${channelParts.join('; ')}.` : ''} Treat this customer as the subject of the user's question unless they clearly ask about someone or something else.]`;
}

export function generateAgentResponse(input: string, member?: Member | null): string {
  const lower = input.toLowerCase();

  if (member) {
    const name = member.name;
    const firstName = name.split(/\s+/)[0];
    const atRiskChannels = getAtRiskChannels(member);

    if (lower.includes('win-back') || lower.includes('win back')) {
      const channelList = labelChannels(atRiskChannels) || 'their overall profile';
      const strongChannels = (['golf', 'retail', 'food'] as ChannelName[]).filter(
        (c) => member[c].score > 0 && !atRiskChannels.includes(c)
      );
      return `Win-Back Strategy for ${name}:\n\nDeclining recency in ${channelList}, while remaining active in ${labelChannels(strongChannels) || 'other channels'}. This is a high-value customer disengaging from one channel — not the whole relationship.\n\n1. Send a personalized offer targeting the declining channel specifically\n2. Time the outreach within 14 days to catch them before full churn\n3. Reference their activity in other channels to reinforce the relationship\n\nShall I draft the outreach message?`;
    }

    if (lower.includes('cross-sell') || lower.includes('cross sell')) {
      const spends: [string, number][] = [['Golf', member.golf.spend], ['Retail', member.retail.spend], ['F&B', member.food.spend]];
      const top = spends.reduce((a, b) => (b[1] > a[1] ? b : a));
      const pct = member.total_spend > 0 ? Math.round((top[1] / member.total_spend) * 100) : 0;
      const others = spends.filter(([label]) => label !== top[0]);
      return `Cross-Sell Analysis for ${name}:\n\n${pct}% of total spend (${formatCurrency(top[1])}) is concentrated in ${top[0]}. ${others.map(([l]) => l).join(' and ')} ${others.length > 1 ? 'are' : 'is'} underdeveloped by comparison.\n\nRecommended: introduce ${name.split(/\s+/)[0]} to ${others[0]?.[0] || 'another channel'} with a low-friction first offer — a bundled experience often converts better than a standalone discount.`;
    }

    if (lower.includes('deep analysis') || lower.includes('deep rfm') || lower.includes('deep dive')) {
      const channelEntries: [string, number, string][] = [
        ['Golf', member.golf.score, member.golf_segment],
        ['Retail', member.retail.score, member.retail_segment],
        ['F&B', member.food.score, member.food_segment],
      ];
      const active = channelEntries.filter(([, s]) => s > 0);
      const lowest = active.length ? active.reduce((a, b) => (b[1] < a[1] ? b : a)) : null;
      if (!lowest) {
        return `Deep Analysis for ${name}:\n\nNo active channel engagement found — their overall standing is "${member.general_segment}". Verify identity resolution for this profile before acting on it.`;
      }
      return `Deep Analysis for ${name}:\n\nTheir overall standing is "${member.general_segment}", but channel-level standing varies — ${lowest[0]} sits at "${lowest[2]}", the weakest of their active channels. A healthy blended segment can hide channel-specific decline.\n\nRecommendation: track ${lowest[0]} engagement independently rather than relying on the overall segment alone for this customer.`;
    }

    if (lower.includes('campaign brief') || lower.includes('campaign for')) {
      return `Campaign Brief — ${member.general_segment} segment:\n\nCustomer: ${name}\nSegment: ${member.general_segment}\nTotal Spend: ${formatCurrency(member.total_spend)}\n\nSuggested approach: ${member.flagged ? 'prioritize retention — this customer shows risk signals despite historical value.' : 'reinforce loyalty with recognition rather than discounting — their engagement is currently healthy.'}`;
    }

    if (lower.includes('risk') || lower.includes('churn') || lower.includes('retain')) {
      if (member.flagged) {
        const channelList = labelChannels(atRiskChannels) || 'their general profile';
        return `${name} is flagged at-risk (${channelList}). This reflects declining recency with sustained high spend — a "Big Spender at Risk" pattern. I recommend a personalized re-engagement offer: a complimentary ${atRiskChannels[0] === 'golf' ? 'tee time with cart' : atRiskChannels[0] === 'food' ? 'dining experience' : 'in-store event'} to bring them back within 14 days.`;
      }
      return `${name} is currently not flagged. Their engagement is healthy across active channels. I'd recommend a loyalty recognition touchpoint to reinforce their positive behavior.`;
    }

    if (lower.includes('rfm') || lower.includes('score') || lower.includes('segment')) {
      const channelCount = [member.golf, member.retail, member.food].filter((c) => c.score > 0).length;
      const standing: string[] = [];
      if (member.golf.score > 0) standing.push(`Golf "${member.golf_segment}"`);
      if (member.retail.score > 0) standing.push(`Retail "${member.retail_segment}"`);
      if (member.food.score > 0) standing.push(`F&B "${member.food_segment}"`);
      return `${name} is in the "${member.general_segment}" segment with ${formatCurrency(member.total_spend)} total spend across ${channelCount} channel${channelCount === 1 ? '' : 's'}.${standing.length ? `\n\nChannel standing: ${standing.join(', ')}.` : ''}`;
    }

    if (lower.includes('recommend') || lower.includes('next best') || lower.includes('action')) {
      const actions = getNextBestActions(member);
      return `Next Best Actions for ${name}:\n${actions.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\nShall I create a Salesforce Flow to automate any of these?`;
    }

    if (lower.includes('spend') || lower.includes('value') || lower.includes('revenue') || lower.includes('monetary')) {
      const parts: string[] = [];
      if (member.golf.score > 0) parts.push(`Golf: ${formatCurrency(member.golf.spend)}`);
      if (member.retail.score > 0) parts.push(`Retail: ${formatCurrency(member.retail.spend)}`);
      if (member.food.score > 0) parts.push(`F&B: ${formatCurrency(member.food.spend)}`);
      const spends: [ChannelName, number][] = [['golf', member.golf.spend], ['retail', member.retail.spend], ['food', member.food.spend]];
      const top = spends.reduce((a, b) => (b[1] > a[1] ? b : a));
      return `${firstName}'s spending breakdown:\n${parts.join('\n')}\nTotal Spend: ${formatCurrency(member.total_spend)}\n\nTheir highest-value channel is ${top[0] === 'golf' ? 'Golf' : top[0] === 'retail' ? 'Retail' : 'F&B'}.`;
    }

    return `I have ${name}'s full D360 profile loaded. They're a "${member.general_segment}" with ${formatCurrency(member.total_spend)} total spend${member.flagged ? `, flagged at-risk in ${labelChannels(atRiskChannels) || 'their profile'}` : ''}. Ask me about their segment profile, spending patterns, risk analysis, or next best actions.`;
  }

  const campaignMatch = input.match(/campaign brief for the "([^"]+)" segment \((\d+) customers?, (SAR [\d,]+) total spend\)/i);
  if (campaignMatch) {
    const [, segmentName, count, totalSpend] = campaignMatch;
    const action = SEGMENT_ACTIONS[segmentName] || 'Review this segment individually — no standard playbook matches its profile.';
    return `Campaign Brief — ${segmentName} segment:\n\nCustomers: ${count}\nTotal Spend: ${totalSpend}\n\nRecommended approach: ${action}`;
  }

  if (lower.includes('at risk') || lower.includes('at-risk') || lower.includes('churn')) {
    return "Our at-risk analysis flags customers with high monetary value but declining recency in any channel — the 'Big Spender at Risk' segment. These customers spend well but are disengaging. Targeted re-engagement within 30 days typically recovers a meaningful share of at-risk customers.";
  }

  if (lower.includes('segment') || lower.includes('distribution')) {
    return "The customer base segments into groups based on the D360 RFM analysis: Champion, Loyal, Almost Loyal, Occasional, Big Spender at Risk, Almost Lost, and Lost. Champions are your core — protect them. Big Spenders at Risk need immediate attention.";
  }

  if (lower.includes('help') || lower.includes('what can')) {
    return "I'm your Agentforce-powered D360 assistant. I can:\n1. Analyze any customer's segment profile\n2. Generate at-risk alerts and retention strategies\n3. Recommend Next Best Actions per customer\n4. Explain spending patterns across Golf, Retail, and F&B\n5. Create engagement campaign briefs\n\nSelect a customer for personalized insights, or ask me about the overall portfolio.";
  }

  return GENERAL_RESPONSES[Math.floor(Math.random() * GENERAL_RESPONSES.length)];
}
