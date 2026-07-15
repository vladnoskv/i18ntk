# Framework configuration templates

i18ntk can tune a project configuration for the framework it detects. The templates add source file types and ignore generated, dependency, cache, and build directories that commonly create false positives or slow scans.

Templates are available for Node.js and React, Next.js, Vue and Nuxt, Angular and Ionic, Svelte, Astro, Python and Django, Laravel and PHP, Ruby on Rails, Spring Boot, Go, Rust, and a generic fallback.

## How upgrades work

On normal CLI use, i18ntk detects the project framework and checks `.i18ntk-config` against the matching template. A setup version below 5.0.0, or missing template settings, triggers an update notice. In the interactive UI, i18ntk asks before making any saved change. When you approve it, i18ntk:

1. Appends missing source extensions and safe excluded directories.
2. Records the template name and version in `framework`.
3. Enables cached scanning, richer report summaries, usage and validation report details, and performance tracking.
4. Keeps your existing extensions, exclusions, report settings, and explicit framework preference.

For example, a Next.js project gains `.tsx` and `.mdx` source support while ignoring `node_modules`, `.next`, `.turbo`, generated output, and coverage folders. A Django project gains Python and template support while ignoring virtual environments, caches, migrations, and generated static files.

Non-interactive commands never overwrite an out-of-date configuration; they print the update notice instead. You can always edit `.i18ntk-config` afterwards. i18ntk only adds safe defaults; it does not delete or replace your configuration.
