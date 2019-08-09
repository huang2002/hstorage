import { Type, ValidatingResult, Types, Dictionary } from "./types";

export const _Object = Object,
    _Array = Array;

export const _validateDefaultValue = (type: Type<unknown>) => {
    if (!type.validate(type.defaultValue).valid) {
        throw 'Invalid default value';
    }
};

export const _createValidatingResult = (valid: boolean, paths?: string[][]): ValidatingResult =>
    valid ? { valid: true } : { valid: false, paths: paths || [[]] };

export const _clone = <T extends {}>(source: T, refs?: Set<object>): T => {
    if (_Array.isArray(source)) {
        return source.slice() as unknown as T;
    }
    if (!refs) {
        refs = new Set<object>();
    }
    const result = {} as T;
    _Object.entries(source).forEach(([key, value]) => {
        const type = typeof value;
        if (type === 'object') {
            if (value !== null && refs!.has(value as object)) {
                throw 'Circular reference';
            } else {
                refs!.add(value as object);
                result[key as keyof T] = _clone(source[key as keyof T], refs);
            }
        } else if (type !== 'function') {
            result[key as keyof T] = source[key as keyof T];
        }
    });
    return result;
};

export const _createDefaultDictionary = <T extends {}>(types: Types<T>) => {
    const result = {} as T;
    _Object.entries(types).forEach(([key, type]) => {
        result[key as keyof T] = (type as Type<T[keyof T]>).defaultValue;
    });
    return result;
};

export const _parsePath = (selector: string | string[], pathSeparator: string) =>
    _Array.isArray(selector) ? selector : selector.split(pathSeparator);

export const INVALID_PATH = 'Invalid path';

export const _getByPath = (object: unknown, path: string[]) => {
    let result = object;
    path.forEach(key => {
        if (result && typeof result === 'object') {
            result = (result as any)[key];
        } else {
            throw INVALID_PATH;
        }
    });
    return result;
};

export const _setByPath = (object: unknown, path: string[], value: unknown) => {
    const lastIndex = path.length - 1;
    let result = object;
    path.forEach((key, i) => {
        if (result && typeof result === 'object') {
            if (i < lastIndex) {
                result = (result as any)[key];
            } else {
                (result as any)[key] = value;
            }
        } else {
            throw INVALID_PATH;
        }
    });
};

export const _deleteByPath = (object: unknown, path: string[]) => {
    const lastIndex = path.length - 1;
    let result = object;
    path.forEach((key, i) => {
        if (!result || typeof result !== 'object') {
            throw INVALID_PATH;
        }
        if (i < lastIndex) {
            result = (result as any)[key];
        } else {
            delete (result as any)[key];
        }
    });
};

export const _testPath = (object: unknown, path: string[]) => {
    let result = object;
    return !path.some(key => {
        if (result && typeof result === 'object') {
            result = (result as any)[key];
        } else {
            return true;
        }
    });
};

export const _testTypePath = (type: Type<unknown>, path: string[]) => {
    let result = type;
    return !path.some(key => {
        if (result instanceof Dictionary && result.types && key in result.types) {
            result = result.types[key];
        } else {
            return true;
        }
    });
};
