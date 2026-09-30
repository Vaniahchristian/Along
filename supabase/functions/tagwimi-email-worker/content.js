const origin = 'https://tagwimi.com';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

export function emailContent(item) {
  const p = item.payload || {};
  const title = String(p.title || 'Your plan');
  const details = [title, [p.date, p.time].filter(Boolean).join(' · '), p.location].filter(Boolean);
  const planUrl = item.plan_id ? `${origin}/p/${item.plan_id}` : `${origin}/app/explore`;
  let subject, heading, copy, action = 'View plan', href = planUrl;
  switch (item.event_type) {
    case 'welcome':
      subject = 'Welcome to Tagwimi'; heading = `Welcome to Tagwimi, ${p.name || 'friend'}!`;
      copy = 'Find a plan you would enjoy, or finish your profile so people can get to know you.';
      action = 'Explore plans'; href = `${origin}/app/explore`; break;
    case 'join_request':
      subject = `New request for ${title}`; heading = `${p.requester || 'Someone'} wants to join your plan`;
      copy = 'Review their request and decide whether to welcome them.';
      action = 'Review request'; href = `${origin}/app/plans/${item.plan_id}`; break;
    case 'request_accepted':
      subject = `You’re in: ${title}`; heading = 'Your request was accepted';
      copy = 'You can now say hello and coordinate with the group.';
      action = 'Open group chat'; href = `${origin}/app/chat/${item.plan_id}`; break;
    case 'request_declined':
      subject = `Update on ${title}`; heading = 'Your join request was declined';
      copy = 'There are more plans and people to discover.';
      action = 'Explore other plans'; href = `${origin}/app/explore`; break;
    case 'plan_reminder':
      subject = `Coming up: ${title}`; heading = 'Your plan is coming up';
      copy = 'Check the group chat for the latest details before heading out.';
      action = 'Open group chat'; href = `${origin}/app/chat/${item.plan_id}`; break;
    case 'plan_changed': {
      subject = `Details changed: ${title}`; heading = 'Your plan details changed';
      const labels = { date: 'Date', time: 'Time', location: 'Location', cost: 'Cost' };
      const lines = Object.entries(p.changes || {}).filter(([, v]) => Array.isArray(v));
      copy = lines.map(([key, value]) => `${labels[key]}: ${value[0] || 'Not specified'} → ${value[1] || 'Not specified'}`).join('\n');
      if (!copy) copy = 'Please review the latest details.';
      break;
    }
    case 'plan_cancelled':
      subject = `Cancelled: ${title}`; heading = 'This plan was cancelled';
      copy = p.reason ? `Reason: ${p.reason}` : 'The plan will not take place.';
      action = 'Explore other plans'; href = `${origin}/app/explore`; break;
    case 'participant_left':
      subject = `A spot opened: ${title}`; heading = `${p.participant || 'A participant'} left your plan`;
      copy = 'You have an available spot again.'; break;
    case 'admin_broadcast':
      subject = String(p.title || 'Update from Tagwimi'); heading = subject;
      copy = String(p.body || '');
      action = 'Open Tagwimi'; href = `${origin}/app/notifications`; break;
    default: return null;
  }
  if (p.cost && !['welcome', 'request_declined', 'plan_cancelled', 'admin_broadcast'].includes(item.event_type)) details.push(`Cost: ${p.cost}`);
  const showDetails = !['welcome', 'admin_broadcast'].includes(item.event_type);
  const plain = `${heading}\n\n${copy}\n\n${showDetails ? details.join('\n') + '\n\n' : ''}${action}: ${href}\n\nTagwimi`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#10291d"><p style="color:#17763a;font-weight:800">Tagwimi</p><h1 style="font-size:26px">${escapeHtml(heading)}</h1><p style="white-space:pre-line;line-height:1.6">${escapeHtml(copy)}</p>${showDetails ? `<div style="background:#eef5ed;border-radius:12px;padding:16px;line-height:1.7">${details.map(escapeHtml).join('<br>')}</div>` : ''}<p style="margin:28px 0"><a href="${href}" style="background:#176c36;color:white;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">${escapeHtml(action)}</a></p><p style="font-size:12px;color:#637569">You received this because of your Tagwimi account or plan.</p></div>`;
  return { subject, text: plain, html };
}
