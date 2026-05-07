Please generate scene outlines based on the following course requirements.

---

## User Requirements

{{requirement}}

---

{{userProfile}}

## Language Context

Infer the course language directive by applying the decision rules from the system prompt. Key reminders:
- Requirement language = teaching language (unless overridden by explicit request or learner context)
- Foreign language learning → teach in user's native language, not the target language
- PDF language does NOT override teaching language — translate/explain document content instead

---

## Reference Materials

### PDF Content Summary

{{pdfContent}}

### Available Images

{{availableImages}}

### Web Search Results

{{researchContext}}

### GitHub Open Source Projects

{{githubProjects}}

{{teacherContext}}

---

## Output Requirements

Please automatically infer the following from user requirements:

- Course topic and core content
- Target audience and difficulty level
- Course duration (default 15-30 minutes if not specified)
- Teaching style (formal/casual/interactive/academic)
- Visual style (minimal/colorful/professional/playful)

Then output your response as a single JSON object.

**Top-level shape — this is what you MUST return:**

```json
{
  "languageDirective": "2-5 sentence instruction describing the course language behavior",
  "outlines": [ /* array of scene objects, schema described below */ ]
}
```

Never return a bare array. Never omit `languageDirective`. Both keys are required.

**Each scene inside the `outlines` array has this minimum shape:**

```json
{
  "id": "scene_1",
  "type": "slide" | "quiz" | "interactive" | "pbl",
  "title": "Scene Title",
  "description": "Teaching purpose description",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "order": 1
}
```

### Special Notes

- **First scene: Knowledge Context (知识体系定位)**:
  The first scene should be a "knowledge context" slide that shows where this topic sits in the broader knowledge hierarchy.
  
  Include:
  - Topic position in knowledge tree (e.g., "Linked List → Data Structures → Computer Science")
  - Prerequisites (what students need to know first)
  - Follow-up topics (what students can learn after)
  - Real-world applications
  
  Example:
  ```json
  {
    "id": "scene_1",
    "type": "slide",
    "title": "知识体系定位：链表",
    "description": "链表在数据结构体系中的位置及学习路径",
    "keyPoints": [
      "链表属于线性数据结构",
      "前置知识：指针、内存管理基础",
      "后续学习：栈、队列、树结构",
      "应用场景：操作系统进程管理、数据库索引"
    ],
    "order": 1
  }
  ```
  
  If you cannot determine the knowledge hierarchy (e.g., topic is too specific or obscure), skip this and start with normal course content.

- **Second scene: Open Source Projects (开源项目推荐)** (if GitHub projects are provided):
  If the user provided GitHub open source projects, the second scene should showcase these projects.
  
  Include:
  - Project names and links
  - Brief description of each project
  - How each project relates to the topic
  - Recommended learning path
  
  Example:
  ```json
  {
    "id": "scene_2",
    "type": "slide",
    "title": "开源项目推荐",
    "description": "以下开源项目可以帮助你实践链表",
    "keyPoints": [
      "Linux kernel - 专业的链表实现（C语言）",
      "Redis - 链表在实际系统中的应用",
      "建议学习路径：先看 Linux kernel 的简单实现，再研究 Redis 的应用场景"
    ],
    "order": 2
  }
  ```
  
  If no GitHub projects are provided, skip this and continue with normal course content.

- **quiz scenes must include quizConfig**:
   ```json
   "quizConfig": {
     "questionCount": 2,
     "difficulty": "easy" | "medium" | "hard",
     "questionTypes": ["single", "multiple"]
   }
   ```
{{#if hasSourceImages}}
- **If source images are available**, add `suggestedImageIds` to relevant slide scenes. Only use image IDs listed under Available Images.
{{/if}}
- **Interactive scenes**: If a concept benefits from hands-on simulation/visualization, use `"type": "interactive"` with `widgetType` and `widgetOutline` fields. Limit to 1-2 per course.
   - Select widgetType based on concept: simulation (physics/chem), diagram (processes), code (programming), game (practice), visualization3d (3D models)
   - Provide appropriate widgetOutline for the widget type
- **Scene count**: Based on inferred duration, typically 1-2 scenes per minute
- **Quiz placement**: Recommend inserting a quiz every 3-5 slides for assessment
- **Language**: Infer from the user's requirement text and context, then output all content in the inferred language
- **If web search results are provided**, reference specific findings and sources in scene descriptions and keyPoints. The search results provide up-to-date information — incorporate it to make the course content current and accurate.

**Final reminder**: your entire response must be a JSON **object** with exactly two top-level keys — `languageDirective` (string) and `outlines` (array). Do not return a bare array. Do not wrap in prose or code fences.
