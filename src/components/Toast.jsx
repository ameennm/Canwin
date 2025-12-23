import { CheckCircle, XCircle } from 'lucide-react';

export default function Toast({ message, type = 'success' }) {
    return (
        <div className={`toast ${type === 'success' ? 'toast-success' : 'toast-error'}`}>
            <div className="flex items-center gap-2">
                {type === 'success' ? (
                    <CheckCircle className="w-5 h-5" />
                ) : (
                    <XCircle className="w-5 h-5" />
                )}
                <span>{message}</span>
            </div>
        </div>
    );
}
