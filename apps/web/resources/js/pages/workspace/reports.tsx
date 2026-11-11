import { Head } from '@inertiajs/react';
import {
    BarChart3,
    Download,
    ReceiptText,
    ShoppingBag,
    Wheat,
} from 'lucide-react';
import { useState } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import {
    PageHeading,
    Panel,
    StatCard,
    StatusBadge,
} from '@/components/workspace/ui';
import { useWorkspace } from '@/components/workspace/workspace-provider';
import { branches, currency, downloadCsv } from '@/lib/workspace';

const productProfiles = [
    { name: 'Classic pandesal', share: 0.48, price: 5, color: '#a6533b' },
    { name: 'Spanish bread', share: 0.25, price: 10, color: '#73836d' },
    { name: 'Cheese ensaymada', share: 0.17, price: 25, color: '#d5aa65' },
    { name: 'Soft milk loaf', share: 0.1, price: 65, color: '#b7aaa0' },
];

const fixtures = [
    {
        date: '2026-10-29',
        label: '29 Oct',
        units: 1320,
        waste: 38,
        transactions: 172,
    },
    {
        date: '2026-10-30',
        label: '30 Oct',
        units: 1460,
        waste: 42,
        transactions: 188,
    },
    {
        date: '2026-10-31',
        label: '31 Oct',
        units: 1710,
        waste: 45,
        transactions: 216,
    },
    {
        date: '2026-11-01',
        label: '1 Nov',
        units: 1650,
        waste: 48,
        transactions: 209,
    },
    {
        date: '2026-11-02',
        label: '2 Nov',
        units: 1390,
        waste: 35,
        transactions: 179,
    },
    {
        date: '2026-11-03',
        label: '3 Nov',
        units: 1280,
        waste: 33,
        transactions: 166,
    },
    {
        date: '2026-11-04',
        label: '4 Nov',
        units: 1370,
        waste: 32,
        transactions: 175,
    },
    {
        date: '2026-11-05',
        label: '5 Nov',
        units: 1410,
        waste: 34,
        transactions: 182,
    },
    {
        date: '2026-11-06',
        label: '6 Nov',
        units: 1530,
        waste: 31,
        transactions: 195,
    },
    {
        date: '2026-11-07',
        label: '7 Nov',
        units: 1790,
        waste: 39,
        transactions: 228,
    },
    {
        date: '2026-11-08',
        label: '8 Nov',
        units: 1680,
        waste: 37,
        transactions: 215,
    },
    {
        date: '2026-11-09',
        label: '9 Nov',
        units: 1440,
        waste: 28,
        transactions: 184,
    },
    {
        date: '2026-11-10',
        label: '10 Nov',
        units: 1380,
        waste: 30,
        transactions: 177,
    },
    {
        date: '2026-11-11',
        label: '11 Nov',
        units: 1480,
        waste: 29,
        transactions: 190,
    },
];

function productQuantities(units: number) {
    const counts = productProfiles
        .slice(0, -1)
        .map((product) => Math.round(units * product.share));
    return [...counts, units - counts.reduce((sum, count) => sum + count, 0)];
}

export default function Reports() {
    const { branch } = useWorkspace();
    const [days, setDays] = useState<7 | 14>(7);
    const [lastDownload, setLastDownload] = useState<{
        context: string;
        message: string;
    } | null>(null);
    const downloadContext = `${branch}|${days}`;
    const downloadMessage =
        lastDownload?.context === downloadContext ? lastDownload.message : '';
    const branchFactor =
        [1, 0.88, 0.76][Math.max(0, branches.indexOf(branch))] ?? 1;
    const rows = fixtures.slice(-days).map((day) => {
        const units = Math.round(day.units * branchFactor);
        const quantities = productQuantities(units);
        return {
            ...day,
            units,
            quantities,
            revenue: quantities.reduce(
                (sum, quantity, index) =>
                    sum + quantity * productProfiles[index].price,
                0,
            ),
            waste: Math.round(day.waste * branchFactor),
            transactions: Math.round(day.transactions * branchFactor),
        };
    });
    const totals = rows.reduce(
        (sum, row) => ({
            revenue: sum.revenue + row.revenue,
            units: sum.units + row.units,
            waste: sum.waste + row.waste,
            transactions: sum.transactions + row.transactions,
        }),
        { revenue: 0, units: 0, waste: 0, transactions: 0 },
    );
    const productRows = productProfiles.map((product, index) => {
        const units = rows.reduce((sum, row) => sum + row.quantities[index], 0);
        return { ...product, units, revenue: units * product.price };
    });
    const peak = rows.reduce((highest, row) =>
        row.revenue > highest.revenue ? row : highest,
    );
    const windowLabel = `${rows[0].label}–11 Nov 2026`;

    function exportReport() {
        downloadCsv(`smartbaking-sample-report-${days}days.csv`, [
            [
                'Data source',
                'Date (PHT)',
                'Branch',
                'Sales value (PHP)',
                'Pieces sold',
                'Waste logged (pcs)',
                'Transactions',
            ],
            ...rows.map((row) => [
                'synthetic_demo',
                row.date,
                branch,
                row.revenue,
                row.units,
                row.waste,
                row.transactions,
            ]),
        ]);
        setLastDownload({
            context: downloadContext,
            message: `Sample ${days}-day CSV for ${branch} prepared for download.`,
        });
    }

    return (
        <>
            <Head title="Reports" />
            <div className="space-y-7">
                <PageHeading
                    eyebrow="THE BIGGER PICTURE"
                    title="Every day has a story."
                    description={`A clear view of sales and waste for ${branch}. All figures below are synthetic demonstration records.`}
                    actions={
                        <Button
                            variant="outline"
                            onClick={exportReport}
                            className="border-[#dfd7cd] bg-white text-[#53483e]"
                        >
                            <Download aria-hidden="true" /> Export sample CSV
                        </Button>
                    }
                />

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <StatusBadge tone="terra">Sample records</StatusBadge>
                        <p className="text-sm text-[#756b61]">
                            {windowLabel}{' '}
                            <span className="px-1 text-[#c8beb3]">/</span>{' '}
                            Asia/Manila (PHT)
                        </p>
                    </div>
                    <div
                        className="flex rounded-lg border border-[#e9e4dc] bg-white p-1"
                        role="group"
                        aria-label="Report date window"
                    >
                        {([7, 14] as const).map((window) => (
                            <button
                                key={window}
                                type="button"
                                aria-pressed={days === window}
                                onClick={() => {
                                    setDays(window);
                                    setLastDownload(null);
                                }}
                                className={`rounded-md px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a6533b] ${days === window ? 'bg-[#f5ece6] text-[#a6533b]' : 'text-[#756b61] hover:bg-[#faf8f4]'}`}
                            >
                                Last {window} days
                            </button>
                        ))}
                    </div>
                </div>
                <p aria-live="polite" className="sr-only">
                    {downloadMessage ||
                        `Showing ${days} days of synthetic records for ${branch}.`}
                </p>
                {downloadMessage && (
                    <p className="rounded-lg border border-[#d8e0d1] bg-[#f1f5ee] px-4 py-3 text-sm text-[#526449]">
                        {downloadMessage}
                    </p>
                )}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Sales value"
                        value={currency(totals.revenue)}
                        hint={`Synthetic sales · ${days} days`}
                        icon={BarChart3}
                    />
                    <StatCard
                        label="Pieces sold"
                        value={totals.units.toLocaleString()}
                        hint="Finished products · all four products"
                        icon={ShoppingBag}
                    />
                    <StatCard
                        label="Waste logged"
                        value={`${totals.waste.toLocaleString()} pcs`}
                        hint="Separate sample waste records"
                        icon={Wheat}
                    />
                    <StatCard
                        label="Transactions"
                        value={totals.transactions.toLocaleString()}
                        hint="Synthetic completed sales"
                        icon={ReceiptText}
                    />
                </div>

                <div className="grid items-start gap-5 xl:grid-cols-[1.65fr_1fr]">
                    <Panel
                        title="Sales, one day at a time"
                        description="Recorded sales value in PHP · illustrative records, not forecasts."
                    >
                        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#756b61]">
                                <span className="flex items-center gap-2">
                                    <span className="size-2 rounded-full bg-[#a6533b]" />{' '}
                                    Sample sales value
                                </span>
                                <span>{windowLabel}</span>
                            </div>
                            <p className="sr-only">
                                Total sample sales value:{' '}
                                {currency(totals.revenue)}. The highest day is{' '}
                                {peak.label} at {currency(peak.revenue)}. Exact
                                daily figures follow in the daily summary table.
                            </p>
                            <div className="h-72 w-full min-w-0 sm:h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        accessibilityLayer
                                        data={rows}
                                        margin={{
                                            top: 15,
                                            right: 10,
                                            left: -10,
                                            bottom: 0,
                                        }}
                                    >
                                        <defs>
                                            <linearGradient
                                                id="reports-terra-fill"
                                                x1="0"
                                                y1="0"
                                                x2="0"
                                                y2="1"
                                            >
                                                <stop
                                                    offset="0%"
                                                    stopColor="#a6533b"
                                                    stopOpacity={0.2}
                                                />
                                                <stop
                                                    offset="100%"
                                                    stopColor="#a6533b"
                                                    stopOpacity={0.015}
                                                />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid
                                            stroke="#eee9e1"
                                            vertical={false}
                                            strokeDasharray="3 4"
                                        />
                                        <XAxis
                                            dataKey="label"
                                            tickLine={false}
                                            axisLine={false}
                                            minTickGap={22}
                                            tick={{
                                                fill: '#756b61',
                                                fontSize: 11,
                                            }}
                                            dy={10}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value: number) =>
                                                `${Math.round(value / 1000)}k`
                                            }
                                            tick={{
                                                fill: '#756b61',
                                                fontSize: 11,
                                            }}
                                        />
                                        <Tooltip
                                            formatter={(value) =>
                                                currency(Number(value))
                                            }
                                            contentStyle={{
                                                borderColor: '#e9e4dc',
                                                borderRadius: 12,
                                                fontSize: 12,
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="revenue"
                                            name="Sample sales (PHP)"
                                            stroke="#a6533b"
                                            strokeWidth={2.5}
                                            fill="url(#reports-terra-fill)"
                                            isAnimationActive={false}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#faf8f4] px-4 py-3 text-xs text-[#756b61]">
                                <span>
                                    Highest sample day:{' '}
                                    <strong className="font-medium text-[#332c25]">
                                        {peak.label}
                                    </strong>
                                </span>
                                <span className="font-medium text-[#a6533b]">
                                    {currency(peak.revenue)}
                                </span>
                            </div>
                        </div>
                    </Panel>

                    <Panel
                        title="What's coming out of the oven"
                        description="Product mix by pieces sold in the selected window."
                    >
                        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                            <div className="space-y-6 py-2">
                                {productRows.map((product) => (
                                    <div key={product.name}>
                                        <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                                            <span className="font-medium text-[#332c25]">
                                                {product.name}
                                            </span>
                                            <span className="text-xs text-[#756b61] tabular-nums">
                                                {product.units.toLocaleString()}{' '}
                                                pcs
                                            </span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-[#f3efe9]">
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    width: `${(product.units / totals.units) * 100}%`,
                                                    backgroundColor:
                                                        product.color,
                                                }}
                                            />
                                        </div>
                                        <p className="mt-1.5 text-right text-xs text-[#756b61]">
                                            {(
                                                (product.units / totals.units) *
                                                100
                                            ).toFixed(1)}
                                            % of pieces sold
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-5 border-t border-[#e9e4dc] pt-4 text-xs leading-relaxed text-[#756b61]">
                                Product quantities and fixed sample prices
                                reconcile to the sales totals. These are
                                demonstration records; they are not your
                                bakery&apos;s performance.
                            </p>
                        </div>
                    </Panel>
                </div>

                <Panel
                    title="Daily summary"
                    description={`${branch} · ${windowLabel} · all timestamps grouped in PHT.`}
                    action={
                        <span className="text-xs text-[#756b61]">
                            {days} sample days
                        </span>
                    }
                >
                    <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[660px] text-left text-sm">
                                <caption className="sr-only">
                                    Synthetic daily sales and waste report for{' '}
                                    {branch}. Sales values are PHP, quantities
                                    are pieces. No real partner records.
                                </caption>
                                <thead className="border-b border-[#e9e4dc] text-xs text-[#756b61]">
                                    <tr>
                                        <th
                                            scope="col"
                                            className="pb-4 font-medium"
                                        >
                                            Date (2026)
                                        </th>
                                        <th
                                            scope="col"
                                            className="pb-4 text-right font-medium"
                                        >
                                            Sales value
                                        </th>
                                        <th
                                            scope="col"
                                            className="pb-4 text-right font-medium"
                                        >
                                            Pieces sold
                                        </th>
                                        <th
                                            scope="col"
                                            className="pb-4 text-right font-medium"
                                        >
                                            Waste (pcs)
                                        </th>
                                        <th
                                            scope="col"
                                            className="pb-4 text-right font-medium"
                                        >
                                            Transactions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => (
                                        <tr
                                            key={row.date}
                                            className="border-b border-[#f0ece6]"
                                        >
                                            <th
                                                scope="row"
                                                className="py-4 font-medium text-[#53483e]"
                                            >
                                                {row.label}
                                            </th>
                                            <td className="py-4 text-right font-medium text-[#332c25] tabular-nums">
                                                {currency(row.revenue)}
                                            </td>
                                            <td className="py-4 text-right text-[#70675e] tabular-nums">
                                                {row.units.toLocaleString()}
                                            </td>
                                            <td className="py-4 text-right text-[#756b61] tabular-nums">
                                                {row.waste}
                                            </td>
                                            <td className="py-4 text-right text-[#756b61] tabular-nums">
                                                {row.transactions}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="font-semibold text-[#332c25]">
                                        <th scope="row" className="pt-4">
                                            Window total
                                        </th>
                                        <td className="pt-4 text-right tabular-nums">
                                            {currency(totals.revenue)}
                                        </td>
                                        <td className="pt-4 text-right tabular-nums">
                                            {totals.units.toLocaleString()}
                                        </td>
                                        <td className="pt-4 text-right tabular-nums">
                                            {totals.waste.toLocaleString()}
                                        </td>
                                        <td className="pt-4 text-right tabular-nums">
                                            {totals.transactions.toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </Panel>

                <div className="flex items-start gap-3 rounded-xl border border-[#e9e4dc] bg-[#faf8f4] px-5 py-4">
                    <ReceiptText
                        className="mt-0.5 size-4 shrink-0 text-[#a6533b]"
                        aria-hidden="true"
                    />
                    <p className="text-xs leading-relaxed text-[#756b61]">
                        CSV exports contain the selected branch and date window,
                        with every row marked{' '}
                        <span className="font-medium text-[#53483e]">
                            synthetic_demo
                        </span>
                        . No backend records are queried or changed. Filters
                        reset when you leave this page.
                    </p>
                </div>
            </div>
        </>
    );
}
