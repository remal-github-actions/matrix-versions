const fs = require('fs')

const dir = 'dist'
const fileNames = fs.readdirSync(dir)
for (const fileName of fileNames) {
    const file = `${dir}/${fileName}`
    const content = fs.readFileSync(file, 'utf-8')

    const newContent = content
        .replaceAll(
            /const (\w+) = path\.join\(__dirname, '\.\.', 'package\.json'\);\s*const pkg = \(\(\) => __nccwpck_require__\(\d+\)\(\1\)\)\(\);/g,
            'const pkg = { version: "unknown" };'
        )

    if (newContent !== content) {
        fs.writeFileSync(file, newContent, 'utf-8')
    }
}
