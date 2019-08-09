// @ts-check
///<reference types=".." />

const STORE_NAME = 'hstore-test';

/** @param {string} selector */
const $ = selector => document.querySelector(selector);

const output = $('#output');

/** @type {HS.Store<{ version: number; str: string; n: number; }>} */
const store = new HS.Store(STORE_NAME, {
    type: HS.dictionary({
        version: HS.number({
            defaultValue: 1,
            min: 0,
            integer: true,
        }),
        str: HS.string({
            defaultValue: 'Hello, world!',
        }),
        n: HS.number(),
    }),
    onInvalid(paths) {
        output.textContent = 'Invalid value at path: ' +
            (paths.map(path => path.join('.')).join(', ') || '(root)');
    },
    onConflict(newSource, oldSource) {
        output.textContent = `Sources conflicted!\n### New: ${newSource}\n### Old: ${oldSource}`;
    },
});

function showStore() {
    output.textContent = JSON.stringify(store.get(), null, 4);
}

showStore();

const pathInput = $('#path'),
    valueInput = $('#value');
$('#form').addEventListener('submit', event => {
    // @ts-ignore
    if (store.set(pathInput.value, JSON.parse(valueInput.value))) {
        showStore();
    }
});

$('#reset').addEventListener('click', () => {
    localStorage.setItem(STORE_NAME, JSON.stringify({ foo: 'bar' }));
    location.reload();
});
