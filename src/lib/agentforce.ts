import type { Member, ChannelName } from '@/types';
import { formatCurrency } from './data';

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

const GENERAL_RESPONSES = [
  "Based on our D360 Data Graph, I can see patterns across Golf, Retail, and F&B channels. What specific area would you like me to explore?",
  "I've analyzed the complete member portfolio. Our Champion segment drives a large share of total revenue. Would you like me to identify growth opportunities?",
  "Looking at cross-channel engagement data, I notice several members with a 'Big Spender at Risk' segment. Should I generate a retention campaign brief?",
];

function getAtRiskChannels(m: Member): ChannelName[] {
  const channels: ChannelName[] = [];
  if (m.golf_segment === 'Big Spender at Risk') channels.push('golf');
  if (m.retail_segment === 'Big Spender at Risk') channels.push('retail');
  if (m.food_segment === 'Big Spender at Risk') channels.push('food');
  return channels;
}

export function generateAgentResponse(input: string, member?: Member | null): string {
  const lower = input.toLowerCase();

  if (member) {
    const name = member.name;
    const firstName = name.split(/\s+/)[0];
    const atRiskChannels = getAtRiskChannels(member);

    if (lower.includes('risk') || lower.includes('churn') || lower.includes('retain')) {
      if (member.flagged) {
        const channelList = atRiskChannels.length ? atRiskChannels.join(', ') : 'their general profile';
        return `${name} is flagged at-risk (${channelList}). This reflects declining recency with sustained high spend — a "Big Spender at Risk" pattern. I recommend a personalized re-engagement offer: a complimentary ${atRiskChannels[0] === 'golf' ? 'tee time with cart' : atRiskChannels[0] === 'food' ? 'dining experience' : 'in-store event'} to bring them back within 14 days.`;
      }
      return `${name} is currently not flagged. Their engagement is healthy across active channels. I'd recommend a loyalty recognition touchpoint to reinforce their positive behavior.`;
    }

    if (lower.includes('rfm') || lower.includes('score') || lower.includes('segment')) {
      const channelCount = [member.golf, member.retail, member.food].filter((c) => c.score > 0).length;
      return `${name}'s General RFM is ${member.general.score} (R${member.general.r} F${member.general.f} M${member.general.m}), placing them in the "${member.general_segment}" segment with ${formatCurrency(member.total_spend)} total spend across ${channelCount} channel${channelCount === 1 ? '' : 's'}.`;
    }

    if (lower.includes('recommend') || lower.includes('next best') || lower.includes('action')) {
      const actions: string[] = [];
      if (member.flagged) actions.push(`Re-engage in ${atRiskChannels.join(', ') || 'their core channel'} with a personalized offer`);
      if (member.golf.score > 0 && member.retail.score === 0) actions.push('Cross-sell retail products during next golf visit');
      if (member.retail.score > 0 && member.food.score === 0) actions.push('Introduce F&B experience with a complimentary appetizer');
      if (actions.length === 0) actions.push('Send loyalty milestone recognition', 'Invite to exclusive member event');
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

    return `I have ${name}'s full D360 profile loaded. They're a "${member.general_segment}" with ${formatCurrency(member.total_spend)} total spend${member.flagged ? `, flagged at-risk in ${atRiskChannels.join(', ') || 'their profile'}` : ''}. Ask me about their RFM scores, spending patterns, risk analysis, or next best actions.`;
  }

  if (lower.includes('at risk') || lower.includes('at-risk') || lower.includes('churn')) {
    return "Our at-risk analysis flags members with high monetary value but declining recency in any channel — the 'Big Spender at Risk' segment. These members spend well but are disengaging. Targeted re-engagement within 30 days typically recovers a meaningful share of at-risk members.";
  }

  if (lower.includes('segment') || lower.includes('distribution')) {
    return "The member base segments into groups based on the D360 RFM analysis: Champion, Loyal, Almost Loyal, Occasional, Big Spender at Risk, Almost Lost, and Lost. Champions are your core — protect them. Big Spenders at Risk need immediate attention.";
  }

  if (lower.includes('help') || lower.includes('what can')) {
    return "I'm your Agentforce-powered D360 assistant. I can:\n1. Analyze any member's RFM profile and segment\n2. Generate at-risk alerts and retention strategies\n3. Recommend Next Best Actions per member\n4. Explain spending patterns across Golf, Retail, and F&B\n5. Create engagement campaign briefs\n\nSelect a member for personalized insights, or ask me about the overall portfolio.";
  }

  return GENERAL_RESPONSES[Math.floor(Math.random() * GENERAL_RESPONSES.length)];
}
