// Create or reuse reports directory

    // Ensure and return the reports directory. Uses config.reportsDir when provided.
    ensureReportsDir() {
        // Prefer configured directory if present; else default to <cwd>/i18ntk-reports
        const preferred = this.config?.reportsDir
            ? path.resolve(this.config.reportsDir)
            : path.resolve(process.cwd(), 'i18ntk-reports');
        // Validate and best-effort create
        const validated = SecurityUtils.validatePath(preferred) || preferred;
        if (!SecurityUtils.safeExistsSync(validated)) {
                // If your safeMkdirSync API does not accept a baseDir, drop the second argument.
                SecurityUtils.safeMkdirSync(validated, process.cwd());
            } catch (e) {
                // Fallback to cwd if creation fails
                const fallback = path.resolve(process.cwd(), 'i18ntk-reports');
                if (!SecurityUtils.safeExistsSync(fallback)) {
                    SecurityUtils.safeMkdirSync(fallback, process.cwd());
                }
                return fallback;
            }
        }
        return validated;
    }