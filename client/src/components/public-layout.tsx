import { ReactNode, useState, useEffect, lazy, Suspense } from "react";
import { ChatWidget } from "@/components/chat-widget";
import { PublicMobileNav } from "@/components/public-mobile-nav";
import { CourseMatchQuiz } from "@/components/course-match-quiz";
import { useAuth } from "@/hooks/useAuth";
const AdminChatWidget = lazy(() => import("@/components/admin-chat-widget").then(m => ({ default: m.AdminChatWidget })));

interface PublicLayoutProps {
  children: ReactNode;
  onStudentLoginClick?: () => void;
  onMatchClick?: () => void;
}

export function PublicLayout({ children, onStudentLoginClick: _onStudentLoginClick, onMatchClick }: PublicLayoutProps) {
  const { isStaff } = useAuth();
  const [quizOpen, setQuizOpen] = useState(false);

  useEffect(() => {
    const handleOpenQuiz = () => setQuizOpen(true);
    window.addEventListener("open-course-quiz", handleOpenQuiz);
    return () => window.removeEventListener("open-course-quiz", handleOpenQuiz);
  }, []);

  const handleMatchClick = () => {
    if (onMatchClick) {
      onMatchClick();
    } else {
      setQuizOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-16 md:pb-0">
        {children}
      </main>
      {isStaff ? (
        <Suspense fallback={null}><AdminChatWidget /></Suspense>
      ) : (
        <ChatWidget />
      )}
      <PublicMobileNav onMatchClick={handleMatchClick} />
      <CourseMatchQuiz open={quizOpen} onClose={() => setQuizOpen(false)} />
    </div>
  );
}
