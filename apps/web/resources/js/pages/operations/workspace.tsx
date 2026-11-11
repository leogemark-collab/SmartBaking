import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    ChefHat,
    Download,
    FlaskConical,
    Minus,
    Package,
    Plus,
    ReceiptText,
    Search,
    Settings2,
    ShoppingBag,
    Trash2,
    Wheat,
} from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
    CatalogSetup,
    MembershipForm,
} from '@/components/operations/catalog-setup';
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
    StatCard,
    StatusBadge,
} from '@/components/workspace/ui';
import { currency, downloadCsv } from '@/lib/workspace';
import type {
    LiveOperationsProps,
    OperationsBatch,
    OperationsSale,
} from '@/types/operations';

const inputClass =
    'h-11 w-full min-w-0 rounded-md border border-[#e9e4dc] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#a6533b]/30';
const submitClass =
    'h-11 rounded-xl bg-[#a6533b] text-white hover:bg-[#8f432d]';
const money = (cents: number) => currency(cents / 100);
function requestKey(): string | null {
    const secureCrypto = globalThis.crypto;
    if (!secureCrypto?.getRandomValues) return null;
    if (typeof secureCrypto.randomUUID === 'function')
        return secureCrypto.randomUUID();
    const bytes = secureCrypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes]
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const quantity = (milli: number) =>
    new Intl.NumberFormat('en-PH', { maximumFractionDigits: 3 }).format(
        milli / 1000,
    );

function scaledInteger(
    value: string,
    decimals: number,
    max: number,
): number | null {
    const match = new RegExp(`^(\\d+)(?:\\.(\\d{0,${decimals}}))?$`).exec(
        value.trim(),
    );
    if (!match || (decimals === 0 && value.includes('.'))) return null;
    const whole = match[1].replace(/^0+/, '') || '0';
    if (whole.length > 13) return null;
    const result =
        Number(whole) * 10 ** decimals +
        Number((match[2] ?? '').padEnd(decimals, '0'));
    return Number.isSafeInteger(result) && result <= max ? result : null;
}

function errorsFor(errors: object, ...names: string[]) {
    const values = errors as Record<string, string>;
    return names.map((name) => values[name]).find(Boolean);
}

function Errors({ errors }: { errors: object }) {
    const messages = [
        ...new Set(
            Object.values(errors).filter(
                (value): value is string =>
                    typeof value === 'string' && value.length > 0,
            ),
        ),
    ];
    return messages.length ? (
        <div
            role="alert"
            className="space-y-1 rounded-lg border border-[#edd1c6] bg-[#fff5ef] px-3 py-2 text-xs leading-6 text-[#9c4733]"
        >
            {messages.map((message) => (
                <p key={message}>{message}</p>
            ))}
        </div>
    ) : null;
}

function Inset({
    children,
    className = '',
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={`px-5 pb-5 sm:px-6 sm:pb-6 ${className}`}>
            {children}
        </div>
    );
}

function timestamp(value: string | null, timezone: string) {
    if (!value) return '—';
    const date = new Date(
        /[zZ]|[+-]\d\d:\d\d$/.test(value)
            ? value
            : value.replace(' ', 'T') + 'Z',
    );
    return Number.isNaN(date.valueOf())
        ? 'Date unavailable'
        : new Intl.DateTimeFormat('en-PH', {
              timeZone: timezone,
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
          }).format(date);
}

function Bootstrap() {
    const form = useForm({ code: '', name: '', can_produce: true });
    function submit(event: FormEvent) {
        event.preventDefault();
        form.post('/operations/bootstrap');
    }
    return (
        <div className="mx-auto max-w-2xl">
            <PageHeading
                eyebrow="Your bakery, from the beginning"
                title="Welcome to SmartBaking"
                description="Create the first baking branch and initialize your workspace."
            />
            <Panel
                title="Set up your first branch"
                description="Your verified account will become the installation owner."
            >
                <Inset>
                    <form onSubmit={submit} className="space-y-5">
                        <Field label="Branch name">
                            <Input
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                                maxLength={120}
                                required
                                placeholder="Your bakery branch"
                                className={inputClass}
                            />
                        </Field>
                        <Field
                            label="Branch code"
                            hint="Uppercase letters, numbers, underscores, or hyphens. Up to 32 characters."
                        >
                            <Input
                                value={form.data.code}
                                onChange={(event) =>
                                    form.setData(
                                        'code',
                                        event.target.value.toUpperCase(),
                                    )
                                }
                                maxLength={32}
                                required
                                pattern="[A-Z0-9][A-Z0-9_-]*"
                                placeholder="MAIN"
                                className={inputClass}
                            />
                        </Field>
                        <p className="rounded-lg bg-[#f1f3e9] p-4 text-xs leading-6 text-[#6b795e]">
                            Each branch bakes its own products and keeps
                            separate ingredient and finished-product balances.
                            The business timezone is Asia/Manila.
                        </p>
                        <Errors errors={form.errors} />
                        <Button
                            type="submit"
                            disabled={form.processing}
                            className={submitClass}
                        >
                            {form.processing
                                ? 'Creating your workspace…'
                                : 'Become owner and create branch'}
                            <ArrowRight className="size-4" />
                        </Button>
                    </form>
                </Inset>
            </Panel>
        </div>
    );
}

function SavedReceipt({
    sale,
    timezone,
}: {
    sale: OperationsSale;
    timezone: string;
}) {
    return (
        <div className="rounded-xl border border-dashed border-[#d8cdbb] bg-white p-5 text-sm">
            <div className="text-center">
                <ReceiptText className="mx-auto mb-2 size-5 text-[#a6533b]" />
                <p className="font-semibold">Sale #{sale.id}</p>
                <p className="mt-1 text-xs text-[#8a7c6a]">
                    {timestamp(sale.occurred_at, timezone)} · {timezone}
                </p>
            </div>
            <ul className="my-4 space-y-3 border-y border-dashed border-[#e2d9cb] py-4">
                {sale.items.map((item, index) => (
                    <li
                        key={index}
                        className="flex justify-between gap-4 text-xs"
                    >
                        <span>
                            {item.quantity_pieces} × {item.product_name}
                        </span>
                        <span className="shrink-0 tabular-nums">
                            {money(item.line_total_cents)}
                        </span>
                    </li>
                ))}
            </ul>
            <div className="space-y-2">
                <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{money(sale.total_cents)}</span>
                </div>
                <div className="flex justify-between text-xs text-[#81715d]">
                    <span>Cash</span>
                    <span>{money(sale.cash_cents)}</span>
                </div>
                <div className="flex justify-between text-xs text-[#81715d]">
                    <span>Change</span>
                    <span>{money(sale.change_cents)}</span>
                </div>
            </div>
            <p className="mt-4 text-center text-[10px] leading-5 text-[#9a8b78]">
                Saved transaction record. Not a configured official tax receipt.
            </p>
        </div>
    );
}

function SalesTable({ data }: { data: LiveOperationsProps }) {
    return data.records.sales.length ? (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[570px] text-left text-xs">
                <thead className="border-y border-[#eee9e1] bg-[#faf8f3] text-[10px] text-[#96846f]">
                    <tr>
                        <th className="px-5 py-3 font-medium">Sale</th>
                        <th className="px-4 py-3 font-medium">
                            Recorded · {data.period.timezone}
                        </th>
                        <th className="px-4 py-3 font-medium">Pieces</th>
                        <th className="px-4 py-3 text-right font-medium">
                            Total
                        </th>
                        <th className="px-5 py-3 text-right font-medium">
                            Change
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#eee9e1]">
                    {data.records.sales.map((sale) => (
                        <tr key={sale.id}>
                            <td className="px-5 py-4 font-medium">
                                #{sale.id}
                            </td>
                            <td className="px-4 py-4 text-[#8b7b66]">
                                {timestamp(
                                    sale.occurred_at,
                                    data.period.timezone,
                                )}
                            </td>
                            <td className="px-4 py-4">
                                {sale.items.reduce(
                                    (sum, item) => sum + item.quantity_pieces,
                                    0,
                                )}
                            </td>
                            <td className="px-4 py-4 text-right font-medium tabular-nums">
                                {money(sale.total_cents)}
                            </td>
                            <td className="px-5 py-4 text-right text-[#8b7b66] tabular-nums">
                                {money(sale.change_cents)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    ) : (
        <EmptyState
            title="No sales in this period"
            description="Saved checkouts will appear here for the selected branch and dates."
        />
    );
}

function PointOfSale({ data }: { data: LiveOperationsProps }) {
    const branch = data.currentBranch!;
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All products');
    const [cart, setCart] = useState<
        { product_id: number; quantity_pieces: number }[]
    >([]);
    const [receipt, setReceipt] = useState<OperationsSale | null>(null);
    const form = useForm({
        branch_id: branch.id,
        cash: '',
        request_key: '',
    });
    const activeProducts = data.catalog.products.filter(
        (product) => product.active,
    );
    const categories = [
        'All products',
        ...new Set(
            activeProducts.map(
                (product) => product.category ?? 'Bread & pastries',
            ),
        ),
    ];
    const visible = activeProducts.filter(
        (product) =>
            (category === 'All products' ||
                (product.category ?? 'Bread & pastries') === category) &&
            `${product.name} ${product.sku}`
                .toLowerCase()
                .includes(search.toLowerCase().trim()),
    );
    const rawTotal = cart.reduce(
        (sum, line) =>
            sum +
            (activeProducts.find((product) => product.id === line.product_id)
                ?.price_cents ?? 0) *
                line.quantity_pieces,
        0,
    );
    const validTotal =
        Number.isSafeInteger(rawTotal) && rawTotal <= 1_000_000_000_000;
    const total = validTotal ? rawTotal : 0;
    const cash = scaledInteger(form.data.cash, 2, 1_000_000_000_000);
    const pieces = cart.reduce((sum, line) => sum + line.quantity_pieces, 0);
    function change(id: number, difference: number) {
        const product = activeProducts.find((item) => item.id === id);
        const current =
            cart.find((line) => line.product_id === id)?.quantity_pieces ?? 0;
        if (
            (difference !== 1 && difference !== -1) ||
            (current === 0 && difference < 0)
        )
            return;
        if (
            !product ||
            current + difference > Math.min(product.available_pieces, 1_000_000)
        ) {
            toast.error('This quantity exceeds the available finished stock.');
            return;
        }
        if (
            difference > 0 &&
            (!validTotal || total + product.price_cents > 1_000_000_000_000)
        ) {
            toast.error(
                'This order exceeds the supported total. Reduce its quantities.',
            );
            return;
        }
        setCart((lines) =>
            current === 0
                ? [...lines, { product_id: id, quantity_pieces: 1 }]
                : lines
                      .map((line) =>
                          line.product_id === id
                              ? {
                                    ...line,
                                    quantity_pieces:
                                        line.quantity_pieces + difference,
                                }
                              : line,
                      )
                      .filter((line) => line.quantity_pieces > 0),
        );
        form.clearErrors();
    }
    function checkout(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!data.capabilities.sell || !cart.length || form.processing) return;
        if (!validTotal) {
            form.setError(
                'cash',
                'This order exceeds the supported total. Reduce its quantities before checkout.',
            );
            return;
        }
        if (cash === null || cash < total) {
            form.setError(
                'cash',
                cash === null
                    ? 'Enter a valid cash amount with up to two decimal places.'
                    : `Cash is short by ${money(total - cash)}.`,
            );
            event.currentTarget
                .querySelector<HTMLInputElement>('[name="cash"]')
                ?.focus();
            return;
        }
        const invalid = cart.some((line) => {
            const product = activeProducts.find(
                (item) => item.id === line.product_id,
            );
            return !product || line.quantity_pieces > product.available_pieces;
        });
        if (invalid) {
            toast.error(
                'Stock changed. Remove unavailable items or reduce their quantities.',
            );
            return;
        }
        const key = form.data.request_key || requestKey();
        if (!key) {
            form.setError(
                'request_key',
                'A request identifier could not be created. Reload using localhost or HTTPS and retry.',
            );
            return;
        }
        form.setData('request_key', key);
        form.transform((values) => ({
            branch_id: values.branch_id,
            items: cart,
            cash_cents: cash,
            request_key: key,
        }));
        form.post('/operations/sales', {
            preserveScroll: true,
            onSuccess: (page) => {
                const saved = page.props as unknown as LiveOperationsProps;
                setReceipt(saved.checkoutReceipt ?? null);
                setCart([]);
                form.setData({
                    branch_id: branch.id,
                    cash: '',
                    request_key: '',
                });
            },
        });
    }
    return (
        <>
            <PageHeading
                eyebrow="The sales counter"
                title="Point of sale"
                description="Sell available finished bread. Ingredient balances change through production."
                actions={
                    <StatusBadge
                        tone={data.capabilities.sell ? 'green' : 'neutral'}
                    >
                        {data.capabilities.sell
                            ? 'Ready for checkout'
                            : 'View access'}
                    </StatusBadge>
                }
            />
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
                <section
                    className="min-w-0 space-y-4"
                    aria-label="Available products"
                >
                    <div className="relative">
                        <Search
                            className="absolute top-3.5 left-3.5 size-4 text-[#9b8d7c]"
                            aria-hidden="true"
                        />
                        <Input
                            aria-label="Search products"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search products or SKU…"
                            className={`${inputClass} pl-10`}
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {categories.map((name) => (
                            <button
                                key={name}
                                type="button"
                                onClick={() => setCategory(name)}
                                aria-pressed={category === name}
                                className={`min-h-11 rounded-full px-4 text-xs focus-visible:ring-2 focus-visible:ring-[#a6533b] ${category === name ? 'bg-[#3d4938] text-white' : 'border border-[#e9e4dc] bg-white text-[#8b7963]'}`}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                    {visible.length ? (
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
                            {visible.map((product) => {
                                const count =
                                    cart.find(
                                        (line) =>
                                            line.product_id === product.id,
                                    )?.quantity_pieces ?? 0;
                                return (
                                    <article
                                        key={product.id}
                                        className="flex min-w-0 flex-col rounded-2xl border border-[#e9e4dc] bg-white p-4"
                                    >
                                        <div className="mb-4 flex items-center justify-between gap-2">
                                            <Wheat
                                                className="size-7 text-[#b68b62]"
                                                strokeWidth={1.3}
                                                aria-hidden="true"
                                            />
                                            <span className="text-[9px] text-[#a4927b]">
                                                {product.sku}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-[#a0876b]">
                                            {product.category ??
                                                'Bread & pastries'}
                                        </p>
                                        <h2 className="mt-1 text-sm font-semibold break-words">
                                            {product.name}
                                        </h2>
                                        <p className="mt-2 text-xs text-[#8f806c]">
                                            {product.available_pieces} pieces
                                            available
                                        </p>
                                        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-5">
                                            <span className="text-base font-semibold tabular-nums">
                                                {money(product.price_cents)}
                                            </span>
                                            <Button
                                                type="button"
                                                size="icon"
                                                disabled={
                                                    !data.capabilities.sell ||
                                                    form.processing ||
                                                    count >=
                                                        Math.min(
                                                            product.available_pieces,
                                                            1_000_000,
                                                        )
                                                }
                                                onClick={() =>
                                                    change(product.id, 1)
                                                }
                                                aria-label={`Add ${product.name}`}
                                                className="size-11 rounded-full bg-[#f3e8de] text-[#a6533b] shadow-none hover:bg-[#ead8c8]"
                                            >
                                                <Plus className="size-4" />
                                            </Button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    ) : (
                        <Panel>
                            <EmptyState
                                title={
                                    activeProducts.length
                                        ? 'No matching products'
                                        : 'No products ready for sale'
                                }
                                description={
                                    activeProducts.length
                                        ? 'Try a different name or category.'
                                        : 'Add products and recipes in setup, receive ingredients, and complete a production batch first.'
                                }
                            />
                        </Panel>
                    )}
                </section>
                <aside className="min-w-0 xl:sticky xl:top-6">
                    <Panel
                        title="Current order"
                        description={`${branch.name} · ${pieces} pieces`}
                        action={
                            <ShoppingBag className="size-5 text-[#aa947b]" />
                        }
                    >
                        <Inset>
                            <div className="mb-3 flex justify-end">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={!cart.length || form.processing}
                                    onClick={() => {
                                        setCart([]);
                                        form.clearErrors();
                                    }}
                                    className="text-xs text-[#a6533b]"
                                >
                                    Clear order
                                </Button>
                            </div>
                            {cart.length ? (
                                <ul className="max-h-80 divide-y divide-[#eee9e1] overflow-y-auto">
                                    {cart.map((line) => {
                                        const product =
                                            data.catalog.products.find(
                                                (item) =>
                                                    item.id === line.product_id,
                                            );
                                        return (
                                            <li
                                                key={line.product_id}
                                                className="py-4"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium break-words">
                                                            {product?.name ??
                                                                'Unavailable product'}
                                                        </p>
                                                        <p className="mt-1 text-xs text-[#9a8a76]">
                                                            {product
                                                                ? money(
                                                                      product.price_cents,
                                                                  )
                                                                : 'Unavailable'}{' '}
                                                            each
                                                        </p>
                                                    </div>
                                                    <span className="shrink-0 text-sm font-semibold">
                                                        {money(
                                                            (product?.price_cents ??
                                                                0) *
                                                                line.quantity_pieces,
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="mt-3 flex items-center justify-between">
                                                    <div className="flex items-center rounded-lg border border-[#e9e4dc]">
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="ghost"
                                                            disabled={
                                                                form.processing
                                                            }
                                                            onClick={() =>
                                                                change(
                                                                    line.product_id,
                                                                    -1,
                                                                )
                                                            }
                                                            aria-label={`Remove one ${product?.name ?? 'item'}`}
                                                            className="size-11"
                                                        >
                                                            <Minus className="size-3" />
                                                        </Button>
                                                        <span className="min-w-6 text-center text-xs">
                                                            {
                                                                line.quantity_pieces
                                                            }
                                                        </span>
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="ghost"
                                                            disabled={
                                                                form.processing ||
                                                                !product ||
                                                                line.quantity_pieces >=
                                                                    product.available_pieces
                                                            }
                                                            onClick={() =>
                                                                change(
                                                                    line.product_id,
                                                                    1,
                                                                )
                                                            }
                                                            aria-label={`Add one ${product?.name ?? 'item'}`}
                                                            className="size-11"
                                                        >
                                                            <Plus className="size-3" />
                                                        </Button>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        disabled={
                                                            form.processing
                                                        }
                                                        onClick={() => {
                                                            setCart((lines) =>
                                                                lines.filter(
                                                                    (item) =>
                                                                        item.product_id !==
                                                                        line.product_id,
                                                                ),
                                                            );
                                                            form.clearErrors();
                                                        }}
                                                        aria-label={`Remove ${product?.name ?? 'item'} from order`}
                                                        className="size-11 text-[#a08c75]"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <EmptyState
                                    title="Your next order starts here"
                                    description="Choose an available product to add it to the order."
                                />
                            )}
                            <form
                                onSubmit={checkout}
                                className="space-y-4 border-t border-[#eee9e1] pt-5"
                            >
                                <div className="flex flex-wrap justify-between gap-2">
                                    <span className="text-sm text-[#8a7962]">
                                        Order total
                                    </span>
                                    <span className="text-2xl font-semibold tabular-nums">
                                        {validTotal
                                            ? money(total)
                                            : 'Over limit'}
                                    </span>
                                </div>
                                <Field label="Cash received (PHP)">
                                    <Input
                                        name="cash"
                                        value={form.data.cash}
                                        onChange={(event) => {
                                            form.setData(
                                                'cash',
                                                event.target.value,
                                            );
                                            form.clearErrors();
                                        }}
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        disabled={form.processing}
                                        aria-invalid={Boolean(
                                            errorsFor(
                                                form.errors,
                                                'cash',
                                                'cash_cents',
                                            ),
                                        )}
                                        className={inputClass}
                                    />
                                </Field>
                                <div className="flex flex-wrap justify-between gap-2 text-sm">
                                    <span className="text-[#8a7962]">
                                        Change
                                    </span>
                                    <span className="font-medium tabular-nums">
                                        {money(
                                            Math.max(0, (cash ?? 0) - total),
                                        )}
                                    </span>
                                </div>
                                <Errors errors={form.errors} />
                                <Button
                                    type="submit"
                                    disabled={
                                        !data.capabilities.sell ||
                                        !cart.length ||
                                        form.processing
                                    }
                                    className={`${submitClass} w-full`}
                                >
                                    {form.processing
                                        ? 'Saving sale…'
                                        : 'Save cash sale'}
                                    <ArrowRight className="size-4" />
                                </Button>
                                <p className="text-[10px] leading-5 text-[#9b8a75]">
                                    Prices and stock are checked again by the
                                    server. Keep the same order when retrying an
                                    interrupted request.
                                </p>
                            </form>
                        </Inset>
                    </Panel>
                </aside>
            </div>
            <Dialog
                open={receipt !== null}
                onOpenChange={(open) => {
                    if (!open) setReceipt(null);
                }}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto bg-[#fffcf7] sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Saved receipt</DialogTitle>
                        <DialogDescription>
                            The transaction below is recorded for this branch.
                        </DialogDescription>
                    </DialogHeader>
                    {receipt && (
                        <SavedReceipt
                            sale={receipt}
                            timezone={data.period.timezone}
                        />
                    )}
                    <Button
                        type="button"
                        onClick={() => setReceipt(null)}
                        className={submitClass}
                    >
                        Back to the counter
                    </Button>
                </DialogContent>
            </Dialog>
        </>
    );
}

const statusLabels = {
    planned: 'Planned',
    mixing: 'Mixing',
    baking: 'In the oven',
    completed: 'Completed',
};
const statusTones = {
    planned: 'neutral',
    mixing: 'terra',
    baking: 'amber',
    completed: 'green',
} as const;

function BatchRow({
    batch,
    data,
}: {
    batch: OperationsBatch;
    data: LiveOperationsProps;
}) {
    const next =
        batch.status === 'planned'
            ? 'mixing'
            : batch.status === 'mixing'
              ? 'baking'
              : 'completed';
    const form = useForm({
        branch_id: data.currentBranch!.id,
        status: next,
        actual: '',
    });
    function advance(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (
            !data.capabilities.produce ||
            form.processing ||
            batch.status === 'completed'
        )
            return;
        const actual =
            next === 'completed'
                ? scaledInteger(form.data.actual, 0, 1_000_000_000)
                : null;
        if (next === 'completed' && actual === null) {
            form.setError(
                'actual',
                'Enter the actual whole-piece yield, including 0 if none were usable.',
            );
            event.currentTarget
                .querySelector<HTMLInputElement>('[name="actual"]')
                ?.focus();
            return;
        }
        form.transform((values) => ({
            branch_id: values.branch_id,
            status: next,
            ...(next === 'completed' ? { actual_pieces: actual } : {}),
        }));
        form.patch(`/operations/production/${batch.id}`, {
            preserveScroll: true,
        });
    }
    return (
        <li className="rounded-xl border border-[#e9e4dc] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] text-[#9b876d]">
                        Batch #{batch.id} · Recipe v{batch.recipe_version}
                    </p>
                    <h3 className="mt-1 text-base font-semibold">
                        {batch.product_name}
                    </h3>
                </div>
                <StatusBadge tone={statusTones[batch.status]}>
                    {statusLabels[batch.status]}
                </StatusBadge>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#8c7d68]">
                <span>
                    {batch.batch_count}{' '}
                    {batch.batch_count === 1 ? 'batch' : 'batches'}
                </span>
                <span>
                    Planned{' '}
                    <strong className="font-medium text-[#5e503e]">
                        {batch.planned_pieces} pcs
                    </strong>
                </span>
                {batch.actual_pieces !== null && (
                    <span>
                        Actual{' '}
                        <strong className="font-medium text-[#637658]">
                            {batch.actual_pieces} pcs
                        </strong>
                    </span>
                )}
            </div>
            {batch.status !== 'completed' && data.capabilities.produce && (
                <form
                    onSubmit={advance}
                    className="mt-4 space-y-3 border-t border-[#eee9e1] pt-4"
                >
                    {next === 'completed' && (
                        <Field
                            label="Actual usable output (pieces)"
                            hint="Enter the finished yield. Zero is allowed for a batch with no usable output."
                        >
                            <Input
                                name="actual"
                                value={form.data.actual}
                                onChange={(event) => {
                                    form.setData('actual', event.target.value);
                                    form.clearErrors();
                                }}
                                inputMode="numeric"
                                disabled={form.processing}
                                aria-invalid={Boolean(
                                    errorsFor(
                                        form.errors,
                                        'actual',
                                        'actual_pieces',
                                    ),
                                )}
                                className={inputClass}
                            />
                        </Field>
                    )}
                    <Errors errors={form.errors} />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="max-w-sm text-[10px] leading-5 text-[#9a8972]">
                            {next === 'mixing'
                                ? 'Starting mixing consumes the saved recipe ingredients once.'
                                : next === 'baking'
                                  ? 'Ingredients were consumed when mixing began.'
                                  : 'Completing adds only the actual usable yield to finished stock.'}
                        </span>
                        <Button
                            type="submit"
                            disabled={form.processing}
                            variant="outline"
                            className="h-11 border-[#dfd2c2] text-xs text-[#936043]"
                        >
                            {form.processing
                                ? 'Saving…'
                                : next === 'mixing'
                                  ? 'Start mixing'
                                  : next === 'baking'
                                    ? 'Move to oven'
                                    : 'Complete batch'}
                            <ArrowRight className="size-3.5" />
                        </Button>
                    </div>
                </form>
            )}
        </li>
    );
}

function Production({ data }: { data: LiveOperationsProps }) {
    const products = data.catalog.products.filter(
        (product) => product.active && product.current_recipe_id !== null,
    );
    const form = useForm({
        branch_id: data.currentBranch!.id,
        product_id: String(products[0]?.id ?? ''),
        batch_count: '1',
        request_key: '',
    });
    const [filter, setFilter] = useState('all');
    const eligible = products.find(
        (product) => product.id === Number(form.data.product_id),
    );
    const recipe = data.catalog.recipes.find(
        (item) => item.id === eligible?.current_recipe_id,
    );
    const count = scaledInteger(form.data.batch_count, 0, 1000);
    const visible = data.records.batches.filter(
        (batch) => filter === 'all' || batch.status === filter,
    );
    function plan(event: FormEvent) {
        event.preventDefault();
        if (form.processing || !data.capabilities.produce) return;
        if (!count || !eligible) {
            form.setError(
                'batch_count',
                'Choose a product with a recipe and 1–1,000 whole batches.',
            );
            return;
        }
        const key = form.data.request_key || requestKey();
        if (!key) {
            form.setError(
                'request_key',
                'A request identifier could not be created. Reload using localhost or HTTPS and retry.',
            );
            return;
        }
        form.setData('request_key', key);
        form.transform((values) => ({
            branch_id: values.branch_id,
            product_id: Number(values.product_id),
            batch_count: count,
            request_key: key,
        }));
        form.post('/operations/production', {
            preserveScroll: true,
            onSuccess: () =>
                form.setData({
                    branch_id: data.currentBranch!.id,
                    product_id: form.data.product_id,
                    batch_count: '1',
                    request_key: '',
                }),
        });
    }
    return (
        <>
            <PageHeading
                eyebrow="Inside the kitchen"
                title="The baking board"
                description="Plan a recipe version, consume ingredients when mixing starts, and record the actual finished yield."
            />
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <Panel
                    title="Recent production"
                    description="Latest 50 saved batches for this branch."
                >
                    <Inset>
                        <div className="mb-5 flex flex-wrap gap-2">
                            {[
                                'all',
                                'planned',
                                'mixing',
                                'baking',
                                'completed',
                            ].map((status) => (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => setFilter(status)}
                                    aria-pressed={filter === status}
                                    className={`min-h-11 rounded-lg px-3 text-[11px] focus-visible:ring-2 focus-visible:ring-[#a6533b] ${filter === status ? 'bg-[#3d4938] text-white' : 'bg-[#f5f0e7] text-[#8a765f]'}`}
                                >
                                    {status === 'all'
                                        ? 'All batches'
                                        : statusLabels[
                                              status as keyof typeof statusLabels
                                          ]}
                                </button>
                            ))}
                        </div>
                        {visible.length ? (
                            <ul className="space-y-4">
                                {visible.map((batch) => (
                                    <BatchRow
                                        key={`${batch.id}-${batch.status}`}
                                        batch={batch}
                                        data={data}
                                    />
                                ))}
                            </ul>
                        ) : (
                            <EmptyState
                                title="No batches in this view"
                                description="A product needs a recipe before a production batch can be planned."
                            />
                        )}
                    </Inset>
                </Panel>
                <Panel
                    title="Plan a batch"
                    description={data.currentBranch!.name}
                >
                    <Inset>
                        {data.capabilities.produce ? (
                            <form onSubmit={plan} className="space-y-4">
                                <Field label="Product">
                                    <select
                                        value={form.data.product_id}
                                        onChange={(event) => {
                                            form.setData(
                                                'product_id',
                                                event.target.value,
                                            );
                                            form.clearErrors();
                                        }}
                                        className={inputClass}
                                        disabled={
                                            !products.length || form.processing
                                        }
                                    >
                                        <option value="" disabled>
                                            Select a product
                                        </option>
                                        {products.map((product) => (
                                            <option
                                                key={product.id}
                                                value={product.id}
                                            >
                                                {product.name}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field
                                    label="Number of recipe batches"
                                    hint="Whole batches · maximum 1,000"
                                >
                                    <Input
                                        value={form.data.batch_count}
                                        onChange={(event) => {
                                            form.setData(
                                                'batch_count',
                                                event.target.value,
                                            );
                                            form.clearErrors();
                                        }}
                                        inputMode="numeric"
                                        disabled={form.processing}
                                        className={inputClass}
                                    />
                                </Field>
                                {recipe && (
                                    <div className="rounded-xl bg-[#f3f1e7] p-4 text-xs leading-6 text-[#817156]">
                                        <p className="font-medium">
                                            Recipe v{recipe.version} ·{' '}
                                            {recipe.yield_pieces} pcs per batch
                                        </p>
                                        <p>
                                            Planned output:{' '}
                                            {count
                                                ? recipe.yield_pieces * count
                                                : 0}{' '}
                                            pieces
                                        </p>
                                        <p className="mt-2 text-[10px]">
                                            Requirements are pinned to this
                                            plan. Planning alone does not deduct
                                            stock.
                                        </p>
                                    </div>
                                )}
                                <Errors errors={form.errors} />
                                <Button
                                    type="submit"
                                    disabled={
                                        !products.length || form.processing
                                    }
                                    className={`${submitClass} w-full`}
                                >
                                    {form.processing
                                        ? 'Saving plan…'
                                        : 'Save production plan'}
                                    <Plus className="size-4" />
                                </Button>
                                {!products.length && (
                                    <p className="text-xs leading-6 text-[#9b8870]">
                                        An owner must add a product and its
                                        recipe in setup first.
                                    </p>
                                )}
                            </form>
                        ) : (
                            <p className="text-xs leading-6 text-[#8c7d68]">
                                Your branch role allows viewing production. A
                                baker, supervisor, or owner can update batches.
                            </p>
                        )}
                    </Inset>
                </Panel>
            </div>
        </>
    );
}

function Inventory({ data }: { data: LiveOperationsProps }) {
    const active = data.catalog.ingredients.filter(
        (ingredient) => ingredient.active,
    );
    const form = useForm({
        branch_id: data.currentBranch!.id,
        ingredient_id: String(active[0]?.id ?? ''),
        quantity: '',
        reference: '',
        request_key: '',
    });
    const selected = active.find(
        (ingredient) => ingredient.id === Number(form.data.ingredient_id),
    );
    function receive(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (form.processing || !data.capabilities.manage_stock) return;
        const milli = scaledInteger(form.data.quantity, 3, 1_000_000_000_000);
        if (
            !selected ||
            milli === null ||
            milli <= 0 ||
            (selected.unit === 'pcs' && milli % 1000 !== 0)
        ) {
            form.setError(
                'quantity',
                selected?.unit === 'pcs'
                    ? 'Enter a positive whole number of pieces.'
                    : 'Enter a positive quantity with up to three decimal places.',
            );
            event.currentTarget
                .querySelector<HTMLInputElement>('[name="quantity"]')
                ?.focus();
            return;
        }
        const key = form.data.request_key || requestKey();
        if (!key) {
            form.setError(
                'request_key',
                'A request identifier could not be created. Reload using localhost or HTTPS and retry.',
            );
            return;
        }
        form.setData('request_key', key);
        form.transform((values) => ({
            branch_id: values.branch_id,
            ingredient_id: Number(values.ingredient_id),
            quantity_milli: milli,
            reference: values.reference.trim() || null,
            request_key: key,
        }));
        form.post('/operations/receipts', {
            preserveScroll: true,
            onSuccess: () =>
                form.setData({
                    branch_id: data.currentBranch!.id,
                    ingredient_id: form.data.ingredient_id,
                    quantity: '',
                    reference: '',
                    request_key: '',
                }),
        });
    }
    return (
        <>
            <PageHeading
                eyebrow="Ingredients & finished goods"
                title="Inventory"
                description="Saved balances for this branch, with a traceable movement for every receipt, production start, output, and sale."
            />
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0 space-y-6">
                    <Panel
                        title="Raw ingredients"
                        description="Current branch balances. Quantities use each ingredient’s declared unit."
                    >
                        {data.catalog.ingredients.length ? (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[420px] text-left text-xs">
                                    <thead className="border-y border-[#eee9e1] bg-[#faf8f3] text-[10px] text-[#99866f]">
                                        <tr>
                                            <th className="px-5 py-3 font-medium">
                                                Ingredient
                                            </th>
                                            <th className="px-4 py-3 text-right font-medium">
                                                On hand
                                            </th>
                                            <th className="px-5 py-3 text-right font-medium">
                                                State
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#eee9e1]">
                                        {data.catalog.ingredients.map(
                                            (ingredient) => (
                                                <tr key={ingredient.id}>
                                                    <td className="px-5 py-4">
                                                        <p className="font-medium">
                                                            {ingredient.name}
                                                        </p>
                                                        <p className="mt-1 text-[10px] text-[#a18c73]">
                                                            {ingredient.code}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-4 text-right font-semibold tabular-nums">
                                                        {quantity(
                                                            ingredient.quantity_milli,
                                                        )}{' '}
                                                        {ingredient.unit}
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        <StatusBadge
                                                            tone={
                                                                !ingredient.active
                                                                    ? 'neutral'
                                                                    : ingredient.quantity_milli ===
                                                                        0
                                                                      ? 'amber'
                                                                      : 'green'
                                                            }
                                                        >
                                                            {!ingredient.active
                                                                ? 'Inactive'
                                                                : ingredient.quantity_milli ===
                                                                    0
                                                                  ? 'No stock'
                                                                  : 'On hand'}
                                                        </StatusBadge>
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <EmptyState
                                title="No ingredients in the catalog"
                                description="An owner can define ingredients and units in setup. Branch balances begin at zero."
                            />
                        )}
                    </Panel>
                    <Panel
                        title="Finished products"
                        description="Production output increases these balances. Sales reduce them."
                    >
                        <Inset>
                            {data.catalog.products.length ? (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {data.catalog.products.map((product) => (
                                        <div
                                            key={product.id}
                                            className="flex items-center justify-between gap-4 rounded-xl border border-[#eee9e1] p-4"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium break-words">
                                                    {product.name}
                                                </p>
                                                <p className="mt-1 text-[10px] text-[#9f8a71]">
                                                    {product.sku}
                                                </p>
                                            </div>
                                            <span className="shrink-0 text-sm font-semibold tabular-nums">
                                                {product.available_pieces} pcs
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    title="No products yet"
                                    description="Create products and recipes before planning your first batch."
                                />
                            )}
                        </Inset>
                    </Panel>
                </div>
                <Panel
                    title="Receive ingredients"
                    description="Record stock only after it has arrived."
                >
                    <Inset>
                        {data.capabilities.manage_stock ? (
                            <form onSubmit={receive} className="space-y-4">
                                <Field label="Ingredient">
                                    <select
                                        value={form.data.ingredient_id}
                                        onChange={(event) => {
                                            form.setData(
                                                'ingredient_id',
                                                event.target.value,
                                            );
                                            form.clearErrors();
                                        }}
                                        className={inputClass}
                                        disabled={
                                            !active.length || form.processing
                                        }
                                    >
                                        <option value="" disabled>
                                            Select an ingredient
                                        </option>
                                        {active.map((ingredient) => (
                                            <option
                                                key={ingredient.id}
                                                value={ingredient.id}
                                            >
                                                {ingredient.name} (
                                                {ingredient.unit})
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field
                                    label={`Received quantity (${selected?.unit ?? 'declared unit'})`}
                                    hint={
                                        selected?.unit === 'pcs'
                                            ? 'Whole pieces only'
                                            : 'Up to three decimal places'
                                    }
                                >
                                    <Input
                                        name="quantity"
                                        inputMode="decimal"
                                        value={form.data.quantity}
                                        onChange={(event) => {
                                            form.setData(
                                                'quantity',
                                                event.target.value,
                                            );
                                            form.clearErrors();
                                        }}
                                        disabled={form.processing}
                                        aria-invalid={Boolean(
                                            errorsFor(
                                                form.errors,
                                                'quantity',
                                                'quantity_milli',
                                            ),
                                        )}
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Delivery reference (optional)">
                                    <Input
                                        value={form.data.reference}
                                        onChange={(event) =>
                                            form.setData(
                                                'reference',
                                                event.target.value,
                                            )
                                        }
                                        maxLength={120}
                                        disabled={form.processing}
                                        placeholder="Supplier delivery note"
                                        className={inputClass}
                                    />
                                </Field>
                                <Errors errors={form.errors} />
                                <Button
                                    type="submit"
                                    disabled={!active.length || form.processing}
                                    className={`${submitClass} w-full`}
                                >
                                    {form.processing
                                        ? 'Saving receipt…'
                                        : 'Save stock receipt'}
                                    <Plus className="size-4" />
                                </Button>
                            </form>
                        ) : (
                            <p className="text-xs leading-6 text-[#8d7d68]">
                                A supervisor or owner can receive ingredients
                                for this branch.
                            </p>
                        )}
                    </Inset>
                </Panel>
            </div>
            <Panel
                title="Recent stock movements"
                description="Latest 50 movements for this branch, across all dates."
                className="mt-6"
            >
                {data.records.movements.length ? (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[620px] text-left text-xs">
                            <thead className="border-y border-[#eee9e1] bg-[#faf8f3] text-[10px] text-[#96846e]">
                                <tr>
                                    <th className="px-5 py-3 font-medium">
                                        Item
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Movement
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium">
                                        Quantity
                                    </th>
                                    <th className="px-5 py-3 font-medium">
                                        Recorded · {data.period.timezone}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#eee9e1]">
                                {data.records.movements.map((movement) => (
                                    <tr key={movement.id}>
                                        <td className="px-5 py-4 font-medium">
                                            {movement.item_name}
                                        </td>
                                        <td className="px-4 py-4 text-[#8c7a64]">
                                            {
                                                {
                                                    ingredient_receipt:
                                                        'Ingredient receipt',
                                                    production_consumption:
                                                        'Production use',
                                                    production_output:
                                                        'Production output',
                                                    sale: 'Sale',
                                                }[movement.kind]
                                            }
                                        </td>
                                        <td
                                            className={`px-4 py-4 text-right font-medium tabular-nums ${movement.quantity_milli > 0 ? 'text-[#637b55]' : 'text-[#a66a47]'}`}
                                        >
                                            {movement.quantity_milli > 0
                                                ? '+'
                                                : ''}
                                            {quantity(movement.quantity_milli)}{' '}
                                            {movement.unit}
                                        </td>
                                        <td className="px-5 py-4 text-[#8c7a64]">
                                            {timestamp(
                                                movement.created_at,
                                                data.period.timezone,
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState
                        title="No stock movements yet"
                        description="Receive an ingredient delivery to create the first movement."
                    />
                )}
            </Panel>
        </>
    );
}

function Summary({ data }: { data: LiveOperationsProps }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
                label="Recorded sales"
                value={money(data.summary.sales_cents)}
                hint={`${data.period.from} to ${data.period.to}`}
            />
            <StatCard
                label="Sales transactions"
                value={data.summary.sale_count}
                hint="Saved checkouts in the selected period"
            />
            <StatCard
                label="Finished production"
                value={`${data.summary.produced_pieces} pcs`}
                hint="Actual completed output in the period"
            />
            <StatCard
                label="Ingredients tracked"
                value={data.summary.ingredient_count}
                hint="Branch ingredient balance records"
            />
        </div>
    );
}

function Dashboard({ data }: { data: LiveOperationsProps }) {
    const branch = data.currentBranch!;
    return (
        <>
            <PageHeading
                eyebrow="A clearer baking day"
                title={branch.name}
                description={`Your recorded operations for ${data.period.from}${data.period.to === data.period.from ? '' : ` to ${data.period.to}`} · ${data.period.timezone}`}
                actions={
                    data.capabilities.manage_catalog && (
                        <Button asChild variant="outline" className="h-11">
                            <Link href={`/setup?branch=${branch.id}`}>
                                <Settings2 className="size-4" />
                                Manage setup
                            </Link>
                        </Button>
                    )
                }
            />
            <Summary data={data} />
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
                {[
                    {
                        title: 'At the counter',
                        detail: 'Sell available finished bread and record cash received.',
                        href: 'pos',
                        icon: ShoppingBag,
                    },
                    {
                        title: 'Inside the kitchen',
                        detail: 'Plan recipe batches and record each stage and actual yield.',
                        href: 'production',
                        icon: ChefHat,
                    },
                    {
                        title: 'On the shelves',
                        detail: 'Review balances, receive ingredients, and trace movements.',
                        href: 'inventory',
                        icon: Package,
                    },
                ].map((item) => (
                    <Link
                        key={item.href}
                        href={`/${item.href}?branch=${branch.id}`}
                        className="rounded-2xl border border-[#e9e4dc] bg-white p-5 transition-colors hover:bg-[#fcf8f1] focus-visible:ring-2 focus-visible:ring-[#a6533b]"
                    >
                        <item.icon
                            className="mb-4 size-6 text-[#a67f59]"
                            strokeWidth={1.5}
                        />
                        <h2 className="text-sm font-semibold">{item.title}</h2>
                        <p className="mt-2 text-xs leading-6 text-[#8e7f6a]">
                            {item.detail}
                        </p>
                        <ArrowRight className="mt-4 size-4 text-[#a6533b]" />
                    </Link>
                ))}
            </div>
            {data.catalog.products.length === 0 && (
                <div className="mt-6 rounded-2xl border border-[#e0e4d5] bg-[#f0f3e8] p-5">
                    <h2 className="text-sm font-semibold text-[#617553]">
                        Start with the ingredients behind your bake.
                    </h2>
                    <p className="mt-2 text-xs leading-6 text-[#80916f]">
                        {data.capabilities.manage_catalog
                            ? 'Open setup to add products, ingredient units, and recipes. Then receive stock and plan the first batch.'
                            : 'Your owner can add the catalog and recipes before the first production run.'}
                    </p>
                </div>
            )}
            <Panel
                title="Recent sales"
                description="Latest 50 saved sales within the selected period."
                className="mt-6"
            >
                <SalesTable data={data} />
            </Panel>
        </>
    );
}

function Reports({ data }: { data: LiveOperationsProps }) {
    const form = useForm({
        branch: data.currentBranch!.id,
        from: data.period.from,
        to: data.period.to,
    });
    function exportSales() {
        downloadCsv(
            `smartbaking-sales-${data.currentBranch!.code}-${data.period.from}-${data.period.to}.csv`,
            [
                [
                    'Branch',
                    'Sale ID',
                    'Recorded UTC',
                    'Products',
                    'Total pieces',
                    'Sale total PHP',
                    'Cash PHP',
                    'Change PHP',
                ],
                ...data.records.sales.map((sale) => [
                    data.currentBranch!.name,
                    sale.id,
                    sale.occurred_at,
                    sale.items
                        .map(
                            (item) =>
                                `${item.quantity_pieces} x ${item.product_name}`,
                        )
                        .join('; '),
                    sale.items.reduce(
                        (sum, item) => sum + item.quantity_pieces,
                        0,
                    ),
                    (sale.total_cents / 100).toFixed(2),
                    (sale.cash_cents / 100).toFixed(2),
                    (sale.change_cents / 100).toFixed(2),
                ]),
            ],
        );
    }
    return (
        <>
            <PageHeading
                eyebrow="Understand the day"
                title="Reports"
                description="Actual saved transactions and completed production for the selected branch and dates."
                actions={
                    <Button
                        type="button"
                        variant="outline"
                        className="h-11"
                        onClick={exportSales}
                        disabled={!data.records.sales.length}
                    >
                        <Download className="size-4" />
                        Export displayed sales
                    </Button>
                }
            />
            <Panel
                title="Reporting period"
                description={`Dates are interpreted in ${data.period.timezone}.`}
            >
                <Inset>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            form.get('/reports', {
                                preserveState: true,
                                preserveScroll: true,
                            });
                        }}
                        className="space-y-3"
                    >
                        <div className="flex flex-wrap items-end gap-4">
                            <Field label="From">
                                <Input
                                    type="date"
                                    value={form.data.from}
                                    onChange={(event) => {
                                        form.setData(
                                            'from',
                                            event.target.value,
                                        );
                                        form.clearErrors();
                                    }}
                                    required
                                    className={inputClass}
                                />
                            </Field>
                            <Field label="To">
                                <Input
                                    type="date"
                                    value={form.data.to}
                                    onChange={(event) => {
                                        form.setData('to', event.target.value);
                                        form.clearErrors();
                                    }}
                                    required
                                    className={inputClass}
                                />
                            </Field>
                            <Button
                                type="submit"
                                disabled={form.processing}
                                className={submitClass}
                            >
                                {form.processing ? 'Loading…' : 'Apply dates'}
                            </Button>
                        </div>
                        <Errors errors={form.errors} />
                    </form>
                </Inset>
            </Panel>
            <div className="mt-6">
                <Summary data={data} />
            </div>
            <Panel
                title="Sales detail"
                description={`Showing ${data.records.sales.length} of ${data.summary.sale_count} sales in this period, newest first. The CSV exports only these displayed sales; totals above cover the entire selected period.`}
                className="mt-6"
            >
                <SalesTable data={data} />
            </Panel>
        </>
    );
}

function ForecastReadiness({ data }: { data: LiveOperationsProps }) {
    const readiness = data.dataReadiness;
    return (
        <>
            <PageHeading
                eyebrow="Prepare for prediction"
                title="Forecast readiness"
                description="Check the historical observations available for this branch before fitting and evaluating a model."
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Historical intervals"
                    value={readiness.observation_count}
                    hint="Imported observations for this branch"
                />
                <StatCard
                    label="Observed intervals"
                    value={readiness.observed_count}
                    hint="Recorded sales observations"
                />
                <StatCard
                    label="Stock-out intervals"
                    value={readiness.stockout_count}
                    hint="Sales constrained by availability"
                />
                <StatCard
                    label="Missing intervals"
                    value={readiness.missing_count}
                    hint="Unobserved, rather than zero demand"
                />
            </div>
            <Panel
                title="No trained forecast is connected"
                description="Forecast charts and replenishment predictions will appear only when a validated model supplies them."
                className="mt-6"
            >
                <Inset>
                    <div className="grid gap-6 md:grid-cols-[auto_1fr]">
                        <span className="flex size-14 items-center justify-center rounded-2xl bg-[#eef0e4] text-[#78866b]">
                            <FlaskConical
                                className="size-6"
                                strokeWidth={1.5}
                            />
                        </span>
                        <div>
                            <p className="text-sm leading-7 text-[#85735b]">
                                {readiness.observation_count === 0
                                    ? 'This branch has no imported sales history yet. Begin recording operations and arrange a historical data import with the owner.'
                                    : 'Historical records are available. They still need coverage checks, chronological evaluation, and comparison against a seasonal baseline before a forecast can guide production.'}
                            </p>
                            <dl className="mt-5 grid gap-4 text-xs sm:grid-cols-2">
                                <div>
                                    <dt className="text-[#a08c73]">
                                        First recorded interval
                                    </dt>
                                    <dd className="mt-1.5 font-medium">
                                        {timestamp(
                                            readiness.first_at,
                                            data.period.timezone,
                                        )}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-[#a08c73]">
                                        Latest recorded interval
                                    </dt>
                                    <dd className="mt-1.5 font-medium">
                                        {timestamp(
                                            readiness.last_at,
                                            data.period.timezone,
                                        )}
                                    </dd>
                                </div>
                            </dl>
                            <p className="mt-5 text-xs leading-6 text-[#9b886e]">
                                Daily and hourly models need timestamped product
                                sales, known holiday/payday calendars, and clear
                                stock-out or missing-data flags. Ingredient
                                predictions will additionally use recipes,
                                production plans, and supplier lead times.
                            </p>
                        </div>
                    </div>
                </Inset>
            </Panel>
        </>
    );
}

function Team({ data }: { data: LiveOperationsProps }) {
    return (
        <>
            <PageHeading
                eyebrow="The people behind the bake"
                title="Team access"
                description="Real branch memberships. Attendance and payroll are not recorded here."
            />
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <Panel
                    title="Branch memberships"
                    description={data.currentBranch!.name}
                >
                    {data.capabilities.manage_team ? (
                        data.records.memberships.length ? (
                            <ul className="divide-y divide-[#eee9e1]">
                                {data.records.memberships.map((person) => (
                                    <li
                                        key={person.id}
                                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6"
                                    >
                                        <div>
                                            <p className="text-sm font-medium">
                                                {person.name}
                                            </p>
                                            <p className="mt-1 text-xs text-[#98846b]">
                                                {person.email}
                                            </p>
                                        </div>
                                        <StatusBadge>{person.role}</StatusBadge>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <EmptyState
                                title="No branch memberships"
                                description="Grant a verified staff account access using the form."
                            />
                        )
                    ) : (
                        <EmptyState
                            title="Team access is managed by the owner"
                            description="Ask your owner to review or change staff branch access."
                        />
                    )}
                </Panel>
                {data.capabilities.manage_team && (
                    <MembershipForm
                        key={data.currentBranch!.id}
                        branchId={data.currentBranch!.id}
                        availableBranches={data.availableBranches}
                        memberships={data.records.memberships}
                    />
                )}
            </div>
        </>
    );
}

export default function OperationsWorkspace() {
    const data = usePage<LiveOperationsProps>().props;
    const title = {
        dashboard: 'Overview',
        pos: 'Point of sale',
        production: 'Production',
        inventory: 'Inventory',
        forecasts: 'Forecast readiness',
        transfers: 'Stock transfers',
        team: 'Team access',
        reports: 'Reports',
        setup: 'Bakery setup',
    }[data.screen];
    if (data.capabilities.can_bootstrap)
        return (
            <>
                <Head title="Initial setup" />
                <Bootstrap />
            </>
        );
    if (!data.currentBranch && !data.capabilities.manage_catalog)
        return (
            <>
                <Head title="Branch access" />
                <PageHeading
                    eyebrow="Your SmartBaking workspace"
                    title="Branch access needed"
                    description="Your account is verified. An owner must assign you to a branch before you can view or record bakery operations."
                />
                <Panel>
                    <EmptyState
                        title="No assigned baking branch"
                        description="Ask the owner to grant branch access using your registered email."
                    />
                </Panel>
            </>
        );
    const setup = (
        <CatalogSetup
            branchId={data.currentBranch?.id ?? null}
            products={data.catalog.products}
            ingredients={data.catalog.ingredients}
            availableBranches={data.availableBranches}
            memberships={data.records.memberships}
        />
    );
    return (
        <div key={`${data.screen}-${data.currentBranch?.id ?? 'none'}`}>
            <Head title={title} />
            {!data.currentBranch || data.screen === 'setup' ? (
                data.capabilities.manage_catalog ? (
                    <>
                        <PageHeading
                            eyebrow="Build your bakery’s foundation"
                            title="Bakery setup"
                            description="Define branches, products, ingredient units, versioned recipes, and verified staff access."
                        />
                        {setup}
                    </>
                ) : (
                    <>
                        <PageHeading
                            title="Owner access required"
                            description="Catalog and team configuration are managed by the installation owner."
                        />
                        <Panel>
                            <EmptyState
                                title="Setup is restricted"
                                description="You can continue to the operations allowed by your branch role."
                            />
                        </Panel>
                    </>
                )
            ) : data.screen === 'pos' ? (
                <PointOfSale data={data} />
            ) : data.screen === 'production' ? (
                <Production data={data} />
            ) : data.screen === 'inventory' ? (
                <Inventory data={data} />
            ) : data.screen === 'reports' ? (
                <Reports data={data} />
            ) : data.screen === 'forecasts' ? (
                <ForecastReadiness data={data} />
            ) : data.screen === 'team' ? (
                <Team data={data} />
            ) : data.screen === 'transfers' ? (
                <>
                    <PageHeading
                        eyebrow="Between your branches"
                        title="Stock transfers"
                        description="Each branch currently records its own production, ingredient receipts, and sales."
                    />
                    <Panel>
                        <EmptyState
                            title="Branch transfers are not available yet"
                            description="No transfer requests or stock movements are created from this screen."
                        />
                    </Panel>
                </>
            ) : (
                <Dashboard data={data} />
            )}
        </div>
    );
}
