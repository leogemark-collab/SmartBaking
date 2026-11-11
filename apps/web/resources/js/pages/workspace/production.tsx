import { Head } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    ChefHat,
    Clock3,
    Flame,
    Plus,
    Search,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    EmptyState,
    Field,
    PageHeading,
    Panel,
    ProductArt,
    StatCard,
    StatusBadge,
} from '@/components/workspace/ui';
import { useWorkspace } from '@/components/workspace/workspace-provider';
import { products } from '@/lib/workspace';

type Stage = 'ready' | 'mixing' | 'baking' | 'completed';
type Batch = {
    id: string;
    productId: string;
    quantity: number;
    time: string;
    stage: Stage;
};
const stages: Stage[] = ['ready', 'mixing', 'baking', 'completed'];
const stageLabels: Record<Stage, string> = {
    ready: 'Ready to start',
    mixing: 'Mixing',
    baking: 'In the oven',
    completed: 'Completed',
};
const stageTones = {
    ready: 'neutral',
    mixing: 'terra',
    baking: 'amber',
    completed: 'green',
} as const;
const nextActions: Record<Exclude<Stage, 'completed'>, string> = {
    ready: 'Start mixing',
    mixing: 'Move to oven',
    baking: 'Complete batch',
};
const selectClass =
    'h-11 w-full rounded-md border border-[#e9e4dc] bg-white px-3 text-sm text-[#453b30] outline-none focus:ring-2 focus:ring-[#a6533b]/30';
const initialBatches: Batch[] = [
    {
        id: 'BA-1101',
        productId: String(products[0]?.id),
        quantity: 120,
        time: '05:30',
        stage: 'completed',
    },
    {
        id: 'BA-1102',
        productId: String(products[1]?.id ?? products[0]?.id),
        quantity: 60,
        time: '07:00',
        stage: 'baking',
    },
    {
        id: 'BA-1103',
        productId: String(products[2]?.id ?? products[0]?.id),
        quantity: 48,
        time: '08:00',
        stage: 'mixing',
    },
    {
        id: 'BA-1104',
        productId: String(products[0]?.id),
        quantity: 80,
        time: '09:30',
        stage: 'ready',
    },
    {
        id: 'BA-1105',
        productId: String(products[3]?.id ?? products[0]?.id),
        quantity: 36,
        time: '11:00',
        stage: 'ready',
    },
];
const formatTime = (time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
};

function ProductionBoard({ branch }: { branch: string }) {
    const [batches, setBatches] = useState<Batch[]>(initialBatches);
    const [filter, setFilter] = useState<Stage | 'all'>('all');
    const [search, setSearch] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [productId, setProductId] = useState(String(products[0]?.id ?? ''));
    const [quantity, setQuantity] = useState('60');
    const [time, setTime] = useState('09:00');
    const [formError, setFormError] = useState('');
    const [errorField, setErrorField] = useState('');
    const productFor = (id: string) =>
        products.find((product) => String(product.id) === id);
    const visibleBatches = batches.filter(
        (batch) =>
            (filter === 'all' || batch.stage === filter) &&
            `${batch.id} ${productFor(batch.productId)?.name ?? ''}`
                .toLowerCase()
                .includes(search.toLowerCase().trim()),
    );
    const activeCount = batches.filter(
        (batch) => batch.stage === 'mixing' || batch.stage === 'baking',
    ).length;
    const completed = batches.filter((batch) => batch.stage === 'completed');
    const plannedPieces = batches.reduce(
        (sum, batch) => sum + batch.quantity,
        0,
    );

    function advanceBatch(batch: Batch) {
        const next = stages[stages.indexOf(batch.stage) + 1];
        if (!next) return;
        setBatches((current) =>
            current.map((item) =>
                item.id === batch.id ? { ...item, stage: next } : item,
            ),
        );
        toast.success(
            `${batch.id}: ${stageLabels[next].toLowerCase()} in this preview.`,
        );
    }

    function createBatch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!productFor(productId)) {
            setFormError('Choose a product for this batch.');
            setErrorField('product');
            event.currentTarget
                .querySelector<HTMLSelectElement>('[name="product"]')
                ?.focus();
            return;
        }
        const pieces = Number(quantity);
        if (
            !/^\d+$/.test(quantity) ||
            !Number.isSafeInteger(pieces) ||
            pieces < 1 ||
            pieces > 10000
        ) {
            setFormError('Enter a whole-piece quantity from 1 to 10,000.');
            setErrorField('quantity');
            event.currentTarget
                .querySelector<HTMLInputElement>('[name="quantity"]')
                ?.focus();
            return;
        }
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
            setFormError('Choose a valid planned start time.');
            setErrorField('time');
            event.currentTarget
                .querySelector<HTMLInputElement>('[name="time"]')
                ?.focus();
            return;
        }
        const id = `BA-${1101 + batches.length}`;
        setBatches((current) => [
            ...current,
            { id, productId, quantity: pieces, time, stage: 'ready' },
        ]);
        setCreateOpen(false);
        setFormError('');
        toast.success(`${id} added to this session's production plan.`);
    }

    return (
        <>
            <Head title="Production" />
            <PageHeading
                eyebrow="Inside the kitchen"
                title="The baking board"
                description="A clear rhythm for every batch, from mixing bowl to cooling rack."
                actions={
                    <Button
                        type="button"
                        onClick={() => {
                            setFormError('');
                            setCreateOpen(true);
                        }}
                        className="h-11 rounded-xl bg-[#a6533b] px-5 text-white hover:bg-[#8f432d]"
                    >
                        <Plus className="size-4" />
                        Plan a batch
                    </Button>
                }
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Batches planned"
                    value={String(batches.length)}
                    hint="11 November · sample baking day"
                />
                <StatCard
                    label="In progress"
                    value={String(activeCount)}
                    hint="Mixing or currently baking"
                />
                <StatCard
                    label="Planned output"
                    value={`${plannedPieces} pcs`}
                    hint="Across all batches for the day"
                />
                <StatCard
                    label="Completed output"
                    value={`${completed.reduce((sum, batch) => sum + batch.quantity, 0)} pcs`}
                    hint={`${completed.length} completed ${completed.length === 1 ? 'batch' : 'batches'}`}
                />
            </div>

            <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
                <Panel
                    title="Today's batches"
                    description={`${branch} · 11 Nov 2026 · PHT`}
                    action={
                        <StatusBadge tone="neutral">
                            {batches.length} batches
                        </StatusBadge>
                    }
                >
                    <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                        <div className="mb-5 flex flex-col gap-4 border-b border-[#eee9e1] pb-5">
                            <div className="relative">
                                <Search
                                    className="pointer-events-none absolute top-3 left-3 size-4 text-[#9b8f7e]"
                                    aria-hidden="true"
                                />
                                <Input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Search product or batch number…"
                                    aria-label="Search production batches"
                                    className="h-10 border-[#e9e4dc] pl-9"
                                />
                            </div>
                            <div
                                className="flex flex-wrap gap-2"
                                aria-label="Filter batches by stage"
                            >
                                {(['all', ...stages] as const).map((stage) => (
                                    <button
                                        key={stage}
                                        type="button"
                                        aria-pressed={filter === stage}
                                        onClick={() => setFilter(stage)}
                                        className={`min-h-9 rounded-lg px-3 py-2 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#a6533b] ${filter === stage ? 'bg-[#3d4938] text-white' : 'bg-[#f6f3ed] text-[#82725e] hover:bg-[#eee7dc]'}`}
                                    >
                                        {stage === 'all'
                                            ? 'All batches'
                                            : stageLabels[stage]}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {visibleBatches.length ? (
                            <ul className="space-y-4">
                                {visibleBatches.map((batch) => {
                                    const product = productFor(batch.productId);
                                    return (
                                        <li
                                            key={batch.id}
                                            className="rounded-xl border border-[#e9e4dc] bg-white p-4 sm:p-5"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-[11px] font-semibold tracking-wide text-[#8f7a61]">
                                                        {batch.id}
                                                    </span>
                                                    <span className="text-[11px] text-[#a19788]">
                                                        Planned{' '}
                                                        {formatTime(batch.time)}
                                                    </span>
                                                </div>
                                                <StatusBadge
                                                    tone={
                                                        stageTones[batch.stage]
                                                    }
                                                >
                                                    {stageLabels[batch.stage]}
                                                </StatusBadge>
                                            </div>
                                            <div className="mt-4 flex items-center gap-4">
                                                <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-[#f7f0e5]">
                                                    <ProductArt
                                                        kind={product?.kind}
                                                        className="h-14 w-16"
                                                    />
                                                </div>
                                                <div>
                                                    <h2 className="text-base font-semibold text-[#40352a]">
                                                        {product?.name ??
                                                            'Unlisted product'}
                                                    </h2>
                                                    <p className="mt-1 text-xs text-[#8d7d69]">
                                                        Planned yield{' '}
                                                        <span className="font-medium text-[#665640]">
                                                            {batch.quantity}{' '}
                                                            pieces
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-5 flex flex-col gap-4 border-t border-[#f0ece4] pt-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div
                                                    className="flex items-center gap-1.5"
                                                    aria-label={`Current stage: ${stageLabels[batch.stage]}`}
                                                >
                                                    {stages.map(
                                                        (stage, index) => (
                                                            <span
                                                                key={stage}
                                                                className={`h-1.5 w-9 rounded-full ${index <= stages.indexOf(batch.stage) ? (batch.stage === 'completed' ? 'bg-[#73836d]' : 'bg-[#b77a58]') : 'bg-[#eee9e0]'}`}
                                                            />
                                                        ),
                                                    )}
                                                    <span className="ml-2 text-[10px] text-[#a19583]">
                                                        {stages.indexOf(
                                                            batch.stage,
                                                        ) + 1}{' '}
                                                        of 4
                                                    </span>
                                                </div>
                                                {batch.stage !== 'completed' ? (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-9 border-[#dfd2c2] bg-[#fffcf7] text-xs text-[#936043] hover:bg-[#f3e8dc]"
                                                        onClick={() =>
                                                            advanceBatch(batch)
                                                        }
                                                    >
                                                        {
                                                            nextActions[
                                                                batch.stage
                                                            ]
                                                        }
                                                        <ArrowRight className="size-3.5" />
                                                    </Button>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 text-xs font-medium text-[#708568]">
                                                        <Check className="size-3.5" />
                                                        Batch completed
                                                    </span>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <EmptyState
                                title="No batches in this view"
                                description="Try another search or stage, or plan a new batch."
                            />
                        )}
                        <p className="mt-5 text-[10px] leading-relaxed text-[#9a8c78]">
                            Session preview. Stage changes reset when you leave
                            or change branch. Ingredient consumption and
                            finished-product stock are not connected to these
                            demo batches.
                        </p>
                    </div>
                </Panel>

                <div className="space-y-5">
                    <Panel
                        title="From prep to fresh bread"
                        description="One batch. Four clear steps."
                    >
                        <ol className="space-y-6 px-5 pb-6 sm:px-6">
                            {[
                                {
                                    title: 'Ready to start',
                                    detail: 'Confirm the product, planned yield, and start time.',
                                    icon: Clock3,
                                },
                                {
                                    title: 'Mixing',
                                    detail: 'Prepare and mix the recipe for the batch.',
                                    icon: ChefHat,
                                },
                                {
                                    title: 'In the oven',
                                    detail: 'Move the prepared batch into baking.',
                                    icon: Flame,
                                },
                                {
                                    title: 'Completed',
                                    detail: 'Finish the batch and record the result.',
                                    icon: Check,
                                },
                            ].map((step, index) => (
                                <li key={step.title} className="flex gap-3">
                                    <span
                                        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${index === 3 ? 'bg-[#ecf0e7] text-[#73836d]' : 'bg-[#f4ece1] text-[#aa7951]'}`}
                                    >
                                        <step.icon
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div>
                                        <h3 className="text-xs font-semibold text-[#5a4a38]">
                                            {step.title}
                                        </h3>
                                        <p className="mt-1 text-[11px] leading-relaxed text-[#978874]">
                                            {step.detail}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </Panel>
                    <div className="rounded-2xl border border-[#e4e5d8] bg-[#eef0e5] p-5">
                        <ChefHat
                            className="mb-3 size-6 text-[#7c896e]"
                            strokeWidth={1.5}
                            aria-hidden="true"
                        />
                        <h2 className="font-[Georgia,serif] text-xl text-[#4b5940]">
                            A little planning,
                            <br />a smoother morning.
                        </h2>
                        <p className="mt-3 text-xs leading-6 text-[#7b856f]">
                            Keep each batch&apos;s planned output visible, and
                            move it forward one step at a time.
                        </p>
                    </div>
                </div>
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-h-[90dvh] overflow-y-auto border-[#e9e4dc] bg-[#fffcf7] sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Plan a baking batch</DialogTitle>
                        <DialogDescription>
                            Add a sample batch for {branch} on 11 Nov 2026. This
                            plan stays in the current page session.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={createBatch} className="space-y-5">
                        <Field label="Product">
                            <select
                                name="product"
                                value={productId}
                                onChange={(event) => {
                                    setProductId(event.target.value);
                                    setFormError('');
                                }}
                                className={selectClass}
                                aria-label="Product for this batch"
                                aria-invalid={
                                    !!formError && errorField === 'product'
                                }
                                aria-describedby={
                                    formError && errorField === 'product'
                                        ? 'production-error'
                                        : undefined
                                }
                            >
                                {products.map((product) => (
                                    <option
                                        key={product.id}
                                        value={String(product.id)}
                                    >
                                        {product.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field
                                label="Planned yield"
                                hint="Pieces of finished bread"
                            >
                                <Input
                                    name="quantity"
                                    required
                                    aria-label="Planned yield in pieces"
                                    inputMode="numeric"
                                    value={quantity}
                                    onChange={(event) => {
                                        setQuantity(event.target.value);
                                        setFormError('');
                                    }}
                                    aria-invalid={
                                        !!formError && errorField === 'quantity'
                                    }
                                    aria-describedby={
                                        formError && errorField === 'quantity'
                                            ? 'production-error'
                                            : undefined
                                    }
                                    className="h-11 border-[#e9e4dc]"
                                />
                            </Field>
                            <Field
                                label="Planned start"
                                hint="Philippine time (PHT)"
                            >
                                <Input
                                    name="time"
                                    required
                                    aria-label="Planned start time"
                                    type="time"
                                    value={time}
                                    onChange={(event) => {
                                        setTime(event.target.value);
                                        setFormError('');
                                    }}
                                    aria-invalid={
                                        !!formError && errorField === 'time'
                                    }
                                    aria-describedby={
                                        formError && errorField === 'time'
                                            ? 'production-error'
                                            : undefined
                                    }
                                    className="h-11 border-[#e9e4dc]"
                                />
                            </Field>
                        </div>
                        <div className="rounded-lg bg-[#f2eee5] px-4 py-3 text-xs leading-relaxed text-[#8c7a62]">
                            New batches begin at{' '}
                            <span className="font-semibold">
                                Ready to start
                            </span>
                            . This preview does not reserve ingredients or add
                            finished stock.
                        </div>
                        {formError && (
                            <p
                                id="production-error"
                                role="alert"
                                className="text-xs text-[#b24e3a]"
                            >
                                {formError}
                            </p>
                        )}
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCreateOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-[#a6533b] text-white hover:bg-[#8f432d]"
                            >
                                <Plus className="size-4" />
                                Add demo batch
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default function Production() {
    const { branch } = useWorkspace();
    return <ProductionBoard key={branch} branch={branch} />;
}
