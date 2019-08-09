import { Type, getTypeByPath } from "./types";
import { _getByPath, _parsePath, _setByPath, _Object, _clone, _deleteByPath, _testTypePath, _testPath, } from "./utils";
import { inferType } from "./inferType";

export type StoreSource = string | null;

export type StoreInvalidCallback<T> = (this: Store<T>, paths: string[][]) => void;
export type StoreConflictCallback<T> =
    (this: Store<T>, newSource: StoreSource, oldSource: StoreSource) => void;
export type StoreUpdateCallback<T> = (this: Store<T>, value: T) => T;

export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

export interface StoreOptions<T> {
    defaultValue?: T | null;
    type?: Type<T> | null;
    delay?: number;
    storage?: StorageLike;
    lazyLoad?: boolean;
    strictLoad?: boolean;
    secure?: boolean;
    autoFix?: boolean;
    onInvalid?: StoreInvalidCallback<T> | null;
    onConflict?: StoreConflictCallback<T> | null;
    pathSeparator?: string;
}

export class Store<T = unknown> implements Required<StoreOptions<T>> {

    static defaults: StoreOptions<any> = {
        defaultValue: null,
        delay: 100,
        storage: localStorage,
        lazyLoad: false,
        strictLoad: true,
        secure: true,
        autoFix: true,
        onInvalid: null,
        onConflict: null,
        pathSeparator: '.',
    };

    constructor(public name: string, options?: StoreOptions<T>) {
        this.save = this.save.bind(this);
        _Object.assign(this, Store.defaults, options);
        if (options) {
            const hasDefaultValue = 'defaultValue' in options;
            if ('type' in options) {
                if (!hasDefaultValue) {
                    this.defaultValue = this.type!.defaultValue;
                }
            } else if (hasDefaultValue) {
                this.type = inferType(this.defaultValue) as Type<T>;
            }
        }
        if (!this.lazyLoad) {
            this.load();
        }
    }

    private _value!: T;
    private _oldSource!: StoreSource;
    defaultValue!: T | null;
    type!: Type<T> | null;
    delay!: number;
    storage!: StorageLike;
    readonly lazyLoad!: boolean;
    strictLoad!: boolean;
    secure!: boolean;
    autoFix!: boolean;
    onInvalid!: StoreInvalidCallback<T> | null;
    onConflict!: StoreConflictCallback<T> | null;
    pathSeparator!: string;

    private _getDefaultValue() {
        const { defaultValue } = this;
        return defaultValue && typeof defaultValue === 'object' ?
            _clone(defaultValue) :
            defaultValue;
    }

    private _invalid(paths: string[][]) {
        if (this.onInvalid) {
            this.onInvalid(paths);
        } else if (!this.autoFix) {
            const { pathSeparator } = this;
            throw (
                'Invalid value at paths: ' +
                (paths.map(path => path.join(pathSeparator)).join(', ') || '(root)')
            );
        }
    }

    private _conflict(newSource: StoreSource, oldSource: StoreSource) {
        if (this.onConflict) {
            this.onConflict(newSource, oldSource);
        } else {
            throw 'Sources conflicted';
        }
    }

    private _saveTimer: any = null;
    private _save() {
        if (this.delay) {
            if (this._saveTimer !== null) {
                clearTimeout(this._saveTimer);
            }
            this._saveTimer = setTimeout(this.save, this.delay);
        } else {
            this.save();
        }
    }

    save() {
        if (this.secure && this.checkConflict()) {
            return false;
        } else {
            this.storage.setItem(this.name, this._oldSource = JSON.stringify(this._value));
            return true;
        }
    }

    reset(selector: string | string[]) {
        const path = _parsePath(selector, this.pathSeparator);
        if (_testPath(this._value, path)) {
            if (this.type) {
                if (path.length) {
                    _setByPath(this._value, path, getTypeByPath(this.type, path).defaultValue);
                } else {
                    this._value = this.type.defaultValue;
                }
                return true;
            } else if (this.defaultValue) {
                if (path.length) {
                    _setByPath(this._value, path, _getByPath(this.defaultValue, path));
                } else {
                    this._value = this.defaultValue;
                }
                return true;
            }
        }
        return false;
    }

    load(source?: string | null) {
        if (source === undefined) {
            source = this.storage.getItem(this.name);
        }
        const { type } = this,
            defaultValue = this._getDefaultValue();
        let value = source === null ? defaultValue : JSON.parse(source);
        const validatingResult = type && type.validate(value);
        if (validatingResult && !validatingResult.valid) {
            this._invalid(validatingResult.paths);
            if (this.autoFix) {
                if (type) {
                    if (validatingResult.paths[0].length) {
                        validatingResult.paths.forEach(path => {
                            if (_testTypePath(type, path)) {
                                _setByPath(value, path, getTypeByPath(type, path).defaultValue);
                            } else {
                                _deleteByPath(value, path);
                            }
                        });
                    } else {
                        value = type.defaultValue;
                    }
                } else if (defaultValue) {
                    if (validatingResult.paths[0].length) {
                        validatingResult.paths.forEach(path => {
                            if (_testPath(defaultValue, path)) {
                                _setByPath(value, path, _getByPath(defaultValue, path));
                            } else {
                                _deleteByPath(value, path);
                            }
                        });
                    } else {
                        value = defaultValue;
                    }
                } else {
                    return false;
                }
            } else {
                return false;
            }
        }
        this._oldSource = source;
        this._value = value;
        if (source === null || validatingResult && !validatingResult.valid) {
            this._save();
        }
        return true;
    }

    checkConflict() {
        const newSource = this.storage.getItem(this.name);
        if (newSource !== this._oldSource) {
            this._conflict(newSource, this._oldSource);
            return true;
        } else {
            return false;
        }
    }

    get(): T;
    get<K extends Extract<keyof T, string>>(key: K): T[K];
    get(path: string | string[]): unknown;
    get(selector?: string | string[]) {
        return selector ? _getByPath(this._value, _parsePath(selector, this.pathSeparator)) : this._value;
    }

    set<K extends Extract<keyof T, string>>(key: K, patch: T[K] | StoreUpdateCallback<T[K]>): boolean;
    set(path: string | string[], patch: unknown | StoreUpdateCallback<unknown>): boolean;
    set(selector: string | string[], patch: unknown | StoreUpdateCallback<unknown>) {
        const targetPath = _parsePath(selector, this.pathSeparator),
            value = typeof patch === 'function' ?
                (patch as StoreUpdateCallback<T>).call(this, _getByPath(this._value, targetPath) as T) :
                patch;
        const { type } = this;
        if (type) {
            const validatingResult = _testTypePath(type, targetPath) &&
                getTypeByPath(type, targetPath).validate(value);
            if (!validatingResult || !validatingResult.valid) {
                this._invalid(
                    validatingResult ?
                        validatingResult.paths.map(path => targetPath.concat(path)) :
                        [targetPath]
                );
                return false;
            }
        }
        _setByPath(this._value, targetPath, value);
        this._save();
        return true;
    }

}
