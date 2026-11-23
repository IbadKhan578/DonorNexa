import React from 'react';

export default function BloodChip({ group, size = 'md', className = '' }) {
  const isSm = size === 'sm';
  return (
    <span
      className={`chip ${isSm ? 'sm' : ''} ${className}`}
      title={`Blood Group ${group}`}
    >
      {group}
    </span>
  );
}
