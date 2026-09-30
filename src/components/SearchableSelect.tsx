import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Form, InputGroup } from 'react-bootstrap';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select...",
  label,
  required = false,
  disabled = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (searchTerm.trim() === '') {
      return options;
    } else {
      return options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  }, [searchTerm, options]);

  // Get the display label for the selected value
  const getSelectedLabel = () => {
    const selectedOption = options.find(option => option.value === value);
    return selectedOption ? selectedOption.label : placeholder;
  };

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle option selection
  const handleOptionSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Handle dropdown toggle
  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        // Focus input when opening
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      } else {
        setSearchTerm('');
      }
    }
  };

  return (
    <Form.Group className={className}>
      {label && <Form.Label>{label}</Form.Label>}
      <div ref={dropdownRef} className="position-relative">
        <InputGroup>
          <Form.Control
            ref={inputRef}
            type="text"
            value={isOpen ? searchTerm : getSelectedLabel()}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={handleToggle}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            readOnly={!isOpen}
            className="cursor-pointer"
            style={{ cursor: 'pointer' }}
          />
          <InputGroup.Text
            onClick={handleToggle}
            style={{ cursor: 'pointer' }}
            className="cursor-pointer"
          >
            <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}></i>
          </InputGroup.Text>
        </InputGroup>

        {isOpen && (
          <div
            className="position-absolute w-100 bg-white border rounded-bottom shadow-sm"
            style={{
              zIndex: 1050,
              maxHeight: '200px',
              overflowY: 'auto',
              top: '100%'
            }}
          >
            {filteredOptions.length === 0 ? (
              <div className="p-2 text-muted small">No options found</div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={`p-2 cursor-pointer ${
                    option.value === value ? 'bg-primary text-white' : 'hover-bg-light'
                  }`}
                  onClick={() => handleOptionSelect(option.value)}
                  style={{ cursor: 'pointer' }}
                >
                  {option.label}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Form.Group>
  );
};

export default SearchableSelect;
