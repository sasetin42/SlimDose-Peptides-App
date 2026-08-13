import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fse from "fs-extra";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

const read = (relativePath) => fse.readFile(path.join(repoRoot, relativePath), "utf8");

test("all GitHub Actions are pinned to immutable commit SHAs", async () => {
    const workflowDir = path.join(repoRoot, ".github", "workflows");
    const workflowFiles = (await fse.readdir(workflowDir))
        .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"));
    const unpinned = [];

    for (const workflowFile of workflowFiles) {
        const lines = (await read(path.join(".github", "workflows", workflowFile))).split("\n");
        for (const [index, line] of lines.entries()) {
            const match = line.match(/uses:\s*[^@\s]+@([^\s#]+)/);
            if (match && !/^[0-9a-f]{40}$/.test(match[1])) {
                unpinned.push(`${workflowFile}:${index + 1}:${match[1]}`);
            }
        }
    }

    assert.deepEqual(unpinned, []);
});

test("release workflows do not disable TLS or use a long-lived npm token", async () => {
    const deploy = await read(".github/workflows/deploy.yml");
    const publish = await read(".github/workflows/publish.yml");

    assert.doesNotMatch(deploy, /NODE_TLS_REJECT_UNAUTHORIZED/);
    assert.doesNotMatch(publish, /NPM_TOKEN|NODE_AUTH_TOKEN/);
    assert.match(publish, /id-token:\s*write/);
    assert.match(publish, /Trusted Publishing/);
});

test("package versions stay aligned", async () => {
    const manifests = await Promise.all([
        fse.readJson(path.join(repoRoot, "package.json")),
        fse.readJson(path.join(repoRoot, "cli", "package.json")),
        fse.readJson(path.join(repoRoot, "web", "package.json")),
    ]);

    assert.equal(manifests[0].version, manifests[1].version);
    assert.equal(manifests[1].version, manifests[2].version);
});

test("public documentation reflects current paths and inventory", async () => {
    for (const file of ["README.md", "README-VI.md"]) {
        const content = await read(file);
        assert.match(content, /\| \*\*Skills\*\* \| 47 \|/);
        assert.doesNotMatch(content, /ln -s ~\/\.ag-kit\/\.agents \.agent(?:\s|$)/);
        assert.match(content, /ag-kit rollback/);
    }
});

test("published CLI package includes its runtime library", async () => {
    const cliPackage = await fse.readJson(path.join(repoRoot, "cli", "package.json"));
    assert.ok(cliPackage.files.includes("bin"));
    assert.ok(cliPackage.files.includes("lib"));
});
