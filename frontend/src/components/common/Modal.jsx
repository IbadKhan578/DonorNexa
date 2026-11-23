import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-[480px]'
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="dim p-4" onClick={onClose}>
      <div
        className={`dlg ${maxWidth} w-full`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl leading-7 font-semibold text-[#1B1A18]">{title}</h2>
            {subtitle && (
              <p className="text-sm text-[#524E47] mt-1">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-[#6F6A61] hover:text-[#1B1A18] p-1 rounded-md transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}
