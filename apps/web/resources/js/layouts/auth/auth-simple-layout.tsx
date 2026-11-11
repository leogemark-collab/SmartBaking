import { Link } from '@inertiajs/react';
import { ArrowLeft, Check, Wheat } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { ProductArt } from '@/components/workspace/ui';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="workspace flex min-h-svh flex-col bg-[#fbf8f2]! text-[#332c25]">
            <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-7 sm:px-10">
                <Link
                    href={home()}
                    className="flex items-center gap-2.5 rounded-md font-semibold tracking-tight"
                >
                    <Wheat className="size-6 text-[#a6533b]" />
                    <span className="text-xl">
                        SmartBaking<span className="text-[#a6533b]">.</span>
                    </span>
                </Link>
                <Link
                    href={home()}
                    className="flex items-center gap-2 rounded-md text-xs text-[#8b7861]"
                >
                    <ArrowLeft className="size-3.5" />
                    Back to website
                </Link>
            </header>
            <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-12 px-6 py-10 sm:px-10 lg:grid-cols-2 lg:gap-24">
                <aside className="hidden lg:block">
                    <p className="text-[10px] font-semibold tracking-[.17em] text-[#a47753] uppercase">
                        For the people behind every batch
                    </p>
                    <h2 className="mt-6 font-[Georgia,serif] text-5xl leading-[1.12] tracking-[-.04em]">
                        A thoughtful start.
                        <br />
                        <span className="text-[#a6533b] italic">
                            A better bakery day.
                        </span>
                    </h2>
                    <p className="mt-5 max-w-sm text-sm leading-7 text-[#8a7864]">
                        Bring the counter, kitchen, and pantry together in one
                        place.
                    </p>
                    <div className="relative mt-8 flex h-36 items-center justify-center overflow-hidden rounded-2xl border border-[#e4dac8] bg-[#efe8d9]">
                        <div className="absolute -top-9 left-10 size-48 rounded-full border border-[#d5c8af]" />
                        <ProductArt
                            kind="loaf"
                            className="z-10 h-40 w-48 -rotate-12"
                        />
                        <ProductArt
                            kind="croissant"
                            className="z-10 -ml-12 h-32 w-40 rotate-12"
                        />
                    </div>
                    <p className="mt-5 flex items-center gap-2 text-[11px] text-[#7f896b]">
                        <Check className="size-3.5" />
                        Plan with care. Bake with confidence.
                    </p>
                </aside>
                <div className="mx-auto w-full max-w-sm rounded-2xl border border-[#e8dfd2] bg-white p-6 shadow-[0_10px_50px_#30292004] sm:p-8">
                    <div className="flex flex-col gap-8">
                        <div className="flex flex-col items-center gap-4">
                            <Link
                                href={home()}
                                className="flex flex-col items-center gap-2 font-medium"
                            >
                                <div className="mb-1 flex size-11 items-center justify-center rounded-xl bg-[#a6533b] text-white">
                                    <AppLogoIcon className="size-6" />
                                </div>
                                <span className="sr-only">{title}</span>
                            </Link>

                            <div className="space-y-2 text-center">
                                <h1 className="text-xl font-medium">{title}</h1>
                                <p className="text-center text-sm text-muted-foreground">
                                    {description}
                                </p>
                            </div>
                        </div>
                        {children}
                    </div>
                </div>
            </main>
            <footer className="px-6 pb-6 text-center text-[10px] text-[#9c8a72]">
                SmartBaking · A little care. A clearer plan.
            </footer>
        </div>
    );
}
