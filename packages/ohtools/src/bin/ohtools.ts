#!/usr/bin/env bun
import { runCli } from "../adapters/cli";

const code = await runCli(Bun.argv.slice(2));
process.exit(code);
