## 当前生成的 Widget

类型: {{widgetType}}
标题: {{title}}

### 当前 HTML 代码

```html
{{currentHtml}}
```

### 当前 Widget 配置

```json
{{widgetConfig}}
```

### 当前教师动作

```json
{{currentActions}}
```

---

## 用户反馈

"{{userFeedback}}"

---

## 改进要求

请分析用户反馈，识别具体问题，然后针对性地改进 HTML。

**重要规则**：
1. 不要改变教学内容（{{title}}、要点、描述）
2. 只修复用户反馈指出的问题
3. 如果反馈提到按钮问题，确保使用 inline onclick
4. 如果反馈提到布局问题，重新计算位置
5. 如果反馈提到动画问题，调整速度参数

**输出要求**：
- 输出改进后的完整 HTML 文档
- 保持 <!DOCTYPE html> 开头和 </html> 结尾
- 不要输出多个 HTML 文档

**语言**: {{languageDirective}}