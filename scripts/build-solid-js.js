const fs = require('fs').promises
const camelcase = require('camelcase')
const { promisify } = require('util')
const rimraf = promisify(require('rimraf'))
const svgr = require('@svgr/core')

let transform = async (svg, componentName) => {
  let code = await svgr.transform(svg, { jsxRuntime: 'automatic' }, { componentName })
  code = code.replace(/=/, ": Component<ComponentProps<'svg'>> =")
    .replace(/^/, "import type { Component, ComponentProps } from 'solid-js';\n\n")
  return code
}

async function getIcons(style) {
  let files = await fs.readdir(`./optimized/${style}`)
  return Promise.all(
    files.map(async (file) => ({
      svg: await fs.readFile(`./optimized/${style}/${file}`, 'utf8'),
      componentName: `${camelcase(file.replace(/\.svg$/, ''), {
        pascalCase: true,
      })}Icon`,
    }))
  )
}

function exportAll(icons) {
  return icons
    .map(({ componentName }) => `export { default as ${componentName} } from './${componentName}'`)
    .join('\n')
}

async function buildIcons(package, style, format) {
  let outDir = `./${package}/${style}`

  await fs.mkdir(outDir, { recursive: true })

  let icons = await getIcons(style)

  await Promise.all([
    ...icons.map(async ({ componentName, svg }) => {
      let content = await transform(svg, componentName)

      return fs.writeFile(`${outDir}/${componentName}.tsx`, content, 'utf8')
    }),
    fs.writeFile(`${outDir}/index.ts`, exportAll(icons, format), 'utf8'),
  ])
}

async function main(package) {
  console.log(`Building ${package} package...`)

  await Promise.all(
    ['outline', 'solid']
      .map(async style => {
        await rimraf(`./${package}/${style}`)
        await buildIcons(package, style)
      })
  )

  console.log(`Finished building ${package} package.`)
}

main('solid-js')
