import React from "react";
import { Calendar } from "lucide-react";

interface GCPDateTimePickerProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date | null;
}

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function GCPDateTimePicker({ label, value, onChange, minDate }: GCPDateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showHourPicker, setShowHourPicker] = React.useState(false);
  const [viewYear, setViewYear] = React.useState(
    () => value?.getFullYear() ?? new Date().getFullYear()
  );
  const [viewMonth, setViewMonth] = React.useState(
    () => value?.getMonth() ?? new Date().getMonth()
  );
  const [dateInputVal, setDateInputVal] = React.useState(() =>
    value ? formatDateInput(value) : ""
  );
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Sync dateInputVal when value changes externally
  React.useEffect(() => {
    setDateInputVal(value ? formatDateInput(value) : "");
    if (value) {
      setViewYear(value.getFullYear());
      setViewMonth(value.getMonth());
    }
  }, [value]);

  function formatDateInput(d: Date) {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yy = String(d.getFullYear());
    return `${mm}/${dd}/${yy}`;
  }

  function formatDisplay(d: Date) {
    const mm = d.getMonth() + 1;
    const dd = d.getDate();
    const yy = d.getFullYear();
    const h = d.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${mm}/${dd}/${yy}, ${String(h12).padStart(2, "0")}:00 ${ampm}`;
  }

  const selectedHour = value?.getHours() ?? 0;

  const handleDayClick = (day: number) => {
    const d = new Date(viewYear, viewMonth, day, selectedHour, 0, 0, 0);
    if (minDate && d < minDate) return;
    onChange(d);
    setDateInputVal(formatDateInput(d));
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const h = parseInt(e.target.value);
    const base = value ? new Date(value) : new Date(viewYear, viewMonth, 1);
    base.setHours(h, 0, 0, 0);
    onChange(base);
  };

  const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDateInputVal(raw);
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) {
      const d = new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate(),
        selectedHour,
        0,
        0,
        0
      );
      onChange(d);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  );

  const today = new Date();
  const minAllowed =
    minDate ??
    (() => {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      d.setHours(0, 0, 0, 0);
      return d;
    })();
  const maxAllowed = new Date();
  maxAllowed.setDate(maxAllowed.getDate() + 1);
  maxAllowed.setHours(23, 59, 59, 999);

  const isSelected = (day: number) =>
    value &&
    value.getFullYear() === viewYear &&
    value.getMonth() === viewMonth &&
    value.getDate() === day;

  const isDisabled = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    return (
      d < new Date(minAllowed.getFullYear(), minAllowed.getMonth(), minAllowed.getDate()) ||
      d > new Date(maxAllowed.getFullYear(), maxAllowed.getMonth(), maxAllowed.getDate())
    );
  };

  const isToday = (day: number) =>
    today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger — outlined floating label */}
      <div
        className={`relative w-full border rounded-md cursor-pointer transition-colors ${
          isOpen ? "border-blue-500" : "border-slate-300 hover:border-slate-400"
        } bg-white`}
        onClick={() => setIsOpen((o) => !o)}
      >
        {/* Floating label */}
        <span
          className={`absolute -top-2 left-3 px-1 text-[10px] font-medium bg-white leading-none ${
            isOpen ? "text-blue-500" : "text-slate-500"
          }`}
        >
          {label}
        </span>
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className={`text-xs font-medium ${value ? "text-slate-800" : "text-slate-400"}`}>
            {value ? formatDisplay(value) : "Select date and time"}
          </span>
          <Calendar
            className={`w-4 h-4 flex-shrink-0 ml-2 ${isOpen ? "text-blue-500" : "text-slate-400"}`}
          />
        </div>
      </div>
      <p className="mt-1 text-[10px] text-slate-400">Requires a date in the past (max 90 days)</p>

      {/* Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-[90] bg-white border border-slate-200 rounded-xl shadow-2xl w-72 overflow-hidden">
          {/* Date + Hour row */}
          <div className="flex gap-2 p-3 pb-2 border-b border-slate-100">
            {/* Date outlined input */}
            <div className="relative flex-1">
              <span className="absolute -top-2 left-2 px-1 text-[9px] font-medium text-slate-500 bg-white leading-none">
                Date *
              </span>
              <input
                type="text"
                value={dateInputVal}
                onChange={handleDateInput}
                placeholder="MM/DD/YYYY"
                className="w-full border border-slate-300 rounded-md py-2 px-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            {/* Hour outlined custom dropdown */}
            <div className="relative w-24">
              <span className="absolute -top-2 left-2 px-1 text-[9px] font-medium text-slate-500 bg-white leading-none z-10">
                Hour *
              </span>
              <div
                className="w-full border border-slate-300 rounded-md py-2 px-2 text-xs outline-none focus:border-blue-500 bg-white cursor-pointer text-center select-none hover:border-slate-400 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHourPicker((v) => !v);
                }}
              >
                {String(selectedHour).padStart(2, "0")}:00
              </div>
              {showHourPicker && (
                <div
                  className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-[100] max-h-48 overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        const base = value ? new Date(value) : new Date(viewYear, viewMonth, 1);
                        base.setHours(i, 0, 0, 0);
                        onChange(base);
                        setShowHourPicker(false);
                      }}
                      className={`px-3 py-1.5 text-xs cursor-pointer text-center transition-colors ${
                        selectedHour === i
                          ? "bg-blue-600 text-white font-bold"
                          : "text-slate-700 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                    >
                      {String(i).padStart(2, "0")}:00
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Calendar */}
          <div className="p-3">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevMonth();
                }}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors text-sm font-bold"
              >
                ‹
              </button>
              <span className="text-xs font-bold text-slate-700">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextMonth();
                }}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors text-sm font-bold"
              >
                ›
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map((d, i) => (
                <div key={i} className="text-center text-[10px] font-bold text-slate-400 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const selected = isSelected(day);
                const disabled = isDisabled(day);
                return (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!disabled) handleDayClick(day);
                    }}
                    disabled={disabled}
                    className={`
                      mx-auto w-7 h-7 flex items-center justify-center rounded-full text-xs transition-all
                      ${
                        selected
                          ? "bg-blue-600 text-white font-bold shadow-sm"
                          : disabled
                            ? "text-slate-200 cursor-not-allowed"
                            : isToday(day)
                              ? "border border-blue-400 text-blue-600 font-bold hover:bg-blue-50 cursor-pointer"
                              : "text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer font-medium"
                      }
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end px-3 pb-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
