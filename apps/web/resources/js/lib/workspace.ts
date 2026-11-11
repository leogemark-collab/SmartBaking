export type Screen =
    | 'dashboard'
    | 'pos'
    | 'production'
    | 'inventory'
    | 'forecasts'
    | 'transfers'
    | 'team'
    | 'reports';

export const branches = ['Central bakery', 'Market branch', 'Riverside branch'];
export const sampleDay = '11 Nov 2026';
export const currency = (value: number) =>
    new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        maximumFractionDigits: 2,
    }).format(value);

export const products = [
    {
        id: 'pandesal',
        name: 'Classic pandesal',
        category: 'Everyday bread',
        price: 5,
        stock: 180,
        kind: 'pandesal',
    },
    {
        id: 'ensaymada',
        name: 'Cheese ensaymada',
        category: 'Sweet favorites',
        price: 25,
        stock: 48,
        kind: 'ensaymada',
    },
    {
        id: 'spanish',
        name: 'Spanish bread',
        category: 'Sweet favorites',
        price: 10,
        stock: 96,
        kind: 'roll',
    },
    {
        id: 'loaf',
        name: 'Soft milk loaf',
        category: 'Loaves',
        price: 65,
        stock: 24,
        kind: 'loaf',
    },
    {
        id: 'croissant',
        name: 'Butter croissant',
        category: 'Pastries',
        price: 45,
        stock: 32,
        kind: 'croissant',
    },
    {
        id: 'cheese',
        name: 'Cheese bread',
        category: 'Everyday bread',
        price: 12,
        stock: 72,
        kind: 'cheese',
    },
    {
        id: 'cinnamon',
        name: 'Cinnamon swirl',
        category: 'Pastries',
        price: 35,
        stock: 18,
        kind: 'ensaymada',
    },
    {
        id: 'mongo',
        name: 'Mongo bun',
        category: 'Sweet favorites',
        price: 12,
        stock: 64,
        kind: 'pandesal',
    },
];

/** Export only the synthetic records supplied by the screen. Escape spreadsheet formulas too. */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
    const escape = (value: string | number) => {
        const raw = String(value);
        const safe =
            typeof value === 'string' && /^[=+\-@\t\r]/.test(raw)
                ? `'${raw}`
                : raw;
        return `"${safe.replaceAll('"', '""')}"`;
    };
    const blob = new Blob(
        ['\uFEFF' + rows.map((row) => row.map(escape).join(',')).join('\r\n')],
        { type: 'text/csv;charset=utf-8;' },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
