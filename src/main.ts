import { Plugin, Notice } from 'obsidian';
import { getAPI } from 'obsidian-dataview';
import { ObsidianRenderer } from './types';
import { LinkManager } from './linkManager';
import { RelationStyleManager } from './relationStyleManager';
import { VassagoSettings, DEFAULT_SETTINGS, VassagoSettingTab } from './settings';

/**
 * Vassago - Graph Relation Types Plugin
 * 揭示隐藏的关联，连接知识的过去与未来
 */
export default class VassagoPlugin extends Plugin {
	settings: VassagoSettings;
	api = getAPI();
	currentRenderer: ObsidianRenderer | null = null;
	animationFrameId: number | null = null;
	linkManager: LinkManager;
	styleManager: RelationStyleManager;
	indexReady = false;

	async onload(): Promise<void> {
		console.log('Loading Vassago plugin...');

		// 加载设置
		await this.loadSettings();

		// 检查 Dataview API
		if (!this.api) {
			console.error("Vassago: Dataview plugin is not available.");
			new Notice("Vassago requires the Dataview plugin. Please install and enable it.");
			return;
		}

		// 初始化样式管理器
		this.styleManager = new RelationStyleManager(this.app, this.settings.relationDir);
		await this.styleManager.loadStyles();

		// 初始化链接管理器
		this.linkManager = new LinkManager(this.styleManager);

		// 监听配置目录变化
		this.styleManager.watchDirectory(() => {
			if (this.currentRenderer) {
				this.startUpdateLoop();
			}
		});

		// 添加设置面板
		this.addSettingTab(new VassagoSettingTab(this.app, this));

		// 监听布局变化
		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				this.handleLayoutChange();
			})
		);

		// 监听 Dataview 索引就绪
		// @ts-ignore - Dataview 自定义事件
		this.registerEvent(
			// @ts-ignore
			this.app.metadataCache.on("dataview:index-ready", () => {
				this.indexReady = true;
			})
		);

		// 监听 Dataview 元数据变化
		// @ts-ignore - Dataview 自定义事件
		this.registerEvent(
			// @ts-ignore
			this.app.metadataCache.on("dataview:metadata-change", () => {
				if (this.indexReady) {
					this.handleLayoutChange();
				}
			})
		);

		console.log('Vassago plugin loaded successfully');
	}

	onunload(): void {
		// 取消动画帧
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		// 清理渲染器
		if (this.currentRenderer) {
			this.linkManager.destroyMap(this.currentRenderer);
			this.currentRenderer = null;
		}

		console.log('Vassago plugin unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<VassagoSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * 查找图视图渲染器
	 */
	findRenderer(): ObsidianRenderer | null {
		// 查找全局图视图
		let graphLeaves = this.app.workspace.getLeavesOfType('graph');
		for (const leaf of graphLeaves) {
			// @ts-ignore
			const renderer = leaf.view.renderer;
			if (this.isObsidianRenderer(renderer)) {
				return renderer;
			}
		}

		// 查找局部图视图
		graphLeaves = this.app.workspace.getLeavesOfType('localgraph');
		for (const leaf of graphLeaves) {
			// @ts-ignore
			const renderer = leaf.view.renderer;
			if (this.isObsidianRenderer(renderer)) {
				return renderer;
			}
		}
		return null;
	}

	/**
	 * 处理布局变化
	 */
	async handleLayoutChange() {
		// 取消当前的动画帧
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
		await this.waitForRenderer();
		this.checkAndUpdateRenderer();
	}

	/**
	 * 检查并更新渲染器
	 */
	checkAndUpdateRenderer() {
		const newRenderer = this.findRenderer();
		if (!newRenderer) {
			this.currentRenderer = null;
			return;
		}
		newRenderer.px.stage.sortableChildren = true;
		this.currentRenderer = newRenderer;
		this.startUpdateLoop();
	}

	/**
	 * 等待渲染器就绪
	 */
	waitForRenderer(): Promise<void> {
		return new Promise((resolve) => {
			const checkInterval = 500;

			const intervalId = setInterval(() => {
				const renderer = this.findRenderer();
				if (renderer) {
					clearInterval(intervalId);
					resolve();
				}
			}, checkInterval);
		});
	}

	/**
	 * 启动更新循环
	 */
	startUpdateLoop(verbosity: number = 0): void {
		if (!this.currentRenderer) {
			if (verbosity > 0) {
				new Notice('Vassago: No valid graph renderer found.');
			}
			return;
		}
		const renderer: ObsidianRenderer = this.currentRenderer;

		// 移除现有的文本和图形
		this.linkManager.destroyMap(renderer);

		// 在下一个动画帧中更新位置
		requestAnimationFrame(this.updatePositions.bind(this));
	}

	/**
	 * 持续更新位置
	 */
	updatePositions(): void {
		if (!this.currentRenderer) {
			return;
		}

		const renderer: ObsidianRenderer = this.currentRenderer;

		let updateMap = false;

		if (this.animationFrameId && this.animationFrameId % 10 == 0) {
			updateMap = true;
			// 移除不再存在的链接
			this.linkManager.removeLinks(renderer, renderer.links);
		}

		// 更新每个链接的位置
		renderer.links.forEach((link) => {
			if (updateMap) {
				const key = this.linkManager.generateKey(link.source.id, link.target.id);
				if (!this.linkManager.linksMap.has(key)) {
					this.linkManager.addLink(
						renderer,
						link,
						this.settings.showColors,
						this.settings.showLegend
					);
				}
			}
			this.linkManager.updateLinkText(renderer, link, this.settings.showLabels);
			if (this.settings.showColors) {
				this.linkManager.updateLinkGraphics(renderer, link);
			}
		});

		// 在下一个动画帧中继续更新
		this.animationFrameId = requestAnimationFrame(this.updatePositions.bind(this));
	}

	/**
	 * 类型守卫：检查是否为有效的 Obsidian 渲染器
	 */
	private isObsidianRenderer(renderer: any): renderer is ObsidianRenderer {
		return renderer
			&& renderer.px
			&& renderer.px.stage
			&& renderer.panX !== undefined
			&& renderer.panY !== undefined
			&& typeof renderer.px.stage.addChild === 'function'
			&& typeof renderer.px.stage.removeChild === 'function'
			&& Array.isArray(renderer.links);
	}
}
