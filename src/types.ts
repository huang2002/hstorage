import {
    _validateDefaultValue, _createDefaultDictionary,
    _createValidatingResult, _Object, _Array, INVALID_PATH
} from "./utils";

export type ValidatingResult = {
    valid: true;
} | {
    valid: false;
    paths: string[][];
};

export interface Type<T> {
    defaultValue: T;
    validate(value: unknown): ValidatingResult;
}

export type Types<T extends {}> = {
    [K in Extract<keyof T, string>]: Type<T[K]>;
};

export class Any implements Type<any>{
    constructor(defaultValue?: any) {
        this.defaultValue = defaultValue;
    }
    defaultValue: any;
    validate() {
        return { valid: true } as ValidatingResult;
    }
}
export const any = (defaultValue?: any) => new Any(defaultValue);

export class Boolean implements Type<boolean> {
    constructor(public defaultValue = false) {
        _validateDefaultValue(this);
    }
    validate(value: unknown) {
        return _createValidatingResult(typeof value === 'boolean');
    }
}
export const boolean = (defaultValue?: boolean) => new Boolean(defaultValue);

export interface StringOptions {
    defaultValue?: string;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp | null;
}
export class String implements Type<string>, Required<StringOptions> {
    static defaults: StringOptions = {
        defaultValue: '',
        minLength: 0,
        maxLength: Infinity,
        pattern: null,
    };
    constructor(options?: StringOptions) {
        _Object.assign(this, String.defaults, options);
        _validateDefaultValue(this);
    }
    defaultValue!: string;
    minLength!: number;
    maxLength!: number;
    pattern!: RegExp | null;
    validate(value: unknown) {
        return _createValidatingResult(
            typeof value === 'string' &&
            value.length >= this.minLength &&
            value.length <= this.maxLength &&
            (!this.pattern || this.pattern.test(value))
        );
    }
}
export const string = (options?: StringOptions) => new String(options);

export interface NumberOptions {
    defaultValue?: number;
    min?: number;
    max?: number;
    integer?: boolean;
}
export class Number implements Type<number>, Required<NumberOptions> {
    static defaults: NumberOptions = {
        defaultValue: 0,
        min: -Infinity,
        max: Infinity,
        integer: false,
    };
    constructor(options?: NumberOptions) {
        _Object.assign(this, Number.defaults, options);
        _validateDefaultValue(this);
    }
    defaultValue!: number;
    min!: number;
    max!: number;
    integer!: boolean;
    validate(value: unknown) {
        return _createValidatingResult(
            typeof value === 'number' &&
            (value as number) >= this.min &&
            (value as number) <= this.max &&
            (!this.integer || (value as number) % 1 === 0)
        );
    }
}
export const number = (options?: NumberOptions) => new Number(options);

export interface NullableOptions<T extends null | undefined> {
    defaultValue?: T;
    null?: boolean;
    undefined?: boolean;
}
export class Nullable<T extends null | undefined = null | undefined>
    implements Type<T>, Required<NullableOptions<T>>{
    static defaults: NullableOptions<null | undefined> = {
        defaultValue: null,
        null: true,
        undefined: true,
    };
    constructor(options?: NullableOptions<T>) {
        _Object.assign(this, Nullable.defaults, options);
        if (!(this.null || this.undefined)) {
            throw 'Invalid options';
        }
        if (options && 'defaultValue' in options) {
            _validateDefaultValue(this);
        } else if (!this.null) {
            this.defaultValue = undefined as T;
        }
    }
    defaultValue!: T;
    null!: boolean;
    undefined!: boolean;
    validate(value: unknown) {
        return _createValidatingResult(
            value === null ? this.null : (value === this.undefined && this.undefined)
        );
    }
}
export const nullable = <T extends null | undefined = null | undefined>
    (options?: NullableOptions<T>) => new Nullable<T>(options);

export class Dictionary<T extends {} = any> implements Type<T> {
    constructor(public readonly types?: Types<T> | null) {
        this.defaultValue = types ? _createDefaultDictionary(types) : {} as T;
    }
    defaultValue: T;
    validate(value: unknown) {
        if (value && typeof value === 'object') {
            const { types } = this;
            if (types) {
                const paths = new _Array<string[]>();
                _Object.keys(value!).forEach(key => {
                    if (!(key in types)) {
                        paths.push([key]);
                    }
                });
                _Object.entries(types).forEach(([key, type]) => {
                    const result = (type as Type<T[keyof T]>).validate((value as T)[key as keyof T]);
                    if (result.valid) {
                        return true;
                    } else {
                        const keySegment = [key];
                        result.paths.forEach(path => {
                            paths.push(keySegment.concat(path));
                        });
                        return false;
                    }
                });
                return _createValidatingResult(!paths.length, paths);
            } else {
                return _createValidatingResult(true);
            }
        }
        return _createValidatingResult(false);
    }
}
export const dictionary = <T extends {} = any>(types?: Types<T> | null) => new Dictionary<T>(types);

export interface ListOptions<T> {
    defaultValue?: T[];
    type: Type<T>;
}
export class List<T = unknown> implements Type<T[]>, Required<ListOptions<T>>{
    static defaults: ListOptions<unknown> = {
        defaultValue: [],
        type: new Any(),
    };
    constructor(options?: ListOptions<T>) {
        _Object.assign(this, List.defaults, options);
        _validateDefaultValue(this);
    }
    defaultValue!: T[];
    type!: Type<T>;
    validate(value: unknown) {
        const { type } = this;
        return _createValidatingResult(
            _Array.isArray(value) &&
            value.every(element => type.validate(element))
        );
    }
}
export const list = <T = unknown>(options?: ListOptions<T>) => new List<T>(options);

export interface UnionOptions<T> {
    defaultValue?: T;
    types: Type<T>[];
}
export class Union<T = unknown> implements Type<T>, Required<UnionOptions<T>> {
    constructor(options?: UnionOptions<T>) {
        _Object.assign(this, options);
        if (!(options && 'defaultValue' in options)) {
            this.defaultValue = this.types[0].defaultValue;
        }
        _validateDefaultValue(this);
    }
    defaultValue!: T;
    types!: Type<T>[];
    validate(value: unknown) {
        return _createValidatingResult(this.types.some(option => option.validate(value).valid));
    }
}
export const union = <T = unknown>(options?: UnionOptions<T>) => new Union<T>(options);

export const getTypeByPath = (type: Type<unknown>, path: string[]) => {
    let result = type;
    path.forEach(key => {
        if (result instanceof Dictionary && result.types && key in result.types) {
            result = result.types[key];
        } else {
            throw INVALID_PATH;
        }
    });
    return result;
};
