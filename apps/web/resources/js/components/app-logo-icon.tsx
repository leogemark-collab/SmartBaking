import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path d="m3 21 17-17M7 17c-4 0-5-3-4-6 4 0 6 2 4 6Zm4-4c-4 0-5-3-4-6 4 0 6 2 4 6Zm4-4c-4 0-5-3-4-6 4 0 6 2 4 6Zm-6 6c0 4 3 5 6 4 0-4-2-6-6-4Zm4-4c0 4 3 5 6 4 0-4-2-6-6-4Zm4-4c0 4 3 5 6 4 0-4-2-6-6-4Z" />
        </svg>
    );
}
