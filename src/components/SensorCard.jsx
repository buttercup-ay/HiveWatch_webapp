import React from 'react';

export default function SensorCard({
  label,
  value,
  unit,
  icon,
  min,
  max,
  prevValue,
  className = '',
}) {
  const numVal = parseFloat(value);
  const isAlert =
    value !== null && value !== undefined && !isNaN(numVal) &&
    min !== undefined && max !== undefined &&
    (numVal < min || numVal > max);

  let trend = null;
  if (prevValue !== null && prevValue !== undefined && value !== null && value !== undefined) {
    const diff = numVal - parseFloat(prevValue);
    if (Math.abs(diff) < 0.05) trend = '—';
    else if (diff > 0) trend = '↑';
    else trend = '↓';
  }

  const trendColor =
    trend === '↑' ? 'text-red-500 dark:text-red-400' :
    trend === '↓' ? 'text-blue-500 dark:text-blue-400' :
    'text-gray-400 dark:text-stone-500';

  return (
    <div
      className={`bg-white dark:bg-stone-900 rounded-xl shadow-md p-4 flex flex-col gap-1 border-2 transition-colors ${
        isAlert ? 'border-red-400 dark:border-red-500/50' : 'border-transparent dark:border-stone-800/60'
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">{label}</span>
        {icon && <span className="text-lg opacity-80">{icon}</span>}
      </div>
      
      <div className="flex items-end gap-1 mt-1">
        <span className="text-3xl font-bold text-stone-800 dark:text-stone-100">
          {value !== null && value !== undefined ? numVal.toFixed(1) : '—'}
        </span>
        <span className="text-sm text-stone-500 dark:text-stone-400 mb-1">{unit}</span>
        {trend && (
          <span className={`text-base mb-1 font-bold ${trendColor}`}>{trend}</span>
        )}
      </div>
      
      <div className="mt-1">
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
            isAlert
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : value !== null && value !== undefined
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
          }`}
        >
          {value !== null && value !== undefined
            ? isAlert ? 'Alert' : 'Normal'
            : 'No Data'}
        </span>
      </div>
    </div>
  );
}