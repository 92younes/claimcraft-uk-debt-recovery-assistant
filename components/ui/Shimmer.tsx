import React from 'react';

interface ShimmerProps {
  className?: string;
  lines?: number;
  variant?: 'default' | 'card' | 'avatar' | 'text';
}

/**
 * Shimmer Loading Component
 *
 * Professional skeleton screen loader that replaces basic spinners.
 * Creates better perceived performance.
 *
 * Usage:
 * {isLoading ? <Shimmer /> : <ActualContent />}
 * {isLoading ? <Shimmer variant="card" /> : <CardContent />}
 */
export const Shimmer: React.FC<ShimmerProps> = ({
  className = '',
  lines = 3,
  variant = 'default'
}) => {
  if (variant === 'card') {
    return (
      <div className={`bg-white rounded-xl border border-slate-200 p-6 shadow-sm ${className}`}>
        <div className="flex items-start gap-4 mb-4">
          <div className="shimmer w-12 h-12 rounded-xl bg-slate-200"></div>
          <div className="flex-1 space-y-3">
            <div className="shimmer h-5 bg-slate-200 rounded w-3/4"></div>
            <div className="shimmer h-4 bg-slate-200 rounded w-1/2"></div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="shimmer h-4 bg-slate-200 rounded w-full"></div>
          <div className="shimmer h-4 bg-slate-200 rounded w-5/6"></div>
          <div className="shimmer h-4 bg-slate-200 rounded w-4/6"></div>
        </div>
      </div>
    );
  }

  if (variant === 'avatar') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="shimmer w-10 h-10 rounded-full bg-slate-200"></div>
        <div className="flex-1 space-y-2">
          <div className="shimmer h-4 bg-slate-200 rounded w-32"></div>
          <div className="shimmer h-3 bg-slate-200 rounded w-24"></div>
        </div>
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="shimmer h-4 bg-slate-200 rounded"
            style={{
              width: i === lines - 1 ? '60%' : '100%'
            }}
          ></div>
        ))}
      </div>
    );
  }

  // Default variant
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="shimmer h-4 bg-slate-200 rounded"
          style={{
            width: `${100 - (i * 10)}%`
          }}
        ></div>
      ))}
    </div>
  );
};

/**
 * Shimmer Table Row - For loading table rows
 */
export const ShimmerTableRow: React.FC<{ columns?: number }> = ({ columns = 4 }) => {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="shimmer h-4 bg-slate-200 rounded"></div>
        </td>
      ))}
    </tr>
  );
};

/**
 * Shimmer Grid - For loading grid layouts
 */
export const ShimmerGrid: React.FC<{ items?: number; className?: string }> = ({
  items = 6,
  className = ''
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <Shimmer key={i} variant="card" />
      ))}
    </div>
  );
};

/**
 * Shimmer Dashboard - For loading dashboard overview
 */
export const ShimmerDashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="shimmer w-12 h-12 rounded-xl bg-slate-200"></div>
              <div className="flex-1 space-y-2">
                <div className="shimmer h-3 bg-slate-200 rounded w-20"></div>
                <div className="shimmer h-6 bg-slate-200 rounded w-28"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <ShimmerGrid items={6} />
    </div>
  );
};
