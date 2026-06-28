import { useTerminalColors } from "./hooks";
import { BASE_ICONS, iconFor } from "./icons";
import type { FileMeta } from "./types";
import { colorizeMode, formatSize } from "./utils";

export function StatusBar({
	meta,
	totalItems,
	currentIndex,
}: {
	meta: FileMeta | null;
	totalItems: number;
	currentIndex: number;
}) {
	const c = useTerminalColors();

	if (!meta) return <text fg={c[8]}>(no selection)</text>;

	const icon = iconFor({
		name: meta.name,
		path: meta.path,
		isDirectory: meta.isDirectory,
		size: meta.size,
		mode: meta.mode,
	});

	const currentPercent =
		currentIndex === 0
			? "TOP"
			: currentIndex === totalItems - 1
				? "BOT"
				: `${(((currentIndex + 1) / totalItems) * 100).toFixed(0)}%`;

	return (
		<box flexDirection="row" paddingLeft={1} paddingRight={1}>
			<box flexDirection="row" alignItems="center">
				<text fg={c[4]} flexShrink={0} selectable={false}>
					{BASE_ICONS.round_l}
				</text>
				<text fg={c[4]} bg={c[4]} flexShrink={0} selectable={false}>
					<span fg={c[5]}>{`${icon.glyph} `}</span>
					<span fg={meta.isDirectory ? c[15] : c[15]}>{meta.name}</span>
				</text>
				<text fg={c[4]} bg={c[15]} flexShrink={0} selectable={false}>
					{BASE_ICONS.round_r}
				</text>
				<text fg={c[5]} bg={c[15]} flexShrink={0} selectable={false}>
					{` ${formatSize(meta.size)}`}
				</text>
				<text fg={c[15]} flexShrink={0} selectable={false}>
					{BASE_ICONS.round_r}
				</text>
			</box>

			<box flexGrow={1} />

			<text fg={c[8]} wrapMode="none" selectable={false}>
				{meta.isSymlink ? " ↪ " : ""}
				{colorizeMode(meta.mode).map((seg) => (
					<span key={seg.key} fg={c[seg.color]}>
						{seg.char}
					</span>
				))}{" "}
			</text>

			<box flexDirection="row" alignItems="center">
				<text fg={c[15]} flexShrink={0} selectable={false}>
					{BASE_ICONS.round_l}
				</text>
				<text fg={c[5]} bg={c[15]} flexShrink={0} selectable={false}>
					<span fg={c[0]}>{`${currentPercent} `}</span>
				</text>
				<text fg={c[4]} bg={c[15]} flexShrink={0} selectable={false}>
					{BASE_ICONS.round_l}
				</text>
				<text fg={c[5]} bg={c[4]} flexShrink={0} selectable={false}>
					{`${currentIndex + 1} / ${totalItems}`}
				</text>
				<text fg={c[4]} flexShrink={0} selectable={false}>
					{BASE_ICONS.round_r}
				</text>
			</box>
		</box>
	);
}
