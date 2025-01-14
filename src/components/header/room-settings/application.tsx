import React from 'react';
import { useTranslation } from 'react-i18next';

import languages from '../../../helpers/languages';

const ApplicationSettings = () => {
  const { t, i18n } = useTranslation();

  const render = () => {
    return (
      <div className="s">
        <div className="grid grid-cols-6 gap-6">
          <div className="col-span-6 sm:col-span-3 flex items-center justify-start">
            <label
              htmlFor="language"
              className="block text-sm font-medium text-gray-700 mr-5"
            >
              {t('header.room-settings.language')}
            </label>
            <select
              id="language"
              name="language"
              value={i18n.languages[0]}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              {languages.map(({ code, text }) => {
                return (
                  <option key={code} value={code}>
                    {text}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>
    );
  };

  return <>{render()}</>;
};

export default ApplicationSettings;
