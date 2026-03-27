/**
 * @fileoverview useFocusTrap — accessibility hook for modal focus management.
 * 
 * ISSUE #36: Focus trap implementation for modal accessibility.
 * Category: UI/UX
 * Priority: Medium
 * Affected Area: Checkout flow (and all modals)
 * 
 * This hook implements proper focus management for modal dialogs:
 * - Traps focus within the modal (Tab/Shift+Tab cycle through focusable elements)
 * - Sets initial focus to the first focusable element
 * - Restores focus to the trigger element when modal closes
 * - Handles Escape key to close modal
 * 
 * @module useFocusTrap
 */

import { useEffect, useRef } from 'react';

/**
 * Query selector for all focusable elements within a container.
 * Includes buttons, links, inputs, textareas, selects, and elements with tabindex >= 0.
 */
const FOCUSABLE_ELEMENTS = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'textarea:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * useFocusTrap — manages focus within a modal dialog for accessibility.
 * 
 * @param {Object} options
 * @param {boolean} options.isOpen - Whether the modal is currently open
 * @param {() => void} options.onClose - Callback to close the modal (triggered by Escape key)
 * @param {boolean} [options.initialFocus=true] - Whether to focus first element on mount
 * @param {boolean} [options.restoreFocus=true] - Whether to restore focus on unmount
 * 
 * @returns {React.RefObject} - Ref to attach to the modal container element
 * 
 * @example
 * function MyModal({ isOpen, onClose }) {
 *   const modalRef = useFocusTrap({ isOpen, onClose });
 *   
 *   if (!isOpen) return null;
 *   
 *   return (
 *     <div ref={modalRef} role="dialog" aria-modal="true">
 *       <button onClick={onClose}>Close</button>
 *       <input type="text" />
 *     </div>
 *   );
 * }
 */
export function useFocusTrap({ isOpen, onClose, initialFocus = true, restoreFocus = true }) {
    const containerRef = useRef(null);
    const previousActiveElement = useRef(null);

    useEffect(() => {
        if (!isOpen) return;

        // Store the element that had focus before the modal opened
        previousActiveElement.current = document.activeElement;

        const container = containerRef.current;
        if (!container) return;

        // Get all focusable elements within the modal
        const getFocusableElements = () => {
            return Array.from(container.querySelectorAll(FOCUSABLE_ELEMENTS));
        };

        // Set initial focus to the first focusable element
        if (initialFocus) {
            const focusableElements = getFocusableElements();
            if (focusableElements.length > 0) {
                // Small delay to ensure modal is fully rendered
                setTimeout(() => {
                    focusableElements[0]?.focus();
                }, 10);
            }
        }

        /**
         * Handle Tab key to trap focus within the modal.
         * When Tab is pressed on the last element, focus moves to the first.
         * When Shift+Tab is pressed on the first element, focus moves to the last.
         */
        const handleKeyDown = (event) => {
            // Handle Escape key
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }

            // Only handle Tab key
            if (event.key !== 'Tab') return;

            const focusableElements = getFocusableElements();
            if (focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            // Shift+Tab on first element: move to last
            if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
                return;
            }

            // Tab on last element: move to first
            if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
                return;
            }
        };

        // Attach keyboard event listener
        container.addEventListener('keydown', handleKeyDown);

        // Cleanup function
        return () => {
            container.removeEventListener('keydown', handleKeyDown);

            // Restore focus to the element that opened the modal
            if (restoreFocus && previousActiveElement.current) {
                // Use setTimeout to ensure the modal is fully removed from DOM
                setTimeout(() => {
                    previousActiveElement.current?.focus();
                }, 10);
            }
        };
    }, [isOpen, onClose, initialFocus, restoreFocus]);

    return containerRef;
}

export default useFocusTrap;
