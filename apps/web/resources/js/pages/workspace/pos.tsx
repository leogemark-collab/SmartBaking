import { Head } from '@inertiajs/react';
import {
    ArrowRight,
    Banknote,
    Check,
    Minus,
    Plus,
    ReceiptText,
    Search,
    ShoppingBag,
    Trash2,
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
import { Input } from '@/components/ui/input';
import {
    EmptyState,
    Field,
    PageHeading,
    Panel,
    ProductArt,
    StatusBadge,
} from '@/components/workspace/ui';
import { useWorkspace } from '@/components/workspace/workspace-provider';
import { currency, products } from '@/lib/workspace';

type Product = (typeof products)[number];
type CartLine = { product: Product; quantity: number };
type Receipt = {
    number: string;
    lines: CartLine[];
    total: number;
    cash: number;
    change: number;
};

const categories = [
    'All products',
    ...new Set(products.map((product) => product.category)),
];
const money = (cents: number) => currency(cents / 100);
const priceInCents = (product: Product) => Math.round(product.price * 100);
const maxCashCents = 100_000_000;

function parseCashCents(value: string): number | null {
    const parts = /^(\d+)(?:\.(\d{0,2}))?$/.exec(value.trim());
    if (!parts) return null;
    const whole = parts[1].replace(/^0+/, '') || '0';
    if (whole.length > 7) return null;
    const cents = Number(whole) * 100 + Number((parts[2] ?? '').padEnd(2, '0'));
    return Number.isSafeInteger(cents) && cents <= maxCashCents ? cents : null;
}

function Register({ branch }: { branch: string }) {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All products');
    const [cart, setCart] = useState<CartLine[]>([]);
    const [sold, setSold] = useState<Record<string, number>>({});
    const [cash, setCash] = useState('');
    const [error, setError] = useState('');
    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const [receiptCount, setReceiptCount] = useState(0);

    const visibleProducts = products.filter(
        (product) =>
            (category === 'All products' || product.category === category) &&
            product.name.toLowerCase().includes(search.toLowerCase().trim()),
    );
    const total = cart.reduce(
        (sum, line) => sum + priceInCents(line.product) * line.quantity,
        0,
    );
    const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
    const tendered = parseCashCents(cash);
    const available = (product: Product) =>
        Math.max(0, product.stock - (sold[String(product.id)] ?? 0));

    function changeQuantity(product: Product, difference: number) {
        const current =
            cart.find((line) => line.product.id === product.id)?.quantity ?? 0;
        if (
            (difference !== 1 && difference !== -1) ||
            (current === 0 && difference < 0)
        )
            return;
        if (current + difference > available(product)) {
            toast.error('All available pieces are already in this order.');
            return;
        }
        setCart((lines) =>
            current === 0
                ? [...lines, { product, quantity: 1 }]
                : lines
                      .map((line) =>
                          line.product.id === product.id
                              ? {
                                    ...line,
                                    quantity: line.quantity + difference,
                                }
                              : line,
                      )
                      .filter((line) => line.quantity > 0),
        );
        setError('');
    }

    function completeSale(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!cart.length) return;
        if (
            cart.some(
                (line) =>
                    !Number.isSafeInteger(line.quantity) ||
                    line.quantity < 1 ||
                    line.quantity > available(line.product),
            )
        ) {
            toast.error(
                'Review the order quantities. An item exceeds its available finished stock.',
            );
            return;
        }
        if (tendered === null || tendered < total) {
            setError(
                tendered === null
                    ? `Enter a cash amount up to ${money(maxCashCents)}, with up to two decimal places.`
                    : `Cash is short by ${money(total - tendered)}.`,
            );
            event.currentTarget
                .querySelector<HTMLInputElement>('[name="cash"]')
                ?.focus();
            return;
        }
        const count = receiptCount + 1;
        setReceipt({
            number: `DEMO-${String(count).padStart(4, '0')}`,
            lines: cart.map((line) => ({ ...line })),
            total,
            cash: tendered,
            change: tendered - total,
        });
        setSold((current) => {
            const updated = { ...current };
            cart.forEach((line) => {
                updated[String(line.product.id)] =
                    (updated[String(line.product.id)] ?? 0) + line.quantity;
            });
            return updated;
        });
        setReceiptCount(count);
        setCart([]);
        setCash('');
        setError('');
        toast.success(
            'Demo sale completed. Finished-product quantities updated for this page only.',
        );
    }

    async function copyReceipt() {
        if (!receipt) return;
        const lines = receipt.lines.map(
            (line) =>
                `${line.quantity} × ${line.product.name} — ${money(priceInCents(line.product) * line.quantity)}`,
        );
        try {
            await navigator.clipboard.writeText(
                [
                    'SmartBaking · DEMO RECEIPT',
                    branch,
                    '11 Nov 2026 · PHT',
                    receipt.number,
                    ...lines,
                    `Total: ${money(receipt.total)}`,
                    `Cash: ${money(receipt.cash)}`,
                    `Change: ${money(receipt.change)}`,
                    'Sample transaction · not an official sales receipt',
                ].join('\n'),
            );
            toast.success('Demo receipt copied.');
        } catch {
            toast.error(
                'Your browser could not copy the receipt. You can select its text instead.',
            );
        }
    }

    return (
        <>
            <Head title="Point of sale" />
            <PageHeading
                eyebrow="The sales counter"
                title="Point of sale"
                description="Fresh from the oven. Ready for your next order."
                actions={
                    <StatusBadge tone="green">
                        Cash register preview
                    </StatusBadge>
                }
            />
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <section aria-label="Product selection" className="space-y-5">
                    <div className="relative">
                        <Search
                            className="pointer-events-none absolute top-3.5 left-4 size-4 text-[#8c8276]"
                            aria-hidden="true"
                        />
                        <Input
                            aria-label="Search products"
                            placeholder="Find a bread or pastry…"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="h-11 rounded-xl border-[#e9e4dc] bg-white pl-11"
                        />
                    </div>
                    <div
                        className="flex flex-wrap gap-2"
                        aria-label="Filter by category"
                    >
                        {categories.map((name) => (
                            <button
                                key={name}
                                type="button"
                                aria-pressed={category === name}
                                onClick={() => setCategory(name)}
                                className={`min-h-11 rounded-full px-4 py-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#a6533b] focus-visible:ring-offset-2 ${category === name ? 'bg-[#3d4938] text-white' : 'border border-[#e9e4dc] bg-white text-[#766d61] hover:bg-[#f2eee7]'}`}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#857b6e]">
                        <span>{visibleProducts.length} products</span>
                        <span>Prices per piece · PHP</span>
                    </div>
                    {visibleProducts.length ? (
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
                            {visibleProducts.map((product) => {
                                const remaining = available(product);
                                const inCart =
                                    cart.find(
                                        (line) =>
                                            line.product.id === product.id,
                                    )?.quantity ?? 0;
                                return (
                                    <article
                                        key={product.id}
                                        className="overflow-hidden rounded-2xl border border-[#e9e4dc] bg-white"
                                    >
                                        <div className="relative flex h-36 items-center justify-center bg-[#f4efe6] sm:h-40">
                                            <ProductArt
                                                kind={product.kind}
                                                className="h-32 w-40 max-w-full"
                                            />
                                            {inCart > 0 && (
                                                <span className="absolute top-3 right-3 rounded-full bg-[#a6533b] px-2.5 py-1 text-[10px] font-medium text-white">
                                                    {inCart} in order
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <p className="text-[10px] font-semibold tracking-wider text-[#9a8068] uppercase">
                                                {product.category}
                                            </p>
                                            <h2 className="mt-1 text-sm font-semibold text-[#332c25]">
                                                {product.name}
                                            </h2>
                                            <p
                                                className={`mt-1 text-xs ${remaining === 0 ? 'text-[#ad5444]' : 'text-[#8b8275]'}`}
                                            >
                                                {remaining === 0
                                                    ? 'Sold out in this preview'
                                                    : `${remaining} pieces available`}
                                            </p>
                                            <div className="mt-4 flex items-center justify-between gap-2">
                                                <span className="text-base font-semibold text-[#514333]">
                                                    {currency(product.price)}
                                                </span>
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    aria-label={`Add one ${product.name}`}
                                                    onClick={() =>
                                                        changeQuantity(
                                                            product,
                                                            1,
                                                        )
                                                    }
                                                    disabled={
                                                        inCart >= remaining
                                                    }
                                                    className="size-11 rounded-full bg-[#f1e7de] text-[#a6533b] shadow-none hover:bg-[#e8d6c7]"
                                                >
                                                    <Plus className="size-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    ) : (
                        <Panel>
                            <EmptyState
                                title="No matching products"
                                description="Try another name or choose a different category."
                            />
                        </Panel>
                    )}
                </section>

                <aside
                    className="xl:sticky xl:top-6"
                    aria-label="Current order"
                >
                    <Panel
                        title="Current order"
                        description={branch}
                        action={
                            <ShoppingBag
                                className="size-5 text-[#9b8b78]"
                                aria-hidden="true"
                            />
                        }
                    >
                        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                            <div className="-mx-1 flex items-center justify-between border-b border-[#eee9e1] pb-4 text-xs text-[#8c8173]">
                                <span>
                                    {itemCount}{' '}
                                    {itemCount === 1 ? 'piece' : 'pieces'}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCart([]);
                                        setCash('');
                                        setError('');
                                    }}
                                    disabled={!cart.length}
                                    className="min-h-11 rounded px-2 py-1 text-[#a6533b] hover:bg-[#f8eee7] focus-visible:ring-2 focus-visible:ring-[#a6533b] disabled:opacity-40"
                                >
                                    Clear order
                                </button>
                            </div>
                            {!cart.length ? (
                                <div className="py-7">
                                    <EmptyState
                                        title="Your order starts here"
                                        description="Choose something freshly baked to add it to the order."
                                    />
                                </div>
                            ) : (
                                <ul className="max-h-[380px] divide-y divide-[#eee9e1] overflow-y-auto">
                                    {cart.map((line) => (
                                        <li
                                            key={line.product.id}
                                            className="py-4"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium break-words">
                                                        {line.product.name}
                                                    </p>
                                                    <p className="mt-1 text-xs text-[#8c8173]">
                                                        {currency(
                                                            line.product.price,
                                                        )}{' '}
                                                        each
                                                    </p>
                                                </div>
                                                <span className="shrink-0 text-sm font-semibold tabular-nums">
                                                    {money(
                                                        priceInCents(
                                                            line.product,
                                                        ) * line.quantity,
                                                    )}
                                                </span>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between">
                                                <div className="flex items-center rounded-lg border border-[#e9e4dc]">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-11 rounded-r-none"
                                                        aria-label={`Remove one ${line.product.name}`}
                                                        onClick={() =>
                                                            changeQuantity(
                                                                line.product,
                                                                -1,
                                                            )
                                                        }
                                                    >
                                                        <Minus className="size-3" />
                                                    </Button>
                                                    <span className="min-w-8 text-center text-xs font-medium tabular-nums">
                                                        {line.quantity}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-11 rounded-l-none"
                                                        aria-label={`Add one ${line.product.name}`}
                                                        disabled={
                                                            line.quantity >=
                                                            available(
                                                                line.product,
                                                            )
                                                        }
                                                        onClick={() =>
                                                            changeQuantity(
                                                                line.product,
                                                                1,
                                                            )
                                                        }
                                                    >
                                                        <Plus className="size-3" />
                                                    </Button>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-11 text-[#aa8e7c]"
                                                    aria-label={`Remove ${line.product.name} from order`}
                                                    onClick={() => {
                                                        setCart((lines) =>
                                                            lines.filter(
                                                                (item) =>
                                                                    item.product
                                                                        .id !==
                                                                    line.product
                                                                        .id,
                                                            ),
                                                        );
                                                        setError('');
                                                    }}
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <form
                                onSubmit={completeSale}
                                className="space-y-4 border-t border-[#e9e4dc] pt-5"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-[#7a6e5e]">
                                        Order total
                                    </span>
                                    <span className="text-2xl font-semibold tracking-tight tabular-nums">
                                        {money(total)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 rounded-lg bg-[#f6f3ed] px-3 py-2.5 text-xs text-[#776a59]">
                                    <Banknote
                                        className="size-4 text-[#73836d]"
                                        aria-hidden="true"
                                    />
                                    Cash payment
                                    <span className="ml-auto">PHP</span>
                                </div>
                                <Field label="Cash received">
                                    <Input
                                        id="cash-received"
                                        name="cash"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={cash}
                                        aria-invalid={Boolean(error)}
                                        aria-describedby={
                                            error ? 'cash-error' : undefined
                                        }
                                        onChange={(event) => {
                                            setCash(event.target.value);
                                            setError('');
                                        }}
                                        className="h-11 border-[#e9e4dc]"
                                    />
                                </Field>
                                {error && (
                                    <p
                                        id="cash-error"
                                        role="alert"
                                        className="text-xs leading-relaxed text-[#b24e3a]"
                                    >
                                        {error}
                                    </p>
                                )}
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-[#867a6a]">
                                        Change
                                    </span>
                                    <span className="font-medium tabular-nums">
                                        {money(
                                            Math.max(
                                                0,
                                                (tendered ?? 0) - total,
                                            ),
                                        )}
                                    </span>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={!cart.length}
                                    className="h-12 w-full rounded-xl bg-[#a6533b] text-white hover:bg-[#8f432d]"
                                >
                                    Complete demo sale
                                    <ArrowRight className="size-4" />
                                </Button>
                                <p className="text-center text-[10px] leading-relaxed text-[#978b7b]">
                                    Session preview. Orders reset when you leave
                                    or change branch. Raw ingredients are not
                                    deducted at sale.
                                </p>
                            </form>
                        </div>
                    </Panel>
                </aside>
            </div>

            <Dialog
                open={Boolean(receipt)}
                onOpenChange={(open) => {
                    if (!open) setReceipt(null);
                }}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto border-[#e9e4dc] bg-[#fffcf7] sm:max-w-md">
                    <DialogHeader>
                        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-[#eaf0e5] text-[#627b57]">
                            <Check className="size-5" />
                        </div>
                        <DialogTitle className="text-center">
                            A lovely order, ready to go.
                        </DialogTitle>
                        <DialogDescription className="text-center">
                            Demo receipt · no payment was collected.
                        </DialogDescription>
                    </DialogHeader>
                    {receipt && (
                        <div className="rounded-xl border border-dashed border-[#d8cdbb] bg-white p-5 text-sm">
                            <div className="text-center">
                                <ReceiptText className="mx-auto mb-2 size-5 text-[#a6533b]" />
                                <p className="font-semibold">SmartBaking</p>
                                <p className="mt-1 text-xs text-[#8a7c6a]">
                                    {branch} · 11 Nov 2026 · PHT
                                </p>
                                <p className="mt-1 text-[10px] tracking-wider text-[#a18a72]">
                                    {receipt.number}
                                </p>
                            </div>
                            <ul className="my-4 space-y-3 border-y border-dashed border-[#e2d9cb] py-4">
                                {receipt.lines.map((line) => (
                                    <li
                                        key={line.product.id}
                                        className="flex justify-between gap-4 text-xs"
                                    >
                                        <span>
                                            {line.quantity} ×{' '}
                                            {line.product.name}
                                        </span>
                                        <span className="shrink-0 tabular-nums">
                                            {money(
                                                priceInCents(line.product) *
                                                    line.quantity,
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            <div className="space-y-2">
                                <div className="flex justify-between font-semibold">
                                    <span>Total</span>
                                    <span>{money(receipt.total)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-[#81715d]">
                                    <span>Cash</span>
                                    <span>{money(receipt.cash)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-[#81715d]">
                                    <span>Change</span>
                                    <span>{money(receipt.change)}</span>
                                </div>
                            </div>
                            <p className="mt-5 text-center text-[10px] text-[#9a8b78]">
                                Sample transaction. Not an official sales
                                receipt.
                            </p>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={copyReceipt}
                        >
                            Copy receipt
                        </Button>
                        <Button
                            type="button"
                            onClick={() => setReceipt(null)}
                            className="bg-[#a6533b] text-white hover:bg-[#8f432d]"
                        >
                            New order
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default function PointOfSale() {
    const { branch } = useWorkspace();
    return <Register key={branch} branch={branch} />;
}
