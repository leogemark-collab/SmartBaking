import { Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Bell,
    ChartNoAxesCombined,
    ChevronDown,
    CircleHelp,
    ClipboardList,
    Croissant,
    FlaskConical,
    LayoutDashboard,
    LogOut,
    Menu,
    Package,
    Search,
    Settings2,
    ShoppingBasket,
    Store,
    Truck,
    UsersRound,
    Wheat,
    type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    WorkspaceProvider,
    useWorkspace,
} from '@/components/workspace/workspace-provider';
import { branches, sampleDay, type Screen } from '@/lib/workspace';
import { cn } from '@/lib/utils';

const navigation: {
    label: string;
    items: {
        screen: Screen;
        label: string;
        icon: LucideIcon;
        detail: string;
    }[];
}[] = [
    {
        label: 'Workspace',
        items: [
            {
                screen: 'dashboard',
                label: 'Overview',
                icon: LayoutDashboard,
                detail: 'Sales, baking, and what needs attention',
            },
            {
                screen: 'pos',
                label: 'Point of sale',
                icon: ShoppingBasket,
                detail: 'Products, cart, cash, and demo checkout',
            },
            {
                screen: 'production',
                label: 'Production',
                icon: Croissant,
                detail: 'Daily bake plan and batch progress',
            },
        ],
    },
    {
        label: 'Plan & manage',
        items: [
            {
                screen: 'forecasts',
                label: 'Demand forecasts',
                icon: ChartNoAxesCombined,
                detail: 'Daily and hourly demand, holidays and payday',
            },
            {
                screen: 'inventory',
                label: 'Inventory',
                icon: Package,
                detail: 'Ingredients, recipes, and replenishment',
            },
            {
                screen: 'transfers',
                label: 'Stock transfers',
                icon: Truck,
                detail: 'Request, dispatch, and receive between branches',
            },
        ],
    },
    {
        label: 'Your business',
        items: [
            {
                screen: 'team',
                label: 'Team & attendance',
                icon: UsersRound,
                detail: 'Shift roster and sample check-ins',
            },
            {
                screen: 'reports',
                label: 'Reports',
                icon: ClipboardList,
                detail: 'Sales trends, product performance, and CSV export',
            },
        ],
    },
];

function Brand() {
    return (
        <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#a6533b] text-white">
                <Wheat className="size-5" aria-hidden="true" />
            </span>
            <div>
                <span className="text-lg font-semibold tracking-[-.05em]">
                    SmartBaking<span className="text-[#a6533b]">.</span>
                </span>
                <p className="mt-0.5 text-[8px] font-medium tracking-[.21em] text-[#a29280] uppercase">
                    A little care. A clearer plan.
                </p>
            </div>
        </div>
    );
}

function WorkspaceFrame({ children }: { children: ReactNode }) {
    const { branch, setBranch, preview, href } = useWorkspace();
    const { component, props } = usePage();
    const active = component.startsWith('settings/')
        ? 'settings'
        : component.split('/').pop();
    const [mobile, setMobile] = useState(false);
    const [search, setSearch] = useState(false);
    const [query, setQuery] = useState('');
    const [notices, setNotices] = useState(false);
    const [help, setHelp] = useState(false);
    const user = !preview ? props.auth?.user : null;
    const label =
        navigation
            .flatMap((group) => group.items)
            .find((item) => item.screen === active)?.label ??
        'Account settings';

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === 'k'
            ) {
                event.preventDefault();
                setSearch((value) => !value);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const nav = (
        <>
            <Link
                href={href('dashboard')}
                onClick={() => setMobile(false)}
                className="mx-6 mt-7 mb-8 block rounded-md"
            >
                <Brand />
            </Link>
            <div className="flex-1 space-y-6 px-3">
                {navigation.map((group) => (
                    <div key={group.label}>
                        <p className="mb-2 px-4 text-[9px] font-semibold tracking-[.13em] text-[#a69a8d] uppercase">
                            {group.label}
                        </p>
                        <nav aria-label={group.label} className="space-y-1">
                            {group.items.map((item) => (
                                <Link
                                    key={item.screen}
                                    href={href(item.screen)}
                                    onClick={() => setMobile(false)}
                                    aria-current={
                                        active === item.screen
                                            ? 'page'
                                            : undefined
                                    }
                                    className={cn(
                                        'group flex min-h-10 items-center gap-3 rounded-lg px-4 text-[12px] font-medium transition-colors',
                                        active === item.screen
                                            ? 'bg-[#f4e8df] text-[#a6533b]'
                                            : 'text-[#827567] hover:bg-[#f8f5ef] hover:text-[#6d4d36]',
                                    )}
                                >
                                    <item.icon
                                        className="size-[17px]"
                                        strokeWidth={1.7}
                                        aria-hidden="true"
                                    />
                                    <span>{item.label}</span>
                                    {item.screen === active && (
                                        <span className="ml-auto size-1 rounded-full bg-[#a6533b]" />
                                    )}
                                </Link>
                            ))}
                        </nav>
                    </div>
                ))}
            </div>
            <div className="mx-4 mt-8 rounded-xl border border-[#e7e0d5] bg-[#f8f5ee] p-3.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#6d7157]">
                    <FlaskConical className="size-3.5" />
                    Design preview
                </div>
                <p className="mt-1.5 text-[10px] leading-5 text-[#958775]">
                    A little look at what’s baking.
                    <br />
                    Sample data. No real transactions.
                </p>
                <Link
                    href="/"
                    className="mt-2 flex items-center gap-2 text-[10px] font-medium text-[#a6533b]"
                >
                    Back to website
                    <ArrowRight className="size-3" />
                </Link>
            </div>
            <div className="mx-4 mt-5 mb-4 flex items-center gap-3 border-t border-[#eee8de] pt-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eae8db] text-[11px] font-semibold text-[#737960]">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : 'DO'}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold">
                        {user?.name ?? 'Demo operator'}
                    </p>
                    <p className="mt-0.5 text-[9px] text-[#a09382]">
                        {preview
                            ? 'Public workspace preview'
                            : 'Staff workspace · sample data'}
                    </p>
                </div>
                {user ? (
                    <Link
                        href="/settings/profile"
                        aria-label="Account settings"
                        className="rounded-md p-1 text-[#9a8d7d]"
                    >
                        <Settings2 className="size-4" />
                    </Link>
                ) : (
                    <Link
                        href="/login"
                        aria-label="Staff login"
                        className="rounded-md p-1 text-[#9a8d7d]"
                    >
                        <LogOut className="size-4" />
                    </Link>
                )}
            </div>
        </>
    );

    return (
        <div className="workspace min-h-screen text-[#332c25] selection:bg-[#ead3c0]">
            <a
                href="#workspace-main"
                className="sr-only z-50 rounded-lg bg-white p-3 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
            >
                Skip to workspace
            </a>
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-[230px] flex-col overflow-y-auto border-r border-[#e9e4dc] bg-[#fffefa] lg:flex">
                {nav}
            </aside>
            <Dialog open={mobile} onOpenChange={setMobile}>
                <DialogContent className="workspace inset-y-0 left-0 flex h-dvh max-h-dvh w-[280px] max-w-[90vw] translate-x-0 translate-y-0 flex-col gap-0 overflow-y-auto rounded-none border-0 p-0 sm:max-w-[280px]">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Workspace navigation</DialogTitle>
                        <DialogDescription>
                            Browse SmartBaking’s sample workspace.
                        </DialogDescription>
                    </DialogHeader>
                    {nav}
                </DialogContent>
            </Dialog>
            <div className="min-w-0 lg:pl-[230px]">
                <header className="flex min-h-[77px] items-center justify-between gap-3 border-b border-[#e9e4dc] bg-[#fffefa] px-4 sm:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                        <button
                            type="button"
                            aria-label="Open navigation"
                            onClick={() => setMobile(true)}
                            className="rounded-md p-2 text-[#857868] lg:hidden"
                        >
                            <Menu className="size-5" />
                        </button>
                        <div className="hidden text-[11px] text-[#a39584] xl:block">
                            Workspace
                            <span className="mx-3 text-[#d1c7b9]">/</span>
                            <span className="text-[#6c5d4e]">{label}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSearch(true)}
                            className="flex items-center gap-2 rounded-lg border border-[#e8e1d7] bg-[#fbfaf7] px-3 py-2 text-[11px] text-[#a59887] xl:ml-6"
                            aria-label="Search workspace (Control K)"
                        >
                            <Search className="size-3.5" />
                            <span className="hidden sm:inline">
                                Find a workspace…
                            </span>
                            <kbd className="ml-3 hidden rounded border border-[#e5ddd0] px-1.5 text-[9px] sm:inline">
                                Ctrl K
                            </kbd>
                        </button>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <div className="flex min-w-0 items-center gap-2">
                            <Store className="hidden size-4 text-[#a0876d] sm:block" />
                            <select
                                value={branch}
                                onChange={(event) =>
                                    setBranch(event.target.value)
                                }
                                aria-label="Sample branch"
                                className="max-w-[140px] appearance-none rounded-md bg-transparent py-2 pr-1 text-[11px] font-medium sm:max-w-none"
                            >
                                {branches.map((value) => (
                                    <option key={value}>{value}</option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none -ml-1 size-3 text-[#9e907e]" />
                        </div>
                        <span className="h-5 w-px bg-[#e9e1d5]" />
                        <button
                            type="button"
                            onClick={() => setNotices(true)}
                            aria-label="Open sample notifications"
                            className="relative rounded-md p-2 text-[#8a7b69]"
                        >
                            <Bell className="size-[17px]" />
                            <span className="absolute top-1.5 right-2 size-1.5 rounded-full border border-white bg-[#a6533b]" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setHelp(true)}
                            aria-label="About this preview"
                            className="hidden rounded-md p-1 text-[#a09280] sm:block"
                        >
                            <CircleHelp className="size-[17px]" />
                        </button>
                    </div>
                </header>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-[#eee5d9] bg-[#f4efe5] px-4 py-2 text-[10px] leading-5 text-[#95816a] sm:px-8">
                    <span className="flex flex-wrap items-center gap-x-2">
                        <FlaskConical className="size-3" />
                        <strong className="font-semibold text-[#8b684f]">
                            Demo workspace
                        </strong>
                        <span>
                            Sample scenarios · Changes reset when you leave a
                            page or switch branch.
                        </span>
                    </span>
                    <span className="shrink-0 text-[#8d7f6b]">
                        Sample day · {sampleDay} · PHT
                    </span>
                </div>
                <main
                    id="workspace-main"
                    tabIndex={-1}
                    className="mx-auto max-w-[1680px] px-4 py-7 outline-none sm:px-8 sm:py-8"
                >
                    <div key={`${component}-${branch}`} className="ws-page">
                        {children}
                    </div>
                </main>
                <footer className="mx-4 flex flex-wrap justify-between gap-2 border-t border-[#e9e4dc] py-4 text-[9px] text-[#a29685] sm:mx-8">
                    <span>
                        SmartBaking · A better day, one batch at a time.
                    </span>
                    <span>
                        Synthetic data · Philippine peso (PHP) · Asia/Manila
                    </span>
                </footer>
            </div>
            <Dialog open={search} onOpenChange={setSearch}>
                <DialogContent className="workspace sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Find your workspace</DialogTitle>
                        <DialogDescription>
                            Jump to a SmartBaking module.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="relative">
                        <Search className="absolute top-3 left-3 size-4 text-[#9b8a78]" />
                        <input
                            className="ws-input pl-10!"
                            placeholder="Try inventory, bake plan, payday…"
                            aria-label="Search modules"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="max-h-80 space-y-1 overflow-y-auto">
                        {navigation
                            .flatMap((group) => group.items)
                            .filter((item) =>
                                `${item.label} ${item.detail}`
                                    .toLowerCase()
                                    .includes(query.toLowerCase()),
                            )
                            .map((item) => (
                                <Link
                                    key={item.screen}
                                    href={href(item.screen)}
                                    onClick={() => {
                                        setSearch(false);
                                        setQuery('');
                                    }}
                                    className="flex gap-3 rounded-lg p-3 hover:bg-[#f4ede2]"
                                >
                                    <item.icon className="mt-1 size-4 shrink-0 text-[#a6533b]" />
                                    <div>
                                        <p className="text-sm font-medium">
                                            {item.label}
                                        </p>
                                        <p className="mt-1 text-xs text-[#91816e]">
                                            {item.detail}
                                        </p>
                                    </div>
                                    <ArrowRight className="mt-1 ml-auto size-4 shrink-0 text-[#b9aa96]" />
                                </Link>
                            ))}
                        {!navigation
                            .flatMap((group) => group.items)
                            .some((item) =>
                                `${item.label} ${item.detail}`
                                    .toLowerCase()
                                    .includes(query.toLowerCase()),
                            ) && (
                            <p className="p-6 text-center text-sm text-[#91816e]">
                                No modules found. Try another term.
                            </p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            <Dialog open={notices} onOpenChange={setNotices}>
                <DialogContent className="workspace">
                    <DialogHeader>
                        <DialogTitle>A little attention needed</DialogTitle>
                        <DialogDescription>
                            Illustrative notifications for the sample day.
                        </DialogDescription>
                    </DialogHeader>
                    {[
                        {
                            title: 'Butter is below its safety level',
                            detail: 'Review the sample replenishment suggestion.',
                            screen: 'inventory' as Screen,
                        },
                        {
                            title: 'Your afternoon bake is coming up',
                            detail: 'Check the sample production board.',
                            screen: 'production' as Screen,
                        },
                        {
                            title: 'Payday is included in the outlook',
                            detail: 'Explore the daily demand scenario.',
                            screen: 'forecasts' as Screen,
                        },
                    ].map((item) => (
                        <Link
                            key={item.screen}
                            href={href(item.screen)}
                            onClick={() => setNotices(false)}
                            className="rounded-xl border border-[#e9e4dc] p-4 hover:bg-[#f8f4ec]"
                        >
                            <p className="text-sm font-semibold">
                                {item.title}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-[#8c7d6b]">
                                {item.detail}
                            </p>
                        </Link>
                    ))}
                </DialogContent>
            </Dialog>
            <Dialog open={help} onOpenChange={setHelp}>
                <DialogContent className="workspace">
                    <DialogHeader>
                        <DialogTitle>A little look at SmartBaking</DialogTitle>
                        <DialogDescription>
                            This is an interactive interface preview with
                            synthetic bakery records.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 text-sm leading-7 text-[#827462]">
                        <p>
                            Try a cash checkout, move a bake through production,
                            review ingredients, or explore a daily and hourly
                            forecast. Actions only change the current demo
                            screen.
                        </p>
                        <p>
                            No sales, stock, attendance, or purchase orders are
                            saved. Forecast charts illustrate the planned
                            workflow; they are not generated by a trained model.
                        </p>
                        <p>
                            Switch a sample branch using the selector above.
                            Press{' '}
                            <kbd className="rounded border px-1.5 text-xs">
                                Ctrl K
                            </kbd>{' '}
                            to jump between modules.
                        </p>
                    </div>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm font-medium text-[#a6533b]"
                    >
                        Go to the public homepage
                        <ArrowRight className="size-4" />
                    </Link>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
    return (
        <WorkspaceProvider>
            <WorkspaceFrame>{children}</WorkspaceFrame>
        </WorkspaceProvider>
    );
}
