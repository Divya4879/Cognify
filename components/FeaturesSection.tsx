import React from 'react';
import type { Feature } from '../types';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { TargetIcon } from './icons/TargetIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { FileTextIcon } from './icons/FileTextIcon';
import { BrainCircuitIcon } from './icons/BrainCircuitIcon';

const features: Feature[] = [
  {
    icon: <BrainCircuitIcon className="h-8 w-8 text-white" />,
    title: 'Analyze Anything',
    description: 'Upload your PDFs and audio lectures. The AI distills hours of material into key summaries and insights relevant to your specific topics.'
  },
  {
    icon: <SparklesIcon className="h-8 w-8 text-white" />,
    title: 'Your Personal AI Tutor',
    description: 'Generate anything you need to learn: in-depth explanations, flashcards, visual diagrams, and even find high-quality web resources.'
  },
  {
    icon: <TargetIcon className="h-8 w-8 text-white" />,
    title: 'Test for Mastery, Not Just Memory',
    description: 'Create custom quizzes with intelligent, AI-powered feedback that shows you not just what you got wrong, but why.'
  },
  {
    icon: <ClipboardListIcon className="h-8 w-8 text-white" />,
    title: 'All-in-One Study Hub',
    description: 'Organize your subjects, topics, notes, and resources in one clean, centralized workspace. Your entire academic life, streamlined.'
  }
];

const FeatureCard: React.FC<{ feature: Feature }> = ({ feature }) => (
    <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 hover:border-cyan-400 transition-colors duration-300">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 mb-4">
            {feature.icon}
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
        <p className="text-slate-400">{feature.description}</p>
    </div>
);


const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="py-20 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-base font-semibold tracking-wide uppercase gradient-text">Everything You Need</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-white sm:text-4xl">
            A Smarter Way to Learn
          </p>
          <p className="mt-4 max-w-2xl text-xl text-slate-400 mx-auto">
            This platform provides the tools to not just study, but to understand, retain, and excel.
          </p>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;