---
$color: "#00BCD4"
$shape: curved
$pattern: solid
$width: 2
$arrow: true
$direction: bidirectional
$label: "相关"
$description: "表示A与B相关（使用曲线）"
---

# related_to（相关）

当节点A与节点B存在某种关联时使用此关系。使用曲线样式使其在图视图中更加优雅。

## 使用示例

```yaml
---
related_to:
  - "[[相关概念A]]"
  - "[[相关概念B]]"
---
```

## 语义说明

- **方向**: 双向关系（bidirectional）
- **反向关系**: 无（自身对称）
- **颜色**: 青色 (#00BCD4)
- **形状**: 曲线（curved）✨
- **图案**: 实线（solid）
- **箭头**: 有

## 曲线效果

曲线样式会让连接线呈现优雅的弧形，特别适合：
- 表示松散的关联关系
- 避免直线过于生硬
- 在复杂图谱中提高可读性
