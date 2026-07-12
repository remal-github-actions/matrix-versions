import * as fs from 'fs'
import * as path from 'path'

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
const renovateVersion = pkg.dependencies.renovate ?? 'unknown'

const distDir = path.resolve('.', 'dist')

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

const fileNames = fs.readdirSync(distDir)
    .filter(name => name.endsWith('.js'))
for (const fileName of fileNames) {
    const file = path.resolve(distDir, fileName)
    const content = fs.readFileSync(file, 'utf-8')

    const newContent = content
        .replaceAll(
            /const (\w+) = path\.join\(__dirname, '\.\.', 'package\.json'\);\s*const pkg = \(\(\) => __nccwpck_require__\(\d+\)\(\1\)\)\(\);/g,
            `const pkg = { version: "${renovateVersion}" };`
        )
        // __dirname is not defined in ES modules: load wasm files relative to the current module
        .replaceAll(
            /const ([$\w]+) = ([$\w]+)\.join\(__dirname, '([-\w.]+\.wasm)'\);\s*const bytes = ([$\w]+)\.readFileSync\(\1\);/g,
            `const bytes = $4.readFileSync(new URL('$3', import.meta.url));`
        )

    if (newContent !== content) {
        fs.writeFileSync(file, newContent, 'utf-8')
    }
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

const rattlerDistDir = path.resolve('.', 'node_modules/@baszalmstra/rattler/dist')
const rattlerWasmFiles = fs.readdirSync(rattlerDistDir)
    .filter(name => name.endsWith('.wasm'))
for (const fileName of rattlerWasmFiles) {
    fs.copyFileSync(
        path.resolve(rattlerDistDir, fileName),
        path.resolve(distDir, fileName)
    )
}
