import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import SignupPopup from "../components/SignupPopup";
import HeroSection from "../components/HeroSection";
import AboutSection from "../components/AboutSection";
import AchievementsSection from "../components/AchievementsSection";
import CoursesSection from "../components/CoursesSection";
import QuotesSection from "../components/QuotesSection";
import MentorsSection from "../components/MentorsSection";
import StudentLifeSection from "../components/StudentLifeSection";
import EventsGallery from "../components/EventsGallery";
import CounselorCTA from "../components/CounselorCTA";
import HiringStatsSection from "../components/HiringStatsSection";
import Footer from "../components/Footer";
import { openCallModal } from "../services/vapiWeb";

export default function HomePage() {
  const { user } = useAuth();
  const [showSignupPopup, setShowSignupPopup] = useState(false);

  // Scroll trigger — show signup popup when visitor reaches Mentors section
  const handleReachMentors = () => {
    if (!user && !sessionStorage.getItem("popupShown")) {
      setShowSignupPopup(true);
      sessionStorage.setItem("popupShown", "true");
    }
  };

  return (
    <div>
      {/* Visible to everyone */}
      <HeroSection />
      <AboutSection />
      <AchievementsSection />
      <CoursesSection />
      <QuotesSection />
      <MentorsSection onReachMentors={handleReachMentors} />

      {/* Content below Mentors — GATED */}
      {user ? (
        <>
          <StudentLifeSection />
          <EventsGallery />
          {/* THE ONLY CALL BUTTON — Directly above Placements Highlight */}
          <CounselorCTA onOpenCall={openCallModal} />
          <HiringStatsSection />
          <Footer />
        </>
      ) : (
        <section className="py-12 bg-cream text-center">
          <h2 className="text-3xl font-bold mb-4 text-maroon">Want to See More?</h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">
            Sign up to explore campus life, events, placement statistics,
            and talk live with our AI counselor.
          </p>
          <button
            onClick={() => setShowSignupPopup(true)}
            className="bg-maroon hover:bg-maroon-dark text-white px-8 py-3 rounded-lg font-semibold shadow-md transition-colors cursor-pointer"
          >
            Sign Up to Unlock
          </button>
          <Footer />
        </section>
      )}

      <SignupPopup show={showSignupPopup} onClose={() => setShowSignupPopup(false)} />
    </div>
  );
}
