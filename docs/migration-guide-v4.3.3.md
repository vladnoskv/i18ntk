# Migration Guide v4.3.3

## Usage Scanner Precision

Version 4.3.3 fixes usage extraction false positives where ordinary application calls such as `get("next")`, `headers.get("etag")`, `set(...)`, or `setItem(...)` were treated as translation calls.

The scanner now also recognizes `tx(...)` local wrapper calls and bounded dynamic `tx` template keys when the dynamic segment can be resolved from local literal values.

Unused-key reports should be treated as advisory. Some keys may be genuinely dead, but do not bulk-delete keys from an unused report without manually verifying usages or rerunning with a scanner that can resolve the project’s wrapper and runtime-helper patterns.

## Hybrid Key Style

Hybrid dot-path plus snake_case segment keys are valid. The validator accepts keys shaped as path segments separated by `.`, where each segment may contain lowercase words separated by `_`.

Accepted shape:

```text
^[a-z0-9]+(?:_[a-z0-9]+)*(?:\.[a-z0-9]+(?:_[a-z0-9]+)*)*$
```

This allows namespaced keys such as `namespace.section.snake_case_leaf` without forcing a pure dot-only or pure snake-only convention.

Malformed separators and uppercase segments are still invalid, including keys that start or end with `.`, contain `..`, or contain uppercase path segments.
