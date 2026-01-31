import React from 'react';
import { Globe } from 'lucide-react';

const LanguageSelector = ({ currentLanguage, onLanguageChange, isDark }) => {
    const languages = [
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
        { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
        { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
        { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' }
    ];

    return (
        <div className="relative inline-block">
            <select
                value={currentLanguage}
                onChange={(e) => onLanguageChange(e.target.value)}
                className={`appearance-none pl-10 pr-8 py-2 rounded-lg border-2 font-medium text-sm cursor-pointer transition-all ${isDark
                        ? 'bg-gray-800 border-gray-600 text-white hover:border-blue-500'
                        : 'bg-white border-gray-300 text-gray-900 hover:border-blue-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
                {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                    </option>
                ))}
            </select>
            <Globe className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-gray-400' : 'text-gray-500'
                }`} />
        </div>
    );
};

export default LanguageSelector;