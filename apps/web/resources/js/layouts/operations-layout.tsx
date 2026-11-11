import { Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    ChartNoAxesCombined,
    CircleHelp,
    ClipboardList,
    Croissant,
    Database,
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
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type ShellProps = {
    availableBranches?: { id: number; name: string; code: string }[];
    currentBranch?: { id: number; name: string } | null;
    capabilities?: { manage_catalog: boolean; can_bootstrap: boolean };
    screen?: string;
    period?: { from: string; to: string; timezone: string };
};
const modules = [
    { screen: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { screen: 'pos', label: 'Point of sale', icon: ShoppingBasket },
    { screen: 'production', label: 'Production', icon: Croissant },
    { screen: 'inventory', label: 'Inventory', icon: Package },
    {
        screen: 'forecasts',
        label: 'Demand forecasts',
        icon: ChartNoAxesCombined,
    },
    { screen: 'transfers', label: 'Stock transfers', icon: Truck },
    { screen: 'team', label: 'Team access', icon: UsersRound },
    { screen: 'reports', label: 'Reports', icon: ClipboardList },
];

export default function OperationsLayout({
    children,
}: {
    children: ReactNode;
}) {
    const page = usePage();
    const {
        availableBranches = [],
        currentBranch,
        capabilities,
        screen = 'settings',
        period,
    } = page.props as typeof page.props & ShellProps;
    const [mobile, setMobile] = useState(false);
    const [search, setSearch] = useState(false);
    const [query, setQuery] = useState('');
    const [help, setHelp] = useState(false);
    const user = page.props.auth?.user;
    const items =
        capabilities?.manage_catalog || capabilities?.can_bootstrap
            ? [
                  ...modules,
                  { screen: 'setup', label: 'Bakery setup', icon: Settings2 },
              ]
            : modules;
    const href = (target: string) =>
        `/${target}${currentBranch ? `?branch=${currentBranch.id}` : ''}`;
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
                className="mx-6 mt-7 mb-8 flex items-center gap-2.5 rounded-md"
            >
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#a6533b] text-white">
                    <Wheat className="size-5" />
                </span>
                <div>
                    <span className="text-lg font-semibold tracking-[-.05em]">
                        SmartBaking<span className="text-[#a6533b]">.</span>
                    </span>
                    <p className="text-[9px] text-[#8a7964]">
                        A little care. A clearer plan.
                    </p>
                </div>
            </Link>
            <nav
                aria-label="Bakery workspace"
                className="flex-1 space-y-1 px-3"
            >
                {items.map((item) => (
                    <Link
                        key={item.screen}
                        href={href(item.screen)}
                        onClick={() => setMobile(false)}
                        aria-current={
                            screen === item.screen ? 'page' : undefined
                        }
                        className={cn(
                            'flex min-h-11 items-center gap-3 rounded-lg px-4 text-xs font-medium transition-colors',
                            screen === item.screen
                                ? 'bg-[#f4e8df] text-[#a6533b]'
                                : 'text-[#786958] hover:bg-[#f8f5ef]',
                        )}
                    >
                        <item.icon className="size-[17px]" strokeWidth={1.7} />
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>
            <div className="mx-4 mt-6 rounded-xl border border-[#e5e7d9] bg-[#f2f4ea] p-4">
                <p className="flex items-center gap-2 text-xs font-semibold text-[#657553]">
                    <Database className="size-3.5" />
                    Your bakery records
                </p>
                <p className="mt-2 text-[10px] leading-5 text-[#748265]">
                    Sales, batches, and stock are saved to your database.
                </p>
                <Link
                    href="/preview"
                    className="mt-2 flex items-center gap-2 text-[10px] text-[#697e50]"
                >
                    Explore the separate demo
                    <ArrowRight className="size-3" />
                </Link>
            </div>
            <div className="mx-4 my-4 flex items-center gap-2 border-t border-[#e9e1d5] pt-4">
                <span className="flex size-8 items-center justify-center rounded-full bg-[#eae8db] text-[10px] font-semibold text-[#637251]">
                    {user?.name?.slice(0, 2).toUpperCase() ?? 'SB'}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium">
                        {user?.name ?? 'Staff account'}
                    </p>
                    <Link
                        href="/settings/profile"
                        className="text-[10px] text-[#887760]"
                    >
                        Account settings
                    </Link>
                </div>
                <Link
                    href="/logout"
                    method="post"
                    as="button"
                    aria-label="Log out"
                    className="rounded-md p-2 text-[#9a8065]"
                >
                    <LogOut className="size-4" />
                </Link>
            </div>
        </>
    );

    return (
        <div className="workspace min-h-screen text-[#332c25]">
            <a
                href="#workspace-main"
                className="sr-only z-50 rounded bg-white p-3 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
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
                            Browse your branch’s bakery records.
                        </DialogDescription>
                    </DialogHeader>
                    {nav}
                </DialogContent>
            </Dialog>
            <div className="lg:pl-[230px]">
                <header className="flex min-h-[77px] items-center justify-between gap-3 border-b border-[#e9e4dc] bg-[#fffefa] px-4 sm:px-8">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setMobile(true)}
                            aria-label="Open navigation"
                            className="rounded-md p-2 text-[#82705b] lg:hidden"
                        >
                            <Menu className="size-5" />
                        </button>
                        <span className="hidden text-xs text-[#83725b] xl:block">
                            {items.find((item) => item.screen === screen)
                                ?.label ?? 'Account settings'}
                        </span>
                        <button
                            type="button"
                            onClick={() => setSearch(true)}
                            aria-label="Search modules (Control K)"
                            className="flex items-center gap-2 rounded-lg border border-[#e4dbce] bg-[#faf8f3] px-3 py-2 text-[11px] text-[#8b7960] xl:ml-5"
                        >
                            <Search className="size-3.5" />
                            <span className="hidden sm:inline">
                                Find a workspace…
                            </span>
                            <kbd className="ml-2 hidden text-[9px] sm:inline">
                                Ctrl K
                            </kbd>
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <Store className="hidden size-4 text-[#a0876d] sm:block" />
                        {availableBranches.length ? (
                            <select
                                aria-label="Current branch"
                                value={currentBranch?.id ?? ''}
                                onChange={(event) => {
                                    const params = new URLSearchParams(
                                        page.url.split('?')[1],
                                    );
                                            params.set('branch', event.target.value);
                                            params.delete('receipt');
                                    router.get(
                                        `${page.url.split('?')[0]}?${params.toString()}`,
                                        {},
                                        {
                                            preserveState: false,
                                            preserveScroll: true,
                                        },
                                    );
                                }}
                                className="max-w-44 rounded-lg border border-[#e4dbce] bg-white px-3 py-2 text-xs"
                            >
                                {availableBranches.map((branch) => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <span className="text-xs text-[#8a7960]">
                                No branch selected
                            </span>
                        )}
                        <button
                            type="button"
                            aria-label="Workspace help"
                            onClick={() => setHelp(true)}
                            className="rounded-md p-2 text-[#88745a]"
                        >
                            <CircleHelp className="size-4" />
                        </button>
                    </div>
                </header>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e6e8dd] bg-[#f1f4ea] px-4 py-2 text-[10px] leading-5 text-[#687957] sm:px-8">
                    <span className="flex items-center gap-2">
                        <Database className="size-3" />
                        Database workspace · Real records · Forecasts wait for
                        validated history
                    </span>
                    <span>
                        {period
                            ? `${period.from}${period.to !== period.from ? ` – ${period.to}` : ''} · ${period.timezone}`
                            : 'Philippine peso · Asia/Manila'}
                    </span>
                </div>
                <main
                    id="workspace-main"
                    tabIndex={-1}
                    className="mx-auto max-w-[1680px] px-4 py-7 outline-none sm:px-8 sm:py-8"
                >
                    <div
                        key={`${screen}-${currentBranch?.id ?? 'none'}`}
                        className="ws-page"
                    >
                        {children}
                    </div>
                </main>
                <footer className="mx-4 flex flex-wrap justify-between gap-2 border-t border-[#e9e4dc] py-4 text-[10px] text-[#887760] sm:mx-8">
                    <Link href="/" className="flex items-center gap-1">
                        <ArrowLeft className="size-3" />
                        Public website
                    </Link>
                    <span>PHP · Asia/Manila · Connected through Laravel</span>
                </footer>
            </div>
            <Dialog open={search} onOpenChange={setSearch}>
                <DialogContent className="workspace max-h-[90dvh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Find your workspace</DialogTitle>
                        <DialogDescription>
                            Jump to a module in your selected branch.
                        </DialogDescription>
                    </DialogHeader>
                    <input
                        autoFocus
                        aria-label="Search modules"
                        className="ws-input"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search modules…"
                    />
                    <div className="space-y-1">
                        {items
                            .filter((item) =>
                                item.label
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
                                    className="flex items-center gap-3 rounded-lg p-3 text-sm hover:bg-[#f7f1e6]"
                                >
                                    <item.icon className="size-4 text-[#a6533b]" />
                                    {item.label}
                                    <ArrowRight className="ml-auto size-4 text-[#a58c6c]" />
                                </Link>
                            ))}
                        {!items.some((item) =>
                            item.label
                                .toLowerCase()
                                .includes(query.toLowerCase()),
                        ) && (
                            <p className="p-4 text-sm text-[#83725b]">
                                No modules match.
                            </p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            <Dialog open={help} onOpenChange={setHelp}>
                <DialogContent className="workspace">
                    <DialogHeader>
                        <DialogTitle>Your first bakery workflow</DialogTitle>
                        <DialogDescription>
                            Real data starts with a well-defined catalog.
                        </DialogDescription>
                    </DialogHeader>
                    <ol className="list-decimal space-y-3 pl-5 text-sm leading-6 text-[#7d6b53]">
                        <li>
                            Configure branches, products, ingredients, and
                            recipes in Bakery setup.
                        </li>
                        <li>Receive ingredients into the selected branch.</li>
                        <li>
                            Plan a batch. Starting mixing consumes ingredients;
                            completing baking adds its actual finished yield.
                        </li>
                        <li>
                            Record cash sales against available finished goods.
                        </li>
                    </ol>
                    <p className="text-xs leading-6 text-[#8a765c]">
                        Historical imports have a separate validation workflow.
                        Forecast training, transfers, attendance, returns,
                        expiry tracking, and offline synchronization are later
                        development steps.
                    </p>
                </DialogContent>
            </Dialog>
        </div>
    );
}
