## Introduction

This is a utility helper written in Typescript that helps developers with their i18n implementation.

It allows the developer to implement custom modifier for their rich localization without the use of custom code.

It also allows the user to reference a variable in their localized string. This utility helps the developer do their own implementation. It doesn't handle saving or loading the translations.

## Structure 

The utility uses `base` and `fallback` with custom properties which are `iso`, `title` and finally `translations`, which are in the form of `<key, value>`. 

You may use `setStoredConfigObject` to return the object that contains the defined structure.

- Localization
  - base
    - iso
    - title
    - translations: {key: value, key: value}
  - fallback
    - iso
    - title
    - translations: {key: value, key: value}


## Usage

### Define your object

````
setStoredConfigObject(() => {
  return {
    base: {
      iso: "en",
      title: "",
      translations: {my_first_key: "This is the first key"}
    },
    fallback: {
      iso: "de",
      title: "",
      translations: {}
    }
  };
});
````

### Define your string

Variable parameter must only contain `var` and follow the following pattern `var=your_var_name`. this `your_var_name` must be located in the provided `params` when calling `translate` or `get` or `has`.

Rich strings are defined in the following structure: 
- `@{ref=your_variable_name||modi=your_modi_name:val=value_ref:text=Your text here}`

You may define inline variables in your rich text in the following way `your text here has $your_parameter reports` The `your_parameter` must be provided in `params`

**Example:**
- `@{ref=count||modi=bigger:val=2:text=We got something with $count and $success; modi=smaller:val=1:text=smaller}`

**Do:** 
- `ref` is your reference variable that will be applied in each `modi` function and tested.
- Use `||` to separate the parameter sections (`ref` and `logic`)
- Use `;` when using more than a single `modi`
- Use ":" to structure the group parts `modi` and `val` and `text`
- `val` is your reference variable for the `modi`, which translates into: if `ref` is `bigger` than `val`, then return `text` 

**Don't:**
- Don't include whitespaces in the `modi` and the structure. The whitespaces are only in the text to be included.

### Fetch your translation

The following means that you don't want to force your iso
````
let my_value = translate({key: "test", alt: "my alt text", iso: null, params: {count: 4, success: 2}});
````

## Explanation

### ISO

Providing an ISO means that you want this ISO to be fetched. If the `force_iso` is set to true, then, the fallback will be ignored. If an `alternative` text is provided, then, this `alternative` text will be returned.

### JSON string

You may use `translate` and pass the JSON `object` directly. If your JSON `object` is not parsed, then you may pass it in the following two ways: `translate(my_str)` or `translate({text: my_str})`


### Modifier

Modifiers are used to translate the logic. Each modifier is provided with the following parameters `ref_value: any, query_val: string, query_text: string, query_params: Record<string, any>`. 

Instead of having functions that translate each sentence, the `modi` can be applied on the fly to validate your input against hard-coded values or referenced variables.

## Example 

Use the following text `@{ref=count||modi=bigger:val=2:text=We got something with $count and $success; modi=smaller:val=1:text=smaller}` and pass the following `params` => `{count: 4, success: 2}`

The output is going to be `We got something with 4 and 2`


## Functions

### get 

`get({key: "", alt: "", force_iso: false, iso: null})`

### has

`get({key: "", alt: "", force_iso: false, iso: null})`

### translate

Translating via object

- `translate({key: "", alt: "", force_iso: false, iso: null})`

Translating via JSON string 

- First option
`translate(your_json_string)`

- Second option
`translate({text: your_json_string)`

### setStoredConfigObject

The juicy-i18n needs a reference object to fetch the localizations and map them accordingly. Use the following method and return an object with the following structure. Please note that this library doesn't handle the saving of your config. I'll be creating a wrapper for Vue later on.

````
setStoredConfigObject(() => {
  return {
    base: {
      iso: "en",
      title: "",
      translations: {my_first_key: "This is the first key"}
    },
    fallback: {
      iso: "de",
      title: "",
      translations: {}
    }
  };
});
````

### getStoredConfigObject

Useful when validating the saved config object. This is a read-only method.

Usage: `const my_stored_config = getStoredConfigObject();`


### addModifier

Create your own custom modifier to validate your rich strings. You can reference the new modifier via `modi=your_modifier_name`

````
my_modifier_function =  (ref: any, query_val: string, query_text: string, query_params: Object) : string | null => {
  // return the query_text if your condition evulates to true
  if(true) {
    return query_text;
  }
  return null;
}

addModifier("my_modifier_name", my_modifier_function);
````

### getModifier

Return the modifier function

`getModifier("my_modifier_name")`

### applyModifier 

Validate the modifier logic and test if it works correctly.

````
const my_ref = 4;
const result = applyModifier("bigger", my_ref, 2, "Passed with ref $my_var", {my_var: 1});
````

### getModifiersNames

Return the registered modifiers names 

`getModifiersNames()`


### setCanLog

Log messages are displayed for debugging purposes. Toggle this via `setCanLog`
`setCanLog(true|false)`


