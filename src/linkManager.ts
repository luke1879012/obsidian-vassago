import { ObsidianRenderer, ObsidianLink, LinkPair, GltLink, DataviewLinkType, GltLegendGraphic, LineShape, LinePattern } from './types';
import { RelationStyleManager } from './relationStyleManager';
import { getAPI } from 'obsidian-dataview';
import { Text, TextStyle, Graphics } from 'pixi.js';
// @ts-ignore
import extractLinks from 'markdown-link-extractor';

/**
 * 链接管理器
 * 负责管理图视图中的链接渲染
 */
export class LinkManager {
    linksMap: Map<string, GltLink>;
    api = getAPI();
    currentTheme: string;
    textColor: string;
    tagColors: Map<string, GltLegendGraphic>;
    styleManager: RelationStyleManager;

    // 图例配置
    yOffset = 5;
    xOffset = 20;
    lineHeight = 17;
    lineLength = 40;
    spaceBetweenTextAndLine = 1;

    constructor(styleManager: RelationStyleManager) {
        this.linksMap = new Map<string, GltLink>();
        this.tagColors = new Map<string, GltLegendGraphic>();
        this.styleManager = styleManager;
        this.currentTheme = '';
        this.textColor = '#808080';

        // 检测主题变化
        this.detectThemeChange();
    }

    generateKey(sourceId: string, targetId: string): string {
        return `${sourceId}-${targetId}`;
    }

    /**
     * 检测主题变化
     */
    private detectThemeChange(): void {
        let lastTheme = '';
        let lastStyleSheetHref = '';
        let debounceTimer: number;

        const themeObserver = new MutationObserver(() => {
            clearTimeout(debounceTimer);
            debounceTimer = window.setTimeout(() => {
                this.currentTheme = document.body.classList.contains('theme-dark') ? 'theme-dark' : 'theme-light';
                const currentStyleSheetHref = document.querySelector('link[rel="stylesheet"][href*="theme"]')?.getAttribute('href');
                if ((this.currentTheme && this.currentTheme !== lastTheme) || (currentStyleSheetHref !== lastStyleSheetHref)) {
                    this.textColor = this.getComputedColorFromClass(this.currentTheme, '--text-normal');
                    lastTheme = this.currentTheme;
                    if (currentStyleSheetHref) {
                        lastStyleSheetHref = currentStyleSheetHref;
                    }
                }
            }, 100);
        });

        themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        themeObserver.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
    }

    /**
     * 获取计算后的颜色值
     */
    private getComputedColorFromClass(className: string, cssVariable: string): string {
        const tempElement = document.createElement('div');
        tempElement.classList.add(className);
        document.body.appendChild(tempElement);

        const style = getComputedStyle(tempElement);
        const colorValue = style.getPropertyValue(cssVariable).trim();

        document.body.removeChild(tempElement);

        if (colorValue.startsWith('hsl')) {
            return document.body.classList.contains('theme-dark') ? '#b3b3b3' : '#5c5c5c';
        } else {
            return colorValue;
        }
    }

    /**
     * 添加链接
     */
    addLink(renderer: ObsidianRenderer, obLink: ObsidianLink, tagColors: boolean, tagLegend: boolean): void {
        const key = this.generateKey(obLink.source.id, obLink.target.id);
        const reverseKey = this.generateKey(obLink.target.id, obLink.source.id);
        const pairStatus = (obLink.source.id !== obLink.target.id) && this.linksMap.has(reverseKey) ? LinkPair.Second : LinkPair.None;

        const relationType = this.getMetadataKeyForLink(obLink.source.id, obLink.target.id);

        const newLink: GltLink = {
            obsidianLink: obLink,
            pairStatus: pairStatus,
            pixiText: this.initializeLinkText(renderer, obLink, pairStatus, relationType),
            pixiGraphics: tagColors ? this.initializeLinkGraphics(renderer, obLink, tagLegend, relationType) : null,
            relationType: relationType || undefined
        };

        this.linksMap.set(key, newLink);

        if ((obLink.source.id !== obLink.target.id) && this.linksMap.has(reverseKey)) {
            const reverseLink = this.linksMap.get(reverseKey);
            if (reverseLink) {
                reverseLink.pairStatus = LinkPair.First;
            }
        }
    }

    /**
     * 移除链接
     */
    removeLink(renderer: ObsidianRenderer, link: ObsidianLink): void {
        const key = this.generateKey(link.source.id, link.target.id);
        const reverseKey = this.generateKey(link.target.id, link.source.id);

        const gltLink = this.linksMap.get(key);

        if (gltLink && gltLink.pixiText && renderer.px && renderer.px.stage && renderer.px.stage.children && renderer.px.stage.children.includes(gltLink.pixiText)) {
            renderer.px.stage.removeChild(gltLink.pixiText);
            gltLink.pixiText.destroy();
        }

        if (gltLink && gltLink.pixiGraphics && renderer.px && renderer.px.stage && renderer.px.stage.children && renderer.px.stage.children.includes(gltLink.pixiGraphics)) {
            renderer.px.stage.removeChild(gltLink.pixiGraphics);
            gltLink.pixiGraphics.destroy();
        }

        let colorKey = gltLink?.pixiText?.text?.replace(/\r?\n/g, "");
        if (colorKey) {
            if (this.tagColors.has(colorKey)) {
                const legendGraphic = this.tagColors.get(colorKey);
                if (legendGraphic) {
                    legendGraphic.nUsing -= 1;
                    if (legendGraphic.nUsing < 1) {
                        this.yOffset -= this.lineHeight;
                        if (legendGraphic.legendText && renderer.px && renderer.px.stage && renderer.px.stage.children && renderer.px.stage.children.includes(legendGraphic.legendText)) {
                            renderer.px.stage.removeChild(legendGraphic.legendText);
                            legendGraphic.legendText.destroy();
                        }
                        if (legendGraphic.legendGraphics && renderer.px && renderer.px.stage && renderer.px.stage.children && renderer.px.stage.children.includes(legendGraphic.legendGraphics)) {
                            renderer.px.stage.removeChild(legendGraphic.legendGraphics);
                            legendGraphic.legendGraphics.destroy();
                        }
                        this.tagColors.delete(colorKey);
                    }
                }
            }
        }

        this.linksMap.delete(key);

        const reverseLink = this.linksMap.get(reverseKey);
        if (reverseLink && reverseLink.pairStatus !== LinkPair.None) {
            reverseLink.pairStatus = LinkPair.None;
        }
    }

    /**
     * 移除不在当前链接列表中的链接
     */
    removeLinks(renderer: ObsidianRenderer, currentLinks: ObsidianLink[]): void {
        const currentKeys = new Set(currentLinks.map(link => this.generateKey(link.source.id, link.target.id)));
        this.linksMap.forEach((_, key) => {
            if (!currentKeys.has(key)) {
                const link = this.linksMap.get(key);
                if (link) {
                    this.removeLink(renderer, link.obsidianLink);
                }
            }
        });
    }

    /**
     * 更新链接文本位置
     */
    updateLinkText(renderer: ObsidianRenderer, link: ObsidianLink, tagNames: boolean): void {
        if (!renderer || !link || !link.source || !link.target) {
            return;
        }
        const linkKey = this.generateKey(link.source.id, link.target.id);
        const gltLink = this.linksMap.get(linkKey);
        let text;
        if (gltLink) {
            text = gltLink.pixiText;
        } else {
            return;
        }

        const midX: number = (link.source.x + link.target.x) / 2;
        const midY: number = (link.source.y + link.target.y) / 2;
        const { x, y } = this.getLinkToTextCoordinates(midX, midY, renderer.panX, renderer.panY, renderer.scale);
        if (text && renderer.px && renderer.px.stage && renderer.px.stage.children && renderer.px.stage.children.includes(text)) {
            text.x = x;
            text.y = y;
            text.scale.set(1 / (3 * renderer.nodeScale));
            text.style.fill = this.textColor;
            if (tagNames) {
                if (!link.source || !link.target || !link.source.text || !link.target.text || !link.target.text.alpha || !link.source.text.alpha) {
                    text.alpha = 0.9;
                } else {
                    text.alpha = Math.max(link.source.text.alpha, link.target.text.alpha);
                }
            } else {
                text.alpha = 0.0;
            }
        }
    }

    /**
     * 更新链接图形
     */
    updateLinkGraphics(renderer: ObsidianRenderer, link: ObsidianLink): void {
        if (!renderer || !link || !link.source || !link.target) {
            return;
        }
        const linkKey = this.generateKey(link.source.id, link.target.id);
        const gltLink = this.linksMap.get(linkKey);
        let graphics;
        if (gltLink) {
            graphics = gltLink.pixiGraphics;
        } else {
            return;
        }
        let { nx, ny } = this.calculateNormal(link.source.x, link.source.y, link.target.x, link.target.y);
        let { px, py } = this.calculateParallel(link.source.x, link.source.y, link.target.x, link.target.y);

        nx *= 1.5 * Math.sqrt(renderer.scale);
        ny *= 1.5 * Math.sqrt(renderer.scale);

        px *= 8 * Math.sqrt(renderer.scale);
        py *= 8 * Math.sqrt(renderer.scale);

        let { x: x1, y: y1 } = this.getLinkToTextCoordinates(link.source.x, link.source.y, renderer.panX, renderer.panY, renderer.scale);
        let { x: x2, y: y2 } = this.getLinkToTextCoordinates(link.target.x, link.target.y, renderer.panX, renderer.panY, renderer.scale);
        x1 += nx + (link.source.weight / 36 + 1) * px;
        x2 += nx - (link.target.weight / 36 + 1) * px;
        y1 += ny + (link.source.weight / 36 + 1) * py;
        y2 += ny - (link.target.weight / 36 + 1) * py;

        if (graphics && renderer.px && renderer.px.stage && renderer.px.stage.children && renderer.px.stage.children.includes(graphics)) {
            // @ts-ignore
            const color = graphics._lineStyle.color;
            // @ts-ignore - 存储 shape 和 pattern
            const shape = graphics._customShape || LineShape.Straight;
            // @ts-ignore
            const pattern = graphics._customPattern || LinePattern.Solid;

            graphics.clear();

            // 根据 shape 和 pattern 组合绘制
            if (shape === LineShape.Curved) {
                // 曲线
                if (pattern === LinePattern.Dashed) {
                    // 曲线 + 虚线（暂不支持，使用实线曲线）
                    this.drawCurvedLine(graphics, x1, y1, x2, y2, 3 / Math.sqrt(renderer.nodeScale), color);
                } else {
                    // 曲线 + 实线
                    this.drawCurvedLine(graphics, x1, y1, x2, y2, 3 / Math.sqrt(renderer.nodeScale), color);
                }
            } else {
                // 直线
                if (pattern === LinePattern.Dashed) {
                    // 直线 + 虚线
                    this.drawDashedLine(graphics, x1, y1, x2, y2, 3 / Math.sqrt(renderer.nodeScale), color);
                } else {
                    // 直线 + 实线
                    graphics.lineStyle(3 / Math.sqrt(renderer.nodeScale), color);
                    graphics.moveTo(x1, y1);
                    graphics.lineTo(x2, y2);
                }
            }

            graphics.alpha = 0.8;

            // 隐藏原始链接线（通过设置 alpha 为 0）
            // @ts-ignore - 访问 Obsidian 内部的链接对象
            if (link.line && link.line.alpha !== undefined) {
                // @ts-ignore
                link.line.alpha = 0;
            }
        }
    }

    /**
     * 绘制虚线
     */
    private drawDashedLine(graphics: Graphics, x1: number, y1: number, x2: number, y2: number, lineWidth: number, color: number): void {
        const dashLength = 8;  // 虚线段长度
        const gapLength = 8;   // 间隙长度（更稀疏）
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const dashCount = Math.floor(distance / (dashLength + gapLength));

        graphics.lineStyle(lineWidth, color);

        for (let i = 0; i < dashCount; i++) {
            const startRatio = (i * (dashLength + gapLength)) / distance;
            const endRatio = (i * (dashLength + gapLength) + dashLength) / distance;
            const startX = x1 + dx * startRatio;
            const startY = y1 + dy * startRatio;
            const endX = x1 + dx * endRatio;
            const endY = y1 + dy * endRatio;

            graphics.moveTo(startX, startY);
            graphics.lineTo(endX, endY);
        }
    }



    /**
     * 绘制曲线（二次贝塞尔曲线）
     */
    private drawCurvedLine(graphics: Graphics, x1: number, y1: number, x2: number, y2: number, lineWidth: number, color: number): void {
        graphics.lineStyle(lineWidth, color);

        // 计算控制点：在两点连线的垂直方向偏移
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        // 计算垂直向量
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 曲线弯曲程度（距离的 20%）
        const curvature = distance * 0.2;

        // 控制点在垂直方向偏移
        const controlX = midX - dy / distance * curvature;
        const controlY = midY + dx / distance * curvature;

        // 绘制二次贝塞尔曲线
        graphics.moveTo(x1, y1);
        graphics.quadraticCurveTo(controlX, controlY, x2, y2);
    }

    /**
     * 初始化链接文本
     */
    private initializeLinkText(renderer: ObsidianRenderer, link: ObsidianLink, pairStatus: LinkPair, relationType: string | null): Text | null {
        if (relationType === null) {
            return null;
        }

        let linkString: string = relationType;

        // 如果有样式配置，使用配置的标签
        if (this.styleManager.hasStyle(relationType)) {
            const style = this.styleManager.getStyle(relationType);
            linkString = style.label || relationType;
        }

        if (link.source.id === link.target.id) {
            linkString = "";
        }

        if (pairStatus === LinkPair.First) {
            linkString = linkString + "\n\n";
        } else if (pairStatus === LinkPair.Second) {
            linkString = "\n\n" + linkString;
        }

        const textStyle: TextStyle = new TextStyle({
            fontFamily: 'Arial',
            fontSize: 36,
            fill: this.textColor
        });

        const text: Text = new Text(linkString, textStyle);
        text.zIndex = 1;
        text.anchor.set(0.5, 0.5);

        this.updateLinkText(renderer, link, false);
        renderer.px.stage.addChild(text);

        return text;
    }

    /**
     * 初始化链接图形
     */
    private initializeLinkGraphics(renderer: ObsidianRenderer, link: ObsidianLink, tagLegend: boolean, relationType: string | null): Graphics | null {
        if (relationType === null) {
            return null;
        }

        let color: number;
        let shape: LineShape = LineShape.Straight;
        let pattern: LinePattern = LinePattern.Solid;
        let linkString = relationType;

        // 获取样式配置
        if (this.styleManager.hasStyle(relationType)) {
            const style = this.styleManager.getStyle(relationType);
            color = this.styleManager.hexToPixiColor(style.color);
            shape = style.shape;
            pattern = style.pattern;
            linkString = style.label || relationType;
        } else {
            // 使用默认颜色
            color = 0x808080;
        }

        if (link.source.id === link.target.id) {
            linkString = "";
        } else {
            if (!this.tagColors.has(linkString)) {
                // 创建图例
                const textL = new Text(linkString, { fontFamily: 'Arial', fontSize: 14, fill: this.textColor });
                textL.x = this.xOffset;
                textL.y = this.yOffset;
                renderer.px.stage.addChild(textL);

                const lineStartX = this.xOffset + textL.width + this.spaceBetweenTextAndLine;

                const graphicsL = new Graphics();
                graphicsL.lineStyle(2, color, 1);
                graphicsL.moveTo(lineStartX, this.yOffset + (this.lineHeight / 2));
                graphicsL.lineTo(lineStartX + this.lineLength, this.yOffset + (this.lineHeight / 2));
                renderer.px.stage.addChild(graphicsL);
                this.yOffset += this.lineHeight;

                if (!tagLegend) {
                    graphicsL.alpha = 0.0;
                    textL.alpha = 0.0;
                }
                const newLegendGraphic: GltLegendGraphic = {
                    color: color,
                    legendText: textL,
                    legendGraphics: graphicsL,
                    nUsing: 1,
                };

                this.tagColors.set(linkString, newLegendGraphic);
            } else {
                const legendGraphic = this.tagColors.get(linkString);
                if (legendGraphic) {
                    legendGraphic.nUsing += 1;
                }
            }
        }

        const graphics = new Graphics();
        graphics.lineStyle(3 / Math.sqrt(renderer.nodeScale), color);
        // @ts-ignore - 存储 shape 和 pattern 以便后续使用
        graphics._customShape = shape;
        // @ts-ignore
        graphics._customPattern = pattern;
        graphics.zIndex = 0;
        renderer.px.stage.addChild(graphics);

        this.updateLinkGraphics(renderer, link);

        return graphics;
    }

    /**
     * 从 Markdown 链接提取路径
     */
    private extractPathFromMarkdownLink(markdownLink: string | unknown): string {
        const links = extractLinks(markdownLink).links;
        return links.length > 0 ? links[0] : '';
    }

    /**
     * 确定 Dataview 链接类型
     */
    private determineDataviewLinkType(value: any): DataviewLinkType {
        if (typeof value === 'object' && value !== null && 'path' in value) {
            return DataviewLinkType.WikiLink;
        } else if (typeof value === 'string' && value.includes('](')) {
            return DataviewLinkType.MarkdownLink;
        } else if (typeof value === 'string') {
            return DataviewLinkType.String;
        } else if (Array.isArray(value)) {
            return DataviewLinkType.Array;
        } else {
            return DataviewLinkType.Other;
        }
    }

    /**
     * 销毁所有链接
     */
    destroyMap(renderer: ObsidianRenderer): void {
        if (this.linksMap.size > 0) {
            this.linksMap.forEach((gltLink, linkKey) => {
                this.removeLink(renderer, gltLink.obsidianLink);
            });
        }
    }

    /**
     * 获取链接的元数据键（边类型）
     */
    private getMetadataKeyForLink(sourceId: string, targetId: string): string | null {
        const sourcePage: any = this.api.page(sourceId);
        if (!sourcePage) return null;

        for (const [key, value] of Object.entries(sourcePage)) {
            if (value === null || value === undefined || value === '') {
                continue;
            }
            const valueType = this.determineDataviewLinkType(value);

            switch (valueType) {
                case DataviewLinkType.WikiLink:
                    // @ts-ignore
                    if (value.path === targetId) {
                        return key;
                    }
                    break;
                case DataviewLinkType.MarkdownLink:
                    if (this.extractPathFromMarkdownLink(value) === targetId) {
                        return key;
                    }
                    break;
                case DataviewLinkType.Array:
                    // @ts-ignore
                    for (const item of value) {
                        if (this.determineDataviewLinkType(item) === DataviewLinkType.WikiLink && item.path === targetId) {
                            return key;
                        }
                        if (this.determineDataviewLinkType(item) === DataviewLinkType.MarkdownLink && this.extractPathFromMarkdownLink(item) === targetId) {
                            return key;
                        }
                    }
                    break;
                default:
                    return null;
            }
        }
        return null;
    }

    /**
     * 计算链接文本坐标
     */
    private getLinkToTextCoordinates(linkX: number, linkY: number, panX: number, panY: number, scale: number): { x: number, y: number } {
        return { x: linkX * scale + panX, y: linkY * scale + panY };
    }

    /**
     * 计算法向量
     */
    private calculateNormal(sourceX: number, sourceY: number, targetX: number, targetY: number): { nx: number; ny: number; } {
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;

        let nx = -dy;
        let ny = dx;

        const length = Math.sqrt(nx * nx + ny * ny);
        nx /= length;
        ny /= length;

        return { nx, ny };
    }

    /**
     * 计算平行向量
     */
    private calculateParallel(sourceX: number, sourceY: number, targetX: number, targetY: number): { px: number; py: number; } {
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;

        const length = Math.sqrt(dx * dx + dy * dy);
        const px = dx / length;
        const py = dy / length;

        return { px, py };
    }
}
