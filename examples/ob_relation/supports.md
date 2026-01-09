---
color: "#4CAF50"
style: solid
width: 2
arrow: true
direction: outgoing
inverse: "supported_by"
label: "支持"
description: "表示A支持/证实B的观点"
---

# supports（支持）

当节点A的内容支持、证实或强化节点B时使用此关系。

## 使用示例

```yaml
---
supports: "[[热力学第二定律]]"
---
```

或者多个目标：

```yaml
---
supports:
  - "[[理论A]]"
  - "[[理论B]]"
---
```

## 语义说明

- **方向**: 从当前笔记指向目标笔记
- **反向关系**: supported_by（被支持）
- **颜色**: 绿色 (#4CAF50)
- **线型**: 实线
