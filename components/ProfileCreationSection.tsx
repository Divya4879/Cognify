import React, { useState, useEffect } from 'react';
import { UserProfile, LearnerType } from '../types';

interface ProfileCreationSectionProps {
  onProfileSave: (profile: UserProfile) => void;
}

const ProfileCreationSection: React.FC<ProfileCreationSectionProps> = ({ onProfileSave }) => {
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    name: '',
    learnerType: null,
  });

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('cognifyProfile');
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      }
    } catch (error) {
      console.error("Failed to parse profile from localStorage", error);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleLearnerTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const learnerType = e.target.value as LearnerType;
    // Reset conditional fields when learner type changes
    const newProfile: Partial<UserProfile> = {
      name: profile.name,
      learnerType: learnerType,
    };
    setProfile(newProfile);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile.name || !profile.learnerType) {
        alert('Please fill out your name and select a learner type.');
        return;
    }
    const finalProfile = profile as UserProfile;
    localStorage.setItem('cognifyProfile', JSON.stringify(finalProfile));
    alert(`Profile for ${profile.name} saved! Your AI tools are now personalized.`);
    onProfileSave(finalProfile);
  };

  const renderConditionalFields = () => {
    switch (profile.learnerType) {
      case LearnerType.SCHOOL:
        return (
          <div>
            <label htmlFor="schoolGrade" className="sr-only">Grade</label>
            <select
              id="schoolGrade"
              name="schoolGrade"
              value={profile.schoolGrade || ''}
              onChange={handleInputChange}
              required
              className="block w-full shadow-sm py-3 px-4 text-slate-300 bg-slate-800 border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 rounded-md"
            >
              <option value="" disabled>Select your grade...</option>
              {Array.from({ length: 12 }, (_, i) => `${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} Grade`).map(grade => (
                <option key={grade} value={grade} className="text-white">{grade}</option>
              ))}
            </select>
          </div>
        );
      case LearnerType.COLLEGE:
        return (
          <>
            <div>
              <label htmlFor="collegeDegree" className="sr-only">Degree Level</label>
              <select
                id="collegeDegree"
                name="collegeDegree"
                value={profile.collegeDegree || ''}
                onChange={handleInputChange}
                required
                className="block w-full shadow-sm py-3 px-4 text-slate-300 bg-slate-800 border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 rounded-md"
              >
                <option value="" disabled>Select your degree level...</option>
                <option className="text-white">Bachelor's</option>
                <option className="text-white">Master's</option>
                <option className="text-white">PhD / Doctoral</option>
                <option className="text-white" value="Other">Other</option>
              </select>
            </div>
            {profile.collegeDegree === 'Other' && (
              <div>
                <label htmlFor="otherCollegeDegree" className="sr-only">Please specify your degree</label>
                <input
                  type="text"
                  name="otherCollegeDegree"
                  id="otherCollegeDegree"
                  value={profile.otherCollegeDegree || ''}
                  onChange={handleInputChange}
                  required
                  className="block w-full shadow-sm py-3 px-4 placeholder-slate-500 bg-slate-800 border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 rounded-md text-white"
                  placeholder="Please specify your degree"
                />
              </div>
            )}
            <div>
              <label htmlFor="collegeStream" className="sr-only">Field of Study</label>
              <input
                type="text"
                name="collegeStream"
                id="collegeStream"
                value={profile.collegeStream || ''}
                onChange={handleInputChange}
                required
                className="block w-full shadow-sm py-3 px-4 placeholder-slate-500 bg-slate-800 border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 rounded-md text-white"
                placeholder="Field of Study (e.g., Computer Science)"
              />
            </div>
          </>
        );
      case LearnerType.EXAM_PREP:
        return (
          <div>
            <label htmlFor="examName" className="sr-only">Competitive Exam Name</label>
            <input
              type="text"
              name="examName"
              id="examName"
              value={profile.examName || ''}
              onChange={handleInputChange}
              required
              className="block w-full shadow-sm py-3 px-4 placeholder-slate-500 bg-slate-800 border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 rounded-md text-white"
              placeholder="Name of Exam (e.g., SAT, GRE, UPSC)"
            />
          </div>
        );
      case LearnerType.PROFESSIONAL:
      case LearnerType.SELF_STUDY:
        return (
          <div>
            <label htmlFor="fieldOfStudy" className="sr-only">Field of Study / Profession</label>
            <input
              type="text"
              name="fieldOfStudy"
              id="fieldOfStudy"
              value={profile.fieldOfStudy || ''}
              onChange={handleInputChange}
              required
              className="block w-full shadow-sm py-3 px-4 placeholder-slate-500 bg-slate-800 border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 rounded-md text-white"
              placeholder="Your Area of Focus (e.g., Machine Learning)"
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <section id="create-profile" className="py-20 bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
          Create Your Personalized Learning Profile
        </h2>
        <p className="mt-4 text-lg text-slate-400">
          Tell us about yourself to tailor the AI to your academic level for smarter studying.
        </p>
        <div className="mt-10 max-w-lg mx-auto bg-slate-800/50 border border-slate-700 p-8 rounded-xl shadow-2xl">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-y-6 text-left">
            <div>
              <label htmlFor="name" className="sr-only">Full name</label>
              <input
                type="text"
                name="name"
                id="name"
                autoComplete="name"
                required
                value={profile.name || ''}
                onChange={handleInputChange}
                className="block w-full shadow-sm py-3 px-4 placeholder-slate-500 bg-slate-800 border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 rounded-md text-white"
                placeholder="Full name"
              />
            </div>
            <div>
              <label htmlFor="learnerType" className="sr-only">I am a...</label>
              <select
                id="learnerType"
                name="learnerType"
                required
                value={profile.learnerType || ""}
                onChange={handleLearnerTypeChange}
                className="block w-full shadow-sm py-3 px-4 text-slate-300 bg-slate-800 border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 rounded-md"
              >
                <option value="" disabled>Select your learner type...</option>
                {Object.values(LearnerType).map(type => (
                  <option key={type} value={type} className="text-white">{type}</option>
                ))}
              </select>
            </div>
            
            {renderConditionalFields()}
            
            <div>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-gradient-to-r from-cyan-500 to-violet-500 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500"
              >
                Save Profile & Enter Hub
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ProfileCreationSection;