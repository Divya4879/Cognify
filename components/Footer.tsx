import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center">
            <p className="text-sm text-slate-500">
                &copy; {new Date().getFullYear()} Cognify. All rights reserved.
            </p>
            <p className="text-sm text-slate-500">
                Crafted with <span className="text-red-500" role="img" aria-label="love">❤️</span> by <a href="https://github.com/Divya4879">Divya</a>
            </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;