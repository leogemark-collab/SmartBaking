import { Head, Link } from '@inertiajs/react';
import {
    ArrowDownRight,
    ArrowRight,
    ArrowUpRight,
    CalendarDays,
    ChevronRight,
    CircleDollarSign,
    ClipboardList,
    Clock3,
    Croissant,
    Package,
    ShoppingBasket,
    Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import {
    Area,
    CartesianGrid,
    ComposedChart,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import {
    PageHeading,
    Panel,
    ProductArt,
    StatCard,
    StatusBadge,
} from '@/components/workspace/ui';
import { useWorkspace } from '@/components/workspace/workspace-provider';
import { currency } from '@/lib/workspace';

const hourly = [
    { time: '6 AM', actual: 1800, forecast: 2000 },
    { time: '8 AM', actual: 4200, forecast: 3800 },
    { time: '10 AM', actual: 6280, forecast: 5600 },
    { time: '12 PM', actual: 5200, forecast: 4900 },
    { time: '2 PM', actual: null, forecast: 3500 },
    { time: '4 PM', actual: null, forecast: 5200 },
    { time: '6 PM', actual: null, forecast: 4000 },
];
const weekly = [
    { time: 'Thu 5', actual: 22800, forecast: 23000 },
    { time: 'Fri 6', actual: 26100, forecast: 25000 },
    { time: 'Sat 7', actual: 29800, forecast: 28000 },
    { time: 'Sun 8', actual: 27900, forecast: 28500 },
    { time: 'Mon 9', actual: 23400, forecast: 24000 },
    { time: 'Tue 10', actual: 25100, forecast: 24500 },
    { time: 'Wed 11*', actual: 17480, forecast: 29000 },
];
const bestsellers = [
    {
        name: 'Classic pandesal',
        kind: 'pandesal',
        sold: 640,
        price: 5,
        percentage: 86,
    },
    {
        name: 'Spanish bread',
        kind: 'roll',
        sold: 280,
        price: 10,
        percentage: 65,
    },
    {
        name: 'Cheese ensaymada',
        kind: 'ensaymada',
        sold: 120,
        price: 25,
        percentage: 42,
    },
    {
        name: 'Butter croissant',
        kind: 'croissant',
        sold: 64,
        price: 45,
        percentage: 28,
    },
];

export default function Dashboard() {
    const { href, branch } = useWorkspace();
    const [period, setPeriod] = useState<'today' | 'week'>('today');
    const [showValues, setShowValues] = useState(false);
    const chart = period === 'today' ? hourly : weekly;

    return (
        <>
            <Head title="Overview" />
            <PageHeading
                eyebrow="Your daily bread"
                title="Good things are rising."
                description={`Here’s a little overview of ${branch.toLowerCase()} on the sample day.`}
                actions={
                    <>
                        <Button
                            asChild
                            variant="outline"
                            className="gap-2 text-xs"
                        >
                            <Link href={href('reports')}>
                                <ClipboardList className="size-3.5" />
                                View reports
                            </Link>
                        </Button>
                        <Button asChild className="gap-2 text-xs">
                            <Link href={href('pos')}>
                                <ShoppingBasket className="size-3.5" />
                                Open point of sale
                            </Link>
                        </Button>
                    </>
                }
            />
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Sales so far"
                    value={currency(17480)}
                    icon={CircleDollarSign}
                    tone="terra"
                    hint={
                        <>
                            <span className="font-semibold text-[#657a56]">
                                ↗ 8.2%
                            </span>{' '}
                            vs. yesterday at noon · sample
                        </>
                    }
                />
                <StatCard
                    label="Orders served"
                    value="184"
                    icon={ShoppingBasket}
                    hint={
                        <>
                            <span className="font-semibold text-[#657a56]">
                                +14 orders
                            </span>{' '}
                            vs. yesterday at noon · sample
                        </>
                    }
                />
                <StatCard
                    label="Freshly baked"
                    value={
                        <>
                            1,440{' '}
                            <span className="text-sm font-normal tracking-normal text-[#a0927f]">
                                pcs
                            </span>
                        </>
                    }
                    icon={Croissant}
                    tone="green"
                    hint="1,194 pieces sold through noon · sample"
                />
                <StatCard
                    label="Ingredients to review"
                    value={
                        <>
                            3{' '}
                            <span className="text-sm font-normal tracking-normal text-[#a0927f]">
                                items
                            </span>
                        </>
                    }
                    icon={Package}
                    hint={
                        <Link
                            href={href('inventory')}
                            className="inline-flex items-center gap-1 text-[#a6533b]"
                        >
                            Butter, milk, and sugar
                            <ArrowRight className="size-3" />
                        </Link>
                    }
                />
            </div>
            <div className="mb-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <Panel
                    title="How the day is selling"
                    description={
                        period === 'today'
                            ? 'Hourly sales through 12 PM · PHP · sample values'
                            : '5–11 Nov 2026 · PHP · *today through noon'
                    }
                    action={
                        <div
                            className="flex rounded-lg bg-[#f5f2ec] p-1"
                            aria-label="Sales chart period"
                        >
                            <button
                                type="button"
                                className="ws-tab"
                                aria-pressed={period === 'today'}
                                onClick={() => setPeriod('today')}
                            >
                                Today
                            </button>
                            <button
                                type="button"
                                className="ws-tab"
                                aria-pressed={period === 'week'}
                                onClick={() => setPeriod('week')}
                            >
                                Last 7 days
                            </button>
                        </div>
                    }
                >
                    <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-1">
                        <div>
                            <span className="text-[29px] font-semibold tracking-[-.04em]">
                                {currency(
                                    chart.reduce(
                                        (sum, point) =>
                                            sum + (point.actual ?? 0),
                                        0,
                                    ),
                                )}
                            </span>
                            <span className="ml-2 text-[10px] text-[#9a8d7b]">
                                sample recorded sales
                            </span>
                        </div>
                        <div className="flex gap-4 text-[10px] text-[#918473]">
                            <span className="flex items-center gap-1.5">
                                <i className="size-1.5 rounded-full bg-[#a6533b]" />
                                Actual
                            </span>
                            <span className="flex items-center gap-1.5">
                                <i className="w-3 border-t-2 border-dashed border-[#c5b08f]" />
                                Illustrative forecast
                            </span>
                        </div>
                    </div>
                    <div
                        className="mt-5 h-[240px] px-2 pr-5"
                        role="img"
                        aria-label="Sales chart. Today’s sample recorded sales total 17,480 pesos through noon. Dashed values illustrate future demand and are not a trained model output."
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                                data={chart}
                                margin={{
                                    top: 10,
                                    right: 5,
                                    bottom: 5,
                                    left: 0,
                                }}
                            >
                                <defs>
                                    <linearGradient
                                        id="sales-fill"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="0%"
                                            stopColor="#a6533b"
                                            stopOpacity={0.12}
                                        />
                                        <stop
                                            offset="100%"
                                            stopColor="#a6533b"
                                            stopOpacity={0}
                                        />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    vertical={false}
                                    stroke="#efebe4"
                                    strokeDasharray="3 4"
                                />
                                <XAxis
                                    dataKey="time"
                                    axisLine={false}
                                    tickLine={false}
                                    dy={8}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(value) =>
                                        `${value / 1000}k`
                                    }
                                    width={46}
                                />
                                <Tooltip
                                    formatter={(value, name) => [
                                        typeof value === 'number'
                                            ? currency(value)
                                            : '—',
                                        name === 'actual'
                                            ? 'Sample actual'
                                            : 'Illustrative forecast',
                                    ]}
                                    contentStyle={{
                                        borderRadius: 12,
                                        borderColor: '#e8dfd1',
                                        fontSize: 11,
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="actual"
                                    stroke="#a6533b"
                                    strokeWidth={2.5}
                                    fill="url(#sales-fill)"
                                    dot={false}
                                    activeDot={{ r: 4 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="forecast"
                                    stroke="#bfa783"
                                    strokeDasharray="5 5"
                                    strokeWidth={1.5}
                                    dot={false}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#f0ece5] px-6 py-3">
                        <p className="flex items-center gap-1.5 text-[10px] text-[#a09381]">
                            <Sparkles className="size-3 text-[#b59669]" />
                            Illustration only · Forecasting service not
                            connected
                        </p>
                        <button
                            type="button"
                            className="text-[10px] font-medium text-[#a6533b]"
                            onClick={() => setShowValues((value) => !value)}
                            aria-expanded={showValues}
                        >
                            {showValues ? 'Hide' : 'View'} chart values
                        </button>
                    </div>
                    {showValues && (
                        <div className="overflow-x-auto">
                            <table className="ws-table">
                                <caption className="sr-only">
                                    Sales chart data in Philippine pesos
                                </caption>
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Sample actual (PHP)</th>
                                        <th>Illustrative forecast (PHP)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {chart.map((point) => (
                                        <tr key={point.time}>
                                            <td>{point.time}</td>
                                            <td>
                                                {point.actual === null
                                                    ? 'Not yet recorded'
                                                    : currency(point.actual)}
                                            </td>
                                            <td>{currency(point.forecast)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>
                <div className="flex flex-col gap-5">
                    <section className="relative isolate overflow-hidden rounded-2xl bg-[#a6533b] px-6 py-5 text-white">
                        <div className="pointer-events-none absolute -top-14 -right-12 size-48 rounded-full border-[24px] border-white/5" />
                        <p className="relative text-[9px] font-medium tracking-[.15em] text-[#efd3c3] uppercase">
                            A little ahead of the rush
                        </p>
                        <div className="relative mt-3 flex gap-1">
                            <div className="z-10 min-w-0">
                                <h2 className="text-lg leading-7 font-medium tracking-tight">
                                    Your next
                                    <br />
                                    fresh batch.
                                </h2>
                                <p className="mt-2 text-[10px] text-[#eed7c6]">
                                    Spanish bread · 120 pcs
                                </p>
                            </div>
                            <ProductArt
                                kind="roll"
                                className="-mr-7 -mb-3 w-[155px] rotate-[-10deg]"
                            />
                        </div>
                        <div className="relative mt-4 flex items-center justify-between border-t border-white/15 pt-3">
                            <span className="flex items-center gap-1.5 text-[10px] text-[#f1ddcf]">
                                <Clock3 className="size-3" />
                                2:00 PM · planned
                            </span>
                            <Link
                                href={href('production')}
                                aria-label="View next production batch"
                                className="flex size-7 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
                            >
                                <ArrowRight className="size-3.5" />
                            </Link>
                        </div>
                    </section>
                    <Panel
                        title="Today’s bake plan"
                        action={
                            <Link
                                href={href('production')}
                                aria-label="View full bake plan"
                                className="text-[#a88d71]"
                            >
                                <ChevronRight className="size-4" />
                            </Link>
                        }
                    >
                        <div className="space-y-4 px-6 pt-1 pb-5">
                            {[
                                {
                                    name: 'Classic pandesal',
                                    time: '06:00 AM',
                                    qty: 480,
                                    status: 'Completed',
                                    tone: 'green' as const,
                                },
                                {
                                    name: 'Cheese ensaymada',
                                    time: '10:30 AM',
                                    qty: 96,
                                    status: 'Baking',
                                    tone: 'amber' as const,
                                },
                                {
                                    name: 'Spanish bread',
                                    time: '02:00 PM',
                                    qty: 120,
                                    status: 'Planned',
                                    tone: 'neutral' as const,
                                },
                            ].map((item, i) => (
                                <div
                                    key={item.name}
                                    className="flex items-center gap-3"
                                >
                                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f7f3eb] text-[9px] text-[#a48e72]">
                                        0{i + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[11px] font-medium">
                                            {item.name}
                                        </p>
                                        <p className="mt-1 text-[9px] text-[#a09381]">
                                            {item.time} · {item.qty} pcs
                                        </p>
                                    </div>
                                    <StatusBadge tone={item.tone}>
                                        {item.status}
                                    </StatusBadge>
                                </div>
                            ))}
                        </div>
                    </Panel>
                </div>
            </div>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <Panel
                    title="Fresh from the counter"
                    description="Best sellers through noon · synthetic sales"
                    action={
                        <Link
                            href={href('reports')}
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-[#a6533b]"
                        >
                            Product report
                            <ArrowUpRight className="size-3" />
                        </Link>
                    }
                >
                    <div className="overflow-x-auto">
                        <table className="ws-table">
                            <caption className="sr-only">
                                Sample best selling products
                            </caption>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Pieces sold</th>
                                    <th>Sales</th>
                                    <th>Relative popularity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bestsellers.map((item) => (
                                    <tr key={item.name}>
                                        <td>
                                            <div className="flex items-center gap-3 whitespace-nowrap">
                                                <div className="h-10 w-12 shrink-0 rounded-lg bg-[#f5efe4]">
                                                    <ProductArt
                                                        kind={item.kind}
                                                    />
                                                </div>
                                                <span className="font-medium">
                                                    {item.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="tabular-nums">
                                            {item.sold}
                                        </td>
                                        <td className="whitespace-nowrap tabular-nums">
                                            {currency(item.sold * item.price)}
                                        </td>
                                        <td>
                                            <div className="h-1.5 w-20 rounded-full bg-[#f2eee5]">
                                                <div
                                                    className="h-full rounded-full bg-[#b8c1a6]"
                                                    style={{
                                                        width: `${item.percentage}%`,
                                                    }}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Panel>
                <Panel
                    title="Keep an eye on"
                    description="Ingredients that may need a little care"
                >
                    <div className="space-y-4 px-6 pb-5">
                        <Link
                            href={href('inventory')}
                            className="flex gap-3 rounded-xl border border-[#f0e2d3] bg-[#fcf7ef] p-3.5"
                        >
                            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f4e4c9] text-[#a27e44]">
                                <Package className="size-4" />
                            </span>
                            <div>
                                <p className="text-xs font-medium">
                                    Butter is running low
                                </p>
                                <p className="mt-1 text-[10px] leading-5 text-[#9b876b]">
                                    8 kg usable · 10 kg safety stock
                                </p>
                                <span className="mt-1 flex items-center gap-1 text-[10px] font-medium text-[#a6533b]">
                                    Review replenishment
                                    <ArrowRight className="size-3" />
                                </span>
                            </div>
                        </Link>
                        <Link
                            href={href('forecasts')}
                            className="flex gap-3 rounded-xl border border-[#e8eadd] bg-[#f6f7ef] p-3.5"
                        >
                            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#e9eddc] text-[#77845c]">
                                <CalendarDays className="size-4" />
                            </span>
                            <div>
                                <p className="text-xs font-medium">
                                    Payday is on the horizon
                                </p>
                                <p className="mt-1 text-[10px] leading-5 text-[#8b9077]">
                                    Explore the 15 Nov demand scenario.
                                </p>
                                <span className="mt-1 flex items-center gap-1 text-[10px] font-medium text-[#647451]">
                                    See daily outlook
                                    <ArrowRight className="size-3" />
                                </span>
                            </div>
                        </Link>
                        <p className="flex gap-1.5 text-[9px] leading-5 text-[#a29480]">
                            <ArrowDownRight className="mt-1 size-3 shrink-0" />
                            These sample alerts are advisory, with no automatic
                            orders or inventory changes.
                        </p>
                    </div>
                </Panel>
            </div>
        </>
    );
}
