const fs = require('fs')
const path = require('path')

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
const renovateVersion = pkg.dependencies.renovate ?? 'unknown'

const dir = path.resolve('.', 'dist')

const fileNames = fs.readdirSync(dir)
    .filter(name => name.endsWith('.js'))
for (const fileName of fileNames) {
    const file = path.resolve(dir, fileName)
    const content = fs.readFileSync(file, 'utf-8')

    const newContent = content
        .replaceAll(
            /const (\w+) = path\.join\(__dirname, '\.\.', 'package\.json'\);\s*const pkg = \(\(\) => __nccwpck_require__\(\d+\)\(\1\)\)\(\);/g,
            `const pkg = { version: "${renovateVersion}" };`
        )

    if (newContent !== content) {
        fs.writeFileSync(file, newContent, 'utf-8')
    }
}
