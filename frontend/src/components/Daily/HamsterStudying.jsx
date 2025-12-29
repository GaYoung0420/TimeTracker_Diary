import React from 'react';
import './HamsterStudying.css';

const HamsterStudying = ({ isStudying, progress }) => {
  let phase = 'start';
  if (progress > 30) phase = 'middle';
  if (progress > 70) phase = 'end';

  return (
    <div className={`hamster-container ${isStudying ? 'studying' : ''} ${phase}`}>
      <svg width="300" height="200" viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        
        {/* --- Background Elements --- */}
        
        {/* Stack of Books (Left) */}
        <g transform="translate(40, 130)">
            {/* Bottom Book (Blue/Grey) */}
            <path d="M0 20 L50 20 L60 30 L10 30 Z" fill="#5D6D7E" />
            <rect x="0" y="30" width="60" height="10" fill="#34495E" />
            <path d="M0 30 L10 20" stroke="#2C3E50" strokeWidth="0.5"/>
            
            {/* Top Book (Red/Brown) */}
            <path d="M5 5 L55 5 L65 15 L15 15 Z" fill="#C0392B" />
            <rect x="5" y="15" width="60" height="10" fill="#922B21" />
            <path d="M5 15 L15 5" stroke="#641E16" strokeWidth="0.5"/>
        </g>

        {/* Loose Papers (Left Front) */}
        <g transform="translate(30, 160) rotate(-10)">
            <rect x="0" y="0" width="40" height="50" fill="#FDFEFE" stroke="#BDC3C7" />
            <line x1="5" y1="10" x2="35" y2="10" stroke="#BDC3C7" strokeWidth="2" />
            <line x1="5" y1="20" x2="35" y2="20" stroke="#BDC3C7" strokeWidth="2" />
            <line x1="5" y1="30" x2="35" y2="30" stroke="#BDC3C7" strokeWidth="2" />
        </g>
        <g transform="translate(50, 165) rotate(5)">
            <rect x="0" y="0" width="40" height="50" fill="#FDFEFE" stroke="#BDC3C7" />
            <line x1="5" y1="10" x2="35" y2="10" stroke="#BDC3C7" strokeWidth="2" />
            <line x1="5" y1="20" x2="35" y2="20" stroke="#BDC3C7" strokeWidth="2" />
        </g>

        {/* Closed Book (Right Front) */}
        <g transform="translate(200, 160) rotate(5)">
             <path d="M0 0 L60 0 L70 10 L10 10 Z" fill="#8D6E63" />
             <rect x="0" y="10" width="70" height="15" fill="#6D4C41" />
             <rect x="2" y="12" width="66" height="11" fill="#FDFEFE" /> {/* Pages */}
        </g>

        {/* Coffee Mug (Right) */}
        <g transform="translate(240, 130)">
            <path d="M5 0 L35 0 C 35 0, 40 30, 20 30 C 0 30, 5 0, 5 0 Z" fill="#FDFEFE" stroke="#BDC3C7" strokeWidth="1"/>
            <ellipse cx="20" cy="0" rx="15" ry="5" fill="#6F4E37" /> {/* Coffee */}
            <path d="M35 5 C 45 5, 45 20, 35 20" stroke="#FDFEFE" strokeWidth="3" fill="none" /> {/* Handle */}
            
            {/* Steam */}
            <g className={isStudying ? "coffee-steam" : "hidden"}>
                <path d="M15 -10 Q 20 -15 15 -20" stroke="#BDC3C7" strokeWidth="2" fill="none" opacity="0.6" />
                <path d="M25 -8 Q 30 -13 25 -18" stroke="#BDC3C7" strokeWidth="2" fill="none" opacity="0.6" style={{animationDelay: '0.5s'}} />
            </g>
        </g>


        {/* --- Hamster --- */}
        <g className="hamster-head" transform-origin="150 100">
            
            {/* Body/Head Shape */}
            {/* Main body is a large rounded shape */}
            <ellipse cx="150" cy="110" rx="60" ry="55" fill="#F0C987" /> {/* Light Brown/Tan */}
            <path d="M100 130 Q 150 170 200 130" fill="#FFFFFF" /> {/* White bottom/belly area */}
            
            {/* Dark Stripe on Head */}
            <path d="M140 60 Q 150 50 160 60 L 158 90 Q 150 95 142 90 Z" fill="#8D6E63" />

            {/* Ears */}
            <g transform="translate(105, 60)">
                <ellipse cx="0" cy="0" rx="10" ry="12" fill="#8D6E63" transform="rotate(-20)" />
                <ellipse cx="0" cy="0" rx="6" ry="8" fill="#E6B0AA" transform="rotate(-20)" />
            </g>
            <g transform="translate(195, 60)">
                <ellipse cx="0" cy="0" rx="10" ry="12" fill="#8D6E63" transform="rotate(20)" />
                <ellipse cx="0" cy="0" rx="6" ry="8" fill="#E6B0AA" transform="rotate(20)" />
            </g>

            {/* Face */}
            <g className="hamster-face">
                {/* Eyes */}
                <g className="hamster-eyes">
                    <g className="hamster-blink" style={{transformOrigin: '130px 100px'}}>
                        <circle cx="130" cy="100" r="4" fill="#2C3E50" />
                    </g>
                    <g className="hamster-blink" style={{transformOrigin: '170px 100px'}}>
                        <circle cx="170" cy="100" r="4" fill="#2C3E50" />
                    </g>
                </g>

                {/* Eyebrows */}
                {isStudying ? (
                    <>
                        <path d="M125 90 L 135 95" stroke="#8D6E63" strokeWidth="2" strokeLinecap="round" />
                        <path d="M175 90 L 165 95" stroke="#8D6E63" strokeWidth="2" strokeLinecap="round" />
                    </>
                ) : (
                    <>
                        <path d="M125 90 L 135 90" stroke="#8D6E63" strokeWidth="2" strokeLinecap="round" />
                        <path d="M165 90 L 175 90" stroke="#8D6E63" strokeWidth="2" strokeLinecap="round" />
                    </>
                )}

                {/* Nose */}
                <path d="M148 108 L 152 108 L 150 112 Z" fill="#E6B0AA" />
                
                {/* Mouth */}
                {isStudying ? (
                    <path className="hamster-mouth" d="M144 114 Q 147 117 150 114 Q 153 117 156 114" stroke="#8D6E63" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                    <path d="M144 114 Q 147 117 150 114 Q 153 117 156 114" stroke="#8D6E63" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                )}

                {/* Glasses */}
                <g className="glasses">
                    <circle cx="130" cy="100" r="12" stroke="#333" strokeWidth="2" fill="none" />
                    <circle cx="170" cy="100" r="12" stroke="#333" strokeWidth="2" fill="none" />
                    <line x1="142" y1="100" x2="158" y2="100" stroke="#333" strokeWidth="2" />
                </g>

                {/* Sweat drops (for late stage) */}
                <g className="sweat-drops">
                    <path d="M165 70 Q 170 65 165 60" stroke="#87CEEB" strokeWidth="2" fill="#E0FFFF" />
                    <path d="M175 75 Q 180 70 175 65" stroke="#87CEEB" strokeWidth="2" fill="#E0FFFF" />
                </g>
            </g>

            {/* Paws */}
            <ellipse cx="125" cy={isStudying ? 145 : 160} rx="8" ry="6" fill="#F0C987" />
            <ellipse cx="175" cy={isStudying ? 145 : 160} rx="8" ry="6" fill="#F0C987" />
        </g>

        {/* Open Book (Front Center) - Only visible when studying */}
        <g transform="translate(110, 140)" style={{ opacity: isStudying ? 1 : 0, transition: 'opacity 0.3s' }}>
            {/* Left Page */}
            <path d="M0 20 Q 20 25 40 20 L 40 5 Q 20 10 0 5 Z" fill="#FDFEFE" stroke="#BDC3C7" strokeWidth="1" />
            {/* Right Page */}
            <path d="M40 20 Q 60 25 80 20 L 80 5 Q 60 10 40 5 Z" fill="#FDFEFE" stroke="#BDC3C7" strokeWidth="1" />
            
            {/* Flipping Page (Animated) */}
            <path className="flipping-page" d="M40 20 Q 60 25 80 20 L 80 5 Q 60 10 40 5 Z" fill="#FDFEFE" stroke="#BDC3C7" strokeWidth="1" />

            {/* Spine */}
            <line x1="40" y1="5" x2="40" y2="20" stroke="#BDC3C7" strokeWidth="1" />
            
            {/* Text Lines */}
            <line x1="5" y1="10" x2="35" y2="12" stroke="#BDC3C7" strokeWidth="1" />
            <line x1="5" y1="15" x2="35" y2="17" stroke="#BDC3C7" strokeWidth="1" />
            <line x1="45" y1="12" x2="75" y2="10" stroke="#BDC3C7" strokeWidth="1" />
            <line x1="45" y1="17" x2="75" y2="15" stroke="#BDC3C7" strokeWidth="1" />
        </g>

      </svg>
    </div>
  );
};

export default HamsterStudying;
