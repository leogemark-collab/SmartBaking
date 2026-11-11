import { usePage } from '@inertiajs/react';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { branches, type Screen } from '@/lib/workspace';

type WorkspaceContext = {
    branch: string;
    setBranch: (branch: string) => void;
    preview: boolean;
    href: (screen: Screen) => string;
};
const Context = createContext<WorkspaceContext | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
    const preview = usePage().props.preview === true;
    const [branch, setBranch] = useState(branches[0]);
    const href = (screen: Screen) =>
        preview
            ? screen === 'dashboard'
                ? '/preview'
                : `/preview/${screen}`
            : `/${screen}`;
    return (
        <Context.Provider value={{ branch, setBranch, preview, href }}>
            {children}
        </Context.Provider>
    );
}

export function useWorkspace() {
    const context = useContext(Context);
    if (!context) throw new Error('Workspace pages require WorkspaceProvider.');
    return context;
}
