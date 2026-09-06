const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Svelte action porting the old useModalAccessibility hook (WCAG 2.4.3):
 * - Escape closes and stops propagation so page-level handlers don't also fire
 * - Traps Tab focus inside the dialog while it is open
 * - Moves focus into the dialog on mount and restores it to the trigger on destroy
 *
 * Note: lives outside $lib/server because it is client-side code.
 */
export function modalAccessibility(node: HTMLElement, opts: { onClose: () => void }) {
	let onClose = opts.onClose;
	const previouslyFocused = document.activeElement as HTMLElement | null;
	if (!node.contains(document.activeElement)) node.focus();

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			e.stopPropagation();
			onClose();
			return;
		}
		if (e.key !== 'Tab') return;

		const focusables = Array.from(
			node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
		).filter((el) => el.offsetParent !== null || el === document.activeElement);
		if (focusables.length === 0) return;

		const first = focusables[0];
		const last = focusables[focusables.length - 1];
		const current = document.activeElement;

		if (!node.contains(current)) {
			e.preventDefault();
			first.focus();
		} else if (e.shiftKey && current === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && current === last) {
			e.preventDefault();
			first.focus();
		}
	};

	document.addEventListener('keydown', handleKeyDown, true);
	return {
		update(next: { onClose: () => void }) {
			onClose = next.onClose;
		},
		destroy() {
			document.removeEventListener('keydown', handleKeyDown, true);
			previouslyFocused?.focus?.();
		}
	};
}
