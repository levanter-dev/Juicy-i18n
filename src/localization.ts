/*
* Structure:
* Vuex
*   - Language
*       - Localization
*           - base
*               - iso
*               - title
*               - translations: {key: value, key: value}
*           - fallback
*               - iso
*               - title
*               - translations: {key: value, key: value}
*
* */

import { ModifierFunction, LocalizationReferenceCallback } from "./types"

const PATTERN_LOCALIZATION = /(?<=@{)(.*?)(?=})/g;
const PATTERN_PARAMETER_SEPARATOR = ";";
const PATTERN_PARAMETER_SECTION_SEPARATOR = "||";
const PATTERN_PARAMETER_SINGLE_ITEM_DEFINITION_SEPARATOR = ":";
const PATTERN_PARAMETER_SINGLE_ITEM_VALUE_SEPARATOR = "=";
const PATTERN_PARAMETER_REFERENCED_VARIABLE = /(?<=\$)(\w+)/g;

const MODI_DEFAULT = "default";

const KEY_BASE = "base";
const KEY_FALLBACK = "fallback";

const KEY_ITEM_ISO = "iso";
const KEY_ITEM_TITLE = "title";
const KEY_ITEM_TRANSLATIONS = "translations";

let localization_reference : LocalizationReferenceCallback;

let modifiers: Record<string, ModifierFunction> = {
    bigger: (ref_value: any, query_val: string, query_text: string, query_params: Record<string, any>) : any => {
        if(ref_value > query_val) {
            return query_text;
        }

        return null;
    },
    bigger_equal: (ref_value: any, query_val: string, query_text: string, query_params: Record<string, any>) : any => {
        if(ref_value >= query_val) {
            return query_text;
        }
        return null;
    },
    smaller: (ref_value: any, query_val: string, query_text: string, query_params: Record<string, any>) : any => {
        if(ref_value < query_val) {
            return query_text;
        }
        return null;
    },
    smaller_equal: (ref_value: any, query_val: string, query_text: string, query_params: Record<string, any>) : any => {
        if(ref_value <= query_val) {
            return query_text;
        }
        return null;
    },
    equal: (ref_value: any, query_val: string, query_text: string, query_params: Record<string, any>) : any => {
        if(ref_value == query_val) {
            return query_text;
        }
        return null;
    },


    // used for default behavior
    default: (ref: any, query_val: string, query_text: string, query_params: Record<string, any>) : any => {
        return "-";
    },
};


function addModifier(modifier_key: string, new_modifier: ModifierFunction) : void {
    modifiers[modifier_key] = new_modifier;
}

function getModifiersNames() : string[] {
    return Object.keys(modifiers);
}

function getModifier(modifier_key : string) : ModifierFunction  | null {
    return modifiers[modifier_key];
}

// apply the required modifier
function applyModifier(modifier_key: string, ref: any, query_val: string, query_text: string, query_params: Record<string, any>) : any {
    // get the callback
    const callback = getModifier(modifier_key);
    if(callback == null) {
        return null;
    }
    // return the value of the callback
    return callback(ref, query_val, query_text, query_params);
}

function extractParameterSections(object_string : string | null) : Record<string, any> {
    if(!object_string) {
        return {};
    }

    const sections : string[] = object_string.split(PATTERN_PARAMETER_SECTION_SEPARATOR);
    let result : Record<string, any> = {};

    for (const section of sections) {
        if (!section.includes("var=")) {
            if (section.includes("ref=")) {
                // it's a ref section
                const ref_array = section.split(PATTERN_PARAMETER_SINGLE_ITEM_VALUE_SEPARATOR);
                if (ref_array.length === 2) {
                    result.ref = section.split(PATTERN_PARAMETER_SINGLE_ITEM_VALUE_SEPARATOR)[1];
                }
            } else if (section.includes("modi=")) {
                // it's a modi section
                result.logic = section;
            }
        } else {
            // it's a var parameter
            const var_array = section.split(PATTERN_PARAMETER_SINGLE_ITEM_VALUE_SEPARATOR);
            if (var_array.length === 2) {
                result.var = section.split(PATTERN_PARAMETER_SINGLE_ITEM_VALUE_SEPARATOR)[1];
            }
        }
    }

    return result;
}

// convert a split array into object
function extractGroupParts(object_string : string | null, main_separator: string, sub_separator: string, query_params: Record<string, any>) : Record<string, any> {
    if(!object_string) {
        return {};
    }

    const parts : string[] = object_string.split(main_separator);
    let result : Record<string, string> = {};

    for (const part of parts) {

        const [key, value] = part.split(sub_separator);
        result[key.replace(" ", "")] = value;
    }

    // if the val has a referenced variable instead of a fixed value
    const referenced_val_matches = result?.val.match(PATTERN_PARAMETER_REFERENCED_VARIABLE);
    if(referenced_val_matches && Array.isArray(referenced_val_matches) && referenced_val_matches.length === 1) {
        result.val = query_params[referenced_val_matches[0]];
    }

    return result;
}

// replace the original string with a new string
function applyReplacement(text: string, original_parameter: string, new_value: string) : string {
    return text.replace(`@{${original_parameter}}`, new_value);
}

function replaceVariables(text: string, query_params: Record<string, any>) : string | null {
    const text_variables = text.match(PATTERN_PARAMETER_REFERENCED_VARIABLE);
    if(!text_variables) {
        return text;
    }

    text_variables.forEach((e : string) => {
        const fetch_var : string = query_params[e] ?? "-";
        text = text.replace(`$${e}`, fetch_var);
    });


    return text;
}


function setStoredConfigObject(callback : LocalizationReferenceCallback) : void {
    localization_reference = callback;
}

// return the currently saved localization object (structured at the top of the script)
function getStoredConfig() : Record<string, any> {
    return localization_reference();
}



function getTranslationByKey(search_iso : string | null, search_key : string | null, get_fallback : boolean = true) : string | null {
    if(!search_key) {
        log("getTranslationByKey", "search_iso || search_key are provided null.");
        return null;
    }

    const stored_config = getStoredConfig();

    // we get the base
    const base = stored_config[KEY_BASE] ?? {};
    const base_translations = base[KEY_ITEM_TRANSLATIONS];

    // we get the fallback
    const fallback = stored_config[KEY_FALLBACK] ?? {};
    const fallback_translations = fallback[KEY_ITEM_TRANSLATIONS];

    let translation = null;

    if(search_iso) {
        // we have selected an iso

        if(search_iso === base[KEY_ITEM_ISO] && base_translations) {
            log("getTranslationByKey", "search_iso == base.");
            translation = base_translations[search_key];
        }

        if(!translation && get_fallback && search_iso === fallback[KEY_ITEM_ISO] && fallback_translations) {
            log("getTranslationByKey", "search_iso == fallback.");
            translation = fallback_translations[search_key];
        }

        if(!translation) {
            // nothing was found
            log("getTranslationByKey", "translations are not set within search_iso.");
        }
    } else {
        // we just want what's available
        if(base_translations) {
            log("getTranslationByKey", "default is base.");
            translation = base_translations[search_key];
        }

        if(!translation && get_fallback && fallback_translations) {
            log("getTranslationByKey", "default is fallback.");
            translation = fallback_translations[search_key];
        }

        if(!translation) {
            log("getTranslationByKey", "translations are not set within default behavior.");
        }
    }

    return translation;
}

function getProcessedTranslation(payload: Record<string, any> | null) : string | null {
    if(!payload) {
        log("getProcessedTranslation", "payload is provided null.");
    }

    let text = payload?.text;
    const alt = payload?.alt;
    const params = payload?.params;

    if(!text) {
        log("getProcessedTranslation", "text is provided null.");
        return alt;
    }

    if(!params) {
        log("getProcessedTranslation", "params are provided null ==> it could be a normal text.");
        return text;
    }

    // match the string against a regex to get the provided params
    // structure is @{}, where each param is split by ";"
    // each group of param has three definitions => modifier:value:output
    // the output could contain referenced variables
    // these referenced variables are then taken from the provided "params" object above
    // referenced variables are constructed in the following way: $variable_name
    /*
    * var0 = 0, output: no prints were found
    * var0 = 1, output: 1 print
    * var0 = 2, output: 2 prints
    * translation string: @{mod=equal:val=0:text=no prints were found; mod=equal:val=1:text=1 print; mod=bigger:val=1:text=$count prints;}
    * */

    // let's get the parameters
    let processed_parameters = text.match(PATTERN_LOCALIZATION);

    if(!processed_parameters) {
        if(params) {
            log("getProcessedTranslation", "processed params are provided null ==> it's included with parameters.");
            return alt;
        } else {
            log("getProcessedTranslation", "params are provided null ==> it's a normal text.");
            return text;
        }
    }

    if(processed_parameters && Array.isArray(processed_parameters)) {

        processed_parameters.forEach((processed_parameter : string) => {
            // this processed parameter must be split into two sections, ref=named_parameter||rest of modis
            // or in case it's a variable parameter, we need to ignore it

            // we are expecting: ref || var || logic
            const parameter_sections = extractParameterSections(processed_parameter);

            const section_var = parameter_sections?.var;
            const section_ref = parameter_sections?.ref;
            const section_logic = parameter_sections?.logic;

            if(!section_ref && !section_logic && !section_var) {
                // nothing is provided
                log("getProcessedTranslation", "sections are not provided.");
                return alt;
            }

            // ref is requested and var is not provided
            if((!section_ref || !section_logic) && !section_var) {
                // var
                log("getProcessedTranslation", "section ref is not provided.");
                return alt;
            }

            // if it's a variable, then we just replace it directly
            if(section_var) {
                log("getProcessedTranslation", "it's section var.");
                // get the variable
                const var_value = params[section_var] ?? "-";
                // apply the replacement
                text = applyReplacement(text, processed_parameter, var_value);
                return true;
            }

            const ref_value : any = params[section_ref];

            // boolean state
            let parameter_processed : boolean = false;


            // split into groups
            const parameter_groups = section_logic.split(PATTERN_PARAMETER_SEPARATOR);

            parameter_groups.forEach((group: string) => {
                // continue
                if(parameter_processed) {
                    return true;
                }

                // now each group, must have three elements {mod, val, text}, split by "="
                const group_parts = extractGroupParts(group, PATTERN_PARAMETER_SINGLE_ITEM_DEFINITION_SEPARATOR, PATTERN_PARAMETER_SINGLE_ITEM_VALUE_SEPARATOR, params);
                const group_modi = group_parts?.modi;
                let group_val = group_parts?.val;
                const group_text = group_parts?.text;

                // validate the required fields
                if(!group_modi || !group_val || !group_text) {
                    // apply the default behavior
                    log("getProcessedTranslation", "default behavior.");
                    const default_new_value = applyModifier(MODI_DEFAULT, null, "", "", {});
                    text = applyReplacement(text, processed_parameter, default_new_value);
                    parameter_processed = true;
                    return true;
                }

                // we have defined properties
                const modifier_value = applyModifier(group_modi, ref_value, group_val, group_text, params);
                // if we get a valid response, then the modifier is valid and it passes the condition
                if(modifier_value) {
                    // replace the text
                    text = applyReplacement(text, processed_parameter, modifier_value);
                    // replace any variables tha exist
                    text = replaceVariables(text, params);
                    parameter_processed = true;
                    return true;
                }

                return false;
            });


            // nothing was set for this parameter
            if(!parameter_processed) {
                log("getProcessedTranslation", "parameter was not set.");
                const default_new_value = applyModifier(MODI_DEFAULT, null, "", "", {});
                text = applyReplacement(text, processed_parameter, default_new_value);
                parameter_processed = true;
                return true;
            }

            return true;
        })
    }

    return text;
}


function get(payload : Record<string, any> | null) : string | null {
    if(!payload) {
        log("get", "payload is provided null.");
        return "";
    }

    const iso = payload?.iso;
    const key = payload?.key;
    const alt = payload?.alt;
    const params = payload?.params;
    const force_iso = payload?.force_iso;

    if(!key) {
        log("get", "key is provided null.");
        return "";
    }

    // key the translation by key
    const translation_by_key = getTranslationByKey(iso, key, !force_iso);

    if(!translation_by_key) {
        // key was not found, we return the alt, even if it wasn't set
        log("get", "translation ist not set.");
        return alt;
    }

    return getProcessedTranslation({text: translation_by_key, alt: alt, params: params});
}

function has(payload : object | null) : boolean {
    return !!get(payload);
}


function translate(query_input : any) : string | object | null {
    if(!query_input) {
        log("translate", "query_input is provided null.");
        return null;
    }

    // it's not an object, we try to parse it
    if(typeof query_input != "object") {
        try {
            query_input = JSON.parse(query_input);
        } catch {
            log("translate", "query_input parsing error.");
            return query_input;
        }
    }

    // if this object has a text, then this text would be something that we could parse too
    if(typeof query_input == "object" && query_input?.hasOwnProperty("text")) {
        if (typeof query_input?.text == "object") {
            // it's object, no need to parse
            query_input = query_input?.text;
        } else {
            // it's not, we parse it
            try {
                query_input = JSON.parse(query_input?.text);
            } catch {
                if (query_input?.text == null) {
                    log("translate", "query_input.text is not defined.");
                    return null;
                }

                log("translate", "query_input.text parsing error.");
                return query_input?.text;
            }
        }
    }

    if(!query_input) {
        log("translate", "query_input is not defined.");
        return query_input;
    }

    return get({
        iso: query_input?.iso,
        key: query_input?.key,
        alt: query_input?.alt,
        params: query_input?.params,
        force_iso: query_input?.force_iso ?? false,
    });
}

function log(id : string, message : string) : void {
    console.log(`LangUtil: ${id}: ${message}`);
}

export default {
    setStoredConfigObject,
    translate,
    addModifier,
    getModifiersNames
}