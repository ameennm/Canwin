export default function Spinner({ size = 'md' }) {
    const sizeClasses = {
        sm: 'w-5 h-5',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    return (
        <div className="flex items-center justify-center">
            <div className={`spinner ${sizeClasses[size]}`} />
        </div>
    );
}
