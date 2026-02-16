'use client';

interface MatchweekSelectorProps {
  matchweeks: number[];
  selected: number;
  onChange: (matchweek: number) => void;
}

export default function MatchweekSelector({
  matchweeks,
  selected,
  onChange,
}: MatchweekSelectorProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Selectează etapa
      </label>
      <select
        value={selected}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B5E20]"
      >
        {matchweeks.map((mw) => (
          <option key={mw} value={mw}>
            Etapa {mw}
          </option>
        ))}
      </select>
    </div>
  );
}
