<template>
	<div class="waterfall-container">
		<!-- 自定义瀑布流骨架屏 -->
		<div v-if="isLoading" class="skeleton-overlay">
			<div class="skeleton-wrapper">
				<div class="skeleton-column">
					<div class="skeleton-item" v-for="i in 6" :key="'left-' + i">
						<div
							class="skeleton-image"
							:style="{ paddingBottom: getRandomHeight() }"
						></div>
						<div class="skeleton-content">
							<div class="skeleton-title"></div>
							<div class="skeleton-desc"></div>
						</div>
					</div>
				</div>
				<div class="skeleton-column">
					<div class="skeleton-item" v-for="i in 6" :key="'right-' + i">
						<div
							class="skeleton-image"
							:style="{ paddingBottom: getRandomHeight() }"
						></div>
						<div class="skeleton-content">
							<div class="skeleton-title"></div>
							<div class="skeleton-desc"></div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<van-pull-refresh v-model="refreshing" @refresh="onRefresh">
			<van-list
				v-model:loading="loading"
				:finished="finished"
				@load="onLoad"
				:immediate-check="true"
			>
				<div class="waterfall-wrapper">
					<div class="column" ref="leftColumn">
						<div v-for="item in leftList" :key="item.id" class="waterfall-item">
							<div
								v-if="item.type === 'video'"
								class="video-wrapper"
								@click="playVideo(item)"
							>
								<video
									:ref="
										(el) => {
											if (el) videoRefs[item.id] = el;
										}
									"
									:src="item.url"
									preload="metadata"
									class="video-content"
									@loadedmetadata="onVideoLoad(item)"
								></video>
								<div class="play-overlay" v-show="!item.isPlaying">
									<van-icon name="play-circle-o" size="48" color="#fff" />
								</div>
							</div>
							<div v-else class="image-container">
								<div class="image-placeholder" v-if="!item.imageLoaded"></div>
								<img
									:src="item.url"
									class="image-content"
									@load="onImageLoad(item)"
								/>
							</div>
							<div class="item-info">
								<h3>{{ item.title }}</h3>
								<p>{{ item.description }}</p>
							</div>
						</div>
					</div>
					<div class="column" ref="rightColumn">
						<div
							v-for="item in rightList"
							:key="item.id"
							class="waterfall-item"
						>
							<div
								v-if="item.type === 'video'"
								class="video-wrapper"
								@click="playVideo(item)"
							>
								<video
									:ref="
										(el) => {
											if (el) videoRefs[item.id] = el;
										}
									"
									:src="item.url"
									preload="metadata"
									class="video-content"
									@loadedmetadata="onVideoLoad(item)"
								></video>
								<div class="play-overlay" v-show="!item.isPlaying">
									<van-icon name="play-circle-o" size="48" color="#fff" />
								</div>
							</div>
							<div v-else class="image-container">
								<div class="image-placeholder" v-if="!item.imageLoaded"></div>
								<img
									:src="item.url"
									class="image-content"
									@load="onImageLoad(item)"
								/>
							</div>
							<div class="item-info">
								<h3>{{ item.title }}</h3>
								<p>{{ item.description }}</p>
							</div>
						</div>
					</div>
				</div>
			</van-list>
		</van-pull-refresh>
	</div>
</template>

<script setup>
import { ref, onMounted, nextTick } from "vue";
import { fetchData } from "../api/waterfall";
import {
	Icon as VanIcon,
	PullRefresh as VanPullRefresh,
	List as VanList,
	Loading as VanLoading,
	Skeleton as VanSkeleton,
} from "vant";

const loading = ref(false);
const finished = ref(false);
const refreshing = ref(false);
const leftList = ref([]);
const rightList = ref([]);
const page = ref(1);
const videoRefs = ref({});
const leftColumn = ref(null);
const rightColumn = ref(null);
const loadingItems = ref(new Set()); // 跟踪正在加载的项目
const isLoading = ref(true); // 控制骨架屏显示
const contentType = ref("mixed"); // 默认加载混合内容

// 智能分配内容到左右列
const distributeContent = async (items) => {
	// 为每个项目添加唯一ID和状态
	items.forEach((item, index) => {
		if (!item.id) {
			item.id = `item-${index}-${Date.now()}`;
		}

		if (item.type === "video") {
			item.isPlaying = false;
		}

		// 添加图片加载状态标记
		if (item.type === "image") {
			item.imageLoaded = false;
		}
	});

	// 确保DOM已更新
	await nextTick();

	// 添加延迟以确保DOM完全渲染
	await new Promise((resolve) => setTimeout(resolve, 50));

	// 获取当前列的高度
	let leftColumnHeight = 0;
	let rightColumnHeight = 0;

	// 如果已经有内容，计算当前列的高度
	if (leftColumn.value && rightColumn.value) {
		// 使用 offsetHeight 获取实际渲染高度
		leftColumnHeight = leftColumn.value.offsetHeight || 0;
		rightColumnHeight = rightColumn.value.offsetHeight || 0;

		console.log("实际列高度:", leftColumnHeight, rightColumnHeight);

		// 如果高度仍然相同，尝试手动计算
		if (Math.abs(leftColumnHeight - rightColumnHeight) < 1) {
			leftColumnHeight = 0;
			rightColumnHeight = 0;

			// 手动计算每列中项目的高度总和
			leftList.value.forEach((item) => {
				leftColumnHeight +=
					item.calculatedHeight || (item.type === "video" ? 300 : 250);
			});

			rightList.value.forEach((item) => {
				rightColumnHeight +=
					item.calculatedHeight || (item.type === "video" ? 300 : 250);
			});

			console.log("手动计算列高度:", leftColumnHeight, rightColumnHeight);
		}
	}

	// 使用预设的宽高数据进行智能分配
	items.forEach((item, index) => {
		// 计算项目在瀑布流中的实际高度
		const columnWidth = leftColumn.value ? leftColumn.value.clientWidth : 200;
		let itemHeight;

		if (item.width && item.height) {
			// 如果有预设宽高，直接计算
			const aspectRatio = item.height / item.width;
			itemHeight = columnWidth * aspectRatio + 80; // 加上标题和描述的高度
		} else {
			// 没有预设宽高时使用默认值
			itemHeight = item.type === "video" ? 300 : 250;
		}

		// 记录计算出的高度，用于后续重新平衡
		item.calculatedHeight = itemHeight;

		// 当高度相等时，交替分配到左右列
		if (Math.abs(leftColumnHeight - rightColumnHeight) < 1) {
			// 高度几乎相等，使用索引奇偶性交替分配
			if (index % 2 === 0) {
				leftList.value.push(item);
				leftColumnHeight += itemHeight;
			} else {
				rightList.value.push(item);
				rightColumnHeight += itemHeight;
			}
		} else if (leftColumnHeight < rightColumnHeight) {
			// 左侧更低，分配到左侧
			leftList.value.push(item);
			leftColumnHeight += itemHeight;
		} else {
			// 右侧更低，分配到右侧
			rightList.value.push(item);
			rightColumnHeight += itemHeight;
		}
	});
};

// 修改onLoad函数以支持骨架屏和内容类型过滤
const onLoad = async () => {
	console.log("触发加载更多", page.value);
	if (page.value > 2) {
		finished.value = true;
		return; // 停止加载更多
	}
	try {
		loading.value = true;
		// 传递contentType参数，根据URL参数决定加载内容类型
		const data = await fetchData(page.value, contentType.value);
		console.log("加载的数据:", data, "内容类型:", contentType.value);

		if (!data || data.length === 0) {
			finished.value = true;
			loading.value = false;
			isLoading.value = false;
			return;
		}

		// 使用异步分配方法
		await distributeContent(data);

		page.value++;
		loading.value = false;

		// 首页数据加载完成后，隐藏骨架屏
		if (page.value === 2) {
			// 添加短暂延迟，确保DOM已渲染
			setTimeout(() => {
				isLoading.value = false;
			}, 300);
		}
	} catch (error) {
		console.error("加载数据失败:", error);
		loading.value = false;
		isLoading.value = false;
	}
};

const onRefresh = async () => {
	console.log("触发下拉刷新");

	try {
		// 显示骨架屏
		isLoading.value = true;

		page.value = 1;
		leftList.value = [];
		rightList.value = [];
		loadingItems.value.clear();
		finished.value = false;
		await onLoad();
		refreshing.value = false;
	} catch (error) {
		console.error("刷新数据失败:", error);
		refreshing.value = false;
		isLoading.value = false;
	}
};

// 处理视频加载完成事件
const onVideoLoad = (item) => {
	nextTick(() => {
		const video = videoRefs.value[item.id];
		if (video) {
			// 根据视频实际尺寸或预设尺寸设置容器高度
			let aspectRatio;
			if (item.width && item.height) {
				// 使用预设宽高
				aspectRatio = item.height / item.width;
			} else {
				// 使用视频实际尺寸
				aspectRatio = video.videoHeight / video.videoWidth;
			}

			// 设置容器比例
			video.parentElement.style.paddingBottom = `${aspectRatio * 100}%`;

			// 更新计算高度
			const columnWidth = leftColumn.value ? leftColumn.value.clientWidth : 200;
			item.calculatedHeight = columnWidth * aspectRatio + 80;
		}
	});
};

// 处理图片加载完成事件
const onImageLoad = (item) => {
	// 标记图片已加载完成
	item.imageLoaded = true;

	// 如果已经有预设宽高，可以不再重新计算
	if (item.width && item.height) return;

	// 对于没有预设宽高的图片，加载完成后重新计算
	nextTick(() => {
		rebalanceColumns();
	});
};

// 优化重新平衡列高度的函数
const rebalanceColumns = () => {
	nextTick(() => {
		if (!leftColumn.value || !rightColumn.value) return;

		// 获取当前两列的高度
		const leftHeight = leftColumn.value.clientHeight;
		const rightHeight = rightColumn.value.clientHeight;

		// 如果高度差异过大，重新分配项目
		if (Math.abs(leftHeight - rightHeight) > 50) {
			console.log("重新平衡列高度", leftHeight, rightHeight);

			// 收集所有项目
			const allItems = [...leftList.value, ...rightList.value];

			// 清空列表
			leftList.value = [];
			rightList.value = [];

			// 按高度重新分配
			let leftColumnHeight = 0;
			let rightColumnHeight = 0;

			// 使用已经计算好的高度进行分配
			allItems.forEach((item) => {
				if (leftColumnHeight <= rightColumnHeight) {
					leftList.value.push(item);
					leftColumnHeight +=
						item.calculatedHeight || (item.type === "video" ? 300 : 250);
				} else {
					rightList.value.push(item);
					rightColumnHeight +=
						item.calculatedHeight || (item.type === "video" ? 300 : 250);
				}
			});
		}
	});
};

// 播放视频
const playVideo = (item) => {
	const video = videoRefs.value[item.id];
	if (!video) return;

	if (video.paused) {
		// 暂停其他正在播放的视频
		Object.values(videoRefs.value).forEach((v) => {
			if (v !== video && !v.paused) {
				v.pause();
				// 重置其他视频的播放状态
				const playingItem = [...leftList.value, ...rightList.value].find(
					(i) => i.type === "video" && i.isPlaying
				);
				if (playingItem) {
					playingItem.isPlaying = false;
				}
			}
		});
		video.play();
		item.isPlaying = true;
	} else {
		video.pause();
		item.isPlaying = false;
	}
};

onMounted(() => {
	// 检查URL参数中是否有type=image
	const urlParams = new URLSearchParams(window.location.search);
	const typeParam = urlParams.get("type");
	if (typeParam === "image" || typeParam === "video") {
		contentType.value = typeParam;
		console.log("内容类型已设置为:", contentType.value);
	}

	onLoad();
});
// 生成随机高度，模拟不同内容高度
const getRandomHeight = () => {
	// 生成60%到100%之间的随机高度
	return `${Math.floor(60 + Math.random() * 40)}%`;
};
</script>

<style scoped>
.waterfall-container {
	padding: 10px;
	box-sizing: border-box;
	background: #f5f5f5;
	/* 修改容器样式以确保正确的滚动行为 */
	height: 100vh;
	width: 100vw;
	overflow-y: auto;
	-webkit-overflow-scrolling: touch;
	position: relative; /* 确保定位上下文正确 */
}

/* 添加加载更多提示样式 */
.van-list__finished-text {
	padding: 16px;
	color: #969799;
	font-size: 14px;
	text-align: center;
}

/* 添加下拉刷新样式 */
:deep(.van-pull-refresh) {
	overflow: visible;
	height: 100%;
}

.waterfall-wrapper {
	display: flex;
	justify-content: space-between;
	gap: 10px;
}

.column {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 10px;
	min-width: 0; /* 防止内容溢出 */
}

.waterfall-item {
	background: #fff;
	border-radius: 8px;
	overflow: hidden;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	margin-bottom: 10px;
	transition: all 0.3s ease;
}

.video-wrapper {
	position: relative;
	width: 100%;
	cursor: pointer;
	background: #f5f5f5;
	height: 0;
	padding-bottom: 56.25%; /* 默认16:9比例，会被实际视频比例覆盖 */
}

.video-content {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	object-fit: contain; /* 改回contain，保持原始比例 */
}

.image-container {
	position: relative;
	width: 100%;
	min-height: 150px; /* 最小高度 */
}

.image-placeholder {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	min-height: 150px;
	background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
	z-index: 1;
}

.image-content {
	width: 100%;
	height: auto;
	display: block;
	position: relative;
	z-index: 2;
}

.play-overlay {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: rgba(0, 0, 0, 0.2);
}

.item-info {
	padding: 10px;
}

.item-info h3 {
	margin: 0;
	font-size: 16px;
	color: #333;
}

.item-info p {
	margin: 5px 0 0;
	font-size: 14px;
	color: #666;
}

/* 自定义骨架屏样式 */
.skeleton-overlay {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background-color: #f5f5f5;
	z-index: 9999;
	overflow-y: auto;
	padding: 10px;
	box-sizing: border-box;
}

.skeleton-wrapper {
	display: flex;
	justify-content: space-between;
	gap: 10px;
}

.skeleton-column {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.skeleton-item {
	background: #fff;
	border-radius: 8px;
	overflow: hidden;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	margin-bottom: 10px;
}

.skeleton-image {
	width: 100%;
	height: 0;
	background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
}

.skeleton-content {
	padding: 10px;
}

.skeleton-title {
	height: 20px;
	width: 70%;
	margin-bottom: 8px;
	background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
	border-radius: 4px;
}

.skeleton-desc {
	height: 16px;
	width: 90%;
	background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
	border-radius: 4px;
}

@keyframes shimmer {
	0% {
		background-position: -200% 0;
	}
	100% {
		background-position: 200% 0;
	}
}
</style>
