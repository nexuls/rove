import { statSync } from "node:fs";
import { resolve } from "node:path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import pkg from "../package.json" with { type: "json" };
import { start } from "./index";

export async function run(argv: string[] = process.argv): Promise<void> {
	const args = await yargs(hideBin(argv))
		.scriptName("rove")
		.usage("$0 [path]", "A fast, keyboard-driven terminal file manager", (y) =>
			y.positional("path", {
				describe: "Directory to open in",
				type: "string",
				default: ".",
			}),
		)
		.example("$0", "Open rove in the current directory")
		.example("$0 ~/projects", "Open rove in ~/projects")
		.version(pkg.version)
		.alias("version", "v")
		.help()
		.alias("help", "h")
		.strict()
		.parseAsync();

	const target = resolve(args.path as string);

	let stat: ReturnType<typeof statSync>;
	try {
		stat = statSync(target);
	} catch {
		console.error(`rove: '${target}' does not exist`);
		process.exit(1);
	}

	if (!stat.isDirectory()) {
		console.error(`rove: '${target}' is not a directory`);
		process.exit(1);
	}

	await start(target);
}

// When compiled into a standalone binary (or run directly), cli.ts is the
// entry module, so kick off the CLI here. When imported (e.g. from bin/rove)
// this is skipped and the caller invokes run() itself.
if (import.meta.main) {
	await run();
}
