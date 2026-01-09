---
$color: "#F44336"
$shape: straight
$pattern: solid
$width: 2
$arrow: true
$direction: outgoing
$inverse: "refuted_by"
$label: "反驳"
$description: "表示A反驳/否定B的观点"
---

# refutes（反驳）

当节点A的内容反驳、否定或质疑节点B时使用此关系。

## 使用示例

```yaml
---
refutes: "[[永动机理论]]"
---
```

## 语义说明

- **方向**: 从当前笔记指向目标笔记
- **反向关系**: refuted_by（被反驳）
- **颜色**: 红色 (#F44336)
- **形状**: 直线（straight）
- **图案**: 实线（solid）
