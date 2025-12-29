import React from 'react';

const HamsterFaceIcon = ({ width = 24, height = 24 }) => (
  <svg width={width} height={height} viewBox="0 0 120 110" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Ears */}
    <g transform="translate(25, 25)">
        <ellipse cx="0" cy="0" rx="12" ry="14" fill="#8D6E63" transform="rotate(-20)" />
        <ellipse cx="0" cy="0" rx="7" ry="9" fill="#E6B0AA" transform="rotate(-20)" />
    </g>
    <g transform="translate(95, 25)">
        <ellipse cx="0" cy="0" rx="12" ry="14" fill="#8D6E63" transform="rotate(20)" />
        <ellipse cx="0" cy="0" rx="7" ry="9" fill="#E6B0AA" transform="rotate(20)" />
    </g>

    {/* Head */}
    <ellipse cx="60" cy="60" rx="50" ry="45" fill="#F0C987" />
    
    {/* Stripe */}
    <path d="M52 20 Q 60 12 68 20 L 66 45 Q 60 50 54 45 Z" fill="#8D6E63" />

    {/* Eyes */}
    <circle cx="42" cy="55" r="4" fill="#2C3E50" />
    <circle cx="78" cy="55" r="4" fill="#2C3E50" />

    {/* Glasses */}
    <circle cx="42" cy="55" r="11" stroke="#333" strokeWidth="2" fill="none" />
    <circle cx="78" cy="55" r="11" stroke="#333" strokeWidth="2" fill="none" />
    <line x1="53" y1="55" x2="67" y2="55" stroke="#333" strokeWidth="2" />

    {/* Nose */}
    <path d="M58 64 L 62 64 L 60 67 Z" fill="#E6B0AA" />

    {/* Mouth (W shape) */}
    <path d="M55 70 Q 57.5 73 60 70 Q 62.5 73 65 70" stroke="#8D6E63" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default HamsterFaceIcon;
