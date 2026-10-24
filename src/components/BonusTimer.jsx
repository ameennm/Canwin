import { useState, useEffect } from 'react';
import { Timer, Zap } from 'lucide-react';

export default function BonusTimer({ bonus }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!bonus) return;

    const tick = () => {
      const diff = new Date(bonus.end_time) - new Date();
      if (diff <= 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
      } else {
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${d > 0 ? `${d}d ` : ''}${h}h ${m}m ${s}s`);
      }
    };
    const interval = setInterval(tick, 1000);
    tick();

    return () => clearInterval(interval);
  }, [bonus]);

  if (!bonus) return null;

  return (
    <div className="card border-amber-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
            <Zap className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <h3 className="font-bold text-amber-700">Bonus offer running</h3>
            <p className="text-sm">Extra ₹{bonus.bonus_amount}</p>
            <p className="text-xs text-slate-500">on {bonus.course_name} admissions</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-amber-700 font-mono font-semibold text-sm whitespace-nowrap">
            <Timer className="w-4 h-4" />
            {timeLeft}
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Expires in</p>
        </div>
      </div>
    </div>
  );
}
