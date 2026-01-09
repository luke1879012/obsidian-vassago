import { Text, Graphics } from 'pixi.js';

// Obsidian 图视图渲染器接口
export interface ObsidianRenderer {
    px: {
        stage: {
            sortableChildren: boolean;
            addChild: (child: any) => void;
            removeChild: (child: any) => void;
            children: any[];
        };
    };
    links: ObsidianLink[];
    nodeScale: number;
    panX: number;
    panY: number;
    scale: number;
}

// Obsidian 图视图链接接口
export interface ObsidianLink {
    source: {
        id: string;
        x: number;
        y: number;
        weight: number;
        text: {
            alpha: number;
        }
    };
    target: {
        id: string;
        x: number;
        y: number;
        weight: number;
        text: {
            alpha: number;
        }
    };
}

// 边的方向枚举
export enum Direction {
    Outgoing = 'outgoing',      // 当前文件 → 目标文件
    Incoming = 'incoming',      // 目标文件 → 当前文件
    Bidirectional = 'bidirectional'  // 双向关系
}

// 边的样式枚举
export enum LineStyle {
    Solid = 'solid',
    Dashed = 'dashed',
    Dotted = 'dotted'
}

// 关系样式配置接口
export interface RelationStyle {
    color: string;              // 边颜色 (hex)
    style: LineStyle;           // 线型
    width: number;              // 线宽
    arrow: boolean;             // 是否显示箭头
    direction: Direction;       // 边方向
    inverse?: string;           // 反向关系类型名
    label: string;              // 在图上显示的标签
    description?: string;       // 描述
}

// Dataview 链接类型枚举
export enum DataviewLinkType {
    WikiLink,
    MarkdownLink,
    String,
    Array,
    Other
}

// 链接对状态枚举（用于处理双向链接）
export enum LinkPair {
    None,
    First,
    Second,
}

// 增强的链接对象（包含 PixiJS 元素）
export interface GltLink {
    obsidianLink: ObsidianLink;
    pairStatus: LinkPair;
    pixiText: Text | null;
    pixiGraphics: Graphics | null;
    relationType?: string;      // 边类型
}

// 图例图形对象
export interface GltLegendGraphic {
    color: number;
    legendText: Text;
    legendGraphics: Graphics;
    nUsing: number;
}
