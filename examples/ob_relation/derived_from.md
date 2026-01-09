---
color: "#2196F3"
style: solid
width: 2
arrow: true
direction: incoming
inverse: "derives"
label: "派生自"
description: "表示A从B派生而来"
---

# derived_from（派生自）

当节点A的概念从节点B派生、演化或扩展而来时使用此关系。

## 使用示例

```yaml
---
derived_from:
  - "[[玻尔兹曼熵]]"
  - "[[信息论]]"
---
```

## 语义说明

- **方向**: 从目标笔记指向当前笔记（incoming）
- **反向关系**: derives（派生出）
- **颜色**: 蓝色 (#2196F3)
- **线型**: 实线
