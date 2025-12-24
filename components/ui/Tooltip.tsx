import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  /** When true, wraps children in a span to enable hover on disabled elements */
  wrapDisabled?: boolean;
}

function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (value: T) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === 'function') {
        ref(value);
      } else {
        try {
          (ref as React.MutableRefObject<T | null>).current = value;
        } catch {
          // ignore
        }
      }
    });
  };
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 200,
  wrapDisabled = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const tooltipOffset = 8;

        let top = 0;
        let left = 0;

        switch (position) {
          case 'top':
            // rect coordinates are already viewport-relative; tooltip is position: fixed
            top = rect.top - tooltipOffset;
            left = rect.left + rect.width / 2;
            break;
          case 'bottom':
            top = rect.bottom + tooltipOffset;
            left = rect.left + rect.width / 2;
            break;
          case 'left':
            top = rect.top + rect.height / 2;
            left = rect.left - tooltipOffset;
            break;
          case 'right':
            top = rect.top + rect.height / 2;
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

  // Hide on scroll/resize (important when using nested scroll containers)
  useEffect(() => {
    if (!isVisible) return;
    const handle = () => hideTooltip();

    // capture=true catches scroll events from nested scroll containers
    window.addEventListener('scroll', handle, true);
    window.addEventListener('resize', handle);

    return () => {
      window.removeEventListener('scroll', handle, true);
      window.removeEventListener('resize', handle);
    };
  }, [isVisible]);

  // Hide on click outside and when focus moves away
  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (event: MouseEvent) => {
      // Hide tooltip when clicking anywhere outside the trigger element
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        hideTooltip();
      }
    };

    const handleFocusChange = (event: FocusEvent) => {
      // Hide tooltip when focus moves to a different element
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        hideTooltip();
      }
    };

    // Add listeners with slight delay to avoid conflicts with trigger events
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('focusin', handleFocusChange, true);
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('focusin', handleFocusChange, true);
    };
  }, [isVisible]);

  // For disabled elements, wrap in a span so mouse events still fire
  const triggerElement = wrapDisabled ? (
    <span
      ref={triggerRef as React.Ref<HTMLSpanElement>}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      className="inline-block"
    >
      {children}
    </span>
  ) : (
    React.cloneElement(children, {
      ref: mergeRefs(triggerRef as unknown as React.Ref<HTMLElement>, (children as any).ref),
      onMouseEnter: (e: React.MouseEvent) => {
        children.props.onMouseEnter?.(e);
        showTooltip();
      },
      onMouseLeave: (e: React.MouseEvent) => {
        children.props.onMouseLeave?.(e);
        hideTooltip();
      },
      onFocus: (e: React.FocusEvent) => {
        children.props.onFocus?.(e);
        showTooltip();
      },
      onBlur: (e: React.FocusEvent) => {
        children.props.onBlur?.(e);
        hideTooltip();
      },
    })
  );

  // Don't show tooltip if no content
  if (!content) {
    return wrapDisabled ? <>{children}</> : children;
  }

  const tooltipElement = isVisible ? (
    <div
      role="tooltip"
      className={`fixed z-[70] px-3 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg shadow-lg max-w-xs pointer-events-none animate-fade-in ${
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
        className={`absolute w-3 h-3 bg-slate-900 transform rotate-45 ${
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
      {triggerElement}
      {typeof document !== 'undefined' && tooltipElement && createPortal(tooltipElement, document.body)}
    </>
  );
};
