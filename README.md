# Kroky's No Pain, All Gain

Turn Agility penalties into equal-strength benefits.
Version: **1.0.0**.

- A **-20% XP** penalty becomes **+20% XP**.
- A **+20% resource cost** penalty becomes **-20% resource cost**.
- An existing **-20% action interval** bonus stays **-20%**.

The mod covers every registered Agility obstacle and pillar, including the normal and Abyssal courses and installed expansion content.
All expansions, including **Into the Abyss**, are optional; the mod works with base-game Agility alone.
It uses Melvor's harmful/beneficial modifier classification and also reverses enemy buffs while retaining enemy debuffs.
Modifier scopes, existing benefits, and XP and currency perks for originally negative obstacles are retained.
Converted bonuses use their full base magnitude; mastery and relic effects that only reduce penalties do not reduce these benefits.
Native descriptions, course summaries, and applied stats use the converted values.

Build costs, unlock requirements, action rewards, combat effect applicators, and modifiers from other skills or equipment are unchanged.
There are no settings, dependencies on other mods, or custom save data.
Disable the mod and reload to restore the native Agility modifiers.

Import **no-pain-all-gain-1.0.0.zip** into Melvor's Creator Toolkit to test it, or install it through mod.io.
The archive contains `manifest.json`, `setup.mjs`, and `assets/icon.png`.

Run the checks with `node --test`.
The artwork is generated with the built-in imagegen tool; its prompts are saved in `assets/icon-prompt.txt`, `assets/icon-edit-prompt.txt`, `assets/icon-cleanup-prompt.txt`, and `assets/cover-prompt.txt`.
The mod.io cover is `assets/cover.png` and follows the shared Kroky's mod cover style.
