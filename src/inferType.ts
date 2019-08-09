import { Type, Boolean, String, Number, Nullable, Dictionary, List, Union, Any } from "./types";
import { _Object, _Array } from "./utils";

export const inferType = (value: unknown): Type<unknown> => {
    switch (typeof value) {
        case 'boolean':
            return new Boolean(value);
        case 'string':
            return new String({ defaultValue: value });
        case 'number':
            return new Number({ defaultValue: value });
        case 'object':
            if (value) {
                if (_Array.isArray(value)) {
                    return new List({
                        type: new Union({ types: value.map(inferType), defaultValue: value })
                    });
                } else {
                    const types = {};
                    _Object.entries(value).forEach(([k, v]) => {
                        (types as any)[k] = inferType(v);
                    });
                    return new Dictionary(types);
                }
            } else {
                return new Nullable({ undefined: false });
            }
        case 'undefined':
            return new Nullable({ null: false });
        default:
            return new Any(value);
    }
};
