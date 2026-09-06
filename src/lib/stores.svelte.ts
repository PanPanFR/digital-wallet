/**
 * Global toast state (Svelte 5 runes). Mutate only via notify()/removeToast().
 */
export const toasts = $state<{ id: number; type: 'success' | 'error'; message: string }[]>([]);

export function notify(type: 'success' | 'error', message: string) {
	const id = Date.now() + Math.random();
	toasts.push({ id, type, message });
	setTimeout(() => removeToast(id), 3500);
}

export function removeToast(id: number) {
	const i = toasts.findIndex((t) => t.id === id);
	if (i !== -1) toasts.splice(i, 1);
}
