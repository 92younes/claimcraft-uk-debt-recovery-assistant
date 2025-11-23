import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 200
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const tooltipOffset = 8;

        let top = 0;
        let left = 0;

        switch (position) {
          case 'top':
            top = rect.top + window.scrollY - tooltipOffset;
            left = rect.left + rect.width / 2;
            break;
          case 'bottom':
            top = rect.bottom + window.scrollY + tooltipOffset;
            left = rect.left + rect.width / 2;
            break;
          case 'left':
            top = rect.top + rect.height / 2 + window.scrollY;
            left = rect.left - tooltipOffset;
            break;
          case 'right':
            top = rect.top + rect.height / 2 + window.scrollY;
            left = rect.right + tooltipOffset;
            break;
        }

        setCoords({ top, left });
        setIsVisible(true);
      }
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const childWithHandlers = React.cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: showTooltip,
    onMouseLeave: hideTooltip,
    onFocus: showTooltip,
    onBlur: hideTooltip,
  });

  const tooltipElement = isVisible ? (
    <div
      role="tooltip"
      className={`fixed z-50 px-3 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg shadow-lg max-w-xs pointer-events-none animate-fade-in ${
        position === 'top' ? '-translate-y-full -translate-x-1/2' :
        position === 'bottom' ? 'translate-y-0 -translate-x-1/2' :
        position === 'left' ? '-translate-x-full -translate-y-1/2' :
        'translate-x-0 -translate-y-1/2'
      }`}
      style={{
        top: coords.top,
        left: coords.left,
      }}
    >
      {content}
      {/* Arrow */}
      <div
        className={`absolute w-2 h-2 bg-slate-900 transform rotate-45 ${
          position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' :
          position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' :
          position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' :
          'left-[-4px] top-1/2 -translate-y-1/2'
        }`}
      />
    </div>
  ) : null;

  return (
    <>
      {childWithHandlers}
      {typeof document !== 'undefined' && tooltipElement && createPortal(tooltipElement, document.body)}
    </>
  );
};
