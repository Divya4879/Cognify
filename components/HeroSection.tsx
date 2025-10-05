import React from 'react';
import { Page } from '../App';

interface HeroSectionProps {
    onNavigate: (page: Page) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate }) => {
    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, page: Page) => {
        e.preventDefault();
        onNavigate(page);
    };
    
  return (
    <section className="relative bg-slate-900 overflow-hidden py-20 sm:py-32">
       <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"></div>
       <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-grid-slate-700/[0.05] [mask-image:linear-gradient(0deg,transparent,black)]"></div>
       </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
                <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-7xl">
                    Master Any Subject, 
                    <span className="block gradient-text mt-2">Faster.</span>
                </h1>
                <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto">
                    Cognify is your personal learning accelerator. Transform your course materials - from dense PDFs to rambling lectures, into clear summaries, interactive flashcards, and precise practice tests. Go beyond memorization and truly master your field.
                </p>
                <div className="mt-10 flex flex-col items-center justify-center gap-y-6">
                    <a href="#" onClick={(e) => handleNavClick(e, 'profile')} className="rounded-md bg-gradient-to-r from-cyan-500 to-violet-500 px-10 py-4 text-lg font-semibold text-white shadow-lg hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 transition-all hover:scale-105 cursor-pointer">
                        Start Learning Smarter
                    </a>
                    <a href="#" onClick={(e) => handleNavClick(e, 'features')} className="text-base font-semibold leading-6 text-slate-300 hover:text-white transition-colors cursor-pointer">
                        See How It Works <span aria-hidden="true">→</span>
                    </a>
                </div>
            </div>
        </div>
    </section>
  );
};

export default HeroSection;