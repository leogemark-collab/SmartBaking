import { PackageOpen, type LucideIcon } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageHeading({
    eyebrow,
    title,
    description,
    actions,
}: {
    eyebrow?: string;
    title: string;
    description?: string;
    actions?: ReactNode;
}) {
    return (
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
                {eyebrow && (
                    <p className="mb-2 text-[10px] font-semibold tracking-[.16em] text-[#9a775f] uppercase">
                        {eyebrow}
                    </p>
                )}
                <h1 className="text-[28px] font-semibold tracking-[-.045em] text-[#332c25] sm:text-[32px]">
                    {title}
                </h1>
                {description && (
                    <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#83786b]">
                        {description}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex flex-wrap items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    );
}

export function Panel({
    title,
    description,
    action,
    children,
    className,
}: {
    title?: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={cn(
                'min-w-0 rounded-2xl border border-[#e9e4dc] bg-white shadow-[0_2px_4px_#30292002]',
                className,
            )}
        >
            {(title || action) && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4 sm:px-6">
                    <div>
                        {title && (
                            <h2 className="text-[15px] font-semibold tracking-tight">
                                {title}
                            </h2>
                        )}
                        {description && (
                            <p className="mt-1 text-xs leading-5 text-[#8b8074]">
                                {description}
                            </p>
                        )}
                    </div>
                    {action}
                </div>
            )}
            {children}
        </section>
    );
}

export function StatCard({
    label,
    value,
    hint,
    icon: Icon,
    tone = 'neutral',
}: {
    label: string;
    value: ReactNode;
    hint?: ReactNode;
    icon?: LucideIcon;
    tone?: string;
}) {
    return (
        <div className="rounded-2xl border border-[#e9e4dc] bg-white p-5">
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-[#807568]">{label}</p>
                {Icon && (
                    <span
                        className={cn(
                            'flex size-8 items-center justify-center rounded-lg',
                            tone === 'green'
                                ? 'bg-[#edf1e9] text-[#647858]'
                                : tone === 'terra'
                                  ? 'bg-[#f9eee8] text-[#a6533b]'
                                  : 'bg-[#f6f3ed] text-[#99846a]',
                        )}
                    >
                        <Icon className="size-4" aria-hidden="true" />
                    </span>
                )}
            </div>
            <div className="mt-3 text-[27px] leading-tight font-semibold tracking-[-.04em] tabular-nums">
                {value}
            </div>
            {hint && (
                <div className="mt-3 text-[11px] leading-5 text-[#887e72]">
                    {hint}
                </div>
            )}
        </div>
    );
}

export function StatusBadge({
    children,
    tone = 'neutral',
}: {
    children: ReactNode;
    tone?: 'green' | 'amber' | 'red' | 'neutral' | 'terra';
}) {
    const tones = {
        green: 'bg-[#edf2e9] text-[#536c45]',
        amber: 'bg-[#fbf1df] text-[#94641f]',
        red: 'bg-[#fbeae5] text-[#a44432]',
        neutral: 'bg-[#f2f0ec] text-[#7c7265]',
        terra: 'bg-[#f8ebe4] text-[#a6533b]',
    };
    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] leading-4 font-semibold whitespace-nowrap',
                tones[tone],
            )}
        >
            {children}
        </span>
    );
}

export function EmptyState({
    title,
    description,
}: {
    title: string;
    description?: string;
}) {
    return (
        <div className="flex min-h-52 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <PackageOpen className="size-9 text-[#baa98e]" aria-hidden="true" />
            <p className="text-sm font-medium">{title}</p>
            {description && (
                <p className="max-w-xs text-xs leading-6 text-[#8b8074]">
                    {description}
                </p>
            )}
        </div>
    );
}

export function Field({
    label,
    children,
    hint,
}: {
    label: string;
    children: ReactNode;
    hint?: string;
}) {
    return (
        <label className="grid gap-2 text-xs font-medium text-[#665b50]">
            {label}
            {children}
            {hint && (
                <span className="text-[11px] leading-5 font-normal text-[#8b8074]">
                    {hint}
                </span>
            )}
        </label>
    );
}

/** Small vector product illustrations keep the synthetic catalog self-contained. */
export function ProductArt({
    kind = 'pandesal',
    className,
}: {
    kind?: string;
    className?: string;
}) {
    const id = useId();
    return (
        <svg
            viewBox="0 0 180 120"
            fill="none"
            className={cn('h-full w-full', className)}
            aria-hidden="true"
        >
            <defs>
                <linearGradient
                    id={id}
                    x1="65"
                    y1="25"
                    x2="114"
                    y2="100"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#eec288" />
                    <stop offset="1" stopColor="#c18249" />
                </linearGradient>
            </defs>
            <ellipse
                cx="90"
                cy="101"
                rx="57"
                ry="6"
                fill="#c7b18c"
                opacity=".19"
            />
            {kind === 'loaf' ? (
                <g>
                    <path
                        d="M42 51c0-21 25-29 48-24 21-4 48 5 48 26l-8 45H50z"
                        fill={`url(#${id})`}
                    />
                    <path
                        d="M53 50c22-9 50-10 73 0M57 62c21-9 44-9 66-1M59 75c19-8 38-8 60-1"
                        stroke="#f5d5a0"
                        strokeWidth="6"
                        strokeLinecap="round"
                    />
                    <path d="m50 86 79-1" stroke="#ad6c36" opacity=".3" />
                </g>
            ) : kind === 'croissant' ? (
                <g transform="rotate(-8 90 65)">
                    <path
                        d="M29 81c4-25 24-42 59-46 36-4 56 13 65 38-14 1-25-3-32-13-18 18-42 22-62 7-10 12-21 16-30 14"
                        fill={`url(#${id})`}
                    />
                    <path
                        d="m61 42 9 33m11-38 7 40m11-40 2 36m13-31-1 25"
                        stroke="#f7d59d"
                        strokeWidth="8"
                        strokeLinecap="round"
                    />
                </g>
            ) : kind === 'ensaymada' ? (
                <g>
                    <ellipse cx="90" cy="78" rx="43" ry="23" fill="#bd814b" />
                    <ellipse
                        cx="90"
                        cy="65"
                        rx="44"
                        ry="29"
                        fill={`url(#${id})`}
                    />
                    <path
                        d="M63 66c-3-16 25-25 43-15 24 15 0 31-19 23-17-8 6-17 11-7"
                        stroke="#f5d5a0"
                        strokeWidth="6"
                        strokeLinecap="round"
                    />
                    <path
                        d="m62 53 8 3m38-9 8 3M78 45l-3 7m36 17 8 2M62 77l9-1m24 8 3-7"
                        stroke="#fff0c3"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                </g>
            ) : kind === 'roll' ? (
                <g transform="rotate(-20 90 65)">
                    <rect
                        x="43"
                        y="40"
                        width="96"
                        height="47"
                        rx="23.5"
                        fill={`url(#${id})`}
                    />
                    <path
                        d="m73 43-6 40m31-41-5 44m30-41-5 37"
                        stroke="#f3d19c"
                        strokeWidth="6"
                        strokeLinecap="round"
                    />
                </g>
            ) : (
                <g>
                    <ellipse
                        cx="66"
                        cy="77"
                        rx="31"
                        ry="23"
                        fill={`url(#${id})`}
                    />
                    <ellipse
                        cx="109"
                        cy="68"
                        rx="35"
                        ry="27"
                        fill={`url(#${id})`}
                    />
                    <path
                        d="m92 50 23 30M50 64l21 25"
                        stroke="#f5d7a5"
                        strokeWidth="5"
                        strokeLinecap="round"
                    />
                    {[45, 54, 64, 87, 98, 118, 126].map((x, i) => (
                        <circle
                            key={x}
                            cx={x}
                            cy={56 + (i % 3) * 10}
                            r="1.2"
                            fill="#fff0c6"
                        />
                    ))}
                    {kind === 'cheese' && (
                        <path
                            d="m84 50 6-2m14 11 6 1m-56 9 7-2m57 4 4-2m-28 9 4 1"
                            stroke="#ffe7a0"
                            strokeWidth="4"
                            strokeLinecap="round"
                        />
                    )}
                </g>
            )}
        </svg>
    );
}
