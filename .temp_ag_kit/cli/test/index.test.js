import test from "node:test";
import assert from "node:assert/strict";
import { buildProgram } from "../bin/index.js";

test("CLI exposes safe lifecycle commands", () => {
    const program = buildProgram();
    const commands = new Map(program.commands.map((command) => [command.name(), command]));

    assert.deepEqual([...commands.keys()], ["init", "update", "rollback", "status"]);
    assert.ok(commands.get("update").options.some((option) => option.long === "--strategy"));
    assert.ok(commands.get("update").options.some((option) => option.long === "--dry-run"));
    assert.ok(commands.get("rollback").options.some((option) => option.long === "--backup"));
});
