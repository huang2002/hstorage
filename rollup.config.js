import rollupPluginBabel from "rollup-plugin-babel";

const input = 'raw/index.js';

export default [
    {
        input,
        plugins: [
            rollupPluginBabel()
        ],
        output: {
            format: 'umd',
            name: 'HS',
            file: 'dist/hstore.umd.js'
        }
    },
    {
        input,
        output: {
            format: 'esm',
            file: 'dist/hstore.js'
        }
    }
];
