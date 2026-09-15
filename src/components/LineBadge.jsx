import React from 'react';
import { LINES_DATA } from '../data/linesData';

export default function LineBadge({ lineId, lineName, size = 'normal' }) {
  let meta = null;
  if (lineId) {
    meta = LINES_DATA.find((l) => l.id === Number(lineId));
  }
  if (!meta && lineName) {
    meta = LINES_DATA.find((l) => l.name.toLowerCase().includes(lineName.toLowerCase()));
  }

  const color = meta ? meta.color : '#009fe3';
  const name = meta ? meta.name : lineName || 'Tren';
  const icon = meta ? meta.icon : '🚆';

  return (
    <span
      className="line-pill"
      style={{
        backgroundColor: `${color}20`,
        border: `1px solid ${color}60`,
        color: '#ffffff',
        fontSize: size === 'small' ? '11px' : '12px',
        padding: size === 'small' ? '2px 8px' : '4px 10px',
      }}
    >
      <span style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>{icon}</span>
      <span style={{ fontWeight: 700 }}>{name}</span>
    </span>
  );
}
