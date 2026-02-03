import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind classes and handles conflicts using tailwind-merge and clsx.
 * This is a standard utility in modern "Silicon Valley" style UI development (e.g., shadcn/ui).
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
