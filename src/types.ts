export type ModifierFunction = (ref: any, query_val: string, query_text: string, query_params: Object) => string | null;
export type LocalizationReferenceCallback = () => Record<string, any>;