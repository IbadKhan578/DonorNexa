import React from 'react';

export default function StatusBadge({
  status = 'neutral',
  solid = false,
  children,
  className = ''
}) {
  const normStatus = status.toLowerCase();
  let badgeClass = 'neutral';

  if (normStatus === 'critical') badgeClass = 'critical';
  else if (normStatus === 'urgent') badgeClass = 'urgent';
  else if (normStatus === 'normal') badgeClass = 'normal';
  else if (['success', 'verified', 'fulfilled', 'donated', 'accepted', 'active', 'completed'].includes(normStatus)) {
    badgeClass = 'success';
  } else if (['error', 'rejected', 'blocked', 'cancelled', 'expired'].includes(normStatus)) {
    badgeClass = 'error';
  } else if (['info', 'open', 'notified'].includes(normStatus)) {
    badgeClass = 'info';
  } else if (['pending', 'no_response', 'declined', 'neutral'].includes(normStatus)) {
    badgeClass = 'neutral';
  }

  const label = children || (status.charAt(0).toUpperCase() + status.slice(1));

  return (
    <span className={`badge ${badgeClass} ${solid ? 'solid' : ''} ${className}`}>
      <i></i>
      {label}
    </span>
  );
}
