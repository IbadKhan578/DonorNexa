import React, { useState, useEffect } from 'react';

export default function CountdownTimer({ targetDate, isCritical = false }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      if (!targetDate) return;
      const difference = new Date(targetDate).getTime() - new Date().getTime();

      if (difference <= 0) {
        setTimeLeft('00:00:00');
        setIsExpired(true);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      const pad = (n) => String(n).padStart(2, '0');

      if (days > 0) {
        setTimeLeft(`${days}d ${pad(hours)}:${pad(minutes)}`);
      } else {
        setTimeLeft(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <code
      className={`text-lg font-mono tracking-tight font-medium ${
        isExpired
          ? 'text-[#6F6A61]'
          : isCritical
          ? 'text-[#B3202A]'
          : 'text-[#1B1A18]'
      }`}
    >
      {isExpired ? 'Expired' : timeLeft}
    </code>
  );
}
