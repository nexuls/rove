import { useTerminalColors } from "../lib/hooks";
import { type Settings, SETTING_SHORTCUTS } from "../lib/use-settings";

// Navigation keys handled in App — listed here for discoverability since they
// aren't part of the toggleable settings.
const NAV_SHORTCUTS: { key: string; description: string }[] = [
	{ key: "↑/k  ↓/j", description: "Move selection" },
	{ key: "←/h", description: "Go to parent directory" },
	{ key: "→/l  ⏎", description: "Enter directory" },
	{ key: "^p", description: "Toggle color palette" },
];

// Centered overlay that lists every keyboard shortcut. Toggled by the
// `showShortcuts` setting (bound to "?"). Each toggle row also reflects its
// current on/off state.
export function Shortcuts({ settings }: { settings: Settings }) {
	const c = useTerminalColors();

	if (!settings.showShortcuts) return null;

	const toggles = (Object.keys(SETTING_SHORTCUTS) as (keyof Settings)[]).filter(
		(name) => name !== "showShortcuts",
	);

	return (
		<box
			position="absolute"
			top={0}
			left={0}
			width="100%"
			height="100%"
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
			backgroundColor={"black"}
			opacity={0.9}
		>
			<box
				flexDirection="column"
				border
				borderColor={c[4]}
				borderStyle="rounded"
				paddingLeft={2}
				paddingRight={2}
				paddingTop={1}
				paddingBottom={1}
			>
				<text fg={c[4]} selectable={false}>
					Keyboard Shortcuts
				</text>

				<text fg={c[8]}> </text>
				<text fg={c[3]} selectable={false}>
					Settings
				</text>
				{toggles.map((name) => {
					const { key, description } = SETTING_SHORTCUTS[name];
					const on = settings[name];
					return (
						<text key={name} selectable={false}>
							<span fg={c[5]}>{key.padEnd(10)}</span>
							<span fg={c[15]}>{description.padEnd(36)}</span>
							<span fg={on ? c[2] : c[8]}>{on ? "● on " : "○ off"}</span>
						</text>
					);
				})}

				<text fg={c[8]}> </text>
				<text fg={c[3]} selectable={false}>
					Navigation
				</text>
				{NAV_SHORTCUTS.map((s) => (
					<text key={s.key} selectable={false}>
						<span fg={c[5]}>{s.key.padEnd(10)}</span>
						<span fg={c[15]}>{s.description}</span>
					</text>
				))}

				<text fg={c[8]}> </text>
				<text fg={c[8]} selectable={false}>
					Press / to close
				</text>
			</box>
		</box>
	);
}
