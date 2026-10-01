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
      <Dropdown.Toggle
        variant="light"
        size="sm"
        id="language-dropdown"
        className="scaleerp-lang-toggle d-flex align-items-center gap-1.5"
        style={{
          backgroundColor: '#ffffff',
          color: '#0f172a',
          borderColor: '#94a3b8',
          fontWeight: 700,
          fontSize: '13px',
          borderRadius: '8px',
          padding: '6px 14px',
          cursor: 'pointer',
        }}
      >
        {currentLanguage === 'mr' ? '🇮🇳 मराठी' : '🇺🇸 English'}
      </Dropdown.Toggle>

      <Dropdown.Menu className="scaleerp-lang-menu shadow-lg" style={{ borderRadius: '8px', minWidth: '145px', zIndex: 9999 }}>
        <Dropdown.Item
          active={currentLanguage === 'en'}
          onClick={() => changeLanguage('en')}
          style={{
            fontWeight: currentLanguage === 'en' ? 700 : 500,
            fontSize: '13px',
            padding: '8px 16px',
            color: currentLanguage === 'en' ? '#ffffff' : '#1e293b',
          }}
        >
          🇺🇸 {t('language.english', 'English')}
        </Dropdown.Item>
        <Dropdown.Item
          active={currentLanguage === 'mr'}
          onClick={() => changeLanguage('mr')}
          style={{
            fontWeight: currentLanguage === 'mr' ? 700 : 500,
            fontSize: '13px',
            padding: '8px 16px',
            color: currentLanguage === 'mr' ? '#ffffff' : '#1e293b',
          }}
        >
          🇮🇳 {t('language.marathi', 'मराठी')}
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default LanguageSwitcher;
