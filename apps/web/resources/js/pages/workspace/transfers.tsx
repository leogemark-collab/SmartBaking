import { Head } from '@inertiajs/react';
import {
    ArrowDownToLine,
    ArrowRight,
    ArrowRightLeft,
    CheckCheck,
    Download,
    PackageCheck,
    Plus,
    Search,
    Truck,
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
    StatCard,
    StatusBadge,
} from '@/components/workspace/ui';
import { useWorkspace } from '@/components/workspace/workspace-provider';
import { branches, downloadCsv, products, sampleDay } from '@/lib/workspace';

type TransferStatus = 'Requested' | 'Dispatched' | 'Received' | 'Cancelled';
type Category = 'Raw ingredients' | 'Finished goods';
type TransferItem = {
    id: string;
    name: string;
    unit: 'kg' | 'L' | 'pcs';
    category: Category;
};
type Transfer = {
    id: string;
    origin: string;
    destination: string;
    item: string;
    category: Category;
    quantity: number;
    unit: TransferItem['unit'];
    status: TransferStatus;
    time: string;
};

const catalog: TransferItem[] = [
    {
        id: 'flour',
        name: 'Bread flour',
        unit: 'kg',
        category: 'Raw ingredients',
    },
    {
        id: 'sugar',
        name: 'White sugar',
        unit: 'kg',
        category: 'Raw ingredients',
    },
    { id: 'butter', name: 'Butter', unit: 'kg', category: 'Raw ingredients' },
    { id: 'milk', name: 'Fresh milk', unit: 'L', category: 'Raw ingredients' },
    ...products.map((product) => ({
        id: product.id,
        name: product.name,
        unit: 'pcs' as const,
        category: 'Finished goods' as const,
    })),
];
const selectClass =
    'h-10 w-full rounded-lg border border-[#e4ded4] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#b76b50]/30';
const statusTone = {
    Requested: 'amber',
    Dispatched: 'terra',
    Received: 'green',
    Cancelled: 'neutral',
} as const;

function initialTransfers(branch: string): Transfer[] {
    const destinations = branches.filter((candidate) => candidate !== branch);
    return [
        {
            id: 'TR-1042',
            origin: branch,
            destination: destinations[0],
            item: 'Classic pandesal',
            category: 'Finished goods',
            quantity: 80,
            unit: 'pcs',
            status: 'Requested',
            time: '08:35 PHT',
        },
        {
            id: 'TR-1041',
            origin: branch,
            destination: destinations[1],
            item: 'Bread flour',
            category: 'Raw ingredients',
            quantity: 12.5,
            unit: 'kg',
            status: 'Dispatched',
            time: '08:10 PHT',
        },
        {
            id: 'TR-1040',
            origin: branch,
            destination: destinations[0],
            item: 'Spanish bread',
            category: 'Finished goods',
            quantity: 60,
            unit: 'pcs',
            status: 'Received',
            time: '07:45 PHT',
        },
    ];
}

export default function Transfers() {
    const { branch } = useWorkspace();

    return <TransfersContent key={branch} branch={branch} />;
}

function TransfersContent({ branch }: { branch: string }) {
    const [rows, setRows] = useState(() => initialTransfers(branch));
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('All statuses');
    const [open, setOpen] = useState(false);
    const [destination, setDestination] = useState(
        () => branches.find((candidate) => candidate !== branch) ?? '',
    );
    const [category, setCategory] = useState<Category>('Raw ingredients');
    const [itemId, setItemId] = useState('flour');
    const [quantity, setQuantity] = useState('');
    const [error, setError] = useState('');
    const [nextNumber, setNextNumber] = useState(1043);
    const chosenItem = catalog.find(
        (item) => item.id === itemId && item.category === category,
    );
    const filtered = rows.filter(
        (row) =>
            (status === 'All statuses' || row.status === status) &&
            `${row.id} ${row.item} ${row.destination}`
                .toLowerCase()
                .includes(search.toLowerCase().trim()),
    );

    function changeStatus(id: string, next: TransferStatus) {
        setRows((current) =>
            current.map((row) => {
                const allowed =
                    (row.status === 'Requested' &&
                        (next === 'Dispatched' || next === 'Cancelled')) ||
                    (row.status === 'Dispatched' && next === 'Received');
                return row.id === id && allowed
                    ? { ...row, status: next }
                    : row;
            }),
        );
        toast.success(
            `Demo transfer ${next.toLowerCase()}. Inventory has not changed.`,
        );
    }

    function requestTransfer(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const amount = Number(quantity);
        if (!branches.includes(destination) || destination === branch) {
            setError('Choose a destination different from the origin branch.');
            return;
        }
        if (
            !chosenItem ||
            !quantity.trim() ||
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            setError('Choose an item and enter a quantity greater than zero.');
            return;
        }
        if (chosenItem.unit === 'pcs' && !Number.isInteger(amount)) {
            setError('Finished goods must be transferred in whole pieces.');
            return;
        }
        setRows((current) => [
            {
                id: `TR-${nextNumber}`,
                origin: branch,
                destination,
                item: chosenItem.name,
                category,
                quantity: amount,
                unit: chosenItem.unit,
                status: 'Requested',
                time: '09:00 PHT',
            },
            ...current,
        ]);
        setNextNumber((current) => current + 1);
        setOpen(false);
        setQuantity('');
        setError('');
        toast.success('Demo transfer requested. No stock was reserved.');
    }

    function exportTransfers() {
        downloadCsv('smartbaking-demo-transfers.csv', [
            [
                'Demo date',
                'Transfer',
                'Origin',
                'Destination',
                'Item',
                'Category',
                'Quantity',
                'Unit',
                'Status',
            ],
            ...filtered.map((row) => [
                sampleDay,
                row.id,
                row.origin,
                row.destination,
                row.item,
                row.category,
                row.quantity,
                row.unit,
                row.status,
            ]),
        ]);
    }

    return (
        <>
            <Head title="Branch transfers" />
            <PageHeading
                eyebrow="KEEP EVERY BRANCH IN STEP"
                title="Branch transfers"
                description="Coordinate finished bread and raw ingredients between your bakery locations."
                actions={
                    <>
                        <Button
                            variant="outline"
                            className="h-10 rounded-lg border-[#e4ded4]"
                            onClick={exportTransfers}
                        >
                            <Download />
                            Export demo
                        </Button>
                        <Button
                            className="h-10 rounded-lg bg-[#a85b42] hover:bg-[#914d37]"
                            onClick={() => {
                                setError('');
                                setOpen(true);
                            }}
                        >
                            <Plus />
                            New transfer
                        </Button>
                    </>
                }
            />
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Awaiting dispatch"
                    value={
                        rows.filter((row) => row.status === 'Requested').length
                    }
                    hint="Requested demo transfers"
                    icon={ArrowRightLeft}
                    tone="terra"
                />
                <StatCard
                    label="In transit"
                    value={
                        rows.filter((row) => row.status === 'Dispatched').length
                    }
                    hint="Awaiting a separate receipt step"
                    icon={Truck}
                />
                <StatCard
                    label="Received"
                    value={
                        rows.filter((row) => row.status === 'Received').length
                    }
                    hint={`${sampleDay} · sample day`}
                    icon={PackageCheck}
                    tone="green"
                />
                <StatCard
                    label="Connected locations"
                    value={branches.length}
                    hint={`Origin: ${branch}`}
                    icon={CheckCheck}
                />
            </div>
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-[#e9dfc9] bg-[#fcf7eb] px-4 py-3 text-xs leading-6 text-[#8b7149]">
                <ArrowRightLeft
                    className="mt-1 size-4 shrink-0"
                    aria-hidden="true"
                />
                <p>
                    <strong>Interactive demo.</strong> Requests and status
                    changes stay in this page. They do not reserve or move
                    stock, and reset when you change branch or leave the screen.
                </p>
            </div>
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_270px]">
                <Panel
                    title="Transfer activity"
                    description={`Synthetic outgoing transfers · ${branch} · ${sampleDay}`}
                >
                    <div className="flex flex-wrap gap-3 border-b border-[#f0ece6] px-5 pb-5 sm:px-6">
                        <div className="relative min-w-48 flex-1">
                            <Search
                                className="absolute top-3 left-3 size-4 text-[#9c9081]"
                                aria-hidden="true"
                            />
                            <Input
                                aria-label="Search transfers"
                                className="h-10 rounded-lg border-[#e4ded4] pl-9"
                                placeholder="Search transfers or items…"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                            />
                        </div>
                        <select
                            aria-label="Filter transfer status"
                            className={`${selectClass} w-auto!`}
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                        >
                            {[
                                'All statuses',
                                'Requested',
                                'Dispatched',
                                'Received',
                                'Cancelled',
                            ].map((option) => (
                                <option key={option}>{option}</option>
                            ))}
                        </select>
                    </div>
                    {filtered.length === 0 ? (
                        <EmptyState
                            title="No transfers match"
                            description="Try another item, destination, or status."
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[690px] text-left text-xs">
                                <thead className="bg-[#fbfaf7] text-[10px] font-medium tracking-wider text-[#9a8d7d] uppercase">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">
                                            Transfer / item
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Destination
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Quantity
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Status
                                        </th>
                                        <th className="px-5 py-3 text-right font-medium">
                                            Demo action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f0ece6]">
                                    {filtered.map((row) => (
                                        <tr
                                            key={row.id}
                                            className="hover:bg-[#fdfbf8]"
                                        >
                                            <td className="px-6 py-5">
                                                <div className="font-semibold text-[#504338]">
                                                    {row.item}
                                                </div>
                                                <div className="mt-1.5 text-[10px] text-[#a09382]">
                                                    {row.id} · {row.time} ·{' '}
                                                    {row.category}
                                                </div>
                                            </td>
                                            <td className="px-4 py-5 text-[#817568]">
                                                {row.destination}
                                            </td>
                                            <td className="px-4 py-5 font-semibold tabular-nums">
                                                {row.quantity.toLocaleString(
                                                    'en-PH',
                                                )}{' '}
                                                <span className="font-normal text-[#918474]">
                                                    {row.unit}
                                                </span>
                                            </td>
                                            <td className="px-4 py-5">
                                                <StatusBadge
                                                    tone={
                                                        statusTone[row.status]
                                                    }
                                                >
                                                    {row.status}
                                                </StatusBadge>
                                            </td>
                                            <td className="px-5 py-5">
                                                <div className="flex justify-end gap-1">
                                                    {row.status ===
                                                        'Requested' && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-[11px] text-[#9b7661]"
                                                                onClick={() =>
                                                                    changeStatus(
                                                                        row.id,
                                                                        'Cancelled',
                                                                    )
                                                                }
                                                            >
                                                                Cancel
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="border-[#e8dbcb] text-[11px]"
                                                                onClick={() =>
                                                                    changeStatus(
                                                                        row.id,
                                                                        'Dispatched',
                                                                    )
                                                                }
                                                            >
                                                                <Truck className="size-3.5" />
                                                                Dispatch
                                                            </Button>
                                                        </>
                                                    )}
                                                    {row.status ===
                                                        'Dispatched' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="border-[#dce5d5] text-[11px] text-[#647858]"
                                                            onClick={() =>
                                                                changeStatus(
                                                                    row.id,
                                                                    'Received',
                                                                )
                                                            }
                                                        >
                                                            <ArrowDownToLine className="size-3.5" />
                                                            Confirm receipt
                                                        </Button>
                                                    )}
                                                    {row.status ===
                                                        'Received' && (
                                                        <span className="text-[11px] text-[#819471]">
                                                            Complete
                                                        </span>
                                                    )}
                                                    {row.status ===
                                                        'Cancelled' && (
                                                        <span className="text-[11px] text-[#a09281]">
                                                            Closed
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>
                <Panel
                    title="A clear handoff"
                    description="Three separate steps, one shared record."
                >
                    <div className="space-y-5 px-6 pb-6">
                        {[
                            {
                                title: 'Request',
                                detail: 'Choose the destination, item, and quantity.',
                                icon: Plus,
                            },
                            {
                                title: 'Dispatch',
                                detail: 'Origin confirms the items have left the branch.',
                                icon: Truck,
                            },
                            {
                                title: 'Receive',
                                detail: 'Destination confirms the items have arrived.',
                                icon: PackageCheck,
                            },
                        ].map((step, index) => (
                            <div key={step.title} className="flex gap-3">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f5f0e8] text-[#9e8262]">
                                    <step.icon
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </span>
                                <div>
                                    <p className="text-xs font-semibold">
                                        {index + 1}. {step.title}
                                    </p>
                                    <p className="mt-1 text-[11px] leading-5 text-[#958777]">
                                        {step.detail}
                                    </p>
                                </div>
                            </div>
                        ))}
                        <div className="rounded-xl bg-[#f4f6ef] p-3 text-[11px] leading-6 text-[#748166]">
                            Raw ingredients use kg or L. Finished goods use
                            whole pieces. A transfer never consumes a recipe.
                        </div>
                    </div>
                </Panel>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="rounded-2xl border-[#e9e1d5] bg-[#fffefa]">
                    <DialogHeader>
                        <DialogTitle>Request a demo transfer</DialogTitle>
                        <DialogDescription>
                            This creates a local sample record. No inventory is
                            reserved or moved.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        className="space-y-4"
                        noValidate
                        onSubmit={requestTransfer}
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Origin branch">
                                <Input
                                    value={branch}
                                    readOnly
                                    className="h-10 bg-[#f6f3ed]"
                                />
                            </Field>
                            <Field label="Destination branch">
                                <select
                                    className={selectClass}
                                    value={destination}
                                    onChange={(event) =>
                                        setDestination(event.target.value)
                                    }
                                >
                                    {branches
                                        .filter(
                                            (candidate) => candidate !== branch,
                                        )
                                        .map((candidate) => (
                                            <option key={candidate}>
                                                {candidate}
                                            </option>
                                        ))}
                                </select>
                            </Field>
                        </div>
                        <Field label="Inventory type">
                            <select
                                className={selectClass}
                                value={category}
                                onChange={(event) => {
                                    const next = event.target.value as Category;
                                    setCategory(next);
                                    setItemId(
                                        catalog.find(
                                            (item) => item.category === next,
                                        )?.id ?? '',
                                    );
                                    setError('');
                                }}
                            >
                                <option>Raw ingredients</option>
                                <option>Finished goods</option>
                            </select>
                        </Field>
                        <Field label="Item">
                            <select
                                className={selectClass}
                                value={itemId}
                                onChange={(event) => {
                                    setItemId(event.target.value);
                                    setError('');
                                }}
                            >
                                {catalog
                                    .filter(
                                        (item) => item.category === category,
                                    )
                                    .map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name} ({item.unit})
                                        </option>
                                    ))}
                            </select>
                        </Field>
                        <Field
                            label={`Quantity (${chosenItem?.unit ?? 'units'})`}
                            hint={
                                chosenItem?.unit === 'pcs'
                                    ? 'Whole pieces only.'
                                    : 'Use the displayed recipe/inventory unit.'
                            }
                        >
                            <Input
                                type="number"
                                min="0"
                                step={
                                    chosenItem?.unit === 'pcs' ? '1' : '0.001'
                                }
                                value={quantity}
                                onChange={(event) => {
                                    setQuantity(event.target.value);
                                    setError('');
                                }}
                                placeholder="Enter quantity"
                                aria-invalid={Boolean(error)}
                                aria-describedby={
                                    error ? 'transfer-error' : undefined
                                }
                                className="h-10"
                            />
                        </Field>
                        {error && (
                            <p
                                id="transfer-error"
                                role="alert"
                                className="text-xs leading-5 text-[#ad4b35]"
                            >
                                {error}
                            </p>
                        )}
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-[#a85b42] hover:bg-[#914d37]"
                            >
                                Create demo request
                                <ArrowRight className="size-4" />
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
