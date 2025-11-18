import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    console.log('🎯 BackToTop mounted!');
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    
    // Check initial scroll position
    toggleVisibility();

    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    console.log('🔝 Scrolling to top!');
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  console.log('🔄 BackToTop rendering, isVisible:', isVisible);

  return (
    <button
      onClick={scrollToTop}
      className="fixed transition-opacity duration-300"
      style={{
        bottom: '32px',
        right: '32px',
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        backgroundColor: '#FF5000',
        color: '#FFFFFF',
        border: 'none',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
      aria-label="Back to top"
      data-testid="button-back-to-top"
    >
      <ArrowUp style={{ width: '24px', height: '24px' }} strokeWidth={2.5} />
    </button>
  );
}
