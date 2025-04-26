export const fetchData = async (page, type = "mixed") => {
	try {
		// 模拟API请求延迟
		await new Promise((resolve) => setTimeout(resolve, 50));

		// 从json文件获取数据
		const response = await fetch("/mock/data.json");
		const mockData = await response.json();

		// 获取对应页码的数据
		let pageData;
		if (page === 1) {
			pageData = mockData;
		} else {
			pageData = mockData.page2;
			if (!pageData) {
				return [];
			}
		}

		// 根据type参数返回不同格式的数据
		switch (type) {
			case "video":
				return pageData.video || [];
			case "image":
				return pageData.image || [];
			default:
				// 混合类型
				return [...(pageData.video || []), ...(pageData.image || [])];
		}
	} catch (error) {
		console.error("获取数据失败:", error);
		return [];
	}
};
