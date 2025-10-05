import React from 'react';
import { Subject, Topic, UserProfile } from '../../types';
import { HomeIcon } from '../icons/HomeIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';

interface HubNavigatorProps {
  onNavigateToHome: () => void;
  onNavigateToSubjects: () => void;
  onNavigateToSubjectDetail: () => void;
  activeSubject: Subject | null;
  activeTopic: Topic | null;
  userProfile: UserProfile | null;
}

const NavLink: React.FC<{onClick: () => void, children: React.ReactNode}> = ({ onClick, children }) => (
    <button onClick={onClick} className="text-cyan-400 hover:text-cyan-300 transition-colors truncate">
        {children}
    </button>
);

const NavSeparator: React.FC = () => (
    <ChevronRightIcon className="h-5 w-5 text-slate-500 flex-shrink-0" />
);

const HubNavigator: React.FC<HubNavigatorProps> = ({ 
    onNavigateToHome, 
    onNavigateToSubjects, 
    onNavigateToSubjectDetail,
    activeSubject,
    activeTopic,
    userProfile
}) => {
    // A function to clean up the indented sub-topic titles for display
    const formatTopicTitle = (title: string) => {
        return title.startsWith('  • ') ? title.substring(3) : title;
    };

    return (
        <nav className="bg-slate-800/60 border-b border-slate-700 px-4 sm:px-6 lg:px-8 py-3 sticky top-0 z-40 backdrop-blur-md">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-sm font-medium">
                {/* Breadcrumbs on the left */}
                <div className="flex items-center gap-2 min-w-0">
                    <button onClick={onNavigateToHome} title="Go to Home" className="flex-shrink-0 p-1 rounded-full hover:bg-slate-700 transition-colors">
                        <HomeIcon className="h-5 w-5 text-slate-300" />
                    </button>
                    
                    <div className="flex items-center gap-2 truncate">
                        <NavSeparator />
                        <NavLink onClick={onNavigateToSubjects}>
                            My Learning Hub
                        </NavLink>
                        {activeSubject && (
                            <>
                                <NavSeparator />
                                {activeTopic ? (
                                    <NavLink onClick={onNavigateToSubjectDetail}>{activeSubject.name}</NavLink>
                                ) : (
                                    <span className="text-white truncate" title={activeSubject.name}>{activeSubject.name}</span>
                                )}
                            </>
                        )}
                        {activeTopic && (
                            <>
                                <NavSeparator />
                                <span className="text-white truncate" title={activeTopic.title}>{formatTopicTitle(activeTopic.title)}</span>
                            </>
                        )}
                    </div>
                </div>
                
                {/* User greeting on the right */}
                {userProfile && (
                    <div className="text-slate-300 flex-shrink-0">
                        Hello, {userProfile.name.split(' ')[0]}
                    </div>
                )}
            </div>
        </nav>
    );
};

export default HubNavigator;