import React from 'react';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { UserProfile } from '../types';
import { Page } from '../App';

interface HeaderProps {
    onNavigate: (page: Page) => void;
    userProfile: UserProfile | null;
}

const Header: React.FC<HeaderProps> = ({ onNavigate, userProfile }) => {
  
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, page: Page) => {
    e.preventDefault();
    onNavigate(page);
  };
  
  return (
    <header className="bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <a href="#" onClick={(e) => handleNavClick(e, 'landing')} className="flex-shrink-0 flex items-center gap-2 cursor-pointer">
                <BookOpenIcon className="h-8 w-8 text-cyan-400" />
                <span className="text-3xl font-bold text-white">Cognify</span>
            </a>
            <nav className="hidden md:flex md:ml-10 md:space-x-8">
              <a href="#" onClick={(e) => handleNavClick(e, 'features')} className="text-slate-300 hover:text-white font-medium transition-colors cursor-pointer">Features</a>
              <a href="#" onClick={(e) => handleNavClick(e, 'hub')} className="text-slate-300 hover:text-white font-medium transition-colors cursor-pointer">Learning Hub</a>
              <a href="#" onClick={(e) => handleNavClick(e, 'faq')} className="text-slate-300 hover:text-white font-medium transition-colors cursor-pointer">FAQ</a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
             {userProfile ? (
                <>
                  <span className="hidden sm:inline text-slate-300">Hello, {userProfile.name.split(' ')[0]}</span>
                  <a href="#" onClick={(e) => handleNavClick(e, 'hub')} className="bg-gradient-to-r from-cyan-500 to-violet-500 text-white px-4 py-2 rounded-md font-semibold hover:opacity-90 shadow-lg transition-opacity cursor-pointer">
                    My Hub
                  </a>
                </>
             ) : (
                <a href="#" onClick={(e) => handleNavClick(e, 'profile')} className="bg-gradient-to-r from-cyan-500 to-violet-500 text-white px-4 py-2 rounded-md font-semibold hover:opacity-90 shadow-lg transition-opacity cursor-pointer">
                    Get Started
                </a>
             )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;