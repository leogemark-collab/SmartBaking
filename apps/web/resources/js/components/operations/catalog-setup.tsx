import { router, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, Panel, StatusBadge } from '@/components/workspace/ui';
import { currency } from '@/lib/workspace';
import type {
    OperationsBranch,
    OperationsIngredient,
    OperationsMembership,
    OperationsProduct,
} from '@/types/operations';

export type CatalogSetupProps = {
    branchId: number | null;
    products: OperationsProduct[];
    ingredients: OperationsIngredient[];
    availableBranches: OperationsBranch[];
    memberships: OperationsMembership[];
};

type MembershipFormProps = Pick<
    CatalogSetupProps,
    'branchId' | 'availableBranches' | 'memberships'
>;

type RecipeDraft = {
    product_id: string;
    yield_pieces: string;
    items: { ingredient_id: string; quantity_milli: string }[];
};

/** Parse decimal text directly into fixed units without floating-point rounding. */
function fixedUnits(
    text: string,
    precision: number,
    maximum: number,
    minimum = 1,
): number | null {
    const pattern = new RegExp(`^\\d+(?:\\.\\d{1,${precision}})?$`);
    if (!pattern.test(text.trim())) return null;
    const [whole, fraction = ''] = text.trim().split('.');
    const value =
        Number(whole) * 10 ** precision +
        Number(fraction.padEnd(precision, '0'));
    return Number.isSafeInteger(value) && value >= minimum && value <= maximum
        ? value
        : null;
}

function wholeNumber(text: string, maximum: number): number | null {
    if (!/^\d+$/.test(text.trim())) return null;
    const value = Number(text);
    return Number.isSafeInteger(value) && value >= 1 && value <= maximum
        ? value
        : null;
}

function Saved({ visible }: { visible: boolean }) {
    return (
        <p role="status" className="min-h-4 text-xs text-[#536c45]">
            {visible ? 'Saved successfully.' : ''}
        </p>
    );
}

export function MembershipForm({
    branchId,
    availableBranches,
    memberships,
}: MembershipFormProps) {
    const form = useForm({
        branch_id: branchId === null ? '' : String(branchId),
        email: '',
        role: 'cashier',
    });
    const currentBranch = availableBranches.find(
        (item) => item.id === branchId,
    );

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        form.clearErrors();
        form.transform((data) => ({
            ...data,
            branch_id: Number(data.branch_id),
            email: data.email.trim(),
        }));
        form.post('/operations/memberships', {
            preserveScroll: true,
            onSuccess: () => form.reset('email', 'role'),
        });
    }

    return (
        <Panel
            title="Staff branch access"
            description="Staff must register and verify their email before you grant access."
        >
            <form onSubmit={submit} className="space-y-4 px-5 pb-5 sm:px-6">
                <fieldset disabled={form.processing} className="space-y-4">
                    <Field label="Branch">
                        <select
                            className="ws-input"
                            required
                            value={form.data.branch_id}
                            onChange={(event) =>
                                form.setData('branch_id', event.target.value)
                            }
                            aria-invalid={!!form.errors.branch_id}
                        >
                            <option value="">Choose a branch</option>
                            {availableBranches.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                        <InputError
                            message={form.errors.branch_id}
                            role="alert"
                        />
                    </Field>
                    <Field label="Verified staff email">
                        <Input
                            type="email"
                            autoComplete="email"
                            required
                            maxLength={255}
                            value={form.data.email}
                            onChange={(event) =>
                                form.setData('email', event.target.value)
                            }
                            aria-invalid={!!form.errors.email}
                        />
                        <InputError message={form.errors.email} role="alert" />
                    </Field>
                    <Field label="Branch role">
                        <select
                            className="ws-input"
                            value={form.data.role}
                            onChange={(event) =>
                                form.setData('role', event.target.value)
                            }
                            aria-invalid={!!form.errors.role}
                        >
                            <option value="cashier">Cashier</option>
                            <option value="baker">Baker</option>
                            <option value="supervisor">Supervisor</option>
                        </select>
                        <InputError message={form.errors.role} role="alert" />
                    </Field>
                    <Button
                        type="submit"
                        disabled={
                            form.processing || availableBranches.length === 0
                        }
                    >
                        {form.processing
                            ? 'Saving access…'
                            : 'Save branch access'}
                    </Button>
                </fieldset>
                <Saved visible={form.recentlySuccessful} />
            </form>
            <div className="border-t border-[#eee8df] px-5 py-4 sm:px-6">
                <p className="mb-3 text-xs font-semibold text-[#665b50]">
                    Access at {currentBranch?.name ?? 'the current branch'}
                </p>
                {memberships.length === 0 ? (
                    <p className="text-xs leading-5 text-[#8b8074]">
                        {branchId === null
                            ? 'Choose a branch to view its staff.'
                            : 'No staff memberships recorded for this branch.'}
                    </p>
                ) : (
                    <ul className="space-y-3">
                        {memberships.map((member) => (
                            <li
                                key={member.id}
                                className="flex flex-wrap items-center justify-between gap-2"
                            >
                                <div className="min-w-0">
                                    <p className="text-xs font-medium break-words">
                                        {member.name}
                                    </p>
                                    <p className="text-xs break-all text-[#8b8074]">
                                        {member.email}
                                    </p>
                                </div>
                                <StatusBadge>{member.role}</StatusBadge>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Panel>
    );
}

export function CatalogSetup({
    branchId,
    products,
    ingredients,
    availableBranches,
    memberships,
}: CatalogSetupProps) {
    const branch = useForm({ code: '', name: '', can_produce: true });
    const product = useForm({
        sku: '',
        name: '',
        category: '',
        price_cents: '',
    });
    const ingredient = useForm({ code: '', name: '', unit: 'kg' });
    const recipe = useForm<RecipeDraft>({
        product_id: '',
        yield_pieces: '',
        items: [{ ingredient_id: '', quantity_milli: '' }],
    });
    const activeProducts = products.filter((item) => item.active);
    const activeIngredients = ingredients.filter((item) => item.active);

    function createBranch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        branch.clearErrors();
        branch.transform((data) => ({
            ...data,
            code: data.code.trim().toUpperCase(),
            name: data.name.trim(),
            can_produce: true,
        }));
        branch.post('/operations/branches', {
            preserveScroll: true,
            onSuccess: () => branch.reset(),
        });
    }

    function createProduct(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        product.clearErrors();
        const cents = fixedUnits(product.data.price_cents, 2, 100_000_000, 0);
        if (cents === null) {
            product.setError(
                'price_cents',
                'Enter a price from ₱0 to ₱1,000,000 with at most two decimal places.',
            );
            return;
        }
        product.transform((data) => ({
            ...data,
            sku: data.sku.trim().toUpperCase(),
            name: data.name.trim(),
            category: data.category.trim() || null,
            price_cents: cents,
        }));
        product.post('/operations/products', {
            preserveScroll: true,
            onSuccess: () => product.reset(),
        });
    }

    function createIngredient(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        ingredient.clearErrors();
        ingredient.transform((data) => ({
            ...data,
            code: data.code.trim().toUpperCase(),
            name: data.name.trim(),
        }));
        ingredient.post('/operations/ingredients', {
            preserveScroll: true,
            onSuccess: () => ingredient.reset(),
        });
    }

    function createRecipe(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        recipe.clearErrors();
        const yieldPieces = wholeNumber(recipe.data.yield_pieces, 1_000_000);
        let valid = true;
        if (yieldPieces === null) {
            recipe.setError(
                'yield_pieces',
                'Enter a whole-number yield from 1 to 1,000,000 pieces.',
            );
            valid = false;
        }
        const used = new Set<string>();
        const items = recipe.data.items.map((row, index) => {
            const selected = activeIngredients.find(
                (item) => item.id === Number(row.ingredient_id),
            );
            if (!selected || used.has(row.ingredient_id)) {
                recipe.setError(
                    `items.${index}.ingredient_id`,
                    selected
                        ? 'Use each ingredient once per recipe.'
                        : 'Choose an active ingredient.',
                );
                valid = false;
            }
            used.add(row.ingredient_id);
            const wholePieces = wholeNumber(row.quantity_milli, 1_000_000);
            const quantityMilli =
                selected?.unit === 'pcs'
                    ? wholePieces === null
                        ? null
                        : wholePieces * 1000
                    : fixedUnits(row.quantity_milli, 3, 1_000_000_000);
            if (quantityMilli === null) {
                recipe.setError(
                    `items.${index}.quantity_milli`,
                    selected?.unit === 'pcs'
                        ? 'Enter 1 to 1,000,000 whole pieces per batch.'
                        : 'Enter 0.001 to 1,000,000 units, with at most three decimal places.',
                );
                valid = false;
            }
            return {
                ingredient_id: Number(row.ingredient_id),
                quantity_milli: quantityMilli ?? 0,
            };
        });
        if (!valid || yieldPieces === null) return;
        recipe.transform((data) => ({
            product_id: Number(data.product_id),
            yield_pieces: yieldPieces,
            items,
        }));
        recipe.post('/operations/recipes', {
            preserveScroll: true,
            onSuccess: () => recipe.reset(),
        });
    }

    function updateRecipeItem(
        index: number,
        field: 'ingredient_id' | 'quantity_milli',
        value: string,
    ) {
        recipe.clearErrors();
        recipe.setData(
            'items',
            recipe.data.items.map((row, rowIndex) =>
                rowIndex === index ? { ...row, [field]: value } : row,
            ),
        );
    }

    return (
        <div className="grid items-start gap-5 xl:grid-cols-2">
            <Panel
                title="Branches"
                description="Each branch can bake. Business dates use Asia/Manila."
            >
                <form
                    onSubmit={createBranch}
                    className="space-y-4 px-5 pb-5 sm:px-6"
                >
                    <fieldset
                        disabled={branch.processing}
                        className="grid gap-4 sm:grid-cols-2"
                    >
                        <Field
                            label="Branch code"
                            hint="Letters, numbers, underscores, and hyphens."
                        >
                            <Input
                                required
                                maxLength={40}
                                value={branch.data.code}
                                onChange={(event) =>
                                    branch.setData('code', event.target.value)
                                }
                                aria-invalid={!!branch.errors.code}
                            />
                            <InputError
                                message={branch.errors.code}
                                role="alert"
                            />
                        </Field>
                        <Field label="Branch name">
                            <Input
                                required
                                maxLength={120}
                                value={branch.data.name}
                                onChange={(event) =>
                                    branch.setData('name', event.target.value)
                                }
                                aria-invalid={!!branch.errors.name}
                            />
                            <InputError
                                message={branch.errors.name}
                                role="alert"
                            />
                        </Field>
                        <InputError
                            message={branch.errors.can_produce}
                            role="alert"
                        />
                        <div className="sm:col-span-2">
                            <Button type="submit" disabled={branch.processing}>
                                <Plus aria-hidden="true" />
                                {branch.processing
                                    ? 'Creating branch…'
                                    : 'Create branch'}
                            </Button>
                        </div>
                    </fieldset>
                    <Saved visible={branch.recentlySuccessful} />
                </form>
                <div className="border-t border-[#eee8df] px-5 py-4 sm:px-6">
                    {availableBranches.length === 0 ? (
                        <p className="text-xs text-[#8b8074]">
                            No branches created yet.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {availableBranches.map((item) => (
                                <li
                                    key={item.id}
                                    className="flex flex-wrap items-center justify-between gap-2"
                                >
                                    <div className="min-w-0 text-xs">
                                        <p className="font-medium break-words">
                                            {item.name}
                                        </p>
                                        <p className="mt-1 text-[#8b8074]">
                                            {item.code}
                                        </p>
                                    </div>
                                    {item.id === branchId ? (
                                        <StatusBadge tone="green">
                                            Current branch
                                        </StatusBadge>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                router.get(
                                                    '/setup',
                                                    { branch: item.id },
                                                    { preserveScroll: true },
                                                )
                                            }
                                        >
                                            Select branch
                                        </Button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </Panel>

            <Panel
                title="Product catalog"
                description="Products and recipes are shared across branches; stock is tracked separately."
            >
                <form
                    onSubmit={createProduct}
                    className="space-y-4 px-5 pb-5 sm:px-6"
                >
                    <fieldset
                        disabled={product.processing}
                        className="grid gap-4 sm:grid-cols-2"
                    >
                        <Field label="SKU">
                            <Input
                                required
                                maxLength={40}
                                value={product.data.sku}
                                onChange={(event) =>
                                    product.setData('sku', event.target.value)
                                }
                                aria-invalid={!!product.errors.sku}
                            />
                            <InputError
                                message={product.errors.sku}
                                role="alert"
                            />
                        </Field>
                        <Field label="Product name">
                            <Input
                                required
                                maxLength={160}
                                value={product.data.name}
                                onChange={(event) =>
                                    product.setData('name', event.target.value)
                                }
                                aria-invalid={!!product.errors.name}
                            />
                            <InputError
                                message={product.errors.name}
                                role="alert"
                            />
                        </Field>
                        <Field label="Category (optional)">
                            <Input
                                maxLength={80}
                                value={product.data.category}
                                onChange={(event) =>
                                    product.setData(
                                        'category',
                                        event.target.value,
                                    )
                                }
                                aria-invalid={!!product.errors.category}
                            />
                            <InputError
                                message={product.errors.category}
                                role="alert"
                            />
                        </Field>
                        <Field
                            label="Selling price (PHP)"
                            hint="Up to two decimal places."
                        >
                            <Input
                                required
                                inputMode="decimal"
                                value={product.data.price_cents}
                                onChange={(event) =>
                                    product.setData(
                                        'price_cents',
                                        event.target.value,
                                    )
                                }
                                aria-invalid={!!product.errors.price_cents}
                            />
                            <InputError
                                message={product.errors.price_cents}
                                role="alert"
                            />
                        </Field>
                        <div className="sm:col-span-2">
                            <Button type="submit" disabled={product.processing}>
                                <Plus aria-hidden="true" />
                                {product.processing
                                    ? 'Creating product…'
                                    : 'Create product'}
                            </Button>
                        </div>
                    </fieldset>
                    <Saved visible={product.recentlySuccessful} />
                </form>
                <div className="max-h-64 overflow-y-auto border-t border-[#eee8df] px-5 py-4 sm:px-6">
                    {products.length === 0 ? (
                        <p className="text-xs text-[#8b8074]">
                            No products created yet.
                        </p>
                    ) : (
                        <ul className="space-y-3">
                            {products.map((item) => (
                                <li
                                    key={item.id}
                                    className="flex flex-wrap items-center justify-between gap-2"
                                >
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium break-words">
                                            {item.name}
                                        </p>
                                        <p className="mt-1 text-[11px] text-[#8b8074]">
                                            {item.sku} ·{' '}
                                            {currency(item.price_cents / 100)}
                                        </p>
                                    </div>
                                    <StatusBadge
                                        tone={
                                            item.current_recipe_id
                                                ? 'green'
                                                : 'amber'
                                        }
                                    >
                                        {!item.active
                                            ? 'Inactive'
                                            : item.current_recipe_id
                                              ? 'Recipe ready'
                                              : 'Needs recipe'}
                                    </StatusBadge>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </Panel>

            <Panel
                title="Ingredient catalog"
                description="Choose the unit used for recipes and receiving. New ingredients start with zero stock."
            >
                <form
                    onSubmit={createIngredient}
                    className="space-y-4 px-5 pb-5 sm:px-6"
                >
                    <fieldset
                        disabled={ingredient.processing}
                        className="grid gap-4 sm:grid-cols-2"
                    >
                        <Field label="Ingredient code">
                            <Input
                                required
                                maxLength={40}
                                value={ingredient.data.code}
                                onChange={(event) =>
                                    ingredient.setData(
                                        'code',
                                        event.target.value,
                                    )
                                }
                                aria-invalid={!!ingredient.errors.code}
                            />
                            <InputError
                                message={ingredient.errors.code}
                                role="alert"
                            />
                        </Field>
                        <Field label="Ingredient name">
                            <Input
                                required
                                maxLength={160}
                                value={ingredient.data.name}
                                onChange={(event) =>
                                    ingredient.setData(
                                        'name',
                                        event.target.value,
                                    )
                                }
                                aria-invalid={!!ingredient.errors.name}
                            />
                            <InputError
                                message={ingredient.errors.name}
                                role="alert"
                            />
                        </Field>
                        <Field label="Base unit">
                            <select
                                className="ws-input"
                                value={ingredient.data.unit}
                                onChange={(event) =>
                                    ingredient.setData(
                                        'unit',
                                        event.target.value,
                                    )
                                }
                                aria-invalid={!!ingredient.errors.unit}
                            >
                                <option value="kg">Kilograms (kg)</option>
                                <option value="L">Liters (L)</option>
                                <option value="pcs">Whole pieces (pcs)</option>
                            </select>
                            <InputError
                                message={ingredient.errors.unit}
                                role="alert"
                            />
                        </Field>
                        <div className="flex items-end">
                            <Button
                                type="submit"
                                disabled={ingredient.processing}
                            >
                                <Plus aria-hidden="true" />
                                {ingredient.processing
                                    ? 'Creating ingredient…'
                                    : 'Create ingredient'}
                            </Button>
                        </div>
                    </fieldset>
                    <Saved visible={ingredient.recentlySuccessful} />
                </form>
                <div className="max-h-64 overflow-y-auto border-t border-[#eee8df] px-5 py-4 sm:px-6">
                    {ingredients.length === 0 ? (
                        <p className="text-xs text-[#8b8074]">
                            No ingredients created yet.
                        </p>
                    ) : (
                        <ul className="space-y-3">
                            {ingredients.map((item) => (
                                <li
                                    key={item.id}
                                    className="flex items-center justify-between gap-3"
                                >
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium break-words">
                                            {item.name}
                                        </p>
                                        <p className="mt-1 text-[11px] text-[#8b8074]">
                                            {item.code}
                                        </p>
                                    </div>
                                    <StatusBadge
                                        tone={item.active ? 'neutral' : 'amber'}
                                    >
                                        {item.active ? item.unit : 'Inactive'}
                                    </StatusBadge>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </Panel>

            <Panel
                title="Recipe per batch"
                description="Every save creates an immutable version. Existing production batches keep their original recipe."
            >
                <form
                    onSubmit={createRecipe}
                    className="space-y-4 px-5 pb-5 sm:px-6"
                >
                    <fieldset
                        disabled={recipe.processing}
                        className="space-y-4"
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Product">
                                <select
                                    required
                                    className="ws-input"
                                    value={recipe.data.product_id}
                                    onChange={(event) =>
                                        recipe.setData(
                                            'product_id',
                                            event.target.value,
                                        )
                                    }
                                    aria-invalid={!!recipe.errors.product_id}
                                >
                                    <option value="">Choose a product</option>
                                    {activeProducts.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError
                                    message={recipe.errors.product_id}
                                    role="alert"
                                />
                            </Field>
                            <Field label="Yield per batch (pieces)">
                                <Input
                                    required
                                    inputMode="numeric"
                                    value={recipe.data.yield_pieces}
                                    onChange={(event) =>
                                        recipe.setData(
                                            'yield_pieces',
                                            event.target.value,
                                        )
                                    }
                                    aria-invalid={!!recipe.errors.yield_pieces}
                                />
                                <InputError
                                    message={recipe.errors.yield_pieces}
                                    role="alert"
                                />
                            </Field>
                        </div>
                        <div className="space-y-3">
                            {recipe.data.items.map((row, index) => {
                                const selected = activeIngredients.find(
                                    (item) =>
                                        item.id === Number(row.ingredient_id),
                                );
                                return (
                                    <div
                                        key={index}
                                        className="rounded-xl border border-[#e9e4dc] bg-[#faf8f4] p-3"
                                    >
                                        <div className="mb-3 flex items-center justify-between gap-2">
                                            <p className="text-[11px] font-semibold text-[#8b8074]">
                                                Ingredient {index + 1}
                                            </p>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                aria-label={`Remove ingredient ${index + 1}`}
                                                disabled={
                                                    recipe.data.items.length ===
                                                    1
                                                }
                                                onClick={() => {
                                                    recipe.clearErrors();
                                                    recipe.setData(
                                                        'items',
                                                        recipe.data.items.filter(
                                                            (_, rowIndex) =>
                                                                rowIndex !==
                                                                index,
                                                        ),
                                                    );
                                                }}
                                            >
                                                <Trash2
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                Remove
                                            </Button>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <Field label="Ingredient">
                                                <select
                                                    required
                                                    className="ws-input"
                                                    value={row.ingredient_id}
                                                    onChange={(event) =>
                                                        updateRecipeItem(
                                                            index,
                                                            'ingredient_id',
                                                            event.target.value,
                                                        )
                                                    }
                                                    aria-invalid={
                                                        !!recipe.errors[
                                                            `items.${index}.ingredient_id`
                                                        ]
                                                    }
                                                >
                                                    <option value="">
                                                        Choose an ingredient
                                                    </option>
                                                    {activeIngredients.map(
                                                        (item) => (
                                                            <option
                                                                key={item.id}
                                                                value={item.id}
                                                            >
                                                                {item.name} (
                                                                {item.unit})
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                                <InputError
                                                    message={
                                                        recipe.errors[
                                                            `items.${index}.ingredient_id`
                                                        ]
                                                    }
                                                    role="alert"
                                                />
                                            </Field>
                                            <Field
                                                label={`Quantity per batch (${selected?.unit ?? 'base unit'})`}
                                                hint={
                                                    selected?.unit === 'pcs'
                                                        ? 'Whole pieces only.'
                                                        : 'Up to three decimal places.'
                                                }
                                            >
                                                <Input
                                                    required
                                                    inputMode={
                                                        selected?.unit === 'pcs'
                                                            ? 'numeric'
                                                            : 'decimal'
                                                    }
                                                    value={row.quantity_milli}
                                                    onChange={(event) =>
                                                        updateRecipeItem(
                                                            index,
                                                            'quantity_milli',
                                                            event.target.value,
                                                        )
                                                    }
                                                    aria-invalid={
                                                        !!recipe.errors[
                                                            `items.${index}.quantity_milli`
                                                        ]
                                                    }
                                                />
                                                <InputError
                                                    message={
                                                        recipe.errors[
                                                            `items.${index}.quantity_milli`
                                                        ]
                                                    }
                                                    role="alert"
                                                />
                                            </Field>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <InputError
                            message={recipe.errors.items}
                            role="alert"
                        />
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={
                                    recipe.data.items.length >= 100 ||
                                    activeIngredients.length === 0
                                }
                                onClick={() => {
                                    recipe.clearErrors();
                                    recipe.setData('items', [
                                        ...recipe.data.items,
                                        {
                                            ingredient_id: '',
                                            quantity_milli: '',
                                        },
                                    ]);
                                }}
                            >
                                <Plus aria-hidden="true" />
                                Add ingredient
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    recipe.processing ||
                                    activeProducts.length === 0 ||
                                    activeIngredients.length === 0
                                }
                            >
                                {recipe.processing
                                    ? 'Saving recipe…'
                                    : 'Save new recipe version'}
                            </Button>
                        </div>
                        {(activeProducts.length === 0 ||
                            activeIngredients.length === 0) && (
                            <p className="text-xs leading-5 text-[#94641f]">
                                Create an active product and ingredient before
                                saving a recipe.
                            </p>
                        )}
                    </fieldset>
                    <Saved visible={recipe.recentlySuccessful} />
                </form>
            </Panel>

            <div className="xl:col-span-2">
                <MembershipForm
                    key={branchId ?? 'no-branch'}
                    branchId={branchId}
                    availableBranches={availableBranches}
                    memberships={memberships}
                />
            </div>
        </div>
    );
}
