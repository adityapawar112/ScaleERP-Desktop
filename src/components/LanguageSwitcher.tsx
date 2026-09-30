import React from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const currentLanguage = i18n.language;

  return (
    <Dropdown className="language-switcher">
      <Dropdown.Toggle variant="outline-secondary" size="sm" id="language-dropdown">
        {currentLanguage === 'mr' ? '🇮🇳 मराठी' : '🇺🇸 English'}
      </Dropdown.Toggle>

      <Dropdown.Menu>
        <Dropdown.Item
          active={currentLanguage === 'en'}
          onClick={() => changeLanguage('en')}
        >
          🇺🇸 {t('language.english')}
        </Dropdown.Item>
        <Dropdown.Item
          active={currentLanguage === 'mr'}
          onClick={() => changeLanguage('mr')}
        >
          🇮🇳 {t('language.marathi')}
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default LanguageSwitcher;
