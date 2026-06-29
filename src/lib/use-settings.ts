import { useKeyboard } from "@opentui/react";
import { useCallback, useState } from "react";

// Toggleable, boolean view settings for the file browser. Each one is paired
// with a keyboard shortcut in SETTING_SHORTCUTS below.
export interface Settings {
	// Show dotfiles / dot-directories (names starting with ".").
	showHidden: boolean;
	// Hide entries matched by the nearest .gitignore.
	respectGitignore: boolean;
	// Render the preview pane for the selected file.
	showPreview: boolean;
	// Show the per-entry metadata (size, mode) in the file tree.
	showMeta: boolean;
	// List directories before files instead of a flat alphabetical sort.
	sortDirsFirst: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
	showHidden: false,
	respectGitignore: true,
	showPreview: true,
	showMeta: true,
	sortDirsFirst: true,
};

interface Shortcut {
	// The `key.name` reported by the renderer for this binding.
	key: string;
	// Human-readable label for help/palette surfaces.
	description: string;
}

// Single-key shortcuts that toggle each setting. Plain (unmodified) keys are
// safe here because the browser never captures text input. Keep these clear of
// the navigation keys (j/k/h/l, arrows) used in the main view.
export const SETTING_SHORTCUTS: Record<keyof Settings, Shortcut> = {
	showHidden: { key: ".", description: "Toggle hidden files" },
	respectGitignore: { key: "i", description: "Toggle .gitignore filtering" },
	showPreview: { key: "p", description: "Toggle file preview" },
	showMeta: { key: "m", description: "Toggle metadata column" },
	sortDirsFirst: { key: "s", description: "Toggle directories-first sort" },
};

export interface UseSettings {
	settings: Settings;
	toggle: (key: keyof Settings) => void;
	set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

// Manage the browser's view settings and wire up the keyboard shortcuts that
// toggle them. Pass `initial` to override any defaults at mount.
export function useSettings(initial?: Partial<Settings>): UseSettings {
	const [settings, setSettings] = useState<Settings>({
		...DEFAULT_SETTINGS,
		...initial,
	});

	const toggle = useCallback((key: keyof Settings) => {
		setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
	}, []);

	const set = useCallback(
		<K extends keyof Settings>(key: K, value: Settings[K]) => {
			setSettings((prev) => ({ ...prev, [key]: value }));
		},
		[],
	);

	useKeyboard((key) => {
		// Ignore modified chords so we don't fight Ctrl+P (palette) etc.
		if (key.ctrl || key.meta || key.shift) return;

		for (const name of Object.keys(SETTING_SHORTCUTS) as (keyof Settings)[]) {
			if (key.name === SETTING_SHORTCUTS[name].key) {
				toggle(name);
				break;
			}
		}
	});

	return { settings, toggle, set };
}
