import React from 'react';
import { Lock, Phone } from 'lucide-react';

export default function MaskedPhone({
  phoneMasked,
  phoneRevealed,
  isRevealed = false
}) {
  if (isRevealed && phoneRevealed) {
    return (
      <span className="mask open" title="Contact revealed upon acceptance">
        <Phone className="w-3.5 h-3.5" />
        <span>{phoneRevealed}</span>
      </span>
    );
  }

  return (
    <span className="mask" title="Phone hidden until donor accepts">
      <Lock className="w-3.5 h-3.5 text-[#6F6A61]" />
      <span>{phoneMasked || '03••-•••••••'}</span>
    </span>
  );
}
