import { useState, useRef } from 'react';
import { User, Award, Gem, Shield, Crown, Phone, Calendar, Download, Loader2 } from 'lucide-react';

export default function IDCard({ user }) {
    const [downloading, setDownloading] = useState(false);
    const cardRef = useRef(null);

    const levelIcons = {
        Bronze: Award,
        Silver: Shield,
        Gold: Crown,
        Diamond: Gem,
        Initiator: Award,
        Advocate: Shield,
        Guardian: Crown,
        Mentor: Gem,
        Luminary: Gem,
    };

    const levelColors = {
        Bronze: { gradient: 'linear-gradient(135deg, #cd7f32 0%, #8b4513 100%)', text: '#cd7f32' },
        Silver: { gradient: 'linear-gradient(135deg, #c0c0c0 0%, #808080 100%)', text: '#a8a8a8' },
        Gold: { gradient: 'linear-gradient(135deg, #ffd700 0%, #ffb300 100%)', text: '#ffd700' },
        Diamond: { gradient: 'linear-gradient(135deg, #b9f2ff 0%, #00bfff 100%)', text: '#00bfff' },
        Initiator: { gradient: 'linear-gradient(135deg, #cd7f32 0%, #8b4513 100%)', text: '#cd7f32' },
        Advocate: { gradient: 'linear-gradient(135deg, #c0c0c0 0%, #808080 100%)', text: '#a8a8a8' },
        Guardian: { gradient: 'linear-gradient(135deg, #ffd700 0%, #ffb300 100%)', text: '#ffd700' },
        Mentor: { gradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', text: '#60a5fa' },
        Luminary: { gradient: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)', text: '#a855f7' },
    };

    const LevelIcon = levelIcons[user.current_level] || Award;
    const levelStyle = levelColors[user.current_level] || levelColors.Bronze;

    const formatDOB = (dob) => {
        if (!dob) return '';
        const date = new Date(dob);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatJoinDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    };

    const downloadAsPDF = async () => {
        if (!cardRef.current) return;

        setDownloading(true);

        try {
            // Dynamically import libraries
            const [html2canvasModule, jsPDFModule] = await Promise.all([
                import('html2canvas'),
                import('jspdf')
            ]);

            const html2canvas = html2canvasModule.default;
            const { jsPDF } = jsPDFModule;

            // Create canvas from the card
            const canvas = await html2canvas(cardRef.current, {
                scale: 3,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#0f172a',
                logging: false,
            });

            // Create PDF (ID card size: 85.6mm x 53.98mm - standard credit card)
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: [85.6, 53.98]
            });

            // Add the card image to PDF
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 0, 0, 85.6, 53.98);

            // Download
            pdf.save(`CanWin_ID_${user.custom_id || 'Card'}.pdf`);
        } catch (err) {
            console.error('PDF generation failed:', err);
            // Fallback: download as image
            try {
                const html2canvasModule = await import('html2canvas');
                const html2canvas = html2canvasModule.default;
                const canvas = await html2canvas(cardRef.current, {
                    scale: 3,
                    useCORS: true,
                    backgroundColor: '#0f172a',
                });
                const link = document.createElement('a');
                link.download = `CanWin_ID_${user.custom_id || 'Card'}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            } catch (imgErr) {
                console.error('Image download also failed:', imgErr);
            }
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="space-y-3">
            {/* Professional ID Card */}
            <div
                ref={cardRef}
                className="relative overflow-hidden"
                style={{
                    background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
                    borderRadius: '16px',
                    padding: '0',
                    aspectRatio: '1.586',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05) inset',
                }}
            >
                {/* Holographic Effect Strip */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: levelStyle.gradient,
                    }}
                />

                {/* Decorative Pattern */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '150px',
                        height: '150px',
                        background: `radial-gradient(circle at top right, ${levelStyle.text}15 0%, transparent 70%)`,
                        borderRadius: '0 16px 0 100%',
                    }}
                />

                {/* Card Content */}
                <div style={{ padding: '16px', position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        {/* Logo & Organization */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: 'linear-gradient(135deg, #14b8a6 0%, #8b5cf6 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
                                }}
                            >
                                <span style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>C</span>
                            </div>
                            <div>
                                <div style={{ fontWeight: '700', fontSize: '14px', color: '#fff', letterSpacing: '2px' }}>CANWIN</div>
                                <div style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase' }}>Referral Partner</div>
                            </div>
                        </div>

                        {/* Level Badge */}
                        <div
                            style={{
                                background: levelStyle.gradient,
                                padding: '6px 12px',
                                borderRadius: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                            }}
                        >
                            <LevelIcon style={{ width: '14px', height: '14px', color: 'white' }} />
                            <span style={{ color: 'white', fontSize: '11px', fontWeight: '600' }}>{user.current_level}</span>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
                        {/* Photo */}
                        <div
                            style={{
                                width: '72px',
                                height: '72px',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                border: `2px solid ${levelStyle.text}`,
                                boxShadow: `0 0 20px ${levelStyle.text}30`,
                                flexShrink: 0,
                            }}
                        >
                            {user.avatar_url ? (
                                <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#334155' }}>
                                    <User style={{ width: '32px', height: '32px', color: '#64748b' }} />
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {user.full_name}
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: levelStyle.text, fontFamily: 'monospace', marginBottom: '8px', letterSpacing: '1px' }}>
                                {user.custom_id || 'PENDING'}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Phone style={{ width: '12px', height: '12px', color: '#64748b' }} />
                                    <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{user.whatsapp_number}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Calendar style={{ width: '12px', height: '12px', color: '#64748b' }} />
                                    <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{formatDOB(user.dob)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Stats Bar */}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '12px',
                            paddingTop: '12px',
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                        }}
                    >
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '16px', fontWeight: '700', color: '#14b8a6' }}>{user.total_points || 0}</div>
                                <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Points</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '16px', fontWeight: '700', color: '#f59e0b' }}>{user.paid_referrals || 0}</div>
                                <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Paid</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '16px', fontWeight: '700', color: '#22c55e' }}>{user.free_referrals || 0}</div>
                                <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Free</div>
                            </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase' }}>Member Since</div>
                            <div style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '500' }}>{formatJoinDate(user.created_at)}</div>
                        </div>
                    </div>
                </div>

                {/* Chip Design Element */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: '14px',
                        right: '14px',
                        width: '32px',
                        height: '24px',
                        background: 'linear-gradient(135deg, #ffd700 0%, #b8860b 100%)',
                        borderRadius: '4px',
                        opacity: 0.3,
                    }}
                >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', padding: '4px' }}>
                        {[...Array(6)].map((_, i) => (
                            <div key={i} style={{ background: 'rgba(0,0,0,0.3)', height: '6px', borderRadius: '1px' }} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Download Button */}
            <button
                onClick={downloadAsPDF}
                disabled={downloading}
                className="btn-secondary w-full flex items-center justify-center gap-2"
                style={{ padding: '12px' }}
            >
                {downloading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating PDF...
                    </>
                ) : (
                    <>
                        <Download className="w-5 h-5" />
                        Download ID Card
                    </>
                )}
            </button>
        </div>
    );
}
