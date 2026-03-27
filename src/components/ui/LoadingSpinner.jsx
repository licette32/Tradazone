import React from 'react';

/**
 * LoadingSpinner — globally accessible, centered loading indicator.
 * 
 * Part of the App Routing improvement (Issue #55, reported by user as #58).
 * Used as a Suspense fallback in App.jsx to provide visual feedback 
 * during code-splitting chunk retrieval.
 * 
 * Design matches the micro-spinner in src/components/forms/Button.jsx 
 * but scaled and centered for page-level state.
 */
function LoadingSpinner() {
    return (
        <div className="flex items-center justify-center min-h-[400px] w-full p-8" data-testid="app-loading-spinner">
            <div className="flex flex-col items-center gap-4">
                <span className="w-10 h-10 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
                <p className="text-sm font-medium text-t-muted animate-pulse">Loading Tradazone...</p>
            </div>
        </div>
    );
}

export default LoadingSpinner;
