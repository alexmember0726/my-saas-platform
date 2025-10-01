// components/common/CopyToClipboard.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyToClipboardProps {
    value: string;
    // Optional CSS class for the button container
    className?: string; 
    // Optional text to show instead of just the icon
    label?: string; 
}

/**
 * A reusable component to copy text to the clipboard with visual feedback.
 */
export const CopyToClipboard: React.FC<CopyToClipboardProps> = ({ value, className = '', label }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        if (!value) return;

        try {
            // Use the modern Clipboard API
            await navigator.clipboard.writeText(value);
            setCopied(true);
            
            // Reset the "Copied" state after a short delay
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            // Fallback for older browsers or environments if needed
            // document.execCommand('copy') logic would go here
            alert("Failed to copy to clipboard. Please try manually.");
        }
    }, [value]);

    const Icon = copied ? Check : Copy;

    return (
        <button
            onClick={handleCopy}
            className={`flex items-center space-x-1 p-1 rounded transition-colors duration-150 
                        ${copied ? 'text-green-400 hover:text-green-300' : 'text-gray-300 hover:text-white'}
                        ${className}`}
            aria-label={copied ? 'Copied successfully' : `Copy ${label || 'value'} to clipboard`}
            title={copied ? 'Copied!' : 'Copy to clipboard'}
            disabled={copied}
        >
            <Icon className="w-4 h-4" />
            {label && <span className="text-sm">{copied ? 'Copied' : label}</span>}
        </button>
    );
};