# Setup

- `CLAUDE.md` is a symlink to this file. Edit `AGENTS.md`; tools that read `CLAUDE.md` (Claude Code) see the same content.

# Compatibility research

- https://docs.gradle.org/current/userguide/compatibility.html covers Embedded Kotlin only (the version bundled with Gradle for `.kts` build scripts). It does NOT document the Kotlin Gradle Plugin. For `gradle-plugin:org.jetbrains.kotlin` entries in `global-compatibilities.json`, use https://kotlinlang.org/docs/gradle-configure-project.html instead.
