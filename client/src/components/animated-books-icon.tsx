export function AnimatedBooksIcon({ className = "" }: { className?: string }) {
  const uniqueId = "anz-books-icon";
  
  return (
    <svg 
      className={className}
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>{`
        @keyframes ${uniqueId}-ribbon-open {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-1.5px);
          }
        }
        
        @keyframes ${uniqueId}-ribbon-close {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(1.5px);
          }
        }
        
        @keyframes ${uniqueId}-pencil-rotate {
          0%, 100% {
            transform: rotate(-45deg) translateX(0px);
          }
          50% {
            transform: rotate(-45deg) translateX(0.5px);
          }
        }
        
        .${uniqueId}-ribbon-top {
          animation: ${uniqueId}-ribbon-open 2s ease-in-out infinite;
          transform-origin: center;
        }
        
        .${uniqueId}-ribbon-bottom {
          animation: ${uniqueId}-ribbon-close 2s ease-in-out infinite;
          transform-origin: center;
        }
        
        .${uniqueId}-pencil {
          animation: ${uniqueId}-pencil-rotate 2s ease-in-out infinite;
          transform-origin: center;
        }
      `}</style>
      
      {/* Top ribbon with notch */}
      <g className={`${uniqueId}-ribbon-top`}>
        <path d="M 2 4 L 22 4 L 22 8 L 13 8 L 12 10 L 11 8 L 2 8 Z" fill="currentColor" opacity="0.95"/>
      </g>
      
      {/* Middle diagonal pencil - positioned, then animated */}
      <g transform="translate(12, 12)">
        <g className={`${uniqueId}-pencil`}>
          <rect x="-5" y="-1" width="10" height="2" rx="0.5" fill="currentColor" opacity="0.9"/>
          {/* Pencil tip */}
          <path d="M -5 0 L -7 -1 L -7 1 Z" fill="currentColor" opacity="0.7"/>
        </g>
      </g>
      
      {/* Bottom ribbon */}
      <g className={`${uniqueId}-ribbon-bottom`}>
        <rect x="2" y="16" width="20" height="4" rx="1" fill="currentColor" opacity="0.95"/>
      </g>
    </svg>
  );
}
