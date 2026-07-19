# 双平台发布 Checklist

## CSDN 发布

- [ ] 文件开头添加 `[TOC]`（自动生成目录）
- [ ] 代码块使用 ` ```typescript ` 语法（带语言标签）
- [ ] 图片使用 GitHub raw 链接
- [ ] 添加技术标签：`#React Native` `#Expo` `#SQLite` `#AI编程`
- [ ] 文章分类选择：移动开发
- [ ] 勾选"原创"声明

## 掘金发布

- [ ] 代码块使用 ` ```typescript ` 语法
- [ ] 图片使用 GitHub raw 链接
- [ ] 添加话题标签：`前端` `React Native` `独立开发` `AI`
- [ ] 关联专栏（如有）
- [ ] 勾选"原创"声明
- [ ] 发布后手动添加链接卡片（关联系列其他文章）

## 通用

- [ ] 所有代码片段标注源文件路径
- [ ] 所有截图有描述性说明
- [ ] GitHub 链接可用
- [ ] 交叉链接指向已发布的文章

## 图片链接格式

```
https://raw.githubusercontent.com/callmebg/worthbase/main/docs/screenshots/<filename>
```

示例：
```
![总览页面](https://raw.githubusercontent.com/callmebg/worthbase/main/docs/screenshots/dashboard.jpg)
```

## 格式差异速查

| 功能 | CSDN | 掘金 |
|------|------|------|
| 目录 | `[TOC]` | 编辑器自带 |
| 代码高亮 | ``` + 语言标签 | ``` + 语言标签 |
| 图片 | Markdown `![]()` | Markdown `![]()` |
| 链接卡片 | 不支持 | 支持（手动添加） |
| 公式 | LaTeX `$...$` | 不推荐 |
| SEO 标签 | 手动添加 | 话题选择 |
