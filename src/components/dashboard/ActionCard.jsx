export default function ActionCard({ item, onSelect }) {
    const toneStyles = {
        danger: {
            border: 'border-red-200',
            bg: 'bg-red-50',
            text: 'text-red-600'
        },
        warning: {
            border: 'border-yellow-200',
            bg: 'bg-yellow-50',
            text: 'text-yellow-600'
        },
        neutral: {
            border: 'border-gray-200',
            bg: 'bg-gray-50',
            text: 'text-gray-600'
        }
    };

    const tone = toneStyles[item.tone] || toneStyles.neutral;

    return (
        <div
            onClick={() => onSelect(item.key)}
            className={`
                cursor-pointer
                rounded-2xl
                border
                ${tone.border}
                ${tone.bg}
                p-4
                transition
                hover:shadow-md
                hover:scale-[1.01]
            `}
        >
            <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium ${tone.text}`}>
                    {item.title}
                </span>

                <span className="text-lg font-semibold text-[#1d1d1f]">
                    {item.count}
                </span>
            </div>

            <p className="text-xs text-[#6e6e73]">
                {item.description}
            </p>
        </div>
    );


}