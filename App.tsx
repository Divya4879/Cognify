import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import FaqSection from './components/FaqSection';
import Footer from './components/Footer';
import ProfileCreationSection from './components/ProfileCreationSection';
import SubjectTopicManager from './components/SubjectTopicManager';
import { UserProfile } from './types';

export type Page = 'landing' | 'features' | 'hub' | 'profile' | 'faq';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('cognifyProfile');
      if (savedProfile) {
        setUserProfile(JSON.parse(savedProfile));
      } else {
        // New user, redirect to profile creation.
        setCurrentPage('profile');
      }
    } catch (error) {
      console.error("Failed to parse profile from localStorage", error);
      // If there's an error, assume no profile exists.
      setCurrentPage('profile');
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const navigate = (page: Page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const handleProfileSave = (profile: UserProfile) => {
    setUserProfile(profile);
    // Navigate to the learning hub after profile is saved for a smooth flow
    navigate('hub');
  };
  
  const renderPage = () => {
    switch (currentPage) {
      case 'features':
        return <FeaturesSection />;
      case 'hub':
        // Prevent access to hub if profile doesn't exist yet
        if (!userProfile) {
            return <ProfileCreationSection onProfileSave={handleProfileSave} />;
        }
        return <SubjectTopicManager onNavigate={navigate} userProfile={userProfile} />;
      case 'profile':
        return <ProfileCreationSection onProfileSave={handleProfileSave} />;
      case 'faq':
        return <FaqSection />;
      case 'landing':
      default:
        return <HeroSection onNavigate={navigate} />;
    }
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        {/* You can replace this with a nice spinner component */}
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen antialiased flex flex-col">
      {currentPage !== 'hub' && <Header onNavigate={navigate} userProfile={userProfile} />}
      <main className="flex-grow">
        {renderPage()}
      </main>
      {currentPage !== 'hub' && <Footer />}
    </div>
  );
};

export default App;