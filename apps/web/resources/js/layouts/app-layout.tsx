import AppLayoutTemplate from '@/layouts/workspace-layout';
import OperationsLayout from '@/layouts/operations-layout';
import { usePage } from '@inertiajs/react';
import type { BreadcrumbItem } from '@/types';

export default function AppLayout({
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    const Layout =
        usePage().props.preview === true ? AppLayoutTemplate : OperationsLayout;
    return <Layout>{children}</Layout>;
}
