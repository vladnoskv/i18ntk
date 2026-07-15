# Commercial licensing for i18ntk

i18ntk 5.0.0 and later is dual-licensed:

- qualifying personal and noncommercial use is available under the [PolyForm Noncommercial License 1.0.0](./LICENSE);
- commercial use requires a separate written commercial license from Vlad Noskov.

## When a commercial license is required

A commercial license is required when i18ntk is used by, for, or on behalf of a for-profit business or other commercial activity. This includes:

- internal development, localization, build, CI/CD, or quality-assurance workflows;
- use by employees, contractors, consultants, sole traders, or agencies for client or business work;
- use in developing, operating, supporting, or delivering a paid product or service;
- embedding, bundling, redistributing, hosting, or offering i18ntk as part of a commercial product or service;
- evaluation, proof-of-concept, or testing undertaken with an anticipated commercial application.

Commercial use is not authorized merely because the package can be downloaded from npm or its source is publicly visible.

## Personal and noncommercial use

Personal study, private experimentation, hobby projects, and the other noncommercial purposes expressly permitted by PolyForm Noncommercial 1.0.0 do not require payment. The license also permits the qualifying noncommercial organizations listed in its terms.

If there is doubt about whether a use is commercial, obtain written permission before using i18ntk.

## Requesting a commercial license

Contact the repository owner through the contact methods on the [Vlad Noskov GitHub profile](https://github.com/vladnoskv) with:

- organization and billing country;
- intended use and deployment model;
- number of developers or users;
- whether redistribution, embedding, or hosted access is required.

Commercial terms, price, support, duration, and permitted users are established only by a separate written agreement. This document is informational and is not itself a commercial license offer.

## Custom integration support

Commercial customers can request custom integration support for their environment. Depending on the agreed scope, this may include:

- framework, monorepo, CI/CD, and build-pipeline integration;
- migration from an existing i18n tool or locale-file structure;
- custom framework detection, scanning, validation, reporting, or translation-provider workflows;
- onboarding, configuration review, troubleshooting, and implementation guidance;
- private fixes or compatibility work required for the licensed deployment.

Integration support is optional and is provided only when included in a written commercial agreement or statement of work. Availability, deliverables, access requirements, fees, response targets, maintenance, and acceptance criteria are agreed separately. A commercial license does not include unlimited custom development or support unless the signed agreement expressly says so.

## Public deployment verification

Commercial licenses may assign a public license identifier and approved domains. Unless the signed commercial agreement provides an exemption, a public web deployment must publish both:

- `/i18ntk-license.json`, containing the assigned identifier and covered domains; and
- an `i18ntk-site-verification` meta tag in the deployed site's HTML.

Generate both values with:

```bash
npx i18ntk-license generate --license-id LIC-CUSTOMER-ID --domains example.com,www.example.com
```

The marker is deliberately public so the licensor, customer, search engines, and third parties can verify the claimed license identity. It must not contain a license key, personal data, billing data, or other secret. Publishing a marker does not prove that a license is valid unless the identifier and domains match the licensor's records.

i18ntk contains no hidden telemetry, tracking pixel, runtime beacon, visitor tracking, or automatic domain reporting. Verification is based only on the marker a deployer intentionally publishes and the licensor's commercial licensing records.

## Earlier releases

Versions distributed under the MIT License remain licensed under those existing terms. The licensing change applies to i18ntk 5.0.0 and later and does not revoke rights already granted for earlier MIT-licensed versions.
