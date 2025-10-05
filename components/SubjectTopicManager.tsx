import React, { useState, useEffect } from 'react';
import { Subject, Topic, UserProfile } from '../types';
import { Page } from '../App';
import SubjectListView from './hub/SubjectListView';
import SubjectDetailView from './hub/SubjectDetailView';
import TopicWorkspace from './hub/TopicWorkspace';
import HubNavigator from './hub/HubNavigator';

type HubView = 'subjects' | 'topics' | 'workspace';

interface SubjectTopicManagerProps {
  onNavigate: (page: Page) => void;
  userProfile: UserProfile | null;
}

const SubjectTopicManager: React.FC<SubjectTopicManagerProps> = ({ onNavigate, userProfile }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [view, setView] = useState<HubView>('subjects');
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);

  useEffect(() => {
    try {
      const storedSubjects = localStorage.getItem('cognifySubjects');
      if (storedSubjects) {
        setSubjects(JSON.parse(storedSubjects));
      }
    } catch (error) {
      console.error("Failed to parse subjects from localStorage", error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cognifySubjects', JSON.stringify(subjects));
  }, [subjects]);

  const handleUpdateSubject = (updatedSubject: Subject) => {
    const subjectIndex = subjects.findIndex(s => s.id === updatedSubject.id);
    if (subjectIndex !== -1) {
      const newSubjects = [...subjects];
      newSubjects[subjectIndex] = updatedSubject;
      setSubjects(newSubjects);
    }
  };

  const handleUpdateTopic = (updatedTopic: Topic) => {
    if (!activeSubject) return;

    const topicIndex = activeSubject.topics.findIndex(t => t.id === updatedTopic.id);
    if (topicIndex === -1) return;

    const updatedTopics = [...activeSubject.topics];
    updatedTopics[topicIndex] = updatedTopic;
    const updatedSubject = { ...activeSubject, topics: updatedTopics };
    
    setActiveSubject(updatedSubject);
    setActiveTopic(updatedTopic);
    handleUpdateSubject(updatedSubject);
  };

  const selectSubject = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (subject) {
      setActiveSubject(subject);
      setView('topics');
    }
  };

  const selectTopic = (topicId: string) => {
    if (!activeSubject) return;
    const topic = activeSubject.topics.find(t => t.id === topicId);
    if (topic) {
      setActiveTopic(topic);
      setView('workspace');
    }
  };

  const navigateToSubjects = () => {
    setView('subjects');
    setActiveSubject(null);
    setActiveTopic(null);
  };

  const navigateToSubjectDetail = () => {
    setView('topics');
    setActiveTopic(null);
  };

  const navigateBack = () => {
    if (view === 'workspace') {
      navigateToSubjectDetail();
    } else if (view === 'topics') {
      navigateToSubjects();
    }
  };

  const renderContent = () => {
    switch(view) {
      case 'workspace':
        return activeSubject && activeTopic ? (
          <TopicWorkspace 
            subject={activeSubject}
            topic={activeTopic}
            onUpdateTopic={handleUpdateTopic}
            onBack={navigateBack}
          />
        ) : null;
      case 'topics':
        return activeSubject ? (
          <SubjectDetailView 
            subject={activeSubject}
            setSubject={setActiveSubject}
            // FIX: Pass `handleUpdateSubject` to the `onUpdateSubject` prop. The name `onUpdateSubject` was not defined in this component's scope.
            onUpdateSubject={handleUpdateSubject}
            onSelectTopic={selectTopic}
            onBack={navigateBack}
          />
        ) : null;
      case 'subjects':
      default:
        return (
          <SubjectListView 
            subjects={subjects}
            setSubjects={setSubjects}
            onSelectSubject={selectSubject}
          />
        );
    }
  }

  return (
    <div className="bg-slate-900 min-h-screen hub-background">
       <HubNavigator
        onNavigateToHome={() => onNavigate('landing')}
        onNavigateToSubjects={navigateToSubjects}
        onNavigateToSubjectDetail={navigateToSubjectDetail}
        activeSubject={activeSubject}
        activeTopic={activeTopic}
        userProfile={userProfile}
      />
      {renderContent()}
    </div>
  );
};

export default SubjectTopicManager;