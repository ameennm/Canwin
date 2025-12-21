import { Cake, PartyPopper, Gift, Star, User } from 'lucide-react';

export default function BirthdayCard({ userName, avatarUrl }) {
    return (
        <div style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 50%, #f59e0b 100%)',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Decorative elements */}
            <div style={{ position: 'absolute', top: '10px', left: '10px', opacity: 0.3 }}>
                <Star style={{ width: '20px', height: '20px', color: 'white' }} />
            </div>
            <div style={{ position: 'absolute', top: '20px', right: '15px', opacity: 0.3 }}>
                <Star style={{ width: '16px', height: '16px', color: 'white' }} />
            </div>
            <div style={{ position: 'absolute', bottom: '15px', left: '20px', opacity: 0.3 }}>
                <Gift style={{ width: '18px', height: '18px', color: 'white' }} />
            </div>
            <div style={{ position: 'absolute', bottom: '10px', right: '10px', opacity: 0.3 }}>
                <PartyPopper style={{ width: '20px', height: '20px', color: 'white' }} />
            </div>

            {/* Profile Picture */}
            <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                border: '4px solid white',
                margin: '0 auto 16px',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}>
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt={userName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <User style={{ width: '40px', height: '40px', color: 'white' }} />
                    </div>
                )}
            </div>

            {/* Icons Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '12px' }}>
                <PartyPopper style={{ width: '24px', height: '24px', color: 'white' }} />
                <Cake style={{ width: '28px', height: '28px', color: 'white' }} />
                <PartyPopper style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>

            {/* Title */}
            <h2 style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '8px',
                textShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}>
                🎉 Happy Birthday! 🎉
            </h2>

            {/* Message */}
            <p style={{
                color: 'rgba(255,255,255,0.95)',
                fontSize: '16px',
                marginBottom: '8px',
            }}>
                Dear <strong>{userName}</strong>,
            </p>

            <p style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: '14px',
                lineHeight: '1.5',
                maxWidth: '280px',
                margin: '0 auto',
            }}>
                Wishing you a wonderful day filled with joy, happiness, and blessings.
                May Allah grant you success in all your endeavors! 🌟
            </p>

            {/* Signature */}
            <div style={{
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255,255,255,0.3)',
            }}>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', margin: 0 }}>
                    With love from
                </p>
                <p style={{ color: 'white', fontWeight: 'bold', fontSize: '14px', margin: '4px 0 0' }}>
                    ✨ The CanWin Family ✨
                </p>
            </div>
        </div>
    );
}
