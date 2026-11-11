import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    ClipboardList,
    Croissant,
    PackageCheck,
    Wheat,
} from 'lucide-react';
import { dashboard, home, login } from '@/routes';

const workflow = [
    {
        number: '01',
        title: 'Plan the day.',
        detail: 'Start with a clearer view of what to bake, from everyday favorites to the next busy morning.',
        icon: ClipboardList,
    },
    {
        number: '02',
        title: 'Bake with care.',
        detail: 'Keep production, batches, and finished goods connected to the work happening in your bakery.',
        icon: Croissant,
    },
    {
        number: '03',
        title: 'Keep things in balance.',
        detail: 'Bring ingredient needs, stock, and replenishment planning into the daily conversation.',
        icon: PackageCheck,
    },
];

function BakeryIllustration() {
    return (
        <svg
            viewBox="0 0 500 500"
            fill="none"
            className="h-full w-full -translate-y-4 scale-[0.85] sm:translate-y-0 sm:scale-100"
            aria-hidden="true"
        >
            <defs>
                <linearGradient
                    id="loaf"
                    x1="133"
                    y1="170"
                    x2="350"
                    y2="375"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#E7B46E" />
                    <stop offset="1" stopColor="#B86539" />
                </linearGradient>
                <linearGradient
                    id="roll"
                    x1="291"
                    y1="269"
                    x2="390"
                    y2="377"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#F0CB8A" />
                    <stop offset="1" stopColor="#C17C43" />
                </linearGradient>
            </defs>
            <circle cx="260" cy="253" r="151" fill="#E4DBC7" />
            <circle
                cx="260"
                cy="253"
                r="126"
                stroke="#C7BDA7"
                strokeDasharray="2 9"
            />
            <ellipse
                cx="256"
                cy="374"
                rx="165"
                ry="20"
                fill="#C9BBA0"
                opacity=".4"
            />
            <path
                d="M94 357c66-16 121-8 161-3 60 9 104 2 158-5l-18 36c-110 18-199 17-289-3z"
                fill="#FAF4E7"
            />
            <path
                d="M110 369c97 9 198 13 284-6"
                stroke="#D9CCB4"
                strokeWidth="2"
            />
            <g transform="rotate(-30 221 268)">
                <rect
                    x="132"
                    y="157"
                    width="165"
                    height="229"
                    rx="82.5"
                    fill="url(#loaf)"
                />
                <path
                    d="M153 219c27-17 67-17 94-1M149 266c30-20 70-19 99-1M155 312c25-17 58-17 85-1"
                    stroke="#F8DCA6"
                    strokeWidth="16"
                    strokeLinecap="round"
                />
                <path
                    d="M151 224c26-13 63-14 90-2M148 271c27-14 63-14 92-2M155 317c23-12 52-12 77-2"
                    stroke="#A45C35"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity=".45"
                />
                <path
                    d="M165 182c-22 17-30 36-29 57"
                    stroke="#F3CE91"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity=".6"
                />
            </g>
            <ellipse
                cx="340"
                cy="336"
                rx="66"
                ry="54"
                transform="rotate(12 340 336)"
                fill="url(#roll)"
            />
            <path
                d="m317 302 43 63m-2-62-39 58"
                stroke="#FADEAA"
                strokeWidth="10"
                strokeLinecap="round"
            />
            <path
                d="m317 308 36 54m5-53-34 49"
                stroke="#A96D40"
                strokeWidth="2"
                strokeLinecap="round"
                opacity=".45"
            />
            <g
                stroke="#7D8567"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M351 257c12-49 22-88 34-126m-25 91 25-17m-20 0-11-26m16 9 25-16m-20 1-9-25m14 8 22-16m-17 1-5-23" />
                <path
                    d="M385 131c-3-12 0-22 7-31 3 13 0 23-7 31zm-16 57c8-11 17-15 27-14-7 11-15 15-27 14zm-4 17c-11-5-15-14-13-26 10 7 14 15 13 26z"
                    fill="#7D8567"
                />
            </g>
            <g fill="#F8E4BF" opacity=".85">
                <circle cx="183" cy="292" r="2" />
                <circle cx="202" cy="301" r="1.5" />
                <circle cx="237" cy="276" r="2" />
                <circle cx="254" cy="305" r="1.5" />
                <circle cx="291" cy="340" r="2" />
                <circle cx="376" cy="335" r="1.5" />
            </g>
        </svg>
    );
}

export default function Welcome() {
    const { auth } = usePage().props;
    const staffDestination = auth.user ? dashboard() : login();
    const staffLabel = auth.user ? 'Staff dashboard' : 'Staff login';
    const focus =
        'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#A64F35]';

    return (
        <>
            <Head title="Bakery operations">
                <meta
                    name="description"
                    content="SmartBaking brings sales, production, and ingredient planning into one bakery workspace. Explore the daily workflow or sign in to the staff area."
                />
            </Head>
            <div className="min-h-screen bg-[#FBF8F2] font-sans text-[#302920] selection:bg-[#E8C2A9]">
                <a
                    href="#main-content"
                    className={`sr-only z-50 rounded-md bg-white p-4 focus:not-sr-only focus:absolute focus:top-4 focus:left-4 ${focus}`}
                >
                    Skip to content
                </a>
                <header className="mx-auto flex min-h-24 max-w-7xl flex-wrap items-center justify-between gap-4 border-b border-[#E5DDD0] px-6 py-5 sm:px-10 sm:py-0">
                    <Link
                        href={home()}
                        aria-label="SmartBaking home"
                        className={`flex items-center gap-2.5 rounded-sm ${focus}`}
                    >
                        <Wheat
                            className="size-7 text-[#A64F35]"
                            aria-hidden="true"
                        />
                        <span className="text-xl font-semibold tracking-tight sm:text-2xl">
                            SmartBaking<span className="text-[#A64F35]">.</span>
                        </span>
                    </Link>
                    <nav
                        aria-label="Main navigation"
                        className="ml-auto flex items-center gap-7 text-sm font-medium lg:gap-10"
                    >
                        <a
                            href="#overview"
                            className={`hidden rounded-sm text-[#746A5C] transition-colors hover:text-[#A64F35] md:block ${focus}`}
                        >
                            Overview
                        </a>
                        <a
                            href="#workflow"
                            className={`hidden rounded-sm text-[#746A5C] transition-colors hover:text-[#A64F35] md:block ${focus}`}
                        >
                            The workflow
                        </a>
                        <Link
                            href={staffDestination}
                            className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-[#CEC1AF] px-4 transition-colors hover:border-[#A64F35] hover:bg-[#F2E8DC] sm:px-5 ${focus}`}
                        >
                            {staffLabel}
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                    </nav>
                </header>
                <main id="main-content">
                    <section
                        id="overview"
                        aria-labelledby="hero-title"
                        className="mx-auto grid max-w-7xl scroll-mt-6 items-center gap-12 px-6 pt-12 pb-16 sm:px-10 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-20 lg:pb-24"
                    >
                        <div>
                            <p className="mb-7 flex items-center gap-3 text-[11px] font-semibold tracking-[0.18em] text-[#8C543D] uppercase">
                                <span
                                    className="h-px w-8 bg-[#A64F35]"
                                    aria-hidden="true"
                                />
                                A little care. A clearer plan.
                            </p>
                            <h1
                                id="hero-title"
                                className="max-w-[12ch] font-[Georgia,serif] text-[clamp(3.2rem,6.6vw,5.7rem)] leading-[1.04] tracking-[-0.045em]"
                            >
                                A better day starts with a{' '}
                                <span className="text-[#A64F35] italic">
                                    smarter bake.
                                </span>
                            </h1>
                            <p className="mt-7 max-w-[29rem] text-base leading-8 text-[#746A5C] sm:text-lg">
                                A home for your bakery’s daily operations. Bring
                                sales, production, and ingredient planning
                                together, so you can focus on what comes out of
                                the oven.
                            </p>
                            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-5">
                                <Link
                                    href={staffDestination}
                                    className={`inline-flex min-h-13 items-center justify-center gap-3 rounded-full bg-[#A64F35] px-7 text-sm font-semibold text-white transition-colors hover:bg-[#87402B] ${focus}`}
                                >
                                    {auth.user
                                        ? 'Open your workspace'
                                        : 'Enter the staff area'}
                                    <ArrowRight
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </Link>
                                <Link
                                    href="/preview"
                                    className={`inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-medium underline decoration-[#CEC1AF] underline-offset-8 hover:decoration-[#A64F35] ${focus}`}
                                >
                                    Preview the workspace
                                    <ArrowRight
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </div>
                        </div>
                        <figure className="relative isolate mx-auto aspect-square w-full max-w-[510px] overflow-hidden rounded-[28px] rounded-tr-[120px] border border-[#DDD4C3] bg-[#EEE8DA] sm:rounded-tr-[150px]">
                            <div className="absolute top-7 left-7 z-10 flex items-center gap-2 text-[10px] font-semibold tracking-[0.15em] text-[#766D5D] uppercase sm:top-9 sm:left-9">
                                <span
                                    className="size-1.5 rounded-full bg-[#7D8567]"
                                    aria-hidden="true"
                                />
                                Made for bakery days
                            </div>
                            <BakeryIllustration />
                            <figcaption className="absolute right-7 bottom-7 left-7 flex items-end justify-between gap-4 border-t border-[#CFC4B0] pt-4 sm:right-9 sm:bottom-8 sm:left-9">
                                <span className="font-[Georgia,serif] text-lg leading-snug sm:text-xl">
                                    Good things take care.
                                    <br />
                                    <span className="text-[#8C543D] italic">
                                        And a thoughtful plan.
                                    </span>
                                </span>
                                <Wheat
                                    className="mb-1 size-7 shrink-0 text-[#7D8567]"
                                    aria-hidden="true"
                                />
                            </figcaption>
                        </figure>
                    </section>
                    <section
                        id="workflow"
                        aria-labelledby="workflow-title"
                        className="border-y border-[#E5DDD0] bg-[#F5F0E7]"
                    >
                        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10 sm:py-18">
                            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                                <div>
                                    <p className="mb-3 text-[11px] font-semibold tracking-[0.17em] text-[#8C543D] uppercase">
                                        The daily rhythm
                                    </p>
                                    <h2
                                        id="workflow-title"
                                        className="font-[Georgia,serif] text-3xl tracking-tight sm:text-4xl"
                                    >
                                        From the first plan to the last batch.
                                    </h2>
                                </div>
                                <p className="max-w-sm text-sm leading-7 text-[#746A5C]">
                                    A connected view of the everyday work that
                                    keeps a bakery moving.
                                </p>
                            </div>
                            <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
                                {workflow.map(
                                    ({ number, title, detail, icon: Icon }) => (
                                        <article
                                            key={number}
                                            className="border-t border-[#DCD1C0] pt-6"
                                        >
                                            <div className="mb-6 flex items-center justify-between text-[#A64F35]">
                                                <span className="font-[Georgia,serif] text-xl italic">
                                                    {number}
                                                </span>
                                                <Icon
                                                    className="size-5 text-[#7D8567]"
                                                    strokeWidth={1.5}
                                                    aria-hidden="true"
                                                />
                                            </div>
                                            <h3 className="text-lg font-semibold tracking-tight">
                                                {title}
                                            </h3>
                                            <p className="mt-3 max-w-sm text-sm leading-7 text-[#746A5C]">
                                                {detail}
                                            </p>
                                        </article>
                                    ),
                                )}
                            </div>
                        </div>
                    </section>
                    <section
                        aria-labelledby="staff-title"
                        className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 px-6 py-14 sm:px-10 sm:py-18 md:flex-row md:items-center"
                    >
                        <div>
                            <p className="mb-3 text-[11px] font-semibold tracking-[0.17em] text-[#8C543D] uppercase">
                                For the people behind every batch
                            </p>
                            <h2
                                id="staff-title"
                                className="font-[Georgia,serif] text-3xl tracking-tight sm:text-4xl"
                            >
                                Your bakery day starts here.
                            </h2>
                            <p className="mt-4 text-sm leading-7 text-[#746A5C]">
                                Staff and owners can sign in to their
                                SmartBaking workspace.
                            </p>
                        </div>
                        <Link
                            href={staffDestination}
                            className={`inline-flex min-h-12 shrink-0 items-center gap-4 rounded-full border border-[#CEC1AF] px-6 text-sm font-semibold transition-colors hover:bg-[#F2E8DC] ${focus}`}
                        >
                            {staffLabel}
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                    </section>
                </main>
                <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-[#E5DDD0] px-6 py-7 text-xs text-[#746A5C] sm:px-10">
                    <span className="font-medium text-[#302920]">
                        SmartBaking<span className="text-[#A64F35]">.</span>
                    </span>
                    <span>Made for the work. Inspired by the craft.</span>
                </footer>
            </div>
        </>
    );
}
