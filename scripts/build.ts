import { existsSync } from 'node:fs'
import { mkdir, readdir } from 'node:fs/promises'
import { extname } from 'node:path'
import cjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import swc from '@swc/core'
import { rollup } from 'rollup'
import esbuild from 'rollup-plugin-esbuild'
import tsConfigPaths from 'rollup-plugin-tsconfig-paths'

const extensions = ['.js', '.jsx', '.mjs', '.ts', '.tsx', '.cts', '.mts']
const plugins = process.argv.slice(2).filter(x => !x.startsWith('-'))
const dev = process.argv.includes('--dev') || process.argv.includes('-d')

const hasher = new Bun.CryptoHasher('sha256')

const importMap = {
    react: 'React',
    'react-native': 'ReactNative',
    '@revenge-mod/revenge': 'bunny',
}

if (!existsSync('./dist')) await mkdir('./dist')

for (const plugin of plugins.length ? plugins : await readdir('./plugins')) {
    const manifest = await Bun.file(`./plugins/${plugin}/manifest.json`).json()

    try {
        const bundle = await rollup({
            input: `./plugins/${plugin}/${manifest.main}`,
            watch: {
                include: `./plugins/${plugin}/**`,
            },
            onwarn(warning) {
                if (warning.code === 'MISSING_NAME_OPTION_FOR_IIFE_EXPORT') return
                return console.warn(warning.message)
            },
            external: id => Boolean(id.match(/^@(revenge-mod|vendetta)/)) || importMap[id],
            plugins: [
                tsConfigPaths(),
                nodeResolve(),
                cjs(),
                {
                    name: 'swc',
                    async transform(code, id) {
                        const ext = extname(id)
                        if (!extensions.includes(ext)) return null

                        const ts = ext.includes('ts')
                        const tsx = ts ? ext.endsWith('x') : undefined
                        const jsx = !ts ? ext.endsWith('x') : undefined

                        const result = await swc.transform(code, {
                            filename: id,
                            jsc: {
                                externalHelpers: false,
                                parser: {
                                    syntax: ts ? 'typescript' : 'ecmascript',
                                    tsx,
                                    jsx,
                                },
                            },
                            env: {
                                targets: 'fully supports es6',
                                include: [
                                    'transform-block-scoping',
                                    'transform-classes',
                                    'transform-async-to-generator',
                                    'transform-async-generator-functions',
                                ],
                                exclude: [
                                    'transform-parameters',
                                    'transform-template-literals',
                                    'transform-exponentiation-operator',
                                    'transform-named-capturing-groups-regex',
                                    'transform-nullish-coalescing-operator',
                                    'transform-object-rest-spread',
                                    'transform-optional-chaining',
                                    'transform-logical-assignment-operators',
                                ],
                            },
                        })
                        return result.code
                    },
                },
                {
                    name: 'file-parser',
                    async transform(code, id) {
                        const parsers = {
                            text: ['html', 'css', 'svg'],
                            raw: ['json'],
                            uri: ['png'],
                        }
                        const extToMime = {
                            png: 'image/png',
                        }

                        const ext = extname(id).slice(1)
                        const mode = Object.entries(parsers).find(([_, v]) => v.includes(ext))?.[0]
                        if (!mode) return null

                        let thing: string
                        if (mode === 'text') thing = JSON.stringify(code)
                        else if (mode === 'raw') thing = code
                        else if (mode === 'uri')
                            thing = JSON.stringify(
                                `data:${extToMime[ext] ?? ''};base64,${Buffer.from(await Bun.file(id).arrayBuffer()).toString('base64')}`,
                            )

                        if (thing) return { code: `export default ${thing}` }
                    },
                },
                esbuild({
                    minifySyntax: !dev,
                    minifyWhitespace: !dev,
                    define: {
                        IS_DEV: String(dev),
                    },
                }),
            ],
        })

        const code = await bundle
            .write({
                file: `./dist/${plugin}/index.js`,
                globals(id) {
                    if (importMap[id]) return importMap[id]

                    if (id.startsWith('@vendetta')) return id.substring(1).replace(/\//g, '.')

                    return null
                },
                format: 'iife',
                compact: true,
                exports: 'named',
            })
            .then(result => result.output[0].code)

        await bundle.close()

        manifest.main = 'index.js'
        manifest.hash = await hasher.update(code).digest('hex')
        await Bun.write(`./dist/${plugin}/manifest.json`, JSON.stringify(manifest))

        console.log(`Successfully built: ${manifest.name}`)
    } catch (e) {
        console.error(`Failed to build plugin, ${manifest.name}:`, e)
        process.exit(1)
    }
}
