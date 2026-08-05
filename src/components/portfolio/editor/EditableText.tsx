import React, { useState, useEffect, useRef } from 'react';
import { Pencil } from 'lucide-react';
import { usePortfolio } from '../../../context/PortfolioContext';

interface EditableTextProps extends React.HTMLAttributes<HTMLElement> {
  value: string;
  onSave: (value: string) => void;
  as?: any;
  className?: string;
  multiline?: boolean;
  href?: string;
}

export function EditableText({ value, onSave, as: Component = 'span', className = '', multiline = false, ...props }: EditableTextProps) {
  const { isEditMode } = usePortfolio();
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if (tempValue !== value) {
      onSave(tempValue);
    }
  };

  if (!isEditMode) {
    return <Component className={className} {...props}>{value}</Component>;
  }

  if (isEditing) {
    return multiline ? (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleSave}
        className={`w-full bg-black/50 border border-blue-500 rounded p-2 text-white outline-none resize-none ${className}`}
        rows={4}
      />
    ) : (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        className={`w-full bg-black/50 border border-blue-500 rounded px-2 py-1 text-white outline-none ${className}`}
      />
    );
  }

  return (
    <span className="relative group inline-block w-full">
      <Component className={className} {...props}>{value}</Component>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsEditing(true);
        }}
        className="absolute -top-3 -right-3 p-1.5 bg-blue-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10 cursor-pointer"
      >
        <Pencil size={12} />
      </span>
    </span>
  );
}
