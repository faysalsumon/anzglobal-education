export function AnimatedBooksIcon({ className = "" }: { className?: string }) {
  const uniqueId = "anz-books-icon";
  
  return (
    <div className={`relative ${className}`} style={{ width: '24px', height: '24px' }}>
      <style>{`
        @keyframes ${uniqueId}-open {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-2px);
          }
        }
        
        @keyframes ${uniqueId}-close {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(2px);
          }
        }
        
        .${uniqueId}-bar {
          position: absolute;
          left: 0;
          right: 0;
          height: 3px;
          background-color: currentColor;
          border-radius: 2px;
        }
        
        .${uniqueId}-bar-1 {
          top: 2px;
          animation: ${uniqueId}-open 2s ease-in-out infinite;
        }
        
        .${uniqueId}-bar-2 {
          top: 50%;
          transform: translateY(-50%);
        }
        
        .${uniqueId}-bar-3 {
          bottom: 2px;
          animation: ${uniqueId}-close 2s ease-in-out infinite;
        }
      `}</style>
      
      <div className={`${uniqueId}-bar ${uniqueId}-bar-1`} />
      <div className={`${uniqueId}-bar ${uniqueId}-bar-2`} />
      <div className={`${uniqueId}-bar ${uniqueId}-bar-3`} />
    </div>
  );
}
