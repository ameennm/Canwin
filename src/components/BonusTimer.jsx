import { useState, useEffect } from 'react';
import { Timer, Zap } from 'lucide-react';

export default function BonusTimer({ bonus }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!bonus) return;

    const interval = setInterval(() => {
      const now = new Date();
      const end = new Date(bonus.end_time);
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
      } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${h}h ${m}m ${s}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [bonus]);

  if (!bonus) return null;

  return (
    <div className="card bg-gradient-to-r from-amber-500/20 to-orange-500/10 border-amber-500/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-amber-500 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-amber-500">🔥 Direct Admission Bonus Active</h3>
            <p className="text-sm">Extra Bonus: ₹{bonus.bonus_amount}</p>
            <p className="text-xs text-muted-foreground">Course: {bonus.course_name}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-orange-500 font-mono font-bold">
            <Timer className="w-4 h-4" />
            {timeLeft}
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Expires in</p>
        </div>
      </div>
    </div>
  );
}
