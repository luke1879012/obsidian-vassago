import { App, TFile, TFolder, parseYaml } from 'obsidian';
import { RelationStyle, Direction, LineShape, LinePattern } from './types';

/**
 * 关系样式管理器
 * 负责从 ob_relation/ 目录加载和管理边类型的样式配置
 */
export class RelationStyleManager {
    private app: App;
    private stylesCache: Map<string, RelationStyle>;
    private relationDir: string;
    private defaultStyle: RelationStyle;

    constructor(app: App, relationDir: string = 'ob_relation') {
        this.app = app;
        this.relationDir = relationDir;
        this.stylesCache = new Map();

        // 默认样式
        this.defaultStyle = {
            color: '#808080',
            shape: LineShape.Straight,
            pattern: LinePattern.Solid,
            width: 2,
            arrow: true,
            direction: Direction.Outgoing,
            label: 'related'
        };
    }

    /**
     * 加载所有边类型配置
     */
    async loadStyles(): Promise<void> {
        this.stylesCache.clear();

        const folder = this.app.vault.getAbstractFileByPath(this.relationDir);

        if (!folder || !(folder instanceof TFolder)) {
            console.log(`Vassago: ${this.relationDir} directory not found, using default styles`);
            return;
        }

        // 遍历目录中的所有 .md 文件
        for (const file of folder.children) {
            if (file instanceof TFile && file.extension === 'md') {
                await this.loadStyleFromFile(file);
            }
        }

        console.log(`Vassago: Loaded ${this.stylesCache.size} relation styles`);
    }

    /**
     * 从单个文件加载样式配置
     */
    private async loadStyleFromFile(file: TFile): Promise<void> {
        try {
            const content = await this.app.vault.read(file);
            const style = this.parseStyleFromContent(content);

            if (style) {
                // 文件名（不含扩展名）作为边类型名
                const relationType = file.basename;
                this.stylesCache.set(relationType, style);
                console.log(`Vassago: Loaded style for relation type: ${relationType}`);
            }
        } catch (error) {
            console.error(`Vassago: Error loading style from ${file.path}:`, error);
        }
    }

    /**
     * 从文件内容解析样式配置
     */
    private parseStyleFromContent(content: string): RelationStyle | null {
        try {
            // 提取 frontmatter
            const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
            const match = content.match(frontmatterRegex);

            if (!match || !match[1]) {
                return null;
            }

            const frontmatter = parseYaml(match[1]);

            if (!frontmatter) {
                return null;
            }

            // 解析样式配置（强制使用$前缀）
            const style: RelationStyle = {
                color: frontmatter.$color || this.defaultStyle.color,
                shape: this.parseLineShape(frontmatter.$shape),
                pattern: this.parseLinePattern(frontmatter.$pattern),
                width: frontmatter.$width || this.defaultStyle.width,
                arrow: frontmatter.$arrow !== undefined ? frontmatter.$arrow : this.defaultStyle.arrow,
                direction: this.parseDirection(frontmatter.$direction),
                inverse: frontmatter.$inverse,
                label: frontmatter.$label || '',
                description: frontmatter.$description
            };

            return style;
        } catch (error) {
            console.error('Vassago: Error parsing style:', error);
            return null;
        }
    }

    /**
     * 解析线条形状
     */
    private parseLineShape(shape: string | undefined): LineShape {
        if (!shape) return LineShape.Straight;

        switch (shape.toLowerCase()) {
            case 'curved':
                return LineShape.Curved;
            case 'straight':
            default:
                return LineShape.Straight;
        }
    }

    /**
     * 解析线条图案
     */
    private parseLinePattern(pattern: string | undefined): LinePattern {
        if (!pattern) return LinePattern.Solid;

        switch (pattern.toLowerCase()) {
            case 'dashed':
                return LinePattern.Dashed;
            case 'solid':
            default:
                return LinePattern.Solid;
        }
    }

    /**
     * 解析方向
     */
    private parseDirection(direction: string | undefined): Direction {
        if (!direction) return Direction.Outgoing;

        switch (direction.toLowerCase()) {
            case 'incoming':
                return Direction.Incoming;
            case 'bidirectional':
                return Direction.Bidirectional;
            case 'outgoing':
            default:
                return Direction.Outgoing;
        }
    }

    /**
     * 获取指定边类型的样式
     */
    getStyle(relationType: string): RelationStyle {
        return this.stylesCache.get(relationType) || this.defaultStyle;
    }

    /**
     * 检查是否有指定边类型的配置
     */
    hasStyle(relationType: string): boolean {
        return this.stylesCache.has(relationType);
    }

    /**
     * 获取所有已加载的边类型
     */
    getAllRelationTypes(): string[] {
        return Array.from(this.stylesCache.keys());
    }

    /**
     * 监听配置目录变化
     */
    watchDirectory(callback: () => void): void {
        // 监听文件创建
        this.app.vault.on('create', (file) => {
            if (file instanceof TFile &&
                file.path.startsWith(this.relationDir) &&
                file.extension === 'md') {
                this.loadStyleFromFile(file).then(callback);
            }
        });

        // 监听文件修改
        this.app.vault.on('modify', (file) => {
            if (file instanceof TFile &&
                file.path.startsWith(this.relationDir) &&
                file.extension === 'md') {
                this.loadStyleFromFile(file).then(callback);
            }
        });

        // 监听文件删除
        this.app.vault.on('delete', (file) => {
            if (file instanceof TFile &&
                file.path.startsWith(this.relationDir) &&
                file.extension === 'md') {
                this.stylesCache.delete(file.basename);
                callback();
            }
        });
    }

    /**
     * 将 hex 颜色转换为 PIXI 数字格式
     */
    hexToPixiColor(hex: string): number {
        // 移除 # 符号
        const cleanHex = hex.replace('#', '');
        return parseInt(cleanHex, 16);
    }
}
