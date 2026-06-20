# Widget Teacher Actions Generator

Generate teacher action sequences for interactive widgets.

## Action Types

| Type | Description | Usage |
|------|-------------|-------|
| `speech` | Voice narration | Explain concepts, give hints |
| `highlight` | Spotlight element | Draw attention to UI elements |
| `annotation` | Floating label | Point to specific parts |
| `reveal` | Show hidden content | Progressive reveal |
| `setState` | Set widget state | Demonstrate scenarios |

## Output Schema

```json
{
  "actions": [
    {
      "id": "intro",
      "type": "speech",
      "content": "Let's explore how angle affects trajectory",
      "label": "Start"
    },
    {
      "id": "highlight_angle",
      "type": "highlight",
      "target": "#angle-slider",
      "content": "This slider controls the launch angle",
      "label": "Highlight angle"
    },
    {
      "id": "demo_angle60",
      "type": "setState",
      "state": { "angle": 60, "velocity": 25 },
      "content": "",
      "label": "Set angle to 60°"
    }
  ]
}
```

**ID Naming Convention**: Use descriptive, unique IDs like `intro`, `highlight_angle`, `demo_angle60` instead of sequential numbers.

## Target Element ID Conventions

For **simulation** widgets, use these selectors:
- Sliders: `#{variable_name}-slider` (e.g., `#angle-slider`, `#velocity-slider`, `#mass-slider`)
- Value displays: `#{variable_name}-display`
- Buttons: `#start-btn`, `#reset-btn`, `#pause-btn`

For **diagram** widgets, use only stable selectors guaranteed by the generated SVG DOM:
- Nodes: `#n1`, `#n2`, `#n3` (matching node IDs in config and real SVG elements)
- Edges: `#edge-n1-n2`, `#edge-n2-n3` (matching real SVG edge elements)
- Actions must only target selectors that are present in the widget config and querySelector-addressable in the content HTML
- If no stable selector exists, choose a visible existing node/edge target rather than inventing a selector

For **game** widgets, use:
- Game controls: `#game-container`, `#score-display`
- Answer buttons: `.answer-btn`

For **code** widgets, use:
- Editor: `#code-editor`
- Output: `#output-panel`
- Test results: `#test-results`

For **visualization3d** widgets, use:
- Camera controls: `#camera-controls`
- 3D objects: Use object ID directly (e.g., target: `"sun"`, `"earth"`, `"molecule_1"`)
- Sliders: `#{param}-slider` (e.g., `#speed-slider`, `#scale-slider`)
- Buttons: `#play-btn`, `#pause-btn`, `#reset-btn`
- Info panel: `#info`

For **procedural-skill** widgets, use these stable teacher-action targets:
- Task panel: `#task-panel`
- Tool/material list: `#tool-list`
- Ordered step list: `#step-list`
- Individual step row: `[data-step-id="step-1"]` (replace `step-1` with the step ID from widget config)
- Step control: `#step-1-control`
- Step feedback: `#step-1-feedback`
- Success criteria: `#success-criteria`
- Progress indicator: `#progress-display`
- General feedback/status area: `#feedback-panel`
- Reset button: `#reset-btn`

For `setState` actions in procedural-skill widgets, use the existing `completedSteps` state shape:

```json
{
  "id": "mark_first_step_complete",
  "type": "setState",
  "state": { "completedSteps": ["step-1"] },
  "content": "Notice how completing the inspection step updates progress.",
  "label": "Complete step"
}
```

Do not invent procedural-skill-specific action types or postMessage message types. Use only `speech`, `highlight`, `annotation`, `reveal`, and `setState`.

## 3D Visualization State Examples

For `setState` actions in 3D visualizations:

```json
{
  "id": "focus_earth",
  "type": "setState",
  "state": {
    "cameraTarget": "earth",
    "cameraPosition": { "x": 0, "y": 5, "z": 15 }
  },
  "content": "Let's take a closer look at Earth",
  "label": "Focus Earth"
}
```

```json
{
  "id": "show_orbits",
  "type": "setState",
  "state": {
    "speed": 2,
    "showOrbits": true
  },
  "content": "Now let's speed up the orbital animation",
  "label": "Speed up"
}
```

For `highlight` actions on 3D objects, use the object ID:
```json
{
  "id": "highlight_sun",
  "type": "highlight",
  "target": "sun",
  "content": "The Sun contains 99.86% of the solar system's mass",
  "label": "Highlight Sun"
}
```

## Rules

1. Create 3-7 actions per widget
2. Start with a speech action to introduce the widget
3. Use clear, short labels (2-4 words)
4. Target elements MUST use CSS selectors matching the widget's HTML
5. Include `content` for highlight/annotation actions to explain what's being shown
6. For `setState`, use variable names that match the widget's configuration
7. Language must match the course language
8. **IMPORTANT**: Variable names in `setState` should match the widget's variable definitions exactly

## TTS-Ready Spoken Content

The `content` field in `speech`, `highlight`, `annotation`, and `setState` actions is spoken aloud by text-to-speech. It must be natural teacher narration, not text copied from the widget UI or written for visual display.

- Use complete, conversational sentences that sound natural when heard.
- Avoid widget labels, CSS selectors, raw element IDs, code-like tokens, Markdown, HTML, URLs, file paths, table-style labels, captions, and punctuation-heavy strings unless they are truly meant to be spoken.
- Rewrite visual shorthand into spoken language. Say "this slider controls the launch angle" instead of "angle-slider"; say "the output node receives both inputs" instead of naming an edge selector.
- Keep speech concise and oral: explain what students should notice, what changed, and why it matters.
- For diagram nodes and edges, `content` may explain the structural relationship, but do not read CSS selectors or raw formulas. Say "this node feeds into the output" instead of "edge n one n two" or `#edge-n1-n2`.
- For `setState`, keep the `state` field machine-readable exactly as configured. Only make the `content` field TTS-friendly.
- Do not generate SSML.
- For math and technical notation, do NOT put anything that needs visual rendering in `content`: no raw LaTeX, Markdown math, `$...$`, `\(...\)`, `\[...\]`, code, CSS selectors, ASCII formulas, or math-symbol strings.
- Do NOT emit symbol-heavy text such as `<`, `>`, `≤`, `≥`, `∑`, `∫`, `√`, `→`, `∞`, `_`, `^`, or `|...|` in spoken content.
- Convert displayed formulas into concise spoken language according to the course language. The result should be immediately suitable for TTS, not a written formula transcript.
- Variables, subscripts, superscripts, Greek letters, inequalities, sums, integrals, and absolute values must be spoken in words.
- Prefer explaining what the formula or state means over mechanically reading every symbol.
- If a formula is already visible in the widget, do not repeat the raw formula in speech. Refer to it as "屏幕上的公式", "这个表达式", "the displayed equation", etc., then explain it orally.
- Never output LaTeX delimiter leftovers or broken command fragments such as `$$`, `$`, `lambda`, `eq`, `implies`, `frac`, `sqrt`, `sum`, or `int` as spoken text. Use the normal spoken words required by the course language.

Examples:

- Displayed formula `y_h=C e^{rx}` -> Chinese content: "齐次通解可以写成 C 乘以 e 的 r x 次方。"
- Displayed formula `|a_n-a_m|<\epsilon` -> Chinese content: "第 n 项和第 m 项之差的绝对值小于 epsilon。"
- Displayed formula `\alpha \pm \beta i` -> Chinese content: "一对共轭复根 alpha 加减 beta i。"
- Bad content: "$lambda = 3 eq r_{1,2}$，所以 $k=0$。" -> Good content: "这里 lambda 等于三，它不是两个特征根，所以修正指数取零。"
- Displayed formula `y_h=C e^{rx}` -> English content: "The homogeneous solution is C times e to the r x."
- Displayed formula `|a_n-a_m|<\epsilon` -> English content: "The absolute value of a sub n minus a sub m is less than epsilon."

## Output Format

Return ONLY valid JSON, no markdown fences.
