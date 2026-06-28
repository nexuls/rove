import { useState } from "react";
import { useTerminalColors } from "./hooks";
import { useKeyboard } from "@opentui/react";

export function Palette() {
	const colors = useTerminalColors();
	const [showPalette, setShowPalette] = useState(false);

	useKeyboard((key) => {
		if (key.ctrl && key.name === "p") {
			setShowPalette((prev) => !prev);
		}
	});

	if (!showPalette) return null;

	return (
		<box
			flexDirection="column"
			justifyContent="center"
			gap={0}
			position="absolute"
			top={0}
			left={0}
			width="100%"
			height="100%"
			backgroundColor="black"
		>
			<box
				flexGrow={1}
				flexDirection="column"
				alignItems="center"
				justifyContent="center"
			>
				<text fg="white" paddingLeft={1} paddingTop={1}>
					Terminal Default Palette
				</text>
				<box
					flexDirection="row"
					justifyContent="center"
					flexWrap="wrap"
					gap={1}
					paddingX={1}
				>
					{colors?.map((color, i) => (
						<box
							key={color?.toString() || i}
							flexDirection="column"
							alignItems="center"
						>
							<box
								width={20}
								height={3}
								backgroundColor={color?.toString()}
								alignItems="center"
								justifyContent="center"
								flexDirection="column"
							>
								<text fg="white">{color === null ? `${i} (N/A)` : i}</text>
							</box>
							<text fg="white">{color?.toString()}</text>
						</box>
					))}
				</box>
			</box>
		</box>
	);
}
