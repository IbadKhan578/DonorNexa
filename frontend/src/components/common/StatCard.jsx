import React from 'react';

export default function StatCard({ label, value, subtitle }) {
  return (
    <div className="stat">
      <small>{label}</small>
      <b>{value}</b>
      <span>{subtitle}</span>
    </div>
  );
}
