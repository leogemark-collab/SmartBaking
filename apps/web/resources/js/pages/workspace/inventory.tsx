import { Head } from '@inertiajs/react';
import {
    ArrowDownToLine,
    ArrowRight,
    BookOpen,
    Check,
    ClipboardList,
    Download,
    FlaskConical,
    Leaf,
    Package,
    Plus,
    Search,
    ShoppingBag,
    TriangleAlert,
    Truck,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    EmptyState,
    Field,
    PageHeading,
    Panel,
    StatCard,
    StatusBadge,
} from '@/components/workspace/ui';
import { useWorkspace } from '@/components/workspace/workspace-provider';
import { currency, downloadCsv } from '@/lib/workspace';

type Ingredient = {
    id: string;
    name: string;
    unit: string;
    stock: number;
    safety: number;
    daily: number;
    lead: number;
    pack: number;
    cost: number;
    incoming: number;
    supplier: string;
};
const initialIngredients: Ingredient[] = [
    {
        id: 'flour',
        name: 'Bread flour',
        unit: 'kg',
        stock: 125,
        safety: 50,
        daily: 28,
        lead: 2,
        pack: 25,
        cost: 46,
        incoming: 50,
        supplier: 'Sample flour supplier',
    },
    {
        id: 'sugar',
        name: 'White sugar',
        unit: 'kg',
        stock: 38,
        safety: 15,
        daily: 8,
        lead: 2,
        pack: 10,
        cost: 78,
        incoming: 0,
        supplier: 'Sample dry goods supplier',
    },
    {
        id: 'butter',
        name: 'Butter',
        unit: 'kg',
        stock: 8,
        safety: 10,
        daily: 4,
        lead: 2,
        pack: 5,
        cost: 280,
        incoming: 0,
        supplier: 'Sample dairy supplier',
    },
    {
        id: 'milk',
        name: 'Fresh milk',
        unit: 'L',
        stock: 18,
        safety: 8,
        daily: 6,
        lead: 1,
        pack: 6,
        cost: 95,
        incoming: 0,
        supplier: 'Sample dairy supplier',
    },
    {
        id: 'yeast',
        name: 'Instant yeast',
        unit: 'kg',
        stock: 4,
        safety: 1,
        daily: 0.65,
        lead: 3,
        pack: 0.5,
        cost: 360,
        incoming: 0,
        supplier: 'Sample dry goods supplier',
    },
    {
        id: 'eggs',
        name: 'Fresh eggs',
        unit: 'pcs',
        stock: 240,
        safety: 90,
        daily: 60,
        lead: 1,
        pack: 30,
        cost: 7,
        incoming: 60,
        supplier: 'Sample farm supplier',
    },
    {
        id: 'salt',
        name: 'Iodized salt',
        unit: 'kg',
        stock: 8,
        safety: 3,
        daily: 1,
        lead: 2,
        pack: 1,
        cost: 25,
        incoming: 0,
        supplier: 'Sample dry goods supplier',
    },
];
const recipes = [
    {
        name: 'Classic pandesal',
        category: 'Everyday bread',
        yield: 120,
        ingredients: [
            { name: 'Bread flour', amount: 5, unit: 'kg' },
            { name: 'White sugar', amount: 0.75, unit: 'kg' },
            { name: 'Butter', amount: 0.25, unit: 'kg' },
            { name: 'Instant yeast', amount: 0.08, unit: 'kg' },
            { name: 'Iodized salt', amount: 0.06, unit: 'kg' },
            { name: 'Fresh milk', amount: 1, unit: 'L' },
        ],
    },
    {
        name: 'Cheese ensaymada',
        category: 'Sweet favorites',
        yield: 48,
        ingredients: [
            { name: 'Bread flour', amount: 2.5, unit: 'kg' },
            { name: 'White sugar', amount: 0.5, unit: 'kg' },
            { name: 'Butter', amount: 0.75, unit: 'kg' },
            { name: 'Fresh eggs', amount: 8, unit: 'pcs' },
            { name: 'Instant yeast', amount: 0.04, unit: 'kg' },
        ],
    },
    {
        name: 'Soft milk loaf',
        category: 'Loaves',
        yield: 12,
        ingredients: [
            { name: 'Bread flour', amount: 3, unit: 'kg' },
            { name: 'Fresh milk', amount: 1.5, unit: 'L' },
            { name: 'White sugar', amount: 0.3, unit: 'kg' },
            { name: 'Butter', amount: 0.2, unit: 'kg' },
            { name: 'Instant yeast', amount: 0.04, unit: 'kg' },
        ],
    },
];
const quantity = (value: number) =>
    new Intl.NumberFormat('en-PH', { maximumFractionDigits: 3 }).format(value);
const dateLabel = (offset: number) => `${11 + offset} Nov`;
function outlook(item: Ingredient) {
    let balance = item.stock;
    let safetyDay: number | null = balance < item.safety ? 0 : null;
    let shortageDay: number | null = null;
    const balances: number[] = [];
    for (let day = 1; day <= 7; day++) {
        balance += (day === 1 ? item.incoming : 0) - item.daily;
        balances.push(balance);
        if (safetyDay === null && balance < item.safety) safetyDay = day;
        if (shortageDay === null && balance < 0) shortageDay = day;
    }
    const order = Math.max(
        0,
        Math.ceil(
            (item.daily * 7 + item.safety - item.stock - item.incoming) /
                item.pack,
        ) * item.pack,
    );
    const due = safetyDay === null ? null : safetyDay - item.lead;
    return { safetyDay, shortageDay, order, due, balances };
}

export default function Inventory() {
    const { branch } = useWorkspace();
    const [tab, setTab] = useState<'ingredients' | 'recipes' | 'replenishment'>(
        'ingredients',
    );
    const [ingredients, setIngredients] = useState(initialIngredients);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [receive, setReceive] = useState(false);
    const [ingredientId, setIngredientId] = useState('butter');
    const [received, setReceived] = useState('');
    const [reference, setReference] = useState('');
    const [error, setError] = useState('');
    const [receipts, setReceipts] = useState<
        { name: string; amount: string; reference: string }[]
    >([]);
    const [selectedRecipe, setSelectedRecipe] = useState<number | null>(null);
    const [batches, setBatches] = useState('1');
    const [drafts, setDrafts] = useState<string[]>([]);
    const [orderDetail, setOrderDetail] = useState<Ingredient | null>(null);
    const selected = ingredients.find((item) => item.id === ingredientId)!;
    const low = ingredients.filter((item) => item.stock < item.safety).length;
    const reviewSoon = ingredients.filter((item) => {
        const plan = outlook(item);
        return plan.safetyDay !== null && plan.safetyDay <= item.lead + 1;
    });
    const filtered = ingredients.filter(
        (item) =>
            item.name.toLowerCase().includes(search.toLowerCase()) &&
            (filter === 'all' ||
                (filter === 'low'
                    ? item.stock < item.safety
                    : item.incoming > 0)),
    );
    const recipe = selectedRecipe === null ? null : recipes[selectedRecipe];
    const batchCount = Number(batches);
    const validBatches =
        Number.isSafeInteger(batchCount) && batchCount > 0 && batchCount <= 100;

    function receiveStock(event: FormEvent) {
        event.preventDefault();
        const amount = Number(received);
        if (
            !Number.isFinite(amount) ||
            amount <= 0 ||
            amount > 100000 ||
            (selected.unit === 'pcs' && !Number.isInteger(amount)) ||
            Math.abs(amount * 1000 - Math.round(amount * 1000)) > 0.00001
        ) {
            setError(
                `Enter a positive ${selected.unit === 'pcs' ? 'whole number' : 'quantity with at most 3 decimals'} up to 100,000 ${selected.unit}.`,
            );
            return;
        }
        setIngredients((items) =>
            items.map((item) =>
                item.id === ingredientId
                    ? {
                          ...item,
                          stock:
                              Math.round((item.stock + amount) * 1000) / 1000,
                      }
                    : item,
            ),
        );
        setReceipts((items) => [
            {
                name: selected.name,
                amount: `${quantity(amount)} ${selected.unit}`,
                reference: reference.trim() || 'Manual demo receipt',
            },
            ...items,
        ]);
        setReceive(false);
        setReceived('');
        setReference('');
        setError('');
        toast.success(
            'Demo receipt recorded on this screen. No inventory was saved.',
        );
    }

    function exportInventory() {
        downloadCsv('smartbaking-demo-inventory.csv', [
            ['SYNTHETIC DEMO ONLY', branch, '11 Nov 2026 PHT'],
            [
                'Ingredient',
                'Usable quantity',
                'Unit',
                'Safety stock',
                'Incoming 12 Nov',
            ],
            ...ingredients.map((item) => [
                item.name,
                item.stock,
                item.unit,
                item.safety,
                item.incoming,
            ]),
        ]);
        toast.success('Sample inventory CSV downloaded.');
    }

    return (
        <>
            <Head title="Inventory" />
            <PageHeading
                eyebrow="A well-stocked kitchen"
                title="A little of everything, in balance."
                description="Keep ingredients, recipes, and replenishment in one thoughtful place."
                actions={
                    <>
                        <Button
                            variant="outline"
                            onClick={exportInventory}
                            className="text-xs"
                        >
                            <Download />
                            Export sample
                        </Button>
                        <Button
                            onClick={() => {
                                setReceive(true);
                                setError('');
                            }}
                            className="text-xs"
                        >
                            <Plus />
                            Receive stock
                        </Button>
                    </>
                }
            />
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Tracked ingredients"
                    value={ingredients.length}
                    hint="Usable stock only · sample branch"
                    icon={Package}
                />
                <StatCard
                    label="Below safety stock"
                    value={low}
                    hint="Review before the next bake"
                    tone="terra"
                    icon={TriangleAlert}
                />
                <StatCard
                    label="Incoming deliveries"
                    value={
                        ingredients.filter((item) => item.incoming > 0).length
                    }
                    hint="Sample receipts assumed due 12 Nov"
                    tone="green"
                    icon={Truck}
                />
                <StatCard
                    label="Ingredient stock value"
                    value={currency(
                        ingredients.reduce(
                            (sum, item) => sum + item.stock * item.cost,
                            0,
                        ),
                    )}
                    hint="Illustrative unit costs · no accounting ledger"
                    icon={ShoppingBag}
                />
            </div>
            <div
                className="mb-6 flex w-fit max-w-full flex-wrap gap-1 rounded-xl border border-[#e9e4dc] bg-[#efede7] p-1.5"
                aria-label="Inventory views"
            >
                {(
                    [
                        {
                            id: 'ingredients',
                            label: 'Ingredients',
                            icon: Package,
                        },
                        {
                            id: 'recipes',
                            label: 'Recipe library',
                            icon: BookOpen,
                        },
                        {
                            id: 'replenishment',
                            label: 'Replenishment',
                            icon: ClipboardList,
                        },
                    ] as const
                ).map((item) => (
                    <button
                        type="button"
                        key={item.id}
                        aria-pressed={tab === item.id}
                        className="ws-tab flex items-center gap-2"
                        onClick={() => setTab(item.id)}
                    >
                        <item.icon className="size-3.5" />
                        {item.label}
                    </button>
                ))}
            </div>
            {tab === 'ingredients' && (
                <Panel
                    title="Your pantry, at a glance"
                    description={`${branch} · synthetic quantities · kg, L, and pieces kept separate`}
                    action={
                        <StatusBadge tone="amber">
                            {reviewSoon.length} need a planning review
                        </StatusBadge>
                    }
                >
                    <div className="flex flex-wrap gap-3 border-b border-[#eee9e1] px-6 pb-5">
                        <div className="relative min-w-44 flex-1">
                            <Search className="absolute top-3 left-3 size-4 text-[#ae9c86]" />
                            <input
                                className="ws-input pl-10!"
                                aria-label="Search ingredients"
                                placeholder="Find an ingredient…"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                            />
                        </div>
                        <select
                            className="ws-input w-auto!"
                            aria-label="Ingredient status"
                            value={filter}
                            onChange={(event) => setFilter(event.target.value)}
                        >
                            <option value="all">All ingredients</option>
                            <option value="low">Below safety stock</option>
                            <option value="incoming">
                                With incoming delivery
                            </option>
                        </select>
                    </div>
                    {filtered.length ? (
                        <div className="overflow-x-auto">
                            <table className="ws-table">
                                <caption className="sr-only">
                                    Sample usable ingredient inventory
                                </caption>
                                <thead>
                                    <tr>
                                        <th>Ingredient</th>
                                        <th>Usable stock</th>
                                        <th>Safety stock</th>
                                        <th>Incoming</th>
                                        <th>Supplier lead time</th>
                                        <th>Status</th>
                                        <th>
                                            <span className="sr-only">
                                                Action
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((item) => (
                                        <tr key={item.id}>
                                            <td>
                                                <div className="flex items-center gap-3 whitespace-nowrap">
                                                    <span className="flex size-9 items-center justify-center rounded-lg bg-[#f4f1e9] text-[#9d8c6e]">
                                                        <Leaf className="size-4" />
                                                    </span>
                                                    <div>
                                                        <p className="font-medium">
                                                            {item.name}
                                                        </p>
                                                        <p className="mt-1 text-[9px] text-[#a19482]">
                                                            {item.supplier}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="font-medium whitespace-nowrap tabular-nums">
                                                {quantity(item.stock)}{' '}
                                                {item.unit}
                                            </td>
                                            <td className="whitespace-nowrap text-[#938570]">
                                                {quantity(item.safety)}{' '}
                                                {item.unit}
                                            </td>
                                            <td className="whitespace-nowrap text-[#7d896a]">
                                                {item.incoming
                                                    ? `+${item.incoming} ${item.unit} · 12 Nov`
                                                    : '—'}
                                            </td>
                                            <td className="whitespace-nowrap text-[#938570]">
                                                {item.lead} calendar{' '}
                                                {item.lead === 1
                                                    ? 'day'
                                                    : 'days'}
                                            </td>
                                            <td>
                                                <StatusBadge
                                                    tone={
                                                        item.stock < item.safety
                                                            ? 'red'
                                                            : item.id === 'milk'
                                                              ? 'amber'
                                                              : 'green'
                                                    }
                                                >
                                                    {item.stock < item.safety
                                                        ? 'Below safety'
                                                        : item.id === 'milk'
                                                          ? 'Review soon'
                                                          : 'In balance'}
                                                </StatusBadge>
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    aria-label={`Receive ${item.name}`}
                                                    className="rounded-lg border border-[#e9e1d5] p-2 text-[#a18463] hover:bg-[#faf5ed]"
                                                    onClick={() => {
                                                        setIngredientId(
                                                            item.id,
                                                        );
                                                        setReceive(true);
                                                        setError('');
                                                    }}
                                                >
                                                    <ArrowDownToLine className="size-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyState
                            title="No ingredients match"
                            description="Try a different search or status filter."
                        />
                    )}
                    <p className="border-t border-[#eee9e1] px-6 py-4 text-[10px] leading-5 text-[#a0917d]">
                        Raw ingredients are consumed during production.
                        Point-of-sale transactions deduct finished goods only.
                        These screens use independent demo scenarios.
                    </p>
                </Panel>
            )}
            {tab === 'recipes' && (
                <>
                    <div className="mb-5 flex gap-3 rounded-xl border border-[#e5e7d8] bg-[#f2f5e9] p-4 text-[#71805c]">
                        <FlaskConical className="mt-0.5 size-4 shrink-0" />
                        <p className="text-xs leading-6">
                            Recipes turn a bake plan into ingredient
                            requirements. These simplified sample recipes
                            illustrate batch yield and units; they are not
                            validated bakery formulations.
                        </p>
                    </div>
                    <div className="grid gap-5 md:grid-cols-3">
                        {recipes.map((item, index) => (
                            <Panel key={item.name}>
                                <div className="p-6">
                                    <span className="mb-5 inline-flex size-10 items-center justify-center rounded-xl bg-[#f4ede0] text-[#b39467]">
                                        <BookOpen className="size-5" />
                                    </span>
                                    <p className="text-[9px] tracking-[.1em] text-[#ab9b87] uppercase">
                                        {item.category} · sample v1
                                    </p>
                                    <h2 className="mt-2 text-lg font-semibold tracking-tight">
                                        {item.name}
                                    </h2>
                                    <p className="mt-2 text-xs text-[#92836e]">
                                        {item.yield} pieces / batch ·{' '}
                                        {item.ingredients.length} ingredients
                                    </p>
                                    <div className="my-5 border-t border-[#eee8de] pt-4 text-[11px] leading-6 text-[#a09380]">
                                        {item.ingredients
                                            .slice(0, 3)
                                            .map(
                                                (ingredient) => ingredient.name,
                                            )
                                            .join(' · ')}
                                        …
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="w-full text-xs"
                                        onClick={() => {
                                            setSelectedRecipe(index);
                                            setBatches('1');
                                        }}
                                    >
                                        View & scale recipe
                                        <ArrowRight />
                                    </Button>
                                </div>
                            </Panel>
                        ))}
                    </div>
                </>
            )}
            {tab === 'replenishment' && (
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
                    <Panel
                        title="A little planning goes a long way"
                        description="7-day sample material plan · issued 11 Nov 2026, 12 PM PHT"
                    >
                        <div className="mx-6 mb-5 rounded-lg bg-[#f8f5ee] p-3 text-[10px] leading-6 text-[#9a8569]">
                            Assumed daily recipe requirements stay constant.
                            Incoming flour (50 kg) and eggs (60 pcs) arrive
                            before use on 12 Nov. No waste or expiry assumed.
                            Calendar-day supplier lead times; order packs
                            rounded up.
                        </div>
                        <div className="overflow-x-auto">
                            <table className="ws-table">
                                <caption className="sr-only">
                                    Illustrative replenishment estimates
                                </caption>
                                <thead>
                                    <tr>
                                        <th>Ingredient</th>
                                        <th>Below safety</th>
                                        <th>First unmet use</th>
                                        <th>Order by</th>
                                        <th>Suggested order</th>
                                        <th>Review</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ingredients.map((item) => {
                                        const plan = outlook(item);
                                        return (
                                            <tr key={item.id}>
                                                <td className="whitespace-nowrap">
                                                    <p className="font-medium">
                                                        {item.name}
                                                    </p>
                                                    <p className="mt-1 text-[9px] text-[#9c8e79]">
                                                        {quantity(item.daily)}{' '}
                                                        {item.unit} / day
                                                        assumed
                                                    </p>
                                                </td>
                                                <td className="whitespace-nowrap">
                                                    {plan.safetyDay === null
                                                        ? 'Beyond 7 days'
                                                        : plan.safetyDay === 0
                                                          ? 'Already below'
                                                          : dateLabel(
                                                                plan.safetyDay,
                                                            )}
                                                </td>
                                                <td className="whitespace-nowrap text-[#a6533b]">
                                                    {plan.shortageDay === null
                                                        ? 'Beyond 7 days'
                                                        : dateLabel(
                                                              plan.shortageDay,
                                                          )}
                                                </td>
                                                <td className="whitespace-nowrap">
                                                    {plan.due === null
                                                        ? 'Later review'
                                                        : plan.due <= 0
                                                          ? 'Review today'
                                                          : dateLabel(plan.due)}
                                                </td>
                                                <td className="font-medium whitespace-nowrap">
                                                    {quantity(plan.order)}{' '}
                                                    {item.unit}
                                                </td>
                                                <td>
                                                    <Button
                                                        variant="ghost"
                                                        className="h-8 text-xs text-[#a6533b]"
                                                        onClick={() =>
                                                            setOrderDetail(item)
                                                        }
                                                    >
                                                        Review
                                                        <ArrowRight className="size-3" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <p className="border-t border-[#eee9e1] px-6 py-4 text-[10px] leading-5 text-[#a0917d]">
                            Safety stock is a buffer. “First unmet use” means
                            projected stock cannot cover that day’s full
                            requirement. Advisory quantities do not place
                            orders.
                        </p>
                    </Panel>
                    <div className="space-y-5">
                        <Panel
                            title="Demo purchase list"
                            action={
                                <StatusBadge>
                                    {drafts.length} drafts
                                </StatusBadge>
                            }
                        >
                            {drafts.length ? (
                                <div className="space-y-3 px-6 pb-5">
                                    {drafts.map((id) => {
                                        const item = ingredients.find(
                                            (ingredient) =>
                                                ingredient.id === id,
                                        )!;
                                        return (
                                            <div
                                                key={id}
                                                className="flex items-center justify-between gap-2 rounded-lg border border-[#e9e4dc] p-3"
                                            >
                                                <div>
                                                    <p className="text-xs font-medium">
                                                        {item.name}
                                                    </p>
                                                    <p className="mt-1 text-[10px] text-[#9b8971]">
                                                        {quantity(
                                                            outlook(item).order,
                                                        )}{' '}
                                                        {item.unit} · draft
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    aria-label={`Remove ${item.name} from demo purchase list`}
                                                    className="text-[10px] text-[#a6533b]"
                                                    onClick={() =>
                                                        setDrafts((values) =>
                                                            values.filter(
                                                                (value) =>
                                                                    value !==
                                                                    id,
                                                            ),
                                                        )
                                                    }
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        );
                                    })}
                                    <Button
                                        variant="outline"
                                        className="w-full text-xs"
                                        onClick={() =>
                                            downloadCsv(
                                                'smartbaking-demo-purchase-drafts.csv',
                                                [
                                                    [
                                                        'SYNTHETIC DEMO ONLY',
                                                        branch,
                                                    ],
                                                    [
                                                        'Ingredient',
                                                        'Quantity',
                                                        'Unit',
                                                        'Status',
                                                    ],
                                                    ...drafts.map((id) => {
                                                        const item =
                                                            ingredients.find(
                                                                (value) =>
                                                                    value.id ===
                                                                    id,
                                                            )!;
                                                        return [
                                                            item.name,
                                                            outlook(item).order,
                                                            item.unit,
                                                            'Demo draft - not sent',
                                                        ];
                                                    }),
                                                ],
                                            )
                                        }
                                    >
                                        <Download />
                                        Export drafts
                                    </Button>
                                </div>
                            ) : (
                                <EmptyState
                                    title="Room for your next order"
                                    description="Review a suggestion to add a draft. Nothing is sent to a supplier."
                                />
                            )}
                        </Panel>
                        <div className="rounded-xl border border-[#e7e9db] bg-[#f1f4e9] p-5">
                            <p className="flex items-center gap-2 text-xs font-semibold text-[#6c7d54]">
                                <Leaf className="size-4" />
                                Plan with a little care.
                            </p>
                            <p className="mt-2 text-[11px] leading-6 text-[#889475]">
                                Check shelf life, supplier availability, and
                                storage space before ordering. This sample uses
                                a seven-day target and does not optimize
                                perishability.
                            </p>
                        </div>
                    </div>
                </div>
            )}
            {receipts.length > 0 && (
                <div className="mt-5">
                    <Panel
                        title="Receipts in this demo session"
                        description="Local changes on this screen only"
                    >
                        <div className="overflow-x-auto">
                            <table className="ws-table">
                                <thead>
                                    <tr>
                                        <th>Ingredient</th>
                                        <th>Received</th>
                                        <th>Reference</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {receipts.map((item, index) => (
                                        <tr key={index}>
                                            <td>{item.name}</td>
                                            <td>{item.amount}</td>
                                            <td className="max-w-64 break-words">
                                                {item.reference}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Panel>
                </div>
            )}
            <Dialog open={receive} onOpenChange={setReceive}>
                <DialogContent className="workspace">
                    <DialogHeader>
                        <DialogTitle>Receive a little more</DialogTitle>
                        <DialogDescription>
                            Try an ingredient receipt for {branch}. Only this
                            demo screen changes.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={receiveStock} className="space-y-4">
                        <Field label="Ingredient">
                            <select
                                className="ws-input"
                                value={ingredientId}
                                onChange={(event) => {
                                    setIngredientId(event.target.value);
                                    setError('');
                                }}
                            >
                                {ingredients.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name} ({item.unit})
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field
                            label={`Quantity received (${selected.unit})`}
                            hint={`Currently ${quantity(selected.stock)} ${selected.unit} usable. Adds a new receipt; existing scheduled deliveries stay unchanged.`}
                        >
                            <input
                                className="ws-input"
                                type="number"
                                min={selected.unit === 'pcs' ? 1 : 0.001}
                                max="100000"
                                step={selected.unit === 'pcs' ? 1 : 0.001}
                                required
                                value={received}
                                onChange={(event) => {
                                    setReceived(event.target.value);
                                    setError('');
                                }}
                                aria-invalid={!!error}
                                aria-describedby={
                                    error ? 'receipt-error' : undefined
                                }
                            />
                        </Field>
                        <Field label="Delivery reference (optional)">
                            <input
                                className="ws-input"
                                maxLength={80}
                                value={reference}
                                onChange={(event) =>
                                    setReference(event.target.value)
                                }
                                placeholder="e.g. SAMPLE-DR-001"
                            />
                        </Field>
                        {error && (
                            <p
                                id="receipt-error"
                                role="alert"
                                className="text-xs text-[#b34a38]"
                            >
                                {error}
                            </p>
                        )}
                        <Button type="submit" className="w-full">
                            <ArrowDownToLine />
                            Record demo receipt
                        </Button>
                        <p className="text-[10px] leading-5 text-[#a0917d]">
                            No database, purchase order, or supplier record is
                            updated.
                        </p>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog
                open={recipe !== null}
                onOpenChange={(open) => {
                    if (!open) setSelectedRecipe(null);
                }}
            >
                <DialogContent className="workspace">
                    <DialogHeader>
                        <DialogTitle>{recipe?.name}</DialogTitle>
                        <DialogDescription>
                            Simplified sample recipe v1 · {recipe?.yield} pcs
                            per batch.
                        </DialogDescription>
                    </DialogHeader>
                    {recipe && (
                        <>
                            <Field label="Number of batches (1–100)">
                                <input
                                    className="ws-input"
                                    type="number"
                                    min="1"
                                    max="100"
                                    step="1"
                                    value={batches}
                                    onChange={(event) =>
                                        setBatches(event.target.value)
                                    }
                                    aria-invalid={!validBatches}
                                />
                            </Field>
                            {validBatches ? (
                                <>
                                    <div className="rounded-lg bg-[#f5f1e8] p-3 text-xs text-[#8e7556]">
                                        Planned yield:{' '}
                                        <strong>
                                            {quantity(
                                                recipe.yield * batchCount,
                                            )}{' '}
                                            pieces
                                        </strong>{' '}
                                        · no stock deducted
                                    </div>
                                    <table className="w-full text-xs">
                                        <caption className="sr-only">
                                            Sample scaled ingredient
                                            requirements
                                        </caption>
                                        <thead>
                                            <tr className="text-left text-[#998a76]">
                                                <th className="py-2 font-normal">
                                                    Ingredient
                                                </th>
                                                <th className="text-right font-normal">
                                                    Requirement
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recipe.ingredients.map((item) => (
                                                <tr
                                                    key={item.name}
                                                    className="border-t border-[#eee8de]"
                                                >
                                                    <td className="py-3">
                                                        {item.name}
                                                    </td>
                                                    <td className="text-right font-medium tabular-nums">
                                                        {quantity(
                                                            item.amount *
                                                                batchCount,
                                                        )}{' '}
                                                        {item.unit}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            ) : (
                                <p
                                    role="alert"
                                    className="text-xs text-[#b34a38]"
                                >
                                    Enter a whole number of batches from 1 to
                                    100.
                                </p>
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={orderDetail !== null}
                onOpenChange={(open) => {
                    if (!open) setOrderDetail(null);
                }}
            >
                <DialogContent className="workspace">
                    <DialogHeader>
                        <DialogTitle>
                            {orderDetail?.name} · replenishment review
                        </DialogTitle>
                        <DialogDescription>
                            Illustrative plan for {branch}; no supplier will be
                            contacted.
                        </DialogDescription>
                    </DialogHeader>
                    {orderDetail &&
                        (() => {
                            const plan = outlook(orderDetail);
                            return (
                                <>
                                    <div className="rounded-xl bg-[#f6f2e9] p-4">
                                        <p className="text-[10px] tracking-wider text-[#9b876b] uppercase">
                                            Suggested sample order
                                        </p>
                                        <p className="mt-2 text-3xl font-semibold tracking-tight">
                                            {quantity(plan.order)}{' '}
                                            <span className="text-base font-normal text-[#9c8a71]">
                                                {orderDetail.unit}
                                            </span>
                                        </p>
                                        <p className="mt-2 text-[11px] leading-6 text-[#9a8569]">
                                            7 days ×{' '}
                                            {quantity(orderDetail.daily)}{' '}
                                            {orderDetail.unit} +{' '}
                                            {quantity(orderDetail.safety)}{' '}
                                            {orderDetail.unit} safety −{' '}
                                            {quantity(orderDetail.stock)}{' '}
                                            {orderDetail.unit} usable −{' '}
                                            {quantity(orderDetail.incoming)}{' '}
                                            {orderDetail.unit} incoming. Rounded
                                            up to {quantity(orderDetail.pack)}{' '}
                                            {orderDetail.unit} packs.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <p className="text-[#a2917b]">
                                                Lead time
                                            </p>
                                            <p className="mt-1">
                                                {orderDetail.lead} calendar days
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[#a2917b]">
                                                Review order date
                                            </p>
                                            <p className="mt-1">
                                                {plan.due === null
                                                    ? 'Later review'
                                                    : plan.due <= 0
                                                      ? 'Today (buffer at risk)'
                                                      : `${dateLabel(plan.due)} 2026`}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-[10px] leading-5 text-[#9a8569]">
                                        An order placed today may arrive after
                                        the safety buffer is breached. Daily use
                                        and deliveries are assumptions, not a
                                        guarantee.
                                    </p>
                                    <Button
                                        disabled={
                                            drafts.includes(orderDetail.id) ||
                                            plan.order <= 0
                                        }
                                        onClick={() => {
                                            setDrafts((values) => [
                                                ...values,
                                                orderDetail.id,
                                            ]);
                                            setOrderDetail(null);
                                            toast.success(
                                                'Added to the demo purchase list. Nothing was ordered.',
                                            );
                                        }}
                                    >
                                        {drafts.includes(orderDetail.id) ? (
                                            <>
                                                <Check />
                                                Already in demo list
                                            </>
                                        ) : (
                                            <>
                                                <Plus />
                                                Add to demo purchase list
                                            </>
                                        )}
                                    </Button>
                                </>
                            );
                        })()}
                </DialogContent>
            </Dialog>
        </>
    );
}
