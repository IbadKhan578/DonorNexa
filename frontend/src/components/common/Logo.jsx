import React from 'react';
import { Link } from 'react-router-dom';

export default function Logo({ size = 'md', linkTo = '/' }) {
  const isSm = size === 'sm';
  return (
    <Link to={linkTo} className="inline-flex items-center gap-2 font-serif font-semibold text-[22px] leading-6 tracking-tight text-[#1B1A18] hover:opacity-90">
      <svg width={isSm ? "20" : "24"} height={isSm ? "24" : "28"} viewBox="0 0 28 32" className="flex-shrink-0">
        <path d="M14 31a11 11 0 0 0 11-11c0-3-1.6-5.8-4.4-8.2C17.8 9.4 15.4 6.2 14 1c-1.4 5.2-3.8 8.4-6.6 10.8C4.6 14.2 3 17 3 20a11 11 0 0 0 11 11z" fill="#B3202A"/>
        <path d="M10 24v-8l8 8v-8" stroke="#FFFFFF" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span>DonorNexa</span>
    </Link>
  );
}
