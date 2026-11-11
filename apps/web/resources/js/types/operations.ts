export type OperationsScreen =
    | 'dashboard'
    | 'pos'
    | 'production'
    | 'inventory'
    | 'forecasts'
    | 'transfers'
    | 'team'
    | 'reports'
    | 'setup';
export type OperationsUnit = 'kg' | 'L' | 'pcs';
export type OperationsBranch = {
    id: number;
    code: string;
    name: string;
    can_produce: boolean;
};
export type OperationsProduct = {
    id: number;
    sku: string;
    name: string;
    category: string | null;
    price_cents: number;
    active: boolean;
    current_recipe_id: number | null;
    available_pieces: number;
};
export type OperationsIngredient = {
    id: number;
    code: string;
    name: string;
    unit: OperationsUnit;
    active: boolean;
    quantity_milli: number;
    safety_milli: number;
    lead_days: number;
    pack_milli: number;
};
export type OperationsRecipe = {
    id: number;
    product_id: number;
    product_name: string;
    version: number;
    yield_pieces: number;
    items: {
        ingredient_id: number;
        name: string;
        unit: OperationsUnit;
        quantity_milli: number;
    }[];
};
export type OperationsMembership = {
    id: number;
    name: string;
    email: string;
    role: 'cashier' | 'baker' | 'supervisor';
};
export type OperationsBatch = {
    id: number;
    branch_id: number;
    product_id: number;
    product_name: string;
    recipe_id: number;
    recipe_version: number;
    batch_count: number;
    planned_pieces: number;
    actual_pieces: number | null;
    status: 'planned' | 'mixing' | 'baking' | 'completed';
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
};
export type OperationsSale = {
    id: number;
    total_cents: number;
    cash_cents: number;
    change_cents: number;
    occurred_at: string;
    items: {
        product_name: string;
        quantity_pieces: number;
        unit_price_cents: number;
        line_total_cents: number;
    }[];
};
export type OperationsMovement = {
    id: number;
    ingredient_id: number | null;
    product_id: number | null;
    item_name: string;
    unit: OperationsUnit;
    quantity_milli: number;
    kind:
        | 'ingredient_receipt'
        | 'production_consumption'
        | 'production_output'
        | 'sale';
    reference: string;
    created_at: string;
};
export type LiveOperationsProps = {
    [key: string]: unknown;
    mode: 'live';
    screen: OperationsScreen;
    availableBranches: OperationsBranch[];
    currentBranch: OperationsBranch | null;
    checkoutReceipt: OperationsSale | null;
    capabilities: {
        manage_catalog: boolean;
        manage_team: boolean;
        manage_stock: boolean;
        produce: boolean;
        sell: boolean;
        can_bootstrap: boolean;
    };
    catalog: {
        products: OperationsProduct[];
        ingredients: OperationsIngredient[];
        recipes: OperationsRecipe[];
    };
    records: {
        batches: OperationsBatch[];
        sales: OperationsSale[];
        movements: OperationsMovement[];
        memberships: OperationsMembership[];
    };
    summary: {
        sales_cents: number;
        sale_count: number;
        produced_pieces: number;
        ingredient_count: number;
    };
    period: { from: string; to: string; timezone: string };
    dataReadiness: {
        observation_count: number;
        observed_count: number;
        stockout_count: number;
        missing_count: number;
        first_at: string | null;
        last_at: string | null;
    };
};
