import { Gift, PartyPopper, Cake } from 'lucide-react';

export default function BirthdayCard({ userName, avatarUrl }) {
    return (
        <div className="birthday-card fade-in">
            <div className="flex justify-center mb-4">
                <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-white/20 flex items-center justify-center">
                                <Cake className="w-10 h-10 text-white" />
                            </div>
                        )}
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
                        <PartyPopper className="w-5 h-5 text-yellow-800" />
                    </div>
                </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
                🎂 Happy Birthday!
            </h2>
            <p className="text-white/90 text-lg font-medium mb-2">
                {userName}
            </p>
            <p className="text-white/70 text-sm">
                Wishing you a wonderful day filled with joy and happiness!
            </p>

            <div className="flex justify-center gap-2 mt-4">
                <span className="text-2xl animate-bounce" style={{ animationDelay: '0s' }}>🎉</span>
                <span className="text-2xl animate-bounce" style={{ animationDelay: '0.1s' }}>🎁</span>
                <span className="text-2xl animate-bounce" style={{ animationDelay: '0.2s' }}>🎈</span>
                <span className="text-2xl animate-bounce" style={{ animationDelay: '0.3s' }}>🎊</span>
            </div>
        </div>
    );
}
