import type { Member } from '@/types';
import { formatCurrency } from './data';

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

const GENERAL_RESPONSES = [
  "Based on our D360 analysis, I can see patterns across Golf, Retail, and F&B channels. What specific area would you like me to explore?",
  "I've analyzed the complete member portfolio. Our Champions segment drives 45% of total revenue. Would you like me to identify growth opportunities?",
  "Looking at cross-channel engagement data, I notice several members with declining activity patterns. Should I generate a retention campaign brief?",
];

export function generateAgentResponse(input: string, member?: Member | null): string {
  const lower = input.toLowerCase();

  if (member) {
    const name = `${member.firstName} ${member.lastName}`;

    if (lower.includes('risk') || lower.includes('churn') || lower.includes('retain')) {
      if (member.atRisk) {
        return `${name} is flagged at-risk in ${member.atRiskChannels.join(', ')}. Their ${member.atRiskChannels[0]} recency has dropped while maintaining high spend — classic "Big Spender at Risk" pattern. I recommend a personalized re-engagement offer: a complimentary ${member.atRiskChannels[0] === 'golf' ? 'tee time with cart' : 'dining experience'} to bring them back within 14 days.`;
      }
      return `${name} is currently not flagged at-risk. Their engagement is healthy across active channels. I'd recommend a loyalty recognition touchpoint to reinforce their positive behavior.`;
    }

    if (lower.includes('rfm') || lower.includes('score') || lower.includes('segment')) {
      return `${name}'s General RFM is ${member.general.rfmScore} (R${member.general.r} F${member.general.f} M${member.general.m}), placing them in the "${member.segment}" segment with ${formatCurrency(member.general.totalMonetary)} lifetime value across ${[member.channels.golf, member.channels.retail, member.channels.food].filter(Boolean).length} channels.`;
    }

    if (lower.includes('recommend') || lower.includes('next best') || lower.includes('action')) {
      const actions = [];
      if (member.atRisk) actions.push(`Re-engage in ${member.atRiskChannels.join(', ')} with a personalized offer`);
      if (member.channels.golf && !member.channels.retail) actions.push('Cross-sell retail products during next golf visit');
      if (member.channels.retail && !member.channels.food) actions.push('Introduce F&B experience with a complimentary appetizer');
      if (!member.autoRenew && member.subscriptionStatus === 'Active') actions.push('Initiate auto-renewal conversation before subscription expires');
      if (actions.length === 0) actions.push('Send loyalty milestone recognition', 'Invite to exclusive member event');
      return `Next Best Actions for ${name}:\n${actions.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\nShall I create a Salesforce Flow to automate any of these?`;
    }

    if (lower.includes('spend') || lower.includes('value') || lower.includes('revenue') || lower.includes('monetary')) {
      const parts = [];
      if (member.channels.golf) parts.push(`Golf: ${formatCurrency(member.channels.golf.monetary)}`);
      if (member.channels.retail) parts.push(`Retail: ${formatCurrency(member.channels.retail.monetary)}`);
      if (member.channels.food) parts.push(`F&B: ${formatCurrency(member.channels.food.monetary)}`);
      return `${name}'s spending breakdown:\n${parts.join('\n')}\nTotal Lifetime Value: ${formatCurrency(member.general.totalMonetary)}\n\nTheir highest-value channel is ${member.channels.golf && member.channels.retail && member.channels.food ? (member.channels.golf.monetary >= member.channels.retail.monetary && member.channels.golf.monetary >= member.channels.food.monetary ? 'Golf' : member.channels.retail.monetary >= member.channels.food.monetary ? 'Retail' : 'F&B') : 'their primary channel'}.`;
    }

    return `I have ${name}'s full D360 profile loaded. They're a "${member.segment}" with ${formatCurrency(member.general.totalMonetary)} total value${member.atRisk ? `, flagged at-risk in ${member.atRiskChannels.join(', ')}` : ''}. Ask me about their RFM scores, spending patterns, risk analysis, or next best actions.`;
  }

  if (lower.includes('at risk') || lower.includes('at-risk') || lower.includes('churn')) {
    return "Our at-risk analysis identifies members with high monetary value (M>=3) but declining recency (R<=2) in any channel. These are your 'Big Spenders at Risk' — they spend well but are disengaging. Targeted re-engagement within 30 days typically recovers 40% of at-risk members.";
  }

  if (lower.includes('segment') || lower.includes('distribution')) {
    return "The member base segments into 8 groups based on RFM analysis. Champions (R3+F3+M3+) are your core — protect them. Big Spenders at Risk need immediate attention. Almost Loyal members are your best conversion opportunity with targeted engagement.";
  }

  if (lower.includes('help') || lower.includes('what can')) {
    return "I'm your Agentforce-powered D360 assistant. I can:\n1. Analyze any member's RFM profile and segment\n2. Generate at-risk alerts and retention strategies\n3. Recommend Next Best Actions per member\n4. Explain spending patterns across Golf, Retail, and F&B\n5. Create engagement campaign briefs\n\nSelect a member for personalized insights, or ask me about the overall portfolio.";
  }

  return GENERAL_RESPONSES[Math.floor(Math.random() * GENERAL_RESPONSES.length)];
}
