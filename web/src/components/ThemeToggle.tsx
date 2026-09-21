import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

function syncThemeColor(isDark: boolean) {
	const meta = document.querySelector('meta[name="theme-color"]');
	if (meta) meta.setAttribute('content', isDark ? '#11111b' : '#eff1f5');
}

export default function ThemeToggle() {
	const [dark, setDark] = useState(false);

	useEffect(() => {
		const isDark = document.documentElement.classList.contains('dark');
		setDark(isDark);
		syncThemeColor(isDark);
	}, []);

	const toggle = () => {
		const next = !dark;
		setDark(next);
		document.documentElement.classList.toggle('dark', next);
		syncThemeColor(next);
		try {
			localStorage.setItem('ft-theme', next ? 'dark' : 'light');
		} catch {
			// Private browsing may block localStorage
		}
	};

	return (
		<button
			type="button"
			onClick={toggle}
			className="btn btn-ghost p-2"
			aria-label={dark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
			aria-pressed={dark}
			title={dark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
		>
			{dark ? <Moon size={18} /> : <Sun size={18} />}
		</button>
	);
}
