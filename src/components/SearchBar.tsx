import React, { useState, useEffect } from 'react';
import { Form, InputGroup } from 'react-bootstrap';
import { FiSearch } from 'react-icons/fi';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
  className?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Search...",
  onSearch,
  debounceMs = 300,
  className = ""
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchQuery);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearch, debounceMs]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClear = () => {
    setSearchQuery('');
  };

  return (
    <InputGroup className={`mb-3 ${className}`}>
      <InputGroup.Text
        style={{
          borderColor: '#ced4da',
          backgroundColor: '#fff',
          height: '38px'
        }}
      >
        <FiSearch />
      </InputGroup.Text>
      <Form.Control
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={handleInputChange}
        style={{
          maxWidth: '300px',
          height: '38px',
          borderColor: '#ced4da',
          boxShadow: 'none'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#86b7fe';
          e.target.style.boxShadow = '0 0 0 0.25rem rgba(13, 110, 253, 0.25)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#ced4da';
          e.target.style.boxShadow = 'none';
        }}
      />
      {searchQuery && (
        <InputGroup.Text
          style={{
            cursor: 'pointer',
            borderColor: '#ced4da',
            backgroundColor: '#fff',
            height: '38px'
          }}
          onClick={handleClear}
          title="Clear search"
        >
          ×
        </InputGroup.Text>
      )}
    </InputGroup>
  );
};

export default SearchBar;
