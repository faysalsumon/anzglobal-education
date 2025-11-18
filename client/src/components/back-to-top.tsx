import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    console.log('🚀 BackToTop component mounted!');
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);

    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    console.log('🔝 Back to top button clicked!');
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  console.log('✅ BackToTop rendering...');

  // TEMPORARILY ALWAYS VISIBLE FOR TESTING - SUPER OBVIOUS STYLING
  return (
    <button
      onClick={scrollToTop}
      className="fixed z-[99999]"
      style={{ 
        bottom: '32px',
        right: '32px',
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        backgroundColor: '#FF0000',
        color: '#FFFFFF',
        border: '4px solid #000000',
        boxShadow: '0 0 20px rgba(0,0,0,0.5)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        fontWeight: 'bold'
      }}
      aria-label="Back to top"
      data-testid="button-back-to-top"
    >
      ↑
    </button>
  );
}
