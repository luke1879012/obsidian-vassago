import { App, PluginSettingTab, Setting } from "obsidian";
import VassagoPlugin from "./main";

export interface VassagoSettings {
	showLabels: boolean;        // 显示边类型标签
	showColors: boolean;        // 显示边颜色
	showLegend: boolean;        // 显示图例
	relationDir: string;        // 关系配置目录
}

export const DEFAULT_SETTINGS: VassagoSettings = {
	showLabels: true,
	showColors: true,
	showLegend: true,
	relationDir: 'ob_relation'
}

export class VassagoSettingTab extends PluginSettingTab {
	plugin: VassagoPlugin;

	constructor(app: App, plugin: VassagoPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// 插件标题和描述
		containerEl.createEl('h2', { text: 'Vassago - Graph Relation Types' });
		containerEl.createEl('p', {
			text: '揭示隐藏的关联，连接知识的过去与未来',
			cls: 'setting-item-description'
		});

		// 显示边类型标签
		new Setting(containerEl)
			.setName('Show relation labels')
			.setDesc('Display relation type labels on links in the graph view')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showLabels)
				.onChange(async (value) => {
					this.plugin.settings.showLabels = value;
					await this.plugin.saveSettings();
					this.plugin.startUpdateLoop();
				}));

		// 显示边颜色
		new Setting(containerEl)
			.setName('Show relation colors')
			.setDesc('Apply custom colors to relation links based on their type')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showColors)
				.onChange(async (value) => {
					this.plugin.settings.showColors = value;
					await this.plugin.saveSettings();
					this.plugin.startUpdateLoop();
				}));

		// 显示图例
		new Setting(containerEl)
			.setName('Show legend')
			.setDesc('Display a legend for relation types and their colors')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showLegend)
				.onChange(async (value) => {
					this.plugin.settings.showLegend = value;
					await this.plugin.saveSettings();
					this.plugin.startUpdateLoop();
				}));

		// 关系配置目录
		new Setting(containerEl)
			.setName('Relation configuration directory')
			.setDesc('Directory containing relation type configuration files (relative to vault root)')
			.addText(text => text
				.setPlaceholder('ob_relation')
				.setValue(this.plugin.settings.relationDir)
				.onChange(async (value) => {
					this.plugin.settings.relationDir = value || 'ob_relation';
					await this.plugin.saveSettings();
					// 重新加载样式
					await this.plugin.styleManager.loadStyles();
					this.plugin.startUpdateLoop();
				}));

		// 统计信息
		containerEl.createEl('h3', { text: 'Statistics' });

		const statsDiv = containerEl.createDiv();
		const relationTypes = this.plugin.styleManager.getAllRelationTypes();

		statsDiv.createEl('p', {
			text: `Loaded relation types: ${relationTypes.length}`,
			cls: 'setting-item-description'
		});

		if (relationTypes.length > 0) {
			const listEl = statsDiv.createEl('ul', { cls: 'vassago-relation-list' });
			relationTypes.forEach(type => {
				const style = this.plugin.styleManager.getStyle(type);
				const item = listEl.createEl('li');
				item.createEl('span', {
					text: `${style.label || type}`,
					attr: { style: `color: ${style.color}; font-weight: bold;` }
				});
				item.createEl('span', {
					text: ` (${type})`,
					cls: 'setting-item-description'
				});
			});
		}

		// 帮助信息
		containerEl.createEl('h3', { text: 'How to use' });

		const helpDiv = containerEl.createDiv({ cls: 'vassago-help' });

		helpDiv.createEl('p', { text: '1. Create relation type configurations in the ob_relation/ directory' });
		helpDiv.createEl('p', { text: '2. In your notes, add relations in frontmatter:' });

		const codeBlock = helpDiv.createEl('pre');
		codeBlock.createEl('code', {
			text: `---
supports: "[[Target Note]]"
derived_from:
  - "[[Source 1]]"
  - "[[Source 2]]"
---`
		});

		helpDiv.createEl('p', { text: '3. Open graph view to see the semantic relations' });
	}
}
