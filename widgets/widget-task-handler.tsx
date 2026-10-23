import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NextClassWidget } from './NextClassWidget';
import { AttendanceWidget } from './AttendanceWidget';
import { QuickStatsWidget } from './QuickStatsWidget';
import {
  getWidgetClassData,
  getWidgetAttendanceData,
  getWidgetQuickStatsData,
  syncAndroidWidget,
} from './widget-sync';

const GLOBAL_STACK_KEY = '@widget_active_stack_index';
const GLOBAL_PAGE_KEY = '@widget_active_page_index';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const stackKey = `@widget_stack_${widgetInfo.widgetId}`;
  const pageKey = `@widget_page_${widgetInfo.widgetId}`;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      if (widgetInfo.widgetName === 'NextClassWidget') {
        const data = await getWidgetClassData();
        const hasUpcomingExam = Boolean(data?.upcomingExam && data.upcomingExam.isApproaching);
        const totalCards = hasUpcomingExam ? 5 : 4;

        const savedStack =
          (await AsyncStorage.getItem(stackKey)) ||
          (await AsyncStorage.getItem(GLOBAL_STACK_KEY));
        const rawStack = savedStack ? parseInt(savedStack, 10) : 0;
        const stackIndex = isNaN(rawStack) ? 0 : ((rawStack % totalCards) + totalCards) % totalCards;

        const savedPage =
          (await AsyncStorage.getItem(pageKey)) ||
          (await AsyncStorage.getItem(GLOBAL_PAGE_KEY));
        const schedulePage = savedPage ? parseInt(savedPage, 10) : 0;

        data.stackIndex = stackIndex;
        data.schedulePage = isNaN(schedulePage) ? 0 : schedulePage;
        props.renderWidget(<NextClassWidget data={data} widgetInfo={widgetInfo} />);
      } else if (widgetInfo.widgetName === 'AttendanceWidget') {
        const data = await getWidgetAttendanceData();
        props.renderWidget(<AttendanceWidget data={data} widgetInfo={widgetInfo} />);
      } else if (widgetInfo.widgetName === 'QuickStatsWidget') {
        const data = await getWidgetQuickStatsData();
        props.renderWidget(<QuickStatsWidget data={data} widgetInfo={widgetInfo} />);
      }
      break;
    }

    case 'WIDGET_CLICK': {
      const clickAction = props.clickAction;

      if (widgetInfo.widgetName === 'NextClassWidget') {
        const data = await getWidgetClassData();
        const hasUpcomingExam = Boolean(data?.upcomingExam && data.upcomingExam.isApproaching);
        const totalCards = hasUpcomingExam ? 5 : 4;

        const savedStack =
          (await AsyncStorage.getItem(stackKey)) ||
          (await AsyncStorage.getItem(GLOBAL_STACK_KEY));
        const currentIdx = savedStack ? parseInt(savedStack, 10) : 0;
        const safeIdx = isNaN(currentIdx) ? 0 : ((currentIdx % totalCards) + totalCards) % totalCards;

        const savedPage =
          (await AsyncStorage.getItem(pageKey)) ||
          (await AsyncStorage.getItem(GLOBAL_PAGE_KEY));
        const currentPage = savedPage ? parseInt(savedPage, 10) : 0;
        const safePage = isNaN(currentPage) ? 0 : currentPage;

        let nextIdx = safeIdx;
        let nextPage = safePage;

        if (clickAction === 'NEXT_STACK' || clickAction === 'CYCLE_STACK' || clickAction === 'DOWN_STACK') {
          nextIdx = (safeIdx + 1) % totalCards;
          await AsyncStorage.setItem(stackKey, String(nextIdx));
          await AsyncStorage.setItem(GLOBAL_STACK_KEY, String(nextIdx));
        } else if (clickAction === 'PREV_STACK' || clickAction === 'UP_STACK') {
          nextIdx = (safeIdx - 1 + totalCards) % totalCards;
          await AsyncStorage.setItem(stackKey, String(nextIdx));
          await AsyncStorage.setItem(GLOBAL_STACK_KEY, String(nextIdx));
        } else if (clickAction === 'NEXT_SCHEDULE_PAGE') {
          nextPage = safePage + 1;
          await AsyncStorage.setItem(pageKey, String(nextPage));
          await AsyncStorage.setItem(GLOBAL_PAGE_KEY, String(nextPage));
        } else if (clickAction === 'PREV_SCHEDULE_PAGE') {
          nextPage = Math.max(0, safePage - 1);
          await AsyncStorage.setItem(pageKey, String(nextPage));
          await AsyncStorage.setItem(GLOBAL_PAGE_KEY, String(nextPage));
        } else if (clickAction === 'REFRESH_WIDGET') {
          // Keep current card index, force-fetch newest data
        }

        data.stackIndex = nextIdx;
        data.schedulePage = nextPage;
        props.renderWidget(<NextClassWidget data={data} widgetInfo={widgetInfo} />);

        // Synchronize all instances on the home screen immediately
        syncAndroidWidget().catch(() => {});
      } else if (widgetInfo.widgetName === 'AttendanceWidget') {
        const data = await getWidgetAttendanceData();
        props.renderWidget(<AttendanceWidget data={data} widgetInfo={widgetInfo} />);
      } else if (widgetInfo.widgetName === 'QuickStatsWidget') {
        const data = await getWidgetQuickStatsData();
        props.renderWidget(<QuickStatsWidget data={data} widgetInfo={widgetInfo} />);
      }
      break;
    }

    case 'WIDGET_DELETED': {
      try {
        await AsyncStorage.removeItem(stackKey);
        await AsyncStorage.removeItem(pageKey);
      } catch (e) {}
      break;
    }

    default:
      break;
  }
}
