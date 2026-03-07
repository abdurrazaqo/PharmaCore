import React from 'react';

interface MarkdownTextProps {
  text: string;
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({ text }) => {
  const formatText = (input: string) => {
    const lines = input.split('\n');
    const elements: React.ReactNode[] = [];
    
    lines.forEach((line, index) => {
      // Handle headers (###, ##, #)
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={index} className="text-base font-bold mt-4 mb-2 text-slate-900 dark:text-white">
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={index} className="text-lg font-bold mt-5 mb-2 text-slate-900 dark:text-white">
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('# ')) {
        elements.push(
          <h1 key={index} className="text-xl font-bold mt-6 mb-3 text-slate-900 dark:text-white">
            {line.replace('# ', '')}
          </h1>
        );
      }
      // Handle bullet points (*, -, +)
      else if (line.match(/^\s*[\*\-\+]\s+/)) {
        const content = line.replace(/^\s*[\*\-\+]\s+/, '');
        const indent = line.match(/^\s*/)?.[0].length || 0;
        elements.push(
          <div key={index} className="flex gap-2 mb-1" style={{ marginLeft: `${indent * 8}px` }}>
            <span className="text-primary mt-1.5 flex-shrink-0">•</span>
            <span className="flex-1">{formatInlineMarkdown(content)}</span>
          </div>
        );
      }
      // Handle numbered lists
      else if (line.match(/^\s*\d+\.\s+/)) {
        const content = line.replace(/^\s*\d+\.\s+/, '');
        const number = line.match(/^\s*(\d+)\./)?.[1];
        const indent = line.match(/^\s*/)?.[0].length || 0;
        elements.push(
          <div key={index} className="flex gap-2 mb-1" style={{ marginLeft: `${indent * 8}px` }}>
            <span className="text-primary font-semibold flex-shrink-0">{number}.</span>
            <span className="flex-1">{formatInlineMarkdown(content)}</span>
          </div>
        );
      }
      // Handle empty lines
      else if (line.trim() === '') {
        elements.push(<div key={index} className="h-2"></div>);
      }
      // Regular paragraphs
      else {
        elements.push(
          <p key={index} className="mb-2">
            {formatInlineMarkdown(line)}
          </p>
        );
      }
    });
    
    return elements;
  };

  const formatInlineMarkdown = (text: string) => {
    const parts: React.ReactNode[] = [];
    let currentText = text;
    let key = 0;

    // Process bold (**text**)
    const boldRegex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(currentText)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(currentText.substring(lastIndex, match.index));
      }
      // Add bold text
      parts.push(
        <strong key={`bold-${key++}`} className="font-bold text-slate-900 dark:text-white">
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < currentText.length) {
      parts.push(currentText.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return <div className="markdown-content">{formatText(text)}</div>;
};
