$ node utils/security-check-improved.js
[2025-08-23T20:17:01.427Z] Starting i18ntk Security Check (IMPROVED VERSION)...
[2025-08-23T20:17:01.434Z] Checking package.json security...
[2025-08-23T20:17:01.437Z] Checking SecurityUtils implementation...
[2025-08-23T20:17:01.438Z] Checking source files for security issues...
[2025-08-23T20:17:01.487Z] Checking file permissions...
[2025-08-23T20:17:01.488Z] Checking for dependency vulnerabilities...

=== SECURITY CHECK REPORT (IMPROVED) ===

� CRITICAL ISSUES:
  • Missing security method: safeWriteFileSync
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\security.js
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-analyze.js:1000
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-backup.js:198
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-backup.js:303
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-doctor.js:78
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-doctor.js:104
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-doctor.js:108
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-doctor.js:121
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-doctor.js:122
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-doctor.js:123
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-fixer.js:201
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-fixer.js:279
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-fixer.js:407
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-fixer.js:446
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-fixer.js:449
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-fixer.js:451
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-fixer.js:459
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-fixer.js:469
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-fixer.js:473
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-fixer.js:475
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-fixer.js:619
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-fixer.js:644
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-go.js:47
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-go.js:48
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-go.js:73
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-go.js:109
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-go.js:118
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-go.js:164
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-init.js:92
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-init.js:98
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-init.js:224
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-init.js:232
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-init.js:327
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-init.js:335
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-init.js:390
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-init.js:393
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-init.js:448
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-init.js:474
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-init.js:478
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-init.js:489
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-init.js:500
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-init.js:503
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-init.js:512
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-init.js:589
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-init.js:607
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-init.js:614
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-init.js:1043
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-init.js:1114
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-java.js:55
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-java.js:63
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-java.js:64
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-java.js:70
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-java.js:71
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-java.js:100
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-java.js:134
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-java.js:154
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-java.js:184
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-java.js:198
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-java.js:205
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-java.js:220
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-java.js:257
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-manage.js:170
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-manage.js:173
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-manage.js:226
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-manage.js:229
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-manage.js:230
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-manage.js:239
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-manage.js:242
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-manage.js:245
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-manage.js:253
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-manage.js:256
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-manage.js:464
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-manage.js:490
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-manage.js:496
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-manage.js:1189
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-manage.js:1212
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-manage.js:1233
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-manage.js:1293
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-manage.js:1432
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-manage.js:1564
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup-fixed.js:71
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup-fixed.js:74
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup-fixed.js:77
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup-fixed.js:80
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup-fixed.js:83
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup-fixed.js:97
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup-fixed.js:115
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup-fixed.js:116
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup-fixed.js:131
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup-fixed.js:143
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup-fixed.js:219
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup-fixed.js:234
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup-fixed.js:235
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup-fixed.js:247
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup-fixed.js:248
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup-fixed.js:276
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup-fixed.js:340
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup-fixed.js:341
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup-fixed.js:411
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup.js:71
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup.js:74
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup.js:77
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup.js:80
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup.js:83
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup.js:97
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup.js:115
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup.js:116
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup.js:131
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup.js:143
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup.js:219
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup.js:234
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup.js:235
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup.js:247
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup.js:248
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup.js:276
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup.js:340
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup.js:341
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-setup.js:411
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-summary.js:902
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-summary.js:927
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-summary.js:947
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-ui.js:60
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-ui.js:96
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-ui.js:98
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-ui.js:116
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-ui.js:125
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-ui.js:386
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-ui.js:387
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-usage.js:225
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-usage.js:315
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-usage.js:485
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-usage.js:504
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-usage.js:685
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-usage.js:830
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-usage.js:915
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-usage.js:954
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-usage.js:1356
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-usage.js:1581
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-validate.js:115
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-validate.js:192
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-validate.js:214
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-validate.js:268
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-validate.js:484
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-validate.js:498
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-validate.js:507
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-validate.js:642
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\main\i18ntk-validate.js:675
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\admin-auth.js:42
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\admin-auth.js:85
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\admin-pin.js:218
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\admin-pin.js:222
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\admin-pin.js:257
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\admin-pin.js:376
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\admin-pin.js:408
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\admin-pin.js:422
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\admin-pin.js:426
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\admin-pin.js:495
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\admin-pin.js:513
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\cli-helper.js:149
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\cli-helper.js:150
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\cli-helper.js:174
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\cli-helper.js:175
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\cli-helper.js:187
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\cli-helper.js:188
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config-helper.js:52
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config-helper.js:52
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config-helper.js:111
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config-helper.js:400
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config-helper.js:428
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config-helper.js:430
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config-helper.js:444
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config-helper.js:451
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config-helper.js:470
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config-helper.js:490
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config-helper.js:535
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config-helper.js:542
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config-helper.js:549
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config-helper.js:555
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config-helper.js:573
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config-manager.js:326
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config-manager.js:330
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config-manager.js:343
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config-manager.js:358
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config-manager.js:418
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config-manager.js:438
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config-manager.js:446
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config-manager.js:447
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config-manager.js:453
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config-manager.js:455
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config.js:49
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config.js:54
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config.js:86
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\config.js:91
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\i18n-helper.js:24
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\i18n-helper.js:46
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\i18n-helper.js:92
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\i18n-helper.js:98
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\i18n-helper.js:312
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\i18n-helper.js:317
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\init-helper.js:31
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\init-helper.js:33
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\init-helper.js:57
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\init-helper.js:74
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\init-helper.js:111
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\missing-key-validator.js:780
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\missing-key-validator.js:785
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\missing-key-validator.js:810
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\missing-key-validator.js:840
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\secure-errors.js:79
  • Dangerous code execution pattern detected
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\secure-errors.js:129
  • Dangerous code execution pattern detected
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\security-check-fixed.js:188
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\security-config.js:127
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\security-config.js:141
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\security-config.js:153
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\security-config.js:158
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\security-config.js:181
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-enforcer.js:23
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-enforcer.js:29
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-enforcer.js:76
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-enforcer.js:135
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-enforcer.js:192
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-enforcer.js:236
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-enforcer.js:239
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-enforcer.js:248
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-enforcer.js:260
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-enforcer.js:276
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-validator.js:66
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-validator.js:68
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-validator.js:154
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-validator.js:196
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-validator.js:261
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-validator.js:263
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-validator.js:300
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-validator.js:301
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-validator.js:327
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-validator.js:328
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-validator.js:354
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-validator.js:355
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-validator.js:380
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-validator.js:382
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-validator.js:540
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-validator.js:555
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\setup-validator.js:655
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\watch-locales.js:5
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\build-lite.js:57
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\build-lite.js:109
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\build-lite.js:119
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\build-lite.js:153
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\build-lite.js:208
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\build-lite.js:228
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\export-translations.js:17
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\export-translations.js:34
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\export-translations.js:35
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\export-translations.js:37
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\fix-all-i18n.js:39
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\fix-all-i18n.js:40
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\fix-and-purify-i18n.js:48
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\fix-and-purify-i18n.js:52
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\locale-optimizer.js:142
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\locale-optimizer.js:154
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\locale-optimizer.js:176
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\locale-optimizer.js:192
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\locale-optimizer.js:351
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\locale-optimizer.js:360
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\locale-optimizer.js:383
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\prepublish.js:98
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\prepublish.js:141
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\prepublish.js:155
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\prepublish.js:168
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\prepublish.js:190
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\prepublish.js:196
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\prepublish.js:227
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\prepublish.js:258
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\prepublish.js:285
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\prepublish.js:306
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\prepublish.js:321
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\prepublish.js:333
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\sync-translations.js:39
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\sync-translations.js:53
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\sync-translations.js:77
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\sync-ui-locales.js:4
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\sync-ui-locales.js:11
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\sync-ui-locales.js:17
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\validate-all-translations.js:34
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\validate-all-translations.js:53
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\validate-all-translations.js:127
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\verify-deprecations.js:14
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\verify-deprecations.js:30
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\verify-deprecations.js:31
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\verify-translations.js:9
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\scripts\verify-translations.js:31
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\settings\settings-cli.js:1229
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\settings\settings-cli.js:1262
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\settings\settings-cli.js:1268
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\settings\settings-cli.js:1342
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\settings\settings-cli.js:1381
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\settings\settings-cli.js:1423
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\settings\settings-cli.js:1467
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\settings\settings-cli.js:2008
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\settings\settings-manager.js:320
  • Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\settings\settings-manager.js:321
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\settings\settings-manager.js:434
  • Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\settings\settings-manager.js:439
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\settings\settings-manager.js:459
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\settings\settings-manager.js:538
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\settings\settings-manager.js:545
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\settings\settings-manager.js:552
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\settings\settings-manager.js:559
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\settings\settings-manager.js:578
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\settings\settings-manager.js:591
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\settings\settings-manager.js:604
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\settings\settings-manager.js:627
  • Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\settings\settings-manager.js:644

� WARNINGS:
  • Potentially unsafe pattern found: /fs\.readFileSync\s*\(/g
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\security.js
  • Potentially unsafe pattern found: /fs\.existsSync\s*\(/g
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\security.js
  • File has overly permissive permissions: utils/security.js (666)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\utils\security.js
  • File has overly permissive permissions: tests/security.test.js (666)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\tests\security.test.js
  • File has overly permissive permissions: package.json (666)
    File: E:\i18n-management-toolkit-main\i18ntk-1.9.0\package.json

[2025-08-23T20:17:01.674Z] Security check FAILED: 313 critical issues, 5 warnings found
[2025-08-23T20:17:01.674Z] Total: 318 issues detected