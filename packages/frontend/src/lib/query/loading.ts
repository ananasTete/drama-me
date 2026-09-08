import { keepPreviousData } from "@tanstack/react-query";

/** 列表切换筛选条件时保留上一屏，避免内容先清空再重新出现。 */
export const keepPreviousQueryData = {
	placeholderData: keepPreviousData,
};
