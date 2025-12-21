import { useRef } from 'react';
import { Download, User, Zap, Phone, CreditCard } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function IDCard({ user }) {
    const cardRef = useRef(null);

    const handleDownload = async () => {
        if (!cardRef.current) return;

        try {
            const canvas = await html2canvas(cardRef.current, {
                scale: 2,
                backgroundColor: '#0f172a',
                useCORS: true,
                logging: false,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: [100, 65],
            });

            pdf.addImage(imgData, 'PNG', 0, 0, 100, 65);
            pdf.save(`CANWIN-${user.custom_id}.pdf`);
        } catch (error) {
            console.error('PDF Error:', error);
            alert('Could not generate PDF. Please try again.');
        }
    };

    function getLevelColor(level) {
        const colors = {
            Initiator: '#64748b',
            Advocate: '#3b82f6',
            Guardian: '#22c55e',
            Mentor: '#8b5cf6',
            Luminary: '#f59e0b',
        };
        return colors[level] || colors.Initiator;
    }

    function formatAadhar(aadhar) {
        if (!aadhar) return 'XXXX XXXX XXXX';
        const clean = aadhar.replace(/\D/g, '');
        return `${clean.slice(0, 4)} ${clean.slice(4, 8)} ${clean.slice(8, 12)}`;
    }

    return (
        <div>
            <div
                ref={cardRef}
                style={{
                    background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
                    border: '2px solid #334155',
                    borderRadius: '16px',
                    padding: '16px',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: 'linear-gradient(135deg, #14b8a6 0%, #8b5cf6 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>C</span>
                        </div>
                        <span style={{ fontWeight: 'bold', color: 'white', fontSize: '14px' }}>CANWIN</span>
                    </div>
                    <span style={{
                        background: getLevelColor(user.current_level),
                        color: 'white',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: '600',
                    }}>
                        {user.current_level}
                    </span>
                </div>

                {/* User Info */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    {/* Avatar */}
                    <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        border: '2px solid #14b8a6',
                        flexShrink: 0,
                    }}>
                        {user.avatar_url ? (
                            <img
                                src={user.avatar_url}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                crossOrigin="anonymous"
                            />
                        ) : (
                            <div style={{
                                width: '100%',
                                height: '100%',
                                background: '#334155',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <User style={{ width: '28px', height: '28px', color: '#64748b' }} />
                            </div>
                        )}
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            margin: '0 0 2px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {user.full_name}
                        </h4>
                        <p style={{
                            color: '#14b8a6',
                            fontFamily: 'monospace',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            margin: '0 0 6px'
                        }}>
                            {user.custom_id}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Zap style={{ width: '10px', height: '10px', color: '#f59e0b' }} />
                            <span style={{ color: '#f59e0b', fontSize: '11px', fontWeight: '600' }}>
                                {user.total_points || 0} Points
                            </span>
                        </div>
                    </div>
                </div>

                {/* Contact Details */}
                <div style={{
                    marginTop: '10px',
                    paddingTop: '10px',
                    borderTop: '1px solid #334155',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone style={{ width: '10px', height: '10px', color: '#64748b' }} />
                        <span style={{ color: '#94a3b8', fontSize: '10px' }}>
                            {user.whatsapp_number}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CreditCard style={{ width: '10px', height: '10px', color: '#64748b' }} />
                        <span style={{ color: '#94a3b8', fontSize: '10px', fontFamily: 'monospace' }}>
                            {formatAadhar(user.aadhar_number)}
                        </span>
                    </div>
                </div>
            </div>

            <button
                onClick={handleDownload}
                style={{
                    width: '100%',
                    marginTop: '12px',
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                }}
            >
                <Download style={{ width: '18px', height: '18px' }} />
                Download ID Card
            </button>
        </div>
    );
}
