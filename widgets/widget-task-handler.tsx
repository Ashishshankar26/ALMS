import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NextClassWidget } from './NextClassWidget';
import { AttendanceWidget } from './AttendanceWidget';
import { QuickStatsWidget } from './QuickStatsWidget';
import { getWidgetClassData, getWidgetAttendanceData, getWidgetQuickStatsData } from './widget-sync';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const stackKey = `@widget_stack_${widgetInfo.widgetId}`;

  const pageKey = `@widget_page_${widgetInfo.widgetId}`;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      if (widgetInfo.widgetName === 'NextClassWidget') {
        const savedStack = await AsyncStorage.getItem(stackKey);
        const stackIndex = savedStack ? parseInt(savedStack, 10) : 0;
        const savedPage = await AsyncStorage.getItem(pageKey);
        const schedulePage = savedPage ? parseInt(savedPage, 10) : 0;

        const data = await getWidgetClassData();
        data.stackIndex = isNaN(stackIndex) ? 0 : stackIndex;
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
        const savedStack = await AsyncStorage.getItem(stackKey);
        const currentIdx = savedStack ? parseInt(savedStack, 10) : 0;
        const safeIdx = isNaN(currentIdx) ? 0 : currentIdx;

        const savedPage = await AsyncStorage.getItem(pageKey);
        const currentPage = savedPage ? parseInt(savedPage, 10) : 0;
        const safePage = isNaN(currentPage) ? 0 : currentPage;

        let nextIdx = safeIdx;
        let nextPage = safePage;

        if (clickAction === 'NEXT_STACK' || clickAction === 'CYCLE_STACK') {
          nextIdx = (safeIdx + 1) % 3;
          await AsyncStorage.setItem(stackKey, String(nextIdx));
        } else if (clickAction === 'PREV_STACK') {
          nextIdx = (safeIdx - 1 + 3) % 3;
          await AsyncStorage.setItem(stackKey, String(nextIdx));
        } else if (clickAction === 'NEXT_SCHEDULE_PAGE') {
          nextPage = safePage + 1;
          await AsyncStorage.setItem(pageKey, String(nextPage));
        } else if (clickAction === 'PREV_SCHEDULE_PAGE') {
          nextPage = Math.max(0, safePage - 1);
          await AsyncStorage.setItem(pageKey, String(nextPage));
        } else if (clickAction === 'REFRESH_WIDGET') {
          // Keep current card and page, re-evaluating latest data in real time
        }

        const data = await getWidgetClassData();
        data.stackIndex = nextIdx;
        data.schedulePage = nextPage;
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
