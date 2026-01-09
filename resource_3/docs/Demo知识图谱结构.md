# Demo 知识图谱结构

本文档展示 demo 目录中所有笔记的关系结构。

## 节点列表（10个）

1. 热力学第二定律
2. 熵
3. 时间之箭
4. 信息论
5. 信息熵
6. 统计力学
7. 永动机
8. 概率论
9. 量子力学
10. 机器学习

---

## 关系图谱

```
                         ┌──────────────┐
                         │   概率论     │
                         └──┬────┬──┬───┘
                            │    │  │ depended_by
              depended_by   │    │  └────────┐
                ┌───────────┘    │           │
                │    ┌───────────┘           │
                │    │ depended_by           │
                ▼    ▼                       ▼
        ┌──────────┐  ┌──────────┐    ┌──────────┐
        │ 统计力学  │  │ 信息论    │    │ 量子力学  │
        └─────┬────┘  └─────┬────┘    └────┬─────┘
              │             │              │
   applies_to │  derived_  │              │ related_to
              │  from      │              │
              ▼             ▼              ▼
    ┌──────────────────────────────────────────┐
    │        热力学第二定律                      │
    └───┬────┬──────┬───────────────────┬──────┘
        │    │      │                   │
 causes │    │part  │ refutes           │ applied_by
        │    │_of   │                   │
        ▼    ▼      ▼                   │
    ┌───────┐ ┌────┐  ┌─────────┐      │
    │时间之 │ │ 熵  │  │ 永动机   │      │
    │  箭   │ └─┬──┘  └─────────┘      │
    └───────┘   │                      │
                │ equivalent_to        │
                ▼                      │
           ┌─────────┐                 │
           │ 信息熵   │◀────part_of─────┘
           └─────────┘

    ┌──────────────┐
    │  机器学习     │
    └──────────────┘
         │ depends_on
         └──────────▶ [概率论]
         │ related_to
         └──────────▶ [信息论]
```

---

## 边类型使用统计

| 边类型 | 使用次数 | 示例 |
|--------|---------|------|
| `depends_on` / `depended_by` | 8 | 信息论 depends_on 概率论 |
| `part_of` / `has_part` | 6 | 熵 part_of 热力学第二定律 |
| `instance_of` | 4 | 熵 instance_of 物理量 |
| `applies_to` / `applied_by` | 6 | 统计力学 applies_to 热力学第二定律 |
| `equivalent_to` | 2 | 熵 equivalent_to 信息熵 |
| `causes` / `caused_by` | 2 | 热力学第二定律 causes 时间之箭 |
| `refutes` / `refuted_by` | 1 | 热力学第二定律 refutes 永动机 |
| `contradicts` / `contradicted_by` | 2 | 量子力学 contradicts 经典力学 |
| `extends` / `extended_by` | 2 | 统计力学 extends 经典力学 |
| `derived_from` | 1 | 信息论 derived_from 熵 |
| `similar_to` | 1 | 信息熵 similar_to 热力学熵 |
| `related_to` | 5 | 量子力学 related_to 时间之箭 |

**总边数**：约 40 条

---

## 关键节点（按出度+入度）

1. **热力学第二定律**：中心节点，连接最多
2. **概率论**：基础节点，被多个领域依赖
3. **熵**：核心概念，连接热力学和信息论
4. **信息论**：应用节点，衍生多个应用

---

## 展示的边类型特性

### ✅ 方向性
- `causes` vs `caused_by`
- `depends_on` vs `depended_by`
- `applies_to` vs `applied_by`

### ✅ 双向关系
- `equivalent_to`：熵 ↔ 信息熵
- `similar_to`：信息熵 ↔ 热力学熵

### ✅ 对立关系
- `refutes`：热力学第二定律 refutes 永动机
- `contradicts`：量子力学 contradicts 经典力学

### ✅ 层次关系
- `part_of` / `has_part`：构成关系
- `instance_of`：分类关系
- `extends`：扩展关系

### ✅ 内联关系示例
在笔记正文中使用 Dataview 语法标注上下文关系
